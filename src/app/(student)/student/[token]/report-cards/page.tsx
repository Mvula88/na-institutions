'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { FileText, Award, ChevronDown, ChevronUp, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ReportCard {
  id: string
  average_percentage: number | null
  overall_grade: string | null
  class_rank: number | null
  class_teacher_comment: string | null
  principal_comment: string | null
  days_present: number
  days_absent: number
  days_late: number
  status: string
  generated_at: string
  report_period?: {
    name: string
    academic_year: string | null
  }
  class?: {
    name: string
  }
}

interface ReportCardSubject {
  id: string
  marks_obtained: number | null
  max_marks: number | null
  percentage: number | null
  grade: string | null
  teacher_comment: string | null
  subject?: {
    name: string
    code: string | null
  }
}

export default function StudentReportCardsPage() {
  const params = useParams()
  const token = params.token as string
  const [isLoading, setIsLoading] = useState(true)
  const [reportCards, setReportCards] = useState<ReportCard[]>([])
  const [expandedCard, setExpandedCard] = useState<string | null>(null)
  const [cardSubjects, setCardSubjects] = useState<Record<string, ReportCardSubject[]>>({})
  const [loadingSubjects, setLoadingSubjects] = useState<string | null>(null)

  useEffect(() => {
    if (token) {
      fetchReportCards()
    }
  }, [token])

  async function fetchReportCards() {
    setIsLoading(true)
    const supabase = createClient()

    const { data } = await supabase
      .from('student_report_cards')
      .select(`
        id, average_percentage, overall_grade, class_rank,
        class_teacher_comment, principal_comment,
        days_present, days_absent, days_late,
        status, generated_at,
        report_period:report_periods(name, academic_year),
        class:classes(name)
      `)
      .eq('student_id', token)
      .eq('status', 'published')
      .order('generated_at', { ascending: false })

    setReportCards((data || []) as unknown as ReportCard[])
    setIsLoading(false)
  }

  async function toggleCard(cardId: string) {
    if (expandedCard === cardId) {
      setExpandedCard(null)
      return
    }

    setExpandedCard(cardId)

    // Fetch subjects if not already loaded
    if (!cardSubjects[cardId]) {
      setLoadingSubjects(cardId)
      const supabase = createClient()

      const { data } = await supabase
        .from('report_card_subjects')
        .select(`
          id, marks_obtained, max_marks, percentage, grade, teacher_comment,
          subject:subjects(name, code)
        `)
        .eq('report_card_id', cardId)
        .order('subject(name)')

      setCardSubjects(prev => ({
        ...prev,
        [cardId]: (data || []) as unknown as ReportCardSubject[]
      }))
      setLoadingSubjects(null)
    }
  }

  function handlePrint(card: ReportCard) {
    // Open print-friendly view in new window
    const subjects = cardSubjects[card.id] || []

    const subjectRows = subjects.map(s => `
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd;">${s.subject?.name || ''}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${s.marks_obtained || '-'}/${s.max_marks || '-'}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${s.percentage?.toFixed(1) || '-'}%</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center; font-weight: bold;">${s.grade || '-'}</td>
      </tr>
    `).join('')

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Report Card - ${card.report_period?.name || ''}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 30px; }
          .header h1 { margin: 0; }
          .summary { display: flex; justify-content: space-around; margin: 20px 0; padding: 15px; background: #f5f5f5; border-radius: 8px; }
          .summary-item { text-align: center; }
          .summary-value { font-size: 24px; font-weight: bold; color: #1E40AF; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th { background: #f5f5f5; padding: 10px; border: 1px solid #ddd; text-align: left; }
          .comments { margin-top: 30px; }
          .comment-box { background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 10px 0; }
          .attendance { margin-top: 20px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Student Report Card</h1>
          <p><strong>${card.report_period?.name || ''}</strong> ${card.report_period?.academic_year ? `(${card.report_period.academic_year})` : ''}</p>
          <p>${card.class?.name || ''}</p>
        </div>

        <div class="summary">
          <div class="summary-item">
            <div class="summary-value">${card.average_percentage?.toFixed(1) || '-'}%</div>
            <div>Average</div>
          </div>
          <div class="summary-item">
            <div class="summary-value">${card.overall_grade || '-'}</div>
            <div>Grade</div>
          </div>
          <div class="summary-item">
            <div class="summary-value">${card.class_rank || '-'}</div>
            <div>Class Rank</div>
          </div>
        </div>

        <h3>Subject Results</h3>
        <table>
          <thead>
            <tr>
              <th>Subject</th>
              <th style="text-align: center;">Marks</th>
              <th style="text-align: center;">Percentage</th>
              <th style="text-align: center;">Grade</th>
            </tr>
          </thead>
          <tbody>
            ${subjectRows}
          </tbody>
        </table>

        <div class="attendance">
          <h3>Attendance Summary</h3>
          <p>Days Present: ${card.days_present} | Days Absent: ${card.days_absent} | Days Late: ${card.days_late}</p>
        </div>

        ${card.class_teacher_comment ? `
          <div class="comments">
            <h3>Class Teacher's Comment</h3>
            <div class="comment-box">${card.class_teacher_comment}</div>
          </div>
        ` : ''}

        ${card.principal_comment ? `
          <div class="comments">
            <h3>Principal's Comment</h3>
            <div class="comment-box">${card.principal_comment}</div>
          </div>
        ` : ''}

        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `

    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(html)
      printWindow.document.close()
    }
  }

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
        ))}
      </div>
    )
  }

  if (reportCards.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Report Cards</h3>
        <p className="text-gray-500">Your report cards will appear here when published.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Report Cards</h2>
        <p className="text-gray-500 text-sm mt-1">View your academic performance</p>
      </div>

      <div className="space-y-4">
        {reportCards.map((card) => (
          <div key={card.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <button
              onClick={() => toggleCard(card.id)}
              className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Award className="w-6 h-6 text-blue-600" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-900">{card.report_period?.name}</p>
                  <p className="text-sm text-gray-500">
                    {card.class?.name}
                    {card.report_period?.academic_year && ` • ${card.report_period.academic_year}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {card.average_percentage?.toFixed(0) || '-'}%
                  </p>
                  <p className="text-xs text-gray-500">Average</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{card.overall_grade || '-'}</p>
                  <p className="text-xs text-gray-500">Grade</p>
                </div>
                {expandedCard === card.id ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </div>
            </button>

            {expandedCard === card.id && (
              <div className="border-t border-gray-100 p-6">
                {loadingSubjects === card.id ? (
                  <div className="animate-pulse space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-10 bg-gray-100 rounded"></div>
                    ))}
                  </div>
                ) : (
                  <>
                    {/* Subject Results */}
                    <div className="mb-6">
                      <h4 className="font-medium text-gray-900 mb-3">Subject Results</h4>
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="p-3 text-left text-sm font-medium text-gray-500">Subject</th>
                              <th className="p-3 text-center text-sm font-medium text-gray-500">Marks</th>
                              <th className="p-3 text-center text-sm font-medium text-gray-500">%</th>
                              <th className="p-3 text-center text-sm font-medium text-gray-500">Grade</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {(cardSubjects[card.id] || []).map((subject) => (
                              <tr key={subject.id}>
                                <td className="p-3 text-gray-900">{subject.subject?.name}</td>
                                <td className="p-3 text-center text-gray-600">
                                  {subject.marks_obtained || '-'}/{subject.max_marks || '-'}
                                </td>
                                <td className="p-3 text-center text-gray-600">
                                  {subject.percentage?.toFixed(1) || '-'}%
                                </td>
                                <td className="p-3 text-center font-semibold text-blue-600">
                                  {subject.grade || '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Attendance */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="bg-green-50 p-4 rounded-lg text-center">
                        <p className="text-xl font-bold text-green-700">{card.days_present}</p>
                        <p className="text-sm text-green-600">Days Present</p>
                      </div>
                      <div className="bg-red-50 p-4 rounded-lg text-center">
                        <p className="text-xl font-bold text-red-700">{card.days_absent}</p>
                        <p className="text-sm text-red-600">Days Absent</p>
                      </div>
                      <div className="bg-amber-50 p-4 rounded-lg text-center">
                        <p className="text-xl font-bold text-amber-700">{card.days_late}</p>
                        <p className="text-sm text-amber-600">Days Late</p>
                      </div>
                    </div>

                    {/* Comments */}
                    {(card.class_teacher_comment || card.principal_comment) && (
                      <div className="space-y-4">
                        {card.class_teacher_comment && (
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">Class Teacher's Comment</h4>
                            <p className="text-gray-600 bg-gray-50 p-3 rounded-lg">
                              {card.class_teacher_comment}
                            </p>
                          </div>
                        )}
                        {card.principal_comment && (
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">Principal's Comment</h4>
                            <p className="text-gray-600 bg-gray-50 p-3 rounded-lg">
                              {card.principal_comment}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Print Button */}
                    <div className="mt-6 pt-4 border-t border-gray-100">
                      <Button
                        variant="secondary"
                        leftIcon={<Printer className="w-4 h-4" />}
                        onClick={() => handlePrint(card)}
                      >
                        Print Report Card
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
