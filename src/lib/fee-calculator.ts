/**
 * Fee Calculator Utility
 * Handles fee calculations for different fee models:
 * - monthly_per_course: Monthly fee per course × payment months
 * - per_course_lumpsum: Total course fee with optional installments
 * - per_semester: Fixed semester fee regardless of courses
 */

import { FeeModelType } from '@/types/database'

interface Course {
  id: string
  name: string
  monthly_fee: number
  total_course_fee: number
  allow_installments?: boolean
  default_installments?: number
}

interface Semester {
  id: string
  name: string
  fee_amount: number
}

interface InstallmentSchedule {
  installment_number: number
  amount: number
  percentage: number
  due_date: string
}

interface CourseBreakdown {
  course_id: string
  course_name: string
  fee: number
  installments?: InstallmentSchedule[]
}

interface FeeCalculationResult {
  total: number
  registration_fee: number
  tuition_fee: number
  breakdown: CourseBreakdown[]
  fee_model: FeeModelType
  // For monthly model
  monthly_total?: number
  payment_months?: number
  // For semester model
  semester?: {
    id: string
    name: string
    fee: number
  }
  // For lump sum model
  installment_schedules?: {
    course_id: string
    course_name: string
    total_fee: number
    installments: InstallmentSchedule[]
  }[]
}

interface CalculateFeesOptions {
  feeModel: FeeModelType
  courses: Course[]
  registrationFee: number
  // For monthly model
  paymentMonths?: number[]
  // For semester model
  semester?: Semester
  // For lump sum model - override default installments
  installmentOverrides?: Record<string, number>
}

/**
 * Calculate enrollment fees based on the institution's fee model
 */
export function calculateEnrollmentFees(options: CalculateFeesOptions): FeeCalculationResult {
  const { feeModel, courses, registrationFee } = options

  switch (feeModel) {
    case 'monthly_per_course':
      return calculateMonthlyFees(options)
    case 'per_course_lumpsum':
      return calculateLumpSumFees(options)
    case 'per_semester':
      return calculateSemesterFees(options)
    default:
      return calculateMonthlyFees(options)
  }
}

/**
 * Calculate fees for monthly per course model
 */
function calculateMonthlyFees(options: CalculateFeesOptions): FeeCalculationResult {
  const { courses, registrationFee, paymentMonths = [] } = options
  const numMonths = paymentMonths.length

  const breakdown: CourseBreakdown[] = courses.map(course => ({
    course_id: course.id,
    course_name: course.name,
    fee: course.monthly_fee * numMonths,
  }))

  const monthlyTotal = courses.reduce((sum, c) => sum + c.monthly_fee, 0)
  const tuitionFee = monthlyTotal * numMonths

  return {
    total: registrationFee + tuitionFee,
    registration_fee: registrationFee,
    tuition_fee: tuitionFee,
    breakdown,
    fee_model: 'monthly_per_course',
    monthly_total: monthlyTotal,
    payment_months: numMonths,
  }
}

/**
 * Calculate fees for per course lump sum model
 */
function calculateLumpSumFees(options: CalculateFeesOptions): FeeCalculationResult {
  const { courses, registrationFee, installmentOverrides = {} } = options

  const installmentSchedules: FeeCalculationResult['installment_schedules'] = []
  const breakdown: CourseBreakdown[] = []

  courses.forEach(course => {
    const totalFee = course.total_course_fee || 0
    const numInstallments = installmentOverrides[course.id] || course.default_installments || 1

    // Generate installment schedule
    const installments = generateInstallmentSchedule(totalFee, numInstallments)

    breakdown.push({
      course_id: course.id,
      course_name: course.name,
      fee: totalFee,
      installments,
    })

    installmentSchedules.push({
      course_id: course.id,
      course_name: course.name,
      total_fee: totalFee,
      installments,
    })
  })

  const tuitionFee = courses.reduce((sum, c) => sum + (c.total_course_fee || 0), 0)

  return {
    total: registrationFee + tuitionFee,
    registration_fee: registrationFee,
    tuition_fee: tuitionFee,
    breakdown,
    fee_model: 'per_course_lumpsum',
    installment_schedules: installmentSchedules,
  }
}

/**
 * Calculate fees for per semester model
 */
function calculateSemesterFees(options: CalculateFeesOptions): FeeCalculationResult {
  const { courses, registrationFee, semester } = options

  const semesterFee = semester?.fee_amount || 0

  // For semester model, courses don't have individual fees
  const breakdown: CourseBreakdown[] = courses.map(course => ({
    course_id: course.id,
    course_name: course.name,
    fee: 0, // Individual course fees are N/A for semester model
  }))

  return {
    total: registrationFee + semesterFee,
    registration_fee: registrationFee,
    tuition_fee: semesterFee,
    breakdown,
    fee_model: 'per_semester',
    semester: semester ? {
      id: semester.id,
      name: semester.name,
      fee: semesterFee,
    } : undefined,
  }
}

/**
 * Generate an installment schedule for a given total fee
 */
function generateInstallmentSchedule(
  totalFee: number,
  numInstallments: number,
  startDate?: Date
): InstallmentSchedule[] {
  if (numInstallments <= 0) numInstallments = 1

  const installments: InstallmentSchedule[] = []
  const baseAmount = Math.floor((totalFee / numInstallments) * 100) / 100 // Round to 2 decimal places
  let remaining = totalFee
  const start = startDate || new Date()

  for (let i = 1; i <= numInstallments; i++) {
    // Last installment gets the remaining amount to handle rounding
    const amount = i === numInstallments ? remaining : baseAmount
    remaining -= amount

    // Calculate due date (monthly intervals)
    const dueDate = new Date(start)
    dueDate.setMonth(dueDate.getMonth() + (i - 1))

    installments.push({
      installment_number: i,
      amount,
      percentage: (amount / totalFee) * 100,
      due_date: dueDate.toISOString().split('T')[0],
    })
  }

  return installments
}

/**
 * Get installment options for display
 */
export function getInstallmentOptions(totalFee: number): { value: number; label: string; perInstallment: number }[] {
  return [
    { value: 1, label: 'Full Payment', perInstallment: totalFee },
    { value: 2, label: '2 Installments', perInstallment: totalFee / 2 },
    { value: 3, label: '3 Installments', perInstallment: totalFee / 3 },
    { value: 4, label: '4 Installments', perInstallment: totalFee / 4 },
    { value: 6, label: '6 Installments', perInstallment: totalFee / 6 },
    { value: 12, label: 'Monthly (12)', perInstallment: totalFee / 12 },
  ]
}

/**
 * Format fee breakdown for display
 */
export function formatFeeBreakdown(result: FeeCalculationResult): string[] {
  const lines: string[] = []

  if (result.registration_fee > 0) {
    lines.push(`Registration Fee: N$${result.registration_fee.toLocaleString()}`)
  }

  if (result.fee_model === 'monthly_per_course') {
    lines.push(`Monthly Tuition: N$${result.monthly_total?.toLocaleString()}/month`)
    lines.push(`Payment Months: ${result.payment_months}`)
    lines.push(`Total Tuition: N$${result.tuition_fee.toLocaleString()}`)
  } else if (result.fee_model === 'per_course_lumpsum') {
    result.breakdown.forEach(item => {
      lines.push(`${item.course_name}: N$${item.fee.toLocaleString()}`)
    })
  } else if (result.fee_model === 'per_semester') {
    if (result.semester) {
      lines.push(`${result.semester.name}: N$${result.semester.fee.toLocaleString()}`)
    }
  }

  lines.push(`Total: N$${result.total.toLocaleString()}`)

  return lines
}
