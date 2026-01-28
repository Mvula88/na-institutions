'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { useOnboardingStore } from '@/stores/onboarding-store'
import { parseNumericInput, formatNumericValue } from '@/lib/numeric-input'
import {
  Check,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Settings,
  BookOpen,
  ArrowRight,
  Calendar,
  CalendarDays,
  Coins,
  BookOpenCheck,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { FeeModelType } from '@/types/database'

interface Subject {
  id: string
  name: string
  monthly_fee: number
  total_course_fee: number
  is_active: boolean
}

const MONTHS = [
  { value: 0, short: 'Jan' },
  { value: 1, short: 'Feb' },
  { value: 2, short: 'Mar' },
  { value: 3, short: 'Apr' },
  { value: 4, short: 'May' },
  { value: 5, short: 'Jun' },
  { value: 6, short: 'Jul' },
  { value: 7, short: 'Aug' },
  { value: 8, short: 'Sep' },
  { value: 9, short: 'Oct' },
  { value: 10, short: 'Nov' },
  { value: 11, short: 'Dec' },
]

const DEFAULT_SUBJECTS_MONTHLY = [
  { name: 'Mathematics', monthly_fee: 300, total_course_fee: 0 },
  { name: 'English', monthly_fee: 300, total_course_fee: 0 },
  { name: 'Physical Science', monthly_fee: 350, total_course_fee: 0 },
  { name: 'Life Sciences', monthly_fee: 300, total_course_fee: 0 },
  { name: 'Accounting', monthly_fee: 300, total_course_fee: 0 },
  { name: 'Business Studies', monthly_fee: 300, total_course_fee: 0 },
]

const DEFAULT_COURSES_LUMPSUM = [
  { name: 'Welding and Metal Fabrication', monthly_fee: 0, total_course_fee: 15000 },
  { name: 'Automotive Mechanics', monthly_fee: 0, total_course_fee: 18000 },
  { name: 'Electrical Installation', monthly_fee: 0, total_course_fee: 16000 },
  { name: 'Plumbing', monthly_fee: 0, total_course_fee: 14000 },
  { name: 'Office Administration', monthly_fee: 0, total_course_fee: 12000 },
  { name: 'Information Technology', monthly_fee: 0, total_course_fee: 15000 },
]

const DEFAULT_COURSES_SEMESTER = [
  { name: 'Engineering Fundamentals', monthly_fee: 0, total_course_fee: 0 },
  { name: 'Business Management', monthly_fee: 0, total_course_fee: 0 },
  { name: 'Information Systems', monthly_fee: 0, total_course_fee: 0 },
  { name: 'Applied Sciences', monthly_fee: 0, total_course_fee: 0 },
]

const FEE_MODELS = [
  {
    id: 'monthly_per_course' as FeeModelType,
    label: 'Monthly per Course',
    description: 'Students pay monthly for each course enrolled',
    icon: Calendar,
    bestFor: 'Tutorial centers, coaching classes',
  },
  {
    id: 'per_course_lumpsum' as FeeModelType,
    label: 'Per Course (Lump Sum)',
    description: 'Fixed total fee per course, can be paid in installments',
    icon: BookOpenCheck,
    bestFor: 'VTCs, training institutes',
  },
  {
    id: 'per_semester' as FeeModelType,
    label: 'Per Semester/Term',
    description: 'Fixed fee per semester regardless of courses',
    icon: CalendarDays,
    bestFor: 'Universities, colleges',
  },
]

export function SetupWizard() {
  const { user, fetchUser, isCenterAdmin } = useAuthStore()
  const { completeChecklistItem } = useOnboardingStore()
  const supabase = createClient()

  const [isOpen, setIsOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingSetup, setIsCheckingSetup] = useState(true)
  const contentRef = useRef<HTMLDivElement>(null)

  // Fee Model State
  const [feeModel, setFeeModel] = useState<FeeModelType>('monthly_per_course')

  // Academic Year State (for monthly model)
  const [paymentMonths, setPaymentMonths] = useState<number[]>([1, 2, 3, 4, 5, 6, 7, 8, 9])
  const [registrationFee, setRegistrationFee] = useState(0)

  // Semester State (for per_semester model)
  const [semesterFee, setSemesterFee] = useState(0)
  const [semesterName, setSemesterName] = useState(`Semester 1 ${new Date().getFullYear()}`)

  // Subjects/Courses State
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null)
  const [newSubject, setNewSubject] = useState({ name: '', monthly_fee: 300, total_course_fee: 0 })
  const [showAddSubject, setShowAddSubject] = useState(false)

  const totalSteps = 3 // Fee Model, Configure Fees, Add Courses

  // Check if setup is needed
  useEffect(() => {
    async function checkSetup() {
      if (!user?.institution_id || !isCenterAdmin()) {
        setIsCheckingSetup(false)
        return
      }

      try {
        const { data: center } = await supabase
          .from('institutions')
          .select('payment_months, default_registration_fee, initial_setup_completed, fee_model')
          .eq('id', user.institution_id)
          .single<{ payment_months: number[] | null; default_registration_fee: number | null; initial_setup_completed: boolean | null; fee_model: FeeModelType | null }>()

        const { count: subjectCount } = await supabase
          .from('courses')
          .select('*', { count: 'exact', head: true })
          .eq('institution_id', user.institution_id)

        if (center && !center.initial_setup_completed) {
          setPaymentMonths(center.payment_months || [1, 2, 3, 4, 5, 6, 7, 8, 9])
          setRegistrationFee(center.default_registration_fee || 0)
          setFeeModel(center.fee_model || 'monthly_per_course')

          if (subjectCount && subjectCount > 0) {
            await loadSubjects()
          }

          setIsOpen(true)
        }
      } catch (error) {
        console.error('Error checking setup:', error)
      } finally {
        setIsCheckingSetup(false)
      }
    }

    checkSetup()
  }, [user?.institution_id])

  async function loadSubjects() {
    if (!user?.institution_id) return

    const { data, error } = await supabase
      .from('courses')
      .select('id, name, monthly_fee, total_course_fee, is_active')
      .eq('institution_id', user.institution_id)
      .order('name')

    if (!error && data) {
      setSubjects(data as Subject[])
    }
  }

  const togglePaymentMonth = (month: number) => {
    setPaymentMonths(prev =>
      prev.includes(month)
        ? prev.filter(m => m !== month)
        : [...prev, month].sort((a, b) => a - b)
    )
  }

  async function handleSaveFeeModel() {
    if (!user?.institution_id) return

    setIsLoading(true)
    try {
      const { error } = await supabase
        .from('institutions')
        .update({
          fee_model: feeModel,
          updated_at: new Date().toISOString(),
        } as never)
        .eq('id', user.institution_id)

      if (error) throw error

      toast.success('Fee model saved')
      setCurrentStep(1)
      setTimeout(() => {
        contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
      }, 100)
    } catch (error) {
      console.error('Error saving fee model:', error)
      toast.error('Failed to save fee model')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSaveAcademicYear() {
    if (!user?.institution_id) return

    if (feeModel === 'monthly_per_course' && paymentMonths.length === 0) {
      toast.error('Please select at least one payment month')
      return
    }

    setIsLoading(true)
    try {
      // Save settings based on fee model
      const updateData: Record<string, unknown> = {
        default_registration_fee: registrationFee,
        updated_at: new Date().toISOString(),
      }

      if (feeModel === 'monthly_per_course') {
        updateData.payment_months = paymentMonths
      }

      const { error } = await supabase
        .from('institutions')
        .update(updateData as never)
        .eq('id', user.institution_id)

      if (error) throw error

      // If per_semester model, create the first semester
      if (feeModel === 'per_semester' && semesterFee > 0) {
        const currentYear = new Date().getFullYear()
        const { error: semesterError } = await supabase
          .from('semesters')
          .insert({
            institution_id: user.institution_id,
            name: semesterName,
            year: currentYear,
            semester_number: 1,
            start_date: `${currentYear}-01-15`,
            end_date: `${currentYear}-06-15`,
            fee_amount: semesterFee,
            is_active: true,
          } as never)

        if (semesterError && !semesterError.message.includes('unique')) {
          console.error('Error creating semester:', semesterError)
        }
      }

      toast.success('Settings saved')
      setCurrentStep(2)
      setTimeout(() => {
        contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
      }, 100)
    } catch (error) {
      console.error('Error saving academic settings:', error)
      toast.error('Failed to save settings')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleCreateDefaultSubjects() {
    if (!user?.institution_id) return

    setIsLoading(true)
    try {
      // Select default courses based on fee model
      const defaultCourses = feeModel === 'monthly_per_course'
        ? DEFAULT_SUBJECTS_MONTHLY
        : feeModel === 'per_course_lumpsum'
        ? DEFAULT_COURSES_LUMPSUM
        : DEFAULT_COURSES_SEMESTER

      const subjectsToCreate = defaultCourses.map(s => ({
        institution_id: user.institution_id,
        name: s.name,
        monthly_fee: s.monthly_fee,
        total_course_fee: s.total_course_fee,
        is_active: true,
      }))

      const { error } = await supabase.from('courses').insert(subjectsToCreate as never)

      if (error) throw error

      await loadSubjects()
      toast.success('Courses created')
    } catch (error) {
      console.error('Error creating courses:', error)
      toast.error('Failed to create courses')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleAddSubject() {
    if (!user?.institution_id || !newSubject.name.trim()) return

    setIsLoading(true)
    try {
      const courseData: Record<string, unknown> = {
        institution_id: user.institution_id,
        name: newSubject.name.trim(),
        is_active: true,
      }

      // Add fee based on fee model
      if (feeModel === 'monthly_per_course') {
        courseData.monthly_fee = newSubject.monthly_fee
      } else if (feeModel === 'per_course_lumpsum') {
        courseData.total_course_fee = newSubject.total_course_fee
      }

      const { error } = await supabase.from('courses').insert(courseData as never)

      if (error) throw error

      await loadSubjects()
      setNewSubject({ name: '', monthly_fee: 300, total_course_fee: 0 })
      setShowAddSubject(false)
      toast.success('Course added')
    } catch (error) {
      console.error('Error adding course:', error)
      toast.error('Failed to add course')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleUpdateSubject() {
    if (!editingSubject) return

    setIsLoading(true)
    try {
      const updateData: Record<string, unknown> = {
        name: editingSubject.name,
        updated_at: new Date().toISOString(),
      }

      // Update fee based on fee model
      if (feeModel === 'monthly_per_course') {
        updateData.monthly_fee = editingSubject.monthly_fee
      } else if (feeModel === 'per_course_lumpsum') {
        updateData.total_course_fee = editingSubject.total_course_fee
      }

      const { error } = await supabase
        .from('courses')
        .update(updateData as never)
        .eq('id', editingSubject.id)

      if (error) throw error

      await loadSubjects()
      setEditingSubject(null)
      toast.success('Course updated')
    } catch (error) {
      console.error('Error updating course:', error)
      toast.error('Failed to update course')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleDeleteSubject(id: string) {
    if (!confirm('Delete this subject?')) return

    setIsLoading(true)
    try {
      const { error } = await supabase.from('courses').delete().eq('id', id)

      if (error) throw error

      await loadSubjects()
      toast.success('Subject deleted')
    } catch (error) {
      console.error('Error deleting subject:', error)
      toast.error('Failed to delete subject')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleCompleteSetup() {
    if (!user?.institution_id) return

    if (subjects.length === 0) {
      toast.error('Add at least one subject to continue')
      return
    }

    setIsLoading(true)
    try {
      const { error } = await supabase
        .from('institutions')
        .update({
          initial_setup_completed: true,
          updated_at: new Date().toISOString(),
        } as never)
        .eq('id', user.institution_id)

      if (error) throw error

      completeChecklistItem('add-subject')
      await fetchUser()
      setIsOpen(false)
      toast.success('Setup complete')
    } catch (error) {
      console.error('Error completing setup:', error)
      toast.error('Failed to complete setup')
    } finally {
      setIsLoading(false)
    }
  }

  if (isCheckingSetup || !isOpen) return null

  const getStepTitle = () => {
    switch (currentStep) {
      case 0: return 'Choose fee model'
      case 1: return 'Configure fees'
      case 2: return 'Add courses'
      default: return 'Setup'
    }
  }

  const getStepIcon = () => {
    switch (currentStep) {
      case 0: return <Coins className="w-5 h-5 text-blue-600" />
      case 1: return <Settings className="w-5 h-5 text-blue-600" />
      case 2: return <BookOpen className="w-5 h-5 text-blue-600" />
      default: return <Settings className="w-5 h-5 text-blue-600" />
    }
  }

  const getFeeLabel = (subject: Subject) => {
    if (feeModel === 'monthly_per_course') {
      return `N$${subject.monthly_fee}/mo · N$${(subject.monthly_fee * paymentMonths.length).toLocaleString()}/yr`
    } else if (feeModel === 'per_course_lumpsum') {
      return `N$${(subject.total_course_fee || 0).toLocaleString()} total`
    } else {
      return 'Semester-based fee'
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/80 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              {getStepIcon()}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 tracking-tight">
                {getStepTitle()}
              </h2>
              <p className="text-gray-500 text-sm">
                Step {currentStep + 1} of {totalSteps}
              </p>
            </div>
          </div>

          {/* Progress */}
          <div className="flex gap-2">
            <div className={`h-1 flex-1 rounded-full ${currentStep >= 0 ? 'bg-blue-600' : 'bg-gray-200'}`} />
            <div className={`h-1 flex-1 rounded-full ${currentStep >= 1 ? 'bg-blue-600' : 'bg-gray-200'}`} />
            <div className={`h-1 flex-1 rounded-full ${currentStep >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`} />
          </div>
        </div>

        {/* Content */}
        <div ref={contentRef} className="flex-1 overflow-y-auto px-6 pb-4">
          {/* Step 0: Fee Model Selection */}
          {currentStep === 0 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 mb-4">
                Choose how you want to structure fees for your institution.
              </p>
              {FEE_MODELS.map((model) => {
                const Icon = model.icon
                const isSelected = feeModel === model.id
                return (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => setFeeModel(model.id)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${isSelected ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className={`font-medium ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                            {model.label}
                          </h3>
                          {isSelected && <Check className="w-4 h-4 text-blue-600" />}
                        </div>
                        <p className="text-sm text-gray-600 mt-0.5">{model.description}</p>
                        <p className="text-xs text-gray-500 mt-1">Best for: {model.bestFor}</p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {/* Step 1: Configure Fees */}
          {currentStep === 1 && (
            <div className="space-y-5">
              {/* Registration Fee - All models */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Registration fee
                </label>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400 text-lg">N$</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formatNumericValue(registrationFee)}
                      onChange={(e) => setRegistrationFee(parseNumericInput(e.target.value))}
                      className="flex-1 bg-transparent text-2xl font-semibold text-gray-900 focus:outline-none"
                      placeholder="0"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    One-time fee for new students
                  </p>
                </div>
              </div>

              {/* Monthly model: Payment months */}
              {feeModel === 'monthly_per_course' && (
                <>
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-medium text-gray-700">
                        Payment months
                      </label>
                      <span className="text-xs text-gray-500">{paymentMonths.length} selected</span>
                    </div>
                    <div className="grid grid-cols-6 gap-1.5">
                      {MONTHS.map((month) => {
                        const isSelected = paymentMonths.includes(month.value)
                        return (
                          <button
                            key={month.value}
                            type="button"
                            onClick={() => togglePaymentMonth(month.value)}
                            className={`py-2 rounded-lg text-sm font-medium transition-all ${
                              isSelected
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {month.short}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm text-gray-600">Example yearly fee</span>
                      <div>
                        <span className="text-xl font-bold text-gray-900">
                          N${(300 * paymentMonths.length).toLocaleString()}
                        </span>
                        <span className="text-gray-500 text-sm">/year</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      For a course at N$300/month
                    </p>
                  </div>
                </>
              )}

              {/* Lump sum model: Info */}
              {feeModel === 'per_course_lumpsum' && (
                <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                  <p className="text-sm text-purple-800">
                    Course fees will be configured in the next step. Each course can have a total fee that students pay in full or in installments.
                  </p>
                </div>
              )}

              {/* Semester model: First semester setup */}
              {feeModel === 'per_semester' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First semester name
                    </label>
                    <input
                      type="text"
                      value={semesterName}
                      onChange={(e) => setSemesterName(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none"
                      placeholder="e.g., Semester 1 2025"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Semester fee
                    </label>
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                      <div className="flex items-center gap-3">
                        <span className="text-gray-400 text-lg">N$</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={formatNumericValue(semesterFee)}
                          onChange={(e) => setSemesterFee(parseNumericInput(e.target.value))}
                          className="flex-1 bg-transparent text-2xl font-semibold text-gray-900 focus:outline-none"
                          placeholder="0"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Fee per student per semester
                      </p>
                    </div>
                  </div>
                  <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
                    <p className="text-sm text-indigo-800">
                      You can add more semesters later in Settings &gt; Fee Model.
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 2: Courses */}
          {currentStep === 2 && (
            <div className="space-y-4">
              {/* Quick Start */}
              {subjects.length === 0 && (
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                  <p className="text-sm text-blue-800 mb-3">
                    {feeModel === 'monthly_per_course'
                      ? 'Start with common courses and adjust prices later.'
                      : feeModel === 'per_course_lumpsum'
                      ? 'Start with common VTC courses and adjust fees later.'
                      : 'Start with common courses. Fees are at semester level.'}
                  </p>
                  <button
                    onClick={handleCreateDefaultSubjects}
                    disabled={isLoading}
                    className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Add common courses'
                    )}
                  </button>
                </div>
              )}

              {/* Course List */}
              {subjects.length > 0 && (
                <div className="space-y-2">
                  {subjects.map((subject) => (
                    <div
                      key={subject.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                    >
                      {editingSubject?.id === subject.id ? (
                        <div className="flex-1 flex items-center gap-2">
                          <input
                            type="text"
                            value={editingSubject.name}
                            onChange={(e) =>
                              setEditingSubject({ ...editingSubject, name: e.target.value })
                            }
                            className="flex-1 px-3 py-1.5 rounded-lg border border-gray-300 text-sm"
                          />
                          {feeModel === 'monthly_per_course' && (
                            <div className="flex items-center">
                              <span className="text-gray-400 text-sm mr-1">N$</span>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={formatNumericValue(editingSubject.monthly_fee)}
                                onChange={(e) =>
                                  setEditingSubject({
                                    ...editingSubject,
                                    monthly_fee: parseNumericInput(e.target.value),
                                  })
                                }
                                className="w-20 px-2 py-1.5 rounded-lg border border-gray-300 text-sm"
                              />
                            </div>
                          )}
                          {feeModel === 'per_course_lumpsum' && (
                            <div className="flex items-center">
                              <span className="text-gray-400 text-sm mr-1">N$</span>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={formatNumericValue(editingSubject.total_course_fee || 0)}
                                onChange={(e) =>
                                  setEditingSubject({
                                    ...editingSubject,
                                    total_course_fee: parseNumericInput(e.target.value),
                                  })
                                }
                                className="w-24 px-2 py-1.5 rounded-lg border border-gray-300 text-sm"
                              />
                            </div>
                          )}
                          <button
                            onClick={handleUpdateSubject}
                            disabled={isLoading}
                            className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingSubject(null)}
                            className="p-1.5 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{subject.name}</p>
                            <p className="text-xs text-gray-500">
                              {getFeeLabel(subject)}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setEditingSubject(subject)}
                              className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-white"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteSubject(subject.id)}
                              className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-white"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Add Course */}
              {showAddSubject ? (
                <div className="p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newSubject.name}
                      onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                      placeholder="Course name"
                      className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm"
                      autoFocus
                    />
                    {feeModel === 'monthly_per_course' && (
                      <div className="flex items-center">
                        <span className="text-gray-400 text-sm mr-1">N$</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={formatNumericValue(newSubject.monthly_fee)}
                          onChange={(e) =>
                            setNewSubject({ ...newSubject, monthly_fee: parseNumericInput(e.target.value) })
                          }
                          placeholder="/mo"
                          className="w-20 px-2 py-2 rounded-lg border border-gray-300 text-sm"
                        />
                      </div>
                    )}
                    {feeModel === 'per_course_lumpsum' && (
                      <div className="flex items-center">
                        <span className="text-gray-400 text-sm mr-1">N$</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={formatNumericValue(newSubject.total_course_fee || 0)}
                          onChange={(e) =>
                            setNewSubject({ ...newSubject, total_course_fee: parseNumericInput(e.target.value) })
                          }
                          placeholder="total"
                          className="w-24 px-2 py-2 rounded-lg border border-gray-300 text-sm"
                        />
                      </div>
                    )}
                    <button
                      onClick={handleAddSubject}
                      disabled={isLoading || !newSubject.name.trim()}
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => {
                        setShowAddSubject(false)
                        setNewSubject({ name: '', monthly_fee: 300, total_course_fee: 0 })
                      }}
                      className="px-3 py-2 text-gray-600 hover:text-gray-900 text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddSubject(true)}
                  className="w-full p-3 border border-dashed border-gray-300 rounded-xl text-gray-500 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50/50 transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add course
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          <div className="flex items-center justify-between">
            {currentStep > 0 ? (
              <button
                onClick={() => {
                  setCurrentStep(currentStep - 1)
                  setTimeout(() => {
                    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
                  }, 100)
                }}
                className="flex items-center gap-1 px-3 py-2 text-gray-600 hover:text-gray-900 text-sm"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            ) : (
              <div />
            )}

            {currentStep === 0 && (
              <button
                onClick={handleSaveFeeModel}
                disabled={isLoading}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Continue
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            )}

            {currentStep === 1 && (
              <button
                onClick={handleSaveAcademicYear}
                disabled={isLoading || (feeModel === 'monthly_per_course' && paymentMonths.length === 0)}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Continue
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            )}

            {currentStep === 2 && (
              <button
                onClick={handleCompleteSetup}
                disabled={isLoading || subjects.length === 0}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Complete setup
                    <Check className="w-4 h-4" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
