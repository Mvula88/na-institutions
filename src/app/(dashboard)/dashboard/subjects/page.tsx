'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
} from 'lucide-react'
import toast from 'react-hot-toast'
import { formatCurrency } from '@/lib/currency'
import { parseNumericInput, formatNumericValue } from '@/lib/numeric-input'

// Default subjects that all centers start with
const DEFAULT_SUBJECTS = [
  { name: 'English', code: 'ENG', description: 'English Language and Literature' },
  { name: 'Mathematics', code: 'MATH', description: 'Mathematics and Problem Solving' },
  { name: 'Accounting', code: 'ACC', description: 'Financial Accounting and Bookkeeping' },
  { name: 'Entrepreneurship', code: 'ENT', description: 'Business and Entrepreneurship Studies' },
  { name: 'Biology', code: 'BIO', description: 'Life Sciences and Biology' },
  { name: 'Physics', code: 'PHY', description: 'Physical Sciences' },
  { name: 'Geography', code: 'GEO', description: 'Geography and Environmental Studies' },
  { name: 'History', code: 'HIS', description: 'Historical Studies' },
  { name: 'Agricultural Science', code: 'AGR', description: 'Agricultural Science and Farming' },
  { name: 'Development Studies', code: 'DEV', description: 'Development and Social Studies' },
  { name: 'Economics', code: 'ECO', description: 'Economics and Business Economics' },
  { name: 'Chemistry', code: 'CHE', description: 'Chemical Sciences' },
  { name: 'Business Studies', code: 'BUS', description: 'Business Management and Commerce' },
]

interface Subject {
  id: string
  name: string
  code: string | null
  description: string | null
  monthly_fee: number
  is_active: boolean
  created_at: string
  _count?: {
    students: number
    teachers: number
  }
}

