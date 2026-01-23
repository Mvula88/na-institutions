'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/input'
import { ConfirmModal } from '@/components/ui/modal'
import {
  MessageSquare,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Send,
  X,
  Loader2,
  Trash2,
  Eye,
  FileText,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Filter,
  Copy,
  Sparkles,
  Calendar,
  CreditCard,
  TrendingDown,
  History,
  ShoppingCart,
  Check,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface SMSTemplate {
  id: string
  name: string
  content: string
  category: string | null
  is_active: boolean
}

interface Class {
  id: string
  name: string
  grade_level: string | null
}

interface SMSCampaign {
  id: string
  name: string
  message: string
  target_type: string
  target_grade: string | null
  target_class_id: string | null
  target_status: string | null
  status: string
  total_recipients: number
  sent_count: number
  failed_count: number
  scheduled_at: string | null
  sent_at: string | null
  created_at: string
  target_class?: { name: string } | null
}

interface StudentRecipient {
  id: string
  full_name: string
  grade: string | null
  parent_phone: string | null
  phone: string | null
  class_id: string | null
}

interface CreditTransaction {
  id: string
  transaction_type: string
  amount: number
  balance_after: number
  description: string | null
  created_at: string
}

const ITEMS_PER_PAGE = 10

const GRADE_LEVELS = [
  'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6',
  'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12',
]

const TARGET_TYPES = [
  { value: 'all', label: 'All Students' },
  { value: 'grade', label: 'By Grade' },
  { value: 'class', label: 'By Class' },
  { value: 'with_balance', label: 'With Outstanding Balance' },
  { value: 'active', label: 'Active Students Only' },
]

const STATUS_BADGES: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  draft: { bg: 'bg-gray-100', text: 'text-gray-700', icon: <FileText className="w-3 h-3" /> },
  scheduled: { bg: 'bg-blue-100', text: 'text-blue-700', icon: <Clock className="w-3 h-3" /> },
  sending: { bg: 'bg-amber-100', text: 'text-amber-700', icon: <Loader2 className="w-3 h-3 animate-spin" /> },
  sent: { bg: 'bg-green-100', text: 'text-green-700', icon: <CheckCircle className="w-3 h-3" /> },
  failed: { bg: 'bg-red-100', text: 'text-red-700', icon: <XCircle className="w-3 h-3" /> },
  cancelled: { bg: 'bg-gray-100', text: 'text-gray-500', icon: <X className="w-3 h-3" /> },
}

// SMS Credit Packages - Updated pricing for Namibian market
const SMS_CREDIT_PACKAGES = [
  { id: 'small', name: '100 SMS Credits', credits: 100, price: 75, perSms: '0.75' },
  { id: 'medium', name: '500 SMS Credits', credits: 500, price: 300, perSms: '0.60', popular: true },
  { id: 'large', name: '1,000 SMS Credits', credits: 1000, price: 500, perSms: '0.50' },
  { id: 'bulk', name: '5,000 SMS Credits', credits: 5000, price: 2000, perSms: '0.40', bestValue: true },
]

