'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/input'
import { ArrowLeft, Loader2, Save } from 'lucide-react'
import toast from 'react-hot-toast'

interface Center {
  id: string
  name: string
}

interface User {
  id: string
  email: string
  full_name: string
  phone: string | null
  role: 'super_admin' | 'center_admin' | 'center_staff'
  center_id: string | null
  is_active: boolean
}

export default function EditUserPage() {
  const params = useParams()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [centers, setCenters] = useState<Center[]>([])
  const [user, setUser] = useState<User | null>(null)

  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    role: 'center_staff' as 'super_admin' | 'center_admin' | 'center_staff',
    center_id: '',
    is_active: true,
  })

  useEffect(() => {
    fetchCenters()
    fetchUser()
  }, [params.id])

  async function fetchCenters() {
    const supabase = createClient()
    const { data } = await supabase
      .from('institutions')
      .select('id, name')
      .order('name')
    setCenters(data || [])
  }

  async function fetchUser() {
    const supabase = createClient()

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', params.id as string)
        .single()

      if (error) throw error

      const userData = data as User
      setUser(userData)
      setFormData({
        full_name: userData.full_name,
        phone: userData.phone || '',
        role: userData.role,
        center_id: userData.center_id || '',
        is_active: userData.is_active,
      })
    } catch (error) {
      console.error('Error fetching user:', error)
      toast.error('Failed to load user')
    } finally {
      setIsFetching(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)

    const supabase = createClient()

    try {
      // Validation
      if (!formData.full_name) {
        toast.error('Please enter the full name')
        return
      }

      if (formData.role !== 'super_admin' && !formData.center_id) {
        toast.error('Please select a center for this user')
        return
      }

      const { error } = await supabase
        .from('users')
        .update({
          full_name: formData.full_name,
          phone: formData.phone || null,
          role: formData.role,
          center_id: formData.role === 'super_admin' ? null : formData.center_id,
          is_active: formData.is_active,
          updated_at: new Date().toISOString(),
        } as never)
        .eq('id', params.id as string)

      if (error) throw error

      toast.success('User updated successfully')
      router.push(`/admin/users/${params.id}`)
    } catch (error: unknown) {
      console.error('Error updating user:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to update user'
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  if (isFetching) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">User not found</h2>
          <p className="text-gray-500 mb-4">The user you&apos;re looking for doesn&apos;t exist.</p>
          <Link href="/admin/users">
            <Button>Back to Users</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/admin/users/${params.id}`}
          className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to User
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Edit User</h1>
        <p className="text-gray-500 mt-1">Update user information and access</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
          <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-100 pb-4">
            Account Information
          </h2>

          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">Email Address</p>
            <p className="font-medium text-gray-900">{user.email}</p>
            <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
          </div>

          <Input
            label="Full Name"
            required
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            placeholder="John Doe"
          />

          <Input
            label="Phone Number"
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="+264 81 123 4567"
          />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
          <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-100 pb-4">
            Role & Access
          </h2>

          <Select
            label="Role"
            required
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value as typeof formData.role })}
            options={[
              { value: 'super_admin', label: 'Super Admin - Full platform access' },
              { value: 'center_admin', label: 'Center Admin - Manage assigned center' },
              { value: 'center_staff', label: 'Center Staff - Limited center access' },
            ]}
          />

          {formData.role !== 'super_admin' && (
            <Select
              label="Assigned Center"
              required
              value={formData.center_id}
              onChange={(e) => setFormData({ ...formData, center_id: e.target.value })}
              options={centers.map((c) => ({ value: c.id, label: c.name }))}
              placeholder="Select a center"
            />
          )}

          {formData.role === 'super_admin' && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <p className="text-sm text-purple-700">
                <strong>Super Admin</strong> users have full access to all centers and platform settings.
                They are not assigned to a specific center.
              </p>
            </div>
          )}

          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              <span className="ms-3 text-sm font-medium text-gray-900">
                Account Active
              </span>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <Button
            type="submit"
            disabled={isLoading}
            leftIcon={isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
          <Link href={`/admin/users/${params.id}`}>
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  )
}
