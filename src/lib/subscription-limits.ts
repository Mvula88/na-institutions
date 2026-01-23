/**
 * Subscription Limits Utility
 * Enforces student limits and module access based on subscription tier
 */

import { createClient } from '@/lib/supabase/client'

/**
 * Plan limits configuration
 * -1 means unlimited
 *
 * Module Categories:
 * - Core Features (all plans): attendance, grades, classes, timetable
 * - Standard+ Features: report_cards, student_portal, teacher_portal, library, sms
 * - Premium Features: hostel, transport
 */
export const PLAN_LIMITS = {
  micro: {
    maxStudents: 15,
    maxStaff: 0, // Solo operator - center admin only, no additional staff
    modules: {
      // Core features - included in all plans
      attendance: true,
      grades: true,
      classes: true,
      timetable: true,
      // Standard+ features
      report_cards: false,
      student_portal: false,
      teacher_portal: false,
      library: false,
      sms: false,
      // Premium features
      hostel: false,
      transport: false,
    },
  },
  starter: {
    maxStudents: 50,
    maxStaff: 2, // Center admin + 2 staff members
    modules: {
      // Core features - included in all plans
      attendance: true,
      grades: true,
      classes: true,
      timetable: true,
      // Standard+ features
      report_cards: false,
      student_portal: false,
      teacher_portal: false,
      library: false,
      sms: false,
      // Premium features
      hostel: false,
      transport: false,
    },
  },
  standard: {
    maxStudents: 150,
    maxStaff: 5,
    modules: {
      // Core features - included in all plans
      attendance: true,
      grades: true,
      classes: true,
      timetable: true,
      // Standard+ features
      report_cards: true,
      student_portal: true,
      teacher_portal: true,
      library: true,
      sms: true,
      // Premium features
      hostel: false,
      transport: false,
    },
  },
  premium: {
    maxStudents: -1, // Unlimited
    maxStaff: -1, // Unlimited
    modules: {
      // Core features - included in all plans
      attendance: true,
      grades: true,
      classes: true,
      timetable: true,
      // Standard+ features
      report_cards: true,
      student_portal: true,
      teacher_portal: true,
      library: true,
      sms: true,
      // Premium features
      hostel: true,
      transport: true,
    },
  },
} as const

export type SubscriptionTier = keyof typeof PLAN_LIMITS
export type ModuleName =
  | 'attendance'
  | 'grades'
  | 'classes'
  | 'timetable'
  | 'report_cards'
  | 'student_portal'
  | 'teacher_portal'
  | 'library'
  | 'sms'
  | 'hostel'
  | 'transport'

export interface StudentLimitCheck {
  canAdd: boolean
  current: number
  limit: number
  tier: SubscriptionTier
  remaining: number
  percentUsed: number
  isNearLimit: boolean // 80% or more
  isAtLimit: boolean
}

export interface StaffLimitCheck {
  canAdd: boolean
  current: number
  limit: number
  tier: SubscriptionTier
  remaining: number
  percentUsed: number
  isAtLimit: boolean
}

export interface ModuleAccessCheck {
  hasAccess: boolean
  tier: SubscriptionTier
  requiredTier: SubscriptionTier | null
  isEnabled: boolean // Module flag in database
  reason?: string
}

/**
 * Check if an institution can add more students based on their subscription tier
 */
export async function checkStudentLimit(institutionId: string): Promise<StudentLimitCheck> {
  const supabase = createClient()

  // Get institution's subscription tier
  const { data: institutionData } = await supabase
    .from('institutions')
    .select('subscription_tier')
    .eq('id', institutionId)
    .single()

  const institution = institutionData as { subscription_tier: string | null } | null
  const tier = (institution?.subscription_tier as SubscriptionTier) || 'starter'
  const limit = PLAN_LIMITS[tier]?.maxStudents ?? PLAN_LIMITS.starter.maxStudents

  // Count active students
  const { count } = await supabase
    .from('students')
    .select('id', { count: 'exact', head: true })
    .eq('institution_id', institutionId)
    .eq('status', 'active')

  const current = count || 0
  const isUnlimited = limit === -1
  const remaining = isUnlimited ? Infinity : Math.max(0, limit - current)
  const percentUsed = isUnlimited ? 0 : (current / limit) * 100

  return {
    canAdd: isUnlimited || current < limit,
    current,
    limit: isUnlimited ? -1 : limit,
    tier,
    remaining: isUnlimited ? -1 : remaining,
    percentUsed: Math.round(percentUsed),
    isNearLimit: !isUnlimited && percentUsed >= 80,
    isAtLimit: !isUnlimited && current >= limit,
  }
}

/**
 * Check if an institution can add more staff based on their subscription tier
 * Note: This counts institution_staff role users only (not the institution_admin)
 */
export async function checkStaffLimit(institutionId: string): Promise<StaffLimitCheck> {
  const supabase = createClient()

  // Get institution's subscription tier
  const { data: institutionData } = await supabase
    .from('institutions')
    .select('subscription_tier')
    .eq('id', institutionId)
    .single()

  const institution = institutionData as { subscription_tier: string | null } | null
  const tier = (institution?.subscription_tier as SubscriptionTier) || 'starter'
  const limit = PLAN_LIMITS[tier]?.maxStaff ?? PLAN_LIMITS.starter.maxStaff

  // Count active staff members (institution_staff role only, not institution_admin)
  const { count } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('institution_id', institutionId)
    .eq('role', 'institution_staff')
    .eq('is_active', true)

  const current = count || 0
  const isUnlimited = limit === -1
  const remaining = isUnlimited ? Infinity : Math.max(0, limit - current)
  const percentUsed = isUnlimited ? 0 : limit === 0 ? 100 : (current / limit) * 100

  return {
    canAdd: isUnlimited || current < limit,
    current,
    limit: isUnlimited ? -1 : limit,
    tier,
    remaining: isUnlimited ? -1 : remaining,
    percentUsed: Math.round(percentUsed),
    isAtLimit: !isUnlimited && current >= limit,
  }
}

