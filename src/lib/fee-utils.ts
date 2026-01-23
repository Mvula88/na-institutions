import { createClient } from '@/lib/supabase/client'
import { roundCurrency, addCurrency, subtractCurrency } from '@/lib/currency'
import { FeeModelType } from '@/types/database'

interface StudentCourse {
  id: string
  course_id: string
  enrolled_date: string
  is_active: boolean
  course: {
    id: string
    name: string
    monthly_fee: number
  }
}

interface StudentFee {
  id: string
  fee_month: string
  fee_type: string
  amount_due: number
  amount_paid: number
  balance: number
  status: string
}

/**
 * Generate monthly fees for a student based on their enrolled courses
 * @param institutionId - The institution ID
 * @param studentId - The student ID
 * @param startMonth - Start month (YYYY-MM-DD format, first day of month)
 * @param endMonth - End month (YYYY-MM-DD format, first day of month)
 * @returns Object with success status and generated fees count
 */
export async function generateMonthlyFees(
  institutionId: string,
  studentId: string,
  startMonth: string,
  endMonth: string
): Promise<{ success: boolean; feesGenerated: number; error?: string }> {
  const supabase = createClient()

  try {
    // Get student's active course enrollments
    const { data: enrollments, error: enrollError } = await supabase
      .from('student_courses')
      .select(`
        id,
        course_id,
        enrolled_date,
        is_active,
        course:courses(id, name, monthly_fee)
      `)
      .eq('student_id', studentId)
      .eq('is_active', true)

    if (enrollError) throw enrollError

    if (!enrollments || enrollments.length === 0) {
      return { success: true, feesGenerated: 0 }
    }

    // Generate months between start and end
    const months: string[] = []
    const start = new Date(startMonth)
    const end = new Date(endMonth)

    while (start <= end) {
      months.push(start.toISOString().split('T')[0])
      start.setMonth(start.getMonth() + 1)
    }

    // Get existing fees to avoid duplicates
    const { data: existingFees } = await supabase
      .from('student_fees')
      .select('fee_month, fee_type')
      .eq('student_id', studentId)
      .in('fee_month', months)

    interface ExistingFee { fee_month: string; fee_type: string }
    const typedExistingFees = (existingFees || []) as ExistingFee[]
    const existingFeeKeys = new Set(
      typedExistingFees.map(f => `${f.fee_month}-${f.fee_type}`)
    )

    // Calculate total monthly tuition from all courses with proper precision
    const typedEnrollments = enrollments as unknown as StudentCourse[]
    const monthlyTuition = roundCurrency(
      typedEnrollments.reduce(
        (sum, e) => sum + (e.course?.monthly_fee || 0),
        0
      )
    )

    // Prepare fee records
    const feeRecords: Array<{
      institution_id: string
      student_id: string
      fee_month: string
      fee_type: string
      amount_due: number
      amount_paid: number
      status: string
      due_date: string
    }> = []

    for (const month of months) {
      const feeKey = `${month}-tuition`
      if (!existingFeeKeys.has(feeKey) && monthlyTuition > 0) {
        // Due date is 7th of the month
        const dueDate = new Date(month)
        dueDate.setDate(7)

        feeRecords.push({
          institution_id: institutionId,
          student_id: studentId,
          fee_month: month,
          fee_type: 'tuition',
          amount_due: monthlyTuition,
          amount_paid: 0,
          status: 'unpaid',
          due_date: dueDate.toISOString().split('T')[0],
        })
      }
    }

    if (feeRecords.length === 0) {
      return { success: true, feesGenerated: 0 }
    }

    // Insert fee records
    const { error: insertError } = await supabase
      .from('student_fees')
      .insert(feeRecords as never)

    if (insertError) throw insertError

    return { success: true, feesGenerated: feeRecords.length }
  } catch (error) {
    console.error('Error generating fees:', error)
    return {
      success: false,
      feesGenerated: 0,
      error: error instanceof Error ? error.message : 'Failed to generate fees',
    }
  }
}

/**
 * Allocate a payment across outstanding fees (oldest first - FIFO)
 * Also uses any existing credit balance and saves remaining credit back to student
 * @param institutionId - The institution ID
 * @param studentId - The student ID
 * @param paymentAmount - The total payment amount
 * @param paymentId - The payment record ID (for linking)
 * @returns Object with allocation details
 */
