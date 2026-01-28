'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/input'
import { ConfirmModal } from '@/components/ui/modal'
import {
  BookOpen,
  Plus,
  Search,
  Pencil,
  Trash2,
  Users,
  DollarSign,
  Save,
  X,
  Loader2,
  Check,
  Sparkles,
  CheckCircle,
  XCircle,
  GraduationCap,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { formatCurrency } from '@/lib/currency'
import { nqfLevels } from '@/config/terminology'
import { parseNumericInput, parseIntegerInput, formatNumericValue } from '@/lib/numeric-input'
import { FeeModelType } from '@/types/database'

// Default courses for VTCs and similar institutions
const DEFAULT_COURSES = [
  { name: 'Welding and Metal Fabrication', code: 'WMF', description: 'Welding techniques and metal fabrication skills', nqf_level: 3 },
  { name: 'Automotive Mechanics', code: 'AMC', description: 'Vehicle maintenance and repair', nqf_level: 3 },
  { name: 'Plumbing', code: 'PLB', description: 'Plumbing installation and maintenance', nqf_level: 3 },
  { name: 'Electrical Installation', code: 'ELC', description: 'Electrical wiring and installation', nqf_level: 3 },
  { name: 'Carpentry and Joinery', code: 'CJY', description: 'Woodworking and furniture making', nqf_level: 3 },
  { name: 'Bricklaying and Plastering', code: 'BLP', description: 'Masonry and plastering skills', nqf_level: 3 },
  { name: 'Office Administration', code: 'OFA', description: 'Office management and administrative skills', nqf_level: 4 },
  { name: 'Information Technology', code: 'ICT', description: 'Computer skills and IT fundamentals', nqf_level: 4 },
  { name: 'Hospitality and Tourism', code: 'HTO', description: 'Hospitality industry skills', nqf_level: 4 },
  { name: 'Agriculture', code: 'AGR', description: 'Agricultural practices and farm management', nqf_level: 3 },
  { name: 'Business Studies', code: 'BUS', description: 'Business management fundamentals', nqf_level: 4 },
  { name: 'Hairdressing and Cosmetology', code: 'HDC', description: 'Hair styling and beauty therapy', nqf_level: 3 },
]

interface Course {
  id: string
  name: string
  code: string | null
  course_code: string | null
  description: string | null
  monthly_fee: number
  nqf_level: number | null
  credits: number | null
  duration_months: number | null
  is_active: boolean
  created_at: string
  // Lump sum fee fields
  total_course_fee: number
  allow_installments: boolean
  default_installments: number
  _count?: {
    students: number
    lecturers: number
  }
}

interface Program {
  id: string
  name: string
  duration_years: number | null
}

export default function CoursesPage() {
  const { user, isInstitutionAdmin } = useAuthStore()
  const canEdit = isInstitutionAdmin()
  const [courses, setCourses] = useState<Course[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isInitializing, setIsInitializing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [feeModel, setFeeModel] = useState<FeeModelType>('monthly_per_course')

  // Modal states
  const [showModal, setShowModal] = useState(false)
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    course_code: '',
    description: '',
    monthly_fee: 0,
    nqf_level: 0,
    credits: 0,
    duration_months: 0,
    is_active: true,
    // Lump sum fields
    total_course_fee: 0,
    allow_installments: true,
    default_installments: 1,
  })

  // Program linking state
  const [programs, setPrograms] = useState<Program[]>([])
  const [selectedProgramId, setSelectedProgramId] = useState('')
  const [selectedYear, setSelectedYear] = useState(1)
  const [selectedSemester, setSelectedSemester] = useState(1)
  const [isCompulsory, setIsCompulsory] = useState(true)

  // Delete modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Toggle loading state
  const [togglingId, setTogglingId] = useState<string | null>(null)

  useEffect(() => {
    initializeAndFetchCourses()
    fetchPrograms()
  }, [user?.institution_id])

  async function fetchPrograms() {
    if (!user?.institution_id) return
    const supabase = createClient()
    const { data } = await supabase
      .from('programs')
      .select('id, name, duration_years')
      .eq('institution_id', user.institution_id)
      .eq('is_active', true)
      .order('name')
    if (data) setPrograms(data as Program[])
  }

  async function fetchFeeModel() {
    if (!user?.institution_id) return

    const supabase = createClient()
    const { data, error } = await supabase
      .from('institutions')
      .select('fee_model')
      .eq('id', user.institution_id)
      .single()

    if (!error && data) {
      const typedData = data as { fee_model: FeeModelType | null }
      setFeeModel(typedData.fee_model || 'monthly_per_course')
    }
  }

  async function initializeAndFetchCourses() {
    if (!user?.institution_id) return

    setIsLoading(true)
    const supabase = createClient()

    try {
      // Fetch fee model first
      await fetchFeeModel()

      const { data: existingCourses, error: checkError } = await supabase
        .from('courses')
        .select('name')
        .eq('institution_id', user.institution_id)

      if (checkError) throw checkError

      if (!existingCourses || existingCourses.length === 0) {
        setIsInitializing(true)
        const defaultCoursesToInsert = DEFAULT_COURSES.map((c) => ({
          institution_id: user.institution_id,
          name: c.name,
          code: c.code,
          course_code: c.code,
          description: c.description,
          nqf_level: c.nqf_level,
          monthly_fee: 0,
          is_active: true,
        }))

        const { error: insertError } = await supabase
          .from('courses')
          .insert(defaultCoursesToInsert as never)

        if (insertError) throw insertError
        setIsInitializing(false)
      }

      await fetchCourses()
    } catch (error) {
      console.error('Error initializing courses:', error)
      toast.error('Failed to load courses')
      setIsLoading(false)
      setIsInitializing(false)
    }
  }

  async function fetchCourses() {
    if (!user?.institution_id) return

    setIsLoading(true)
    const supabase = createClient()

    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('institution_id', user.institution_id)
        .order('name')

      if (error) throw error

      interface CourseData {
        id: string
        name: string
        code: string | null
        course_code: string | null
        description: string | null
        monthly_fee: number
        nqf_level: number | null
        credits: number | null
        duration_months: number | null
        is_active: boolean
        created_at: string
        updated_at: string
        // Lump sum fee fields
        total_course_fee: number
        allow_installments: boolean
        default_installments: number
      }
      const typedData = (data || []) as CourseData[]
      const coursesWithCounts = await Promise.all(
        typedData.map(async (course) => {
          const [studentCount, lecturerCount] = await Promise.all([
            supabase
              .from('student_enrollments')
              .select('id', { count: 'exact' })
              .eq('course_id', course.id),
            supabase
              .from('lecturer_courses')
              .select('id', { count: 'exact' })
              .eq('course_id', course.id),
          ])

          return {
            ...course,
            _count: {
              students: studentCount.count || 0,
              lecturers: lecturerCount.count || 0,
            },
          }
        })
      )

      setCourses(coursesWithCounts)
    } catch (error) {
      console.error('Error fetching courses:', error)
      toast.error('Failed to fetch courses')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleToggleActive(course: Course) {
    setTogglingId(course.id)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('courses')
        .update({
          is_active: !course.is_active,
          updated_at: new Date().toISOString(),
        } as never)
        .eq('id', course.id)

      if (error) throw error

      setCourses((prev) =>
        prev.map((c) =>
          c.id === course.id ? { ...c, is_active: !c.is_active } : c
        )
      )

      toast.success(
        `${course.name} ${!course.is_active ? 'activated' : 'deactivated'}`
      )
    } catch (error) {
      console.error('Error toggling course:', error)
      toast.error('Failed to update course')
    } finally {
      setTogglingId(null)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!user?.institution_id) return

    setIsSaving(true)
    const supabase = createClient()

    try {
      const courseData = {
        name: formData.name,
        code: formData.code || null,
        course_code: formData.course_code || null,
        description: formData.description || null,
        monthly_fee: formData.monthly_fee,
        nqf_level: formData.nqf_level || null,
        credits: formData.credits || null,
        duration_months: formData.duration_months || null,
        is_active: formData.is_active,
        // Lump sum fields
        total_course_fee: formData.total_course_fee,
        allow_installments: formData.allow_installments,
        default_installments: formData.default_installments,
      }

      if (editingCourse) {
        const { error } = await supabase
          .from('courses')
          .update({
            ...courseData,
            updated_at: new Date().toISOString(),
          } as never)
          .eq('id', editingCourse.id)

        if (error) throw error
        toast.success('Course updated successfully')
      } else {
        // Create the course
        const { data: newCourse, error } = await supabase
          .from('courses')
          .insert({
            institution_id: user.institution_id,
            ...courseData,
          } as never)
          .select('id')
          .single()

        if (error) throw error

        // If a program is selected, link the course to it
        if (selectedProgramId && newCourse) {
          const { error: linkError } = await supabase
            .from('program_courses')
            .insert({
              institution_id: user.institution_id,
              program_id: selectedProgramId,
              course_id: (newCourse as { id: string }).id,
              year_of_study: selectedYear,
              semester: selectedSemester,
              is_compulsory: isCompulsory,
            } as never)

          if (linkError) {
            console.error('Error linking course to program:', linkError)
            toast.success('Course added, but failed to link to program')
          } else {
            const programName = programs.find(p => p.id === selectedProgramId)?.name
            toast.success(`Course added and linked to ${programName}`)
          }
        } else {
          toast.success('Course added successfully')
        }
      }

      setShowModal(false)
      resetForm()
      fetchCourses()
    } catch (error) {
      console.error('Error saving course:', error)
      toast.error('Failed to save course')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    if (!courseToDelete) return

    setIsDeleting(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', courseToDelete.id)

      if (error) throw error

      toast.success('Course deleted successfully')
      setDeleteModalOpen(false)
      setCourseToDelete(null)
      fetchCourses()
    } catch (error) {
      console.error('Error deleting course:', error)
      toast.error('Failed to delete course. It may have enrollments.')
    } finally {
      setIsDeleting(false)
    }
  }

  function resetForm() {
    setFormData({
      name: '',
      code: '',
      course_code: '',
      description: '',
      monthly_fee: 0,
      nqf_level: 0,
      credits: 0,
      duration_months: 0,
      is_active: true,
      total_course_fee: 0,
      allow_installments: true,
      default_installments: 1,
    })
    setEditingCourse(null)
    // Reset program linking
    setSelectedProgramId('')
    setSelectedYear(1)
    setSelectedSemester(1)
    setIsCompulsory(true)
  }

  function openEdit(course: Course) {
    setFormData({
      name: course.name,
      code: course.code || '',
      course_code: course.course_code || '',
      description: course.description || '',
      monthly_fee: course.monthly_fee,
      nqf_level: course.nqf_level || 0,
      credits: course.credits || 0,
      duration_months: course.duration_months || 0,
      is_active: course.is_active,
      total_course_fee: course.total_course_fee || 0,
      allow_installments: course.allow_installments ?? true,
      default_installments: course.default_installments || 1,
    })
    setEditingCourse(course)
    setShowModal(true)
  }

  function isDefaultCourse(name: string): boolean {
    return DEFAULT_COURSES.some(
      (dc) => dc.name.toLowerCase() === name.toLowerCase()
    )
  }

  const filteredCourses = courses.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.course_code?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const standardCourses = filteredCourses.filter((c) => isDefaultCourse(c.name))
  const customCourses = filteredCourses.filter((c) => !isDefaultCourse(c.name))

  const activeCount = courses.filter((c) => c.is_active).length
  const totalMonthlyFeeRevenue = courses.filter(c => c.is_active).reduce((sum, c) => sum + c.monthly_fee, 0)
  const totalCourseFeeRevenue = courses.filter(c => c.is_active).reduce((sum, c) => sum + (c.total_course_fee || 0), 0)

  // Get the appropriate fee label and value based on fee model
  const getFeeDisplay = (course: Course) => {
    switch (feeModel) {
      case 'monthly_per_course':
        return `${formatCurrency(course.monthly_fee)}/mo`
      case 'per_course_lumpsum':
        return formatCurrency(course.total_course_fee || 0)
      case 'per_semester':
        return 'N/A (semester-based)'
      default:
        return `${formatCurrency(course.monthly_fee)}/mo`
    }
  }

  const getTotalFeeLabel = () => {
    switch (feeModel) {
      case 'monthly_per_course':
        return 'Total Monthly Fee'
      case 'per_course_lumpsum':
        return 'Total Course Fee'
      case 'per_semester':
        return 'Semester Fee'
      default:
        return 'Total Monthly Fee'
    }
  }

  const getTotalFeeValue = () => {
    switch (feeModel) {
      case 'monthly_per_course':
        return totalMonthlyFeeRevenue
      case 'per_course_lumpsum':
        return totalCourseFeeRevenue
      case 'per_semester':
        return 0 // Fees are at semester level
      default:
        return totalMonthlyFeeRevenue
    }
  }

  const getTotalFeeSubtext = () => {
    switch (feeModel) {
      case 'monthly_per_course':
        return 'Per student (all courses)'
      case 'per_course_lumpsum':
        return 'Total for all courses'
      case 'per_semester':
        return 'Configured in settings'
      default:
        return 'Per student (all courses)'
    }
  }

  function getNqfLabel(level: number | null): string {
    if (!level) return ''
    const nqf = nqfLevels.find(n => n.level === level)
    return nqf ? `NQF ${level}` : ''
  }

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-4" />
        <p className="text-gray-600">Setting up default courses...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 md:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Courses</h1>
              <p className="mt-1 text-sm text-gray-500">Manage courses and their fees</p>
            </div>
            {canEdit && (
              <Button
                size="lg"
                leftIcon={<Plus className="w-5 h-5" />}
                onClick={() => {
                  resetForm()
                  setShowModal(true)
                }}
              >
                Add Course
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-6 space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Courses</p>
                <p className="mt-2 text-2xl font-semibold text-gray-900">
                  {courses.length}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <BookOpen className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Active</p>
                <p className="mt-2 text-2xl font-semibold text-green-600">
                  {activeCount}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Available for enrollment
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-xl">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Inactive</p>
                <p className="mt-2 text-2xl font-semibold text-gray-600">
                  {courses.length - activeCount}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Not available
                </p>
              </div>
              <div className="p-3 bg-gray-100 rounded-xl">
                <XCircle className="w-6 h-6 text-gray-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{getTotalFeeLabel()}</p>
                <p className="mt-2 text-2xl font-semibold text-emerald-600">
                  {feeModel === 'per_semester' ? '-' : formatCurrency(getTotalFeeValue())}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {getTotalFeeSubtext()}
                </p>
              </div>
              <div className="p-3 bg-emerald-100 rounded-xl">
                <DollarSign className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search courses by name or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none text-sm"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
            <p className="mt-2 text-sm text-gray-500">Loading courses...</p>
          </div>
        ) : (
          <>
            {/* Standard Courses */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <h2 className="text-lg font-semibold text-gray-900">Standard Courses</h2>
                <span className="text-sm text-gray-500">
                  ({standardCourses.filter((c) => c.is_active).length} active)
                </span>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-gray-100">
                  {standardCourses.map((course) => (
                    <div
                      key={course.id}
                      className={`bg-white p-4 flex items-center justify-between transition-colors ${
                        course.is_active ? '' : 'opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {canEdit ? (
                          <button
                            onClick={() => handleToggleActive(course)}
                            disabled={togglingId === course.id}
                            className={`flex-shrink-0 w-11 h-6 rounded-full transition-colors relative ${
                              course.is_active ? 'bg-green-500' : 'bg-gray-300'
                            }`}
                          >
                            <span
                              className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                                course.is_active ? 'left-6' : 'left-1'
                              }`}
                            />
                            {togglingId === course.id && (
                              <Loader2 className="w-4 h-4 animate-spin absolute top-1 left-3.5 text-gray-400" />
                            )}
                          </button>
                        ) : (
                          <span
                            className={`flex-shrink-0 w-3 h-3 rounded-full ${
                              course.is_active ? 'bg-green-500' : 'bg-gray-300'
                            }`}
                          />
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {course.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {course.course_code || course.code} • {getFeeDisplay(course)}
                            {course.nqf_level && ` • ${getNqfLabel(course.nqf_level)}`}
                          </p>
                        </div>
                      </div>
                      {canEdit && (
                        <button
                          onClick={() => openEdit(course)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors ml-2"
                          title="Edit fee and details"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Custom Courses */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-blue-500" />
                  <h2 className="text-lg font-semibold text-gray-900">Custom Courses</h2>
                  <span className="text-sm text-gray-500">
                    ({customCourses.length} courses)
                  </span>
                </div>
              </div>

              {customCourses.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                  <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No custom courses</h3>
                  <p className="text-gray-500 mb-6">
                    {canEdit ? 'Add courses specific to your institution.' : 'No custom courses have been added.'}
                  </p>
                  {canEdit && (
                    <Button
                      leftIcon={<Plus className="w-4 h-4" />}
                      onClick={() => {
                        resetForm()
                        setShowModal(true)
                      }}
                    >
                      Add Course
                    </Button>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-gray-100">
                    {customCourses.map((course) => (
                      <div
                        key={course.id}
                        className={`bg-white p-4 flex items-center justify-between transition-colors ${
                          course.is_active ? '' : 'opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {canEdit ? (
                            <button
                              onClick={() => handleToggleActive(course)}
                              disabled={togglingId === course.id}
                              className={`flex-shrink-0 w-11 h-6 rounded-full transition-colors relative ${
                                course.is_active ? 'bg-green-500' : 'bg-gray-300'
                              }`}
                            >
                              <span
                                className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                                  course.is_active ? 'left-6' : 'left-1'
                                }`}
                              />
                              {togglingId === course.id && (
                                <Loader2 className="w-4 h-4 animate-spin absolute top-1 left-3.5 text-gray-400" />
                              )}
                            </button>
                          ) : (
                            <span
                              className={`flex-shrink-0 w-3 h-3 rounded-full ${
                                course.is_active ? 'bg-green-500' : 'bg-gray-300'
                              }`}
                            />
                          )}
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate">
                              {course.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {course.course_code || course.code || 'No code'} • {getFeeDisplay(course)}
                              {course.nqf_level && ` • ${getNqfLabel(course.nqf_level)}`}
                            </p>
                          </div>
                        </div>
                        {canEdit && (
                          <div className="flex items-center gap-1 ml-2">
                            <button
                              onClick={() => openEdit(course)}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setCourseToDelete(course)
                                setDeleteModalOpen(true)
                              }}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingCourse ? 'Edit Course' : 'Add Course'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <Input
                label="Course Name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Electrical Installation"
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Course Code"
                  value={formData.course_code}
                  onChange={(e) =>
                    setFormData({ ...formData, course_code: e.target.value.toUpperCase() })
                  }
                  placeholder="e.g., ELC101"
                  maxLength={10}
                />
                <Input
                  label="Short Code"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value.toUpperCase() })
                  }
                  placeholder="e.g., ELC"
                  maxLength={5}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none resize-none text-sm"
                  rows={2}
                  placeholder="Brief description..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="NQF Level"
                  value={formData.nqf_level.toString()}
                  onChange={(e) =>
                    setFormData({ ...formData, nqf_level: parseInt(e.target.value) || 0 })
                  }
                  options={nqfLevels.map(l => ({ value: l.level.toString(), label: `Level ${l.level} - ${l.description}` }))}
                  placeholder="Select NQF Level"
                />
                <Input
                  label="Credits"
                  type="text"
                  inputMode="numeric"
                  value={formatNumericValue(formData.credits || 0)}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      credits: parseIntegerInput(e.target.value),
                    })
                  }
                  placeholder="e.g., 120"
                />
              </div>

              {/* Fee fields based on fee model */}
              {feeModel === 'monthly_per_course' && (
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Monthly Fee (N$)"
                    type="text"
                    inputMode="decimal"
                    value={formatNumericValue(formData.monthly_fee)}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        monthly_fee: parseNumericInput(e.target.value),
                      })
                    }
                    placeholder="0"
                  />
                  <Input
                    label="Duration (months)"
                    type="text"
                    inputMode="numeric"
                    value={formatNumericValue(formData.duration_months || 0)}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        duration_months: parseIntegerInput(e.target.value),
                      })
                    }
                    placeholder="e.g., 12"
                  />
                </div>
              )}

              {feeModel === 'per_course_lumpsum' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Total Course Fee (N$)"
                      type="text"
                      inputMode="decimal"
                      value={formatNumericValue(formData.total_course_fee)}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          total_course_fee: parseNumericInput(e.target.value),
                        })
                      }
                      placeholder="0"
                    />
                    <Input
                      label="Duration (months)"
                      type="text"
                      inputMode="numeric"
                      value={formatNumericValue(formData.duration_months || 0)}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          duration_months: parseIntegerInput(e.target.value),
                        })
                      }
                      placeholder="e.g., 12"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="allow_installments"
                      checked={formData.allow_installments}
                      onChange={(e) =>
                        setFormData({ ...formData, allow_installments: e.target.checked })
                      }
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="allow_installments" className="text-sm text-gray-700">
                      Allow payment in installments
                    </label>
                  </div>

                  {formData.allow_installments && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Default Installments
                      </label>
                      <select
                        value={formData.default_installments}
                        onChange={(e) =>
                          setFormData({ ...formData, default_installments: parseInt(e.target.value) })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none text-sm"
                      >
                        <option value={1}>Full Payment (1 installment)</option>
                        <option value={2}>2 Installments (50% each)</option>
                        <option value={3}>3 Installments</option>
                        <option value={4}>4 Installments (25% each)</option>
                        <option value={6}>6 Installments</option>
                        <option value={12}>12 Installments (Monthly)</option>
                      </select>
                      {formData.total_course_fee > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          Each installment: {formatCurrency(formData.total_course_fee / formData.default_installments)}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {feeModel === 'per_semester' && (
                <div>
                  <Input
                    label="Duration (months)"
                    type="text"
                    inputMode="numeric"
                    value={formatNumericValue(formData.duration_months || 0)}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        duration_months: parseIntegerInput(e.target.value),
                      })
                    }
                    placeholder="e.g., 12"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Fees are configured at the semester level in Settings &gt; Fee Model
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) =>
                    setFormData({ ...formData, is_active: e.target.checked })
                  }
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="is_active" className="text-sm text-gray-700">
                  Active (available for enrollment)
                </label>
              </div>

              {/* Program Linking - Only show when creating new course */}
              {!editingCourse && programs.length > 0 && (
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">
                    Link to Program (Optional)
                  </h3>
                  <div className="space-y-3">
                    <Select
                      label="Select Program"
                      value={selectedProgramId}
                      onChange={(e) => setSelectedProgramId(e.target.value)}
                      options={[
                        { value: '', label: 'No program (create course only)' },
                        ...programs.map(p => ({
                          value: p.id,
                          label: p.name + (p.duration_years ? ` (${p.duration_years} yr)` : ''),
                        })),
                      ]}
                    />

                    {selectedProgramId && (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          <Select
                            label="Year of Study"
                            value={selectedYear.toString()}
                            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                            options={Array.from(
                              { length: programs.find(p => p.id === selectedProgramId)?.duration_years || 4 },
                              (_, i) => ({ value: (i + 1).toString(), label: `Year ${i + 1}` })
                            )}
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
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="is_compulsory"
                            checked={isCompulsory}
                            onChange={(e) => setIsCompulsory(e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                          <label htmlFor="is_compulsory" className="text-sm text-gray-700">
                            Compulsory course (core)
                          </label>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving || !formData.name}
                  leftIcon={
                    isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )
                  }
                  className="flex-1"
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false)
          setCourseToDelete(null)
        }}
        onConfirm={handleDelete}
        title="Delete Course"
        message={`Are you sure you want to delete "${courseToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        isLoading={isDeleting}
      />
    </div>
  )
}
