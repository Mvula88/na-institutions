'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/input'
import { ConfirmModal } from '@/components/ui/modal'
import {
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Building2,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  GraduationCap,
  RefreshCw,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Center {
  id: string
  name: string
  slug: string
  email: string | null
  phone: string | null
  city: string | null
  status: string
  subscription_tier: string | null
  hostel_module_enabled: boolean
  created_at: string
  _count?: {
    users: number
    students: number
  }
}

const ITEMS_PER_PAGE = 10

export default function CentersListPage() {
  const [centers, setCenters] = useState<Center[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [centerToDelete, setCenterToDelete] = useState<Center | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchCenters = useCallback(async () => {
    setIsLoading(true)

    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
      })
      if (statusFilter) params.append('status', statusFilter)
      if (searchQuery) params.append('search', searchQuery)

      const response = await fetch(`/api/admin/centers?${params}`, {
        method: 'GET',
        credentials: 'include',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to fetch centers')
      }

      const data = await response.json()
      setCenters(data.centers || [])
      setTotalCount(data.totalCount || 0)
      setTotalPages(data.totalPages || 0)
    } catch (error) {
      console.error('Error fetching centers:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to fetch centers')
    } finally {
      setIsLoading(false)
    }
  }, [currentPage, statusFilter, searchQuery])

  useEffect(() => {
    fetchCenters()
  }, [fetchCenters])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentPage !== 1) {
        setCurrentPage(1)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  async function handleDelete() {
    if (!centerToDelete) return

    setIsDeleting(true)

    try {
      const response = await fetch(`/api/admin/centers?id=${centerToDelete.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete center')
      }

      toast.success('Center deleted successfully')
      setDeleteModalOpen(false)
      setCenterToDelete(null)
      fetchCenters()
    } catch (error) {
      console.error('Error deleting center:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete center')
    } finally {
      setIsDeleting(false)
    }
  }

  async function toggleStatus(center: Center, newStatus: string) {
    try {
      const response = await fetch('/api/admin/centers', {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          centerId: center.id,
          status: newStatus,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update center status')
      }

      toast.success(`Center ${newStatus === 'active' ? 'activated' : newStatus === 'suspended' ? 'suspended' : 'deactivated'} successfully`)
      fetchCenters()
    } catch (error) {
      console.error('Error updating center status:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update center status')
    }
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; icon: React.ReactNode }> = {
      active: { bg: 'bg-green-100 text-green-700', icon: <CheckCircle className="w-3 h-3" /> },
      inactive: { bg: 'bg-gray-100 text-gray-700', icon: <Clock className="w-3 h-3" /> },
      suspended: { bg: 'bg-red-100 text-red-700', icon: <XCircle className="w-3 h-3" /> },
    }
    return styles[status] || styles.inactive
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 md:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Tutorial Centers</h1>
              <p className="mt-1 text-sm text-gray-500">Manage all tutorial centers on the platform</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => fetchCenters()}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Refresh"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              <Link href="/admin/centers/new">
                <Button leftIcon={<Plus className="w-4 h-4" />}>
                  Add Center
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-6 space-y-6">
        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, or city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <Select
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
                { value: 'suspended', label: 'Suspended' },
              ]}
              placeholder="All Status"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="w-40"
            />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-100 rounded"></div>
              ))}
            </div>
          </div>
        ) : centers.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No centers found</h3>
            <p className="text-gray-500 mb-4">
              {searchQuery || statusFilter
                ? 'Try adjusting your filters'
                : 'Get started by adding your first tutorial center'}
            </p>
            {!searchQuery && !statusFilter && (
              <Link href="/admin/centers/new">
                <Button leftIcon={<Plus className="w-4 h-4" />}>
                  Add Center
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Center
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stats
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Modules
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {centers.map((center) => {
                    const statusBadge = getStatusBadge(center.status)
                    return (
                      <tr key={center.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-gray-900">{center.name}</p>
                            <p className="text-sm text-gray-500">{center.city || 'No location'}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-gray-900">{center.email || '-'}</p>
                            <p className="text-sm text-gray-500">{center.phone || '-'}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1 text-sm">
                              <Users className="w-4 h-4 text-gray-400" />
                              <span>{center._count?.users || 0}</span>
                            </div>
                            <div className="flex items-center gap-1 text-sm">
                              <GraduationCap className="w-4 h-4 text-gray-400" />
                              <span>{center._count?.students || 0}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {center.hostel_module_enabled && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                                Hostel
                              </span>
                            )}
                            {!center.hostel_module_enabled && (
                              <span className="text-gray-400 text-sm">Base only</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${statusBadge.bg}`}>
                            {statusBadge.icon}
                            {center.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <Link href={`/admin/centers/${center.id}`}>
                              <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                <Eye className="w-4 h-4" />
                              </button>
                            </Link>
                            <Link href={`/admin/centers/${center.id}/edit`}>
                              <button className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors">
                                <Pencil className="w-4 h-4" />
                              </button>
                            </Link>
                            <button
                              onClick={() => {
                                setCenterToDelete(center)
                                setDeleteModalOpen(true)
                              }}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
                <p className="text-sm text-gray-500">
                  Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
                  {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} of {totalCount} centers
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false)
          setCenterToDelete(null)
        }}
        onConfirm={handleDelete}
        title="Delete Center"
        message={`Are you sure you want to delete "${centerToDelete?.name}"? This will remove all associated data including users, students, and payments. This action cannot be undone.`}
        confirmText="Delete"
        isLoading={isDeleting}
      />
    </div>
  )
}