export async function allocatePayment(
  institutionId: string,
  studentId: string,
  paymentAmount: number,
  paymentId: string
): Promise<{
  success: boolean
  allocations: Array<{ feeId: string; month: string; amountAllocated: number }>
  remainingCredit: number
  previousCredit: number
  error?: string
}> {
  const supabase = createClient()

  try {
    // First, get the student's existing credit balance
    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .select('credit_balance')
      .eq('id', studentId)
      .single()

    if (studentError) throw studentError

    const existingCredit = (studentData as { credit_balance: number | null })?.credit_balance || 0

    // Get all unpaid/partial fees for the student, ordered by month (oldest first)
    const { data: outstandingFees, error: fetchError } = await supabase
      .from('student_fees')
      .select('*')
      .eq('student_id', studentId)
      .neq('status', 'paid')
      .order('fee_month', { ascending: true })

    if (fetchError) throw fetchError

    // Total available = new payment + existing credit
    let remainingPayment = paymentAmount + existingCredit
    const allocations: Array<{ feeId: string; month: string; amountAllocated: number }> = []

    // Allocate payment to each fee until payment is exhausted
    for (const fee of (outstandingFees || []) as StudentFee[]) {
      if (remainingPayment <= 0) break

      const balance = subtractCurrency(fee.amount_due, fee.amount_paid)
      const allocationAmount = roundCurrency(Math.min(remainingPayment, balance))

      if (allocationAmount > 0) {
        const newAmountPaid = addCurrency(fee.amount_paid, allocationAmount)
        const newStatus =
          newAmountPaid >= fee.amount_due
            ? 'paid'
            : newAmountPaid > 0
            ? 'partial'
            : 'unpaid'

        // Update the fee record
        const { error: updateError } = await supabase
          .from('student_fees')
          .update({
            amount_paid: newAmountPaid,
            status: newStatus,
          } as never)
          .eq('id', fee.id)

        if (updateError) throw updateError

        // If this is a registration fee and it's now fully paid, update the student record
        if (fee.fee_type === 'registration' && newStatus === 'paid') {
          await supabase
            .from('students')
            .update({
              registration_fee_paid: true,
              registration_fee_paid_date: new Date().toISOString(),
            } as never)
            .eq('id', studentId)
        }

        allocations.push({
          feeId: fee.id,
          month: fee.fee_month,
          amountAllocated: allocationAmount,
        })

        remainingPayment = subtractCurrency(remainingPayment, allocationAmount)
      }
    }

    // Save any remaining credit back to the student record (rounded for precision)
    const finalCredit = roundCurrency(remainingPayment)
    const { error: creditUpdateError } = await supabase
      .from('students')
      .update({
        credit_balance: finalCredit,
      } as never)
      .eq('id', studentId)

    if (creditUpdateError) {
      console.error('Error updating credit balance:', creditUpdateError)
      // Don't throw - payment was successful, just log the credit update failure
    }

    return {
      success: true,
      allocations,
      remainingCredit: finalCredit,
      previousCredit: existingCredit,
    }
  } catch (error) {
    console.error('Error allocating payment:', error)
    return {
      success: false,
      allocations: [],
      remainingCredit: paymentAmount,
      previousCredit: 0,
      error: error instanceof Error ? error.message : 'Failed to allocate payment',
    }
  }
}

/**
 * Get student fee summary
 * @param studentId - The student ID
 * @returns Fee summary with totals
 */
export async function getStudentFeeSummary(studentId: string): Promise<{
  totalDue: number
  totalPaid: number
  outstandingBalance: number
  fees: StudentFee[]
}> {
  const supabase = createClient()

  const { data: fees } = await supabase
    .from('student_fees')
    .select('*')
    .eq('student_id', studentId)
    .order('fee_month', { ascending: true })

  const typedFees = (fees || []) as StudentFee[]

  const totalDue = typedFees.reduce((sum, f) => sum + f.amount_due, 0)
  const totalPaid = typedFees.reduce((sum, f) => sum + f.amount_paid, 0)

  return {
    totalDue,
    totalPaid,
    outstandingBalance: totalDue - totalPaid,
    fees: typedFees,
  }
}

/**
 * Generate fees for all active students in an institution for a given period
 * @param institutionId - The institution ID
 * @param startMonth - Start month (YYYY-MM-DD format)
 * @param endMonth - End month (YYYY-MM-DD format)
 * @returns Summary of generation
 */
export async function generateFeesForAllStudents(
  institutionId: string,
  startMonth: string,
  endMonth: string
): Promise<{
  success: boolean
  studentsProcessed: number
  totalFeesGenerated: number
  errors: string[]
}> {
  const supabase = createClient()

  try {
    // Get all active students in the institution
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id')
      .eq('institution_id', institutionId)
      .eq('status', 'active')

    if (studentsError) throw studentsError

    let totalFeesGenerated = 0
    const errors: string[] = []

    interface StudentRow { id: string }
    const typedStudents = (students || []) as StudentRow[]
    for (const student of typedStudents) {
      const result = await generateMonthlyFees(
        institutionId,
        student.id,
        startMonth,
        endMonth
      )

      if (result.success) {
        totalFeesGenerated += result.feesGenerated
      } else {
        errors.push(`Student ${student.id}: ${result.error}`)
      }
    }

    return {
      success: errors.length === 0,
      studentsProcessed: students?.length || 0,
      totalFeesGenerated,
      errors,
    }
  } catch (error) {
    console.error('Error generating fees for all students:', error)
    return {
      success: false,
      studentsProcessed: 0,
      totalFeesGenerated: 0,
      errors: [error instanceof Error ? error.message : 'Failed to generate fees'],
    }
  }
}

