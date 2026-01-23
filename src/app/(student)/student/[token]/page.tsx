'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import {
  Calendar,
  FileText,
  CreditCard,
  ClipboardCheck,
  Award,
  TrendingUp,
  Clock,
  AlertCircle,
} from 'lucide-react'

interface StudentData {
  id: string
  full_name: string
  student_number: string | null
  grade: string | null
  date_of_birth: string | null
  gender: string | null
  email: string | null
  phone: string | null
  parent_name: string | null
  parent_phone: string | null
  address: string | null
  enrollment_date: string | null
  class_id: string | null
  center_id: string
  class?: { name: string }
  center?: { name: string }
}

interface QuickStat {
  label: string
  value: string | number
  icon: React.ReactNode
  color: string
  href: string
}

export default function StudentPortalOverview() {
  const params = useParams()
  const token = params.token as string
  const [student, setStudent] = useState<StudentData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState({
    attendanceRate: 0,
    latestGrade: '-',
    outstandingFees: 0,
    reportCards: 0,
  })

  useEffect(() => {
    if (token) {
      fetchStudentData()
    }
  }, [token])

  async function fetchStudentData() {
    setIsLoading(true)
    const supabase = createClient()

    // Fetch student data
    const { data: studentData } = await supabase
      .from('students')
      .select(`
        id, full_name, student_number, grade, date_of_birth, gender,
        email, phone, parent_name, parent_phone, address, enrollment_date,
        class_id, center_id,
        class:classes(name),
        institution:institutions(name)
      `)
      .eq('id', token)
      .single()

    if (studentData) {
      setStudent(studentData as unknown as StudentData)

      // Fetch stats
      const today = new Date()
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]

      // Attendance this month
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('status')
        .eq('student_id', token)
        .gte('date', monthStart)

      const attendance = (attendanceData || []) as { status: string }[]
      if (attendance.length > 0) {
        const present = attendance.filter(a => a.status === 'present' || a.status === 'late').length
        const rate = Math.round((present / attendance.length) * 100)
        setStats(s => ({ ...s, attendanceRate: rate }))
      }

      // Latest grade
      const { data: gradesData } = await supabase
        .from('student_grades')
        .select('marks_obtained, assessment:assessments(max_marks)')
        .eq('student_id', token)
        .order('created_at', { ascending: false })
        .limit(1)

      const grades = (gradesData || []) as { marks_obtained: number | null; assessment?: { max_marks: number } }[]
      if (grades.length > 0 && grades[0].marks_obtained !== null) {
        const grade = grades[0]
        const percentage = grade.assessment?.max_marks
          ? Math.round((grade.marks_obtained! / grade.assessment.max_marks) * 100)
          : grade.marks_obtained
        setStats(s => ({ ...s, latestGrade: `${percentage}%` }))
      }

      // Outstanding fees
      const { data: feesData } = await supabase
        .from('student_fees')
        .select('total_amount, amount_paid')
        .eq('student_id', token)
        .eq('status', 'pending')

      const fees = (feesData || []) as { total_amount: number; amount_paid: number }[]
      if (fees.length > 0) {
        const outstanding = fees.reduce((sum, f) => sum + (f.total_amount - f.amount_paid), 0)
        setStats(s => ({ ...s, outstandingFees: outstanding }))
      }

      // Report cards count
      const { count } = await supabase
        .from('student_report_cards')
        .select('id', { count: 'exact', head: true })
        .eq('student_id', token)
        .eq('status', 'published')

      setStats(s => ({ ...s, reportCards: count || 0 }))
    }

    setIsLoading(false)
  }

  if (isLoading || !student) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-32 bg-gray-200 rounded-xl"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
          ))}
        </div>
      </div>
    )
  }

  const quickStats: QuickStat[] = [
    {
      label: 'Attendance Rate',
      value: `${stats.attendanceRate}%`,
      icon: <ClipboardCheck className="w-6 h-6" />,
      color: stats.attendanceRate >= 80 ? 'green' : stats.attendanceRate >= 60 ? 'amber' : 'red',
      href: `/student/${token}/attendance`,
    },
    {
      label: 'Latest Grade',
      value: stats.latestGrade,
      icon: <Award className="w-6 h-6" />,
      color: 'blue',
      href: `/student/${token}/report-cards`,
    },
    {
      label: 'Outstanding Fees',
      value: stats.outstandingFees > 0 ? `N$${stats.outstandingFees.toLocaleString()}` : 'N$0',
      icon: <CreditCard className="w-6 h-6" />,
      color: stats.outstandingFees > 0 ? 'red' : 'green',
      href: `/student/${token}/fees`,
    },
    {
      label: 'Report Cards',
      value: stats.reportCards,
      icon: <FileText className="w-6 h-6" />,
      color: 'purple',
      href: `/student/${token}/report-cards`,
    },
  ]

  const colorClasses: Record<string, { bg: string; text: string; iconBg: string }> = {
    green: { bg: 'bg-green-50', text: 'text-green-700', iconBg: 'bg-green-100' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-700', iconBg: 'bg-blue-100' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-700', iconBg: 'bg-amber-100' },
    red: { bg: 'bg-red-50', text: 'text-red-700', iconBg: 'bg-red-100' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-700', iconBg: 'bg-purple-100' },
  }

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">
              Welcome, {student.full_name.split(' ')[0]}!
            </h2>
            <p className="text-gray-500 mt-1">
              {student.class?.name || student.grade || 'Student'} at {student.center?.name}
            </p>
          </div>
          {student.student_number && (
            <div className="text-right">
              <p className="text-sm text-gray-500">Student Number</p>
              <p className="font-mono font-semibold text-gray-900">{student.student_number}</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {quickStats.map((stat) => {
          const colors = colorClasses[stat.color]
          return (
            <Link
              key={stat.label}
              href={stat.href}
              className={`${colors.bg} rounded-xl p-4 hover:shadow-md transition-shadow`}
            >
              <div className="flex items-center gap-3">
                <div className={`${colors.iconBg} ${colors.text} p-2 rounded-lg`}>
                  {stat.icon}
                </div>
                <div>
                  <p className={`text-2xl font-bold ${colors.text}`}>{stat.value}</p>
                  <p className="text-sm text-gray-600">{stat.label}</p>
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Quick Links */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Today's Schedule */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Quick Links</h3>
          </div>
          <div className="space-y-3">
            <Link
              href={`/student/${token}/timetable`}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-gray-600" />
                <span className="text-gray-900">View Timetable</span>
              </div>
              <span className="text-gray-400">→</span>
            </Link>
            <Link
              href={`/student/${token}/report-cards`}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-gray-600" />
                <span className="text-gray-900">View Report Cards</span>
              </div>
              <span className="text-gray-400">→</span>
            </Link>
            <Link
              href={`/student/${token}/attendance`}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <ClipboardCheck className="w-5 h-5 text-gray-600" />
                <span className="text-gray-900">View Attendance</span>
              </div>
              <span className="text-gray-400">→</span>
            </Link>
          </div>
        </div>

        {/* Student Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Student Information</h3>
          <div className="space-y-3 text-sm">
            {student.date_of_birth && (
              <div className="flex justify-between">
                <span className="text-gray-500">Date of Birth</span>
                <span className="text-gray-900">
                  {new Date(student.date_of_birth).toLocaleDateString('en-NA')}
                </span>
              </div>
            )}
            {student.gender && (
              <div className="flex justify-between">
                <span className="text-gray-500">Gender</span>
                <span className="text-gray-900 capitalize">{student.gender}</span>
              </div>
            )}
            {student.enrollment_date && (
              <div className="flex justify-between">
                <span className="text-gray-500">Enrolled</span>
                <span className="text-gray-900">
                  {new Date(student.enrollment_date).toLocaleDateString('en-NA')}
                </span>
              </div>
            )}
            {student.parent_name && (
              <div className="flex justify-between">
                <span className="text-gray-500">Parent/Guardian</span>
                <span className="text-gray-900">{student.parent_name}</span>
              </div>
            )}
            {student.parent_phone && (
              <div className="flex justify-between">
                <span className="text-gray-500">Parent Phone</span>
                <span className="text-gray-900">{student.parent_phone}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Alerts */}
      {stats.outstandingFees > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <p className="font-medium text-red-900">Outstanding Fees</p>
              <p className="text-sm text-red-700 mt-1">
                You have outstanding fees of N${stats.outstandingFees.toLocaleString()}.
                Please contact the administration to arrange payment.
              </p>
              <Link
                href={`/student/${token}/fees`}
                className="inline-block mt-2 text-sm font-medium text-red-700 hover:text-red-800"
              >
                View Fee Details →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
