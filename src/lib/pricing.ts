/**
 * Centralized Pricing Configuration for Namibian VTC Platform
 * All prices are in Namibian Dollars (NAD/N$)
 *
 * Pricing Strategy: Penetration pricing for emerging market
 * - Aggressive entry pricing to capture market share
 * - Annual discount of ~17% (2 months free)
 * - Per-student equivalent decreases at higher tiers
 */

// =============================================================================
// SUBSCRIPTION PLANS
// =============================================================================

export const SUBSCRIPTION_PLANS = {
  micro: {
    id: 'micro',
    name: 'Micro',
    description: 'Perfect for individual tutors and small training operators',
    tagline: 'Solo operators & tutors',

    // Pricing
    monthlyPrice: 99,        // N$99/month
    annualPrice: 990,        // N$990/year (save N$198 / ~17%)
    annualSavings: 198,

    // Limits
    maxStudents: 15,
    maxStaff: 0,             // Solo operator - admin only

    // Features
    features: [
      'Up to 15 students',
      'Solo operator (no staff accounts)',
      'Student management',
      'Attendance tracking',
      'Grade management',
      'Fee tracking & payments',
      'Class scheduling',
      'Timetable management',
      'Email support',
    ],

    // Module access
    modules: {
      core: true,            // attendance, grades, classes, timetable
      reportCards: false,
      studentPortal: false,
      lecturerPortal: false,
      library: false,
      sms: false,
      hostel: false,
      transport: false,
    },
  },

  starter: {
    id: 'starter',
    name: 'Starter',
    description: 'Ideal for small private colleges and training centers',
    tagline: 'Small institutions',

    // Pricing
    monthlyPrice: 299,       // N$299/month
    annualPrice: 2990,       // N$2,990/year (save N$598 / ~17%)
    annualSavings: 598,

    // Limits
    maxStudents: 50,
    maxStaff: 2,

    // Features
    features: [
      'Up to 50 students',
      'Up to 2 staff members',
      'Everything in Micro',
      'Staff accounts',
      'Basic reports',
      'Student enrollment management',
      'Course management',
      'Email support',
    ],

    // Module access
    modules: {
      core: true,
      reportCards: false,
      studentPortal: false,
      lecturerPortal: false,
      library: false,
      sms: false,
      hostel: false,
      transport: false,
    },
  },

  standard: {
    id: 'standard',
    name: 'Standard',
    description: 'For growing institutions with advanced needs',
    tagline: 'Growing institutions',
    popular: true,

    // Pricing
    monthlyPrice: 699,       // N$699/month
    annualPrice: 6990,       // N$6,990/year (save N$1,398 / ~17%)
    annualSavings: 1398,

    // Limits
    maxStudents: 150,
    maxStaff: 5,

    // Features
    features: [
      'Up to 150 students',
      'Up to 5 staff members',
      'Everything in Starter',
      'Academic transcripts',
      'Report cards',
      'Student portal',
      'Lecturer portal',
      'Library module',
      'SMS notifications',
      'Advanced reports & analytics',
      'Priority email support',
    ],

    // Module access
    modules: {
      core: true,
      reportCards: true,
      studentPortal: true,
      lecturerPortal: true,
      library: true,
      sms: true,
      hostel: false,
      transport: false,
    },
  },

  premium: {
    id: 'premium',
    name: 'Premium',
    description: 'Complete solution for large institutions and multi-campus operations',
    tagline: 'Large institutions & colleges',

    // Pricing
    monthlyPrice: 1499,      // N$1,499/month
    annualPrice: 14990,      // N$14,990/year (save N$2,998 / ~17%)
    annualSavings: 2998,

    // Limits
    maxStudents: -1,         // Unlimited
    maxStaff: -1,            // Unlimited

    // Features
    features: [
      'Unlimited students',
      'Unlimited staff members',
      'Everything in Standard',
      'Hostel management',
      'Transport tracking',
      'Custom branding',
      'Multi-year student tracking',
      'Cohort management',
      'Re-registration system',
      'API access',
      'Dedicated account manager',
      'Phone & email support',
    ],

    // Module access
    modules: {
      core: true,
      reportCards: true,
      studentPortal: true,
      lecturerPortal: true,
      library: true,
      sms: true,
      hostel: true,
      transport: true,
    },
  },
} as const

export type SubscriptionPlanId = keyof typeof SUBSCRIPTION_PLANS
export type SubscriptionPlan = typeof SUBSCRIPTION_PLANS[SubscriptionPlanId]

// =============================================================================
// SMS CREDIT PACKAGES
// =============================================================================

export const SMS_CREDIT_PACKAGES = {
  small: {
    id: 'small',
    name: '100 SMS Credits',
    description: 'Perfect for occasional notifications',
    credits: 100,
    price: 75,               // N$75
    pricePerSms: 0.75,       // N$0.75 per SMS
  },

  medium: {
    id: 'medium',
    name: '500 SMS Credits',
    description: 'Great for regular communication',
    credits: 500,
    price: 300,              // N$300
    pricePerSms: 0.60,       // N$0.60 per SMS
    popular: true,
  },

  large: {
    id: 'large',
    name: '1,000 SMS Credits',
    description: 'Ideal for active institutions',
    credits: 1000,
    price: 500,              // N$500
    pricePerSms: 0.50,       // N$0.50 per SMS
  },

  bulk: {
    id: 'bulk',
    name: '5,000 SMS Credits',
    description: 'Best value for high-volume needs',
    credits: 5000,
    price: 2000,             // N$2,000
    pricePerSms: 0.40,       // N$0.40 per SMS
    bestValue: true,
  },
} as const

export type SMSPackageId = keyof typeof SMS_CREDIT_PACKAGES
export type SMSPackage = typeof SMS_CREDIT_PACKAGES[SMSPackageId]

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Format price in Namibian Dollars
 */
export function formatNAD(amount: number): string {
  return `N$${amount.toLocaleString('en-NA')}`
}

/**
 * Get annual discount percentage
 */
export function getAnnualDiscountPercent(plan: SubscriptionPlan): number {
  const monthlyTotal = plan.monthlyPrice * 12
  const savings = monthlyTotal - plan.annualPrice
  return Math.round((savings / monthlyTotal) * 100)
}

/**
 * Get per-student cost for a plan
 */
export function getPerStudentCost(planId: SubscriptionPlanId): string {
  const plan = SUBSCRIPTION_PLANS[planId]
  if (plan.maxStudents === -1) return 'Unlimited'
  const perStudent = plan.monthlyPrice / plan.maxStudents
  return `N$${perStudent.toFixed(2)}/student`
}

/**
 * Compare plans - returns true if plan1 is higher tier than plan2
 */
export function isHigherTier(plan1: SubscriptionPlanId, plan2: SubscriptionPlanId): boolean {
  const hierarchy: Record<SubscriptionPlanId, number> = {
    micro: 1,
    starter: 2,
    standard: 3,
    premium: 4,
  }
  return hierarchy[plan1] > hierarchy[plan2]
}

/**
 * Get all plans as array (useful for mapping in UI)
 */
export function getAllPlans(): SubscriptionPlan[] {
  return Object.values(SUBSCRIPTION_PLANS)
}

/**
 * Get all SMS packages as array
 */
export function getAllSMSPackages(): SMSPackage[] {
  return Object.values(SMS_CREDIT_PACKAGES)
}
