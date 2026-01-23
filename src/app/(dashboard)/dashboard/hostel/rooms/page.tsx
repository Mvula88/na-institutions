'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/input'
import { ConfirmModal } from '@/components/ui/modal'
import {
  Plus,
  Search,
  DoorOpen,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Users,
  Building,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Room {
  id: string
  room_number: string
  room_type: string
  capacity: number
  current_occupancy: number
  monthly_fee: number
  is_active: boolean
  block: {
    id: string
    name: string
  } | null
}

interface Block {
  id: string
  name: string
}

const ITEMS_PER_PAGE = 12

export default function RoomsPage() {
  const { user, isCenterAdmin } = useAuthStore()
  const canEdit = isCenterAdmin() // Only center admin can manage rooms
  const [rooms, setRooms] = useState<Room[]>([])
  const [blocks, setBlocks] = useState<Block[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [blockFilter, setBlockFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [roomToDelete, setRoomToDelete] = useState<Room | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (user?.institution_id) {
      fetchBlocks()
    }
  }, [user?.institution_id])

  useEffect(() => {
    fetchRooms()
  }, [user?.institution_id, currentPage, blockFilter, statusFilter])

  async function fetchBlocks() {
    if (!user?.institution_id) return

    const supabase = createClient()
    const { data } = await supabase
      .from('hostel_blocks')
      .select('id, name')
      .eq('institution_id', user.institution_id)
      .eq('is_active', true)
      .order('name')

    setBlocks((data || []) as Block[])
  }

  async function fetchRooms() {
    if (!user?.institution_id) return

    setIsLoading(true)
    const supabase = createClient()

    try {
      let query = supabase
        .from('hostel_rooms')
        .select(`
          *,
          block:hostel_blocks(id, name)
        `, { count: 'exact' })
        .eq('institution_id', user.institution_id)
        .order('room_number')

      if (blockFilter) {
        query = query.eq('block_id', blockFilter)
      }
      if (statusFilter === 'active') {
        query = query.eq('is_active', true)
      } else if (statusFilter === 'inactive') {
        query = query.eq('is_active', false)
      } else if (statusFilter === 'available') {
        query = query.eq('is_active', true).lt('current_occupancy', supabase.rpc('capacity'))
      }

      const from = (currentPage - 1) * ITEMS_PER_PAGE
      const to = from + ITEMS_PER_PAGE - 1
      query = query.range(from, to)

      const { data, count, error } = await query

      if (error) throw error

      let filteredRooms = (data || []) as Room[]

      // Filter available rooms on client side
      if (statusFilter === 'available') {
        filteredRooms = filteredRooms.filter(r => r.current_occupancy < r.capacity)
      } else if (statusFilter === 'full') {
        filteredRooms = filteredRooms.filter(r => r.current_occupancy >= r.capacity)
      }

      // Search filter
      if (searchQuery) {
        const search = searchQuery.toLowerCase()
        filteredRooms = filteredRooms.filter(
          r => r.room_number.toLowerCase().includes(search) ||
               r.block?.name.toLowerCase().includes(search)
        )
      }

      setRooms(filteredRooms)
      setTotalCount(count || 0)
    } catch (error) {
      console.error('Error fetching rooms:', error)
      toast.error('Failed to fetch rooms')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1)
      fetchRooms()
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  async function handleDelete() {
    if (!roomToDelete) return

    setIsDeleting(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('hostel_rooms')
        .delete()
        .eq('id', roomToDelete.id)

      if (error) throw error

      toast.success('Room deleted successfully')
      setDeleteModalOpen(false)
      setRoomToDelete(null)
      fetchRooms()
    } catch (error) {
      console.error('Error deleting room:', error)
      toast.error('Failed to delete room. Make sure all allocations are removed first.')
    } finally {
      setIsDeleting(false)
    }
  }

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)

  const getRoomStatus = (room: Room) => {
    if (!room.is_active) return { label: 'Inactive', bg: 'bg-gray-100 text-gray-600' }
    if (room.current_occupancy >= room.capacity) return { label: 'Full', bg: 'bg-red-100 text-red-700' }
    if (room.current_occupancy > 0) return { label: 'Partial', bg: 'bg-amber-100 text-amber-700' }
    return { label: 'Available', bg: 'bg-green-100 text-green-700' }
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link
            href="/dashboard/hostel"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-2"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back to Hostel
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">All Rooms</h1>
          <p className="text-gray-500 mt-1">{canEdit ? 'Manage hostel rooms across all blocks' : 'View hostel rooms across all blocks'}</p>
        </div>
        {canEdit && (
          <Link href="/dashboard/hostel/rooms/new">
            <Button leftIcon={<Plus className="w-4 h-4" />}>
              Add Room
            </Button>
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by room number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <Select
              options={blocks.map(b => ({ value: b.id, label: b.name }))}
              placeholder="All Blocks"
              value={blockFilter}
              onChange={(e) => {
                setBlockFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="w-40"
            />
            <Select
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
                { value: 'available', label: 'Available' },
                { value: 'full', label: 'Full' },
              ]}
              placeholder="All Status"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="w-40"
            />
          </div>
        </div>
      </div>

      {/* Rooms Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-40 bg-gray-100 rounded-xl animate-pulse"></div>
          ))}
        </div>
      ) : rooms.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <DoorOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No rooms found</h3>
          <p className="text-gray-500 mb-4">
            {searchQuery || blockFilter || statusFilter
              ? 'Try adjusting your filters'
              : canEdit ? 'Get started by adding your first room' : 'No rooms available yet'}
          </p>
          {!searchQuery && !blockFilter && !statusFilter && canEdit && (
            <Link href="/dashboard/hostel/rooms/new">
              <Button leftIcon={<Plus className="w-4 h-4" />}>
                Add Room
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {rooms.map((room) => {
              const status = getRoomStatus(room)
              const availableSpaces = room.capacity - room.current_occupancy

              return (
                <div
                  key={room.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">Room {room.room_number}</h3>
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Building className="w-3 h-3" />
                        {room.block?.name || 'No block'}
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${status.bg}`}>
                      {status.label}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">
                        {room.current_occupancy}/{room.capacity}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      R {room.monthly_fee.toFixed(2)}/mo
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                    <span className="capitalize">{room.room_type}</span>
                    {availableSpaces > 0 && room.is_active && (
                      <span className="text-green-600">
                        ({availableSpaces} space{availableSpaces > 1 ? 's' : ''} left)
                      </span>
                    )}
                  </div>

                  {canEdit && (
                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                      <Link href={`/dashboard/hostel/rooms/${room.id}/edit`}>
                        <button className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors">
                          <Pencil className="w-4 h-4" />
                        </button>
                      </Link>
                      <button
                        onClick={() => {
                          setRoomToDelete(room)
                          setDeleteModalOpen(true)
                        }}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-gray-500">
                Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
                {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} of {totalCount} rooms
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Delete Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false)
          setRoomToDelete(null)
        }}
        onConfirm={handleDelete}
        title="Delete Room"
        message={`Are you sure you want to delete Room ${roomToDelete?.room_number}? This action cannot be undone.`}
        confirmText="Delete"
        isLoading={isDeleting}
      />
    </div>
  )
}
