'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/input'
import {
  ArrowLeft,
  Search,
  FileText,
  Download,
  CheckSquare,
  Square,
  User,
  Phone,
  Mail,
  AlertCircle,
  Loader2,
  Filter,
  X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { formatCurrency } from '@/lib/currency'
import { jsPDF } from 'jspdf'

interface StudentWithFees {
  id: string
  full_name: string
  student_number: string | null
  phone: string | null
  email: string | null
  parent_name: string | null
  parent_phone: string | null
  parent_email: string | null
  credit_balance: number
  totalDue: number
  totalPaid: number
  outstanding: number
  fees: Array<{
    id: string
    fee_month: string
    fee_type: string
    amount_due: number
    amount_paid: number
    balance: number
    status: string
  }>
}

interface CenterInfo {
  name: string
  phone: string | null
  email: string | null
  address: string | null
  bank_name: string | null
  account_number: string | null
  branch_code: string | null
}

const MONTHS = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
]

export default function OutstandingFeesPage() {
  const { user } = useAuthStore()
  const [students, setStudents] = useState<StudentWithFees[]>([])
  const [centerInfo, setCenterInfo] = useState<CenterInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [monthFilter, setMonthFilter] = useState('')
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString())
  const [feeTypeFilter, setFeeTypeFilter] = useState('')
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set())
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)

  useEffect(() => {
    if (user?.institution_id) {
      fetchData()
    }
  }, [user?.institution_id, monthFilter, yearFilter, feeTypeFilter])

  async function fetchData() {
    if (!user?.institution_id) return

    setIsLoading(true)
    const supabase = createClient()

    try {
      // Fetch center info
      const { data: centerData } = await supabase
        .from('institutions')
        .select('name, phone, email, address, bank_name, account_number, branch_code')
        .eq('id', user.institution_id)
        .single()

      if (centerData) {
        setCenterInfo(centerData as CenterInfo)
      }

      // Build fee query
      let feeQuery = supabase
        .from('student_fees')
        .select(`
          id,
          student_id,
          fee_month,
          fee_type,
          amount_due,
          amount_paid,
          balance,
          status
        `)
        .eq('institution_id', user.institution_id)
        .neq('status', 'paid')

      // Apply filters
      if (monthFilter && yearFilter) {
        const filterMonth = `${yearFilter}-${monthFilter}-01`
        feeQuery = feeQuery.eq('fee_month', filterMonth)
      }

      if (feeTypeFilter) {
        feeQuery = feeQuery.eq('fee_type', feeTypeFilter)
      }

      const { data: feesData, error: feesError } = await feeQuery

      if (feesError) throw feesError

      // Get unique student IDs with outstanding fees
      const studentIds = [...new Set((feesData || []).map((f: any) => f.student_id))]

      if (studentIds.length === 0) {
        setStudents([])
        setIsLoading(false)
        return
      }

      // Fetch student details
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, full_name, student_number, phone, email, parent_name, parent_phone, parent_email, credit_balance')
        .in('id', studentIds)
        .eq('status', 'active')

      if (studentsError) throw studentsError

      // Group fees by student
      const studentMap = new Map<string, StudentWithFees>()

      for (const student of (studentsData || []) as any[]) {
        studentMap.set(student.id, {
          ...student,
          credit_balance: student.credit_balance || 0,
          totalDue: 0,
          totalPaid: 0,
          outstanding: 0,
          fees: [],
        })
      }

      for (const fee of (feesData || []) as any[]) {
        const student = studentMap.get(fee.student_id)
        if (student) {
          student.fees.push(fee)
          student.totalDue += fee.amount_due
          student.totalPaid += fee.amount_paid
          student.outstanding += fee.balance
        }
      }

      // Sort by outstanding amount (highest first)
      const sortedStudents = Array.from(studentMap.values())
        .filter(s => s.outstanding > 0)
        .sort((a, b) => b.outstanding - a.outstanding)

      setStudents(sortedStudents)
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load outstanding fees')
    } finally {
      setIsLoading(false)
    }
  }

  // Filter by search query
  const filteredStudents = students.filter(student => {
    if (!searchQuery) return true
    const search = searchQuery.toLowerCase()
    return (
      student.full_name.toLowerCase().includes(search) ||
      student.student_number?.toLowerCase().includes(search) ||
      student.phone?.toLowerCase().includes(search) ||
      student.parent_phone?.toLowerCase().includes(search)
    )
  })

  // Toggle student selection
  const toggleStudent = (studentId: string) => {
    const newSelected = new Set(selectedStudents)
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId)
    } else {
      newSelected.add(studentId)
    }
    setSelectedStudents(newSelected)
  }

  // Select all visible students
  const selectAll = () => {
    const allIds = new Set(filteredStudents.map(s => s.id))
    setSelectedStudents(allIds)
  }

  // Deselect all
  const deselectAll = () => {
    setSelectedStudents(new Set())
  }

  // Generate PDF statement for a single student
  const generateStudentStatement = (student: StudentWithFees, centerInfo: CenterInfo): jsPDF => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })

    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 15
    let y = margin

    // Header - Center name
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text(centerInfo.name, pageWidth / 2, y, { align: 'center' })
    y += 8

    // Center contact info
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    const contactParts = []
    if (centerInfo.phone) contactParts.push(`Tel: ${centerInfo.phone}`)
    if (centerInfo.email) contactParts.push(`Email: ${centerInfo.email}`)
    if (contactParts.length > 0) {
      doc.text(contactParts.join(' | '), pageWidth / 2, y, { align: 'center' })
      y += 5
    }
    if (centerInfo.address) {
      doc.text(centerInfo.address, pageWidth / 2, y, { align: 'center' })
      y += 5
    }

    // Divider
    y += 3
    doc.setLineWidth(0.5)
    doc.line(margin, y, pageWidth - margin, y)
    y += 8

    // Statement title
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('STATEMENT OF ACCOUNT', pageWidth / 2, y, { align: 'center' })
    y += 10

    // Student info box
    doc.setFillColor(245, 245, 245)
    doc.rect(margin, y, pageWidth - margin * 2, 25, 'F')
    y += 6

    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Student:', margin + 3, y)
    doc.setFont('helvetica', 'normal')
    doc.text(student.full_name, margin + 25, y)

    doc.setFont('helvetica', 'bold')
    doc.text('Student ID:', pageWidth / 2, y)
    doc.setFont('helvetica', 'normal')
    doc.text(student.student_number || '-', pageWidth / 2 + 25, y)
    y += 6

    doc.setFont('helvetica', 'bold')
    doc.text('Contact:', margin + 3, y)
    doc.setFont('helvetica', 'normal')
    doc.text(student.phone || student.parent_phone || '-', margin + 25, y)

    doc.setFont('helvetica', 'bold')
    doc.text('Date:', pageWidth / 2, y)
    doc.setFont('helvetica', 'normal')
    doc.text(new Date().toLocaleDateString('en-ZA'), pageWidth / 2 + 25, y)
    y += 15

    // Fee table header
    doc.setFillColor(66, 66, 66)
    doc.rect(margin, y, pageWidth - margin * 2, 8, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('Period', margin + 3, y + 5.5)
    doc.text('Type', margin + 45, y + 5.5)
    doc.text('Amount Due', margin + 85, y + 5.5)
    doc.text('Paid', margin + 115, y + 5.5)
    doc.text('Balance', margin + 145, y + 5.5)
    y += 8

    doc.setTextColor(0, 0, 0)
    doc.setFont('helvetica', 'normal')

    // Fee rows
    let rowBg = false
    for (const fee of student.fees) {
      if (rowBg) {
        doc.setFillColor(250, 250, 250)
        doc.rect(margin, y, pageWidth - margin * 2, 7, 'F')
      }
      rowBg = !rowBg

      const feeDate = new Date(fee.fee_month)
      const monthName = feeDate.toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })
      const feeType = fee.fee_type === 'registration' ? 'Registration' : 'Tuition'

      doc.text(monthName, margin + 3, y + 5)
      doc.text(feeType, margin + 45, y + 5)
      doc.text(`R ${fee.amount_due.toFixed(2)}`, margin + 85, y + 5)
      doc.text(`R ${fee.amount_paid.toFixed(2)}`, margin + 115, y + 5)
      doc.text(`R ${fee.balance.toFixed(2)}`, margin + 145, y + 5)
      y += 7
    }

    // Totals
    y += 3
    doc.setLineWidth(0.3)
    doc.line(margin + 80, y, pageWidth - margin, y)
    y += 6

    doc.setFont('helvetica', 'bold')
    doc.text('Total Due:', margin + 85, y)
    doc.text(`R ${student.totalDue.toFixed(2)}`, margin + 145, y)
    y += 6

    doc.text('Total Paid:', margin + 85, y)
    doc.setTextColor(0, 128, 0)
    doc.text(`R ${student.totalPaid.toFixed(2)}`, margin + 145, y)
    y += 6

    doc.setTextColor(0, 0, 0)
    if (student.credit_balance > 0) {
      doc.text('Credit Balance:', margin + 85, y)
      doc.setTextColor(0, 100, 200)
      doc.text(`R ${student.credit_balance.toFixed(2)}`, margin + 145, y)
      y += 6
    }

    doc.setTextColor(200, 0, 0)
    doc.setFontSize(11)
    doc.text('AMOUNT OWING:', margin + 85, y)
    const netOwing = Math.max(0, student.outstanding - student.credit_balance)
    doc.text(`R ${netOwing.toFixed(2)}`, margin + 145, y)
    y += 12

    // Banking details
    doc.setTextColor(0, 0, 0)
    if (centerInfo.bank_name || centerInfo.account_number) {
      doc.setFillColor(240, 248, 255)
      doc.rect(margin, y, pageWidth - margin * 2, 22, 'F')
      y += 5

      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('Banking Details for Payment:', margin + 3, y)
      y += 5

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      if (centerInfo.bank_name) {
        doc.text(`Bank: ${centerInfo.bank_name}`, margin + 3, y)
      }
      if (centerInfo.account_number) {
        doc.text(`Account: ${centerInfo.account_number}`, margin + 60, y)
      }
      if (centerInfo.branch_code) {
        doc.text(`Branch: ${centerInfo.branch_code}`, margin + 120, y)
      }
      y += 5
      doc.text(`Reference: ${student.student_number || student.full_name}`, margin + 3, y)
      y += 10
    }

    // Footer message
    y += 5
    doc.setFontSize(9)
    doc.setFont('helvetica', 'italic')
    doc.text('Please make payment at your earliest convenience. Thank you for your continued support.', pageWidth / 2, y, { align: 'center' })

    return doc
  }

  // Generate and download statements for selected students
  const handleGenerateStatements = async () => {
    if (selectedStudents.size === 0) {
      toast.error('Please select at least one student')
      return
    }

    if (!centerInfo) {
      toast.error('Center information not loaded')
      return
    }

    setIsGeneratingPdf(true)

    try {
      const selectedList = filteredStudents.filter(s => selectedStudents.has(s.id))

      if (selectedList.length === 1) {
        // Single student - download directly
        const student = selectedList[0]
        const doc = generateStudentStatement(student, centerInfo)
        doc.save(`Statement_${student.student_number || student.full_name.replace(/\s+/g, '_')}.pdf`)
        toast.success('Statement downloaded')
      } else {
        // Multiple students - generate individual PDFs
        // For simplicity, we'll generate them one by one
        // In a production app, you might want to use JSZip to create a zip file

        for (const student of selectedList) {
          const doc = generateStudentStatement(student, centerInfo)
          doc.save(`Statement_${student.student_number || student.full_name.replace(/\s+/g, '_')}.pdf`)
          // Small delay to prevent browser issues
          await new Promise(resolve => setTimeout(resolve, 300))
        }

        toast.success(`${selectedList.length} statements downloaded`)
      }
    } catch (error) {
      console.error('Error generating statements:', error)
      toast.error('Failed to generate statements')
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  // Calculate totals
  const totalOutstanding = filteredStudents.reduce((sum, s) => sum + s.outstanding, 0)
  const totalStudents = filteredStudents.length

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/payments">
            <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Outstanding Fees</h1>
            <p className="text-gray-500 mt-1">Students with unpaid balances</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleGenerateStatements}
            disabled={selectedStudents.size === 0 || isGeneratingPdf}
            leftIcon={isGeneratingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          >
            {isGeneratingPdf ? 'Generating...' : `Download Statements (${selectedStudents.size})`}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-100">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Outstanding</p>
              <p className="text-xl font-bold text-red-600">{formatCurrency(totalOutstanding)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Students Owing</p>
              <p className="text-xl font-bold text-gray-900">{totalStudents}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100">
              <CheckSquare className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Selected</p>
              <p className="text-xl font-bold text-gray-900">{selectedStudents.size}</p>
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
              placeholder="Search student name, ID or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none text-sm"
            />
          </div>

          {/* Month/Year Filter */}
          <div className="flex items-center gap-1 px-2 py-1 bg-purple-50 rounded-lg border border-purple-200">
            <Filter className="w-4 h-4 text-purple-600" />
            <Select
              options={MONTHS}
              placeholder="Month"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="w-28"
            />
            <Select
              options={[
                { value: (new Date().getFullYear() - 1).toString(), label: (new Date().getFullYear() - 1).toString() },
                { value: new Date().getFullYear().toString(), label: new Date().getFullYear().toString() },
                { value: (new Date().getFullYear() + 1).toString(), label: (new Date().getFullYear() + 1).toString() },
              ]}
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="w-24"
            />
          </div>

          {/* Fee Type Filter */}
          <Select
            options={[
              { value: 'registration', label: 'Registration' },
              { value: 'tuition', label: 'Tuition' },
            ]}
            placeholder="Fee Type"
            value={feeTypeFilter}
            onChange={(e) => setFeeTypeFilter(e.target.value)}
            className="w-32"
          />

          {/* Clear Filters */}
          {(monthFilter || feeTypeFilter) && (
            <button
              onClick={() => {
                setMonthFilter('')
                setFeeTypeFilter('')
              }}
              className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
            >
              <X className="w-4 h-4" />
              Clear
            </button>
          )}

          {/* Selection controls */}
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={selectAll}
              className="px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg"
            >
              Select All
            </button>
            <button
              onClick={deselectAll}
              className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg"
            >
              Clear Selection
            </button>
          </div>
        </div>
      </div>

      {/* Student List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-500">Loading outstanding fees...</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-12 text-center">
            <AlertCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Outstanding Fees</h3>
            <p className="text-gray-500">
              {monthFilter || feeTypeFilter
                ? 'No students match your filters'
                : 'All students are up to date with their payments!'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="w-12 px-4 py-3">
                    <button
                      onClick={() => selectedStudents.size === filteredStudents.length ? deselectAll() : selectAll()}
                      className="p-1 hover:bg-gray-200 rounded"
                    >
                      {selectedStudents.size === filteredStudents.length && filteredStudents.length > 0 ? (
                        <CheckSquare className="w-5 h-5 text-blue-600" />
                      ) : (
                        <Square className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Student</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Contact</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Months Owing</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Amount Due</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Paid</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Outstanding</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredStudents.map((student) => (
                  <tr
                    key={student.id}
                    className={`hover:bg-gray-50 ${selectedStudents.has(student.id) ? 'bg-blue-50' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleStudent(student.id)}
                        className="p-1 hover:bg-gray-200 rounded"
                      >
                        {selectedStudents.has(student.id) ? (
                          <CheckSquare className="w-5 h-5 text-blue-600" />
                        ) : (
                          <Square className="w-5 h-5 text-gray-400" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900">{student.full_name}</p>
                        <p className="text-sm text-gray-500">{student.student_number || '-'}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm">
                        {student.phone && (
                          <p className="flex items-center gap-1 text-gray-600">
                            <Phone className="w-3 h-3" /> {student.phone}
                          </p>
                        )}
                        {student.parent_phone && student.parent_phone !== student.phone && (
                          <p className="flex items-center gap-1 text-gray-500">
                            <User className="w-3 h-3" /> {student.parent_phone}
                          </p>
                        )}
                        {!student.phone && !student.parent_phone && (
                          <p className="text-gray-400">No contact</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {student.fees.slice(0, 3).map((fee) => {
                          const feeDate = new Date(fee.fee_month)
                          const monthShort = feeDate.toLocaleDateString('en-ZA', { month: 'short' })
                          const isRegistration = fee.fee_type === 'registration'
                          return (
                            <span
                              key={fee.id}
                              className={`inline-flex px-2 py-0.5 text-xs rounded-full ${
                                isRegistration
                                  ? 'bg-purple-100 text-purple-700'
                                  : 'bg-amber-100 text-amber-700'
                              }`}
                            >
                              {isRegistration ? 'Reg' : monthShort}
                            </span>
                          )
                        })}
                        {student.fees.length > 3 && (
                          <span className="inline-flex px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
                            +{student.fees.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-900">
                      {formatCurrency(student.totalDue)}
                    </td>
                    <td className="px-4 py-3 text-right text-green-600">
                      {formatCurrency(student.totalPaid)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-semibold text-red-600">
                        {formatCurrency(student.outstanding)}
                      </span>
                      {student.credit_balance > 0 && (
                        <p className="text-xs text-blue-600">
                          Credit: {formatCurrency(student.credit_balance)}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Link href={`/dashboard/students/${student.id}?tab=fees`}>
                        <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                          <FileText className="w-4 h-4" />
                        </button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
