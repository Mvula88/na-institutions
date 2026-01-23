'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CreditCard, CheckCircle, Clock, AlertCircle, Receipt } from 'lucide-react'

interface Fee {
  id: string
  fee_type: string
  description: string | null
  total_amount: number
  amount_paid: number
  balance: number
  due_date: string | null
  status: string
  created_at: string
}

interface Payment {
  id: string
  amount: number
  payment_method: string | null
  payment_date: string
  reference_number: string | null
  notes: string | null
}

export default function StudentFeesPage() {
  const params = useParams()
  const token = params.token as string
  const [isLoading, setIsLoading] = useState(true)
  const [fees, setFees] = useState<Fee[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [summary, setSummary] = useState({ total: 0, paid: 0, outstanding: 0 })

  useEffect(() => {
    if (token) {
      fetchFeesData()
    }
  }, [token])

  async function fetchFeesData() {
    setIsLoading(true)
    const supabase = createClient()

    // Fetch fees
    const { data: feesData } = await supabase
      .from('student_fees')
      .select('id, fee_type, description, total_amount, amount_paid, balance, due_date, status, created_at')
      .eq('student_id', token)
      .order('created_at', { ascending: false })

    const feesArray = (feesData || []) as Fee[]
    setFees(feesArray)

    // Calculate summary
    let total = 0, paid = 0, outstanding = 0
    for (const fee of feesArray) {
      total += fee.total_amount
      paid += fee.amount_paid
      outstanding += fee.balance
    }
    setSummary({ total, paid, outstanding })

    // Fetch recent payments
    const { data: paymentsData } = await supabase
      .from('payments')
      .select('id, amount, payment_method, payment_date, reference_number, notes')
      .eq('student_id', token)
      .order('payment_date', { ascending: false })
      .limit(10)

    setPayments((paymentsData || []) as Payment[])
    setIsLoading(false)
  }

  const statusConfig: Record<string, { bg: string; text: string; icon: React.ReactNode; label: string }> = {
    paid: { bg: 'bg-green-100', text: 'text-green-700', icon: <CheckCircle className="w-4 h-4" />, label: 'Paid' },
    pending: { bg: 'bg-amber-100', text: 'text-amber-700', icon: <Clock className="w-4 h-4" />, label: 'Pending' },
    overdue: { bg: 'bg-red-100', text: 'text-red-700', icon: <AlertCircle className="w-4 h-4" />, label: 'Overdue' },
    partial: { bg: 'bg-blue-100', text: 'text-blue-700', icon: <Clock className="w-4 h-4" />, label: 'Partial' },
  }

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
          ))}
        </div>
        <div className="h-64 bg-gray-200 rounded-xl"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Fees & Payments</h2>
        <p className="text-gray-500 text-sm mt-1">View your fee statements and payment history</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gray-100 rounded-lg">
              <CreditCard className="w-6 h-6 text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Fees</p>
              <p className="text-2xl font-bold text-gray-900">N${summary.total.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-green-50 rounded-xl border border-green-200 p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-green-600">Amount Paid</p>
              <p className="text-2xl font-bold text-green-700">N${summary.paid.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className={`${summary.outstanding > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'} rounded-xl border p-6`}>
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-lg ${summary.outstanding > 0 ? 'bg-red-100' : 'bg-gray-100'}`}>
              <AlertCircle className={`w-6 h-6 ${summary.outstanding > 0 ? 'text-red-600' : 'text-gray-600'}`} />
            </div>
            <div>
              <p className={`text-sm ${summary.outstanding > 0 ? 'text-red-600' : 'text-gray-500'}`}>Outstanding</p>
              <p className={`text-2xl font-bold ${summary.outstanding > 0 ? 'text-red-700' : 'text-gray-900'}`}>
                N${summary.outstanding.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Fee Items */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-medium text-gray-900">Fee Statements</h3>
        </div>
        {fees.length === 0 ? (
          <div className="p-12 text-center">
            <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Fee Records</h3>
            <p className="text-gray-500">Your fee statements will appear here.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {fees.map((fee) => {
              const config = statusConfig[fee.status] || statusConfig.pending
              const isPaid = fee.status === 'paid'

              return (
                <div key={fee.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-lg ${isPaid ? 'bg-green-100' : 'bg-gray-100'}`}>
                        <Receipt className={`w-5 h-5 ${isPaid ? 'text-green-600' : 'text-gray-600'}`} />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{fee.fee_type}</p>
                        {fee.description && (
                          <p className="text-sm text-gray-500">{fee.description}</p>
                        )}
                        {fee.due_date && (
                          <p className="text-xs text-gray-400">
                            Due: {new Date(fee.due_date).toLocaleDateString('en-ZA')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">N${fee.total_amount.toLocaleString()}</p>
                      {fee.balance > 0 && (
                        <p className="text-sm text-red-600">Balance: N${fee.balance.toLocaleString()}</p>
                      )}
                      <span className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
                        {config.icon}
                        {config.label}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Payment History */}
      {payments.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-medium text-gray-900">Recent Payments</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {payments.map((payment) => (
              <div key={payment.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      N${payment.amount.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(payment.payment_date).toLocaleDateString('en-ZA')}
                      {payment.payment_method && ` • ${payment.payment_method}`}
                    </p>
                    {payment.reference_number && (
                      <p className="text-xs text-gray-400">Ref: {payment.reference_number}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment Notice */}
      {summary.outstanding > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <p className="font-medium text-amber-900">Outstanding Fees</p>
              <p className="text-sm text-amber-700 mt-1">
                You have outstanding fees of N${summary.outstanding.toLocaleString()}.
                Please contact the school administration to arrange payment.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
