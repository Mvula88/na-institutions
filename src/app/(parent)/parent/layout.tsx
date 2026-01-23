'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import {
  Home,
  Users,
  Settings,
  LogOut,
  Bell,
  Loader2,
} from 'lucide-react'

interface ParentData {
  id: string
  full_name: string
  email: string
  phone: string | null
  notification_attendance: string
  notification_grades: boolean
  notification_fees: boolean
  notification_sms: boolean
  notification_email: boolean
  is_active: boolean
}

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

export default function ParentPortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [parent, setParent] = useState<ParentData | null>(null)
  const [linkedChildren, setLinkedChildren] = useState<ChildData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    setIsLoading(true)
    const supabase = createClient()

    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/portal/login?type=parent')
      return
    }

    // Get parent data
    const { data: parentData, error: parentError } = await supabase
      .from('parents')
      .select('*')
      .eq('auth_user_id', user.id)
      .single()

    if (parentError || !parentData) {
      setError('No parent account found. Please register first.')
      setIsLoading(false)
      return
    }

    const parent = parentData as unknown as ParentData
    if (!parent.is_active) {
      setError('Your account has been deactivated. Please contact support.')
      setIsLoading(false)
      return
    }

    setParent(parent)

    // Get linked children using the function
    const { data: childrenData, error: childrenError } = await supabase
      .rpc('get_parent_children' as never, { p_parent_id: parent.id } as never)

    if (!childrenError && childrenData) {
      setLinkedChildren(childrenData as ChildData[])
    }

    setIsLoading(false)
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/portal/login?type=parent')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    )
  }

  if (error || !parent) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-lg text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <LogOut className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-500 mb-4">{error || 'Unable to access parent portal.'}</p>
          <Link
            href="/portal/login?type=parent"
            className="inline-block px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Go to Login
          </Link>
        </div>
      </div>
    )
  }

  const navItems = [
    { label: 'Dashboard', href: '/parent', icon: <Home className="w-5 h-5" /> },
    { label: 'My Children', href: '/parent/children', icon: <Users className="w-5 h-5" /> },
    { label: 'Notifications', href: '/parent/notifications', icon: <Bell className="w-5 h-5" /> },
    { label: 'Settings', href: '/parent/settings', icon: <Settings className="w-5 h-5" /> },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-600 flex items-center justify-center text-white font-bold">
                P
              </div>
              <div>
                <h1 className="font-semibold text-gray-900">Parent Portal</h1>
                <p className="text-sm text-gray-500">{linkedChildren.length} child{linkedChildren.length !== 1 ? 'ren' : ''} linked</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="font-medium text-gray-900">{parent.full_name}</p>
                <p className="text-sm text-gray-500">{parent.email}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold">
                {parent.full_name.charAt(0)}
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto pb-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/parent' && pathname.startsWith(item.href))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-purple-50 text-purple-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </Link>
              )
            })}
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center text-sm text-gray-500">
          <p>Parent Portal - SA Tutorial Centers</p>
        </div>
      </footer>
    </div>
  )
}
