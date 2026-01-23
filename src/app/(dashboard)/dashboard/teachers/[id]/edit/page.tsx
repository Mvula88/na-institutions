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

interface Subject {
  id: string
  name: string
  code: string | null
}

interface TeacherData {
  full_name: string
  email: string | null
  phone: string | null
  gender: string | null
  qualification: string | null
  specialization: string | null
  status: string
  date_joined: string | null
  address: string | null
}

export default function EditTeacherPage() {
  const params = useParams()
  const teacherId = params.id as string
  const router = useRouter()
  const { user } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])
  const [originalSubjects, setOriginalSubjects] = useState<string[]>([])

  // Form state
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    gender: '',
    qualification: '',
    specialization: '',
    date_joined: '',
    status: 'active',
    address: '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (teacherId && user?.institution_id) {
      fetchTeacher()
      fetchSubjects()
    }
  }, [teacherId, user?.institution_id])

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

      const teacher = data as TeacherData

      setFormData({
        full_name: teacher.full_name || '',
        email: teacher.email || '',
        phone: teacher.phone || '',
        gender: teacher.gender || '',
        qualification: teacher.qualification || '',
        specialization: teacher.specialization || '',
        date_joined: teacher.date_joined || '',
        status: teacher.status || 'active',
        address: teacher.address || '',
      })

      // Fetch assigned courses
      const { data: lecturerCourses } = await supabase
        .from('lecturer_courses')
        .select('course_id')
        .eq('lecturer_id', teacherId)

      if (lecturerCourses) {
        const courseIds = (lecturerCourses as { course_id: string }[]).map((lc) => lc.course_id)
        setSelectedSubjects(courseIds)
        setOriginalSubjects(courseIds)
      }
    } catch (error) {
      console.error('Error fetching teacher:', error)
      toast.error('Failed to load teacher')
      router.push('/dashboard/teachers')
    } finally {
      setIsFetching(false)
    }
  }

  async function fetchSubjects() {
    if (!user?.institution_id) return

    const supabase = createClient()
    const { data } = await supabase
      .from('courses')
      .select('id, name, code')
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

    if (!formData.full_name.trim()) newErrors.full_name = 'Full name is required'
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format'
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
      // Update teacher
      const updateData = {
        full_name: formData.full_name.trim(),
        email: formData.email || null,
        phone: formData.phone || null,
        gender: formData.gender || null,
        qualification: formData.qualification || null,
        specialization: formData.specialization || null,
        date_joined: formData.date_joined || null,
        status: formData.status,
        address: formData.address || null,
      }

      const { error: updateError } = await supabase
        .from('lecturers')
        .update(updateData as never)
        .eq('id', teacherId)

      if (updateError) throw updateError

      // Handle subject changes
      const coursesToAdd = selectedSubjects.filter((id) => !originalSubjects.includes(id))
      const coursesToRemove = originalSubjects.filter((id) => !selectedSubjects.includes(id))

      // Add new course assignments
      if (coursesToAdd.length > 0) {
        const newAssignments = coursesToAdd.map((courseId) => ({
          lecturer_id: teacherId,
          course_id: courseId,
        }))

        await supabase.from('lecturer_courses').insert(newAssignments as never)
      }

      // Remove old course assignments
      if (coursesToRemove.length > 0) {
        await supabase
          .from('lecturer_courses')
          .delete()
          .eq('lecturer_id', teacherId)
          .in('course_id', coursesToRemove)
      }

      toast.success('Teacher updated successfully!')
      router.push(`/dashboard/teachers/${teacherId}`)
    } catch (error) {
      console.error('Error updating teacher:', error)
      toast.error('Failed to update teacher')
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
    <div className="p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/dashboard/teachers/${teacherId}`}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Teacher
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Edit Teacher</h1>
        <p className="text-gray-500 mt-1">Update teacher information</p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Personal Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Input
                label="Full Name"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                error={errors.full_name}
                required
              />
            </div>
            <Input
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
            />
            <Input
              label="Phone Number"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
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
              label="Date Joined"
              name="date_joined"
              type="date"
              value={formData.date_joined}
              onChange={handleChange}
            />
          </div>
        </div>

        {/* Professional Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Professional Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Qualification"
              name="qualification"
              value={formData.qualification}
              onChange={handleChange}
              placeholder="e.g., B.Ed, M.Sc, PhD"
            />
            <Input
              label="Specialization"
              name="specialization"
              value={formData.specialization}
              onChange={handleChange}
              placeholder="e.g., Mathematics, Science"
            />
            <Select
              label="Status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
                { value: 'terminated', label: 'Terminated' },
              ]}
            />
            <div className="md:col-span-2">
              <Textarea
                label="Address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                rows={3}
                placeholder="Teacher's address..."
              />
            </div>
          </div>
        </div>

        {/* Subject Assignment */}
        {subjects.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Subject Assignment</h2>
            <p className="text-sm text-gray-500 mb-4">
              Select the subjects this teacher will be teaching
            </p>
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
                    {subject.code && (
                      <p className="text-sm text-gray-500">{subject.code}</p>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Link href={`/dashboard/teachers/${teacherId}`}>
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
