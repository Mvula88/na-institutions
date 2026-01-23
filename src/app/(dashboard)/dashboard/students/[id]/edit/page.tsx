'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Input, Select, Textarea } from '@/components/ui/input'
import { ArrowLeft, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { isValidSAPhoneNumber, getPhoneValidationError } from '@/lib/phone-validation'

interface Subject {
  id: string
  name: string
  code: string | null
  monthly_fee: number
}

interface StudentData {
  surname: string | null
  first_name: string | null
  gender: string | null
  date_of_birth: string | null
  id_number: string | null
  phone: string | null
  email: string | null
  health_conditions: string | null
  grade: string | null
  school_name: string | null
  parent_name: string | null
  parent_phone: string | null
  parent_email: string | null
  relationship: string | null
  payer_name: string | null
  payer_id_number: string | null
  payer_phone: string | null
  payer_relationship: string | null
  status: string
}

export default function EditStudentPage() {
  const params = useParams()
  const studentId = params.id as string
  const router = useRouter()
  const { user } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])
  const [originalSubjects, setOriginalSubjects] = useState<string[]>([])

  // Form state
  const [formData, setFormData] = useState({
    surname: '',
    first_name: '',
    gender: '',
    date_of_birth: '',
    id_number: '',
    phone: '',
    email: '',
    health_conditions: '',
    grade: '',
    school_name: '',
    parent_name: '',
    parent_phone: '',
    parent_email: '',
    relationship: '',
    payer_name: '',
    payer_id_number: '',
    payer_phone: '',
    payer_relationship: '',
    status: 'active',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (studentId && user?.institution_id) {
      fetchStudent()
      fetchSubjects()
    }
  }, [studentId, user?.institution_id])

  async function fetchStudent() {
    const supabase = createClient()

    try {
      // Fetch student
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('id', studentId)
        .single()

      if (error) throw error

      const student = data as StudentData

      setFormData({
        surname: student.surname || '',
        first_name: student.first_name || '',
        gender: student.gender || '',
        date_of_birth: student.date_of_birth || '',
        id_number: student.id_number || '',
        phone: student.phone || '',
        email: student.email || '',
        health_conditions: student.health_conditions || '',
        grade: student.grade || '',
        school_name: student.school_name || '',
        parent_name: student.parent_name || '',
        parent_phone: student.parent_phone || '',
        parent_email: student.parent_email || '',
        relationship: student.relationship || '',
        payer_name: student.payer_name || '',
        payer_id_number: student.payer_id_number || '',
        payer_phone: student.payer_phone || '',
        payer_relationship: student.payer_relationship || '',
        status: student.status || 'active',
      })

      // Fetch enrolled courses
      const { data: enrollments } = await supabase
        .from('student_enrollments')
        .select('course_id')
        .eq('student_id', studentId)
        .eq('is_active', true)

      if (enrollments) {
        const courseIds = (enrollments as { course_id: string }[]).map((e) => e.course_id)
        setSelectedSubjects(courseIds)
        setOriginalSubjects(courseIds)
      }
    } catch (error) {
      console.error('Error fetching student:', error)
      toast.error('Failed to load student')
      router.push('/dashboard/students')
    } finally {
      setIsFetching(false)
    }
  }

  async function fetchSubjects() {
    if (!user?.institution_id) return

    const supabase = createClient()
    const { data } = await supabase
      .from('courses')
      .select('id, name, code, monthly_fee')
      .eq('institution_id', user.institution_id)
      .eq('is_active', true)
      .order('name')

    setSubjects((data || []) as Subject[])
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  function toggleSubject(subjectId: string) {
    setSelectedSubjects((prev) =>
      prev.includes(subjectId)
        ? prev.filter((id) => id !== subjectId)
        : [...prev, subjectId]
    )
  }

  function validateForm() {
    const newErrors: Record<string, string> = {}

    if (!formData.surname.trim()) newErrors.surname = 'Surname is required'
    if (!formData.first_name.trim()) newErrors.first_name = 'First name is required'

    // Validate phone numbers if provided
    if (formData.phone && !isValidSAPhoneNumber(formData.phone)) {
      newErrors.phone = getPhoneValidationError(formData.phone, 'Mobile number') || 'Invalid phone number'
    }
    if (formData.parent_phone && !isValidSAPhoneNumber(formData.parent_phone)) {
      newErrors.parent_phone = getPhoneValidationError(formData.parent_phone, 'Parent phone') || 'Invalid phone number'
    }
    if (formData.payer_phone && !isValidSAPhoneNumber(formData.payer_phone)) {
      newErrors.payer_phone = getPhoneValidationError(formData.payer_phone, 'Payer phone') || 'Invalid phone number'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!validateForm()) return

    setIsLoading(true)
    const supabase = createClient()

    try {
      const full_name = `${formData.surname} ${formData.first_name}`.trim()

      // Update student
      const updateData: Record<string, unknown> = {
        full_name,
        surname: formData.surname,
        first_name: formData.first_name,
        gender: formData.gender || null,
        date_of_birth: formData.date_of_birth || null,
        id_number: formData.id_number || null,
        phone: formData.phone || null,
        email: formData.email || null,
        health_conditions: formData.health_conditions || null,
        grade: formData.grade || null,
        school_name: formData.school_name || null,
        parent_name: formData.parent_name || null,
        parent_phone: formData.parent_phone || null,
        parent_email: formData.parent_email || null,
        relationship: formData.relationship || null,
        payer_name: formData.payer_name || null,
        payer_id_number: formData.payer_id_number || null,
        payer_phone: formData.payer_phone || null,
        payer_relationship: formData.payer_relationship || null,
        status: formData.status,
        updated_at: new Date().toISOString(),
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateError } = await (supabase
        .from('students') as any)
        .update(updateData)
        .eq('id', studentId)

      if (updateError) {
        console.error('Update error details:', updateError)
        throw new Error(updateError.message || 'Failed to update student')
      }

      // Handle subject changes
      const coursesToAdd = selectedSubjects.filter((id) => !originalSubjects.includes(id))
      const coursesToRemove = originalSubjects.filter((id) => !selectedSubjects.includes(id))

      // Add new enrollments
      if (coursesToAdd.length > 0) {
        const newEnrollments = coursesToAdd.map((courseId) => ({
          student_id: studentId,
          course_id: courseId,
          is_active: true,
          enrolled_date: new Date().toISOString().split('T')[0],
        }))

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: insertError } = await (supabase
          .from('student_enrollments') as any)
          .insert(newEnrollments)

        if (insertError) {
          console.error('Insert enrollment error:', insertError)
          // Don't fail the whole operation for enrollment errors
        }
      }

      // Deactivate removed enrollments
      if (coursesToRemove.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: deactivateError } = await (supabase
          .from('student_enrollments') as any)
          .update({ is_active: false })
          .eq('student_id', studentId)
          .in('course_id', coursesToRemove)

        if (deactivateError) {
          console.error('Deactivate enrollment error:', deactivateError)
          // Don't fail the whole operation for enrollment errors
        }
      }

      toast.success('Student updated successfully!')
      router.push(`/dashboard/students/${studentId}`)
    } catch (error: any) {
      console.error('Error updating student:', error)
      toast.error(error.message || 'Failed to update student')
    } finally {
      setIsLoading(false)
    }
  }

  if (isFetching) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/dashboard/students/${studentId}`}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Student
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Edit Student</h1>
        <p className="text-gray-500 mt-1">Update student information</p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Student Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Student Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Surname"
              name="surname"
              value={formData.surname}
              onChange={handleChange}
              error={errors.surname}
              required
            />
            <Input
              label="First Name"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              error={errors.first_name}
              required
            />
            <Select
              label="Gender"
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              options={[
                { value: 'male', label: 'Male' },
                { value: 'female', label: 'Female' },
                { value: 'other', label: 'Other' },
              ]}
              placeholder="Select gender"
            />
            <Input
              label="Date of Birth"
              name="date_of_birth"
              type="date"
              value={formData.date_of_birth}
              onChange={handleChange}
            />
            <Input
              label="ID Number"
              name="id_number"
              value={formData.id_number}
              onChange={handleChange}
            />
            <Input
              label="Mobile Number"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
            />
            <Input
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
            />
            <Input
              label="Grade/Form"
              name="grade"
              value={formData.grade}
              onChange={handleChange}
            />
            <Input
              label="School Name"
              name="school_name"
              value={formData.school_name}
              onChange={handleChange}
            />
            <Select
              label="Status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
                { value: 'graduated', label: 'Graduated' },
                { value: 'withdrawn', label: 'Withdrawn' },
              ]}
            />
            <div className="md:col-span-2">
              <Textarea
                label="Health Conditions"
                name="health_conditions"
                value={formData.health_conditions}
                onChange={handleChange}
                rows={2}
              />
            </div>
          </div>
        </div>

        {/* Parent/Guardian */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Parent/Guardian Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Parent/Guardian Name"
              name="parent_name"
              value={formData.parent_name}
              onChange={handleChange}
            />
            <Select
              label="Relationship"
              name="relationship"
              value={formData.relationship}
              onChange={handleChange}
              options={[
                { value: 'father', label: 'Father' },
                { value: 'mother', label: 'Mother' },
                { value: 'guardian', label: 'Guardian' },
                { value: 'uncle', label: 'Uncle' },
                { value: 'aunt', label: 'Aunt' },
                { value: 'grandparent', label: 'Grandparent' },
                { value: 'sibling', label: 'Sibling' },
                { value: 'other', label: 'Other' },
              ]}
              placeholder="Select relationship"
            />
            <Input
              label="Parent Phone"
              name="parent_phone"
              value={formData.parent_phone}
              onChange={handleChange}
            />
            <Input
              label="Parent Email"
              name="parent_email"
              type="email"
              value={formData.parent_email}
              onChange={handleChange}
            />
          </div>
        </div>

        {/* Person Responsible for Payment */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Person Responsible for Payment</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              name="payer_name"
              value={formData.payer_name}
              onChange={handleChange}
            />
            <Input
              label="ID Number"
              name="payer_id_number"
              value={formData.payer_id_number}
              onChange={handleChange}
            />
            <Input
              label="Phone Number"
              name="payer_phone"
              value={formData.payer_phone}
              onChange={handleChange}
            />
            <Select
              label="Relationship"
              name="payer_relationship"
              value={formData.payer_relationship}
              onChange={handleChange}
              options={[
                { value: 'parent', label: 'Parent' },
                { value: 'guardian', label: 'Guardian' },
                { value: 'self', label: 'Self' },
                { value: 'sponsor', label: 'Sponsor' },
                { value: 'other', label: 'Other' },
              ]}
              placeholder="Select relationship"
            />
          </div>
        </div>

        {/* Subject Enrollment */}
        {subjects.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Subject Enrollment</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {subjects.map((subject) => (
                <label
                  key={subject.id}
                  className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedSubjects.includes(subject.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedSubjects.includes(subject.id)}
                    onChange={() => toggleSubject(subject.id)}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <div className="ml-3">
                    <p className="font-medium text-gray-900">{subject.name}</p>
                    <p className="text-sm text-gray-500">
                      R {subject.monthly_fee.toFixed(2)}/month
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Link href={`/dashboard/students/${studentId}`}>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            isLoading={isLoading}
            leftIcon={<Save className="w-4 h-4" />}
          >
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  )
}
