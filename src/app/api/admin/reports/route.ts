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

interface CenterRow {
  id: string
  name: string
  status: string
  subscription_tier: string | null
  hostel_module_enabled: boolean
  transport_module_enabled: boolean
  library_module_enabled: boolean
  sms_module_enabled: boolean
}

/**
 * GET /api/admin/reports
 * Returns platform-wide statistics for reports page
 */
export async function GET(request: NextRequest) {
  // Require super admin authentication
  const authResult = await requireSuperAdmin(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  try {
    const { searchParams } = new URL(request.url)
    const dateRange = searchParams.get('dateRange') || 'all_time'

    // Calculate date filter based on range
    let dateFilter: string | null = null
    const now = new Date()

    switch (dateRange) {
      case 'this_month':
        dateFilter = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
        break
      case 'last_month':
        dateFilter = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
        break
      case 'this_year':
        dateFilter = new Date(now.getFullYear(), 0, 1).toISOString()
        break
      default:
        dateFilter = null // all_time
    }

    // Fetch all data in parallel for efficiency
    const [
      centersResult,
      usersCountResult,
      studentsCountResult,
      teachersCountResult,
      paymentsResult,
      studentsByCenter,
    ] = await Promise.all([
      // Get all centers with their details
      getAdminSupabase()
        .from('institutions')
        .select('id, name, status, subscription_tier, hostel_module_enabled, transport_module_enabled, library_module_enabled, sms_module_enabled'),

      // Get total users count
      getAdminSupabase()
        .from('users')
        .select('id', { count: 'exact', head: true }),

      // Get total students count
      getAdminSupabase()
        .from('students')
        .select('id', { count: 'exact', head: true }),

      // Get total teachers count
      getAdminSupabase()
        .from('lecturers')
        .select('id', { count: 'exact', head: true }),

      // Get payments (with optional date filter)
      dateFilter
        ? getAdminSupabase()
            .from('payments')
            .select('amount, center_id')
            .gte('created_at', dateFilter)
        : getAdminSupabase()
            .from('payments')
            .select('amount, center_id'),

      // Get student counts grouped by center
      getAdminSupabase()
        .from('students')
        .select('center_id'),
    ])

    if (centersResult.error) {
      console.error('Error fetching centers:', centersResult.error)
      return NextResponse.json({ error: 'Failed to fetch centers' }, { status: 500 })
    }

    const centers = (centersResult.data || []) as CenterRow[]
    const payments = (paymentsResult.data || []) as { amount: number; center_id: string }[]
    const students = (studentsByCenter.data || []) as { center_id: string }[]

    // Calculate center statistics
    const activeCenters = centers.filter(c => c.status === 'active').length
    const suspendedCenters = centers.filter(c => c.status === 'suspended').length

    const centersBySubscription = {
      basic: centers.filter(c => c.subscription_tier === 'basic').length,
      premium: centers.filter(c => c.subscription_tier === 'premium').length,
      enterprise: centers.filter(c => c.subscription_tier === 'enterprise').length,
    }

    const moduleUsage = {
      hostel: centers.filter(c => c.hostel_module_enabled).length,
      transport: centers.filter(c => c.transport_module_enabled).length,
      library: centers.filter(c => c.library_module_enabled).length,
      sms: centers.filter(c => c.sms_module_enabled).length,
    }

    // Calculate total revenue
    const totalRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0)

    // Calculate revenue by center
    const revenueByCenter: Record<string, number> = {}
    payments.forEach(p => {
      revenueByCenter[p.center_id] = (revenueByCenter[p.center_id] || 0) + p.amount
    })

    // Calculate students by center
    const studentsByCenter2: Record<string, number> = {}
    students.forEach(s => {
      studentsByCenter2[s.center_id] = (studentsByCenter2[s.center_id] || 0) + 1
    })

    // Get top centers by revenue
    const topCenters = centers
      .map(c => ({
        id: c.id,
        name: c.name,
        students: studentsByCenter2[c.id] || 0,
        revenue: revenueByCenter[c.id] || 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)

    return NextResponse.json({
      success: true,
      stats: {
        totalCenters: centers.length,
        activeCenters,
        suspendedCenters,
        totalUsers: usersCountResult.count || 0,
        totalStudents: studentsCountResult.count || 0,
        totalTeachers: teachersCountResult.count || 0,
        totalRevenue,
        centersBySubscription,
        topCenters,
        moduleUsage,
      },
    })
  } catch (error) {
    console.error('Admin reports error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
