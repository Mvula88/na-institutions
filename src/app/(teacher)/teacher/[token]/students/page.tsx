'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Select } from '@/components/ui/input'
import { Users, Search, Mail, Phone } from 'lucide-react'

interface Class {
  id: string
  name: string
}

interface Student {
  id: string
  full_name: string
  student_number: string | null
  email: string | null
  phone: string | null
  parent_name: string | null
  parent_phone: string | null
  grade: string | null
}

export default function TeacherStudentsPage() {
  const params = useParams()
  const token = params.token as string
  const [isLoading, setIsLoading] = useState(true)
  const [classes, setClasses] = useState<Class[]>([])
  const [selectedClassId, setSelectedClassId] = useState('')
  const [students, setStudents] = useState<Student[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (token) {
      fetchClasses()
    }
  }, [token])

  useEffect(() => {
    if (selectedClassId) {
      fetchStudents()
    }
  }, [selectedClassId])

  async function fetchClasses() {
    setIsLoading(true)
    const supabase = createClient()

    // Get classes assigned to this teacher
    const { data: entriesData } = await supabase
      .from('timetable_entries')
      .select('class:classes(id, name)')
      .eq('teacher_id', token)
      .eq('is_active', true)

    const entries = (entriesData || []) as { class: { id: string; name: string } | null }[]
    if (entries.length > 0) {
      const uniqueClasses = new Map()
      for (const entry of entries) {
        const cls = entry.class
        if (cls && !uniqueClasses.has(cls.id)) {
          uniqueClasses.set(cls.id, cls)
        }
      }
      const classList = Array.from(uniqueClasses.values())
      setClasses(classList)

      if (classList.length > 0) {
        setSelectedClassId(classList[0].id)
      }
    }
    setIsLoading(false)
  }

  async function fetchStudents() {
    if (!selectedClassId) return
    setIsLoading(true)
    const supabase = createClient()

    const { data } = await supabase
      .from('students')
      .select('id, full_name, student_number, email, phone, parent_name, parent_phone, grade')
      .eq('class_id', selectedClassId)
      .eq('status', 'active')
      .order('full_name')

    setStudents((data || []) as Student[])
    setIsLoading(false)
  }

  const filteredStudents = students.filter(s =>
    s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.student_number?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">My Students</h2>
        <p className="text-gray-500 text-sm mt-1">View students in your classes</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="w-64">
            <Select
              label="Class"
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              options={classes.map(c => ({ value: c.id, label: c.name }))}
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or student number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Students List */}
      <div className="bg-white rounded-xl border border-gray-200">
        {isLoading ? (
          <div className="p-8 animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded"></div>
            ))}
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Students</h3>
            <p className="text-gray-500">
              {searchQuery ? 'No students match your search' : 'No students in this class'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredStudents.map((student) => (
              <div key={student.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">
                      {student.full_name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{student.full_name}</p>
                      <p className="text-sm text-gray-500">
                        {student.student_number || 'No ID'}
                        {student.grade && ` • ${student.grade}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    {student.phone && (
                      <div className="flex items-center gap-2 text-gray-500 justify-end">
                        <Phone className="w-4 h-4" />
                        {student.phone}
                      </div>
                    )}
                    {student.email && (
                      <div className="flex items-center gap-2 text-gray-500 justify-end mt-1">
                        <Mail className="w-4 h-4" />
                        {student.email}
                      </div>
                    )}
                  </div>
                </div>
                {student.parent_name && (
                  <div className="mt-3 pl-16 text-sm">
                    <span className="text-gray-500">Parent: </span>
                    <span className="text-gray-700">{student.parent_name}</span>
                    {student.parent_phone && (
                      <span className="text-gray-500 ml-2">({student.parent_phone})</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Summary */}
        {!isLoading && filteredStudents.length > 0 && (
          <div className="p-4 border-t border-gray-100 bg-gray-50">
            <p className="text-sm text-gray-500">
              Showing {filteredStudents.length} of {students.length} students
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
