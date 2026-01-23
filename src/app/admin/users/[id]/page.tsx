'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft,
  Pencil,
  Mail,
  Phone,
  Building2,
  Calendar,
  Shield,
  UserCog,
  Users,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface User {
  id: string
  email: string
  full_name: string
  phone: string | null
  role: 'super_admin' | 'institution_admin' | 'institution_staff'
  institution_id: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  last_login_at: string | null
  institution?: {
    id: string
    name: string
    slug: string
    status: string
  } | null
}

export default function UserViewPage() {
  const params = useParams()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchUser()
  }, [params.id])

  async function fetchUser() {
    const supabase = createClient()

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*, institution:institutions(id, name, slug, status)')
        .eq('id', params.id as string)
        .single()

      if (error) throw error
      setUser(data as User)
    } catch (error) {
      console.error('Error fetching user:', error)
      toast.error('Failed to load user')
    } finally {
      setIsLoading(false)
    }
  }

  async function toggleStatus() {
    if (!user) return

    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('users')
        .update({ is_active: !user.is_active } as never)
        .eq('id', user.id)

      if (error) throw error

      toast.success(`User ${user.is_active ? 'deactivated' : 'activated'} successfully`)
      fetchUser()
    } catch (error) {
      console.error('Error updating user status:', error)
      toast.error('Failed to update user status')
    }
  }

  const getRoleBadge = (role: string) => {
    const styles: Record<string, { bg: string; icon: React.ReactNode; label: string }> = {
      super_admin: { bg: 'bg-purple-100 text-purple-700', icon: <Shield className="w-4 h-4" />, label: 'Super Admin' },
      institution_admin: { bg: 'bg-blue-100 text-blue-700', icon: <UserCog className="w-4 h-4" />, label: 'Institution Admin' },
      institution_staff: { bg: 'bg-gray-100 text-gray-700', icon: <Users className="w-4 h-4" />, label: 'Institution Staff' },
    }
    return styles[role] || styles.institution_staff
  }

  if (isLoading) {
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

  const roleBadge = getRoleBadge(user.role)

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Users
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{user.full_name}</h1>
            <p className="text-gray-500 mt-1">{user.email}</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant={user.is_active ? 'danger' : 'primary'}
              onClick={toggleStatus}
            >
              {user.is_active ? 'Deactivate' : 'Activate'}
            </Button>
            <Link href={`/admin/users/${user.id}/edit`}>
              <Button leftIcon={<Pencil className="w-4 h-4" />}>
                Edit User
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Mail className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email Address</p>
                  <p className="font-medium text-gray-900">{user.email}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Phone className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Phone Number</p>
                  <p className="font-medium text-gray-900">{user.phone || '—'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Calendar className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Created</p>
                  <p className="font-medium text-gray-900">
                    {new Date(user.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Clock className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Last Login</p>
                  <p className="font-medium text-gray-900">
                    {user.last_login_at
                      ? new Date(user.last_login_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Never'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Center Info (if assigned) */}
          {user.institution && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Assigned Center</h2>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Building2 className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{user.institution.name}</p>
                    <p className="text-sm text-gray-500">/{user.institution.slug}</p>
                  </div>
                </div>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  user.institution.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                }`}>
                  {user.institution.status}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Status & Role</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 mb-2">Account Status</p>
                <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                  user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {user.is_active ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Active
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4" />
                      Inactive
                    </>
                  )}
                </span>
              </div>

              <div>
                <p className="text-sm text-gray-500 mb-2">Role</p>
                <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${roleBadge.bg}`}>
                  {roleBadge.icon}
                  {roleBadge.label}
                </span>
              </div>
            </div>
          </div>

          {/* Role Description */}
          <div className="bg-gray-50 rounded-xl p-6">
            <h3 className="font-medium text-gray-900 mb-2">Role Permissions</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              {user.role === 'super_admin' && (
                <>
                  <li>• Full platform access</li>
                  <li>• Manage all centers</li>
                  <li>• Create and manage users</li>
                  <li>• Access all reports</li>
                  <li>• Configure platform settings</li>
                </>
              )}
              {user.role === 'institution_admin' && (
                <>
                  <li>• Full center access</li>
                  <li>• Manage students and teachers</li>
                  <li>• Handle payments and fees</li>
                  <li>• Access center reports</li>
                  <li>• Manage center staff</li>
                </>
              )}
              {user.role === 'institution_staff' && (
                <>
                  <li>• Limited center access</li>
                  <li>• View and edit students</li>
                  <li>• Record payments</li>
                  <li>• View basic reports</li>
                </>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
