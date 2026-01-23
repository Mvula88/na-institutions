'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/modal'
import {
  ArrowLeft,
  DoorOpen,
  Building,
  Users,
  Pencil,
  Trash2,
  Loader2,
  User,
  Calendar,
  CreditCard,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Room {
  id: string
  room_number: string
  room_type: string
  capacity: number
  current_occupancy: number
  monthly_fee: number
  description: string | null
  is_active: boolean
  created_at: string
  block: {
    id: string
    name: string
    gender_restriction: string | null
  } | null
}

interface Allocation {
  id: string
  check_in_date: string
  check_out_date: string | null
  status: string
  student: {
    id: string
    full_name: string
    student_number: string | null
    gender: string | null
  } | null
}

export default function RoomDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuthStore()
  const [room, setRoom] = useState<Room | null>(null)
  const [allocations, setAllocations] = useState<Allocation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (user?.institution_id && params.id) {
      fetchRoom()
      fetchAllocations()
    }
  }, [user?.institution_id, params.id])

  async function fetchRoom() {
    if (!user?.institution_id) return

    const supabase = createClient()

    try {
      const { data, error } = await supabase
        .from('hostel_rooms')
        .select(`
          *,
          block:hostel_blocks(id, name, gender_restriction)
        `)
        .eq('id', params.id as string)
        .eq('institution_id', user.institution_id)
        .single()

      if (error) throw error
      if (!data) {
        toast.error('Room not found')
        router.push('/dashboard/hostel/rooms')
        return
      }

      setRoom(data as Room)
    } catch (error) {
      console.error('Error fetching room:', error)
      toast.error('Failed to load room')
      router.push('/dashboard/hostel/rooms')
    } finally {
      setIsLoading(false)
    }
  }

  async function fetchAllocations() {
    if (!user?.institution_id) return

    const supabase = createClient()

    const { data } = await supabase
      .from('hostel_allocations')
      .select(`
        id, check_in_date, check_out_date, status,
        student:students(id, full_name, student_number, gender)
      `)
      .eq('room_id', params.id as string)
      .eq('institution_id', user.institution_id)
      .order('check_in_date', { ascending: false })

    setAllocations((data || []) as Allocation[])
  }

  async function handleDelete() {
    if (!room) return

    setIsDeleting(true)
    const supabase = createClient()

    try {
      // Check if room has active allocations
      const activeAllocations = allocations.filter(a => a.status === 'checked_in')
      if (activeAllocations.length > 0) {
        toast.error('Cannot delete room with active allocations')
        setDeleteModalOpen(false)
        return
      }

      const { error } = await supabase
        .from('hostel_rooms')
        .delete()
        .eq('id', room.id)

      if (error) throw error

      toast.success('Room deleted successfully')
      router.push('/dashboard/hostel/rooms')
    } catch (error) {
      console.error('Error deleting room:', error)
      toast.error('Failed to delete room')
    } finally {
      setIsDeleting(false)
      setDeleteModalOpen(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!room) {
    return null
  }

  const activeAllocations = allocations.filter(a => a.status === 'checked_in')
  const pastAllocations = allocations.filter(a => a.status !== 'checked_in')
  const occupancyPercentage = room.capacity > 0 ? (room.current_occupancy / room.capacity) * 100 : 0

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <Link
          href="/dashboard/hostel/rooms"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Rooms
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-blue-100 flex items-center justify-center">
              <DoorOpen className="w-7 h-7 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-bold text-gray-900">
                  Room {room.room_number}
                </h1>
                {room.is_active ? (
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                    Active
                  </span>
                ) : (
                  <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                    Inactive
                  </span>
                )}
              </div>
              <p className="text-gray-500">
                {room.block?.name || 'No Block'} &bull; {room.room_type}
                {room.block?.gender_restriction && ` &bull; ${room.block.gender_restriction} only`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href={`/dashboard/hostel/rooms/${room.id}/edit`}>
              <Button variant="outline" leftIcon={<Pencil className="w-4 h-4" />}>
                Edit
              </Button>
            </Link>
            <Button
              variant="danger"
              leftIcon={<Trash2 className="w-4 h-4" />}
              onClick={() => setDeleteModalOpen(true)}
            >
              Delete
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Room Details */}
        <div className="lg:col-span-1 space-y-6">
          {/* Info Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Room Information</h2>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Building className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Block</p>
                  <p className="font-medium text-gray-900">{room.block?.name || 'No Block'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <DoorOpen className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Room Type</p>
                  <p className="font-medium text-gray-900 capitalize">{room.room_type}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Monthly Fee</p>
                  <p className="font-medium text-gray-900">N$ {room.monthly_fee.toFixed(2)}</p>
                </div>
              </div>

              {room.description && (
                <div className="pt-3 border-t border-gray-100">
                  <p className="text-sm text-gray-500 mb-1">Description</p>
                  <p className="text-gray-700">{room.description}</p>
                </div>
              )}
            </div>
          </div>

          {/* Occupancy Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Occupancy</h2>

            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {room.current_occupancy} / {room.capacity}
                </p>
                <p className="text-sm text-gray-500">
                  {room.capacity - room.current_occupancy} spaces available
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${
                  occupancyPercentage >= 100
                    ? 'bg-red-500'
                    : occupancyPercentage >= 75
                    ? 'bg-amber-500'
                    : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(occupancyPercentage, 100)}%` }}
              />
            </div>
            <p className="text-sm text-gray-500 mt-2 text-center">
              {occupancyPercentage.toFixed(0)}% occupied
            </p>
          </div>
        </div>

        {/* Allocations */}
        <div className="lg:col-span-2 space-y-6">
          {/* Current Residents */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Current Residents ({activeAllocations.length})
              </h2>
              {room.current_occupancy < room.capacity && (
                <Link href="/dashboard/hostel/allocations/new">
                  <Button size="sm">Add Resident</Button>
                </Link>
              )}
            </div>

            {activeAllocations.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No current residents</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeAllocations.map((allocation) => (
                  <div
                    key={allocation.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <User className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {allocation.student?.full_name || 'Unknown'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {allocation.student?.student_number || 'No ID'}
                          {allocation.student?.gender && ` • ${allocation.student.gender}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                        Checked In
                      </span>
                      <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(allocation.check_in_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Past Residents */}
          {pastAllocations.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Past Residents ({pastAllocations.length})
              </h2>

              <div className="space-y-3">
                {pastAllocations.slice(0, 5).map((allocation) => (
                  <div
                    key={allocation.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                        <User className="w-5 h-5 text-gray-500" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-700">
                          {allocation.student?.full_name || 'Unknown'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {allocation.student?.student_number || 'No ID'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                        Checked Out
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        {allocation.check_out_date
                          ? new Date(allocation.check_out_date).toLocaleDateString()
                          : 'N/A'}
                      </p>
                    </div>
                  </div>
                ))}
                {pastAllocations.length > 5 && (
                  <p className="text-sm text-gray-500 text-center pt-2">
                    And {pastAllocations.length - 5} more...
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Room"
        message={`Are you sure you want to delete Room ${room.room_number}? This action cannot be undone.`}
        confirmText="Delete"
        isLoading={isDeleting}
        variant="danger"
      />
    </div>
  )
}
