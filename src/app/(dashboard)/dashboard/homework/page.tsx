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
  Calendar,
  Users,
  CheckCircle,
  Clock,
  AlertCircle,
  X,
  Loader2,
  Trash2,
  Pencil,
  Eye,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Assignment {
  id: string
  title: string
  description: string | null
  instructions: string | null
  assignment_type: string
  due_date: string
  assigned_date: string
  max_points: number | null
  is_graded: boolean
  is_active: boolean
  subject?: { id: string; name: string }
  class?: { id: string; name: string }
  teacher?: { id: string; full_name: string }
  _stats?: {
    total: number
    completed: number
    pending: number
    late: number
  }
}

interface StudentAssignment {
  id: string
  assignment_id: string
  student_id: string
  status: string
  completed_at: string | null
  points_earned: number | null
  teacher_notes: string | null
  student?: { id: string; full_name: string; student_number: string | null }
}

interface Class {
  id: string
  name: string
}

interface Subject {
  id: string
  name: string
}

interface Teacher {
  id: string
  full_name: string
}

const ITEMS_PER_PAGE = 10

const ASSIGNMENT_TYPES = [
  { value: 'homework', label: 'Homework' },
  { value: 'project', label: 'Project' },
  { value: 'essay', label: 'Essay' },
  { value: 'worksheet', label: 'Worksheet' },
  { value: 'reading', label: 'Reading' },
  { value: 'research', label: 'Research' },
  { value: 'practice', label: 'Practice' },
  { value: 'other', label: 'Other' },
]

const STATUS_BADGES: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: <Clock className="w-3 h-3" /> },
  in_progress: { bg: 'bg-blue-100', text: 'text-blue-700', icon: <Clock className="w-3 h-3" /> },
  completed: { bg: 'bg-green-100', text: 'text-green-700', icon: <CheckCircle className="w-3 h-3" /> },
  incomplete: { bg: 'bg-red-100', text: 'text-red-700', icon: <AlertCircle className="w-3 h-3" /> },
  late: { bg: 'bg-orange-100', text: 'text-orange-700', icon: <AlertCircle className="w-3 h-3" /> },
  excused: { bg: 'bg-gray-100', text: 'text-gray-700', icon: <CheckCircle className="w-3 h-3" /> },
}

