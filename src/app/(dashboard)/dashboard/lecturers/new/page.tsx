'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Input, Select, Textarea } from '@/components/ui/input'
import { ArrowLeft, Save } from 'lucide-react'
import toast from 'react-hot-toast'

interface Course {
  id: string
  name: string
  code: string | null
  course_code: string | null
}

export default function NewLecturerPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourses, setSelectedCourses] = useState<string[]>([])

  // Form state
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    gender: '',
    qualification: '',
    specialization: '',
    date_joined: new Date().toISOString().split('T')[0],
    status: 'active',
    address: '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (user?.institution_id) {
      fetchCourses()
    }
  }, [user?.institution_id])

  async function fetchCourses() {
    if (!user?.institution_id) return

    const supabase = createClient()
    const { data } = await supabase
      .from('courses')
      .select('id, name, code, course_code')
      .eq('institution_id', user.institution_id)
      .eq('is_active', true)
      .order('name')

    setCourses((data || []) as Course[])
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  function toggleCourse(courseId: string) {
    setSelectedCourses((prev) =>
      prev.includes(courseId)
        ? prev.filter((id) => id !== courseId)
        : [...prev, courseId]
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
    if (!user?.institution_id) {
      toast.error('No institution selected')
      return
    }

    setIsLoading(true)
    const supabase = createClient()

    try {
      // Create lecturer
      const insertData = {
        institution_id: user.institution_id,
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

      const { data: lecturer, error: lecturerError } = await supabase
        .from('lecturers')
        .insert(insertData as never)
        .select('id')
        .single()

      if (lecturerError) throw lecturerError

      // Assign courses
      const typedLecturer = lecturer as { id: string } | null
      if (selectedCourses.length > 0 && typedLecturer) {
        const lecturerCourses = selectedCourses.map((courseId) => ({
          lecturer_id: typedLecturer.id,
          course_id: courseId,
        }))

        const { error: courseError } = await supabase
          .from('lecturer_courses')
          .insert(lecturerCourses as never)

        if (courseError) {
          console.error('Error assigning courses:', courseError)
        }
      }

      toast.success('Lecturer added successfully!')
      router.push('/dashboard/lecturers')
    } catch (error) {
      console.error('Error creating lecturer:', error)
      toast.error('Failed to create lecturer')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard/lecturers"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Lecturers
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Add New Lecturer</h1>
        <p className="text-gray-500 mt-1">Enter lecturer details and assign courses</p>
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
              placeholder="e.g., Engineering, Nursing, IT"
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
                placeholder="Lecturer's address..."
              />
            </div>
          </div>
        </div>

        {/* Course Assignment */}
        {courses.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Course Assignment</h2>
            <p className="text-sm text-gray-500 mb-4">
              Select the courses this lecturer will be teaching
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {courses.map((course) => (
                <label
                  key={course.id}
                  className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedCourses.includes(course.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedCourses.includes(course.id)}
                    onChange={() => toggleCourse(course.id)}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <div className="ml-3">
                    <p className="font-medium text-gray-900">{course.name}</p>
                    {(course.course_code || course.code) && (
                      <p className="text-sm text-gray-500">{course.course_code || course.code}</p>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Link href="/dashboard/lecturers">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            isLoading={isLoading}
            leftIcon={<Save className="w-4 h-4" />}
          >
            Save Lecturer
          </Button>
        </div>
      </form>
    </div>
  )
}
