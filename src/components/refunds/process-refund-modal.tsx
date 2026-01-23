'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import { Input, Select, Textarea } from '@/components/ui/input'
import { useAuthStore } from '@/stores/auth-store'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { RefundReason } from '@/types/database'
import { Loader2, AlertCircle, Receipt } from 'lucide-react'

// Helper for numeric inputs to prevent leading zeros
function cleanNumericInput(value: string): string {
  return value.replace(/[^\d.]/g, '').replace(/^0+(?=\d)/, '')
}

interface Payment {
  id: string
  amount: number
  payment_date: string
  payment_method: string | null
  reference_number: string | null
  student: {
    id: string
    full_name: string
    student_number: string | null
  }
  refundable_amount?: number // Calculated: original - already refunded
}

interface ProcessRefundModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (refund: unknown) => void
  preselectedPayment?: Payment | null
}

const REFUND_REASONS: { value: RefundReason; label: string }[] = [
  { value: 'relocation', label: 'Relocation' },
  { value: 'medical', label: 'Medical/Health reasons' },
  { value: 'financial_hardship', label: 'Financial hardship' },
  { value: 'schedule_conflicts', label: 'Schedule conflicts' },
  { value: 'dissatisfaction', label: 'Dissatisfaction' },
  { value: 'other', label: 'Other' },
]

