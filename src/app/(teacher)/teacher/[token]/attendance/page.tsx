'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/input'
import { ClipboardCheck, Save, Loader2, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'

interface Class {
  id: string
  name: string
}

interface Student {
  id: string
  full_name: string
  student_number: string | null
}

interface AttendanceRecord {
  student_id: string
  status: string
  notes: string
}

export default function TeacherAttendancePage() {
  const params = useParams()
  const token = params.token as string
  const [isLoading, setIsLoading] = useState(true)
  const [classes, setClasses] = useState<Class[]>([])
  const [selectedClassId, setSelectedClassId] = useState('')
  const [students, setStudents] = useState<Student[]>([])
  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>({})
  const [existingAttendance, setExistingAttendance] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [centerId, setCenterId] = useState<string | null>(null)

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    if (token) {
      fetchClasses()
    }
  }, [token])

  useEffect(() => {
    if (selectedClassId) {
      fetchStudents()
    }
  }, [selectedClassId])

  async function fetchClasses() {
    setIsLoading(true)
    const supabase = createClient()

    // Get teacher's center
    const { data: teacherData } = await supabase
      .from('lecturers')
      .select('center_id')
      .eq('id', token)
      .single()

    const teacher = teacherData as { center_id: string } | null

    if (teacher) {
      setCenterId(teacher.center_id)

      // Get classes assigned to this teacher
      const { data: entriesData } = await supabase
        .from('timetable_entries')
        .select('class:classes(id, name)')
        .eq('teacher_id', token)
        .eq('is_active', true)

      const entries = (entriesData || []) as { class: { id: string; name: string } | null }[]
      if (entries.length > 0) {
        // Get unique classes
        const uniqueClasses = new Map()
        for (const entry of entries) {
          const cls = entry.class
          if (cls && !uniqueClasses.has(cls.id)) {
            uniqueClasses.set(cls.id, cls)
          }
        }
        setClasses(Array.from(uniqueClasses.values()))
      }
    }
    setIsLoading(false)
  }

  async function fetchStudents() {
    if (!selectedClassId) return
    setIsLoading(true)
    const supabase = createClient()

    // Get students in class
    const { data: studentData } = await supabase
      .from('students')
      .select('id, full_name, student_number')
      .eq('class_id', selectedClassId)
      .eq('status', 'active')
      .order('full_name')

    const studentList = (studentData || []) as Student[]
    setStudents(studentList)

    // Initialize attendance records
    const initialAttendance: Record<string, AttendanceRecord> = {}
    for (const student of studentList) {
      initialAttendance[student.id] = { student_id: student.id, status: 'present', notes: '' }
    }
    setAttendance(initialAttendance)

    // Check for existing attendance today
    const { data: existingData } = await supabase
      .from('attendance')
      .select('student_id, status')
      .eq('date', today)
      .in('student_id', studentList.map(s => s.id))

    const existing = (existingData || []) as { student_id: string; status: string }[]
    const existingMap: Record<string, string> = {}
    for (const record of existing) {
      existingMap[record.student_id] = record.status
      if (initialAttendance[record.student_id]) {
        initialAttendance[record.student_id].status = record.status
      }
    }
    setExistingAttendance(existingMap)
    setAttendance(initialAttendance)

    setIsLoading(false)
  }

  function updateAttendance(studentId: string, status: string) {
    setAttendance(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], status }
    }))
  }

  async function handleSave() {
    if (!centerId || !selectedClassId) return
    setIsSaving(true)
    const supabase = createClient()

    try {
      const records = Object.values(attendance).map(record => ({
        center_id: centerId,
        student_id: record.student_id,
        class_id: selectedClassId,
        date: today,
        status: record.status,
        marked_by: token,
      }))

      // Upsert attendance records
      const { error } = await supabase
        .from('attendance')
        .upsert(records as never, { onConflict: 'student_id,date' })

      if (error) throw error

      toast.success('Attendance saved successfully')
      fetchStudents() // Refresh to update existing status
    } catch (error) {
      console.error('Error saving attendance:', error)
      toast.error('Failed to save attendance')
    } finally {
      setIsSaving(false)
    }
  }

  const statusConfig: Record<string, { bg: string; text: string; activeBg: string; icon: React.ReactNode }> = {
    present: { bg: 'bg-green-100', text: 'text-green-700', activeBg: 'bg-green-500', icon: <CheckCircle className="w-4 h-4" /> },
    absent: { bg: 'bg-red-100', text: 'text-red-700', activeBg: 'bg-red-500', icon: <XCircle className="w-4 h-4" /> },
    late: { bg: 'bg-amber-100', text: 'text-amber-700', activeBg: 'bg-amber-500', icon: <Clock className="w-4 h-4" /> },
    excused: { bg: 'bg-blue-100', text: 'text-blue-700', activeBg: 'bg-blue-500', icon: <AlertTriangle className="w-4 h-4" /> },
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Mark Attendance</h2>
          <p className="text-gray-500 text-sm mt-1">
            {new Date().toLocaleDateString('en-ZA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        {selectedClassId && students.length > 0 && (
          <Button
            onClick={handleSave}
            disabled={isSaving}
            leftIcon={isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          >
            {isSaving ? 'Saving...' : 'Save Attendance'}
          </Button>
        )}
      </div>

      {/* Class Selector */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="w-64">
          <Select
            label="Select Class"
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            options={[
              { value: '', label: 'Select a class' },
              ...classes.map(c => ({ value: c.id, label: c.name }))
            ]}
          />
        </div>
      </div>

      {/* Attendance List */}
      {selectedClassId && (
        <div className="bg-white rounded-xl border border-gray-200">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-pulse space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-100 rounded"></div>
                ))}
              </div>
            </div>
          ) : students.length === 0 ? (
            <div className="p-12 text-center">
              <ClipboardCheck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Students</h3>
              <p className="text-gray-500">No students found in this class</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {students.map((student) => {
                const currentStatus = attendance[student.id]?.status || 'present'
                const hasExisting = existingAttendance[student.id]

                return (
                  <div key={student.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 font-medium">
                        {student.full_name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{student.full_name}</p>
                        <p className="text-sm text-gray-500">{student.student_number || 'No ID'}</p>
                      </div>
                      {hasExisting && (
                        <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                          Marked
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {Object.entries(statusConfig).map(([status, config]) => (
                        <button
                          key={status}
                          onClick={() => updateAttendance(student.id, status)}
                          className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                            currentStatus === status
                              ? `${config.activeBg} text-white`
                              : `${config.bg} ${config.text} hover:opacity-80`
                          }`}
                        >
                          {config.icon}
                          <span className="hidden sm:inline capitalize">{status}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Quick Stats */}
      {selectedClassId && students.length > 0 && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-green-50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-green-700">
              {Object.values(attendance).filter(a => a.status === 'present').length}
            </p>
            <p className="text-sm text-green-600">Present</p>
          </div>
          <div className="bg-red-50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-red-700">
              {Object.values(attendance).filter(a => a.status === 'absent').length}
            </p>
            <p className="text-sm text-red-600">Absent</p>
          </div>
          <div className="bg-amber-50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-amber-700">
              {Object.values(attendance).filter(a => a.status === 'late').length}
            </p>
            <p className="text-sm text-amber-600">Late</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-blue-700">
              {Object.values(attendance).filter(a => a.status === 'excused').length}
            </p>
            <p className="text-sm text-blue-600">Excused</p>
          </div>
        </div>
      )}
    </div>
  )
}
