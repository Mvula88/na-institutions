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

/**
 * GET /api/admin/stats
 * Returns platform-wide statistics for super admin dashboard
 */
export async function GET(request: NextRequest) {
  // Require super admin authentication
  const authResult = await requireSuperAdmin(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  try {
    const adminSupabase = getAdminSupabase()

    // Fetch all data in parallel for efficiency
    const [
      centersResult,
      usersCountResult,
      studentsCountResult,
      teachersCountResult,
      paymentsResult,
    ] = await Promise.all([
      // Get all centers with their details
      adminSupabase
        .from('institutions')
        .select('id, name, status, created_at, hostel_module_enabled')
        .order('created_at', { ascending: false }),

      // Get total users count
      adminSupabase
        .from('users')
        .select('id', { count: 'exact', head: true }),

      // Get total students count
      adminSupabase
        .from('students')
        .select('id', { count: 'exact', head: true }),

      // Get total teachers count
      adminSupabase
        .from('lecturers')
        .select('id', { count: 'exact', head: true }),

      // Get total payments this month
      adminSupabase
        .from('payments')
        .select('amount')
        .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
    ])

    if (centersResult.error) {
      console.error('Error fetching centers:', centersResult.error)
      return NextResponse.json({ error: 'Failed to fetch centers' }, { status: 500 })
    }

    type CenterData = {
      id: string
      name: string
      status: string
      created_at: string
      hostel_module_enabled: boolean
    }

    const allCenters = (centersResult.data || []) as CenterData[]
    const activeCenters = allCenters.filter(c => c.status === 'active').length
    const inactiveCenters = allCenters.filter(c => c.status === 'inactive').length
    const suspendedCenters = allCenters.filter(c => c.status === 'suspended').length
    const centersWithHostel = allCenters.filter(c => c.hostel_module_enabled).length

    // Calculate monthly revenue
    const monthlyRevenue = (paymentsResult.data || []).reduce(
      (sum, p) => sum + (typeof p.amount === 'number' ? p.amount : 0),
      0
    )

    return NextResponse.json({
      success: true,
      stats: {
        totalCenters: allCenters.length,
        activeCenters,
        inactiveCenters,
        suspendedCenters,
        totalUsers: usersCountResult.count || 0,
        totalStudentsAcrossPlatform: studentsCountResult.count || 0,
        totalTeachers: teachersCountResult.count || 0,
        centersWithHostel,
        monthlyRevenue,
        recentCenters: allCenters.slice(0, 5).map(c => ({
          id: c.id,
          name: c.name,
          status: c.status,
          created_at: c.created_at,
        })),
      },
    })
  } catch (error) {
    console.error('Admin stats error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
