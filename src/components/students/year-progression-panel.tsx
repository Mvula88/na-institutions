'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  GraduationCap,
  ChevronRight,
  CheckCircle,
  Clock,
  XCircle,
  Loader2,
  TrendingUp,
  Calendar,
  Award,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { ProgramEnrollment, ProgramYearRegistration, YearCompletionStatus } from '@/types/database'

interface Props {
  studentId: string
  canPromote?: boolean
  onUpdate?: () => void
}

interface ProgramEnrollmentWithDetails extends ProgramEnrollment {
  program?: {
    id: string
    name: string
    duration_years: number | null
    program_code: string | null
  }
  year_registrations?: ProgramYearRegistration[]
}

export default function YearProgressionPanel({ studentId, canPromote = false, onUpdate }: Props) {
  const [enrollments, setEnrollments] = useState<ProgramEnrollmentWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isPromoting, setIsPromoting] = useState(false)

  useEffect(() => {
    loadEnrollments()
  }, [studentId])

  async function loadEnrollments() {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('program_enrollments')
      .select(`
        *,
        program:programs (id, name, duration_years, program_code),
        year_registrations:program_year_registrations (*)
      `)
      .eq('student_id', studentId)
      .order('enrollment_date', { ascending: false })

    if (error) {
      console.error('Error loading enrollments:', error)
      return
    }

    setEnrollments(data as ProgramEnrollmentWithDetails[])
    setIsLoading(false)
  }

  async function handlePromote(enrollmentId: string, currentYear: number) {
    setIsPromoting(true)
    const supabase = createClient()

    try {
      const nextYear = currentYear + 1

      // Update program enrollment
      const { error: enrollmentError } = await supabase
        .from('program_enrollments')
        .update({
          current_year: nextYear,
          updated_at: new Date().toISOString(),
        } as never)
        .eq('id', enrollmentId)

      if (enrollmentError) throw enrollmentError

      // Update student's current year
      const { error: studentError } = await supabase
        .from('students')
        .update({
          current_year_of_study: nextYear,
          updated_at: new Date().toISOString(),
        } as never)
        .eq('id', studentId)

      if (studentError) throw studentError

      toast.success(`Student promoted to Year ${nextYear}`)
      loadEnrollments()
      onUpdate?.()
    } catch (error) {
      console.error('Error promoting student:', error)
      toast.error('Failed to promote student')
    } finally {
      setIsPromoting(false)
    }
  }

  async function handleUpdateYearStatus(registrationId: string, status: YearCompletionStatus) {
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('program_year_registrations')
        .update({
          year_status: status,
          completed_at: status === 'passed' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        } as never)
        .eq('id', registrationId)

      if (error) throw error

      toast.success(`Year status updated to ${status}`)
      loadEnrollments()
      onUpdate?.()
    } catch (error) {
      console.error('Error updating year status:', error)
      toast.error('Failed to update year status')
    }
  }

  function getStatusIcon(status: YearCompletionStatus) {
    switch (status) {
      case 'passed':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />
      case 'in_progress':
        return <Clock className="w-5 h-5 text-blue-600" />
      case 'incomplete':
        return <Clock className="w-5 h-5 text-amber-600" />
      case 'deferred':
        return <Clock className="w-5 h-5 text-gray-600" />
      default:
        return <Clock className="w-5 h-5 text-gray-400" />
    }
  }

  function getStatusColor(status: YearCompletionStatus) {
    switch (status) {
      case 'passed':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'incomplete':
        return 'bg-amber-100 text-amber-800 border-amber-200'
      case 'deferred':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200'
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      </div>
    )
  }

  if (enrollments.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <GraduationCap className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900">Program Enrollment</h3>
            <p className="text-sm text-gray-500">Year progression tracking</p>
          </div>
        </div>
        <p className="text-gray-500 text-sm text-center py-4">
          This student is not enrolled in any multi-year program.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {enrollments.map((enrollment) => {
        const maxYears = enrollment.program?.duration_years || 4
        const yearRegistrations = enrollment.year_registrations || []
        const sortedRegistrations = [...yearRegistrations].sort(
          (a, b) => a.year_of_study - b.year_of_study
        )
        const latestRegistration = sortedRegistrations[sortedRegistrations.length - 1]
        const canBePromoted =
          canPromote &&
          enrollment.status === 'enrolled' &&
          enrollment.current_year < maxYears &&
          latestRegistration?.year_status === 'passed'

        return (
          <div key={enrollment.id} className="bg-white rounded-xl border border-gray-200 p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <GraduationCap className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">
                    {enrollment.program?.name || 'Program'}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {enrollment.program?.program_code && `${enrollment.program.program_code} • `}
                    {maxYears} year program
                  </p>
                </div>
              </div>
              <span
                className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${
                  enrollment.status === 'enrolled'
                    ? 'bg-green-100 text-green-800'
                    : enrollment.status === 'completed'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {enrollment.status}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Progress</span>
                <span className="font-medium text-gray-900">
                  Year {enrollment.current_year} of {maxYears}
                </span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-500"
                  style={{
                    width: `${(enrollment.current_year / maxYears) * 100}%`,
                  }}
                />
              </div>
            </div>

            {/* Year Registrations Timeline */}
            <div className="space-y-3">
              {Array.from({ length: maxYears }, (_, i) => i + 1).map((year) => {
                const registration = sortedRegistrations.find((r) => r.year_of_study === year)
                const isCurrentYear = year === enrollment.current_year
                const isFutureYear = year > enrollment.current_year

                return (
                  <div
                    key={year}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      isCurrentYear
                        ? 'bg-blue-50 border-blue-200'
                        : isFutureYear
                        ? 'bg-gray-50 border-gray-200 opacity-50'
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    {/* Year Number */}
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-medium ${
                        registration?.year_status === 'passed'
                          ? 'bg-green-100 text-green-800'
                          : isCurrentYear
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {registration?.year_status === 'passed' ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        year
                      )}
                    </div>

                    {/* Year Info */}
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">Year {year}</p>
                      {registration && (
                        <div className="flex items-center gap-2 mt-0.5">
                          <span
                            className={`px-2 py-0.5 text-xs font-medium rounded border ${getStatusColor(
                              registration.year_status
                            )}`}
                          >
                            {registration.year_status.replace('_', ' ')}
                          </span>
                          {registration.year_average && (
                            <span className="text-xs text-gray-500">
                              Avg: {registration.year_average}%
                            </span>
                          )}
                        </div>
                      )}
                      {!registration && !isFutureYear && (
                        <span className="text-xs text-gray-500">Not registered</span>
                      )}
                      {isFutureYear && (
                        <span className="text-xs text-gray-400">Future year</span>
                      )}
                    </div>

                    {/* Actions */}
                    {canPromote && registration && isCurrentYear && (
                      <div className="flex items-center gap-2">
                        <select
                          value={registration.year_status}
                          onChange={(e) =>
                            handleUpdateYearStatus(registration.id, e.target.value as YearCompletionStatus)
                          }
                          className="text-sm border border-gray-300 rounded px-2 py-1 bg-white"
                        >
                          <option value="in_progress">In Progress</option>
                          <option value="passed">Passed</option>
                          <option value="failed">Failed</option>
                          <option value="incomplete">Incomplete</option>
                          <option value="deferred">Deferred</option>
                        </select>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Promotion Button */}
            {canBePromoted && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <Button
                  onClick={() => handlePromote(enrollment.id, enrollment.current_year)}
                  disabled={isPromoting}
                  leftIcon={
                    isPromoting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <TrendingUp className="w-4 h-4" />
                    )
                  }
                  className="w-full"
                >
                  {isPromoting
                    ? 'Promoting...'
                    : `Promote to Year ${enrollment.current_year + 1}`}
                </Button>
                <p className="text-xs text-gray-500 text-center mt-2">
                  The student has passed Year {enrollment.current_year} and can be promoted.
                </p>
              </div>
            )}

            {/* Not eligible for promotion message */}
            {canPromote &&
              enrollment.status === 'enrolled' &&
              enrollment.current_year < maxYears &&
              latestRegistration?.year_status !== 'passed' && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-amber-700 bg-amber-50 p-3 rounded-lg">
                    Student must pass Year {enrollment.current_year} before being promoted to Year{' '}
                    {enrollment.current_year + 1}.
                  </p>
                </div>
              )}

            {/* Completed message */}
            {enrollment.status === 'completed' ||
              (enrollment.current_year >= maxYears && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                    <Award className="w-6 h-6 text-green-600" />
                    <div>
                      <p className="font-medium text-green-900">Program Completed</p>
                      <p className="text-sm text-green-700">
                        This student has completed all {maxYears} years of the program.
                      </p>
                    </div>
                  </div>
                </div>
              ))}

            {/* Metadata */}
            <div className="mt-4 pt-4 border-t border-gray-200 flex gap-4 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>Enrolled: {new Date(enrollment.enrollment_date).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-1">
                <GraduationCap className="w-3 h-3" />
                <span>Cohort: {enrollment.cohort_name || `${enrollment.intake_year} Intake`}</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
