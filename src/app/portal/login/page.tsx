'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, GraduationCap, User, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'

type PortalType = 'student' | 'teacher' | 'parent'

function PortalLoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const defaultType = (searchParams.get('type') as PortalType) || 'student'

  const [portalType, setPortalType] = useState<PortalType>(defaultType)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const portalConfig = {
    student: {
      title: 'Student Portal',
      icon: <GraduationCap className="w-8 h-8" />,
      color: 'bg-blue-600',
      redirectPath: '/student/dashboard',
    },
    teacher: {
      title: 'Teacher Portal',
      icon: <User className="w-8 h-8" />,
      color: 'bg-green-600',
      redirectPath: '/teacher/dashboard',
    },
    parent: {
      title: 'Parent Portal',
      icon: <Users className="w-8 h-8" />,
      color: 'bg-purple-600',
      redirectPath: '/parent',
    },
  }

  const config = portalConfig[portalType]

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)

    try {
      const supabase = createClient()

      // Sign in with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        toast.error(authError.message)
        setIsLoading(false)
        return
      }

      if (!authData.user) {
        toast.error('Login failed')
        setIsLoading(false)
        return
      }

      // Verify the user is the correct type and get their data
      const response = await fetch('/api/portal/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          portalType,
          authUserId: authData.user.id,
        }),
      })

      const result = await response.json()

      if (!result.success) {
        // Sign out if not the correct user type
        await supabase.auth.signOut()
        toast.error(result.error || 'You do not have access to this portal')
        setIsLoading(false)
        return
      }

      toast.success('Login successful!')

      // Redirect to appropriate portal
      if (portalType === 'parent') {
        router.push('/parent')
      } else {
        // For student/teacher, redirect to their dashboard with their ID
        router.push(`/${portalType}/dashboard`)
      }
    } catch (error) {
      console.error('Login error:', error)
      toast.error('An error occurred during login')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Portal Type Selector */}
        <div className="flex gap-2 mb-6">
          {(Object.keys(portalConfig) as PortalType[]).map((type) => (
            <button
              key={type}
              onClick={() => setPortalType(type)}
              className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all ${
                portalType === type
                  ? `${portalConfig[type].color} text-white shadow-lg`
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className={`${config.color} p-6 text-white text-center`}>
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              {config.icon}
            </div>
            <h1 className="text-2xl font-bold">{config.title}</h1>
            <p className="text-white/80 text-sm mt-1">Sign in to access your account</p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="p-6 space-y-4">
            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
              leftIcon={isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : undefined}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          {/* Footer */}
          <div className="px-6 pb-6 space-y-3">
            <div className="text-center">
              <Link
                href="/portal/forgot-password"
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Forgot your password?
              </Link>
            </div>

            {portalType === 'parent' && (
              <div className="text-center border-t border-gray-100 pt-4">
                <p className="text-sm text-gray-600">
                  Don't have an account?{' '}
                  <Link href="/portal/register" className="text-blue-600 hover:text-blue-700 font-medium">
                    Register here
                  </Link>
                </p>
              </div>
            )}

            <div className="text-center text-xs text-gray-400 border-t border-gray-100 pt-4">
              <p>Having trouble? Contact your school administrator.</p>
            </div>
          </div>
        </div>

        {/* Back to main site */}
        <div className="text-center mt-6">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
            ← Back to main site
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function PortalLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    }>
      <PortalLoginContent />
    </Suspense>
  )
}
