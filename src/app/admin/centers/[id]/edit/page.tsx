'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input, Select, Textarea } from '@/components/ui/input'
import { ArrowLeft, Save, Building2, Palette, CreditCard, Settings } from 'lucide-react'
import toast from 'react-hot-toast'

interface CenterData {
  name: string
  slug: string
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  status: string
  subscription_tier: string | null
  logo_url: string | null
  primary_color: string
  secondary_color: string
  bank_name: string | null
  account_number: string | null
  branch_code: string | null
  hostel_module_enabled: boolean
  transport_module_enabled: boolean
  library_module_enabled: boolean
  sms_module_enabled: boolean
}

export default function EditCenterPage() {
  const params = useParams()
  const centerId = params.id as string
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [activeSection, setActiveSection] = useState<'basic' | 'branding' | 'banking' | 'modules'>('basic')

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    status: 'active',
    subscription_tier: 'basic',
    logo_url: '',
    primary_color: '#1E40AF',
    secondary_color: '#F59E0B',
    bank_name: '',
    account_number: '',
    branch_code: '',
    hostel_module_enabled: false,
    transport_module_enabled: false,
    library_module_enabled: false,
    sms_module_enabled: false,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (centerId) {
      fetchCenter()
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

      const center = data as CenterData

      setFormData({
        name: center.name || '',
        slug: center.slug || '',
        email: center.email || '',
        phone: center.phone || '',
        address: center.address || '',
        city: center.city || '',
        status: center.status || 'active',
        subscription_tier: center.subscription_tier || 'basic',
        logo_url: center.logo_url || '',
        primary_color: center.primary_color || '#1E40AF',
        secondary_color: center.secondary_color || '#F59E0B',
        bank_name: center.bank_name || '',
        account_number: center.account_number || '',
        branch_code: center.branch_code || '',
        hostel_module_enabled: center.hostel_module_enabled || false,
        transport_module_enabled: center.transport_module_enabled || false,
        library_module_enabled: center.library_module_enabled || false,
        sms_module_enabled: center.sms_module_enabled || false,
      })
    } catch (error) {
      console.error('Error fetching center:', error)
      toast.error('Failed to load center')
      router.push('/admin/centers')
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

    if (!formData.name.trim()) newErrors.name = 'Center name is required'
    if (!formData.slug.trim()) newErrors.slug = 'Slug is required'
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!validateForm()) {
      setActiveSection('basic')
      return
    }

    setIsLoading(true)
    const supabase = createClient()

    try {
      const updateData = {
        name: formData.name.trim(),
        slug: formData.slug.trim(),
        email: formData.email || null,
        phone: formData.phone || null,
        address: formData.address || null,
        city: formData.city || null,
        status: formData.status,
        subscription_tier: formData.subscription_tier,
        logo_url: formData.logo_url || null,
        primary_color: formData.primary_color,
        secondary_color: formData.secondary_color,
        bank_name: formData.bank_name || null,
        account_number: formData.account_number || null,
        branch_code: formData.branch_code || null,
        hostel_module_enabled: formData.hostel_module_enabled,
        transport_module_enabled: formData.transport_module_enabled,
        library_module_enabled: formData.library_module_enabled,
        sms_module_enabled: formData.sms_module_enabled,
      }

      const { error } = await supabase
        .from('institutions')
        .update(updateData as never)
        .eq('id', centerId)

      if (error) {
        if (error.code === '23505') {
          toast.error('A center with this slug already exists')
          setErrors({ slug: 'This slug is already taken' })
          setActiveSection('basic')
          return
        }
        throw error
      }

      toast.success('Center updated successfully!')
      router.push(`/admin/centers/${centerId}`)
    } catch (error) {
      console.error('Error updating center:', error)
      toast.error('Failed to update center')
    } finally {
      setIsLoading(false)
    }
  }

  const sections = [
    { id: 'basic', label: 'Basic Info', icon: Building2 },
    { id: 'branding', label: 'Branding', icon: Palette },
    { id: 'banking', label: 'Banking', icon: CreditCard },
    { id: 'modules', label: 'Modules', icon: Settings },
  ] as const

  if (isFetching) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/admin/centers/${centerId}`}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Center
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Edit Center</h1>
        <p className="text-gray-500 mt-1">Update center information and settings</p>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
              activeSection === section.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <section.icon className="w-4 h-4" />
            {section.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        {/* Basic Info Section */}
        {activeSection === 'basic' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Input
                  label="Center Name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  error={errors.name}
                  required
                />
              </div>
              <Input
                label="Slug (URL identifier)"
                name="slug"
                value={formData.slug}
                onChange={handleChange}
                error={errors.slug}
                required
              />
              <Select
                label="Status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                  { value: 'suspended', label: 'Suspended' },
                ]}
              />
              <Input
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                error={errors.email}
              />
              <Input
                label="Phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
              />
              <Input
                label="City"
                name="city"
                value={formData.city}
                onChange={handleChange}
              />
              <Select
                label="Subscription Tier"
                name="subscription_tier"
                value={formData.subscription_tier}
                onChange={handleChange}
                options={[
                  { value: 'basic', label: 'Basic' },
                  { value: 'standard', label: 'Standard' },
                  { value: 'premium', label: 'Premium' },
                ]}
              />
              <div className="md:col-span-2">
                <Textarea
                  label="Address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  rows={2}
                />
              </div>
            </div>
          </div>
        )}

        {/* Branding Section */}
        {activeSection === 'branding' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Branding & Appearance</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Input
                  label="Logo URL"
                  name="logo_url"
                  value={formData.logo_url}
                  onChange={handleChange}
                  placeholder="https://example.com/logo.png"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Primary Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    name="primary_color"
                    value={formData.primary_color}
                    onChange={handleChange}
                    className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
                  />
                  <Input
                    name="primary_color"
                    value={formData.primary_color}
                    onChange={handleChange}
                    className="flex-1"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Secondary Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    name="secondary_color"
                    value={formData.secondary_color}
                    onChange={handleChange}
                    className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
                  />
                  <Input
                    name="secondary_color"
                    value={formData.secondary_color}
                    onChange={handleChange}
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="md:col-span-2 mt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Preview</p>
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <div
                    className="w-16 h-16 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: formData.primary_color }}
                  >
                    <Building2 className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <p className="font-bold" style={{ color: formData.primary_color }}>
                      {formData.name || 'Center Name'}
                    </p>
                    <p className="text-sm" style={{ color: formData.secondary_color }}>
                      Sample accent text
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Banking Section */}
        {activeSection === 'banking' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Banking Details</h2>
            <p className="text-sm text-gray-500 mb-4">
              These details will appear on fee statements and invoices
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Bank Name"
                name="bank_name"
                value={formData.bank_name}
                onChange={handleChange}
              />
              <Input
                label="Account Number"
                name="account_number"
                value={formData.account_number}
                onChange={handleChange}
              />
              <Input
                label="Branch Code"
                name="branch_code"
                value={formData.branch_code}
                onChange={handleChange}
              />
            </div>
          </div>
        )}

        {/* Modules Section */}
        {activeSection === 'modules' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Module Activation</h2>
            <p className="text-sm text-gray-500 mb-4">
              Enable or disable optional modules for this center
            </p>
            <div className="space-y-4">
              <label className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <div>
                  <p className="font-medium text-gray-900">Hostel Management</p>
                  <p className="text-sm text-gray-500">Manage hostel rooms, allocations, and fees</p>
                </div>
                <input
                  type="checkbox"
                  name="hostel_module_enabled"
                  checked={formData.hostel_module_enabled}
                  onChange={handleChange}
                  className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
              </label>

              <label className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <div>
                  <p className="font-medium text-gray-900">Transport Management</p>
                  <p className="text-sm text-gray-500">Track student transport routes and fees</p>
                </div>
                <input
                  type="checkbox"
                  name="transport_module_enabled"
                  checked={formData.transport_module_enabled}
                  onChange={handleChange}
                  className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
              </label>

              <label className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <div>
                  <p className="font-medium text-gray-900">Library Management</p>
                  <p className="text-sm text-gray-500">Track books, borrowing, and returns</p>
                </div>
                <input
                  type="checkbox"
                  name="library_module_enabled"
                  checked={formData.library_module_enabled}
                  onChange={handleChange}
                  className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
              </label>

              <label className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <div>
                  <p className="font-medium text-gray-900">SMS Notifications</p>
                  <p className="text-sm text-gray-500">Send SMS reminders and notifications</p>
                </div>
                <input
                  type="checkbox"
                  name="sms_module_enabled"
                  checked={formData.sms_module_enabled}
                  onChange={handleChange}
                  className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
              </label>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Link href={`/admin/centers/${centerId}`}>
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
