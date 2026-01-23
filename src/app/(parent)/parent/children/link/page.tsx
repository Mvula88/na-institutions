'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Hash, Mail, Loader2, Users, CheckCircle, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'

type SearchMethod = 'number' | 'email'

export default function LinkChildPage() {
  const router = useRouter()
  const [searchMethod, setSearchMethod] = useState<SearchMethod>('number')
  const [studentNumber, setStudentNumber] = useState('')
  const [studentEmail, setStudentEmail] = useState('')
  const [relationship, setRelationship] = useState('parent')
  const [isLoading, setIsLoading] = useState(false)
  const [linkedStudent, setLinkedStudent] = useState<{ name: string; studentNumber: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch('/api/parent/link-child', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentNumber: searchMethod === 'number' ? studentNumber : undefined,
          studentEmail: searchMethod === 'email' ? studentEmail : undefined,
          relationship,
        }),
      })

      const result = await response.json()

      if (!result.success) {
        toast.error(result.error)
        setIsLoading(false)
        return
      }

      toast.success('Child linked successfully!')
      setLinkedStudent({
        name: result.student.name,
        studentNumber: result.student.studentNumber,
      })
    } catch (error) {
      console.error('Link error:', error)
      toast.error('An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  if (linkedStudent) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-green-600 p-6 text-white text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold">Child Linked!</h1>
          </div>

          <div className="p-6 space-y-4 text-center">
            <div className="py-4">
              <p className="text-lg font-medium text-gray-900">{linkedStudent.name}</p>
              <p className="text-sm text-gray-500">Student #: {linkedStudent.studentNumber}</p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-left">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-800">Pending Verification</p>
                  <p className="text-sm text-yellow-700 mt-1">
                    The school administrator will verify your relationship with this student.
                    You'll receive full access once verified.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setLinkedStudent(null)
                  setStudentNumber('')
                  setStudentEmail('')
                }}
              >
                Link Another Child
              </Button>
              <Link href="/parent" className="flex-1">
                <Button className="w-full">
                  Go to Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Link a Child</h1>
        <p className="text-gray-500">Connect your child's account to view their progress</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Search Method Toggle */}
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <p className="text-sm text-gray-600 mb-3">Search by:</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSearchMethod('number')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                searchMethod === 'number'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              Student Number
            </button>
            <button
              type="button"
              onClick={() => setSearchMethod('email')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                searchMethod === 'email'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              Email Address
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {searchMethod === 'number' ? (
            <Input
              label="Student Number"
              type="text"
              value={studentNumber}
              onChange={(e) => setStudentNumber(e.target.value)}
              placeholder="e.g., STU-2024-001"
              required
            />
          ) : (
            <Input
              label="Student Email"
              type="email"
              value={studentEmail}
              onChange={(e) => setStudentEmail(e.target.value)}
              placeholder="student@email.com"
              required
            />
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Relationship
            </label>
            <select
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="parent">Parent</option>
              <option value="guardian">Guardian</option>
              <option value="relative">Relative</option>
              <option value="other">Other</option>
            </select>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
            leftIcon={isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Users className="w-5 h-5" />}
          >
            {isLoading ? 'Linking...' : 'Link Child'}
          </Button>
        </form>

        {/* Info */}
        <div className="px-6 pb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-700">
              <strong>Note:</strong> You can find the student number on your child's school ID card
              or enrollment documents. Contact the school if you need assistance.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
