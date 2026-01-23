'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import {
  ArrowLeft,
  Building2,
  User,
  Phone,
  Mail,
  Globe,
  Monitor,
  MapPin,
  Calendar,
  DollarSign,
  Plus,
  CheckCircle,
  AlertCircle,
  Clock,
  Edit,
  Trash2,
  Loader2,
  FileText,
  CreditCard,
  Download,
  Printer,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { downloadContractPDF, printContractPDF } from '@/lib/generate-contract-pdf'
import { downloadInvoicePDF, printInvoicePDF } from '@/lib/generate-invoice-pdf'

interface Client {
  id: string
  business_name: string
  trading_as: string | null
  contact_person: string
  email: string | null
  phone: string
  whatsapp: string | null
  physical_address: string | null
  city: string | null
  has_website: boolean
  has_school_management: boolean
  website_domain: string | null
  website_url: string | null
  domain_expiry_date: string | null
  hosting_expiry_date: string | null
  contract_start_date: string
  contract_status: string
  setup_fee: number
  setup_fee_paid: boolean
  setup_fee_paid_date: string | null
  monthly_sms_fee: number
  annual_website_fee: number
  notes: string | null
  created_at: string
}

interface Payment {
  id: string
  payment_type: string
  amount: number
  period_month: number | null
  period_year: number | null
  payment_date: string
  payment_method: string | null
  reference_number: string | null
  notes: string | null
  created_at: string
}

