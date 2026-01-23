'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import {
  Users,
  Clock,
  CheckCircle,
  ChevronRight,
  Loader2,
  Plus,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import toast from 'react-hot-toast'

interface ChildData {
  student_id: string
  student_name: string
  student_number: string | null
  grade: string | null
  class_name: string | null
  center_name: string | null
  center_id: string
  relationship: string
  is_verified: boolean
  can_view_grades: boolean
  can_view_attendance: boolean
  can_view_fees: boolean
}

export default function ChildrenListPage() {
  const [children, setChildren] = useState<ChildData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    loadChildren()
  }, [])

  async function loadChildren() {
    const response = await fetch('/api/parent/link-child')
    const result = await response.json()

    if (result.success) {
      setChildren(result.children)
    }
    setIsLoading(false)
  }

  async function handleUnlink(studentId: string, studentName: string) {
    if (!confirm(`Are you sure you want to unlink ${studentName}? You'll need to re-link and wait for verification again.`)) {
      return
    }

    setDeletingId(studentId)

    try {
      const response = await fetch(`/api/parent/link-child?studentId=${studentId}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (result.success) {
        toast.success('Child unlinked successfully')
        setChildren(children.filter(c => c.student_id !== studentId))
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      toast.error('Failed to unlink child')
    } finally {
      setDeletingId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Children</h1>
          <p className="text-gray-500">{children.length} child{children.length !== 1 ? 'ren' : ''} linked to your account</p>
        </div>
        <Link href="/parent/children/link">
          <Button leftIcon={<Plus className="w-4 h-4" />}>
            Link Another Child
          </Button>
        </Link>
      </div>

      {/* No Children */}
      {children.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Children Linked</h2>
          <p className="text-gray-500 mb-6">
            Link your children to view their attendance, grades, and more.
          </p>
          <Link href="/parent/children/link">
            <Button leftIcon={<Users className="w-5 h-5" />}>
              Link a Child
            </Button>
          </Link>
        </div>
      )}

      {/* Children List */}
      <div className="space-y-4">
        {children.map((child) => (
          <div
            key={child.student_id}
            className="bg-white rounded-xl border border-gray-200 overflow-hidden"
          >
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-xl">
                    {child.student_name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">{child.student_name}</h3>
                    <p className="text-sm text-gray-500">
                      {child.student_number && `#${child.student_number} • `}
                      {child.grade || 'Grade N/A'}
                      {child.class_name && ` - ${child.class_name}`}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">{child.center_name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {child.is_verified ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full">
                      <CheckCircle className="w-4 h-4" />
                      Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-700 text-sm rounded-full">
                      <Clock className="w-4 h-4" />
                      Pending
                    </span>
                  )}
                </div>
              </div>

              {/* Permissions */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-2">Permissions:</p>
                <div className="flex flex-wrap gap-2">
                  {child.can_view_attendance && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                      View Attendance
                    </span>
                  )}
                  {child.can_view_grades && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                      View Grades
                    </span>
                  )}
                  {child.can_view_fees && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                      View Fees
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                <button
                  onClick={() => handleUnlink(child.student_id, child.student_name)}
                  disabled={deletingId === child.student_id}
                  className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
                >
                  {deletingId === child.student_id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  Unlink
                </button>

                <Link
                  href={`/parent/children/${child.student_id}`}
                  className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700 font-medium"
                >
                  View Dashboard
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
