'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/input'
import {
  Plus,
  Loader2,
  BookOpen,
  Trash2,
  GraduationCap,
  X,
  Check,
  AlertCircle,
  PlusCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Course, ProgramCourse } from '@/types/database'
import { nqfLevels } from '@/config/terminology'

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

  // Create new course inline state
  const [showCreateCourse, setShowCreateCourse] = useState(false)
  const [isCreatingCourse, setIsCreatingCourse] = useState(false)
  const [newCourseData, setNewCourseData] = useState({
    name: '',
    course_code: '',
    credits: 0,
    nqf_level: 0,
    description: '',
  })

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

  async function handleCreateAndAddCourse(e: React.FormEvent) {
    e.preventDefault()

    if (!newCourseData.name.trim()) {
      toast.error('Please enter a course name')
      return
    }

    setIsCreatingCourse(true)
    const supabase = createClient()

    try {
      // Step 1: Create the new course
      const { data: newCourse, error: createError } = await supabase
        .from('courses')
        .insert({
          institution_id: institutionId,
          name: newCourseData.name.trim(),
          course_code: newCourseData.course_code.trim().toUpperCase() || null,
          credits: newCourseData.credits || null,
          nqf_level: newCourseData.nqf_level || null,
          description: newCourseData.description.trim() || null,
          is_active: true,
          monthly_fee: 0,
          total_course_fee: 0,
          allow_installments: false,
          default_installments: 1,
        } as never)
        .select('id')
        .single()

      if (createError) throw createError
      if (!newCourse) throw new Error('Failed to create course')

      // Step 2: Link the new course to this program
      const { error: linkError } = await supabase
        .from('program_courses')
        .insert({
          institution_id: institutionId,
          program_id: programId,
          course_id: (newCourse as { id: string }).id,
          year_of_study: selectedYear,
          semester: selectedSemester,
          is_compulsory: isCompulsory,
        } as never)

      if (linkError) throw linkError

      // Refresh data
      await Promise.all([loadProgramCourses(), loadAvailableCourses()])

      // Reset form
      setShowCreateCourse(false)
      setShowAddForm(false)
      setNewCourseData({
        name: '',
        course_code: '',
        credits: 0,
        nqf_level: 0,
        description: '',
      })

      toast.success(`Course "${newCourseData.name}" created and added to program`)
    } catch (error) {
      console.error('Error creating course:', error)
      toast.error('Failed to create course')
    } finally {
      setIsCreatingCourse(false)
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
    } catch (error) {
      console.error('Error updating program course:', error)
      toast.error('Failed to update')
      throw error
    }
  }

  async function handleUpdateCourseDetails(courseId: string, updates: { name: string; course_code: string | null; credits: number | null }) {
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('courses')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        } as never)
        .eq('id', courseId)

      if (error) throw error

      // Refresh the data to show updated course name
      await loadProgramCourses()
      toast.success('Course updated')
    } catch (error) {
      console.error('Error updating course details:', error)
      toast.error('Failed to update course')
      throw error
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
              >
                Add Course
              </Button>
            </div>
          )}

          {/* Add Course Form */}
          {showAddForm && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="font-medium text-gray-900 mb-4">Add Course to Program</h3>

              {/* Toggle between Select Existing and Create New */}
              <div className="flex gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setShowCreateCourse(false)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    !showCreateCourse
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Select Existing
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateCourse(true)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                    showCreateCourse
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <PlusCircle className="w-4 h-4" />
                  Create New
                </button>
              </div>

              {/* Select Existing Course Form */}
              {!showCreateCourse && (
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
                      {unlinkedCourses.length === 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          No available courses. Click &quot;Create New&quot; to add one.
                        </p>
                      )}
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
                        setShowCreateCourse(false)
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}

              {/* Create New Course Form */}
              {showCreateCourse && (
                <form onSubmit={handleCreateAndAddCourse} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Course Name"
                      required
                      value={newCourseData.name}
                      onChange={(e) => setNewCourseData({ ...newCourseData, name: e.target.value })}
                      placeholder="e.g., Introduction to Mathematics"
                    />
                    <Input
                      label="Course Code"
                      value={newCourseData.course_code}
                      onChange={(e) => setNewCourseData({ ...newCourseData, course_code: e.target.value.toUpperCase() })}
                      placeholder="e.g., MATH101"
                      maxLength={10}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Select
                      label="NQF Level"
                      value={newCourseData.nqf_level.toString()}
                      onChange={(e) => setNewCourseData({ ...newCourseData, nqf_level: parseInt(e.target.value) || 0 })}
                      options={[
                        { value: '0', label: 'Select level...' },
                        ...nqfLevels.map(l => ({
                          value: l.level.toString(),
                          label: `Level ${l.level} - ${l.name}`,
                        })),
                      ]}
                    />
                    <Input
                      label="Credits"
                      type="number"
                      value={newCourseData.credits || ''}
                      onChange={(e) => setNewCourseData({ ...newCourseData, credits: parseInt(e.target.value) || 0 })}
                      placeholder="e.g., 12"
                    />
                    <Select
                      label="Year of Study"
                      value={selectedYear.toString()}
                      onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                      options={Array.from({ length: maxYears }, (_, i) => ({
                        value: (i + 1).toString(),
                        label: `Year ${i + 1}`,
                      }))}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select
                      label="Semester"
                      value={selectedSemester.toString()}
                      onChange={(e) => setSelectedSemester(parseInt(e.target.value))}
                      options={[
                        { value: '1', label: 'Semester 1' },
                        { value: '2', label: 'Semester 2' },
                      ]}
                    />
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description (Optional)
                      </label>
                      <input
                        type="text"
                        value={newCourseData.description}
                        onChange={(e) => setNewCourseData({ ...newCourseData, description: e.target.value })}
                        placeholder="Brief description..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="is_compulsory_new"
                      checked={isCompulsory}
                      onChange={(e) => setIsCompulsory(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="is_compulsory_new" className="text-sm text-gray-700">
                      Compulsory course (core)
                    </label>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                    <p>This will create a new course and automatically add it to this program.</p>
                    <p className="text-xs mt-1 text-blue-600">You can edit additional course details (fees, duration, etc.) later in the Courses section.</p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      disabled={isCreatingCourse || !newCourseData.name.trim()}
                      leftIcon={isCreatingCourse ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
                    >
                      {isCreatingCourse ? 'Creating...' : 'Create & Add Course'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowAddForm(false)
                        setShowCreateCourse(false)
                        setNewCourseData({
                          name: '',
                          course_code: '',
                          credits: 0,
                          nqf_level: 0,
                          description: '',
                        })
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
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
                                  onUpdateCourse={handleUpdateCourseDetails}
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
                                  onUpdateCourse={handleUpdateCourseDetails}
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
  onUpdateCourse: (courseId: string, updates: { name: string; course_code: string | null; credits: number | null }) => Promise<void>
}

function CourseRow({ programCourse, maxYears, onUpdate, onRemove, onUpdateCourse }: CourseRowProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editYear, setEditYear] = useState(programCourse.year_of_study)
  const [editSemester, setEditSemester] = useState(programCourse.semester)
  const [editCompulsory, setEditCompulsory] = useState(programCourse.is_compulsory)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Course details editing
  const [editCourseName, setEditCourseName] = useState(programCourse.course?.name || '')
  const [editCourseCode, setEditCourseCode] = useState(programCourse.course?.course_code || '')
  const [editCourseCredits, setEditCourseCredits] = useState(programCourse.course?.credits || 0)

  const course = programCourse.course

  function startEditing() {
    setEditYear(programCourse.year_of_study)
    setEditSemester(programCourse.semester)
    setEditCompulsory(programCourse.is_compulsory)
    setEditCourseName(course?.name || '')
    setEditCourseCode(course?.course_code || '')
    setEditCourseCredits(course?.credits || 0)
    setIsEditing(true)
  }

  async function handleSave() {
    if (!editCourseName.trim()) {
      toast.error('Course name is required')
      return
    }

    setIsSaving(true)
    try {
      // Update program-course relationship
      await onUpdate(programCourse.id, {
        year_of_study: editYear,
        semester: editSemester,
        is_compulsory: editCompulsory,
      })

      // Update course details if they changed
      if (course && (
        editCourseName !== course.name ||
        editCourseCode !== (course.course_code || '') ||
        editCourseCredits !== (course.credits || 0)
      )) {
        await onUpdateCourse(course.id, {
          name: editCourseName.trim(),
          course_code: editCourseCode.trim().toUpperCase() || null,
          credits: editCourseCredits || null,
        })
      }

      setIsEditing(false)
    } catch (error) {
      console.error('Error saving:', error)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    setIsDeleting(true)
    await onRemove(programCourse.id)
  }

  return (
    <div className={`p-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors ${isEditing ? 'ring-2 ring-blue-200' : ''}`}>
      {isEditing ? (
        <div className="space-y-3">
          {/* Course Details */}
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Course Name</label>
              <input
                type="text"
                value={editCourseName}
                onChange={(e) => setEditCourseName(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Course name"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Code</label>
              <input
                type="text"
                value={editCourseCode}
                onChange={(e) => setEditCourseCode(e.target.value.toUpperCase())}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="CODE"
                maxLength={10}
              />
            </div>
          </div>

          {/* Program Relationship */}
          <div className="flex items-center gap-2 flex-wrap">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Year</label>
              <select
                value={editYear}
                onChange={(e) => setEditYear(parseInt(e.target.value))}
                className="px-2 py-1.5 text-sm border border-gray-300 rounded"
              >
                {Array.from({ length: maxYears }, (_, i) => (
                  <option key={i + 1} value={i + 1}>Year {i + 1}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Semester</label>
              <select
                value={editSemester}
                onChange={(e) => setEditSemester(parseInt(e.target.value))}
                className="px-2 py-1.5 text-sm border border-gray-300 rounded"
              >
                <option value={1}>Sem 1</option>
                <option value={2}>Sem 2</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Credits</label>
              <input
                type="number"
                value={editCourseCredits || ''}
                onChange={(e) => setEditCourseCredits(parseInt(e.target.value) || 0)}
                className="w-20 px-2 py-1.5 text-sm border border-gray-300 rounded"
                placeholder="0"
              />
            </div>
            <div className="pt-5">
              <label className="flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={editCompulsory}
                  onChange={(e) => setEditCompulsory(e.target.checked)}
                  className="h-4 w-4 rounded"
                />
                Core
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              onClick={() => setIsEditing(false)}
              disabled={isSaving}
              className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !editCourseName.trim()}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
            >
              {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
              Save
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
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

          <div className="flex items-center gap-1">
            <button
              onClick={startEditing}
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
              title="Edit course"
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
        </div>
      )}
    </div>
  )
}
