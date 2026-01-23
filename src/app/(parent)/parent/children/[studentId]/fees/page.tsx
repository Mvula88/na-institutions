'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import {
  ArrowLeft,
  Loader2,
  CreditCard,
  CheckCircle,
  Clock,
  AlertCircle,
} from 'lucide-react'

interface FeeTransaction {
  id: string
  amount: number
  status: string
  due_date: string
  paid_date: string | null
  description: string | null
  payment_method: string | null
  fee_type?: {
    name: string
  }
}

interface StudentInfo {
  full_name: string
  student_number: string | null
}

export default function ChildFeesPage() {
  const params = useParams()
  const studentId = params.studentId as string

  const [student, setStudent] = useState<StudentInfo | null>(null)
  const [fees, setFees] = useState<FeeTransaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid'>('all')
  const [stats, setStats] = useState({ totalDue: 0, totalPaid: 0, overdue: 0 })

  useEffect(() => {
    loadFees()
  }, [studentId])

  async function loadFees() {
    setIsLoading(true)
    const supabase = createClient()

    // Get student info
    const { data: studentData } = await supabase
      .from('students')
      .select('full_name, student_number')
      .eq('id', studentId)
      .single()

    if (studentData) {
      setStudent(studentData)
    }

    // Get all fee transactions
    const { data: feeData } = await supabase
      .from('fee_transactions')
      .select(`
        id, amount, status, due_date, paid_date, description, payment_method,
        fee_type:fee_types(name)
      `)
      .eq('student_id', studentId)
      .order('due_date', { ascending: false })

    if (feeData) {
      const transactions = feeData as unknown as FeeTransaction[]
      setFees(transactions)

      // Calculate stats
      const pending = transactions.filter(f => f.status === 'pending' || f.status === 'partial')
      const paid = transactions.filter(f => f.status === 'paid')
      const today = new Date().toISOString().split('T')[0]
      const overdueItems = pending.filter(f => f.due_date < today)

      setStats({
        totalDue: pending.reduce((sum, f) => sum + Number(f.amount), 0),
        totalPaid: paid.reduce((sum, f) => sum + Number(f.amount), 0),
        overdue: overdueItems.length,
      })
    }

    setIsLoading(false)
  }

  const filteredFees = fees.filter(fee => {
    if (filter === 'pending') return fee.status === 'pending' || fee.status === 'partial'
    if (filter === 'paid') return fee.status === 'paid'
    return true
  })

  const getStatusIcon = (status: string, dueDate: string) => {
    if (status === 'paid') return <CheckCircle className="w-5 h-5 text-green-600" />
    const isOverdue = dueDate < new Date().toISOString().split('T')[0]
    if (isOverdue) return <AlertCircle className="w-5 h-5 text-red-600" />
    return <Clock className="w-5 h-5 text-yellow-600" />
  }

  const getStatusBadge = (status: string, dueDate: string) => {
    if (status === 'paid') return 'bg-green-100 text-green-700'
    const isOverdue = dueDate < new Date().toISOString().split('T')[0]
    if (isOverdue) return 'bg-red-100 text-red-700'
    return 'bg-yellow-100 text-yellow-700'
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link
        href={`/parent/children/${studentId}`}
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to {student?.full_name || 'Child'}'s Dashboard
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fee Transactions</h1>
          <p className="text-gray-500">{student?.full_name}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <CreditCard className="w-4 h-4" />
            <span className="text-sm">Outstanding Balance</span>
          </div>
          <p className={`text-2xl font-bold ${stats.totalDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
            N${stats.totalDue.toLocaleString()}
          </p>
          {stats.overdue > 0 && (
            <p className="text-xs text-red-500 mt-1">{stats.overdue} overdue</p>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-green-600 mb-2">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm">Total Paid</span>
          </div>
          <p className="text-2xl font-bold text-green-600">
            N${stats.totalPaid.toLocaleString()}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <Clock className="w-4 h-4" />
            <span className="text-sm">Transactions</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{fees.length}</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {(['all', 'pending', 'paid'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-purple-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Fees List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          </div>
        ) : filteredFees.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No fee transactions found
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredFees.map((fee) => (
              <div key={fee.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    fee.status === 'paid' ? 'bg-green-100' :
                    fee.due_date < new Date().toISOString().split('T')[0] ? 'bg-red-100' : 'bg-yellow-100'
                  }`}>
                    {getStatusIcon(fee.status, fee.due_date)}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {fee.fee_type?.name || fee.description || 'Fee'}
                    </p>
                    <p className="text-sm text-gray-500">
                      Due: {new Date(fee.due_date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {fee.paid_date && ` | Paid: ${new Date(fee.paid_date).toLocaleDateString('en-ZA')}`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-bold ${
                    fee.status === 'paid' ? 'text-gray-500' : 'text-gray-900'
                  }`}>
                    N${Number(fee.amount).toLocaleString()}
                  </p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusBadge(fee.status, fee.due_date)}`}>
                    {fee.status === 'paid' ? 'Paid' :
                     fee.due_date < new Date().toISOString().split('T')[0] ? 'Overdue' : 'Pending'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payment Info */}
      {stats.totalDue > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h3 className="font-medium text-blue-900 mb-2">Payment Information</h3>
          <p className="text-sm text-blue-700">
            Please contact the school office for payment arrangements or to pay fees.
            You can make payments via bank transfer, cash, or card at the school office.
          </p>
        </div>
      )}
    </div>
  )
}
