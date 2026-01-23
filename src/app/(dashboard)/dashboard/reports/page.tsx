'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import {
  FileText,
  Download,
  Calendar,
  DollarSign,
  Users,
  TrendingUp,
  TrendingDown,
  GraduationCap,
  CreditCard,
  PieChart,
  BarChart3,
  ClipboardCheck,
  Award,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/input'
import { formatCurrency, CURRENCY_CONFIG } from '@/lib/currency'

interface ReportStats {
  totalStudents: number
  activeStudents: number
  newStudentsThisMonth: number
  totalTeachers: number
  totalSubjects: number
  totalFeesExpected: number
  totalFeesCollected: number
  totalOutstanding: number
  collectionRate: number
  paymentsByMethod: {
    cash: number
    bank_transfer: number
    card: number
    mobile_money: number
  }
  monthlyRevenue: {
    month: string
    amount: number
  }[]
  studentsByGrade: {
    grade: string
    count: number
  }[]
  feeStatusBreakdown: {
    paid: number
    partial: number
    unpaid: number
  }
}

// Types for Supabase query results
interface StudentRow {
  id: string
  status: string
  grade: string | null
  created_at: string
}

interface FeeRow {
  amount_due: number
  amount_paid: number
  status: string
}

interface PaymentRow {
  amount: number
  payment_method: string | null
  payment_date: string
  student?: {
    full_name: string
    student_number: string | null
  }
}

