'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Plus,
  Search,
  Building2,
  Globe,
  Monitor,
  Phone,
  AlertCircle,
  CheckCircle,
  Clock,
  Eye,
  Pencil,
  Calendar,
  DollarSign,
  RefreshCw,
} from 'lucide-react'
import toast from 'react-hot-toast'

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

interface ClientStats {
  totalClients: number
  activeClients: number
  totalMonthlyRevenue: number
  overduePayments: number
  upcomingRenewals: number
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [stats, setStats] = useState<ClientStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const fetchClients = useCallback(async () => {
    setIsLoading(true)

    try {
      const params = new URLSearchParams()
      if (statusFilter) params.append('status', statusFilter)
      if (searchQuery) params.append('search', searchQuery)

      const response = await fetch(`/api/admin/clients?${params}`, {
        method: 'GET',
        credentials: 'include',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to fetch clients')
      }

      const data = await response.json()
      setClients(data.clients || [])
      setStats(data.stats || null)
    } catch (error) {
      console.error('Error fetching clients:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to fetch clients')
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter, searchQuery])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  useEffect(() => {
    const timer = setTimeout(() => {
      // Trigger refetch on search/filter change via the callback dependency
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, statusFilter])

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
      active: { bg: 'bg-green-100', text: 'text-green-700', icon: <CheckCircle className="w-3 h-3" /> },
      suspended: { bg: 'bg-amber-100', text: 'text-amber-700', icon: <AlertCircle className="w-3 h-3" /> },
      cancelled: { bg: 'bg-red-100', text: 'text-red-700', icon: <AlertCircle className="w-3 h-3" /> },
      pending: { bg: 'bg-blue-100', text: 'text-blue-700', icon: <Clock className="w-3 h-3" /> },
    }
    const style = styles[status] || styles.pending
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${style.bg} ${style.text}`}>
        {style.icon}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const formatCurrency = (amount: number) => {
    return `R ${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 md:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Client Contracts</h1>
              <p className="mt-1 text-sm text-gray-500">Manage your tutorial center clients and payments</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => fetchClients()}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Refresh"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              <Link href="/admin/clients/new">
                <Button leftIcon={<Plus className="w-4 h-4" />}>
                  Add Client
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats?.totalClients || 0}</p>
              <p className="text-xs text-gray-500">Total Clients</p>
            </div>
          </div>
        </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats?.activeClients || 0}</p>
                <p className="text-xs text-gray-500">Active</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100">
                <DollarSign className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(stats?.totalMonthlyRevenue || 0)}</p>
                <p className="text-xs text-gray-500">Monthly Revenue</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats?.overduePayments || 0}</p>
                <p className="text-xs text-gray-500">Overdue</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100">
                <Calendar className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats?.upcomingRenewals || 0}</p>
                <p className="text-xs text-gray-500">Renewals Due</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by business name, contact, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="suspended">Suspended</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Clients List */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8">
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 rounded"></div>
              ))}
            </div>
          </div>
        ) : clients.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No clients yet</h3>
            <p className="text-gray-500 mb-4">Start by adding your first client contract</p>
            <Link href="/admin/clients/new">
              <Button leftIcon={<Plus className="w-4 h-4" />}>Add Client</Button>
            </Link>
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-gray-100">
              {clients.map((client) => (
                <div key={client.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium text-gray-900">{client.business_name}</p>
                      <p className="text-sm text-gray-500">{client.contact_person}</p>
                    </div>
                    {getStatusBadge(client.contract_status)}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {client.phone}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    {client.has_website && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                        <Globe className="w-3 h-3" />
                        Website
                      </span>
                    )}
                    {client.has_school_management && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                        <Monitor className="w-3 h-3" />
                        SMS
                      </span>
                    )}
                    {!client.setup_fee_paid && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                        Setup Unpaid
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/admin/clients/${client.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </Button>
                    </Link>
                    <Link href={`/admin/clients/${client.id}/edit`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">
                        <Pencil className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Client</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Contact</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Services</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Monthly Fee</th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {clients.map((client) => (
                    <tr key={client.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{client.business_name}</p>
                          {client.trading_as && (
                            <p className="text-sm text-gray-500">t/a {client.trading_as}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-gray-900">{client.contact_person}</p>
                          <p className="text-sm text-gray-500 flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {client.phone}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {client.has_website && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                              <Globe className="w-3 h-3" />
                              Website
                            </span>
                          )}
                          {client.has_school_management && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                              <Monitor className="w-3 h-3" />
                              SMS
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(client.contract_status)}
                        {!client.setup_fee_paid && (
                          <p className="text-xs text-red-600 mt-1">Setup fee unpaid</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {client.has_school_management ? (
                          <span className="font-medium text-gray-900">
                            {formatCurrency(client.monthly_sms_fee || 650)}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/admin/clients/${client.id}`}>
                            <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="View details">
                              <Eye className="w-4 h-4" />
                            </button>
                          </Link>
                          <Link href={`/admin/clients/${client.id}/edit`}>
                            <button className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Edit client">
                              <Pencil className="w-4 h-4" />
                            </button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        </div>
      </div>
    </div>
  )
}
