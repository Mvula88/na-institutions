'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Building2,
  Users,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Plus,
  RefreshCw,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface PlatformStats {
  totalCenters: number
  activeCenters: number
  inactiveCenters: number
  suspendedCenters: number
  totalUsers: number
  totalStudentsAcrossPlatform: number
  centersWithHostel: number
  monthlyRevenue?: number
  totalLecturers?: number
  recentCenters: {
    id: string
    name: string
    status: string
    created_at: string
  }[]
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function fetchStats() {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/stats', {
        method: 'GET',
        credentials: 'include',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to fetch stats')
      }

      const data = await response.json()
      setStats(data.stats)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch stats'
      console.error('Error fetching stats:', err)
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50/50">
        <div className="bg-white border-b border-gray-200">
          <div className="px-4 md:px-8 py-6">
            <div className="animate-pulse h-8 bg-gray-200 rounded w-48"></div>
          </div>
        </div>
        <div className="px-4 md:px-8 py-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50/50">
        <div className="bg-white border-b border-gray-200">
          <div className="px-4 md:px-8 py-6">
            <h1 className="text-2xl font-semibold text-gray-900">Super Admin Dashboard</h1>
          </div>
        </div>
        <div className="px-4 md:px-8 py-6">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-red-800 mb-2">Failed to Load Dashboard</h3>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={fetchStats}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'inactive':
        return <Clock className="w-4 h-4 text-gray-500" />
      case 'suspended':
        return <XCircle className="w-4 h-4 text-red-500" />
      default:
        return null
    }
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-100 text-green-700',
      inactive: 'bg-gray-100 text-gray-700',
      suspended: 'bg-red-100 text-red-700',
    }
    return styles[status as keyof typeof styles] || styles.inactive
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 md:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Super Admin Dashboard</h1>
              <p className="mt-1 text-sm text-gray-500">Platform overview and management</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchStats}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                title="Refresh data"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              <Link
                href="/admin/centers/new"
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Add New Center
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Centers</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats?.totalCenters || 0}</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-100">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Active Centers</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{stats?.activeCenters || 0}</p>
              </div>
              <div className="p-3 rounded-lg bg-green-100">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Users</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats?.totalUsers || 0}</p>
              </div>
              <div className="p-3 rounded-lg bg-purple-100">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Students</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats?.totalStudentsAcrossPlatform || 0}</p>
              </div>
              <div className="p-3 rounded-lg bg-amber-100">
                <TrendingUp className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {(stats?.suspendedCenters || 0) > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <div>
              <p className="font-medium text-red-800">Attention Required</p>
              <p className="text-sm text-red-700">
                {stats?.suspendedCenters} center(s) are currently suspended. Review their status.
              </p>
            </div>
          </div>
        )}

        {/* Bottom Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Centers */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Recent Centers</h2>
              <Link href="/admin/centers" className="text-sm text-blue-600 hover:text-blue-700">
                View all
              </Link>
            </div>
            {stats?.recentCenters && stats.recentCenters.length > 0 ? (
              <div className="space-y-3">
                {stats.recentCenters.map((center) => (
                  <Link
                    key={center.id}
                    href={`/admin/centers/${center.id}`}
                    className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(center.status)}
                      <div>
                        <p className="font-medium text-gray-900">{center.name}</p>
                        <p className="text-sm text-gray-500">
                          Created {new Date(center.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(center.status)}`}>
                      {center.status}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No centers yet</p>
            )}
          </div>

          {/* Quick Stats */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Platform Overview</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <span className="text-gray-600">Centers with Hostel Module</span>
                <span className="font-semibold text-gray-900">{stats?.centersWithHostel || 0}</span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <span className="text-gray-600">Inactive Centers</span>
                <span className="font-semibold text-amber-600">{stats?.inactiveCenters || 0}</span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <span className="text-gray-600">Suspended Centers</span>
                <span className="font-semibold text-red-600">{stats?.suspendedCenters || 0}</span>
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="text-gray-600">Average Students per Center</span>
                <span className="font-semibold text-gray-900">
                  {stats?.totalCenters ? Math.round((stats?.totalStudentsAcrossPlatform || 0) / stats.totalCenters) : 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