export default function ClientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const clientId = params.id as string

  const [client, setClient] = useState<Client | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [isAddingPayment, setIsAddingPayment] = useState(false)

  const [paymentForm, setPaymentForm] = useState({
    payment_type: 'monthly_sms',
    amount: 650,
    period_month: new Date().getMonth() + 1,
    period_year: new Date().getFullYear(),
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'bank_transfer',
    reference_number: '',
    notes: '',
  })

  useEffect(() => {
    fetchClient()
    fetchPayments()
  }, [clientId])

  async function fetchClient() {
    const supabase = createClient()

    try {
      const { data, error } = await (supabase
        .from('clients') as any)
        .select('*')
        .eq('id', clientId)
        .single()

      if (error) throw error
      setClient(data as Client)
    } catch (error) {
      console.error('Error fetching client:', error)
      toast.error('Failed to fetch client')
    } finally {
      setIsLoading(false)
    }
  }

  async function fetchPayments() {
    const supabase = createClient()

    try {
      const { data, error } = await (supabase
        .from('client_payments') as any)
        .select('*')
        .eq('client_id', clientId)
        .order('payment_date', { ascending: false })

      if (error) throw error
      setPayments((data || []) as Payment[])
    } catch (error) {
      console.error('Error fetching payments:', error)
    }
  }

  async function handleAddPayment(e: React.FormEvent) {
    e.preventDefault()
    setIsAddingPayment(true)
    const supabase = createClient()

    try {
      const { error } = await (supabase.from('client_payments') as any).insert({
        client_id: clientId,
        payment_type: paymentForm.payment_type,
        amount: paymentForm.amount,
        period_month: paymentForm.payment_type === 'monthly_sms' ? paymentForm.period_month : null,
        period_year: paymentForm.payment_type === 'monthly_sms' ? paymentForm.period_year : null,
        payment_date: paymentForm.payment_date,
        payment_method: paymentForm.payment_method,
        reference_number: paymentForm.reference_number || null,
        notes: paymentForm.notes || null,
      })

      if (error) throw error

      // If setup fee payment, update client
      if (paymentForm.payment_type === 'setup_fee' && client) {
        await (supabase
          .from('clients') as any)
          .update({
            setup_fee_paid: true,
            setup_fee_paid_date: paymentForm.payment_date,
          })
          .eq('id', clientId)
      }

      toast.success('Payment recorded successfully!')
      setShowPaymentModal(false)
      fetchPayments()
      fetchClient()

      // Reset form
      setPaymentForm({
        payment_type: 'monthly_sms',
        amount: client?.monthly_sms_fee || 650,
        period_month: new Date().getMonth() + 1,
        period_year: new Date().getFullYear(),
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'bank_transfer',
        reference_number: '',
        notes: '',
      })
    } catch (error) {
      console.error('Error adding payment:', error)
      toast.error('Failed to record payment')
    } finally {
      setIsAddingPayment(false)
    }
  }

  async function handleStatusChange(newStatus: string) {
    const supabase = createClient()

    try {
      const { error } = await (supabase
        .from('clients') as any)
        .update({ contract_status: newStatus })
        .eq('id', clientId)

      if (error) throw error

      toast.success(`Status updated to ${newStatus}`)
      fetchClient()
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('Failed to update status')
    }
  }

  const formatCurrency = (amount: number) => {
    return `N$ ${amount.toLocaleString('en-NA', { minimumFractionDigits: 2 })}`
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const getMonthName = (month: number) => {
    return new Date(2024, month - 1).toLocaleString('en', { month: 'long' })
  }

  const getPaymentTypeBadge = (type: string) => {
    const styles: Record<string, { bg: string; text: string }> = {
      setup_fee: { bg: 'bg-purple-100', text: 'text-purple-700' },
      monthly_sms: { bg: 'bg-blue-100', text: 'text-blue-700' },
      website_renewal: { bg: 'bg-green-100', text: 'text-green-700' },
      other: { bg: 'bg-gray-100', text: 'text-gray-700' },
    }
    const style = styles[type] || styles.other
    const labels: Record<string, string> = {
      setup_fee: 'Setup Fee',
      monthly_sms: 'Monthly SMS',
      website_renewal: 'Website Renewal',
      other: 'Other',
    }
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${style.bg} ${style.text}`}>
        {labels[type] || type}
      </span>
    )
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
      active: { bg: 'bg-green-100', text: 'text-green-700', icon: <CheckCircle className="w-4 h-4" /> },
      suspended: { bg: 'bg-amber-100', text: 'text-amber-700', icon: <AlertCircle className="w-4 h-4" /> },
      cancelled: { bg: 'bg-red-100', text: 'text-red-700', icon: <AlertCircle className="w-4 h-4" /> },
      pending: { bg: 'bg-blue-100', text: 'text-blue-700', icon: <Clock className="w-4 h-4" /> },
    }
    const style = styles[status] || styles.pending
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-full ${style.bg} ${style.text}`}>
        {style.icon}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  // Calculate total payments
  const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0)

  // Get paid months for current year
  const currentYear = new Date().getFullYear()
  const paidMonths = payments
    .filter(p => p.payment_type === 'monthly_sms' && p.period_year === currentYear)
    .map(p => p.period_month)

  if (isLoading) {
    return (
      <div className="p-4 md:p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="h-64 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    )
  }

  if (!client) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Client not found</h2>
        <Link href="/admin/clients">
          <Button variant="outline">Back to Clients</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <Link
          href="/admin/clients"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Clients
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">{client.business_name}</h1>
            {client.trading_as && (
              <p className="text-gray-500">Trading as: {client.trading_as}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {getStatusBadge(client.contract_status)}
            <select
              value={client.contract_status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none"
            >
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="suspended">Suspended</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact & Services */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Client Details</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3">Contact Information</h3>
                <div className="space-y-2">
                  <p className="flex items-center gap-2 text-gray-700">
                    <User className="w-4 h-4 text-gray-400" />
                    {client.contact_person}
                  </p>
                  <p className="flex items-center gap-2 text-gray-700">
                    <Phone className="w-4 h-4 text-gray-400" />
                    {client.phone}
                  </p>
                  {client.whatsapp && (
                    <p className="flex items-center gap-2 text-gray-700">
                      <Phone className="w-4 h-4 text-green-500" />
                      {client.whatsapp} (WhatsApp)
                    </p>
                  )}
                  {client.email && (
                    <p className="flex items-center gap-2 text-gray-700">
                      <Mail className="w-4 h-4 text-gray-400" />
                      {client.email}
                    </p>
                  )}
                  {client.physical_address && (
                    <p className="flex items-center gap-2 text-gray-700">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      {client.physical_address}{client.city && `, ${client.city}`}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3">Services</h3>
                <div className="space-y-3">
                  {client.has_school_management && (
                    <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                      <Monitor className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="font-medium text-gray-900">School Management System</p>
                        <p className="text-sm text-gray-500">{formatCurrency(client.monthly_sms_fee)}/month</p>
                      </div>
                    </div>
                  )}
                  {client.has_website && (
                    <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                      <Globe className="w-5 h-5 text-purple-600" />
                      <div>
                        <p className="font-medium text-gray-900">Website</p>
                        <p className="text-sm text-gray-500">
                          {client.website_domain || 'Domain TBD'} - {formatCurrency(client.annual_website_fee)}/year
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Contract Info */}
            <div className="mt-6 pt-6 border-t border-gray-100">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Contract Start</p>
                  <p className="font-medium text-gray-900">{formatDate(client.contract_start_date)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Setup Fee</p>
                  <p className="font-medium text-gray-900">{formatCurrency(client.setup_fee)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Setup Fee Status</p>
                  {client.setup_fee_paid ? (
                    <p className="font-medium text-green-600 flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" />
                      Paid
                    </p>
                  ) : (
                    <p className="font-medium text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      Unpaid
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-gray-500">Total Collected</p>
                  <p className="font-medium text-gray-900">{formatCurrency(totalPayments)}</p>
                </div>
              </div>
            </div>

            {client.notes && (
              <div className="mt-6 pt-6 border-t border-gray-100">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Notes</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{client.notes}</p>
              </div>
            )}
          </div>

          {/* Payment History */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Payment History</h2>
              <Button
                size="sm"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={() => setShowPaymentModal(true)}
              >
                Record Payment
              </Button>
            </div>

            {payments.length === 0 ? (
              <div className="text-center py-8">
                <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No payments recorded yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase">Period</th>
                      <th className="text-right px-4 py-2 text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="text-center px-4 py-2 text-xs font-medium text-gray-500 uppercase">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {payments.map((payment) => (
                      <tr key={payment.id}>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {formatDate(payment.payment_date)}
                        </td>
                        <td className="px-4 py-3">
                          {getPaymentTypeBadge(payment.payment_type)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {payment.period_month && payment.period_year
                            ? `${getMonthName(payment.period_month)} ${payment.period_year}`
                            : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                          {formatCurrency(payment.amount)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => downloadInvoicePDF(client, payment)}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                              title="Download Receipt"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => printInvoicePDF(client, payment)}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                              title="Print Receipt"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Monthly Payment Status */}
          {client.has_school_management && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">{currentYear} Payments</h2>
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
                  const isPaid = paidMonths.includes(month)
                  const isPast = month <= new Date().getMonth() + 1
                  return (
                    <div
                      key={month}
                      className={`p-2 rounded-lg text-center text-xs font-medium ${
                        isPaid
                          ? 'bg-green-100 text-green-700'
                          : isPast
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {getMonthName(month).slice(0, 3)}
                    </div>
                  )
                })}
              </div>
              <div className="mt-4 text-xs text-gray-500 flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-green-100"></span>
                  Paid
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-red-100"></span>
                  Overdue
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-gray-100"></span>
                  Upcoming
                </span>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={() => setShowPaymentModal(true)}
              >
                Record Payment
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                leftIcon={<Edit className="w-4 h-4" />}
                onClick={() => router.push(`/admin/clients/${clientId}/edit`)}
              >
                Edit Client
              </Button>
              {client.phone && (
                <a href={`tel:${client.phone}`}>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    leftIcon={<Phone className="w-4 h-4" />}
                  >
                    Call Client
                  </Button>
                </a>
              )}
              {client.whatsapp && (
                <a
                  href={`https://wa.me/${client.whatsapp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button
                    variant="outline"
                    className="w-full justify-start text-green-600 border-green-200 hover:bg-green-50"
                    leftIcon={<Phone className="w-4 h-4" />}
                  >
                    WhatsApp
                  </Button>
                </a>
              )}
              <div className="border-t border-gray-100 my-3 pt-3">
                <p className="text-xs text-gray-500 mb-2">Contract</p>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    leftIcon={<Download className="w-4 h-4" />}
                    onClick={() => downloadContractPDF(client)}
                  >
                    Download Contract
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    leftIcon={<Printer className="w-4 h-4" />}
                    onClick={() => printContractPDF(client)}
                  >
                    Print Contract
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Payment Modal */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title="Record Payment"
      >
        <form onSubmit={handleAddPayment} className="space-y-4">
          <Select
            label="Payment Type"
            value={paymentForm.payment_type}
            onChange={(e) => {
              const type = e.target.value
              let amount = 0
              if (type === 'setup_fee') amount = client.setup_fee
              else if (type === 'monthly_sms') amount = client.monthly_sms_fee
              else if (type === 'website_renewal') amount = client.annual_website_fee
              setPaymentForm({ ...paymentForm, payment_type: type, amount })
            }}
            options={[
              { value: 'monthly_sms', label: 'Monthly SMS Fee' },
              { value: 'setup_fee', label: 'Setup Fee' },
              { value: 'website_renewal', label: 'Website Renewal' },
              { value: 'other', label: 'Other' },
            ]}
          />

          {paymentForm.payment_type === 'monthly_sms' && (
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Month"
                value={paymentForm.period_month.toString()}
                onChange={(e) => setPaymentForm({ ...paymentForm, period_month: parseInt(e.target.value) })}
                options={Array.from({ length: 12 }, (_, i) => ({
                  value: (i + 1).toString(),
                  label: getMonthName(i + 1),
                }))}
              />
              <Select
                label="Year"
                value={paymentForm.period_year.toString()}
                onChange={(e) => setPaymentForm({ ...paymentForm, period_year: parseInt(e.target.value) })}
                options={[
                  { value: (currentYear - 1).toString(), label: (currentYear - 1).toString() },
                  { value: currentYear.toString(), label: currentYear.toString() },
                  { value: (currentYear + 1).toString(), label: (currentYear + 1).toString() },
                ]}
              />
            </div>
          )}

          <Input
            label="Amount (N$)"
            type="number"
            step="0.01"
            value={paymentForm.amount}
            onChange={(e) => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) || 0 })}
          />

          <Input
            label="Payment Date"
            type="date"
            value={paymentForm.payment_date}
            onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
          />

          <Select
            label="Payment Method"
            value={paymentForm.payment_method}
            onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
            options={[
              { value: 'bank_transfer', label: 'Bank Transfer' },
              { value: 'cash', label: 'Cash' },
              { value: 'mobile_money', label: 'Mobile Money' },
              { value: 'card', label: 'Card' },
              { value: 'other', label: 'Other' },
            ]}
          />

          <Input
            label="Reference Number"
            value={paymentForm.reference_number}
            onChange={(e) => setPaymentForm({ ...paymentForm, reference_number: e.target.value })}
            placeholder="Optional"
          />

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowPaymentModal(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isAddingPayment}
              leftIcon={isAddingPayment ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              className="flex-1"
            >
              {isAddingPayment ? 'Saving...' : 'Record Payment'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
