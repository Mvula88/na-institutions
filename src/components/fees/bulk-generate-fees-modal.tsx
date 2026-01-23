'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import {
  X,
  CalendarPlus,
  AlertCircle,
  CheckCircle,
  Loader2,
  Info,
  DollarSign,
  Calendar,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { formatCurrency } from '@/lib/currency'
import { FeeModelType, Semester } from '@/types/database'
import { generateFeesForInstitution } from '@/lib/fee-utils'

interface BulkGenerateFeesModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface StudentPreview {
  id: string
  full_name: string
  student_number: string | null
  courses_count: number
  monthly_fee: number
  total_course_fee: number
}

interface InstitutionSettings {
  payment_months: number[] | null
  fee_model: FeeModelType | null
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export function BulkGenerateFeesModal({ isOpen, onClose, onSuccess }: BulkGenerateFeesModalProps) {
  const { user } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonths, setSelectedMonths] = useState<number[]>([])
  const [centerSettings, setInstitutionSettings] = useState<InstitutionSettings | null>(null)
  const [eligibleStudents, setEligibleStudents] = useState<StudentPreview[]>([])
  const [existingFeeMonths, setExistingFeeMonths] = useState<Set<string>>(new Set())
  const [semesters, setSemesters] = useState<Semester[]>([])
  const [selectedSemester, setSelectedSemester] = useState<string>('')
  const [generationResult, setGenerationResult] = useState<{
    success: boolean
    studentsProcessed: number
    feesGenerated: number
  } | null>(null)