export default function SMSCampaignsPage() {
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState<'campaigns' | 'templates' | 'compose' | 'credits'>('campaigns')
  const [isLoading, setIsLoading] = useState(true)

  // SMS Credits state
  const [smsCredits, setSmsCredits] = useState(0)
  const [creditsUsed, setCreditsUsed] = useState(0)
  const [lowBalanceThreshold, setLowBalanceThreshold] = useState(50)
  const [creditTransactions, setCreditTransactions] = useState<CreditTransaction[]>([])

  // Campaigns state
  const [campaigns, setCampaigns] = useState<SMSCampaign[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [statusFilter, setStatusFilter] = useState('')

  // Templates state
  const [templates, setTemplates] = useState<SMSTemplate[]>([])
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<SMSTemplate | null>(null)
  const [templateForm, setTemplateForm] = useState({
    name: '',
    content: '',
    category: 'general',
  })

  // Classes for dropdown
  const [classes, setClasses] = useState<Class[]>([])

  // Compose state
  const [composeForm, setComposeForm] = useState({
    name: '',
    message: '',
    target_type: 'all',
    target_grade: '',
    target_class_id: '',
    target_status: '',
    schedule_enabled: false,
    scheduled_date: '',
    scheduled_time: '',
  })
  const [previewRecipients, setPreviewRecipients] = useState<StudentRecipient[]>([])
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [isSending, setIsSending] = useState(false)

  // Delete modal
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; type: 'campaign' | 'template'; item: SMSCampaign | SMSTemplate | null }>({
    open: false,
    type: 'campaign',
    item: null,
  })
  const [isDeleting, setIsDeleting] = useState(false)

  // View campaign modal
  const [viewingCampaign, setViewingCampaign] = useState<SMSCampaign | null>(null)

  // Buy credits modal
  const [showBuyCreditsModal, setShowBuyCreditsModal] = useState(false)
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null)
  const [isPurchasing, setIsPurchasing] = useState(false)

  // Check for URL params on mount (for Stripe checkout redirects)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const creditsParam = params.get('credits')

    if (creditsParam === 'success') {
      toast.success('SMS credits purchased successfully!')
      setActiveTab('credits')
      // Clean up URL
      window.history.replaceState({}, '', '/dashboard/sms')
    } else if (creditsParam === 'cancelled') {
      toast.error('Credit purchase was cancelled')
      window.history.replaceState({}, '', '/dashboard/sms')
    }
  }, [])

  useEffect(() => {
    if (user?.institution_id) {
      fetchClasses()
      fetchTemplates()
      fetchSMSCredits()
    }
  }, [user?.institution_id])

  useEffect(() => {
    if (activeTab === 'campaigns' && user?.institution_id) {
      fetchCampaigns()
    }
    if (activeTab === 'credits' && user?.institution_id) {
      fetchCreditTransactions()
    }
  }, [activeTab, user?.institution_id, currentPage, statusFilter])

  // Preview recipients when compose form changes
  useEffect(() => {
    if (activeTab === 'compose' && user?.institution_id) {
      previewRecipientsDebounced()
    }
  }, [activeTab, composeForm.target_type, composeForm.target_grade, composeForm.target_class_id, composeForm.target_status])

  async function fetchSMSCredits() {
    if (!user?.institution_id) return
    const supabase = createClient()
    const { data } = await supabase
      .from('institutions')
      .select('sms_credits, sms_credits_used, sms_low_balance_threshold')
      .eq('id', user.institution_id)
      .single()

    if (data) {
      const centerData = data as { sms_credits: number | null; sms_credits_used: number | null; sms_low_balance_threshold: number | null }
      setSmsCredits(centerData.sms_credits || 0)
      setCreditsUsed(centerData.sms_credits_used || 0)
      setLowBalanceThreshold(centerData.sms_low_balance_threshold || 50)
    }
  }

  async function fetchCreditTransactions() {
    if (!user?.institution_id) return
    const supabase = createClient()
    const { data } = await supabase
      .from('sms_credit_transactions')
      .select('id, transaction_type, amount, balance_after, description, created_at')
      .eq('institution_id', user.institution_id)
      .order('created_at', { ascending: false })
      .limit(50)

    setCreditTransactions((data || []) as CreditTransaction[])
  }

  async function fetchClasses() {
    if (!user?.institution_id) return
    const supabase = createClient()
    const { data } = await supabase
      .from('programs')
      .select('id, name, grade_level')
      .eq('institution_id', user.institution_id)
      .eq('is_active', true)
      .order('name')
    setClasses((data || []) as Class[])
  }

  async function fetchTemplates() {
    if (!user?.institution_id) return
    const supabase = createClient()
    const { data } = await supabase
      .from('sms_templates')
      .select('id, name, content, category, is_active')
      .eq('institution_id', user.institution_id)
      .order('name')
    setTemplates((data || []) as SMSTemplate[])
  }

  async function fetchCampaigns() {
    if (!user?.institution_id) return
    setIsLoading(true)
    const supabase = createClient()

    let query = supabase
      .from('sms_campaigns')
      .select(`
        id, name, message, target_type, target_grade, target_class_id, target_status,
        status, total_recipients, sent_count, failed_count, scheduled_at, sent_at, created_at,
        target_class:classes(name)
      `, { count: 'exact' })
      .eq('institution_id', user.institution_id)
      .order('created_at', { ascending: false })

    if (statusFilter) {
      query = query.eq('status', statusFilter)
    }

    const from = (currentPage - 1) * ITEMS_PER_PAGE
    query = query.range(from, from + ITEMS_PER_PAGE - 1)

    const { data, count, error } = await query

    if (!error && data) {
      setCampaigns(data as unknown as SMSCampaign[])
      setTotalCount(count || 0)
    }
    setIsLoading(false)
  }

  let previewTimeout: NodeJS.Timeout
  function previewRecipientsDebounced() {
    clearTimeout(previewTimeout)
    previewTimeout = setTimeout(() => {
      fetchPreviewRecipients()
    }, 300)
  }

  async function fetchPreviewRecipients() {
    if (!user?.institution_id) return
    setIsLoadingPreview(true)
    const supabase = createClient()

    let query = supabase
      .from('students')
      .select('id, full_name, grade, parent_phone, phone, class_id')
      .eq('institution_id', user.institution_id)
      .eq('status', 'active')
      .order('full_name')
      .limit(50)

    // Apply filters based on target type
    if (composeForm.target_type === 'grade' && composeForm.target_grade) {
      query = query.eq('grade', composeForm.target_grade)
    }
    if (composeForm.target_type === 'class' && composeForm.target_class_id) {
      query = query.eq('class_id', composeForm.target_class_id)
    }

    const { data, error } = await query

    if (!error && data) {
      // Filter to only those with phone numbers
      const withPhones = (data as unknown as StudentRecipient[]).filter(s => s.parent_phone || s.phone)
      setPreviewRecipients(withPhones)
    }
    setIsLoadingPreview(false)
  }

  async function handleSaveTemplate(e: React.FormEvent) {
    e.preventDefault()
    if (!user?.institution_id) return
    setIsSending(true)
    const supabase = createClient()

    try {
      const templateData = {
        institution_id: user.institution_id,
        name: templateForm.name,
        content: templateForm.content,
        category: templateForm.category,
        created_by: user.id,
      }

      if (editingTemplate) {
        const { error } = await supabase
          .from('sms_templates')
          .update(templateData as never)
          .eq('id', editingTemplate.id)
        if (error) throw error
        toast.success('Template updated successfully')
      } else {
        const { error } = await supabase
          .from('sms_templates')
          .insert(templateData as never)
        if (error) throw error
        toast.success('Template created successfully')
      }

      setShowTemplateModal(false)
      resetTemplateForm()
      fetchTemplates()
    } catch (error) {
      console.error('Error saving template:', error)
      toast.error('Failed to save template')
    } finally {
      setIsSending(false)
    }
  }

  function resetTemplateForm() {
    setTemplateForm({ name: '', content: '', category: 'general' })
    setEditingTemplate(null)
  }

  function openEditTemplate(template: SMSTemplate) {
    setTemplateForm({
      name: template.name,
      content: template.content,
      category: template.category || 'general',
    })
    setEditingTemplate(template)
    setShowTemplateModal(true)
  }

  function useTemplate(template: SMSTemplate) {
    setComposeForm({ ...composeForm, message: template.content })
    setActiveTab('compose')
    toast.success(`Template "${template.name}" loaded`)
  }

  async function handleSendCampaign(e: React.FormEvent) {
    e.preventDefault()
    if (!user?.institution_id) return

    if (!composeForm.name || !composeForm.message) {
      toast.error('Please enter a campaign name and message')
      return
    }

    if (previewRecipients.length === 0) {
      toast.error('No recipients with valid phone numbers found')
      return
    }

    // Check credits
    const smsCount = Math.ceil(composeForm.message.length / 160) || 1
    const requiredCredits = previewRecipients.length * smsCount
    if (smsCredits < requiredCredits) {
      toast.error(`Insufficient SMS credits. Need ${requiredCredits}, have ${smsCredits}`)
      return
    }

    // Check if scheduling
    if (composeForm.schedule_enabled) {
      if (!composeForm.scheduled_date || !composeForm.scheduled_time) {
        toast.error('Please select a date and time for scheduled send')
        return
      }
      const scheduledAt = new Date(`${composeForm.scheduled_date}T${composeForm.scheduled_time}`)
      if (scheduledAt <= new Date()) {
        toast.error('Scheduled time must be in the future')
        return
      }
    }

    setIsSending(true)
    const supabase = createClient()

    try {
      // Determine scheduled_at
      let scheduledAt = null
      if (composeForm.schedule_enabled && composeForm.scheduled_date && composeForm.scheduled_time) {
        scheduledAt = new Date(`${composeForm.scheduled_date}T${composeForm.scheduled_time}`).toISOString()
      }

      // Create campaign
      const campaignData = {
        institution_id: user.institution_id,
        name: composeForm.name,
        message: composeForm.message,
        target_type: composeForm.target_type,
        target_grade: composeForm.target_grade || null,
        target_class_id: composeForm.target_class_id || null,
        target_status: composeForm.target_status || null,
        status: scheduledAt ? 'scheduled' : 'sending',
        scheduled_at: scheduledAt,
        total_recipients: previewRecipients.length,
        sent_count: 0,
        failed_count: 0,
        created_by: user.id,
      }

      const { data: campaign, error: campaignError } = await supabase
        .from('sms_campaigns')
        .insert(campaignData as never)
        .select('id')
        .single()

      if (campaignError) throw campaignError

      // Create recipients
      const recipients = previewRecipients.map(s => ({
        campaign_id: (campaign as { id: string }).id,
        student_id: s.id,
        phone_number: s.parent_phone || s.phone || '',
        recipient_name: s.full_name,
        status: 'pending',
      }))

      const { error: recipientError } = await supabase
        .from('sms_campaign_recipients')
        .insert(recipients as never)

      if (recipientError) throw recipientError

      // If scheduled, just save and return
      if (scheduledAt) {
        toast.success(`Campaign scheduled for ${new Date(scheduledAt).toLocaleString('en-ZA')}`)
        resetComposeForm()
        setActiveTab('campaigns')
        fetchCampaigns()
        return
      }

      // Send SMS to each recipient
      let sentCount = 0
      let failedCount = 0

      for (const recipient of recipients) {
        try {
          const response = await fetch('/api/sms/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: recipient.phone_number,
              message: composeForm.message,
              campaignId: (campaign as { id: string }).id,
              studentId: recipient.student_id,
            }),
          })

          const result = await response.json()

          // Update recipient status
          await supabase
            .from('sms_campaign_recipients')
            .update({
              status: result.success ? 'sent' : 'failed',
              message_id: result.messageId || null,
              error_message: result.error || null,
              sent_at: result.success ? new Date().toISOString() : null,
            } as never)
            .eq('campaign_id', (campaign as { id: string }).id)
            .eq('phone_number', recipient.phone_number)

          if (result.success) {
            sentCount++
          } else {
            failedCount++
          }
        } catch {
          failedCount++
        }
      }

      // Update campaign status
      await supabase
        .from('sms_campaigns')
        .update({
          status: failedCount === recipients.length ? 'failed' : 'sent',
          sent_count: sentCount,
          failed_count: failedCount,
          sent_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        } as never)
        .eq('id', (campaign as { id: string }).id)

      // Deduct credits
      const creditsUsedNow = sentCount * smsCount
      await supabase
        .from('institutions')
        .update({
          sms_credits: smsCredits - creditsUsedNow,
          sms_credits_used: creditsUsed + creditsUsedNow,
        } as never)
        .eq('id', user.institution_id)

      // Log credit transaction
      await supabase
        .from('sms_credit_transactions')
        .insert({
          institution_id: user.institution_id,
          transaction_type: 'usage',
          amount: -creditsUsedNow,
          balance_after: smsCredits - creditsUsedNow,
          description: `Campaign: ${composeForm.name} (${sentCount} messages)`,
          campaign_id: (campaign as { id: string }).id,
          created_by: user.id,
        } as never)

      toast.success(`Campaign sent: ${sentCount} delivered, ${failedCount} failed`)
      resetComposeForm()
      setActiveTab('campaigns')
      fetchCampaigns()
      fetchSMSCredits()
    } catch (error) {
      console.error('Error sending campaign:', error)
      toast.error('Failed to send campaign')
    } finally {
      setIsSending(false)
    }
  }

  function resetComposeForm() {
    setComposeForm({
      name: '',
      message: '',
      target_type: 'all',
      target_grade: '',
      target_class_id: '',
      target_status: '',
      schedule_enabled: false,
      scheduled_date: '',
      scheduled_time: '',
    })
    setPreviewRecipients([])
  }

  async function handleDelete() {
    if (!deleteModal.item) return
    setIsDeleting(true)
    const supabase = createClient()

    try {
      if (deleteModal.type === 'campaign') {
        // Delete recipients first
        await supabase
          .from('sms_campaign_recipients')
          .delete()
          .eq('campaign_id', deleteModal.item.id)

        const { error } = await supabase
          .from('sms_campaigns')
          .delete()
          .eq('id', deleteModal.item.id)
        if (error) throw error
        toast.success('Campaign deleted')
        fetchCampaigns()
      } else {
        const { error } = await supabase
          .from('sms_templates')
          .delete()
          .eq('id', deleteModal.item.id)
        if (error) throw error
        toast.success('Template deleted')
        fetchTemplates()
      }

      setDeleteModal({ open: false, type: 'campaign', item: null })
    } catch (error) {
      console.error('Error deleting:', error)
      toast.error(`Failed to delete ${deleteModal.type}`)
    } finally {
      setIsDeleting(false)
    }
  }

  async function cancelScheduledCampaign(campaign: SMSCampaign) {
    const supabase = createClient()
    try {
      await supabase
        .from('sms_campaigns')
        .update({ status: 'cancelled' } as never)
        .eq('id', campaign.id)
      toast.success('Scheduled campaign cancelled')
      fetchCampaigns()
    } catch (error) {
      console.error('Error cancelling campaign:', error)
      toast.error('Failed to cancel campaign')
    }
  }

  async function handlePurchaseCredits() {
    if (!selectedPackage) {
      toast.error('Please select a package')
      return
    }

    setIsPurchasing(true)
    try {
      const response = await fetch('/api/sms/credits/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageType: selectedPackage }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initiate checkout')
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      console.error('Error purchasing credits:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to initiate checkout')
    } finally {
      setIsPurchasing(false)
    }
  }

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)
  const charCount = composeForm.message.length
  const smsCount = Math.ceil(charCount / 160) || 1
  const requiredCredits = previewRecipients.length * smsCount
  const hasEnoughCredits = smsCredits >= requiredCredits

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 md:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">SMS Campaigns</h1>
              <p className="mt-1 text-sm text-gray-500">Send bulk SMS messages to students and parents</p>
            </div>
            <div className="flex items-center gap-4">
              {/* SMS Credits Badge */}
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                smsCredits <= lowBalanceThreshold ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
              }`}>
                <CreditCard className="w-4 h-4" />
                <span className="font-medium">{smsCredits} credits</span>
                {smsCredits <= lowBalanceThreshold && (
                  <AlertTriangle className="w-4 h-4" />
                )}
              </div>
              <Button
                variant="secondary"
                leftIcon={<ShoppingCart className="w-4 h-4" />}
                onClick={() => {
                  setSelectedPackage(null)
                  setShowBuyCreditsModal(true)
                }}
              >
                Buy Credits
              </Button>
              <Button
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={() => {
                  resetComposeForm()
                  setActiveTab('compose')
                }}
              >
                New Campaign
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-6 bg-gray-100 p-1 rounded-lg w-fit">
            <button
              onClick={() => setActiveTab('campaigns')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'campaigns'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              Campaigns
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'templates'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <FileText className="w-4 h-4" />
              Templates
            </button>
            <button
              onClick={() => setActiveTab('compose')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'compose'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Send className="w-4 h-4" />
              Compose
            </button>
            <button
              onClick={() => setActiveTab('credits')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'credits'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <History className="w-4 h-4" />
              Credits
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-6">
        {/* Campaigns Tab */}
        {activeTab === 'campaigns' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="w-48">
                  <Select
                    options={[
                      { value: '', label: 'All Statuses' },
                      { value: 'draft', label: 'Draft' },
                      { value: 'scheduled', label: 'Scheduled' },
                      { value: 'sent', label: 'Sent' },
                      { value: 'failed', label: 'Failed' },
                    ]}
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value)
                      setCurrentPage(1)
                    }}
                  />
                </div>
                {statusFilter && (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setStatusFilter('')
                      setCurrentPage(1)
                    }}
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>

            {/* Campaigns List */}
            <div className="bg-white rounded-xl border border-gray-200">
              {isLoading ? (
                <div className="p-8 text-center">
                  <div className="animate-pulse space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-16 bg-gray-100 rounded"></div>
                    ))}
                  </div>
                </div>
              ) : campaigns.length === 0 ? (
                <div className="p-12 text-center">
                  <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No campaigns yet</h3>
                  <p className="text-gray-500 mb-4">Create a campaign to start sending SMS messages</p>
                  <Button
                    leftIcon={<Plus className="w-4 h-4" />}
                    onClick={() => {
                      resetComposeForm()
                      setActiveTab('compose')
                    }}
                  >
                    New Campaign
                  </Button>
                </div>
              ) : (
                <>
                  <div className="divide-y divide-gray-100">
                    {campaigns.map((campaign) => {
                      const badge = STATUS_BADGES[campaign.status] || STATUS_BADGES.draft
                      return (
                        <div
                          key={campaign.id}
                          className="p-4 flex items-center justify-between hover:bg-gray-50"
                        >
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-100 rounded-lg">
                              <MessageSquare className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{campaign.name}</p>
                              <p className="text-sm text-gray-500">
                                {campaign.target_type === 'all' && 'All Students'}
                                {campaign.target_type === 'grade' && campaign.target_grade}
                                {campaign.target_type === 'class' && campaign.target_class?.name}
                                {campaign.target_type === 'with_balance' && 'With Balance'}
                                {' • '}
                                {campaign.status === 'scheduled' && campaign.scheduled_at
                                  ? `Scheduled: ${new Date(campaign.scheduled_at).toLocaleString('en-ZA')}`
                                  : new Date(campaign.created_at).toLocaleDateString('en-ZA')
                                }
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                            <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                              {badge.icon}
                              {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                            </span>
                            <div className="text-sm text-right min-w-[80px]">
                              <p className="font-medium text-gray-900">
                                {campaign.sent_count}/{campaign.total_recipients}
                              </p>
                              <p className="text-gray-500">sent</p>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setViewingCampaign(campaign)}
                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              {campaign.status === 'scheduled' && (
                                <button
                                  onClick={() => cancelScheduledCampaign(campaign)}
                                  className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg"
                                  title="Cancel Scheduled"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => setDeleteModal({ open: true, type: 'campaign', item: campaign })}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
                      <p className="text-sm text-gray-500">
                        Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} of {totalCount}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <span className="text-sm text-gray-600">Page {currentPage} of {totalPages}</span>
                        <button
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Templates Tab */}
        {activeTab === 'templates' && (
          <div className="space-y-6">
            <div className="flex justify-end">
              <Button
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={() => {
                  resetTemplateForm()
                  setShowTemplateModal(true)
                }}
              >
                New Template
              </Button>
            </div>

            <div className="bg-white rounded-xl border border-gray-200">
              {templates.length === 0 ? (
                <div className="p-12 text-center">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No templates yet</h3>
                  <p className="text-gray-500 mb-4">Create reusable message templates</p>
                  <Button
                    leftIcon={<Plus className="w-4 h-4" />}
                    onClick={() => {
                      resetTemplateForm()
                      setShowTemplateModal(true)
                    }}
                  >
                    New Template
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className="p-4 hover:bg-gray-50"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{template.name}</p>
                          <p className="text-sm text-gray-500 mt-1 line-clamp-2">{template.content}</p>
                          {template.category && (
                            <span className="inline-block mt-2 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                              {template.category}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 ml-4">
                          <button
                            onClick={() => useTemplate(template)}
                            className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg"
                            title="Use Template"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEditTemplate(template)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="Edit"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteModal({ open: true, type: 'template', item: template })}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Compose Tab */}
        {activeTab === 'compose' && (
          <form onSubmit={handleSendCampaign} className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Message Composition */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-medium text-gray-900 mb-4">Compose Message</h3>

                <div className="space-y-4">
                  <Input
                    label="Campaign Name"
                    required
                    value={composeForm.name}
                    onChange={(e) => setComposeForm({ ...composeForm, name: e.target.value })}
                    placeholder="e.g., February Fee Reminder"
                  />

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                    <textarea
                      required
                      value={composeForm.message}
                      onChange={(e) => setComposeForm({ ...composeForm, message: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none resize-none"
                      rows={5}
                      placeholder="Enter your message..."
                    />
                    <div className="flex justify-between mt-1 text-xs text-gray-500">
                      <span>{charCount}/160 characters ({smsCount} SMS)</span>
                      {charCount > 160 && (
                        <span className="text-amber-600">Message will be split into {smsCount} SMS</span>
                      )}
                    </div>
                  </div>

                  {/* Scheduling */}
                  <div className="border-t border-gray-100 pt-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={composeForm.schedule_enabled}
                        onChange={(e) => setComposeForm({ ...composeForm, schedule_enabled: e.target.checked })}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Schedule for later</span>
                      <Calendar className="w-4 h-4 text-gray-400" />
                    </label>

                    {composeForm.schedule_enabled && (
                      <div className="mt-3 grid grid-cols-2 gap-4">
                        <Input
                          label="Date"
                          type="date"
                          value={composeForm.scheduled_date}
                          onChange={(e) => setComposeForm({ ...composeForm, scheduled_date: e.target.value })}
                          min={new Date().toISOString().split('T')[0]}
                        />
                        <Input
                          label="Time"
                          type="time"
                          value={composeForm.scheduled_time}
                          onChange={(e) => setComposeForm({ ...composeForm, scheduled_time: e.target.value })}
                        />
                      </div>
                    )}
                  </div>

                  {/* Quick Templates */}
                  {templates.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Quick Templates</label>
                      <div className="flex flex-wrap gap-2">
                        {templates.slice(0, 4).map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => useTemplate(t)}
                            className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                          >
                            {t.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Recipients Selection */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-medium text-gray-900 mb-4">Select Recipients</h3>

                <div className="space-y-4">
                  <Select
                    label="Target Group"
                    value={composeForm.target_type}
                    onChange={(e) => setComposeForm({ ...composeForm, target_type: e.target.value, target_grade: '', target_class_id: '' })}
                    options={TARGET_TYPES}
                  />

                  {composeForm.target_type === 'grade' && (
                    <Select
                      label="Grade Level"
                      value={composeForm.target_grade}
                      onChange={(e) => setComposeForm({ ...composeForm, target_grade: e.target.value })}
                      options={[
                        { value: '', label: 'Select Grade' },
                        ...GRADE_LEVELS.map(g => ({ value: g, label: g }))
                      ]}
                    />
                  )}

                  {composeForm.target_type === 'class' && (
                    <Select
                      label="Class"
                      value={composeForm.target_class_id}
                      onChange={(e) => setComposeForm({ ...composeForm, target_class_id: e.target.value })}
                      options={[
                        { value: '', label: 'Select Class' },
                        ...classes.map(c => ({ value: c.id, label: c.name }))
                      ]}
                    />
                  )}

                  {/* Credits Info */}
                  <div className={`p-4 rounded-lg ${hasEnoughCredits ? 'bg-green-50' : 'bg-red-50'}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Required Credits</span>
                      <span className={`font-medium ${hasEnoughCredits ? 'text-green-700' : 'text-red-700'}`}>
                        {requiredCredits} / {smsCredits} available
                      </span>
                    </div>
                    {!hasEnoughCredits && (
                      <p className="mt-1 text-xs text-red-600">
                        You need {requiredCredits - smsCredits} more credits to send this campaign
                      </p>
                    )}
                  </div>

                  {/* Recipients Preview */}
                  <div className="border-t border-gray-100 pt-4 mt-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-700">Recipients Preview</span>
                      <span className="text-sm text-blue-600">
                        {isLoadingPreview ? (
                          <Loader2 className="w-4 h-4 animate-spin inline" />
                        ) : (
                          `${previewRecipients.length} recipients`
                        )}
                      </span>
                    </div>
                    <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                      {previewRecipients.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 text-sm">
                          {isLoadingPreview ? 'Loading...' : 'No recipients with phone numbers'}
                        </div>
                      ) : (
                        previewRecipients.slice(0, 10).map((s) => (
                          <div key={s.id} className="px-3 py-2 text-sm">
                            <span className="font-medium">{s.full_name}</span>
                            <span className="text-gray-500 ml-2">{s.parent_phone || s.phone}</span>
                          </div>
                        ))
                      )}
                      {previewRecipients.length > 10 && (
                        <div className="px-3 py-2 text-sm text-gray-500 text-center">
                          +{previewRecipients.length - 10} more recipients
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Send Button */}
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  resetComposeForm()
                  setActiveTab('campaigns')
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSending || previewRecipients.length === 0 || !hasEnoughCredits}
                leftIcon={isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : composeForm.schedule_enabled ? <Calendar className="w-4 h-4" /> : <Send className="w-4 h-4" />}
              >
                {isSending ? 'Processing...' : composeForm.schedule_enabled ? 'Schedule Campaign' : `Send to ${previewRecipients.length} Recipients`}
              </Button>
            </div>
          </form>
        )}

        {/* Credits Tab */}
        {activeTab === 'credits' && (
          <div className="space-y-6">
            {/* Buy Credits CTA */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Need more SMS credits?</h3>
                  <p className="text-blue-100 mt-1">Purchase credits to continue sending campaigns</p>
                </div>
                <Button
                  variant="secondary"
                  leftIcon={<ShoppingCart className="w-4 h-4" />}
                  onClick={() => {
                    setSelectedPackage(null)
                    setShowBuyCreditsModal(true)
                  }}
                  className="bg-white text-blue-600 hover:bg-blue-50"
                >
                  Buy Credits
                </Button>
              </div>
            </div>

            {/* Credits Summary */}
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <CreditCard className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Available Credits</p>
                    <p className="text-2xl font-semibold text-gray-900">{smsCredits}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <TrendingDown className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Credits Used</p>
                    <p className="text-2xl font-semibold text-gray-900">{creditsUsed}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-lg ${smsCredits <= lowBalanceThreshold ? 'bg-red-100' : 'bg-gray-100'}`}>
                    <AlertTriangle className={`w-6 h-6 ${smsCredits <= lowBalanceThreshold ? 'text-red-600' : 'text-gray-600'}`} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Low Balance Alert</p>
                    <p className="text-2xl font-semibold text-gray-900">{lowBalanceThreshold}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Transaction History */}
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="p-4 border-b border-gray-100">
                <h3 className="font-medium text-gray-900">Credit History</h3>
              </div>
              {creditTransactions.length === 0 ? (
                <div className="p-12 text-center">
                  <History className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions yet</h3>
                  <p className="text-gray-500">Credit purchases and usage will appear here</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {creditTransactions.map((tx) => (
                    <div key={tx.id} className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg ${
                          tx.transaction_type === 'purchase' ? 'bg-green-100' :
                          tx.transaction_type === 'usage' ? 'bg-blue-100' :
                          tx.transaction_type === 'refund' ? 'bg-amber-100' : 'bg-purple-100'
                        }`}>
                          {tx.transaction_type === 'purchase' && <Plus className="w-4 h-4 text-green-600" />}
                          {tx.transaction_type === 'usage' && <Send className="w-4 h-4 text-blue-600" />}
                          {tx.transaction_type === 'refund' && <History className="w-4 h-4 text-amber-600" />}
                          {tx.transaction_type === 'bonus' && <Sparkles className="w-4 h-4 text-purple-600" />}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 capitalize">{tx.transaction_type}</p>
                          <p className="text-sm text-gray-500">{tx.description || 'No description'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-medium ${tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {tx.amount >= 0 ? '+' : ''}{tx.amount}
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(tx.created_at).toLocaleDateString('en-ZA')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingTemplate ? 'Edit Template' : 'Create Template'}
              </h2>
              <button
                onClick={() => setShowTemplateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveTemplate} className="p-6 space-y-4">
              <Input
                label="Template Name"
                required
                value={templateForm.name}
                onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                placeholder="e.g., Fee Reminder"
              />
              <Select
                label="Category"
                value={templateForm.category}
                onChange={(e) => setTemplateForm({ ...templateForm, category: e.target.value })}
                options={[
                  { value: 'general', label: 'General' },
                  { value: 'reminder', label: 'Payment Reminder' },
                  { value: 'announcement', label: 'Announcement' },
                  { value: 'event', label: 'Event' },
                ]}
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message Template</label>
                <textarea
                  required
                  value={templateForm.content}
                  onChange={(e) => setTemplateForm({ ...templateForm, content: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none resize-none"
                  rows={4}
                  placeholder="Enter your template message..."
                />
                <p className="mt-1 text-xs text-gray-500">
                  Tip: Use placeholders like {'{student_name}'}, {'{amount}'}, {'{date}'}
                </p>
              </div>
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowTemplateModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSending}
                  className="flex-1"
                >
                  {editingTemplate ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Campaign Modal */}
      {viewingCampaign && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Campaign Details</h2>
              <button
                onClick={() => setViewingCampaign(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm text-gray-500">Campaign Name</label>
                <p className="font-medium">{viewingCampaign.name}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Message</label>
                <p className="mt-1 p-3 bg-gray-50 rounded-lg text-sm">{viewingCampaign.message}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500">Status</label>
                  <p className="font-medium capitalize">{viewingCampaign.status}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Target</label>
                  <p className="font-medium">
                    {viewingCampaign.target_type === 'all' && 'All Students'}
                    {viewingCampaign.target_type === 'grade' && viewingCampaign.target_grade}
                    {viewingCampaign.target_type === 'class' && viewingCampaign.target_class?.name}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Sent</label>
                  <p className="font-medium text-green-600">{viewingCampaign.sent_count}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Failed</label>
                  <p className="font-medium text-red-600">{viewingCampaign.failed_count}</p>
                </div>
              </div>
              {viewingCampaign.scheduled_at && (
                <div>
                  <label className="text-sm text-gray-500">Scheduled For</label>
                  <p className="font-medium">
                    {new Date(viewingCampaign.scheduled_at).toLocaleString('en-ZA')}
                  </p>
                </div>
              )}
              {viewingCampaign.sent_at && (
                <div>
                  <label className="text-sm text-gray-500">Sent At</label>
                  <p className="font-medium">
                    {new Date(viewingCampaign.sent_at).toLocaleString('en-ZA')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      <ConfirmModal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, type: 'campaign', item: null })}
        onConfirm={handleDelete}
        title={`Delete ${deleteModal.type === 'campaign' ? 'Campaign' : 'Template'}`}
        message={`Are you sure you want to delete this ${deleteModal.type}? This action cannot be undone.`}
        confirmText="Delete"
        isLoading={isDeleting}
      />

      {/* Buy Credits Modal */}
      {showBuyCreditsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Buy SMS Credits</h2>
                <p className="text-sm text-gray-500 mt-1">Choose a package that fits your needs</p>
              </div>
              <button
                onClick={() => setShowBuyCreditsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="grid md:grid-cols-2 gap-4">
                {SMS_CREDIT_PACKAGES.map((pkg) => (
                  <div
                    key={pkg.id}
                    onClick={() => setSelectedPackage(pkg.id)}
                    className={`relative p-5 border-2 rounded-xl cursor-pointer transition-all ${
                      selectedPackage === pkg.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {pkg.popular && (
                      <span className="absolute -top-2 left-4 bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                        Most Popular
                      </span>
                    )}
                    {pkg.bestValue && (
                      <span className="absolute -top-2 left-4 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                        Best Value
                      </span>
                    )}
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{pkg.name}</p>
                        <p className="text-sm text-gray-500 mt-1">N${pkg.perSms} per SMS</p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selectedPackage === pkg.id
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-gray-300'
                      }`}>
                        {selectedPackage === pkg.id && <Check className="w-3 h-3 text-white" />}
                      </div>
                    </div>
                    <div className="mt-4">
                      <span className="text-2xl font-bold text-gray-900">N${pkg.price}</span>
                    </div>
                    <ul className="mt-3 space-y-1.5 text-sm text-gray-600">
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" />
                        {pkg.credits.toLocaleString()} SMS credits
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" />
                        Never expires
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" />
                        Instant activation
                      </li>
                    </ul>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  <strong>Secure Payment:</strong> Your payment is processed securely via Stripe.
                  Credits are added instantly after successful payment.
                </p>
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  variant="secondary"
                  onClick={() => setShowBuyCreditsModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handlePurchaseCredits}
                  disabled={!selectedPackage || isPurchasing}
                  leftIcon={isPurchasing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
                  className="flex-1"
                >
                  {isPurchasing ? 'Processing...' : selectedPackage
                    ? `Buy for N$${SMS_CREDIT_PACKAGES.find(p => p.id === selectedPackage)?.price || 0}`
                    : 'Select a Package'
                  }
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
