import { createClient } from '@/lib/supabase/client'
import {
  Student,
  Program,
  ProgramEnrollment,
  ProgramYearRegistration,
  AcademicYear,
  Course,
  YearCompletionStatus,
  ProgramEnrollmentStatus,
} from '@/types/database'

export interface TranscriptCourse {
  id: string
  course_id: string
  course_name: string
  course_code: string | null
  credits: number | null
  semester: number
  grades: {
    id: string
    grade: string | null
    percentage: number | null
    assessment_type: string
    assessment_date: string
  }[]
  final_grade: string | null
  final_percentage: number | null
}

export interface TranscriptYear {
  year_of_study: number
  academic_year: AcademicYear | null
  year_registration: ProgramYearRegistration | null
  courses: TranscriptCourse[]
  year_average: number | null
  credits_earned: number
  year_status: YearCompletionStatus
}

export interface StudentTranscript {
  student: Student
  program: Program | null
  program_enrollment: ProgramEnrollment | null
  years: TranscriptYear[]
  cumulative_average: number | null
  total_credits_earned: number
  total_credits_required: number | null
  completion_status: ProgramEnrollmentStatus
  generated_at: string
}

/**
 * Generate a complete transcript for a student
 */
export async function generateTranscript(studentId: string): Promise<StudentTranscript | null> {
  const supabase = createClient()

  // 1. Fetch student data
  const { data: studentData, error: studentError } = await supabase
    .from('students')
    .select('*')
    .eq('id', studentId)
    .single()

  if (studentError || !studentData) {
    console.error('Error fetching student:', studentError)
    return null
  }

  const student = studentData as Student

  // 2. Fetch program enrollment
  const { data: enrollmentData } = await supabase
    .from('program_enrollments')
    .select(`
      *,
      program:programs (*),
      year_registrations:program_year_registrations (
        *,
        academic_year:academic_years (*)
      )
    `)
    .eq('student_id', studentId)
    .order('enrollment_date', { ascending: false })
    .limit(1)
    .single()

  const enrollment = enrollmentData as (ProgramEnrollment & {
    program?: Program
    year_registrations?: (ProgramYearRegistration & { academic_year?: AcademicYear })[]
  }) | null

  // 3. Fetch student enrollments (courses)
  const { data: courseEnrollmentsData } = await supabase
    .from('student_enrollments')
    .select(`
      *,
      course:courses (*)
    `)
    .eq('student_id', studentId)
    .order('year_of_study')

  const courseEnrollments = (courseEnrollmentsData || []) as Array<{
    id: string
    year_of_study: number
    semester?: number
    course: Course | null
    [key: string]: unknown
  }>

  // 4. Fetch grades
  const { data: gradesData } = await supabase
    .from('grades')
    .select('*')
    .eq('student_id', studentId)

  const grades = (gradesData || []) as {
    id: string
    course_id: string
    grade: string | null
    percentage: number | null
    assessment_type: string
    assessment_date: string
  }[]

  // 5. Build transcript years
  const yearRegistrations = enrollment?.year_registrations || []
  const maxYear = enrollment?.program?.duration_years || enrollment?.current_year || 1

  const years: TranscriptYear[] = []

  for (let yearNum = 1; yearNum <= maxYear; yearNum++) {
    const yearReg = yearRegistrations.find((r) => r.year_of_study === yearNum)
    const yearCourses = (courseEnrollments || [])
      .filter((e) => e.year_of_study === yearNum)
      .map((e) => {
        const course = e.course as Course
        const courseGrades = grades.filter((g) => g.course_id === course?.id)

        // Calculate final grade (average of all grades)
        let finalPercentage: number | null = null
        if (courseGrades.length > 0) {
          const validGrades = courseGrades.filter((g) => g.percentage !== null)
          if (validGrades.length > 0) {
            finalPercentage =
              validGrades.reduce((sum, g) => sum + (g.percentage || 0), 0) / validGrades.length
          }
        }

        return {
          id: e.id,
          course_id: course?.id || '',
          course_name: course?.name || 'Unknown',
          course_code: course?.course_code || null,
          credits: course?.credits || null,
          semester: (e as { semester?: number }).semester || 1,
          grades: courseGrades,
          final_grade: finalPercentage ? getGradeLetter(finalPercentage) : null,
          final_percentage: finalPercentage,
        }
      })

    // Calculate year average
    let yearAverage: number | null = null
    const coursesWithGrades = yearCourses.filter((c) => c.final_percentage !== null)
    if (coursesWithGrades.length > 0) {
      yearAverage =
        coursesWithGrades.reduce((sum, c) => sum + (c.final_percentage || 0), 0) /
        coursesWithGrades.length
    }

    // Calculate credits earned
    const creditsEarned = yearCourses
      .filter((c) => c.final_percentage !== null && c.final_percentage >= 50)
      .reduce((sum, c) => sum + (c.credits || 0), 0)

    years.push({
      year_of_study: yearNum,
      academic_year: yearReg?.academic_year || null,
      year_registration: yearReg || null,
      courses: yearCourses,
      year_average: yearAverage,
      credits_earned: creditsEarned,
      year_status: (yearReg?.year_status as YearCompletionStatus) || 'in_progress',
    })
  }

  // 6. Calculate cumulative statistics
  const allCoursesWithGrades = years.flatMap((y) =>
    y.courses.filter((c) => c.final_percentage !== null)
  )
  let cumulativeAverage: number | null = null
  if (allCoursesWithGrades.length > 0) {
    cumulativeAverage =
      allCoursesWithGrades.reduce((sum, c) => sum + (c.final_percentage || 0), 0) /
      allCoursesWithGrades.length
  }

  const totalCreditsEarned = years.reduce((sum, y) => sum + y.credits_earned, 0)

  return {
    student,
    program: enrollment?.program || null,
    program_enrollment: enrollment || null,
    years,
    cumulative_average: cumulativeAverage,
    total_credits_earned: totalCreditsEarned,
    total_credits_required: enrollment?.program?.total_credits || null,
    completion_status: (enrollment?.status as ProgramEnrollmentStatus) || 'enrolled',
    generated_at: new Date().toISOString(),
  }
}

