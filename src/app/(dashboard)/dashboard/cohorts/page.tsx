'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/input'
import Link from 'next/link'
import {
  Users,
  GraduationCap,
  Calendar,
  Loader2,
  Search,
  ChevronRight,
  Filter,
  TrendingUp,
  UserCheck,
  UserX,
  Clock,
  Award,
} from 'lucide-react'
import { Program, ProgramEnrollment } from '@/types/database'

interface CohortStats {
  total: number
  enrolled: number
  completed: number
  withdrawn: number
  deferred: number
  suspended: number
}

interface StudentWithEnrollment {
  id: string
  full_name: string
  student_number: string | null
  current_year_of_study: number
  status: string
  program_enrollment: ProgramEnrollment & {
    program?: { id: string; name: string; duration_years: number | null }
  }
}

export default function CohortsPage() {
  const { user } = useAuthStore()
  const [programs, setPrograms] = useState<Program[]>([])
  const [selectedProgram, setSelectedProgram] = useState<string>('')
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [students, setStudents] = useState<StudentWithEnrollment[]>([])
  const [stats, setStats] = useState<CohortStats>({
    total: 0,
    enrolled: 0,
    completed: 0,
    withdrawn: 0,
    deferred: 0,
    suspended: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingStudents, setIsLoadingStudents] = useState(false)

  // Available years (5 years back to 2 years forward)
  const currentYear = new Date().getFullYear()
  const availableYears = Array.from({ length: 8 }, (_, i) => currentYear - 5 + i)

  useEffect(() => {
    if (user?.institution_id) {
      fetchPrograms()
    }
  }, [user?.institution_id])

  useEffect(() => {
    if (user?.institution_id) {
      fetchCohortData()
    }
  }, [user?.institution_id, selectedProgram, selectedYear])

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
    setIsLoading(false)
  }

  async function fetchCohortData() {
    if (!user?.institution_id) return

    setIsLoadingStudents(true)
    const supabase = createClient()

    try {
      // Build query for program enrollments with students
      let query = supabase
        .from('program_enrollments')
        .select(`
          *,
          program:programs (id, name, duration_years),
          student:students (id, full_name, student_number, current_year_of_study, status)
        `)
        .eq('institution_id', user.institution_id)
        .eq('intake_year', selectedYear)

      if (selectedProgram) {
        query = query.eq('program_id', selectedProgram)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching cohort data:', error)
        return
      }

      // Process data
      const enrollments = (data || []) as Array<{
        id: string
        status: string
        student: { id: string; full_name: string; student_number: string | null; current_year_of_study: number | null; status: string } | null
        program: { id: string; name: string; duration_years: number | null } | null
        [key: string]: unknown
      }>

      // Calculate stats
      const newStats: CohortStats = {
        total: enrollments.length,
        enrolled: enrollments.filter((e) => e.status === 'enrolled').length,
        completed: enrollments.filter((e) => e.status === 'completed').length,
        withdrawn: enrollments.filter((e) => e.status === 'withdrawn').length,
        deferred: enrollments.filter((e) => e.status === 'deferred').length,
        suspended: enrollments.filter((e) => e.status === 'suspended').length,
      }
      setStats(newStats)

      // Transform to student list
      const studentList = enrollments
        .filter((e) => e.student)
        .map((e) => ({
          id: e.student!.id,
          full_name: e.student!.full_name,
          student_number: e.student!.student_number,
          current_year_of_study: e.student!.current_year_of_study || 1,
          status: e.student!.status,
          program_enrollment: {
            ...e,
            program: e.program,
          } as unknown as ProgramEnrollment & { program?: { id: string; name: string; duration_years: number | null } },
        }))

      setStudents(studentList)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setIsLoadingStudents(false)
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'enrolled':
        return 'bg-green-100 text-green-800'
      case 'completed':
        return 'bg-blue-100 text-blue-800'
      case 'withdrawn':
        return 'bg-red-100 text-red-800'
      case 'deferred':
        return 'bg-amber-100 text-amber-800'
      case 'suspended':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-600'
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 md:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Cohort Management</h1>
              <p className="mt-1 text-sm text-gray-500">
                Track and manage student cohorts by intake year and program
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-6 space-y-6">
        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-gray-400" />
            <h2 className="font-medium text-gray-900">Filter Cohort</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              label="Intake Year"
              value={selectedYear.toString()}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              options={availableYears.map((year) => ({
                value: year.toString(),
                label: `${year} Intake`,
              }))}
            />
            <Select
              label="Program"
              value={selectedProgram}
              onChange={(e) => setSelectedProgram(e.target.value)}
              options={[
                { value: '', label: 'All Programs' },
                ...programs.map((p) => ({ value: p.id, label: p.name })),
              ]}
            />
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedProgram('')
                  setSelectedYear(currentYear)
                }}
              >
                Reset Filters
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">{stats.total}</p>
              </div>
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Users className="w-5 h-5 text-indigo-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Enrolled</p>
                <p className="mt-1 text-2xl font-semibold text-green-600">{stats.enrolled}</p>
              </div>
              <div className="p-2 bg-green-100 rounded-lg">
                <UserCheck className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Completed</p>
                <p className="mt-1 text-2xl font-semibold text-blue-600">{stats.completed}</p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <Award className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Deferred</p>
                <p className="mt-1 text-2xl font-semibold text-amber-600">{stats.deferred}</p>
              </div>
              <div className="p-2 bg-amber-100 rounded-lg">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Suspended</p>
                <p className="mt-1 text-2xl font-semibold text-gray-600">{stats.suspended}</p>
              </div>
              <div className="p-2 bg-gray-100 rounded-lg">
                <Clock className="w-5 h-5 text-gray-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Withdrawn</p>
                <p className="mt-1 text-2xl font-semibold text-red-600">{stats.withdrawn}</p>
              </div>
              <div className="p-2 bg-red-100 rounded-lg">
                <UserX className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Cohort Progress Summary */}
        {stats.total > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-medium text-gray-900 mb-4">Cohort Progress</h2>
            <div className="h-4 bg-gray-100 rounded-full overflow-hidden flex">
              {stats.enrolled > 0 && (
                <div
                  className="h-full bg-green-500"
                  style={{ width: `${(stats.enrolled / stats.total) * 100}%` }}
                  title={`Enrolled: ${stats.enrolled}`}
                />
              )}
              {stats.completed > 0 && (
                <div
                  className="h-full bg-blue-500"
                  style={{ width: `${(stats.completed / stats.total) * 100}%` }}
                  title={`Completed: ${stats.completed}`}
                />
              )}
              {stats.deferred > 0 && (
                <div
                  className="h-full bg-amber-500"
                  style={{ width: `${(stats.deferred / stats.total) * 100}%` }}
                  title={`Deferred: ${stats.deferred}`}
                />
              )}
              {stats.suspended > 0 && (
                <div
                  className="h-full bg-gray-500"
                  style={{ width: `${(stats.suspended / stats.total) * 100}%` }}
                  title={`Suspended: ${stats.suspended}`}
                />
              )}
              {stats.withdrawn > 0 && (
                <div
                  className="h-full bg-red-500"
                  style={{ width: `${(stats.withdrawn / stats.total) * 100}%` }}
                  title={`Withdrawn: ${stats.withdrawn}`}
                />
              )}
            </div>
            <div className="flex flex-wrap gap-4 mt-3 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span>Enrolled ({Math.round((stats.enrolled / stats.total) * 100)}%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span>Completed ({Math.round((stats.completed / stats.total) * 100)}%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <span>Deferred ({Math.round((stats.deferred / stats.total) * 100)}%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-500" />
                <span>Suspended ({Math.round((stats.suspended / stats.total) * 100)}%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span>Withdrawn ({Math.round((stats.withdrawn / stats.total) * 100)}%)</span>
              </div>
            </div>
          </div>
        )}

        {/* Students List */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-medium text-gray-900">
              {selectedYear} Cohort Students
              {selectedProgram && programs.find((p) => p.id === selectedProgram) && (
                <span className="text-gray-500 font-normal">
                  {' '}
                  - {programs.find((p) => p.id === selectedProgram)?.name}
                </span>
              )}
            </h2>
          </div>

          {isLoadingStudents ? (
            <div className="p-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
              <p className="mt-2 text-sm text-gray-500">Loading students...</p>
            </div>
          ) : students.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No students found</h3>
              <p className="text-gray-500">
                No students enrolled in {selectedYear} for the selected criteria.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {students.map((student) => (
                <div
                  key={student.id}
                  className="p-4 flex items-center justify-between hover:bg-gray-50"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                      <span className="font-medium text-indigo-600">
                        {student.full_name?.charAt(0) || 'S'}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{student.full_name}</p>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span>{student.student_number || 'No number'}</span>
                        {student.program_enrollment?.program && (
                          <>
                            <span className="text-gray-300">|</span>
                            <span>{student.program_enrollment.program.name}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        Year {student.current_year_of_study}
                        {student.program_enrollment?.program?.duration_years && (
                          <span className="text-gray-500 font-normal">
                            /{student.program_enrollment.program.duration_years}
                          </span>
                        )}
                      </p>
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${getStatusColor(
                          student.program_enrollment?.status || 'enrolled'
                        )}`}
                      >
                        {student.program_enrollment?.status || 'enrolled'}
                      </span>
                    </div>
                    <Link href={`/dashboard/students/${student.id}`}>
                      <Button size="sm" variant="ghost">
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
