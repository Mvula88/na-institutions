'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/input'
import { ConfirmModal } from '@/components/ui/modal'
import {
  FileText,
  Plus,
  Search,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Save,
  X,
  Loader2,
  Eye,
  Trash2,
  Pencil,
  CheckCircle,
  AlertTriangle,
  Download,
  Send,
  Clock,
  Users,
  Award,
  BookOpen,
  BarChart3,
  Printer,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface ReportPeriod {
  id: string
  name: string
  start_date: string
  end_date: string
  academic_year: string | null
  is_current: boolean
  is_published: boolean
  created_at: string
  _count?: { report_cards: number }
}

interface StudentReportCard {
  id: string
  student_id: string
  report_period_id: string
  class_id: string | null
  total_marks: number | null
  total_possible: number | null
  average_percentage: number | null
  overall_grade: string | null
  class_rank: number | null
  class_teacher_comment: string | null
  principal_comment: string | null
  days_present: number
  days_absent: number
  days_late: number
  status: string
  generated_at: string
  published_at: string | null
  student?: {
    id: string
    full_name: string
    student_number: string | null
    grade: string | null
  }
  report_period?: {
    name: string
  }
  class?: {
    name: string
  }
}

interface ReportCardSubject {
  id: string
  report_card_id: string
  subject_id: string
  marks_obtained: number | null
  max_marks: number | null
  percentage: number | null
  grade: string | null
  teacher_comment: string | null
  subject?: {
    id: string
    name: string
    code: string | null
  }
}

interface Student {
  id: string
  full_name: string
  student_number: string | null
  grade: string | null
  class_id: string | null
}

interface Class {
  id: string
  name: string
  grade_level: string | null
}

const ITEMS_PER_PAGE = 10

const GRADE_SCALE = [
  { min: 80, max: 100, grade: 'A', description: 'Outstanding' },
  { min: 70, max: 79, grade: 'B', description: 'Meritorious' },
  { min: 60, max: 69, grade: 'C', description: 'Substantial' },
  { min: 50, max: 59, grade: 'D', description: 'Adequate' },
  { min: 40, max: 49, grade: 'E', description: 'Moderate' },
  { min: 30, max: 39, grade: 'F', description: 'Elementary' },
  { min: 0, max: 29, grade: 'G', description: 'Not Achieved' },
]

function calculateGrade(percentage: number): string {
  for (const level of GRADE_SCALE) {
    if (percentage >= level.min && percentage <= level.max) {
      return level.grade
    }
  }
  return '-'
}

const STATUS_BADGES: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  draft: { bg: 'bg-gray-100', text: 'text-gray-700', icon: <FileText className="w-3 h-3" /> },
  reviewed: { bg: 'bg-blue-100', text: 'text-blue-700', icon: <Eye className="w-3 h-3" /> },
  published: { bg: 'bg-green-100', text: 'text-green-700', icon: <CheckCircle className="w-3 h-3" /> },
}

