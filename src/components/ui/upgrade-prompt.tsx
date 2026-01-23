'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Crown, Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface UpgradePromptProps {
  feature: string
  requiredTier: 'standard' | 'premium'
  currentTier?: string
  onClose?: () => void
  showAsModal?: boolean
}

const tierInfo = {
  standard: {
    name: 'Standard',
    price: 899,
    icon: Sparkles,
    color: 'blue',
  },
  premium: {
    name: 'Premium',
    price: 1499,
    icon: Crown,
    color: 'purple',
  },
}

export function UpgradePrompt({
  feature,
  requiredTier,
  currentTier = 'starter',
  onClose,
  showAsModal = false,
}: UpgradePromptProps) {
  const router = useRouter()
  const tier = tierInfo[requiredTier]
  const Icon = tier.icon

  const handleUpgrade = () => {
    router.push('/dashboard/subscription')
  }

  const content = (
    <div className="text-center py-8 px-6">
      <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-6 ${
        tier.color === 'purple' ? 'bg-purple-100' : 'bg-blue-100'
      }`}>
        <Lock className={`w-8 h-8 ${
          tier.color === 'purple' ? 'text-purple-600' : 'text-blue-600'
        }`} />
      </div>

      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        Upgrade to Unlock {feature}
      </h3>

      <p className="text-gray-600 mb-6 max-w-md mx-auto">
        The {feature} feature is available on the{' '}
        <span className={`font-semibold ${
          tier.color === 'purple' ? 'text-purple-600' : 'text-blue-600'
        }`}>
          {tier.name}
        </span>{' '}
        plan and above.
      </p>

      <div className={`inline-flex items-center gap-3 px-4 py-3 rounded-lg mb-6 ${
        tier.color === 'purple' ? 'bg-purple-50' : 'bg-blue-50'
      }`}>
        <Icon className={`w-5 h-5 ${
          tier.color === 'purple' ? 'text-purple-600' : 'text-blue-600'
        }`} />
        <div className="text-left">
          <p className="font-semibold text-gray-900">{tier.name} Plan</p>
          <p className="text-sm text-gray-600">N${tier.price}/month</p>
        </div>
      </div>

      <div className="flex justify-center gap-3">
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            Maybe Later
          </Button>
        )}
        <Button onClick={handleUpgrade}>
          View Upgrade Options
        </Button>
      </div>
    </div>
  )

  if (showAsModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-md w-full relative">
          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          )}
          {content}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      {content}
    </div>
  )
}

/**
 * Inline upgrade badge to show on locked features
 */
export function UpgradeBadge({
  requiredTier,
  small = false,
}: {
  requiredTier: 'standard' | 'premium'
  small?: boolean
}) {
  const tier = tierInfo[requiredTier]

  if (small) {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
        tier.color === 'purple'
          ? 'bg-purple-100 text-purple-700'
          : 'bg-blue-100 text-blue-700'
      }`}>
        <Lock className="w-3 h-3" />
        {tier.name}
      </span>
    )
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
      tier.color === 'purple'
        ? 'bg-purple-100 text-purple-700'
        : 'bg-blue-100 text-blue-700'
    }`}>
      <Lock className="w-3.5 h-3.5" />
      {tier.name} Plan Required
    </span>
  )
}

/**
 * Hook to check module access and show upgrade prompt
 */
export function useModuleAccess(
  module: 'hostel' | 'transport' | 'library' | 'sms',
  currentTier: string | undefined
) {
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false)

  const moduleRequirements: Record<string, 'standard' | 'premium'> = {
    hostel: 'premium',
    transport: 'premium',
    library: 'standard',
    sms: 'standard',
  }

  const tierHierarchy: Record<string, number> = {
    micro: 1,
    starter: 2,
    standard: 3,
    premium: 4,
  }

  const requiredTier = moduleRequirements[module]
  const requiredLevel = tierHierarchy[requiredTier] || 4
  const currentLevel = tierHierarchy[currentTier || 'starter'] || 2

  const hasAccess = currentLevel >= requiredLevel

  return {
    hasAccess,
    requiredTier,
    showUpgradePrompt,
    setShowUpgradePrompt,
  }
}
