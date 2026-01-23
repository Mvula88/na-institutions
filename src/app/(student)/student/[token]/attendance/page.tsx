'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ClipboardCheck, CheckCircle, XCircle, Clock, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react'

interface AttendanceRecord {
  id: string
  date: string
  status: string
  check_in_time: string | null
  notes: string | null
}

interface MonthSummary {
  present: number
  absent: number
  late: number
  excused: number
  total: number
}

export default function StudentAttendancePage() {
  const params = useParams()
  const token = params.token as string
  const [isLoading, setIsLoading] = useState(true)
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [summary, setSummary] = useState<MonthSummary>({ present: 0, absent: 0, late: 0, excused: 0, total: 0 })

  useEffect(() => {
    if (token) {
      fetchAttendance()
    }
  }, [token, currentMonth])

  async function fetchAttendance() {
    setIsLoading(true)
    const supabase = createClient()

    const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
    const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)

    const { data } = await supabase
      .from('attendance')
      .select('id, date, status, check_in_time, notes')
      .eq('student_id', token)
      .gte('date', startOfMonth.toISOString().split('T')[0])
      .lte('date', endOfMonth.toISOString().split('T')[0])
      .order('date', { ascending: false })

    const attendanceData = (data || []) as AttendanceRecord[]
    setRecords(attendanceData)

    // Calculate summary
    const summary: MonthSummary = { present: 0, absent: 0, late: 0, excused: 0, total: attendanceData.length }
    for (const record of attendanceData) {
      if (record.status === 'present') summary.present++
      else if (record.status === 'absent') summary.absent++
      else if (record.status === 'late') summary.late++
      else if (record.status === 'excused') summary.excused++
    }
    setSummary(summary)

    setIsLoading(false)
  }

  function previousMonth() {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  }

  function nextMonth() {
    const next = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1)
    if (next <= new Date()) {
      setCurrentMonth(next)
    }
  }

  const monthName = currentMonth.toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })
  const attendanceRate = summary.total > 0 ? Math.round(((summary.present + summary.late) / summary.total) * 100) : 0

  const statusConfig: Record<string, { bg: string; text: string; icon: React.ReactNode; label: string }> = {
    present: { bg: 'bg-green-100', text: 'text-green-700', icon: <CheckCircle className="w-4 h-4" />, label: 'Present' },
    absent: { bg: 'bg-red-100', text: 'text-red-700', icon: <XCircle className="w-4 h-4" />, label: 'Absent' },
    late: { bg: 'bg-amber-100', text: 'text-amber-700', icon: <Clock className="w-4 h-4" />, label: 'Late' },
    excused: { bg: 'bg-blue-100', text: 'text-blue-700', icon: <AlertTriangle className="w-4 h-4" />, label: 'Excused' },
  }

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-32 bg-gray-200 rounded-xl"></div>
        <div className="h-64 bg-gray-200 rounded-xl"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Attendance Record</h2>
        <p className="text-gray-500 text-sm mt-1">Track your attendance history</p>
      </div>

      {/* Month Selector */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 p-4">
        <button
          onClick={previousMonth}
          className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h3 className="font-medium text-gray-900">{monthName}</h3>
        <button
          onClick={nextMonth}
          disabled={new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1) > new Date()}
          className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-3xl font-bold text-blue-600">{attendanceRate}%</p>
          <p className="text-sm text-gray-500">Attendance Rate</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-green-700">{summary.present}</p>
          <p className="text-sm text-green-600">Present</p>
        </div>
        <div className="bg-red-50 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-red-700">{summary.absent}</p>
          <p className="text-sm text-red-600">Absent</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-amber-700">{summary.late}</p>
          <p className="text-sm text-amber-600">Late</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-blue-700">{summary.excused}</p>
          <p className="text-sm text-blue-600">Excused</p>
        </div>
      </div>

      {/* Records List */}
      <div className="bg-white rounded-xl border border-gray-200">
        {records.length === 0 ? (
          <div className="p-12 text-center">
            <ClipboardCheck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Attendance Records</h3>
            <p className="text-gray-500">No attendance records for {monthName}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {records.map((record) => {
              const config = statusConfig[record.status] || statusConfig.present
              const date = new Date(record.date)

              return (
                <div key={record.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-center w-12">
                      <p className="text-2xl font-bold text-gray-900">{date.getDate()}</p>
                      <p className="text-xs text-gray-500">
                        {date.toLocaleDateString('en-ZA', { weekday: 'short' })}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {date.toLocaleDateString('en-ZA', { weekday: 'long', month: 'long', day: 'numeric' })}
                      </p>
                      {record.check_in_time && (
                        <p className="text-sm text-gray-500">
                          Check-in: {record.check_in_time.slice(0, 5)}
                        </p>
                      )}
                      {record.notes && (
                        <p className="text-sm text-gray-500">{record.notes}</p>
                      )}
                    </div>
                  </div>
                  <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${config.bg} ${config.text}`}>
                    {config.icon}
                    {config.label}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
