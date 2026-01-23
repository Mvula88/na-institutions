'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/modal'
import {
  ArrowLeft,
  Printer,
  Trash2,
  User,
  Calendar,
  CreditCard,
  Receipt,
  Building,
  RotateCcw,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { ProcessRefundModal } from '@/components/refunds/process-refund-modal'

interface Payment {
  id: string
  amount: number
  payment_method: string | null
  reference_number: string | null
  payment_date: string
  notes: string | null
  created_at: string
  student: {
    id: string
    full_name: string
    student_number: string | null
    phone: string | null
    email: string | null
  } | null
  student_fee: {
    id: string
    fee_month: string
    fee_type: string
    amount_due: number
  } | null
  recorded_by_user: {
    full_name: string
  } | null
}

interface Center {
  name: string
  address: string | null
  phone: string | null
  email: string | null
  logo_url: string | null
  primary_color: string | null
  secondary_color: string | null
  bank_name: string | null
  account_number: string | null
  branch_code: string | null
}

const PAYMENT_METHODS: Record<string, string> = {
  cash: 'Cash',
  bank_transfer: 'Bank Transfer',
  card: 'Card Payment',
  mobile_money: 'Mobile Money',
}

export default function PaymentDetailPage() {
  const params = useParams()
  const paymentId = params.id as string
  const router = useRouter()
  const { user, isCenterAdmin } = useAuthStore()
  const [payment, setPayment] = useState<Payment | null>(null)
  const [center, setCenter] = useState<Center | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [refundModalOpen, setRefundModalOpen] = useState(false)

  useEffect(() => {
    if (paymentId && user?.institution_id) {
      fetchPayment()
      fetchCenter()
    }
  }, [paymentId, user?.institution_id])

  async function fetchPayment() {
    const supabase = createClient()

    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          student:students(id, full_name, student_number, phone, email),
          student_fee:student_fees(id, fee_month, fee_type, amount_due),
          recorded_by_user:users!recorded_by(full_name)
        `)
        .eq('id', paymentId)
        .single()

      if (error) throw error

      setPayment(data as Payment)
    } catch (error) {
      console.error('Error fetching payment:', error)
      toast.error('Failed to load payment')
      router.push('/dashboard/payments')
    } finally {
      setIsLoading(false)
    }
  }

  async function fetchCenter() {
    if (!user?.institution_id) return

    const supabase = createClient()
    const { data } = await supabase
      .from('institutions')
      .select('name, address, phone, email, logo_url, primary_color, secondary_color, bank_name, account_number, branch_code')
      .eq('id', user.institution_id)
      .single()

    if (data) {
      setCenter(data as unknown as Center)
    }
  }

  async function handleDelete() {
    if (!payment) return

    setIsDeleting(true)
    const supabase = createClient()

    try {
      // If payment was linked to a fee, reduce the amount_paid
      if (payment.student_fee) {
        const { data: currentFee } = await supabase
          .from('student_fees')
          .select('amount_paid')
          .eq('id', payment.student_fee.id)
          .single()

        if (currentFee) {
          const newAmountPaid = Math.max(0, (currentFee as { amount_paid: number }).amount_paid - payment.amount)
          await supabase
            .from('student_fees')
            .update({ amount_paid: newAmountPaid } as never)
            .eq('id', payment.student_fee.id)
        }
      }

      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', payment.id)

      if (error) throw error

      toast.success('Payment deleted successfully')
      router.push('/dashboard/payments')
    } catch (error) {
      console.error('Error deleting payment:', error)
      toast.error('Failed to delete payment')
    } finally {
      setIsDeleting(false)
    }
  }

  async function handlePrint() {
    if (!payment || !center) return

    const brandColor = center.primary_color || '#1E40AF'

    // Convert logo URL to base64 data URL for print window
    let logoDataUrl = ''
    if (center.logo_url) {
      try {
        const response = await fetch(center.logo_url)
        const blob = await response.blob()
        logoDataUrl = await new Promise((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.readAsDataURL(blob)
        })
      } catch (e) {
        console.error('Failed to load logo for print:', e)
      }
    }

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payment Receipt - ${payment.reference_number || payment.id.slice(0, 8)}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid ${brandColor}; padding-bottom: 20px; }
          .header h1 { font-size: 24px; margin-bottom: 5px; color: ${brandColor}; }
          .header p { color: #666; font-size: 14px; }
          .logo { width: 70px; height: 70px; object-fit: contain; margin-bottom: 10px; }
          .receipt-title { text-align: center; margin: 20px 0; }
          .receipt-title h2 { font-size: 20px; text-transform: uppercase; letter-spacing: 2px; }
          .receipt-number { text-align: center; margin-bottom: 30px; }
          .receipt-number span { background: #f0f0f0; padding: 5px 15px; border-radius: 4px; font-family: monospace; }
          .details { margin-bottom: 30px; }
          .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
          .detail-group h3 { font-size: 12px; text-transform: uppercase; color: #666; margin-bottom: 5px; }
          .detail-group p { font-size: 14px; }
          .amount-box { background: #f8f8f8; padding: 20px; text-align: center; margin: 30px 0; border-radius: 8px; }
          .amount-box .label { font-size: 12px; text-transform: uppercase; color: #666; }
          .amount-box .amount { font-size: 32px; font-weight: bold; color: #059669; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background: #f8f8f8; font-size: 12px; text-transform: uppercase; color: #666; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; }
          .footer p { font-size: 12px; color: #666; margin-bottom: 5px; }
          .signature-line { margin-top: 60px; display: flex; justify-content: space-between; }
          .signature-line div { width: 200px; text-align: center; }
          .signature-line .line { border-top: 1px solid #333; margin-bottom: 5px; }
          .signature-line .label { font-size: 12px; color: #666; }
          @media print {
            body { padding: 20px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          ${logoDataUrl ? `<img src="${logoDataUrl}" class="logo" alt="Logo">` : ''}
          <h1>${center.name}</h1>
          ${center.address ? `<p>${center.address}</p>` : ''}
          ${center.phone ? `<p>Tel: ${center.phone}</p>` : ''}
          ${center.email ? `<p>Email: ${center.email}</p>` : ''}
        </div>

        <div class="receipt-title">
          <h2>Payment Receipt</h2>
        </div>

        <div class="receipt-number">
          <span>Receipt #: ${payment.reference_number || payment.id.slice(0, 8).toUpperCase()}</span>
        </div>

        <div class="details">
          <div class="details-grid">
            <div class="detail-group">
              <h3>Student Name</h3>
              <p>${payment.student?.full_name || 'N/A'}</p>
            </div>
            <div class="detail-group">
              <h3>Student Number</h3>
              <p>${payment.student?.student_number || 'N/A'}</p>
            </div>
            <div class="detail-group">
              <h3>Payment Date</h3>
              <p>${new Date(payment.payment_date).toLocaleDateString('en-ZA', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}</p>
            </div>
            <div class="detail-group">
              <h3>Payment Method</h3>
              <p>${PAYMENT_METHODS[payment.payment_method || ''] || payment.payment_method || 'N/A'}</p>
            </div>
          </div>
        </div>

        <div class="amount-box">
          <p class="label">Amount Paid</p>
          <p class="amount">N$ ${payment.amount.toFixed(2)}</p>
        </div>

        ${payment.student_fee ? `
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Period</th>
                <th style="text-align: right">Amount Due</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${payment.student_fee.fee_type}</td>
                <td>${new Date(payment.student_fee.fee_month).toLocaleDateString('en-ZA', { year: 'numeric', month: 'long' })}</td>
                <td style="text-align: right">N$ ${payment.student_fee.amount_due.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        ` : ''}

        ${payment.notes ? `
          <div class="details">
            <div class="detail-group">
              <h3>Notes</h3>
              <p>${payment.notes}</p>
            </div>
          </div>
        ` : ''}

        <div class="signature-line">
          <div>
            <div class="line"></div>
            <p class="label">Received By</p>
            <p style="font-size: 12px; margin-top: 5px;">${payment.recorded_by_user?.full_name || 'N/A'}</p>
          </div>
          <div>
            <div class="line"></div>
            <p class="label">Student/Guardian Signature</p>
          </div>
        </div>

        <div class="footer">
          <p>Thank you for your payment!</p>
          <p>This is a computer-generated receipt.</p>
          <p>Printed on: ${new Date().toLocaleString('en-ZA')}</p>
        </div>

        <script>
          function triggerPrint() {
            window.print();
          }
          // Wait for images to load before printing
          var images = document.images;
          var loaded = 0;
          var total = images.length;
          if (total === 0) {
            triggerPrint();
          } else {
            for (var i = 0; i < total; i++) {
              if (images[i].complete) {
                loaded++;
                if (loaded === total) triggerPrint();
              } else {
                images[i].onload = function() {
                  loaded++;
                  if (loaded === total) triggerPrint();
                };
                images[i].onerror = function() {
                  loaded++;
                  if (loaded === total) triggerPrint();
                };
              }
            }
          }
        </script>
      </body>
      </html>
    `

    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(printContent)
      printWindow.document.close()
    }
  }

  const formatCurrency = (amount: number) => `R ${amount.toFixed(2)}`

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    )
  }

  if (!payment) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Payment not found</p>
        <Link href="/dashboard/payments">
          <Button className="mt-4">Back to Payments</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard/payments"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Payments
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Payment Receipt</h1>
            <p className="text-gray-500 mt-1">
              Reference: {payment.reference_number || payment.id.slice(0, 8).toUpperCase()}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              leftIcon={<Printer className="w-4 h-4" />}
              onClick={handlePrint}
            >
              Print Receipt
            </Button>
            {isCenterAdmin() && (
              <Button
                variant="outline"
                leftIcon={<RotateCcw className="w-4 h-4" />}
                onClick={() => setRefundModalOpen(true)}
                className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
              >
                Refund
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setDeleteModalOpen(true)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Amount Card */}
          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
            <p className="text-green-100 text-sm mb-1">Amount Paid</p>
            <p className="text-4xl font-bold">{formatCurrency(payment.amount)}</p>
            <p className="text-green-100 text-sm mt-2">
              {formatDate(payment.payment_date)}
            </p>
          </div>

          {/* Student Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Student Information</h2>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <User className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">{payment.student?.full_name || 'N/A'}</p>
                <p className="text-sm text-gray-500">{payment.student?.student_number || 'No student number'}</p>
              </div>
              {payment.student && (
                <Link href={`/dashboard/students/${payment.student.id}`}>
                  <Button variant="outline" size="sm">
                    View Profile
                  </Button>
                </Link>
              )}
            </div>
            {(payment.student?.phone || payment.student?.email) && (
              <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-4">
                {payment.student.phone && (
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="text-gray-900">{payment.student.phone}</p>
                  </div>
                )}
                {payment.student.email && (
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="text-gray-900">{payment.student.email}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Fee Information */}
          {payment.student_fee && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Linked Fee</h2>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 capitalize">{payment.student_fee.fee_type}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(payment.student_fee.fee_month).toLocaleDateString('en-ZA', {
                        year: 'numeric',
                        month: 'long',
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Amount Due</p>
                    <p className="font-semibold text-gray-900">{formatCurrency(payment.student_fee.amount_due)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          {payment.notes && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
              <p className="text-gray-700">{payment.notes}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Payment Details */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Details</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Method</p>
                  <p className="font-medium text-gray-900">
                    {PAYMENT_METHODS[payment.payment_method || ''] || payment.payment_method || 'N/A'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Reference</p>
                  <p className="font-medium text-gray-900">
                    {payment.reference_number || payment.id.slice(0, 8).toUpperCase()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Date</p>
                  <p className="font-medium text-gray-900">
                    {formatDate(payment.payment_date)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                  <User className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Recorded By</p>
                  <p className="font-medium text-gray-900">
                    {payment.recorded_by_user?.full_name || 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Center Info */}
          {center && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Building className="w-5 h-5 text-gray-400" />
                <h2 className="text-lg font-semibold text-gray-900">Center</h2>
              </div>
              <p className="font-medium text-gray-900">{center.name}</p>
              {center.address && <p className="text-sm text-gray-500 mt-1">{center.address}</p>}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Payment"
        message="Are you sure you want to delete this payment? This action cannot be undone and will update the student's outstanding balance."
        confirmText="Delete"
        isLoading={isDeleting}
      />

      {/* Refund Modal */}
      <ProcessRefundModal
        isOpen={refundModalOpen}
        onClose={() => setRefundModalOpen(false)}
        onSuccess={() => {
          setRefundModalOpen(false)
          fetchPayment()
        }}
        preselectedPayment={payment ? {
          id: payment.id,
          amount: payment.amount,
          payment_date: payment.payment_date,
          payment_method: payment.payment_method,
          reference_number: payment.reference_number,
          student: payment.student ? {
            id: payment.student.id,
            full_name: payment.student.full_name,
            student_number: payment.student.student_number,
          } : { id: '', full_name: 'Unknown', student_number: null },
        } : null}
      />
    </div>
  )
}
