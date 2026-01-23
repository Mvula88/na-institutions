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

interface Subject {
  id: string
  name: string
  code: string | null
}

export default function NewTeacherPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])

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
      fetchSubjects()
    }
  }, [user?.institution_id])

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
    if (!user?.institution_id) {
      toast.error('No center selected')
      return
    }

    setIsLoading(true)
    const supabase = createClient()

    try {
      // Create teacher
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

      const { data: teacher, error: teacherError } = await supabase
        .from('lecturers')
        .insert(insertData as never)
        .select('id')
        .single()

      if (teacherError) throw teacherError

      // Assign subjects
      const typedTeacher = teacher as { id: string } | null
      if (selectedSubjects.length > 0 && typedTeacher) {
        const teacherSubjects = selectedSubjects.map((subjectId) => ({
          teacher_id: typedTeacher.id,
          subject_id: subjectId,
        }))

        const { error: subjectError } = await supabase
          .from('teacher_subjects')
          .insert(teacherSubjects as never)

        if (subjectError) {
          console.error('Error assigning subjects:', subjectError)
        }
      }

      toast.success('Teacher added successfully!')
      router.push('/dashboard/teachers')
    } catch (error) {
      console.error('Error creating teacher:', error)
      toast.error('Failed to create teacher')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard/teachers"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Teachers
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Add New Teacher</h1>
        <p className="text-gray-500 mt-1">Enter teacher details and assign subjects</p>
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
          <Link href="/dashboard/teachers">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            isLoading={isLoading}
            leftIcon={<Save className="w-4 h-4" />}
          >
            Save Teacher
          </Button>
        </div>
      </form>
    </div>
  )
}
