'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Mail,
  Search,
  Plus,
  Send,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Users,
  Settings,
  Eye,
  Edit,
  Trash2,
  Copy,
  MailOpen,
  XCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface EmailTemplate {
  id: string
  name: string
  subject: string
  body: string
  template_type: string
  variables: string[]
  is_active: boolean
  created_at: string
}

interface EmailCampaign {
  id: string
  name: string
  subject: string
  body: string
  recipient_type: string
  recipient_filter: Record<string, unknown> | null
  status: string
  scheduled_at: string | null
  sent_at: string | null
  total_recipients: number
  sent_count: number
  failed_count: number
  created_at: string
}

interface EmailLog {
  id: string
  recipient_email: string
  recipient_name: string | null
  subject: string
  status: string
  error_message: string | null
  sent_at: string | null
  opened_at: string | null
  created_at: string
}

interface EmailSettings {
  id: string
  provider: string
  from_email: string
  from_name: string
  is_configured: boolean
}

export default function EmailPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any
  const { user } = useAuthStore()

  // State
  const [activeTab, setActiveTab] = useState('campaigns')
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // Data
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([])
  const [logs, setLogs] = useState<EmailLog[]>([])
  const [settings, setSettings] = useState<EmailSettings | null>(null)

  // Dialogs
  const [showTemplateDialog, setShowTemplateDialog] = useState(false)
  const [showCampaignDialog, setShowCampaignDialog] = useState(false)
  const [showSettingsDialog, setShowSettingsDialog] = useState(false)
  const [showPreviewDialog, setShowPreviewDialog] = useState(false)
  const [previewContent, setPreviewContent] = useState({ subject: '', body: '' })
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null)
  const [editingCampaign, setEditingCampaign] = useState<EmailCampaign | null>(null)

  // Form state
  const [templateForm, setTemplateForm] = useState({
    name: '',
    subject: '',
    body: '',
    template_type: 'general',
    is_active: true,
  })

  const [campaignForm, setCampaignForm] = useState({
    name: '',
    subject: '',
    body: '',
    recipient_type: 'all_students',
    scheduled_at: '',
  })

  const [settingsForm, setSettingsForm] = useState({
    provider: 'smtp',
    from_email: '',
    from_name: '',
    smtp_host: '',
    smtp_port: '587',
    smtp_user: '',
    smtp_password: '',
  })

  useEffect(() => {
    if (user?.institution_id) {
      fetchData()
    }
  }, [user?.institution_id])

  const fetchData = async () => {
    setLoading(true)
    try {
      await Promise.all([fetchTemplates(), fetchCampaigns(), fetchLogs(), fetchSettings()])
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load email data')
    } finally {
      setLoading(false)
    }
  }

  const fetchTemplates = async () => {
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .eq('institution_id', user?.institution_id)
      .order('created_at', { ascending: false })

    if (error) throw error
    setTemplates(data || [])
  }

  const fetchCampaigns = async () => {
    const { data, error } = await supabase
      .from('email_campaigns')
      .select('*')
      .eq('institution_id', user?.institution_id)
      .order('created_at', { ascending: false })

    if (error) throw error
    setCampaigns(data || [])
  }

  const fetchLogs = async () => {
    const { data, error } = await supabase
      .from('email_logs')
      .select('*')
      .eq('institution_id', user?.institution_id)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) throw error
    setLogs(data || [])
  }

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from('email_settings')
      .select('*')
      .eq('institution_id', user?.institution_id)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    setSettings(data)
    if (data) {
      setSettingsForm({
        provider: data.provider || 'smtp',
        from_email: data.from_email || '',
        from_name: data.from_name || '',
        smtp_host: data.smtp_config?.host || '',
        smtp_port: data.smtp_config?.port?.toString() || '587',
        smtp_user: data.smtp_config?.user || '',
        smtp_password: '',
      })
    }
  }

  const handleSaveTemplate = async () => {
    if (!templateForm.name || !templateForm.subject || !templateForm.body) {
      toast.error('Please fill in all required fields')
      return
    }

    // Extract variables from the body (e.g., {{student_name}})
    const variableMatches = templateForm.body.match(/\{\{(\w+)\}\}/g) || []
    const variables = variableMatches.map((v) => v.replace(/\{\{|\}\}/g, ''))

    try {
      const data = {
        institution_id: user?.institution_id,
        name: templateForm.name,
        subject: templateForm.subject,
        body: templateForm.body,
        template_type: templateForm.template_type,
        variables,
        is_active: templateForm.is_active,
      }

      if (editingTemplate) {
        const { error } = await supabase
          .from('email_templates')
          .update(data)
          .eq('id', editingTemplate.id)

        if (error) throw error
        toast.success('Template updated successfully')
      } else {
        const { error } = await supabase.from('email_templates').insert([data])

        if (error) throw error
        toast.success('Template created successfully')
      }

      setShowTemplateDialog(false)
      resetTemplateForm()
      fetchTemplates()
    } catch (error) {
      console.error('Error saving template:', error)
      toast.error('Failed to save template')
    }
  }

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return

    try {
      const { error } = await supabase.from('email_templates').delete().eq('id', id)

      if (error) throw error
      toast.success('Template deleted')
      fetchTemplates()
    } catch (error) {
      console.error('Error deleting template:', error)
      toast.error('Failed to delete template')
    }
  }

  const handleSaveCampaign = async (sendNow: boolean = false) => {
    if (!campaignForm.name || !campaignForm.subject || !campaignForm.body) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      const data = {
        institution_id: user?.institution_id,
        name: campaignForm.name,
        subject: campaignForm.subject,
        body: campaignForm.body,
        recipient_type: campaignForm.recipient_type,
        status: sendNow ? 'sending' : campaignForm.scheduled_at ? 'scheduled' : 'draft',
        scheduled_at: campaignForm.scheduled_at || null,
        sent_at: sendNow ? new Date().toISOString() : null,
      }

      if (editingCampaign) {
        const { error } = await supabase
          .from('email_campaigns')
          .update(data)
          .eq('id', editingCampaign.id)

        if (error) throw error
        toast.success(sendNow ? 'Campaign sent!' : 'Campaign updated')
      } else {
        const { error } = await supabase.from('email_campaigns').insert([data])

        if (error) throw error
        toast.success(sendNow ? 'Campaign sent!' : 'Campaign saved')
      }

      setShowCampaignDialog(false)
      resetCampaignForm()
      fetchCampaigns()
    } catch (error) {
      console.error('Error saving campaign:', error)
      toast.error('Failed to save campaign')
    }
  }

  const handleDeleteCampaign = async (id: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return

    try {
      const { error } = await supabase.from('email_campaigns').delete().eq('id', id)

      if (error) throw error
      toast.success('Campaign deleted')
      fetchCampaigns()
    } catch (error) {
      console.error('Error deleting campaign:', error)
      toast.error('Failed to delete campaign')
    }
  }

  const handleSaveSettings = async () => {
    if (!settingsForm.from_email || !settingsForm.from_name) {
      toast.error('Please fill in sender email and name')
      return
    }

    try {
      const data = {
        institution_id: user?.institution_id,
        provider: settingsForm.provider,
        from_email: settingsForm.from_email,
        from_name: settingsForm.from_name,
        smtp_config: {
          host: settingsForm.smtp_host,
          port: parseInt(settingsForm.smtp_port),
          user: settingsForm.smtp_user,
          password: settingsForm.smtp_password,
        },
        is_configured: true,
      }

      if (settings) {
        const { error } = await supabase
          .from('email_settings')
          .update(data)
          .eq('id', settings.id)

        if (error) throw error
      } else {
        const { error } = await supabase.from('email_settings').insert([data])

        if (error) throw error
      }

      toast.success('Email settings saved')
      setShowSettingsDialog(false)
      fetchSettings()
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Failed to save settings')
    }
  }

  const resetTemplateForm = () => {
    setTemplateForm({
      name: '',
      subject: '',
      body: '',
      template_type: 'general',
      is_active: true,
    })
    setEditingTemplate(null)
  }

  const resetCampaignForm = () => {
    setCampaignForm({
      name: '',
      subject: '',
      body: '',
      recipient_type: 'all_students',
      scheduled_at: '',
    })
    setEditingCampaign(null)
  }

  const openEditTemplate = (template: EmailTemplate) => {
    setEditingTemplate(template)
    setTemplateForm({
      name: template.name,
      subject: template.subject,
      body: template.body,
      template_type: template.template_type,
      is_active: template.is_active,
    })
    setShowTemplateDialog(true)
  }

  const openEditCampaign = (campaign: EmailCampaign) => {
    setEditingCampaign(campaign)
    setCampaignForm({
      name: campaign.name,
      subject: campaign.subject,
      body: campaign.body,
      recipient_type: campaign.recipient_type,
      scheduled_at: campaign.scheduled_at || '',
    })
    setShowCampaignDialog(true)
  }

  const useTemplate = (template: EmailTemplate) => {
    setCampaignForm({
      ...campaignForm,
      subject: template.subject,
      body: template.body,
    })
    setShowCampaignDialog(true)
  }

  const duplicateTemplate = async (template: EmailTemplate) => {
    try {
      const { error } = await supabase.from('email_templates').insert([
        {
          institution_id: user?.institution_id,
          name: `${template.name} (Copy)`,
          subject: template.subject,
          body: template.body,
          template_type: template.template_type,
          variables: template.variables,
          is_active: true,
        },
      ])

      if (error) throw error
      toast.success('Template duplicated')
      fetchTemplates()
    } catch (error) {
      console.error('Error duplicating template:', error)
      toast.error('Failed to duplicate template')
    }
  }

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    return (
      !searchTerm ||
      log.recipient_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.subject.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })

  // Stats
  const sentToday = logs.filter(
    (l) =>
      l.status === 'sent' &&
      new Date(l.sent_at || l.created_at).toDateString() === new Date().toDateString()
  ).length
  const pendingCampaigns = campaigns.filter((c) => c.status === 'scheduled').length
  const openRate = logs.length > 0
    ? Math.round((logs.filter((l) => l.opened_at).length / logs.filter((l) => l.status === 'sent').length) * 100) || 0
    : 0

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="outline"><FileText className="h-3 w-3 mr-1" />Draft</Badge>
      case 'scheduled':
        return <Badge className="bg-blue-100 text-blue-800"><Clock className="h-3 w-3 mr-1" />Scheduled</Badge>
      case 'sending':
        return <Badge className="bg-yellow-100 text-yellow-800"><Send className="h-3 w-3 mr-1" />Sending</Badge>
      case 'sent':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="h-3 w-3 mr-1" />Sent</Badge>
      case 'failed':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getLogStatusBadge = (status: string, opened: boolean) => {
    if (opened) {
      return <Badge className="bg-purple-100 text-purple-800"><MailOpen className="h-3 w-3 mr-1" />Opened</Badge>
    }
    switch (status) {
      case 'sent':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="h-3 w-3 mr-1" />Delivered</Badge>
      case 'failed':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>
      case 'pending':
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Pending</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getTemplateTypeLabel = (type: string) => {
    switch (type) {
      case 'welcome':
        return 'Welcome Email'
      case 'fee_reminder':
        return 'Fee Reminder'
      case 'exam_notification':
        return 'Exam Notification'
      case 'grade_release':
        return 'Grade Release'
      case 'event':
        return 'Event Notification'
      case 'general':
        return 'General'
      default:
        return type
    }
  }

  const getRecipientTypeLabel = (type: string) => {
    switch (type) {
      case 'all_students':
        return 'All Students'
      case 'all_staff':
        return 'All Staff'
      case 'all_parents':
        return 'All Parents'
      case 'specific_course':
        return 'Specific Course'
      case 'specific_program':
        return 'Specific Program'
      case 'custom':
        return 'Custom Selection'
      default:
        return type
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Email Communications</h1>
          <p className="text-muted-foreground">
            Send emails and manage communication templates
          </p>
        </div>
        <Button variant="outline" onClick={() => setShowSettingsDialog(true)}>
          <Settings className="h-4 w-4 mr-2" />
          Email Settings
        </Button>
      </div>

      {/* Configuration Warning */}
      {!settings?.is_configured && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="font-medium text-yellow-800">Email not configured</p>
                <p className="text-sm text-yellow-700">
                  Please configure your email settings to send emails.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="ml-auto"
                onClick={() => setShowSettingsDialog(true)}
              >
                Configure Now
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sent Today</CardTitle>
            <Send className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sentToday}</div>
            <p className="text-xs text-muted-foreground">Emails delivered</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCampaigns}</div>
            <p className="text-xs text-muted-foreground">Campaigns pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
            <MailOpen className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openRate}%</div>
            <p className="text-xs text-muted-foreground">Average engagement</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Templates</CardTitle>
            <FileText className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{templates.length}</div>
            <p className="text-xs text-muted-foreground">Email templates</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="campaigns">
            <Send className="h-4 w-4 mr-2" />
            Campaigns
          </TabsTrigger>
          <TabsTrigger value="templates">
            <FileText className="h-4 w-4 mr-2" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="logs">
            <Mail className="h-4 w-4 mr-2" />
            Email Logs
          </TabsTrigger>
        </TabsList>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Email Campaigns</CardTitle>
                  <CardDescription>
                    Create and manage bulk email campaigns
                  </CardDescription>
                </div>
                <Button
                  onClick={() => {
                    resetCampaignForm()
                    setShowCampaignDialog(true)
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Campaign
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {campaigns.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Send className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No email campaigns yet</p>
                  <p className="text-sm">Create a campaign to send bulk emails</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Campaign</TableHead>
                      <TableHead>Recipients</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sent</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaigns.map((campaign) => (
                      <TableRow key={campaign.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{campaign.name}</p>
                            <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                              {campaign.subject}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{getRecipientTypeLabel(campaign.recipient_type)}</TableCell>
                        <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                        <TableCell>
                          {campaign.sent_count}/{campaign.total_recipients}
                          {campaign.failed_count > 0 && (
                            <span className="text-red-500 text-sm ml-1">
                              ({campaign.failed_count} failed)
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {campaign.sent_at
                            ? new Date(campaign.sent_at).toLocaleDateString()
                            : campaign.scheduled_at
                            ? `Scheduled: ${new Date(campaign.scheduled_at).toLocaleDateString()}`
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setPreviewContent({
                                  subject: campaign.subject,
                                  body: campaign.body,
                                })
                                setShowPreviewDialog(true)
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {campaign.status === 'draft' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditCampaign(campaign)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteCampaign(campaign.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Email Templates</CardTitle>
                  <CardDescription>
                    Reusable templates for common communications
                  </CardDescription>
                </div>
                <Button
                  onClick={() => {
                    resetTemplateForm()
                    setShowTemplateDialog(true)
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Template
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {templates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No email templates yet</p>
                  <p className="text-sm">Create templates for consistent communications</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {templates.map((template) => (
                    <Card key={template.id} className="relative">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">{template.name}</CardTitle>
                            <Badge variant="outline" className="mt-1">
                              {getTemplateTypeLabel(template.template_type)}
                            </Badge>
                          </div>
                          {!template.is_active && (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <p className="text-sm text-muted-foreground">Subject:</p>
                          <p className="text-sm truncate">{template.subject}</p>
                        </div>
                        {template.variables && template.variables.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {template.variables.map((v) => (
                              <Badge key={v} variant="outline" className="text-xs">
                                {`{{${v}}}`}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <div className="flex gap-2 pt-2">
                          <Button size="sm" onClick={() => useTemplate(template)}>
                            <Send className="h-3 w-3 mr-1" />
                            Use
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setPreviewContent({
                                subject: template.subject,
                                body: template.body,
                              })
                              setShowPreviewDialog(true)
                            }}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            Preview
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => duplicateTemplate(template)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditTemplate(template)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteTemplate(template.id)}
                          >
                            <Trash2 className="h-3 w-3 text-red-500" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row gap-4 justify-between">
                <div>
                  <CardTitle>Email Logs</CardTitle>
                  <CardDescription>
                    Track delivery status of sent emails
                  </CardDescription>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by email or subject..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-[300px]"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No email logs yet</p>
                  <p className="text-sm">Sent emails will appear here</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sent</TableHead>
                      <TableHead>Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{log.recipient_email}</p>
                            {log.recipient_name && (
                              <p className="text-sm text-muted-foreground">
                                {log.recipient_name}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {log.subject}
                        </TableCell>
                        <TableCell>
                          {getLogStatusBadge(log.status, !!log.opened_at)}
                        </TableCell>
                        <TableCell>
                          {log.sent_at
                            ? new Date(log.sent_at).toLocaleString()
                            : '-'}
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate text-red-500 text-sm">
                          {log.error_message || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Template Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Edit Template' : 'Create Email Template'}
            </DialogTitle>
            <DialogDescription>
              Create a reusable template. Use {`{{variable_name}}`} for dynamic content.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Template Name</Label>
                <Input
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                  placeholder="e.g., Fee Reminder"
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={templateForm.template_type}
                  onValueChange={(value) =>
                    setTemplateForm({ ...templateForm, template_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="welcome">Welcome Email</SelectItem>
                    <SelectItem value="fee_reminder">Fee Reminder</SelectItem>
                    <SelectItem value="exam_notification">Exam Notification</SelectItem>
                    <SelectItem value="grade_release">Grade Release</SelectItem>
                    <SelectItem value="event">Event Notification</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Subject Line</Label>
              <Input
                value={templateForm.subject}
                onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })}
                placeholder="e.g., Fee Payment Reminder - {{student_name}}"
              />
            </div>
            <div className="space-y-2">
              <Label>Email Body</Label>
              <Textarea
                value={templateForm.body}
                onChange={(e) => setTemplateForm({ ...templateForm, body: e.target.value })}
                placeholder={`Dear {{student_name}},\n\nThis is a reminder that your tuition fee of {{amount}} is due on {{due_date}}.\n\nPlease make your payment at the earliest convenience.\n\nBest regards,\n{{institution_name}}`}
                rows={10}
              />
              <p className="text-xs text-muted-foreground">
                Available variables: {`{{student_name}}, {{student_number}}, {{amount}}, {{due_date}}, {{institution_name}}, {{course_name}}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={templateForm.is_active}
                onChange={(e) =>
                  setTemplateForm({ ...templateForm, is_active: e.target.checked })
                }
                className="rounded border-gray-300"
              />
              <Label htmlFor="is_active">Template is active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTemplate}>
              {editingTemplate ? 'Update' : 'Create'} Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Campaign Dialog */}
      <Dialog open={showCampaignDialog} onOpenChange={setShowCampaignDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingCampaign ? 'Edit Campaign' : 'Create Email Campaign'}
            </DialogTitle>
            <DialogDescription>
              Send bulk emails to students, staff, or parents
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Campaign Name</Label>
                <Input
                  value={campaignForm.name}
                  onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })}
                  placeholder="e.g., January Fee Reminders"
                />
              </div>
              <div className="space-y-2">
                <Label>Recipients</Label>
                <Select
                  value={campaignForm.recipient_type}
                  onValueChange={(value) =>
                    setCampaignForm({ ...campaignForm, recipient_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_students">All Students</SelectItem>
                    <SelectItem value="all_staff">All Staff</SelectItem>
                    <SelectItem value="all_parents">All Parents</SelectItem>
                    <SelectItem value="specific_course">Specific Course</SelectItem>
                    <SelectItem value="specific_program">Specific Program</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Subject Line</Label>
              <Input
                value={campaignForm.subject}
                onChange={(e) => setCampaignForm({ ...campaignForm, subject: e.target.value })}
                placeholder="Email subject"
              />
            </div>
            <div className="space-y-2">
              <Label>Email Body</Label>
              <Textarea
                value={campaignForm.body}
                onChange={(e) => setCampaignForm({ ...campaignForm, body: e.target.value })}
                placeholder="Write your email content here..."
                rows={8}
              />
            </div>
            <div className="space-y-2">
              <Label>Schedule (optional)</Label>
              <Input
                type="datetime-local"
                value={campaignForm.scheduled_at}
                onChange={(e) =>
                  setCampaignForm({ ...campaignForm, scheduled_at: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to save as draft or send immediately
              </p>
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setShowCampaignDialog(false)}>
              Cancel
            </Button>
            <Button variant="outline" onClick={() => handleSaveCampaign(false)}>
              Save as Draft
            </Button>
            <Button onClick={() => handleSaveCampaign(true)}>
              <Send className="h-4 w-4 mr-2" />
              Send Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Email Settings</DialogTitle>
            <DialogDescription>
              Configure your email sending settings
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>From Email</Label>
                <Input
                  type="email"
                  value={settingsForm.from_email}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, from_email: e.target.value })
                  }
                  placeholder="noreply@yourinstitution.com"
                />
              </div>
              <div className="space-y-2">
                <Label>From Name</Label>
                <Input
                  value={settingsForm.from_name}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, from_name: e.target.value })
                  }
                  placeholder="Your Institution Name"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email Provider</Label>
              <Select
                value={settingsForm.provider}
                onValueChange={(value) => setSettingsForm({ ...settingsForm, provider: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="smtp">SMTP Server</SelectItem>
                  <SelectItem value="sendgrid">SendGrid</SelectItem>
                  <SelectItem value="mailgun">Mailgun</SelectItem>
                  <SelectItem value="ses">Amazon SES</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {settingsForm.provider === 'smtp' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>SMTP Host</Label>
                    <Input
                      value={settingsForm.smtp_host}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, smtp_host: e.target.value })
                      }
                      placeholder="smtp.gmail.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>SMTP Port</Label>
                    <Input
                      value={settingsForm.smtp_port}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, smtp_port: e.target.value })
                      }
                      placeholder="587"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>SMTP Username</Label>
                    <Input
                      value={settingsForm.smtp_user}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, smtp_user: e.target.value })
                      }
                      placeholder="username"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>SMTP Password</Label>
                    <Input
                      type="password"
                      value={settingsForm.smtp_password}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, smtp_password: e.target.value })
                      }
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettingsDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSettings}>Save Settings</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Email Preview</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Subject:</p>
              <p className="font-medium">{previewContent.subject}</p>
            </div>
            <div className="p-4 border rounded-lg min-h-[200px] whitespace-pre-wrap">
              {previewContent.body}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
