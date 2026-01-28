import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createCheckoutSession, SubscriptionPlan } from '@/lib/stripe'
import { PLAN_LIMITS, SubscriptionTier } from '@/lib/subscription-limits'

// Tier hierarchy for comparison
const TIER_HIERARCHY: Record<string, number> = { micro: 1, starter: 2, standard: 3, premium: 4 }

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user profile with center info including current subscription tier
    const { data: profile } = await supabase
      .from('users')
      .select(`
        id,
        email,
        institution_id,
        institution:institutions(
          id,
          name,
          email,
          subscription_tier
        )
      `)
      .eq('id', user.id)
      .single()

    interface UserProfile {
      id: string
      email: string
      institution_id: string | null
      institution: { id: string; name: string; email: string | null; subscription_tier: string | null } | null
    }

    const typedProfile = profile as UserProfile | null

    if (!typedProfile?.institution_id) {
      return NextResponse.json(
        { error: 'No institution associated with user' },
        { status: 400 }
      )
    }

    const { plan } = await request.json()

    if (!plan || !['micro', 'starter', 'standard', 'premium'].includes(plan)) {
      return NextResponse.json(
        { error: 'Invalid subscription plan' },
        { status: 400 }
      )
    }

    const institution = typedProfile.institution
    if (!institution) {
      return NextResponse.json(
        { error: 'Institution data not found' },
        { status: 400 }
      )
    }
    const currentTier = (institution.subscription_tier as SubscriptionTier) || 'starter'
    const targetTier = plan as SubscriptionTier

    // Check if this is a downgrade
    const currentLevel = TIER_HIERARCHY[currentTier] || 2
    const targetLevel = TIER_HIERARCHY[targetTier] || 2

    if (targetLevel < currentLevel) {
      // This is a downgrade - check staff limits
      const targetStaffLimit = PLAN_LIMITS[targetTier]?.maxStaff ?? PLAN_LIMITS.starter.maxStaff

      // Count current active staff members
      const { count: staffCount } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('institution_id', typedProfile.institution_id)
        .eq('role', 'institution_staff')
        .eq('is_active', true)

      const currentStaff = staffCount || 0

      // Block if staff count exceeds target plan's limit (unless unlimited)
      if (targetStaffLimit !== -1 && currentStaff > targetStaffLimit) {
        const staffToRemove = currentStaff - targetStaffLimit
        return NextResponse.json(
          {
            error: `Cannot downgrade to ${targetTier.charAt(0).toUpperCase() + targetTier.slice(1)} plan. You have ${currentStaff} active staff members, but the ${targetTier.charAt(0).toUpperCase() + targetTier.slice(1)} plan allows only ${targetStaffLimit === 0 ? 'no' : targetStaffLimit} staff. Please deactivate ${staffToRemove} staff member${staffToRemove > 1 ? 's' : ''} first.`
          },
          { status: 400 }
        )
      }
    }
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const session = await createCheckoutSession({
      institutionId: typedProfile.institution_id!,
      institutionEmail: institution.email || typedProfile.email,
      institutionName: institution.name,
      plan: plan as SubscriptionPlan,
      successUrl: `${baseUrl}/dashboard/settings?subscription=success`,
      cancelUrl: `${baseUrl}/dashboard/settings?subscription=cancelled`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Checkout session error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Failed to create checkout session: ${errorMessage}` },
      { status: 500 }
    )
  }
}
