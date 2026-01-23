'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { isValidTokenFormat } from '@/lib/portal-tokens'
import {
  CalendarDays,
  Clock,
  MapPin,
  BookOpen,
  Loader2,
  AlertCircle,
} from 'lucide-react'

interface Exam {
  exam_id: string
  exam_name: string
  exam_type: string
  subject_name: string | null
  exam_date: string
  start_time: string
  end_time: string
  duration_minutes: number | null
  venue: string | null
  total_marks: number
  days_until: number
}

const EXAM_TYPE_LABELS: Record<string, string> = {
  exam: 'Exam',
  test: 'Test',
  quiz: 'Quiz',
  midterm: 'Midterm',
  final: 'Final',
  mock: 'Mock Exam',
  practical: 'Practical',
  oral: 'Oral',
  other: 'Other',
}

export default function StudentExamsPage() {
  const params = useParams()
  const token = params.token as string
  const [studentId, setStudentId] = useState<string | null>(null)
  const [upcomingExams, setUpcomingExams] = useState<Exam[]>([])
  const [pastExams, setPastExams] = useState<Exam[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming')

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
    await loadExams(entityId)
  }

  async function loadExams(studentId: string) {
    setIsLoading(true)
    const supabase = createClient()

    // Get upcoming exams using the function
    const { data: upcoming } = await supabase.rpc('get_student_upcoming_exams' as never, { p_student_id: studentId } as never)

    if (upcoming) {
      setUpcomingExams(upcoming as Exam[])
    }

    // Get past exams
    const { data: studentData } = await supabase
      .from('students')
      .select('class_id')
      .eq('id', studentId)
      .single()

    const student = studentData as { class_id: string | null } | null
    if (student?.class_id) {
      const { data: past } = await supabase
        .from('exams')
        .select(`
          id,
          name,
          exam_type,
          exam_date,
          start_time,
          end_time,
          duration_minutes,
          venue,
          total_marks,
          status,
          subject:subjects(name)
        `)
        .eq('class_id', student.class_id)
        .eq('status', 'completed')
        .lt('exam_date', new Date().toISOString().split('T')[0])
        .order('exam_date', { ascending: false })
        .limit(10)

      if (past) {
        type PastExam = { id: string; name: string; exam_type: string; exam_date: string; start_time: string; end_time: string; duration_minutes: number | null; venue: string | null; total_marks: number; status: string; subject: { name: string } | null }
        const pastExams = past as unknown as PastExam[]
        setPastExams(pastExams.map(e => ({
          exam_id: e.id,
          exam_name: e.name,
          exam_type: e.exam_type,
          subject_name: e.subject?.name || null,
          exam_date: e.exam_date,
          start_time: e.start_time,
          end_time: e.end_time,
          duration_minutes: e.duration_minutes,
          venue: e.venue,
          total_marks: e.total_marks,
          days_until: Math.ceil(
            (new Date(e.exam_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
          ),
        })))
      }
    }

    setIsLoading(false)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  const displayExams = activeTab === 'upcoming' ? upcomingExams : pastExams

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Exam Schedule</h1>
        <p className="text-gray-500">View your upcoming and past exams</p>
      </div>

      {/* Stats */}
      {upcomingExams.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <CalendarDays className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-blue-900">
                You have {upcomingExams.length} upcoming exam{upcomingExams.length !== 1 ? 's' : ''}
              </p>
              {upcomingExams[0] && (
                <p className="text-sm text-blue-700">
                  Next: {upcomingExams[0].exam_name} on {new Date(upcomingExams[0].exam_date).toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'upcoming'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          Upcoming ({upcomingExams.length})
        </button>
        <button
          onClick={() => setActiveTab('past')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'past'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          Past ({pastExams.length})
        </button>
      </div>

      {/* Exams List */}
      <div className="space-y-4">
        {displayExams.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <CalendarDays className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {activeTab === 'upcoming' ? 'No upcoming exams' : 'No past exams'}
            </h3>
            <p className="text-gray-500">
              {activeTab === 'upcoming'
                ? 'You don\'t have any scheduled exams.'
                : 'No exam history to display.'}
            </p>
          </div>
        ) : (
          displayExams.map((exam) => {
            const isToday = exam.exam_date === new Date().toISOString().split('T')[0]
            const isTomorrow = exam.days_until === 1
            const isSoon = exam.days_until >= 0 && exam.days_until <= 3

            return (
              <div
                key={exam.exam_id}
                className={`bg-white rounded-xl border overflow-hidden ${
                  isToday ? 'border-yellow-300 bg-yellow-50' : isSoon && activeTab === 'upcoming' ? 'border-orange-200' : 'border-gray-200'
                }`}
              >
                <div className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${
                      isToday ? 'bg-yellow-100' : isSoon && activeTab === 'upcoming' ? 'bg-orange-100' : 'bg-blue-100'
                    }`}>
                      <CalendarDays className={`w-6 h-6 ${
                        isToday ? 'text-yellow-600' : isSoon && activeTab === 'upcoming' ? 'text-orange-600' : 'text-blue-600'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900">{exam.exam_name}</h3>
                          <p className="text-sm text-gray-500">
                            {exam.subject_name && `${exam.subject_name} • `}
                            {EXAM_TYPE_LABELS[exam.exam_type] || exam.exam_type}
                          </p>
                        </div>
                        {activeTab === 'upcoming' && (
                          <div className="text-right">
                            {isToday ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">
                                <AlertCircle className="w-3 h-3" />
                                Today!
                              </span>
                            ) : isTomorrow ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">
                                Tomorrow
                              </span>
                            ) : exam.days_until >= 0 ? (
                              <span className="text-sm text-gray-500">
                                {exam.days_until} day{exam.days_until !== 1 ? 's' : ''} left
                              </span>
                            ) : null}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <CalendarDays className="w-4 h-4" />
                          {new Date(exam.exam_date).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {exam.start_time.slice(0, 5)} - {exam.end_time.slice(0, 5)}
                          {exam.duration_minutes && ` (${exam.duration_minutes} min)`}
                        </span>
                        {exam.venue && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {exam.venue}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <BookOpen className="w-4 h-4" />
                          {exam.total_marks} marks
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
