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
  Users,
  CheckCircle,
  XCircle,
  Shield,
  Building2,
  UserCog,
  RefreshCw,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface User {
  id: string
  email: string
  full_name: string
  phone: string | null
  role: 'super_admin' | 'institution_admin' | 'institution_staff'
  institution_id: string | null
  is_active: boolean
  created_at: string
  last_login_at: string | null
  institution?: {
    id: string
    name: string
  } | null
}

const ITEMS_PER_PAGE = 10

export default function UsersListPage() {
  const [users, setUsers] = useState<User[]>([])
  const [institutions, setInstitutions] = useState<{ id: string; name: string }[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [institutionFilter, setInstitutionFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchUsers = useCallback(async () => {
    setIsLoading(true)

    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
      })
      if (roleFilter) params.append('role', roleFilter)
      if (institutionFilter) params.append('center_id', institutionFilter)
      if (statusFilter) params.append('status', statusFilter)
      if (searchQuery) params.append('search', searchQuery)

      const response = await fetch(`/api/admin/users?${params}`, {
        method: 'GET',
        credentials: 'include',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to fetch users')
      }

      const data = await response.json()
      setUsers(data.users || [])
      setInstitutions(data.institutions || [])
      setTotalCount(data.totalCount || 0)
      setTotalPages(data.totalPages || 0)
    } catch (error) {
      console.error('Error fetching users:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to fetch users')
    } finally {
      setIsLoading(false)
    }
  }, [currentPage, roleFilter, institutionFilter, statusFilter, searchQuery])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

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
    if (!userToDelete) return

    setIsDeleting(true)

    try {
      const response = await fetch(`/api/admin/users?id=${userToDelete.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete user')
      }

      toast.success('User deleted successfully')
      setDeleteModalOpen(false)
      setUserToDelete(null)
      fetchUsers()
    } catch (error) {
      console.error('Error deleting user:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete user')
    } finally {
      setIsDeleting(false)
    }
  }

  async function toggleStatus(user: User) {
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          is_active: !user.is_active,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update user status')
      }

      toast.success(`User ${user.is_active ? 'deactivated' : 'activated'} successfully`)
      fetchUsers()
    } catch (error) {
      console.error('Error updating user status:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update user status')
    }
  }

  const getRoleBadge = (role: string) => {
    const styles: Record<string, { bg: string; icon: React.ReactNode }> = {
      super_admin: { bg: 'bg-purple-100 text-purple-700', icon: <Shield className="w-3 h-3" /> },
      institution_admin: { bg: 'bg-blue-100 text-blue-700', icon: <UserCog className="w-3 h-3" /> },
      institution_staff: { bg: 'bg-gray-100 text-gray-700', icon: <Users className="w-3 h-3" /> },
    }
    return styles[role] || styles.institution_staff
  }

  const formatRole = (role: string) => {
    return role.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 md:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">User Management</h1>
              <p className="mt-1 text-sm text-gray-500">Manage all platform users and their access</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => fetchUsers()}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Refresh"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              <Link href="/admin/users/new">
                <Button leftIcon={<Plus className="w-4 h-4" />}>
                  Add User
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
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none"
              />
            </div>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Select
              options={[
                { value: 'super_admin', label: 'Super Admin' },
                { value: 'institution_admin', label: 'Institution Admin' },
                { value: 'institution_staff', label: 'Institution Staff' },
              ]}
              placeholder="All Roles"
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="w-40"
            />
            <Select
              options={institutions.map(c => ({ value: c.id, label: c.name }))}
              placeholder="All Centers"
              value={institutionFilter}
              onChange={(e) => {
                setInstitutionFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="w-48"
            />
            <Select
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
              ]}
              placeholder="All Status"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="w-32"
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
        ) : users.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
            <p className="text-gray-500 mb-4">
              {searchQuery || roleFilter || institutionFilter || statusFilter
                ? 'Try adjusting your filters'
                : 'Get started by adding your first user'}
            </p>
            {!searchQuery && !roleFilter && !institutionFilter && !statusFilter && (
              <Link href="/admin/users/new">
                <Button leftIcon={<Plus className="w-4 h-4" />}>
                  Add User
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
                      User
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Center
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Login
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map((user) => {
                    const roleBadge = getRoleBadge(user.role)
                    return (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-gray-900">{user.full_name}</p>
                            <p className="text-sm text-gray-500">{user.email}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${roleBadge.bg}`}>
                            {roleBadge.icon}
                            {formatRole(user.role)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {user.institution ? (
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-900">{user.institution.name}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => toggleStatus(user)}
                            className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full cursor-pointer transition-colors ${
                              user.is_active
                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                : 'bg-red-100 text-red-700 hover:bg-red-200'
                            }`}
                          >
                            {user.is_active ? (
                              <>
                                <CheckCircle className="w-3 h-3" />
                                Active
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3 h-3" />
                                Inactive
                              </>
                            )}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {user.last_login_at
                            ? new Date(user.last_login_at).toLocaleDateString()
                            : 'Never'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <Link href={`/admin/users/${user.id}`}>
                              <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                <Eye className="w-4 h-4" />
                              </button>
                            </Link>
                            <Link href={`/admin/users/${user.id}/edit`}>
                              <button className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors">
                                <Pencil className="w-4 h-4" />
                              </button>
                            </Link>
                            <button
                              onClick={() => {
                                setUserToDelete(user)
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
                  {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} of {totalCount} users
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
          setUserToDelete(null)
        }}
        onConfirm={handleDelete}
        title="Delete User"
        message={`Are you sure you want to delete "${userToDelete?.full_name}"? This action cannot be undone.`}
        confirmText="Delete"
        isLoading={isDeleting}
      />
    </div>
  )
}
