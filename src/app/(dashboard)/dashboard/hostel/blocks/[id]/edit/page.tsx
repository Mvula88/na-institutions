'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Input, Select, Textarea } from '@/components/ui/input'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface Block {
  id: string
  name: string
  description: string | null
  gender_restriction: string | null
  is_active: boolean
}

export default function EditBlockPage() {
  const router = useRouter()
  const params = useParams()
  const { user } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    gender_restriction: '',
    is_active: true,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (user?.institution_id && params.id) {
      fetchBlock()
    }
  }, [user?.institution_id, params.id])

  async function fetchBlock() {
    const supabase = createClient()

    try {
      if (!user?.institution_id) {
        toast.error('No center selected')
        router.push('/dashboard/hostel')
        return
      }

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

      const block = data as Block
      setFormData({
        name: block.name,
        description: block.description || '',
        gender_restriction: block.gender_restriction || '',
        is_active: block.is_active,
      })
    } catch (error) {
      console.error('Error fetching block:', error)
      toast.error('Failed to load block')
      router.push('/dashboard/hostel')
    } finally {
      setIsFetching(false)
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
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

  function validateForm() {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) newErrors.name = 'Block name is required'

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
      const updateData = {
        name: formData.name.trim(),
        description: formData.description || null,
        gender_restriction: formData.gender_restriction || null,
        is_active: formData.is_active,
      }

      const { error } = await supabase
        .from('hostel_blocks')
        .update(updateData as never)
        .eq('id', params.id as string)
        .eq('institution_id', user.institution_id)

      if (error) throw error

      toast.success('Block updated successfully!')
      router.push('/dashboard/hostel')
    } catch (error) {
      console.error('Error updating block:', error)
      toast.error('Failed to update block')
    } finally {
      setIsLoading(false)
    }
  }

  if (isFetching) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard/hostel"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Hostel
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Edit Block</h1>
        <p className="text-gray-500 mt-1">Update hostel block details</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="space-y-4">
            <Input
              label="Block Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              error={errors.name}
              required
              placeholder="e.g., Block A, Boys Hostel"
            />

            <Textarea
              label="Description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              placeholder="Optional description of this block..."
            />

            <Select
              label="Gender Restriction"
              name="gender_restriction"
              value={formData.gender_restriction}
              onChange={handleChange}
              options={[
                { value: 'male', label: 'Male Only' },
                { value: 'female', label: 'Female Only' },
              ]}
              placeholder="No restriction (Mixed)"
            />

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is_active"
                name="is_active"
                checked={formData.is_active}
                onChange={handleChange}
                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <label htmlFor="is_active" className="text-sm text-gray-700">
                Block is active and available for allocations
              </label>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <Link href="/dashboard/hostel">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            isLoading={isLoading}
            leftIcon={<Save className="w-4 h-4" />}
          >
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  )
}
