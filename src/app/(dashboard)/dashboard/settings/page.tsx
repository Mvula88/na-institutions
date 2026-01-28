'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  User,
  Building2,
  Shield,
  CreditCard,
  Palette,
  Save,
  Loader2,
  Eye,
  EyeOff,
  Home,
  Bus,
  BookOpen,
  MessageSquare,
  Calendar,
  CheckCircle,
  Zap,
  ExternalLink,
  AlertTriangle,
  Clock,
  Hash,
  Coins,
  CalendarDays,
  BookOpenCheck,
  Info,
  GraduationCap,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'
import toast from 'react-hot-toast'
import StudentNumberConfig from '@/components/settings/student-number-config'
import SemesterManager from '@/components/settings/semester-manager'
import AcademicYearManager from '@/components/settings/academic-year-manager'
import { LogoUpload } from '@/components/branding/logo-upload'
import { parseNumericInput, formatNumericValue } from '@/lib/numeric-input'
import { FeeModelType } from '@/types/database'

interface InstitutionData {
  name: string
  email: string
  phone: string
  address: string
  city: string
  primary_color: string
  secondary_color: string
  logo_url: string | null
  bank_name: string
  account_number: string
  branch_code: string
  hostel_module_enabled: boolean
  transport_module_enabled: boolean
  library_module_enabled: boolean
  sms_module_enabled: boolean
  payment_months: number[]
  default_registration_fee: number
  fee_model: FeeModelType
}

interface SubscriptionData {
  subscription_status: string
  subscription_tier: string
  current_period_end: string | null
  cancel_at_period_end: boolean
  trial_ends_at: string | null
  stripe_customer_id: string | null
}

const MONTHS = [
  { value: 0, label: 'January', short: 'Jan' },
  { value: 1, label: 'February', short: 'Feb' },
  { value: 2, label: 'March', short: 'Mar' },
  { value: 3, label: 'April', short: 'Apr' },
  { value: 4, label: 'May', short: 'May' },
  { value: 5, label: 'June', short: 'Jun' },
  { value: 6, label: 'July', short: 'Jul' },
  { value: 7, label: 'August', short: 'Aug' },
  { value: 8, label: 'September', short: 'Sep' },
  { value: 9, label: 'October', short: 'Oct' },
  { value: 10, label: 'November', short: 'Nov' },
  { value: 11, label: 'December', short: 'Dec' },
]

