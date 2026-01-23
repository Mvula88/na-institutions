'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/input'
import { ConfirmModal } from '@/components/ui/modal'
import {
  Calendar,
  Plus,
  X,
  Loader2,
  Trash2,
  Pencil,
  Clock,
  Save,
  ChevronLeft,
  ChevronRight,
  Printer,
  Download,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Class {
  id: string
  name: string
  grade_level: string | null
}

interface Subject {
  id: string
  name: string
}

interface Teacher {
  id: string
  full_name: string
}

interface Period {
  id: string
  name: string
  start_time: string
  end_time: string
  period_order: number
  period_type: string
}

interface TimetableEntry {
  id: string
  class_id: string
  subject_id: string
  teacher_id: string | null
  period_id: string
  day_of_week: number
  room: string | null
  subject?: { name: string }
  teacher?: { full_name: string }
  period?: Period
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

const PERIOD_TYPES = [
  { value: 'class', label: 'Class Period' },
  { value: 'break', label: 'Break' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'assembly', label: 'Assembly' },
]

export default function TimetablePage() {
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState<'timetable' | 'periods'>('timetable')
  const [isLoading, setIsLoading] = useState(true)

  // Dropdown data
  const [classes, setClasses] = useState<Class[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])

  // Selected class for timetable view
  const [selectedClassId, setSelectedClassId] = useState<string>('')

  // Periods state
  const [periods, setPeriods] = useState<Period[]>([])
  const [showPeriodModal, setShowPeriodModal] = useState(false)
  const [editingPeriod, setEditingPeriod] = useState<Period | null>(null)
  const [periodForm, setPeriodForm] = useState({
    name: '',
    start_time: '08:00',
    end_time: '08:45',
    period_type: 'class',
  })
  const [isSaving, setIsSaving] = useState(false)

  // Timetable entries
  const [entries, setEntries] = useState<TimetableEntry[]>([])
  const [showEntryModal, setShowEntryModal] = useState(false)
  const [editingEntry, setEditingEntry] = useState<TimetableEntry | null>(null)
  const [entryForm, setEntryForm] = useState({
    subject_id: '',
    teacher_id: '',
    period_id: '',
    day_of_week: 1,
    room: '',
  })

  // Delete modal
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; type: 'period' | 'entry'; item: Period | TimetableEntry | null }>({
    open: false,
    type: 'period',
    item: null,
  })
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (user?.institution_id) {
      fetchDropdownData()
      fetchPeriods()
    }
  }, [user?.institution_id])

  useEffect(() => {
    if (selectedClassId && user?.institution_id) {
      fetchTimetableEntries()
    }
  }, [selectedClassId, user?.institution_id])

  async function fetchDropdownData() {
    if (!user?.institution_id) return
    const supabase = createClient()

    const [classesRes, subjectsRes, teachersRes] = await Promise.all([
      supabase
        .from('programs')
        .select('id, name, grade_level')
        .eq('institution_id', user.institution_id)
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('courses')
        .select('id, name')
        .eq('institution_id', user.institution_id)
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('lecturers')
        .select('id, full_name')
        .eq('institution_id', user.institution_id)
        .eq('is_active', true)
        .order('full_name'),
    ])

    const classesData = (classesRes.data || []) as Class[]
    setClasses(classesData)
    setSubjects((subjectsRes.data || []) as Subject[])
    setTeachers((teachersRes.data || []) as Teacher[])

    // Set first class as selected if available
    if (classesData.length > 0) {
      setSelectedClassId(classesData[0].id)
    }
    setIsLoading(false)
  }

  async function fetchPeriods() {
    if (!user?.institution_id) return
    const supabase = createClient()
    const { data } = await supabase
      .from('timetable_periods')
      .select('id, name, start_time, end_time, period_order, period_type')
      .eq('institution_id', user.institution_id)
      .eq('is_active', true)
      .order('period_order')

    setPeriods((data || []) as Period[])
  }

  async function fetchTimetableEntries() {
    if (!user?.institution_id || !selectedClassId) return
    const supabase = createClient()
    const { data } = await supabase
      .from('timetable_entries')
      .select(`
        id, class_id, subject_id, teacher_id, period_id, day_of_week, room,
        subject:subjects(name),
        teacher:teachers(full_name),
        period:timetable_periods(id, name, start_time, end_time, period_order, period_type)
      `)
      .eq('class_id', selectedClassId)
      .eq('is_active', true)

    setEntries((data || []) as unknown as TimetableEntry[])
  }

  async function handleSavePeriod(e: React.FormEvent) {
    e.preventDefault()
    if (!user?.institution_id) return
    setIsSaving(true)
    const supabase = createClient()

    try {
      const periodData = {
        institution_id: user.institution_id,
        name: periodForm.name,
        start_time: periodForm.start_time,
        end_time: periodForm.end_time,
        period_type: periodForm.period_type,
        period_order: editingPeriod ? editingPeriod.period_order : periods.length + 1,
      }

      if (editingPeriod) {
        const { error } = await supabase
          .from('timetable_periods')
          .update(periodData as never)
          .eq('id', editingPeriod.id)
        if (error) throw error
        toast.success('Period updated successfully')
      } else {
        const { error } = await supabase
          .from('timetable_periods')
          .insert(periodData as never)
        if (error) throw error
        toast.success('Period created successfully')
      }

      setShowPeriodModal(false)
      resetPeriodForm()
      fetchPeriods()
    } catch (error) {
      console.error('Error saving period:', error)
      toast.error('Failed to save period')
    } finally {
      setIsSaving(false)
    }
  }

  function resetPeriodForm() {
    setPeriodForm({
      name: '',
      start_time: '08:00',
      end_time: '08:45',
      period_type: 'class',
    })
    setEditingPeriod(null)
  }

  function openEditPeriod(period: Period) {
    setPeriodForm({
      name: period.name,
      start_time: period.start_time,
      end_time: period.end_time,
      period_type: period.period_type,
    })
    setEditingPeriod(period)
    setShowPeriodModal(true)
  }

  async function handleSaveEntry(e: React.FormEvent) {
    e.preventDefault()
    if (!user?.institution_id || !selectedClassId) return
    setIsSaving(true)
    const supabase = createClient()

    try {
      const entryData = {
        institution_id: user.institution_id,
        class_id: selectedClassId,
        subject_id: entryForm.subject_id,
        teacher_id: entryForm.teacher_id || null,
        period_id: entryForm.period_id,
        day_of_week: entryForm.day_of_week,
        room: entryForm.room || null,
      }

      if (editingEntry) {
        const { error } = await supabase
          .from('timetable_entries')
          .update(entryData as never)
          .eq('id', editingEntry.id)
        if (error) throw error
        toast.success('Timetable entry updated')
      } else {
        const { error } = await supabase
          .from('timetable_entries')
          .insert(entryData as never)
        if (error) throw error
        toast.success('Timetable entry added')
      }

      setShowEntryModal(false)
      resetEntryForm()
      fetchTimetableEntries()
    } catch (error: unknown) {
      console.error('Error saving entry:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to save entry'
      if (errorMessage.includes('unique') || errorMessage.includes('duplicate')) {
        toast.error('This time slot is already occupied')
      } else {
        toast.error('Failed to save entry')
      }
    } finally {
      setIsSaving(false)
    }
  }

  function resetEntryForm() {
    setEntryForm({
      subject_id: '',
      teacher_id: '',
      period_id: '',
      day_of_week: 1,
      room: '',
    })
    setEditingEntry(null)
  }

  function openAddEntry(dayOfWeek: number, periodId: string) {
    setEntryForm({
      subject_id: '',
      teacher_id: '',
      period_id: periodId,
      day_of_week: dayOfWeek,
      room: '',
    })
    setShowEntryModal(true)
  }

  function openEditEntry(entry: TimetableEntry) {
    setEntryForm({
      subject_id: entry.subject_id,
      teacher_id: entry.teacher_id || '',
      period_id: entry.period_id,
      day_of_week: entry.day_of_week,
      room: entry.room || '',
    })
    setEditingEntry(entry)
    setShowEntryModal(true)
  }

  async function handleDelete() {
    if (!deleteModal.item) return
    setIsDeleting(true)
    const supabase = createClient()

    try {
      if (deleteModal.type === 'period') {
        const { error } = await supabase
          .from('timetable_periods')
          .update({ is_active: false } as never)
          .eq('id', deleteModal.item.id)
        if (error) throw error
        toast.success('Period deleted')
        fetchPeriods()
      } else {
        const { error } = await supabase
          .from('timetable_entries')
          .delete()
          .eq('id', deleteModal.item.id)
        if (error) throw error
        toast.success('Entry deleted')
        fetchTimetableEntries()
      }

      setDeleteModal({ open: false, type: 'period', item: null })
    } catch (error) {
      console.error('Error deleting:', error)
      toast.error(`Failed to delete ${deleteModal.type}`)
    } finally {
      setIsDeleting(false)
    }
  }

  // Get entry for a specific day and period
  function getEntry(dayOfWeek: number, periodId: string) {
    return entries.find(e => e.day_of_week === dayOfWeek && e.period_id === periodId)
  }

  const selectedClass = classes.find(c => c.id === selectedClassId)

  // Print timetable
  function handlePrint() {
    if (!selectedClass || periods.length === 0) {
      toast.error('No timetable to print')
      return
    }

    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      toast.error('Could not open print window. Please allow popups.')
      return
    }

    const centerName = user?.institution?.name || 'Tutorial Center'

    const tableRows = periods.map(period => {
      const cells = DAYS.map((day, dayIdx) => {
        const dayOfWeek = dayIdx + 1
        const entry = getEntry(dayOfWeek, period.id)

        if (period.period_type !== 'class') {
          const label = period.period_type === 'break' ? 'Break' :
                        period.period_type === 'lunch' ? 'Lunch' :
                        period.period_type === 'assembly' ? 'Assembly' : ''
          return `<td style="padding: 8px; border: 1px solid #ddd; text-align: center; background: #f5f5f5; color: #666;">${label}</td>`
        }

        if (entry) {
          return `<td style="padding: 8px; border: 1px solid #ddd; background: #e3f2fd;">
            <strong style="color: #1565c0;">${entry.subject?.name || ''}</strong><br>
            <span style="font-size: 11px; color: #1976d2;">${entry.teacher?.full_name || ''}</span>
            ${entry.room ? `<br><span style="font-size: 10px; color: #42a5f5;">Room: ${entry.room}</span>` : ''}
          </td>`
        }

        return `<td style="padding: 8px; border: 1px solid #ddd;"></td>`
      }).join('')

      return `<tr>
        <td style="padding: 8px; border: 1px solid #ddd; font-weight: 500;">
          ${period.name}<br>
          <span style="font-size: 11px; color: #666;">${period.start_time.slice(0, 5)} - ${period.end_time.slice(0, 5)}</span>
        </td>
        ${cells}
      </tr>`
    }).join('')

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Timetable - ${selectedClass.name}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .header { text-align: center; margin-bottom: 20px; }
          .header h1 { margin: 0; font-size: 24px; }
          .header p { margin: 5px 0; color: #666; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th { background: #f5f5f5; padding: 10px; border: 1px solid #ddd; text-align: left; }
          .footer { margin-top: 20px; text-align: center; font-size: 11px; color: #999; }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${centerName}</h1>
          <p><strong>${selectedClass.name}</strong> - Weekly Timetable</p>
          <p style="font-size: 12px;">Generated: ${new Date().toLocaleDateString('en-ZA')}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 100px;">Time</th>
              ${DAYS.map(d => `<th>${d}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        <div class="footer">
          <p>Printed from ${centerName} Management System</p>
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `

    printWindow.document.write(html)
    printWindow.document.close()
  }

  // Export as CSV (can be opened in Excel)
  function handleExportCSV() {
    if (!selectedClass || periods.length === 0) {
      toast.error('No timetable to export')
      return
    }

    const headers = ['Time', ...DAYS]
    const rows = periods.map(period => {
      const cells = DAYS.map((day, dayIdx) => {
        const dayOfWeek = dayIdx + 1
        const entry = getEntry(dayOfWeek, period.id)

        if (period.period_type !== 'class') {
          return period.period_type.charAt(0).toUpperCase() + period.period_type.slice(1)
        }

        if (entry) {
          let cell = entry.subject?.name || ''
          if (entry.teacher) cell += ` (${entry.teacher.full_name})`
          if (entry.room) cell += ` [${entry.room}]`
          return cell
        }

        return ''
      })

      return [`${period.name} (${period.start_time.slice(0, 5)}-${period.end_time.slice(0, 5)})`, ...cells]
    })

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `timetable-${selectedClass.name.replace(/\s+/g, '-')}.csv`
    link.click()

    toast.success('Timetable exported as CSV')
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 md:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Class Timetable</h1>
              <p className="mt-1 text-sm text-gray-500">Manage class schedules and periods</p>
            </div>
            {activeTab === 'timetable' && selectedClassId && (
              <div className="flex items-center gap-3">
                <div className="w-48">
                  <Select
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                    options={classes.map(c => ({ value: c.id, label: c.name }))}
                  />
                </div>
                <Button
                  variant="secondary"
                  leftIcon={<Download className="w-4 h-4" />}
                  onClick={handleExportCSV}
                  disabled={periods.length === 0}
                >
                  Export
                </Button>
                <Button
                  variant="secondary"
                  leftIcon={<Printer className="w-4 h-4" />}
                  onClick={handlePrint}
                  disabled={periods.length === 0}
                >
                  Print
                </Button>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-6 bg-gray-100 p-1 rounded-lg w-fit">
            <button
              onClick={() => setActiveTab('timetable')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'timetable'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Calendar className="w-4 h-4" />
              Timetable
            </button>
            <button
              onClick={() => setActiveTab('periods')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'periods'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Clock className="w-4 h-4" />
              Periods
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-6">
        {/* Timetable Tab */}
        {activeTab === 'timetable' && (
          <div className="space-y-6">
            {isLoading ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
              </div>
            ) : classes.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No classes found</h3>
                <p className="text-gray-500">Create classes first to set up timetables</p>
              </div>
            ) : periods.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No periods defined</h3>
                <p className="text-gray-500 mb-4">Define time periods first</p>
                <Button onClick={() => setActiveTab('periods')}>
                  Go to Periods
                </Button>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50">
                  <h3 className="font-medium text-gray-900">
                    {selectedClass?.name} - Weekly Schedule
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="p-3 text-left text-sm font-medium text-gray-500 border-b border-gray-200 w-32">
                          Time
                        </th>
                        {DAYS.map((day, idx) => (
                          <th key={day} className="p-3 text-left text-sm font-medium text-gray-500 border-b border-gray-200">
                            {day}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {periods.map((period) => (
                        <tr key={period.id} className={period.period_type !== 'class' ? 'bg-gray-50' : ''}>
                          <td className="p-3 border-b border-gray-100 text-sm">
                            <div className="font-medium text-gray-900">{period.name}</div>
                            <div className="text-gray-500 text-xs">
                              {period.start_time.slice(0, 5)} - {period.end_time.slice(0, 5)}
                            </div>
                          </td>
                          {DAYS.map((day, dayIdx) => {
                            const dayOfWeek = dayIdx + 1
                            const entry = getEntry(dayOfWeek, period.id)

                            if (period.period_type !== 'class') {
                              return (
                                <td key={day} className="p-3 border-b border-gray-100 text-center text-sm text-gray-400" colSpan={1}>
                                  {period.period_type === 'break' && 'Break'}
                                  {period.period_type === 'lunch' && 'Lunch'}
                                  {period.period_type === 'assembly' && 'Assembly'}
                                </td>
                              )
                            }

                            return (
                              <td key={day} className="p-2 border-b border-gray-100">
                                {entry ? (
                                  <div
                                    onClick={() => openEditEntry(entry)}
                                    className="p-2 bg-blue-50 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors"
                                  >
                                    <div className="font-medium text-blue-900 text-sm">
                                      {entry.subject?.name}
                                    </div>
                                    {entry.teacher && (
                                      <div className="text-xs text-blue-700">
                                        {entry.teacher.full_name}
                                      </div>
                                    )}
                                    {entry.room && (
                                      <div className="text-xs text-blue-500">
                                        Room: {entry.room}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => openAddEntry(dayOfWeek, period.id)}
                                    className="w-full p-2 border-2 border-dashed border-gray-200 rounded-lg text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-colors text-sm"
                                  >
                                    + Add
                                  </button>
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Periods Tab */}
        {activeTab === 'periods' && (
          <div className="space-y-6">
            <div className="flex justify-end">
              <Button
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={() => {
                  resetPeriodForm()
                  setShowPeriodModal(true)
                }}
              >
                Add Period
              </Button>
            </div>

            <div className="bg-white rounded-xl border border-gray-200">
              {periods.length === 0 ? (
                <div className="p-12 text-center">
                  <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No periods defined</h3>
                  <p className="text-gray-500 mb-4">Add time periods for your school schedule</p>
                  <Button
                    leftIcon={<Plus className="w-4 h-4" />}
                    onClick={() => {
                      resetPeriodForm()
                      setShowPeriodModal(true)
                    }}
                  >
                    Add Period
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {periods.map((period, idx) => (
                    <div
                      key={period.id}
                      className="p-4 flex items-center justify-between hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium text-gray-600">
                          {idx + 1}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{period.name}</p>
                          <p className="text-sm text-gray-500">
                            {period.start_time.slice(0, 5)} - {period.end_time.slice(0, 5)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          period.period_type === 'class' ? 'bg-blue-100 text-blue-700' :
                          period.period_type === 'break' ? 'bg-amber-100 text-amber-700' :
                          period.period_type === 'lunch' ? 'bg-green-100 text-green-700' :
                          'bg-purple-100 text-purple-700'
                        }`}>
                          {period.period_type}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditPeriod(period)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteModal({ open: true, type: 'period', item: period })}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
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
          </div>
        )}
      </div>

      {/* Period Modal */}
      {showPeriodModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingPeriod ? 'Edit Period' : 'Add Period'}
              </h2>
              <button
                onClick={() => setShowPeriodModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSavePeriod} className="p-6 space-y-4">
              <Input
                label="Period Name"
                required
                value={periodForm.name}
                onChange={(e) => setPeriodForm({ ...periodForm, name: e.target.value })}
                placeholder="e.g., Period 1, Break, Lunch"
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Start Time"
                  type="time"
                  required
                  value={periodForm.start_time}
                  onChange={(e) => setPeriodForm({ ...periodForm, start_time: e.target.value })}
                />
                <Input
                  label="End Time"
                  type="time"
                  required
                  value={periodForm.end_time}
                  onChange={(e) => setPeriodForm({ ...periodForm, end_time: e.target.value })}
                />
              </div>
              <Select
                label="Period Type"
                value={periodForm.period_type}
                onChange={(e) => setPeriodForm({ ...periodForm, period_type: e.target.value })}
                options={PERIOD_TYPES}
              />
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowPeriodModal(false)}
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
                  {isSaving ? 'Saving...' : editingPeriod ? 'Update' : 'Add'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Entry Modal */}
      {showEntryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingEntry ? 'Edit Timetable Entry' : 'Add Timetable Entry'}
              </h2>
              <button
                onClick={() => setShowEntryModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveEntry} className="p-6 space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg text-sm">
                <span className="text-gray-600">
                  {DAYS[entryForm.day_of_week - 1]} • {periods.find(p => p.id === entryForm.period_id)?.name}
                </span>
              </div>
              <Select
                label="Subject"
                required
                value={entryForm.subject_id}
                onChange={(e) => setEntryForm({ ...entryForm, subject_id: e.target.value })}
                options={[
                  { value: '', label: 'Select Subject' },
                  ...subjects.map(s => ({ value: s.id, label: s.name }))
                ]}
              />
              <Select
                label="Teacher (Optional)"
                value={entryForm.teacher_id}
                onChange={(e) => setEntryForm({ ...entryForm, teacher_id: e.target.value })}
                options={[
                  { value: '', label: 'Select Teacher' },
                  ...teachers.map(t => ({ value: t.id, label: t.full_name }))
                ]}
              />
              <Input
                label="Room/Venue (Optional)"
                value={entryForm.room}
                onChange={(e) => setEntryForm({ ...entryForm, room: e.target.value })}
                placeholder="e.g., Room 101, Lab A"
              />
              <div className="flex gap-3 pt-4">
                {editingEntry && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setDeleteModal({ open: true, type: 'entry', item: editingEntry })}
                    className="text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </Button>
                )}
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowEntryModal(false)}
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
                  {isSaving ? 'Saving...' : editingEntry ? 'Update' : 'Add'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      <ConfirmModal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, type: 'period', item: null })}
        onConfirm={handleDelete}
        title={`Delete ${deleteModal.type === 'period' ? 'Period' : 'Entry'}`}
        message={`Are you sure you want to delete this ${deleteModal.type}? This action cannot be undone.`}
        confirmText="Delete"
        isLoading={isDeleting}
      />
    </div>
  )
}
