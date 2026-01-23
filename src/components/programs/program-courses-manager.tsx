'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/input'
import {
  Plus,
  Loader2,
  BookOpen,
  Trash2,
  GraduationCap,
  X,
  Check,
  AlertCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Course, ProgramCourse } from '@/types/database'

interface Props {
  programId: string
  programName: string
  institutionId: string
  durationYears: number | null
  onClose: () => void
}

interface ProgramCourseWithDetails extends ProgramCourse {
  course?: Course
}

export default function ProgramCoursesManager({
  programId,
  programName,
  institutionId,
  durationYears,
  onClose,
}: Props) {
  const [programCourses, setProgramCourses] = useState<ProgramCourseWithDetails[]>([])
  const [availableCourses, setAvailableCourses] = useState<Course[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Add course form state
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedYear, setSelectedYear] = useState(1)
  const [selectedSemester, setSelectedSemester] = useState(1)
  const [selectedCourseId, setSelectedCourseId] = useState('')
  const [isCompulsory, setIsCompulsory] = useState(true)

  const maxYears = durationYears || 4 // Default to 4 years if not set

  useEffect(() => {
    loadData()
  }, [programId])

  async function loadData() {
    setIsLoading(true)
    try {
      await Promise.all([loadProgramCourses(), loadAvailableCourses()])
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }

  async function loadProgramCourses() {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('program_courses')
      .select(`
        *,
        course:courses(*)
      `)
      .eq('program_id', programId)
      .order('year_of_study')
      .order('semester')

    if (error) throw error

    setProgramCourses(data as ProgramCourseWithDetails[])
  }

  async function loadAvailableCourses() {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('institution_id', institutionId)
      .eq('is_active', true)
      .order('name')

    if (error) throw error

    setAvailableCourses(data as Course[])
  }

  async function handleAddCourse(e: React.FormEvent) {
    e.preventDefault()

    if (!selectedCourseId) {
      toast.error('Please select a course')
      return
    }

    // Check if course is already linked
    if (programCourses.some(pc => pc.course_id === selectedCourseId)) {
      toast.error('This course is already linked to the program')
      return
    }

    setIsSaving(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('program_courses')
        .insert({
          institution_id: institutionId,
          program_id: programId,
          course_id: selectedCourseId,
          year_of_study: selectedYear,
          semester: selectedSemester,
          is_compulsory: isCompulsory,
        } as never)

      if (error) throw error

      await loadProgramCourses()
      setShowAddForm(false)
      setSelectedCourseId('')
      toast.success('Course added to program')
    } catch (error) {
      console.error('Error adding course:', error)
      toast.error('Failed to add course')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleRemoveCourse(id: string) {
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('program_courses')
        .delete()
        .eq('id', id)

      if (error) throw error

      await loadProgramCourses()
      toast.success('Course removed from program')
    } catch (error) {
      console.error('Error removing course:', error)
      toast.error('Failed to remove course')
    }
  }

  async function handleUpdateCourse(id: string, updates: Partial<ProgramCourse>) {
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('program_courses')
        .update(updates as never)
        .eq('id', id)

      if (error) throw error

      await loadProgramCourses()
      toast.success('Course updated')
    } catch (error) {
      console.error('Error updating course:', error)
      toast.error('Failed to update course')
    }
  }

  // Get courses not yet linked to this program
  const unlinkedCourses = availableCourses.filter(
    course => !programCourses.some(pc => pc.course_id === course.id)
  )

  // Group program courses by year
  const coursesByYear: Record<number, ProgramCourseWithDetails[]> = {}
  for (let year = 1; year <= maxYears; year++) {
    coursesByYear[year] = programCourses.filter(pc => pc.year_of_study === year)
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading courses...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <GraduationCap className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Program Courses</h2>
              <p className="text-sm text-gray-500">{programName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Add Course Button */}
          {!showAddForm && (
            <div className="mb-6">
              <Button
                onClick={() => setShowAddForm(true)}
                leftIcon={<Plus className="w-4 h-4" />}
                disabled={unlinkedCourses.length === 0}
              >
                Add Course
              </Button>
              {unlinkedCourses.length === 0 && (
                <p className="text-sm text-gray-500 mt-2">
                  All available courses are already linked to this program.
                </p>
              )}
            </div>
          )}

          {/* Add Course Form */}
          {showAddForm && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="font-medium text-gray-900 mb-4">Add Course to Program</h3>
              <form onSubmit={handleAddCourse} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Select Course
                    </label>
                    <select
                      value={selectedCourseId}
                      onChange={(e) => setSelectedCourseId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Choose a course...</option>
                      {unlinkedCourses.map((course) => (
                        <option key={course.id} value={course.id}>
                          {course.course_code ? `${course.course_code} - ` : ''}{course.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Select
                      label="Year of Study"
                      value={selectedYear.toString()}
                      onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                      options={Array.from({ length: maxYears }, (_, i) => ({
                        value: (i + 1).toString(),
                        label: `Year ${i + 1}`,
                      }))}
                    />
                    <Select
                      label="Semester"
                      value={selectedSemester.toString()}
                      onChange={(e) => setSelectedSemester(parseInt(e.target.value))}
                      options={[
                        { value: '1', label: 'Semester 1' },
                        { value: '2', label: 'Semester 2' },
                      ]}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_compulsory"
                    checked={isCompulsory}
                    onChange={(e) => setIsCompulsory(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="is_compulsory" className="text-sm text-gray-700">
                    Compulsory course (core)
                  </label>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={isSaving || !selectedCourseId}
                    leftIcon={isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  >
                    {isSaving ? 'Adding...' : 'Add Course'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowAddForm(false)
                      setSelectedCourseId('')
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Courses by Year */}
          {programCourses.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No courses linked</h3>
              <p className="text-gray-500">
                Add courses to define the curriculum for each year of study.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {Array.from({ length: maxYears }, (_, i) => i + 1).map((year) => {
                const yearCourses = coursesByYear[year] || []
                const semester1Courses = yearCourses.filter(c => c.semester === 1)
                const semester2Courses = yearCourses.filter(c => c.semester === 2)

                return (
                  <div key={year} className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                      <h3 className="font-medium text-gray-900">Year {year}</h3>
                      <p className="text-sm text-gray-500">
                        {yearCourses.length} course{yearCourses.length !== 1 ? 's' : ''}
                      </p>
                    </div>

                    {yearCourses.length === 0 ? (
                      <div className="p-4 text-center text-gray-500 text-sm">
                        No courses added for Year {year}
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {/* Semester 1 */}
                        {semester1Courses.length > 0 && (
                          <div className="p-4">
                            <p className="text-xs font-medium text-gray-500 uppercase mb-2">Semester 1</p>
                            <div className="space-y-2">
                              {semester1Courses.map((pc) => (
                                <CourseRow
                                  key={pc.id}
                                  programCourse={pc}
                                  maxYears={maxYears}
                                  onUpdate={handleUpdateCourse}
                                  onRemove={handleRemoveCourse}
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Semester 2 */}
                        {semester2Courses.length > 0 && (
                          <div className="p-4">
                            <p className="text-xs font-medium text-gray-500 uppercase mb-2">Semester 2</p>
                            <div className="space-y-2">
                              {semester2Courses.map((pc) => (
                                <CourseRow
                                  key={pc.id}
                                  programCourse={pc}
                                  maxYears={maxYears}
                                  onUpdate={handleUpdateCourse}
                                  onRemove={handleRemoveCourse}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Info Box */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <div className="text-sm text-blue-700">
                <p className="font-medium">About Program Courses</p>
                <ul className="mt-2 space-y-1 list-disc list-inside">
                  <li>Courses linked here will be shown when registering students for this program.</li>
                  <li>When a student registers for Year 1, they will see Year 1 courses automatically.</li>
                  <li>Compulsory courses are required; electives are optional.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100">
          <Button onClick={onClose} variant="outline" className="w-full">
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}

// Individual course row component
interface CourseRowProps {
  programCourse: ProgramCourseWithDetails
  maxYears: number
  onUpdate: (id: string, updates: Partial<ProgramCourse>) => Promise<void>
  onRemove: (id: string) => Promise<void>
}

function CourseRow({ programCourse, maxYears, onUpdate, onRemove }: CourseRowProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editYear, setEditYear] = useState(programCourse.year_of_study)
  const [editSemester, setEditSemester] = useState(programCourse.semester)
  const [editCompulsory, setEditCompulsory] = useState(programCourse.is_compulsory)
  const [isDeleting, setIsDeleting] = useState(false)

  const course = programCourse.course

  async function handleSave() {
    await onUpdate(programCourse.id, {
      year_of_study: editYear,
      semester: editSemester,
      is_compulsory: editCompulsory,
    })
    setIsEditing(false)
  }

  async function handleDelete() {
    setIsDeleting(true)
    await onRemove(programCourse.id)
  }

  return (
    <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-50 rounded">
          <BookOpen className="w-4 h-4 text-blue-600" />
        </div>
        <div>
          <p className="font-medium text-gray-900">
            {course?.course_code && <span className="text-gray-500">{course.course_code} - </span>}
            {course?.name || 'Unknown Course'}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`px-2 py-0.5 text-xs font-medium rounded ${
              programCourse.is_compulsory
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-600'
            }`}>
              {programCourse.is_compulsory ? 'Core' : 'Elective'}
            </span>
            {course?.credits && (
              <span className="text-xs text-gray-500">{course.credits} credits</span>
            )}
          </div>
        </div>
      </div>

      {isEditing ? (
        <div className="flex items-center gap-2">
          <select
            value={editYear}
            onChange={(e) => setEditYear(parseInt(e.target.value))}
            className="px-2 py-1 text-sm border border-gray-300 rounded"
          >
            {Array.from({ length: maxYears }, (_, i) => (
              <option key={i + 1} value={i + 1}>Year {i + 1}</option>
            ))}
          </select>
          <select
            value={editSemester}
            onChange={(e) => setEditSemester(parseInt(e.target.value))}
            className="px-2 py-1 text-sm border border-gray-300 rounded"
          >
            <option value={1}>Sem 1</option>
            <option value={2}>Sem 2</option>
          </select>
          <label className="flex items-center gap-1 text-sm">
            <input
              type="checkbox"
              checked={editCompulsory}
              onChange={(e) => setEditCompulsory(e.target.checked)}
              className="h-3 w-3"
            />
            Core
          </label>
          <button
            onClick={handleSave}
            className="p-1 text-green-600 hover:bg-green-50 rounded"
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsEditing(false)}
            className="p-1 text-gray-400 hover:bg-gray-100 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsEditing(true)}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
            title="Edit"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
            title="Remove"
          >
            {isDeleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </button>
        </div>
      )}
    </div>
  )
}
