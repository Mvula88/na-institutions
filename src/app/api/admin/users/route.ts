import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/api-auth'
import { createClient } from '@supabase/supabase-js'

// Lazy initialization of service role client
function getAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const ITEMS_PER_PAGE = 10

/**
 * GET /api/admin/users
 * Returns paginated list of all users with their center info
 */
export async function GET(request: NextRequest) {
  // Require super admin authentication
  const authResult = await requireSuperAdmin(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const role = searchParams.get('role') || ''
    const centerId = searchParams.get('institution_id') || ''
    const status = searchParams.get('status') || ''
    const search = searchParams.get('search') || ''

    // Build users query with center join
    let usersQuery = getAdminSupabase()
      .from('users')
      .select('*, center:institutions(id, name)', { count: 'exact' })
      .order('created_at', { ascending: false })

    // Apply filters
    if (role) {
      usersQuery = usersQuery.eq('role', role)
    }
    if (centerId) {
      usersQuery = usersQuery.eq('institution_id', centerId)
    }
    if (status) {
      usersQuery = usersQuery.eq('is_active', status === 'active')
    }
    if (search) {
      usersQuery = usersQuery.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`)
    }

    // Pagination
    const from = (page - 1) * ITEMS_PER_PAGE
    const to = from + ITEMS_PER_PAGE - 1
    usersQuery = usersQuery.range(from, to)

    const { data: users, count, error } = await usersQuery

    if (error) {
      console.error('Error fetching users:', error)
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    // Also fetch all centers for the filter dropdown
    const { data: centers } = await getAdminSupabase()
      .from('institutions')
      .select('id, name')
      .order('name')

    return NextResponse.json({
      success: true,
      users: users || [],
      centers: centers || [],
      totalCount: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / ITEMS_PER_PAGE),
    })
  } catch (error) {
    console.error('Admin users error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/users
 * Delete a user (super admin only)
 */
export async function DELETE(request: NextRequest) {
  // Require super admin authentication
  const authResult = await requireSuperAdmin(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('id')

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Verify user exists
    const { data: user, error: fetchError } = await getAdminSupabase()
      .from('users')
      .select('id, full_name, role')
      .eq('id', userId)
      .single()

    if (fetchError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Prevent deleting super admins (safety check)
    if (user.role === 'super_admin') {
      return NextResponse.json(
        { error: 'Cannot delete super admin users through this endpoint' },
        { status: 403 }
      )
    }

    // Delete from users table
    const { error: deleteError } = await getAdminSupabase()
      .from('users')
      .delete()
      .eq('id', userId)

    if (deleteError) {
      console.error('Error deleting user:', deleteError)
      return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `User "${user.full_name}" deleted successfully`,
    })
  } catch (error) {
    console.error('Admin delete user error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/admin/users
 * Update user status (super admin only)
 */
export async function PATCH(request: NextRequest) {
  // Require super admin authentication
  const authResult = await requireSuperAdmin(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  try {
    const body = await request.json()
    const { userId, is_active } = body

    if (!userId || is_active === undefined) {
      return NextResponse.json({ error: 'User ID and is_active status are required' }, { status: 400 })
    }

    // Update user status
    const { data: updatedUser, error } = await getAdminSupabase()
      .from('users')
      .update({ is_active } as never)
      .eq('id', userId)
      .select('id, full_name, is_active')
      .single()

    if (error) {
      console.error('Error updating user status:', error)
      return NextResponse.json({ error: 'Failed to update user status' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: `User ${is_active ? 'activated' : 'deactivated'} successfully`,
    })
  } catch (error) {
    console.error('Admin update user error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
