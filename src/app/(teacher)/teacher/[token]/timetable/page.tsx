'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Calendar, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Period {
  id: string
  name: string
  start_time: string
  end_time: string
  period_order: number
  period_type: string
}

interface TimetableEntry {
  id: string
  day_of_week: number
  room: string | null
  subject?: { name: string }
  class?: { name: string }
  period?: Period
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

export default function TeacherTimetablePage() {
  const params = useParams()
  const token = params.token as string
  const [isLoading, setIsLoading] = useState(true)
  const [periods, setPeriods] = useState<Period[]>([])
  const [entries, setEntries] = useState<TimetableEntry[]>([])
  const [teacherName, setTeacherName] = useState('')
  const [centerName, setCenterName] = useState('')

  useEffect(() => {
    if (token) {
      fetchTimetable()
    }
  }, [token])

  async function fetchTimetable() {
    setIsLoading(true)
    const supabase = createClient()

    // Get teacher data
    const { data: teacherData } = await supabase
      .from('lecturers')
      .select('full_name, center_id, institution:institutions(name)')
      .eq('id', token)
      .single()

    const teacher = teacherData as { full_name: string; center_id: string; center?: { name: string } } | null

    if (!teacher) {
      setIsLoading(false)
      return
    }

    setTeacherName(teacher.full_name)
    setCenterName(teacher.center?.name || '')

    // Get periods
    const { data: periodsData } = await supabase
      .from('timetable_periods')
      .select('id, name, start_time, end_time, period_order, period_type')
      .eq('institution_id', teacher.center_id)
      .eq('is_active', true)
      .order('period_order')

    setPeriods((periodsData || []) as Period[])

    // Get timetable entries for this teacher
    const { data: entriesData } = await supabase
      .from('timetable_entries')
      .select(`
        id, day_of_week, room,
        subject:subjects(name),
        class:classes(name),
        period:timetable_periods(id, name, start_time, end_time, period_order, period_type)
      `)
      .eq('teacher_id', token)
      .eq('is_active', true)

    setEntries((entriesData || []) as unknown as TimetableEntry[])
    setIsLoading(false)
  }

  function getEntry(dayOfWeek: number, periodId: string) {
    return entries.find(e => e.day_of_week === dayOfWeek && e.period?.id === periodId)
  }

  function handlePrint() {
    window.print()
  }

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-48"></div>
        <div className="h-96 bg-gray-200 rounded-xl"></div>
      </div>
    )
  }

  if (periods.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Timetable</h3>
        <p className="text-gray-500">Your timetable has not been set up yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">My Timetable</h2>
          <p className="text-gray-500 text-sm mt-1">Your weekly teaching schedule</p>
        </div>
        <Button
          variant="secondary"
          leftIcon={<Printer className="w-4 h-4" />}
          onClick={handlePrint}
          className="print:hidden"
        >
          Print
        </Button>
      </div>

      {/* Print Header */}
      <div className="hidden print:block text-center mb-6">
        <h1 className="text-2xl font-bold">{centerName}</h1>
        <p className="text-lg">{teacherName} - Weekly Timetable</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden print:border-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="p-3 text-left text-sm font-medium text-gray-500 border-b border-gray-200 w-28">
                  Time
                </th>
                {DAYS.map((day) => (
                  <th key={day} className="p-3 text-left text-sm font-medium text-gray-500 border-b border-gray-200">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {periods.map((period) => (
                <tr key={period.id} className={period.period_type !== 'class' ? 'bg-gray-50' : ''}>
                  <td className="p-3 border-b border-gray-100 text-sm">
                    <div className="font-medium text-gray-900">{period.name}</div>
                    <div className="text-gray-500 text-xs">
                      {period.start_time.slice(0, 5)} - {period.end_time.slice(0, 5)}
                    </div>
                  </td>
                  {DAYS.map((day, dayIdx) => {
                    const dayOfWeek = dayIdx + 1
                    const entry = getEntry(dayOfWeek, period.id)

                    if (period.period_type !== 'class') {
                      return (
                        <td key={day} className="p-3 border-b border-gray-100 text-center text-sm text-gray-400">
                          {period.period_type === 'break' && 'Break'}
                          {period.period_type === 'lunch' && 'Lunch'}
                          {period.period_type === 'assembly' && 'Assembly'}
                        </td>
                      )
                    }

                    return (
                      <td key={day} className="p-2 border-b border-gray-100">
                        {entry ? (
                          <div className="p-2 bg-blue-50 rounded-lg print:bg-transparent print:border print:border-gray-300">
                            <div className="font-medium text-blue-900 text-sm">
                              {entry.subject?.name}
                            </div>
                            <div className="text-xs text-blue-700">
                              {entry.class?.name}
                            </div>
                            {entry.room && (
                              <div className="text-xs text-blue-500">
                                Room: {entry.room}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-gray-300 text-sm text-center">-</div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
