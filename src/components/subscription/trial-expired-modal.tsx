'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { Shield, ArrowRight } from 'lucide-react'

export function TrialExpiredModal() {
  const { user, isCenterAdmin } = useAuthStore()
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  const [isExpired, setIsExpired] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Don't show modal on subscription page - let user see the plans
  const isOnSubscriptionPage = pathname === '/dashboard/subscription'

  useEffect(() => {
    async function checkTrialStatus() {
      if (!user?.institution_id || !isCenterAdmin) {
        setIsLoading(false)
        return
      }

      try {
        const { data: center } = await supabase
          .from('institutions')
          .select('subscription_status, trial_ends_at')
          .eq('id', user.institution_id)
          .single<{ subscription_status: string; trial_ends_at: string | null }>()

        if (center) {
          const isTrialing = center.subscription_status === 'trialing'
          const trialEndsAt = center.trial_ends_at ? new Date(center.trial_ends_at) : null

          if (isTrialing && trialEndsAt) {
            const now = new Date()
            const expired = trialEndsAt < now
            setIsExpired(expired)
          } else if (center.subscription_status === 'active') {
            setIsExpired(false)
          }
        }
      } catch (error) {
        console.error('Error checking trial status:', error)
      } finally {
        setIsLoading(false)
      }
    }

    checkTrialStatus()
  }, [user?.institution_id, isCenterAdmin, supabase])

  // Don't show if loading, not expired, or already on subscription page
  if (isLoading || !isExpired || isOnSubscriptionPage) return null

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-gray-900/80 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Icon */}
        <div className="pt-8 pb-4 px-6 text-center">
          <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Shield className="w-7 h-7 text-blue-600" />
          </div>

          <h2 className="text-xl font-semibold text-gray-900 tracking-tight">
            Your trial has ended
          </h2>
          <p className="text-gray-500 mt-2 text-sm leading-relaxed">
            Subscribe to continue managing your tutorial centre. Your data is safe.
          </p>
        </div>

        {/* Pricing hint */}
        <div className="px-6 pb-6">
          <div className="bg-gray-50 rounded-xl p-4 mb-5">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-gray-600">Plans from</span>
              <div>
                <span className="text-2xl font-bold text-gray-900">N$99</span>
                <span className="text-gray-500 text-sm">/mo</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => router.push('/dashboard/subscription')}
            className="w-full py-3 px-4 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 group"
          >
            View Plans
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>

          <p className="text-center text-xs text-gray-400 mt-4">
            Questions? <a href="mailto:support@institux.com" className="text-gray-500 hover:text-gray-700">Contact support</a>
          </p>
        </div>
      </div>
    </div>
  )
}
