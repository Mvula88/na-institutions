'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/input'
import {
  ArrowLeft,
  Search,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Calendar,
  User,
  Receipt,
  X,
  FileText,
  AlertCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { formatCurrency } from '@/lib/currency'
import { ProcessRefundModal } from '@/components/refunds/process-refund-modal'
import { RefundReason } from '@/types/database'

interface Refund {
  id: string
  amount: number
  reason: RefundReason
  reason_notes: string | null
  student_status_updated: boolean
  refund_date: string
  created_at: string
  student: {
    id: string
    full_name: string
    student_number: string | null
  } | null
  payment: {
    id: string
    amount: number
    payment_date: string
    payment_method: string | null
    reference_number: string | null
  } | null
  processor: {
    id: string
    full_name: string
  } | null
}

const ITEMS_PER_PAGE = 10

const REFUND_REASONS: Record<RefundReason, string> = {
  relocation: 'Relocation',
  medical: 'Medical/Health',
  financial_hardship: 'Financial Hardship',
  schedule_conflicts: 'Schedule Conflicts',
  dissatisfaction: 'Dissatisfaction',
  other: 'Other',
}

const REASON_COLORS: Record<RefundReason, string> = {
  relocation: 'bg-blue-100 text-blue-700',
  medical: 'bg-red-100 text-red-700',
  financial_hardship: 'bg-amber-100 text-amber-700',
  schedule_conflicts: 'bg-purple-100 text-purple-700',
  dissatisfaction: 'bg-orange-100 text-orange-700',
  other: 'bg-gray-100 text-gray-700',
}

export default function RefundsPage() {
  const { user, isCenterAdmin } = useAuthStore()
  const [refunds, setRefunds] = useState<Refund[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [reasonFilter, setReasonFilter] = useState('')
  const [monthFilter, setMonthFilter] = useState('')
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString())
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [totalAmount, setTotalAmount] = useState(0)
  const [refundModalOpen, setRefundModalOpen] = useState(false)

  useEffect(() => {
    fetchRefunds()
  }, [user?.institution_id, currentPage, reasonFilter, monthFilter, yearFilter])

  async function fetchRefunds() {
    if (!user?.institution_id) return

    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        institution_id: user.institution_id,
        page: currentPage.toString(),
        limit: ITEMS_PER_PAGE.toString(),
      })

      const response = await fetch(`/api/refunds?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch refunds')
      }

      let filteredRefunds = data.refunds || []

      // Apply client-side filters
      if (reasonFilter) {
        filteredRefunds = filteredRefunds.filter((r: Refund) => r.reason === reasonFilter)
      }

      if (monthFilter && yearFilter) {
        filteredRefunds = filteredRefunds.filter((r: Refund) => {
          const date = new Date(r.refund_date)
          return date.getMonth() + 1 === parseInt(monthFilter) &&
                 date.getFullYear() === parseInt(yearFilter)
        })
      }

      if (searchQuery) {
        const search = searchQuery.toLowerCase()
        filteredRefunds = filteredRefunds.filter((r: Refund) =>
          r.student?.full_name.toLowerCase().includes(search) ||
          r.student?.student_number?.toLowerCase().includes(search) ||
          r.payment?.reference_number?.toLowerCase().includes(search)
        )
      }

      setRefunds(filteredRefunds)
      setTotalCount(data.total || 0)

      // Calculate total refunded amount
      const total = filteredRefunds.reduce((sum: number, r: Refund) => sum + r.amount, 0)
      setTotalAmount(total)
    } catch (error) {
      console.error('Error fetching refunds:', error)
      toast.error('Failed to fetch refunds')
    } finally {
      setIsLoading(false)
    }
  }

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1)
      fetchRefunds()
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

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard/payments"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Payments
        </Link>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Refunds</h1>
            <p className="text-gray-500 mt-1">Track and manage student refunds</p>
          </div>
          {isCenterAdmin() && (
            <Button
              leftIcon={<RotateCcw className="w-4 h-4" />}
              onClick={() => setRefundModalOpen(true)}
            >
              Process Refund
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-100">
              <RotateCcw className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Refunded</p>
              <p className="text-xl font-bold text-red-600">{formatCurrency(totalAmount)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Refunds</p>
              <p className="text-xl font-bold text-gray-900">{totalCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100">
              <Calendar className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Period</p>
              <p className="text-xl font-bold text-gray-900">
                {monthFilter
                  ? `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][parseInt(monthFilter) - 1]} ${yearFilter}`
                  : 'All Time'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search student or reference..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none text-sm"
            />
          </div>

          {/* Reason Filter */}
          <Select
            options={[
              { value: 'relocation', label: 'Relocation' },
              { value: 'medical', label: 'Medical' },
              { value: 'financial_hardship', label: 'Financial Hardship' },
              { value: 'schedule_conflicts', label: 'Schedule Conflicts' },
              { value: 'dissatisfaction', label: 'Dissatisfaction' },
              { value: 'other', label: 'Other' },
            ]}
            placeholder="Reason"
            value={reasonFilter}
            onChange={(e) => { setReasonFilter(e.target.value); setCurrentPage(1) }}
            className="w-40"
          />

          {/* Month/Year Filter */}
          <div className="flex items-center gap-1 px-2 py-1 bg-purple-50 rounded-lg border border-purple-200">
            <span className="text-xs text-purple-700 font-medium px-1">Month:</span>
            <Select
              options={[
                { value: '1', label: 'Jan' }, { value: '2', label: 'Feb' }, { value: '3', label: 'Mar' },
                { value: '4', label: 'Apr' }, { value: '5', label: 'May' }, { value: '6', label: 'Jun' },
                { value: '7', label: 'Jul' }, { value: '8', label: 'Aug' }, { value: '9', label: 'Sep' },
                { value: '10', label: 'Oct' }, { value: '11', label: 'Nov' }, { value: '12', label: 'Dec' },
              ]}
              placeholder="All"
              value={monthFilter}
              onChange={(e) => { setMonthFilter(e.target.value); setCurrentPage(1) }}
              className="w-20"
            />
            <Select
              options={[
                { value: (new Date().getFullYear() - 1).toString(), label: (new Date().getFullYear() - 1).toString() },
                { value: new Date().getFullYear().toString(), label: new Date().getFullYear().toString() },
                { value: (new Date().getFullYear() + 1).toString(), label: (new Date().getFullYear() + 1).toString() },
              ]}
              value={yearFilter}
              onChange={(e) => { setYearFilter(e.target.value); setCurrentPage(1) }}
              className="w-20"
            />
          </div>

          {/* Clear All */}
          {(reasonFilter || monthFilter) && (
            <button
              onClick={() => {
                setReasonFilter('')
                setMonthFilter('')
                setCurrentPage(1)
              }}
              className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
              Clear
            </button>
          )}
        </div>

        {/* Active filters */}
        {(reasonFilter || monthFilter) && (
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
            {reasonFilter && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                {REFUND_REASONS[reasonFilter as RefundReason]}
                <button onClick={() => { setReasonFilter(''); setCurrentPage(1) }}><X className="w-3 h-3" /></button>
              </span>
            )}
            {monthFilter && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][parseInt(monthFilter) - 1]} {yearFilter}
                <button onClick={() => { setMonthFilter(''); setCurrentPage(1) }}><X className="w-3 h-3" /></button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 rounded"></div>
              ))}
            </div>
          </div>
        ) : refunds.length === 0 ? (
          <div className="p-12 text-center">
            <RotateCcw className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No refunds found</h3>
            <p className="text-gray-500 mb-4">
              {searchQuery || reasonFilter || monthFilter
                ? 'Try adjusting your filters'
                : 'No refunds have been processed yet'}
            </p>
            {isCenterAdmin() && !searchQuery && !reasonFilter && !monthFilter && (
              <Button
                leftIcon={<RotateCcw className="w-4 h-4" />}
                onClick={() => setRefundModalOpen(true)}
              >
                Process Refund
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Refund Amount
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Original Payment
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reason
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Processed By
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {refunds.map((refund) => (
                    <tr key={refund.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-900">
                            {formatDateTime(refund.refund_date)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                            <User className="w-4 h-4 text-gray-500" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {refund.student?.full_name || 'Unknown'}
                            </p>
                            <p className="text-sm text-gray-500">
                              {refund.student?.student_number || '-'}
                            </p>
                          </div>
                          {refund.student_status_updated && (
                            <span className="px-2 py-0.5 text-xs font-medium rounded bg-amber-100 text-amber-700">
                              Withdrawn
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-red-600">
                          -{formatCurrency(refund.amount)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {refund.payment ? (
                          <div>
                            <p className="text-gray-900">{formatCurrency(refund.payment.amount)}</p>
                            <p className="text-sm text-gray-500">
                              {formatDate(refund.payment.payment_date)}
                            </p>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${REASON_COLORS[refund.reason]}`}>
                            {REFUND_REASONS[refund.reason]}
                          </span>
                          {refund.reason_notes && (
                            <p className="text-xs text-gray-500 mt-1 max-w-[150px] truncate" title={refund.reason_notes}>
                              {refund.reason_notes}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {refund.processor?.full_name || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {refund.payment && (
                            <Link href={`/dashboard/payments/${refund.payment.id}`}>
                              <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="View original payment">
                                <Receipt className="w-4 h-4" />
                              </button>
                            </Link>
                          )}
                          {refund.student && (
                            <Link href={`/dashboard/students/${refund.student.id}`}>
                              <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="View student">
                                <User className="w-4 h-4" />
                              </button>
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
                <p className="text-sm text-gray-500">
                  Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
                  {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} of {totalCount} refunds
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

      {/* Refund Modal */}
      <ProcessRefundModal
        isOpen={refundModalOpen}
        onClose={() => setRefundModalOpen(false)}
        onSuccess={() => {
          fetchRefunds()
        }}
      />
    </div>
  )
}
