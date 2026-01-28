'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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

export default function NewUserPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [centers, setCenters] = useState<Center[]>([])

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: '',
    role: 'institution_staff' as 'super_admin' | 'institution_admin' | 'institution_staff',
    center_id: '',
  })

  useEffect(() => {
    fetchCenters()
  }, [])

  async function fetchCenters() {
    const supabase = createClient()
    const { data } = await supabase
      .from('institutions')
      .select('id, name')
      .eq('status', 'active')
      .order('name')
    setCenters(data || [])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Validation
      if (!formData.email || !formData.password || !formData.full_name) {
        toast.error('Please fill in all required fields')
        return
      }

      if (formData.password.length < 6) {
        toast.error('Password must be at least 6 characters')
        return
      }

      if (formData.role !== 'super_admin' && !formData.center_id) {
        toast.error('Please select a center for this user')
        return
      }

      // Call API route to create user (uses service role key on server)
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          full_name: formData.full_name,
          phone: formData.phone || null,
          role: formData.role,
          center_id: formData.role === 'super_admin' ? null : formData.center_id,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create user')
      }

      toast.success('User created successfully')
      router.push('/admin/users')
    } catch (error: unknown) {
      console.error('Error creating user:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to create user'
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Users
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Add New User</h1>
        <p className="text-gray-500 mt-1">Create a new user account for the platform</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
          <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-100 pb-4">
            Account Information
          </h2>

          <Input
            label="Email Address"
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="user@example.com"
          />

          <Input
            label="Password"
            type="password"
            required
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder="Minimum 6 characters"
          />

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
              { value: 'institution_admin', label: 'Institution Admin - Manage assigned institution' },
              { value: 'institution_staff', label: 'Institution Staff - Limited institution access' },
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
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <Button
            type="submit"
            disabled={isLoading}
            leftIcon={isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          >
            {isLoading ? 'Creating...' : 'Create User'}
          </Button>
          <Link href="/admin/users">
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  )
}