export default function ReportCardsPage() {
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState<'periods' | 'cards'>('periods')
  const [isLoading, setIsLoading] = useState(true)

  // Report Periods state
  const [periods, setPeriods] = useState<ReportPeriod[]>([])
  const [showPeriodModal, setShowPeriodModal] = useState(false)
  const [editingPeriod, setEditingPeriod] = useState<ReportPeriod | null>(null)
  const [periodForm, setPeriodForm] = useState({
    name: '',
    start_date: '',
    end_date: '',
    academic_year: new Date().getFullYear().toString(),
    is_current: false,
  })
  const [isSavingPeriod, setIsSavingPeriod] = useState(false)

  // Report Cards state
  const [reportCards, setReportCards] = useState<StudentReportCard[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [selectedPeriodId, setSelectedPeriodId] = useState('')
  const [selectedClassId, setSelectedClassId] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  // Classes
  const [classes, setClasses] = useState<Class[]>([])

  // Generate modal
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [generateForm, setGenerateForm] = useState({
    period_id: '',
    class_id: '',
  })
  const [isGenerating, setIsGenerating] = useState(false)

  // View/Edit report card
  const [viewingCard, setViewingCard] = useState<StudentReportCard | null>(null)
  const [cardSubjects, setCardSubjects] = useState<ReportCardSubject[]>([])
  const [isLoadingCard, setIsLoadingCard] = useState(false)
  const [cardComments, setCardComments] = useState({
    class_teacher_comment: '',
    principal_comment: '',
  })
  const [isSavingCard, setIsSavingCard] = useState(false)

  // Delete modal
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; type: 'period' | 'card'; item: ReportPeriod | StudentReportCard | null }>({
    open: false,
    type: 'period',
    item: null,
  })
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (user?.institution_id) {
      fetchPeriods()
      fetchClasses()
    }
  }, [user?.institution_id])

  useEffect(() => {
    if (activeTab === 'cards' && user?.institution_id) {
      fetchReportCards()
    }
  }, [activeTab, user?.institution_id, currentPage, selectedPeriodId, selectedClassId, statusFilter, searchQuery])

  async function fetchPeriods() {
    if (!user?.institution_id) return
    setIsLoading(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from('report_periods')
      .select('*')
      .eq('institution_id', user.institution_id)
      .order('start_date', { ascending: false })

    if (!error && data) {
      // Get report card counts for each period
      const periodsWithCounts = await Promise.all(
        (data as ReportPeriod[]).map(async (period) => {
          const { count } = await supabase
            .from('student_report_cards')
            .select('id', { count: 'exact', head: true })
            .eq('report_period_id', period.id)

          return { ...period, _count: { report_cards: count || 0 } }
        })
      )
      setPeriods(periodsWithCounts)
    }
    setIsLoading(false)
  }

  async function fetchClasses() {
    if (!user?.institution_id) return
    const supabase = createClient()

    const { data } = await supabase
      .from('programs')
      .select('id, name, grade_level')
      .eq('institution_id', user.institution_id)
      .eq('is_active', true)
      .order('name')

    setClasses((data || []) as Class[])
  }

  async function fetchReportCards() {
    if (!user?.institution_id) return
    setIsLoading(true)
    const supabase = createClient()

    let query = supabase
      .from('student_report_cards')
      .select(`
        *,
        student:students(id, full_name, student_number, grade),
        report_period:report_periods(name),
        class:classes(name)
      `, { count: 'exact' })
      .eq('institution_id', user.institution_id)
      .order('generated_at', { ascending: false })

    if (selectedPeriodId) {
      query = query.eq('report_period_id', selectedPeriodId)
    }
    if (selectedClassId) {
      query = query.eq('class_id', selectedClassId)
    }
    if (statusFilter) {
      query = query.eq('status', statusFilter)
    }

    const from = (currentPage - 1) * ITEMS_PER_PAGE
    query = query.range(from, from + ITEMS_PER_PAGE - 1)

    const { data, count, error } = await query

    if (!error && data) {
      // Filter by search query if needed
      let filteredData = data as unknown as StudentReportCard[]
      if (searchQuery) {
        const search = searchQuery.toLowerCase()
        filteredData = filteredData.filter(
          (card) =>
            card.student?.full_name.toLowerCase().includes(search) ||
            card.student?.student_number?.toLowerCase().includes(search)
        )
      }
      setReportCards(filteredData)
      setTotalCount(count || 0)
    }
    setIsLoading(false)
  }

  async function handleSavePeriod(e: React.FormEvent) {
    e.preventDefault()
    if (!user?.institution_id) return
    setIsSavingPeriod(true)
    const supabase = createClient()

    try {
      // If setting as current, unset other current periods
      if (periodForm.is_current) {
        await supabase
          .from('report_periods')
          .update({ is_current: false } as never)
          .eq('institution_id', user.institution_id)
      }

      const periodData = {
        institution_id: user.institution_id,
        name: periodForm.name,
        start_date: periodForm.start_date,
        end_date: periodForm.end_date,
        academic_year: periodForm.academic_year,
        is_current: periodForm.is_current,
      }

      if (editingPeriod) {
        const { error } = await supabase
          .from('report_periods')
          .update(periodData as never)
          .eq('id', editingPeriod.id)
        if (error) throw error
        toast.success('Report period updated')
      } else {
        const { error } = await supabase
          .from('report_periods')
          .insert(periodData as never)
        if (error) throw error
        toast.success('Report period created')
      }

      setShowPeriodModal(false)
      resetPeriodForm()
      fetchPeriods()
    } catch (error) {
      console.error('Error saving period:', error)
      toast.error('Failed to save report period')
    } finally {
      setIsSavingPeriod(false)
    }
  }

  function resetPeriodForm() {
    setPeriodForm({
      name: '',
      start_date: '',
      end_date: '',
      academic_year: new Date().getFullYear().toString(),
      is_current: false,
    })
    setEditingPeriod(null)
  }

  function openEditPeriod(period: ReportPeriod) {
    setPeriodForm({
      name: period.name,
      start_date: period.start_date,
      end_date: period.end_date,
      academic_year: period.academic_year || '',
      is_current: period.is_current,
    })
    setEditingPeriod(period)
    setShowPeriodModal(true)
  }

  async function handleGenerateReportCards(e: React.FormEvent) {
    e.preventDefault()
    if (!user?.institution_id) return
    if (!generateForm.period_id || !generateForm.class_id) {
      toast.error('Please select a period and class')
      return
    }

    setIsGenerating(true)
    const supabase = createClient()

    try {
      // Get students in the class
      const { data: students, error: studentError } = await supabase
        .from('students')
        .select('id, full_name, student_number, grade, class_id')
        .eq('institution_id', user.institution_id)
        .eq('class_id', generateForm.class_id)
        .eq('status', 'active')

      if (studentError) throw studentError

      if (!students || students.length === 0) {
        toast.error('No active students found in this class')
        return
      }

      // Get the period for date range
      const { data: periodData } = await supabase
        .from('report_periods')
        .select('id, name, start_date, end_date')
        .eq('id', generateForm.period_id)
        .single()

      if (!periodData) {
        toast.error('Report period not found')
        return
      }

      const period = periodData as { id: string; name: string; start_date: string; end_date: string }

      // Get subjects
      const { data: subjects } = await supabase
        .from('courses')
        .select('id, name, code')
        .eq('institution_id', user.institution_id)
        .eq('is_active', true)

      let created = 0
      let skipped = 0

      for (const student of students as Student[]) {
        // Check if report card already exists
        const { data: existing } = await supabase
          .from('student_report_cards')
          .select('id')
          .eq('student_id', student.id)
          .eq('report_period_id', generateForm.period_id)
          .single()

        if (existing) {
          skipped++
          continue
        }

        // Get grades for this student in the period date range
        const { data: grades } = await supabase
          .from('student_grades')
          .select(`
            id,
            marks_obtained,
            assessment:assessments(
              id,
              subject_id,
              max_marks,
              assessment_date
            )
          `)
          .eq('student_id', student.id)
          .gte('created_at', period.start_date)
          .lte('created_at', period.end_date)

        // Calculate totals per subject
        const subjectTotals: Record<string, { obtained: number; max: number }> = {}

        for (const gradeRecord of (grades || []) as { marks_obtained: number | null; assessment?: { subject_id: string; max_marks: number } }[]) {
          if (gradeRecord.marks_obtained !== null && gradeRecord.assessment) {
            const subjId = gradeRecord.assessment.subject_id
            if (!subjectTotals[subjId]) {
              subjectTotals[subjId] = { obtained: 0, max: 0 }
            }
            subjectTotals[subjId].obtained += gradeRecord.marks_obtained
            subjectTotals[subjId].max += gradeRecord.assessment.max_marks
          }
        }

        // Calculate overall
        let totalMarks = 0
        let totalPossible = 0

        for (const subjId in subjectTotals) {
          totalMarks += subjectTotals[subjId].obtained
          totalPossible += subjectTotals[subjId].max
        }

        const avgPercentage = totalPossible > 0 ? (totalMarks / totalPossible) * 100 : 0
        const overallGrade = avgPercentage > 0 ? calculateGrade(avgPercentage) : null

        // Get attendance for the period
        const { data: attendance } = await supabase
          .from('attendance')
          .select('status')
          .eq('student_id', student.id)
          .gte('date', period.start_date)
          .lte('date', period.end_date)

        let present = 0, absent = 0, late = 0
        for (const a of (attendance || []) as { status: string }[]) {
          if (a.status === 'present') present++
          else if (a.status === 'absent') absent++
          else if (a.status === 'late') late++
        }

        // Create report card
        const { data: newCardData, error: cardError } = await supabase
          .from('student_report_cards')
          .insert({
            institution_id: user.institution_id,
            student_id: student.id,
            report_period_id: generateForm.period_id,
            class_id: generateForm.class_id,
            total_marks: totalMarks || null,
            total_possible: totalPossible || null,
            average_percentage: avgPercentage || null,
            overall_grade: overallGrade,
            days_present: present,
            days_absent: absent,
            days_late: late,
            status: 'draft',
          } as never)
          .select('id')
          .single()

        if (cardError || !newCardData) {
          console.error('Error creating report card:', cardError)
          continue
        }

        const newCard = newCardData as { id: string }

        // Create subject entries
        if (subjects) {
          for (const subject of subjects as { id: string }[]) {
            const subjectTotal = subjectTotals[subject.id]
            if (subjectTotal) {
              const percentage = subjectTotal.max > 0 ? (subjectTotal.obtained / subjectTotal.max) * 100 : 0

              await supabase.from('report_card_subjects').insert({
                report_card_id: newCard.id,
                subject_id: subject.id,
                marks_obtained: subjectTotal.obtained,
                max_marks: subjectTotal.max,
                percentage: percentage,
                grade: calculateGrade(percentage),
              } as never)
            }
          }
        }

        created++
      }

      toast.success(`Generated ${created} report cards (${skipped} already existed)`)
      setShowGenerateModal(false)
      setGenerateForm({ period_id: '', class_id: '' })
      fetchReportCards()
    } catch (error) {
      console.error('Error generating report cards:', error)
      toast.error('Failed to generate report cards')
    } finally {
      setIsGenerating(false)
    }
  }

  async function viewReportCard(card: StudentReportCard) {
    setViewingCard(card)
    setCardComments({
      class_teacher_comment: card.class_teacher_comment || '',
      principal_comment: card.principal_comment || '',
    })
    setIsLoadingCard(true)

    const supabase = createClient()
    const { data, error } = await supabase
      .from('report_card_subjects')
      .select(`
        *,
        subject:subjects(id, name, code)
      `)
      .eq('report_card_id', card.id)
      .order('subject(name)')

    if (!error && data) {
      setCardSubjects(data as unknown as ReportCardSubject[])
    }
    setIsLoadingCard(false)
  }

  async function handleSaveCardComments() {
    if (!viewingCard) return
    setIsSavingCard(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('student_report_cards')
        .update({
          class_teacher_comment: cardComments.class_teacher_comment,
          principal_comment: cardComments.principal_comment,
        } as never)
        .eq('id', viewingCard.id)

      if (error) throw error

      toast.success('Comments saved')
      setViewingCard({ ...viewingCard, ...cardComments })
      fetchReportCards()
    } catch (error) {
      console.error('Error saving comments:', error)
      toast.error('Failed to save comments')
    } finally {
      setIsSavingCard(false)
    }
  }

  async function updateCardStatus(card: StudentReportCard, status: string) {
    const supabase = createClient()

    try {
      const updateData: Record<string, unknown> = { status }
      if (status === 'published') {
        updateData.published_at = new Date().toISOString()
      }

      const { error } = await supabase
        .from('student_report_cards')
        .update(updateData as never)
        .eq('id', card.id)

      if (error) throw error

      toast.success(`Report card ${status}`)
      fetchReportCards()
      if (viewingCard?.id === card.id) {
        setViewingCard({ ...viewingCard, status, published_at: status === 'published' ? new Date().toISOString() : null })
      }
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('Failed to update status')
    }
  }

  async function handleDelete() {
    if (!deleteModal.item) return
    setIsDeleting(true)
    const supabase = createClient()

    try {
      if (deleteModal.type === 'period') {
        // Delete all related report cards first
        const { error: cardsError } = await supabase
          .from('student_report_cards')
          .delete()
          .eq('report_period_id', deleteModal.item.id)

        if (cardsError) throw cardsError

        const { error } = await supabase
          .from('report_periods')
          .delete()
          .eq('id', deleteModal.item.id)
        if (error) throw error
        toast.success('Report period deleted')
        fetchPeriods()
      } else {
        // Delete report card subjects first
        await supabase
          .from('report_card_subjects')
          .delete()
          .eq('report_card_id', deleteModal.item.id)

        const { error } = await supabase
          .from('student_report_cards')
          .delete()
          .eq('id', deleteModal.item.id)
        if (error) throw error
        toast.success('Report card deleted')
        fetchReportCards()
        if (viewingCard?.id === deleteModal.item.id) {
          setViewingCard(null)
        }
      }

      setDeleteModal({ open: false, type: 'period', item: null })
    } catch (error) {
      console.error('Error deleting:', error)
      toast.error(`Failed to delete ${deleteModal.type}`)
    } finally {
      setIsDeleting(false)
    }
  }

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 md:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Report Cards</h1>
              <p className="mt-1 text-sm text-gray-500">Generate and manage student report cards</p>
            </div>
            <div className="flex items-center gap-3">
              {activeTab === 'cards' && (
                <Button
                  leftIcon={<Plus className="w-4 h-4" />}
                  onClick={() => setShowGenerateModal(true)}
                >
                  Generate Report Cards
                </Button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-6 bg-gray-100 p-1 rounded-lg w-fit">
            <button
              onClick={() => setActiveTab('periods')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'periods'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Calendar className="w-4 h-4" />
              Report Periods
            </button>
            <button
              onClick={() => setActiveTab('cards')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'cards'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <FileText className="w-4 h-4" />
              Report Cards
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-6">
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
                New Report Period
              </Button>
            </div>

            <div className="bg-white rounded-xl border border-gray-200">
              {isLoading ? (
                <div className="p-8 text-center">
                  <div className="animate-pulse space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-16 bg-gray-100 rounded"></div>
                    ))}
                  </div>
                </div>
              ) : periods.length === 0 ? (
                <div className="p-12 text-center">
                  <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No report periods yet</h3>
                  <p className="text-gray-500 mb-4">Create a period to start generating report cards</p>
                  <Button
                    leftIcon={<Plus className="w-4 h-4" />}
                    onClick={() => {
                      resetPeriodForm()
                      setShowPeriodModal(true)
                    }}
                  >
                    New Report Period
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {periods.map((period) => (
                    <div
                      key={period.id}
                      className="p-4 flex items-center justify-between hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-lg ${period.is_current ? 'bg-green-100' : 'bg-gray-100'}`}>
                          <Calendar className={`w-6 h-6 ${period.is_current ? 'text-green-600' : 'text-gray-600'}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900">{period.name}</p>
                            {period.is_current && (
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                                Current
                              </span>
                            )}
                            {period.is_published && (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                                Published
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">
                            {new Date(period.start_date).toLocaleDateString('en-ZA')} - {new Date(period.end_date).toLocaleDateString('en-ZA')}
                            {period.academic_year && ` • ${period.academic_year}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-sm text-right">
                          <p className="font-medium text-gray-900">{period._count?.report_cards || 0}</p>
                          <p className="text-gray-500">report cards</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditPeriod(period)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteModal({ open: true, type: 'period', item: period })}
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
              )}
            </div>
          </div>
        )}

        {/* Report Cards Tab */}
        {activeTab === 'cards' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by student name or number..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      setCurrentPage(1)
                    }}
                  />
                </div>
                <div className="w-48">
                  <Select
                    options={[
                      { value: '', label: 'All Periods' },
                      ...periods.map((p) => ({ value: p.id, label: p.name })),
                    ]}
                    value={selectedPeriodId}
                    onChange={(e) => {
                      setSelectedPeriodId(e.target.value)
                      setCurrentPage(1)
                    }}
                  />
                </div>
                <div className="w-48">
                  <Select
                    options={[
                      { value: '', label: 'All Classes' },
                      ...classes.map((c) => ({ value: c.id, label: c.name })),
                    ]}
                    value={selectedClassId}
                    onChange={(e) => {
                      setSelectedClassId(e.target.value)
                      setCurrentPage(1)
                    }}
                  />
                </div>
                <div className="w-40">
                  <Select
                    options={[
                      { value: '', label: 'All Statuses' },
                      { value: 'draft', label: 'Draft' },
                      { value: 'reviewed', label: 'Reviewed' },
                      { value: 'published', label: 'Published' },
                    ]}
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value)
                      setCurrentPage(1)
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Report Cards List */}
            <div className="bg-white rounded-xl border border-gray-200">
              {isLoading ? (
                <div className="p-8 text-center">
                  <div className="animate-pulse space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-16 bg-gray-100 rounded"></div>
                    ))}
                  </div>
                </div>
              ) : reportCards.length === 0 ? (
                <div className="p-12 text-center">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No report cards yet</h3>
                  <p className="text-gray-500 mb-4">Generate report cards for a class to get started</p>
                  <Button
                    leftIcon={<Plus className="w-4 h-4" />}
                    onClick={() => setShowGenerateModal(true)}
                  >
                    Generate Report Cards
                  </Button>
                </div>
              ) : (
                <>
                  <div className="divide-y divide-gray-100">
                    {reportCards.map((card) => {
                      const badge = STATUS_BADGES[card.status] || STATUS_BADGES.draft
                      return (
                        <div
                          key={card.id}
                          className="p-4 flex items-center justify-between hover:bg-gray-50"
                        >
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-100 rounded-lg">
                              <Award className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{card.student?.full_name}</p>
                              <p className="text-sm text-gray-500">
                                {card.student?.student_number && `${card.student.student_number} • `}
                                {card.class?.name || card.student?.grade}
                                {card.report_period?.name && ` • ${card.report_period.name}`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="text-center min-w-[60px]">
                              <p className="text-lg font-semibold text-gray-900">
                                {card.average_percentage !== null
                                  ? `${card.average_percentage.toFixed(0)}%`
                                  : '-'
                                }
                              </p>
                              <p className="text-xs text-gray-500">Average</p>
                            </div>
                            <div className="text-center min-w-[40px]">
                              <p className="text-lg font-semibold text-blue-600">
                                {card.overall_grade || '-'}
                              </p>
                              <p className="text-xs text-gray-500">Grade</p>
                            </div>
                            <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                              {badge.icon}
                              {card.status.charAt(0).toUpperCase() + card.status.slice(1)}
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => viewReportCard(card)}
                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                                title="View/Edit"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeleteModal({ open: true, type: 'card', item: card })}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
                      <p className="text-sm text-gray-500">
                        Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} of {totalCount}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <span className="text-sm text-gray-600">Page {currentPage} of {totalPages}</span>
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
        )}
      </div>

      {/* Period Modal */}
      {showPeriodModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingPeriod ? 'Edit Report Period' : 'Create Report Period'}
              </h2>
              <button onClick={() => setShowPeriodModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSavePeriod} className="p-6 space-y-4">
              <Input
                label="Period Name"
                required
                value={periodForm.name}
                onChange={(e) => setPeriodForm({ ...periodForm, name: e.target.value })}
                placeholder="e.g., Term 1 2024"
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Start Date"
                  type="date"
                  required
                  value={periodForm.start_date}
                  onChange={(e) => setPeriodForm({ ...periodForm, start_date: e.target.value })}
                />
                <Input
                  label="End Date"
                  type="date"
                  required
                  value={periodForm.end_date}
                  onChange={(e) => setPeriodForm({ ...periodForm, end_date: e.target.value })}
                />
              </div>
              <Input
                label="Academic Year"
                value={periodForm.academic_year}
                onChange={(e) => setPeriodForm({ ...periodForm, academic_year: e.target.value })}
                placeholder="e.g., 2024"
              />
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={periodForm.is_current}
                  onChange={(e) => setPeriodForm({ ...periodForm, is_current: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300"
                />
                <span className="text-sm font-medium text-gray-700">Set as current period</span>
              </label>
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowPeriodModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSavingPeriod} className="flex-1">
                  {isSavingPeriod ? 'Saving...' : editingPeriod ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Generate Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Generate Report Cards</h2>
              <button onClick={() => setShowGenerateModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleGenerateReportCards} className="p-6 space-y-4">
              <p className="text-sm text-gray-600 mb-4">
                This will generate report cards for all active students in the selected class,
                pulling grade data from assessments within the period date range.
              </p>
              <Select
                label="Report Period"
                required
                value={generateForm.period_id}
                onChange={(e) => setGenerateForm({ ...generateForm, period_id: e.target.value })}
                options={[
                  { value: '', label: 'Select Period' },
                  ...periods.map((p) => ({ value: p.id, label: p.name })),
                ]}
              />
              <Select
                label="Class"
                required
                value={generateForm.class_id}
                onChange={(e) => setGenerateForm({ ...generateForm, class_id: e.target.value })}
                options={[
                  { value: '', label: 'Select Class' },
                  ...classes.map((c) => ({ value: c.id, label: c.name })),
                ]}
              />
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowGenerateModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isGenerating || !generateForm.period_id || !generateForm.class_id}
                  leftIcon={isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  className="flex-1"
                >
                  {isGenerating ? 'Generating...' : 'Generate'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View/Edit Report Card Modal */}
      {viewingCard && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {viewingCard.student?.full_name}
                </h2>
                <p className="text-sm text-gray-500">
                  {viewingCard.report_period?.name} • {viewingCard.class?.name || viewingCard.student?.grade}
                </p>
              </div>
              <button onClick={() => setViewingCard(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-blue-700">
                    {viewingCard.average_percentage !== null
                      ? `${viewingCard.average_percentage.toFixed(1)}%`
                      : '-'
                    }
                  </p>
                  <p className="text-sm text-blue-600">Average</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-green-700">{viewingCard.overall_grade || '-'}</p>
                  <p className="text-sm text-green-600">Grade</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-purple-700">{viewingCard.class_rank || '-'}</p>
                  <p className="text-sm text-purple-600">Class Rank</p>
                </div>
                <div className="bg-amber-50 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-amber-700">
                    {viewingCard.days_present}/{viewingCard.days_present + viewingCard.days_absent}
                  </p>
                  <p className="text-sm text-amber-600">Attendance</p>
                </div>
              </div>

              {/* Subject Results */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Subject Results</h3>
                {isLoadingCard ? (
                  <div className="animate-pulse space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-12 bg-gray-100 rounded"></div>
                    ))}
                  </div>
                ) : cardSubjects.length === 0 ? (
                  <p className="text-gray-500 text-sm">No subject results found</p>
                ) : (
                  <div className="border border-gray-200 rounded-lg divide-y">
                    <div className="grid grid-cols-5 gap-4 px-4 py-2 bg-gray-50 text-xs font-medium text-gray-500 uppercase">
                      <div className="col-span-2">Subject</div>
                      <div className="text-center">Marks</div>
                      <div className="text-center">Percentage</div>
                      <div className="text-center">Grade</div>
                    </div>
                    {cardSubjects.map((subj) => (
                      <div key={subj.id} className="grid grid-cols-5 gap-4 px-4 py-3 text-sm">
                        <div className="col-span-2 font-medium text-gray-900">
                          {subj.subject?.name}
                          {subj.subject?.code && (
                            <span className="text-gray-400 ml-1">({subj.subject.code})</span>
                          )}
                        </div>
                        <div className="text-center text-gray-600">
                          {subj.marks_obtained !== null ? `${subj.marks_obtained}/${subj.max_marks}` : '-'}
                        </div>
                        <div className="text-center text-gray-600">
                          {subj.percentage !== null ? `${subj.percentage.toFixed(1)}%` : '-'}
                        </div>
                        <div className="text-center font-semibold text-blue-600">{subj.grade || '-'}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Comments */}
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900">Comments</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Class Teacher Comment</label>
                  <textarea
                    value={cardComments.class_teacher_comment}
                    onChange={(e) => setCardComments({ ...cardComments, class_teacher_comment: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none resize-none"
                    rows={3}
                    placeholder="Enter class teacher's comment..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Principal Comment</label>
                  <textarea
                    value={cardComments.principal_comment}
                    onChange={(e) => setCardComments({ ...cardComments, principal_comment: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none resize-none"
                    rows={3}
                    placeholder="Enter principal's comment..."
                  />
                </div>
                <Button
                  onClick={handleSaveCardComments}
                  disabled={isSavingCard}
                  leftIcon={isSavingCard ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                >
                  {isSavingCard ? 'Saving...' : 'Save Comments'}
                </Button>
              </div>

              {/* Attendance Summary */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Attendance Summary</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-green-50 p-4 rounded-lg text-center">
                    <p className="text-xl font-bold text-green-700">{viewingCard.days_present}</p>
                    <p className="text-sm text-green-600">Days Present</p>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg text-center">
                    <p className="text-xl font-bold text-red-700">{viewingCard.days_absent}</p>
                    <p className="text-sm text-red-600">Days Absent</p>
                  </div>
                  <div className="bg-amber-50 p-4 rounded-lg text-center">
                    <p className="text-xl font-bold text-amber-700">{viewingCard.days_late}</p>
                    <p className="text-sm text-amber-600">Days Late</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  {viewingCard.status === 'draft' && (
                    <Button
                      variant="secondary"
                      onClick={() => updateCardStatus(viewingCard, 'reviewed')}
                      leftIcon={<Eye className="w-4 h-4" />}
                    >
                      Mark as Reviewed
                    </Button>
                  )}
                  {(viewingCard.status === 'draft' || viewingCard.status === 'reviewed') && (
                    <Button
                      onClick={() => updateCardStatus(viewingCard, 'published')}
                      leftIcon={<Send className="w-4 h-4" />}
                    >
                      Publish
                    </Button>
                  )}
                </div>
                <Button
                  variant="secondary"
                  onClick={() => setViewingCard(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      <ConfirmModal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, type: 'period', item: null })}
        onConfirm={handleDelete}
        title={`Delete ${deleteModal.type === 'period' ? 'Report Period' : 'Report Card'}`}
        message={
          deleteModal.type === 'period'
            ? 'Are you sure you want to delete this report period? All associated report cards will also be deleted. This action cannot be undone.'
            : 'Are you sure you want to delete this report card? This action cannot be undone.'
        }
        confirmText="Delete"
        isLoading={isDeleting}
      />
    </div>
  )
}
