'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Plus,
  Edit2,
  Trash2,
  Loader2,
  Calendar,
  DollarSign,
  CheckCircle,
  X,
  AlertCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Semester } from '@/types/database'
import { parseNumericInput, formatNumericValue } from '@/lib/numeric-input'

interface SemesterManagerProps {
  institutionId: string
}

interface SemesterFormData {
  name: string
  year: number
  semester_number: number
  start_date: string
  end_date: string
  fee_amount: number
  registration_deadline: string
  is_active: boolean
}

const currentYear = new Date().getFullYear()

export default function SemesterManager({ institutionId }: SemesterManagerProps) {
  const [semesters, setSemesters] = useState<Semester[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<SemesterFormData>({
    name: '',
    year: currentYear,
    semester_number: 1,
    start_date: '',
    end_date: '',
    fee_amount: 0,
    registration_deadline: '',
    is_active: true,
  })

  useEffect(() => {
    fetchSemesters()
  }, [institutionId])

  async function fetchSemesters() {
    setIsLoading(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from('semesters')
      .select('*')
      .eq('institution_id', institutionId)
      .order('year', { ascending: false })
      .order('semester_number', { ascending: true })

    if (error) {
      console.error('Error fetching semesters:', error)
      toast.error('Failed to load semesters')
    } else {
      setSemesters(data || [])
    }
    setIsLoading(false)
  }

  function resetForm() {
    setFormData({
      name: '',
      year: currentYear,
      semester_number: 1,
      start_date: '',
      end_date: '',
      fee_amount: 0,
      registration_deadline: '',
      is_active: true,
    })
    setEditingId(null)
    setShowForm(false)
  }

  function openEditForm(semester: Semester) {
    setFormData({
      name: semester.name,
      year: semester.year,
      semester_number: semester.semester_number,
      start_date: semester.start_date,
      end_date: semester.end_date,
      fee_amount: semester.fee_amount,
      registration_deadline: semester.registration_deadline || '',
      is_active: semester.is_active,
    })
    setEditingId(semester.id)
    setShowForm(true)
  }

  function generateSemesterName() {
    const semesterNames = ['Semester', 'Term', 'Quarter']
    return `${semesterNames[0]} ${formData.semester_number} ${formData.year}`
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!formData.name.trim()) {
      setFormData(prev => ({ ...prev, name: generateSemesterName() }))
    }

    if (!formData.start_date || !formData.end_date) {
      toast.error('Please set start and end dates')
      return
    }

    if (new Date(formData.end_date) <= new Date(formData.start_date)) {
      toast.error('End date must be after start date')
      return
    }

    setIsSaving(true)
    const supabase = createClient()

    const semesterData = {
      institution_id: institutionId,
      name: formData.name.trim() || generateSemesterName(),
      year: formData.year,
      semester_number: formData.semester_number,
      start_date: formData.start_date,
      end_date: formData.end_date,
      fee_amount: formData.fee_amount,
      registration_deadline: formData.registration_deadline || null,
      is_active: formData.is_active,
    }

    try {
      if (editingId) {
        const { error } = await supabase
          .from('semesters')
          .update(semesterData as never)
          .eq('id', editingId)

        if (error) throw error
        toast.success('Semester updated successfully')
      } else {
        const { error } = await supabase
          .from('semesters')
          .insert(semesterData as never)

        if (error) throw error
        toast.success('Semester created successfully')
      }

      resetForm()
      fetchSemesters()
    } catch (error: unknown) {
      console.error('Error saving semester:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      if (errorMessage.includes('unique')) {
        toast.error('A semester with this year and number already exists')
      } else {
        toast.error('Failed to save semester')
      }
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this semester? This will also delete any associated fee records.')) {
      return
    }

    const supabase = createClient()

    const { error } = await supabase
      .from('semesters')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting semester:', error)
      toast.error('Failed to delete semester')
    } else {
      toast.success('Semester deleted')
      fetchSemesters()
    }
  }

  async function toggleActive(semester: Semester) {
    const supabase = createClient()

    const { error } = await supabase
      .from('semesters')
      .update({ is_active: !semester.is_active } as never)
      .eq('id', semester.id)

    if (error) {
      console.error('Error toggling semester status:', error)
      toast.error('Failed to update semester')
    } else {
      fetchSemesters()
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Semesters</h3>
          <p className="text-sm text-gray-500">Manage academic semesters and their fees</p>
        </div>
        {!showForm && (
          <Button
            onClick={() => setShowForm(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Add Semester
          </Button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-gray-900">
              {editingId ? 'Edit Semester' : 'New Semester'}
            </h4>
            <button
              onClick={resetForm}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Semester Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={generateSemesterName()}
              />

              <div className="grid grid-cols-2 gap-2">
                <Input
                  label="Year"
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) || currentYear })}
                  min={currentYear - 1}
                  max={currentYear + 5}
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Semester #
                  </label>
                  <select
                    value={formData.semester_number}
                    onChange={(e) => setFormData({ ...formData, semester_number: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={1}>1st</option>
                    <option value={2}>2nd</option>
                    <option value={3}>3rd</option>
                    <option value={4}>4th</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Start Date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                required
              />
              <Input
                label="End Date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Semester Fee (N$)"
                type="text"
                inputMode="decimal"
                value={formatNumericValue(formData.fee_amount)}
                onChange={(e) => setFormData({ ...formData, fee_amount: parseNumericInput(e.target.value) })}
                placeholder="0.00"
              />
              <Input
                label="Registration Deadline (Optional)"
                type="date"
                value={formData.registration_deadline}
                onChange={(e) => setFormData({ ...formData, registration_deadline: e.target.value })}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="is_active" className="text-sm text-gray-700">
                Active (students can be enrolled in this semester)
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                leftIcon={isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}
              >
                {isSaving ? 'Saving...' : editingId ? 'Update Semester' : 'Create Semester'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Semesters List */}
      {semesters.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 border border-gray-200 border-dashed rounded-xl">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-sm font-medium text-gray-900">No semesters yet</h3>
          <p className="text-sm text-gray-500 mt-1">Create your first semester to start managing fees</p>
        </div>
      ) : (
        <div className="space-y-3">
          {semesters.map((semester) => (
            <div
              key={semester.id}
              className={`border rounded-xl p-4 transition-all ${
                semester.is_active
                  ? 'border-emerald-200 bg-emerald-50/50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-gray-900">{semester.name}</h4>
                    {semester.is_active ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                        <CheckCircle className="w-3 h-3" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        Inactive
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      {new Date(semester.start_date).toLocaleDateString('en-NA', { month: 'short', day: 'numeric' })}
                      {' - '}
                      {new Date(semester.end_date).toLocaleDateString('en-NA', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4 text-gray-400" />
                      N$ {semester.fee_amount.toLocaleString()}
                    </span>
                    {semester.registration_deadline && (
                      <span className="flex items-center gap-1 text-amber-600">
                        <AlertCircle className="w-4 h-4" />
                        Deadline: {new Date(semester.registration_deadline).toLocaleDateString('en-NA', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleActive(semester)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      semester.is_active
                        ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                    }`}
                  >
                    {semester.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={() => openEditForm(semester)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(semester.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