/**
 * Get staff limit message for display
 */
export function getStaffLimitMessage(check: StaffLimitCheck): string | null {
  if (check.limit === -1) {
    return null // Unlimited
  }

  if (check.limit === 0) {
    return 'Your Micro plan does not include additional staff. Upgrade to Starter to add staff members.'
  }

  if (check.isAtLimit) {
    return `You've reached your ${check.tier} plan limit of ${check.limit} staff members. Upgrade to add more.`
  }

  return null
}

/**
 * Check if an institution has access to a specific module
 */
export async function checkModuleAccess(
  institutionId: string,
  module: ModuleName
): Promise<ModuleAccessCheck> {
  const supabase = createClient()

  // Get institution's subscription tier and module flags
  const { data: institutionData } = await supabase
    .from('institutions')
    .select(
      'subscription_tier, hostel_module_enabled, transport_module_enabled, library_module_enabled, sms_module_enabled'
    )
    .eq('id', institutionId)
    .single()

  const institution = institutionData as {
    subscription_tier: string | null
    hostel_module_enabled: boolean | null
    transport_module_enabled: boolean | null
    library_module_enabled: boolean | null
    sms_module_enabled: boolean | null
  } | null

  if (!institution) {
    return {
      hasAccess: false,
      tier: 'starter',
      requiredTier: null,
      isEnabled: false,
      reason: 'Institution not found',
    }
  }

  const tier = (institution.subscription_tier as SubscriptionTier) || 'starter'
  const planLimits = PLAN_LIMITS[tier] || PLAN_LIMITS.starter

  // Check if tier allows the module
  const tierAllows = planLimits.modules[module]

  // Check if module is enabled in database
  // Core modules are always enabled, premium modules have database flags
  const moduleEnabledMap: Record<ModuleName, boolean> = {
    // Core features - always enabled (no database flag needed)
    attendance: true,
    grades: true,
    classes: true,
    timetable: true,
    // Standard+ features - enabled based on tier (no database flag needed)
    report_cards: true, // Controlled by tier only
    student_portal: true, // Controlled by tier only
    teacher_portal: true, // Controlled by tier only (now lecturer_portal)
    // Premium features with database flags
    hostel: institution.hostel_module_enabled ?? false,
    transport: institution.transport_module_enabled ?? false,
    library: institution.library_module_enabled ?? false,
    sms: institution.sms_module_enabled ?? false,
  }
  const isEnabled = moduleEnabledMap[module]

  // Find the required tier for this module
  let requiredTier: SubscriptionTier | null = null
  for (const [planName, limits] of Object.entries(PLAN_LIMITS)) {
    if (limits.modules[module]) {
      requiredTier = planName as SubscriptionTier
      break
    }
  }

  // Both tier must allow AND module must be enabled
  const hasAccess = tierAllows && isEnabled

  let reason: string | undefined
  if (!tierAllows) {
    reason = `This feature requires the ${requiredTier ? PLAN_LIMITS[requiredTier] ? requiredTier.charAt(0).toUpperCase() + requiredTier.slice(1) : 'Premium' : 'Premium'} plan or higher`
  } else if (!isEnabled) {
    reason = 'This module is not enabled for your institution. Contact support to enable it.'
  }

  return {
    hasAccess,
    tier,
    requiredTier,
    isEnabled,
    reason,
  }
}

/**
 * Get all limits for an institution
 */
export async function getInstitutionLimits(institutionId: string) {
  const supabase = createClient()

  const { data: institutionData } = await supabase
    .from('institutions')
    .select('subscription_tier')
    .eq('id', institutionId)
    .single()

  const institution = institutionData as { subscription_tier: string | null } | null
  const tier = (institution?.subscription_tier as SubscriptionTier) || 'starter'

  return {
    tier,
    limits: PLAN_LIMITS[tier] || PLAN_LIMITS.starter,
  }
}

/**
 * Get the minimum tier required for a module
 */
export function getRequiredTierForModule(module: ModuleName): SubscriptionTier {
  const tiers: SubscriptionTier[] = ['micro', 'starter', 'standard', 'premium']

  for (const tier of tiers) {
    if (PLAN_LIMITS[tier].modules[module]) {
      return tier
    }
  }

  return 'premium'
}

/**
 * Check if a tier includes a specific module
 */
export function tierIncludesModule(tier: SubscriptionTier, module: ModuleName): boolean {
  return PLAN_LIMITS[tier]?.modules[module] ?? false
}

/**
 * Get a user-friendly message for student limit status
 */
export function getStudentLimitMessage(check: StudentLimitCheck): string | null {
  if (check.limit === -1) {
    return null // Unlimited
  }

  if (check.isAtLimit) {
    return `You've reached your ${check.tier} plan limit of ${check.limit} students. Upgrade to add more students.`
  }

  if (check.isNearLimit) {
    return `You're using ${check.percentUsed}% of your ${check.limit} student limit. Consider upgrading soon.`
  }

  return null
}

/**
 * Format limit display (handles unlimited)
 */
export function formatLimit(limit: number): string {
  return limit === -1 ? 'Unlimited' : limit.toString()
}
