'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/modal'
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Printer,
  User,
  Phone,
  Mail,
  Calendar,
  BookOpen,
  CreditCard,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus,
  Receipt,
  Loader2,
  CalendarPlus,
  Link as LinkIcon,
  Copy,
  Check,
  Share2,
  UserCheck,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { generateMonthlyFees } from '@/lib/fee-utils'
import { formatCurrency, CURRENCY_CONFIG } from '@/lib/currency'
import YearProgressionPanel from '@/components/students/year-progression-panel'

interface Student {
  id: string
  student_number: string | null
  full_name: string
  surname: string | null
  first_name: string | null
  email: string | null
  phone: string | null
  gender: string | null
  date_of_birth: string | null
  id_number: string | null
  grade: string | null
  school_name: string | null
  health_conditions: string | null
  photo_url: string | null
  parent_name: string | null
  parent_phone: string | null
  parent_email: string | null
  relationship: string | null
  payer_name: string | null
  payer_id_number: string | null
  payer_phone: string | null
  payer_relationship: string | null
  registration_fee_paid: boolean
  registration_fee_amount: number
  terms_accepted: boolean
  terms_accepted_date: string | null
  credit_balance: number
  status: string
  registration_date: string
  created_at: string
  auth_user_id: string | null
  center_id: string
}

interface Subject {
  id: string
  name: string
  code: string | null
  monthly_fee: number
}

interface Center {
  name: string
  email: string | null
  phone: string | null
  address: string | null
  logo_url: string | null
  primary_color: string | null
  secondary_color: string | null
  bank_name: string | null
  account_number: string | null
  branch_code: string | null
  registration_fee: number
  late_payment_penalty: number
  payment_due_day: number
  payment_months: number[] | null
  academic_year_start_month: number | null
}

interface StudentFee {
  id: string
  fee_month: string
  fee_type: string
  amount_due: number
  amount_paid: number
  balance: number
  status: string
}

interface Payment {
  id: string
  amount: number
  payment_method: string | null
  payment_date: string
  reference_number: string | null
}

interface Refund {
  id: string
  amount: number
  reason: string
  reason_notes: string | null
  refund_date: string
}

