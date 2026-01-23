'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/input'
import { ConfirmModal } from '@/components/ui/modal'
import {
  ClipboardCheck,
  Plus,
  Search,
  Calendar,
  Users,
  BookOpen,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Save,
  X,
  Loader2,
  Eye,
  Trash2,
  UserCheck,
  UserX,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Subject {
  id: string
  name: string
  code: string | null
}

interface Teacher {
  id: string
  full_name: string
}

interface AttendanceSession {
  id: string
  course_id: string | null
  lecturer_id: string | null
  session_date: string
  start_time: string | null
  end_time: string | null
  title: string | null
  notes: string | null
  is_completed: boolean
  created_at: string
  course?: { name: string } | null
  lecturer?: { full_name: string } | null
  _count?: { records: number; present: number }
}

interface Student {
  id: string
  full_name: string
  student_number: string | null
  grade: string | null
}

interface AttendanceRecord {
  id: string
  student_id: string
  status: 'present' | 'absent' | 'late' | 'excused'
  arrival_time: string | null
  notes: string | null
  student: Student
}

const ITEMS_PER_PAGE = 10

export default function AttendancePage() {
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState<'sessions' | 'take'>('sessions')
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // Sessions state
  const [sessions, setSessions] = useState<AttendanceSession[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [dateFilter, setDateFilter] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('')

  // Data for dropdowns
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])

  // Session modal state
  const [showSessionModal, setShowSessionModal] = useState(false)
  const [sessionForm, setSessionForm] = useState({
    course_id: '',
    lecturer_id: '',
    session_date: new Date().toISOString().split('T')[0],
    start_time: '',
    end_time: '',
    title: '',
    notes: '',
  })
  const [isSaving, setIsSaving] = useState(false)

  // Take attendance state
  const [selectedSession, setSelectedSession] = useState<AttendanceSession | null>(null)
  const [sessionStudents, setSessionStudents] = useState<Student[]>([])
  const [attendanceRecords, setAttendanceRecords] = useState<Map<string, { status: string; notes: string }>>(new Map())
  const [isLoadingStudents, setIsLoadingStudents] = useState(false)
  const [isSavingAttendance, setIsSavingAttendance] = useState(false)

  // Delete modal
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; session: AttendanceSession | null }>({
    open: false,
    session: null,
  })
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (user?.institution_id) {
      fetchSubjects()
      fetchTeachers()
    }
  }, [user?.institution_id])

  useEffect(() => {
    if (activeTab === 'sessions' && user?.institution_id) {
      fetchSessions()
    }
  }, [activeTab, user?.institution_id, currentPage, dateFilter, subjectFilter])

  async function fetchSubjects() {
    if (!user?.institution_id) return
    const supabase = createClient()
    const { data } = await supabase
      .from('courses')
      .select('id, name, code')
      .eq('institution_id', user.institution_id)
      .eq('is_active', true)
      .order('name')
    setSubjects((data || []) as Subject[])
  }

  async function fetchTeachers() {
    if (!user?.institution_id) return
    const supabase = createClient()
    const { data } = await supabase
      .from('lecturers')
      .select('id, full_name')
      .eq('institution_id', user.institution_id)
      .eq('status', 'active')
      .order('full_name')
    setTeachers((data || []) as Teacher[])
  }

  async function fetchSessions() {
    if (!user?.institution_id) return
    setIsLoading(true)
    const supabase = createClient()

    let query = supabase
      .from('attendance_sessions')
      .select(`
        id, course_id, lecturer_id, session_date, start_time, end_time,
        title, notes, is_completed, created_at,
        course:courses(name),
        lecturer:lecturers(full_name)
      `, { count: 'exact' })
      .eq('institution_id', user.institution_id)
      .order('session_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (dateFilter) {
      query = query.eq('session_date', dateFilter)
    }
    if (subjectFilter) {
      query = query.eq('course_id', subjectFilter)
    }

    // Pagination
    const from = (currentPage - 1) * ITEMS_PER_PAGE
    query = query.range(from, from + ITEMS_PER_PAGE - 1)

    const { data, count, error } = await query

    if (!error && data) {
      // Fetch attendance counts for each session
      const sessionsWithCounts = await Promise.all(
        (data as unknown as AttendanceSession[]).map(async (session) => {
          const { count: totalRecords } = await supabase
            .from('attendance_records')
            .select('id', { count: 'exact' })
            .eq('session_id', session.id)

          const { count: presentCount } = await supabase
            .from('attendance_records')
            .select('id', { count: 'exact' })
            .eq('session_id', session.id)
            .in('status', ['present', 'late'])

          return {
            ...session,
            _count: { records: totalRecords || 0, present: presentCount || 0 }
          }
        })
      )
      setSessions(sessionsWithCounts)
      setTotalCount(count || 0)
    }
    setIsLoading(false)
  }

  async function handleCreateSession(e: React.FormEvent) {
    e.preventDefault()
    if (!user?.institution_id) return
    setIsSaving(true)
    const supabase = createClient()

    try {
      const { error } = await supabase.from('attendance_sessions').insert({
        institution_id: user.institution_id,
        course_id: sessionForm.course_id || null,
        lecturer_id: sessionForm.lecturer_id || null,
        session_date: sessionForm.session_date,
        start_time: sessionForm.start_time || null,
        end_time: sessionForm.end_time || null,
        title: sessionForm.title || null,
        notes: sessionForm.notes || null,
        created_by: user.id,
      } as never)

      if (error) throw error

      toast.success('Attendance session created')
      setShowSessionModal(false)
      resetSessionForm()
      fetchSessions()
    } catch (error) {
      console.error('Error creating session:', error)
      toast.error('Failed to create session')
    } finally {
      setIsSaving(false)
    }
  }

  function resetSessionForm() {
    setSessionForm({
      course_id: '',
      lecturer_id: '',
      session_date: new Date().toISOString().split('T')[0],
      start_time: '',
      end_time: '',
      title: '',
      notes: '',
    })
  }

  async function openTakeAttendance(session: AttendanceSession) {
    if (!user?.institution_id) return
    setSelectedSession(session)
    setActiveTab('take')
    setIsLoadingStudents(true)

    const supabase = createClient()

    try {
      // Get students enrolled in this subject (if subject-based)
      // Or all active students if no subject
      let studentsQuery = supabase
        .from('students')
        .select('id, full_name, student_number, grade')
        .eq('institution_id', user.institution_id)
        .eq('status', 'active')
        .order('full_name')

      if (session.course_id) {
        // Get students enrolled in this course
        const { data: enrolledStudents } = await supabase
          .from('student_enrollments')
          .select('student_id')
          .eq('course_id', session.course_id)
          .eq('is_active', true)

        const studentIds = (enrolledStudents || []).map((e: { student_id: string }) => e.student_id)

        if (studentIds.length > 0) {
          studentsQuery = studentsQuery.in('id', studentIds)
        } else {
          // No enrolled students
          setSessionStudents([])
          setAttendanceRecords(new Map())
          setIsLoadingStudents(false)
          return
        }
      }

      const { data: students } = await studentsQuery
      setSessionStudents((students || []) as Student[])

      // Fetch existing attendance records for this session
      const { data: existingRecords } = await supabase
        .from('attendance_records')
        .select('student_id, status, notes')
        .eq('session_id', session.id)

      const recordsMap = new Map()
      if (existingRecords) {
        existingRecords.forEach((record: { student_id: string; status: string; notes: string | null }) => {
          recordsMap.set(record.student_id, { status: record.status, notes: record.notes || '' })
        })
      }

      // Set default status for students without records
      (students || []).forEach((student: Student) => {
        if (!recordsMap.has(student.id)) {
          recordsMap.set(student.id, { status: 'present', notes: '' })
        }
      })

      setAttendanceRecords(recordsMap)
    } catch (error) {
      console.error('Error loading students:', error)
      toast.error('Failed to load students')
    } finally {
      setIsLoadingStudents(false)
    }
  }

  function updateAttendanceStatus(studentId: string, status: string) {
    setAttendanceRecords(prev => {
      const newMap = new Map(prev)
      const current = newMap.get(studentId) || { status: 'present', notes: '' }
      newMap.set(studentId, { ...current, status })
      return newMap
    })
  }

  function updateAttendanceNotes(studentId: string, notes: string) {
    setAttendanceRecords(prev => {
      const newMap = new Map(prev)
      const current = newMap.get(studentId) || { status: 'present', notes: '' }
      newMap.set(studentId, { ...current, notes })
      return newMap
    })
  }

  function markAllAs(status: string) {
    setAttendanceRecords(prev => {
      const newMap = new Map(prev)
      sessionStudents.forEach(student => {
        const current = newMap.get(student.id) || { status: 'present', notes: '' }
        newMap.set(student.id, { ...current, status })
      })
      return newMap
    })
  }

  async function saveAttendance() {
    if (!selectedSession || !user?.institution_id) return
    setIsSavingAttendance(true)
    const supabase = createClient()

    try {
      // Delete existing records for this session
      await supabase
        .from('attendance_records')
        .delete()
        .eq('session_id', selectedSession.id)

      // Insert new records
      const records = Array.from(attendanceRecords.entries()).map(([studentId, data]) => ({
        institution_id: user.institution_id,
        session_id: selectedSession.id,
        student_id: studentId,
        status: data.status,
        notes: data.notes || null,
        marked_by: user.id,
      }))

      if (records.length > 0) {
        const { error } = await supabase.from('attendance_records').insert(records as never)
        if (error) throw error
      }

      // Mark session as completed
      await supabase
        .from('attendance_sessions')
        .update({ is_completed: true } as never)
        .eq('id', selectedSession.id)

      toast.success('Attendance saved successfully')
      setActiveTab('sessions')
      setSelectedSession(null)
      fetchSessions()
    } catch (error) {
      console.error('Error saving attendance:', error)
      toast.error('Failed to save attendance')
    } finally {
      setIsSavingAttendance(false)
    }
  }

  async function handleDeleteSession() {
    if (!deleteModal.session) return
    setIsDeleting(true)
    const supabase = createClient()

    try {
      // Delete attendance records first
      await supabase
        .from('attendance_records')
        .delete()
        .eq('session_id', deleteModal.session.id)

      // Delete session
      const { error } = await supabase
        .from('attendance_sessions')
        .delete()
        .eq('id', deleteModal.session.id)

      if (error) throw error

      toast.success('Session deleted successfully')
      setDeleteModal({ open: false, session: null })
      fetchSessions()
    } catch (error) {
      console.error('Error deleting session:', error)
      toast.error('Failed to delete session')
    } finally {
      setIsDeleting(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'absent':
        return <XCircle className="w-5 h-5 text-red-500" />
      case 'late':
        return <Clock className="w-5 h-5 text-amber-500" />
      case 'excused':
        return <AlertCircle className="w-5 h-5 text-blue-500" />
      default:
        return null
    }
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      present: 'bg-green-100 text-green-700',
      absent: 'bg-red-100 text-red-700',
      late: 'bg-amber-100 text-amber-700',
      excused: 'bg-blue-100 text-blue-700',
    }
    return styles[status] || 'bg-gray-100 text-gray-700'
  }

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)

  // Statistics for take attendance
  const attendanceStats = {
    total: sessionStudents.length,
    present: Array.from(attendanceRecords.values()).filter(r => r.status === 'present').length,
    absent: Array.from(attendanceRecords.values()).filter(r => r.status === 'absent').length,
    late: Array.from(attendanceRecords.values()).filter(r => r.status === 'late').length,
    excused: Array.from(attendanceRecords.values()).filter(r => r.status === 'excused').length,
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 md:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Attendance Management</h1>
              <p className="mt-1 text-sm text-gray-500">Track and manage student attendance</p>
            </div>
            {activeTab === 'sessions' && (
              <Button
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={() => {
                  resetSessionForm()
                  setShowSessionModal(true)
                }}
              >
                New Session
              </Button>
            )}
            {activeTab === 'take' && selectedSession && (
              <div className="flex items-center gap-3">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setActiveTab('sessions')
                    setSelectedSession(null)
                  }}
                >
                  Cancel
                </Button>
                <Button
                  leftIcon={isSavingAttendance ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  onClick={saveAttendance}
                  disabled={isSavingAttendance}
                >
                  {isSavingAttendance ? 'Saving...' : 'Save Attendance'}
                </Button>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-6 bg-gray-100 p-1 rounded-lg w-fit">
            <button
              onClick={() => {
                setActiveTab('sessions')
                setSelectedSession(null)
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'sessions'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Calendar className="w-4 h-4" />
              Sessions
            </button>
            {selectedSession && (
              <button
                onClick={() => setActiveTab('take')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'take'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <ClipboardCheck className="w-4 h-4" />
                Take Attendance
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-6">
        {/* Sessions Tab */}
        {activeTab === 'sessions' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => {
                      setDateFilter(e.target.value)
                      setCurrentPage(1)
                    }}
                    placeholder="Filter by date"
                  />
                </div>
                <div className="w-48">
                  <Select
                    options={[
                      { value: '', label: 'All Subjects' },
                      ...subjects.map(s => ({ value: s.id, label: s.name }))
                    ]}
                    value={subjectFilter}
                    onChange={(e) => {
                      setSubjectFilter(e.target.value)
                      setCurrentPage(1)
                    }}
                  />
                </div>
                {(dateFilter || subjectFilter) && (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setDateFilter('')
                      setSubjectFilter('')
                      setCurrentPage(1)
                    }}
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            </div>

            {/* Sessions List */}
            <div className="bg-white rounded-xl border border-gray-200">
              {isLoading ? (
                <div className="p-8 text-center">
                  <div className="animate-pulse space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-16 bg-gray-100 rounded"></div>
                    ))}
                  </div>
                </div>
              ) : sessions.length === 0 ? (
                <div className="p-12 text-center">
                  <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No attendance sessions</h3>
                  <p className="text-gray-500 mb-4">Create a session to start tracking attendance</p>
                  <Button
                    leftIcon={<Plus className="w-4 h-4" />}
                    onClick={() => {
                      resetSessionForm()
                      setShowSessionModal(true)
                    }}
                  >
                    New Session
                  </Button>
                </div>
              ) : (
                <>
                  <div className="divide-y divide-gray-100">
                    {sessions.map((session) => (
                      <div
                        key={session.id}
                        className="p-4 flex items-center justify-between hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-lg ${session.is_completed ? 'bg-green-100' : 'bg-blue-100'}`}>
                            <ClipboardCheck className={`w-6 h-6 ${session.is_completed ? 'text-green-600' : 'text-blue-600'}`} />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {session.title || session.course?.name || 'General Attendance'}
                            </p>
                            <p className="text-sm text-gray-500">
                              {new Date(session.session_date).toLocaleDateString('en-ZA', {
                                weekday: 'short',
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                              {session.start_time && ` at ${session.start_time}`}
                              {session.lecturer?.full_name && ` • ${session.lecturer.full_name}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          {session._count && session._count.records > 0 && (
                            <div className="text-sm text-right">
                              <p className="font-medium text-gray-900">
                                {session._count.present}/{session._count.records} present
                              </p>
                              <p className="text-gray-500">
                                {Math.round((session._count.present / session._count.records) * 100)}% attendance
                              </p>
                            </div>
                          )}
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            session.is_completed
                              ? 'bg-green-100 text-green-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}>
                            {session.is_completed ? 'Completed' : 'Pending'}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openTakeAttendance(session)}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                              title="Take Attendance"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteModal({ open: true, session })}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
                      <p className="text-sm text-gray-500">
                        Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} of {totalCount}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <span className="text-sm text-gray-600">Page {currentPage} of {totalPages}</span>
                        <button
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Take Attendance Tab */}
        {activeTab === 'take' && selectedSession && (
          <div className="space-y-6">
            {/* Session Info */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="font-semibold text-gray-900">
                    {selectedSession.title || selectedSession.course?.name || 'General Attendance'}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {new Date(selectedSession.session_date).toLocaleDateString('en-ZA', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                    {selectedSession.lecturer?.full_name && ` • ${selectedSession.lecturer.full_name}`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      {attendanceStats.present} Present
                    </span>
                    <span className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      {attendanceStats.absent} Absent
                    </span>
                    <span className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                      {attendanceStats.late} Late
                    </span>
                    <span className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      {attendanceStats.excused} Excused
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<UserCheck className="w-4 h-4" />}
                onClick={() => markAllAs('present')}
              >
                Mark All Present
              </Button>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<UserX className="w-4 h-4" />}
                onClick={() => markAllAs('absent')}
              >
                Mark All Absent
              </Button>
            </div>

            {/* Students List */}
            <div className="bg-white rounded-xl border border-gray-200">
              {isLoadingStudents ? (
                <div className="p-8 text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                  <p className="text-gray-500">Loading students...</p>
                </div>
              ) : sessionStudents.length === 0 ? (
                <div className="p-12 text-center">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No students found</h3>
                  <p className="text-gray-500">
                    {selectedSession.course_id
                      ? 'No students are enrolled in this course'
                      : 'No active students in your institution'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {sessionStudents.map((student) => {
                    const record = attendanceRecords.get(student.id) || { status: 'present', notes: '' }
                    return (
                      <div key={student.id} className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-medium text-gray-600">
                              {student.full_name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate">{student.full_name}</p>
                            <p className="text-sm text-gray-500 truncate">
                              {student.student_number} {student.grade && `• ${student.grade}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <div className="flex gap-1">
                            {['present', 'absent', 'late', 'excused'].map((status) => (
                              <button
                                key={status}
                                onClick={() => updateAttendanceStatus(student.id, status)}
                                className={`p-2 rounded-lg transition-colors ${
                                  record.status === status
                                    ? getStatusBadge(status)
                                    : 'text-gray-400 hover:bg-gray-100'
                                }`}
                                title={status.charAt(0).toUpperCase() + status.slice(1)}
                              >
                                {getStatusIcon(status)}
                              </button>
                            ))}
                          </div>
                          <input
                            type="text"
                            placeholder="Notes..."
                            value={record.notes}
                            onChange={(e) => updateAttendanceNotes(student.id, e.target.value)}
                            className="w-32 px-2 py-1 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none"
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Create Session Modal */}
      {showSessionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Create Attendance Session</h2>
              <button
                onClick={() => setShowSessionModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateSession} className="p-6 space-y-4">
              <Input
                label="Session Date"
                type="date"
                required
                value={sessionForm.session_date}
                onChange={(e) => setSessionForm({ ...sessionForm, session_date: e.target.value })}
              />
              <Select
                label="Course (Optional)"
                options={[
                  { value: '', label: 'General Attendance' },
                  ...subjects.map(s => ({ value: s.id, label: s.name }))
                ]}
                value={sessionForm.course_id}
                onChange={(e) => setSessionForm({ ...sessionForm, course_id: e.target.value })}
              />
              <Select
                label="Lecturer (Optional)"
                options={[
                  { value: '', label: 'Select Lecturer' },
                  ...teachers.map(t => ({ value: t.id, label: t.full_name }))
                ]}
                value={sessionForm.lecturer_id}
                onChange={(e) => setSessionForm({ ...sessionForm, lecturer_id: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Start Time"
                  type="time"
                  value={sessionForm.start_time}
                  onChange={(e) => setSessionForm({ ...sessionForm, start_time: e.target.value })}
                />
                <Input
                  label="End Time"
                  type="time"
                  value={sessionForm.end_time}
                  onChange={(e) => setSessionForm({ ...sessionForm, end_time: e.target.value })}
                />
              </div>
              <Input
                label="Session Title (Optional)"
                value={sessionForm.title}
                onChange={(e) => setSessionForm({ ...sessionForm, title: e.target.value })}
                placeholder="e.g., Morning Class, Revision Session"
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                <textarea
                  value={sessionForm.notes}
                  onChange={(e) => setSessionForm({ ...sessionForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none resize-none"
                  rows={2}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowSessionModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving}
                  leftIcon={isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  className="flex-1"
                >
                  {isSaving ? 'Creating...' : 'Create Session'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      <ConfirmModal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, session: null })}
        onConfirm={handleDeleteSession}
        title="Delete Attendance Session"
        message="Are you sure you want to delete this session? All attendance records for this session will also be deleted. This action cannot be undone."
        confirmText="Delete"
        isLoading={isDeleting}
      />
    </div>
  )
}
