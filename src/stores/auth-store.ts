import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import type { UserWithInstitution } from '@/types'

// Module access by subscription tier
// true = tier can access module (if also enabled by admin)
const MODULE_TIER_ACCESS = {
  micro: { hostel: false, transport: false, library: false, sms: false },
  starter: { hostel: false, transport: false, library: false, sms: false },
  standard: { hostel: false, transport: false, library: true, sms: true },
  premium: { hostel: true, transport: true, library: true, sms: true },
} as const

type ModuleName = 'hostel' | 'transport' | 'library' | 'sms'
type SubscriptionTier = keyof typeof MODULE_TIER_ACCESS

interface AuthState {
  user: UserWithInstitution | null
  isLoading: boolean
  isAuthenticated: boolean
  isInitialized: boolean

  // Actions
  setUser: (user: UserWithInstitution | null) => void
  fetchUser: () => Promise<void>
  signOut: () => Promise<void>
  clearAuth: () => void

  // Role checks
  isSuperAdmin: () => boolean
  isInstitutionAdmin: () => boolean
  isInstitutionStaff: () => boolean
  canAccessModule: (module: ModuleName) => boolean
  getSubscriptionTier: () => SubscriptionTier
  getRequiredTierForModule: (module: ModuleName) => SubscriptionTier

  // Legacy aliases for backward compatibility
  isCenterAdmin: () => boolean
  isCenterStaff: () => boolean
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  isInitialized: false,

  setUser: (user) => {
    set({
      user,
      isAuthenticated: !!user,
      isLoading: false,
      isInitialized: true
    })
  },

  clearAuth: () => {
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isInitialized: true
    })
  },

  fetchUser: async () => {
    const supabase = createClient()
    const currentUser = get().user

    if (!currentUser?.id) return

    try {
      const { data: profile, error } = await supabase
        .from('users')
        .select(`
          *,
          institution:institutions (
            id,
            name,
            slug,
            code,
            logo_url,
            primary_color,
            secondary_color,
            status,
            subscription_tier,
            subscription_status,
            hostel_module_enabled,
            transport_module_enabled,
            library_module_enabled,
            sms_module_enabled,
            institution_type,
            nqa_accreditation_number,
            level_terminology,
            student_number_prefix,
            student_number_format
          )
        `)
        .eq('id', currentUser.id)
        .single()

      if (!error && profile) {
        set({
          user: profile as UserWithInstitution,
          isAuthenticated: true,
        })
      }
    } catch (error) {
      console.error('Error fetching user:', error)
    }
  },

  signOut: async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    set({ user: null, isAuthenticated: false, isInitialized: true, isLoading: false })
  },

  isSuperAdmin: () => get().user?.role === 'super_admin',
  isInstitutionAdmin: () => get().user?.role === 'institution_admin',
  isInstitutionStaff: () => get().user?.role === 'institution_staff',

  // Legacy aliases
  isCenterAdmin: () => get().user?.role === 'institution_admin',
  isCenterStaff: () => get().user?.role === 'institution_staff',

  getSubscriptionTier: () => {
    const user = get().user
    const tier = user?.institution?.subscription_tier
    if (tier && tier in MODULE_TIER_ACCESS) {
      return tier as SubscriptionTier
    }
    return 'starter'
  },

  getRequiredTierForModule: (module: ModuleName) => {
    const tiers: SubscriptionTier[] = ['micro', 'starter', 'standard', 'premium']
    for (const tier of tiers) {
      if (MODULE_TIER_ACCESS[tier][module]) {
        return tier
      }
    }
    return 'premium'
  },

  canAccessModule: (module) => {
    const user = get().user
    if (!user) return false
    if (user.role === 'super_admin') return true
    if (!user.institution) return false

    // Get subscription tier
    const tier = get().getSubscriptionTier()
    const tierAccess = MODULE_TIER_ACCESS[tier] || MODULE_TIER_ACCESS.starter

    // Tier is the ONLY determining factor for module access
    // The module_enabled flags in DB are reserved for future admin controls
    const hasAccess = tierAccess[module] === true
    return hasAccess
  },
}))
