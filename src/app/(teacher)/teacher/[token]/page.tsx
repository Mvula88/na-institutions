'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import {
  Calendar,
  ClipboardCheck,
  Award,
  Users,
  BookOpen,
  Clock,
} from 'lucide-react'

interface TeacherData {
  id: string
  full_name: string
  email: string | null
  subject_specialty: string | null
  center_id: string
  center?: { name: string }
}

interface TodayClass {
  period_name: string
  start_time: string
  end_time: string
  subject_name: string
  class_name: string
  room: string | null
}

export default function TeacherDashboard() {
  const params = useParams()
  const token = params.token as string
  const [isLoading, setIsLoading] = useState(true)
  const [teacher, setTeacher] = useState<TeacherData | null>(null)
  const [stats, setStats] = useState({
    totalClasses: 0,
    totalStudents: 0,
    pendingGrades: 0,
    todayAttendance: 0,
  })
  const [todayClasses, setTodayClasses] = useState<TodayClass[]>([])

  useEffect(() => {
    if (token) {
      fetchDashboardData()
    }
  }, [token])

  async function fetchDashboardData() {
    setIsLoading(true)
    const supabase = createClient()

    // Get teacher data
    const { data: teacherDataRaw } = await supabase
      .from('lecturers')
      .select('id, full_name, email, subject_specialty, center_id, institution:institutions(name)')
      .eq('id', token)
      .single()

    const teacherData = teacherDataRaw as { id: string; full_name: string; email: string | null; subject_specialty: string | null; center_id: string; center?: { name: string } } | null

    if (teacherData) {
      setTeacher(teacherData as unknown as TeacherData)

      // Get classes where teacher is assigned
      const { data: timetableEntries } = await supabase
        .from('timetable_entries')
        .select(`
          id,
          class:classes(id, name),
          subject:subjects(name),
          period:timetable_periods(name, start_time, end_time),
          day_of_week,
          room
        `)
        .eq('teacher_id', token)
        .eq('is_active', true)

      const entries = timetableEntries || []

      // Get unique classes
      const uniqueClassIds = new Set(entries.map((e: { class?: { id: string } }) => e.class?.id).filter(Boolean))
      setStats(s => ({ ...s, totalClasses: uniqueClassIds.size }))

      // Get today's classes
      const today = new Date()
      const dayOfWeek = today.getDay() === 0 ? 7 : today.getDay() // Convert to 1-7 format
      const todaysEntries = entries
        .filter((e: { day_of_week: number }) => e.day_of_week === dayOfWeek)
        .map((e: { period?: { name: string; start_time: string; end_time: string }; subject?: { name: string }; class?: { name: string }; room: string | null }) => ({
          period_name: e.period?.name || '',
          start_time: e.period?.start_time || '',
          end_time: e.period?.end_time || '',
          subject_name: e.subject?.name || '',
          class_name: e.class?.name || '',
          room: e.room,
        }))
        .sort((a: TodayClass, b: TodayClass) => a.start_time.localeCompare(b.start_time))

      setTodayClasses(todaysEntries)

      // Get total students in teacher's classes
      const classIds = Array.from(uniqueClassIds)
      if (classIds.length > 0) {
        const { count } = await supabase
          .from('students')
          .select('id', { count: 'exact', head: true })
          .in('class_id', classIds)
          .eq('status', 'active')

        setStats(s => ({ ...s, totalStudents: count || 0 }))
      }

      // Get pending assessments to grade
      const { count: pendingCount } = await supabase
        .from('assessments')
        .select('id', { count: 'exact', head: true })
        .eq('institution_id', teacherData.center_id)
        .eq('is_published', false)

      setStats(s => ({ ...s, pendingGrades: pendingCount || 0 }))
    }

    setIsLoading(false)
  }

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-24 bg-gray-200 rounded-xl"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-2xl font-semibold text-gray-900">
          Welcome, {teacher?.full_name.split(' ')[0]}!
        </h2>
        <p className="text-gray-500 mt-1">
          {teacher?.subject_specialty ? `${teacher.subject_specialty} Teacher` : 'Teacher'} at {teacher?.center?.name}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link
          href={`/teacher/${token}/timetable`}
          className="bg-blue-50 rounded-xl p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-700">{stats.totalClasses}</p>
              <p className="text-sm text-gray-600">Classes</p>
            </div>
          </div>
        </Link>
        <Link
          href={`/teacher/${token}/students`}
          className="bg-green-50 rounded-xl p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Users className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-700">{stats.totalStudents}</p>
              <p className="text-sm text-gray-600">Students</p>
            </div>
          </div>
        </Link>
        <Link
          href={`/teacher/${token}/attendance`}
          className="bg-amber-50 rounded-xl p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <ClipboardCheck className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-700">{todayClasses.length}</p>
              <p className="text-sm text-gray-600">Today's Classes</p>
            </div>
          </div>
        </Link>
        <Link
          href={`/teacher/${token}/grades`}
          className="bg-purple-50 rounded-xl p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Award className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-700">{stats.pendingGrades}</p>
              <p className="text-sm text-gray-600">Pending Grades</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Today's Schedule */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-100 flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">Today's Schedule</h3>
        </div>
        {todayClasses.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p>No classes scheduled for today</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {todayClasses.map((cls, idx) => (
              <div key={idx} className="p-4 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center gap-4">
                  <div className="text-center w-16">
                    <p className="text-sm font-medium text-gray-900">{cls.start_time.slice(0, 5)}</p>
                    <p className="text-xs text-gray-500">{cls.end_time.slice(0, 5)}</p>
                  </div>
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <BookOpen className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{cls.subject_name}</p>
                    <p className="text-sm text-gray-500">
                      {cls.class_name}
                      {cls.room && ` • Room ${cls.room}`}
                    </p>
                  </div>
                </div>
                <Link
                  href={`/teacher/${token}/attendance`}
                  className="px-3 py-1.5 bg-blue-50 text-blue-700 text-sm font-medium rounded-lg hover:bg-blue-100 transition-colors"
                >
                  Mark Attendance
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-6">
        <Link
          href={`/teacher/${token}/attendance`}
          className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <ClipboardCheck className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Mark Attendance</h4>
              <p className="text-sm text-gray-500">Record student attendance for today</p>
            </div>
          </div>
        </Link>
        <Link
          href={`/teacher/${token}/grades`}
          className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Award className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Enter Grades</h4>
              <p className="text-sm text-gray-500">Record assessment marks for students</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  )
}