export default function HomeworkPage() {
  const { user } = useAuthStore()
  const [isLoading, setIsLoading] = useState(true)

  // Assignments state
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [classFilter, setClassFilter] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('')

  // Form state
  const [showModal, setShowModal] = useState(false)
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    instructions: '',
    assignment_type: 'homework',
    class_id: '',
    subject_id: '',
    due_date: '',
    max_points: '',
    is_graded: false,
  })

  // Reference data
  const [classes, setClasses] = useState<Class[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])

  // View students modal
  const [viewingAssignment, setViewingAssignment] = useState<Assignment | null>(null)
  const [studentAssignments, setStudentAssignments] = useState<StudentAssignment[]>([])
  const [isLoadingStudents, setIsLoadingStudents] = useState(false)

  // Delete modal
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; item: Assignment | null }>({
    open: false,
    item: null,
  })
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (user?.institution_id) {
      fetchReferenceData()
    }
  }, [user?.institution_id])

  useEffect(() => {
    if (user?.institution_id) {
      fetchAssignments()
    }
  }, [user?.institution_id, currentPage, searchQuery, classFilter, subjectFilter])

  async function fetchReferenceData() {
    if (!user?.institution_id) return
    const supabase = createClient()
    const centerId = user.institution_id

    const [classesRes, subjectsRes, teachersRes] = await Promise.all([
      supabase.from('programs').select('id, name').eq('institution_id', centerId).eq('is_active', true).order('name'),
      supabase.from('courses').select('id, name').eq('institution_id', centerId).eq('is_active', true).order('name'),
      supabase.from('lecturers').select('id, full_name').eq('institution_id', centerId).eq('is_active', true).order('full_name'),
    ])

    setClasses((classesRes.data || []) as Class[])
    setSubjects((subjectsRes.data || []) as Subject[])
    setTeachers((teachersRes.data || []) as Teacher[])
  }

  async function fetchAssignments() {
    if (!user?.institution_id) return
    setIsLoading(true)
    const supabase = createClient()

    let query = supabase
      .from('assignments')
      .select(`
        *,
        subject:subjects(id, name),
        class:classes(id, name),
        teacher:teachers!assigned_by(id, full_name)
      `, { count: 'exact' })
      .eq('institution_id', user.institution_id)
      .eq('is_active', true)
      .order('due_date', { ascending: false })

    if (classFilter) query = query.eq('class_id', classFilter)
    if (subjectFilter) query = query.eq('subject_id', subjectFilter)

    const from = (currentPage - 1) * ITEMS_PER_PAGE
    query = query.range(from, from + ITEMS_PER_PAGE - 1)

    const { data, count, error } = await query

    if (!error && data) {
      // Get stats for each assignment
      const assignmentsWithStats = await Promise.all(
        (data as Assignment[]).map(async (a) => {
          const { data: stats } = await supabase.rpc('get_assignment_stats' as never, { p_assignment_id: a.id } as never)
          const statsArray = stats as unknown as { total: number; completed: number; pending: number; late: number }[] | null
          return {
            ...a,
            _stats: statsArray?.[0] || { total: 0, completed: 0, pending: 0, late: 0 }
          }
        })
      )

      // Filter by search query
      let filtered = assignmentsWithStats
      if (searchQuery) {
        const search = searchQuery.toLowerCase()
        filtered = filtered.filter(a =>
          a.title.toLowerCase().includes(search) ||
          a.description?.toLowerCase().includes(search)
        )
      }

      setAssignments(filtered)
      setTotalCount(count || 0)
    }
    setIsLoading(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!user?.institution_id) return
    setIsSaving(true)
    const supabase = createClient()

    try {
      // Get first teacher if none selected (for admin users)
      let teacherId = teachers[0]?.id
      if (!teacherId) {
        toast.error('No teachers available')
        return
      }

      const assignmentData = {
        institution_id: user.institution_id,
        title: form.title,
        description: form.description || null,
        instructions: form.instructions || null,
        assignment_type: form.assignment_type,
        class_id: form.class_id || null,
        subject_id: form.subject_id || null,
        due_date: form.due_date,
        max_points: form.max_points ? parseFloat(form.max_points) : null,
        is_graded: form.is_graded,
        assigned_by: teacherId,
      }

      if (editingAssignment) {
        const { error } = await supabase
          .from('assignments')
          .update(assignmentData as never)
          .eq('id', editingAssignment.id)
        if (error) throw error
        toast.success('Assignment updated')
      } else {
        const { error } = await supabase
          .from('assignments')
          .insert(assignmentData as never)
        if (error) throw error
        toast.success('Assignment created')
      }

      setShowModal(false)
      resetForm()
      fetchAssignments()
    } catch (error) {
      console.error('Error saving assignment:', error)
      toast.error('Failed to save assignment')
    } finally {
      setIsSaving(false)
    }
  }

  function resetForm() {
    setForm({
      title: '',
      description: '',
      instructions: '',
      assignment_type: 'homework',
      class_id: '',
      subject_id: '',
      due_date: '',
      max_points: '',
      is_graded: false,
    })
    setEditingAssignment(null)
  }

  function openEdit(assignment: Assignment) {
    setForm({
      title: assignment.title,
      description: assignment.description || '',
      instructions: assignment.instructions || '',
      assignment_type: assignment.assignment_type,
      class_id: assignment.class?.id || '',
      subject_id: assignment.subject?.id || '',
      due_date: assignment.due_date,
      max_points: assignment.max_points?.toString() || '',
      is_graded: assignment.is_graded,
    })
    setEditingAssignment(assignment)
    setShowModal(true)
  }

  async function viewStudents(assignment: Assignment) {
    setViewingAssignment(assignment)
    setIsLoadingStudents(true)

    const supabase = createClient()
    const { data } = await supabase
      .from('student_assignments')
      .select(`
        *,
        student:students(id, full_name, student_number)
      `)
      .eq('assignment_id', assignment.id)
      .order('student(full_name)')

    setStudentAssignments((data || []) as StudentAssignment[])
    setIsLoadingStudents(false)
  }

  async function updateStudentStatus(studentAssignmentId: string, status: string) {
    const supabase = createClient()

    const updateData: Record<string, unknown> = { status }
    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString()
    }

    const { error } = await supabase
      .from('student_assignments')
      .update(updateData as never)
      .eq('id', studentAssignmentId)

    if (!error) {
      toast.success('Status updated')
      if (viewingAssignment) {
        viewStudents(viewingAssignment)
      }
      fetchAssignments()
    }
  }

  async function handleDelete() {
    if (!deleteModal.item) return
    setIsDeleting(true)
    const supabase = createClient()

    try {
      // Soft delete by setting is_active to false
      const { error } = await supabase
        .from('assignments')
        .update({ is_active: false } as never)
        .eq('id', deleteModal.item.id)

      if (error) throw error
      toast.success('Assignment deleted')
      fetchAssignments()
      setDeleteModal({ open: false, item: null })
    } catch (error) {
      console.error('Error deleting:', error)
      toast.error('Failed to delete assignment')
    } finally {
      setIsDeleting(false)
    }
  }

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 md:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Homework & Assignments</h1>
              <p className="mt-1 text-sm text-gray-500">Create and manage homework assignments</p>
            </div>
            <Button
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => {
                resetForm()
                setShowModal(true)
              }}
            >
              New Assignment
            </Button>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-6 space-y-6">
        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search assignments..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select
              className="w-48"
              options={[{ value: '', label: 'All Classes' }, ...classes.map(c => ({ value: c.id, label: c.name }))]}
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
            />
            <Select
              className="w-48"
              options={[{ value: '', label: 'All Subjects' }, ...subjects.map(s => ({ value: s.id, label: s.name }))]}
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
            />
          </div>
        </div>

        {/* Assignments List */}
        <div className="bg-white rounded-xl border border-gray-200">
          {isLoading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
            </div>
          ) : assignments.length === 0 ? (
            <div className="p-12 text-center">
              <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No assignments yet</h3>
              <p className="text-gray-500 mb-4">Create your first assignment to get started</p>
              <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowModal(true)}>
                New Assignment
              </Button>
            </div>
          ) : (
            <>
              <div className="divide-y divide-gray-100">
                {assignments.map((assignment) => {
                  const isOverdue = new Date(assignment.due_date) < new Date() && (assignment._stats?.pending || 0) > 0
                  return (
                    <div key={assignment.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className={`p-3 rounded-lg ${isOverdue ? 'bg-red-100' : 'bg-blue-100'}`}>
                            <BookOpen className={`w-6 h-6 ${isOverdue ? 'text-red-600' : 'text-blue-600'}`} />
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900">{assignment.title}</h3>
                            <p className="text-sm text-gray-500">
                              {assignment.subject?.name && `${assignment.subject.name} • `}
                              {assignment.class?.name && `${assignment.class.name} • `}
                              Due: {new Date(assignment.due_date).toLocaleDateString('en-ZA')}
                            </p>
                            {assignment.description && (
                              <p className="text-sm text-gray-400 mt-1 line-clamp-1">{assignment.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          {/* Stats */}
                          <div className="flex items-center gap-3 text-sm">
                            <div className="text-center">
                              <p className="font-semibold text-green-600">{assignment._stats?.completed || 0}</p>
                              <p className="text-xs text-gray-500">Done</p>
                            </div>
                            <div className="text-center">
                              <p className="font-semibold text-yellow-600">{assignment._stats?.pending || 0}</p>
                              <p className="text-xs text-gray-500">Pending</p>
                            </div>
                            {(assignment._stats?.late || 0) > 0 && (
                              <div className="text-center">
                                <p className="font-semibold text-red-600">{assignment._stats?.late}</p>
                                <p className="text-xs text-gray-500">Late</p>
                              </div>
                            )}
                          </div>
                          {/* Actions */}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => viewStudents(assignment)}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                              title="View Students"
                            >
                              <Users className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openEdit(assignment)}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteModal({ open: true, item: assignment })}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
                  <p className="text-sm text-gray-500">
                    Page {currentPage} of {totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
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

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingAssignment ? 'Edit Assignment' : 'New Assignment'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <Input
                label="Title"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Assignment title"
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none"
                  rows={3}
                  placeholder="Brief description..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Type"
                  required
                  value={form.assignment_type}
                  onChange={(e) => setForm({ ...form, assignment_type: e.target.value })}
                  options={ASSIGNMENT_TYPES}
                />
                <Input
                  label="Due Date"
                  type="date"
                  required
                  value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Class"
                  value={form.class_id}
                  onChange={(e) => setForm({ ...form, class_id: e.target.value })}
                  options={[{ value: '', label: 'Select Class' }, ...classes.map(c => ({ value: c.id, label: c.name }))]}
                />
                <Select
                  label="Subject"
                  value={form.subject_id}
                  onChange={(e) => setForm({ ...form, subject_id: e.target.value })}
                  options={[{ value: '', label: 'Select Subject' }, ...subjects.map(s => ({ value: s.id, label: s.name }))]}
                />
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_graded}
                    onChange={(e) => setForm({ ...form, is_graded: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">Graded assignment</span>
                </label>
                {form.is_graded && (
                  <Input
                    type="number"
                    value={form.max_points}
                    onChange={(e) => setForm({ ...form, max_points: e.target.value })}
                    placeholder="Max points"
                    className="w-32"
                  />
                )}
              </div>
              <div className="flex gap-3 pt-4">
                <Button type="button" variant="secondary" onClick={() => setShowModal(false)} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving} className="flex-1">
                  {isSaving ? 'Saving...' : editingAssignment ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Students Modal */}
      {viewingAssignment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{viewingAssignment.title}</h2>
                <p className="text-sm text-gray-500">Due: {new Date(viewingAssignment.due_date).toLocaleDateString('en-ZA')}</p>
              </div>
              <button onClick={() => setViewingAssignment(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              {isLoadingStudents ? (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
                </div>
              ) : studentAssignments.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No students assigned</p>
              ) : (
                <div className="space-y-3">
                  {studentAssignments.map((sa) => {
                    const badge = STATUS_BADGES[sa.status] || STATUS_BADGES.pending
                    return (
                      <div key={sa.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{sa.student?.full_name}</p>
                          <p className="text-sm text-gray-500">{sa.student?.student_number}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <select
                            value={sa.status}
                            onChange={(e) => updateStudentStatus(sa.id, e.target.value)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium border-0 ${badge.bg} ${badge.text}`}
                          >
                            <option value="pending">Pending</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                            <option value="incomplete">Incomplete</option>
                            <option value="late">Late</option>
                            <option value="excused">Excused</option>
                          </select>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      <ConfirmModal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, item: null })}
        onConfirm={handleDelete}
        title="Delete Assignment"
        message="Are you sure you want to delete this assignment? This action cannot be undone."
        confirmText="Delete"
        isLoading={isDeleting}
      />
    </div>
  )
}