/**
 * Generate next installment fees for a student (per_course_lumpsum model)
 * Creates the next unpaid installment for each course the student is enrolled in
 * @param institutionId - The institution ID
 * @param studentId - The student ID
 * @returns Object with success status and generated fees count
 */
export async function generateNextInstallmentFees(
  institutionId: string,
  studentId: string
): Promise<{ success: boolean; feesGenerated: number; error?: string }> {
  const supabase = createClient()

  try {
    // Get student's active course enrollments with course details
    const { data: enrollments, error: enrollError } = await supabase
      .from('student_enrollments')
      .select(`
        id,
        course_id,
        course:courses(id, name, total_course_fee, default_installments)
      `)
      .eq('student_id', studentId)

    if (enrollError) throw enrollError

    if (!enrollments || enrollments.length === 0) {
      return { success: true, feesGenerated: 0 }
    }

    interface EnrollmentData {
      id: string
      course_id: string
      course: { id: string; name: string; total_course_fee: number; default_installments: number } | null
    }
    const typedEnrollments = enrollments as EnrollmentData[]

    let feesGenerated = 0

    for (const enrollment of typedEnrollments) {
      const course = enrollment.course
      if (!course || !course.total_course_fee) continue

      // Get existing installment fees for this course
      const { data: existingFees } = await supabase
        .from('student_course_fees')
        .select('installment_number, status')
        .eq('student_id', studentId)
        .eq('course_id', course.id)
        .order('installment_number', { ascending: true })

      interface ExistingInstallment { installment_number: number; status: string }
      const typedExistingFees = (existingFees || []) as ExistingInstallment[]

      // Find the next installment number needed
      const maxExisting = typedExistingFees.length > 0
        ? Math.max(...typedExistingFees.map(f => f.installment_number))
        : 0

      const totalInstallments = course.default_installments || 1

      // If all installments are already created, skip
      if (maxExisting >= totalInstallments) continue

      // Calculate installment amount
      const installmentAmount = roundCurrency(course.total_course_fee / totalInstallments)
      const nextInstallmentNumber = maxExisting + 1

      // Calculate due date (monthly from now)
      const dueDate = new Date()
      dueDate.setMonth(dueDate.getMonth() + nextInstallmentNumber - 1)

      // Create the course fee record
      const { error: feeError } = await supabase
        .from('student_course_fees')
        .insert({
          institution_id: institutionId,
          student_id: studentId,
          enrollment_id: enrollment.id,
          course_id: course.id,
          total_course_fee: course.total_course_fee,
          installment_number: nextInstallmentNumber,
          installment_amount: installmentAmount,
          amount_paid: 0,
          due_date: dueDate.toISOString().split('T')[0],
          status: 'unpaid',
        } as never)

      if (feeError) {
        console.error('Error creating installment fee:', feeError)
        continue
      }

      // Also create a corresponding student_fees record for unified tracking
      const { error: unifiedFeeError } = await supabase
        .from('student_fees')
        .insert({
          institution_id: institutionId,
          student_id: studentId,
          fee_type: 'tuition',
          fee_month: dueDate.toISOString().split('T')[0].substring(0, 7) + '-01',
          amount_due: installmentAmount,
          amount_paid: 0,
          due_date: dueDate.toISOString().split('T')[0],
          status: 'unpaid',
          source_type: 'course_installment',
        } as never)

      if (unifiedFeeError) {
        console.error('Error creating unified fee record:', unifiedFeeError)
      }

      feesGenerated++
    }

    return { success: true, feesGenerated }
  } catch (error) {
    console.error('Error generating installment fees:', error)
    return {
      success: false,
      feesGenerated: 0,
      error: error instanceof Error ? error.message : 'Failed to generate installment fees',
    }
  }
}

/**
 * Generate semester fees for a student (per_semester model)
 * @param institutionId - The institution ID
 * @param studentId - The student ID
 * @param semesterId - The semester ID to generate fees for
 * @returns Object with success status
 */
