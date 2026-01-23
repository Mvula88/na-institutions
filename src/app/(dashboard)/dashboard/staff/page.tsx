'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ConfirmModal } from '@/components/ui/modal'
import { PLAN_LIMITS } from '@/lib/subscription-limits'
import {
  Users,
  Plus,
  Search,
  UserX,
  UserCheck,
  Mail,
  Phone,
  Loader2,
  X,
  Crown,
  Lock,
  Eye,
  EyeOff,
  Shield,
} from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'

interface StaffMember {
  id: string
  email: string
  full_name: string
  phone: string | null
  role: string
  is_active: boolean
  created_at: string
  last_login_at: string | null
}

interface StaffLimitInfo {
  current: number
  limit: number
  tier: string
  canAdd: boolean
}

export default function StaffPage() {
  const { user, getSubscriptionTier } = useAuthStore()
  const subscriptionTier = getSubscriptionTier()
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [staffLimit, setStaffLimit] = useState<StaffLimitInfo | null>(null)

  // Add staff modal
  const [showAddModal, setShowAddModal] = useState(false)
  const [isAddingStaff, setIsAddingStaff] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [addForm, setAddForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Deactivate modal
  const [deactivateModal, setDeactivateModal] = useState<{ open: boolean; staff: StaffMember | null }>({
    open: false,
    staff: null,
  })
  const [isDeactivating, setIsDeactivating] = useState(false)

  useEffect(() => {
    if (user?.institution_id) {
      fetchStaff()
      fetchStaffLimit()
    }
  }, [user?.institution_id])

  async function fetchStaff() {
    if (!user?.institution_id) return
    setIsLoading(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('institution_id', user.institution_id)
      .eq('role', 'center_staff')
      .order('full_name')

    if (!error) {
      setStaff((data || []) as StaffMember[])
    }
    setIsLoading(false)
  }

  async function fetchStaffLimit() {
    if (!user?.institution_id) return
    const supabase = createClient()

    const { data: centerData } = await supabase
      .from('institutions')
      .select('subscription_tier')
      .eq('id', user.institution_id)
      .single()

    const center = centerData as { subscription_tier: string | null } | null
    const tier = center?.subscription_tier || 'starter'
    const limit = PLAN_LIMITS[tier as keyof typeof PLAN_LIMITS]?.maxStaff ?? 2

    const { count } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('institution_id', user.institution_id)
      .eq('role', 'center_staff')
      .eq('is_active', true)

    const current = count || 0
    const isUnlimited = limit === -1

    setStaffLimit({
      current,
      limit,
      tier,
      canAdd: isUnlimited || current < limit,
    })
  }

  function validateForm() {
    const errors: Record<string, string> = {}

    if (!addForm.full_name.trim()) {
      errors.full_name = 'Full name is required'
    }
    if (!addForm.email.trim()) {
      errors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addForm.email)) {
      errors.email = 'Please enter a valid email'
    }
    if (!addForm.password) {
      errors.password = 'Password is required'
    } else if (addForm.password.length < 6) {
      errors.password = 'Password must be at least 6 characters'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleAddStaff(e: React.FormEvent) {
    e.preventDefault()
    if (!validateForm() || !user?.institution_id) return

    setIsAddingStaff(true)

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: addForm.email.toLowerCase().trim(),
          password: addForm.password,
          full_name: addForm.full_name.trim(),
          phone: addForm.phone.trim() || null,
          role: 'center_staff',
          institution_id: user.institution_id,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create staff member')
      }

      toast.success('Staff member added successfully!')
      setShowAddModal(false)
      setAddForm({ full_name: '', email: '', phone: '', password: '' })
      fetchStaff()
      fetchStaffLimit()
    } catch (error) {
      console.error('Error adding staff:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to add staff member')
    } finally {
      setIsAddingStaff(false)
    }
  }

  async function handleDeactivateStaff() {
    if (!deactivateModal.staff) return
    setIsDeactivating(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('users')
        .update({ is_active: false } as never)
        .eq('id', deactivateModal.staff.id)

      if (error) throw error

      toast.success('Staff member deactivated')
      setDeactivateModal({ open: false, staff: null })
      fetchStaff()
      fetchStaffLimit()
    } catch (error) {
      console.error('Error deactivating staff:', error)
      toast.error('Failed to deactivate staff member')
    } finally {
      setIsDeactivating(false)
    }
  }

  async function handleReactivateStaff(staffMember: StaffMember) {
    if (staffLimit && !staffLimit.canAdd && staffLimit.limit !== -1) {
      toast.error(`Cannot reactivate: You've reached your staff limit of ${staffLimit.limit}`)
      return
    }

    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('users')
        .update({ is_active: true } as never)
        .eq('id', staffMember.id)

      if (error) throw error

      toast.success('Staff member reactivated')
      fetchStaff()
      fetchStaffLimit()
    } catch (error) {
      console.error('Error reactivating staff:', error)
      toast.error('Failed to reactivate staff member')
    }
  }

  const filteredStaff = staff.filter(
    (s) =>
      s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const activeStaff = filteredStaff.filter((s) => s.is_active)
  const inactiveStaff = filteredStaff.filter((s) => !s.is_active)
  const isMicroPlan = staffLimit?.limit === 0

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 md:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Staff Management</h1>
              <p className="mt-1 text-sm text-gray-500">Manage your tutorial center staff members</p>
            </div>
            {staffLimit && !isMicroPlan && (
              <Button
                size="lg"
                leftIcon={<Plus className="w-5 h-5" />}
                onClick={() => {
                  if (!staffLimit.canAdd) {
                    toast.error(`You've reached your staff limit of ${staffLimit.limit}. Upgrade to add more.`)
                    return
                  }
                  setAddForm({ full_name: '', email: '', phone: '', password: '' })
                  setFormErrors({})
                  setShowAddModal(true)
                }}
                disabled={!staffLimit.canAdd}
              >
                Add Staff
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-6 space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Staff</p>
                <p className="mt-2 text-2xl font-semibold text-gray-900">
                  {staff.length}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Active</p>
                <p className="mt-2 text-2xl font-semibold text-green-600">
                  {activeStaff.length}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Can log in
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-xl">
                <UserCheck className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Inactive</p>
                <p className="mt-2 text-2xl font-semibold text-gray-600">
                  {inactiveStaff.length}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Deactivated
                </p>
              </div>
              <div className="p-3 bg-gray-100 rounded-xl">
                <UserX className="w-6 h-6 text-gray-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Limit</p>
                <p className="mt-2 text-2xl font-semibold text-purple-600">
                  {staffLimit?.limit === -1 ? '∞' : staffLimit?.limit || 0}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {staffLimit?.tier} plan
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-xl">
                <Shield className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Staff Limit Banner */}
        {staffLimit && !isMicroPlan && !staffLimit.canAdd && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-amber-600" />
              <div>
                <p className="font-medium text-amber-900">Staff limit reached</p>
                <p className="text-sm text-amber-700">
                  You have {staffLimit.current} of {staffLimit.limit} staff members. Upgrade to add more.
                </p>
              </div>
            </div>
            <Link href="/dashboard/subscription">
              <Button variant="outline" size="sm" leftIcon={<Crown className="w-4 h-4" />}>
                Upgrade Plan
              </Button>
            </Link>
          </div>
        )}

        {/* Micro Plan - Show upgrade message */}
        {isMicroPlan ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Lock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Staff Management Not Available</h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              The Micro plan is designed for solo operators. Upgrade to Starter or higher to add staff members.
            </p>
            <Link href="/dashboard/subscription">
              <Button leftIcon={<Crown className="w-4 h-4" />}>
                View Upgrade Options
              </Button>
            </Link>

            {/* Plan comparison */}
            <div className="mt-8 pt-8 border-t border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-4">Staff Limits by Plan</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
                {[
                  { name: 'Micro', price: 'N$99', staff: '0', current: subscriptionTier === 'micro' },
                  { name: 'Starter', price: 'N$199', staff: '2', current: subscriptionTier === 'starter' },
                  { name: 'Standard', price: 'N$399', staff: '5', current: subscriptionTier === 'standard' },
                  { name: 'Premium', price: 'N$599', staff: 'Unlimited', current: subscriptionTier === 'premium' },
                ].map((plan) => (
                  <div
                    key={plan.name}
                    className={`p-3 rounded-lg border ${
                      plan.current ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    <p className="font-medium text-gray-900">{plan.name}</p>
                    <p className="text-sm text-gray-500">{plan.price}/mo</p>
                    <p className="text-sm font-medium text-blue-600 mt-1">{plan.staff} staff</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Search */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search staff by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none text-sm"
                />
              </div>
            </div>

            {/* Staff List */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {isLoading ? (
                <div className="p-8 text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
                  <p className="mt-2 text-sm text-gray-500">Loading staff...</p>
                </div>
              ) : staff.length === 0 ? (
                <div className="p-12 text-center">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No staff members yet</h3>
                  <p className="text-gray-500 mb-6">Add staff to help manage your tutorial center</p>
                  {staffLimit?.canAdd && (
                    <Button
                      leftIcon={<Plus className="w-4 h-4" />}
                      onClick={() => {
                        setAddForm({ full_name: '', email: '', phone: '', password: '' })
                        setFormErrors({})
                        setShowAddModal(true)
                      }}
                    >
                      Add Your First Staff Member
                    </Button>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {/* Active Staff */}
                  {activeStaff.length > 0 && (
                    <>
                      <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
                        <p className="text-sm font-semibold text-gray-600">Active Staff ({activeStaff.length})</p>
                      </div>
                      {activeStaff.map((member) => (
                        <div key={member.id} className="p-4 md:px-6 md:py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-gray-50 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="w-11 h-11 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                              <span className="text-blue-600 font-semibold text-lg">
                                {member.full_name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{member.full_name}</p>
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Mail className="w-3.5 h-3.5" />
                                  {member.email}
                                </span>
                                {member.phone && (
                                  <span className="flex items-center gap-1">
                                    <Phone className="w-3.5 h-3.5" />
                                    {member.phone}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 ml-15 md:ml-0">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                              <UserCheck className="w-3.5 h-3.5" />
                              Active
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDeactivateModal({ open: true, staff: member })}
                            >
                              Deactivate
                            </Button>
                          </div>
                        </div>
                      ))}
                    </>
                  )}

                  {/* Inactive Staff */}
                  {inactiveStaff.length > 0 && (
                    <>
                      <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
                        <p className="text-sm font-semibold text-gray-600">Inactive Staff ({inactiveStaff.length})</p>
                      </div>
                      {inactiveStaff.map((member) => (
                        <div key={member.id} className="p-4 md:px-6 md:py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-gray-50 transition-colors opacity-60">
                          <div className="flex items-center gap-4">
                            <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                              <span className="text-gray-400 font-semibold text-lg">
                                {member.full_name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-600">{member.full_name}</p>
                              <p className="text-sm text-gray-400">{member.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 ml-15 md:ml-0">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                              <UserX className="w-3.5 h-3.5" />
                              Inactive
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleReactivateStaff(member)}
                              disabled={staffLimit ? !staffLimit.canAdd && staffLimit.limit !== -1 : false}
                            >
                              Reactivate
                            </Button>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Add Staff Member</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddStaff} className="p-6 space-y-4">
              <Input
                label="Full Name"
                required
                value={addForm.full_name}
                onChange={(e) => setAddForm({ ...addForm, full_name: e.target.value })}
                error={formErrors.full_name}
                placeholder="e.g., John Smith"
              />
              <Input
                label="Email"
                type="email"
                required
                value={addForm.email}
                onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                error={formErrors.email}
                placeholder="e.g., john@example.com"
              />
              <Input
                label="Phone (Optional)"
                type="tel"
                value={addForm.phone}
                onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                placeholder="e.g., 081 234 5678"
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={addForm.password}
                    onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                    className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none text-sm ${
                      formErrors.password ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Minimum 6 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {formErrors.password && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.password}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Share this password with the staff member so they can log in
                </p>
              </div>

              <div className="bg-blue-50 rounded-lg p-4">
                <p className="font-medium text-blue-900 mb-2 text-sm">Staff Permissions</p>
                <ul className="text-blue-700 space-y-1 text-sm">
                  <li>• View and manage students</li>
                  <li>• View and manage payments</li>
                  <li>• Access enabled modules (Library, etc.)</li>
                  <li>• Cannot access settings or billing</li>
                </ul>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)} className="flex-1">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isAddingStaff}
                  leftIcon={isAddingStaff ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  className="flex-1"
                >
                  {isAddingStaff ? 'Adding...' : 'Add Staff'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deactivate Modal */}
      <ConfirmModal
        isOpen={deactivateModal.open}
        onClose={() => setDeactivateModal({ open: false, staff: null })}
        onConfirm={handleDeactivateStaff}
        title="Deactivate Staff Member"
        message={`Are you sure you want to deactivate "${deactivateModal.staff?.full_name}"? They will no longer be able to log in. You can reactivate them later.`}
        confirmText="Deactivate"
        isLoading={isDeactivating}
      />
    </div>
  )
}
