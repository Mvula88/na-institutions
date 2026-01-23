'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Printer, Loader2, FileText, Download } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  generateTranscript,
  StudentTranscript,
  getGradeLetter,
  formatPercentage,
} from '@/lib/transcript-utils'

// Grade description matching UNAM format
function getGradeDescriptionNamibian(grade: string): string {
  switch (grade) {
    case 'A':
      return 'DISTINCTION'
    case 'B':
      return 'VERY GOOD'
    case 'C':
      return 'GOOD'
    case 'D':
      return 'SATISFACTORY'
    case 'E':
      return 'FAIL'
    case 'F':
      return 'FAIL'
    default:
      return ''
  }
}

// Get annual result text based on year status and year number
function getAnnualResultText(
  yearStatus: string,
  yearNumber: number,
  totalYears: number,
  programName?: string
): string {
  if (yearStatus === 'passed') {
    if (yearNumber === totalYears) {
      return 'OBTAIN QUALIFICATION'
    }
    if (yearNumber === 1) return 'PASS'
    if (yearNumber === 2) return 'PASS SECOND YEAR'
    if (yearNumber === 3) return 'PASS THIRD YEAR'
    return `PASS YEAR ${yearNumber}`
  }
  if (yearStatus === 'failed') return 'FAIL'
  if (yearStatus === 'incomplete') return 'INCOMPLETE'
  if (yearStatus === 'deferred') return 'DEFERRED'
  return 'IN PROGRESS'
}

interface Institution {
  id: string
  name: string
  address?: string
  phone?: string
  email?: string
  logo_url?: string
}

