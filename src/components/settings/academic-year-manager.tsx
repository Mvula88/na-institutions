'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Plus,
  Loader2,
  Calendar,
  CalendarDays,
  Check,
  Pencil,
  Trash2,
  Star,
  X,
  AlertCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  getAcademicYears,
  createAcademicYear,
  updateAcademicYear,
  deleteAcademicYear,
  setCurrentAcademicYear,
  getRegistrationStatus,
  generateDefaultDates,
  checkYearExists,
} from '@/lib/academic-year-utils'
import { AcademicYear } from '@/types/database'

interface Props {
  institutionId: string
}

interface FormData {
  name: string
  year: number
  start_date: string
  end_date: string
  registration_open_date: string
  registration_close_date: string
  is_current: boolean
}

const initialFormData: FormData = {
  name: '',
  year: new Date().getFullYear(),
  start_date: '',
  end_date: '',
  registration_open_date: '',
  registration_close_date: '',
  is_current: false,
}

export default function AcademicYearManager({ institutionId }: Props) {
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  useEffect(() => {
    loadAcademicYears()
  }, [institutionId])

  async function loadAcademicYears() {
    setIsLoading(true)
    try {
      const years = await getAcademicYears(institutionId)
      setAcademicYears(years)
    } catch (error) {
      console.error('Failed to load academic years:', error)
      toast.error('Failed to load academic years')
    } finally {
      setIsLoading(false)
    }
  }

  function handleAddNew() {
    const currentYear = new Date().getFullYear()
    const defaults = generateDefaultDates(currentYear)
    setFormData({
      name: currentYear.toString(),
      year: currentYear,
      ...defaults,
      is_current: academicYears.length === 0, // First year is automatically current
    })
    setEditingId(null)
    setShowForm(true)
  }

  function handleEdit(year: AcademicYear) {
    setFormData({
      name: year.name,
      year: year.year,
      start_date: year.start_date,
      end_date: year.end_date,
      registration_open_date: year.registration_open_date || '',
      registration_close_date: year.registration_close_date || '',
      is_current: year.is_current,
    })
    setEditingId(year.id)
    setShowForm(true)
  }

  function handleCancel() {
    setShowForm(false)
    setEditingId(null)
    setFormData(initialFormData)
  }

  function handleYearChange(year: number) {
    const defaults = generateDefaultDates(year)
    setFormData({
      ...formData,
      year,
      name: year.toString(),
      ...defaults,
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Validate
    if (!formData.name.trim()) {
      toast.error('Please enter a name for the academic year')
      return
    }

    if (!formData.start_date || !formData.end_date) {
      toast.error('Please set the start and end dates')
      return
    }

    if (new Date(formData.end_date) <= new Date(formData.start_date)) {
      toast.error('End date must be after start date')
      return
    }

    // Check if year already exists
    const yearExists = await checkYearExists(institutionId, formData.year, editingId || undefined)
    if (yearExists) {
      toast.error(`Academic year ${formData.year} already exists`)
      return
    }

    setIsSaving(true)
    try {
      if (editingId) {
        // Update existing
        await updateAcademicYear(editingId, {
          name: formData.name,
          year: formData.year,
          start_date: formData.start_date,
          end_date: formData.end_date,
          registration_open_date: formData.registration_open_date || null,
          registration_close_date: formData.registration_close_date || null,
          is_current: formData.is_current,
        })
        toast.success('Academic year updated')
      } else {
        // Create new
        await createAcademicYear({
          institution_id: institutionId,
          name: formData.name,
          year: formData.year,
          start_date: formData.start_date,
          end_date: formData.end_date,
          registration_open_date: formData.registration_open_date || null,
          registration_close_date: formData.registration_close_date || null,
          is_current: formData.is_current,
        })
        toast.success('Academic year created')
      }

      await loadAcademicYears()
      handleCancel()
    } catch (error) {
      console.error('Failed to save academic year:', error)
      toast.error('Failed to save academic year')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleSetCurrent(id: string) {
    try {
      await setCurrentAcademicYear(id)
      await loadAcademicYears()
      toast.success('Current academic year updated')
    } catch (error) {
      console.error('Failed to set current year:', error)
      toast.error('Failed to set current year')
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteAcademicYear(id)
      await loadAcademicYears()
      setDeleteConfirm(null)
      toast.success('Academic year deleted')
    } catch (error) {
      console.error('Failed to delete academic year:', error)
      toast.error('Failed to delete academic year. It may have associated records.')
    }
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-NA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Academic Years</h3>
          <p className="text-sm text-gray-500">
            Define academic year periods for student registration
          </p>
        </div>
        {!showForm && (
          <Button
            onClick={handleAddNew}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Add Year
          </Button>
        )}
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-gray-900">
              {editingId ? 'Edit Academic Year' : 'Add New Academic Year'}
            </h4>
            <button
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Year
                </label>
                <select
                  value={formData.year}
                  onChange={(e) => handleYearChange(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {Array.from({ length: 10 }, (_, i) => {
                    const year = new Date().getFullYear() - 2 + i
                    return (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    )
                  })}
                </select>
              </div>
              <Input
                label="Display Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., 2026 or 2026/2027"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Academic Year Start"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
              <Input
                label="Academic Year End"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
            </div>

            <div className="border-t border-gray-200 pt-4">
              <h5 className="text-sm font-medium text-gray-700 mb-3">
                Registration Period (Optional)
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Registration Opens"
                  type="date"
                  value={formData.registration_open_date}
                  onChange={(e) => setFormData({ ...formData, registration_open_date: e.target.value })}
                />
                <Input
                  label="Registration Closes"
                  type="date"
                  value={formData.registration_close_date}
                  onChange={(e) => setFormData({ ...formData, registration_close_date: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="is_current"
                checked={formData.is_current}
                onChange={(e) => setFormData({ ...formData, is_current: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="is_current" className="text-sm text-gray-700">
                Set as current academic year
              </label>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={isSaving}
                leftIcon={isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              >
                {isSaving ? 'Saving...' : editingId ? 'Update' : 'Create'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Academic Years List */}
      {academicYears.length === 0 && !showForm ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <CalendarDays className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Academic Years</h3>
          <p className="text-gray-500 mb-4">
            Create your first academic year to start registering students.
          </p>
          <Button onClick={handleAddNew} leftIcon={<Plus className="w-4 h-4" />}>
            Add Academic Year
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {academicYears.map((year) => {
            const regStatus = getRegistrationStatus(year)
            const isDeleting = deleteConfirm === year.id

            return (
              <div
                key={year.id}
                className={`bg-white rounded-lg border p-4 ${
                  year.is_current ? 'border-blue-300 ring-1 ring-blue-100' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-900">{year.name}</h4>
                      {year.is_current && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                          <Star className="w-3 h-3" />
                          Current
                        </span>
                      )}
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          regStatus.color === 'green'
                            ? 'bg-green-100 text-green-700'
                            : regStatus.color === 'blue'
                            ? 'bg-blue-100 text-blue-700'
                            : regStatus.color === 'red'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        Registration: {regStatus.label}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>
                          {formatDate(year.start_date)} - {formatDate(year.end_date)}
                        </span>
                      </div>
                      {year.registration_open_date && year.registration_close_date && (
                        <div className="flex items-center gap-1">
                          <CalendarDays className="w-4 h-4 text-gray-400" />
                          <span>
                            Reg: {formatDate(year.registration_open_date)} - {formatDate(year.registration_close_date)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    {!year.is_current && (
                      <button
                        onClick={() => handleSetCurrent(year.id)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Set as current"
                      >
                        <Star className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleEdit(year)}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(year.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Delete Confirmation */}
                {isDeleting && (
                  <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm text-red-800">
                          Are you sure you want to delete this academic year? This cannot be undone.
                        </p>
                        <div className="flex gap-2 mt-3">
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleDelete(year.id)}
                          >
                            Delete
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setDeleteConfirm(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">About Academic Years</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>- The <strong>current</strong> academic year is used for new student registrations.</li>
          <li>- Set registration dates to control when students can register/re-register.</li>
          <li>- Only one academic year can be current at a time.</li>
          <li>- Academic years cannot be deleted if they have student registrations.</li>
        </ul>
      </div>
    </div>
  )
}