export default function StudentDetailPage() {
  const params = useParams()
  const studentId = params.id as string
  const router = useRouter()
  const { user, isInstitutionAdmin } = useAuthStore()
  const printRef = useRef<HTMLDivElement>(null)

  const [student, setStudent] = useState<Student | null>(null)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [center, setCenter] = useState<Center | null>(null)
  const [studentFees, setStudentFees] = useState<StudentFee[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [refunds, setRefunds] = useState<Refund[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [activeTab, setActiveTab] = useState<'info' | 'fees'>('info')

  // Fee generation state
  const [showGenerateFeesModal, setShowGenerateFeesModal] = useState(false)
  const [isGeneratingFees, setIsGeneratingFees] = useState(false)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonths, setSelectedMonths] = useState<number[]>([])

  // Fee deletion state
  const [deleteFeeModalOpen, setDeleteFeeModalOpen] = useState(false)
  const [feeToDelete, setFeeToDelete] = useState<StudentFee | null>(null)
  const [isDeletingFee, setIsDeletingFee] = useState(false)

  // Portal access state
  const [registrationLink, setRegistrationLink] = useState<string | null>(null)
  const [isGeneratingLink, setIsGeneratingLink] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  // Month names for display
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  // Toggle month selection
  const toggleMonth = (monthIndex: number) => {
    setSelectedMonths(prev =>
      prev.includes(monthIndex)
        ? prev.filter(m => m !== monthIndex)
        : [...prev, monthIndex].sort((a, b) => a - b)
    )
  }

  // Select all months
  const selectAllMonths = () => {
    setSelectedMonths([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
  }

  // Clear all months
  const clearAllMonths = () => {
    setSelectedMonths([])
  }

  // Calculate expected fees based on academic year settings
  // Each calendar year is treated separately - we don't look back to previous years
  const getExpectedFeeMonths = () => {
    if (!center || !student) return { expected: [], missing: [], totalExpectedAmount: 0 }

    const currentDate = new Date()
    const currentYear = currentDate.getFullYear()
    const currentMonth = currentDate.getMonth() // 0-11

    // Get the payment months array (default to Feb-Oct if not set)
    const paymentMonths = center.payment_months || [1, 2, 3, 4, 5, 6, 7, 8, 9]

    // Calculate the monthly tuition based on enrolled subjects
    const monthlyTuition = subjects.reduce((sum, s) => sum + s.monthly_fee, 0)

    // Only look at the CURRENT calendar year
    // Each year is a fresh start - we don't go back to previous years
    const expectedMonths: { month: number; year: number; monthLabel: string; feeMonth: string }[] = []

    for (const monthNum of paymentMonths) {
      // Only include months in the current year that have already started
      if (monthNum <= currentMonth) {
        const feeMonth = `${currentYear}-${String(monthNum + 1).padStart(2, '0')}-01`
        expectedMonths.push({
          month: monthNum,
          year: currentYear,
          monthLabel: `${monthNames[monthNum]} ${currentYear}`,
          feeMonth,
        })
      }
    }

    // Find which expected months don't have fees generated
    const existingFeeMonths = new Set(
      studentFees
        .filter(f => f.fee_type === 'tuition')
        .map(f => f.fee_month)
    )

    const missingMonths = expectedMonths.filter(m => !existingFeeMonths.has(m.feeMonth))

    return {
      expected: expectedMonths,
      missing: missingMonths,
      totalExpectedAmount: missingMonths.length * monthlyTuition,
    }
  }

  const expectedFees = getExpectedFeeMonths()

  useEffect(() => {
    if (studentId && user?.institution_id) {
      fetchStudent()
      fetchCenter()
      fetchStudentFees()
      fetchPayments()
      fetchRefunds()
    }
  }, [studentId, user?.institution_id])

  async function fetchStudent() {
    const supabase = createClient()

    try {
      // Fetch student
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('id', studentId)
        .single()

      if (studentError) throw studentError
      setStudent(studentData as Student)

      // Fetch enrolled courses
      const { data: enrollments } = await supabase
        .from('student_enrollments')
        .select('course:courses(id, name, code, monthly_fee)')
        .eq('student_id', studentId)
        .eq('is_active', true)

      if (enrollments) {
        type EnrollmentData = { course: Subject | null }
        const subjectsList = (enrollments as EnrollmentData[])
          .map((e) => e.course)
          .filter((s): s is Subject => s !== null)
        setSubjects(subjectsList)
      }
    } catch (error) {
      console.error('Error fetching student:', error)
      toast.error('Failed to load student details')
      router.push('/dashboard/students')
    } finally {
      setIsLoading(false)
    }
  }

  async function fetchCenter() {
    if (!user?.institution_id) return

    const supabase = createClient()
    const { data } = await supabase
      .from('institutions')
      .select('name, email, phone, address, logo_url, primary_color, secondary_color, bank_name, account_number, branch_code, registration_fee, late_payment_penalty, payment_due_day, payment_months, academic_year_start_month')
      .eq('id', user.institution_id)
      .single()

    if (data) {
      setCenter(data as Center)
    }
  }

  async function fetchStudentFees() {
    const supabase = createClient()
    const { data } = await supabase
      .from('student_fees')
      .select('*')
      .eq('student_id', studentId)
      .order('fee_month', { ascending: false })

    setStudentFees((data || []) as StudentFee[])
  }

  async function fetchPayments() {
    const supabase = createClient()
    const { data } = await supabase
      .from('payments')
      .select('id, amount, payment_method, payment_date, reference_number')
      .eq('student_id', studentId)
      .order('payment_date', { ascending: false })
      .limit(10)

    setPayments((data || []) as Payment[])
  }

  async function fetchRefunds() {
    const supabase = createClient()
    const { data } = await supabase
      .from('refunds')
      .select('id, amount, reason, reason_notes, refund_date')
      .eq('student_id', studentId)
      .order('refund_date', { ascending: false })
      .limit(10)

    setRefunds((data || []) as Refund[])
  }

  async function handleDelete() {
    if (!student) return

    setIsDeleting(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', student.id)

      if (error) throw error

      toast.success('Student deleted successfully')
      router.push('/dashboard/students')
    } catch (error) {
      console.error('Error deleting student:', error)
      toast.error('Failed to delete student')
    } finally {
      setIsDeleting(false)
    }
  }

  async function handleGenerateFees() {
    if (!student || !user?.institution_id || selectedMonths.length === 0) return

    setIsGeneratingFees(true)
    const supabase = createClient()

    try {
      // Get student's active course enrollments
      const { data: enrollments, error: enrollError } = await supabase
        .from('student_enrollments')
        .select(`
          id,
          course_id,
          course:courses(id, name, monthly_fee)
        `)
        .eq('student_id', student.id)
        .eq('is_active', true)

      if (enrollError) throw enrollError

      if (!enrollments || enrollments.length === 0) {
        toast.error('No courses enrolled')
        return
      }

      // Calculate monthly tuition from all courses
      type EnrollmentWithCourse = { course: { monthly_fee: number } | null }
      const monthlyTuition = (enrollments as unknown as EnrollmentWithCourse[]).reduce(
        (sum, e) => sum + (e.course?.monthly_fee || 0),
        0
      )

      // Generate fee records for each selected month
      const feeRecords: Array<{
        institution_id: string
        student_id: string
        fee_month: string
        fee_type: string
        amount_due: number
        amount_paid: number
        status: string
        due_date: string
      }> = []

      // Get existing fees to avoid duplicates
      const monthDates = selectedMonths.map(m =>
        `${selectedYear}-${String(m + 1).padStart(2, '0')}-01`
      )

      const { data: existingFees } = await supabase
        .from('student_fees')
        .select('fee_month')
        .eq('student_id', student.id)
        .in('fee_month', monthDates)

      const typedExistingFees = (existingFees || []) as { fee_month: string }[]
      const existingMonths = new Set(
        typedExistingFees.map(f => f.fee_month)
      )

      for (const monthIndex of selectedMonths) {
        const feeMonth = `${selectedYear}-${String(monthIndex + 1).padStart(2, '0')}-01`

        if (!existingMonths.has(feeMonth) && monthlyTuition > 0) {
          // Due date is 7th of the month
          const dueDate = new Date(selectedYear, monthIndex, 7)

          feeRecords.push({
            institution_id: user.institution_id,
            student_id: student.id,
            fee_month: feeMonth,
            fee_type: 'tuition',
            amount_due: monthlyTuition,
            amount_paid: 0,
            status: 'unpaid',
            due_date: dueDate.toISOString().split('T')[0],
          })
        }
      }

      if (feeRecords.length === 0) {
        toast.success('All selected fees already exist')
        setShowGenerateFeesModal(false)
        return
      }

      // Insert fee records
      const { error: insertError } = await supabase
        .from('student_fees')
        .insert(feeRecords as never)

      if (insertError) throw insertError

      toast.success(`Generated ${feeRecords.length} monthly fee records`)
      fetchStudentFees() // Refresh the fees list
      setShowGenerateFeesModal(false)
      setSelectedMonths([]) // Reset selection
    } catch (error) {
      console.error('Error generating fees:', error)
      toast.error('Failed to generate fees')
    } finally {
      setIsGeneratingFees(false)
    }
  }

  async function handleDeleteFee() {
    if (!feeToDelete) return

    setIsDeletingFee(true)
    const supabase = createClient()

    try {
      // Check if the fee has any payments
      if (feeToDelete.amount_paid > 0) {
        toast.error('Cannot delete a fee that has payments. Please reverse payments first.')
        return
      }

      const { error } = await supabase
        .from('student_fees')
        .delete()
        .eq('id', feeToDelete.id)

      if (error) throw error

      toast.success('Fee record deleted successfully')
      setDeleteFeeModalOpen(false)
      setFeeToDelete(null)
      fetchStudentFees() // Refresh the fees list
    } catch (error) {
      console.error('Error deleting fee:', error)
      toast.error('Failed to delete fee record')
    } finally {
      setIsDeletingFee(false)
    }
  }

  async function generateRegistrationLink() {
    if (!student) return
    setIsGeneratingLink(true)

    try {
      const response = await fetch('/api/portal/generate-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: 'student',
          entityId: student.id,
          expiresInDays: 30,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate link')
      }

      const baseUrl = window.location.origin
      const regLink = `${baseUrl}/student/register?token=${result.token}`
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
    if (!registrationLink || !student) return
    const message = encodeURIComponent(
      `Hello ${student.full_name},\n\nPlease use this link to create your student portal account:\n\n${registrationLink}\n\nThis link expires in 30 days.`
    )
    const whatsappUrl = student.phone
      ? `https://wa.me/${student.phone.replace(/\D/g, '')}?text=${message}`
      : `https://wa.me/?text=${message}`
    window.open(whatsappUrl, '_blank')
  }

  async function handlePrint() {
    const printContent = printRef.current
    if (!printContent) return

    const printWindow = window.open('', '', 'width=800,height=600')
    if (!printWindow) return

    const monthlyTotal = subjects.reduce((sum, s) => sum + s.monthly_fee, 0)
    const registrationFee = center?.registration_fee || 300
    const paymentMonthsCount = center?.payment_months?.length || 9
    const yearlyTotal = (monthlyTotal * paymentMonthsCount) + registrationFee

    const brandColor = center?.primary_color || '#1E40AF'

    // Convert logo URL to base64 data URL for print window
    let logoDataUrl = ''
    if (center?.logo_url) {
      try {
        const response = await fetch(center.logo_url)
        const blob = await response.blob()
        logoDataUrl = await new Promise((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.readAsDataURL(blob)
        })
      } catch (e) {
        console.error('Failed to load logo for print:', e)
      }
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Registration Form - ${student?.full_name}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; font-size: 12px; line-height: 1.4; padding: 20px; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 3px solid ${brandColor}; padding-bottom: 15px; }
          .header h1 { color: ${brandColor}; font-size: 24px; margin-bottom: 5px; }
          .header p { color: #666; font-size: 11px; }
          .logo { width: 70px; height: 70px; object-fit: contain; margin-bottom: 10px; }
          .section { margin-bottom: 20px; }
          .section-title { background: ${brandColor}; color: white; padding: 8px 15px; font-weight: bold; margin-bottom: 10px; }
          .row { display: flex; margin-bottom: 8px; }
          .label { width: 180px; font-weight: bold; }
          .value { flex: 1; border-bottom: 1px dotted #ccc; padding-left: 10px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
          th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
          th { background: #f5f5f5; }
          .checkbox { width: 15px; height: 15px; border: 1px solid #333; display: inline-block; margin-right: 5px; text-align: center; line-height: 13px; }
          .checkbox.checked::after { content: '✓'; }
          .financial-box { background: #f9f9f9; padding: 15px; border: 1px solid #ddd; margin-top: 10px; }
          .terms { font-size: 10px; line-height: 1.5; }
          .terms li { margin-bottom: 5px; }
          .signature-section { display: flex; justify-content: space-between; margin-top: 30px; }
          .signature-box { width: 45%; }
          .signature-line { border-bottom: 1px solid #333; margin-top: 40px; margin-bottom: 5px; }
          .photo-box { width: 100px; height: 120px; border: 1px solid #ccc; float: right; text-align: center; line-height: 120px; color: #999; font-size: 10px; }
          .page-break { page-break-before: always; }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          ${logoDataUrl ? `<img src="${logoDataUrl}" class="logo" alt="Logo">` : ''}
          <h1>${center?.name || 'Tutorial Center'}</h1>
          <p>Tel: ${center?.phone || ''} | Email: ${center?.email || ''}</p>
          ${center?.address ? `<p>${center.address}</p>` : ''}
        </div>

        <div class="photo-box">Student Photo</div>

        <h2 style="text-align: center; margin-bottom: 20px; color: ${brandColor};">REGISTRATION AND ENROLLMENT FORM ${new Date().getFullYear()}</h2>

        <div class="section">
          <div class="section-title">STUDENT INFORMATION</div>
          <div class="row"><span class="label">Surname:</span><span class="value">${student?.surname || ''}</span></div>
          <div class="row"><span class="label">First Name:</span><span class="value">${student?.first_name || ''}</span></div>
          <div class="row"><span class="label">Gender:</span><span class="value">${student?.gender || ''}</span></div>
          <div class="row"><span class="label">Date of Birth:</span><span class="value">${student?.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString() : ''}</span></div>
          <div class="row"><span class="label">ID Number:</span><span class="value">${student?.id_number || ''}</span></div>
          <div class="row"><span class="label">Mobile Number:</span><span class="value">${student?.phone || ''}</span></div>
          <div class="row"><span class="label">Parent/Guardian Number:</span><span class="value">${student?.parent_phone || ''}</span></div>
          <div class="row"><span class="label">Health Conditions:</span><span class="value">${student?.health_conditions || 'None'}</span></div>
        </div>

        <div class="section">
          <div class="section-title">SUBJECTS ENROLLED</div>
          <p style="margin-bottom: 10px;"><strong>NB:</strong> Registration fee R ${registrationFee.toFixed(2)} which is non-refundable</p>
          <table>
            <thead>
              <tr>
                <th>Subject</th>
                <th style="width: 60px;">Tick</th>
                <th style="width: 150px;">Tutorial Fee per Month</th>
              </tr>
            </thead>
            <tbody>
              ${subjects.map(s => `
                <tr>
                  <td>${s.name}</td>
                  <td style="text-align: center;"><span class="checkbox checked"></span></td>
                  <td>N$ ${s.monthly_fee.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="section">
          <div class="section-title">FINANCIAL INFORMATION</div>
          <div class="financial-box">
            <p><strong>TOTAL DUE TO US:</strong> N$ ${yearlyTotal.toFixed(2)}</p>
            <p><strong>INSTALMENT PAYMENT:</strong> N$ ${monthlyTotal.toFixed(2)} per month (${paymentMonthsCount} months)</p>
          </div>
        </div>

        <div class="section">
          <div class="section-title">PAYMENT DETAILS</div>
          <div class="row"><span class="label">Name of Person Responsible:</span><span class="value">${student?.payer_name || ''}</span></div>
          <div class="row"><span class="label">ID Number:</span><span class="value">${student?.payer_id_number || ''}</span></div>
          <div class="row"><span class="label">Mobile Number:</span><span class="value">${student?.payer_phone || ''}</span></div>
        </div>

        <div class="page-break"></div>

        <div class="header">
          ${logoDataUrl ? `<img src="${logoDataUrl}" class="logo" alt="Logo">` : ''}
          <h1>${center?.name || 'Tutorial Center'}</h1>
          <p>Tel: ${center?.phone || ''} | Email: ${center?.email || ''}</p>
        </div>

        <div class="section">
          <div class="row"><span class="label">Student's Name:</span><span class="value">${student?.full_name || ''}</span></div>
          <div class="row"><span class="label">Cell Number:</span><span class="value">${student?.phone || ''}</span></div>
          <div class="row"><span class="label">ID Number:</span><span class="value">${student?.id_number || ''}</span></div>
        </div>

        <div class="section">
          <div class="section-title">STUDENT ACKNOWLEDGEMENT OF FINANCIAL OBLIGATION</div>
          <ul class="terms">
            <li>By my Enrollment at ${center?.name || 'this Tutorial Center'}, I acknowledge that I am receiving an educational benefit and that the costs associated with that benefit are payable for ${paymentMonthsCount} months.</li>
            <li>By registering and checking in for classes, I acknowledge financial responsibility for the confirmed yearly tuition fee resulting from this registration; tuition and all fees assessed to my student account.</li>
            <li>I understand that tuition fees must be paid on time before/on the ${center?.payment_due_day || 5}th of every month, and no excuses will be tolerated regarding failure of payment.</li>
            <li>I understand that registration fees under any circumstances, are non-refundable.</li>
            <li>I understand that ${center?.name || 'the College'} will place a penalty fee of R ${(center?.late_payment_penalty || 70).toFixed(2)} on my account if I have not made payment on a timely basis.</li>
            <li>I understand that the College will prevent class attendance and other essential services until the tuition fee is paid.</li>
            <li>Should it be necessary for ${center?.name || 'the College'} to place my account with a debt collection agency, I acknowledge that I will be liable for all reasonable collection agency fees.</li>
            <li>I authorize ${center?.name || 'the College'} or its agents to contact me at the number listed during this registration.</li>
          </ul>
          <p style="margin-top: 15px; font-weight: bold;">By signing, I acknowledge that I understand the relevant policies and the effect of these changes on my financial aid and tuition liability, and still request to be registered as listed on this form.</p>
        </div>

        <div class="signature-section">
          <div class="signature-box">
            <div class="signature-line"></div>
            <p>Student Signature</p>
            <p style="margin-top: 10px;">Date: _______________________</p>
          </div>
          <div class="signature-box">
            <div class="signature-line"></div>
            <p>Person Responsible for Payment</p>
            <p style="margin-top: 10px;">Date: _______________________</p>
          </div>
        </div>

        ${center?.bank_name ? `
        <div style="margin-top: 30px; padding: 15px; background: #f5f5f5; border: 1px solid #ddd;">
          <p><strong>Banking Details for Payment:</strong></p>
          <p>Bank: ${center.bank_name}</p>
          <p>Account Number: ${center.account_number || ''}</p>
          <p>Branch Code: ${center.branch_code || ''}</p>
        </div>
        ` : ''}

        <script>
          function triggerPrint() {
            window.print();
          }
          // Wait for images to load before printing
          var images = document.images;
          var loaded = 0;
          var total = images.length;
          if (total === 0) {
            triggerPrint();
          } else {
            for (var i = 0; i < total; i++) {
              if (images[i].complete) {
                loaded++;
                if (loaded === total) triggerPrint();
              } else {
                images[i].onload = function() {
                  loaded++;
                  if (loaded === total) triggerPrint();
                };
                images[i].onerror = function() {
                  loaded++;
                  if (loaded === total) triggerPrint();
                };
              }
            }
          }
        </script>
      </body>
      </html>
    `)
    printWindow.document.close()
  }

  async function handlePrintFeeStatement() {
    if (!student || !center) return

    const totalDue = studentFees.reduce((sum, f) => sum + f.amount_due, 0)
    const totalPaid = studentFees.reduce((sum, f) => sum + f.amount_paid, 0)
    const totalRefunded = refunds.reduce((sum, r) => sum + r.amount, 0)
    const totalBalance = studentFees.reduce((sum, f) => sum + f.balance, 0)
    const brandColor = center.primary_color || '#1E40AF'

    // Convert logo URL to base64 data URL for print window
    let logoDataUrl = ''
    if (center.logo_url) {
      try {
        const response = await fetch(center.logo_url)
        const blob = await response.blob()
        logoDataUrl = await new Promise((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.readAsDataURL(blob)
        })
      } catch (e) {
        console.error('Failed to load logo for print:', e)
      }
    }

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Fee Statement - ${student.full_name}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid ${brandColor}; padding-bottom: 20px; }
          .header h1 { font-size: 24px; margin-bottom: 5px; color: ${brandColor}; }
          .header p { color: #666; font-size: 14px; }
          .logo { width: 70px; height: 70px; object-fit: contain; margin-bottom: 10px; }
          .title { text-align: center; margin: 20px 0; }
          .title h2 { font-size: 20px; text-transform: uppercase; }
          .student-info { background: #f8f8f8; padding: 15px; margin-bottom: 20px; }
          .student-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
          .info-item label { font-size: 12px; color: #666; }
          .info-item p { font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { padding: 10px; text-align: left; border: 1px solid #ddd; }
          th { background: #f5f5f5; font-size: 12px; text-transform: uppercase; }
          .status-paid { color: #059669; font-weight: bold; }
          .status-partial { color: #d97706; font-weight: bold; }
          .status-unpaid { color: #dc2626; font-weight: bold; }
          .summary { margin-top: 20px; }
          .summary-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
          .summary-row.total { border-top: 2px solid #333; font-size: 18px; font-weight: bold; }
          .balance-due { color: #dc2626; }
          .refund-amount { color: #dc2626; }
          .banking { margin-top: 30px; padding: 15px; background: #f0f9ff; border: 1px solid ${brandColor}; }
          .banking h3 { margin-bottom: 10px; color: ${brandColor}; }
          .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; }
          @media print {
            body { padding: 20px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          ${logoDataUrl ? `<img src="${logoDataUrl}" class="logo" alt="Logo">` : ''}
          <h1>${center.name}</h1>
          ${center.address ? `<p>${center.address}</p>` : ''}
          ${center.phone ? `<p>Tel: ${center.phone}</p>` : ''}
          ${center.email ? `<p>Email: ${center.email}</p>` : ''}
        </div>

        <div class="title">
          <h2>Fee Statement</h2>
          <p>Generated: ${new Date().toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        <div class="student-info">
          <div class="student-info-grid">
            <div class="info-item">
              <label>Student Name</label>
              <p>${student.full_name}</p>
            </div>
            <div class="info-item">
              <label>Student Number</label>
              <p>${student.student_number || 'N/A'}</p>
            </div>
            <div class="info-item">
              <label>Grade/Form</label>
              <p>${student.grade || 'N/A'}</p>
            </div>
            <div class="info-item">
              <label>Contact</label>
              <p>${student.phone || student.parent_phone || 'N/A'}</p>
            </div>
          </div>
        </div>

        <h3>Fee Details</h3>
        <table>
          <thead>
            <tr>
              <th>Period</th>
              <th>Fee Type</th>
              <th style="text-align: right">Amount Due</th>
              <th style="text-align: right">Amount Paid</th>
              <th style="text-align: right">Balance</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${studentFees.length > 0 ? studentFees.map(fee => `
              <tr>
                <td>${new Date(fee.fee_month).toLocaleDateString('en-ZA', { year: 'numeric', month: 'long' })}</td>
                <td style="text-transform: capitalize">${fee.fee_type}</td>
                <td style="text-align: right">N$ ${fee.amount_due.toFixed(2)}</td>
                <td style="text-align: right">N$ ${fee.amount_paid.toFixed(2)}</td>
                <td style="text-align: right">N$ ${fee.balance.toFixed(2)}</td>
                <td class="status-${fee.status}">${fee.status.toUpperCase()}</td>
              </tr>
            `).join('') : '<tr><td colspan="6" style="text-align: center; color: #666;">No fee records found</td></tr>'}
          </tbody>
        </table>

        <div class="summary">
          <div class="summary-row">
            <span>Total Amount Due</span>
            <span>N$ ${totalDue.toFixed(2)}</span>
          </div>
          <div class="summary-row">
            <span>Total Amount Paid</span>
            <span>N$ ${totalPaid.toFixed(2)}</span>
          </div>
          ${totalRefunded > 0 ? `
          <div class="summary-row">
            <span>Total Refunded</span>
            <span class="refund-amount">-N$ ${totalRefunded.toFixed(2)}</span>
          </div>
          ` : ''}
          <div class="summary-row total">
            <span>Outstanding Balance</span>
            <span class="${totalBalance > 0 ? 'balance-due' : ''}">N$ ${totalBalance.toFixed(2)}</span>
          </div>
          ${(student.credit_balance || 0) > 0 ? `
          <div class="summary-row" style="background: #dcfce7; padding: 10px; margin-top: 10px; border-radius: 4px;">
            <span style="color: #166534; font-weight: bold;">Credit Balance Available</span>
            <span style="color: #166534; font-weight: bold;">N$ ${(student.credit_balance || 0).toFixed(2)}</span>
          </div>
          <div class="summary-row" style="font-size: 14px; font-weight: bold;">
            <span>Net Amount Due</span>
            <span class="${Math.max(0, totalBalance - (student.credit_balance || 0)) > 0 ? 'balance-due' : ''}" style="font-weight: bold;">
              N$ ${Math.max(0, totalBalance - (student.credit_balance || 0)).toFixed(2)}
            </span>
          </div>
          ` : ''}
        </div>

        ${payments.length > 0 ? `
          <h3 style="margin-top: 30px;">Recent Payments</h3>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Reference</th>
                <th>Method</th>
                <th style="text-align: right">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${payments.slice(0, 5).map(p => `
                <tr>
                  <td>${new Date(p.payment_date).toLocaleDateString('en-ZA')}</td>
                  <td>${p.reference_number || '-'}</td>
                  <td style="text-transform: capitalize">${p.payment_method?.replace('_', ' ') || '-'}</td>
                  <td style="text-align: right">N$ ${p.amount.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}

        ${refunds.length > 0 ? `
          <h3 style="margin-top: 30px;">Refunds</h3>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Reason</th>
                <th style="text-align: right">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${refunds.slice(0, 5).map(r => `
                <tr>
                  <td>${new Date(r.refund_date).toLocaleDateString('en-ZA')}</td>
                  <td style="text-transform: capitalize">${r.reason.replace('_', ' ')}${r.reason_notes ? ` - ${r.reason_notes}` : ''}</td>
                  <td style="text-align: right" class="refund-amount">-R ${r.amount.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}

        ${center.bank_name ? `
          <div class="banking">
            <h3>Banking Details for Payment</h3>
            <p><strong>Bank:</strong> ${center.bank_name}</p>
            <p><strong>Account Number:</strong> ${center.account_number || ''}</p>
            <p><strong>Branch Code:</strong> ${center.branch_code || ''}</p>
            <p><strong>Reference:</strong> ${student.student_number || student.full_name}</p>
          </div>
        ` : ''}

        <div class="footer">
          <p>This is a computer-generated statement and does not require a signature.</p>
          <p>For queries, please contact us at ${center.phone || center.email || 'the center office'}.</p>
        </div>

        <script>
          function triggerPrint() {
            window.print();
          }
          // Wait for images to load before printing
          var images = document.images;
          var loaded = 0;
          var total = images.length;
          if (total === 0) {
            triggerPrint();
          } else {
            for (var i = 0; i < total; i++) {
              if (images[i].complete) {
                loaded++;
                if (loaded === total) triggerPrint();
              } else {
                images[i].onload = function() {
                  loaded++;
                  if (loaded === total) triggerPrint();
                };
                images[i].onerror = function() {
                  loaded++;
                  if (loaded === total) triggerPrint();
                };
              }
            }
          }
        </script>
      </body>
      </html>
    `

    printWindow.document.write(printContent)
    printWindow.document.close()
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

  if (!student) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Student not found</p>
      </div>
    )
  }

  const monthlyTotal = subjects.reduce((sum, s) => sum + s.monthly_fee, 0)
  const registrationFee = center?.registration_fee || 300
  const paymentMonthsCount = center?.payment_months?.length || 9

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; icon: React.ReactNode }> = {
      active: { bg: 'bg-green-100 text-green-700', icon: <CheckCircle className="w-4 h-4" /> },
      inactive: { bg: 'bg-gray-100 text-gray-700', icon: <XCircle className="w-4 h-4" /> },
      graduated: { bg: 'bg-blue-100 text-blue-700', icon: <CheckCircle className="w-4 h-4" /> },
      withdrawn: { bg: 'bg-red-100 text-red-700', icon: <AlertCircle className="w-4 h-4" /> },
    }
    return styles[status] || styles.inactive
  }

  const statusBadge = getStatusBadge(student.status)

  return (
    <div className="p-8" ref={printRef}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link
            href="/dashboard/students"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Students
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{student.full_name}</h1>
          <p className="text-gray-500 mt-1">Student ID: {student.student_number || 'Not assigned'}</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" leftIcon={<Printer className="w-4 h-4" />} onClick={handlePrint}>
            Print Form
          </Button>
          <Link href={`/dashboard/students/${student.id}/transcript`}>
            <Button variant="outline" leftIcon={<FileText className="w-4 h-4" />}>
              Transcript
            </Button>
          </Link>
          <Link href={`/dashboard/students/${student.id}/edit`}>
            <Button variant="secondary" leftIcon={<Pencil className="w-4 h-4" />}>
              Edit
            </Button>
          </Link>
          <Button
            variant="danger"
            leftIcon={<Trash2 className="w-4 h-4" />}
            onClick={() => setDeleteModalOpen(true)}
          >
            Delete
          </Button>
        </div>
      </div>

      {/* Status Badge and Tabs */}
      <div className="flex items-center justify-between mb-6">
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${statusBadge.bg}`}>
          {statusBadge.icon}
          {student.status.charAt(0).toUpperCase() + student.status.slice(1)}
        </span>
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('info')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'info'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Student Info
          </button>
          <button
            onClick={() => setActiveTab('fees')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'fees'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Fees & Payments
          </button>
        </div>
      </div>

      {activeTab === 'info' ? (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-gray-400" />
              Personal Information
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Full Name</p>
                <p className="font-medium">{student.full_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Gender</p>
                <p className="font-medium capitalize">{student.gender || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Date of Birth</p>
                <p className="font-medium">
                  {student.date_of_birth
                    ? new Date(student.date_of_birth).toLocaleDateString()
                    : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">ID Number</p>
                <p className="font-medium">{student.id_number || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Grade/Form</p>
                <p className="font-medium">{student.grade || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">School</p>
                <p className="font-medium">{student.school_name || '-'}</p>
              </div>
              {student.health_conditions && (
                <div className="col-span-2">
                  <p className="text-sm text-gray-500">Health Conditions</p>
                  <p className="font-medium">{student.health_conditions}</p>
                </div>
              )}
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Phone className="w-5 h-5 text-gray-400" />
              Contact Information
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p className="font-medium">{student.phone || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium">{student.email || '-'}</p>
              </div>
            </div>
          </div>

          {/* Parent/Guardian */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Parent/Guardian</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Name</p>
                <p className="font-medium">{student.parent_name || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Relationship</p>
                <p className="font-medium capitalize">{student.relationship || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p className="font-medium">{student.parent_phone || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium">{student.parent_email || '-'}</p>
              </div>
            </div>
          </div>

          {/* Person Responsible for Payment */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-gray-400" />
              Person Responsible for Payment
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Name</p>
                <p className="font-medium">{student.payer_name || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">ID Number</p>
                <p className="font-medium">{student.payer_id_number || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p className="font-medium">{student.payer_phone || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Relationship</p>
                <p className="font-medium capitalize">{student.payer_relationship || '-'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Enrolled Subjects */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-gray-400" />
              Enrolled Subjects
            </h2>
            {subjects.length > 0 ? (
              <div className="space-y-3">
                {subjects.map((subject) => (
                  <div key={subject.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                    <span className="font-medium">{subject.name}</span>
                    <span className="text-gray-600">N$ {subject.monthly_fee.toFixed(2)}</span>
                  </div>
                ))}
                <div className="pt-3 border-t border-gray-200">
                  <div className="flex justify-between font-semibold">
                    <span>Monthly Total</span>
                    <span>N$ {monthlyTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No subjects enrolled</p>
            )}
          </div>

          {/* Year Progression Panel */}
          <YearProgressionPanel
            studentId={student.id}
            canPromote={isInstitutionAdmin()}
            onUpdate={fetchStudent}
          />

          {/* Financial Summary */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-400" />
              Financial Summary
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Registration Fee</span>
                <span className={student.registration_fee_paid ? 'text-green-600' : 'text-amber-600'}>
                  N$ {registrationFee.toFixed(2)}
                  {student.registration_fee_paid && ' (Paid)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Monthly Fee</span>
                <span>N$ {monthlyTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Yearly Total ({paymentMonthsCount} months)</span>
                <span>N$ {(monthlyTotal * paymentMonthsCount + registrationFee).toFixed(2)}</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t">
              <Link href={`/dashboard/payments?student=${student.id}`}>
                <Button variant="outline" className="w-full">
                  View Payment History
                </Button>
              </Link>
            </div>
          </div>

          {/* Registration Info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Registration Info</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Registered</span>
                <span>{new Date(student.registration_date).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Terms Accepted</span>
                <span className={student.terms_accepted ? 'text-green-600' : 'text-red-600'}>
                  {student.terms_accepted ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </div>

          {/* Portal Access */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <LinkIcon className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">Portal Access</h2>
            </div>

            {student.auth_user_id ? (
              <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                <UserCheck className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-700">Account Created</p>
                  <p className="text-sm text-green-600">Student has portal access</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  This student doesn&apos;t have a portal account yet. Generate a registration link to share with them.
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
      ) : (
      /* Fees & Payments Tab */
      <div className="space-y-6">
        {/* Actions Bar */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Fees & Payment History</h2>
          <div className="flex gap-3">
            <Button
              variant="outline"
              leftIcon={<CalendarPlus className="w-4 h-4" />}
              onClick={() => setShowGenerateFeesModal(true)}
            >
              Generate Fees
            </Button>
            <Button
              variant="outline"
              leftIcon={<Receipt className="w-4 h-4" />}
              onClick={handlePrintFeeStatement}
            >
              Print Statement
            </Button>
            <Link href={`/dashboard/payments/new?student=${student.id}`}>
              <Button leftIcon={<Plus className="w-4 h-4" />}>
                Record Payment
              </Button>
            </Link>
          </div>
        </div>

        {/* Missing Expected Fees Warning */}
        {expectedFees.missing.length > 0 && subjects.length > 0 && (
          <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-medium text-amber-800">
                  Expected Fees Not Generated
                </h3>
                <p className="text-sm text-amber-700 mt-1">
                  Based on the academic year settings, the following months should have fees but don&apos;t have fee records yet:
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {expectedFees.missing.map(m => (
                    <span
                      key={m.feeMonth}
                      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800"
                    >
                      {m.monthLabel}
                    </span>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-amber-200">
                  <div className="text-sm text-amber-800">
                    <strong>Total missing fees:</strong> R {expectedFees.totalExpectedAmount.toFixed(2)}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      // Pre-select the missing months in the generate fees modal
                      const missingMonthIndices = expectedFees.missing.map(m => m.month)
                      setSelectedMonths(missingMonthIndices)
                      setSelectedYear(expectedFees.missing[0]?.year || new Date().getFullYear())
                      setShowGenerateFeesModal(true)
                    }}
                    leftIcon={<CalendarPlus className="w-4 h-4" />}
                  >
                    Generate Missing Fees
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Balance Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <p className="text-sm text-gray-500 mb-1">Total Due</p>
            <p className="text-2xl font-bold text-gray-900">
              R {studentFees.reduce((sum, f) => sum + f.amount_due, 0).toFixed(2)}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <p className="text-sm text-gray-500 mb-1">Total Paid</p>
            <p className="text-2xl font-bold text-green-600">
              R {studentFees.reduce((sum, f) => sum + f.amount_paid, 0).toFixed(2)}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <p className="text-sm text-gray-500 mb-1">Outstanding Balance</p>
            <p className={`text-2xl font-bold ${studentFees.reduce((sum, f) => sum + f.balance, 0) > 0 ? 'text-red-600' : 'text-gray-900'}`}>
              R {studentFees.reduce((sum, f) => sum + f.balance, 0).toFixed(2)}
            </p>
          </div>
          <div className={`rounded-xl shadow-sm border p-6 ${
            (student.credit_balance || 0) > 0
              ? 'bg-green-50 border-green-200'
              : 'bg-white border-gray-100'
          }`}>
            <p className="text-sm text-gray-500 mb-1">Credit Balance</p>
            <p className={`text-2xl font-bold ${(student.credit_balance || 0) > 0 ? 'text-green-600' : 'text-gray-400'}`}>
              R {(student.credit_balance || 0).toFixed(2)}
            </p>
            {(student.credit_balance || 0) > 0 && (
              <p className="text-xs text-green-600 mt-1">Available for future fees</p>
            )}
          </div>
        </div>

        {/* Net Balance Summary - shows when there's credit */}
        {(student.credit_balance || 0) > 0 && studentFees.reduce((sum, f) => sum + f.balance, 0) > 0 && (
          <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-800">Net Amount Due</p>
                <p className="text-xs text-blue-600">Outstanding balance minus available credit</p>
              </div>
              <p className="text-xl font-bold text-blue-800">
                R {Math.max(0, studentFees.reduce((sum, f) => sum + f.balance, 0) - (student.credit_balance || 0)).toFixed(2)}
              </p>
            </div>
          </div>
        )}

        {/* Fee Records */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Fee Records</h3>
          </div>
          {studentFees.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Amount Due</th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Paid</th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {studentFees.map((fee) => (
                    <tr key={fee.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-gray-900">
                        {new Date(fee.fee_month).toLocaleDateString('en-ZA', { year: 'numeric', month: 'long' })}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          fee.fee_type === 'registration'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {fee.fee_type === 'registration' ? 'Registration' : 'Tuition'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-gray-900">N$ {fee.amount_due.toFixed(2)}</td>
                      <td className="px-6 py-4 text-right text-green-600">N$ {fee.amount_paid.toFixed(2)}</td>
                      <td className={`px-6 py-4 text-right font-medium ${fee.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        N$ {fee.balance.toFixed(2)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          fee.status === 'paid' ? 'bg-green-100 text-green-700' :
                          fee.status === 'partial' ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {fee.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => {
                            setFeeToDelete(fee)
                            setDeleteFeeModalOpen(true)
                          }}
                          disabled={fee.amount_paid > 0}
                          className={`p-1.5 rounded-lg transition-colors ${
                            fee.amount_paid > 0
                              ? 'text-gray-300 cursor-not-allowed'
                              : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                          }`}
                          title={fee.amount_paid > 0 ? 'Cannot delete fee with payments' : 'Delete fee'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No fee records found</p>
            </div>
          )}
        </div>

        {/* Recent Payments */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Recent Payments</h3>
            <Link href={`/dashboard/payments?student=${student.id}`} className="text-sm text-blue-600 hover:text-blue-700">
              View All
            </Link>
          </div>
          {payments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-gray-900">
                        {new Date(payment.payment_date).toLocaleDateString('en-ZA')}
                      </td>
                      <td className="px-6 py-4 text-gray-500">{payment.reference_number || '-'}</td>
                      <td className="px-6 py-4 text-gray-900 capitalize">{payment.payment_method?.replace('_', ' ') || '-'}</td>
                      <td className="px-6 py-4 text-right font-semibold text-green-600">N$ {payment.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center">
              <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No payments recorded yet</p>
              <Link href={`/dashboard/payments/new?student=${student.id}`}>
                <Button variant="outline" className="mt-4" leftIcon={<Plus className="w-4 h-4" />}>
                  Record First Payment
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Student"
        message={`Are you sure you want to delete "${student.full_name}"? This action cannot be undone and will remove all associated records.`}
        confirmText="Delete"
        isLoading={isDeleting}
      />

      {/* Generate Fees Modal */}
      {showGenerateFeesModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Generate Monthly Fees</h2>
              <p className="text-sm text-gray-500 mt-1">
                Select the months where payment is expected for {student.full_name}
              </p>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {subjects.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-amber-600 mb-2">No subjects enrolled</p>
                  <p className="text-sm text-gray-500">
                    Please enroll the student in subjects before generating fees.
                  </p>
                </div>
              ) : (
                <>
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-sm text-gray-700">
                      <strong>Enrolled Subjects:</strong> {subjects.length}
                    </p>
                    <p className="text-sm text-gray-700">
                      <strong>Monthly Fee:</strong> R {subjects.reduce((sum, s) => sum + s.monthly_fee, 0).toFixed(2)}
                    </p>
                  </div>

                  {/* Year selector */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Select Year
                    </label>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none"
                    >
                      {[selectedYear - 1, selectedYear, selectedYear + 1].map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>

                  {/* Month selection */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Select Months to Generate
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={selectAllMonths}
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Select All
                        </button>
                        <span className="text-gray-300">|</span>
                        <button
                          type="button"
                          onClick={clearAllMonths}
                          className="text-xs text-gray-500 hover:text-gray-700 font-medium"
                        >
                          Clear All
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {monthNames.map((month, index) => {
                        const feeMonth = `${selectedYear}-${String(index + 1).padStart(2, '0')}-01`
                        const existingFee = studentFees.find(f => f.fee_month === feeMonth && f.fee_type === 'tuition')
                        const hasPayments = existingFee && existingFee.amount_paid > 0

                        if (existingFee) {
                          return (
                            <div
                              key={month}
                              className="flex items-center justify-between p-3 rounded-lg border border-green-300 bg-green-50"
                            >
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                <span className="text-sm font-medium text-green-700">{month.slice(0, 3)}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setFeeToDelete(existingFee)
                                  setDeleteFeeModalOpen(true)
                                }}
                                disabled={hasPayments}
                                className={`p-1 rounded transition-colors ${
                                  hasPayments
                                    ? 'text-gray-300 cursor-not-allowed'
                                    : 'text-red-400 hover:text-red-600 hover:bg-red-50'
                                }`}
                                title={hasPayments ? 'Cannot delete - has payments' : 'Delete this fee'}
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          )
                        }

                        return (
                          <label
                            key={month}
                            className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                              selectedMonths.includes(index)
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : 'border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedMonths.includes(index)}
                              onChange={() => toggleMonth(index)}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm font-medium">{month.slice(0, 3)}</span>
                          </label>
                        )
                      })}
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-green-500"></span>
                      <span>Fee exists</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-4 h-4 border-2 border-blue-500 rounded bg-blue-50"></span>
                      <span>To generate</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-4 h-4 border border-gray-300 rounded"></span>
                      <span>Available</span>
                    </div>
                  </div>

                  {/* Summary */}
                  {selectedMonths.length > 0 && (
                    <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                      <p className="text-sm text-green-800">
                        <strong>{selectedMonths.length} month{selectedMonths.length > 1 ? 's' : ''}</strong> selected
                      </p>
                      <p className="text-sm text-green-700">
                        Total to generate: <strong>N$ {(subjects.reduce((sum, s) => sum + s.monthly_fee, 0) * selectedMonths.length).toFixed(2)}</strong>
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="p-6 border-t border-gray-100 flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowGenerateFeesModal(false)
                  setSelectedMonths([])
                }}
              >
                Cancel
              </Button>
              {subjects.length > 0 && (
                <Button
                  onClick={handleGenerateFees}
                  disabled={isGeneratingFees || selectedMonths.length === 0}
                  leftIcon={
                    isGeneratingFees ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CalendarPlus className="w-4 h-4" />
                    )
                  }
                >
                  {isGeneratingFees ? 'Generating...' : `Generate ${selectedMonths.length} Fee${selectedMonths.length !== 1 ? 's' : ''}`}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Fee Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteFeeModalOpen}
        onClose={() => {
          setDeleteFeeModalOpen(false)
          setFeeToDelete(null)
        }}
        onConfirm={handleDeleteFee}
        title="Delete Fee Record"
        message={`Are you sure you want to delete the ${feeToDelete?.fee_type || ''} fee for ${feeToDelete ? new Date(feeToDelete.fee_month).toLocaleDateString('en-ZA', { year: 'numeric', month: 'long' }) : ''}? This action cannot be undone.`}
        confirmText="Delete"
        isLoading={isDeletingFee}
      />
    </div>
  )
}
