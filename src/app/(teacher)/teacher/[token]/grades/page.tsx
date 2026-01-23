'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Select, Input } from '@/components/ui/input'
import { Award, Save, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'

interface Class {
  id: string
  name: string
}

interface Subject {
  id: string
  name: string
}

interface Assessment {
  id: string
  name: string
  max_marks: number
  assessment_date: string
  subject_id: string
}

interface Student {
  id: string
  full_name: string
  student_number: string | null
}

interface Grade {
  student_id: string
  marks_obtained: number | null
  grade: string | null
}

const GRADE_SCALE = [
  { min: 80, max: 100, grade: 'A' },
  { min: 70, max: 79, grade: 'B' },
  { min: 60, max: 69, grade: 'C' },
  { min: 50, max: 59, grade: 'D' },
  { min: 40, max: 49, grade: 'E' },
  { min: 30, max: 39, grade: 'F' },
  { min: 0, max: 29, grade: 'G' },
]

function calculateGrade(marks: number, maxMarks: number): string {
  const percentage = (marks / maxMarks) * 100
  for (const level of GRADE_SCALE) {
    if (percentage >= level.min && percentage <= level.max) {
      return level.grade
    }
  }
  return '-'
}

export default function TeacherGradesPage() {
  const params = useParams()
  const token = params.token as string
  const [isLoading, setIsLoading] = useState(true)
  const [classes, setClasses] = useState<Class[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [grades, setGrades] = useState<Record<string, Grade>>({})
  const [selectedClassId, setSelectedClassId] = useState('')
  const [selectedSubjectId, setSelectedSubjectId] = useState('')
  const [selectedAssessmentId, setSelectedAssessmentId] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [centerId, setCenterId] = useState<string | null>(null)

  useEffect(() => {
    if (token) {
      fetchInitialData()
    }
  }, [token])

  useEffect(() => {
    if (selectedClassId) {
      fetchStudents()
    }
  }, [selectedClassId])

  useEffect(() => {
    if (selectedSubjectId) {
      fetchAssessments()
    }
  }, [selectedSubjectId])

  useEffect(() => {
    if (selectedAssessmentId && students.length > 0) {
      fetchExistingGrades()
    }
  }, [selectedAssessmentId, students])

  async function fetchInitialData() {
    setIsLoading(true)
    const supabase = createClient()

    // Get teacher data
    const { data: teacherData } = await supabase
      .from('lecturers')
      .select('center_id')
      .eq('id', token)
      .single()

    const teacher = teacherData as { center_id: string } | null

    if (teacher) {
      setCenterId(teacher.center_id)

      // Get classes and subjects from timetable entries
      const { data: entriesData } = await supabase
        .from('timetable_entries')
        .select('class:classes(id, name), subject:subjects(id, name)')
        .eq('teacher_id', token)
        .eq('is_active', true)

      const entries = (entriesData || []) as { class: { id: string; name: string } | null; subject: { id: string; name: string } | null }[]
      if (entries.length > 0) {
        const uniqueClasses = new Map()
        const uniqueSubjects = new Map()

        for (const entry of entries) {
          const cls = entry.class
          const subj = entry.subject
          if (cls && !uniqueClasses.has(cls.id)) {
            uniqueClasses.set(cls.id, cls)
          }
          if (subj && !uniqueSubjects.has(subj.id)) {
            uniqueSubjects.set(subj.id, subj)
          }
        }

        setClasses(Array.from(uniqueClasses.values()))
        setSubjects(Array.from(uniqueSubjects.values()))
      }
    }
    setIsLoading(false)
  }

  async function fetchStudents() {
    const supabase = createClient()
    const { data } = await supabase
      .from('students')
      .select('id, full_name, student_number')
      .eq('class_id', selectedClassId)
      .eq('status', 'active')
      .order('full_name')

    const studentList = (data || []) as Student[]
    setStudents(studentList)

    // Initialize grades
    const initialGrades: Record<string, Grade> = {}
    for (const student of studentList) {
      initialGrades[student.id] = { student_id: student.id, marks_obtained: null, grade: null }
    }
    setGrades(initialGrades)
  }

  async function fetchAssessments() {
    if (!centerId) return
    const supabase = createClient()

    const { data } = await supabase
      .from('assessments')
      .select('id, name, max_marks, assessment_date, subject_id')
      .eq('institution_id', centerId)
      .eq('subject_id', selectedSubjectId)
      .order('assessment_date', { ascending: false })
      .limit(20)

    setAssessments((data || []) as Assessment[])
    setSelectedAssessmentId('')
  }

  async function fetchExistingGrades() {
    if (!selectedAssessmentId) return
    const supabase = createClient()

    const { data } = await supabase
      .from('student_grades')
      .select('student_id, marks_obtained, grade')
      .eq('assessment_id', selectedAssessmentId)
      .in('student_id', students.map(s => s.id))

    const existingGrades = (data || []) as { student_id: string; marks_obtained: number | null; grade: string | null }[]
    const gradesMap: Record<string, Grade> = {}
    for (const student of students) {
      const existing = existingGrades.find(g => g.student_id === student.id)
      gradesMap[student.id] = existing || { student_id: student.id, marks_obtained: null, grade: null }
    }
    setGrades(gradesMap)
  }

  function updateGrade(studentId: string, marks: string) {
    const marksNum = marks === '' ? null : parseFloat(marks)
    const assessment = assessments.find(a => a.id === selectedAssessmentId)

    let grade: string | null = null
    if (marksNum !== null && assessment) {
      grade = calculateGrade(marksNum, assessment.max_marks)
    }

    setGrades(prev => ({
      ...prev,
      [studentId]: { student_id: studentId, marks_obtained: marksNum, grade }
    }))
  }

  async function handleSave() {
    if (!centerId || !selectedAssessmentId) return
    setIsSaving(true)
    const supabase = createClient()

    try {
      const assessment = assessments.find(a => a.id === selectedAssessmentId)
      if (!assessment) return

      const records = Object.values(grades)
        .filter(g => g.marks_obtained !== null)
        .map(g => ({
          center_id: centerId,
          student_id: g.student_id,
          assessment_id: selectedAssessmentId,
          marks_obtained: g.marks_obtained,
          grade: g.grade,
          status: 'graded',
        }))

      const { error } = await supabase
        .from('student_grades')
        .upsert(records as never, { onConflict: 'student_id,assessment_id' })

      if (error) throw error

      toast.success('Grades saved successfully')
    } catch (error) {
      console.error('Error saving grades:', error)
      toast.error('Failed to save grades')
    } finally {
      setIsSaving(false)
    }
  }

  const selectedAssessment = assessments.find(a => a.id === selectedAssessmentId)
  const gradedCount = Object.values(grades).filter(g => g.marks_obtained !== null).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Enter Grades</h2>
          <p className="text-gray-500 text-sm mt-1">Record assessment marks for students</p>
        </div>
        {selectedAssessmentId && students.length > 0 && (
          <Button
            onClick={handleSave}
            disabled={isSaving || gradedCount === 0}
            leftIcon={isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          >
            {isSaving ? 'Saving...' : `Save Grades (${gradedCount})`}
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="grid md:grid-cols-3 gap-4">
          <Select
            label="Class"
            value={selectedClassId}
            onChange={(e) => {
              setSelectedClassId(e.target.value)
              setSelectedAssessmentId('')
            }}
            options={[
              { value: '', label: 'Select class' },
              ...classes.map(c => ({ value: c.id, label: c.name }))
            ]}
          />
          <Select
            label="Subject"
            value={selectedSubjectId}
            onChange={(e) => {
              setSelectedSubjectId(e.target.value)
              setSelectedAssessmentId('')
            }}
            options={[
              { value: '', label: 'Select subject' },
              ...subjects.map(s => ({ value: s.id, label: s.name }))
            ]}
          />
          <Select
            label="Assessment"
            value={selectedAssessmentId}
            onChange={(e) => setSelectedAssessmentId(e.target.value)}
            options={[
              { value: '', label: 'Select assessment' },
              ...assessments.map(a => ({
                value: a.id,
                label: `${a.name} (${new Date(a.assessment_date).toLocaleDateString('en-ZA')})`
              }))
            ]}
            disabled={!selectedSubjectId}
          />
        </div>
      </div>

      {/* Assessment Info */}
      {selectedAssessment && (
        <div className="bg-blue-50 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="font-medium text-blue-900">{selectedAssessment.name}</p>
            <p className="text-sm text-blue-700">
              Max Marks: {selectedAssessment.max_marks} • Date: {new Date(selectedAssessment.assessment_date).toLocaleDateString('en-ZA')}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-blue-700">{gradedCount}/{students.length}</p>
            <p className="text-sm text-blue-600">Graded</p>
          </div>
        </div>
      )}

      {/* Grades Entry */}
      {selectedAssessmentId && (
        <div className="bg-white rounded-xl border border-gray-200">
          {isLoading ? (
            <div className="p-8 animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 rounded"></div>
              ))}
            </div>
          ) : students.length === 0 ? (
            <div className="p-12 text-center">
              <Award className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Students</h3>
              <p className="text-gray-500">No students in this class</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {students.map((student, idx) => {
                const grade = grades[student.id]
                const marksValue = grade?.marks_obtained !== null ? grade.marks_obtained.toString() : ''

                return (
                  <div key={student.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium text-gray-600">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{student.full_name}</p>
                        <p className="text-sm text-gray-500">{student.student_number || 'No ID'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-24">
                        <input
                          type="number"
                          min="0"
                          max={selectedAssessment?.max_marks}
                          step="0.5"
                          value={marksValue}
                          onChange={(e) => updateGrade(student.id, e.target.value)}
                          placeholder="Marks"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none text-center"
                        />
                      </div>
                      <div className="w-12 text-center">
                        <span className={`text-lg font-bold ${
                          grade?.grade === 'A' ? 'text-green-600' :
                          grade?.grade === 'B' ? 'text-blue-600' :
                          grade?.grade === 'C' ? 'text-blue-500' :
                          grade?.grade === 'D' ? 'text-amber-600' :
                          grade?.grade === 'E' ? 'text-amber-500' :
                          grade?.grade === 'F' ? 'text-red-500' :
                          grade?.grade === 'G' ? 'text-red-600' :
                          'text-gray-400'
                        }`}>
                          {grade?.grade || '-'}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {!selectedAssessmentId && !isLoading && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Award className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select an Assessment</h3>
          <p className="text-gray-500">Choose a class, subject, and assessment to enter grades</p>
        </div>
      )}
    </div>
  )
}
