import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RevokeTokenRequest {
  entityType: 'student' | 'teacher' | 'parent'
  entityId: string
  revokeAll?: boolean
  tokenId?: string
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's center and role
    const { data: userDataRaw } = await supabase
      .from('users')
      .select('center_id, role')
      .eq('id', user.id)
      .single()

    const userData = userDataRaw as { center_id: string | null; role: string } | null
    if (!userData?.center_id) {
      return NextResponse.json({ error: 'No center associated' }, { status: 400 })
    }

    // Only center admins can revoke tokens
    if (!['center_admin', 'super_admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body: RevokeTokenRequest = await request.json()
    const { entityType, entityId, revokeAll = true, tokenId } = body

    if (!entityType || !entityId) {
      return NextResponse.json({ error: 'entityType and entityId are required' }, { status: 400 })
    }

    let query = supabase
      .from('portal_access_tokens')
      .update({ is_revoked: true } as never)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .eq('institution_id', userData.center_id)
      .eq('is_revoked', false)

    if (!revokeAll && tokenId) {
      query = query.eq('id', tokenId)
    }

    const { error, count } = await query.select()

    if (error) {
      console.error('Error revoking tokens:', error)
      return NextResponse.json({ error: 'Failed to revoke tokens' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      revokedCount: count || 0,
    })
  } catch (error) {
    console.error('Revoke token error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
