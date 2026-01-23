'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input, Select, Textarea } from '@/components/ui/input'
import { ArrowLeft, Save, Building2, Palette, CreditCard, Settings, Upload, X } from 'lucide-react'
import toast from 'react-hot-toast'

export default function NewCenterPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [activeSection, setActiveSection] = useState<'basic' | 'branding' | 'banking' | 'modules'>('basic')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form state
  const [formData, setFormData] = useState({
    // Basic Info
    name: '',
    slug: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    status: 'active',
    subscription_tier: 'basic',

    // Branding
    logo_url: '',
    primary_color: '#1E40AF',
    secondary_color: '#F59E0B',

    // Banking
    bank_name: '',
    account_number: '',
    branch_code: '',

    // Settings
    registration_fee: '300',
    late_payment_penalty: '70',
    payment_due_day: '5',

    // Modules
    hostel_module_enabled: false,
    transport_module_enabled: false,
    library_module_enabled: false,
    sms_module_enabled: false,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  function generateSlug(name: string) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
      // Auto-generate slug from name
      ...(name === 'name' ? { slug: generateSlug(value) } : {}),
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

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload a valid image file (JPEG, PNG, GIF, WebP, or SVG)')
      return
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB')
      return
    }

    setLogoFile(file)

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setLogoPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  function removeLogo() {
    setLogoFile(null)
    setLogoPreview(null)
    setFormData(prev => ({ ...prev, logo_url: '' }))
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  async function uploadLogo(centerId: string): Promise<string | null> {
    if (!logoFile) return null

    const supabase = createClient()
    const fileExt = logoFile.name.split('.').pop()
    const fileName = `${centerId}-${Date.now()}.${fileExt}`

    const { data, error } = await supabase.storage
      .from('center-logos')
      .upload(fileName, logoFile, {
        cacheControl: '3600',
        upsert: false,
      })

    if (error) {
      console.error('Error uploading logo:', error)
      throw new Error('Failed to upload logo')
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('center-logos')
      .getPublicUrl(data.path)

    return publicUrl
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
      // First create the center without logo
      const insertData = {
        name: formData.name.trim(),
        slug: formData.slug.trim(),
        email: formData.email || null,
        phone: formData.phone || null,
        address: formData.address || null,
        city: formData.city || null,
        status: formData.status,
        subscription_tier: formData.subscription_tier,
        logo_url: null, // Will update after upload
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

      const { data: center, error } = await supabase
        .from('institutions')
        .insert(insertData as never)
        .select('id')
        .single() as { data: { id: string } | null; error: { code?: string; message: string } | null }

      if (error) {
        if (error.code === '23505') {
          toast.error('A center with this slug already exists')
          setErrors({ slug: 'This slug is already taken' })
          setActiveSection('basic')
          return
        }
        throw error
      }

      if (!center) {
        throw new Error('Failed to create center')
      }

      const centerId = center.id

      // Upload logo if selected
      if (logoFile) {
        setIsUploading(true)
        try {
          const logoUrl = await uploadLogo(centerId)
          if (logoUrl) {
            // Update center with logo URL
            await supabase
              .from('institutions')
              .update({ logo_url: logoUrl } as never)
              .eq('id', centerId)
          }
        } catch (uploadError) {
          console.error('Logo upload failed:', uploadError)
          toast.error('Center created but logo upload failed')
        } finally {
          setIsUploading(false)
        }
      }

      toast.success('Center created successfully!')
      router.push(`/admin/centers/${centerId}`)
    } catch (error) {
      console.error('Error creating center:', error)
      toast.error('Failed to create center')
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

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/admin/centers"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Centers
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Add New Center</h1>
        <p className="text-gray-500 mt-1">Create a new tutorial center on the platform</p>
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
                  placeholder="e.g., Absolute Tutorial College"
                />
              </div>
              <Input
                label="Slug (URL identifier)"
                name="slug"
                value={formData.slug}
                onChange={handleChange}
                error={errors.slug}
                required
                placeholder="e.g., absolute-tutorial"
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
                placeholder="contact@center.com"
              />
              <Input
                label="Phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+264 XX XXX XXXX"
              />
              <Input
                label="City"
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="e.g., Windhoek"
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
                  placeholder="Full street address..."
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Center Logo
                </label>
                <div className="flex items-start gap-4">
                  {/* Logo Preview */}
                  {logoPreview ? (
                    <div className="relative">
                      <Image
                        src={logoPreview}
                        alt="Logo preview"
                        width={96}
                        height={96}
                        className="w-24 h-24 rounded-lg object-cover border border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={removeLogo}
                        className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div
                      className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="w-8 h-8 text-gray-400" />
                    </div>
                  )}

                  {/* Upload Button */}
                  <div className="flex-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      leftIcon={<Upload className="w-4 h-4" />}
                    >
                      {logoPreview ? 'Change Logo' : 'Upload Logo'}
                    </Button>
                    <p className="text-sm text-gray-500 mt-2">
                      Supported formats: JPEG, PNG, GIF, WebP, SVG. Max size: 5MB
                    </p>
                  </div>
                </div>
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
                    placeholder="#1E40AF"
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
                    placeholder="#F59E0B"
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="md:col-span-2 mt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Preview</p>
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  {logoPreview ? (
                    <Image
                      src={logoPreview}
                      alt="Logo preview"
                      width={64}
                      height={64}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                  ) : (
                    <div
                      className="w-16 h-16 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: formData.primary_color }}
                    >
                      <Building2 className="w-8 h-8 text-white" />
                    </div>
                  )}
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
                placeholder="e.g., First National Bank"
              />
              <Input
                label="Account Number"
                name="account_number"
                value={formData.account_number}
                onChange={handleChange}
                placeholder="XXXXXXXXXXXX"
              />
              <Input
                label="Branch Code"
                name="branch_code"
                value={formData.branch_code}
                onChange={handleChange}
                placeholder="XXXXXX"
              />
            </div>

            <h3 className="text-md font-semibold text-gray-900 mt-6 mb-4">Fee Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Registration Fee (N$)"
                name="registration_fee"
                type="number"
                value={formData.registration_fee}
                onChange={handleChange}
                placeholder="300"
              />
              <Input
                label="Late Payment Penalty (N$)"
                name="late_payment_penalty"
                type="number"
                value={formData.late_payment_penalty}
                onChange={handleChange}
                placeholder="70"
              />
              <Input
                label="Payment Due Day"
                name="payment_due_day"
                type="number"
                min="1"
                max="28"
                value={formData.payment_due_day}
                onChange={handleChange}
                placeholder="5"
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
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {activeSection !== 'basic' && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const currentIndex = sections.findIndex((s) => s.id === activeSection)
                  setActiveSection(sections[currentIndex - 1].id)
                }}
              >
                Previous
              </Button>
            )}
          </div>
          <div className="flex gap-3">
            <Link href="/admin/centers">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            {activeSection !== 'modules' ? (
              <Button
                type="button"
                onClick={() => {
                  const currentIndex = sections.findIndex((s) => s.id === activeSection)
                  setActiveSection(sections[currentIndex + 1].id)
                }}
              >
                Next
              </Button>
            ) : (
              <Button
                type="submit"
                isLoading={isLoading || isUploading}
                leftIcon={<Save className="w-4 h-4" />}
              >
                {isUploading ? 'Uploading Logo...' : 'Create Center'}
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}
