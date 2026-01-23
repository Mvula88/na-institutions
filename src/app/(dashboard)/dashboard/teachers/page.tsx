'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
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
  BookOpen,
  X,
  UserCheck,
  UserX,
  Loader2,
  GraduationCap,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Teacher {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  gender: string | null
  qualification: string | null
  specialization: string | null
  status: string
  date_joined: string | null
  subjects?: { id: string; name: string }[]
}

interface TeacherStats {
  total: number
  active: number
  inactive: number
  terminated: number
}

const ITEMS_PER_PAGE = 10

export default function TeachersPage() {
  const { user } = useAuthStore()
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Stats
  const [stats, setStats] = useState<TeacherStats | null>(null)
  const [isLoadingStats, setIsLoadingStats] = useState(true)

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [teacherToDelete, setTeacherToDelete] = useState<Teacher | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    fetchTeachers()
    fetchStats()
  }, [user?.institution_id, currentPage, statusFilter])

  async function fetchStats() {
    if (!user?.institution_id) return

    setIsLoadingStats(true)
    const supabase = createClient()

    try {
      const { data } = await supabase
        .from('lecturers')
        .select('status')
        .eq('institution_id', user.institution_id)

      const teachers = (data || []) as { status: string }[]

      setStats({
        total: teachers.length,
        active: teachers.filter(t => t.status === 'active').length,
        inactive: teachers.filter(t => t.status === 'inactive').length,
        terminated: teachers.filter(t => t.status === 'terminated').length,
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setIsLoadingStats(false)
    }
  }

  async function fetchTeachers() {
    if (!user?.institution_id) return

    setIsLoading(true)
    const supabase = createClient()

    try {
      let query = supabase
        .from('lecturers')
        .select('*', { count: 'exact' })
        .eq('institution_id', user.institution_id)
        .order('created_at', { ascending: false })

      // Apply filters
      if (statusFilter) {
        query = query.eq('status', statusFilter)
      }
      if (searchQuery) {
        query = query.or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`)
      }

      // Pagination
      const from = (currentPage - 1) * ITEMS_PER_PAGE
      const to = from + ITEMS_PER_PAGE - 1
      query = query.range(from, to)

      const { data, count, error } = await query

      if (error) throw error

      // Fetch subjects for each teacher
      const teachersWithSubjects = await Promise.all(
        ((data || []) as Teacher[]).map(async (teacher) => {
          const { data: teacherSubjects } = await supabase
            .from('teacher_subjects')
            .select('subject:subjects(id, name)')
            .eq('teacher_id', teacher.id)

          type SubjectData = { subject: { id: string; name: string } | null }
          const subjects = (teacherSubjects as SubjectData[] | null)
            ?.map((ts) => ts.subject)
            .filter((s): s is { id: string; name: string } => s !== null) || []

          return { ...teacher, subjects }
        })
      )

      setTeachers(teachersWithSubjects)
      setTotalCount(count || 0)
    } catch (error) {
      console.error('Error fetching teachers:', error)
      toast.error('Failed to fetch teachers')
    } finally {
      setIsLoading(false)
    }
  }

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1)
      fetchTeachers()
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  async function handleDelete() {
    if (!teacherToDelete) return

    setIsDeleting(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('lecturers')
        .delete()
        .eq('id', teacherToDelete.id)

      if (error) throw error

      toast.success('Teacher deleted successfully')
      setDeleteModalOpen(false)
      setTeacherToDelete(null)
      fetchTeachers()
      fetchStats()
    } catch (error) {
      console.error('Error deleting teacher:', error)
      toast.error('Failed to delete teacher')
    } finally {
      setIsDeleting(false)
    }
  }

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-green-100 text-green-700',
      inactive: 'bg-gray-100 text-gray-700',
      terminated: 'bg-red-100 text-red-700',
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
              <h1 className="text-2xl font-semibold text-gray-900">Teachers</h1>
              <p className="mt-1 text-sm text-gray-500">Manage your teaching staff and their subject assignments</p>
            </div>
            <Link href="/dashboard/teachers/new">
              <Button size="lg" leftIcon={<Plus className="w-5 h-5" />}>
                Add Teacher
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-6 space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Teachers</p>
                <p className="mt-2 text-2xl font-semibold text-gray-900">
                  {isLoadingStats ? '...' : stats?.total || 0}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Active</p>
                <p className="mt-2 text-2xl font-semibold text-green-600">
                  {isLoadingStats ? '...' : stats?.active || 0}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Currently teaching
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-xl">
                <UserCheck className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Inactive</p>
                <p className="mt-2 text-2xl font-semibold text-gray-600">
                  {isLoadingStats ? '...' : stats?.inactive || 0}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  On leave or unavailable
                </p>
              </div>
              <div className="p-3 bg-gray-100 rounded-xl">
                <UserX className="w-6 h-6 text-gray-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Terminated</p>
                <p className="mt-2 text-2xl font-semibold text-red-600">
                  {isLoadingStats ? '...' : stats?.terminated || 0}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  No longer employed
                </p>
              </div>
              <div className="p-3 bg-red-100 rounded-xl">
                <UserX className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[250px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none text-sm"
              />
            </div>

            <Select
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
                { value: 'terminated', label: 'Terminated' },
              ]}
              placeholder="All Status"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="w-40"
            />

            {statusFilter && (
              <button
                onClick={() => { setStatusFilter(''); setCurrentPage(1) }}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
                Clear filter
              </button>
            )}
          </div>

          {/* Active filter tag */}
          {statusFilter && (
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-full">
                Status: {statusFilter}
                <button onClick={() => { setStatusFilter(''); setCurrentPage(1) }} className="hover:text-blue-900">
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
              <p className="mt-2 text-sm text-gray-500">Loading teachers...</p>
            </div>
          ) : teachers.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No teachers found</h3>
              <p className="text-gray-500 mb-6">
                {searchQuery || statusFilter
                  ? 'Try adjusting your filters'
                  : 'Get started by adding your first teacher'}
              </p>
              {!searchQuery && !statusFilter && (
                <Link href="/dashboard/teachers/new">
                  <Button leftIcon={<Plus className="w-4 h-4" />}>
                    Add Teacher
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-gray-100">
                {teachers.map((teacher) => (
                  <Link
                    key={teacher.id}
                    href={`/dashboard/teachers/${teacher.id}`}
                    className="block p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-gray-900">{teacher.full_name}</p>
                        <p className="text-sm text-gray-500">{teacher.email || '-'}</p>
                      </div>
                      <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${getStatusBadge(teacher.status)}`}>
                        {teacher.status}
                      </span>
                    </div>
                    {teacher.subjects && teacher.subjects.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {teacher.subjects.slice(0, 3).map((subject) => (
                          <span
                            key={subject.id}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700"
                          >
                            {subject.name}
                          </span>
                        ))}
                        {teacher.subjects.length > 3 && (
                          <span className="text-xs text-gray-500">
                            +{teacher.subjects.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </Link>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Teacher
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Subjects
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Qualification
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {teachers.map((teacher) => (
                      <tr key={teacher.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-gray-900">{teacher.full_name}</p>
                            <p className="text-sm text-gray-500 capitalize">{teacher.gender || '-'}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-gray-900">{teacher.phone || '-'}</p>
                            <p className="text-sm text-gray-500">{teacher.email || '-'}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {teacher.subjects && teacher.subjects.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {teacher.subjects.slice(0, 3).map((subject) => (
                                <span
                                  key={subject.id}
                                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700"
                                >
                                  {subject.name}
                                </span>
                              ))}
                              {teacher.subjects.length > 3 && (
                                <span className="text-xs text-gray-500">
                                  +{teacher.subjects.length - 3} more
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">No subjects</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-gray-900">
                          {teacher.qualification || '-'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${getStatusBadge(teacher.status)}`}>
                            {teacher.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <Link href={`/dashboard/teachers/${teacher.id}`}>
                              <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                <Eye className="w-4 h-4" />
                              </button>
                            </Link>
                            <Link href={`/dashboard/teachers/${teacher.id}/edit`}>
                              <button className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors">
                                <Pencil className="w-4 h-4" />
                              </button>
                            </Link>
                            <button
                              onClick={(e) => {
                                e.preventDefault()
                                setTeacherToDelete(teacher)
                                setDeleteModalOpen(true)
                              }}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
                  <p className="text-sm text-gray-600">
                    Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
                    {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} of {totalCount}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-2 text-gray-500 hover:text-gray-700 hover:bg-white rounded-lg border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="px-3 py-1 text-sm font-medium text-gray-700">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 text-gray-500 hover:text-gray-700 hover:bg-white rounded-lg border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
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
          setTeacherToDelete(null)
        }}
        onConfirm={handleDelete}
        title="Delete Teacher"
        message={`Are you sure you want to delete "${teacherToDelete?.full_name}"? This action cannot be undone.`}
        confirmText="Delete"
        isLoading={isDeleting}
      />
    </div>
  )
}
