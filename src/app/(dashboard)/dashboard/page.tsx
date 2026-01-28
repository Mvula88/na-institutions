'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import {
  Users,
  GraduationCap,
  BookOpen,
  CreditCard,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  ArrowRight,
  Calendar,
  Clock,
  UserPlus,
  Receipt,
  FileText,
  Settings,
  ChevronRight,
  BarChart3,
} from 'lucide-react'
import type { DashboardStats } from '@/types'
import { formatCurrency } from '@/lib/currency'
import { OnboardingChecklist } from '@/components/onboarding'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'

interface MonthlyPayment {
  month: string
  amount: number
  count: number
}

const COLORS = ['#3B82F6', '#EC4899', '#8B5CF6', '#10B981']
const FEE_COLORS = ['#22C55E', '#F59E0B', '#EF4444']

export default function DashboardPage() {
  const { user } = useAuthStore()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [monthlyPayments, setMonthlyPayments] = useState<MonthlyPayment[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      if (!user?.institution_id) return

      const supabase = createClient()

      try {
        // Fetch all stats in parallel
        const [
          studentsResult,
          lecturersResult,
          coursesResult,
          programsResult,
          feesResult,
          paymentsResult,
        ] = await Promise.all([
          // Total and active students
          supabase
            .from('students')
            .select('id, status, gender', { count: 'exact' })
            .eq('institution_id', user.institution_id),

          // Total lecturers
          supabase
            .from('lecturers')
            .select('id', { count: 'exact' })
            .eq('institution_id', user.institution_id)
            .eq('status', 'active'),

          // Total courses
          supabase
            .from('courses')
            .select('id', { count: 'exact' })
            .eq('institution_id', user.institution_id)
            .eq('is_active', true),

          // Total programs
          supabase
            .from('programs')
            .select('id', { count: 'exact' })
            .eq('institution_id', user.institution_id)
            .eq('is_active', true),

          // Fees summary
          supabase
            .from('student_fees')
            .select('amount_due, amount_paid, status')
            .eq('institution_id', user.institution_id),

          // Recent payments
          supabase
            .from('payments')
            .select(`
              id,
              amount,
              payment_date,
              student:students(full_name)
            `)
            .eq('institution_id', user.institution_id)
            .order('payment_date', { ascending: false })
            .limit(5),
        ])

        // Calculate stats
        type StudentData = { id: string; status: string; gender: string | null }
        type FeeData = { amount_due: number; amount_paid: number; status: string }
        type PaymentData = { id: string; amount: number; payment_date: string; student: { full_name: string } | null }

        const students = (studentsResult.data || []) as StudentData[]
        const activeStudents = students.filter(s => s.status === 'active').length
        const maleStudents = students.filter(s => s.gender === 'male').length
        const femaleStudents = students.filter(s => s.gender === 'female').length
        const otherStudents = students.filter(s => s.gender === 'other').length

        const fees = (feesResult.data || []) as FeeData[]
        const totalFeesCollected = fees.reduce((sum, f) => sum + (f.amount_paid || 0), 0)
        const totalOutstanding = fees.reduce((sum, f) => sum + ((f.amount_due || 0) - (f.amount_paid || 0)), 0)
        const paidCount = fees.filter(f => f.status === 'paid').length
        const partialCount = fees.filter(f => f.status === 'partial').length
        const unpaidCount = fees.filter(f => f.status === 'unpaid').length

        const recentPayments = ((paymentsResult.data || []) as PaymentData[]).map(p => ({
          id: p.id,
          student_name: p.student?.full_name || 'Unknown',
          amount: p.amount,
          payment_date: p.payment_date,
        }))

        // Fetch monthly payment totals for the current year
        const currentYear = new Date().getFullYear()
        const { data: allPayments } = await supabase
          .from('payments')
          .select('amount, payment_date')
          .eq('institution_id', user.institution_id)
          .gte('payment_date', `${currentYear}-01-01`)
          .lte('payment_date', `${currentYear}-12-31`)

        // Group payments by month
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        const monthlyData: MonthlyPayment[] = monthNames.map((month, index) => ({
          month,
          amount: 0,
          count: 0,
        }))

        if (allPayments) {
          allPayments.forEach((payment: { amount: number; payment_date: string }) => {
            const monthIndex = new Date(payment.payment_date).getMonth()
            monthlyData[monthIndex].amount += payment.amount
            monthlyData[monthIndex].count += 1
          })
        }

        // Only show months up to current month
        const currentMonth = new Date().getMonth()
        setMonthlyPayments(monthlyData.slice(0, currentMonth + 1))

        setStats({
          totalStudents: students.length,
          activeStudents,
          totalLecturers: lecturersResult.count || 0,
          totalCourses: coursesResult.count || 0,
          totalPrograms: programsResult.count || 0,
          totalFeesCollected,
          totalOutstanding,
          recentPayments,
          studentsByGender: {
            male: maleStudents,
            female: femaleStudents,
            other: otherStudents,
          },
          paymentStatusBreakdown: {
            paid: paidCount,
            partial: partialCount,
            unpaid: unpaidCount,
          },
        })
      } catch (error) {
        console.error('Error fetching stats:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [user?.institution_id])

  if (isLoading) {
    return (
      <div className="p-4 md:p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const currentDate = new Date()
  const greeting = currentDate.getHours() < 12 ? 'Good morning' : currentDate.getHours() < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            {greeting}, {user?.full_name?.split(' ')[0]}
          </h1>
          <p className="text-gray-500 mt-1 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {currentDate.toLocaleDateString('en-ZA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/students/new">
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
              <UserPlus className="w-4 h-4" />
              Add Student
            </button>
          </Link>
          <Link href="/dashboard/payments/new">
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
              <Receipt className="w-4 h-4" />
              Record Payment
            </button>
          </Link>
        </div>
      </div>

      {/* Onboarding Checklist - shown for new users */}
      <OnboardingChecklist />

      {/* Quick Stats */}
      <div data-tour="dashboard-stats" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Students</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats?.totalStudents || 0}</p>
              <p className="text-sm text-gray-500 mt-1">
                {stats?.activeStudents || 0} active
              </p>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl">
              <GraduationCap className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <Link href="/dashboard/students" className="mt-4 flex items-center text-sm text-blue-600 font-medium hover:text-blue-700">
            View all students <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Active Teachers</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats?.totalLecturers || 0}</p>
              <p className="text-sm text-gray-500 mt-1">Teaching staff</p>
            </div>
            <div className="p-3 bg-green-50 rounded-xl">
              <Users className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <Link href="/dashboard/teachers" className="mt-4 flex items-center text-sm text-green-600 font-medium hover:text-green-700">
            View all teachers <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Fees Collected</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{formatCurrency(stats?.totalFeesCollected || 0)}</p>
              <p className="text-sm text-gray-500 mt-1">Total collected</p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl">
              <CreditCard className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
          <Link href="/dashboard/payments" className="mt-4 flex items-center text-sm text-emerald-600 font-medium hover:text-emerald-700">
            View payments <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Courses</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats?.totalCourses || 0}</p>
              <p className="text-sm text-gray-500 mt-1">Active courses</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-xl">
              <BookOpen className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <Link href="/dashboard/courses" className="mt-4 flex items-center text-sm text-purple-600 font-medium hover:text-purple-700">
            Manage courses <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        </div>
      </div>

      {/* Outstanding Alert */}
      {(stats?.totalOutstanding || 0) > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-800">Outstanding Fees</p>
              <p className="text-sm text-amber-700">
                You have {formatCurrency(stats?.totalOutstanding || 0)} in outstanding fees from students.
              </p>
            </div>
          </div>
          <Link href="/dashboard/payments/outstanding">
            <button className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors whitespace-nowrap">
              View Details <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link href="/dashboard/students/new" className="group">
            <div className="bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-md transition-all">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-blue-200 transition-colors">
                <UserPlus className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-medium text-gray-900">Add Student</h3>
              <p className="text-xs text-gray-500 mt-1">Register a new student</p>
            </div>
          </Link>

          <Link href="/dashboard/payments/new" className="group">
            <div className="bg-white rounded-xl border border-gray-200 p-4 hover:border-green-300 hover:shadow-md transition-all">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-green-200 transition-colors">
                <Receipt className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="font-medium text-gray-900">Record Payment</h3>
              <p className="text-xs text-gray-500 mt-1">Process fee payment</p>
            </div>
          </Link>

          <Link href="/dashboard/reports" className="group">
            <div className="bg-white rounded-xl border border-gray-200 p-4 hover:border-purple-300 hover:shadow-md transition-all">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-purple-200 transition-colors">
                <FileText className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="font-medium text-gray-900">View Reports</h3>
              <p className="text-xs text-gray-500 mt-1">Analytics & insights</p>
            </div>
          </Link>

          <Link href="/dashboard/settings" className="group">
            <div className="bg-white rounded-xl border border-gray-200 p-4 hover:border-gray-400 hover:shadow-md transition-all">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-gray-200 transition-colors">
                <Settings className="w-5 h-5 text-gray-600" />
              </div>
              <h3 className="font-medium text-gray-900">Settings</h3>
              <p className="text-xs text-gray-500 mt-1">Configure your center</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Payment Trend Chart */}
      {monthlyPayments.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Payment Collection Trend</h2>
              <p className="text-sm text-gray-500">{new Date().getFullYear()} monthly collection</p>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg">
              <BarChart3 className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyPayments} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                <YAxis
                  tickFormatter={(value) => `N$${(value / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 12 }}
                  stroke="#9CA3AF"
                />
                <Tooltip
                  formatter={(value) => [formatCurrency(Number(value) || 0), 'Amount']}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }}
                />
                <Bar dataKey="amount" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Payments */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Recent Payments</h2>
            <Link href="/dashboard/payments" className="text-sm text-blue-600 font-medium hover:text-blue-700">
              View all
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {stats?.recentPayments && stats.recentPayments.length > 0 ? (
              stats.recentPayments.map((payment) => (
                <div key={payment.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{payment.student_name}</p>
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(payment.payment_date).toLocaleDateString('en-ZA', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <p className="font-semibold text-green-600">{formatCurrency(payment.amount)}</p>
                </div>
              ))
            ) : (
              <div className="p-8 text-center">
                <CreditCard className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No recent payments</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Student Demographics Chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Student Demographics</h2>
            {stats?.totalStudents && stats.totalStudents > 0 ? (
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Male', value: stats.studentsByGender.male },
                        { name: 'Female', value: stats.studentsByGender.female },
                        { name: 'Other', value: stats.studentsByGender.other },
                      ].filter(d => d.value > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {[
                        { name: 'Male', value: stats.studentsByGender.male },
                        { name: 'Female', value: stats.studentsByGender.female },
                        { name: 'Other', value: stats.studentsByGender.other },
                      ].filter(d => d.value > 0).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [Number(value) || 0, 'Students']}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      formatter={(value) => <span className="text-sm text-gray-600">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-gray-400">
                <p>No student data</p>
              </div>
            )}
          </div>

          {/* Fee Status Chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Fee Status Overview</h2>
            {(stats?.paymentStatusBreakdown.paid || 0) + (stats?.paymentStatusBreakdown.partial || 0) + (stats?.paymentStatusBreakdown.unpaid || 0) > 0 ? (
              <>
                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Paid', value: stats?.paymentStatusBreakdown.paid || 0 },
                          { name: 'Partial', value: stats?.paymentStatusBreakdown.partial || 0 },
                          { name: 'Unpaid', value: stats?.paymentStatusBreakdown.unpaid || 0 },
                        ].filter(d => d.value > 0)}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {[
                          { name: 'Paid', value: stats?.paymentStatusBreakdown.paid || 0 },
                          { name: 'Partial', value: stats?.paymentStatusBreakdown.partial || 0 },
                          { name: 'Unpaid', value: stats?.paymentStatusBreakdown.unpaid || 0 },
                        ].filter(d => d.value > 0).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={FEE_COLORS[index % FEE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => [Number(value) || 0, 'Fees']}
                        contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-4 mt-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-xs text-gray-600">Paid ({stats?.paymentStatusBreakdown.paid || 0})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                    <span className="text-xs text-gray-600">Partial ({stats?.paymentStatusBreakdown.partial || 0})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span className="text-xs text-gray-600">Unpaid ({stats?.paymentStatusBreakdown.unpaid || 0})</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-gray-400">
                <p>No fee data</p>
              </div>
            )}
            <Link href="/dashboard/payments/outstanding" className="mt-4 flex items-center justify-center text-sm text-blue-600 font-medium hover:text-blue-700">
              View outstanding fees <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
