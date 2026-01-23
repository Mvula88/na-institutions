'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Sparkles,
  Check,
  Crown,
  Zap,
  ExternalLink,
  Loader2,
  AlertCircle,
  Calendar,
  RefreshCw,
  User,
  Users,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { PLAN_LIMITS, SubscriptionTier } from '@/lib/subscription-limits'
import { SUBSCRIPTION_PLANS, formatNAD } from '@/lib/pricing'

interface SubscriptionData {
  subscription_status: string
  subscription_tier: string
  current_period_end: string | null
  cancel_at_period_end: boolean
  trial_ends_at: string | null
  stripe_customer_id: string | null
}

const planIcons = {
  micro: User,
  starter: Zap,
  standard: Sparkles,
  premium: Crown,
}

const plans = [
  {
    id: 'micro',
    name: SUBSCRIPTION_PLANS.micro.name,
    price: SUBSCRIPTION_PLANS.micro.monthlyPrice,
    annualPrice: SUBSCRIPTION_PLANS.micro.annualPrice,
    description: SUBSCRIPTION_PLANS.micro.description,
    features: [
      `Up to ${SUBSCRIPTION_PLANS.micro.maxStudents} students`,
      'Solo operator (no staff)',
      'Student management',
      'Attendance & grades',
      'Fee tracking & payments',
      'Timetable management',
      'Email support',
    ],
    icon: planIcons.micro,
  },
  {
    id: 'starter',
    name: SUBSCRIPTION_PLANS.starter.name,
    price: SUBSCRIPTION_PLANS.starter.monthlyPrice,
    annualPrice: SUBSCRIPTION_PLANS.starter.annualPrice,
    description: SUBSCRIPTION_PLANS.starter.description,
    features: [
      `Up to ${SUBSCRIPTION_PLANS.starter.maxStudents} students`,
      `Up to ${SUBSCRIPTION_PLANS.starter.maxStaff} staff members`,
      'Everything in Micro',
      'Staff accounts',
      'Course management',
      'Basic reports',
      'Email support',
    ],
    icon: planIcons.starter,
  },
  {
    id: 'standard',
    name: SUBSCRIPTION_PLANS.standard.name,
    price: SUBSCRIPTION_PLANS.standard.monthlyPrice,
    annualPrice: SUBSCRIPTION_PLANS.standard.annualPrice,
    description: SUBSCRIPTION_PLANS.standard.description,
    features: [
      `Up to ${SUBSCRIPTION_PLANS.standard.maxStudents} students`,
      `Up to ${SUBSCRIPTION_PLANS.standard.maxStaff} staff members`,
      'Everything in Starter',
      'Academic transcripts',
      'Student & lecturer portals',
      'Library module',
      'SMS notifications',
      'Priority support',
    ],
    icon: planIcons.standard,
    popular: true,
  },
  {
    id: 'premium',
    name: SUBSCRIPTION_PLANS.premium.name,
    price: SUBSCRIPTION_PLANS.premium.monthlyPrice,
    annualPrice: SUBSCRIPTION_PLANS.premium.annualPrice,
    description: SUBSCRIPTION_PLANS.premium.description,
    features: [
      'Unlimited students',
      'Unlimited staff',
      'Everything in Standard',
      'Hostel management',
      'Transport tracking',
      'Multi-year tracking',
      'Custom branding',
      'Dedicated support',
    ],
    icon: planIcons.premium,
  },
]

