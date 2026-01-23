'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Input, Select, Textarea } from '@/components/ui/input'
import { ConfirmModal } from '@/components/ui/modal'
import {
  Briefcase,
  Building2,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Calendar,
  MapPin,
  Phone,
  Mail,
  User,
  FileText,
  ClipboardList,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Internship {
  id: string
  title: string
  description: string | null
  start_date: string
  end_date: string
  total_hours: number | null
  completed_hours: number
  status: string
  host_evaluation_score: number | null
  final_grade: string | null
  student: {
    id: string
    full_name: string
    student_number: string | null
  }
  host: {
    id: string
    company_name: string
    contact_person: string | null
  } | null
  program: {
    id: string
    name: string
  } | null
}

interface InternshipHost {
  id: string
  company_name: string
  industry: string | null
  contact_person: string | null
  contact_email: string | null
  contact_phone: string | null
  address: string | null
  city: string | null
  is_active: boolean
}

interface Student {
  id: string
  full_name: string
  student_number: string | null
}

interface Program {
  id: string
  name: string
}

const ITEMS_PER_PAGE = 10

const STATUS_CONFIG: Record<string, { bg: string; text: string; icon: React.ReactNode; label: string }> = {
  pending: { bg: 'bg-gray-100', text: 'text-gray-700', icon: <Clock className="w-3 h-3" />, label: 'Pending' },
  approved: { bg: 'bg-blue-100', text: 'text-blue-700', icon: <CheckCircle className="w-3 h-3" />, label: 'Approved' },
  in_progress: { bg: 'bg-amber-100', text: 'text-amber-700', icon: <Briefcase className="w-3 h-3" />, label: 'In Progress' },
  completed: { bg: 'bg-green-100', text: 'text-green-700', icon: <CheckCircle className="w-3 h-3" />, label: 'Completed' },
  terminated: { bg: 'bg-red-100', text: 'text-red-700', icon: <XCircle className="w-3 h-3" />, label: 'Terminated' },
  deferred: { bg: 'bg-purple-100', text: 'text-purple-700', icon: <AlertCircle className="w-3 h-3" />, label: 'Deferred' },
  failed: { bg: 'bg-red-100', text: 'text-red-700', icon: <XCircle className="w-3 h-3" />, label: 'Failed' },
}

export default function InternshipsPage() {
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState<'internships' | 'hosts' | 'new'>('internships')
  const [isLoading, setIsLoading] = useState(true)

  // Internships state
  const [internships, setInternships] = useState<Internship[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  // Hosts state
  const [hosts, setHosts] = useState<InternshipHost[]>([])
  const [hostsPage, setHostsPage] = useState(1)
  const [hostsTotal, setHostsTotal] = useState(0)

  // New internship state
  const [students, setStudents] = useState<Student[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [internshipForm, setInternshipForm] = useState({
    student_id: '',
    host_id: '',
    program_id: '',
    title: '',
    description: '',
    start_date: '',
    end_date: '',
    total_hours: '',
    external_supervisor_name: '',
    external_supervisor_contact: '',
  })

  // Host form state
  const [showHostModal, setShowHostModal] = useState(false)
  const [editingHost, setEditingHost] = useState<InternshipHost | null>(null)
  const [hostForm, setHostForm] = useState({
    company_name: '',
    industry: '',
    contact_person: '',
    contact_email: '',
    contact_phone: '',
    address: '',
    city: '',
  })

  const [isSaving, setIsSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<InternshipHost | null>(null)
  const [viewInternship, setViewInternship] = useState<Internship | null>(null)

  useEffect(() => {
    if (user?.institution_id) {
      fetchInternships()
      fetchHosts()
      fetchStudents()
      fetchPrograms()
    }
  }, [user?.institution_id, currentPage, statusFilter])

  async function fetchInternships() {
    if (!user?.institution_id) return
    setIsLoading(true)

    const supabase = createClient() as any
    let query = supabase
      .from('internships')
      .select(`
        *,
        student:students(id, full_name, student_number),
        host:internship_hosts(id, company_name, contact_person),
        program:programs(id, name)
      `, { count: 'exact' })
      .eq('institution_id', user.institution_id)
      .order('created_at', { ascending: false })

    if (statusFilter) {
      query = query.eq('status', statusFilter)
    }

    const from = (currentPage - 1) * ITEMS_PER_PAGE
    const to = from + ITEMS_PER_PAGE - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (!error && data) {
      setInternships(data as unknown as Internship[])
      setTotalCount(count || 0)
    }
    setIsLoading(false)
  }

  async function fetchHosts() {
    if (!user?.institution_id) return

    const supabase = createClient() as any
    const { data, count } = await supabase
      .from('internship_hosts')
      .select('*', { count: 'exact' })
      .eq('institution_id', user.institution_id)
      .order('company_name')
      .range((hostsPage - 1) * ITEMS_PER_PAGE, hostsPage * ITEMS_PER_PAGE - 1)

    if (data) {
      setHosts(data)
      setHostsTotal(count || 0)
    }
  }

  async function fetchStudents() {
    if (!user?.institution_id) return

    const supabase = createClient() as any
    const { data } = await supabase
      .from('students')
      .select('id, full_name, student_number')
      .eq('institution_id', user.institution_id)
      .eq('status', 'active')
      .order('full_name')

    if (data) setStudents(data)
  }

  async function fetchPrograms() {
    if (!user?.institution_id) return

    const supabase = createClient() as any
    const { data } = await supabase
      .from('programs')
      .select('id, name')
      .eq('institution_id', user.institution_id)
      .eq('is_active', true)
      .order('name')

    if (data) setPrograms(data)
  }

  async function handleSaveHost(e: React.FormEvent) {
    e.preventDefault()
    if (!user?.institution_id) return

    setIsSaving(true)
    const supabase = createClient() as any

    const hostData = {
      institution_id: user.institution_id,
      company_name: hostForm.company_name,
      industry: hostForm.industry || null,
      contact_person: hostForm.contact_person || null,
      contact_email: hostForm.contact_email || null,
      contact_phone: hostForm.contact_phone || null,
      address: hostForm.address || null,
      city: hostForm.city || null,
      is_active: true,
    }

    let error
    if (editingHost) {
      const result = await supabase
        .from('internship_hosts')
        .update({ ...hostData, updated_at: new Date().toISOString() })
        .eq('id', editingHost.id)
      error = result.error
    } else {
      const result = await supabase.from('internship_hosts').insert(hostData)
      error = result.error
    }

    if (error) {
      toast.error('Failed to save host company')
    } else {
      toast.success(editingHost ? 'Host company updated' : 'Host company added')
      setShowHostModal(false)
      setEditingHost(null)
      setHostForm({
        company_name: '',
        industry: '',
        contact_person: '',
        contact_email: '',
        contact_phone: '',
        address: '',
        city: '',
      })
      fetchHosts()
    }

    setIsSaving(false)
  }

  async function handleDeleteHost(host: InternshipHost) {
    const supabase = createClient() as any
    const { error } = await supabase.from('internship_hosts').delete().eq('id', host.id)

    if (error) {
      toast.error('Failed to delete host company')
    } else {
      toast.success('Host company deleted')
      fetchHosts()
    }
    setDeleteConfirm(null)
  }

  async function handleCreateInternship(e: React.FormEvent) {
    e.preventDefault()
    if (!user?.institution_id) return

    setIsSaving(true)
    const supabase = createClient() as any

    const internshipData = {
      institution_id: user.institution_id,
      student_id: internshipForm.student_id,
      host_id: internshipForm.host_id || null,
      program_id: internshipForm.program_id || null,
      title: internshipForm.title,
      description: internshipForm.description || null,
      start_date: internshipForm.start_date,
      end_date: internshipForm.end_date,
      total_hours: internshipForm.total_hours ? parseInt(internshipForm.total_hours) : null,
      external_supervisor_name: internshipForm.external_supervisor_name || null,
      external_supervisor_contact: internshipForm.external_supervisor_contact || null,
      status: 'pending',
    }

    const { error } = await supabase.from('internships').insert(internshipData)

    if (error) {
      console.error('Error creating internship:', error)
      toast.error('Failed to create internship')
    } else {
      toast.success('Internship created successfully!')
      setInternshipForm({
        student_id: '',
        host_id: '',
        program_id: '',
        title: '',
        description: '',
        start_date: '',
        end_date: '',
        total_hours: '',
        external_supervisor_name: '',
        external_supervisor_contact: '',
      })
      setActiveTab('internships')
      fetchInternships()
    }

    setIsSaving(false)
  }

  async function handleUpdateStatus(internship: Internship, newStatus: string) {
    const supabase = createClient() as any
    const { error } = await supabase
      .from('internships')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', internship.id)

    if (error) {
      toast.error('Failed to update status')
    } else {
      toast.success('Status updated')
      fetchInternships()
    }
  }

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)
  const hostsTotalPages = Math.ceil(hostsTotal / ITEMS_PER_PAGE)

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 md:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Internships & Attachments</h1>
              <p className="mt-1 text-sm text-gray-500">Manage student practical training placements</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-4 md:px-8 border-b border-gray-200">
          <nav className="flex gap-6">
            <button
              onClick={() => setActiveTab('internships')}
              className={`py-3 border-b-2 text-sm font-medium transition-colors ${
                activeTab === 'internships'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                Internships
              </div>
            </button>
            <button
              onClick={() => setActiveTab('hosts')}
              className={`py-3 border-b-2 text-sm font-medium transition-colors ${
                activeTab === 'hosts'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Host Companies
              </div>
            </button>
            <button
              onClick={() => setActiveTab('new')}
              className={`py-3 border-b-2 text-sm font-medium transition-colors ${
                activeTab === 'new'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                New Placement
              </div>
            </button>
          </nav>
        </div>
      </div>

      <div className="px-4 md:px-8 py-6">
        {/* Internships Tab */}
        {activeTab === 'internships' && (
          <>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search internships..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full sm:w-40"
              >
                <option value="">All Status</option>
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
              </Select>
            </div>

            {/* Internships Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Student</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Placement</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Company</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Period</th>
                      <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {isLoading ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500">Loading...</td>
                      </tr>
                    ) : internships.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500">No internships found</td>
                      </tr>
                    ) : (
                      internships.map((internship) => (
                        <tr key={internship.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900">{internship.student?.full_name}</p>
                            <p className="text-xs text-gray-500">{internship.student?.student_number}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900">{internship.title}</p>
                            <p className="text-xs text-gray-500">{internship.program?.name || '-'}</p>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <p className="text-gray-600">{internship.host?.company_name || 'Not assigned'}</p>
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            <p className="text-gray-600 text-sm">
                              {new Date(internship.start_date).toLocaleDateString()} - {new Date(internship.end_date).toLocaleDateString()}
                            </p>
                            {internship.total_hours && (
                              <p className="text-xs text-gray-500">
                                {internship.completed_hours}/{internship.total_hours} hours
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${STATUS_CONFIG[internship.status]?.bg} ${STATUS_CONFIG[internship.status]?.text}`}>
                              {STATUS_CONFIG[internship.status]?.icon}
                              {STATUS_CONFIG[internship.status]?.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setViewInternship(internship)}
                                className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"
                                title="View details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              {internship.status === 'pending' && (
                                <button
                                  onClick={() => handleUpdateStatus(internship, 'approved')}
                                  className="p-2 text-gray-400 hover:text-green-600 rounded-lg hover:bg-green-50"
                                  title="Approve"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                              )}
                              {internship.status === 'approved' && (
                                <button
                                  onClick={() => handleUpdateStatus(internship, 'in_progress')}
                                  className="p-2 text-gray-400 hover:text-amber-600 rounded-lg hover:bg-amber-50"
                                  title="Mark as Started"
                                >
                                  <Briefcase className="w-4 h-4" />
                                </button>
                              )}
                              {internship.status === 'in_progress' && (
                                <button
                                  onClick={() => handleUpdateStatus(internship, 'completed')}
                                  className="p-2 text-gray-400 hover:text-green-600 rounded-lg hover:bg-green-50"
                                  title="Mark as Completed"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
                  <p className="text-sm text-gray-500">
                    Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} of {totalCount}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg border border-gray-200 disabled:opacity-50"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg border border-gray-200 disabled:opacity-50"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Hosts Tab */}
        {activeTab === 'hosts' && (
          <>
            <div className="flex justify-end mb-6">
              <Button onClick={() => setShowHostModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Host Company
              </Button>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Company</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Industry</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Contact</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Location</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {hosts.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-500">No host companies added yet</td>
                      </tr>
                    ) : (
                      hosts.map((host) => (
                        <tr key={host.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                <Building2 className="w-5 h-5 text-blue-600" />
                              </div>
                              <p className="font-medium text-gray-900">{host.company_name}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <p className="text-gray-600">{host.industry || '-'}</p>
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            <p className="text-gray-900">{host.contact_person || '-'}</p>
                            <p className="text-xs text-gray-500">{host.contact_email}</p>
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell">
                            <p className="text-gray-600">{host.city || '-'}</p>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => {
                                  setEditingHost(host)
                                  setHostForm({
                                    company_name: host.company_name,
                                    industry: host.industry || '',
                                    contact_person: host.contact_person || '',
                                    contact_email: host.contact_email || '',
                                    contact_phone: host.contact_phone || '',
                                    address: host.address || '',
                                    city: host.city || '',
                                  })
                                  setShowHostModal(true)
                                }}
                                className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(host)}
                                className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* New Internship Tab */}
        {activeTab === 'new' && (
          <div className="max-w-2xl">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Create New Internship Placement</h2>

              <form onSubmit={handleCreateInternship} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Student <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={internshipForm.student_id}
                    onChange={(e) => setInternshipForm({ ...internshipForm, student_id: e.target.value })}
                    required
                  >
                    <option value="">Select student...</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>{s.full_name} ({s.student_number})</option>
                    ))}
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Host Company
                  </label>
                  <Select
                    value={internshipForm.host_id}
                    onChange={(e) => setInternshipForm({ ...internshipForm, host_id: e.target.value })}
                  >
                    <option value="">Select company (optional)...</option>
                    {hosts.map(h => (
                      <option key={h.id} value={h.id}>{h.company_name}</option>
                    ))}
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Program
                  </label>
                  <Select
                    value={internshipForm.program_id}
                    onChange={(e) => setInternshipForm({ ...internshipForm, program_id: e.target.value })}
                  >
                    <option value="">Select program (optional)...</option>
                    {programs.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Internship Title <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={internshipForm.title}
                    onChange={(e) => setInternshipForm({ ...internshipForm, title: e.target.value })}
                    placeholder="e.g., Industrial Attachment, Practical Training"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <Textarea
                    value={internshipForm.description}
                    onChange={(e) => setInternshipForm({ ...internshipForm, description: e.target.value })}
                    placeholder="Brief description of the internship..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="date"
                      value={internshipForm.start_date}
                      onChange={(e) => setInternshipForm({ ...internshipForm, start_date: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Date <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="date"
                      value={internshipForm.end_date}
                      onChange={(e) => setInternshipForm({ ...internshipForm, end_date: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Required Hours
                  </label>
                  <Input
                    type="number"
                    value={internshipForm.total_hours}
                    onChange={(e) => setInternshipForm({ ...internshipForm, total_hours: e.target.value })}
                    placeholder="e.g., 480"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      External Supervisor Name
                    </label>
                    <Input
                      value={internshipForm.external_supervisor_name}
                      onChange={(e) => setInternshipForm({ ...internshipForm, external_supervisor_name: e.target.value })}
                      placeholder="Supervisor at company"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Supervisor Contact
                    </label>
                    <Input
                      value={internshipForm.external_supervisor_contact}
                      onChange={(e) => setInternshipForm({ ...internshipForm, external_supervisor_contact: e.target.value })}
                      placeholder="Phone or email"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveTab('internships')}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    isLoading={isSaving}
                    disabled={!internshipForm.student_id || !internshipForm.title || !internshipForm.start_date || !internshipForm.end_date}
                  >
                    <Briefcase className="w-4 h-4 mr-2" />
                    Create Placement
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Host Company Modal */}
      {showHostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">
                {editingHost ? 'Edit Host Company' : 'Add Host Company'}
              </h2>

              <form onSubmit={handleSaveHost} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={hostForm.company_name}
                    onChange={(e) => setHostForm({ ...hostForm, company_name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Industry</label>
                  <Input
                    value={hostForm.industry}
                    onChange={(e) => setHostForm({ ...hostForm, industry: e.target.value })}
                    placeholder="e.g., Information Technology, Manufacturing"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Contact Person</label>
                  <Input
                    value={hostForm.contact_person}
                    onChange={(e) => setHostForm({ ...hostForm, contact_person: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <Input
                      type="email"
                      value={hostForm.contact_email}
                      onChange={(e) => setHostForm({ ...hostForm, contact_email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                    <Input
                      value={hostForm.contact_phone}
                      onChange={(e) => setHostForm({ ...hostForm, contact_phone: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                  <Input
                    value={hostForm.address}
                    onChange={(e) => setHostForm({ ...hostForm, address: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                  <Input
                    value={hostForm.city}
                    onChange={(e) => setHostForm({ ...hostForm, city: e.target.value })}
                    placeholder="e.g., Windhoek, Swakopmund"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowHostModal(false)
                      setEditingHost(null)
                      setHostForm({
                        company_name: '',
                        industry: '',
                        contact_person: '',
                        contact_email: '',
                        contact_phone: '',
                        address: '',
                        city: '',
                      })
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" isLoading={isSaving}>
                    {editingHost ? 'Save Changes' : 'Add Company'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* View Internship Modal */}
      {viewInternship && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{viewInternship.title}</h2>
                  <p className="text-gray-500">{viewInternship.student?.full_name}</p>
                </div>
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${STATUS_CONFIG[viewInternship.status]?.bg} ${STATUS_CONFIG[viewInternship.status]?.text}`}>
                  {STATUS_CONFIG[viewInternship.status]?.icon}
                  {STATUS_CONFIG[viewInternship.status]?.label}
                </span>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 text-gray-600">
                  <Building2 className="w-4 h-4" />
                  <span>{viewInternship.host?.company_name || 'No company assigned'}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(viewInternship.start_date).toLocaleDateString()} - {new Date(viewInternship.end_date).toLocaleDateString()}</span>
                </div>
                {viewInternship.total_hours && (
                  <div className="flex items-center gap-3 text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>{viewInternship.completed_hours} / {viewInternship.total_hours} hours completed</span>
                  </div>
                )}
                {viewInternship.description && (
                  <div className="pt-4 border-t border-gray-100">
                    <p className="text-sm text-gray-600">{viewInternship.description}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end mt-6">
                <Button variant="outline" onClick={() => setViewInternship(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm && handleDeleteHost(deleteConfirm)}
        title="Delete Host Company"
        message={`Are you sure you want to delete "${deleteConfirm?.company_name}"?`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  )
}
