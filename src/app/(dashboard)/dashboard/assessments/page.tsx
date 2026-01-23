'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/input'
import { ConfirmModal } from '@/components/ui/modal'
import {
  Award,
  Plus,
  Search,
  Calendar,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Save,
  X,
  Loader2,
  Eye,
  Trash2,
  Pencil,
  FileText,
  CheckCircle,
  AlertTriangle,
  BarChart3,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Course {
  id: string
  name: string
  code: string | null
  course_code: string | null
}

interface Assessment {
  id: string
  course_id: string
  name: string
  description: string | null
  assessment_type: string
  max_marks: number
  pass_mark: number
  weight: number
  assessment_date: string
  term: string | null
  academic_year: string | null
  is_published: boolean
  created_at: string
  course?: { name: string } | null
  _count?: { graded: number; total: number; passed: number }
}

interface Student {
  id: string
  full_name: string
  student_number: string | null
  current_level: number | null
}

interface StudentGrade {
  id?: string
  student_id: string
  marks_obtained: number | null
  grade: string | null
  status: string
  feedback: string
  student: Student
}

const ITEMS_PER_PAGE = 10

const ASSESSMENT_TYPES = [
  { value: 'test', label: 'Test' },
  { value: 'exam', label: 'Exam' },
  { value: 'quiz', label: 'Quiz' },
  { value: 'assignment', label: 'Assignment' },
  { value: 'project', label: 'Project' },
  { value: 'practical', label: 'Practical' },
  { value: 'portfolio', label: 'Portfolio' },
  { value: 'presentation', label: 'Presentation' },
  { value: 'other', label: 'Other' },
]

const GRADE_SCALE = [
  { min: 80, max: 100, grade: 'A', description: 'Outstanding' },
  { min: 70, max: 79, grade: 'B', description: 'Meritorious' },
  { min: 60, max: 69, grade: 'C', description: 'Substantial' },
  { min: 50, max: 59, grade: 'D', description: 'Adequate' },
  { min: 40, max: 49, grade: 'E', description: 'Moderate' },
  { min: 30, max: 39, grade: 'F', description: 'Elementary' },
  { min: 0, max: 29, grade: 'G', description: 'Not Achieved' },
]

function calculateGrade(percentage: number): string {
  for (const level of GRADE_SCALE) {
    if (percentage >= level.min && percentage <= level.max) {
      return level.grade
    }
  }
  return '-'
}

export default function AssessmentsPage() {
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState<'assessments' | 'grade'>('assessments')
  const [isLoading, setIsLoading] = useState(true)

  // Assessments state
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [courseFilter, setCourseFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  // Data for dropdowns
  const [courses, setCourses] = useState<Course[]>([])

  // Assessment modal state
  const [showAssessmentModal, setShowAssessmentModal] = useState(false)
  const [editingAssessment, setEditingAssessment] = useState<Assessment | null>(null)
  const [assessmentForm, setAssessmentForm] = useState({
    course_id: '',
    name: '',
    description: '',
    assessment_type: 'test',
    max_marks: 100,
    pass_mark: 50,
    weight: 100,
    assessment_date: new Date().toISOString().split('T')[0],
    term: '',
    academic_year: new Date().getFullYear().toString(),
  })
  const [isSaving, setIsSaving] = useState(false)

  // Grading state
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null)
  const [studentGrades, setStudentGrades] = useState<StudentGrade[]>([])
  const [isLoadingGrades, setIsLoadingGrades] = useState(false)
  const [isSavingGrades, setIsSavingGrades] = useState(false)

  // Delete modal
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; assessment: Assessment | null }>({
    open: false,
    assessment: null,
  })
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (user?.institution_id) {
      fetchCourses()
    }
  }, [user?.institution_id])

  useEffect(() => {
    if (activeTab === 'assessments' && user?.institution_id) {
      fetchAssessments()
    }
  }, [activeTab, user?.institution_id, currentPage, courseFilter, typeFilter])

  async function fetchCourses() {
    if (!user?.institution_id) return
    const supabase = createClient()
    const { data } = await supabase
      .from('courses')
      .select('id, name, code, course_code')
      .eq('institution_id', user.institution_id)
      .eq('is_active', true)
      .order('name')
    setCourses((data || []) as Course[])
  }

  async function fetchAssessments() {
    if (!user?.institution_id) return
    setIsLoading(true)
    const supabase = createClient()

    let query = supabase
      .from('assessments')
      .select(`
        id, course_id, name, description, assessment_type, max_marks, pass_mark,
        weight, assessment_date, term, academic_year, is_published, created_at,
        course:courses(name)
      `, { count: 'exact' })
      .eq('institution_id', user.institution_id)
      .order('assessment_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (courseFilter) {
      query = query.eq('course_id', courseFilter)
    }
    if (typeFilter) {
      query = query.eq('assessment_type', typeFilter)
    }

    const from = (currentPage - 1) * ITEMS_PER_PAGE
    query = query.range(from, from + ITEMS_PER_PAGE - 1)

    const { data, count, error } = await query

    if (!error && data) {
      // Fetch grade counts for each assessment
      const assessmentsWithCounts = await Promise.all(
        (data as unknown as Assessment[]).map(async (assessment) => {
          // Get students enrolled in this course
          const { data: enrolledStudents } = await supabase
            .from('student_enrollments')
            .select('student_id')
            .eq('course_id', assessment.course_id)
            .eq('is_active', true)

          const totalStudents = enrolledStudents?.length || 0

          const { count: gradedCount } = await supabase
            .from('student_grades')
            .select('id', { count: 'exact' })
            .eq('assessment_id', assessment.id)
            .not('marks_obtained', 'is', null)

          const { data: passedData } = await supabase
            .from('student_grades')
            .select('marks_obtained')
            .eq('assessment_id', assessment.id)
            .not('marks_obtained', 'is', null)

          const passedCount = (passedData || []).filter((g: { marks_obtained: number | null }) =>
            g.marks_obtained !== null && (g.marks_obtained / assessment.max_marks) * 100 >= assessment.pass_mark
          ).length

          return {
            ...assessment,
            _count: {
              graded: gradedCount || 0,
              total: totalStudents,
              passed: passedCount,
            }
          }
        })
      )
      setAssessments(assessmentsWithCounts)
      setTotalCount(count || 0)
    }
    setIsLoading(false)
  }

  async function handleSaveAssessment(e: React.FormEvent) {
    e.preventDefault()
    if (!user?.institution_id) return
    setIsSaving(true)
    const supabase = createClient()

    try {
      const assessmentData = {
        institution_id: user.institution_id,
        course_id: assessmentForm.course_id,
        name: assessmentForm.name,
        description: assessmentForm.description || null,
        assessment_type: assessmentForm.assessment_type,
        max_marks: assessmentForm.max_marks,
        pass_mark: assessmentForm.pass_mark,
        weight: assessmentForm.weight,
        assessment_date: assessmentForm.assessment_date,
        term: assessmentForm.term || null,
        academic_year: assessmentForm.academic_year || null,
        created_by: user.id,
      }

      if (editingAssessment) {
        const { error } = await supabase
          .from('assessments')
          .update(assessmentData as never)
          .eq('id', editingAssessment.id)
        if (error) throw error
        toast.success('Assessment updated successfully')
      } else {
        const { error } = await supabase
          .from('assessments')
          .insert(assessmentData as never)
        if (error) throw error
        toast.success('Assessment created successfully')
      }

      setShowAssessmentModal(false)
      resetAssessmentForm()
      fetchAssessments()
    } catch (error) {
      console.error('Error saving assessment:', error)
      toast.error('Failed to save assessment')
    } finally {
      setIsSaving(false)
    }
  }

  function resetAssessmentForm() {
    setAssessmentForm({
      course_id: '',
      name: '',
      description: '',
      assessment_type: 'test',
      max_marks: 100,
      pass_mark: 50,
      weight: 100,
      assessment_date: new Date().toISOString().split('T')[0],
      term: '',
      academic_year: new Date().getFullYear().toString(),
    })
    setEditingAssessment(null)
  }

  function openEditAssessment(assessment: Assessment) {
    setAssessmentForm({
      course_id: assessment.course_id,
      name: assessment.name,
      description: assessment.description || '',
      assessment_type: assessment.assessment_type,
      max_marks: assessment.max_marks,
      pass_mark: assessment.pass_mark,
      weight: assessment.weight,
      assessment_date: assessment.assessment_date,
      term: assessment.term || '',
      academic_year: assessment.academic_year || '',
    })
    setEditingAssessment(assessment)
    setShowAssessmentModal(true)
  }

  async function openGrading(assessment: Assessment) {
    if (!user?.institution_id) return
    setSelectedAssessment(assessment)
    setActiveTab('grade')
    setIsLoadingGrades(true)

    const supabase = createClient()

    try {
      // Get students enrolled in this course
      const { data: enrolledStudents } = await supabase
        .from('student_enrollments')
        .select('student_id')
        .eq('course_id', assessment.course_id)
        .eq('is_active', true)

      const studentIds = (enrolledStudents || []).map((e: { student_id: string }) => e.student_id)

      if (studentIds.length === 0) {
        setStudentGrades([])
        setIsLoadingGrades(false)
        return
      }

      // Fetch student details
      const { data: students } = await supabase
        .from('students')
        .select('id, full_name, student_number, current_level')
        .in('id', studentIds)
        .eq('status', 'active')
        .order('full_name')

      // Fetch existing grades
      const { data: existingGrades } = await supabase
        .from('student_grades')
        .select('student_id, marks_obtained, grade, status, feedback')
        .eq('assessment_id', assessment.id)

      const gradesMap = new Map(
        (existingGrades || []).map((g: { student_id: string; marks_obtained: number | null; grade: string | null; status: string; feedback: string | null }) => [
          g.student_id,
          { marks_obtained: g.marks_obtained, grade: g.grade, status: g.status, feedback: g.feedback || '' }
        ])
      )

      const grades: StudentGrade[] = ((students || []) as Student[]).map((student) => {
        const existing = gradesMap.get(student.id)
        return {
          student_id: student.id,
          marks_obtained: existing?.marks_obtained ?? null,
          grade: existing?.grade ?? null,
          status: existing?.status ?? 'pending',
          feedback: existing?.feedback ?? '',
          student,
        }
      })

      setStudentGrades(grades)
    } catch (error) {
      console.error('Error loading grades:', error)
      toast.error('Failed to load grades')
    } finally {
      setIsLoadingGrades(false)
    }
  }

  function updateStudentGrade(studentId: string, field: string, value: string | number | null) {
    setStudentGrades(prev => prev.map(g => {
      if (g.student_id !== studentId) return g

      const updated = { ...g, [field]: value }

      // Auto-calculate letter grade when marks change
      if (field === 'marks_obtained' && selectedAssessment && value !== null && value !== '') {
        const percentage = (Number(value) / selectedAssessment.max_marks) * 100
        updated.grade = calculateGrade(percentage)
        updated.status = 'graded'
      }

      return updated
    }))
  }

  async function saveGrades() {
    if (!selectedAssessment || !user?.institution_id) return
    setIsSavingGrades(true)
    const supabase = createClient()

    try {
      // Delete existing grades for this assessment
      await supabase
        .from('student_grades')
        .delete()
        .eq('assessment_id', selectedAssessment.id)

      // Insert new grades
      const gradesToInsert = studentGrades
        .filter(g => g.marks_obtained !== null || g.status !== 'pending')
        .map(g => ({
          institution_id: user.institution_id,
          assessment_id: selectedAssessment.id,
          student_id: g.student_id,
          marks_obtained: g.marks_obtained,
          percentage: g.marks_obtained !== null
            ? Math.round((g.marks_obtained / selectedAssessment.max_marks) * 100 * 100) / 100
            : null,
          grade: g.grade,
          status: g.status,
          feedback: g.feedback || null,
          graded_by: user.id,
        }))

      if (gradesToInsert.length > 0) {
        const { error } = await supabase.from('student_grades').insert(gradesToInsert as never)
        if (error) throw error
      }

      toast.success('Grades saved successfully')
      setActiveTab('assessments')
      setSelectedAssessment(null)
      fetchAssessments()
    } catch (error) {
      console.error('Error saving grades:', error)
      toast.error('Failed to save grades')
    } finally {
      setIsSavingGrades(false)
    }
  }

  async function handleDeleteAssessment() {
    if (!deleteModal.assessment) return
    setIsDeleting(true)
    const supabase = createClient()

    try {
      // Delete grades first
      await supabase
        .from('student_grades')
        .delete()
        .eq('assessment_id', deleteModal.assessment.id)

      // Delete assessment
      const { error } = await supabase
        .from('assessments')
        .delete()
        .eq('id', deleteModal.assessment.id)

      if (error) throw error

      toast.success('Assessment deleted successfully')
      setDeleteModal({ open: false, assessment: null })
      fetchAssessments()
    } catch (error) {
      console.error('Error deleting assessment:', error)
      toast.error('Failed to delete assessment')
    } finally {
      setIsDeleting(false)
    }
  }

  const getTypeLabel = (type: string) => {
    return ASSESSMENT_TYPES.find(t => t.value === type)?.label || type
  }

  const getGradeBadge = (grade: string | null) => {
    if (!grade) return 'bg-gray-100 text-gray-600'
    const badges: Record<string, string> = {
      'A': 'bg-green-100 text-green-700',
      'B': 'bg-blue-100 text-blue-700',
      'C': 'bg-cyan-100 text-cyan-700',
      'D': 'bg-amber-100 text-amber-700',
      'E': 'bg-orange-100 text-orange-700',
      'F': 'bg-red-100 text-red-700',
      'G': 'bg-red-100 text-red-700',
    }
    return badges[grade] || 'bg-gray-100 text-gray-600'
  }

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)

  // Grading statistics
  const gradingStats = {
    total: studentGrades.length,
    graded: studentGrades.filter(g => g.marks_obtained !== null).length,
    passed: studentGrades.filter(g => {
      if (g.marks_obtained === null || !selectedAssessment) return false
      return (g.marks_obtained / selectedAssessment.max_marks) * 100 >= (selectedAssessment.pass_mark || 50)
    }).length,
    average: studentGrades.length > 0 && selectedAssessment
      ? Math.round(
          studentGrades
            .filter(g => g.marks_obtained !== null)
            .reduce((sum, g) => sum + ((g.marks_obtained || 0) / selectedAssessment.max_marks) * 100, 0) /
          (studentGrades.filter(g => g.marks_obtained !== null).length || 1)
        )
      : 0,
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 md:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Assessments</h1>
              <p className="mt-1 text-sm text-gray-500">Create assessments and record student marks</p>
            </div>
            {activeTab === 'assessments' && (
              <Button
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={() => {
                  resetAssessmentForm()
                  setShowAssessmentModal(true)
                }}
              >
                New Assessment
              </Button>
            )}
            {activeTab === 'grade' && selectedAssessment && (
              <div className="flex items-center gap-3">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setActiveTab('assessments')
                    setSelectedAssessment(null)
                  }}
                >
                  Cancel
                </Button>
                <Button
                  leftIcon={isSavingGrades ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  onClick={saveGrades}
                  disabled={isSavingGrades}
                >
                  {isSavingGrades ? 'Saving...' : 'Save Grades'}
                </Button>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-6 bg-gray-100 p-1 rounded-lg w-fit">
            <button
              onClick={() => {
                setActiveTab('assessments')
                setSelectedAssessment(null)
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'assessments'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <FileText className="w-4 h-4" />
              Assessments
            </button>
            {selectedAssessment && (
              <button
                onClick={() => setActiveTab('grade')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'grade'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Award className="w-4 h-4" />
                Enter Grades
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-6">
        {/* Assessments Tab */}
        {activeTab === 'assessments' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="w-48">
                  <Select
                    options={[
                      { value: '', label: 'All Courses' },
                      ...courses.map(c => ({ value: c.id, label: c.name }))
                    ]}
                    value={courseFilter}
                    onChange={(e) => {
                      setCourseFilter(e.target.value)
                      setCurrentPage(1)
                    }}
                  />
                </div>
                <div className="w-48">
                  <Select
                    options={[
                      { value: '', label: 'All Types' },
                      ...ASSESSMENT_TYPES
                    ]}
                    value={typeFilter}
                    onChange={(e) => {
                      setTypeFilter(e.target.value)
                      setCurrentPage(1)
                    }}
                  />
                </div>
                {(courseFilter || typeFilter) && (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setCourseFilter('')
                      setTypeFilter('')
                      setCurrentPage(1)
                    }}
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            </div>

            {/* Assessments List */}
            <div className="bg-white rounded-xl border border-gray-200">
              {isLoading ? (
                <div className="p-8 text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
                  <p className="mt-2 text-sm text-gray-500">Loading assessments...</p>
                </div>
              ) : assessments.length === 0 ? (
                <div className="p-12 text-center">
                  <Award className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No assessments yet</h3>
                  <p className="text-gray-500 mb-4">Create an assessment to start recording grades</p>
                  <Button
                    leftIcon={<Plus className="w-4 h-4" />}
                    onClick={() => {
                      resetAssessmentForm()
                      setShowAssessmentModal(true)
                    }}
                  >
                    New Assessment
                  </Button>
                </div>
              ) : (
                <>
                  <div className="divide-y divide-gray-100">
                    {assessments.map((assessment) => (
                      <div
                        key={assessment.id}
                        className="p-4 flex items-center justify-between hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-purple-100 rounded-lg">
                            <Award className="w-6 h-6 text-purple-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{assessment.name}</p>
                            <p className="text-sm text-gray-500">
                              {assessment.course?.name} • {getTypeLabel(assessment.assessment_type)}
                              {assessment.term && ` • ${assessment.term}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-sm text-right">
                            <p className="text-gray-900">
                              {new Date(assessment.assessment_date).toLocaleDateString('en-ZA')}
                            </p>
                            <p className="text-gray-500">
                              Max: {assessment.max_marks} marks
                            </p>
                          </div>
                          {assessment._count && (
                            <div className="text-sm text-right min-w-[80px]">
                              <p className="font-medium text-gray-900">
                                {assessment._count.graded}/{assessment._count.total} graded
                              </p>
                              {assessment._count.graded > 0 && (
                                <p className={`${
                                  (assessment._count.passed / assessment._count.graded) >= 0.5
                                    ? 'text-green-600'
                                    : 'text-red-600'
                                }`}>
                                  {assessment._count.passed} passed
                                </p>
                              )}
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openGrading(assessment)}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                              title="Enter Grades"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openEditAssessment(assessment)}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteModal({ open: true, assessment })}
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

        {/* Enter Grades Tab */}
        {activeTab === 'grade' && selectedAssessment && (
          <div className="space-y-6">
            {/* Assessment Info */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="font-semibold text-gray-900">{selectedAssessment.name}</h2>
                  <p className="text-sm text-gray-500">
                    {selectedAssessment.course?.name} • {getTypeLabel(selectedAssessment.assessment_type)}
                    • Max: {selectedAssessment.max_marks} marks • Pass: {selectedAssessment.pass_mark}%
                  </p>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full">
                    <BarChart3 className="w-4 h-4" />
                    {gradingStats.graded}/{gradingStats.total} graded
                  </span>
                  <span className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full">
                    <CheckCircle className="w-4 h-4" />
                    {gradingStats.passed} passed
                  </span>
                  <span className="flex items-center gap-2 px-3 py-1 bg-purple-100 text-purple-700 rounded-full">
                    Avg: {gradingStats.average}%
                  </span>
                </div>
              </div>
            </div>

            {/* Students List */}
            <div className="bg-white rounded-xl border border-gray-200">
              {isLoadingGrades ? (
                <div className="p-8 text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                  <p className="text-gray-500">Loading students...</p>
                </div>
              ) : studentGrades.length === 0 ? (
                <div className="p-12 text-center">
                  <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No students enrolled</h3>
                  <p className="text-gray-500">
                    No students are enrolled in this course
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Student</th>
                        <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                          Marks (/{selectedAssessment.max_marks})
                        </th>
                        <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">%</th>
                        <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Grade</th>
                        <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Feedback</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {studentGrades.map((sg) => {
                        const percentage = sg.marks_obtained !== null
                          ? Math.round((sg.marks_obtained / selectedAssessment.max_marks) * 100)
                          : null
                        const isPassing = percentage !== null && percentage >= selectedAssessment.pass_mark

                        return (
                          <tr key={sg.student_id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <p className="font-medium text-gray-900">{sg.student.full_name}</p>
                              <p className="text-sm text-gray-500">
                                {sg.student.student_number} {sg.student.current_level && `• Level ${sg.student.current_level}`}
                              </p>
                            </td>
                            <td className="px-6 py-4">
                              <input
                                type="number"
                                min="0"
                                max={selectedAssessment.max_marks}
                                step="0.5"
                                value={sg.marks_obtained ?? ''}
                                onChange={(e) => updateStudentGrade(
                                  sg.student_id,
                                  'marks_obtained',
                                  e.target.value === '' ? null : parseFloat(e.target.value)
                                )}
                                className="w-20 px-2 py-1 text-center border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none"
                                placeholder="-"
                              />
                            </td>
                            <td className="px-6 py-4">
                              {percentage !== null ? (
                                <span className={`font-medium ${isPassing ? 'text-green-600' : 'text-red-600'}`}>
                                  {percentage}%
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 text-sm font-medium rounded-full ${getGradeBadge(sg.grade)}`}>
                                {sg.grade || '-'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <input
                                type="text"
                                value={sg.feedback}
                                onChange={(e) => updateStudentGrade(sg.student_id, 'feedback', e.target.value)}
                                className="w-full px-2 py-1 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none"
                                placeholder="Optional feedback..."
                              />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Assessment Modal */}
      {showAssessmentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingAssessment ? 'Edit Assessment' : 'Create Assessment'}
              </h2>
              <button
                onClick={() => setShowAssessmentModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveAssessment} className="p-6 space-y-4">
              <Select
                label="Course"
                required
                value={assessmentForm.course_id}
                onChange={(e) => setAssessmentForm({ ...assessmentForm, course_id: e.target.value })}
                options={[
                  { value: '', label: 'Select Course' },
                  ...courses.map(c => ({ value: c.id, label: c.name }))
                ]}
              />
              <Input
                label="Assessment Name"
                required
                value={assessmentForm.name}
                onChange={(e) => setAssessmentForm({ ...assessmentForm, name: e.target.value })}
                placeholder="e.g., Semester 1 Test, Final Exam"
              />
              <Select
                label="Assessment Type"
                required
                value={assessmentForm.assessment_type}
                onChange={(e) => setAssessmentForm({ ...assessmentForm, assessment_type: e.target.value })}
                options={ASSESSMENT_TYPES}
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Max Marks"
                  type="number"
                  required
                  value={assessmentForm.max_marks}
                  onChange={(e) => setAssessmentForm({ ...assessmentForm, max_marks: parseFloat(e.target.value) || 100 })}
                />
                <Input
                  label="Pass Mark (%)"
                  type="number"
                  value={assessmentForm.pass_mark}
                  onChange={(e) => setAssessmentForm({ ...assessmentForm, pass_mark: parseFloat(e.target.value) || 50 })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Assessment Date"
                  type="date"
                  required
                  value={assessmentForm.assessment_date}
                  onChange={(e) => setAssessmentForm({ ...assessmentForm, assessment_date: e.target.value })}
                />
                <Input
                  label="Term/Semester"
                  value={assessmentForm.term}
                  onChange={(e) => setAssessmentForm({ ...assessmentForm, term: e.target.value })}
                  placeholder="e.g., Semester 1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                <textarea
                  value={assessmentForm.description}
                  onChange={(e) => setAssessmentForm({ ...assessmentForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none resize-none"
                  rows={2}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowAssessmentModal(false)}
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
                  {isSaving ? 'Saving...' : editingAssessment ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      <ConfirmModal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, assessment: null })}
        onConfirm={handleDeleteAssessment}
        title="Delete Assessment"
        message="Are you sure you want to delete this assessment? All associated grades will also be deleted. This action cannot be undone."
        confirmText="Delete"
        isLoading={isDeleting}
      />
    </div>
  )
}