export default function SubscriptionPage() {
  const { user, fetchUser } = useAuthStore()
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [upgradeLoading, setUpgradeLoading] = useState<string | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)
  const [syncLoading, setSyncLoading] = useState(false)
  const [staffCount, setStaffCount] = useState(0)

  useEffect(() => {
    if (user?.institution_id) {
      fetchSubscription()
      fetchStaffCount()
    }
  }, [user?.institution_id])

  async function fetchStaffCount() {
    if (!user?.institution_id) return

    const supabase = createClient()
    const { count } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('institution_id', user.institution_id)
      .eq('role', 'center_staff')
      .eq('is_active', true)

    setStaffCount(count || 0)
  }

  async function fetchSubscription() {
    if (!user?.institution_id) return

    const supabase = createClient()
    const { data, error } = await supabase
      .from('institutions')
      .select('subscription_status, subscription_tier, current_period_end, cancel_at_period_end, trial_ends_at, stripe_customer_id')
      .eq('id', user.institution_id)
      .single()

    if (!error && data) {
      setSubscription(data as SubscriptionData)
    }
    setIsLoading(false)
  }

  async function handleUpgrade(plan: string) {
    setUpgradeLoading(plan)
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start checkout')
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to start checkout')
    } finally {
      setUpgradeLoading(null)
    }
  }

  async function handleManageBilling() {
    setPortalLoading(true)
    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to open billing portal')
      }

      // Show warning if user has staff and might downgrade
      if (data.staffCount > 0) {
        const confirmed = window.confirm(
          `Important: You have ${data.staffCount} active staff member${data.staffCount > 1 ? 's' : ''}.\n\n` +
          `If you downgrade your plan, you may need to deactivate staff members first to comply with your new plan's limits.\n\n` +
          `Staff limits by plan:\n` +
          `- Micro: 0 staff (solo operator)\n` +
          `- Starter: Up to 2 staff\n` +
          `- Standard: Up to 5 staff\n` +
          `- Premium: Unlimited staff\n\n` +
          `Do you want to continue to billing management?`
        )

        if (!confirmed) {
          setPortalLoading(false)
          return
        }
      }

      window.location.href = data.url
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to open billing portal')
    } finally {
      setPortalLoading(false)
    }
  }

  async function handleSyncSubscription() {
    setSyncLoading(true)
    try {
      const response = await fetch('/api/stripe/sync', {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sync subscription')
      }

      if (data.synced) {
        toast.success('Subscription synced successfully! Reloading page...')
        // Force a full page reload to refresh all user data including sidebar
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to sync subscription')
    } finally {
      setSyncLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50/50">
        <div className="bg-white border-b border-gray-200">
          <div className="px-4 md:px-8 py-6">
            <div className="animate-pulse h-8 bg-gray-200 rounded w-48"></div>
          </div>
        </div>
        <div className="px-4 md:px-8 py-6 space-y-6">
          <div className="h-32 bg-gray-200 rounded-xl animate-pulse"></div>
          <div className="h-64 bg-gray-200 rounded-xl animate-pulse"></div>
        </div>
      </div>
    )
  }

  const isTrialing = subscription?.subscription_status === 'trialing'
  const isActive = subscription?.subscription_status === 'active'
  const currentPlan = subscription?.subscription_tier || 'trial'
  const trialEndsAt = subscription?.trial_ends_at ? new Date(subscription.trial_ends_at) : null
  const daysLeftInTrial = trialEndsAt ? Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0
  const isTrialExpired = isTrialing && daysLeftInTrial === 0

  // Tier hierarchy for comparison (trial = 0 so all plans are available)
  const tierHierarchy: Record<string, number> = { trial: 0, micro: 1, starter: 2, standard: 3, premium: 4 }
  // When trialing or trial tier, treat as level 0 so all plans are selectable
  const currentTierLevel = (isTrialing || currentPlan === 'trial') ? 0 : (tierHierarchy[currentPlan] || 0)

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 md:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Subscription</h1>
              <p className="mt-1 text-sm text-gray-500">Manage your subscription plan and billing</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-6 space-y-6">
        {/* Current Status */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-lg font-semibold text-gray-900">Current Plan</h2>
                {isTrialing && (
                  <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                    Trial
                  </span>
                )}
                {isActive && (
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                    Active
                  </span>
                )}
                {subscription?.cancel_at_period_end && (
                  <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                    Cancelling
                  </span>
                )}
              </div>
              <p className="text-2xl font-bold text-gray-900 capitalize">
                {currentPlan === 'trial' ? 'Free Trial' : `${currentPlan} Plan`}
              </p>
              {isTrialing && trialEndsAt && (
                <div className="flex items-center gap-2 mt-2 text-amber-600">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">
                    {daysLeftInTrial} days left in trial (ends {trialEndsAt.toLocaleDateString()})
                  </span>
                </div>
              )}
              {isActive && subscription?.current_period_end && (
                <p className="text-sm text-gray-500 mt-1">
                  {subscription.cancel_at_period_end
                    ? `Access until ${new Date(subscription.current_period_end).toLocaleDateString()}`
                    : `Renews on ${new Date(subscription.current_period_end).toLocaleDateString()}`}
                </p>
              )}
              {staffCount > 0 && (
                <div className="flex items-center gap-2 mt-2 text-gray-600">
                  <Users className="w-4 h-4" />
                  <span className="text-sm">
                    {staffCount} active staff member{staffCount !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleSyncSubscription}
                isLoading={syncLoading}
                leftIcon={<RefreshCw className="w-4 h-4" />}
              >
                Sync from Stripe
              </Button>
              {subscription?.stripe_customer_id && (
                <Button
                  variant="outline"
                  onClick={handleManageBilling}
                  isLoading={portalLoading}
                  rightIcon={<ExternalLink className="w-4 h-4" />}
                >
                  Manage Billing
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Trial Warning */}
        {isTrialExpired && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-800">Your trial has expired!</p>
              <p className="text-sm text-red-700 mt-1">
                Choose a plan below to continue using all features. Your data is safe.
              </p>
            </div>
          </div>
        )}
        {isTrialing && !isTrialExpired && daysLeftInTrial <= 3 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800">Your trial is ending soon!</p>
              <p className="text-sm text-amber-700 mt-1">
                Choose a plan below to continue using all features after your trial ends.
              </p>
            </div>
          </div>
        )}

        {/* Plans */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Plans</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => {
            // When on trial, no plan is "current" - user needs to pick one
            const isCurrent = !isTrialing && currentPlan === plan.id
            const PlanIcon = plan.icon
            const planLevel = tierHierarchy[plan.id] || 1
            const isLowerTier = !isTrialing && planLevel < currentTierLevel
            const isHigherTier = planLevel > currentTierLevel

            return (
              <div
                key={plan.id}
                className={`relative bg-white rounded-xl border-2 p-6 transition-all ${
                  isCurrent
                    ? 'border-green-500 ring-2 ring-green-100'
                    : plan.popular
                    ? 'border-blue-500 shadow-lg'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {plan.popular && !isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 bg-blue-500 text-white text-xs font-medium rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    isCurrent ? 'bg-green-100' : plan.popular ? 'bg-blue-100' : 'bg-gray-100'
                  }`}>
                    <PlanIcon className={`w-5 h-5 ${isCurrent ? 'text-green-600' : plan.popular ? 'text-blue-600' : 'text-gray-600'}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{plan.name}</h3>
                    {isCurrent && (
                      <span className="text-xs text-green-600 font-medium">Current Plan</span>
                    )}
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-gray-900">N${plan.price.toLocaleString()}</span>
                    <span className="text-gray-500">/month</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    or N${plan.annualPrice.toLocaleString()}/year <span className="text-green-600">(save 17%)</span>
                  </p>
                </div>

                <p className="text-sm text-gray-600 mb-4">{plan.description}</p>

                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                {(() => {
                  // Check if downgrade is blocked due to staff limits
                  const targetTier = plan.id as SubscriptionTier
                  const targetStaffLimit = PLAN_LIMITS[targetTier]?.maxStaff ?? 0
                  const isDowngradeBlocked = isLowerTier && targetStaffLimit !== -1 && staffCount > targetStaffLimit

                  if (isCurrent) {
                    return (
                      <Button variant="outline" className="w-full" disabled>
                        Current Plan
                      </Button>
                    )
                  }

                  if (isDowngradeBlocked) {
                    return (
                      <div className="space-y-2">
                        <Button variant="outline" className="w-full text-red-400 border-red-200" disabled>
                          Cannot Downgrade
                        </Button>
                        <p className="text-xs text-red-600 text-center">
                          {targetStaffLimit === 0
                            ? `Deactivate all ${staffCount} staff to downgrade`
                            : `Deactivate ${staffCount - targetStaffLimit} staff to downgrade`}
                        </p>
                      </div>
                    )
                  }

                  if (isLowerTier) {
                    return (
                      <Button variant="outline" className="w-full text-gray-400" disabled>
                        Included in your plan
                      </Button>
                    )
                  }

                  return (
                    <Button
                      className="w-full"
                      variant={plan.popular ? 'primary' : 'outline'}
                      onClick={() => handleUpgrade(plan.id)}
                      isLoading={upgradeLoading === plan.id}
                    >
                      {isTrialing ? 'Start Plan' : 'Upgrade'}
                    </Button>
                  )
                })()}
              </div>
            )
          })}
          </div>
        </div>

        {/* FAQ or Help */}
        <div className="bg-gray-50 rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 mb-2">Need help choosing?</h3>
          <p className="text-sm text-gray-600">
            Contact us at{' '}
            <a href="mailto:support@institux.com" className="text-blue-600 hover:underline">
              support@institux.com
            </a>{' '}
            and we&apos;ll help you find the right plan for your institution.
          </p>
        </div>
      </div>
    </div>
  )
}
