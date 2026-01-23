'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/modal'
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Mail,
  Phone,
  Calendar,
  GraduationCap,
  BookOpen,
  User,
  Link as LinkIcon,
  Copy,
  Check,
  Share2,
  Loader2,
  UserCheck,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Teacher {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  gender: string | null
  qualification: string | null
  specialization: string | null
  status: string
  date_joined: string | null
  notes: string | null
  created_at: string
  auth_user_id: string | null
  center_id: string
}

interface Subject {
  id: string
  name: string
  code: string | null
}

export default function TeacherDetailPage() {
  const params = useParams()
  const teacherId = params.id as string
  const router = useRouter()
  const [teacher, setTeacher] = useState<Teacher | null>(null)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [registrationLink, setRegistrationLink] = useState<string | null>(null)
  const [isGeneratingLink, setIsGeneratingLink] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  useEffect(() => {
    if (teacherId) {
      fetchTeacher()
    }
  }, [teacherId])

  async function fetchTeacher() {
    const supabase = createClient()

    try {
      // Fetch teacher
      const { data, error } = await supabase
        .from('lecturers')
        .select('*')
        .eq('id', teacherId)
        .single()

      if (error) throw error

      setTeacher(data as Teacher)

      // Fetch assigned subjects
      const { data: teacherSubjects } = await supabase
        .from('teacher_subjects')
        .select('subject:subjects(id, name, code)')
        .eq('teacher_id', teacherId)

      type SubjectData = { subject: { id: string; name: string; code: string | null } | null }
      const subjectList = (teacherSubjects as SubjectData[] | null)
        ?.map((ts) => ts.subject)
        .filter((s): s is Subject => s !== null) || []

      setSubjects(subjectList)
    } catch (error) {
      console.error('Error fetching teacher:', error)
      toast.error('Failed to load teacher')
      router.push('/dashboard/teachers')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleDelete() {
    if (!teacher) return

    setIsDeleting(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('lecturers')
        .delete()
        .eq('id', teacher.id)

      if (error) throw error

      toast.success('Teacher deleted successfully')
      router.push('/dashboard/teachers')
    } catch (error) {
      console.error('Error deleting teacher:', error)
      toast.error('Failed to delete teacher')
    } finally {
      setIsDeleting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-green-100 text-green-700',
      inactive: 'bg-gray-100 text-gray-700',
      terminated: 'bg-red-100 text-red-700',
    }
    return styles[status] || styles.inactive
  }

  async function generateRegistrationLink() {
    if (!teacher) return
    setIsGeneratingLink(true)

    try {
      const response = await fetch('/api/portal/generate-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: 'teacher',
          entityId: teacher.id,
          expiresInDays: 30,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate link')
      }

      // Build the registration URL
      const baseUrl = window.location.origin
      const regLink = `${baseUrl}/teacher/register?token=${result.token}`
      setRegistrationLink(regLink)
      toast.success('Registration link generated!')
    } catch (error) {
      console.error('Error generating link:', error)
      const errorMsg = error instanceof Error ? error.message : 'Failed to generate registration link'
      toast.error(errorMsg)
    } finally {
      setIsGeneratingLink(false)
    }
  }

  function copyToClipboard() {
    if (registrationLink) {
      navigator.clipboard.writeText(registrationLink)
      setLinkCopied(true)
      toast.success('Link copied to clipboard!')
      setTimeout(() => setLinkCopied(false), 2000)
    }
  }

  function shareOnWhatsApp() {
    if (!registrationLink || !teacher) return
    const message = encodeURIComponent(
      `Hello ${teacher.full_name},\n\nPlease use this link to create your teacher portal account:\n\n${registrationLink}\n\nThis link expires in 30 days.`
    )
    const whatsappUrl = teacher.phone
      ? `https://wa.me/${teacher.phone.replace(/\D/g, '')}?text=${message}`
      : `https://wa.me/?text=${message}`
    window.open(whatsappUrl, '_blank')
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    )
  }

  if (!teacher) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Teacher not found</p>
        <Link href="/dashboard/teachers">
          <Button className="mt-4">Back to Teachers</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard/teachers"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Teachers
        </Link>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
              <User className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{teacher.full_name}</h1>
              <div className="flex items-center gap-3 mt-1">
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(teacher.status)}`}>
                  {teacher.status}
                </span>
                {teacher.specialization && (
                  <span className="text-sm text-gray-500">{teacher.specialization}</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href={`/dashboard/teachers/${teacher.id}/edit`}>
              <Button variant="outline" leftIcon={<Pencil className="w-4 h-4" />}>
                Edit
              </Button>
            </Link>
            <Button
              variant="outline"
              onClick={() => setDeleteModalOpen(true)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium text-gray-900">
                    {teacher.email || <span className="text-gray-400">Not provided</span>}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                  <Phone className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="font-medium text-gray-900">
                    {teacher.phone || <span className="text-gray-400">Not provided</span>}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                  <User className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Gender</p>
                  <p className="font-medium text-gray-900 capitalize">
                    {teacher.gender || <span className="text-gray-400">Not specified</span>}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Professional Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Professional Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Qualification</p>
                <p className="font-medium text-gray-900">
                  {teacher.qualification || <span className="text-gray-400">Not specified</span>}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Specialization</p>
                <p className="font-medium text-gray-900">
                  {teacher.specialization || <span className="text-gray-400">Not specified</span>}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Date Joined</p>
                <p className="font-medium text-gray-900">
                  {teacher.date_joined
                    ? new Date(teacher.date_joined).toLocaleDateString()
                    : <span className="text-gray-400">Not specified</span>}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(teacher.status)}`}>
                  {teacher.status}
                </span>
              </div>
            </div>

            {teacher.notes && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-sm text-gray-500 mb-1">Notes</p>
                <p className="text-gray-700">{teacher.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                  <span className="text-gray-600">Subjects</span>
                </div>
                <span className="font-semibold text-gray-900">{subjects.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-green-600" />
                  <span className="text-gray-600">Member Since</span>
                </div>
                <span className="font-semibold text-gray-900">
                  {new Date(teacher.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Assigned Subjects */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <GraduationCap className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">Assigned Subjects</h2>
            </div>
            {subjects.length > 0 ? (
              <div className="space-y-2">
                {subjects.map((subject) => (
                  <div
                    key={subject.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{subject.name}</p>
                      {subject.code && (
                        <p className="text-sm text-gray-500">{subject.code}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No subjects assigned</p>
            )}
          </div>

          {/* Portal Access */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <LinkIcon className="w-5 h-5 text-emerald-600" />
              <h2 className="text-lg font-semibold text-gray-900">Portal Access</h2>
            </div>

            {teacher.auth_user_id ? (
              <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                <UserCheck className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-700">Account Created</p>
                  <p className="text-sm text-green-600">Teacher has portal access</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  This teacher doesn&apos;t have a portal account yet. Generate a registration link to share with them.
                </p>

                {!registrationLink ? (
                  <Button
                    onClick={generateRegistrationLink}
                    disabled={isGeneratingLink}
                    className="w-full"
                    leftIcon={isGeneratingLink ? <Loader2 className="w-4 h-4 animate-spin" /> : <LinkIcon className="w-4 h-4" />}
                  >
                    {isGeneratingLink ? 'Generating...' : 'Generate Registration Link'}
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Registration Link</p>
                      <p className="text-sm text-gray-700 break-all font-mono">
                        {registrationLink.substring(0, 50)}...
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={copyToClipboard}
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        leftIcon={linkCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      >
                        {linkCopied ? 'Copied!' : 'Copy'}
                      </Button>
                      <Button
                        onClick={shareOnWhatsApp}
                        size="sm"
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        leftIcon={<Share2 className="w-4 h-4" />}
                      >
                        WhatsApp
                      </Button>
                    </div>

                    <button
                      onClick={generateRegistrationLink}
                      className="text-sm text-blue-600 hover:text-blue-700 w-full text-center"
                    >
                      Generate new link
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Teacher"
        message={`Are you sure you want to delete "${teacher.full_name}"? This action cannot be undone.`}
        confirmText="Delete"
        isLoading={isDeleting}
      />
    </div>
  )
}
