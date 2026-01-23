'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  ArrowLeft,
  Save,
  Loader2,
  Building2,
  User,
  Phone,
  Mail,
  Globe,
  Monitor,
  MapPin,
  FileText,
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function NewClientPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const [formData, setFormData] = useState({
    // Business Info
    business_name: '',
    trading_as: '',

    // Contact
    contact_person: '',
    email: '',
    phone: '',
    whatsapp: '',

    // Address
    physical_address: '',
    city: '',

    // Services
    has_website: false,
    has_school_management: true,

    // Website details
    website_domain: '',

    // Fees
    setup_fee: 1950,
    setup_fee_paid: false,
    monthly_sms_fee: 650,
    annual_website_fee: 700,

    // Notes
    notes: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.business_name || !formData.contact_person || !formData.phone) {
      toast.error('Please fill in required fields')
      return
    }

    if (!formData.has_website && !formData.has_school_management) {
      toast.error('Please select at least one service')
      return
    }

    setIsLoading(true)
    const supabase = createClient()

    try {
      const { data, error } = await (supabase
        .from('clients') as any)
        .insert({
          business_name: formData.business_name,
          trading_as: formData.trading_as || null,
          contact_person: formData.contact_person,
          email: formData.email || null,
          phone: formData.phone,
          whatsapp: formData.whatsapp || null,
          physical_address: formData.physical_address || null,
          city: formData.city || null,
          has_website: formData.has_website,
          has_school_management: formData.has_school_management,
          website_domain: formData.has_website ? formData.website_domain || null : null,
          setup_fee: formData.setup_fee,
          setup_fee_paid: formData.setup_fee_paid,
          monthly_sms_fee: formData.has_school_management ? formData.monthly_sms_fee : 0,
          annual_website_fee: formData.has_website ? formData.annual_website_fee : 0,
          notes: formData.notes || null,
          contract_status: 'active',
        })
        .select()
        .single()

      if (error) throw error

      toast.success('Client added successfully!')
      router.push(`/admin/clients/${data.id}`)
    } catch (error) {
      console.error('Error adding client:', error)
      toast.error('Failed to add client')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <Link
          href="/admin/clients"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Clients
        </Link>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Add New Client</h1>
        <p className="text-gray-500 mt-1 text-sm md:text-base">Create a new client contract</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Business Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Business Information</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Business Name *"
              value={formData.business_name}
              onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
              placeholder="e.g., Absolute Tutorial College"
              required
            />
            <Input
              label="Trading As"
              value={formData.trading_as}
              onChange={(e) => setFormData({ ...formData, trading_as: e.target.value })}
              placeholder="e.g., ATC"
            />
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-green-100 rounded-lg">
              <User className="w-5 h-5 text-green-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Contact Information</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Contact Person *"
              value={formData.contact_person}
              onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
              placeholder="Full name"
              required
            />
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="email@example.com"
            />
            <Input
              label="Phone Number *"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="081 123 4567"
              required
            />
            <Input
              label="WhatsApp"
              value={formData.whatsapp}
              onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
              placeholder="081 123 4567"
            />
          </div>
        </div>

        {/* Address */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-100 rounded-lg">
              <MapPin className="w-5 h-5 text-purple-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Address</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Input
                label="Physical Address"
                value={formData.physical_address}
                onChange={(e) => setFormData({ ...formData, physical_address: e.target.value })}
                placeholder="Street address"
              />
            </div>
            <Input
              label="City"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              placeholder="e.g., Windhoek"
            />
          </div>
        </div>

        {/* Services */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-amber-100 rounded-lg">
              <FileText className="w-5 h-5 text-amber-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Services Selected</h2>
          </div>

          <div className="space-y-4">
            {/* School Management System */}
            <label className={`flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
              formData.has_school_management ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
            }`}>
              <input
                type="checkbox"
                checked={formData.has_school_management}
                onChange={(e) => setFormData({ ...formData, has_school_management: e.target.checked })}
                className="mt-1 w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Monitor className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-gray-900">School Management System</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Monthly fee: N$ {formData.monthly_sms_fee.toFixed(2)}
                </p>
              </div>
            </label>

            {/* Website */}
            <label className={`flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
              formData.has_website ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-gray-300'
            }`}>
              <input
                type="checkbox"
                checked={formData.has_website}
                onChange={(e) => setFormData({ ...formData, has_website: e.target.checked })}
                className="mt-1 w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-purple-600" />
                  <span className="font-medium text-gray-900">Website</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Annual renewal: N$ {formData.annual_website_fee.toFixed(2)}
                </p>
              </div>
            </label>

            {formData.has_website && (
              <div className="pl-9">
                <Input
                  label="Domain Name"
                  value={formData.website_domain}
                  onChange={(e) => setFormData({ ...formData, website_domain: e.target.value })}
                  placeholder="e.g., absolutetutorial.com"
                />
              </div>
            )}
          </div>
        </div>

        {/* Fees */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <FileText className="w-5 h-5 text-emerald-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Setup Fee</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Setup Fee (N$)"
              type="number"
              value={formData.setup_fee}
              onChange={(e) => setFormData({ ...formData, setup_fee: parseFloat(e.target.value) || 0 })}
            />
            <div className="flex items-center">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.setup_fee_paid}
                  onChange={(e) => setFormData({ ...formData, setup_fee_paid: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <span className="font-medium text-gray-700">Setup fee has been paid</span>
              </label>
            </div>
          </div>

          {/* Summary */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-3">Fee Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Setup Fee (once-off)</span>
                <span className="font-medium">N$ {formData.setup_fee.toFixed(2)}</span>
              </div>
              {formData.has_school_management && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Monthly SMS Fee</span>
                  <span className="font-medium">N$ {formData.monthly_sms_fee.toFixed(2)}/month</span>
                </div>
              )}
              {formData.has_website && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Annual Website Renewal</span>
                  <span className="font-medium">N$ {formData.annual_website_fee.toFixed(2)}/year</span>
                </div>
              )}
              <div className="border-t border-gray-200 pt-2 mt-2">
                <div className="flex justify-between font-medium">
                  <span className="text-gray-900">Year 1 Total</span>
                  <span className="text-gray-900">
                    N$ {(
                      formData.setup_fee +
                      (formData.has_school_management ? formData.monthly_sms_fee * 12 : 0) +
                      (formData.has_website ? formData.annual_website_fee : 0)
                    ).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none resize-none"
            placeholder="Any additional notes about this client..."
          />
        </div>

        {/* Submit */}
        <div className="flex flex-col sm:flex-row gap-3 justify-end">
          <Link href="/admin/clients">
            <Button variant="outline" type="button" className="w-full sm:w-auto">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={isLoading}
            leftIcon={isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            className="w-full sm:w-auto"
          >
            {isLoading ? 'Saving...' : 'Save Client'}
          </Button>
        </div>
      </form>
    </div>
  )
}