  // Fetch center settings and eligible students when modal opens
  useEffect(() => {
    if (isOpen && user?.institution_id) {
      fetchData()
    }
  }, [isOpen, user?.institution_id])

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedMonths([])
      setSelectedSemester('')
      setGenerationResult(null)
    }
  }, [isOpen])

  async function fetchData() {
    if (!user?.institution_id) return

    setIsLoading(true)
    const supabase = createClient()

    try {
      // Fetch institution settings
      const { data: centerData } = await supabase
        .from('institutions')
        .select('payment_months, fee_model')
        .eq('id', user.institution_id)
        .single()

      if (centerData) {
        const typedCenterData = centerData as InstitutionSettings
        setInstitutionSettings(typedCenterData)

        // Fetch semesters for semester model
        if (typedCenterData.fee_model === 'per_semester') {
          const { data: semesterData } = await supabase
            .from('semesters')
            .select('*')
            .eq('institution_id', user.institution_id)
            .eq('is_active', true)
            .order('year', { ascending: false })
            .order('semester_number', { ascending: true })

          if (semesterData && semesterData.length > 0) {
            const typedSemesters = semesterData as Semester[]
            setSemesters(typedSemesters)
            setSelectedSemester(typedSemesters[0].id)
          }
        }
      }

      // Fetch active students with their enrolled courses
      const { data: studentsData } = await supabase
        .from('students')
        .select(`
          id,
          full_name,
          student_number,
          student_enrollments(
            course:courses(monthly_fee, total_course_fee)
          )
        `)
        .eq('institution_id', user.institution_id)
        .eq('status', 'active')

      if (studentsData) {
        // Process students to calculate their fees
        const processedStudents: StudentPreview[] = []
        const studentMap = new Map<string, StudentPreview>()

        for (const student of studentsData as any[]) {
          if (!studentMap.has(student.id)) {
            const enrollments = student.student_enrollments || []
            const monthlyFee = enrollments.reduce((sum: number, e: any) => {
              return sum + (e.course?.monthly_fee || 0)
            }, 0)
            const totalCourseFee = enrollments.reduce((sum: number, e: any) => {
              return sum + (e.course?.total_course_fee || 0)
            }, 0)

            if (monthlyFee > 0 || totalCourseFee > 0 || enrollments.length > 0) {
              studentMap.set(student.id, {
                id: student.id,
                full_name: student.full_name,
                student_number: student.student_number,
                courses_count: enrollments.length,
                monthly_fee: monthlyFee,
                total_course_fee: totalCourseFee,
              })
            }
          }
        }

        setEligibleStudents(Array.from(studentMap.values()))
      }

      // Fetch existing fee records for the selected year
      const yearStart = `${selectedYear}-01-01`
      const yearEnd = `${selectedYear}-12-31`

      const { data: feesData } = await supabase
        .from('student_fees')
        .select('fee_month, student_id')
        .eq('fee_type', 'tuition')
        .gte('fee_month', yearStart)
        .lte('fee_month', yearEnd)

      if (feesData) {
        // Create a set of "studentId-feeMonth" combinations
        const existingSet = new Set<string>()
        for (const fee of feesData as any[]) {
          existingSet.add(`${fee.student_id}-${fee.fee_month}`)
        }
        setExistingFeeMonths(existingSet)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }

  // Refresh existing fees when year changes
  useEffect(() => {
    if (isOpen && user?.institution_id) {
      fetchExistingFees()
    }
  }, [selectedYear])

  async function fetchExistingFees() {
    if (!user?.institution_id) return

    const supabase = createClient()
    const yearStart = `${selectedYear}-01-01`
    const yearEnd = `${selectedYear}-12-31`

    const { data: feesData } = await supabase
      .from('student_fees')
      .select('fee_month, student_id')
      .eq('fee_type', 'tuition')
      .gte('fee_month', yearStart)
      .lte('fee_month', yearEnd)

    if (feesData) {
      const existingSet = new Set<string>()
      for (const fee of feesData as any[]) {
        existingSet.add(`${fee.student_id}-${fee.fee_month}`)
      }
      setExistingFeeMonths(existingSet)
    }
  }

  // Toggle month selection
  const toggleMonth = (monthIndex: number) => {
    setSelectedMonths(prev =>
      prev.includes(monthIndex)
        ? prev.filter(m => m !== monthIndex)
        : [...prev, monthIndex].sort((a, b) => a - b)
    )
  }

  // Select current month
  const selectCurrentMonth = () => {
    const currentMonth = new Date().getMonth()
    if (!selectedMonths.includes(currentMonth)) {
      setSelectedMonths([currentMonth])
    }
  }

  // Calculate how many new fees will be generated (for monthly model)
  const calculateNewFees = () => {
    let totalNewFees = 0
    let totalAmount = 0

    for (const student of eligibleStudents) {
      for (const monthIndex of selectedMonths) {
        const feeMonth = `${selectedYear}-${String(monthIndex + 1).padStart(2, '0')}-01`
        const key = `${student.id}-${feeMonth}`
        if (!existingFeeMonths.has(key)) {
          totalNewFees++
          totalAmount += student.monthly_fee
        }
      }
    }

    return { totalNewFees, totalAmount }
  }

  const { totalNewFees, totalAmount } = calculateNewFees()

  // Generate fees based on fee model
  async function handleGenerate() {
    if (!user?.institution_id) return

    const feeModel = centerSettings?.fee_model || 'monthly_per_course'

    // Validation based on fee model
    if (feeModel === 'monthly_per_course' && selectedMonths.length === 0) {
      toast.error('Please select at least one month')
      return
    }

    if (feeModel === 'per_semester' && !selectedSemester) {
      toast.error('Please select a semester')
      return
    }

    setIsGenerating(true)

    try {
      let result

      if (feeModel === 'monthly_per_course') {
        // Use existing direct approach for monthly (more efficient for bulk)
        const supabase = createClient()
        const feeRecords: Array<{
          institution_id: string
          student_id: string
          fee_month: string
          fee_type: string
          amount_due: number
          amount_paid: number
          status: string
          due_date: string
          source_type: string
        }> = []

        for (const student of eligibleStudents) {
          for (const monthIndex of selectedMonths) {
            const feeMonth = `${selectedYear}-${String(monthIndex + 1).padStart(2, '0')}-01`
            const key = `${student.id}-${feeMonth}`

            if (existingFeeMonths.has(key)) continue

            const dueDate = new Date(selectedYear, monthIndex, 7)

            feeRecords.push({
              institution_id: user.institution_id,
              student_id: student.id,
              fee_month: feeMonth,
              fee_type: 'tuition',
              amount_due: student.monthly_fee,
              amount_paid: 0,
              status: 'unpaid',
              due_date: dueDate.toISOString().split('T')[0],
              source_type: 'monthly',
            })
          }
        }

        if (feeRecords.length === 0) {
          toast.success('All fees already exist for selected months')
          setGenerationResult({
            success: true,
            studentsProcessed: eligibleStudents.length,
            feesGenerated: 0,
          })
          return
        }

        // Insert in batches
        const batchSize = 100
        let totalInserted = 0

        for (let i = 0; i < feeRecords.length; i += batchSize) {
          const batch = feeRecords.slice(i, i + batchSize)
          const { error } = await supabase
            .from('student_fees')
            .insert(batch as never)

          if (error) throw error
          totalInserted += batch.length
        }

        result = {
          success: true,
          studentsProcessed: eligibleStudents.length,
          totalFeesGenerated: totalInserted,
          errors: [],
        }
      } else {
        // Use the unified fee generator for lump sum and semester models
        const startMonth = selectedMonths.length > 0
          ? `${selectedYear}-${String(Math.min(...selectedMonths) + 1).padStart(2, '0')}-01`
          : undefined
        const endMonth = selectedMonths.length > 0
          ? `${selectedYear}-${String(Math.max(...selectedMonths) + 1).padStart(2, '0')}-01`
          : undefined

        result = await generateFeesForInstitution(
          user.institution_id,
          feeModel,
          {
            startMonth,
            endMonth,
            semesterId: selectedSemester || undefined,
          }
        )
      }

      setGenerationResult({
        success: result.success,
        studentsProcessed: result.studentsProcessed,
        feesGenerated: result.totalFeesGenerated,
      })

      if (result.totalFeesGenerated > 0) {
        toast.success(`Generated ${result.totalFeesGenerated} fee records`)
        onSuccess()
      } else if (result.success) {
        toast.success('No new fees to generate')
      } else {
        toast.error('Some fees failed to generate')
      }
    } catch (error) {
      console.error('Error generating fees:', error)
      toast.error('Failed to generate fees')
      setGenerationResult({
        success: false,
        studentsProcessed: 0,
        feesGenerated: 0,
      })
    } finally {
      setIsGenerating(false)
    }
  }

  if (!isOpen) return null

  const feeModel = centerSettings?.fee_model || 'monthly_per_course'
  const paymentMonths = centerSettings?.payment_months || [1, 2, 3, 4, 5, 6, 7, 8, 9]
  const selectedSemesterData = semesters.find(s => s.id === selectedSemester)

  // Calculate totals based on fee model
  const getModelSpecificTotals = () => {
    switch (feeModel) {
      case 'monthly_per_course':
        return {
          label: 'Monthly Fees',
          total: totalAmount,
          count: totalNewFees,
        }
      case 'per_course_lumpsum':
        return {
          label: 'Course Installments',
          total: eligibleStudents.reduce((sum, s) => sum + s.total_course_fee, 0),
          count: eligibleStudents.length,
        }
      case 'per_semester':
        return {
          label: 'Semester Fees',
          total: selectedSemesterData ? selectedSemesterData.fee_amount * eligibleStudents.length : 0,
          count: eligibleStudents.length,
        }
      default:
        return { label: 'Fees', total: 0, count: 0 }
    }
  }

  const modelTotals = getModelSpecificTotals()

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {feeModel === 'monthly_per_course' && 'Generate Monthly Fees'}
              {feeModel === 'per_course_lumpsum' && 'Generate Course Installments'}
              {feeModel === 'per_semester' && 'Generate Semester Fees'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Create fee records for all active students
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : generationResult ? (
            // Show result
            <div className="text-center py-8">
              {generationResult.success ? (
                <>
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Fees Generated Successfully
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Created {generationResult.feesGenerated} fee records for{' '}
                    {generationResult.studentsProcessed} students
                  </p>
                  <Button onClick={onClose}>
                    Close
                  </Button>
                </>
              ) : (
                <>
                  <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Generation Failed
                  </h3>
                  <p className="text-gray-600 mb-4">
                    An error occurred while generating fees. Please try again.
                  </p>
                  <Button onClick={() => setGenerationResult(null)}>
                    Try Again
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Info banner */}
              <div className="bg-blue-50 rounded-lg p-4 flex gap-3">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium">Only active students will receive fees</p>
                  <p className="mt-1">
                    Students with status &quot;inactive&quot;, &quot;withdrawn&quot;, or &quot;graduated&quot; will be skipped.
                  </p>
                </div>
              </div>

              {/* Fee Model Badge */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Fee Model:</span>
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                  feeModel === 'monthly_per_course' ? 'bg-blue-100 text-blue-700' :
                  feeModel === 'per_course_lumpsum' ? 'bg-purple-100 text-purple-700' :
                  'bg-emerald-100 text-emerald-700'
                }`}>
                  <DollarSign className="w-3 h-3" />
                  {feeModel === 'monthly_per_course' && 'Monthly per Course'}
                  {feeModel === 'per_course_lumpsum' && 'Per Course (Lump Sum)'}
                  {feeModel === 'per_semester' && 'Per Semester'}
                </span>
              </div>

              {/* Monthly Model - Year and Month Selection */}
              {feeModel === 'monthly_per_course' && (
                <>
                  {/* Year selector */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Year
                    </label>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none"
                    >
                      {[selectedYear - 1, selectedYear, selectedYear + 1].map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>

                  {/* Month selection */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Select Months to Generate
                      </label>
                      <button
                        type="button"
                        onClick={selectCurrentMonth}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Select Current Month
                      </button>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {MONTH_NAMES.map((month, index) => {
                        const isPaymentMonth = paymentMonths.includes(index)
                        const isSelected = selectedMonths.includes(index)

                        return (
                          <label
                            key={month}
                            className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                              isSelected
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : isPaymentMonth
                                ? 'border-gray-200 hover:bg-gray-50'
                                : 'border-gray-100 bg-gray-50 text-gray-400'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleMonth(index)}
                              disabled={!isPaymentMonth}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm font-medium">{month.slice(0, 3)}</span>
                          </label>
                        )
                      })}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      * Greyed out months are not configured as payment months
                    </p>
                  </div>
                </>
              )}

              {/* Lump Sum Model - Info */}
              {feeModel === 'per_course_lumpsum' && (
                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                  <h4 className="font-medium text-purple-800 mb-2 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Course Installment Generation
                  </h4>
                  <p className="text-sm text-purple-700">
                    This will generate the next pending installment for each course that each student
                    is enrolled in. Only installments that haven&apos;t been created yet will be generated.
                  </p>
                </div>
              )}

              {/* Semester Model - Semester Selection */}
              {feeModel === 'per_semester' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Semester
                  </label>
                  {semesters.length > 0 ? (
                    <div className="space-y-2">
                      {semesters.map((semester) => (
                        <label
                          key={semester.id}
                          className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                            selectedSemester === semester.id
                              ? 'border-emerald-500 bg-emerald-50'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name="semester"
                            checked={selectedSemester === semester.id}
                            onChange={() => setSelectedSemester(semester.id)}
                            className="w-5 h-5 text-emerald-600 border-gray-300 focus:ring-emerald-500"
                          />
                          <div className="ml-3 flex-1">
                            <p className="font-medium text-gray-900">{semester.name}</p>
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(semester.start_date).toLocaleDateString()} - {new Date(semester.end_date).toLocaleDateString()}
                            </p>
                          </div>
                          <p className="font-semibold text-gray-900">
                            {formatCurrency(semester.fee_amount)}
                          </p>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-amber-50 rounded-lg p-4 flex gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                      <div className="text-sm text-amber-800">
                        <p className="font-medium">No active semesters found</p>
                        <p className="mt-1">
                          Please create a semester in Settings before generating fees.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Preview - shows for all models */}
              {eligibleStudents.length > 0 && (
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <h4 className="font-medium text-green-800 mb-3">Generation Preview</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-green-700">Active Students</p>
                      <p className="text-xl font-bold text-green-800">{eligibleStudents.length}</p>
                    </div>
                    {feeModel === 'monthly_per_course' && (
                      <div>
                        <p className="text-green-700">Months Selected</p>
                        <p className="text-xl font-bold text-green-800">{selectedMonths.length}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-green-700">{modelTotals.label}</p>
                      <p className="text-xl font-bold text-green-800">{modelTotals.count}</p>
                    </div>
                    <div>
                      <p className="text-green-700">Estimated Total</p>
                      <p className="text-xl font-bold text-green-800">{formatCurrency(modelTotals.total)}</p>
                    </div>
                  </div>
                  {feeModel === 'monthly_per_course' && totalNewFees === 0 && selectedMonths.length > 0 && (
                    <p className="text-sm text-amber-700 mt-3 bg-amber-50 p-2 rounded">
                      All fees already exist for the selected months. Nothing to generate.
                    </p>
                  )}
                </div>
              )}

              {/* Student count warning */}
              {eligibleStudents.length === 0 && (
                <div className="bg-amber-50 rounded-lg p-4 flex gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium">No eligible students found</p>
                    <p className="mt-1">
                      There are no active students with enrolled subjects.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!generationResult && !isLoading && (
          <div className="p-6 border-t border-gray-100 flex gap-3 justify-end">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={
                isGenerating ||
                eligibleStudents.length === 0 ||
                (feeModel === 'monthly_per_course' && (selectedMonths.length === 0 || totalNewFees === 0)) ||
                (feeModel === 'per_semester' && !selectedSemester)
              }
              leftIcon={
                isGenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CalendarPlus className="w-4 h-4" />
                )
              }
            >
              {isGenerating ? 'Generating...' : 'Generate Fees'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
