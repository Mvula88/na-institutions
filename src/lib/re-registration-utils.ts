import { createClient } from '@/lib/supabase/client'
import {
  ProgramEnrollment,
  ProgramYearRegistration,
  AcademicYear,
  Student,
  ProgramCourse,
  Course,
} from '@/types/database'

export interface StudentWithEnrollment extends Student {
  program_enrollments?: (ProgramEnrollment & {
    program?: { id: string; name: string; duration_years: number | null }
    year_registrations?: ProgramYearRegistration[]
  })[]
}

export interface ReregistrationEligibility {
  eligible: boolean
  reason?: string
  currentYear: number
  nextYear: number
  programEnrollment?: ProgramEnrollment
  lastYearRegistration?: ProgramYearRegistration
  outstandingFees?: number
  completedAllCourses?: boolean
}

/**
 * Search for students eligible for re-registration
 */
export async function searchStudentsForReregistration(
  institutionId: string,
  searchTerm: string
): Promise<StudentWithEnrollment[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('students')
    .select(`
      *,
      program_enrollments (
        *,
        program:programs (id, name, duration_years),
        year_registrations:program_year_registrations (*)
      )
    `)
    .eq('institution_id', institutionId)
    .eq('status', 'active')
    .or(`student_number.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%`)
    .limit(20)

  if (error) {
    console.error('Error searching students:', error)
    return []
  }

  // Filter to only students with active program enrollments
  return (data || []).filter(
    (student: any) => student.program_enrollments && student.program_enrollments.length > 0
  ) as StudentWithEnrollment[]
}

/**
 * Get student details for re-registration
 */
export async function getStudentForReregistration(
  studentId: string
): Promise<StudentWithEnrollment | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('students')
    .select(`
      *,
      program_enrollments (
        *,
        program:programs (id, name, duration_years),
        year_registrations:program_year_registrations (*)
      )
    `)
    .eq('id', studentId)
    .single()

  if (error) {
    console.error('Error fetching student:', error)
    return null
  }

  return data as StudentWithEnrollment
}

/**
 * Check if a student is eligible for re-registration
 */
export async function checkReregistrationEligibility(
  studentId: string,
  programEnrollmentId: string
): Promise<ReregistrationEligibility> {
  const supabase = createClient()

  // Get program enrollment with year registrations
  const { data: enrollment, error: enrollmentError } = await supabase
    .from('program_enrollments')
    .select(`
      *,
      program:programs (id, name, duration_years),
      year_registrations:program_year_registrations (*)
    `)
    .eq('id', programEnrollmentId)
    .single()

  if (enrollmentError || !enrollment) {
    return {
      eligible: false,
      reason: 'Program enrollment not found',
      currentYear: 0,
      nextYear: 0,
    }
  }

  const typedEnrollment = enrollment as ProgramEnrollment & {
    program?: { id: string; name: string; duration_years: number | null }
    year_registrations?: ProgramYearRegistration[]
  }

  // Check if enrollment is active
  if (typedEnrollment.status !== 'enrolled') {
    return {
      eligible: false,
      reason: `Student is ${typedEnrollment.status} from the program`,
      currentYear: typedEnrollment.current_year,
      nextYear: typedEnrollment.current_year + 1,
      programEnrollment: typedEnrollment,
    }
  }

  // Get the latest year registration
  const yearRegistrations = typedEnrollment.year_registrations || []
  const sortedRegistrations = [...yearRegistrations].sort(
    (a, b) => b.year_of_study - a.year_of_study
  )
  const lastYearReg = sortedRegistrations[0]

  const currentYear = typedEnrollment.current_year
  const nextYear = currentYear + 1
  const maxYears = typedEnrollment.program?.duration_years || 4

  // Check if already at max year
  if (nextYear > maxYears) {
    return {
      eligible: false,
      reason: `Student has completed the maximum ${maxYears} years of the program`,
      currentYear,
      nextYear,
      programEnrollment: typedEnrollment,
      lastYearRegistration: lastYearReg,
    }
  }

  // Check if last year was passed
  if (lastYearReg && lastYearReg.year_status !== 'passed') {
    return {
      eligible: false,
      reason: `Year ${currentYear} status is "${lastYearReg.year_status}". Must pass current year before re-registering.`,
      currentYear,
      nextYear,
      programEnrollment: typedEnrollment,
      lastYearRegistration: lastYearReg,
    }
  }

  // Check for outstanding fees
  const { data: outstandingFees } = await supabase
    .from('student_fees')
    .select('amount_due, amount_paid')
    .eq('student_id', studentId)
    .eq('status', 'unpaid')

  const fees = (outstandingFees || []) as Array<{ amount_due: number; amount_paid: number }>
  const totalOutstanding = fees.reduce(
    (sum, fee) => sum + (fee.amount_due - fee.amount_paid),
    0
  )

  if (totalOutstanding > 0) {
    return {
      eligible: false,
      reason: `Outstanding fees of ${totalOutstanding.toFixed(2)} must be cleared before re-registration`,
      currentYear,
      nextYear,
      programEnrollment: typedEnrollment,
      lastYearRegistration: lastYearReg,
      outstandingFees: totalOutstanding,
    }
  }

  return {
    eligible: true,
    currentYear,
    nextYear,
    programEnrollment: typedEnrollment,
    lastYearRegistration: lastYearReg,
    outstandingFees: 0,
  }
}