export default function ReportsPage() {
  const { user } = useAuthStore()
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState<ReportStats | null>(null)
  const [dateRange, setDateRange] = useState('this_month')
  const [reportType, setReportType] = useState('overview')

  useEffect(() => {
    fetchReportData()
  }, [dateRange, user?.institution_id])

  async function fetchReportData() {
    if (!user?.institution_id) return

    setIsLoading(true)
    const supabase = createClient()

    try {
      // Get date range
      const now = new Date()
      let startDate: Date

      switch (dateRange) {
        case 'this_month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          break
        case 'last_month':
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
          break
        case 'this_year':
          startDate = new Date(now.getFullYear(), 0, 1)
          break
        case 'all_time':
        default:
          startDate = new Date(2020, 0, 1)
      }

      // Fetch students
      const { data: students } = await supabase
        .from('students')
        .select('id, status, grade, created_at')
        .eq('institution_id', user.institution_id)

      // Fetch teachers
      const { count: teacherCount } = await supabase
        .from('lecturers')
        .select('id', { count: 'exact' })
        .eq('institution_id', user.institution_id)
        .eq('status', 'active')

      // Fetch subjects
      const { count: subjectCount } = await supabase
        .from('courses')
        .select('id', { count: 'exact' })
        .eq('institution_id', user.institution_id)
        .eq('is_active', true)

      // Fetch fees
      const { data: fees } = await supabase
        .from('student_fees')
        .select('amount_due, amount_paid, status')
        .eq('institution_id', user.institution_id)
        .gte('fee_month', startDate.toISOString())

      // Fetch payments
      const { data: payments } = await supabase
        .from('payments')
        .select('amount, payment_method, payment_date')
        .eq('institution_id', user.institution_id)
        .gte('payment_date', startDate.toISOString())

      // Process data with proper typing
      const typedStudents = (students || []) as StudentRow[]
      const typedFees = (fees || []) as FeeRow[]
      const typedPayments = (payments || []) as PaymentRow[]

      const activeStudents = typedStudents.filter(s => s.status === 'active').length
      const newStudents = typedStudents.filter(s =>
        new Date(s.created_at) >= new Date(now.getFullYear(), now.getMonth(), 1)
      ).length

      const totalFeesExpected = typedFees.reduce((sum, f) => sum + (f.amount_due || 0), 0)
      const totalFeesCollected = typedFees.reduce((sum, f) => sum + (f.amount_paid || 0), 0)
      const totalOutstanding = totalFeesExpected - totalFeesCollected

      const feeStatusBreakdown = {
        paid: typedFees.filter(f => f.status === 'paid').length,
        partial: typedFees.filter(f => f.status === 'partial').length,
        unpaid: typedFees.filter(f => f.status === 'unpaid').length,
      }

      const paymentsByMethod = {
        cash: typedPayments.filter(p => p.payment_method === 'cash').reduce((sum, p) => sum + p.amount, 0),
        bank_transfer: typedPayments.filter(p => p.payment_method === 'bank_transfer').reduce((sum, p) => sum + p.amount, 0),
        card: typedPayments.filter(p => p.payment_method === 'card').reduce((sum, p) => sum + p.amount, 0),
        mobile_money: typedPayments.filter(p => p.payment_method === 'mobile_money').reduce((sum, p) => sum + p.amount, 0),
      }

      // Group students by grade
      const gradeGroups: Record<string, number> = {}
      typedStudents.forEach(s => {
        const grade = s.grade || 'Unknown'
        gradeGroups[grade] = (gradeGroups[grade] || 0) + 1
      })
      const studentsByGrade = Object.entries(gradeGroups).map(([grade, count]) => ({ grade, count }))

      // Monthly revenue (simplified)
      const monthlyRevenue = [
        { month: 'Jan', amount: 0 },
        { month: 'Feb', amount: 0 },
        { month: 'Mar', amount: 0 },
        { month: 'Apr', amount: 0 },
        { month: 'May', amount: 0 },
        { month: 'Jun', amount: 0 },
      ]
      typedPayments.forEach(p => {
        const month = new Date(p.payment_date).getMonth()
        if (month < 6) {
          monthlyRevenue[month].amount += p.amount
        }
      })

      setStats({
        totalStudents: students?.length || 0,
        activeStudents,
        newStudentsThisMonth: newStudents,
        totalTeachers: teacherCount || 0,
        totalSubjects: subjectCount || 0,
        totalFeesExpected,
        totalFeesCollected,
        totalOutstanding,
        collectionRate: totalFeesExpected > 0 ? (totalFeesCollected / totalFeesExpected) * 100 : 0,
        paymentsByMethod,
        monthlyRevenue,
        studentsByGrade,
        feeStatusBreakdown,
      })
    } catch (error) {
      console.error('Error fetching report data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Using centralized formatCurrency from @/lib/currency

  // Export functions
  function downloadCSV(data: string[][], filename: string) {
    const csvContent = data.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  async function handleExportOverview() {
    if (!stats || !user?.institution_id) return

    // Fetch actual payments data for accurate totals
    const supabase = createClient()
    const { data: payments } = await supabase
      .from('payments')
      .select('amount')
      .eq('institution_id', user.institution_id)

    const typedPayments = (payments || []) as { amount: number }[]
    const totalPayments = typedPayments.reduce((sum, p) => sum + p.amount, 0)

    const data = [
      ['Report Type', 'Overview Report'],
      ['Date Generated', new Date().toLocaleString()],
      ['Date Range', dateRange.replace('_', ' ').toUpperCase()],
      [''],
      ['STUDENT METRICS', ''],
      ['Total Students', stats.totalStudents.toString()],
      ['Active Students', stats.activeStudents.toString()],
      ['New Students This Month', stats.newStudentsThisMonth.toString()],
      [''],
      ['STAFF & SUBJECTS', ''],
      ['Total Teachers', stats.totalTeachers.toString()],
      ['Total Active Subjects', stats.totalSubjects.toString()],
      [''],
      ['FINANCIAL SUMMARY', ''],
      ['Total Payments Received', formatCurrency(totalPayments)],
      ['Fees Expected (Invoiced)', formatCurrency(stats.totalFeesExpected)],
      ['Fees Collected (from invoices)', formatCurrency(stats.totalFeesCollected)],
      ['Outstanding Balance', formatCurrency(stats.totalOutstanding)],
      ['Collection Rate', stats.totalFeesExpected > 0 ? `${stats.collectionRate.toFixed(1)}%` : 'N/A'],
      [''],
      ['PAYMENT METHODS', ''],
      ['Cash', formatCurrency(stats.paymentsByMethod.cash)],
      ['Bank Transfer', formatCurrency(stats.paymentsByMethod.bank_transfer)],
      ['Card', formatCurrency(stats.paymentsByMethod.card)],
      ['Mobile Money', formatCurrency(stats.paymentsByMethod.mobile_money)],
    ]
    downloadCSV(data, 'overview_report')
  }

  async function handleGenerateReport(reportType: string) {
    if (!user?.institution_id) return

    const supabase = createClient()

    switch (reportType) {
      case 'fee_collection': {
        interface FeeCollectionPayment {
          amount: number
          payment_method: string | null
          payment_date: string
          reference_number: string | null
          student: { full_name: string; student_number: string | null } | null
        }

        const { data: payments } = await supabase
          .from('payments')
          .select(`
            amount, payment_method, payment_date, reference_number,
            student:students(full_name, student_number)
          `)
          .eq('institution_id', user.institution_id)
          .order('payment_date', { ascending: false })

        const typedPayments = (payments || []) as FeeCollectionPayment[]

        const csvData = [
          ['Fee Collection Report'],
          ['Generated', new Date().toLocaleString()],
          [''],
          ['Date', 'Student Name', 'Student Number', 'Amount', 'Method', 'Reference'],
          ...typedPayments.map(p => [
            new Date(p.payment_date).toLocaleDateString(),
            p.student?.full_name || '',
            p.student?.student_number || '',
            formatCurrency(p.amount),
            p.payment_method || '',
            p.reference_number || '',
          ])
        ]
        downloadCSV(csvData, 'fee_collection_report')
        break
      }

      case 'student_enrollment': {
        interface StudentEnrollment {
          full_name: string
          student_number: string | null
          email: string | null
          phone: string | null
          grade: string | null
          status: string
          registration_date: string
        }

        const { data: students } = await supabase
          .from('students')
          .select('full_name, student_number, email, phone, grade, status, registration_date')
          .eq('institution_id', user.institution_id)
          .order('full_name')

        const typedStudents = (students || []) as StudentEnrollment[]

        const csvData = [
          ['Student Enrollment Report'],
          ['Generated', new Date().toLocaleString()],
          [''],
          ['Name', 'Student Number', 'Email', 'Phone', 'Grade', 'Status', 'Registration Date'],
          ...typedStudents.map(s => [
            s.full_name || '',
            s.student_number || '',
            s.email || '',
            s.phone || '',
            s.grade || '',
            s.status || '',
            s.registration_date ? new Date(s.registration_date).toLocaleDateString() : '',
          ])
        ]
        downloadCSV(csvData, 'student_enrollment_report')
        break
      }

      case 'outstanding_fees': {
        interface OutstandingFee {
          fee_type: string
          fee_month: string | null
          amount_due: number
          amount_paid: number
          balance: number
          status: string
          student: { full_name: string; student_number: string | null; phone: string | null } | null
        }

        const { data: fees } = await supabase
          .from('student_fees')
          .select(`
            fee_type, fee_month, amount_due, amount_paid, balance, status,
            student:students(full_name, student_number, phone)
          `)
          .eq('institution_id', user.institution_id)
          .gt('balance', 0)
          .order('balance', { ascending: false })

        const typedFees = (fees || []) as OutstandingFee[]

        const csvData = [
          ['Outstanding Fees Report'],
          ['Generated', new Date().toLocaleString()],
          [''],
          ['Student Name', 'Student Number', 'Phone', 'Fee Type', 'Month', 'Amount Due', 'Amount Paid', 'Balance'],
          ...typedFees.map(f => [
            f.student?.full_name || '',
            f.student?.student_number || '',
            f.student?.phone || '',
            f.fee_type || '',
            f.fee_month ? new Date(f.fee_month).toLocaleDateString('en-ZA', { year: 'numeric', month: 'long' }) : '',
            formatCurrency(f.amount_due),
            formatCurrency(f.amount_paid),
            formatCurrency(f.balance),
          ])
        ]
        downloadCSV(csvData, 'outstanding_fees_report')
        break
      }

      case 'teacher_summary': {
        interface LecturerSummary {
          full_name: string
          email: string | null
          phone: string | null
          qualification: string | null
          specialization: string | null
          status: string
          lecturer_courses: { course: { name: string } | null }[]
        }

        const { data: lecturers } = await supabase
          .from('lecturers')
          .select(`
            full_name, email, phone, qualification, specialization, status,
            lecturer_courses(course:courses(name))
          `)
          .eq('institution_id', user.institution_id)
          .order('full_name')

        const typedLecturers = (lecturers || []) as LecturerSummary[]

        const csvData = [
          ['Lecturer Summary Report'],
          ['Generated', new Date().toLocaleString()],
          [''],
          ['Name', 'Email', 'Phone', 'Qualification', 'Specialization', 'Status', 'Courses'],
          ...typedLecturers.map(l => [
            l.full_name || '',
            l.email || '',
            l.phone || '',
            l.qualification || '',
            l.specialization || '',
            l.status || '',
            (l.lecturer_courses || []).map(lc => lc.course?.name).join(', '),
          ])
        ]
        downloadCSV(csvData, 'lecturer_summary_report')
        break
      }

      case 'monthly_summary': {
        interface MonthlyPayment {
          amount: number
          payment_method: string | null
        }

        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

        const { data: payments } = await supabase
          .from('payments')
          .select('amount, payment_method')
          .eq('institution_id', user.institution_id)
          .gte('payment_date', startOfMonth.toISOString())

        const { data: newStudents } = await supabase
          .from('students')
          .select('id')
          .eq('institution_id', user.institution_id)
          .gte('created_at', startOfMonth.toISOString())

        const { data: allStudents } = await supabase
          .from('students')
          .select('id')
          .eq('institution_id', user.institution_id)
          .eq('status', 'active')

        const typedPayments = (payments || []) as MonthlyPayment[]
        const totalRevenue = typedPayments.reduce((sum, p) => sum + p.amount, 0)
        const cashPayments = typedPayments.filter(p => p.payment_method === 'cash').reduce((sum, p) => sum + p.amount, 0)
        const bankPayments = typedPayments.filter(p => p.payment_method === 'bank_transfer').reduce((sum, p) => sum + p.amount, 0)
        const otherPayments = totalRevenue - cashPayments - bankPayments

        const csvData = [
          ['Monthly Summary Report'],
          ['Month', now.toLocaleDateString('en-ZA', { year: 'numeric', month: 'long' })],
          ['Generated', new Date().toLocaleString()],
          [''],
          ['Metric', 'Value'],
          ['Active Students', (allStudents || []).length.toString()],
          ['New Students This Month', (newStudents || []).length.toString()],
          ['Total Revenue Collected', formatCurrency(totalRevenue)],
          ['Number of Payments', typedPayments.length.toString()],
          [''],
          ['Revenue by Payment Method', ''],
          ['Cash', formatCurrency(cashPayments)],
          ['Bank Transfer', formatCurrency(bankPayments)],
          ['Other Methods', formatCurrency(otherPayments)],
        ]
        downloadCSV(csvData, 'monthly_summary_report')
        break
      }

      case 'payment_history': {
        interface PaymentHistory {
          amount: number
          payment_method: string | null
          payment_date: string
          reference_number: string | null
          notes: string | null
          student: { full_name: string; student_number: string | null } | null
          recorded_by_user: { full_name: string } | null
        }

        const { data: payments } = await supabase
          .from('payments')
          .select(`
            amount, payment_method, payment_date, reference_number, notes,
            student:students(full_name, student_number),
            recorded_by_user:users(full_name)
          `)
          .eq('institution_id', user.institution_id)
          .order('payment_date', { ascending: false })
          .limit(500)

        const typedPayments = (payments || []) as PaymentHistory[]

        const csvData = [
          ['Payment History Report'],
          ['Generated', new Date().toLocaleString()],
          [''],
          ['Date', 'Student Name', 'Student Number', 'Amount', 'Method', 'Reference', 'Recorded By', 'Notes'],
          ...typedPayments.map(p => [
            new Date(p.payment_date).toLocaleString(),
            p.student?.full_name || '',
            p.student?.student_number || '',
            formatCurrency(p.amount),
            p.payment_method || '',
            p.reference_number || '',
            p.recorded_by_user?.full_name || '',
            p.notes || '',
          ])
        ]
        downloadCSV(csvData, 'payment_history_report')
        break
      }

      case 'attendance_report': {
        interface AttendanceRecord {
          status: string
          student: { full_name: string; student_number: string | null; grade: string | null } | null
          session: { session_date: string; subject: { name: string } | null } | null
        }

        const { data: records } = await supabase
          .from('attendance_records')
          .select(`
            status,
            student:students(full_name, student_number, grade),
            session:attendance_sessions(session_date, subject:subjects(name))
          `)
          .eq('institution_id', user.institution_id)
          .order('created_at', { ascending: false })
          .limit(1000)

        const typedRecords = (records || []) as AttendanceRecord[]

        // Calculate summary
        const total = typedRecords.length
        const present = typedRecords.filter(r => r.status === 'present').length
        const absent = typedRecords.filter(r => r.status === 'absent').length
        const late = typedRecords.filter(r => r.status === 'late').length
        const excused = typedRecords.filter(r => r.status === 'excused').length

        const csvData = [
          ['Attendance Report'],
          ['Generated', new Date().toLocaleString()],
          [''],
          ['SUMMARY', ''],
          ['Total Records', total.toString()],
          ['Present', `${present} (${total > 0 ? ((present/total)*100).toFixed(1) : 0}%)`],
          ['Absent', `${absent} (${total > 0 ? ((absent/total)*100).toFixed(1) : 0}%)`],
          ['Late', `${late} (${total > 0 ? ((late/total)*100).toFixed(1) : 0}%)`],
          ['Excused', `${excused} (${total > 0 ? ((excused/total)*100).toFixed(1) : 0}%)`],
          [''],
          ['DETAILED RECORDS', ''],
          ['Date', 'Student Name', 'Student Number', 'Grade', 'Subject', 'Status'],
          ...typedRecords.map(r => [
            r.session?.session_date ? new Date(r.session.session_date).toLocaleDateString() : '',
            r.student?.full_name || '',
            r.student?.student_number || '',
            r.student?.grade || '',
            r.session?.subject?.name || '',
            r.status || '',
          ])
        ]
        downloadCSV(csvData, 'attendance_report')
        break
      }

      case 'grade_report': {
        interface GradeRecord {
          marks_obtained: number | null
          percentage: number | null
          grade: string | null
          status: string
          student: { full_name: string; student_number: string | null; grade: string | null } | null
          assessment: { name: string; assessment_type: string; max_marks: number; subject: { name: string } | null } | null
        }

        const { data: grades } = await supabase
          .from('student_grades')
          .select(`
            marks_obtained, percentage, grade, status,
            student:students(full_name, student_number, grade),
            assessment:assessments(name, assessment_type, max_marks, subject:subjects(name))
          `)
          .eq('institution_id', user.institution_id)
          .order('created_at', { ascending: false })
          .limit(1000)

        const typedGrades = (grades || []) as GradeRecord[]

        // Calculate summary
        const gradedRecords = typedGrades.filter(g => g.marks_obtained !== null)
        const avgPercentage = gradedRecords.length > 0
          ? gradedRecords.reduce((sum, g) => sum + (g.percentage || 0), 0) / gradedRecords.length
          : 0
        const passedCount = gradedRecords.filter(g => (g.percentage || 0) >= 50).length

        const csvData = [
          ['Grade Report'],
          ['Generated', new Date().toLocaleString()],
          [''],
          ['SUMMARY', ''],
          ['Total Graded', gradedRecords.length.toString()],
          ['Average Percentage', `${avgPercentage.toFixed(1)}%`],
          ['Pass Rate (>=50%)', `${gradedRecords.length > 0 ? ((passedCount/gradedRecords.length)*100).toFixed(1) : 0}%`],
          [''],
          ['DETAILED GRADES', ''],
          ['Student Name', 'Student Number', 'Class', 'Subject', 'Assessment', 'Type', 'Marks', 'Max', 'Percentage', 'Grade'],
          ...typedGrades.map(g => [
            g.student?.full_name || '',
            g.student?.student_number || '',
            g.student?.grade || '',
            g.assessment?.subject?.name || '',
            g.assessment?.name || '',
            g.assessment?.assessment_type || '',
            g.marks_obtained?.toString() || '-',
            g.assessment?.max_marks?.toString() || '',
            g.percentage ? `${g.percentage.toFixed(1)}%` : '-',
            g.grade || '-',
          ])
        ]
        downloadCSV(csvData, 'grade_report')
        break
      }

      default:
        console.error('Unknown report type:', reportType)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50/50">
        <div className="bg-white border-b border-gray-200">
          <div className="px-4 md:px-8 py-6">
            <div className="animate-pulse h-8 bg-gray-200 rounded w-48"></div>
          </div>
        </div>
        <div className="px-4 md:px-8 py-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl animate-pulse"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded-xl animate-pulse"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 md:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Reports & Analytics</h1>
              <p className="mt-1 text-sm text-gray-500">View performance metrics and generate reports</p>
            </div>
            <div className="flex items-center gap-3">
              <Select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                options={[
                  { value: 'this_month', label: 'This Month' },
                  { value: 'last_month', label: 'Last Month' },
                  { value: 'this_year', label: 'This Year' },
                  { value: 'all_time', label: 'All Time' },
                ]}
                className="w-40"
              />
              <Button size="lg" leftIcon={<Download className="w-4 h-4" />} variant="outline" onClick={handleExportOverview}>
                Export Overview
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-6 space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Active Students</p>
                <p className="mt-2 text-2xl font-semibold text-gray-900">{stats?.activeStudents || 0}</p>
                <p className="mt-1 text-xs text-green-600 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  +{stats?.newStudentsThisMonth || 0} this month
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <GraduationCap className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Fees Collected</p>
                <p className="mt-2 text-2xl font-semibold text-green-600">{formatCurrency(stats?.totalFeesCollected || 0)}</p>
                <p className="mt-1 text-xs text-gray-500">
                  {stats?.collectionRate.toFixed(0)}% collection rate
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-xl">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Outstanding</p>
                <p className="mt-2 text-2xl font-semibold text-red-600">{formatCurrency(stats?.totalOutstanding || 0)}</p>
                <p className="mt-1 text-xs text-gray-500">
                  Pending payments
                </p>
              </div>
              <div className="p-3 bg-red-100 rounded-xl">
                <TrendingDown className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Teachers</p>
                <p className="mt-2 text-2xl font-semibold text-purple-600">{stats?.totalTeachers || 0}</p>
                <p className="mt-1 text-xs text-gray-500">
                  Active staff
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-xl">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Fee Status Breakdown */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <PieChart className="w-5 h-5 text-gray-500" />
              <h2 className="text-lg font-semibold text-gray-900">Fee Status Breakdown</h2>
            </div>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">Paid</span>
                <span className="text-sm font-medium text-green-600">{stats?.feeStatusBreakdown.paid || 0}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full"
                  style={{
                    width: `${((stats?.feeStatusBreakdown.paid || 0) / ((stats?.feeStatusBreakdown.paid || 0) + (stats?.feeStatusBreakdown.partial || 0) + (stats?.feeStatusBreakdown.unpaid || 0) || 1)) * 100}%`,
                  }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">Partial</span>
                <span className="text-sm font-medium text-amber-600">{stats?.feeStatusBreakdown.partial || 0}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full"
                  style={{
                    width: `${((stats?.feeStatusBreakdown.partial || 0) / ((stats?.feeStatusBreakdown.paid || 0) + (stats?.feeStatusBreakdown.partial || 0) + (stats?.feeStatusBreakdown.unpaid || 0) || 1)) * 100}%`,
                  }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">Unpaid</span>
                <span className="text-sm font-medium text-red-600">{stats?.feeStatusBreakdown.unpaid || 0}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-500 rounded-full"
                  style={{
                    width: `${((stats?.feeStatusBreakdown.unpaid || 0) / ((stats?.feeStatusBreakdown.paid || 0) + (stats?.feeStatusBreakdown.partial || 0) + (stats?.feeStatusBreakdown.unpaid || 0) || 1)) * 100}%`,
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>

          {/* Payments by Method */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <CreditCard className="w-5 h-5 text-gray-500" />
              <h2 className="text-lg font-semibold text-gray-900">Payments by Method</h2>
            </div>
          <div className="space-y-4">
            {[
              { label: 'Cash', value: stats?.paymentsByMethod.cash || 0, color: 'bg-green-500' },
              { label: 'Bank Transfer', value: stats?.paymentsByMethod.bank_transfer || 0, color: 'bg-blue-500' },
              { label: 'Card', value: stats?.paymentsByMethod.card || 0, color: 'bg-purple-500' },
              { label: 'Mobile Money', value: stats?.paymentsByMethod.mobile_money || 0, color: 'bg-amber-500' },
            ].map((method) => (
              <div key={method.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600">{method.label}</span>
                  <span className="text-sm font-medium">{formatCurrency(method.value)}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${method.color} rounded-full`}
                    style={{
                      width: `${(method.value / (stats?.totalFeesCollected || 1)) * 100}%`,
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

        {/* Students by Grade */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <BarChart3 className="w-5 h-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900">Students by Grade</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {stats?.studentsByGrade.map((item) => (
              <div key={item.grade} className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-semibold text-gray-900">{item.count}</p>
                <p className="text-sm text-gray-500">{item.grade}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Available Reports */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <FileText className="w-5 h-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900">Available Reports</h2>
          </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { title: 'Fee Collection Report', description: 'Detailed breakdown of all fees collected', icon: <DollarSign className="w-5 h-5" />, type: 'fee_collection' },
            { title: 'Student Enrollment', description: 'List of all enrolled students', icon: <GraduationCap className="w-5 h-5" />, type: 'student_enrollment' },
            { title: 'Outstanding Fees', description: 'Students with pending payments', icon: <CreditCard className="w-5 h-5" />, type: 'outstanding_fees' },
            { title: 'Teacher Summary', description: 'Teacher assignments and subjects', icon: <Users className="w-5 h-5" />, type: 'teacher_summary' },
            { title: 'Monthly Summary', description: 'Monthly performance overview', icon: <Calendar className="w-5 h-5" />, type: 'monthly_summary' },
            { title: 'Payment History', description: 'All payment transactions', icon: <FileText className="w-5 h-5" />, type: 'payment_history' },
            { title: 'Attendance Report', description: 'Student attendance summary and details', icon: <ClipboardCheck className="w-5 h-5" />, type: 'attendance_report' },
            { title: 'Grade Report', description: 'Student grades and assessment results', icon: <Award className="w-5 h-5" />, type: 'grade_report' },
          ].map((report) => (
            <button
              key={report.title}
              onClick={() => handleGenerateReport(report.type)}
              className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer group text-left w-full"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-blue-100 transition-colors">
                  {report.icon}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{report.title}</p>
                  <p className="text-sm text-gray-500">{report.description}</p>
                </div>
                <Download className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
              </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
