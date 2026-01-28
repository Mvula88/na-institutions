'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Input, Select, Textarea } from '@/components/ui/input'
import { ArrowLeft, Save, Search, User, Zap } from 'lucide-react'
import toast from 'react-hot-toast'
import { allocatePayment } from '@/lib/fee-utils'
import { formatCurrency, CURRENCY_CONFIG } from '@/lib/currency'
import { parseNumericInput } from '@/lib/numeric-input'

interface Student {
  id: string
  full_name: string
  student_number: string | null
  status: string
}

interface StudentFee {
  id: string
  fee_month: string
  fee_type: string
  amount_due: number
  amount_paid: number
  balance: number
  status: string
}

export default function RecordPaymentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedStudentId = searchParams.get('student')

  const { user } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [students, setStudents] = useState<Student[]>([])
  const [studentFees, setStudentFees] = useState<StudentFee[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showStudentSearch, setShowStudentSearch] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    student_id: preselectedStudentId || '',
    student_fee_id: '',
    amount: '',
    payment_method: 'cash',
    reference_number: '',
    notes: '',
  })

  // Auto-allocation mode: true = automatically allocate to oldest fees first
  const [autoAllocate, setAutoAllocate] = useState(true)

  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (user?.institution_id) {
      fetchStudents()
    }
  }, [user?.institution_id])

  useEffect(() => {
    if (preselectedStudentId) {
      // Find and select the preselected student
      const student = students.find((s) => s.id === preselectedStudentId)
      if (student) {
        handleSelectStudent(student)
      }
    }
  }, [preselectedStudentId, students])

  useEffect(() => {
    if (formData.student_id) {
      fetchStudentFees(formData.student_id)
    }
  }, [formData.student_id])

  async function fetchStudents() {
    if (!user?.institution_id) return

    const supabase = createClient()
    const { data } = await supabase
      .from('students')
      .select('id, full_name, student_number, status')
      .eq('institution_id', user.institution_id)
      .eq('status', 'active')
      .order('full_name')

    setStudents((data || []) as Student[])
  }

  async function fetchStudentFees(studentId: string) {
    const supabase = createClient()
    const { data } = await supabase
      .from('student_fees')
      .select('*')
      .eq('student_id', studentId)
      .neq('status', 'paid')
      .order('fee_month', { ascending: false })

    setStudentFees((data || []) as StudentFee[])
  }

  function handleSelectStudent(student: Student) {
    setSelectedStudent(student)
    setFormData((prev) => ({ ...prev, student_id: student.id, student_fee_id: '' }))
    setShowStudentSearch(false)
    setSearchQuery('')
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  function handleAmountChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    // Remove leading zeros and non-numeric chars (except decimal point)
    const cleaned = value.replace(/[^\d.]/g, '').replace(/^0+(?=\d)/, '')
    setFormData((prev) => ({ ...prev, amount: cleaned }))
    if (errors.amount) {
      setErrors((prev) => ({ ...prev, amount: '' }))
    }
  }

  function validateForm() {
    const newErrors: Record<string, string> = {}

    if (!formData.student_id) newErrors.student_id = 'Please select a student'
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Amount must be greater than 0'
    }
    if (!formData.payment_method) newErrors.payment_method = 'Payment method is required'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!validateForm()) return
    if (!user?.institution_id) {
      toast.error('No center selected')
      return
    }

    setIsLoading(true)
    const supabase = createClient()

    try {
      const amount = parseFloat(formData.amount)

      // Create payment record
      const paymentData = {
        institution_id: user.institution_id,
        student_id: formData.student_id,
        student_fee_id: autoAllocate ? null : (formData.student_fee_id || null),
        amount,
        payment_method: formData.payment_method,
        reference_number: formData.reference_number || null,
        notes: formData.notes || null,
        recorded_by: user.id,
        payment_date: new Date().toISOString(),
      }

      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert(paymentData as never)
        .select('id')
        .single()

      if (paymentError) throw paymentError

      const paymentId = (payment as { id: string }).id

      // Auto-allocate payment to outstanding fees (oldest first)
      if (autoAllocate && studentFees.length > 0) {
        const allocationResult = await allocatePayment(
          user.institution_id,
          formData.student_id,
          amount,
          paymentId
        )

        if (allocationResult.success) {
          const allocatedCount = allocationResult.allocations.length

          // Show message about previous credit being used
          if (allocationResult.previousCredit > 0) {
            toast.success(
              `Previous credit of ${formatCurrency(allocationResult.previousCredit)} applied`,
              { duration: 3000 }
            )
          }

          if (allocatedCount > 0) {
            toast.success(
              `Payment allocated to ${allocatedCount} fee${allocatedCount > 1 ? 's' : ''} (oldest first)`
            )
          }

          // Show remaining credit that was saved
          if (allocationResult.remainingCredit > 0) {
            toast.success(
              `${formatCurrency(allocationResult.remainingCredit)} credit saved to student account`,
              { duration: 5000, icon: '💰' }
            )
          }
        } else {
          toast.error('Payment recorded but auto-allocation failed')
        }
      } else if (!autoAllocate && formData.student_fee_id) {
        // Manual allocation to specific fee
        const selectedFee = studentFees.find((f) => f.id === formData.student_fee_id)
        if (selectedFee) {
          const newAmountPaid = Math.min(selectedFee.amount_paid + amount, selectedFee.amount_due)
          const newStatus = newAmountPaid >= selectedFee.amount_due ? 'paid' :
                           newAmountPaid > 0 ? 'partial' : 'unpaid'

          await supabase
            .from('student_fees')
            .update({
              amount_paid: newAmountPaid,
              status: newStatus
            } as never)
            .eq('id', formData.student_fee_id)

          // If this is a registration fee and it's now fully paid, update the student record
          if (selectedFee.fee_type === 'registration' && newStatus === 'paid') {
            await supabase
              .from('students')
              .update({
                registration_fee_paid: true,
                registration_fee_paid_date: new Date().toISOString(),
              } as never)
              .eq('id', formData.student_id)
          }
        }
      }

      toast.success('Payment recorded successfully!')
      router.push(`/dashboard/payments/${paymentId}`)
    } catch (error: unknown) {
      const err = error as { message?: string; code?: string; details?: string; hint?: string }
      console.error('Error recording payment:', {
        message: err?.message,
        code: err?.code,
        details: err?.details,
        hint: err?.hint,
        fullError: error
      })
      toast.error(err?.message || 'Failed to record payment')
    } finally {
      setIsLoading(false)
    }
  }

  const filteredStudents = students.filter(
    (s) =>
      s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.student_number?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatMonth = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-ZA', { year: 'numeric', month: 'long' })
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard/payments"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Payments
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Record Payment</h1>
        <p className="text-gray-500 mt-1">Record a new payment from a student</p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Student Selection */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Student</h2>

          {selectedStudent ? (
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{selectedStudent.full_name}</p>
                  <p className="text-sm text-gray-500">{selectedStudent.student_number || 'No student number'}</p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedStudent(null)
                  setFormData((prev) => ({ ...prev, student_id: '', student_fee_id: '' }))
                  setStudentFees([])
                }}
              >
                Change
              </Button>
            </div>
          ) : (
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search for a student..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setShowStudentSearch(true)
                  }}
                  onFocus={() => setShowStudentSearch(true)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none"
                />
              </div>
              {errors.student_id && (
                <p className="text-red-500 text-sm mt-1">{errors.student_id}</p>
              )}

              {showStudentSearch && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredStudents.length > 0 ? (
                    filteredStudents.slice(0, 10).map((student) => (
                      <button
                        key={student.id}
                        type="button"
                        onClick={() => handleSelectStudent(student)}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 border-b border-gray-100 last:border-b-0"
                      >
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                          <User className="w-4 h-4 text-gray-500" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{student.full_name}</p>
                          <p className="text-sm text-gray-500">{student.student_number || 'No student number'}</p>
                        </div>
                      </button>
                    ))
                  ) : (
                    <p className="px-4 py-3 text-gray-500 text-center">No students found</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Outstanding Fees (if student selected) */}
        {selectedStudent && studentFees.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Outstanding Fees</h2>
              <div className="text-sm text-gray-600">
                Total Outstanding:{' '}
                <span className="font-semibold text-red-600">
                  {formatCurrency(studentFees.reduce((sum, f) => sum + f.balance, 0))}
                </span>
              </div>
            </div>

            {/* Auto-allocation toggle */}
            <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoAllocate}
                  onChange={(e) => {
                    setAutoAllocate(e.target.checked)
                    if (e.target.checked) {
                      setFormData(prev => ({ ...prev, student_fee_id: '' }))
                    }
                  }}
                  className="w-5 h-5 mt-0.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-blue-600" />
                    <span className="font-medium text-gray-900">Auto-allocate payment (Recommended)</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Automatically distribute payment to outstanding fees starting from the oldest month.
                    This ensures proper record-keeping and clear audit trail.
                  </p>
                </div>
              </label>
            </div>

            {/* Manual fee selection (only if auto-allocate is off) */}
            {!autoAllocate && (
              <div className="space-y-2">
                <p className="text-sm text-gray-500 mb-3">
                  Select a specific fee to apply this payment to:
                </p>
                <label className="flex items-center p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="student_fee_id"
                    value=""
                    checked={formData.student_fee_id === ''}
                    onChange={handleChange}
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <span className="ml-3 text-gray-700">General payment (not linked to specific fee)</span>
                </label>
                {studentFees.map((fee) => (
                  <label
                    key={fee.id}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                      formData.student_fee_id === fee.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center">
                      <input
                        type="radio"
                        name="student_fee_id"
                        value={fee.id}
                        checked={formData.student_fee_id === fee.id}
                        onChange={handleChange}
                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <div className="ml-3">
                        <p className="font-medium text-gray-900">
                          {formatMonth(fee.fee_month)} - {fee.fee_type}
                        </p>
                        <p className="text-sm text-gray-500">
                          Due: {formatCurrency(fee.amount_due)} | Paid: {formatCurrency(fee.amount_paid)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-red-600">
                        {formatCurrency(fee.balance)}
                      </p>
                      <p className="text-xs text-gray-500">Balance</p>
                    </div>
                  </label>
                ))}
              </div>
            )}

            {/* Show fee list preview when auto-allocate is on */}
            {autoAllocate && (
              <div className="space-y-2">
                <p className="text-sm text-gray-500 mb-3">
                  Payment will be allocated to these fees in order (oldest first):
                </p>
                {studentFees
                  .sort((a, b) => new Date(a.fee_month).getTime() - new Date(b.fee_month).getTime())
                  .map((fee, index) => (
                    <div
                      key={fee.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-gray-200 bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-semibold flex items-center justify-center">
                          {index + 1}
                        </span>
                        <div>
                          <p className="font-medium text-gray-900">
                            {formatMonth(fee.fee_month)} - {fee.fee_type}
                          </p>
                          <p className="text-sm text-gray-500">
                            Due: {formatCurrency(fee.amount_due)} | Paid: {formatCurrency(fee.amount_paid)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-red-600">
                          {formatCurrency(fee.balance)}
                        </p>
                        <p className="text-xs text-gray-500">Balance</p>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* Payment Details */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={`Amount (${CURRENCY_CONFIG.symbol})`}
              name="amount"
              type="text"
              inputMode="decimal"
              value={formData.amount}
              onChange={handleAmountChange}
              error={errors.amount}
              required
              placeholder="0.00"
            />
            <Select
              label="Payment Method"
              name="payment_method"
              value={formData.payment_method}
              onChange={handleChange}
              error={errors.payment_method}
              options={[
                { value: 'cash', label: 'Cash' },
                { value: 'bank_transfer', label: 'Bank Transfer' },
                { value: 'card', label: 'Card' },
                { value: 'mobile_money', label: 'Mobile Money' },
              ]}
              required
            />
            <Input
              label="Reference Number"
              name="reference_number"
              value={formData.reference_number}
              onChange={handleChange}
              placeholder="e.g., Receipt #, Transaction ID"
            />
            <div className="md:col-span-2">
              <Textarea
                label="Notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={2}
                placeholder="Additional notes about this payment..."
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Link href="/dashboard/payments">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            isLoading={isLoading}
            leftIcon={<Save className="w-4 h-4" />}
            disabled={!selectedStudent}
          >
            Record Payment
          </Button>
        </div>
      </form>
    </div>
  )
}
