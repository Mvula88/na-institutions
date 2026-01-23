'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import {
  ArrowLeft,
  Loader2,
  Award,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react'

interface Grade {
  id: string
  score: number
  max_score: number
  grade_letter: string | null
  recorded_at: string
  notes: string | null
  assessment?: {
    name: string
    type: string
    subject?: {
      name: string
    }
  }
}

interface StudentInfo {
  full_name: string
  student_number: string | null
}

export default function ChildGradesPage() {
  const params = useParams()
  const studentId = params.studentId as string

  const [student, setStudent] = useState<StudentInfo | null>(null)
  const [grades, setGrades] = useState<Grade[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedSubject, setSelectedSubject] = useState<string>('all')
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([])
  const [averageScore, setAverageScore] = useState(0)

  useEffect(() => {
    loadGrades()
  }, [studentId])

  async function loadGrades() {
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

    // Get all grades
    const { data: gradeData } = await supabase
      .from('grades')
      .select(`
        id, score, max_score, grade_letter, recorded_at, notes,
        assessment:assessments(
          name, type,
          subject:subjects(name)
        )
      `)
      .eq('student_id', studentId)
      .order('recorded_at', { ascending: false })

    if (gradeData) {
      const gradeRecords = gradeData as unknown as Grade[]
      setGrades(gradeRecords)

      // Extract unique subjects
      const subjectMap = new Map<string, string>()
      gradeRecords.forEach((g) => {
        const assessment = g.assessment as { subject?: { name: string } }
        if (assessment?.subject) {
          subjectMap.set(assessment.subject.name, assessment.subject.name)
        }
      })
      setSubjects(Array.from(subjectMap.values()).map(name => ({ id: name, name })))

      // Calculate average
      if (gradeRecords.length > 0) {
        const totalPercentage = gradeRecords.reduce((sum, g) => {
          return sum + (g.score / g.max_score) * 100
        }, 0)
        setAverageScore(Math.round(totalPercentage / gradeRecords.length))
      }
    }

    setIsLoading(false)
  }

  const filteredGrades = grades.filter(grade => {
    if (selectedSubject === 'all') return true
    return (grade.assessment as { subject?: { name: string } })?.subject?.name === selectedSubject
  })

  const getScoreColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100
    if (percentage >= 80) return 'text-green-600'
    if (percentage >= 60) return 'text-blue-600'
    if (percentage >= 50) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBg = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100
    if (percentage >= 80) return 'bg-green-100'
    if (percentage >= 60) return 'bg-blue-100'
    if (percentage >= 50) return 'bg-yellow-100'
    return 'bg-red-100'
  }

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
          <h1 className="text-2xl font-bold text-gray-900">Academic Grades</h1>
          <p className="text-gray-500">{student?.full_name}</p>
        </div>

        {subjects.length > 0 && (
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          >
            <option value="all">All Subjects</option>
            {subjects.map(sub => (
              <option key={sub.id} value={sub.id}>{sub.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <Award className="w-4 h-4" />
            <span className="text-sm">Average Score</span>
          </div>
          <p className={`text-2xl font-bold ${
            averageScore >= 80 ? 'text-green-600' :
            averageScore >= 60 ? 'text-blue-600' :
            averageScore >= 50 ? 'text-yellow-600' : 'text-red-600'
          }`}>
            {averageScore}%
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm">Total Assessments</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{grades.length}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <Award className="w-4 h-4" />
            <span className="text-sm">Subjects</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{subjects.length}</p>
        </div>
      </div>

      {/* Grades List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          </div>
        ) : filteredGrades.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No grades recorded yet
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredGrades.map((grade) => {
              const percentage = Math.round((grade.score / grade.max_score) * 100)
              return (
                <div key={grade.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getScoreBg(grade.score, grade.max_score)}`}>
                      <Award className={`w-5 h-5 ${getScoreColor(grade.score, grade.max_score)}`} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {(grade.assessment as { name?: string })?.name || 'Assessment'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {(grade.assessment as { subject?: { name: string } })?.subject?.name || 'Unknown Subject'}
                        {' - '}
                        {(grade.assessment as { type?: string })?.type || 'Assessment'}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(grade.recorded_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${getScoreColor(grade.score, grade.max_score)}`}>
                      {grade.score}/{grade.max_score}
                    </p>
                    <p className={`text-sm ${getScoreColor(grade.score, grade.max_score)}`}>
                      {percentage}%
                      {grade.grade_letter && ` (${grade.grade_letter})`}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Grade Scale Legend */}
      <div className="bg-gray-50 rounded-xl p-4">
        <h3 className="font-medium text-gray-900 mb-3">Grade Scale</h3>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-sm text-gray-600">80-100%: Excellent</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-sm text-gray-600">60-79%: Good</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="text-sm text-gray-600">50-59%: Satisfactory</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-sm text-gray-600">Below 50%: Needs Improvement</span>
          </div>
        </div>
      </div>
    </div>
  )
}
