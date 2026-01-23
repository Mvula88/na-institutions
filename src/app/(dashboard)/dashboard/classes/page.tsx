'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/input'
import { ConfirmModal } from '@/components/ui/modal'
import {
  Users,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Save,
  X,
  Loader2,
  Trash2,
  Pencil,
  GraduationCap,
  UserPlus,
  UserMinus,
  Filter,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Teacher {
  id: string
  full_name: string
}

interface Class {
  id: string
  name: string
  grade_level: string | null
  section: string | null
  description: string | null
  max_capacity: number | null
  academic_year: string | null
  class_teacher_id: string | null
  is_active: boolean
  created_at: string
  class_teacher?: { full_name: string } | null
  _count?: { students: number }
}

interface Student {
  id: string
  full_name: string
  student_number: string | null
  grade: string | null
  class_id: string | null
}

const ITEMS_PER_PAGE = 10

const GRADE_LEVELS = [
  'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6',
  'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12',
]

const SECTIONS = ['A', 'B', 'C', 'D', 'E', 'F']

export default function ClassesPage() {
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState<'classes' | 'assign'>('classes')
  const [isLoading, setIsLoading] = useState(true)

  // Classes state
  const [classes, setClasses] = useState<Class[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [gradeFilter, setGradeFilter] = useState('')

  // Teachers for dropdown
  const [teachers, setTeachers] = useState<Teacher[]>([])

  // Class modal state
  const [showClassModal, setShowClassModal] = useState(false)
  const [editingClass, setEditingClass] = useState<Class | null>(null)
  const [classForm, setClassForm] = useState({
    name: '',
    grade_level: '',
    section: '',
    description: '',
    max_capacity: 40,
    academic_year: new Date().getFullYear().toString(),
    class_teacher_id: '',
  })
  const [isSaving, setIsSaving] = useState(false)

  // Assignment state
  const [selectedClass, setSelectedClass] = useState<Class | null>(null)
  const [classStudents, setClassStudents] = useState<Student[]>([])
  const [unassignedStudents, setUnassignedStudents] = useState<Student[]>([])
  const [isLoadingStudents, setIsLoadingStudents] = useState(false)
  const [studentSearch, setStudentSearch] = useState('')

  // Delete modal
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; classItem: Class | null }>({
    open: false,
    classItem: null,
  })
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (user?.institution_id) {
      fetchTeachers()
    }
  }, [user?.institution_id])

  useEffect(() => {
    if (activeTab === 'classes' && user?.institution_id) {
      fetchClasses()
    }
  }, [activeTab, user?.institution_id, currentPage, searchTerm, gradeFilter])

  async function fetchTeachers() {
    if (!user?.institution_id) return
    const supabase = createClient()
    const { data } = await supabase
      .from('lecturers')
      .select('id, full_name')
      .eq('institution_id', user.institution_id)
      .eq('is_active', true)
      .order('full_name')
    setTeachers((data || []) as Teacher[])
  }

  async function fetchClasses() {
    if (!user?.institution_id) return
    setIsLoading(true)
    const supabase = createClient()

    let query = supabase
      .from('programs')
      .select(`
        id, name, grade_level, section, description, max_capacity, academic_year,
        class_teacher_id, is_active, created_at,
        class_teacher:lecturers(full_name)
      `, { count: 'exact' })
      .eq('institution_id', user.institution_id)
      .order('grade_level', { ascending: true })
      .order('section', { ascending: true })

    if (searchTerm) {
      query = query.ilike('name', `%${searchTerm}%`)
    }
    if (gradeFilter) {
      query = query.eq('grade_level', gradeFilter)
    }

    const from = (currentPage - 1) * ITEMS_PER_PAGE
    query = query.range(from, from + ITEMS_PER_PAGE - 1)

    const { data, count, error } = await query

    if (!error && data) {
      // Fetch student counts for each class
      const classesWithCounts = await Promise.all(
        (data as unknown as Class[]).map(async (classItem) => {
          const { count: studentCount } = await supabase
            .from('students')
            .select('id', { count: 'exact' })
            .eq('class_id', classItem.id)
            .eq('status', 'active')

          return {
            ...classItem,
            _count: { students: studentCount || 0 }
          }
        })
      )
      setClasses(classesWithCounts)
      setTotalCount(count || 0)
    }
    setIsLoading(false)
  }

  async function handleSaveClass(e: React.FormEvent) {
    e.preventDefault()
    if (!user?.institution_id) return
    setIsSaving(true)
    const supabase = createClient()

    try {
      const classData = {
        institution_id: user.institution_id,
        name: classForm.name,
        grade_level: classForm.grade_level || null,
        section: classForm.section || null,
        description: classForm.description || null,
        max_capacity: classForm.max_capacity || null,
        academic_year: classForm.academic_year || null,
        class_teacher_id: classForm.class_teacher_id || null,
      }

      if (editingClass) {
        const { error } = await supabase
          .from('programs')
          .update(classData as never)
          .eq('id', editingClass.id)
        if (error) throw error
        toast.success('Class updated successfully')
      } else {
        const { error } = await supabase
          .from('programs')
          .insert(classData as never)
        if (error) throw error
        toast.success('Class created successfully')
      }

      setShowClassModal(false)
      resetClassForm()
      fetchClasses()
    } catch (error: unknown) {
      console.error('Error saving class:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to save class'
      if (errorMessage.includes('unique') || errorMessage.includes('duplicate')) {
        toast.error('A class with this name already exists for this academic year')
      } else {
        toast.error('Failed to save class')
      }
    } finally {
      setIsSaving(false)
    }
  }

  function resetClassForm() {
    setClassForm({
      name: '',
      grade_level: '',
      section: '',
      description: '',
      max_capacity: 40,
      academic_year: new Date().getFullYear().toString(),
      class_teacher_id: '',
    })
    setEditingClass(null)
  }

  function openEditClass(classItem: Class) {
    setClassForm({
      name: classItem.name,
      grade_level: classItem.grade_level || '',
      section: classItem.section || '',
      description: classItem.description || '',
      max_capacity: classItem.max_capacity || 40,
      academic_year: classItem.academic_year || new Date().getFullYear().toString(),
      class_teacher_id: classItem.class_teacher_id || '',
    })
    setEditingClass(classItem)
    setShowClassModal(true)
  }

  async function openAssignment(classItem: Class) {
    if (!user?.institution_id) return
    setSelectedClass(classItem)
    setActiveTab('assign')
    setIsLoadingStudents(true)

    const supabase = createClient()

    try {
      // Get students in this class
      const { data: inClass } = await supabase
        .from('students')
        .select('id, full_name, student_number, grade, class_id')
        .eq('class_id', classItem.id)
        .eq('status', 'active')
        .order('full_name')

      // Get unassigned students (no class or matching grade level)
      let unassignedQuery = supabase
        .from('students')
        .select('id, full_name, student_number, grade, class_id')
        .eq('institution_id', user.institution_id)
        .eq('status', 'active')
        .is('class_id', null)
        .order('full_name')

      // If class has a grade level, filter to matching students
      if (classItem.grade_level) {
        unassignedQuery = unassignedQuery.eq('grade', classItem.grade_level)
      }

      const { data: unassigned } = await unassignedQuery

      setClassStudents((inClass || []) as Student[])
      setUnassignedStudents((unassigned || []) as Student[])
    } catch (error) {
      console.error('Error loading students:', error)
      toast.error('Failed to load students')
    } finally {
      setIsLoadingStudents(false)
    }
  }

  async function assignStudent(studentId: string) {
    if (!selectedClass) return
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('students')
        .update({ class_id: selectedClass.id } as never)
        .eq('id', studentId)

      if (error) throw error

      // Move student from unassigned to assigned
      const student = unassignedStudents.find(s => s.id === studentId)
      if (student) {
        setClassStudents([...classStudents, { ...student, class_id: selectedClass.id }])
        setUnassignedStudents(unassignedStudents.filter(s => s.id !== studentId))
      }
      toast.success('Student assigned to class')
    } catch (error) {
      console.error('Error assigning student:', error)
      toast.error('Failed to assign student')
    }
  }

  async function removeStudent(studentId: string) {
    if (!selectedClass) return
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('students')
        .update({ class_id: null } as never)
        .eq('id', studentId)

      if (error) throw error

      // Move student from assigned to unassigned
      const student = classStudents.find(s => s.id === studentId)
      if (student) {
        setUnassignedStudents([...unassignedStudents, { ...student, class_id: null }])
        setClassStudents(classStudents.filter(s => s.id !== studentId))
      }
      toast.success('Student removed from class')
    } catch (error) {
      console.error('Error removing student:', error)
      toast.error('Failed to remove student')
    }
  }

  async function handleDeleteClass() {
    if (!deleteModal.classItem) return
    setIsDeleting(true)
    const supabase = createClient()

    try {
      // Remove class from students first
      await supabase
        .from('students')
        .update({ class_id: null } as never)
        .eq('class_id', deleteModal.classItem.id)

      // Delete class
      const { error } = await supabase
        .from('programs')
        .delete()
        .eq('id', deleteModal.classItem.id)

      if (error) throw error

      toast.success('Class deleted successfully')
      setDeleteModal({ open: false, classItem: null })
      fetchClasses()
    } catch (error) {
      console.error('Error deleting class:', error)
      toast.error('Failed to delete class')
    } finally {
      setIsDeleting(false)
    }
  }

  // Auto-generate class name when grade and section change
  function updateClassForm(updates: Partial<typeof classForm>) {
    const newForm = { ...classForm, ...updates }

    // Auto-generate name if grade or section changed
    if (updates.grade_level !== undefined || updates.section !== undefined) {
      if (newForm.grade_level) {
        newForm.name = newForm.section
          ? `${newForm.grade_level}${newForm.section}`
          : newForm.grade_level
      }
    }

    setClassForm(newForm)
  }

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)

  // Filter unassigned students by search
  const filteredUnassigned = unassignedStudents.filter(s =>
    s.full_name.toLowerCase().includes(studentSearch.toLowerCase()) ||
    (s.student_number && s.student_number.toLowerCase().includes(studentSearch.toLowerCase()))
  )

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 md:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Classes</h1>
              <p className="mt-1 text-sm text-gray-500">Organize students into class groups</p>
            </div>
            {activeTab === 'classes' && (
              <Button
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={() => {
                  resetClassForm()
                  setShowClassModal(true)
                }}
              >
                New Class
              </Button>
            )}
            {activeTab === 'assign' && selectedClass && (
              <Button
                variant="secondary"
                onClick={() => {
                  setActiveTab('classes')
                  setSelectedClass(null)
                  fetchClasses()
                }}
              >
                Back to Classes
              </Button>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-6 bg-gray-100 p-1 rounded-lg w-fit">
            <button
              onClick={() => {
                setActiveTab('classes')
                setSelectedClass(null)
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'classes'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              Classes
            </button>
            {selectedClass && (
              <button
                onClick={() => setActiveTab('assign')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'assign'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Users className="w-4 h-4" />
                Assign Students
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-6">
        {/* Classes Tab */}
        {activeTab === 'classes' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search classes..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value)
                      setCurrentPage(1)
                    }}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="w-48">
                  <Select
                    options={[
                      { value: '', label: 'All Grades' },
                      ...GRADE_LEVELS.map(g => ({ value: g, label: g }))
                    ]}
                    value={gradeFilter}
                    onChange={(e) => {
                      setGradeFilter(e.target.value)
                      setCurrentPage(1)
                    }}
                  />
                </div>
                {(searchTerm || gradeFilter) && (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setSearchTerm('')
                      setGradeFilter('')
                      setCurrentPage(1)
                    }}
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>

            {/* Classes List */}
            <div className="bg-white rounded-xl border border-gray-200">
              {isLoading ? (
                <div className="p-8 text-center">
                  <div className="animate-pulse space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-16 bg-gray-100 rounded"></div>
                    ))}
                  </div>
                </div>
              ) : classes.length === 0 ? (
                <div className="p-12 text-center">
                  <GraduationCap className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No classes yet</h3>
                  <p className="text-gray-500 mb-4">Create a class to start organizing students</p>
                  <Button
                    leftIcon={<Plus className="w-4 h-4" />}
                    onClick={() => {
                      resetClassForm()
                      setShowClassModal(true)
                    }}
                  >
                    New Class
                  </Button>
                </div>
              ) : (
                <>
                  <div className="divide-y divide-gray-100">
                    {classes.map((classItem) => (
                      <div
                        key={classItem.id}
                        className="p-4 flex items-center justify-between hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-indigo-100 rounded-lg">
                            <GraduationCap className="w-6 h-6 text-indigo-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{classItem.name}</p>
                            <p className="text-sm text-gray-500">
                              {classItem.grade_level || 'No grade'}
                              {classItem.class_teacher?.full_name && ` • ${classItem.class_teacher.full_name}`}
                              {classItem.academic_year && ` • ${classItem.academic_year}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-sm text-right">
                            <p className="font-medium text-gray-900">
                              {classItem._count?.students || 0} students
                            </p>
                            {classItem.max_capacity && (
                              <p className="text-gray-500">
                                of {classItem.max_capacity} max
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openAssignment(classItem)}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                              title="Assign Students"
                            >
                              <UserPlus className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openEditClass(classItem)}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteModal({ open: true, classItem })}
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

        {/* Assign Students Tab */}
        {activeTab === 'assign' && selectedClass && (
          <div className="space-y-6">
            {/* Class Info */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="font-semibold text-gray-900">{selectedClass.name}</h2>
                  <p className="text-sm text-gray-500">
                    {selectedClass.grade_level || 'No grade level'}
                    {selectedClass.class_teacher?.full_name && ` • Teacher: ${selectedClass.class_teacher.full_name}`}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full">
                    <Users className="w-4 h-4" />
                    {classStudents.length} assigned
                  </span>
                  {selectedClass.max_capacity && (
                    <span className="flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-700 rounded-full">
                      Max: {selectedClass.max_capacity}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Assigned Students */}
              <div className="bg-white rounded-xl border border-gray-200">
                <div className="p-4 border-b border-gray-100">
                  <h3 className="font-medium text-gray-900">Students in Class</h3>
                  <p className="text-sm text-gray-500">{classStudents.length} students</p>
                </div>
                {isLoadingStudents ? (
                  <div className="p-8 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
                  </div>
                ) : classStudents.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    No students assigned yet
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
                    {classStudents.map((student) => (
                      <div
                        key={student.id}
                        className="p-3 flex items-center justify-between hover:bg-gray-50"
                      >
                        <div>
                          <p className="font-medium text-gray-900">{student.full_name}</p>
                          <p className="text-sm text-gray-500">
                            {student.student_number} {student.grade && `• ${student.grade}`}
                          </p>
                        </div>
                        <button
                          onClick={() => removeStudent(student.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                          title="Remove from class"
                        >
                          <UserMinus className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Unassigned Students */}
              <div className="bg-white rounded-xl border border-gray-200">
                <div className="p-4 border-b border-gray-100">
                  <h3 className="font-medium text-gray-900">Available Students</h3>
                  <p className="text-sm text-gray-500">
                    {selectedClass.grade_level
                      ? `${unassignedStudents.length} students in ${selectedClass.grade_level}`
                      : `${unassignedStudents.length} unassigned students`
                    }
                  </p>
                  <div className="mt-3 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search students..."
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>
                {isLoadingStudents ? (
                  <div className="p-8 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
                  </div>
                ) : filteredUnassigned.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    {studentSearch ? 'No matching students' : 'No available students'}
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
                    {filteredUnassigned.map((student) => (
                      <div
                        key={student.id}
                        className="p-3 flex items-center justify-between hover:bg-gray-50"
                      >
                        <div>
                          <p className="font-medium text-gray-900">{student.full_name}</p>
                          <p className="text-sm text-gray-500">
                            {student.student_number} {student.grade && `• ${student.grade}`}
                          </p>
                        </div>
                        <button
                          onClick={() => assignStudent(student.id)}
                          className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg"
                          title="Add to class"
                        >
                          <UserPlus className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Class Modal */}
      {showClassModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingClass ? 'Edit Class' : 'Create Class'}
              </h2>
              <button
                onClick={() => setShowClassModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveClass} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Grade Level"
                  value={classForm.grade_level}
                  onChange={(e) => updateClassForm({ grade_level: e.target.value })}
                  options={[
                    { value: '', label: 'Select Grade' },
                    ...GRADE_LEVELS.map(g => ({ value: g, label: g }))
                  ]}
                />
                <Select
                  label="Section"
                  value={classForm.section}
                  onChange={(e) => updateClassForm({ section: e.target.value })}
                  options={[
                    { value: '', label: 'Select Section' },
                    ...SECTIONS.map(s => ({ value: s, label: `Section ${s}` }))
                  ]}
                />
              </div>
              <Input
                label="Class Name"
                required
                value={classForm.name}
                onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
                placeholder="e.g., Grade 10A"
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Academic Year"
                  value={classForm.academic_year}
                  onChange={(e) => setClassForm({ ...classForm, academic_year: e.target.value })}
                  placeholder="e.g., 2024"
                />
                <Input
                  label="Max Capacity"
                  type="number"
                  value={classForm.max_capacity}
                  onChange={(e) => setClassForm({ ...classForm, max_capacity: parseInt(e.target.value) || 40 })}
                />
              </div>
              <Select
                label="Class Teacher (Optional)"
                value={classForm.class_teacher_id}
                onChange={(e) => setClassForm({ ...classForm, class_teacher_id: e.target.value })}
                options={[
                  { value: '', label: 'No Class Teacher' },
                  ...teachers.map(t => ({ value: t.id, label: t.full_name }))
                ]}
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                <textarea
                  value={classForm.description}
                  onChange={(e) => setClassForm({ ...classForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none resize-none"
                  rows={2}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowClassModal(false)}
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
                  {isSaving ? 'Saving...' : editingClass ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      <ConfirmModal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, classItem: null })}
        onConfirm={handleDeleteClass}
        title="Delete Class"
        message="Are you sure you want to delete this class? Students will be unassigned but not deleted. This action cannot be undone."
        confirmText="Delete"
        isLoading={isDeleting}
      />
    </div>
  )
}
