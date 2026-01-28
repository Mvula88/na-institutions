import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyPortalToken, hashToken, isValidTokenFormat, isPortalTokensConfigured } from '@/lib/portal-tokens'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

interface ValidateTokenRequest {
  token: string
  entityType?: 'student' | 'lecturer' | 'parent'
}

// Decode simple base64 token (fallback when JWT not configured)
function decodeSimpleToken(token: string): { type: string; entityId: string; institutionId: string; exp: number } | null {
  try {
    const json = Buffer.from(token, 'base64url').toString('utf-8')
    const payload = JSON.parse(json)
    if (payload.t && payload.e && payload.c && payload.x) {
      // Check if expired
      if (payload.x < Date.now()) {
        return null
      }
      return {
        type: payload.t,
        entityId: payload.e,
        institutionId: payload.c,
        exp: Math.floor(payload.x / 1000),
      }
    }
    return null
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting to prevent token enumeration attacks
    const rateLimitResponse = await rateLimit(request, {
      ...RATE_LIMITS.api,
      maxRequests: 30, // 30 validations per minute per IP
      keyPrefix: 'portal-validate-token',
    })
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const body: ValidateTokenRequest = await request.json()
    const { token, entityType } = body

    if (!token) {
      return NextResponse.json({
        valid: false,
        error: 'Token is required'
      }, { status: 400 })
    }

    // Try to decode token - first try JWT, then simple token
    let decoded: { type: string; entityId: string; institutionId: string; exp: number } | null = null

    // Try JWT first if configured
    if (isPortalTokensConfigured() && isValidTokenFormat(token)) {
      const jwtDecoded = verifyPortalToken(token)
      if (jwtDecoded) {
        decoded = {
          type: jwtDecoded.type,
          entityId: jwtDecoded.entityId,
          institutionId: jwtDecoded.institutionId,
          exp: jwtDecoded.exp,
        }
      }
    }

    // Try simple token as fallback
    if (!decoded) {
      decoded = decodeSimpleToken(token)
    }

    if (!decoded) {
      return NextResponse.json({
        valid: false,
        error: 'Invalid or expired token'
      })
    }

    // Check entity type matches if specified
    if (entityType && decoded.type !== entityType) {
      return NextResponse.json({
        valid: false,
        error: 'Token type mismatch'
      })
    }

    const supabase = await createClient()
    const tokenHash = hashToken(token)

    // Check if token exists and is not revoked in database
    const { data: tokenRecordRaw, error: tokenError } = await supabase
      .from('portal_access_tokens')
      .select('id, is_revoked, expires_at')
      .eq('token_hash', tokenHash)
      .single()

    type TokenRecord = { id: string; is_revoked: boolean; expires_at: string }
    const tokenRecord = tokenRecordRaw as TokenRecord | null

    // If token not found in DB, it might be a legacy token (UUID-based)
    // or the token was never stored. We'll still validate the JWT.
    if (tokenError || !tokenRecord) {
      // For backward compatibility, if JWT is valid but not in DB,
      // we still allow access but log a warning
      console.warn('Valid JWT token not found in database:', decoded.entityId)
    } else {
      // Check if token is revoked
      if (tokenRecord.is_revoked) {
        await logAccessAttempt(supabase, decoded, request, false, 'Token revoked')
        return NextResponse.json({
          valid: false,
          error: 'Token has been revoked'
        })
      }

      // Check expiration from DB (double-check)
      if (new Date(tokenRecord.expires_at) < new Date()) {
        await logAccessAttempt(supabase, decoded, request, false, 'Token expired')
        return NextResponse.json({
          valid: false,
          error: 'Token has expired'
        })
      }

      // Update last used timestamp
      await supabase
        .from('portal_access_tokens')
        .update({
          last_used_at: new Date().toISOString(),
          last_ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
        } as never)
        .eq('id', tokenRecord.id)
    }

    // Fetch entity data
    const table = decoded.type === 'student' ? 'students' : decoded.type === 'teacher' ? 'teachers' : 'parents'
    const selectFields = decoded.type === 'student'
      ? 'id, full_name, email, phone, student_number, grade, class_id, center_id, status, institution:institutions(name, logo_url, primary_color)'
      : decoded.type === 'teacher'
        ? 'id, full_name, email, phone, specialization, center_id, status, institution:institutions(name, logo_url, primary_color)'
        : 'id, full_name, email, phone, center_id, is_active'

    const { data: entity, error: entityError } = await supabase
      .from(table)
      .select(selectFields)
      .eq('id', decoded.entityId)
      .eq('institution_id', decoded.institutionId)
      .single()

    if (entityError || !entity) {
      await logAccessAttempt(supabase, decoded, request, false, 'Entity not found')
      return NextResponse.json({
        valid: false,
        error: 'Entity not found'
      })
    }

    // Check if entity is active
    const isActive = decoded.type === 'student' || decoded.type === 'teacher'
      ? (entity as { status: string }).status === 'active'
      : (entity as { is_active: boolean }).is_active !== false

    if (!isActive) {
      await logAccessAttempt(supabase, decoded, request, false, 'Entity inactive')
      return NextResponse.json({
        valid: false,
        error: 'Account is inactive'
      })
    }

    // Log successful access
    await logAccessAttempt(supabase, decoded, request, true)

    // Extract name and email for convenience
    const entityData = entity as { full_name?: string; email?: string }

    return NextResponse.json({
      success: true,
      valid: true,
      entityType: decoded.type,
      entityId: decoded.entityId,
      institutionId: decoded.institutionId,
      entityName: entityData.full_name || '',
      entityEmail: entityData.email || null,
      entity,
      expiresAt: new Date(decoded.exp * 1000).toISOString(),
    })
  } catch (error) {
    console.error('Validate token error:', error)
    return NextResponse.json({
      valid: false,
      error: 'Validation failed'
    }, { status: 500 })
  }
}

// Helper to log access attempts
async function logAccessAttempt(
  supabase: Awaited<ReturnType<typeof createClient>>,
  decoded: { type: string; entityId: string; institutionId: string },
  request: NextRequest,
  granted: boolean,
  failureReason?: string
) {
  try {
    await supabase
      .from('portal_access_logs')
      .insert({
        center_id: decoded.institutionId,
        entity_type: decoded.type,
        entity_id: decoded.entityId,
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
        user_agent: request.headers.get('user-agent') || null,
        page_path: request.headers.get('referer') || null,
        access_granted: granted,
        failure_reason: failureReason || null,
      } as never)
  } catch (error) {
    console.error('Failed to log access attempt:', error)
  }
}
