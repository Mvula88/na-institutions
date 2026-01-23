'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import {
  Users,
  ClipboardCheck,
  Award,
  CreditCard,
  BookOpen,
  CalendarDays,
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,
  ChevronRight,
} from 'lucide-react'

interface ChildSummary {
  student_id: string
  student_name: string
  student_number: string | null
  grade: string | null
  class_name: string | null
  center_name: string | null
  relationship: string
  is_verified: boolean
  // Stats
  attendance_rate: number
  pending_fees: number
  upcoming_exams: number
  pending_homework: number
  latest_grade: string | null
}

export default function ParentDashboard() {
  const [children, setChildren] = useState<ChildSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [parentId, setParentId] = useState<string | null>(null)

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    const supabase = createClient()

    // Get current user's parent ID
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: parentData } = await supabase
      .from('parents')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    const parent = parentData as { id: string } | null
    if (!parent) return
    setParentId(parent.id)

    // Get linked children
    const { data: linkedChildrenData } = await supabase
      .rpc('get_parent_children' as never, { p_parent_id: parent.id } as never)

    type LinkedChild = { student_id: string; student_name: string; student_number: string | null; grade: string | null; class_name: string | null; center_name: string | null; relationship: string; is_verified: boolean }
    const linkedChildren = linkedChildrenData as unknown as LinkedChild[] | null

    if (!linkedChildren || linkedChildren.length === 0) {
      setChildren([])
      setIsLoading(false)
      return
    }

    // For each child, get additional stats
    const childrenWithStats: ChildSummary[] = await Promise.all(
      linkedChildren.map(async (child) => {
        // Get attendance rate for last 30 days
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        const { count: totalClasses } = await supabase
          .from('attendance')
          .select('*', { count: 'exact', head: true })
          .eq('student_id', child.student_id)
          .gte('date', thirtyDaysAgo.toISOString().split('T')[0])

        const { count: presentClasses } = await supabase
          .from('attendance')
          .select('*', { count: 'exact', head: true })
          .eq('student_id', child.student_id)
          .eq('status', 'present')
          .gte('date', thirtyDaysAgo.toISOString().split('T')[0])

        const attendanceRate = totalClasses && totalClasses > 0
          ? Math.round((presentClasses || 0) / totalClasses * 100)
          : 100

        // Get pending fees
        const { data: feesData } = await supabase
          .from('fee_transactions')
          .select('amount, status')
          .eq('student_id', child.student_id)
          .in('status', ['pending', 'partial'])

        const fees = feesData as { amount: number; status: string }[] | null
        const pendingFees = fees?.reduce((sum, f) => sum + Number(f.amount), 0) || 0

        // Get upcoming exams count (if table exists)
        let upcomingExams = 0
        try {
          const { count } = await supabase
            .from('exams')
            .select('*', { count: 'exact', head: true })
            .eq('class_id', child.student_id) // This should be class_id in reality
            .gte('exam_date', new Date().toISOString().split('T')[0])
            .eq('status', 'scheduled')
          upcomingExams = count || 0
        } catch {
          // Table might not exist yet
        }

        // Get pending homework count (if table exists)
        let pendingHomework = 0
        try {
          const { count } = await supabase
            .from('student_assignments')
            .select('*', { count: 'exact', head: true })
            .eq('student_id', child.student_id)
            .eq('status', 'pending')
          pendingHomework = count || 0
        } catch {
          // Table might not exist yet
        }

        return {
          ...child,
          attendance_rate: attendanceRate,
          pending_fees: pendingFees,
          upcoming_exams: upcomingExams,
          pending_homework: pendingHomework,
          latest_grade: null, // Could fetch from grades table
        }
      })
    )

    setChildren(childrenWithStats)
    setIsLoading(false)
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
          <h1 className="text-2xl font-bold text-gray-900">Parent Dashboard</h1>
          <p className="text-gray-500">Overview of your children's progress</p>
        </div>
        <Link
          href="/parent/children/link"
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          Link Another Child
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
          <Link
            href="/parent/children/link"
            className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Users className="w-5 h-5" />
            Link a Child
          </Link>
        </div>
      )}

      {/* Children Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {children.map((child) => (
          <div
            key={child.student_id}
            className="bg-white rounded-xl border border-gray-200 overflow-hidden"
          >
            {/* Child Header */}
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-lg">
                    {child.student_name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{child.student_name}</h3>
                    <p className="text-sm text-gray-500">
                      {child.grade || 'Grade N/A'} {child.class_name && `- ${child.class_name}`}
                    </p>
                    <p className="text-xs text-gray-400">{child.center_name}</p>
                  </div>
                </div>
                {!child.is_verified && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                    <Clock className="w-3 h-3" />
                    Pending Verification
                  </span>
                )}
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 divide-x divide-y divide-gray-100">
              <Link
                href={`/parent/children/${child.student_id}/attendance`}
                className="p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2 text-gray-500 mb-1">
                  <ClipboardCheck className="w-4 h-4" />
                  <span className="text-xs">Attendance</span>
                </div>
                <p className={`text-xl font-bold ${
                  child.attendance_rate >= 80 ? 'text-green-600' :
                  child.attendance_rate >= 60 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {child.attendance_rate}%
                </p>
              </Link>

              <Link
                href={`/parent/children/${child.student_id}/fees`}
                className="p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2 text-gray-500 mb-1">
                  <CreditCard className="w-4 h-4" />
                  <span className="text-xs">Pending Fees</span>
                </div>
                <p className={`text-xl font-bold ${
                  child.pending_fees > 0 ? 'text-red-600' : 'text-green-600'
                }`}>
                  N${child.pending_fees.toLocaleString()}
                </p>
              </Link>

              <Link
                href={`/parent/children/${child.student_id}/homework`}
                className="p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2 text-gray-500 mb-1">
                  <BookOpen className="w-4 h-4" />
                  <span className="text-xs">Pending Tasks</span>
                </div>
                <p className={`text-xl font-bold ${
                  child.pending_homework > 0 ? 'text-orange-600' : 'text-green-600'
                }`}>
                  {child.pending_homework}
                </p>
              </Link>

              <Link
                href={`/parent/children/${child.student_id}/exams`}
                className="p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2 text-gray-500 mb-1">
                  <CalendarDays className="w-4 h-4" />
                  <span className="text-xs">Upcoming Exams</span>
                </div>
                <p className="text-xl font-bold text-blue-600">
                  {child.upcoming_exams}
                </p>
              </Link>
            </div>

            {/* Quick Actions */}
            <div className="p-4 bg-gray-50 border-t border-gray-100">
              <Link
                href={`/parent/children/${child.student_id}`}
                className="flex items-center justify-between text-sm text-purple-600 hover:text-purple-700 font-medium"
              >
                View Full Dashboard
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Links */}
      {children.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/parent/children"
            className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 hover:border-purple-300 transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">All Children</p>
              <p className="text-xs text-gray-500">View all linked children</p>
            </div>
          </Link>

          <Link
            href="/parent/notifications"
            className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 hover:border-purple-300 transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Notifications</p>
              <p className="text-xs text-gray-500">View all alerts</p>
            </div>
          </Link>

          <Link
            href="/parent/settings"
            className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 hover:border-purple-300 transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
              <Award className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Settings</p>
              <p className="text-xs text-gray-500">Notification preferences</p>
            </div>
          </Link>

          <Link
            href="/parent/children/link"
            className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 hover:border-purple-300 transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Link Child</p>
              <p className="text-xs text-gray-500">Add another child</p>
            </div>
          </Link>
        </div>
      )}
    </div>
  )
}