/**
 * Convert percentage to grade letter (Namibian grading scale)
 * A: 80+ (Distinction)
 * B: 70-79 (Very Good)
 * C: 60-69 (Good)
 * D: 50-59 (Satisfactory/Pass)
 * E: Below 50 (Fail)
 */
export function getGradeLetter(percentage: number): string {
  if (percentage >= 80) return 'A'
  if (percentage >= 70) return 'B'
  if (percentage >= 60) return 'C'
  if (percentage >= 50) return 'D'
  return 'E' // Fail
}

/**
 * Get grade description (Namibian terminology)
 */
export function getGradeDescription(grade: string): string {
  switch (grade) {
    case 'A':
      return 'Distinction'
    case 'B':
      return 'Very Good'
    case 'C':
      return 'Good'
    case 'D':
      return 'Satisfactory'
    case 'E':
      return 'Fail'
    default:
      return 'Not Graded'
  }
}

/**
 * Format percentage for display
 */
export function formatPercentage(value: number | null): string {
  if (value === null) return '-'
  return `${value.toFixed(1)}%`
}

/**
 * Calculate GPA from percentage (4.0 scale - Namibian)
 * A (80+): 4.0
 * B (70-79): 3.5
 * C (60-69): 3.0
 * D (50-59): 2.0
 * E (Below 50): 0
 */
export function calculateGPA(percentage: number | null): number | null {
  if (percentage === null) return null

  if (percentage >= 80) return 4.0
  if (percentage >= 70) return 3.5
  if (percentage >= 60) return 3.0
  if (percentage >= 50) return 2.0
  return 0
}
