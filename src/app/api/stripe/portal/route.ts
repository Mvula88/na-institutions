import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createCustomerPortalSession } from '@/lib/stripe'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's center with Stripe customer ID and subscription tier
    const { data: profile } = await supabase
      .from('users')
      .select(`
        center_id,
        institution:institutions(
          stripe_customer_id,
          subscription_tier
        )
      `)
      .eq('id', user.id)
      .single()

    interface UserProfile {
      center_id: string | null
      center: { stripe_customer_id: string | null; subscription_tier: string | null } | null
    }

    const typedProfile = profile as UserProfile | null

    if (!typedProfile?.center_id) {
      return NextResponse.json(
        { error: 'No center associated with user' },
        { status: 400 }
      )
    }

    const center = typedProfile.center

    if (!center?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No Stripe customer found. Please subscribe first.' },
        { status: 400 }
      )
    }

    // Get staff count for warning
    const { count: staffCount } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('institution_id', typedProfile.center_id)
      .eq('role', 'center_staff')
      .eq('is_active', true)

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const session = await createCustomerPortalSession({
      customerId: center.stripe_customer_id,
      returnUrl: `${baseUrl}/dashboard/settings`,
    })

    return NextResponse.json({
      url: session.url,
      staffCount: staffCount || 0,
      currentTier: center.subscription_tier || 'starter'
    })
  } catch (error) {
    console.error('Customer portal error:', error)
    return NextResponse.json(
      { error: 'Failed to create customer portal session' },
      { status: 500 }
    )
  }
}
