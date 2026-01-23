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

interface Client {
  id: string
  business_name: string
  trading_as: string | null
  contact_person: string
  email: string | null
  phone: string
  has_website: boolean
  has_school_management: boolean
  website_domain: string | null
  domain_expiry_date: string | null
  contract_start_date: string
  contract_status: string
  setup_fee_paid: boolean
  monthly_sms_fee: number
  annual_website_fee: number
  created_at: string
}

/**
 * GET /api/admin/clients
 * Returns list of all clients with stats
 */
export async function GET(request: NextRequest) {
  // Require super admin authentication
  const authResult = await requireSuperAdmin(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || ''
    const search = searchParams.get('search') || ''
    const statsOnly = searchParams.get('statsOnly') === 'true'

    // Fetch all clients for stats calculation
    const { data: allClientsData, error: allClientsError } = await getAdminSupabase()
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false })

    if (allClientsError) {
      console.error('Error fetching clients:', allClientsError)
      return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 })
    }

    const allClients = (allClientsData || []) as Client[]
    const activeClients = allClients.filter(c => c.contract_status === 'active')

    // Calculate monthly revenue from active SMS clients
    const monthlyRevenue = activeClients
      .filter(c => c.has_school_management)
      .reduce((sum, c) => sum + (c.monthly_sms_fee || 650), 0)

    // Check for upcoming domain renewals (within 30 days)
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

    const upcomingRenewals = allClients.filter(c => {
      if (!c.domain_expiry_date) return false
      const expiry = new Date(c.domain_expiry_date)
      return expiry <= thirtyDaysFromNow && expiry >= new Date()
    }).length

    // Get overdue invoices count (if table exists)
    let overdueCount = 0
    try {
      const { count } = await getAdminSupabase()
        .from('client_invoices')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'overdue')
      overdueCount = count || 0
    } catch {
      // Table may not exist
    }

    const stats = {
      totalClients: allClients.length,
      activeClients: activeClients.length,
      totalMonthlyRevenue: monthlyRevenue,
      overduePayments: overdueCount,
      upcomingRenewals,
    }

    // If only stats requested, return early
    if (statsOnly) {
      return NextResponse.json({ success: true, stats })
    }

    // Apply filters for the clients list
    let filteredClients = allClients

    if (status) {
      filteredClients = filteredClients.filter(c => c.contract_status === status)
    }

    if (search) {
      const searchLower = search.toLowerCase()
      filteredClients = filteredClients.filter(c =>
        c.business_name.toLowerCase().includes(searchLower) ||
        c.contact_person.toLowerCase().includes(searchLower) ||
        c.phone.includes(search)
      )
    }

    return NextResponse.json({
      success: true,
      clients: filteredClients,
      stats,
    })
  } catch (error) {
    console.error('Admin clients error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/clients
 * Delete a client (super admin only)
 */
export async function DELETE(request: NextRequest) {
  // Require super admin authentication
  const authResult = await requireSuperAdmin(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  try {
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('id')

    if (!clientId) {
      return NextResponse.json({ error: 'Client ID is required' }, { status: 400 })
    }

    // Verify client exists
    const { data: client, error: fetchError } = await getAdminSupabase()
      .from('clients')
      .select('id, business_name')
      .eq('id', clientId)
      .single()

    if (fetchError || !client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Delete the client
    const { error: deleteError } = await getAdminSupabase()
      .from('clients')
      .delete()
      .eq('id', clientId)

    if (deleteError) {
      console.error('Error deleting client:', deleteError)
      return NextResponse.json({ error: 'Failed to delete client' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Client "${client.business_name}" deleted successfully`,
    })
  } catch (error) {
    console.error('Admin delete client error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/admin/clients
 * Update client status (super admin only)
 */
export async function PATCH(request: NextRequest) {
  // Require super admin authentication
  const authResult = await requireSuperAdmin(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  try {
    const body = await request.json()
    const { clientId, contract_status } = body

    if (!clientId || !contract_status) {
      return NextResponse.json({ error: 'Client ID and contract_status are required' }, { status: 400 })
    }

    if (!['active', 'pending', 'suspended', 'cancelled'].includes(contract_status)) {
      return NextResponse.json({ error: 'Invalid contract status' }, { status: 400 })
    }

    // Update client status
    const { data: updatedClient, error } = await getAdminSupabase()
      .from('clients')
      .update({ contract_status } as never)
      .eq('id', clientId)
      .select('id, business_name, contract_status')
      .single()

    if (error) {
      console.error('Error updating client status:', error)
      return NextResponse.json({ error: 'Failed to update client status' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      client: updatedClient,
      message: `Client status updated to ${contract_status}`,
    })
  } catch (error) {
    console.error('Admin update client error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
