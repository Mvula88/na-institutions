'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { GraduationCap, Eye, EyeOff, Loader2, Check, Building2, User, Mail, Phone, Lock, Gift, X, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'

const TRIAL_FEATURES = [
  '14-day free trial',
  'Student & lecturer management',
  'Fee tracking & payments',
  'Course & program management',
  'No credit card required',
]

function SignupContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Referral state
  const [referralCode, setReferralCode] = useState('')
  const [referralValid, setReferralValid] = useState<boolean | null>(null)
  const [referralInfo, setReferralInfo] = useState<{ referrerName: string; discount: string } | null>(null)
  const [isValidatingReferral, setIsValidatingReferral] = useState(false)

  const [formData, setFormData] = useState({
    // Institution details
    institutionName: '',
    institutionPhone: '',
    institutionCity: '',
    // Admin details
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  })

  // Check for referral code in URL on mount
  useEffect(() => {
    const refCode = searchParams.get('ref')
    if (refCode) {
      setReferralCode(refCode.toUpperCase())
      validateReferralCode(refCode)
    }
  }, [searchParams])

  async function validateReferralCode(code: string) {
    if (!code || code.length < 4) {
      setReferralValid(null)
      setReferralInfo(null)
      return
    }

    setIsValidatingReferral(true)
    try {
      const response = await fetch('/api/referrals/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.toUpperCase() }),
      })
      const data = await response.json()

      if (data.valid) {
        setReferralValid(true)
        setReferralInfo({
          referrerName: data.referrerName,
          discount: data.discount,
        })
      } else {
        setReferralValid(false)
        setReferralInfo(null)
      }
    } catch (error) {
      console.error('Error validating referral:', error)
      setReferralValid(false)
      setReferralInfo(null)
    } finally {
      setIsValidatingReferral(false)
    }
  }

  const [errors, setErrors] = useState<Record<string, string>>({})

  function validateStep1() {
    const newErrors: Record<string, string> = {}

    if (!formData.institutionName.trim()) {
      newErrors.institutionName = 'Institution name is required'
    }
    if (!formData.institutionCity.trim()) {
      newErrors.institutionCity = 'City is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function validateStep2() {
    const newErrors: Record<string, string> = {}

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required'
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format'
    }
    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }
    // Validate Namibian phone number if provided
    if (formData.phone && !/^(\+?264|0)[0-9]{8,9}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Invalid Namibian phone number'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function handleNext() {
    if (step === 1 && validateStep1()) {
      setStep(2)
    }
  }

  function handleBack() {
    setStep(1)
    setErrors({})
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!validateStep2()) return

    setIsLoading(true)

    try {
      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          institutionName: formData.institutionName,
          institutionPhone: formData.institutionPhone,
          institutionCity: formData.institutionCity,
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
          referralCode: referralValid ? referralCode : undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create account')
      }

      toast.success('Account created successfully! You can now sign in.')
      router.push('/login?registered=true')
    } catch (error) {
      console.error('Signup error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create account')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Modern Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <Image
              src="/institux-logo.png"
              alt="InstituX Logo"
              width={176}
              height={44}
              className="h-11 w-auto"
              priority
            />
          </Link>
          <div className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-600 font-medium hover:text-blue-700">
              Sign in
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4 py-12">
        <div className="w-full max-w-2xl">
          {/* Progress Steps - Modern Design */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              step === 1
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                : 'bg-white text-gray-600 border border-gray-200'
            }`}>
              <Building2 className="w-4 h-4" />
              <span className="hidden sm:inline">Institution Info</span>
            </div>
            <div className="w-12 h-px bg-gray-300" />
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              step === 2
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                : 'bg-white text-gray-600 border border-gray-200'
            }`}>
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Admin Account</span>
            </div>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            {/* Signup Form */}
            <form onSubmit={handleSubmit}>
              {/* Step 1: Center Details */}
              {step === 1 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Let's get started</h2>
                    <p className="text-gray-600">Tell us about your institution</p>
                  </div>

                  {/* Referral Code Banner */}
                  {referralValid && referralInfo && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-3">
                      <Gift className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-green-800">
                          Referral code applied!
                        </p>
                        <p className="text-xs text-green-700 mt-0.5">
                          Referred by {referralInfo.referrerName} - {referralInfo.discount}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setReferralCode('')
                          setReferralValid(null)
                          setReferralInfo(null)
                        }}
                        className="text-green-600 hover:text-green-800"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Referral Code Input (only show if not already valid) */}
                  {!referralValid && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Referral Code (optional)
                      </label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Gift className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input
                            type="text"
                            value={referralCode}
                            onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                            onBlur={() => referralCode && validateReferralCode(referralCode)}
                            className={`w-full pl-10 pr-4 py-3 rounded-lg border ${
                              referralValid === false ? 'border-red-300' : 'border-gray-300'
                            } focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none uppercase`}
                            placeholder="Enter referral code"
                            maxLength={12}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => validateReferralCode(referralCode)}
                          disabled={isValidatingReferral || !referralCode}
                          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {isValidatingReferral ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            'Apply'
                          )}
                        </button>
                      </div>
                      {referralValid === false && (
                        <p className="text-red-500 text-sm mt-1">Invalid referral code</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        Have a referral code? Enter it to get 30 days free trial!
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Institution Name *
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        name="institutionName"
                        autoComplete="organization"
                        value={formData.institutionName}
                        onChange={(e) => setFormData({ ...formData, institutionName: e.target.value })}
                        className={`w-full pl-10 pr-4 py-3 rounded-lg border ${
                          errors.institutionName ? 'border-red-500' : 'border-gray-300'
                        } focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none`}
                        placeholder="e.g., Namibia Institute of Technology"
                      />
                    </div>
                    {errors.institutionName && (
                      <p className="text-red-500 text-sm mt-1">{errors.institutionName}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Institution Phone (optional)
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="tel"
                        name="institutionPhone"
                        autoComplete="tel"
                        value={formData.institutionPhone}
                        onChange={(e) => setFormData({ ...formData, institutionPhone: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                        placeholder="e.g., +264 61 123 4567"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City *
                    </label>
                    <input
                      type="text"
                      name="institutionCity"
                      autoComplete="address-level2"
                      value={formData.institutionCity}
                      onChange={(e) => setFormData({ ...formData, institutionCity: e.target.value })}
                      className={`w-full px-4 py-3 rounded-lg border ${
                        errors.institutionCity ? 'border-red-500' : 'border-gray-300'
                      } focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none`}
                      placeholder="e.g., Windhoek"
                    />
                    {errors.institutionCity && (
                      <p className="text-red-500 text-sm mt-1">{errors.institutionCity}</p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleNext}
                    className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-blue-200 hover:shadow-xl hover:shadow-blue-300"
                  >
                    Continue
                  </button>

                  {/* Trust Badge */}
                  <div className="flex items-center justify-center gap-6 pt-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Check className="w-4 h-4 text-green-500" />
                      <span>14-day free trial</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Check className="w-4 h-4 text-green-500" />
                      <span>No credit card required</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Admin Account */}
              {step === 2 && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">Create your account</h2>
                      <p className="text-gray-600">This will be your admin login</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleBack}
                      className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 font-medium"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        name="fullName"
                        autoComplete="name"
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        className={`w-full pl-10 pr-4 py-3 rounded-lg border ${
                          errors.fullName ? 'border-red-500' : 'border-gray-300'
                        } focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none`}
                        placeholder="Your full name"
                      />
                    </div>
                    {errors.fullName && (
                      <p className="text-red-500 text-sm mt-1">{errors.fullName}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address *
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="email"
                        name="email"
                        autoComplete="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className={`w-full pl-10 pr-4 py-3 rounded-lg border ${
                          errors.email ? 'border-red-500' : 'border-gray-300'
                        } focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none`}
                        placeholder="you@example.com"
                      />
                    </div>
                    {errors.email && (
                      <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number (optional)
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="tel"
                        name="phone"
                        autoComplete="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className={`w-full pl-10 pr-4 py-3 rounded-lg border ${
                          errors.phone ? 'border-red-500' : 'border-gray-300'
                        } focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none`}
                        placeholder="e.g., 082 123 4567"
                      />
                    </div>
                    {errors.phone && (
                      <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password *
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        autoComplete="new-password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className={`w-full pl-10 pr-12 py-3 rounded-lg border ${
                          errors.password ? 'border-red-500' : 'border-gray-300'
                        } focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none`}
                        placeholder="Minimum 6 characters"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-red-500 text-sm mt-1">{errors.password}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Confirm Password *
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="password"
                        name="confirmPassword"
                        autoComplete="new-password"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        className={`w-full pl-10 pr-4 py-3 rounded-lg border ${
                          errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                        } focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none`}
                        placeholder="Confirm your password"
                      />
                    </div>
                    {errors.confirmPassword && (
                      <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-200 hover:shadow-xl hover:shadow-blue-300 flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      'Start Free Trial'
                    )}
                  </button>

                  {/* Features List */}
                  <div className="pt-6 border-t border-gray-200">
                    <p className="text-sm font-medium text-gray-900 mb-3">What you'll get:</p>
                    <ul className="space-y-2">
                      {TRIAL_FEATURES.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm text-gray-600">
                          <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-600">
            &copy; {new Date().getFullYear()} InstituX. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}

// Loading fallback for Suspense
function SignupLoading() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="h-10 w-40 bg-gray-200 rounded animate-pulse" />
          <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
        </div>
      </header>
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="flex items-center gap-2 text-gray-600">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={<SignupLoading />}>
      <SignupContent />
    </Suspense>
  )
}
