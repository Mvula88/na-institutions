'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/input'
import { ArrowLeft, Save } from 'lucide-react'
import toast from 'react-hot-toast'

// Helper for numeric inputs to prevent leading zeros
function cleanNumericInput(value: string): string {
  return value.replace(/[^\d.]/g, '').replace(/^0+(?=\d)/, '')
}

interface Block {
  id: string
  name: string
}

export default function NewRoomPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [blocks, setBlocks] = useState<Block[]>([])

  const [formData, setFormData] = useState({
    block_id: '',
    room_number: '',
    room_type: 'shared',
    capacity: '2',
    monthly_fee: '0',
    is_active: true,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (user?.institution_id) {
      fetchBlocks()
    }
  }, [user?.institution_id])

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

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  function handleNumericChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    const cleaned = cleanNumericInput(value)
    setFormData((prev) => ({ ...prev, [name]: cleaned }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  function validateForm() {
    const newErrors: Record<string, string> = {}

    if (!formData.room_number.trim()) newErrors.room_number = 'Room number is required'
    if (!formData.capacity || parseInt(formData.capacity) < 1) {
      newErrors.capacity = 'Capacity must be at least 1'
    }
    if (parseFloat(formData.monthly_fee) < 0) {
      newErrors.monthly_fee = 'Monthly fee cannot be negative'
    }

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
      const insertData = {
        institution_id: user.institution_id,
        block_id: formData.block_id || null,
        room_number: formData.room_number.trim(),
        room_type: formData.room_type,
        capacity: parseInt(formData.capacity),
        monthly_fee: parseFloat(formData.monthly_fee) || 0,
        is_active: formData.is_active,
        current_occupancy: 0,
      }

      const { error } = await supabase
        .from('hostel_rooms')
        .insert(insertData as never)

      if (error) {
        if (error.code === '23505') {
          toast.error('A room with this number already exists')
          setErrors({ room_number: 'This room number is already taken' })
          return
        }
        throw error
      }

      toast.success('Room created successfully!')
      router.push('/dashboard/hostel/rooms')
    } catch (error) {
      console.error('Error creating room:', error)
      toast.error('Failed to create room')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard/hostel/rooms"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Rooms
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Add New Room</h1>
        <p className="text-gray-500 mt-1">Create a new hostel room</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Room Number"
              name="room_number"
              value={formData.room_number}
              onChange={handleChange}
              error={errors.room_number}
              required
              placeholder="e.g., 101, A1"
            />

            <Select
              label="Block (Optional)"
              name="block_id"
              value={formData.block_id}
              onChange={handleChange}
              options={blocks.map(b => ({ value: b.id, label: b.name }))}
              placeholder="Select block"
            />

            <Select
              label="Room Type"
              name="room_type"
              value={formData.room_type}
              onChange={handleChange}
              options={[
                { value: 'single', label: 'Single' },
                { value: 'shared', label: 'Shared' },
              ]}
            />

            <Input
              label="Capacity"
              name="capacity"
              type="text"
              inputMode="numeric"
              value={formData.capacity}
              onChange={handleNumericChange}
              error={errors.capacity}
              required
            />

            <Input
              label="Monthly Fee (N$)"
              name="monthly_fee"
              type="text"
              inputMode="decimal"
              value={formData.monthly_fee}
              onChange={handleNumericChange}
              error={errors.monthly_fee}
            />

            <div className="flex items-center gap-3 md:col-span-2">
              <input
                type="checkbox"
                id="is_active"
                name="is_active"
                checked={formData.is_active}
                onChange={handleChange}
                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <label htmlFor="is_active" className="text-sm text-gray-700">
                Room is active and available for allocation
              </label>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <Link href="/dashboard/hostel/rooms">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            isLoading={isLoading}
            leftIcon={<Save className="w-4 h-4" />}
          >
            Create Room
          </Button>
        </div>
      </form>
    </div>
  )
}