export function ProcessRefundModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedPayment,
}: ProcessRefundModalProps) {
  const { user } = useAuthStore()
  const supabase = createClient()

  const [payments, setPayments] = useState<Payment[]>([])
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(preselectedPayment || null)
  const [loadingPayments, setLoadingPayments] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    amount: '',
    reason: '' as RefundReason | '',
    reason_notes: '',
    update_student_status: false,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // Load payments when modal opens
  useEffect(() => {
    if (isOpen && !preselectedPayment) {
      loadPayments()
    }
    if (isOpen && preselectedPayment) {
      // Load refundable amount for preselected payment
      loadRefundableAmount(preselectedPayment.id, preselectedPayment.amount).then((refundable) => {
        setSelectedPayment({
          ...preselectedPayment,
          refundable_amount: refundable,
        })
        if (refundable > 0) {
          setFormData((prev) => ({ ...prev, amount: refundable.toString() }))
        }
      })
    }
  }, [isOpen, preselectedPayment])

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        amount: '',
        reason: '',
        reason_notes: '',
        update_student_status: false,
      })
      setSelectedPayment(preselectedPayment || null)
      setErrors({})
    }
  }, [isOpen, preselectedPayment])

  const loadPayments = async () => {
    if (!user?.institution_id) return

    setLoadingPayments(true)
    try {
      // Load payments
      const { data: paymentsData, error } = await supabase
        .from('payments')
        .select(`
          id,
          amount,
          payment_date,
          payment_method,
          reference_number,
          student:students(id, full_name, student_number)
        `)
        .eq('institution_id', user.institution_id)
        .neq('status', 'reversed')
        .order('payment_date', { ascending: false })
        .limit(100)

      if (error) throw error

      // Load existing refunds to calculate refundable amounts
      const { data: refundsData } = await supabase
        .from('refunds')
        .select('original_payment_id, amount')
        .eq('institution_id', user.institution_id)

      // Calculate refundable amount for each payment
      const refundsByPayment: Record<string, number> = {}
      ;((refundsData || []) as { original_payment_id: string; amount: number }[]).forEach((r) => {
        refundsByPayment[r.original_payment_id] =
          (refundsByPayment[r.original_payment_id] || 0) + Number(r.amount)
      })

      const paymentsWithRefundable = ((paymentsData || []) as { id: string; amount: number }[]).map((p) => ({
        ...p,
        refundable_amount: p.amount - (refundsByPayment[p.id] || 0),
      }))

      // Only show payments that have refundable amount > 0
      setPayments(paymentsWithRefundable.filter((p) => p.refundable_amount > 0) as unknown as Payment[])
    } catch (error) {
      console.error('Failed to load payments:', error)
      toast.error('Failed to load payments')
    } finally {
      setLoadingPayments(false)
    }
  }

  // Load refundable amount for preselected payment
  const loadRefundableAmount = async (paymentId: string, originalAmount: number) => {
    try {
      const { data: refundsData } = await supabase
        .from('refunds')
        .select('amount')
        .eq('original_payment_id', paymentId)

      const totalRefunded = ((refundsData || []) as { amount: number }[]).reduce(
        (sum, r) => sum + Number(r.amount),
        0
      )
      return originalAmount - totalRefunded
    } catch {
      return originalAmount
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!selectedPayment) {
      newErrors.payment = 'Please select a payment'
    }

    const maxRefundable = selectedPayment?.refundable_amount ?? selectedPayment?.amount ?? 0

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Please enter a valid refund amount'
    } else if (maxRefundable <= 0) {
      newErrors.amount = 'This payment has already been fully refunded'
    } else if (parseFloat(formData.amount) > maxRefundable) {
      newErrors.amount = `Refund amount cannot exceed N$ ${maxRefundable.toFixed(2)} (remaining refundable)`
    }

    if (!formData.reason) {
      newErrors.reason = 'Please select a reason'
    }

    if (formData.reason === 'other' && !formData.reason_notes.trim()) {
      newErrors.reason_notes = 'Please provide details for the refund reason'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm() || !selectedPayment || !user) return

    setSubmitting(true)
    try {
      const response = await fetch('/api/refunds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          institution_id: user.institution_id,
          student_id: selectedPayment.student.id,
          original_payment_id: selectedPayment.id,
          amount: parseFloat(formData.amount),
          reason: formData.reason,
          reason_notes: formData.reason_notes || null,
          update_student_status: formData.update_student_status,
          processed_by: user.id,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process refund')
      }

      toast.success('Refund processed successfully')
      onSuccess(data.refund)
      onClose()
    } catch (error) {
      console.error('Refund error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to process refund')
    } finally {
      setSubmitting(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NA', {
      style: 'currency',
      currency: 'NAD',
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Process Refund" size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Payment Selection */}
        {!preselectedPayment && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Payment <span className="text-red-500">*</span>
            </label>
            {loadingPayments ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : (
              <select
                className={`w-full px-3 py-2 rounded-lg border transition-colors outline-none ${
                  errors.payment
                    ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                    : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                }`}
                value={selectedPayment?.id || ''}
                onChange={(e) => {
                  const payment = payments.find((p) => p.id === e.target.value)
                  setSelectedPayment(payment || null)
                  if (payment) {
                    const refundable = payment.refundable_amount ?? payment.amount
                    setFormData((prev) => ({ ...prev, amount: refundable.toString() }))
                  }
                }}
              >
                <option value="">Select a payment...</option>
                {payments.map((payment) => (
                  <option key={payment.id} value={payment.id}>
                    {payment.student?.full_name} - {formatCurrency(payment.refundable_amount ?? payment.amount)} refundable ({formatDate(payment.payment_date)})
                  </option>
                ))}
              </select>
            )}
            {errors.payment && <p className="mt-1 text-sm text-red-600">{errors.payment}</p>}
          </div>
        )}

        {/* Selected Payment Details */}
        {selectedPayment && (
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <Receipt className="w-4 h-4" />
              Original Payment Details
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Student:</span>
                <p className="font-medium">{selectedPayment.student?.full_name}</p>
                {selectedPayment.student?.student_number && (
                  <p className="text-gray-500 text-xs">{selectedPayment.student.student_number}</p>
                )}
              </div>
              <div>
                <span className="text-gray-500">Original Amount:</span>
                <p className="font-medium text-green-600">{formatCurrency(selectedPayment.amount)}</p>
                {selectedPayment.refundable_amount !== undefined && selectedPayment.refundable_amount < selectedPayment.amount && (
                  <p className="text-xs text-amber-600">
                    Refundable: {formatCurrency(selectedPayment.refundable_amount)}
                  </p>
                )}
              </div>
              <div>
                <span className="text-gray-500">Date:</span>
                <p className="font-medium">{formatDate(selectedPayment.payment_date)}</p>
              </div>
              <div>
                <span className="text-gray-500">Method:</span>
                <p className="font-medium capitalize">{selectedPayment.payment_method?.replace('_', ' ') || 'N/A'}</p>
              </div>
              {selectedPayment.reference_number && (
                <div className="col-span-2">
                  <span className="text-gray-500">Reference:</span>
                  <p className="font-medium">{selectedPayment.reference_number}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Refund Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Refund Amount <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">N$</span>
            <input
              type="text"
              inputMode="decimal"
              className={`w-full pl-8 pr-3 py-2 rounded-lg border transition-colors outline-none ${
                errors.amount
                  ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                  : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
              }`}
              value={formData.amount}
              onChange={(e) => setFormData((prev) => ({ ...prev, amount: cleanNumericInput(e.target.value) }))}
              placeholder="0.00"
            />
          </div>
          {errors.amount && <p className="mt-1 text-sm text-red-600">{errors.amount}</p>}
          {selectedPayment && (
            <p className="mt-1 text-xs text-gray-500">
              Maximum refundable: {formatCurrency(selectedPayment.refundable_amount ?? selectedPayment.amount)}
            </p>
          )}
        </div>

        {/* Reason Selection */}
        <Select
          label="Reason for Refund"
          required
          options={REFUND_REASONS}
          placeholder="Select a reason..."
          value={formData.reason}
          onChange={(e) => setFormData((prev) => ({ ...prev, reason: e.target.value as RefundReason }))}
          error={errors.reason}
        />

        {/* Reason Notes */}
        <Textarea
          label={formData.reason === 'other' ? 'Additional Notes (Required)' : 'Additional Notes'}
          required={formData.reason === 'other'}
          rows={3}
          value={formData.reason_notes}
          onChange={(e) => setFormData((prev) => ({ ...prev, reason_notes: e.target.value }))}
          placeholder="Provide any additional details about the refund..."
          error={errors.reason_notes}
        />

        {/* Update Student Status Checkbox */}
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <input
            type="checkbox"
            id="update_student_status"
            checked={formData.update_student_status}
            onChange={(e) => setFormData((prev) => ({ ...prev, update_student_status: e.target.checked }))}
            className="mt-1 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <div>
            <label htmlFor="update_student_status" className="font-medium text-gray-900 cursor-pointer">
              Mark student as Withdrawn
            </label>
            <p className="text-sm text-gray-600 mt-0.5">
              Check this box if the student will no longer be attending the tutorial center.
              This will update their status to &quot;Withdrawn&quot;.
            </p>
          </div>
        </div>

        {/* Warning */}
        <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium">Important</p>
            <p>
              This action will create a refund record for audit purposes. The refund amount should be
              returned to the student through your preferred payment method.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !selectedPayment}
            className="flex-1 px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              'Process Refund'
            )}
          </button>
        </div>
      </form>
    </Modal>
  )
}
