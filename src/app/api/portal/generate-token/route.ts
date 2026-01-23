import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generatePortalToken, hashToken, isPortalTokensConfigured } from '@/lib/portal-tokens'
import { sendSMS } from '@/lib/sms'
import { sendEmail } from '@/lib/email'
import { rateLimit } from '@/lib/rate-limit'

interface GenerateTokenRequest {
  entityType: 'student' | 'lecturer'
  entityId: string
  expiresInDays?: number
  sendNotification?: boolean
  notificationChannel?: 'sms' | 'email' | 'both'
}

// Simple base64 token for when JWT is not configured - NOT SECURE, will fail in production
function generateSimpleToken(entityType: string, entityId: string, institutionId: string, expiresInDays: number): string {
  const expiresAt = Date.now() + (expiresInDays * 24 * 60 * 60 * 1000)
  const payload = { t: entityType, e: entityId, i: institutionId, x: expiresAt }
  return Buffer.from(JSON.stringify(payload)).toString('base64url')
}

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting to prevent token generation abuse
    const rateLimitResponse = await rateLimit(request, {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 20, // 20 tokens per minute max
      keyPrefix: 'portal-generate-token',
    })
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const useSimpleToken = !isPortalTokensConfigured()
    if (useSimpleToken) {
      // In production, require proper JWT configuration
      if (process.env.NODE_ENV === 'production') {
        console.error('PORTAL_JWT_SECRET not configured in production!')
        return NextResponse.json(
          { error: 'Portal tokens not properly configured. Please contact administrator.' },
          { status: 500 }
        )
      }
      console.warn('PORTAL_JWT_SECRET not configured, using simple token (less secure)')
    }

    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's institution and role
    const { data: userDataRaw, error: userError } = await supabase
      .from('users')
      .select('institution_id, role')
      .eq('id', user.id)
      .single()

    if (userError) {
      console.error('Error fetching user data:', userError)
      return NextResponse.json({ error: 'User data not found. Please ensure you are properly logged in.' }, { status: 400 })
    }

    const userData = userDataRaw as { institution_id: string | null; role: string } | null
    if (!userData?.institution_id) {
      return NextResponse.json({ error: 'No institution associated with your account' }, { status: 400 })
    }

    // Institution admins and staff can generate tokens
    if (!['institution_admin', 'institution_staff', 'super_admin'].includes(userData.role)) {
      return NextResponse.json({ error: `Insufficient permissions. Your role (${userData.role}) cannot generate registration links.` }, { status: 403 })
    }

    const body: GenerateTokenRequest = await request.json()
    const { entityType, entityId, expiresInDays = 30, sendNotification = false, notificationChannel = 'both' } = body

    if (!entityType || !entityId) {
      return NextResponse.json({ error: 'entityType and entityId are required' }, { status: 400 })
    }

    if (!['student', 'lecturer'].includes(entityType)) {
      return NextResponse.json({ error: 'Invalid entityType' }, { status: 400 })
    }

    // Verify entity exists and belongs to this institution
    const table = entityType === 'student' ? 'students' : 'lecturers'
    const { data: entity, error: entityError } = await supabase
      .from(table)
      .select('id, full_name, phone, email, institution_id')
      .eq('id', entityId)
      .eq('institution_id', userData.institution_id)
      .single()

    if (entityError || !entity) {
      return NextResponse.json({ error: `${entityType} not found` }, { status: 404 })
    }

    // Get institution info for notification
    const { data: institutionData } = await supabase
      .from('institutions')
      .select('name')
      .eq('id', userData.institution_id)
      .single()

    const institution = institutionData as { name: string } | null

    // Generate the token (use JWT if configured, otherwise simple base64)
    const token = useSimpleToken
      ? generateSimpleToken(entityType, entityId, userData.institution_id, expiresInDays)
      : generatePortalToken(entityType, entityId, userData.institution_id, { expiresInDays })
    const tokenHash = hashToken(token)

    // Calculate expiration using UTC to ensure consistent time handling
    const expiresAt = new Date()
    expiresAt.setUTCDate(expiresAt.getUTCDate() + expiresInDays)

    // Try to store token in database (optional - for tracking/revocation)
    // If the table doesn't exist, we still return the token
    try {
      // Revoke any existing active tokens for this entity
      await supabase
        .from('portal_access_tokens')
        .update({ is_revoked: true } as never)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .eq('is_revoked', false)

      // Store the token hash in database
      await supabase
        .from('portal_access_tokens')
        .insert({
          institution_id: userData.institution_id,
          entity_type: entityType,
          entity_id: entityId,
          token_hash: tokenHash,
          expires_at: expiresAt.toISOString(),
          created_by: user.id,
          created_ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
        } as never)
    } catch (dbError) {
      // Database storage is optional - token will still work via JWT validation
      console.warn('Could not store token in database (table may not exist):', dbError)
    }

    // Build portal URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || ''
    const portalUrl = `${baseUrl}/${entityType}/${token}`

    // Send notification if requested
    if (sendNotification && institution) {
      const entityData = entity as { full_name: string; phone?: string; email?: string }
      const message = `${institution.name}: Your portal access link is ready. Click here to access: ${portalUrl}`

      if ((notificationChannel === 'sms' || notificationChannel === 'both') && entityData.phone) {
        await sendSMS(entityData.phone, message)
      }

      if ((notificationChannel === 'email' || notificationChannel === 'both') && entityData.email) {
        const html = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1E40AF;">Portal Access Link</h2>
            <p>Hello ${entityData.full_name},</p>
            <p>Your portal access link for ${institution.name} is ready:</p>
            <p style="margin: 20px 0;">
              <a href="${portalUrl}" style="background: #1E40AF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Access Portal
              </a>
            </p>
            <p style="color: #666; font-size: 14px;">This link expires in ${expiresInDays} days.</p>
            <p style="color: #666; font-size: 14px;">If you didn't request this link, please ignore this email.</p>
          </div>
        `
        await sendEmail(entityData.email, `${institution.name} - Portal Access Link`, html)
      }
    }

    return NextResponse.json({
      success: true,
      token,
      portalUrl,
      expiresAt: expiresAt.toISOString(),
      expiresInDays,
    })
  } catch (error) {
    console.error('Generate token error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
