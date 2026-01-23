'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import {
  ArrowLeft,
  ClipboardCheck,
  Award,
  CreditCard,
  BookOpen,
  CalendarDays,
  FileText,
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react'

interface StudentData {
  id: string
  full_name: string
  student_number: string | null
  grade: string | null
  email: string | null
  phone: string | null
  class_id: string | null
  class?: {
    name: string
  }
  center?: {
    name: string
    primary_color: string | null
  }
}

interface AttendanceRecord {
  date: string
  status: string
}

interface FeeRecord {
  amount: number
  status: string
  due_date: string
  description: string
}

export default function ChildDashboardPage() {
  const params = useParams()
  const router = useRouter()
  const studentId = params.studentId as string

  const [student, setStudent] = useState<StudentData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isVerified, setIsVerified] = useState(false)
  const [recentAttendance, setRecentAttendance] = useState<AttendanceRecord[]>([])
  const [pendingFees, setPendingFees] = useState<FeeRecord[]>([])
  const [attendanceRate, setAttendanceRate] = useState(0)
  const [totalPendingFees, setTotalPendingFees] = useState(0)

  useEffect(() => {
    loadStudentData()
  }, [studentId])

  async function loadStudentData() {
    const supabase = createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/portal/login?type=parent')
      return
    }

    // Get parent
    const { data: parentData } = await supabase
      .from('parents')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    const parent = parentData as { id: string } | null
    if (!parent) {
      router.push('/parent')
      return
    }

    // Check if this student is linked to parent
    const { data: linkData } = await supabase
      .from('parent_students')
      .select('verified_at')
      .eq('parent_id', parent.id)
      .eq('student_id', studentId)
      .single()

    const link = linkData as { verified_at: string | null } | null
    if (!link) {
      router.push('/parent')
      return
    }

    setIsVerified(link.verified_at !== null)

    // Get student data
    const { data: studentData, error } = await supabase
      .from('students')
      .select(`
        id, full_name, student_number, grade, email, phone, class_id,
        class:classes(name),
        institution:institutions(name, primary_color)
      `)
      .eq('id', studentId)
      .single()

    if (error || !studentData) {
      router.push('/parent')
      return
    }

    setStudent(studentData as unknown as StudentData)

    // Get recent attendance (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: attendance } = await supabase
      .from('attendance')
      .select('date, status')
      .eq('student_id', studentId)
      .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('date', { ascending: false })
      .limit(10)

    if (attendance) {
      const attendanceRecords = attendance as { date: string; status: string }[]
      setRecentAttendance(attendanceRecords)
      const present = attendanceRecords.filter(a => a.status === 'present').length
      setAttendanceRate(attendanceRecords.length > 0 ? Math.round((present / attendanceRecords.length) * 100) : 100)
    }

    // Get pending fees
    const { data: fees } = await supabase
      .from('fee_transactions')
      .select('amount, status, due_date, description')
      .eq('student_id', studentId)
      .in('status', ['pending', 'partial'])
      .order('due_date', { ascending: true })
      .limit(5)

    if (fees) {
      const feeRecords = fees as { amount: number; status: string; due_date: string; description: string }[]
      setPendingFees(feeRecords)
      setTotalPendingFees(feeRecords.reduce((sum, f) => sum + Number(f.amount), 0))
    }

    setIsLoading(false)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    )
  }

  if (!student) {
    return null
  }

  const quickLinks = [
    { label: 'Attendance', href: `/parent/children/${studentId}/attendance`, icon: <ClipboardCheck className="w-5 h-5" />, color: 'bg-blue-100 text-blue-600' },
    { label: 'Grades', href: `/parent/children/${studentId}/grades`, icon: <Award className="w-5 h-5" />, color: 'bg-green-100 text-green-600' },
    { label: 'Report Cards', href: `/parent/children/${studentId}/report-cards`, icon: <FileText className="w-5 h-5" />, color: 'bg-purple-100 text-purple-600' },
    { label: 'Fees', href: `/parent/children/${studentId}/fees`, icon: <CreditCard className="w-5 h-5" />, color: 'bg-orange-100 text-orange-600' },
    { label: 'Homework', href: `/parent/children/${studentId}/homework`, icon: <BookOpen className="w-5 h-5" />, color: 'bg-pink-100 text-pink-600' },
    { label: 'Exams', href: `/parent/children/${studentId}/exams`, icon: <CalendarDays className="w-5 h-5" />, color: 'bg-indigo-100 text-indigo-600' },
  ]

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link
        href="/parent/children"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Children
      </Link>

      {/* Student Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-2xl"
              style={{ backgroundColor: student.center?.primary_color || '#7C3AED' }}
            >
              {student.full_name.charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{student.full_name}</h1>
              <p className="text-gray-500">
                {student.student_number && `#${student.student_number} • `}
                {student.grade || 'Grade N/A'}
                {student.class?.name && ` - ${student.class.name}`}
              </p>
              <p className="text-sm text-gray-400 mt-1">{student.center?.name}</p>
            </div>
          </div>

          {!isVerified && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-yellow-700">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">Pending Verification</span>
              </div>
              <p className="text-xs text-yellow-600 mt-1">
                Some features may be limited until verified.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <ClipboardCheck className="w-4 h-4" />
            <span className="text-sm">Attendance Rate</span>
          </div>
          <p className={`text-2xl font-bold ${
            attendanceRate >= 80 ? 'text-green-600' :
            attendanceRate >= 60 ? 'text-yellow-600' : 'text-red-600'
          }`}>
            {attendanceRate}%
          </p>
          <p className="text-xs text-gray-400 mt-1">Last 30 days</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <CreditCard className="w-4 h-4" />
            <span className="text-sm">Pending Fees</span>
          </div>
          <p className={`text-2xl font-bold ${totalPendingFees > 0 ? 'text-red-600' : 'text-green-600'}`}>
            N${totalPendingFees.toLocaleString()}
          </p>
          <p className="text-xs text-gray-400 mt-1">{pendingFees.length} pending</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <BookOpen className="w-4 h-4" />
            <span className="text-sm">Homework</span>
          </div>
          <p className="text-2xl font-bold text-orange-600">-</p>
          <p className="text-xs text-gray-400 mt-1">Pending tasks</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <CalendarDays className="w-4 h-4" />
            <span className="text-sm">Upcoming Exams</span>
          </div>
          <p className="text-2xl font-bold text-blue-600">-</p>
          <p className="text-xs text-gray-400 mt-1">This month</p>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {quickLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="bg-white rounded-xl border border-gray-200 p-4 hover:border-purple-300 transition-colors text-center"
          >
            <div className={`w-12 h-12 rounded-xl ${link.color} flex items-center justify-center mx-auto mb-3`}>
              {link.icon}
            </div>
            <p className="font-medium text-gray-900 text-sm">{link.label}</p>
          </Link>
        ))}
      </div>

      {/* Recent Activity Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent Attendance */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Recent Attendance</h3>
            <Link
              href={`/parent/children/${studentId}/attendance`}
              className="text-sm text-purple-600 hover:text-purple-700"
            >
              View All
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {recentAttendance.length === 0 ? (
              <p className="p-4 text-sm text-gray-500 text-center">No recent attendance records</p>
            ) : (
              recentAttendance.slice(0, 5).map((record, idx) => (
                <div key={idx} className="p-3 flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {new Date(record.date).toLocaleDateString('en-ZA', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                    record.status === 'present' ? 'bg-green-100 text-green-700' :
                    record.status === 'absent' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {record.status === 'present' ? <CheckCircle className="w-3 h-3" /> :
                     record.status === 'absent' ? <XCircle className="w-3 h-3" /> :
                     <Clock className="w-3 h-3" />}
                    {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pending Fees */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Pending Fees</h3>
            <Link
              href={`/parent/children/${studentId}/fees`}
              className="text-sm text-purple-600 hover:text-purple-700"
            >
              View All
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {pendingFees.length === 0 ? (
              <p className="p-4 text-sm text-gray-500 text-center">No pending fees</p>
            ) : (
              pendingFees.map((fee, idx) => (
                <div key={idx} className="p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{fee.description || 'Fee'}</p>
                    <p className="text-xs text-gray-500">Due: {new Date(fee.due_date).toLocaleDateString('en-ZA')}</p>
                  </div>
                  <span className="font-semibold text-red-600">
                    N${Number(fee.amount).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