export async function generateSemesterFee(
  institutionId: string,
  studentId: string,
  semesterId: string
): Promise<{ success: boolean; feeGenerated: boolean; error?: string }> {
  const supabase = createClient()

  try {
    // Get semester details
    const { data: semester, error: semesterError } = await supabase
      .from('semesters')
      .select('*')
      .eq('id', semesterId)
      .single()

    if (semesterError) throw semesterError
    if (!semester) {
      return { success: false, feeGenerated: false, error: 'Semester not found' }
    }

    const typedSemester = semester as { id: string; name: string; fee_amount: number; start_date: string; registration_deadline: string | null }

    // Check if fee already exists for this semester
    const { data: existingFee } = await supabase
      .from('student_semester_fees')
      .select('id')
      .eq('student_id', studentId)
      .eq('semester_id', semesterId)
      .single()

    if (existingFee) {
      return { success: true, feeGenerated: false } // Already exists
    }

    // Create semester fee record
    const dueDate = typedSemester.registration_deadline || typedSemester.start_date

    const { error: feeError } = await supabase
      .from('student_semester_fees')
      .insert({
        institution_id: institutionId,
        student_id: studentId,
        semester_id: semesterId,
        amount_due: typedSemester.fee_amount,
        amount_paid: 0,
        due_date: dueDate,
        status: 'unpaid',
      } as never)

    if (feeError) throw feeError

    // Also create a corresponding student_fees record for unified tracking
    const { error: unifiedFeeError } = await supabase
      .from('student_fees')
      .insert({
        institution_id: institutionId,
        student_id: studentId,
        fee_type: 'tuition',
        fee_month: typedSemester.start_date.substring(0, 7) + '-01',
        amount_due: typedSemester.fee_amount,
        amount_paid: 0,
        due_date: dueDate,
        status: 'unpaid',
        source_type: 'semester',
      } as never)

    if (unifiedFeeError) {
      console.error('Error creating unified fee record:', unifiedFeeError)
    }

    return { success: true, feeGenerated: true }
  } catch (error) {
    console.error('Error generating semester fee:', error)
    return {
      success: false,
      feeGenerated: false,
      error: error instanceof Error ? error.message : 'Failed to generate semester fee',
    }
  }
}

/**
 * Generate fees for all active students based on institution's fee model
 * @param institutionId - The institution ID
 * @param feeModel - The institution's fee model
 * @param options - Model-specific options
 * @returns Summary of generation
 */
export async function generateFeesForInstitution(
  institutionId: string,
  feeModel: FeeModelType,
  options: {
    // For monthly model
    startMonth?: string
    endMonth?: string
    // For semester model
    semesterId?: string
  }
): Promise<{
  success: boolean
  studentsProcessed: number
  totalFeesGenerated: number
  errors: string[]
}> {
  const supabase = createClient()

  try {
    // Get all active students in the institution
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id')
      .eq('institution_id', institutionId)
      .eq('status', 'active')

    if (studentsError) throw studentsError

    let totalFeesGenerated = 0
    const errors: string[] = []

    interface StudentRow { id: string }
    const typedStudents = (students || []) as StudentRow[]

    for (const student of typedStudents) {
      try {
        switch (feeModel) {
          case 'monthly_per_course': {
            if (!options.startMonth || !options.endMonth) {
              errors.push('Start and end months required for monthly model')
              continue
            }
            const result = await generateMonthlyFees(
              institutionId,
              student.id,
              options.startMonth,
              options.endMonth
            )
            if (result.success) {
              totalFeesGenerated += result.feesGenerated
            } else {
              errors.push(`Student ${student.id}: ${result.error}`)
            }
            break
          }

          case 'per_course_lumpsum': {
            const result = await generateNextInstallmentFees(institutionId, student.id)
            if (result.success) {
              totalFeesGenerated += result.feesGenerated
            } else {
              errors.push(`Student ${student.id}: ${result.error}`)
            }
            break
          }

          case 'per_semester': {
            if (!options.semesterId) {
              errors.push('Semester ID required for semester model')
              continue
            }
            const result = await generateSemesterFee(institutionId, student.id, options.semesterId)
            if (result.success && result.feeGenerated) {
              totalFeesGenerated += 1
            } else if (!result.success) {
              errors.push(`Student ${student.id}: ${result.error}`)
            }
            break
          }
        }
      } catch (err) {
        errors.push(`Student ${student.id}: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    }

    return {
      success: errors.length === 0,
      studentsProcessed: typedStudents.length,
      totalFeesGenerated,
      errors,
    }
  } catch (error) {
    console.error('Error generating fees for institution:', error)
    return {
      success: false,
      studentsProcessed: 0,
      totalFeesGenerated: 0,
      errors: [error instanceof Error ? error.message : 'Failed to generate fees'],
    }
  }
}
