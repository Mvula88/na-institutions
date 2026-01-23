'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  ArrowLeft,
  Search,
  Loader2,
  UserPlus,
  GraduationCap,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronRight,
  Calendar,
  BookOpen,
  DollarSign,
  Check,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { formatCurrency } from '@/lib/currency'
import { getCurrentAcademicYear } from '@/lib/academic-year-utils'
import {
  searchStudentsForReregistration,
  getStudentForReregistration,
  checkReregistrationEligibility,
  getNextYearCourses,
  processReregistration,
  isAlreadyRegisteredForYear,
  StudentWithEnrollment,
  ReregistrationEligibility,
} from '@/lib/re-registration-utils'
import { AcademicYear, ProgramCourse, Course } from '@/types/database'

type Step = 'search' | 'verify' | 'courses' | 'confirm' | 'complete'

export default function ReregistrationPage() {
  const router = useRouter()
  const { user } = useAuthStore()

  // Step management
  const [currentStep, setCurrentStep] = useState<Step>('search')

  // Search step
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<StudentWithEnrollment[]>([])
  const [isSearching, setIsSearching] = useState(false)

  // Selected student and data
  const [selectedStudent, setSelectedStudent] = useState<StudentWithEnrollment | null>(null)
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<string>('')
  const [eligibility, setEligibility] = useState<ReregistrationEligibility | null>(null)
  const [currentAcademicYear, setCurrentAcademicYear] = useState<AcademicYear | null>(null)

  // Course selection
  const [nextYearCourses, setNextYearCourses] = useState<(ProgramCourse & { course?: Course })[]>([])
  const [selectedCourses, setSelectedCourses] = useState<string[]>([])
  const [isLoadingCourses, setIsLoadingCourses] = useState(false)

  // Confirmation
  const [isProcessing, setIsProcessing] = useState(false)
  const [registrationFee, setRegistrationFee] = useState(0)

  // Fetch academic year on load
  useEffect(() => {
    if (user?.institution_id) {
      fetchAcademicYear()
      fetchRegistrationFee()
    }
  }, [user?.institution_id])

  async function fetchAcademicYear() {
    if (!user?.institution_id) return
    const year = await getCurrentAcademicYear(user.institution_id)
    setCurrentAcademicYear(year)
  }

  async function fetchRegistrationFee() {
    if (!user?.institution_id) return
    const supabase = createClient()
    const { data } = await supabase
      .from('institutions')
      .select('default_registration_fee')
      .eq('id', user.institution_id)
      .single()
    if (data) {
      setRegistrationFee((data as { default_registration_fee: number }).default_registration_fee || 0)
    }
  }

  async function handleSearch() {
    if (!user?.institution_id || !searchTerm.trim()) return

    setIsSearching(true)
    try {
      const results = await searchStudentsForReregistration(user.institution_id, searchTerm.trim())
      setSearchResults(results)
      if (results.length === 0) {
        toast.error('No students found with active program enrollments')
      }
    } catch (error) {
      console.error('Error searching:', error)
      toast.error('Failed to search students')
    } finally {
      setIsSearching(false)
    }
  }

  async function handleSelectStudent(student: StudentWithEnrollment, enrollmentId: string) {
    setSelectedStudent(student)
    setSelectedEnrollmentId(enrollmentId)

    // Check eligibility
    const result = await checkReregistrationEligibility(student.id, enrollmentId)
    setEligibility(result)

    // Check if already registered for current academic year
    if (currentAcademicYear && result.programEnrollment) {
      const alreadyRegistered = await isAlreadyRegisteredForYear(
        enrollmentId,
        currentAcademicYear.id
      )
      if (alreadyRegistered) {
        setEligibility({
          ...result,
          eligible: false,
          reason: `Student is already registered for ${currentAcademicYear.name}`,
        })
      }
    }

    setCurrentStep('verify')
  }

  async function handleProceedToCourses() {
    if (!eligibility?.programEnrollment?.program_id) return

    setIsLoadingCourses(true)
    try {
      const courses = await getNextYearCourses(
        eligibility.programEnrollment.program_id,
        eligibility.nextYear
      )
      setNextYearCourses(courses)

      // Auto-select compulsory courses
      const compulsoryCourseIds = courses
        .filter(c => c.is_compulsory && c.course?.id)
        .map(c => c.course!.id)
      setSelectedCourses(compulsoryCourseIds)

      setCurrentStep('courses')
    } catch (error) {
      console.error('Error loading courses:', error)
      toast.error('Failed to load courses')
    } finally {
      setIsLoadingCourses(false)
    }
  }

  function toggleCourse(courseId: string, isCompulsory: boolean) {
    if (isCompulsory) {
      // Compulsory courses cannot be deselected
      return
    }
    setSelectedCourses(prev =>
      prev.includes(courseId)
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId]
    )
  }

  async function handleConfirmRegistration() {
    if (!user?.institution_id || !selectedStudent || !currentAcademicYear || !eligibility) {
      return
    }

    setIsProcessing(true)
    try {
      const result = await processReregistration({
        institutionId: user.institution_id,
        studentId: selectedStudent.id,
        programEnrollmentId: selectedEnrollmentId,
        academicYearId: currentAcademicYear.id,
        yearOfStudy: eligibility.nextYear,
        selectedCourseIds: selectedCourses,
        registrationFee,
      })

      if (result.success) {
        setCurrentStep('complete')
        toast.success('Re-registration completed successfully!')
      } else {
        toast.error(result.error || 'Failed to complete re-registration')
      }
    } catch (error) {
      console.error('Error processing registration:', error)
      toast.error('Failed to process re-registration')
    } finally {
      setIsProcessing(false)
    }
  }

  function resetWizard() {
    setCurrentStep('search')
    setSearchTerm('')
    setSearchResults([])
    setSelectedStudent(null)
    setSelectedEnrollmentId('')
    setEligibility(null)
    setNextYearCourses([])
    setSelectedCourses([])
  }

  // Step indicator
  const steps = [
    { id: 'search', label: 'Find Student', icon: Search },
    { id: 'verify', label: 'Verify Status', icon: CheckCircle },
    { id: 'courses', label: 'Select Courses', icon: BookOpen },
    { id: 'confirm', label: 'Confirm', icon: Check },
  ]

  const currentStepIndex = steps.findIndex(s => s.id === currentStep)

  if (!currentAcademicYear) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Dashboard
        </Link>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-amber-600 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-amber-900 mb-2">No Academic Year Set</h2>
          <p className="text-amber-700 mb-4">
            Please configure a current academic year in Settings before processing re-registrations.
          </p>
          <Link href="/dashboard/settings">
            <Button>Go to Settings</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Student Re-Registration</h1>
        <p className="text-gray-500 mt-1">
          Register returning students for {currentAcademicYear.name}
        </p>
      </div>

      {/* Progress Steps */}
      {currentStep !== 'complete' && (
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon
              const isActive = step.id === currentStep
              const isCompleted = index < currentStepIndex

              return (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : isCompleted
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {isCompleted ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        <Icon className="w-5 h-5" />
                      )}
                    </div>
                    <span
                      className={`text-xs mt-2 ${
                        isActive ? 'text-blue-600 font-medium' : 'text-gray-500'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`h-1 flex-1 mx-2 ${
                        isCompleted ? 'bg-green-500' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Step Content */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        {/* Step 1: Search */}
        {currentStep === 'search' && (
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Find Student</h2>
            <p className="text-gray-500 mb-6">
              Search by student number or name to find returning students for re-registration.
            </p>

            <div className="flex gap-3 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Enter student number or name..."
                  className="pl-10"
                />
              </div>
              <Button
                onClick={handleSearch}
                disabled={isSearching || !searchTerm.trim()}
                leftIcon={isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              >
                Search
              </Button>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-700">
                  Found {searchResults.length} student(s)
                </h3>
                {searchResults.map((student) => (
                  <div
                    key={student.id}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{student.full_name}</p>
                        <p className="text-sm text-gray-500">
                          {student.student_number || 'No student number'}
                        </p>
                      </div>
                    </div>

                    {/* Program Enrollments */}
                    {student.program_enrollments && student.program_enrollments.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {student.program_enrollments.map((enrollment) => (
                          <div
                            key={enrollment.id}
                            className="flex items-center justify-between bg-gray-50 rounded-lg p-3"
                          >
                            <div className="flex items-center gap-3">
                              <GraduationCap className="w-5 h-5 text-indigo-600" />
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {enrollment.program?.name || 'Program'}
                                </p>
                                <p className="text-xs text-gray-500">
                                  Year {enrollment.current_year} of {enrollment.program?.duration_years || '?'} • {enrollment.status}
                                </p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSelectStudent(student, enrollment.id)}
                              rightIcon={<ChevronRight className="w-4 h-4" />}
                            >
                              Select
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {searchResults.length === 0 && searchTerm && !isSearching && (
              <div className="text-center py-8 text-gray-500">
                <UserPlus className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No students found with active program enrollments.</p>
                <p className="text-sm mt-1">
                  Only students enrolled in a multi-year program can be re-registered.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Verify Status */}
        {currentStep === 'verify' && selectedStudent && eligibility && (
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Verify Eligibility</h2>

            {/* Student Info */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-lg font-semibold text-blue-600">
                    {selectedStudent.full_name?.charAt(0) || 'S'}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">{selectedStudent.full_name}</p>
                  <p className="text-sm text-gray-500">{selectedStudent.student_number}</p>
                </div>
              </div>
            </div>

            {/* Eligibility Status */}
            <div
              className={`rounded-lg p-4 mb-6 ${
                eligibility.eligible
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              }`}
            >
              <div className="flex items-start gap-3">
                {eligibility.eligible ? (
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                )}
                <div>
                  <p
                    className={`font-medium ${
                      eligibility.eligible ? 'text-green-900' : 'text-red-900'
                    }`}
                  >
                    {eligibility.eligible
                      ? 'Eligible for Re-Registration'
                      : 'Not Eligible for Re-Registration'}
                  </p>
                  {eligibility.reason && (
                    <p
                      className={`text-sm mt-1 ${
                        eligibility.eligible ? 'text-green-700' : 'text-red-700'
                      }`}
                    >
                      {eligibility.reason}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Current Year</p>
                <p className="font-medium text-gray-900">Year {eligibility.currentYear}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Registering For</p>
                <p className="font-medium text-gray-900">Year {eligibility.nextYear}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Academic Year</p>
                <p className="font-medium text-gray-900">{currentAcademicYear?.name}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Outstanding Fees</p>
                <p className="font-medium text-gray-900">
                  {formatCurrency(eligibility.outstandingFees || 0)}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setCurrentStep('search')}>
                Back
              </Button>
              {eligibility.eligible && (
                <Button
                  onClick={handleProceedToCourses}
                  disabled={isLoadingCourses}
                  leftIcon={
                    isLoadingCourses ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )
                  }
                >
                  Proceed to Course Selection
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Course Selection */}
        {currentStep === 'courses' && eligibility && (
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Select Year {eligibility.nextYear} Courses
            </h2>

            {nextYearCourses.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No courses linked to Year {eligibility.nextYear}.</p>
                <p className="text-sm text-gray-400 mt-1">
                  Please link courses to the program first.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-3 mb-6">
                  {nextYearCourses.map((pc) => {
                    const course = pc.course
                    if (!course) return null

                    const isSelected = selectedCourses.includes(course.id)

                    return (
                      <div
                        key={pc.id}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleCourse(course.id, pc.is_compulsory)}
                            disabled={pc.is_compulsory}
                            className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 disabled:opacity-50"
                          />
                          <div className="ml-3 flex-1">
                            <p className="font-medium text-gray-900">
                              {course.course_code && (
                                <span className="text-gray-500">{course.course_code} - </span>
                              )}
                              {course.name}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span
                                className={`px-2 py-0.5 text-xs font-medium rounded ${
                                  pc.is_compulsory
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-gray-100 text-gray-600'
                                }`}
                              >
                                {pc.is_compulsory ? 'Core' : 'Elective'}
                              </span>
                              <span className="text-xs text-gray-500">
                                Semester {pc.semester}
                              </span>
                            </div>
                          </div>
                        </label>
                      </div>
                    )
                  })}
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setCurrentStep('verify')}>
                    Back
                  </Button>
                  <Button
                    onClick={() => setCurrentStep('confirm')}
                    disabled={selectedCourses.length === 0}
                    rightIcon={<ChevronRight className="w-4 h-4" />}
                  >
                    Continue ({selectedCourses.length} courses selected)
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 4: Confirm */}
        {currentStep === 'confirm' && selectedStudent && eligibility && (
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Confirm Re-Registration</h2>

            <div className="space-y-4 mb-6">
              {/* Summary */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-3">Registration Summary</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-blue-700">Student</p>
                    <p className="font-medium text-blue-900">{selectedStudent.full_name}</p>
                  </div>
                  <div>
                    <p className="text-blue-700">Student Number</p>
                    <p className="font-medium text-blue-900">{selectedStudent.student_number}</p>
                  </div>
                  <div>
                    <p className="text-blue-700">Year of Study</p>
                    <p className="font-medium text-blue-900">Year {eligibility.nextYear}</p>
                  </div>
                  <div>
                    <p className="text-blue-700">Academic Year</p>
                    <p className="font-medium text-blue-900">{currentAcademicYear?.name}</p>
                  </div>
                  <div>
                    <p className="text-blue-700">Courses Selected</p>
                    <p className="font-medium text-blue-900">{selectedCourses.length}</p>
                  </div>
                  <div>
                    <p className="text-blue-700">Registration Fee</p>
                    <p className="font-medium text-blue-900">{formatCurrency(registrationFee)}</p>
                  </div>
                </div>
              </div>

              {/* Courses List */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">Selected Courses</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  {nextYearCourses
                    .filter(pc => pc.course && selectedCourses.includes(pc.course.id))
                    .map(pc => (
                      <li key={pc.id} className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-600" />
                        {pc.course?.name}
                      </li>
                    ))}
                </ul>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setCurrentStep('courses')}>
                Back
              </Button>
              <Button
                onClick={handleConfirmRegistration}
                disabled={isProcessing}
                leftIcon={
                  isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )
                }
              >
                {isProcessing ? 'Processing...' : 'Complete Re-Registration'}
              </Button>
            </div>
          </div>
        )}

        {/* Step 5: Complete */}
        {currentStep === 'complete' && selectedStudent && eligibility && (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Re-Registration Complete!
            </h2>
            <p className="text-gray-500 mb-6">
              {selectedStudent.full_name} has been successfully registered for Year{' '}
              {eligibility.nextYear} in {currentAcademicYear?.name}.
            </p>

            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={resetWizard}>
                Register Another Student
              </Button>
              <Link href={`/dashboard/students/${selectedStudent.id}`}>
                <Button>View Student Profile</Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