export default function SubjectsPage() {
  const { user, isCenterAdmin } = useAuthStore()
  const canEdit = isCenterAdmin()
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isInitializing, setIsInitializing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Modal states
  const [showModal, setShowModal] = useState(false)
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    monthly_fee: 0,
    is_active: true,
  })

  // Delete modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Toggle loading state
  const [togglingId, setTogglingId] = useState<string | null>(null)

  useEffect(() => {
    initializeAndFetchSubjects()
  }, [user?.institution_id])

  async function initializeAndFetchSubjects() {
    if (!user?.institution_id) return

    setIsLoading(true)
    const supabase = createClient()

    try {
      const { data: existingSubjects, error: checkError } = await supabase
        .from('courses')
        .select('name')
        .eq('institution_id', user.institution_id)

      if (checkError) throw checkError

      if (!existingSubjects || existingSubjects.length === 0) {
        setIsInitializing(true)
        const defaultSubjectsToInsert = DEFAULT_SUBJECTS.map((s) => ({
          institution_id: user.institution_id,
          name: s.name,
          code: s.code,
          description: s.description,
          monthly_fee: 0,
          is_active: true,
        }))

        const { error: insertError } = await supabase
          .from('courses')
          .insert(defaultSubjectsToInsert as never)

        if (insertError) throw insertError
        setIsInitializing(false)
      }

      await fetchSubjects()
    } catch (error) {
      console.error('Error initializing subjects:', error)
      toast.error('Failed to load subjects')
      setIsLoading(false)
      setIsInitializing(false)
    }
  }

  async function fetchSubjects() {
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

      interface SubjectData {
        id: string
        name: string
        code: string | null
        description: string | null
        monthly_fee: number
        is_active: boolean
        created_at: string
        updated_at: string
      }
      const typedData = (data || []) as SubjectData[]
      const subjectsWithCounts = await Promise.all(
        typedData.map(async (subject) => {
          const [studentCount, teacherCount] = await Promise.all([
            supabase
              .from('student_enrollments')
              .select('id', { count: 'exact' })
              .eq('course_id', subject.id),
            supabase
              .from('lecturer_courses')
              .select('id', { count: 'exact' })
              .eq('course_id', subject.id),
          ])

          return {
            ...subject,
            _count: {
              students: studentCount.count || 0,
              teachers: teacherCount.count || 0,
            },
          }
        })
      )

      setSubjects(subjectsWithCounts)
    } catch (error) {
      console.error('Error fetching subjects:', error)
      toast.error('Failed to fetch subjects')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleToggleActive(subject: Subject) {
    setTogglingId(subject.id)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('courses')
        .update({
          is_active: !subject.is_active,
          updated_at: new Date().toISOString(),
        } as never)
        .eq('id', subject.id)

      if (error) throw error

      setSubjects((prev) =>
        prev.map((s) =>
          s.id === subject.id ? { ...s, is_active: !s.is_active } : s
        )
      )

      toast.success(
        `${subject.name} ${!subject.is_active ? 'activated' : 'deactivated'}`
      )
    } catch (error) {
      console.error('Error toggling subject:', error)
      toast.error('Failed to update subject')
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
      if (editingSubject) {
        const { error } = await supabase
          .from('courses')
          .update({
            name: formData.name,
            code: formData.code || null,
            description: formData.description || null,
            monthly_fee: formData.monthly_fee,
            is_active: formData.is_active,
            updated_at: new Date().toISOString(),
          } as never)
          .eq('id', editingSubject.id)

        if (error) throw error
        toast.success('Subject updated successfully')
      } else {
        const { error } = await supabase.from('courses').insert({
          institution_id: user.institution_id,
          name: formData.name,
          code: formData.code || null,
          description: formData.description || null,
          monthly_fee: formData.monthly_fee,
          is_active: formData.is_active,
        } as never)

        if (error) throw error
        toast.success('Subject added successfully')
      }

      setShowModal(false)
      resetForm()
      fetchSubjects()
    } catch (error) {
      console.error('Error saving subject:', error)
      toast.error('Failed to save subject')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    if (!subjectToDelete) return

    setIsDeleting(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', subjectToDelete.id)

      if (error) throw error

      toast.success('Subject deleted successfully')
      setDeleteModalOpen(false)
      setSubjectToDelete(null)
      fetchSubjects()
    } catch (error) {
      console.error('Error deleting subject:', error)
      toast.error('Failed to delete subject. It may have enrollments.')
    } finally {
      setIsDeleting(false)
    }
  }

  function resetForm() {
    setFormData({
      name: '',
      code: '',
      description: '',
      monthly_fee: 0,
      is_active: true,
    })
    setEditingSubject(null)
  }

  function openEdit(subject: Subject) {
    setFormData({
      name: subject.name,
      code: subject.code || '',
      description: subject.description || '',
      monthly_fee: subject.monthly_fee,
      is_active: subject.is_active,
    })
    setEditingSubject(subject)
    setShowModal(true)
  }

  function isDefaultSubject(name: string): boolean {
    return DEFAULT_SUBJECTS.some(
      (ds) => ds.name.toLowerCase() === name.toLowerCase()
    )
  }

  const filteredSubjects = subjects.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.code?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const standardSubjects = filteredSubjects.filter((s) => isDefaultSubject(s.name))
  const customSubjects = filteredSubjects.filter((s) => !isDefaultSubject(s.name))

  const activeCount = subjects.filter((s) => s.is_active).length
  const totalFeeRevenue = subjects.filter(s => s.is_active).reduce((sum, s) => sum + s.monthly_fee, 0)

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-4" />
        <p className="text-gray-600">Setting up default subjects...</p>
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
              <h1 className="text-2xl font-semibold text-gray-900">Subjects</h1>
              <p className="mt-1 text-sm text-gray-500">Manage subjects and their monthly fees</p>
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
                Add Custom Subject
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
                <p className="text-sm font-medium text-gray-500">Total Subjects</p>
                <p className="mt-2 text-2xl font-semibold text-gray-900">
                  {subjects.length}
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
                  {subjects.length - activeCount}
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
                <p className="text-sm font-medium text-gray-500">Total Monthly Fee</p>
                <p className="mt-2 text-2xl font-semibold text-emerald-600">
                  {formatCurrency(totalFeeRevenue)}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Per student (all subjects)
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
              placeholder="Search subjects by name or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none text-sm"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
            <p className="mt-2 text-sm text-gray-500">Loading subjects...</p>
          </div>
        ) : (
          <>
            {/* Standard Subjects */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <h2 className="text-lg font-semibold text-gray-900">Standard Subjects</h2>
                <span className="text-sm text-gray-500">
                  ({standardSubjects.filter((s) => s.is_active).length} active)
                </span>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-gray-100">
                  {standardSubjects.map((subject) => (
                    <div
                      key={subject.id}
                      className={`bg-white p-4 flex items-center justify-between transition-colors ${
                        subject.is_active ? '' : 'opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {canEdit ? (
                          <button
                            onClick={() => handleToggleActive(subject)}
                            disabled={togglingId === subject.id}
                            className={`flex-shrink-0 w-11 h-6 rounded-full transition-colors relative ${
                              subject.is_active ? 'bg-green-500' : 'bg-gray-300'
                            }`}
                          >
                            <span
                              className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                                subject.is_active ? 'left-6' : 'left-1'
                              }`}
                            />
                            {togglingId === subject.id && (
                              <Loader2 className="w-4 h-4 animate-spin absolute top-1 left-3.5 text-gray-400" />
                            )}
                          </button>
                        ) : (
                          <span
                            className={`flex-shrink-0 w-3 h-3 rounded-full ${
                              subject.is_active ? 'bg-green-500' : 'bg-gray-300'
                            }`}
                          />
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {subject.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {subject.code} • {formatCurrency(subject.monthly_fee)}/mo
                          </p>
                        </div>
                      </div>
                      {canEdit && (
                        <button
                          onClick={() => openEdit(subject)}
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

            {/* Custom Subjects */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-500" />
                  <h2 className="text-lg font-semibold text-gray-900">Custom Subjects</h2>
                  <span className="text-sm text-gray-500">
                    ({customSubjects.length} subjects)
                  </span>
                </div>
              </div>

              {customSubjects.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                  <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No custom subjects</h3>
                  <p className="text-gray-500 mb-6">
                    {canEdit ? 'Add subjects specific to your center.' : 'No custom subjects have been added.'}
                  </p>
                  {canEdit && (
                    <Button
                      leftIcon={<Plus className="w-4 h-4" />}
                      onClick={() => {
                        resetForm()
                        setShowModal(true)
                      }}
                    >
                      Add Custom Subject
                    </Button>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-gray-100">
                    {customSubjects.map((subject) => (
                      <div
                        key={subject.id}
                        className={`bg-white p-4 flex items-center justify-between transition-colors ${
                          subject.is_active ? '' : 'opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {canEdit ? (
                            <button
                              onClick={() => handleToggleActive(subject)}
                              disabled={togglingId === subject.id}
                              className={`flex-shrink-0 w-11 h-6 rounded-full transition-colors relative ${
                                subject.is_active ? 'bg-green-500' : 'bg-gray-300'
                              }`}
                            >
                              <span
                                className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                                  subject.is_active ? 'left-6' : 'left-1'
                                }`}
                              />
                              {togglingId === subject.id && (
                                <Loader2 className="w-4 h-4 animate-spin absolute top-1 left-3.5 text-gray-400" />
                              )}
                            </button>
                          ) : (
                            <span
                              className={`flex-shrink-0 w-3 h-3 rounded-full ${
                                subject.is_active ? 'bg-green-500' : 'bg-gray-300'
                              }`}
                            />
                          )}
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate">
                              {subject.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {subject.code || 'No code'} • {formatCurrency(subject.monthly_fee)}/mo
                            </p>
                          </div>
                        </div>
                        {canEdit && (
                          <div className="flex items-center gap-1 ml-2">
                            <button
                              onClick={() => openEdit(subject)}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSubjectToDelete(subject)
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
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingSubject ? 'Edit Subject' : 'Add Custom Subject'}
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
                label="Subject Name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Computer Science"
              />

              <Input
                label="Subject Code"
                value={formData.code}
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value.toUpperCase() })
                }
                placeholder="e.g., CS"
                maxLength={5}
              />

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
          setSubjectToDelete(null)
        }}
        onConfirm={handleDelete}
        title="Delete Subject"
        message={`Are you sure you want to delete "${subjectToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        isLoading={isDeleting}
      />
    </div>
  )
}
