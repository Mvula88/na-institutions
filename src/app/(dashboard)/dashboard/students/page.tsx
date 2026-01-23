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
  X,
  AlertTriangle,
  TrendingUp,
  Upload,
  GraduationCap,
  UserCheck,
  UserX,
  Calendar,
  Loader2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { checkStudentLimit, formatLimit, type StudentLimitCheck } from '@/lib/subscription-limits'

interface Student {
  id: string
  student_number: string | null
  full_name: string
  email: string | null
  phone: string | null
  gender: string | null
  grade: string | null
  status: string
  registration_date: string
  parent_name: string | null
  parent_phone: string | null
}

interface Subject {
  id: string
  name: string
  code: string | null
}

interface StudentStats {
  total: number
  active: number
  inactive: number
  graduated: number
  withdrawn: number
  byGender: { male: number; female: number; other: number }
}

const ITEMS_PER_PAGE = 10

export default function StudentsPage() {
  const { user } = useAuthStore()
  const [students, setStudents] = useState<Student[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [grades, setGrades] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [genderFilter, setGenderFilter] = useState('')
  const [gradeFilter, setGradeFilter] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('')
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('')
  const [paymentMonthFilter, setPaymentMonthFilter] = useState('')
  const [paymentYearFilter, setPaymentYearFilter] = useState(new Date().getFullYear().toString())
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Stats
  const [stats, setStats] = useState<StudentStats | null>(null)
  const [isLoadingStats, setIsLoadingStats] = useState(true)

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Student limit state
  const [studentLimit, setStudentLimit] = useState<StudentLimitCheck | null>(null)

  useEffect(() => {
    fetchSubjects()
    fetchGrades()
    fetchStudentLimit()
    fetchStats()
  }, [user?.institution_id])

  async function fetchStats() {
    if (!user?.institution_id) return

    setIsLoadingStats(true)
    const supabase = createClient()

    try {
      const { data } = await supabase
        .from('students')
        .select('status, gender')
        .eq('institution_id', user.institution_id)

      const students = (data || []) as { status: string; gender: string | null }[]

      setStats({
        total: students.length,
        active: students.filter(s => s.status === 'active').length,
        inactive: students.filter(s => s.status === 'inactive').length,
        graduated: students.filter(s => s.status === 'graduated').length,
        withdrawn: students.filter(s => s.status === 'withdrawn').length,
        byGender: {
          male: students.filter(s => s.gender === 'male').length,
          female: students.filter(s => s.gender === 'female').length,
          other: students.filter(s => s.gender === 'other' || !s.gender).length,
        },
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setIsLoadingStats(false)
    }
  }

  async function fetchStudentLimit() {
    if (!user?.institution_id) return
    const limit = await checkStudentLimit(user.institution_id)
    setStudentLimit(limit)
  }

  useEffect(() => {
    fetchStudents()
  }, [user?.institution_id, currentPage, statusFilter, genderFilter, gradeFilter, subjectFilter, paymentStatusFilter, paymentMonthFilter, paymentYearFilter])

  async function fetchSubjects() {
    if (!user?.institution_id) return
    const supabase = createClient()

    const { data } = await supabase
      .from('courses')
      .select('id, name, code')
      .eq('institution_id', user.institution_id)
      .eq('is_active', true)
      .order('name')

    setSubjects(data || [])
  }

  async function fetchGrades() {
    if (!user?.institution_id) return
    const supabase = createClient()

    const { data } = await supabase
      .from('students')
      .select('grade')
      .eq('institution_id', user.institution_id)
      .not('grade', 'is', null)

    // Extract unique grades
    const typedData = (data || []) as { grade: string | null }[]
    const uniqueGrades = [...new Set(typedData.map(s => s.grade).filter(Boolean))] as string[]
    setGrades(uniqueGrades.sort())
  }

  async function fetchStudents() {
    if (!user?.institution_id) return

    setIsLoading(true)
    const supabase = createClient()

    try {
      // If filtering by course, we need to get student IDs first
      let studentIdsFromSubject: string[] | null = null
      if (subjectFilter) {
        const { data: studentEnrollments } = await supabase
          .from('student_enrollments')
          .select('student_id')
          .eq('course_id', subjectFilter)
          .eq('is_active', true)

        const typedEnrollments = (studentEnrollments || []) as { student_id: string }[]
        studentIdsFromSubject = typedEnrollments.map(se => se.student_id)
      }

      // If filtering by payment status, get student IDs with outstanding/paid fees
      let studentIdsFromPayment: string[] | null = null
      if (paymentStatusFilter || paymentMonthFilter) {
        let feeQuery = supabase
          .from('student_fees')
          .select('student_id, amount_due, amount_paid, fee_month')
          .eq('institution_id', user.institution_id)

        // Filter by specific month if selected
        if (paymentMonthFilter && paymentYearFilter) {
          const feeMonth = `${paymentYearFilter}-${paymentMonthFilter.padStart(2, '0')}-01`
          feeQuery = feeQuery.eq('fee_month', feeMonth)
        }

        const { data: studentFees } = await feeQuery

        if (studentFees) {
          interface FeeData { student_id: string; amount_due: number; amount_paid: number; fee_month: string }
          const typedFees = studentFees as FeeData[]
          const studentPaymentMap = new Map<string, { total: number; paid: number }>()
          typedFees.forEach(fee => {
            const current = studentPaymentMap.get(fee.student_id) || { total: 0, paid: 0 }
            studentPaymentMap.set(fee.student_id, {
              total: current.total + (fee.amount_due || 0),
              paid: current.paid + (fee.amount_paid || 0),
            })
          })

          studentIdsFromPayment = []

          if (paymentStatusFilter) {
            studentPaymentMap.forEach((value, studentId) => {
              const outstanding = value.total - value.paid
              if (paymentStatusFilter === 'paid' && outstanding <= 0 && value.total > 0) {
                studentIdsFromPayment!.push(studentId)
              } else if (paymentStatusFilter === 'unpaid' && outstanding > 0 && value.paid === 0) {
                studentIdsFromPayment!.push(studentId)
              } else if (paymentStatusFilter === 'partial' && outstanding > 0 && value.paid > 0) {
                studentIdsFromPayment!.push(studentId)
              }
            })
          } else if (paymentMonthFilter) {
            // If only month filter without status, show students who have fees for that month
            studentPaymentMap.forEach((value, studentId) => {
              studentIdsFromPayment!.push(studentId)
            })
          }
        }
      }

      let query = supabase
        .from('students')
        .select('*', { count: 'exact' })
        .eq('institution_id', user.institution_id)
        .order('created_at', { ascending: false })

      // Apply filters
      if (statusFilter) {
        query = query.eq('status', statusFilter)
      }
      if (genderFilter) {
        query = query.eq('gender', genderFilter)
      }
      if (gradeFilter) {
        query = query.eq('grade', gradeFilter)
      }
      if (searchQuery) {
        query = query.or(`full_name.ilike.%${searchQuery}%,student_number.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`)
      }
      if (studentIdsFromSubject !== null) {
        if (studentIdsFromSubject.length === 0) {
          setStudents([])
          setTotalCount(0)
          setIsLoading(false)
          return
        }
        query = query.in('id', studentIdsFromSubject)
      }
      if (studentIdsFromPayment !== null) {
        if (studentIdsFromPayment.length === 0) {
          setStudents([])
          setTotalCount(0)
          setIsLoading(false)
          return
        }
        query = query.in('id', studentIdsFromPayment)
      }

      // Pagination
      const from = (currentPage - 1) * ITEMS_PER_PAGE
      const to = from + ITEMS_PER_PAGE - 1
      query = query.range(from, to)

      const { data, count, error } = await query

      if (error) throw error

      setStudents((data || []) as Student[])
      setTotalCount(count || 0)
    } catch (error) {
      console.error('Error fetching students:', error)
      toast.error('Failed to fetch students')
    } finally {
      setIsLoading(false)
    }
  }

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1)
      fetchStudents()
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  async function handleDelete() {
    if (!studentToDelete) return

    setIsDeleting(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', studentToDelete.id)

      if (error) throw error

      toast.success('Student deleted successfully')
      setDeleteModalOpen(false)
      setStudentToDelete(null)
      fetchStudents()
    } catch (error) {
      console.error('Error deleting student:', error)
      toast.error('Failed to delete student')
    } finally {
      setIsDeleting(false)
    }
  }

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-green-100 text-green-700',
      inactive: 'bg-gray-100 text-gray-700',
      graduated: 'bg-blue-100 text-blue-700',
      withdrawn: 'bg-red-100 text-red-700',
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
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-semibold text-gray-900">Students</h1>
                {studentLimit && studentLimit.limit !== -1 && (
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                    studentLimit.isAtLimit
                      ? 'bg-red-100 text-red-700'
                      : studentLimit.isNearLimit
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {studentLimit.current}/{formatLimit(studentLimit.limit)}
                    {studentLimit.isAtLimit && ' (Limit reached)'}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-gray-500">Manage and track all registered students</p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/dashboard/students/import">
                <Button variant="outline" size="lg" leftIcon={<Upload className="w-4 h-4" />}>
                  Import CSV
                </Button>
              </Link>
              {studentLimit?.isAtLimit ? (
                <Link href="/dashboard/subscription">
                  <Button size="lg" leftIcon={<TrendingUp className="w-5 h-5" />}>
                    Upgrade Plan
                  </Button>
                </Link>
              ) : (
                <Link href="/dashboard/students/new">
                  <Button size="lg" leftIcon={<Plus className="w-5 h-5" />}>
                    Add Student
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-6 space-y-6">
        {/* Student Limit Warnings */}
        {studentLimit?.isNearLimit && !studentLimit.isAtLimit && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800">Approaching student limit</p>
              <p className="text-sm text-amber-700 mt-1">
                You&apos;re using {studentLimit.percentUsed}% of your {studentLimit.tier} plan limit ({studentLimit.current}/{studentLimit.limit} students).{' '}
                <Link href="/dashboard/subscription" className="underline font-medium">
                  Upgrade your plan
                </Link>{' '}
                to add more students.
              </p>
            </div>
          </div>
        )}

        {studentLimit?.isAtLimit && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-800">Student limit reached</p>
              <p className="text-sm text-red-700 mt-1">
                You&apos;ve reached your {studentLimit.tier} plan limit of {studentLimit.limit} students.{' '}
                <Link href="/dashboard/subscription" className="underline font-medium">
                  Upgrade your plan
                </Link>{' '}
                to add more students.
              </p>
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Students</p>
                <p className="mt-2 text-2xl font-semibold text-gray-900">
                  {isLoadingStats ? '...' : stats?.total || 0}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <GraduationCap className="w-6 h-6 text-blue-600" />
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
                  {stats && stats.total > 0 ? `${Math.round((stats.active / stats.total) * 100)}%` : '0%'} of total
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
                  Not currently enrolled
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
                <p className="text-sm font-medium text-gray-500">Graduated</p>
                <p className="mt-2 text-2xl font-semibold text-purple-600">
                  {isLoadingStats ? '...' : stats?.graduated || 0}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Completed their studies
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-xl">
                <TrendingUp className="w-6 h-6 text-purple-600" />
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
                placeholder="Search by name, student ID, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none text-sm"
              />
            </div>

            {/* Quick filters */}
            <Select
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
                { value: 'graduated', label: 'Graduated' },
                { value: 'withdrawn', label: 'Withdrawn' },
              ]}
              placeholder="Status"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1) }}
              className="w-32"
            />
            <Select
              options={[
                { value: 'male', label: 'Male' },
                { value: 'female', label: 'Female' },
              ]}
              placeholder="Gender"
              value={genderFilter}
              onChange={(e) => { setGenderFilter(e.target.value); setCurrentPage(1) }}
              className="w-28"
            />
            <Select
              options={grades.map(g => ({ value: g, label: `Grade ${g}` }))}
              placeholder="Grade"
              value={gradeFilter}
              onChange={(e) => { setGradeFilter(e.target.value); setCurrentPage(1) }}
              className="w-28"
            />
            <Select
              options={subjects.map(s => ({ value: s.id, label: s.name }))}
              placeholder="Subject"
              value={subjectFilter}
              onChange={(e) => { setSubjectFilter(e.target.value); setCurrentPage(1) }}
              className="w-36"
            />

            {/* Payment filter group */}
            <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-1.5 border border-gray-200">
              <Calendar className="w-4 h-4 text-gray-400" />
              <Select
                options={[
                  { value: '1', label: 'January' }, { value: '2', label: 'February' }, { value: '3', label: 'March' },
                  { value: '4', label: 'April' }, { value: '5', label: 'May' }, { value: '6', label: 'June' },
                  { value: '7', label: 'July' }, { value: '8', label: 'August' }, { value: '9', label: 'September' },
                  { value: '10', label: 'October' }, { value: '11', label: 'November' }, { value: '12', label: 'December' },
                ]}
                placeholder="Month"
                value={paymentMonthFilter}
                onChange={(e) => { setPaymentMonthFilter(e.target.value); setCurrentPage(1) }}
                className="w-28 border-0 bg-transparent"
              />
              <Select
                options={[
                  { value: (new Date().getFullYear() - 1).toString(), label: (new Date().getFullYear() - 1).toString() },
                  { value: new Date().getFullYear().toString(), label: new Date().getFullYear().toString() },
                  { value: (new Date().getFullYear() + 1).toString(), label: (new Date().getFullYear() + 1).toString() },
                ]}
                value={paymentYearFilter}
                onChange={(e) => { setPaymentYearFilter(e.target.value); setCurrentPage(1) }}
                className="w-20 border-0 bg-transparent"
              />
              <Select
                options={[
                  { value: 'paid', label: 'Paid' },
                  { value: 'partial', label: 'Partial' },
                  { value: 'unpaid', label: 'Unpaid' },
                ]}
                placeholder="Status"
                value={paymentStatusFilter}
                onChange={(e) => { setPaymentStatusFilter(e.target.value); setCurrentPage(1) }}
                className="w-24 border-0 bg-transparent"
              />
            </div>

            {/* Clear all button */}
            {(statusFilter || genderFilter || gradeFilter || subjectFilter || paymentStatusFilter || paymentMonthFilter) && (
              <button
                onClick={() => {
                  setStatusFilter(''); setGenderFilter(''); setGradeFilter('')
                  setSubjectFilter(''); setPaymentStatusFilter(''); setPaymentMonthFilter('')
                  setCurrentPage(1)
                }}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
                Clear filters
              </button>
            )}
          </div>

          {/* Active filters tags */}
          {(statusFilter || genderFilter || gradeFilter || subjectFilter || paymentStatusFilter || paymentMonthFilter) && (
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
              {statusFilter && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-full">
                  {statusFilter}
                  <button onClick={() => { setStatusFilter(''); setCurrentPage(1) }} className="hover:text-blue-900">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              )}
              {genderFilter && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 text-purple-700 text-sm rounded-full">
                  {genderFilter}
                  <button onClick={() => { setGenderFilter(''); setCurrentPage(1) }} className="hover:text-purple-900">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              )}
              {gradeFilter && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 text-sm rounded-full">
                  Grade {gradeFilter}
                  <button onClick={() => { setGradeFilter(''); setCurrentPage(1) }} className="hover:text-green-900">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              )}
              {subjectFilter && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-cyan-50 text-cyan-700 text-sm rounded-full">
                  {subjects.find(s => s.id === subjectFilter)?.name}
                  <button onClick={() => { setSubjectFilter(''); setCurrentPage(1) }} className="hover:text-cyan-900">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              )}
              {paymentMonthFilter && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 text-sm rounded-full">
                  {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][parseInt(paymentMonthFilter) - 1]} {paymentYearFilter}
                  <button onClick={() => { setPaymentMonthFilter(''); setCurrentPage(1) }} className="hover:text-amber-900">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              )}
              {paymentStatusFilter && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 text-sm rounded-full">
                  Payment: {paymentStatusFilter}
                  <button onClick={() => { setPaymentStatusFilter(''); setCurrentPage(1) }} className="hover:text-amber-900">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
              <p className="mt-2 text-sm text-gray-500">Loading students...</p>
            </div>
          ) : students.length === 0 ? (
            <div className="p-12 text-center">
              <GraduationCap className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No students found</h3>
              <p className="text-gray-500 mb-6">
                {searchQuery || statusFilter || genderFilter
                  ? 'Try adjusting your filters'
                  : 'Get started by adding your first student'}
              </p>
              {!searchQuery && !statusFilter && !genderFilter && (
                <Link href="/dashboard/students/new">
                  <Button leftIcon={<Plus className="w-4 h-4" />}>
                    Add Student
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-gray-100">
                {students.map((student) => (
                  <Link
                    key={student.id}
                    href={`/dashboard/students/${student.id}`}
                    className="block p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-gray-900">{student.full_name}</p>
                        <p className="text-sm text-gray-500">{student.student_number || 'No ID'}</p>
                      </div>
                      <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${getStatusBadge(student.status)}`}>
                        {student.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-gray-500">Grade</p>
                        <p className="text-gray-900">{student.grade || '-'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Phone</p>
                        <p className="text-gray-900">{student.phone || '-'}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Student
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Grade
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Parent/Guardian
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
                    {students.map((student) => (
                      <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-gray-900">{student.full_name}</p>
                            <p className="text-sm text-gray-500">{student.student_number || 'No ID'}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-gray-900">{student.phone || '-'}</p>
                            <p className="text-sm text-gray-500">{student.email || '-'}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-900">
                          {student.grade || '-'}
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-gray-900">{student.parent_name || '-'}</p>
                            <p className="text-sm text-gray-500">{student.parent_phone || '-'}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${getStatusBadge(student.status)}`}>
                            {student.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <Link href={`/dashboard/students/${student.id}`}>
                              <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                <Eye className="w-4 h-4" />
                              </button>
                            </Link>
                            <Link href={`/dashboard/students/${student.id}/edit`}>
                              <button className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors">
                                <Pencil className="w-4 h-4" />
                              </button>
                            </Link>
                            <button
                              onClick={(e) => {
                                e.preventDefault()
                                setStudentToDelete(student)
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
          setStudentToDelete(null)
        }}
        onConfirm={handleDelete}
        title="Delete Student"
        message={`Are you sure you want to delete "${studentToDelete?.full_name}"? This action cannot be undone.`}
        confirmText="Delete"
        isLoading={isDeleting}
      />
    </div>
  )
}
