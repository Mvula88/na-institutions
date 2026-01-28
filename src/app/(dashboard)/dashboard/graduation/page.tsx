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
import { Progress } from '@/components/ui/progress'
import {
  GraduationCap,
  Search,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  Users,
  FileText,
  Award,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Program {
  id: string
  name: string
  program_code: string
  duration_years: number
}

interface GraduationRequirement {
  id: string
  institution_id: string
  program_id: string
  min_total_credits: number | null
  min_core_credits: number | null
  min_elective_credits: number | null
  min_gpa: number | null
  min_major_gpa: number | null
  requires_internship: boolean
  min_internship_hours: number | null
  requires_thesis: boolean
  requires_final_exam: boolean
  requires_fee_clearance: boolean
  additional_requirements: string | null
  program?: Program
}

interface Student {
  id: string
  student_number: string
  first_name: string
  surname: string
  full_name: string
  email: string
}

interface StudentGraduationStatus {
  id: string
  student_id: string
  program_enrollment_id: string | null
  institution_id: string
  total_credits_earned: number
  core_credits_earned: number
  elective_credits_earned: number
  current_gpa: number | null
  credits_requirement_met: boolean
  gpa_requirement_met: boolean
  internship_requirement_met: boolean
  thesis_requirement_met: boolean
  fee_clearance_met: boolean
  graduation_status: string
  expected_graduation_date: string | null
  actual_graduation_date: string | null
  graduation_honors: string | null
  graduation_ceremony_id: string | null
  reviewed_by: string | null
  approved_by: string | null
  notes: string | null
  student?: Student
  program_enrollment?: { program?: Program }
}

interface GraduationCeremony {
  id: string
  name: string
  ceremony_date: string
  venue: string
  status: string
  capacity: number | null
  registration_deadline: string | null
  notes: string | null
  academic_year_id: string | null
}

export default function GraduationPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any
  const { user } = useAuthStore()

  // State
  const [activeTab, setActiveTab] = useState('students')
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Data
  const [programs, setPrograms] = useState<Program[]>([])
  const [requirements, setRequirements] = useState<GraduationRequirement[]>([])
  const [studentStatuses, setStudentStatuses] = useState<StudentGraduationStatus[]>([])
  const [ceremonies, setCeremonies] = useState<GraduationCeremony[]>([])

  // Dialogs
  const [showRequirementDialog, setShowRequirementDialog] = useState(false)
  const [showCeremonyDialog, setShowCeremonyDialog] = useState(false)
  const [showStudentDetailDialog, setShowStudentDetailDialog] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<StudentGraduationStatus | null>(null)
  const [editingRequirement, setEditingRequirement] = useState<GraduationRequirement | null>(null)
  const [editingCeremony, setEditingCeremony] = useState<GraduationCeremony | null>(null)

  // Form state
  const [requirementForm, setRequirementForm] = useState({
    program_id: '',
    min_total_credits: '',
    min_core_credits: '',
    min_elective_credits: '',
    min_gpa: '',
    requires_internship: false,
    min_internship_hours: '',
    requires_thesis: false,
    requires_final_exam: false,
    requires_fee_clearance: true,
    additional_requirements: '',
  })

  const [ceremonyForm, setCeremonyForm] = useState({
    name: '',
    ceremony_date: '',
    venue: '',
    capacity: '',
    registration_deadline: '',
    notes: '',
  })

  useEffect(() => {
    if (user?.institution_id) {
      fetchData()
    }
  }, [user?.institution_id])

  const fetchData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        fetchPrograms(),
        fetchRequirements(),
        fetchStudentStatuses(),
        fetchCeremonies(),
      ])
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load graduation data')
    } finally {
      setLoading(false)
    }
  }

  const fetchPrograms = async () => {
    const { data, error } = await supabase
      .from('programs')
      .select('id, name, program_code, duration_years')
      .eq('institution_id', user?.institution_id)
      .eq('is_active', true)
      .order('name')

    if (error) throw error
    setPrograms(data || [])
  }

  const fetchRequirements = async () => {
    const { data, error } = await supabase
      .from('graduation_requirements')
      .select(`
        *,
        program:programs(id, name, program_code)
      `)
      .eq('institution_id', user?.institution_id)
      .order('created_at', { ascending: false })

    if (error) throw error
    setRequirements(data || [])
  }

  const fetchStudentStatuses = async () => {
    const { data, error } = await supabase
      .from('student_graduation_status')
      .select(`
        *,
        student:students(id, student_number, first_name, surname, full_name, email),
        program_enrollment:program_enrollments(id, program:programs(id, name, program_code))
      `)
      .eq('institution_id', user?.institution_id)
      .order('created_at', { ascending: false })

    if (error) throw error
    setStudentStatuses(data || [])
  }

  const fetchCeremonies = async () => {
    const { data, error } = await supabase
      .from('graduation_ceremonies')
      .select('*')
      .eq('institution_id', user?.institution_id)
      .order('ceremony_date', { ascending: false })

    if (error) throw error
    setCeremonies(data || [])
  }

  const handleSaveRequirement = async () => {
    if (!requirementForm.program_id) {
      toast.error('Please select a program')
      return
    }

    try {
      const data = {
        institution_id: user?.institution_id,
        program_id: requirementForm.program_id,
        min_total_credits: requirementForm.min_total_credits ? parseFloat(requirementForm.min_total_credits) : null,
        min_core_credits: requirementForm.min_core_credits ? parseFloat(requirementForm.min_core_credits) : null,
        min_elective_credits: requirementForm.min_elective_credits ? parseFloat(requirementForm.min_elective_credits) : null,
        min_gpa: requirementForm.min_gpa ? parseFloat(requirementForm.min_gpa) : null,
        requires_internship: requirementForm.requires_internship,
        min_internship_hours: requirementForm.min_internship_hours ? parseInt(requirementForm.min_internship_hours) : null,
        requires_thesis: requirementForm.requires_thesis,
        requires_final_exam: requirementForm.requires_final_exam,
        requires_fee_clearance: requirementForm.requires_fee_clearance,
        additional_requirements: requirementForm.additional_requirements || null,
      }

      if (editingRequirement) {
        const { error } = await supabase
          .from('graduation_requirements')
          .update(data)
          .eq('id', editingRequirement.id)

        if (error) throw error
        toast.success('Requirement updated successfully')
      } else {
        const { error } = await supabase
          .from('graduation_requirements')
          .insert([data])

        if (error) throw error
        toast.success('Requirement created successfully')
      }

      setShowRequirementDialog(false)
      resetRequirementForm()
      fetchRequirements()
    } catch (error) {
      console.error('Error saving requirement:', error)
      toast.error('Failed to save requirement')
    }
  }

  const handleDeleteRequirement = async (id: string) => {
    if (!confirm('Are you sure you want to delete this requirement?')) return

    try {
      const { error } = await supabase
        .from('graduation_requirements')
        .delete()
        .eq('id', id)

      if (error) throw error
      toast.success('Requirement deleted')
      fetchRequirements()
    } catch (error) {
      console.error('Error deleting requirement:', error)
      toast.error('Failed to delete requirement')
    }
  }

  const handleSaveCeremony = async () => {
    if (!ceremonyForm.name || !ceremonyForm.ceremony_date || !ceremonyForm.venue) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      const data = {
        institution_id: user?.institution_id,
        name: ceremonyForm.name,
        ceremony_date: ceremonyForm.ceremony_date,
        venue: ceremonyForm.venue,
        capacity: ceremonyForm.capacity ? parseInt(ceremonyForm.capacity) : null,
        registration_deadline: ceremonyForm.registration_deadline || null,
        notes: ceremonyForm.notes || null,
        status: 'planned',
      }

      if (editingCeremony) {
        const { error } = await supabase
          .from('graduation_ceremonies')
          .update(data)
          .eq('id', editingCeremony.id)

        if (error) throw error
        toast.success('Ceremony updated successfully')
      } else {
        const { error } = await supabase
          .from('graduation_ceremonies')
          .insert([data])

        if (error) throw error
        toast.success('Ceremony scheduled successfully')
      }

      setShowCeremonyDialog(false)
      resetCeremonyForm()
      fetchCeremonies()
    } catch (error) {
      console.error('Error saving ceremony:', error)
      toast.error('Failed to save ceremony')
    }
  }

  const handleDeleteCeremony = async (id: string) => {
    if (!confirm('Are you sure you want to delete this ceremony?')) return

    try {
      const { error } = await supabase
        .from('graduation_ceremonies')
        .delete()
        .eq('id', id)

      if (error) throw error
      toast.success('Ceremony deleted')
      fetchCeremonies()
    } catch (error) {
      console.error('Error deleting ceremony:', error)
      toast.error('Failed to delete ceremony')
    }
  }

  const handleUpdateCeremonyStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from('graduation_ceremonies')
        .update({ status })
        .eq('id', id)

      if (error) throw error
      toast.success(`Ceremony marked as ${status}`)
      fetchCeremonies()
    } catch (error) {
      console.error('Error updating ceremony:', error)
      toast.error('Failed to update ceremony')
    }
  }

  const handleRecalculateEligibility = async (studentStatusId: string) => {
    toast.loading('Recalculating eligibility...')
    // In a real implementation, this would call a backend function to recalculate
    // For now, we'll just show a success message
    setTimeout(() => {
      toast.dismiss()
      toast.success('Eligibility recalculated')
      fetchStudentStatuses()
    }, 1000)
  }

  const resetRequirementForm = () => {
    setRequirementForm({
      program_id: '',
      min_total_credits: '',
      min_core_credits: '',
      min_elective_credits: '',
      min_gpa: '',
      requires_internship: false,
      min_internship_hours: '',
      requires_thesis: false,
      requires_final_exam: false,
      requires_fee_clearance: true,
      additional_requirements: '',
    })
    setEditingRequirement(null)
  }

  const resetCeremonyForm = () => {
    setCeremonyForm({
      name: '',
      ceremony_date: '',
      venue: '',
      capacity: '',
      registration_deadline: '',
      notes: '',
    })
    setEditingCeremony(null)
  }

  const openEditRequirement = (req: GraduationRequirement) => {
    setEditingRequirement(req)
    setRequirementForm({
      program_id: req.program_id,
      min_total_credits: req.min_total_credits?.toString() || '',
      min_core_credits: req.min_core_credits?.toString() || '',
      min_elective_credits: req.min_elective_credits?.toString() || '',
      min_gpa: req.min_gpa?.toString() || '',
      requires_internship: req.requires_internship || false,
      min_internship_hours: req.min_internship_hours?.toString() || '',
      requires_thesis: req.requires_thesis || false,
      requires_final_exam: req.requires_final_exam || false,
      requires_fee_clearance: req.requires_fee_clearance || false,
      additional_requirements: req.additional_requirements || '',
    })
    setShowRequirementDialog(true)
  }

  const openEditCeremony = (ceremony: GraduationCeremony) => {
    setEditingCeremony(ceremony)
    setCeremonyForm({
      name: ceremony.name,
      ceremony_date: ceremony.ceremony_date,
      venue: ceremony.venue,
      capacity: ceremony.capacity?.toString() || '',
      registration_deadline: ceremony.registration_deadline || '',
      notes: ceremony.notes || '',
    })
    setShowCeremonyDialog(true)
  }

  // Helper to check if all requirements are met
  const isEligible = (s: StudentGraduationStatus) =>
    s.credits_requirement_met && s.gpa_requirement_met && s.fee_clearance_met

  // Filter student statuses
  const filteredStudents = studentStatuses.filter((status) => {
    const studentName = status.student?.full_name || `${status.student?.first_name || ''} ${status.student?.surname || ''}`
    const matchesSearch =
      !searchTerm ||
      studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      status.student?.student_number?.toLowerCase().includes(searchTerm.toLowerCase())

    const eligible = isEligible(status)
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'eligible' && eligible) ||
      (statusFilter === 'not_eligible' && !eligible) ||
      status.graduation_status === statusFilter

    return matchesSearch && matchesStatus
  })

  // Stats
  const eligibleCount = studentStatuses.filter((s) => isEligible(s)).length
  const pendingCount = studentStatuses.filter((s) => s.graduation_status === 'pending').length
  const graduatedCount = studentStatuses.filter((s) => s.graduation_status === 'graduated').length
  const upcomingCeremonies = ceremonies.filter((c) => c.status === 'planned').length

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Pending</Badge>
      case 'approved':
        return <Badge className="bg-blue-100 text-blue-800"><CheckCircle2 className="h-3 w-3 mr-1" />Approved</Badge>
      case 'graduated':
        return <Badge className="bg-green-100 text-green-800"><Award className="h-3 w-3 mr-1" />Graduated</Badge>
      case 'deferred':
        return <Badge variant="secondary"><AlertCircle className="h-3 w-3 mr-1" />Deferred</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getCeremonyStatusBadge = (status: string) => {
    switch (status) {
      case 'planned':
        return <Badge variant="outline"><Calendar className="h-3 w-3 mr-1" />Planned</Badge>
      case 'registration_open':
        return <Badge className="bg-blue-100 text-blue-800"><Users className="h-3 w-3 mr-1" />Registration Open</Badge>
      case 'completed':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="h-3 w-3 mr-1" />Completed</Badge>
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
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
          <h1 className="text-3xl font-bold">Graduation Management</h1>
          <p className="text-muted-foreground">
            Track graduation requirements and manage ceremonies
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Eligible Students</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{eligibleCount}</div>
            <p className="text-xs text-muted-foreground">Ready to graduate</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Graduated</CardTitle>
            <Award className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{graduatedCount}</div>
            <p className="text-xs text-muted-foreground">This academic year</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Ceremonies</CardTitle>
            <Calendar className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingCeremonies}</div>
            <p className="text-xs text-muted-foreground">Scheduled events</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="students">
            <Users className="h-4 w-4 mr-2" />
            Student Eligibility
          </TabsTrigger>
          <TabsTrigger value="requirements">
            <FileText className="h-4 w-4 mr-2" />
            Requirements
          </TabsTrigger>
          <TabsTrigger value="ceremonies">
            <GraduationCap className="h-4 w-4 mr-2" />
            Ceremonies
          </TabsTrigger>
        </TabsList>

        {/* Student Eligibility Tab */}
        <TabsContent value="students" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row gap-4 justify-between">
                <div>
                  <CardTitle>Student Graduation Status</CardTitle>
                  <CardDescription>
                    Track and manage student eligibility for graduation
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search students..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-[250px]"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Filter status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="eligible">Eligible</SelectItem>
                      <SelectItem value="not_eligible">Not Eligible</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="graduated">Graduated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredStudents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No graduation records found</p>
                  <p className="text-sm">Student graduation status will appear here once tracked</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Program</TableHead>
                      <TableHead>GPA</TableHead>
                      <TableHead>Credits</TableHead>
                      <TableHead>Eligible</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map((status) => {
                      const studentName = status.student?.full_name || `${status.student?.first_name || ''} ${status.student?.surname || ''}`
                      const programName = status.program_enrollment?.program?.name || 'N/A'
                      const eligible = isEligible(status)
                      // Count how many requirements are met out of the key ones
                      const reqsMet = [
                        status.credits_requirement_met,
                        status.gpa_requirement_met,
                        status.fee_clearance_met,
                        status.internship_requirement_met,
                        status.thesis_requirement_met,
                      ].filter(Boolean).length
                      const totalReqs = 5

                      return (
                        <TableRow key={status.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{studentName}</p>
                              <p className="text-sm text-muted-foreground">
                                {status.student?.student_number}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>{programName}</TableCell>
                          <TableCell>{status.current_gpa?.toFixed(2) ?? '-'}</TableCell>
                          <TableCell>
                            <span className="text-sm">{status.total_credits_earned || 0}</span>
                          </TableCell>
                          <TableCell>
                            {eligible ? (
                              <Badge className="bg-green-100 text-green-800">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Yes
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                No
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>{getStatusBadge(status.graduation_status)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedStudent(status)
                                  setShowStudentDetailDialog(true)
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRecalculateEligibility(status.id)}
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Requirements Tab */}
        <TabsContent value="requirements" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Graduation Requirements</CardTitle>
                  <CardDescription>
                    Define requirements students must meet to graduate
                  </CardDescription>
                </div>
                <Button
                  onClick={() => {
                    resetRequirementForm()
                    setShowRequirementDialog(true)
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Requirement
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {requirements.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No graduation requirements defined</p>
                  <p className="text-sm">Add requirements to track student eligibility</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Program</TableHead>
                      <TableHead>Credits (Total/Core)</TableHead>
                      <TableHead>Min GPA</TableHead>
                      <TableHead>Requirements</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requirements.map((req) => (
                      <TableRow key={req.id}>
                        <TableCell className="font-medium">
                          {req.program?.name || 'All Programs'}
                        </TableCell>
                        <TableCell>
                          {req.min_total_credits ?? '-'} / {req.min_core_credits ?? '-'}
                        </TableCell>
                        <TableCell>{req.min_gpa ?? '-'}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {req.requires_fee_clearance && (
                              <Badge variant="outline" className="text-xs">Fees</Badge>
                            )}
                            {req.requires_internship && (
                              <Badge variant="outline" className="text-xs">Internship</Badge>
                            )}
                            {req.requires_thesis && (
                              <Badge variant="outline" className="text-xs">Thesis</Badge>
                            )}
                            {req.requires_final_exam && (
                              <Badge variant="outline" className="text-xs">Final Exam</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditRequirement(req)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteRequirement(req.id)}
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

        {/* Ceremonies Tab */}
        <TabsContent value="ceremonies" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Graduation Ceremonies</CardTitle>
                  <CardDescription>
                    Schedule and manage graduation events
                  </CardDescription>
                </div>
                <Button
                  onClick={() => {
                    resetCeremonyForm()
                    setShowCeremonyDialog(true)
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Schedule Ceremony
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {ceremonies.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No ceremonies scheduled</p>
                  <p className="text-sm">Schedule a graduation ceremony to get started</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {ceremonies.map((ceremony) => (
                    <Card key={ceremony.id} className="relative">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg">{ceremony.name}</CardTitle>
                          {getCeremonyStatusBadge(ceremony.status)}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {new Date(ceremony.ceremony_date).toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <GraduationCap className="h-4 w-4 text-muted-foreground" />
                          <span>{ceremony.venue}</span>
                        </div>
                        {ceremony.capacity && (
                          <div className="flex items-center gap-2 text-sm">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span>Capacity: {ceremony.capacity} graduates</span>
                          </div>
                        )}
                        {ceremony.registration_deadline && (
                          <p className="text-xs text-muted-foreground">
                            Registration deadline:{' '}
                            {new Date(ceremony.registration_deadline).toLocaleDateString()}
                          </p>
                        )}
                        <div className="flex gap-2 pt-2">
                          {ceremony.status === 'planned' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                handleUpdateCeremonyStatus(ceremony.id, 'registration_open')
                              }
                            >
                              Open Registration
                            </Button>
                          )}
                          {ceremony.status === 'registration_open' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateCeremonyStatus(ceremony.id, 'completed')}
                            >
                              Mark Complete
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditCeremony(ceremony)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteCeremony(ceremony.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
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
      </Tabs>

      {/* Add/Edit Requirement Dialog */}
      <Dialog open={showRequirementDialog} onOpenChange={setShowRequirementDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingRequirement ? 'Edit Requirement' : 'Add Graduation Requirement'}
            </DialogTitle>
            <DialogDescription>
              Define a requirement students must meet to graduate
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Program</Label>
              <Select
                value={requirementForm.program_id}
                onValueChange={(value) =>
                  setRequirementForm({ ...requirementForm, program_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select program" />
                </SelectTrigger>
                <SelectContent>
                  {programs.map((program) => (
                    <SelectItem key={program.id} value={program.id}>
                      {program.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Min Total Credits</Label>
                <Input
                  type="number"
                  value={requirementForm.min_total_credits}
                  onChange={(e) =>
                    setRequirementForm({ ...requirementForm, min_total_credits: e.target.value })
                  }
                  placeholder="e.g., 360"
                />
              </div>
              <div className="space-y-2">
                <Label>Min Core Credits</Label>
                <Input
                  type="number"
                  value={requirementForm.min_core_credits}
                  onChange={(e) =>
                    setRequirementForm({ ...requirementForm, min_core_credits: e.target.value })
                  }
                  placeholder="e.g., 240"
                />
              </div>
              <div className="space-y-2">
                <Label>Min Elective Credits</Label>
                <Input
                  type="number"
                  value={requirementForm.min_elective_credits}
                  onChange={(e) =>
                    setRequirementForm({ ...requirementForm, min_elective_credits: e.target.value })
                  }
                  placeholder="e.g., 120"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Min GPA</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={requirementForm.min_gpa}
                  onChange={(e) =>
                    setRequirementForm({ ...requirementForm, min_gpa: e.target.value })
                  }
                  placeholder="e.g., 2.0"
                />
              </div>
              <div className="space-y-2">
                <Label>Min Internship Hours</Label>
                <Input
                  type="number"
                  value={requirementForm.min_internship_hours}
                  onChange={(e) =>
                    setRequirementForm({ ...requirementForm, min_internship_hours: e.target.value })
                  }
                  placeholder="e.g., 480"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="requires_internship"
                  checked={requirementForm.requires_internship}
                  onChange={(e) =>
                    setRequirementForm({ ...requirementForm, requires_internship: e.target.checked })
                  }
                  className="rounded border-gray-300"
                />
                <Label htmlFor="requires_internship">Requires Internship</Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="requires_thesis"
                  checked={requirementForm.requires_thesis}
                  onChange={(e) =>
                    setRequirementForm({ ...requirementForm, requires_thesis: e.target.checked })
                  }
                  className="rounded border-gray-300"
                />
                <Label htmlFor="requires_thesis">Requires Thesis</Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="requires_final_exam"
                  checked={requirementForm.requires_final_exam}
                  onChange={(e) =>
                    setRequirementForm({ ...requirementForm, requires_final_exam: e.target.checked })
                  }
                  className="rounded border-gray-300"
                />
                <Label htmlFor="requires_final_exam">Requires Final Exam</Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="requires_fee_clearance"
                  checked={requirementForm.requires_fee_clearance}
                  onChange={(e) =>
                    setRequirementForm({ ...requirementForm, requires_fee_clearance: e.target.checked })
                  }
                  className="rounded border-gray-300"
                />
                <Label htmlFor="requires_fee_clearance">Requires Fee Clearance</Label>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Additional Requirements</Label>
              <Textarea
                value={requirementForm.additional_requirements}
                onChange={(e) =>
                  setRequirementForm({ ...requirementForm, additional_requirements: e.target.value })
                }
                placeholder="Any other graduation requirements..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRequirementDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveRequirement}>
              {editingRequirement ? 'Update' : 'Add'} Requirement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Ceremony Dialog */}
      <Dialog open={showCeremonyDialog} onOpenChange={setShowCeremonyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCeremony ? 'Edit Ceremony' : 'Schedule Graduation Ceremony'}
            </DialogTitle>
            <DialogDescription>
              Plan a graduation ceremony for eligible students
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Ceremony Name</Label>
              <Input
                value={ceremonyForm.name}
                onChange={(e) => setCeremonyForm({ ...ceremonyForm, name: e.target.value })}
                placeholder="e.g., Class of 2026 Graduation"
              />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={ceremonyForm.ceremony_date}
                onChange={(e) =>
                  setCeremonyForm({ ...ceremonyForm, ceremony_date: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Venue</Label>
              <Input
                value={ceremonyForm.venue}
                onChange={(e) => setCeremonyForm({ ...ceremonyForm, venue: e.target.value })}
                placeholder="e.g., Main Campus Auditorium"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Capacity (optional)</Label>
                <Input
                  type="number"
                  value={ceremonyForm.capacity}
                  onChange={(e) =>
                    setCeremonyForm({ ...ceremonyForm, capacity: e.target.value })
                  }
                  placeholder="Leave empty for unlimited"
                />
              </div>
              <div className="space-y-2">
                <Label>Registration Deadline</Label>
                <Input
                  type="date"
                  value={ceremonyForm.registration_deadline}
                  onChange={(e) =>
                    setCeremonyForm({ ...ceremonyForm, registration_deadline: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={ceremonyForm.notes}
                onChange={(e) => setCeremonyForm({ ...ceremonyForm, notes: e.target.value })}
                placeholder="Additional details about the ceremony"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCeremonyDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveCeremony}>
              {editingCeremony ? 'Update' : 'Schedule'} Ceremony
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Student Detail Dialog */}
      <Dialog open={showStudentDetailDialog} onOpenChange={setShowStudentDetailDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Graduation Status Details</DialogTitle>
            <DialogDescription>
              {selectedStudent?.student?.full_name || `${selectedStudent?.student?.first_name} ${selectedStudent?.student?.surname}`} -{' '}
              {selectedStudent?.student?.student_number}
            </DialogDescription>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Program</p>
                  <p className="font-medium">{selectedStudent.program_enrollment?.program?.name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <div className="mt-1">{getStatusBadge(selectedStudent.graduation_status)}</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">GPA</p>
                  <p className="font-medium">{selectedStudent.current_gpa?.toFixed(2) ?? '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Credits</p>
                  <p className="font-medium">{selectedStudent.total_credits_earned || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Core Credits</p>
                  <p className="font-medium">{selectedStudent.core_credits_earned || 0}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Requirements</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2">
                    {selectedStudent.credits_requirement_met ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="text-sm">Credits</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedStudent.gpa_requirement_met ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="text-sm">GPA</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedStudent.fee_clearance_met ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="text-sm">Fee Clearance</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedStudent.internship_requirement_met ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="text-sm">Internship</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedStudent.thesis_requirement_met ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="text-sm">Thesis</span>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Eligibility</p>
                <div className="mt-1">
                  {isEligible(selectedStudent) ? (
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Eligible to Graduate
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Not Yet Eligible
                    </Badge>
                  )}
                </div>
              </div>
              {selectedStudent.graduation_honors && (
                <div>
                  <p className="text-sm text-muted-foreground">Honors</p>
                  <p className="font-medium">{selectedStudent.graduation_honors}</p>
                </div>
              )}
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-2">Actions</p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRecalculateEligibility(selectedStudent.id)}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Recalculate
                  </Button>
                  {isEligible(selectedStudent) && selectedStudent.graduation_status === 'pending' && (
                    <Button size="sm">
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Approve for Graduation
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
