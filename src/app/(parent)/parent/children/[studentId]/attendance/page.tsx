'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import {
  ArrowLeft,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
} from 'lucide-react'

interface AttendanceRecord {
  id: string
  date: string
  status: string
  notes: string | null
  class_session?: {
    subject?: {
      name: string
    }
    teacher?: {
      full_name: string
    }
  }
}

interface StudentInfo {
  full_name: string
  student_number: string | null
}

export default function ChildAttendancePage() {
  const params = useParams()
  const studentId = params.studentId as string

  const [student, setStudent] = useState<StudentInfo | null>(null)
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))
  const [stats, setStats] = useState({ present: 0, absent: 0, late: 0, total: 0 })

  useEffect(() => {
    loadAttendance()
  }, [studentId, selectedMonth])

  async function loadAttendance() {
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

    // Get attendance for selected month
    const startDate = `${selectedMonth}-01`
    const endDate = new Date(selectedMonth + '-01')
    endDate.setMonth(endDate.getMonth() + 1)
    endDate.setDate(0)
    const endDateStr = endDate.toISOString().split('T')[0]

    const { data: attendanceData } = await supabase
      .from('attendance')
      .select(`
        id, date, status, notes,
        class_session:class_sessions(
          subject:subjects(name),
          teacher:teachers(full_name)
        )
      `)
      .eq('student_id', studentId)
      .gte('date', startDate)
      .lte('date', endDateStr)
      .order('date', { ascending: false })

    if (attendanceData) {
      const records = attendanceData as unknown as AttendanceRecord[]
      setAttendance(records)

      // Calculate stats
      const present = records.filter(a => a.status === 'present').length
      const absent = records.filter(a => a.status === 'absent').length
      const late = records.filter(a => a.status === 'late').length
      setStats({ present, absent, late, total: records.length })
    }

    setIsLoading(false)
  }

  // Generate month options (last 12 months)
  const monthOptions = []
  for (let i = 0; i < 12; i++) {
    const date = new Date()
    date.setMonth(date.getMonth() - i)
    const value = date.toISOString().slice(0, 7)
    const label = date.toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })
    monthOptions.push({ value, label })
  }

  const attendanceRate = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 100

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
          <h1 className="text-2xl font-bold text-gray-900">Attendance Record</h1>
          <p className="text-gray-500">{student?.full_name}</p>
        </div>

        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
        >
          {monthOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <Calendar className="w-4 h-4" />
            <span className="text-sm">Attendance Rate</span>
          </div>
          <p className={`text-2xl font-bold ${
            attendanceRate >= 80 ? 'text-green-600' :
            attendanceRate >= 60 ? 'text-yellow-600' : 'text-red-600'
          }`}>
            {attendanceRate}%
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-green-600 mb-2">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm">Present</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{stats.present}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-red-600 mb-2">
            <XCircle className="w-4 h-4" />
            <span className="text-sm">Absent</span>
          </div>
          <p className="text-2xl font-bold text-red-600">{stats.absent}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-yellow-600 mb-2">
            <Clock className="w-4 h-4" />
            <span className="text-sm">Late</span>
          </div>
          <p className="text-2xl font-bold text-yellow-600">{stats.late}</p>
        </div>
      </div>

      {/* Attendance List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          </div>
        ) : attendance.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No attendance records for this month
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {attendance.map((record) => (
              <div key={record.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    record.status === 'present' ? 'bg-green-100' :
                    record.status === 'absent' ? 'bg-red-100' : 'bg-yellow-100'
                  }`}>
                    {record.status === 'present' ? <CheckCircle className="w-5 h-5 text-green-600" /> :
                     record.status === 'absent' ? <XCircle className="w-5 h-5 text-red-600" /> :
                     <Clock className="w-5 h-5 text-yellow-600" />}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {new Date(record.date).toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                    {record.class_session?.subject && (
                      <p className="text-sm text-gray-500">
                        {record.class_session.subject.name}
                        {record.class_session.teacher && ` - ${record.class_session.teacher.full_name}`}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                    record.status === 'present' ? 'bg-green-100 text-green-700' :
                    record.status === 'absent' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                  </span>
                  {record.notes && (
                    <p className="text-xs text-gray-400 mt-1">{record.notes}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
