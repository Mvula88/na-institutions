'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Input, Select, Textarea } from '@/components/ui/input'
import { ArrowLeft, Save, Upload, User, AlertTriangle, TrendingUp, Info, PlusCircle, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatCurrency } from '@/lib/currency'
import { isValidSAPhoneNumber, getPhoneValidationError } from '@/lib/phone-validation'
import { checkStudentLimit, type StudentLimitCheck } from '@/lib/subscription-limits'
import { FeeModelType, Semester, Program, AcademicYear, ProgramCourse } from '@/types/database'
import { calculateEnrollmentFees, getInstallmentOptions } from '@/lib/fee-calculator'
import { getCurrentAcademicYear } from '@/lib/academic-year-utils'

interface Subject {
  id: string
  name: string
  code: string | null
  monthly_fee: number
  total_course_fee: number
  allow_installments: boolean
  default_installments: number
}

interface CenterSettings {
  registration_fee: number
  late_payment_penalty: number
  payment_due_day: number
  terms_and_conditions: string | null
  payment_months: number[]
  fee_model: FeeModelType
}

export default function NewStudentPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])
  const [centerSettings, setCenterSettings] = useState<CenterSettings>({
    registration_fee: 300,
    late_payment_penalty: 70,
    payment_due_day: 5,
    terms_and_conditions: null,
    payment_months: [1, 2, 3, 4, 5, 6, 7, 8, 9], // Default Feb-Oct
    fee_model: 'monthly_per_course',
  })
  const [currentStep, setCurrentStep] = useState(1)
  const totalSteps = 4
  const [studentLimit, setStudentLimit] = useState<StudentLimitCheck | null>(null)
  const [limitLoading, setLimitLoading] = useState(true)

  // For semester-based fee model
  const [semesters, setSemesters] = useState<Semester[]>([])
  const [selectedSemester, setSelectedSemester] = useState<string>('')

  // For lump sum fee model - installment selection per course
  const [installmentSelections, setInstallmentSelections] = useState<Record<string, number>>({})

  // Program enrollment state (multi-year student journey)
  const [programs, setPrograms] = useState<Program[]>([])
  const [selectedProgram, setSelectedProgram] = useState<string>('')
  const [currentAcademicYear, setCurrentAcademicYear] = useState<AcademicYear | null>(null)
  const [programCourses, setProgramCourses] = useState<(ProgramCourse & { course?: Subject })[]>([])
  const [useProgramEnrollment, setUseProgramEnrollment] = useState(false)

  // Create program inline state
  const [showCreateProgram, setShowCreateProgram] = useState(false)
  const [isCreatingProgram, setIsCreatingProgram] = useState(false)
  const [newProgramData, setNewProgramData] = useState({
    name: '',
    code: '',
    duration_years: 1,
    qualification_type: 'certificate',
  })

  // Form state - Student Information
  const [formData, setFormData] = useState({
    // Student details
    surname: '',
    first_name: '',
    gender: '',
    date_of_birth: '',
    id_number: '',
    phone: '',
    email: '',
    health_conditions: '',
    grade: '',
    school_name: '',

    // Parent/Guardian
    parent_name: '',
    parent_phone: '',
    parent_email: '',
    relationship: '',

    // Person responsible for payment
    payer_name: '',
    payer_id_number: '',
    payer_phone: '',
    payer_relationship: '',
    payer_same_as_parent: false,

    // Terms
    terms_accepted: false,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (user?.institution_id) {
      fetchSubjects()
      fetchCenterSettings()
      fetchStudentLimit()
    }
  }, [user?.institution_id])

  // Fetch semesters when fee model is per_semester
  useEffect(() => {
    if (user?.institution_id && centerSettings.fee_model === 'per_semester') {
      fetchSemesters()
    }
  }, [user?.institution_id, centerSettings.fee_model])

  // Fetch programs and academic year for multi-year enrollment
  useEffect(() => {
    if (user?.institution_id) {
      fetchPrograms()
      fetchCurrentAcademicYear()
    }
  }, [user?.institution_id])

  // Fetch program courses when a program is selected
  useEffect(() => {
    if (selectedProgram) {
      fetchProgramCourses(selectedProgram)
    } else {
      setProgramCourses([])
    }
  }, [selectedProgram])

  async function fetchPrograms() {
    if (!user?.institution_id) return

    const supabase = createClient()
    const { data } = await supabase
      .from('programs')
      .select('*')
      .eq('institution_id', user.institution_id)
      .eq('is_active', true)
      .order('name')

    if (data) {
      setPrograms(data as Program[])
    }
  }

  async function handleCreateProgram() {
    if (!user?.institution_id || !newProgramData.name.trim()) {
      toast.error('Please enter a program name')
      return
    }

    setIsCreatingProgram(true)
    const supabase = createClient()

    try {
      const { data: newProgram, error } = await supabase
        .from('programs')
        .insert({
          institution_id: user.institution_id,
          name: newProgramData.name.trim(),
          code: newProgramData.code.trim().toUpperCase() || null,
          duration_years: newProgramData.duration_years,
          qualification_type: newProgramData.qualification_type,
          is_active: true,
        } as never)
        .select('id')
        .single()

      if (error) throw error
      if (!newProgram) throw new Error('Failed to create program')

      await fetchPrograms()
      setSelectedProgram((newProgram as { id: string }).id)
      setShowCreateProgram(false)
      setNewProgramData({ name: '', code: '', duration_years: 1, qualification_type: 'certificate' })
      toast.success(`Program "${newProgramData.name}" created`)
    } catch (error) {
      console.error('Error creating program:', error)
      toast.error('Failed to create program')
    } finally {
      setIsCreatingProgram(false)
    }
  }

  async function fetchCurrentAcademicYear() {
    if (!user?.institution_id) return

    try {
      const academicYear = await getCurrentAcademicYear(user.institution_id)
      setCurrentAcademicYear(academicYear)
    } catch (error) {
      console.error('Error fetching academic year:', error)
    }
  }

  async function fetchProgramCourses(programId: string) {
    if (!user?.institution_id) return

    const supabase = createClient()
    const { data } = await supabase
      .from('program_courses')
      .select(`
        *,
        course:courses(id, name, code, monthly_fee, total_course_fee, allow_installments, default_installments)
      `)
      .eq('program_id', programId)
      .eq('year_of_study', 1) // Only Year 1 courses for new students
      .order('semester')

    if (data) {
      setProgramCourses(data as (ProgramCourse & { course?: Subject })[])

      // Auto-select Year 1 courses
      if (useProgramEnrollment) {
        const courseIds = data
          .filter((pc: { course?: { id: string } }) => pc.course?.id)
          .map((pc: { course?: { id: string } }) => pc.course!.id)
        setSelectedSubjects(courseIds)
      }
    }
  }

  async function fetchStudentLimit() {
    if (!user?.institution_id) return
    setLimitLoading(true)
    const limit = await checkStudentLimit(user.institution_id)
    setStudentLimit(limit)
    setLimitLoading(false)
  }

  async function fetchSubjects() {
    if (!user?.institution_id) return

    const supabase = createClient()
    const { data } = await supabase
      .from('courses')
      .select('id, name, code, monthly_fee, total_course_fee, allow_installments, default_installments')
      .eq('institution_id', user.institution_id)
      .eq('is_active', true)
      .order('name')

    interface CourseData {
      id: string
      name: string
      code: string | null
      monthly_fee: number
      total_course_fee?: number
      allow_installments?: boolean
      default_installments?: number
    }
    const typedData = (data || []) as CourseData[]
    const courses: Subject[] = typedData.map(c => ({
      id: c.id,
      name: c.name,
      code: c.code,
      monthly_fee: c.monthly_fee,
      total_course_fee: c.total_course_fee || 0,
      allow_installments: c.allow_installments ?? true,
      default_installments: c.default_installments || 1,
    }))

    setSubjects(courses)

    // Initialize installment selections with default values
    const defaultSelections: Record<string, number> = {}
    courses.forEach(c => {
      defaultSelections[c.id] = c.default_installments || 1
    })
    setInstallmentSelections(defaultSelections)
  }

  async function fetchSemesters() {
    if (!user?.institution_id) return

    const supabase = createClient()
    const { data } = await supabase
      .from('semesters')
      .select('*')
      .eq('institution_id', user.institution_id)
      .eq('is_active', true)
      .order('year', { ascending: false })
      .order('semester_number', { ascending: true })

    if (data && data.length > 0) {
      const typedSemesters = data as Semester[]
      setSemesters(typedSemesters)
      // Auto-select the first active semester
      if (!selectedSemester) {
        setSelectedSemester(typedSemesters[0].id)
      }
    }
  }

  async function fetchCenterSettings() {
    if (!user?.institution_id) return

    const supabase = createClient()
    const { data } = await supabase
      .from('institutions')
      .select('default_registration_fee, late_payment_penalty, payment_due_day, terms_and_conditions, payment_months, fee_model')
      .eq('id', user.institution_id)
      .single()

    if (data) {
      const centerData = data as {
        default_registration_fee: number
        late_payment_penalty: number
        payment_due_day: number
        terms_and_conditions: string | null
        payment_months: number[] | null
        fee_model: FeeModelType | null
      }
      setCenterSettings({
        registration_fee: centerData.default_registration_fee || 300,
        late_payment_penalty: centerData.late_payment_penalty || 70,
        payment_due_day: centerData.payment_due_day || 5,
        terms_and_conditions: centerData.terms_and_conditions,
        payment_months: centerData.payment_months || [1, 2, 3, 4, 5, 6, 7, 8, 9],
        fee_model: centerData.fee_model || 'monthly_per_course',
      })
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked

    if (type === 'checkbox') {
      setFormData((prev) => ({ ...prev, [name]: checked }))

      // If "same as parent" is checked, copy parent info to payer
      if (name === 'payer_same_as_parent' && checked) {
        setFormData((prev) => ({
          ...prev,
          payer_same_as_parent: true,
          payer_name: prev.parent_name,
          payer_phone: prev.parent_phone,
          payer_relationship: prev.relationship,
        }))
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }))
    }

    // Clear error when user types
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  function toggleSubject(subjectId: string) {
    setSelectedSubjects((prev) =>
      prev.includes(subjectId)
        ? prev.filter((id) => id !== subjectId)
        : [...prev, subjectId]
    )
  }

  function validateStep(step: number): boolean {
    const newErrors: Record<string, string> = {}

    if (step === 1) {
      if (!formData.surname.trim()) newErrors.surname = 'Surname is required'
      if (!formData.first_name.trim()) newErrors.first_name = 'First name is required'
      if (!formData.gender) newErrors.gender = 'Gender is required'
      if (!formData.date_of_birth) newErrors.date_of_birth = 'Date of birth is required'
      if (!formData.phone.trim()) {
        newErrors.phone = 'Mobile number is required'
      } else if (!isValidSAPhoneNumber(formData.phone)) {
        newErrors.phone = getPhoneValidationError(formData.phone, 'Mobile number') || 'Invalid phone number'
      }
    }

    if (step === 2) {
      if (!formData.parent_name.trim()) newErrors.parent_name = 'Parent/Guardian name is required'
      if (!formData.parent_phone.trim()) {
        newErrors.parent_phone = 'Parent phone is required'
      } else if (!isValidSAPhoneNumber(formData.parent_phone)) {
        newErrors.parent_phone = getPhoneValidationError(formData.parent_phone, 'Parent phone') || 'Invalid phone number'
      }
    }

    if (step === 3) {
      if (selectedSubjects.length === 0) {
        toast.error('Please select at least one subject')
        return false
      }
      // Require semester selection for per_semester model
      if (centerSettings.fee_model === 'per_semester' && !selectedSemester) {
        toast.error('Please select a semester')
        return false
      }
    }

    if (step === 4) {
      if (!formData.payer_name.trim()) newErrors.payer_name = 'Name is required'
      if (!formData.payer_id_number.trim()) newErrors.payer_id_number = 'ID number is required'
      if (!formData.payer_phone.trim()) {
        newErrors.payer_phone = 'Phone number is required'
      } else if (!isValidSAPhoneNumber(formData.payer_phone)) {
        newErrors.payer_phone = getPhoneValidationError(formData.payer_phone, 'Phone number') || 'Invalid phone number'
      }
      if (!formData.terms_accepted) {
        toast.error('You must accept the terms and conditions')
        return false
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function handleNext() {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, totalSteps))
    }
  }

  function handlePrevious() {
    setCurrentStep((prev) => Math.max(prev - 1, 1))
  }

  // Calculate fees using the fee calculator
  const selectedSubjectsData = subjects.filter((s) => selectedSubjects.includes(s.id))
  const registrationFee = centerSettings.registration_fee || 300

  // Get the selected semester for per_semester model
  const selectedSemesterData = semesters.find(s => s.id === selectedSemester)

  // Calculate fees based on fee model
  const feeCalculation = calculateEnrollmentFees({
    feeModel: centerSettings.fee_model,
    courses: selectedSubjectsData,
    registrationFee,
    paymentMonths: centerSettings.payment_months,
    semester: selectedSemesterData,
    installmentOverrides: installmentSelections,
  })

  // Legacy variables for backward compatibility with existing UI
  const monthlyTotal = selectedSubjectsData.reduce((sum, s) => sum + s.monthly_fee, 0)
  const paymentMonthsCount = centerSettings.payment_months.length
  const yearlyTotal = feeCalculation.total

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!validateStep(4)) return
    if (!user?.institution_id) return

    setIsLoading(true)
    const supabase = createClient()

    try {
      // Create full_name from surname and first_name
      const full_name = `${formData.surname} ${formData.first_name}`.trim()

      // Create student
      const insertData = {
        institution_id: user.institution_id,
        full_name,
        surname: formData.surname,
        first_name: formData.first_name,
        gender: formData.gender || null,
        date_of_birth: formData.date_of_birth || null,
        id_number: formData.id_number || null,
        phone: formData.phone || null,
        email: formData.email || null,
        health_conditions: formData.health_conditions || null,
        grade: formData.grade || null,
        school_name: formData.school_name || null,
        parent_name: formData.parent_name || null,
        parent_phone: formData.parent_phone || null,
        parent_email: formData.parent_email || null,
        relationship: formData.relationship || null,
        payer_name: formData.payer_name || null,
        payer_id_number: formData.payer_id_number || null,
        payer_phone: formData.payer_phone || null,
        payer_relationship: formData.payer_relationship || null,
        registration_fee_amount: registrationFee,
        terms_accepted: formData.terms_accepted,
        terms_accepted_date: formData.terms_accepted ? new Date().toISOString() : null,
      }

      const { data: student, error: studentError } = await supabase
        .from('students')
        .insert(insertData as never)
        .select('id')
        .single()

      if (studentError) throw studentError

      // Enroll in selected courses
      const typedStudent = student as { id: string } | null

      // Create program enrollment if using program enrollment mode
      let programEnrollmentId: string | null = null
      let programYearRegistrationId: string | null = null

      if (useProgramEnrollment && selectedProgram && typedStudent && currentAcademicYear) {
        const selectedProgramData = programs.find(p => p.id === selectedProgram)
        const intakeYear = new Date().getFullYear()

        // Create program enrollment
        const { data: programEnrollment, error: programEnrollError } = await supabase
          .from('program_enrollments')
          .insert({
            institution_id: user.institution_id,
            student_id: typedStudent.id,
            program_id: selectedProgram,
            intake_year: intakeYear,
            cohort_name: `${intakeYear} Intake`,
            current_year: 1,
            status: 'enrolled',
            enrollment_date: new Date().toISOString().split('T')[0],
            expected_completion_date: selectedProgramData?.duration_years
              ? new Date(intakeYear + selectedProgramData.duration_years, 11, 31).toISOString().split('T')[0]
              : null,
          } as never)
          .select('id')
          .single()

        if (programEnrollError) {
          console.error('Error creating program enrollment:', programEnrollError)
        } else if (programEnrollment) {
          programEnrollmentId = (programEnrollment as { id: string }).id

          // Create program year registration for Year 1
          const { data: yearReg, error: yearRegError } = await supabase
            .from('program_year_registrations')
            .insert({
              institution_id: user.institution_id,
              program_enrollment_id: programEnrollmentId,
              academic_year_id: currentAcademicYear.id,
              student_id: typedStudent.id,
              year_of_study: 1,
              registration_status: 'registered',
              year_status: 'in_progress',
            } as never)
            .select('id')
            .single()

          if (yearRegError) {
            console.error('Error creating year registration:', yearRegError)
          } else if (yearReg) {
            programYearRegistrationId = (yearReg as { id: string }).id
          }
        }

        // Update student with intake year and current year
        await supabase
          .from('students')
          .update({
            intake_year: intakeYear,
            current_year_of_study: 1,
            program_id: selectedProgram,
          } as never)
          .eq('id', typedStudent.id)
      }

      if (selectedSubjects.length > 0 && typedStudent) {
        const enrollments = selectedSubjects.map((courseId) => ({
          student_id: typedStudent.id,
          course_id: courseId,
          academic_year_id: currentAcademicYear?.id || null,
          year_of_study: 1,
          program_year_registration_id: programYearRegistrationId,
        }))

        const { error: enrollError } = await supabase
          .from('student_enrollments')
          .insert(enrollments as never)

        if (enrollError) {
          console.error('Error enrolling in courses:', enrollError)
        }
      }

      // Create registration fee record in student_fees table
      if (typedStudent && registrationFee > 0) {
        const registrationDate = new Date()
        const feeMonth = `${registrationDate.getFullYear()}-${String(registrationDate.getMonth() + 1).padStart(2, '0')}-01`
        const dueDateStr = registrationDate.toISOString().split('T')[0]

        const { error: feeError } = await supabase
          .from('student_fees')
          .insert({
            institution_id: user.institution_id,
            student_id: typedStudent.id,
            fee_type: 'registration',
            fee_month: feeMonth,
            amount_due: registrationFee,
            amount_paid: 0,
            due_date: dueDateStr,
            status: 'unpaid',
            source_type: 'registration',
          } as never)

        if (feeError) {
          console.error('Error creating registration fee:', feeError)
        }
      }

      // Create fee records based on fee model
      if (typedStudent) {
        // For lump sum model - create course installment fee records
        if (centerSettings.fee_model === 'per_course_lumpsum' && feeCalculation.installment_schedules) {
          // Get enrollment IDs for linking
          const { data: enrollmentData } = await supabase
            .from('student_enrollments')
            .select('id, course_id')
            .eq('student_id', typedStudent.id)

          const enrollmentMap = new Map(
            (enrollmentData || []).map((e: { id: string; course_id: string }) => [e.course_id, e.id])
          )

          for (const schedule of feeCalculation.installment_schedules) {
            const enrollmentId = enrollmentMap.get(schedule.course_id)

            for (const installment of schedule.installments) {
              const { error: courseFeeError } = await supabase
                .from('student_course_fees')
                .insert({
                  institution_id: user.institution_id,
                  student_id: typedStudent.id,
                  enrollment_id: enrollmentId || null,
                  course_id: schedule.course_id,
                  total_course_fee: schedule.total_fee,
                  installment_number: installment.installment_number,
                  installment_amount: installment.amount,
                  amount_paid: 0,
                  due_date: installment.due_date,
                  status: 'unpaid',
                } as never)

              if (courseFeeError) {
                console.error('Error creating course fee:', courseFeeError)
              }

              // Also create a corresponding student_fees record for unified fee tracking
              const { error: feeError } = await supabase
                .from('student_fees')
                .insert({
                  institution_id: user.institution_id,
                  student_id: typedStudent.id,
                  fee_type: 'tuition',
                  fee_month: installment.due_date.substring(0, 7) + '-01',
                  amount_due: installment.amount,
                  amount_paid: 0,
                  due_date: installment.due_date,
                  status: 'unpaid',
                  source_type: 'course_installment',
                } as never)

              if (feeError) {
                console.error('Error creating fee record:', feeError)
              }
            }
          }
        }

        // For semester model - create semester fee record
        if (centerSettings.fee_model === 'per_semester' && selectedSemesterData) {
          const { error: semesterFeeError } = await supabase
            .from('student_semester_fees')
            .insert({
              institution_id: user.institution_id,
              student_id: typedStudent.id,
              semester_id: selectedSemesterData.id,
              amount_due: selectedSemesterData.fee_amount,
              amount_paid: 0,
              due_date: selectedSemesterData.registration_deadline || selectedSemesterData.start_date,
              status: 'unpaid',
            } as never)

          if (semesterFeeError) {
            console.error('Error creating semester fee:', semesterFeeError)
          }

          // Also create a corresponding student_fees record for unified fee tracking
          const { error: feeError } = await supabase
            .from('student_fees')
            .insert({
              institution_id: user.institution_id,
              student_id: typedStudent.id,
              fee_type: 'tuition',
              fee_month: selectedSemesterData.start_date.substring(0, 7) + '-01',
              amount_due: selectedSemesterData.fee_amount,
              amount_paid: 0,
              due_date: selectedSemesterData.registration_deadline || selectedSemesterData.start_date,
              status: 'unpaid',
              source_type: 'semester',
            } as never)

          if (feeError) {
            console.error('Error creating semester fee record:', feeError)
          }
        }
      }

      toast.success('Student registered successfully!')
      router.push(`/dashboard/students/${typedStudent?.id}`)
    } catch (error) {
      console.error('Error creating student:', error)
      toast.error('Failed to register student')
    } finally {
      setIsLoading(false)
    }
  }

  // Default terms if center hasn't set custom ones
  const defaultTerms = `By enrolling at this Tutorial Center, I acknowledge that:

• I am receiving an educational benefit and the costs are payable monthly
• I acknowledge financial responsibility for all tuition fees and charges
• Tuition fees must be paid on or before the ${centerSettings.payment_due_day}th of every month
• A late payment penalty of ${formatCurrency(centerSettings.late_payment_penalty || 70)} will be applied for overdue payments
• Registration fees are non-refundable under any circumstances
• The College may prevent class attendance until fees are paid
• I authorize the College to contact me regarding my account`

  // Show blocked message if at limit
  if (studentLimit?.isAtLimit) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <Link
          href="/dashboard/students"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Students
        </Link>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Student Limit Reached</h1>
          <p className="text-gray-600 mb-6">
            You&apos;ve reached your {studentLimit.tier} plan limit of {studentLimit.limit} students.
            Upgrade your plan to add more students.
          </p>
          <div className="flex justify-center gap-3">
            <Link href="/dashboard/students">
              <Button variant="outline">
                Back to Students
              </Button>
            </Link>
            <Link href="/dashboard/subscription">
              <Button leftIcon={<TrendingUp className="w-4 h-4" />}>
                Upgrade Plan
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard/students"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Students
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Student Registration</h1>
        <p className="text-gray-500 mt-1">Complete the enrollment form below</p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {['Student Info', 'Parent/Guardian', 'Subject Enrollment', 'Payment & Terms'].map((label, index) => {
            const step = index + 1
            const isActive = step === currentStep
            const isCompleted = step < currentStep

            return (
              <div key={step} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : isCompleted
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {isCompleted ? '✓' : step}
                  </div>
                  <span className={`text-xs mt-2 ${isActive ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                    {label}
                  </span>
                </div>
                {index < 3 && (
                  <div className={`h-1 flex-1 mx-2 ${isCompleted ? 'bg-green-500' : 'bg-gray-200'}`} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Step 1: Student Information */}
        {currentStep === 1 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6 pb-2 border-b">Student Information</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Surname"
                name="surname"
                value={formData.surname}
                onChange={handleChange}
                error={errors.surname}
                required
              />
              <Input
                label="First Name"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                error={errors.first_name}
                required
              />
              <Select
                label="Gender"
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                error={errors.gender}
                options={[
                  { value: 'male', label: 'Male' },
                  { value: 'female', label: 'Female' },
                  { value: 'other', label: 'Other' },
                ]}
                placeholder="Select gender"
                required
              />
              <Input
                label="Date of Birth"
                name="date_of_birth"
                type="date"
                value={formData.date_of_birth}
                onChange={handleChange}
                error={errors.date_of_birth}
                required
              />
              <Input
                label="ID Number (Optional)"
                name="id_number"
                value={formData.id_number}
                onChange={handleChange}
              />
              <Input
                label="Mobile Number"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                error={errors.phone}
                required
              />
              <Input
                label="Email (Optional)"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
              />
              <Input
                label="Grade/Form"
                name="grade"
                value={formData.grade}
                onChange={handleChange}
                placeholder="e.g., Grade 10, Form 4"
              />
              <Input
                label="School Name (Optional)"
                name="school_name"
                value={formData.school_name}
                onChange={handleChange}
              />
              <div className="md:col-span-2">
                <Textarea
                  label="Health Conditions (If any that may affect studies)"
                  name="health_conditions"
                  value={formData.health_conditions}
                  onChange={handleChange}
                  rows={2}
                  placeholder="Please elaborate if you have any health problems that may affect your studies..."
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Parent/Guardian Information */}
        {currentStep === 2 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6 pb-2 border-b">Parent/Guardian Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Parent/Guardian Full Name"
                name="parent_name"
                value={formData.parent_name}
                onChange={handleChange}
                error={errors.parent_name}
                required
              />
              <Select
                label="Relationship"
                name="relationship"
                value={formData.relationship}
                onChange={handleChange}
                options={[
                  { value: 'father', label: 'Father' },
                  { value: 'mother', label: 'Mother' },
                  { value: 'guardian', label: 'Guardian' },
                  { value: 'uncle', label: 'Uncle' },
                  { value: 'aunt', label: 'Aunt' },
                  { value: 'grandparent', label: 'Grandparent' },
                  { value: 'sibling', label: 'Sibling' },
                  { value: 'other', label: 'Other' },
                ]}
                placeholder="Select relationship"
              />
              <Input
                label="Parent/Guardian Phone"
                name="parent_phone"
                value={formData.parent_phone}
                onChange={handleChange}
                error={errors.parent_phone}
                required
              />
              <Input
                label="Parent/Guardian Email (Optional)"
                name="parent_email"
                type="email"
                value={formData.parent_email}
                onChange={handleChange}
              />
            </div>
          </div>
        )}

        {/* Step 3: Subject Enrollment */}
        {currentStep === 3 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2 pb-2 border-b">Program & Course Enrollment</h2>
            <p className="text-sm text-gray-500 mb-4">
              {centerSettings.fee_model === 'monthly_per_course' && 'Select the subjects the student will be enrolled in. Each subject has a monthly fee.'}
              {centerSettings.fee_model === 'per_course_lumpsum' && 'Select the subjects the student will be enrolled in. Each course has a fixed total fee.'}
              {centerSettings.fee_model === 'per_semester' && 'Select the subjects the student will be enrolled in. A fixed semester fee applies.'}
            </p>

            {/* Program Enrollment Toggle (only show if programs exist) */}
            {programs.length > 0 && (
              <div className="mb-6 p-4 bg-violet-50 border border-violet-200 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <input
                    type="checkbox"
                    id="useProgramEnrollment"
                    checked={useProgramEnrollment}
                    onChange={(e) => {
                      setUseProgramEnrollment(e.target.checked)
                      if (!e.target.checked) {
                        setSelectedProgram('')
                        setSelectedSubjects([])
                      }
                    }}
                    className="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                  />
                  <label htmlFor="useProgramEnrollment" className="text-sm font-medium text-violet-900">
                    Enroll in a Program (multi-year diploma/certificate)
                  </label>
                </div>

                {useProgramEnrollment && (
                  <div className="space-y-4">
                    {/* Academic Year Info */}
                    {currentAcademicYear ? (
                      <div className="text-sm text-violet-700">
                        Academic Year: <strong>{currentAcademicYear.name}</strong>
                      </div>
                    ) : (
                      <div className="text-sm text-amber-700 bg-amber-50 p-2 rounded">
                        No current academic year set. Please configure an academic year in Settings first.
                      </div>
                    )}

                    {/* Program Selection */}
                    <div>
                      <label className="block text-sm font-medium text-violet-900 mb-2">
                        Select Program
                      </label>

                      {/* Toggle buttons */}
                      <div className="flex gap-2 mb-2">
                        <button
                          type="button"
                          onClick={() => setShowCreateProgram(false)}
                          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                            !showCreateProgram
                              ? 'bg-violet-600 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          Select Existing
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowCreateProgram(true)}
                          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1 ${
                            showCreateProgram
                              ? 'bg-violet-600 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          <PlusCircle className="w-3 h-3" />
                          Create New
                        </button>
                      </div>

                      {!showCreateProgram ? (
                        <select
                          value={selectedProgram}
                          onChange={(e) => {
                            setSelectedProgram(e.target.value)
                            setSelectedSubjects([])
                          }}
                          className="w-full px-3 py-2 border border-violet-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                        >
                          <option value="">Choose a program...</option>
                          {programs.map((program) => (
                            <option key={program.id} value={program.id}>
                              {program.name}
                              {program.duration_years && ` (${program.duration_years} year${program.duration_years > 1 ? 's' : ''})`}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="space-y-3 p-3 bg-violet-50 rounded-lg border border-violet-200">
                          <div className="grid grid-cols-2 gap-3">
                            <Input
                              label="Program Name"
                              value={newProgramData.name}
                              onChange={(e) => setNewProgramData({ ...newProgramData, name: e.target.value })}
                              placeholder="e.g., Bachelor of Accounting"
                            />
                            <Input
                              label="Code"
                              value={newProgramData.code}
                              onChange={(e) => setNewProgramData({ ...newProgramData, code: e.target.value.toUpperCase() })}
                              placeholder="e.g., BACC"
                              maxLength={10}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <Select
                              label="Duration (Years)"
                              value={newProgramData.duration_years.toString()}
                              onChange={(e) => setNewProgramData({ ...newProgramData, duration_years: parseInt(e.target.value) || 1 })}
                              options={[
                                { value: '1', label: '1 Year' },
                                { value: '2', label: '2 Years' },
                                { value: '3', label: '3 Years' },
                                { value: '4', label: '4 Years' },
                                { value: '5', label: '5 Years' },
                              ]}
                            />
                            <Select
                              label="Qualification Type"
                              value={newProgramData.qualification_type}
                              onChange={(e) => setNewProgramData({ ...newProgramData, qualification_type: e.target.value })}
                              options={[
                                { value: 'certificate', label: 'Certificate' },
                                { value: 'diploma', label: 'Diploma' },
                                { value: 'degree', label: 'Degree' },
                                { value: 'postgraduate', label: 'Postgraduate' },
                              ]}
                            />
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            onClick={handleCreateProgram}
                            disabled={isCreatingProgram || !newProgramData.name.trim()}
                            leftIcon={isCreatingProgram ? <Loader2 className="w-3 h-3 animate-spin" /> : <PlusCircle className="w-3 h-3" />}
                          >
                            {isCreatingProgram ? 'Creating...' : 'Create Program'}
                          </Button>
                          <p className="text-xs text-violet-600">
                            You can add courses to this program later in the Programs section.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Program Info */}
                    {selectedProgram && (
                      <div className="text-sm text-violet-700 bg-violet-100 p-3 rounded">
                        <p className="font-medium">Year 1 of program - {programCourses.length} course(s) linked</p>
                        <p className="text-xs mt-1">The student will be enrolled in Year 1 and can re-register for Year 2 next academic year.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Registration Fee Notice */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-amber-800">
                <span className="font-semibold">Registration Fee:</span> {formatCurrency(registrationFee)} (non-refundable)
              </p>
            </div>

            {/* Semester Selection (for per_semester model) */}
            {centerSettings.fee_model === 'per_semester' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Semester
                </label>
                {semesters.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {semesters.map((semester) => (
                      <label
                        key={semester.id}
                        className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          selectedSemester === semester.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="semester"
                          checked={selectedSemester === semester.id}
                          onChange={() => setSelectedSemester(semester.id)}
                          className="w-5 h-5 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <div className="ml-3 flex-1">
                          <p className="font-medium text-gray-900">{semester.name}</p>
                          <p className="text-xs text-gray-500">
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
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-sm text-yellow-800 flex items-center gap-2">
                      <Info className="w-4 h-4" />
                      No active semesters found. Please create a semester in Settings first.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Course Selection - shows program courses if program is selected, otherwise all courses */}
            {(() => {
              // Determine which courses to show
              const coursesToShow = useProgramEnrollment && selectedProgram && programCourses.length > 0
                ? programCourses.map(pc => pc.course).filter((c): c is Subject => c !== undefined)
                : subjects

              if (useProgramEnrollment && selectedProgram && programCourses.length === 0) {
                return (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <p className="text-gray-500">No courses linked to Year 1 of this program.</p>
                    <p className="text-sm text-gray-400 mt-1">Link courses to the program in the Programs section.</p>
                  </div>
                )
              }

              return coursesToShow.length > 0 ? (
              <>
                {useProgramEnrollment && selectedProgram && (
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Year 1 Courses</h3>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {coursesToShow.map((subject) => {
                    const isSelected = selectedSubjects.includes(subject.id)
                    const programCourse = programCourses.find(pc => pc.course_id === subject.id)
                    return (
                      <div
                        key={subject.id}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSubject(subject.id)}
                            className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                          />
                          <div className="ml-3 flex-1">
                            <p className="font-medium text-gray-900">{subject.name}</p>
                            <div className="flex items-center gap-2">
                              {subject.code && (
                                <p className="text-xs text-gray-500">{subject.code}</p>
                              )}
                              {programCourse && (
                                <span className={`px-1.5 py-0.5 text-xs rounded ${
                                  programCourse.is_compulsory
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-gray-100 text-gray-600'
                                }`}>
                                  {programCourse.is_compulsory ? 'Core' : 'Elective'}
                                </span>
                              )}
                            </div>
                          </div>
                          {/* Show appropriate fee based on model */}
                          {centerSettings.fee_model === 'monthly_per_course' && (
                            <p className="font-semibold text-gray-900">
                              {formatCurrency(subject.monthly_fee)}/mo
                            </p>
                          )}
                          {centerSettings.fee_model === 'per_course_lumpsum' && (
                            <p className="font-semibold text-gray-900">
                              {formatCurrency(subject.total_course_fee)}
                            </p>
                          )}
                          {centerSettings.fee_model === 'per_semester' && (
                            <span className="text-xs text-gray-500 italic">Included</span>
                          )}
                        </label>

                        {/* Installment selector for lump sum model */}
                        {centerSettings.fee_model === 'per_course_lumpsum' && isSelected && subject.allow_installments && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Payment Plan
                            </label>
                            <select
                              value={installmentSelections[subject.id] || 1}
                              onChange={(e) => setInstallmentSelections(prev => ({
                                ...prev,
                                [subject.id]: parseInt(e.target.value)
                              }))}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                            >
                              {getInstallmentOptions(subject.total_course_fee).map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label} ({formatCurrency(option.perInstallment)} each)
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Fee Summary - Adapts to fee model */}
                {selectedSubjects.length > 0 && (
                  <div className="mt-6 bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3">Financial Summary</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Registration Fee (once-off)</span>
                        <span className="font-medium">{formatCurrency(registrationFee)}</span>
                      </div>

                      {/* Monthly Model Summary */}
                      {centerSettings.fee_model === 'monthly_per_course' && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-gray-600">
                              Monthly Tuition ({selectedSubjects.length} subject{selectedSubjects.length > 1 ? 's' : ''})
                            </span>
                            <span className="font-medium">{formatCurrency(feeCalculation.monthly_total || 0)}/month</span>
                          </div>
                          <div className="flex justify-between text-gray-500">
                            <span>Instalment: {formatCurrency(feeCalculation.monthly_total || 0)} x {feeCalculation.payment_months || 0} months</span>
                            <span>{formatCurrency(feeCalculation.tuition_fee)}</span>
                          </div>
                        </>
                      )}

                      {/* Lump Sum Model Summary */}
                      {centerSettings.fee_model === 'per_course_lumpsum' && (
                        <>
                          {feeCalculation.breakdown.map((item) => (
                            <div key={item.course_id} className="flex justify-between">
                              <span className="text-gray-600">{item.course_name}</span>
                              <span className="font-medium">{formatCurrency(item.fee)}</span>
                            </div>
                          ))}
                          {feeCalculation.installment_schedules && feeCalculation.installment_schedules.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-gray-200">
                              <p className="text-xs font-medium text-gray-700 mb-1">Payment Schedule:</p>
                              {feeCalculation.installment_schedules.map((schedule) => (
                                <div key={schedule.course_id} className="text-xs text-gray-500">
                                  {schedule.course_name}: {schedule.installments.length} payment{schedule.installments.length > 1 ? 's' : ''} of {formatCurrency(schedule.installments[0]?.amount || 0)}
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}

                      {/* Semester Model Summary */}
                      {centerSettings.fee_model === 'per_semester' && selectedSemesterData && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">{selectedSemesterData.name} Fee</span>
                          <span className="font-medium">{formatCurrency(selectedSemesterData.fee_amount)}</span>
                        </div>
                      )}

                      <div className="border-t border-gray-300 pt-2 mt-2">
                        <div className="flex justify-between text-lg font-bold text-gray-900">
                          <span>Total Due</span>
                          <span>{formatCurrency(feeCalculation.total)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No subjects available. Please add subjects in Settings first.</p>
              </div>
            )
            })()}
          </div>
        )}

        {/* Step 4: Payment & Terms */}
        {currentStep === 4 && (
          <>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6 pb-2 border-b">Person Responsible for Payment</h2>

              {/* Same as parent checkbox */}
              <label className="flex items-center mb-4 cursor-pointer">
                <input
                  type="checkbox"
                  name="payer_same_as_parent"
                  checked={formData.payer_same_as_parent}
                  onChange={handleChange}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Same as Parent/Guardian</span>
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Full Name"
                  name="payer_name"
                  value={formData.payer_name}
                  onChange={handleChange}
                  error={errors.payer_name}
                  required
                  disabled={formData.payer_same_as_parent}
                />
                <Input
                  label="ID Number"
                  name="payer_id_number"
                  value={formData.payer_id_number}
                  onChange={handleChange}
                  error={errors.payer_id_number}
                  required
                />
                <Input
                  label="Mobile Number"
                  name="payer_phone"
                  value={formData.payer_phone}
                  onChange={handleChange}
                  error={errors.payer_phone}
                  required
                  disabled={formData.payer_same_as_parent}
                />
                <Select
                  label="Relationship to Student"
                  name="payer_relationship"
                  value={formData.payer_relationship}
                  onChange={handleChange}
                  options={[
                    { value: 'parent', label: 'Parent' },
                    { value: 'guardian', label: 'Guardian' },
                    { value: 'self', label: 'Self' },
                    { value: 'sponsor', label: 'Sponsor' },
                    { value: 'other', label: 'Other' },
                  ]}
                  placeholder="Select relationship"
                  disabled={formData.payer_same_as_parent}
                />
              </div>
            </div>

            {/* Terms and Conditions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">
                Student Acknowledgement of Financial Obligation
              </h2>

              <div className="bg-gray-50 rounded-lg p-4 mb-4 max-h-64 overflow-y-auto">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
                  {centerSettings.terms_and_conditions || defaultTerms}
                </pre>
              </div>

              <label className="flex items-start cursor-pointer">
                <input
                  type="checkbox"
                  name="terms_accepted"
                  checked={formData.terms_accepted}
                  onChange={handleChange}
                  className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 mt-0.5"
                />
                <span className="ml-3 text-sm text-gray-700">
                  By checking this box, I acknowledge that I understand the relevant policies and the effect
                  of these changes on my financial aid and tuition liability, and still request to be
                  registered at this Tutorial Center as listed on this form.
                </span>
              </label>
            </div>

            {/* Final Summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
              <h3 className="font-semibold text-blue-900 mb-3">Registration Summary</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-blue-700">Student Name</p>
                  <p className="font-medium text-blue-900">{formData.surname} {formData.first_name}</p>
                </div>
                <div>
                  <p className="text-blue-700">Subjects Enrolled</p>
                  <p className="font-medium text-blue-900">{selectedSubjects.length} subject(s)</p>
                </div>

                {/* Program Enrollment Info */}
                {useProgramEnrollment && selectedProgram && (
                  <>
                    <div>
                      <p className="text-blue-700">Program</p>
                      <p className="font-medium text-blue-900">
                        {programs.find(p => p.id === selectedProgram)?.name || 'Selected Program'}
                      </p>
                    </div>
                    <div>
                      <p className="text-blue-700">Year of Study</p>
                      <p className="font-medium text-blue-900">Year 1</p>
                    </div>
                    {currentAcademicYear && (
                      <div>
                        <p className="text-blue-700">Academic Year</p>
                        <p className="font-medium text-blue-900">{currentAcademicYear.name}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-blue-700">Cohort</p>
                      <p className="font-medium text-blue-900">{new Date().getFullYear()} Intake</p>
                    </div>
                  </>
                )}

                {/* Fee model specific details */}
                {centerSettings.fee_model === 'monthly_per_course' && (
                  <>
                    <div>
                      <p className="text-blue-700">Monthly Fee</p>
                      <p className="font-medium text-blue-900">{formatCurrency(feeCalculation.monthly_total || 0)}</p>
                    </div>
                    <div>
                      <p className="text-blue-700">Payment Period</p>
                      <p className="font-medium text-blue-900">{feeCalculation.payment_months || 0} months</p>
                    </div>
                  </>
                )}

                {centerSettings.fee_model === 'per_course_lumpsum' && (
                  <>
                    <div>
                      <p className="text-blue-700">Course Fees</p>
                      <p className="font-medium text-blue-900">{formatCurrency(feeCalculation.tuition_fee)}</p>
                    </div>
                    <div>
                      <p className="text-blue-700">Payment Plan</p>
                      <p className="font-medium text-blue-900">
                        {feeCalculation.installment_schedules?.reduce((sum, s) => sum + s.installments.length, 0) || 1} installment(s)
                      </p>
                    </div>
                  </>
                )}

                {centerSettings.fee_model === 'per_semester' && selectedSemesterData && (
                  <>
                    <div>
                      <p className="text-blue-700">Semester</p>
                      <p className="font-medium text-blue-900">{selectedSemesterData.name}</p>
                    </div>
                    <div>
                      <p className="text-blue-700">Semester Fee</p>
                      <p className="font-medium text-blue-900">{formatCurrency(selectedSemesterData.fee_amount)}</p>
                    </div>
                  </>
                )}

                <div>
                  <p className="text-blue-700">Registration Fee</p>
                  <p className="font-medium text-blue-900">{formatCurrency(registrationFee)}</p>
                </div>
                <div>
                  <p className="text-blue-700">Total Due</p>
                  <p className="font-medium text-blue-900">{formatCurrency(feeCalculation.total)}</p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between">
          <div>
            {currentStep > 1 && (
              <Button type="button" variant="outline" onClick={handlePrevious}>
                Previous
              </Button>
            )}
          </div>
          <div className="flex gap-3">
            <Link href="/dashboard/students">
              <Button type="button" variant="ghost">
                Cancel
              </Button>
            </Link>
            {currentStep < totalSteps ? (
              <Button type="button" onClick={handleNext}>
                Next
              </Button>
            ) : (
              <Button
                type="submit"
                isLoading={isLoading}
                leftIcon={<Save className="w-4 h-4" />}
              >
                Complete Registration
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}
