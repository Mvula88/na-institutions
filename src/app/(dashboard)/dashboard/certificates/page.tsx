'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/input'
import { ConfirmModal } from '@/components/ui/modal'
import {
  Award,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileText,
  Printer,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  Copy,
  ExternalLink,
  GraduationCap,
} from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'

interface IssuedCertificate {
  id: string
  certificate_number: string
  certificate_type: string
  title: string
  issue_date: string
  status: string
  grade_achieved: string | null
  final_gpa: number | null
  verification_code: string
  student: {
    id: string
    full_name: string
    student_number: string | null
  }
  program: {
    id: string
    name: string
  } | null
}

interface Student {
  id: string
  full_name: string
  student_number: string | null
}

interface Program {
  id: string
  name: string
  qualification_type: string | null
}

const ITEMS_PER_PAGE = 10

const CERTIFICATE_TYPES = [
  { value: 'completion', label: 'Certificate of Completion' },
  { value: 'diploma', label: 'Diploma' },
  { value: 'certificate', label: 'Certificate' },
  { value: 'attendance', label: 'Certificate of Attendance' },
  { value: 'custom', label: 'Custom Certificate' },
]

const STATUS_BADGES: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  draft: { bg: 'bg-gray-100', text: 'text-gray-700', icon: <FileText className="w-3 h-3" /> },
  issued: { bg: 'bg-green-100', text: 'text-green-700', icon: <CheckCircle className="w-3 h-3" /> },
  revoked: { bg: 'bg-red-100', text: 'text-red-700', icon: <XCircle className="w-3 h-3" /> },
  replaced: { bg: 'bg-amber-100', text: 'text-amber-700', icon: <Clock className="w-3 h-3" /> },
}

const GRADE_OPTIONS = [
  { value: 'distinction', label: 'Distinction' },
  { value: 'merit', label: 'Merit' },
  { value: 'pass', label: 'Pass' },
  { value: 'credit', label: 'Credit' },
]

