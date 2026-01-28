'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/modal'
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Building2,
  Mail,
  Phone,
  MapPin,
  Users,
  GraduationCap,
  CreditCard,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Settings,
  Palette,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Center {
  id: string
  name: string
  slug: string
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  logo_url: string | null
  primary_color: string
  secondary_color: string
  bank_name: string | null
  account_number: string | null
  branch_code: string | null
  status: string
  subscription_tier: string | null
  subscription_start_date: string | null
  subscription_end_date: string | null
  hostel_module_enabled: boolean
  transport_module_enabled: boolean
  library_module_enabled: boolean
  sms_module_enabled: boolean
  created_at: string
  updated_at: string
}

interface CenterStats {
  users: number
  students: number
  teachers: number
  subjects: number
  payments: number
  totalRevenue: number
}

export default function CenterDetailPage() {
  const params = useParams()
  const centerId = params.id as string
  const router = useRouter()
  const [center, setCenter] = useState<Center | null>(null)
  const [stats, setStats] = useState<CenterStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [statusModalOpen, setStatusModalOpen] = useState(false)
  const [newStatus, setNewStatus] = useState('')

  useEffect(() => {
    if (centerId) {
      fetchCenter()
      fetchStats()
    }
  }, [centerId])

  async function fetchCenter() {
    const supabase = createClient()

    try {
      const { data, error } = await supabase
        .from('institutions')
        .select('*')
        .eq('id', centerId)
        .single()

      if (error) throw error

      setCenter(data as Center)
    } catch (error) {
      console.error('Error fetching center:', error)
      toast.error('Failed to load center')
      router.push('/admin/centers')
    } finally {
      setIsLoading(false)
    }
  }

  async function fetchStats() {
    const supabase = createClient()

    try {
      const [usersRes, studentsRes, teachersRes, subjectsRes, paymentsRes] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact' }).eq('institution_id', centerId),
        supabase.from('students').select('id', { count: 'exact' }).eq('institution_id', centerId),
        supabase.from('lecturers').select('id', { count: 'exact' }).eq('institution_id', centerId),
        supabase.from('courses').select('id', { count: 'exact' }).eq('institution_id', centerId),
        supabase.from('payments').select('amount').eq('institution_id', centerId),
      ])

      const totalRevenue = ((paymentsRes.data || []) as { amount: number }[]).reduce(
        (sum, p) => sum + p.amount,
        0
      )

      setStats({
        users: usersRes.count || 0,
        students: studentsRes.count || 0,
        teachers: teachersRes.count || 0,
        subjects: subjectsRes.count || 0,
        payments: paymentsRes.data?.length || 0,
        totalRevenue,
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  async function handleDelete() {
    if (!center) return

    setIsDeleting(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('institutions')
        .delete()
        .eq('id', center.id)

      if (error) throw error

      toast.success('Center deleted successfully')
      router.push('/admin/centers')
    } catch (error) {
      console.error('Error deleting center:', error)
      toast.error('Failed to delete center')
    } finally {
      setIsDeleting(false)
    }
  }

  async function handleStatusChange() {
    if (!center || !newStatus) return

    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('institutions')
        .update({ status: newStatus } as never)
        .eq('id', center.id)

      if (error) throw error

      toast.success(`Center ${newStatus === 'active' ? 'activated' : newStatus === 'suspended' ? 'suspended' : 'deactivated'} successfully`)
      setStatusModalOpen(false)
      fetchCenter()
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('Failed to update status')
    }
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; icon: React.ReactNode }> = {
      active: { bg: 'bg-green-100 text-green-700', icon: <CheckCircle className="w-4 h-4" /> },
      inactive: { bg: 'bg-gray-100 text-gray-700', icon: <Clock className="w-4 h-4" /> },
      suspended: { bg: 'bg-red-100 text-red-700', icon: <XCircle className="w-4 h-4" /> },
    }
    return styles[status] || styles.inactive
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    )
  }

  if (!center) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Center not found</p>
        <Link href="/admin/centers">
          <Button className="mt-4">Back to Centers</Button>
        </Link>
      </div>
    )
  }

  const statusBadge = getStatusBadge(center.status)

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/admin/centers"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Centers
        </Link>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: center.primary_color }}
            >
              {center.logo_url ? (
                <img src={center.logo_url} alt={center.name} className="w-12 h-12 object-contain" />
              ) : (
                <Building2 className="w-8 h-8 text-white" />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{center.name}</h1>
              <p className="text-gray-500">{center.city || 'No location set'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setNewStatus(center.status === 'active' ? 'suspended' : 'active')
                setStatusModalOpen(true)
              }}
              className={center.status === 'active' ? 'text-amber-600' : 'text-green-600'}
            >
              {center.status === 'active' ? 'Suspend' : 'Activate'}
            </Button>
            <Link href={`/admin/centers/${center.id}/edit`}>
              <Button variant="outline" leftIcon={<Pencil className="w-4 h-4" />}>
                Edit
              </Button>
            </Link>
            <Button
              variant="outline"
              onClick={() => setDeleteModalOpen(true)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Status Badge */}
        <div className="mt-4">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${statusBadge.bg}`}>
            {statusBadge.icon}
            {center.status.charAt(0).toUpperCase() + center.status.slice(1)}
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats?.users || 0}</p>
              <p className="text-sm text-gray-500">Users</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100">
              <GraduationCap className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats?.students || 0}</p>
              <p className="text-sm text-gray-500">Students</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats?.teachers || 0}</p>
              <p className="text-sm text-gray-500">Lecturers</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100">
              <CreditCard className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                R {(stats?.totalRevenue || 0).toLocaleString()}
              </p>
              <p className="text-sm text-gray-500">Revenue</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium text-gray-900">{center.email || 'Not set'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                  <Phone className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="font-medium text-gray-900">{center.phone || 'Not set'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Address</p>
                  <p className="font-medium text-gray-900">{center.address || 'Not set'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Banking Details */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-gray-400" />
              Banking Details
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500">Bank Name</p>
                <p className="font-medium text-gray-900">{center.bank_name || 'Not set'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Account Number</p>
                <p className="font-medium text-gray-900">{center.account_number || 'Not set'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Branch Code</p>
                <p className="font-medium text-gray-900">{center.branch_code || 'Not set'}</p>
              </div>
            </div>
          </div>

          {/* Branding */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Palette className="w-5 h-5 text-gray-400" />
              Branding
            </h2>
            <div className="flex items-center gap-6">
              <div>
                <p className="text-sm text-gray-500 mb-2">Primary Color</p>
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-lg border border-gray-200"
                    style={{ backgroundColor: center.primary_color }}
                  ></div>
                  <span className="text-sm font-mono">{center.primary_color}</span>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-2">Secondary Color</p>
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-lg border border-gray-200"
                    style={{ backgroundColor: center.secondary_color }}
                  ></div>
                  <span className="text-sm font-mono">{center.secondary_color}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Subscription */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Subscription</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Tier</span>
                <span className="font-semibold text-gray-900 capitalize">{center.subscription_tier || 'Basic'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Slug</span>
                <span className="font-mono text-sm text-gray-900">{center.slug}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Created</span>
                <span className="text-gray-900">{new Date(center.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Modules */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5 text-gray-400" />
              Modules
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Hostel Management</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  center.hostel_module_enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {center.hostel_module_enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Transport</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  center.transport_module_enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {center.transport_module_enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Library</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  center.library_module_enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {center.library_module_enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">SMS Notifications</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  center.sms_module_enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {center.sms_module_enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <Link href={`/admin/centers/${center.id}/edit`}>
                <Button variant="outline" className="w-full justify-start" leftIcon={<Pencil className="w-4 h-4" />}>
                  Edit Center
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Center"
        message={`Are you sure you want to delete "${center.name}"? This will remove all associated data including users, students, teachers, and payments. This action cannot be undone.`}
        confirmText="Delete"
        isLoading={isDeleting}
      />

      {/* Status Change Modal */}
      <ConfirmModal
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        onConfirm={handleStatusChange}
        title={newStatus === 'active' ? 'Activate Center' : 'Suspend Center'}
        message={
          newStatus === 'active'
            ? `Are you sure you want to activate "${center.name}"? Users will be able to log in and use the system.`
            : `Are you sure you want to suspend "${center.name}"? All users will be logged out and unable to access the system.`
        }
        confirmText={newStatus === 'active' ? 'Activate' : 'Suspend'}
      />
    </div>
  )
}