export default function TranscriptPage() {
  const params = useParams()
  const printRef = useRef<HTMLDivElement>(null)
  const studentId = params.id as string

  const [transcript, setTranscript] = useState<StudentTranscript | null>(null)
  const [institution, setInstitution] = useState<Institution | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (studentId) {
      loadTranscript()
    }
  }, [studentId])

  async function loadTranscript() {
    setIsLoading(true)
    const supabase = createClient()

    // Load transcript data
    const data = await generateTranscript(studentId)
    setTranscript(data)

    // Load institution info
    if (data?.student) {
      const { data: instData } = await supabase
        .from('institutions')
        .select('id, name, address, phone, email, logo_url')
        .eq('id', data.student.institution_id)
        .single()

      if (instData) {
        setInstitution(instData as Institution)
      }
    }

    setIsLoading(false)
  }

  function handlePrint() {
    window.print()
  }

  function formatDate(dateString: string | null | undefined): string {
    if (!dateString) return '-'
    const date = new Date(dateString)
    const day = date.getDate().toString().padStart(2, '0')
    const months = [
      'JAN',
      'FEB',
      'MAR',
      'APR',
      'MAY',
      'JUN',
      'JUL',
      'AUG',
      'SEP',
      'OCT',
      'NOV',
      'DEC',
    ]
    const month = months[date.getMonth()]
    const year = date.getFullYear()
    return `${day}-${month}-${year}`
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto" />
          <p className="mt-2 text-gray-500">Generating transcript...</p>
        </div>
      </div>
    )
  }

  if (!transcript) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <Link
          href={`/dashboard/students/${studentId}`}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Student
        </Link>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-8 text-center">
          <FileText className="w-12 h-12 text-amber-600 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-amber-900 mb-2">No Transcript Available</h2>
          <p className="text-amber-700">
            This student is not enrolled in a multi-year program or has no academic records.
          </p>
        </div>
      </div>
    )
  }

  const totalYears = transcript.program?.duration_years || 1

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header - Hide on print */}
      <div className="print:hidden bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 md:px-8 py-4">
          <div className="flex items-center justify-between max-w-5xl mx-auto">
            <div className="flex items-center gap-4">
              <Link
                href={`/dashboard/students/${studentId}`}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Academic Record</h1>
                <p className="text-sm text-gray-500">{transcript.student.full_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handlePrint} leftIcon={<Printer className="w-4 h-4" />}>
                Print
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Transcript Content - A4 paper style */}
      <div className="px-4 md:px-8 py-6 print:p-0 print:m-0" ref={printRef}>
        <div className="max-w-[210mm] mx-auto bg-white shadow-lg print:shadow-none print:max-w-none">
          {/* Each page */}
          <div className="p-8 md:p-12 print:p-[15mm] min-h-[297mm] print:min-h-0 relative transcript-page">
            {/* Institution Header */}
            <div className="border-b-2 border-gray-800 pb-4 mb-6">
              <div className="flex justify-between items-start">
                <div className="flex items-start gap-4">
                  {/* Logo placeholder */}
                  <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center print:bg-gray-100 flex-shrink-0">
                    {institution?.logo_url ? (
                      <img
                        src={institution.logo_url}
                        alt="Logo"
                        className="w-full h-full object-contain rounded-lg"
                      />
                    ) : (
                      <span className="text-xs text-gray-500 text-center">LOGO</span>
                    )}
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-gray-900 uppercase tracking-wide">
                      {institution?.name || 'Institution Name'}
                    </h1>
                    {institution?.address && (
                      <p className="text-sm text-gray-600">{institution.address}</p>
                    )}
                    <div className="text-sm text-gray-600">
                      {institution?.phone && <span>Tel: {institution.phone}</span>}
                      {institution?.email && <span className="ml-4">Email: {institution.email}</span>}
                    </div>
                  </div>
                </div>
                {/* Stamp area placeholder for print */}
                <div className="w-24 h-24 border border-dashed border-gray-300 rounded-lg flex items-center justify-center print:border-gray-400">
                  <span className="text-[10px] text-gray-400 text-center">OFFICIAL<br />STAMP</span>
                </div>
              </div>
            </div>

            {/* Document Title */}
            <div className="text-center mb-8">
              <h2 className="text-xl font-bold tracking-widest text-gray-900">
                ACADEMIC RECORD/TRANSCRIPT
              </h2>
            </div>

            {/* Student Information */}
            <div className="mb-6 font-mono text-sm">
              <div className="grid grid-cols-[160px_1fr] gap-y-1">
                <span className="text-gray-700">Surname &amp; Name</span>
                <span className="font-medium">: {transcript.student.full_name?.toUpperCase()}</span>

                <span className="text-gray-700">Student Number</span>
                <span className="font-medium">: {transcript.student.student_number || '-'}</span>

                <span className="text-gray-700">Identity Number</span>
                <span className="font-medium">: {transcript.student.id_number || '-'}</span>

                <span className="text-gray-700">Date of Birth</span>
                <span className="font-medium">: {formatDate(transcript.student.date_of_birth)}</span>
              </div>
            </div>

            {/* Year by Year Results */}
            {transcript.years.map((year, yearIndex) => (
              <div key={year.year_of_study} className="mb-6">
                {/* Dashed separator */}
                <div className="border-t border-dashed border-gray-400 my-4"></div>

                {/* Year Header */}
                <div className="font-mono text-sm mb-3">
                  <div className="grid grid-cols-[160px_1fr] gap-y-1">
                    <span className="text-gray-700">Academic Year</span>
                    <span className="font-medium">: {year.academic_year?.name || year.year_of_study}</span>

                    <span className="text-gray-700">Qualification</span>
                    <span className="font-medium">
                      : {transcript.program?.name?.toUpperCase() || '-'}
                    </span>
                  </div>
                </div>

                {/* Semester 1 Courses */}
                {year.courses.filter((c) => c.semester === 1).length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-gray-500 mb-2 uppercase">Semester 1</p>
                    <div className="font-mono text-sm space-y-1">
                      {year.courses
                        .filter((c) => c.semester === 1)
                        .map((course) => (
                          <div key={course.id} className="flex">
                            <span className="w-20 text-gray-600 flex-shrink-0">
                              {course.course_code || '-'}
                            </span>
                            <span className="flex-1 text-gray-900 uppercase">
                              {course.course_name}
                            </span>
                            <span className="w-12 text-right text-gray-900">
                              {course.final_percentage !== null
                                ? Math.round(course.final_percentage)
                                : '-'}
                            </span>
                            <span className="w-8 text-center text-gray-900">
                              {course.final_grade || '-'}
                            </span>
                            <span className="w-4 text-center text-gray-500">-</span>
                            <span className="w-32 text-gray-700">
                              {course.final_grade
                                ? getGradeDescriptionNamibian(course.final_grade)
                                : ''}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Semester 2 Courses */}
                {year.courses.filter((c) => c.semester === 2).length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-gray-500 mb-2 uppercase">Semester 2</p>
                    <div className="font-mono text-sm space-y-1">
                      {year.courses
                        .filter((c) => c.semester === 2)
                        .map((course) => (
                          <div key={course.id} className="flex">
                            <span className="w-20 text-gray-600 flex-shrink-0">
                              {course.course_code || '-'}
                            </span>
                            <span className="flex-1 text-gray-900 uppercase">
                              {course.course_name}
                            </span>
                            <span className="w-12 text-right text-gray-900">
                              {course.final_percentage !== null
                                ? Math.round(course.final_percentage)
                                : '-'}
                            </span>
                            <span className="w-8 text-center text-gray-900">
                              {course.final_grade || '-'}
                            </span>
                            <span className="w-4 text-center text-gray-500">-</span>
                            <span className="w-32 text-gray-700">
                              {course.final_grade
                                ? getGradeDescriptionNamibian(course.final_grade)
                                : ''}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Courses without semester (fallback) */}
                {year.courses.filter((c) => c.semester !== 1 && c.semester !== 2).length > 0 && (
                  <div className="mb-3">
                    <div className="font-mono text-sm space-y-1">
                      {year.courses
                        .filter((c) => c.semester !== 1 && c.semester !== 2)
                        .map((course) => (
                          <div key={course.id} className="flex">
                            <span className="w-20 text-gray-600 flex-shrink-0">
                              {course.course_code || '-'}
                            </span>
                            <span className="flex-1 text-gray-900 uppercase">
                              {course.course_name}
                            </span>
                            <span className="w-12 text-right text-gray-900">
                              {course.final_percentage !== null
                                ? Math.round(course.final_percentage)
                                : '-'}
                            </span>
                            <span className="w-8 text-center text-gray-900">
                              {course.final_grade || '-'}
                            </span>
                            <span className="w-4 text-center text-gray-500">-</span>
                            <span className="w-32 text-gray-700">
                              {course.final_grade
                                ? getGradeDescriptionNamibian(course.final_grade)
                                : ''}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* No courses message */}
                {year.courses.length === 0 && (
                  <p className="text-sm text-gray-500 italic">No courses enrolled for this year</p>
                )}

                {/* Annual Result */}
                <div className="font-mono text-sm mt-4">
                  <span className="text-gray-700">Annual results for {year.academic_year?.year || year.year_of_study} - </span>
                  <span className="font-bold text-gray-900">
                    {getAnnualResultText(
                      year.year_status,
                      year.year_of_study,
                      totalYears,
                      transcript.program?.name
                    )}
                  </span>
                </div>
              </div>
            ))}

            {/* Completion Statement (if graduated) */}
            {transcript.completion_status === 'completed' && (
              <div className="mt-6 font-mono text-sm">
                <div className="border-t border-dashed border-gray-400 my-4"></div>
                <p>
                  This student qualified for
                  <br />
                  <span className="font-bold">{transcript.program?.name?.toUpperCase()}</span>
                  <br />
                  {transcript.program_enrollment?.actual_completion_date && (
                    <>on {formatDate(transcript.program_enrollment.actual_completion_date)}.</>
                  )}
                </p>
              </div>
            )}

            {/* Declaration */}
            <div className="mt-8 font-mono text-sm">
              <div className="border-t border-dashed border-gray-400 my-4"></div>
              <p className="leading-relaxed">
                I hereby declare that
                <br />
                <span className="font-bold">{transcript.student.full_name?.toUpperCase()}</span>
                <br />
                was a registered student at this institution during the above mentioned years and that
                his / her conduct was satisfactory.
              </p>
            </div>

            {/* Signature Area */}
            <div className="mt-8 flex justify-between items-end">
              <div>
                <div className="w-48 border-t border-gray-800 pt-1">
                  <p className="text-xs text-gray-600">Authorized Signature</p>
                </div>
                <p className="text-xs text-gray-500 mt-2">{formatDate(new Date().toISOString())}</p>
              </div>
              <div className="w-24 h-24 border border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                <span className="text-[10px] text-gray-400 text-center">
                  OFFICE
                  <br />
                  STAMP
                </span>
              </div>
            </div>

            {/* Grading Scale */}
            <div className="mt-8 border-t border-gray-200 pt-4">
              <h3 className="text-xs font-semibold text-gray-700 mb-2">Grading Scale</h3>
              <div className="font-mono text-xs">
                <div className="grid grid-cols-3 gap-1 max-w-md">
                  <span className="font-semibold">Grade</span>
                  <span className="font-semibold">Interpretation</span>
                  <span className="font-semibold">% Equivalence</span>

                  <span>A</span>
                  <span>Distinction</span>
                  <span>80 and above</span>

                  <span>B</span>
                  <span>Very Good</span>
                  <span>70 - 79</span>

                  <span>C</span>
                  <span>Good</span>
                  <span>60 - 69</span>

                  <span>D</span>
                  <span>Satisfactory</span>
                  <span>50 - 59</span>

                  <span>E</span>
                  <span>Fail</span>
                  <span>49 and below</span>
                </div>
              </div>
            </div>

            {/* Page Footer */}
            <div className="absolute bottom-8 left-8 right-8 print:bottom-[15mm] print:left-[15mm] print:right-[15mm]">
              <div className="flex justify-between items-center text-xs text-gray-500 border-t border-gray-200 pt-2">
                <span>Generated: {new Date().toLocaleDateString()}</span>
                <span>Page 1</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }

          html,
          body {
            width: 210mm;
            height: 297mm;
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .print\\:hidden {
            display: none !important;
          }

          .transcript-page {
            page-break-after: always;
            page-break-inside: avoid;
          }

          .transcript-page:last-child {
            page-break-after: auto;
          }
        }

        @media screen {
          .transcript-page {
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
          }
        }
      `}</style>
    </div>
  )
}