export default function CertificatesPage() {
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState<'issued' | 'issue'>('issued')
  const [isLoading, setIsLoading] = useState(true)

  // Issued certificates state
  const [certificates, setCertificates] = useState<IssuedCertificate[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  // Issue certificate state
  const [students, setStudents] = useState<Student[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [studentSearch, setStudentSearch] = useState('')
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [issueForm, setIssueForm] = useState({
    student_id: '',
    program_id: '',
    certificate_type: 'completion',
    title: '',
    issue_date: new Date().toISOString().split('T')[0],
    grade_achieved: '',
    final_gpa: '',
  })
  const [isIssuing, setIsIssuing] = useState(false)

  // Modals
  const [viewCertificate, setViewCertificate] = useState<IssuedCertificate | null>(null)
  const [revokeConfirm, setRevokeConfirm] = useState<IssuedCertificate | null>(null)

  useEffect(() => {
    if (user?.institution_id) {
      fetchCertificates()
      fetchStudents()
      fetchPrograms()
    }
  }, [user?.institution_id, currentPage, statusFilter, typeFilter])

  async function fetchCertificates() {
    if (!user?.institution_id) return
    setIsLoading(true)

    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from('issued_certificates')
      .select(`
        *,
        student:students(id, full_name, student_number),
        program:programs(id, name)
      `, { count: 'exact' })
      .eq('institution_id', user.institution_id)
      .order('created_at', { ascending: false })

    if (statusFilter) {
      query = query.eq('status', statusFilter)
    }
    if (typeFilter) {
      query = query.eq('certificate_type', typeFilter)
    }
    if (searchQuery) {
      query = query.or(`certificate_number.ilike.%${searchQuery}%,title.ilike.%${searchQuery}%`)
    }

    const from = (currentPage - 1) * ITEMS_PER_PAGE
    const to = from + ITEMS_PER_PAGE - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (!error && data) {
      setCertificates(data as unknown as IssuedCertificate[])
      setTotalCount(count || 0)
    }
    setIsLoading(false)
  }

  async function fetchStudents() {
    if (!user?.institution_id) return

    const supabase = createClient()
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

    const supabase = createClient()
    const { data } = await supabase
      .from('programs')
      .select('id, name, qualification_type')
      .eq('institution_id', user.institution_id)
      .eq('is_active', true)
      .order('name')

    if (data) setPrograms(data)
  }

  function generateCertificateNumber(): string {
    const year = new Date().getFullYear()
    const random = Math.random().toString(36).substring(2, 8).toUpperCase()
    return `CERT-${year}-${random}`
  }

  function generateVerificationCode(): string {
    return Math.random().toString(36).substring(2, 12).toUpperCase()
  }

  async function handleIssueCertificate(e: React.FormEvent) {
    e.preventDefault()
    if (!user?.institution_id || !selectedStudent) return

    setIsIssuing(true)
    const supabase = createClient()

    const certificateData = {
      institution_id: user.institution_id,
      student_id: selectedStudent.id,
      program_id: issueForm.program_id || null,
      certificate_number: generateCertificateNumber(),
      certificate_type: issueForm.certificate_type,
      title: issueForm.title,
      issue_date: issueForm.issue_date,
      grade_achieved: issueForm.grade_achieved || null,
      final_gpa: issueForm.final_gpa ? parseFloat(issueForm.final_gpa) : null,
      status: 'issued',
      verification_code: generateVerificationCode(),
      issued_by: user.id,
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('issued_certificates').insert(certificateData)

    if (error) {
      console.error('Error issuing certificate:', error)
      toast.error('Failed to issue certificate')
    } else {
      toast.success('Certificate issued successfully!')
      setIssueForm({
        student_id: '',
        program_id: '',
        certificate_type: 'completion',
        title: '',
        issue_date: new Date().toISOString().split('T')[0],
        grade_achieved: '',
        final_gpa: '',
      })
      setSelectedStudent(null)
      setActiveTab('issued')
      fetchCertificates()
    }

    setIsIssuing(false)
  }

  async function handleRevokeCertificate(certificate: IssuedCertificate) {
    const supabase = createClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('issued_certificates')
      .update({
        status: 'revoked',
        revoked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', certificate.id)

    if (error) {
      toast.error('Failed to revoke certificate')
    } else {
      toast.success('Certificate revoked')
      fetchCertificates()
    }
    setRevokeConfirm(null)
  }

  function copyVerificationLink(code: string) {
    const link = `${window.location.origin}/verify/${code}`
    navigator.clipboard.writeText(link)
    toast.success('Verification link copied!')
  }

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)

  const filteredStudents = students.filter(s =>
    s.full_name.toLowerCase().includes(studentSearch.toLowerCase()) ||
    (s.student_number && s.student_number.includes(studentSearch))
  )

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 md:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Certificates & Diplomas</h1>
              <p className="mt-1 text-sm text-gray-500">Issue and manage academic certificates</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-4 md:px-8 border-b border-gray-200">
          <nav className="flex gap-6">
            <button
              onClick={() => setActiveTab('issued')}
              className={`py-3 border-b-2 text-sm font-medium transition-colors ${
                activeTab === 'issued'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4" />
                Issued Certificates
              </div>
            </button>
            <button
              onClick={() => setActiveTab('issue')}
              className={`py-3 border-b-2 text-sm font-medium transition-colors ${
                activeTab === 'issue'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Issue New Certificate
              </div>
            </button>
          </nav>
        </div>
      </div>

      <div className="px-4 md:px-8 py-6">
        {activeTab === 'issued' && (
          <>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search certificates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchCertificates()}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <Select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full sm:w-40"
              >
                <option value="">All Types</option>
                {CERTIFICATE_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </Select>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full sm:w-36"
              >
                <option value="">All Status</option>
                <option value="issued">Issued</option>
                <option value="revoked">Revoked</option>
              </Select>
            </div>

            {/* Certificates Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Certificate</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Student</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Program</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Issue Date</th>
                      <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {isLoading ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                          Loading...
                        </td>
                      </tr>
                    ) : certificates.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                          No certificates found
                        </td>
                      </tr>
                    ) : (
                      certificates.map((cert) => (
                        <tr key={cert.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                                <Award className="w-5 h-5 text-amber-600" />
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{cert.title}</p>
                                <p className="text-xs text-gray-500">{cert.certificate_number}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900">{cert.student?.full_name}</p>
                            <p className="text-xs text-gray-500">{cert.student?.student_number}</p>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <p className="text-gray-600">{cert.program?.name || '-'}</p>
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            <p className="text-gray-600">{new Date(cert.issue_date).toLocaleDateString()}</p>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${STATUS_BADGES[cert.status]?.bg} ${STATUS_BADGES[cert.status]?.text}`}>
                              {STATUS_BADGES[cert.status]?.icon}
                              {cert.status.charAt(0).toUpperCase() + cert.status.slice(1)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setViewCertificate(cert)}
                                className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"
                                title="View"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => copyVerificationLink(cert.verification_code)}
                                className="p-2 text-gray-400 hover:text-green-600 rounded-lg hover:bg-green-50"
                                title="Copy verification link"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                              {cert.status === 'issued' && (
                                <button
                                  onClick={() => setRevokeConfirm(cert)}
                                  className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                                  title="Revoke"
                                >
                                  <XCircle className="w-4 h-4" />
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

        {activeTab === 'issue' && (
          <div className="max-w-2xl">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Issue New Certificate</h2>

              <form onSubmit={handleIssueCertificate} className="space-y-6">
                {/* Student Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Student <span className="text-red-500">*</span>
                  </label>
                  {selectedStudent ? (
                    <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <GraduationCap className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{selectedStudent.full_name}</p>
                          <p className="text-sm text-gray-500">{selectedStudent.student_number}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedStudent(null)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="relative mb-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search student by name or number..."
                          value={studentSearch}
                          onChange={(e) => setStudentSearch(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      {studentSearch && (
                        <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                          {filteredStudents.slice(0, 10).map(student => (
                            <button
                              key={student.id}
                              type="button"
                              onClick={() => {
                                setSelectedStudent(student)
                                setStudentSearch('')
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                            >
                              <p className="font-medium text-gray-900">{student.full_name}</p>
                              <p className="text-xs text-gray-500">{student.student_number}</p>
                            </button>
                          ))}
                          {filteredStudents.length === 0 && (
                            <p className="px-4 py-2 text-sm text-gray-500">No students found</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Certificate Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Certificate Type <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={issueForm.certificate_type}
                    onChange={(e) => setIssueForm({ ...issueForm, certificate_type: e.target.value })}
                    required
                  >
                    {CERTIFICATE_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </Select>
                </div>

                {/* Program */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Program (Optional)
                  </label>
                  <Select
                    value={issueForm.program_id}
                    onChange={(e) => setIssueForm({ ...issueForm, program_id: e.target.value })}
                  >
                    <option value="">Select program...</option>
                    {programs.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </Select>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Certificate Title <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={issueForm.title}
                    onChange={(e) => setIssueForm({ ...issueForm, title: e.target.value })}
                    placeholder="e.g., Diploma in Information Technology"
                    required
                  />
                </div>

                {/* Issue Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Issue Date <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={issueForm.issue_date}
                    onChange={(e) => setIssueForm({ ...issueForm, issue_date: e.target.value })}
                    required
                  />
                </div>

                {/* Grade Achieved */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Grade Achieved (Optional)
                  </label>
                  <Select
                    value={issueForm.grade_achieved}
                    onChange={(e) => setIssueForm({ ...issueForm, grade_achieved: e.target.value })}
                  >
                    <option value="">Select grade...</option>
                    {GRADE_OPTIONS.map(g => (
                      <option key={g.value} value={g.value}>{g.label}</option>
                    ))}
                  </Select>
                </div>

                {/* Final GPA */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Final GPA (Optional)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="4"
                    value={issueForm.final_gpa}
                    onChange={(e) => setIssueForm({ ...issueForm, final_gpa: e.target.value })}
                    placeholder="e.g., 3.50"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveTab('issued')}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    isLoading={isIssuing}
                    disabled={!selectedStudent || !issueForm.title}
                  >
                    <Award className="w-4 h-4 mr-2" />
                    Issue Certificate
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* View Certificate Modal */}
      {viewCertificate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto rounded-full bg-amber-100 flex items-center justify-center mb-4">
                  <Award className="w-8 h-8 text-amber-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">{viewCertificate.title}</h2>
                <p className="text-gray-500">{viewCertificate.certificate_number}</p>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Student</span>
                  <span className="font-medium text-gray-900">{viewCertificate.student?.full_name}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Student Number</span>
                  <span className="font-medium text-gray-900">{viewCertificate.student?.student_number || '-'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Program</span>
                  <span className="font-medium text-gray-900">{viewCertificate.program?.name || '-'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Issue Date</span>
                  <span className="font-medium text-gray-900">{new Date(viewCertificate.issue_date).toLocaleDateString()}</span>
                </div>
                {viewCertificate.grade_achieved && (
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">Grade</span>
                    <span className="font-medium text-gray-900 capitalize">{viewCertificate.grade_achieved}</span>
                  </div>
                )}
                {viewCertificate.final_gpa && (
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">GPA</span>
                    <span className="font-medium text-gray-900">{viewCertificate.final_gpa}</span>
                  </div>
                )}
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Status</span>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${STATUS_BADGES[viewCertificate.status]?.bg} ${STATUS_BADGES[viewCertificate.status]?.text}`}>
                    {STATUS_BADGES[viewCertificate.status]?.icon}
                    {viewCertificate.status.charAt(0).toUpperCase() + viewCertificate.status.slice(1)}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-500">Verification Code</span>
                  <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">{viewCertificate.verification_code}</code>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => copyVerificationLink(viewCertificate.verification_code)}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Link
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setViewCertificate(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Revoke Confirmation */}
      <ConfirmModal
        isOpen={!!revokeConfirm}
        onClose={() => setRevokeConfirm(null)}
        onConfirm={() => revokeConfirm && handleRevokeCertificate(revokeConfirm)}
        title="Revoke Certificate"
        message={`Are you sure you want to revoke the certificate "${revokeConfirm?.title}"? This action cannot be undone.`}
        confirmText="Revoke"
        variant="danger"
      />
    </div>
  )
}