/**
 * Get courses for the next year of study
 */
export async function getNextYearCourses(
  programId: string,
  yearOfStudy: number
): Promise<(ProgramCourse & { course?: Course })[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('program_courses')
    .select(`
      *,
      course:courses (*)
    `)
    .eq('program_id', programId)
    .eq('year_of_study', yearOfStudy)
    .order('semester')

  if (error) {
    console.error('Error fetching next year courses:', error)
    return []
  }

  return data as (ProgramCourse & { course?: Course })[]
}

/**
 * Process re-registration for a student
 */
export async function processReregistration(params: {
  institutionId: string
  studentId: string
  programEnrollmentId: string
  academicYearId: string
  yearOfStudy: number
  selectedCourseIds: string[]
  registrationFee?: number
}): Promise<{ success: boolean; error?: string; yearRegistrationId?: string }> {
  const {
    institutionId,
    studentId,
    programEnrollmentId,
    academicYearId,
    yearOfStudy,
    selectedCourseIds,
    registrationFee,
  } = params

  const supabase = createClient()

  try {
    // 1. Create program year registration
    const { data: yearReg, error: yearRegError } = await supabase
      .from('program_year_registrations')
      .insert({
        institution_id: institutionId,
        program_enrollment_id: programEnrollmentId,
        academic_year_id: academicYearId,
        student_id: studentId,
        year_of_study: yearOfStudy,
        registration_status: 'registered',
        year_status: 'in_progress',
      } as never)
      .select('id')
      .single()

    if (yearRegError) throw yearRegError

    const yearRegistrationId = (yearReg as { id: string }).id

    // 2. Update program enrollment current year
    const { error: updateEnrollmentError } = await supabase
      .from('program_enrollments')
      .update({
        current_year: yearOfStudy,
        updated_at: new Date().toISOString(),
      } as never)
      .eq('id', programEnrollmentId)

    if (updateEnrollmentError) throw updateEnrollmentError

    // 3. Update student current year
    const { error: updateStudentError } = await supabase
      .from('students')
      .update({
        current_year_of_study: yearOfStudy,
        updated_at: new Date().toISOString(),
      } as never)
      .eq('id', studentId)

    if (updateStudentError) throw updateStudentError

    // 4. Create course enrollments
    if (selectedCourseIds.length > 0) {
      const enrollments = selectedCourseIds.map(courseId => ({
        student_id: studentId,
        course_id: courseId,
        academic_year_id: academicYearId,
        year_of_study: yearOfStudy,
        program_year_registration_id: yearRegistrationId,
      }))

      const { error: enrollError } = await supabase
        .from('student_enrollments')
        .insert(enrollments as never)

      if (enrollError) throw enrollError
    }

    // 5. Create registration fee if applicable
    if (registrationFee && registrationFee > 0) {
      const today = new Date()
      const { error: feeError } = await supabase
        .from('student_fees')
        .insert({
          institution_id: institutionId,
          student_id: studentId,
          fee_type: 'registration',
          fee_month: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`,
          amount_due: registrationFee,
          amount_paid: 0,
          due_date: today.toISOString().split('T')[0],
          status: 'unpaid',
          source_type: 'registration',
        } as never)

      if (feeError) {
        console.error('Error creating registration fee:', feeError)
      }
    }

    return { success: true, yearRegistrationId }
  } catch (error) {
    console.error('Error processing re-registration:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process re-registration',
    }
  }
}

/**
 * Check if student is already registered for an academic year
 */
export async function isAlreadyRegisteredForYear(
  programEnrollmentId: string,
  academicYearId: string
): Promise<boolean> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('program_year_registrations')
    .select('id')
    .eq('program_enrollment_id', programEnrollmentId)
    .eq('academic_year_id', academicYearId)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Error checking registration:', error)
  }

  return !!data
}
