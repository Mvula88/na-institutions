'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Mail, Lock, User, Phone, Loader2, Users, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'

export default function ParentRegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    if (formData.password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }

    setIsLoading(true)

    try {
      const supabase = createClient()

      // Create Supabase Auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            portal_type: 'parent',
          },
        },
      })

      if (authError) {
        toast.error(authError.message)
        setIsLoading(false)
        return
      }

      if (!authData.user) {
        toast.error('Registration failed')
        setIsLoading(false)
        return
      }

      // Call API to create parent record
      const response = await fetch('/api/parent/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authUserId: authData.user.id,
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
        }),
      })

      const result = await response.json()

      if (!result.success) {
        toast.error(result.error || 'Failed to create parent account')
        setIsLoading(false)
        return
      }

      // Move to success step
      setStep(2)
    } catch (error) {
      console.error('Registration error:', error)
      toast.error('An error occurred during registration')
    } finally {
      setIsLoading(false)
    }
  }

  if (step === 2) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
            <div className="bg-green-600 p-6 text-white text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h1 className="text-2xl font-bold">Registration Successful!</h1>
            </div>

            <div className="p-6 space-y-4 text-center">
              <p className="text-gray-600">
                Your parent account has been created. Please check your email to verify your account.
              </p>
              <p className="text-sm text-gray-500">
                After verification, you can log in and link your children to your account.
              </p>

              <div className="pt-4">
                <Link
                  href="/portal/login?type=parent"
                  className="inline-block w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                >
                  Go to Login
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="bg-purple-600 p-6 text-white text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold">Parent Registration</h1>
            <p className="text-white/80 text-sm mt-1">Create an account to monitor your children</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <Input
              label="Full Name"
              type="text"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              placeholder="Enter your full name"
              required
            />

            <Input
              label="Email Address"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="Enter your email"
              required
            />

            <Input
              label="Phone Number"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="Enter your phone number"
            />

            <Input
              label="Password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Create a password (min 8 characters)"
              required
            />

            <Input
              label="Confirm Password"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              placeholder="Confirm your password"
              required
            />

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
              leftIcon={isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : undefined}
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </form>

          {/* Footer */}
          <div className="px-6 pb-6 space-y-3">
            <div className="text-center border-t border-gray-100 pt-4">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link href="/portal/login?type=parent" className="text-purple-600 hover:text-purple-700 font-medium">
                  Sign in here
                </Link>
              </p>
            </div>

            <div className="text-center text-xs text-gray-400">
              <p>By registering, you agree to our Terms of Service and Privacy Policy.</p>
            </div>
          </div>
        </div>

        {/* Back to main site */}
        <div className="text-center mt-6">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
            &larr; Back to main site
          </Link>
        </div>
      </div>
    </div>
  )
}
