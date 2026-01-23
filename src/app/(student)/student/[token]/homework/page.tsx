'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { isValidTokenFormat, verifyPortalToken } from '@/lib/portal-tokens'
import {
  BookOpen,
  Clock,
  CheckCircle,
  AlertCircle,
  Calendar,
  Loader2,
} from 'lucide-react'

interface Assignment {
  id: string
  title: string
  description: string | null
  instructions: string | null
  assignment_type: string
  due_date: string
  max_points: number | null
  is_graded: boolean
  subject?: { name: string }
  teacher?: { full_name: string }
  student_assignment?: {
    id: string
    status: string
    completed_at: string | null
    points_earned: number | null
    teacher_notes: string | null
  }
}

const STATUS_BADGES: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pending' },
  in_progress: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'In Progress' },
  completed: { bg: 'bg-green-100', text: 'text-green-700', label: 'Completed' },
  incomplete: { bg: 'bg-red-100', text: 'text-red-700', label: 'Incomplete' },
  late: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Late' },
  excused: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Excused' },
}

export default function StudentHomeworkPage() {
  const params = useParams()
  const token = params.token as string
  const [studentId, setStudentId] = useState<string | null>(null)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('pending')

  useEffect(() => {
    validateAndLoad()
  }, [token])

  async function validateAndLoad() {
    const supabase = createClient()
    let entityId: string | null = null

    // Check if JWT token
    if (isValidTokenFormat(token)) {
      const response = await fetch('/api/portal/validate-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, entityType: 'student' }),
      })
      const result = await response.json()
      if (result.valid) {
        entityId = result.entityId
      }
    } else {
      // Legacy UUID token
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (uuidRegex.test(token)) {
        entityId = token
      }
    }

    if (!entityId) {
      setIsLoading(false)
      return
    }

    setStudentId(entityId)
    await loadAssignments(entityId)
  }

  async function loadAssignments(studentId: string) {
    setIsLoading(true)
    const supabase = createClient()

    // Get student's class
    const { data: studentData } = await supabase
      .from('students')
      .select('class_id')
      .eq('id', studentId)
      .single()

    const student = studentData as { class_id: string | null } | null
    if (!student?.class_id) {
      setIsLoading(false)
      return
    }

    // Get assignments for student's class
    const { data: assignmentsRaw } = await supabase
      .from('assignments')
      .select(`
        id, title, description, instructions, assignment_type, due_date, max_points, is_graded,
        subject:subjects(name),
        teacher:teachers!assigned_by(full_name)
      `)
      .eq('class_id', student.class_id)
      .eq('is_active', true)
      .order('due_date', { ascending: true })

    type AssignmentData = { id: string; title: string; description: string | null; instructions: string | null; assignment_type: string; due_date: string; max_points: number | null; is_graded: boolean; subject: { name: string } | null; teacher: { full_name: string } | null }
    const assignmentsData = assignmentsRaw as AssignmentData[] | null

    if (!assignmentsData) {
      setIsLoading(false)
      return
    }

    // Get student's assignment statuses
    const assignmentIds = assignmentsData.map(a => a.id)
    const { data: studentAssignmentsRaw } = await supabase
      .from('student_assignments')
      .select('*')
      .eq('student_id', studentId)
      .in('assignment_id', assignmentIds)

    type StudentAssignmentData = { id: string; assignment_id: string; student_id: string; status: string; completed_at: string | null; points_earned: number | null; teacher_notes: string | null }
    const studentAssignments = studentAssignmentsRaw as StudentAssignmentData[] | null

    // Merge data
    const merged = assignmentsData.map(a => ({
      ...a,
      student_assignment: studentAssignments?.find(sa => sa.assignment_id === a.id)
    })) as Assignment[]

    setAssignments(merged)
    setIsLoading(false)
  }

  const filteredAssignments = assignments.filter(a => {
    if (filter === 'pending') {
      return !a.student_assignment || ['pending', 'in_progress'].includes(a.student_assignment.status)
    }
    if (filter === 'completed') {
      return a.student_assignment && ['completed', 'late', 'excused'].includes(a.student_assignment.status)
    }
    return true
  })

  const pendingCount = assignments.filter(a =>
    !a.student_assignment || ['pending', 'in_progress'].includes(a.student_assignment.status)
  ).length

  const completedCount = assignments.filter(a =>
    a.student_assignment && ['completed', 'late', 'excused'].includes(a.student_assignment.status)
  ).length

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Homework</h1>
        <p className="text-gray-500">Track your assignments and homework</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-yellow-600 mb-2">
            <Clock className="w-5 h-5" />
            <span className="text-sm font-medium">Pending</span>
          </div>
          <p className="text-3xl font-bold text-yellow-600">{pendingCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-green-600 mb-2">
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm font-medium">Completed</span>
          </div>
          <p className="text-3xl font-bold text-green-600">{completedCount}</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {(['pending', 'completed', 'all'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Assignments List */}
      <div className="space-y-4">
        {filteredAssignments.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {filter === 'pending' ? 'No pending assignments' : 'No assignments found'}
            </h3>
            <p className="text-gray-500">
              {filter === 'pending'
                ? 'Great job! You\'re all caught up.'
                : 'Check back later for new assignments.'}
            </p>
          </div>
        ) : (
          filteredAssignments.map((assignment) => {
            const status = assignment.student_assignment?.status || 'pending'
            const badge = STATUS_BADGES[status] || STATUS_BADGES.pending
            const isOverdue = new Date(assignment.due_date) < new Date() && status === 'pending'
            const daysUntilDue = Math.ceil(
              (new Date(assignment.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
            )

            return (
              <div
                key={assignment.id}
                className={`bg-white rounded-xl border ${isOverdue ? 'border-red-200' : 'border-gray-200'} overflow-hidden`}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-lg ${isOverdue ? 'bg-red-100' : 'bg-blue-100'}`}>
                        <BookOpen className={`w-6 h-6 ${isOverdue ? 'text-red-600' : 'text-blue-600'}`} />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{assignment.title}</h3>
                        <p className="text-sm text-gray-500">
                          {assignment.subject?.name && `${assignment.subject.name} • `}
                          {assignment.teacher?.full_name}
                        </p>
                        {assignment.description && (
                          <p className="text-sm text-gray-400 mt-2">{assignment.description}</p>
                        )}
                      </div>
                    </div>
                    <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                      {status === 'completed' ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      {badge.label}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        Due: {new Date(assignment.due_date).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </div>
                      {!isOverdue && daysUntilDue >= 0 && daysUntilDue <= 7 && status === 'pending' && (
                        <span className={`text-xs ${daysUntilDue <= 2 ? 'text-red-600' : 'text-yellow-600'}`}>
                          {daysUntilDue === 0 ? 'Due today!' : `${daysUntilDue} days left`}
                        </span>
                      )}
                      {isOverdue && (
                        <span className="text-xs text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Overdue
                        </span>
                      )}
                    </div>
                    {assignment.is_graded && assignment.max_points && (
                      <div className="text-sm">
                        {assignment.student_assignment && assignment.student_assignment.points_earned !== null ? (
                          <span className="font-medium text-blue-600">
                            {assignment.student_assignment.points_earned}/{assignment.max_points} pts
                          </span>
                        ) : (
                          <span className="text-gray-400">{assignment.max_points} pts</span>
                        )}
                      </div>
                    )}
                  </div>

                  {assignment.student_assignment?.teacher_notes && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-700">
                        <span className="font-medium">Teacher feedback:</span> {assignment.student_assignment.teacher_notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
