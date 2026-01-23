'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/input'
import {
  FileText,
  Search,
  Download,
  Loader2,
  GraduationCap,
  Users,
  Calendar,
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
  Printer,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { nqfLevels, qualificationTypes } from '@/config/terminology'

interface Student {
  id: string
  full_name: string
  student_number: string | null
  email: string | null
  current_level: number | null
  status: string
  registration_date: string
  program?: {
    id: string
    name: string
    program_code: string | null
    qualification_type: string | null
    nqf_level: number | null
  } | null
}

interface CourseResult {
  course_id: string
  course_name: string
  course_code: string | null
  nqf_level: number | null
  credits: number | null
  assessments: {
    name: string
    marks_obtained: number | null
    max_marks: number
    percentage: number | null
    grade: string | null
  }[]
  final_mark: number | null
  final_grade: string | null
  status: 'pass' | 'fail' | 'in_progress'
}

const ITEMS_PER_PAGE = 20

export default function TranscriptsPage() {
  const { user } = useAuthStore()
  const [isLoading, setIsLoading] = useState(true)
  const [students, setStudents] = useState<Student[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [programFilter, setProgramFilter] = useState('')

  // Programs for filter
  const [programs, setPrograms] = useState<{ id: string; name: string }[]>([])

  // Transcript view state
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [courseResults, setCourseResults] = useState<CourseResult[]>([])
  const [isLoadingTranscript, setIsLoadingTranscript] = useState(false)

  useEffect(() => {
    if (user?.institution_id) {
      fetchPrograms()
      fetchStudents()
    }
  }, [user?.institution_id, currentPage, searchQuery, statusFilter, programFilter])

  async function fetchPrograms() {
    if (!user?.institution_id) return
    const supabase = createClient()
    const { data } = await supabase
      .from('programs')
      .select('id, name')
      .eq('institution_id', user.institution_id)
      .eq('is_active', true)
      .order('name')
    setPrograms((data || []) as { id: string; name: string }[])
  }

  async function fetchStudents() {
    if (!user?.institution_id) return
    setIsLoading(true)
    const supabase = createClient()

    try {
      // First get students
      let query = supabase
        .from('students')
        .select(`
          id, full_name, student_number, email, current_level, status, registration_date
        `, { count: 'exact' })
        .eq('institution_id', user.institution_id)
        .order('full_name')

      if (searchQuery) {
        query = query.or(`full_name.ilike.%${searchQuery}%,student_number.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
      }
      if (statusFilter) {
        query = query.eq('status', statusFilter)
      }

      const from = (currentPage - 1) * ITEMS_PER_PAGE
      query = query.range(from, from + ITEMS_PER_PAGE - 1)

      const { data: studentsData, count, error } = await query

      if (error) throw error

      // Then get program enrollments for these students
      const studentIds = (studentsData || []).map((s: any) => s.id)

      let studentsWithPrograms: any[] = studentsData || []

      if (studentIds.length > 0) {
        const { data: enrollmentsData } = await supabase
          .from('program_enrollments')
          .select(`
            student_id,
            program:programs(id, name, program_code, qualification_type, nqf_level)
          `)
          .in('student_id', studentIds)
          .eq('status', 'enrolled')

        const enrollments = (enrollmentsData || []) as Array<{
          student_id: string
          program: { id: string; name: string; program_code: string | null; qualification_type: string | null; nqf_level: number | null } | null
        }>

        // Merge program data with students
        studentsWithPrograms = (studentsData || []).map((student: any) => {
          const enrollment = enrollments.find((e) => e.student_id === student.id)
          return {
            ...student,
            program: enrollment?.program || null
          }
        })

        // Filter by program if specified
        if (programFilter) {
          studentsWithPrograms = studentsWithPrograms.filter(
            (s: any) => s.program?.id === programFilter
          )
        }
      }

      setStudents(studentsWithPrograms as Student[])
      setTotalCount(programFilter ? studentsWithPrograms.length : (count || 0))
    } catch (error) {
      console.error('Error fetching students:', error)
      toast.error('Failed to load students')
    } finally {
      setIsLoading(false)
    }
  }

  async function viewTranscript(student: Student) {
    setSelectedStudent(student)
    setIsLoadingTranscript(true)
    const supabase = createClient()

    try {
      // Get student's course enrollments
      const { data: enrollments } = await supabase
        .from('student_enrollments')
        .select(`
          course_id,
          course:courses(id, name, code, course_code, nqf_level, credits)
        `)
        .eq('student_id', student.id)

      if (!enrollments || enrollments.length === 0) {
        setCourseResults([])
        setIsLoadingTranscript(false)
        return
      }

      // Get grades for all assessments for this student
      const { data: grades } = await supabase
        .from('student_grades')
        .select(`
          marks_obtained, percentage, grade,
          assessment:assessments(id, name, course_id, max_marks)
        `)
        .eq('student_id', student.id)

      // Build course results
      const results: CourseResult[] = enrollments.map((enrollment: any) => {
        const course = enrollment.course
        if (!course) return null

        // Get all grades for this course
        const courseGrades = (grades || []).filter(
          (g: any) => g.assessment?.course_id === course.id
        )

        const assessments = courseGrades.map((g: any) => ({
          name: g.assessment?.name || 'Unknown',
          marks_obtained: g.marks_obtained,
          max_marks: g.assessment?.max_marks || 100,
          percentage: g.percentage,
          grade: g.grade,
        }))

        // Calculate final mark (average of all assessments)
        const gradedAssessments = assessments.filter((a: any) => a.percentage !== null)
        const finalMark = gradedAssessments.length > 0
          ? Math.round(gradedAssessments.reduce((sum: number, a: any) => sum + (a.percentage || 0), 0) / gradedAssessments.length)
          : null

        // Determine final grade
        const finalGrade = finalMark !== null ? calculateGrade(finalMark) : null

        // Determine status
        let status: 'pass' | 'fail' | 'in_progress' = 'in_progress'
        if (finalMark !== null) {
          status = finalMark >= 50 ? 'pass' : 'fail'
        }

        return {
          course_id: course.id,
          course_name: course.name,
          course_code: course.course_code || course.code,
          nqf_level: course.nqf_level,
          credits: course.credits,
          assessments,
          final_mark: finalMark,
          final_grade: finalGrade,
          status,
        }
      }).filter(Boolean) as CourseResult[]

      setCourseResults(results)
    } catch (error) {
      console.error('Error loading transcript:', error)
      toast.error('Failed to load transcript')
    } finally {
      setIsLoadingTranscript(false)
    }
  }

  function calculateGrade(percentage: number): string {
    if (percentage >= 80) return 'A'
    if (percentage >= 70) return 'B'
    if (percentage >= 60) return 'C'
    if (percentage >= 50) return 'D'
    if (percentage >= 40) return 'E'
    if (percentage >= 30) return 'F'
    return 'G'
  }

  function getStatusBadge(status: string) {
    const styles: Record<string, string> = {
      active: 'bg-green-100 text-green-700',
      inactive: 'bg-gray-100 text-gray-700',
      graduated: 'bg-blue-100 text-blue-700',
      withdrawn: 'bg-red-100 text-red-700',
    }
    return styles[status] || styles.inactive
  }

  function getResultBadge(status: string) {
    const styles: Record<string, string> = {
      pass: 'bg-green-100 text-green-700',
      fail: 'bg-red-100 text-red-700',
      in_progress: 'bg-amber-100 text-amber-700',
    }
    return styles[status] || styles.in_progress
  }

  function getQualificationLabel(type: string | null): string {
    if (!type) return ''
    const qual = qualificationTypes.find(q => q.value === type)
    return qual?.label || type
  }

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)

  // Calculate transcript summary
  const transcriptSummary = {
    totalCourses: courseResults.length,
    passed: courseResults.filter(c => c.status === 'pass').length,
    failed: courseResults.filter(c => c.status === 'fail').length,
    inProgress: courseResults.filter(c => c.status === 'in_progress').length,
    totalCredits: courseResults.reduce((sum, c) => sum + (c.status === 'pass' ? (c.credits || 0) : 0), 0),
    gpa: courseResults.filter(c => c.final_mark !== null).length > 0
      ? (courseResults
          .filter(c => c.final_mark !== null)
          .reduce((sum, c) => sum + (c.final_mark || 0), 0) /
          courseResults.filter(c => c.final_mark !== null).length).toFixed(1)
      : 'N/A',
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 md:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Transcripts</h1>
              <p className="mt-1 text-sm text-gray-500">View and generate student academic transcripts</p>
            </div>
            {selectedStudent && (
              <Button
                variant="secondary"
                onClick={() => {
                  setSelectedStudent(null)
                  setCourseResults([])
                }}
              >
                Back to Students
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-6">
        {!selectedStudent ? (
          /* Student List View */
          <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name, student number, or email..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      setCurrentPage(1)
                    }}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="w-40">
                  <Select
                    options={[
                      { value: '', label: 'All Status' },
                      { value: 'active', label: 'Active' },
                      { value: 'graduated', label: 'Graduated' },
                      { value: 'withdrawn', label: 'Withdrawn' },
                    ]}
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value)
                      setCurrentPage(1)
                    }}
                  />
                </div>
                <div className="w-48">
                  <Select
                    options={[
                      { value: '', label: 'All Programs' },
                      ...programs.map(p => ({ value: p.id, label: p.name }))
                    ]}
                    value={programFilter}
                    onChange={(e) => {
                      setProgramFilter(e.target.value)
                      setCurrentPage(1)
                    }}
                  />
                </div>
                {(searchQuery || statusFilter || programFilter) && (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setSearchQuery('')
                      setStatusFilter('')
                      setProgramFilter('')
                      setCurrentPage(1)
                    }}
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>

            {/* Students List */}
            <div className="bg-white rounded-xl border border-gray-200">
              {isLoading ? (
                <div className="p-8 text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
                  <p className="mt-2 text-sm text-gray-500">Loading students...</p>
                </div>
              ) : students.length === 0 ? (
                <div className="p-12 text-center">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No students found</h3>
                  <p className="text-gray-500">
                    {searchQuery || statusFilter || programFilter
                      ? 'Try adjusting your filters'
                      : 'No students have been registered yet'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="divide-y divide-gray-100">
                    {students.map((student) => (
                      <div
                        key={student.id}
                        className="p-4 flex items-center justify-between hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-blue-100 rounded-lg">
                            <GraduationCap className="w-6 h-6 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{student.full_name}</p>
                            <p className="text-sm text-gray-500">
                              {student.student_number || 'No student number'}
                              {student.program && ` • ${student.program.name}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getStatusBadge(student.status)}`}>
                            {student.status}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            leftIcon={<Eye className="w-4 h-4" />}
                            onClick={() => viewTranscript(student)}
                          >
                            View Transcript
                          </Button>
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
        ) : (
          /* Transcript View */
          <div className="space-y-6">
            {/* Student Info Header */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-blue-100 rounded-xl">
                    <GraduationCap className="w-8 h-8 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">{selectedStudent.full_name}</h2>
                    <p className="text-gray-500">
                      {selectedStudent.student_number}
                      {selectedStudent.program && ` • ${selectedStudent.program.name}`}
                    </p>
                    {selectedStudent.program?.qualification_type && (
                      <p className="text-sm text-gray-500">
                        {getQualificationLabel(selectedStudent.program.qualification_type)}
                        {selectedStudent.program.nqf_level && ` • NQF Level ${selectedStudent.program.nqf_level}`}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    leftIcon={<Printer className="w-4 h-4" />}
                    onClick={() => window.print()}
                  >
                    Print
                  </Button>
                  <Button
                    variant="outline"
                    leftIcon={<Download className="w-4 h-4" />}
                    onClick={() => toast.success('PDF generation coming soon')}
                  >
                    Download PDF
                  </Button>
                </div>
              </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-sm text-gray-500">Total Courses</p>
                <p className="text-2xl font-semibold text-gray-900">{transcriptSummary.totalCourses}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-sm text-gray-500">Passed</p>
                <p className="text-2xl font-semibold text-green-600">{transcriptSummary.passed}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-sm text-gray-500">Failed</p>
                <p className="text-2xl font-semibold text-red-600">{transcriptSummary.failed}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-sm text-gray-500">Credits Earned</p>
                <p className="text-2xl font-semibold text-blue-600">{transcriptSummary.totalCredits}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-sm text-gray-500">Average %</p>
                <p className="text-2xl font-semibold text-purple-600">{transcriptSummary.gpa}%</p>
              </div>
            </div>

            {/* Course Results */}
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="p-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">Academic Record</h3>
              </div>
              {isLoadingTranscript ? (
                <div className="p-8 text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
                  <p className="mt-2 text-sm text-gray-500">Loading transcript...</p>
                </div>
              ) : courseResults.length === 0 ? (
                <div className="p-12 text-center">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No academic records</h3>
                  <p className="text-gray-500">This student is not enrolled in any courses yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Course</th>
                        <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Code</th>
                        <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">NQF</th>
                        <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">Credits</th>
                        <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">Final %</th>
                        <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">Grade</th>
                        <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {courseResults.map((result) => (
                        <tr key={result.course_id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <p className="font-medium text-gray-900">{result.course_name}</p>
                            <p className="text-xs text-gray-500">
                              {result.assessments.length} assessment(s)
                            </p>
                          </td>
                          <td className="px-6 py-4 text-gray-600">{result.course_code || '-'}</td>
                          <td className="px-6 py-4 text-center text-gray-600">{result.nqf_level || '-'}</td>
                          <td className="px-6 py-4 text-center text-gray-600">{result.credits || '-'}</td>
                          <td className="px-6 py-4 text-center">
                            {result.final_mark !== null ? (
                              <span className={`font-medium ${result.final_mark >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                                {result.final_mark}%
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            {result.final_grade ? (
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                ['A', 'B', 'C'].includes(result.final_grade)
                                  ? 'bg-green-100 text-green-700'
                                  : result.final_grade === 'D'
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-red-100 text-red-700'
                              }`}>
                                {result.final_grade}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getResultBadge(result.status)}`}>
                              {result.status === 'in_progress' ? 'In Progress' : result.status.charAt(0).toUpperCase() + result.status.slice(1)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
