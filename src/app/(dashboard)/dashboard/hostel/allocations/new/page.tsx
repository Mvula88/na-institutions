'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/input'
import { ArrowLeft, Save, Search, User, DoorOpen, Users } from 'lucide-react'
import toast from 'react-hot-toast'

interface Student {
  id: string
  full_name: string
  student_number: string | null
  gender: string | null
}

interface Room {
  id: string
  room_number: string
  room_type: string
  capacity: number
  current_occupancy: number
  monthly_fee: number
  block: {
    id: string
    name: string
    gender_restriction: string | null
  } | null
}

export default function NewAllocationPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [students, setStudents] = useState<Student[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showStudentSearch, setShowStudentSearch] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)

  const [formData, setFormData] = useState({
    student_id: '',
    room_id: '',
    check_in_date: new Date().toISOString().split('T')[0],
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (user?.institution_id) {
      fetchStudents()
      fetchAvailableRooms()
    }
  }, [user?.institution_id])

  async function fetchStudents() {
    if (!user?.institution_id) return

    const supabase = createClient()

    // Get students who are not currently allocated
    const { data: allocatedStudentIds } = await supabase
      .from('hostel_allocations')
      .select('student_id')
      .eq('institution_id', user.institution_id)
      .eq('status', 'checked_in')

    const allocatedIds = (allocatedStudentIds || []).map((a: { student_id: string }) => a.student_id)

    let query = supabase
      .from('students')
      .select('id, full_name, student_number, gender')
      .eq('institution_id', user.institution_id)
      .eq('status', 'active')
      .order('full_name')

    if (allocatedIds.length > 0) {
      query = query.not('id', 'in', `(${allocatedIds.join(',')})`)
    }

    const { data } = await query

    setStudents((data || []) as Student[])
  }

  async function fetchAvailableRooms() {
    if (!user?.institution_id) return

    const supabase = createClient()
    const { data } = await supabase
      .from('hostel_rooms')
      .select(`
        id, room_number, room_type, capacity, current_occupancy, monthly_fee,
        block:hostel_blocks(id, name, gender_restriction)
      `)
      .eq('institution_id', user.institution_id)
      .eq('is_active', true)
      .order('room_number')

    // Filter to only show rooms with available spaces
    const availableRooms = ((data || []) as Room[]).filter(
      r => r.current_occupancy < r.capacity
    )

    setRooms(availableRooms)
  }

  function handleSelectStudent(student: Student) {
    setSelectedStudent(student)
    setFormData((prev) => ({ ...prev, student_id: student.id }))
    setShowStudentSearch(false)
    setSearchQuery('')

    // Reset room selection if gender doesn't match
    if (selectedRoom && selectedRoom.block?.gender_restriction) {
      if (student.gender !== selectedRoom.block.gender_restriction) {
        setSelectedRoom(null)
        setFormData((prev) => ({ ...prev, room_id: '' }))
        toast.error('Previously selected room has gender restriction. Please select a different room.')
      }
    }
  }

  function handleSelectRoom(roomId: string) {
    const room = rooms.find(r => r.id === roomId)
    if (!room) return

    // Check gender restriction
    if (selectedStudent && room.block?.gender_restriction) {
      if (selectedStudent.gender !== room.block.gender_restriction) {
        toast.error(`This room is restricted to ${room.block.gender_restriction} students only`)
        return
      }
    }

    setSelectedRoom(room)
    setFormData((prev) => ({ ...prev, room_id: roomId }))
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))

    if (name === 'room_id') {
      handleSelectRoom(value)
    }

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  function validateForm() {
    const newErrors: Record<string, string> = {}

    if (!formData.student_id) newErrors.student_id = 'Please select a student'
    if (!formData.room_id) newErrors.room_id = 'Please select a room'
    if (!formData.check_in_date) newErrors.check_in_date = 'Check-in date is required'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!validateForm()) return
    if (!user?.institution_id) {
      toast.error('No center selected')
      return
    }

    setIsLoading(true)
    const supabase = createClient()

    try {
      // Use atomic RPC function to prevent race conditions
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)('allocate_student_to_room', {
        p_institution_id: user.institution_id,
        p_student_id: formData.student_id,
        p_room_id: formData.room_id,
        p_check_in_date: formData.check_in_date,
      })

      if (error) throw error

      const result = data as { success: boolean; error?: string; allocation_id?: string }

      if (!result.success) {
        toast.error(result.error || 'Failed to allocate student')
        return
      }

      toast.success('Student allocated successfully!')
      router.push('/dashboard/hostel/allocations')
    } catch (error) {
      console.error('Error creating allocation:', error)
      // Fallback to non-atomic approach if RPC doesn't exist yet
      try {
        const insertData = {
          institution_id: user.institution_id,
          student_id: formData.student_id,
          room_id: formData.room_id,
          check_in_date: formData.check_in_date,
          status: 'checked_in',
        }

        const { error: allocationError } = await supabase
          .from('hostel_allocations')
          .insert(insertData as never)

        if (allocationError) throw allocationError

        if (selectedRoom) {
          await supabase
            .from('hostel_rooms')
            .update({ current_occupancy: selectedRoom.current_occupancy + 1 } as never)
            .eq('id', selectedRoom.id)
        }

        toast.success('Student allocated successfully!')
        router.push('/dashboard/hostel/allocations')
      } catch (fallbackError) {
        console.error('Fallback error:', fallbackError)
        toast.error('Failed to allocate student')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const filteredStudents = students.filter(
    (s) =>
      s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.student_number?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Filter rooms based on selected student's gender
  const availableRooms = selectedStudent
    ? rooms.filter(r => {
        if (!r.block?.gender_restriction) return true
        return r.block.gender_restriction === selectedStudent.gender
      })
    : rooms

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard/hostel/allocations"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Allocations
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Allocate Student to Room</h1>
        <p className="text-gray-500 mt-1">Assign a student to a hostel room</p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Student Selection */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Student</h2>

          {selectedStudent ? (
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{selectedStudent.full_name}</p>
                  <p className="text-sm text-gray-500">
                    {selectedStudent.student_number || 'No student number'}
                    {selectedStudent.gender && ` • ${selectedStudent.gender}`}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedStudent(null)
                  setFormData((prev) => ({ ...prev, student_id: '' }))
                }}
              >
                Change
              </Button>
            </div>
          ) : (
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search for a student..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setShowStudentSearch(true)
                  }}
                  onFocus={() => setShowStudentSearch(true)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none"
                />
              </div>
              {errors.student_id && (
                <p className="text-red-500 text-sm mt-1">{errors.student_id}</p>
              )}

              {showStudentSearch && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredStudents.length > 0 ? (
                    filteredStudents.slice(0, 10).map((student) => (
                      <button
                        key={student.id}
                        type="button"
                        onClick={() => handleSelectStudent(student)}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 border-b border-gray-100 last:border-b-0"
                      >
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                          <User className="w-4 h-4 text-gray-500" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{student.full_name}</p>
                          <p className="text-sm text-gray-500">
                            {student.student_number || 'No student number'}
                            {student.gender && ` • ${student.gender}`}
                          </p>
                        </div>
                      </button>
                    ))
                  ) : (
                    <p className="px-4 py-3 text-gray-500 text-center">
                      {students.length === 0 ? 'All students are already allocated' : 'No students found'}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Room Selection */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Room</h2>

          {availableRooms.length === 0 ? (
            <div className="text-center py-8">
              <DoorOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">
                {selectedStudent
                  ? 'No available rooms matching student gender'
                  : 'No available rooms'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {availableRooms.map((room) => {
                const isSelected = formData.room_id === room.id
                const availableSpaces = room.capacity - room.current_occupancy

                return (
                  <label
                    key={room.id}
                    className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-colors ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="room_id"
                        value={room.id}
                        checked={isSelected}
                        onChange={handleChange}
                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <div>
                        <p className="font-medium text-gray-900">
                          Room {room.room_number}
                        </p>
                        <p className="text-sm text-gray-500">
                          {room.block?.name || 'No block'} • {room.room_type}
                          {room.block?.gender_restriction && ` • ${room.block.gender_restriction} only`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Users className="w-4 h-4" />
                        {room.current_occupancy}/{room.capacity}
                      </div>
                      <p className="text-sm text-green-600">{availableSpaces} left</p>
                      <p className="text-xs text-gray-500">N$ {room.monthly_fee}/mo</p>
                    </div>
                  </label>
                )
              })}
            </div>
          )}
          {errors.room_id && (
            <p className="text-red-500 text-sm mt-2">{errors.room_id}</p>
          )}
        </div>

        {/* Check-in Date */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Check-in Details</h2>
          <Input
            label="Check-in Date"
            name="check_in_date"
            type="date"
            value={formData.check_in_date}
            onChange={handleChange}
            error={errors.check_in_date}
            required
          />
        </div>

        {/* Summary */}
        {selectedStudent && selectedRoom && (
          <div className="bg-blue-50 rounded-xl border border-blue-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Allocation Summary</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Student</span>
                <span className="font-medium">{selectedStudent.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Room</span>
                <span className="font-medium">
                  {selectedRoom.room_number} ({selectedRoom.block?.name || 'No block'})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Monthly Fee</span>
                <span className="font-medium">N$ {selectedRoom.monthly_fee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Check-in Date</span>
                <span className="font-medium">
                  {new Date(formData.check_in_date).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Link href="/dashboard/hostel/allocations">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            isLoading={isLoading}
            leftIcon={<Save className="w-4 h-4" />}
            disabled={!selectedStudent || !selectedRoom}
          >
            Allocate Student
          </Button>
        </div>
      </form>
    </div>
  )
}
