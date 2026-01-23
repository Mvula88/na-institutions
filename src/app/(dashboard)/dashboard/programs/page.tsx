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
  Award,
  Clock,
  BookOpen,
  Settings2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { qualificationTypes, nqfLevels } from '@/config/terminology'
import { parseNumericInput, parseIntegerInput, formatNumericValue } from '@/lib/numeric-input'
import ProgramCoursesManager from '@/components/programs/program-courses-manager'

interface Program {
  id: string
  name: string
  program_code: string | null
  description: string | null
  qualification_type: string | null
  nqf_level: number | null
  total_credits: number | null
  duration_years: number | null
  is_active: boolean
  created_at: string
  _count?: { students: number; courses: number }
}

const ITEMS_PER_PAGE = 10

export default function ProgramsPage() {
  const { user, isInstitutionAdmin } = useAuthStore()
  const canEdit = isInstitutionAdmin()
  const [programs, setPrograms] = useState<Program[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [qualificationFilter, setQualificationFilter] = useState('')

  // Modal states
  const [showModal, setShowModal] = useState(false)
  const [editingProgram, setEditingProgram] = useState<Program | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    program_code: '',
    description: '',
    qualification_type: '',
    nqf_level: 0,
    total_credits: 0,
    duration_years: 0,
    is_active: true,
  })

  // Delete modal
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; program: Program | null }>({
    open: false,
    program: null,
  })
  const [isDeleting, setIsDeleting] = useState(false)

  // Courses manager modal
  const [coursesModal, setCoursesModal] = useState<{ open: boolean; program: Program | null }>({
    open: false,
    program: null,
  })

  useEffect(() => {
    if (user?.institution_id) {
      fetchPrograms()
    }
  }, [user?.institution_id, currentPage, searchTerm, qualificationFilter])

  async function fetchPrograms() {
    if (!user?.institution_id) return
    setIsLoading(true)
    const supabase = createClient()

    try {
      let query = supabase
        .from('programs')
        .select('*', { count: 'exact' })
        .eq('institution_id', user.institution_id)
        .order('name')

      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,program_code.ilike.%${searchTerm}%`)
      }
      if (qualificationFilter) {
        query = query.eq('qualification_type', qualificationFilter)
      }

      const from = (currentPage - 1) * ITEMS_PER_PAGE
      query = query.range(from, from + ITEMS_PER_PAGE - 1)

      const { data, count, error } = await query

      if (error) throw error

      // Fetch counts for each program
      const programsWithCounts = await Promise.all(
        ((data || []) as Program[]).map(async (program) => {
          const [studentCount, courseCount] = await Promise.all([
            supabase
              .from('students')
              .select('id', { count: 'exact' })
              .eq('program_id', program.id)
              .eq('status', 'active'),
            supabase
              .from('program_courses')
              .select('id', { count: 'exact' })
              .eq('program_id', program.id),
          ])

          return {
            ...program,
            _count: {
              students: studentCount.count || 0,
              courses: courseCount.count || 0,
            }
          }
        })
      )

      setPrograms(programsWithCounts)
      setTotalCount(count || 0)
    } catch (error) {
      console.error('Error fetching programs:', error)
      toast.error('Failed to fetch programs')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!user?.institution_id) return
    setIsSaving(true)
    const supabase = createClient()

    try {
      const programData = {
        institution_id: user.institution_id,
        name: formData.name.trim(),
        program_code: formData.program_code || null,
        description: formData.description || null,
        qualification_type: formData.qualification_type || null,
        nqf_level: formData.nqf_level || null,
        total_credits: formData.total_credits || null,
        duration_years: formData.duration_years || null,
        is_active: formData.is_active,
      }

      if (editingProgram) {
        const { error } = await supabase
          .from('programs')
          .update(programData as never)
          .eq('id', editingProgram.id)
        if (error) throw error
        toast.success('Program updated successfully')
      } else {
        const { error } = await supabase
          .from('programs')
          .insert(programData as never)
        if (error) throw error
        toast.success('Program created successfully')
      }

      setShowModal(false)
      resetForm()
      fetchPrograms()
    } catch (error: unknown) {
      console.error('Error saving program:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to save program'
      if (errorMessage.includes('unique') || errorMessage.includes('duplicate')) {
        toast.error('A program with this code already exists')
      } else {
        toast.error('Failed to save program')
      }
    } finally {
      setIsSaving(false)
    }
  }

  function resetForm() {
    setFormData({
      name: '',
      program_code: '',
      description: '',
      qualification_type: '',
      nqf_level: 0,
      total_credits: 0,
      duration_years: 0,
      is_active: true,
    })
    setEditingProgram(null)
  }

  function openEdit(program: Program) {
    setFormData({
      name: program.name,
      program_code: program.program_code || '',
      description: program.description || '',
      qualification_type: program.qualification_type || '',
      nqf_level: program.nqf_level || 0,
      total_credits: program.total_credits || 0,
      duration_years: program.duration_years || 0,
      is_active: program.is_active,
    })
    setEditingProgram(program)
    setShowModal(true)
  }

  async function handleDelete() {
    if (!deleteModal.program) return
    setIsDeleting(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('programs')
        .delete()
        .eq('id', deleteModal.program.id)

      if (error) throw error

      toast.success('Program deleted successfully')
      setDeleteModal({ open: false, program: null })
      fetchPrograms()
    } catch (error) {
      console.error('Error deleting program:', error)
      toast.error('Failed to delete program. It may have enrolled students.')
    } finally {
      setIsDeleting(false)
    }
  }

  function getQualificationLabel(type: string | null): string {
    if (!type) return 'Not specified'
    const qual = qualificationTypes.find(q => q.value === type)
    return qual?.label || type
  }

  function getNqfLabel(level: number | null): string {
    if (!level) return ''
    const nqf = nqfLevels.find(n => n.level === level)
    return nqf ? `NQF ${level}` : ''
  }

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)
  const activeCount = programs.filter(p => p.is_active).length

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 md:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Programs</h1>
              <p className="mt-1 text-sm text-gray-500">Manage academic programs and qualifications</p>
            </div>
            {canEdit && (
              <Button
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={() => {
                  resetForm()
                  setShowModal(true)
                }}
              >
                New Program
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
                <p className="text-sm font-medium text-gray-500">Total Programs</p>
                <p className="mt-2 text-2xl font-semibold text-gray-900">{programs.length}</p>
              </div>
              <div className="p-3 bg-indigo-100 rounded-xl">
                <GraduationCap className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Active Programs</p>
                <p className="mt-2 text-2xl font-semibold text-green-600">{activeCount}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-xl">
                <Award className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Students</p>
                <p className="mt-2 text-2xl font-semibold text-blue-600">
                  {programs.reduce((sum, p) => sum + (p._count?.students || 0), 0)}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Linked Courses</p>
                <p className="mt-2 text-2xl font-semibold text-purple-600">
                  {programs.reduce((sum, p) => sum + (p._count?.courses || 0), 0)}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-xl">
                <BookOpen className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search programs..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none"
              />
            </div>
            <div className="w-56">
              <Select
                options={[
                  { value: '', label: 'All Qualifications' },
                  ...qualificationTypes.map(q => ({ value: q.value, label: q.label }))
                ]}
                value={qualificationFilter}
                onChange={(e) => {
                  setQualificationFilter(e.target.value)
                  setCurrentPage(1)
                }}
              />
            </div>
            {(searchTerm || qualificationFilter) && (
              <Button
                variant="secondary"
                onClick={() => {
                  setSearchTerm('')
                  setQualificationFilter('')
                  setCurrentPage(1)
                }}
              >
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Programs List */}
        <div className="bg-white rounded-xl border border-gray-200">
          {isLoading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
              <p className="mt-2 text-sm text-gray-500">Loading programs...</p>
            </div>
          ) : programs.length === 0 ? (
            <div className="p-12 text-center">
              <GraduationCap className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No programs yet</h3>
              <p className="text-gray-500 mb-4">Create academic programs offered by your institution</p>
              {canEdit && (
                <Button
                  leftIcon={<Plus className="w-4 h-4" />}
                  onClick={() => {
                    resetForm()
                    setShowModal(true)
                  }}
                >
                  New Program
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="divide-y divide-gray-100">
                {programs.map((program) => (
                  <div
                    key={program.id}
                    className={`p-4 flex items-center justify-between hover:bg-gray-50 ${
                      !program.is_active ? 'opacity-60' : ''
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-indigo-100 rounded-lg">
                        <GraduationCap className="w-6 h-6 text-indigo-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">{program.name}</p>
                          {!program.is_active && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                              Inactive
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          {program.program_code && (
                            <span className="text-sm text-gray-500">{program.program_code}</span>
                          )}
                          {program.qualification_type && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 rounded">
                              {getQualificationLabel(program.qualification_type)}
                            </span>
                          )}
                          {program.nqf_level && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-purple-50 text-purple-700 rounded">
                              {getNqfLabel(program.nqf_level)}
                            </span>
                          )}
                          {program.duration_years && (
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <Clock className="w-3 h-3" />
                              {program.duration_years} {program.duration_years === 1 ? 'year' : 'years'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-sm text-right">
                        <p className="font-medium text-gray-900">
                          {program._count?.students || 0} students
                        </p>
                        <p className="text-gray-500">
                          {program._count?.courses || 0} courses
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setCoursesModal({ open: true, program })}
                          className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg"
                          title="Manage Courses"
                        >
                          <Settings2 className="w-4 h-4" />
                        </button>
                        {canEdit && (
                          <>
                            <button
                              onClick={() => openEdit(program)}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteModal({ open: true, program })}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
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

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingProgram ? 'Edit Program' : 'Create Program'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <Input
                label="Program Name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Diploma in Electrical Engineering"
              />

              <Input
                label="Program Code"
                value={formData.program_code}
                onChange={(e) => setFormData({ ...formData, program_code: e.target.value.toUpperCase() })}
                placeholder="e.g., DIP-EE"
                maxLength={20}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none resize-none"
                  rows={3}
                  placeholder="Brief description of the program..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Qualification Type"
                  value={formData.qualification_type}
                  onChange={(e) => setFormData({ ...formData, qualification_type: e.target.value })}
                  options={[
                    { value: '', label: 'Select Type' },
                    ...qualificationTypes.map(q => ({ value: q.value, label: q.label }))
                  ]}
                />
                <Select
                  label="NQF Level"
                  value={formData.nqf_level.toString()}
                  onChange={(e) => setFormData({ ...formData, nqf_level: parseInt(e.target.value) || 0 })}
                  options={[
                    { value: '0', label: 'Select Level' },
                    ...nqfLevels.map(l => ({ value: l.level.toString(), label: `Level ${l.level} - ${l.description}` }))
                  ]}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Total Credits"
                  type="text"
                  inputMode="numeric"
                  value={formatNumericValue(formData.total_credits || 0)}
                  onChange={(e) => setFormData({ ...formData, total_credits: parseIntegerInput(e.target.value) })}
                  placeholder="e.g., 360"
                />
                <Input
                  label="Duration (years)"
                  type="text"
                  inputMode="decimal"
                  value={formatNumericValue(formData.duration_years || 0)}
                  onChange={(e) => setFormData({ ...formData, duration_years: parseNumericInput(e.target.value) })}
                  placeholder="e.g., 3"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="is_active" className="text-sm text-gray-700">
                  Active (accepting enrollments)
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
                  leftIcon={isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  className="flex-1"
                >
                  {isSaving ? 'Saving...' : editingProgram ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      <ConfirmModal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, program: null })}
        onConfirm={handleDelete}
        title="Delete Program"
        message={`Are you sure you want to delete "${deleteModal.program?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        isLoading={isDeleting}
      />

      {/* Program Courses Manager Modal */}
      {coursesModal.open && coursesModal.program && user?.institution_id && (
        <ProgramCoursesManager
          programId={coursesModal.program.id}
          programName={coursesModal.program.name}
          institutionId={user.institution_id}
          durationYears={coursesModal.program.duration_years}
          onClose={() => {
            setCoursesModal({ open: false, program: null })
            fetchPrograms() // Refresh to update course counts
          }}
        />
      )}
    </div>
  )
}
