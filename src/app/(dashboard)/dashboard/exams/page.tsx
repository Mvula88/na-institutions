'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/input'
import { ConfirmModal } from '@/components/ui/modal'
import {
  CalendarDays,
  Plus,
  Search,
  Clock,
  MapPin,
  Users,
  X,
  Loader2,
  Trash2,
  Pencil,
  CheckCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Exam {
  id: string
  name: string
  description: string | null
  exam_type: string
  exam_date: string
  start_time: string
  end_time: string
  duration_minutes: number | null
  venue: string | null
  room_number: string | null
  total_marks: number
  pass_mark: number | null
  instructions: string | null
  status: string
  subject?: { id: string; name: string }
  class?: { id: string; name: string }
  _count?: { students: number }
}

interface Class {
  id: string
  name: string
}

interface Subject {
  id: string
  name: string
}

const ITEMS_PER_PAGE = 10

const EXAM_TYPES = [
  { value: 'exam', label: 'Exam' },
  { value: 'test', label: 'Test' },
  { value: 'quiz', label: 'Quiz' },
  { value: 'midterm', label: 'Midterm' },
  { value: 'final', label: 'Final' },
  { value: 'mock', label: 'Mock Exam' },
  { value: 'practical', label: 'Practical' },
  { value: 'oral', label: 'Oral' },
  { value: 'other', label: 'Other' },
]

const STATUS_BADGES: Record<string, { bg: string; text: string }> = {
  scheduled: { bg: 'bg-blue-100', text: 'text-blue-700' },
  in_progress: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  completed: { bg: 'bg-green-100', text: 'text-green-700' },
  postponed: { bg: 'bg-orange-100', text: 'text-orange-700' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-700' },
}

export default function ExamsPage() {
  const { user } = useAuthStore()
  const [isLoading, setIsLoading] = useState(true)

  // Exams state
  const [exams, setExams] = useState<Exam[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [classFilter, setClassFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  // Form state
  const [showModal, setShowModal] = useState(false)
  const [editingExam, setEditingExam] = useState<Exam | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    description: '',
    exam_type: 'exam',
    class_id: '',
    subject_id: '',
    exam_date: '',
    start_time: '09:00',
    end_time: '12:00',
    venue: '',
    room_number: '',
    total_marks: '100',
    pass_mark: '50',
    instructions: '',
  })

  // Reference data
  const [classes, setClasses] = useState<Class[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])

  // Delete modal
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; item: Exam | null }>({
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
      fetchExams()
    }
  }, [user?.institution_id, currentPage, searchQuery, classFilter, statusFilter])

  async function fetchReferenceData() {
    if (!user?.institution_id) return
    const supabase = createClient()
    const centerId = user.institution_id

    const [classesRes, subjectsRes] = await Promise.all([
      supabase.from('programs').select('id, name').eq('institution_id', centerId).eq('is_active', true).order('name'),
      supabase.from('courses').select('id, name').eq('institution_id', centerId).eq('is_active', true).order('name'),
    ])

    setClasses((classesRes.data || []) as Class[])
    setSubjects((subjectsRes.data || []) as Subject[])
  }

  async function fetchExams() {
    if (!user?.institution_id) return
    setIsLoading(true)
    const supabase = createClient()

    let query = supabase
      .from('exams')
      .select(`
        *,
        subject:subjects(id, name),
        class:classes(id, name)
      `, { count: 'exact' })
      .eq('institution_id', user.institution_id)
      .order('exam_date', { ascending: true })

    if (classFilter) query = query.eq('class_id', classFilter)
    if (statusFilter) query = query.eq('status', statusFilter)

    const from = (currentPage - 1) * ITEMS_PER_PAGE
    query = query.range(from, from + ITEMS_PER_PAGE - 1)

    const { data, count, error } = await query

    if (!error && data) {
      // Get student counts for each exam
      const examsWithCounts = await Promise.all(
        (data as Exam[]).map(async (e) => {
          const { count: studentCount } = await supabase
            .from('student_exams')
            .select('*', { count: 'exact', head: true })
            .eq('exam_id', e.id)
          return { ...e, _count: { students: studentCount || 0 } }
        })
      )

      // Filter by search query
      let filtered = examsWithCounts
      if (searchQuery) {
        const search = searchQuery.toLowerCase()
        filtered = filtered.filter(e =>
          e.name.toLowerCase().includes(search) ||
          e.description?.toLowerCase().includes(search)
        )
      }

      setExams(filtered)
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
      const examData = {
        institution_id: user.institution_id,
        name: form.name,
        description: form.description || null,
        exam_type: form.exam_type,
        class_id: form.class_id || null,
        subject_id: form.subject_id || null,
        exam_date: form.exam_date,
        start_time: form.start_time,
        end_time: form.end_time,
        venue: form.venue || null,
        room_number: form.room_number || null,
        total_marks: parseFloat(form.total_marks) || 100,
        pass_mark: form.pass_mark ? parseFloat(form.pass_mark) : null,
        instructions: form.instructions || null,
        created_by: user.id,
      }

      if (editingExam) {
        const { error } = await supabase
          .from('exams')
          .update(examData as never)
          .eq('id', editingExam.id)
        if (error) throw error
        toast.success('Exam updated')
      } else {
        const { error } = await supabase
          .from('exams')
          .insert(examData as never)
        if (error) throw error
        toast.success('Exam scheduled')
      }

      setShowModal(false)
      resetForm()
      fetchExams()
    } catch (error) {
      console.error('Error saving exam:', error)
      toast.error('Failed to save exam')
    } finally {
      setIsSaving(false)
    }
  }

  function resetForm() {
    setForm({
      name: '',
      description: '',
      exam_type: 'exam',
      class_id: '',
      subject_id: '',
      exam_date: '',
      start_time: '09:00',
      end_time: '12:00',
      venue: '',
      room_number: '',
      total_marks: '100',
      pass_mark: '50',
      instructions: '',
    })
    setEditingExam(null)
  }

  function openEdit(exam: Exam) {
    setForm({
      name: exam.name,
      description: exam.description || '',
      exam_type: exam.exam_type,
      class_id: exam.class?.id || '',
      subject_id: exam.subject?.id || '',
      exam_date: exam.exam_date,
      start_time: exam.start_time,
      end_time: exam.end_time,
      venue: exam.venue || '',
      room_number: exam.room_number || '',
      total_marks: exam.total_marks?.toString() || '100',
      pass_mark: exam.pass_mark?.toString() || '',
      instructions: exam.instructions || '',
    })
    setEditingExam(exam)
    setShowModal(true)
  }

  async function updateStatus(exam: Exam, status: string) {
    const supabase = createClient()

    const { error } = await supabase
      .from('exams')
      .update({ status } as never)
      .eq('id', exam.id)

    if (!error) {
      toast.success(`Exam ${status}`)
      fetchExams()
    } else {
      toast.error('Failed to update status')
    }
  }

  async function handleDelete() {
    if (!deleteModal.item) return
    setIsDeleting(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('exams')
        .delete()
        .eq('id', deleteModal.item.id)

      if (error) throw error
      toast.success('Exam deleted')
      fetchExams()
      setDeleteModal({ open: false, item: null })
    } catch (error) {
      console.error('Error deleting:', error)
      toast.error('Failed to delete exam')
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
              <h1 className="text-2xl font-semibold text-gray-900">Exam Schedule</h1>
              <p className="mt-1 text-sm text-gray-500">Schedule and manage exams</p>
            </div>
            <Button
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => {
                resetForm()
                setShowModal(true)
              }}
            >
              Schedule Exam
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
                placeholder="Search exams..."
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
              className="w-40"
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'scheduled', label: 'Scheduled' },
                { value: 'in_progress', label: 'In Progress' },
                { value: 'completed', label: 'Completed' },
                { value: 'postponed', label: 'Postponed' },
                { value: 'cancelled', label: 'Cancelled' },
              ]}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            />
          </div>
        </div>

        {/* Exams List */}
        <div className="bg-white rounded-xl border border-gray-200">
          {isLoading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
            </div>
          ) : exams.length === 0 ? (
            <div className="p-12 text-center">
              <CalendarDays className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No exams scheduled</h3>
              <p className="text-gray-500 mb-4">Schedule your first exam to get started</p>
              <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowModal(true)}>
                Schedule Exam
              </Button>
            </div>
          ) : (
            <>
              <div className="divide-y divide-gray-100">
                {exams.map((exam) => {
                  const badge = STATUS_BADGES[exam.status] || STATUS_BADGES.scheduled
                  const isPast = new Date(exam.exam_date) < new Date()
                  const isToday = exam.exam_date === new Date().toISOString().split('T')[0]

                  return (
                    <div key={exam.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className={`p-3 rounded-lg ${isToday ? 'bg-yellow-100' : isPast ? 'bg-gray-100' : 'bg-blue-100'}`}>
                            <CalendarDays className={`w-6 h-6 ${isToday ? 'text-yellow-600' : isPast ? 'text-gray-600' : 'text-blue-600'}`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium text-gray-900">{exam.name}</h3>
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${badge.bg} ${badge.text}`}>
                                {exam.status.charAt(0).toUpperCase() + exam.status.slice(1).replace('_', ' ')}
                              </span>
                              {isToday && exam.status === 'scheduled' && (
                                <span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-700">
                                  Today
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500">
                              {exam.subject?.name && `${exam.subject.name} • `}
                              {exam.class?.name && `${exam.class.name} • `}
                              {EXAM_TYPES.find(t => t.value === exam.exam_type)?.label || exam.exam_type}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                              <span className="flex items-center gap-1">
                                <CalendarDays className="w-4 h-4" />
                                {new Date(exam.exam_date).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' })}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {exam.start_time.slice(0, 5)} - {exam.end_time.slice(0, 5)}
                                {exam.duration_minutes && ` (${exam.duration_minutes} min)`}
                              </span>
                              {exam.venue && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-4 h-4" />
                                  {exam.venue}{exam.room_number && ` - ${exam.room_number}`}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <p className="text-sm font-medium text-gray-900">{exam._count?.students || 0}</p>
                            <p className="text-xs text-gray-500">Students</p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-medium text-gray-900">{exam.total_marks}</p>
                            <p className="text-xs text-gray-500">Marks</p>
                          </div>
                          <div className="flex items-center gap-1">
                            {exam.status === 'scheduled' && (
                              <button
                                onClick={() => updateStatus(exam, 'completed')}
                                className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg"
                                title="Mark Complete"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => openEdit(exam)}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteModal({ open: true, item: exam })}
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
                  <p className="text-sm text-gray-500">Page {currentPage} of {totalPages}</p>
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
                {editingExam ? 'Edit Exam' : 'Schedule Exam'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <Input
                label="Exam Name"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., Mathematics Midterm"
              />
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Type"
                  required
                  value={form.exam_type}
                  onChange={(e) => setForm({ ...form, exam_type: e.target.value })}
                  options={EXAM_TYPES}
                />
                <Input
                  label="Date"
                  type="date"
                  required
                  value={form.exam_date}
                  onChange={(e) => setForm({ ...form, exam_date: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Start Time"
                  type="time"
                  required
                  value={form.start_time}
                  onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                />
                <Input
                  label="End Time"
                  type="time"
                  required
                  value={form.end_time}
                  onChange={(e) => setForm({ ...form, end_time: e.target.value })}
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
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Venue"
                  value={form.venue}
                  onChange={(e) => setForm({ ...form, venue: e.target.value })}
                  placeholder="e.g., Main Hall"
                />
                <Input
                  label="Room Number"
                  value={form.room_number}
                  onChange={(e) => setForm({ ...form, room_number: e.target.value })}
                  placeholder="e.g., Room 101"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Total Marks"
                  type="number"
                  value={form.total_marks}
                  onChange={(e) => setForm({ ...form, total_marks: e.target.value })}
                />
                <Input
                  label="Pass Mark"
                  type="number"
                  value={form.pass_mark}
                  onChange={(e) => setForm({ ...form, pass_mark: e.target.value })}
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Instructions</label>
                <textarea
                  value={form.instructions}
                  onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none"
                  rows={3}
                  placeholder="Exam instructions for students..."
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button type="button" variant="secondary" onClick={() => setShowModal(false)} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving} className="flex-1">
                  {isSaving ? 'Saving...' : editingExam ? 'Update' : 'Schedule'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      <ConfirmModal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, item: null })}
        onConfirm={handleDelete}
        title="Delete Exam"
        message="Are you sure you want to delete this exam? This action cannot be undone."
        confirmText="Delete"
        isLoading={isDeleting}
      />
    </div>
  )
}