export default function InstitutionSettingsPage() {
  const { user, fetchUser, isInstitutionAdmin } = useAuthStore()
  const [activeTab, setActiveTab] = useState('profile')
  const [isLoading, setIsLoading] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const [profileData, setProfileData] = useState({
    full_name: user?.full_name || '',
    phone: user?.phone || '',
  })

  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  })

  const [institutionData, setInstitutionData] = useState<InstitutionData>({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    primary_color: '#1E40AF',
    secondary_color: '#F59E0B',
    logo_url: null,
    bank_name: '',
    account_number: '',
    branch_code: '',
    hostel_module_enabled: false,
    transport_module_enabled: false,
    library_module_enabled: false,
    sms_module_enabled: false,
    payment_months: [1, 2, 3, 4, 5, 6, 7, 8, 9], // Feb-Oct default
    default_registration_fee: 0,
    fee_model: 'monthly_per_course',
  })

  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData>({
    subscription_status: 'inactive',
    subscription_tier: 'starter',
    current_period_end: null,
    cancel_at_period_end: false,
    trial_ends_at: null,
    stripe_customer_id: null,
  })

  const [isPortalLoading, setIsPortalLoading] = useState(false)

  useEffect(() => {
    if (user?.institution) {
      fetchInstitutionData()
    }
  }, [user?.institution_id])

  async function fetchInstitutionData() {
    if (!user?.institution_id) return

    const supabase = createClient()
    const { data, error } = await supabase
      .from('institutions')
      .select('*')
      .eq('id', user.institution_id)
      .single()

    if (!error && data) {
      const institution = data as InstitutionData & SubscriptionData & { name: string }
      setInstitutionData({
        name: institution.name || '',
        email: institution.email || '',
        phone: institution.phone || '',
        address: institution.address || '',
        city: institution.city || '',
        primary_color: institution.primary_color || '#1E40AF',
        secondary_color: institution.secondary_color || '#F59E0B',
        logo_url: institution.logo_url || null,
        bank_name: institution.bank_name || '',
        account_number: institution.account_number || '',
        branch_code: institution.branch_code || '',
        hostel_module_enabled: institution.hostel_module_enabled || false,
        transport_module_enabled: institution.transport_module_enabled || false,
        library_module_enabled: institution.library_module_enabled || false,
        sms_module_enabled: institution.sms_module_enabled || false,
        payment_months: institution.payment_months || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        default_registration_fee: institution.default_registration_fee || 0,
        fee_model: institution.fee_model || 'monthly_per_course',
      })
      setSubscriptionData({
        subscription_status: institution.subscription_status || 'inactive',
        subscription_tier: institution.subscription_tier || 'starter',
        current_period_end: institution.current_period_end || null,
        cancel_at_period_end: institution.cancel_at_period_end || false,
        trial_ends_at: institution.trial_ends_at || null,
        stripe_customer_id: institution.stripe_customer_id || null,
      })
    }
  }

  async function handleManageSubscription() {
    setIsPortalLoading(true)
    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to open billing portal')
      }

      window.location.href = data.url
    } catch (error) {
      console.error('Portal error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to open billing portal')
    } finally {
      setIsPortalLoading(false)
    }
  }

  async function handleUpgrade(plan: string) {
    setIsPortalLoading(true)
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start checkout')
      }

      window.location.href = data.url
    } catch (error) {
      console.error('Checkout error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to start checkout')
    } finally {
      setIsPortalLoading(false)
    }
  }

  function getSubscriptionStatusBadge(status: string) {
    const statusMap: Record<string, { color: string; label: string }> = {
      active: { color: 'bg-green-100 text-green-700', label: 'Active' },
      trialing: { color: 'bg-blue-100 text-blue-700', label: 'Trial' },
      past_due: { color: 'bg-red-100 text-red-700', label: 'Past Due' },
      cancelled: { color: 'bg-gray-100 text-gray-700', label: 'Cancelled' },
      inactive: { color: 'bg-yellow-100 text-yellow-700', label: 'Inactive' },
    }
    return statusMap[status] || statusMap.inactive
  }

  function formatDate(dateString: string | null) {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-NA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  function getDaysRemaining(dateString: string | null) {
    if (!dateString) return 0
    const endDate = new Date(dateString)
    const today = new Date()
    const diffTime = endDate.getTime() - today.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  async function handleProfileUpdate(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)

    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('users')
        .update({
          full_name: profileData.full_name,
          phone: profileData.phone || null,
          updated_at: new Date().toISOString(),
        } as never)
        .eq('id', user?.id as string)

      if (error) throw error

      await fetchUser()
      toast.success('Profile updated successfully')
    } catch (error) {
      console.error('Error updating profile:', error)
      toast.error('Failed to update profile')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleInstitutionUpdate(e: React.FormEvent, shouldReload = false) {
    e.preventDefault()
    if (!user?.institution_id) return

    setIsLoading(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('institutions')
        .update({
          email: institutionData.email || null,
          phone: institutionData.phone || null,
          address: institutionData.address || null,
          city: institutionData.city || null,
          primary_color: institutionData.primary_color,
          secondary_color: institutionData.secondary_color,
          bank_name: institutionData.bank_name || null,
          account_number: institutionData.account_number || null,
          branch_code: institutionData.branch_code || null,
          updated_at: new Date().toISOString(),
        } as never)
        .eq('id', user.institution_id)

      if (error) throw error

      toast.success('Settings updated successfully')

      // Reload page if branding changed to apply new colors
      if (shouldReload) {
        toast.success('Applying branding changes...')
        // Force hard reload to clear all caches and apply new colors
        setTimeout(() => {
          window.location.href = window.location.href
        }, 300)
      } else {
        await fetchUser()
      }
    } catch (error) {
      console.error('Error updating center:', error)
      toast.error('Failed to update center settings')
    } finally {
      setIsLoading(false)
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()

    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error('New passwords do not match')
      return
    }

    if (passwordData.new_password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    setIsLoading(true)
    const supabase = createClient()

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.new_password,
      })

      if (error) throw error

      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: '',
      })
      toast.success('Password changed successfully')
    } catch (error) {
      console.error('Error changing password:', error)
      toast.error('Failed to change password')
    } finally {
      setIsLoading(false)
    }
  }

  const tabs = [
    { id: 'profile', label: 'My Profile', icon: <User className="w-4 h-4" /> },
    { id: 'security', label: 'Security', icon: <Shield className="w-4 h-4" /> },
    ...(isInstitutionAdmin() ? [
      { id: 'subscription', label: 'Subscription', icon: <Zap className="w-4 h-4" /> },
      { id: 'institution', label: 'Institution', icon: <Building2 className="w-4 h-4" /> },
      { id: 'student-numbers', label: 'Student Numbers', icon: <Hash className="w-4 h-4" /> },
      { id: 'fee-model', label: 'Fee Model', icon: <Coins className="w-4 h-4" /> },
      { id: 'academic-years', label: 'Academic Years', icon: <GraduationCap className="w-4 h-4" /> },
      { id: 'payment-schedule', label: 'Payment Schedule', icon: <Calendar className="w-4 h-4" /> },
      { id: 'branding', label: 'Branding', icon: <Palette className="w-4 h-4" /> },
      { id: 'banking', label: 'Banking', icon: <CreditCard className="w-4 h-4" /> },
    ] : []),
  ]

  const togglePaymentMonth = (month: number) => {
    const newMonths = institutionData.payment_months.includes(month)
      ? institutionData.payment_months.filter(m => m !== month)
      : [...institutionData.payment_months, month].sort((a, b) => a - b)
    setInstitutionData({ ...institutionData, payment_months: newMonths })
  }

  async function handleAcademicUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!user?.institution_id) return

    if (institutionData.payment_months.length === 0) {
      toast.error('Please select at least one payment month')
      return
    }

    setIsLoading(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('institutions')
        .update({
          payment_months: institutionData.payment_months,
          default_registration_fee: institutionData.default_registration_fee,
          updated_at: new Date().toISOString(),
        } as never)
        .eq('id', user.institution_id)

      if (error) throw error

      toast.success('Academic year settings saved!')
      await fetchUser()
    } catch (error) {
      console.error('Error updating academic settings:', error)
      toast.error('Failed to update settings')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleFeeModelUpdate(newModel: FeeModelType) {
    if (!user?.institution_id) return

    setIsLoading(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('institutions')
        .update({
          fee_model: newModel,
          updated_at: new Date().toISOString(),
        } as never)
        .eq('id', user.institution_id)

      if (error) throw error

      setInstitutionData({ ...institutionData, fee_model: newModel })
      toast.success('Fee model updated successfully!')
      await fetchUser()
    } catch (error) {
      console.error('Error updating fee model:', error)
      toast.error('Failed to update fee model')
    } finally {
      setIsLoading(false)
    }
  }

  const feeModels: { id: FeeModelType; label: string; description: string; icon: React.ReactNode; bestFor: string }[] = [
    {
      id: 'monthly_per_course',
      label: 'Monthly per Course',
      description: 'Students pay a monthly fee for each course they are enrolled in. Fees are generated each month.',
      icon: <Calendar className="w-6 h-6" />,
      bestFor: 'Tutorial centers, coaching classes',
    },
    {
      id: 'per_course_lumpsum',
      label: 'Per Course (Lump Sum)',
      description: 'Each course has a fixed total fee. Can be split into installments. Common for VTCs.',
      icon: <BookOpenCheck className="w-6 h-6" />,
      bestFor: 'VTCs, training institutes, short courses',
    },
    {
      id: 'per_semester',
      label: 'Per Semester/Term',
      description: 'Students pay a fixed fee per semester regardless of courses. Semester dates and fees are configured.',
      icon: <CalendarDays className="w-6 h-6" />,
      bestFor: 'Universities, colleges, polytechnics',
    },
  ]

  const modules = [
    { key: 'hostel_module_enabled', label: 'Hostel Management', icon: <Home className="w-5 h-5" />, description: 'Manage student accommodations' },
    { key: 'transport_module_enabled', label: 'Transport', icon: <Bus className="w-5 h-5" />, description: 'Manage student transport' },
    { key: 'library_module_enabled', label: 'Library', icon: <BookOpen className="w-5 h-5" />, description: 'Manage library resources' },
    { key: 'sms_module_enabled', label: 'SMS Notifications', icon: <MessageSquare className="w-5 h-5" />, description: 'Send SMS to parents' },
  ]

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 md:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
              <p className="mt-1 text-sm text-gray-500">Manage your profile and center settings</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        {/* Mobile Tab Bar */}
        <div className="lg:hidden">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-2 overflow-x-auto">
            <div className="flex gap-1 min-w-max">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {tab.icon}
                  <span className="font-medium text-sm">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Desktop Sidebar Tabs */}
        <div className={`hidden lg:block flex-shrink-0 transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-56'}`}>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-2">
            {/* Collapse Toggle Button */}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="w-full flex items-center justify-center p-2 mb-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="w-5 h-5" />
              ) : (
                <PanelLeftClose className="w-5 h-5" />
              )}
            </button>

            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                title={sidebarCollapsed ? tab.label : undefined}
                className={`w-full flex items-center rounded-lg text-left transition-colors ${
                  sidebarCollapsed ? 'justify-center px-2 py-3' : 'gap-3 px-4 py-3'
                } ${
                  activeTab === tab.id
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {tab.icon}
                {!sidebarCollapsed && <span className="font-medium text-sm">{tab.label}</span>}
              </button>
            ))}
          </div>

          {/* Module Status */}
          {isInstitutionAdmin() && !sidebarCollapsed && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mt-6">
              <h3 className="font-medium text-gray-900 mb-3">Active Modules</h3>
              <div className="space-y-2">
                {modules.map((module) => (
                  <div
                    key={module.key}
                    className={`flex items-center gap-2 text-sm ${
                      institutionData[module.key as keyof InstitutionData] ? 'text-green-600' : 'text-gray-400'
                    }`}
                  >
                    {module.icon}
                    <span>{module.label}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-3">
                Contact admin to enable/disable modules
              </p>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 max-w-2xl">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-100">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <User className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">My Profile</h2>
                  <p className="text-sm text-gray-500">Update your personal information</p>
                </div>
              </div>

              <form onSubmit={handleProfileUpdate} className="space-y-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">Email Address</p>
                  <p className="font-medium text-gray-900">{user?.email}</p>
                </div>

                <Input
                  label="Full Name"
                  value={profileData.full_name}
                  onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                  placeholder="Your full name"
                />

                <Input
                  label="Phone Number"
                  type="tel"
                  value={profileData.phone}
                  onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                  placeholder="+264 81 123 4567"
                />

                <Button
                  type="submit"
                  disabled={isLoading}
                  leftIcon={isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                >
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </Button>
              </form>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-100">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Shield className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Security</h2>
                  <p className="text-sm text-gray-500">Change your password</p>
                </div>
              </div>

              <form onSubmit={handlePasswordChange} className="space-y-6">
                <div className="relative">
                  <Input
                    label="Current Password"
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={passwordData.current_password}
                    onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <div className="relative">
                  <Input
                    label="New Password"
                    type={showNewPassword ? 'text' : 'password'}
                    value={passwordData.new_password}
                    onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                    placeholder="Minimum 6 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <Input
                  label="Confirm New Password"
                  type="password"
                  value={passwordData.confirm_password}
                  onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                  placeholder="Confirm new password"
                />

                <Button
                  type="submit"
                  disabled={isLoading || !passwordData.new_password}
                  leftIcon={isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                >
                  {isLoading ? 'Changing...' : 'Change Password'}
                </Button>
              </form>
            </div>
          )}

          {/* Subscription Tab */}
          {activeTab === 'subscription' && isInstitutionAdmin() && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-100">
                <div className="p-3 bg-indigo-100 rounded-lg">
                  <Zap className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Subscription</h2>
                  <p className="text-sm text-gray-500">Manage your subscription and billing</p>
                </div>
              </div>

              {/* Current Plan */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-gray-900">Current Plan</h3>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getSubscriptionStatusBadge(subscriptionData.subscription_status).color}`}>
                    {getSubscriptionStatusBadge(subscriptionData.subscription_status).label}
                  </span>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Plan</span>
                    <span className="font-medium text-gray-900 capitalize">{subscriptionData.subscription_tier}</span>
                  </div>

                  {subscriptionData.subscription_status === 'trialing' && subscriptionData.trial_ends_at && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Trial Ends</span>
                      <span className="font-medium text-gray-900">{formatDate(subscriptionData.trial_ends_at)}</span>
                    </div>
                  )}

                  {subscriptionData.subscription_status === 'active' && subscriptionData.current_period_end && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Next Billing Date</span>
                      <span className="font-medium text-gray-900">{formatDate(subscriptionData.current_period_end)}</span>
                    </div>
                  )}

                  {subscriptionData.cancel_at_period_end && (
                    <div className="flex items-center gap-2 text-amber-600 mt-2">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-sm">Subscription will cancel at period end</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Trial Warning */}
              {subscriptionData.subscription_status === 'trialing' && subscriptionData.trial_ends_at && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-900">Trial Period</h4>
                      <p className="text-sm text-blue-700 mt-1">
                        You have {getDaysRemaining(subscriptionData.trial_ends_at)} days remaining in your trial.
                        Upgrade now to continue using all features after your trial ends.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Past Due Warning */}
              {subscriptionData.subscription_status === 'past_due' && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-red-900">Payment Failed</h4>
                      <p className="text-sm text-red-700 mt-1">
                        Your last payment failed. Please update your payment method to avoid service interruption.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-3">
                {subscriptionData.stripe_customer_id ? (
                  <Button
                    onClick={handleManageSubscription}
                    disabled={isPortalLoading}
                    leftIcon={isPortalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                    className="w-full"
                  >
                    {isPortalLoading ? 'Opening...' : 'Manage Subscription'}
                  </Button>
                ) : (
                  <>
                    {subscriptionData.subscription_status === 'trialing' || subscriptionData.subscription_status === 'inactive' ? (
                      <div className="space-y-3">
                        <p className="text-sm text-gray-600">Choose a plan to continue after your trial:</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                          <button
                            onClick={() => handleUpgrade('micro')}
                            disabled={isPortalLoading}
                            className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 transition-colors text-left"
                          >
                            <h4 className="font-medium text-gray-900">Micro</h4>
                            <p className="text-2xl font-bold text-gray-900 mt-1">N$99<span className="text-sm font-normal text-gray-500">/mo</span></p>
                            <p className="text-xs text-gray-500 mt-1">Up to 15 students</p>
                          </button>
                          <button
                            onClick={() => handleUpgrade('starter')}
                            disabled={isPortalLoading}
                            className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 transition-colors text-left"
                          >
                            <h4 className="font-medium text-gray-900">Starter</h4>
                            <p className="text-2xl font-bold text-gray-900 mt-1">N$199<span className="text-sm font-normal text-gray-500">/mo</span></p>
                            <p className="text-xs text-gray-500 mt-1">Up to 50 students</p>
                          </button>
                          <button
                            onClick={() => handleUpgrade('standard')}
                            disabled={isPortalLoading}
                            className="p-4 border-2 border-blue-500 rounded-lg bg-blue-50 text-left relative"
                          >
                            <span className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">Popular</span>
                            <h4 className="font-medium text-gray-900">Standard</h4>
                            <p className="text-2xl font-bold text-gray-900 mt-1">N$399<span className="text-sm font-normal text-gray-500">/mo</span></p>
                            <p className="text-xs text-gray-500 mt-1">Up to 150 students</p>
                          </button>
                          <button
                            onClick={() => handleUpgrade('premium')}
                            disabled={isPortalLoading}
                            className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 transition-colors text-left"
                          >
                            <h4 className="font-medium text-gray-900">Premium</h4>
                            <p className="text-2xl font-bold text-gray-900 mt-1">N$599<span className="text-sm font-normal text-gray-500">/mo</span></p>
                            <p className="text-xs text-gray-500 mt-1">Unlimited students</p>
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </>
                )}
              </div>

              {/* Features by Plan */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h3 className="font-medium text-gray-900 mb-4">Plan Features</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Micro</h4>
                    <ul className="space-y-1 text-gray-600">
                      <li>Up to 15 students</li>
                      <li>Student management</li>
                      <li>Fee tracking</li>
                      <li>Payment recording</li>
                      <li>Email support</li>
                    </ul>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Starter</h4>
                    <ul className="space-y-1 text-gray-600">
                      <li>Up to 50 students</li>
                      <li>Student management</li>
                      <li>Fee tracking</li>
                      <li>Basic reports</li>
                      <li>Email support</li>
                    </ul>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Standard</h4>
                    <ul className="space-y-1 text-gray-600">
                      <li>Up to 150 students</li>
                      <li>Everything in Starter</li>
                      <li>Library module</li>
                      <li>SMS notifications</li>
                      <li>Priority support</li>
                    </ul>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Premium</h4>
                    <ul className="space-y-1 text-gray-600">
                      <li>Unlimited students</li>
                      <li>Everything in Standard</li>
                      <li>Hostel management</li>
                      <li>Transport tracking</li>
                      <li>Custom branding</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Institution Details Tab */}
          {activeTab === 'institution' && isInstitutionAdmin() && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-100">
                <div className="p-3 bg-green-100 rounded-lg">
                  <Building2 className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Institution Details</h2>
                  <p className="text-sm text-gray-500">Update your institution information</p>
                </div>
              </div>

              <form onSubmit={handleInstitutionUpdate} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Institution Name</label>
                  <div className="bg-gray-100 rounded-lg px-4 py-3 text-gray-700">
                    {institutionData.name}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Contact super admin to change institution name</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Email"
                    type="email"
                    value={institutionData.email}
                    onChange={(e) => setInstitutionData({ ...institutionData, email: e.target.value })}
                    placeholder="institution@example.com"
                  />
                  <Input
                    label="Phone"
                    type="tel"
                    value={institutionData.phone}
                    onChange={(e) => setInstitutionData({ ...institutionData, phone: e.target.value })}
                    placeholder="+264 61 123 4567"
                  />
                </div>

                <Input
                  label="Address"
                  value={institutionData.address}
                  onChange={(e) => setInstitutionData({ ...institutionData, address: e.target.value })}
                  placeholder="Street address"
                />

                <Input
                  label="City"
                  value={institutionData.city}
                  onChange={(e) => setInstitutionData({ ...institutionData, city: e.target.value })}
                  placeholder="City"
                />

                <Button
                  type="submit"
                  disabled={isLoading}
                  leftIcon={isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                >
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </Button>
              </form>
            </div>
          )}

          {/* Student Numbers Tab */}
          {activeTab === 'student-numbers' && isInstitutionAdmin() && user?.institution_id && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-100">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Hash className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Student Number Format</h2>
                  <p className="text-sm text-gray-500">Configure how student numbers are generated</p>
                </div>
              </div>

              <StudentNumberConfig institutionId={user.institution_id} />
            </div>
          )}

          {/* Fee Model Tab */}
          {activeTab === 'fee-model' && isInstitutionAdmin() && user?.institution_id && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-100">
                <div className="p-3 bg-emerald-100 rounded-lg">
                  <Coins className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Fee Model</h2>
                  <p className="text-sm text-gray-500">Configure how fees are structured for your institution</p>
                </div>
              </div>

              <div className="space-y-6">
                {/* Warning notice */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex gap-3">
                    <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-800">
                      <p className="font-medium">Important</p>
                      <p className="mt-1">Changing the fee model will affect how new fees are generated. Existing fee records will remain unchanged.</p>
                    </div>
                  </div>
                </div>

                {/* Fee Model Selection */}
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Select Fee Model
                  </label>
                  <div className="grid gap-4">
                    {feeModels.map((model) => {
                      const isSelected = institutionData.fee_model === model.id
                      return (
                        <button
                          key={model.id}
                          type="button"
                          onClick={() => handleFeeModelUpdate(model.id)}
                          disabled={isLoading}
                          className={`relative text-left p-4 rounded-xl border-2 transition-all ${
                            isSelected
                              ? 'border-emerald-500 bg-emerald-50'
                              : 'border-gray-200 hover:border-gray-300'
                          } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <div className="flex items-start gap-4">
                            <div className={`p-2 rounded-lg ${isSelected ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                              {model.icon}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className={`font-medium ${isSelected ? 'text-emerald-900' : 'text-gray-900'}`}>
                                  {model.label}
                                </h3>
                                {isSelected && (
                                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                                )}
                              </div>
                              <p className="text-sm text-gray-600 mt-1">{model.description}</p>
                              <p className="text-xs text-gray-500 mt-2">
                                <span className="font-medium">Best for:</span> {model.bestFor}
                              </p>
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Model-specific configuration */}
                {institutionData.fee_model === 'monthly_per_course' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">Monthly per Course Configuration</h4>
                    <p className="text-sm text-blue-700">
                      Go to <span className="font-medium">Academic Year</span> tab to configure payment months and registration fee.
                      Course monthly fees are set in the <span className="font-medium">Courses</span> section.
                    </p>
                  </div>
                )}

                {institutionData.fee_model === 'per_course_lumpsum' && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <h4 className="font-medium text-purple-900 mb-2">Per Course (Lump Sum) Configuration</h4>
                    <p className="text-sm text-purple-700">
                      Set the total course fee and installment options in the <span className="font-medium">Courses</span> section.
                      When enrolling students, you can choose the installment plan for each course.
                    </p>
                  </div>
                )}

                {institutionData.fee_model === 'per_semester' && (
                  <div className="mt-6">
                    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-6">
                      <h4 className="font-medium text-indigo-900 mb-2">Per Semester/Term Configuration</h4>
                      <p className="text-sm text-indigo-700">
                        Configure your semesters/terms below. Each semester has its own fee amount and date range.
                        Student fees will be generated based on the active semester.
                      </p>
                    </div>
                    <SemesterManager institutionId={user.institution_id} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Academic Years Tab (Multi-Year Student Journey) */}
          {activeTab === 'academic-years' && isInstitutionAdmin() && user?.institution_id && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-100">
                <div className="p-3 bg-violet-100 rounded-lg">
                  <GraduationCap className="w-6 h-6 text-violet-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Academic Years</h2>
                  <p className="text-sm text-gray-500">Manage academic year periods for student registration</p>
                </div>
              </div>

              <AcademicYearManager institutionId={user.institution_id} />
            </div>
          )}

          {/* Payment Schedule Tab */}
          {activeTab === 'payment-schedule' && isInstitutionAdmin() && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-100">
                <div className="p-3 bg-indigo-100 rounded-lg">
                  <Calendar className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Payment Schedule</h2>
                  <p className="text-sm text-gray-500">Configure payment months and registration fees</p>
                </div>
              </div>

              <form onSubmit={handleAcademicUpdate} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Payment Months
                  </label>
                  <p className="text-sm text-gray-500 mb-4">
                    Select the months when student fee payments are required. This affects yearly fee calculations.
                  </p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                    {MONTHS.map((month) => {
                      const isSelected = institutionData.payment_months.includes(month.value)
                      return (
                        <button
                          key={month.value}
                          type="button"
                          onClick={() => togglePaymentMonth(month.value)}
                          className={`relative p-3 rounded-lg border-2 transition-all ${
                            isSelected
                              ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                              : 'border-gray-200 hover:border-gray-300 text-gray-600'
                          }`}
                        >
                          {isSelected && (
                            <CheckCircle className="absolute top-1 right-1 w-4 h-4 text-indigo-600" />
                          )}
                          <span className="text-sm font-medium">{month.short}</span>
                        </button>
                      )
                    })}
                  </div>
                  <p className="text-sm text-gray-500 mt-3">
                    Selected: <span className="font-medium text-gray-900">{institutionData.payment_months.length} months</span>
                    {institutionData.payment_months.length > 0 && (
                      <span className="ml-2">
                        ({institutionData.payment_months.map(m => MONTHS.find(month => month.value === m)?.short || '').filter(Boolean).join(', ')})
                      </span>
                    )}
                  </p>
                </div>

                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                  <h4 className="font-medium text-indigo-900 mb-2">Fee Calculation Example</h4>
                  <p className="text-sm text-indigo-700">
                    If a course costs N$ 300/month, the yearly total will be:
                    <br />
                    <span className="font-bold">N$ 300 x {institutionData.payment_months.length} months = N$ {(300 * institutionData.payment_months.length).toLocaleString()}</span>
                  </p>
                </div>

                <div>
                  <Input
                    label="Default Registration Fee (N$)"
                    type="text"
                    inputMode="decimal"
                    value={formatNumericValue(institutionData.default_registration_fee)}
                    onChange={(e) => setInstitutionData({ ...institutionData, default_registration_fee: parseNumericInput(e.target.value) })}
                    placeholder="e.g., 500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This will be added to the yearly total for new students
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  leftIcon={isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                >
                  {isLoading ? 'Saving...' : 'Save Settings'}
                </Button>
              </form>
            </div>
          )}

          {/* Branding Tab */}
          {activeTab === 'branding' && isInstitutionAdmin() && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-100">
                <div className="p-3 bg-pink-100 rounded-lg">
                  <Palette className="w-6 h-6 text-pink-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Branding</h2>
                  <p className="text-sm text-gray-500">Customize your institution&apos;s appearance</p>
                </div>
              </div>

              <form onSubmit={(e) => handleInstitutionUpdate(e, true)} className="space-y-6">
                {/* Logo Upload Section */}
                {user?.institution_id && (
                  <div className="pb-6 border-b border-gray-200">
                    <LogoUpload
                      centerId={user.institution_id}
                      currentLogoUrl={institutionData.logo_url}
                      onUploadComplete={(url) => setInstitutionData({ ...institutionData, logo_url: url })}
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Primary Color
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={institutionData.primary_color}
                        onChange={(e) => setInstitutionData({ ...institutionData, primary_color: e.target.value })}
                        className="w-12 h-12 rounded-lg cursor-pointer border border-gray-200"
                      />
                      <input
                        type="text"
                        value={institutionData.primary_color}
                        onChange={(e) => setInstitutionData({ ...institutionData, primary_color: e.target.value })}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        placeholder="#1E40AF"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Secondary Color
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={institutionData.secondary_color}
                        onChange={(e) => setInstitutionData({ ...institutionData, secondary_color: e.target.value })}
                        className="w-12 h-12 rounded-lg cursor-pointer border border-gray-200"
                      />
                      <input
                        type="text"
                        value={institutionData.secondary_color}
                        onChange={(e) => setInstitutionData({ ...institutionData, secondary_color: e.target.value })}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        placeholder="#F59E0B"
                      />
                    </div>
                  </div>
                </div>

                {/* Preview */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-3">Preview</p>
                  <div className="flex flex-wrap items-center gap-4">
                    <div
                      className="h-12 px-6 rounded-lg flex items-center text-white font-medium text-sm"
                      style={{ backgroundColor: institutionData.primary_color }}
                    >
                      Primary Button
                    </div>
                    <div
                      className="h-12 px-6 rounded-lg flex items-center text-white font-medium text-sm"
                      style={{ backgroundColor: institutionData.secondary_color }}
                    >
                      Secondary
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  leftIcon={isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                >
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </Button>
              </form>
            </div>
          )}

          {/* Banking Tab */}
          {activeTab === 'banking' && isInstitutionAdmin() && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-100">
                <div className="p-3 bg-amber-100 rounded-lg">
                  <CreditCard className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Banking Details</h2>
                  <p className="text-sm text-gray-500">Banking info for fee statements</p>
                </div>
              </div>

              <form onSubmit={handleInstitutionUpdate} className="space-y-6">
                <Input
                  label="Bank Name"
                  value={institutionData.bank_name}
                  onChange={(e) => setInstitutionData({ ...institutionData, bank_name: e.target.value })}
                  placeholder="e.g., First National Bank"
                />

                <Input
                  label="Account Number"
                  value={institutionData.account_number}
                  onChange={(e) => setInstitutionData({ ...institutionData, account_number: e.target.value })}
                  placeholder="Account number"
                />

                <Input
                  label="Branch Code"
                  value={institutionData.branch_code}
                  onChange={(e) => setInstitutionData({ ...institutionData, branch_code: e.target.value })}
                  placeholder="Branch code"
                />

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-700">
                    These details will appear on student fee statements for bank transfer payments.
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  leftIcon={isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                >
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </Button>
              </form>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  )
}
