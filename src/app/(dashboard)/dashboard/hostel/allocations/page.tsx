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
  UserPlus,
  ChevronLeft,
  ChevronRight,
  Users,
  LogOut,
  Calendar,
  DoorOpen,
  SlidersHorizontal,
  X,
  Building,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Allocation {
  id: string
  check_in_date: string
  check_out_date: string | null
  status: string
  student: {
    id: string
    full_name: string
    student_number: string | null
    phone: string | null
  } | null
  room: {
    id: string
    room_number: string
    block: {
      name: string
    } | null
  } | null
}

interface Room {
  id: string
  room_number: string
  block: { id: string; name: string } | null
}

interface Block {
  id: string
  name: string
  gender_restriction: string | null
}

const ITEMS_PER_PAGE = 10

export default function AllocationsPage() {
  const { user } = useAuthStore()
  const [allocations, setAllocations] = useState<Allocation[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [blocks, setBlocks] = useState<Block[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('checked_in')
  const [roomFilter, setRoomFilter] = useState('')
  const [blockFilter, setBlockFilter] = useState('')
  const [genderFilter, setGenderFilter] = useState('')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false)
  const [allocationToCheckout, setAllocationToCheckout] = useState<Allocation | null>(null)
  const [isCheckingOut, setIsCheckingOut] = useState(false)

  useEffect(() => {
    if (user?.institution_id) {
      fetchRooms()
      fetchBlocks()
    }
  }, [user?.institution_id])

  useEffect(() => {
    fetchAllocations()
  }, [user?.institution_id, currentPage, statusFilter, roomFilter, blockFilter, genderFilter])

  async function fetchRooms() {
    if (!user?.institution_id) return

    const supabase = createClient()
    const { data } = await supabase
      .from('hostel_rooms')
      .select('id, room_number, block:hostel_blocks(id, name)')
      .eq('institution_id', user.institution_id)
      .eq('is_active', true)
      .order('room_number')

    setRooms((data || []) as Room[])
  }

  async function fetchBlocks() {
    if (!user?.institution_id) return

    const supabase = createClient()
    const { data } = await supabase
      .from('hostel_blocks')
      .select('id, name, gender_restriction')
      .eq('institution_id', user.institution_id)
      .eq('is_active', true)
      .order('name')

    setBlocks((data || []) as Block[])
  }

  async function fetchAllocations() {
    if (!user?.institution_id) return

    setIsLoading(true)
    const supabase = createClient()

    try {
      // First get room IDs if filtering by block
      let roomIdsFromBlock: string[] | null = null
      if (blockFilter) {
        const { data: blockRooms } = await supabase
          .from('hostel_rooms')
          .select('id')
          .eq('block_id', blockFilter)
          .eq('is_active', true)

        roomIdsFromBlock = ((blockRooms || []) as { id: string }[]).map(r => r.id)
      }

      let query = supabase
        .from('hostel_allocations')
        .select(`
          *,
          student:students(id, full_name, student_number, phone, gender),
          room:hostel_rooms(id, room_number, block:hostel_blocks(id, name))
        `, { count: 'exact' })
        .eq('institution_id', user.institution_id)
        .order('check_in_date', { ascending: false })

      if (statusFilter) {
        query = query.eq('status', statusFilter)
      }
      if (roomFilter) {
        query = query.eq('room_id', roomFilter)
      }
      if (roomIdsFromBlock !== null) {
        if (roomIdsFromBlock.length === 0) {
          setAllocations([])
          setTotalCount(0)
          setIsLoading(false)
          return
        }
        query = query.in('room_id', roomIdsFromBlock)
      }

      const from = (currentPage - 1) * ITEMS_PER_PAGE
      const to = from + ITEMS_PER_PAGE - 1
      query = query.range(from, to)

      const { data, count, error } = await query

      if (error) throw error

      let filteredAllocations = (data || []) as (Allocation & { student: { gender?: string } | null })[]

      // Filter by gender (client-side since it's on student table)
      if (genderFilter) {
        filteredAllocations = filteredAllocations.filter(
          a => a.student?.gender?.toLowerCase() === genderFilter.toLowerCase()
        )
      }

      // Search filter
      if (searchQuery) {
        const search = searchQuery.toLowerCase()
        filteredAllocations = filteredAllocations.filter(
          a => a.student?.full_name.toLowerCase().includes(search) ||
               a.student?.student_number?.toLowerCase().includes(search) ||
               a.room?.room_number.toLowerCase().includes(search)
        )
      }

      setAllocations(filteredAllocations as Allocation[])
      setTotalCount(genderFilter ? filteredAllocations.length : (count || 0))
    } catch (error) {
      console.error('Error fetching allocations:', error)
      toast.error('Failed to fetch allocations')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1)
      fetchAllocations()
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  async function handleCheckout() {
    if (!allocationToCheckout) return

    setIsCheckingOut(true)
    const supabase = createClient()

    try {
      // Update allocation status
      const { error: allocationError } = await supabase
        .from('hostel_allocations')
        .update({
          status: 'checked_out',
          check_out_date: new Date().toISOString().split('T')[0],
        } as never)
        .eq('id', allocationToCheckout.id)

      if (allocationError) throw allocationError

      // Decrease room occupancy
      if (allocationToCheckout.room) {
        const { data: currentRoom } = await supabase
          .from('hostel_rooms')
          .select('current_occupancy')
          .eq('id', allocationToCheckout.room.id)
          .single()

        if (currentRoom) {
          await supabase
            .from('hostel_rooms')
            .update({
              current_occupancy: Math.max(0, (currentRoom as { current_occupancy: number }).current_occupancy - 1),
            } as never)
            .eq('id', allocationToCheckout.room.id)
        }
      }

      toast.success('Student checked out successfully')
      setCheckoutModalOpen(false)
      setAllocationToCheckout(null)
      fetchAllocations()
    } catch (error) {
      console.error('Error checking out:', error)
      toast.error('Failed to check out student')
    } finally {
      setIsCheckingOut(false)
    }
  }

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)

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
          <h1 className="text-2xl font-bold text-gray-900">Room Allocations</h1>
          <p className="text-gray-500 mt-1">Manage student room allocations</p>
        </div>
        <Link href="/dashboard/hostel/allocations/new">
          <Button leftIcon={<UserPlus className="w-4 h-4" />}>
            Allocate Student
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex flex-col gap-4">
          {/* Primary filters row */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by student name or room number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none"
                />
              </div>
            </div>
            <div className="flex gap-3 flex-wrap">
              <Select
                options={[
                  { value: 'checked_in', label: 'Checked In' },
                  { value: 'checked_out', label: 'Checked Out' },
                ]}
                placeholder="All Status"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-36"
              />
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={`flex items-center gap-2 px-3 py-2 border rounded-lg transition-colors ${
                  showAdvancedFilters || blockFilter || roomFilter || genderFilter
                    ? 'border-blue-500 bg-blue-50 text-blue-600'
                    : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span className="text-sm font-medium">More Filters</span>
                {(blockFilter || roomFilter || genderFilter) && (
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center">
                    {[blockFilter, roomFilter, genderFilter].filter(Boolean).length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Advanced filters row */}
          {showAdvancedFilters && (
            <div className="flex flex-wrap gap-3 pt-3 border-t border-gray-100">
              <Select
                options={blocks.map(b => ({
                  value: b.id,
                  label: `${b.name}${b.gender_restriction ? ` (${b.gender_restriction})` : ''}`
                }))}
                placeholder="All Blocks"
                value={blockFilter}
                onChange={(e) => {
                  setBlockFilter(e.target.value)
                  setRoomFilter('') // Reset room filter when block changes
                  setCurrentPage(1)
                }}
                className="w-44"
              />
              <Select
                options={rooms
                  .filter(r => !blockFilter || r.block?.id === blockFilter)
                  .map(r => ({
                    value: r.id,
                    label: `${r.room_number}${r.block ? ` (${r.block.name})` : ''}`
                  }))}
                placeholder="All Rooms"
                value={roomFilter}
                onChange={(e) => {
                  setRoomFilter(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-48"
              />
              <Select
                options={[
                  { value: 'male', label: 'Male' },
                  { value: 'female', label: 'Female' },
                  { value: 'other', label: 'Other' },
                ]}
                placeholder="All Genders"
                value={genderFilter}
                onChange={(e) => {
                  setGenderFilter(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-36"
              />
              {(blockFilter || roomFilter || genderFilter) && (
                <button
                  onClick={() => {
                    setBlockFilter('')
                    setRoomFilter('')
                    setGenderFilter('')
                    setCurrentPage(1)
                  }}
                  className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                  Clear Filters
                </button>
              )}
            </div>
          )}

          {/* Active filters display */}
          {(statusFilter || blockFilter || roomFilter || genderFilter) && (
            <div className="flex flex-wrap gap-2 pt-2">
              {statusFilter && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                  Status: {statusFilter === 'checked_in' ? 'Checked In' : 'Checked Out'}
                  <button onClick={() => { setStatusFilter(''); setCurrentPage(1) }} className="hover:text-blue-900">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {blockFilter && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                  Block: {blocks.find(b => b.id === blockFilter)?.name}
                  <button onClick={() => { setBlockFilter(''); setCurrentPage(1) }} className="hover:text-blue-900">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {roomFilter && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                  Room: {rooms.find(r => r.id === roomFilter)?.room_number}
                  <button onClick={() => { setRoomFilter(''); setCurrentPage(1) }} className="hover:text-blue-900">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {genderFilter && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                  Gender: {genderFilter}
                  <button onClick={() => { setGenderFilter(''); setCurrentPage(1) }} className="hover:text-blue-900">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-100 rounded"></div>
              ))}
            </div>
          </div>
        ) : allocations.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No allocations found</h3>
            <p className="text-gray-500 mb-4">
              {searchQuery || statusFilter || roomFilter
                ? 'Try adjusting your filters'
                : 'Get started by allocating a student to a room'}
            </p>
            {!searchQuery && !roomFilter && (
              <Link href="/dashboard/hostel/allocations/new">
                <Button leftIcon={<UserPlus className="w-4 h-4" />}>
                  Allocate Student
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Room
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Check In
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Check Out
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
                  {allocations.map((allocation) => (
                    <tr key={allocation.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">
                            {allocation.student?.full_name || 'Unknown'}
                          </p>
                          <p className="text-sm text-gray-500">
                            {allocation.student?.student_number || '-'}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <DoorOpen className="w-4 h-4 text-gray-400" />
                          <div>
                            <p className="text-gray-900">Room {allocation.room?.room_number || '-'}</p>
                            <p className="text-sm text-gray-500">
                              {allocation.room?.block?.name || 'No block'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-900">
                            {new Date(allocation.check_in_date).toLocaleDateString()}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-900">
                        {allocation.check_out_date
                          ? new Date(allocation.check_out_date).toLocaleDateString()
                          : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          allocation.status === 'checked_in'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {allocation.status === 'checked_in' ? 'Checked In' : 'Checked Out'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {allocation.status === 'checked_in' && (
                            <Button
                              variant="outline"
                              size="sm"
                              leftIcon={<LogOut className="w-4 h-4" />}
                              onClick={() => {
                                setAllocationToCheckout(allocation)
                                setCheckoutModalOpen(true)
                              }}
                            >
                              Check Out
                            </Button>
                          )}
                          {allocation.student && (
                            <Link href={`/dashboard/students/${allocation.student.id}`}>
                              <Button variant="outline" size="sm">
                                View Student
                              </Button>
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
                <p className="text-sm text-gray-500">
                  Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
                  {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} of {totalCount} allocations
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
      </div>

      {/* Checkout Modal */}
      <ConfirmModal
        isOpen={checkoutModalOpen}
        onClose={() => {
          setCheckoutModalOpen(false)
          setAllocationToCheckout(null)
        }}
        onConfirm={handleCheckout}
        title="Check Out Student"
        message={`Are you sure you want to check out "${allocationToCheckout?.student?.full_name}" from Room ${allocationToCheckout?.room?.room_number}?`}
        confirmText="Check Out"
        isLoading={isCheckingOut}
      />
    </div>
  )
}
