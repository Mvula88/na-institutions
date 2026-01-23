import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'
import { createClient as createServiceClient } from '@supabase/supabase-js'

// Sync subscription status from Stripe

// Lazy initialization of service role client
function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's center
    const { data: profile } = await supabase
      .from('users')
      .select('center_id')
      .eq('id', user.id)
      .single()

    const typedProfile = profile as { center_id: string | null } | null

    if (!typedProfile?.center_id) {
      return NextResponse.json({ error: 'No center found' }, { status: 400 })
    }

    // Get center with Stripe customer ID
    const { data: center } = await supabase
      .from('institutions')
      .select('id, stripe_customer_id, email')
      .eq('id', typedProfile.center_id)
      .single()

    const typedCenter = center as { id: string; stripe_customer_id: string | null; email: string | null } | null

    if (!typedCenter) {
      return NextResponse.json({ error: 'Center not found' }, { status: 404 })
    }

    const stripe = getStripe()
    let customerId = typedCenter.stripe_customer_id

    // If no customer ID, try to find by email
    if (!customerId && typedCenter.email) {
      const customers = await stripe.customers.list({
        email: typedCenter.email,
        limit: 1,
      })
      if (customers.data.length > 0) {
        customerId = customers.data[0].id
      }
    }

    if (!customerId) {
      return NextResponse.json({
        error: 'No Stripe customer found. Please complete a checkout first.',
        synced: false
      }, { status: 400 })
    }

    // Get active subscriptions for this customer
    let subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active', // Only get active subscriptions
      limit: 10,
    })

    // If no active subscriptions, check for any subscription
    if (subscriptions.data.length === 0) {
      subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: 'all',
        limit: 10,
      })

      if (subscriptions.data.length === 0) {
        return NextResponse.json({
          message: 'No subscriptions found',
          synced: true
        })
      }
    }

    // Sort by created date descending to get the most recent subscription
    subscriptions.data.sort((a, b) => b.created - a.created)
    const subscription = subscriptions.data[0]

    // Determine the plan from the price ID
    let plan = 'starter'
    const priceId = subscription.items.data[0]?.price?.id

    // Check all 4 plan price IDs
    if (priceId === process.env.STRIPE_MICRO_PRICE_ID) {
      plan = 'micro'
    } else if (priceId === process.env.STRIPE_STARTER_PRICE_ID) {
      plan = 'starter'
    } else if (priceId === process.env.STRIPE_STANDARD_PRICE_ID) {
      plan = 'standard'
    } else if (priceId === process.env.STRIPE_PREMIUM_PRICE_ID) {
      plan = 'premium'
    } else {
      // Try to determine plan from product name if price ID doesn't match
      const productId = subscription.items.data[0]?.price?.product
      if (productId) {
        try {
          const product = await stripe.products.retrieve(productId as string)
          const productName = product.name?.toLowerCase() || ''
          if (productName.includes('micro')) plan = 'micro'
          else if (productName.includes('starter')) plan = 'starter'
          else if (productName.includes('standard')) plan = 'standard'
          else if (productName.includes('premium')) plan = 'premium'
        } catch {
          // Could not fetch product details - use default plan
        }
      }
    }

    // Map Stripe status to our status
    const statusMap: Record<string, string> = {
      active: 'active',
      past_due: 'past_due',
      unpaid: 'unpaid',
      canceled: 'cancelled',
      incomplete: 'incomplete',
      incomplete_expired: 'expired',
      trialing: 'trialing',
      paused: 'paused',
    }
    const status = statusMap[subscription.status] || 'inactive'

    // Cast subscription to access properties
    const sub = subscription as unknown as {
      id: string
      current_period_end?: number
      cancel_at_period_end?: boolean
    }

    // Safely create date from current_period_end
    const currentPeriodEnd = sub.current_period_end
      ? new Date(sub.current_period_end * 1000).toISOString()
      : null

    // Update the center with subscription info
    const { error: updateError } = await getServiceClient()
      .from('institutions')
      .update({
        stripe_customer_id: customerId,
        stripe_subscription_id: sub.id,
        subscription_status: status,
        subscription_tier: plan,
        current_period_end: currentPeriodEnd,
        cancel_at_period_end: sub.cancel_at_period_end ?? false,
        updated_at: new Date().toISOString(),
      } as never)
      .eq('id', typedCenter.id)

    if (updateError) {
      console.error('Failed to update subscription:', updateError)
      return NextResponse.json({ error: `Failed to update subscription: ${updateError.message}` }, { status: 500 })
    }

    return NextResponse.json({
      synced: true,
      subscription: {
        status,
        plan,
        currentPeriodEnd,
      },
    })
  } catch (error) {
    console.error('Sync error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: `Failed to sync subscription: ${errorMessage}` }, { status: 500 })
  }
}
// Build timestamp: 1767777023
