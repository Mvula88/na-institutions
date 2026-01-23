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
  Building,
  DoorOpen,
  Users,
  Pencil,
  Trash2,
  Plus,
  Loader2,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Block {
  id: string
  name: string
  description: string | null
  gender_restriction: string | null
  is_active: boolean
  created_at: string
}

interface Room {
  id: string
  room_number: string
  room_type: string
  capacity: number
  current_occupancy: number
  monthly_fee: number
  is_active: boolean
}

export default function BlockDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuthStore()
  const [block, setBlock] = useState<Block | null>(null)
  const [rooms, setRooms] = useState<Room[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (user?.institution_id && params.id) {
      fetchBlock()
      fetchRooms()
    }
  }, [user?.institution_id, params.id])

  async function fetchBlock() {
    if (!user?.institution_id) return

    const supabase = createClient()

    try {
      const { data, error } = await supabase
        .from('hostel_blocks')
        .select('*')
        .eq('id', params.id as string)
        .eq('institution_id', user.institution_id)
        .single()

      if (error) throw error
      if (!data) {
        toast.error('Block not found')
        router.push('/dashboard/hostel')
        return
      }

      setBlock(data as Block)
    } catch (error) {
      console.error('Error fetching block:', error)
      toast.error('Failed to load block')
      router.push('/dashboard/hostel')
    } finally {
      setIsLoading(false)
    }
  }

  async function fetchRooms() {
    if (!user?.institution_id) return

    const supabase = createClient()

    const { data } = await supabase
      .from('hostel_rooms')
      .select('*')
      .eq('block_id', params.id as string)
      .eq('institution_id', user.institution_id)
      .order('room_number')

    setRooms((data || []) as Room[])
  }

  async function handleDelete() {
    if (!block) return

    setIsDeleting(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('hostel_blocks')
        .delete()
        .eq('id', block.id)

      if (error) throw error

      toast.success('Block deleted successfully')
      router.push('/dashboard/hostel')
    } catch (error) {
      console.error('Error deleting block:', error)
      toast.error('Failed to delete block. Make sure all rooms are removed first.')
    } finally {
      setIsDeleting(false)
    }
  }

  const totalCapacity = rooms.reduce((sum, r) => sum + r.capacity, 0)
  const currentOccupancy = rooms.reduce((sum, r) => sum + r.current_occupancy, 0)
  const availableSpaces = totalCapacity - currentOccupancy
  const occupancyPercent = totalCapacity > 0 ? Math.round((currentOccupancy / totalCapacity) * 100) : 0

  const getRoomStatus = (room: Room) => {
    if (!room.is_active) return { label: 'Inactive', bg: 'bg-gray-100 text-gray-600' }
    if (room.current_occupancy >= room.capacity) return { label: 'Full', bg: 'bg-red-100 text-red-700' }
    if (room.current_occupancy > 0) return { label: 'Partial', bg: 'bg-amber-100 text-amber-700' }
    return { label: 'Available', bg: 'bg-green-100 text-green-700' }
  }

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!block) return null

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link
            href="/dashboard/hostel"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Hostel
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <Building className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{block.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                {block.gender_restriction && (
                  <span className="text-sm text-gray-500 capitalize">{block.gender_restriction} only</span>
                )}
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                  block.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {block.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/hostel/blocks/${block.id}/edit`}>
            <Button variant="outline" leftIcon={<Pencil className="w-4 h-4" />}>
              Edit
            </Button>
          </Link>
          <Button
            variant="outline"
            leftIcon={<Trash2 className="w-4 h-4" />}
            onClick={() => setDeleteModalOpen(true)}
            className="text-red-600 hover:bg-red-50"
          >
            Delete
          </Button>
        </div>
      </div>

      {/* Block Info */}
      {block.description && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Description</h3>
          <p className="text-gray-900">{block.description}</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100">
              <DoorOpen className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{rooms.length}</p>
              <p className="text-sm text-gray-500">Rooms</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100">
              <Users className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalCapacity}</p>
              <p className="text-sm text-gray-500">Capacity</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100">
              <Users className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{currentOccupancy}</p>
              <p className="text-sm text-gray-500">Occupied</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-100">
              <DoorOpen className="w-5 h-5 text-cyan-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{availableSpaces}</p>
              <p className="text-sm text-gray-500">Available</p>
            </div>
          </div>
        </div>
      </div>

      {/* Occupancy Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Block Occupancy</span>
          <span className="font-medium">{occupancyPercent}%</span>
        </div>
        <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              occupancyPercent >= 90 ? 'bg-red-500' :
              occupancyPercent >= 70 ? 'bg-amber-500' : 'bg-green-500'
            }`}
            style={{ width: `${occupancyPercent}%` }}
          ></div>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          {currentOccupancy} of {totalCapacity} beds occupied
        </p>
      </div>

      {/* Rooms List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Rooms in this Block</h2>
          <Link href="/dashboard/hostel/rooms/new">
            <Button size="sm" leftIcon={<Plus className="w-4 h-4" />}>
              Add Room
            </Button>
          </Link>
        </div>

        {rooms.length === 0 ? (
          <div className="p-12 text-center">
            <DoorOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No rooms yet</h3>
            <p className="text-gray-500 mb-4">Add rooms to this block to start allocating students</p>
            <Link href="/dashboard/hostel/rooms/new">
              <Button leftIcon={<Plus className="w-4 h-4" />}>
                Add Room
              </Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Room
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Occupancy
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Monthly Fee
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rooms.map((room) => {
                  const status = getRoomStatus(room)
                  const roomAvailable = room.capacity - room.current_occupancy

                  return (
                    <tr key={room.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <DoorOpen className="w-4 h-4 text-gray-400" />
                          <span className="font-medium text-gray-900">Room {room.room_number}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600 capitalize">{room.room_type}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-900">{room.current_occupancy}/{room.capacity}</span>
                          {roomAvailable > 0 && room.is_active && (
                            <span className="text-sm text-green-600">({roomAvailable} left)</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-900">N$ {room.monthly_fee.toFixed(2)}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${status.bg}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/dashboard/hostel/rooms/${room.id}/edit`}>
                            <button className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors">
                              <Pencil className="w-4 h-4" />
                            </button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Block"
        message={`Are you sure you want to delete "${block.name}"? All rooms in this block will also be deleted. This action cannot be undone.`}
        confirmText="Delete"
        isLoading={isDeleting}
      />
    </div>
  )
}
