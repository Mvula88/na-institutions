'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/input'
import {
  Plus,
  Search,
  Eye,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Calendar,
  CalendarPlus,
  X,
  TrendingUp,
  RotateCcw,
  FileText,
  DollarSign,
  CheckCircle,
  AlertCircle,
  ArrowUpRight,
  Users,
  Receipt,
  Loader2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { formatCurrency } from '@/lib/currency'
import { ProcessRefundModal } from '@/components/refunds/process-refund-modal'
import { BulkGenerateFeesModal } from '@/components/fees/bulk-generate-fees-modal'

interface Payment {
  id: string
  amount: number
  payment_method: string | null
  reference_number: string | null
  payment_date: string
  notes: string | null
  student: {
    id: string
    full_name: string
    student_number: string | null
  } | null
  recorded_by_user: {
    full_name: string
  } | null
}

interface FeeSummary {
  totalDue: number
  totalPaid: number
  totalOutstanding: number
  totalCredit: number
  byType: {
    registration: { due: number; paid: number; outstanding: number }
    tuition: { due: number; paid: number; outstanding: number }
  }
  byStatus: {
    paid: number
    partial: number
    unpaid: number
  }
  studentCount: number
}

const ITEMS_PER_PAGE = 10

const PAYMENT_METHODS: Record<string, string> = {
  cash: 'Cash',
  bank_transfer: 'Bank Transfer',
  card: 'Card',
  mobile_money: 'Mobile Money',
}

export default function PaymentsPage() {
  const { user, isCenterAdmin } = useAuthStore()
  const [payments, setPayments] = useState<Payment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [methodFilter, setMethodFilter] = useState('')
  const [monthFilter, setMonthFilter] = useState('')
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString())
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [totalAmount, setTotalAmount] = useState(0)
  const [refundModalOpen, setRefundModalOpen] = useState(false)
  const [bulkGenerateModalOpen, setBulkGenerateModalOpen] = useState(false)
  const [feeSummary, setFeeSummary] = useState<FeeSummary | null>(null)
  const [isLoadingSummary, setIsLoadingSummary] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions'>('overview')

  useEffect(() => {
    fetchPayments()
    fetchFeeSummary()
  }, [user?.institution_id, currentPage, methodFilter, monthFilter, yearFilter])

  async function fetchPayments() {
    if (!user?.institution_id) return

    setIsLoading(true)
    const supabase = createClient()

    try {
      let query = supabase
        .from('payments')
        .select(`
          id,
          amount,
          payment_method,
          reference_number,
          payment_date,
          notes,
          student:students(id, full_name, student_number),
          recorded_by_user:users!recorded_by(full_name)
        `, { count: 'exact' })
        .eq('institution_id', user.institution_id)
        .order('payment_date', { ascending: false })

      if (methodFilter) {
        query = query.eq('payment_method', methodFilter)
      }

      if (monthFilter && yearFilter) {
        const startOfMonth = `${yearFilter}-${monthFilter.padStart(2, '0')}-01T00:00:00`
        const lastDay = new Date(parseInt(yearFilter), parseInt(monthFilter), 0).getDate()
        const endOfMonth = `${yearFilter}-${monthFilter.padStart(2, '0')}-${lastDay}T23:59:59`
        query = query.gte('payment_date', startOfMonth).lte('payment_date', endOfMonth)
      }

      const from = (currentPage - 1) * ITEMS_PER_PAGE
      const to = from + ITEMS_PER_PAGE - 1
      query = query.range(from, to)

      const { data, count, error } = await query

      if (error) throw error

      let filteredPayments = (data || []) as Payment[]
      if (searchQuery) {
        const search = searchQuery.toLowerCase()
        filteredPayments = filteredPayments.filter(
          (p) =>
            p.student?.full_name.toLowerCase().includes(search) ||
            p.student?.student_number?.toLowerCase().includes(search) ||
            p.reference_number?.toLowerCase().includes(search)
        )
      }

      setPayments(filteredPayments)
      setTotalCount(count || 0)
      setTotalAmount(filteredPayments.reduce((sum, p) => sum + p.amount, 0))
    } catch (error) {
      console.error('Error fetching payments:', error)
      toast.error('Failed to fetch payments')
    } finally {
      setIsLoading(false)
    }
  }

  async function fetchFeeSummary() {
    if (!user?.institution_id) return

    setIsLoadingSummary(true)
    const supabase = createClient()

    try {
      const { data: feesData, error: feesError } = await supabase
        .from('student_fees')
        .select('fee_type, amount_due, amount_paid, status')
        .eq('institution_id', user.institution_id)

      if (feesError) throw feesError

      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, credit_balance')
        .eq('institution_id', user.institution_id)
        .eq('status', 'active')

      if (studentsError) throw studentsError

      const summary: FeeSummary = {
        totalDue: 0,
        totalPaid: 0,
        totalOutstanding: 0,
        totalCredit: 0,
        byType: {
          registration: { due: 0, paid: 0, outstanding: 0 },
          tuition: { due: 0, paid: 0, outstanding: 0 },
        },
        byStatus: { paid: 0, partial: 0, unpaid: 0 },
        studentCount: studentsData?.length || 0,
      }

      for (const fee of (feesData || []) as any[]) {
        const due = fee.amount_due || 0
        const paid = fee.amount_paid || 0
        const outstanding = due - paid

        summary.totalDue += due
        summary.totalPaid += paid
        summary.totalOutstanding += outstanding

        const feeType = fee.fee_type === 'registration' ? 'registration' : 'tuition'
        summary.byType[feeType].due += due
        summary.byType[feeType].paid += paid
        summary.byType[feeType].outstanding += outstanding

        if (fee.status === 'paid') summary.byStatus.paid++
        else if (fee.status === 'partial') summary.byStatus.partial++
        else summary.byStatus.unpaid++
      }

      for (const student of (studentsData || []) as any[]) {
        summary.totalCredit += student.credit_balance || 0
      }

      setFeeSummary(summary)
    } catch (error) {
      console.error('Error fetching fee summary:', error)
    } finally {
      setIsLoadingSummary(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1)
      fetchPayments()
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-ZA', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const collectionRate = feeSummary && feeSummary.totalDue > 0
    ? ((feeSummary.totalPaid / feeSummary.totalDue) * 100).toFixed(1)
    : '0'

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Payments</h1>
              <p className="mt-1 text-sm text-gray-500">
                Manage fees, payments, and financial records
              </p>
            </div>
            <Link href="/dashboard/payments/new">
              <Button size="lg" leftIcon={<Plus className="w-5 h-5" />}>
                Record Payment
              </Button>
            </Link>
          </div>

          {/* Tabs */}
          <div className="mt-6 flex gap-1 border-b border-gray-200 -mb-px">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'overview'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'transactions'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Transactions
            </button>
          </div>
        </div>
      </div>

      <div className="px-8 py-6">
        {activeTab === 'overview' ? (
          /* Overview Tab */
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total Fees Due</p>
                    <p className="mt-2 text-2xl font-semibold text-gray-900">
                      {isLoadingSummary ? '...' : formatCurrency(feeSummary?.totalDue || 0)}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-100 rounded-xl">
                    <DollarSign className="w-6 h-6 text-gray-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Collected</p>
                    <p className="mt-2 text-2xl font-semibold text-green-600">
                      {isLoadingSummary ? '...' : formatCurrency(feeSummary?.totalPaid || 0)}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {collectionRate}% collection rate
                    </p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-xl">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Outstanding</p>
                    <p className="mt-2 text-2xl font-semibold text-red-600">
                      {isLoadingSummary ? '...' : formatCurrency(feeSummary?.totalOutstanding || 0)}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {feeSummary?.byStatus.unpaid || 0} unpaid records
                    </p>
                  </div>
                  <div className="p-3 bg-red-100 rounded-xl">
                    <AlertCircle className="w-6 h-6 text-red-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Credit Balance</p>
                    <p className="mt-2 text-2xl font-semibold text-blue-600">
                      {isLoadingSummary ? '...' : formatCurrency(feeSummary?.totalCredit || 0)}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Available for allocation
                    </p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-xl">
                    <TrendingUp className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            {isCenterAdmin() && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Link href="/dashboard/payments/outstanding" className="group">
                    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:border-red-300 hover:shadow-md transition-all">
                      <div className="flex items-start justify-between">
                        <div className="p-2.5 bg-red-100 rounded-lg group-hover:bg-red-200 transition-colors">
                          <AlertCircle className="w-5 h-5 text-red-600" />
                        </div>
                        <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-red-600 transition-colors" />
                      </div>
                      <h3 className="mt-4 font-semibold text-gray-900">Outstanding Fees</h3>
                      <p className="mt-1 text-sm text-gray-500">View students who owe & send statements</p>
                      {feeSummary && feeSummary.totalOutstanding > 0 && (
                        <p className="mt-3 text-lg font-semibold text-red-600">
                          {formatCurrency(feeSummary.totalOutstanding)}
                        </p>
                      )}
                    </div>
                  </Link>

                  <button onClick={() => setBulkGenerateModalOpen(true)} className="group text-left">
                    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-300 hover:shadow-md transition-all h-full">
                      <div className="flex items-start justify-between">
                        <div className="p-2.5 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                          <CalendarPlus className="w-5 h-5 text-blue-600" />
                        </div>
                        <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
                      </div>
                      <h3 className="mt-4 font-semibold text-gray-900">Generate Fees</h3>
                      <p className="mt-1 text-sm text-gray-500">Create monthly fees for all students</p>
                    </div>
                  </button>

                  <Link href="/dashboard/payments/refunds" className="group">
                    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:border-purple-300 hover:shadow-md transition-all h-full">
                      <div className="flex items-start justify-between">
                        <div className="p-2.5 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                          <FileText className="w-5 h-5 text-purple-600" />
                        </div>
                        <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-purple-600 transition-colors" />
                      </div>
                      <h3 className="mt-4 font-semibold text-gray-900">View Refunds</h3>
                      <p className="mt-1 text-sm text-gray-500">Track all processed refunds</p>
                    </div>
                  </Link>

                  <button onClick={() => setRefundModalOpen(true)} className="group text-left">
                    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:border-amber-300 hover:shadow-md transition-all h-full">
                      <div className="flex items-start justify-between">
                        <div className="p-2.5 bg-amber-100 rounded-lg group-hover:bg-amber-200 transition-colors">
                          <RotateCcw className="w-5 h-5 text-amber-600" />
                        </div>
                        <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-amber-600 transition-colors" />
                      </div>
                      <h3 className="mt-4 font-semibold text-gray-900">Process Refund</h3>
                      <p className="mt-1 text-sm text-gray-500">Issue a refund to a student</p>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Fee Breakdown */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">By Fee Type</h3>
                {isLoadingSummary ? (
                  <div className="space-y-3">
                    <div className="h-16 bg-gray-100 rounded-lg animate-pulse"></div>
                    <div className="h-16 bg-gray-100 rounded-lg animate-pulse"></div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">Registration Fees</p>
                        <p className="text-sm text-gray-500">
                          {formatCurrency(feeSummary?.byType.registration.paid || 0)} of {formatCurrency(feeSummary?.byType.registration.due || 0)}
                        </p>
                      </div>
                      <span className={`text-lg font-semibold ${(feeSummary?.byType.registration.outstanding || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {(feeSummary?.byType.registration.outstanding || 0) > 0
                          ? formatCurrency(feeSummary?.byType.registration.outstanding || 0)
                          : 'Paid'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">Tuition Fees</p>
                        <p className="text-sm text-gray-500">
                          {formatCurrency(feeSummary?.byType.tuition.paid || 0)} of {formatCurrency(feeSummary?.byType.tuition.due || 0)}
                        </p>
                      </div>
                      <span className={`text-lg font-semibold ${(feeSummary?.byType.tuition.outstanding || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {(feeSummary?.byType.tuition.outstanding || 0) > 0
                          ? formatCurrency(feeSummary?.byType.tuition.outstanding || 0)
                          : 'Paid'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Fee Status Distribution</h3>
                {isLoadingSummary ? (
                  <div className="space-y-3">
                    <div className="h-12 bg-gray-100 rounded-lg animate-pulse"></div>
                    <div className="h-12 bg-gray-100 rounded-lg animate-pulse"></div>
                    <div className="h-12 bg-gray-100 rounded-lg animate-pulse"></div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-green-50">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <span className="font-medium text-gray-900">Fully Paid</span>
                      </div>
                      <span className="text-lg font-semibold text-gray-900">{feeSummary?.byStatus.paid || 0}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                        <span className="font-medium text-gray-900">Partially Paid</span>
                      </div>
                      <span className="text-lg font-semibold text-gray-900">{feeSummary?.byStatus.partial || 0}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-red-50">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <span className="font-medium text-gray-900">Unpaid</span>
                      </div>
                      <span className="text-lg font-semibold text-gray-900">{feeSummary?.byStatus.unpaid || 0}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Transactions Preview */}
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Recent Transactions</h3>
                <button
                  onClick={() => setActiveTab('transactions')}
                  className="text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  View all
                </button>
              </div>
              {isLoading ? (
                <div className="p-6">
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse"></div>
                    ))}
                  </div>
                </div>
              ) : payments.length === 0 ? (
                <div className="p-12 text-center">
                  <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No payments recorded yet</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {payments.slice(0, 5).map((payment) => (
                    <Link
                      key={payment.id}
                      href={`/dashboard/payments/${payment.id}`}
                      className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                          <CreditCard className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{payment.student?.full_name || 'Unknown'}</p>
                          <p className="text-sm text-gray-500">{formatDate(payment.payment_date)} at {formatTime(payment.payment_date)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-green-600">{formatCurrency(payment.amount)}</p>
                        <p className="text-sm text-gray-500">{PAYMENT_METHODS[payment.payment_method || ''] || '-'}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Transactions Tab */
          <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="relative flex-1 min-w-[250px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by student name, ID, or reference..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none text-sm"
                  />
                </div>

                <Select
                  options={[
                    { value: 'cash', label: 'Cash' },
                    { value: 'bank_transfer', label: 'Bank Transfer' },
                    { value: 'card', label: 'Card' },
                    { value: 'mobile_money', label: 'Mobile Money' },
                  ]}
                  placeholder="Payment Method"
                  value={methodFilter}
                  onChange={(e) => { setMethodFilter(e.target.value); setCurrentPage(1) }}
                  className="w-40"
                />

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
                    value={monthFilter}
                    onChange={(e) => { setMonthFilter(e.target.value); setCurrentPage(1) }}
                    className="w-28 border-0 bg-transparent"
                  />
                  <Select
                    options={[
                      { value: (new Date().getFullYear() - 1).toString(), label: (new Date().getFullYear() - 1).toString() },
                      { value: new Date().getFullYear().toString(), label: new Date().getFullYear().toString() },
                      { value: (new Date().getFullYear() + 1).toString(), label: (new Date().getFullYear() + 1).toString() },
                    ]}
                    value={yearFilter}
                    onChange={(e) => { setYearFilter(e.target.value); setCurrentPage(1) }}
                    className="w-20 border-0 bg-transparent"
                  />
                </div>

                {(methodFilter || monthFilter) && (
                  <button
                    onClick={() => { setMethodFilter(''); setMonthFilter(''); setCurrentPage(1) }}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Clear filters
                  </button>
                )}
              </div>

              {/* Active Filters */}
              {(methodFilter || monthFilter) && (
                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
                  {methodFilter && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-full">
                      {PAYMENT_METHODS[methodFilter]}
                      <button onClick={() => { setMethodFilter(''); setCurrentPage(1) }} className="hover:text-blue-900">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  )}
                  {monthFilter && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 text-purple-700 text-sm rounded-full">
                      {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][parseInt(monthFilter) - 1]} {yearFilter}
                      <button onClick={() => { setMonthFilter(''); setCurrentPage(1) }} className="hover:text-purple-900">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Summary Bar */}
            <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-6 py-4">
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-sm text-gray-500">Total Amount</p>
                  <p className="text-xl font-semibold text-green-600">{formatCurrency(totalAmount)}</p>
                </div>
                <div className="w-px h-10 bg-gray-200"></div>
                <div>
                  <p className="text-sm text-gray-500">Transactions</p>
                  <p className="text-xl font-semibold text-gray-900">{totalCount}</p>
                </div>
              </div>
              <div className="text-sm text-gray-500">
                {monthFilter
                  ? `Showing ${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][parseInt(monthFilter) - 1]} ${yearFilter}`
                  : 'All time'}
              </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {isLoading ? (
                <div className="p-8 text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
                  <p className="mt-2 text-sm text-gray-500">Loading transactions...</p>
                </div>
              ) : payments.length === 0 ? (
                <div className="p-12 text-center">
                  <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No payments found</h3>
                  <p className="text-gray-500 mb-6">
                    {searchQuery || methodFilter || monthFilter
                      ? 'Try adjusting your filters'
                      : 'Get started by recording your first payment'}
                  </p>
                  {!searchQuery && !methodFilter && !monthFilter && (
                    <Link href="/dashboard/payments/new">
                      <Button leftIcon={<Plus className="w-4 h-4" />}>
                        Record Payment
                      </Button>
                    </Link>
                  )}
                </div>
              ) : (
                <>
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Student</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Method</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Reference</th>
                        <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {payments.map((payment) => (
                        <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div>
                              <p className="font-medium text-gray-900">{formatDate(payment.payment_date)}</p>
                              <p className="text-sm text-gray-500">{formatTime(payment.payment_date)}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div>
                              <p className="font-medium text-gray-900">{payment.student?.full_name || 'Unknown'}</p>
                              <p className="text-sm text-gray-500">{payment.student?.student_number || '-'}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-lg font-semibold text-green-600">
                              {formatCurrency(payment.amount)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex px-2.5 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
                              {PAYMENT_METHODS[payment.payment_method || ''] || '-'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-gray-600">
                            {payment.reference_number || '-'}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Link href={`/dashboard/payments/${payment.id}`}>
                              <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                <Eye className="w-4 h-4" />
                              </button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
                      <p className="text-sm text-gray-600">
                        Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} of {totalCount}
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
        )}
      </div>

      {/* Modals */}
      <ProcessRefundModal
        isOpen={refundModalOpen}
        onClose={() => setRefundModalOpen(false)}
        onSuccess={() => fetchPayments()}
      />

      <BulkGenerateFeesModal
        isOpen={bulkGenerateModalOpen}
        onClose={() => setBulkGenerateModalOpen(false)}
        onSuccess={() => fetchFeeSummary()}
      />
    </div>
  )
}
