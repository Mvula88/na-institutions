'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Bell,
  Mail,
  Phone,
  Loader2,
  Save,
  User,
  MessageSquare,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface ParentSettings {
  full_name: string
  email: string
  phone: string | null
  notification_attendance: string
  notification_grades: boolean
  notification_fees: boolean
  notification_sms: boolean
  notification_email: boolean
}

export default function ParentSettingsPage() {
  const [settings, setSettings] = useState<ParentSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: parent } = await supabase
      .from('parents')
      .select('full_name, email, phone, notification_attendance, notification_grades, notification_fees, notification_sms, notification_email')
      .eq('auth_user_id', user.id)
      .single()

    if (parent) {
      setSettings(parent as ParentSettings)
    }
    setIsLoading(false)
  }

  async function handleSave() {
    if (!settings) return

    setIsSaving(true)
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.error('Not authenticated')
      setIsSaving(false)
      return
    }

    const { error } = await supabase
      .from('parents')
      .update({
        full_name: settings.full_name,
        phone: settings.phone,
        notification_attendance: settings.notification_attendance,
        notification_grades: settings.notification_grades,
        notification_fees: settings.notification_fees,
        notification_sms: settings.notification_sms,
        notification_email: settings.notification_email,
      } as never)
      .eq('auth_user_id', user.id)

    if (error) {
      toast.error('Failed to save settings')
    } else {
      toast.success('Settings saved successfully')
    }
    setIsSaving(false)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="text-center py-12 text-gray-500">
        Unable to load settings
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>
        <p className="text-gray-500">Manage your profile and notification preferences</p>
      </div>

      {/* Profile Section */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-gray-600" />
            <h2 className="font-semibold text-gray-900">Profile Information</h2>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <Input
            label="Full Name"
            type="text"
            value={settings.full_name}
            onChange={(e) => setSettings({ ...settings, full_name: e.target.value })}
          />

          <Input
            label="Email Address"
            type="email"
            value={settings.email}
            disabled
            helperText="Contact support to change your email"
          />

          <Input
            label="Phone Number"
            type="tel"
            value={settings.phone || ''}
            onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
            placeholder="e.g., 0821234567"
          />
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-gray-600" />
            <h2 className="font-semibold text-gray-900">Notification Preferences</h2>
          </div>
        </div>
        <div className="p-6 space-y-6">
          {/* Notification Channels */}
          <div>
            <h3 className="font-medium text-gray-900 mb-3">Notification Channels</h3>
            <div className="space-y-3">
              <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="font-medium text-gray-900">Email Notifications</p>
                    <p className="text-sm text-gray-500">Receive notifications via email</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notification_email}
                  onChange={(e) => setSettings({ ...settings, notification_email: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="font-medium text-gray-900">SMS Notifications</p>
                    <p className="text-sm text-gray-500">Receive notifications via SMS</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notification_sms}
                  onChange={(e) => setSettings({ ...settings, notification_sms: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
              </label>
            </div>
          </div>

          {/* Attendance Notifications */}
          <div>
            <h3 className="font-medium text-gray-900 mb-3">Attendance Alerts</h3>
            <select
              value={settings.notification_attendance}
              onChange={(e) => setSettings({ ...settings, notification_attendance: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="immediate">Immediate - Get notified right away when absent</option>
              <option value="daily">Daily Digest - Summary at end of each day</option>
              <option value="weekly">Weekly Digest - Summary at end of each week</option>
              <option value="none">None - Don't notify me about attendance</option>
            </select>
          </div>

          {/* Notification Types */}
          <div>
            <h3 className="font-medium text-gray-900 mb-3">Notification Types</h3>
            <div className="space-y-3">
              <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                <div>
                  <p className="font-medium text-gray-900">Grade Updates</p>
                  <p className="text-sm text-gray-500">When new grades are recorded</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notification_grades}
                  onChange={(e) => setSettings({ ...settings, notification_grades: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                <div>
                  <p className="font-medium text-gray-900">Fee Reminders</p>
                  <p className="text-sm text-gray-500">When fees are due or overdue</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notification_fees}
                  onChange={(e) => setSettings({ ...settings, notification_fees: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          leftIcon={isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  )
}
