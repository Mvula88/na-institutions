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
 * GET /api/admin/centers
 * Returns paginated list of all institutions with their user/student counts
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
    const status = searchParams.get('status') || ''
    const search = searchParams.get('search') || ''

    // Build institutions query
    let institutionsQuery = getAdminSupabase()
      .from('institutions')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    // Apply filters
    if (status) {
      institutionsQuery = institutionsQuery.eq('status', status)
    }
    if (search) {
      institutionsQuery = institutionsQuery.or(`name.ilike.%${search}%,email.ilike.%${search}%,city.ilike.%${search}%`)
    }

    // Pagination
    const from = (page - 1) * ITEMS_PER_PAGE
    const to = from + ITEMS_PER_PAGE - 1
    institutionsQuery = institutionsQuery.range(from, to)

    const { data: institutions, count, error } = await institutionsQuery

    if (error) {
      console.error('Error fetching institutions:', error)
      return NextResponse.json({ error: 'Failed to fetch institutions' }, { status: 500 })
    }

    const institutionIds = (institutions || []).map(c => c.id)

    if (institutionIds.length === 0) {
      return NextResponse.json({
        success: true,
        centers: [],
        totalCount: 0,
        page,
        totalPages: 0,
      })
    }

    // Batch fetch user counts and student counts for all institutions in parallel
    const [usersResult, studentsResult] = await Promise.all([
      // Get user counts per institution
      getAdminSupabase()
        .from('users')
        .select('institution_id')
        .in('institution_id', institutionIds),

      // Get student counts per institution
      getAdminSupabase()
        .from('students')
        .select('institution_id')
        .in('institution_id', institutionIds),
    ])

    // Count users per institution
    const userCounts: Record<string, number> = {}
    for (const user of (usersResult.data || [])) {
      const cid = user.institution_id as string
      userCounts[cid] = (userCounts[cid] || 0) + 1
    }

    // Count students per institution
    const studentCounts: Record<string, number> = {}
    for (const student of (studentsResult.data || [])) {
      const cid = student.institution_id as string
      studentCounts[cid] = (studentCounts[cid] || 0) + 1
    }

    // Combine institutions with their counts
    const institutionsWithCounts = (institutions || []).map(institution => ({
      ...institution,
      _count: {
        users: userCounts[institution.id] || 0,
        students: studentCounts[institution.id] || 0,
      },
    }))

    return NextResponse.json({
      success: true,
      centers: institutionsWithCounts,
      totalCount: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / ITEMS_PER_PAGE),
    })
  } catch (error) {
    console.error('Admin institutions error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/centers
 * Delete a center (super admin only)
 */
export async function DELETE(request: NextRequest) {
  // Require super admin authentication
  const authResult = await requireSuperAdmin(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  try {
    const { searchParams } = new URL(request.url)
    const centerId = searchParams.get('id')

    if (!centerId) {
      return NextResponse.json({ error: 'Center ID is required' }, { status: 400 })
    }

    // Verify center exists
    const { data: center, error: fetchError } = await getAdminSupabase()
      .from('institutions')
      .select('id, name')
      .eq('id', centerId)
      .single()

    if (fetchError || !center) {
      return NextResponse.json({ error: 'Center not found' }, { status: 404 })
    }

    // Delete the center (cascade should handle related data)
    const { error: deleteError } = await getAdminSupabase()
      .from('institutions')
      .delete()
      .eq('id', centerId)

    if (deleteError) {
      console.error('Error deleting center:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete center. Make sure all associated data is removed first.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Center "${center.name}" deleted successfully`,
    })
  } catch (error) {
    console.error('Admin delete center error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/admin/centers
 * Update center status (super admin only)
 */
export async function PATCH(request: NextRequest) {
  // Require super admin authentication
  const authResult = await requireSuperAdmin(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  try {
    const body = await request.json()
    const { centerId, status } = body

    if (!centerId || !status) {
      return NextResponse.json({ error: 'Center ID and status are required' }, { status: 400 })
    }

    if (!['active', 'inactive', 'suspended'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    // Update center status
    const { data: updatedCenter, error } = await getAdminSupabase()
      .from('institutions')
      .update({ status } as never)
      .eq('id', centerId)
      .select('id, name, status')
      .single()

    if (error) {
      console.error('Error updating center status:', error)
      return NextResponse.json({ error: 'Failed to update center status' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      center: updatedCenter,
      message: `Center status updated to ${status}`,
    })
  } catch (error) {
    console.error('Admin update center error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
