import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { verifyWebhookSignature } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'

// Lazy initialization of service role client
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'No signature provided' },
      { status: 400 }
    )
  }

  let event: Stripe.Event

  try {
    event = verifyWebhookSignature(body, signature)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }

  try {
    // Track errors but don't fail silently
    const errors: string[] = []

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        try {
          await handleCheckoutCompleted(session)
        } catch (err) {
          console.error('Error handling checkout.session.completed:', err)
          errors.push(`checkout.session.completed: ${err instanceof Error ? err.message : 'Unknown error'}`)
        }
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        try {
          await handleSubscriptionUpdated(subscription)
        } catch (err) {
          console.error('Error handling subscription update:', err)
          errors.push(`subscription.updated: ${err instanceof Error ? err.message : 'Unknown error'}`)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        try {
          await handleSubscriptionDeleted(subscription)
        } catch (err) {
          console.error('Error handling subscription deletion:', err)
          errors.push(`subscription.deleted: ${err instanceof Error ? err.message : 'Unknown error'}`)
        }
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        try {
          await handlePaymentSucceeded(invoice)
        } catch (err) {
          console.error('Error handling payment succeeded:', err)
          errors.push(`payment.succeeded: ${err instanceof Error ? err.message : 'Unknown error'}`)
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        try {
          await handlePaymentFailed(invoice)
        } catch (err) {
          console.error('Error handling payment failed:', err)
          errors.push(`payment.failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
        }
        break
      }

      default:
        // Unhandled event types are silently ignored
    }

    // If there were errors, return 500 to trigger Stripe retry
    if (errors.length > 0) {
      console.error('Webhook processing errors:', errors)
      return NextResponse.json(
        { error: 'Webhook handler encountered errors', details: errors },
        { status: 500 }
      )
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const institutionId = session.metadata?.institutionId
  const type = session.metadata?.type

  if (!institutionId) {
    console.error('No institutionId in checkout session metadata')
    return
  }

  // Handle SMS credit purchases (one-time payment)
  if (type === 'sms_credits') {
    await handleSMSCreditPurchase(session)
    return
  }

  // Handle subscription checkout
  const plan = session.metadata?.plan
  const customerId = session.customer as string
  const subscriptionId = session.subscription as string

  // Update institution with Stripe customer and subscription info
  const { error } = await getSupabaseAdmin()
    .from('institutions')
    .update({
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      subscription_tier: plan || 'starter',
      subscription_status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('id', institutionId)

  if (error) {
    console.error('Failed to update institution subscription:', error)
    throw error
  }
}

async function handleSMSCreditPurchase(session: Stripe.Checkout.Session) {
  const institutionId = session.metadata?.institutionId
  const packageType = session.metadata?.package
  const creditsStr = session.metadata?.credits
  const credits = creditsStr ? parseInt(creditsStr, 10) : 0

  if (!institutionId || !credits) {
    console.error('Invalid SMS credit purchase metadata')
    return
  }

  // Get current institution credits
  const { data: institution, error: fetchError } = await getSupabaseAdmin()
    .from('institutions')
    .select('sms_credits')
    .eq('id', institutionId)
    .single()

  if (fetchError) {
    console.error('Failed to fetch institution:', fetchError)
    throw fetchError
  }

  const currentCredits = institution?.sms_credits || 0
  const newCredits = currentCredits + credits

  // Update institution's SMS credits
  const { error: updateError } = await getSupabaseAdmin()
    .from('institutions')
    .update({
      sms_credits: newCredits,
      updated_at: new Date().toISOString(),
    })
    .eq('id', institutionId)

  if (updateError) {
    console.error('Failed to update SMS credits:', updateError)
    throw updateError
  }

  // Record the credit transaction
  const { error: txError } = await getSupabaseAdmin()
    .from('sms_credit_transactions')
    .insert({
      institution_id: institutionId,
      type: 'purchase',
      amount: credits,
      balance_after: newCredits,
      description: `Purchased ${packageType} package (${credits} credits)`,
      reference_id: session.id,
    })

  if (txError) {
    console.error('Failed to record SMS credit transaction:', txError)
    // Don't throw - credits were added, just logging failed
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const institutionId = subscription.metadata?.institutionId

  if (!institutionId) {
    // Try to find institution by customer ID
    const customerId = typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer.id

    const { data: institution } = await getSupabaseAdmin()
      .from('institutions')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .single()

    if (!institution) {
      console.error('No institution found for subscription')
      return
    }

    await updateCenterSubscription(institution.id, subscription)
  } else {
    await updateCenterSubscription(institutionId, subscription)
  }
}

async function updateCenterSubscription(institutionId: string, subscription: Stripe.Subscription) {
  const status = mapSubscriptionStatus(subscription.status)

  // Type assertion for subscription properties
  const subscriptionData = subscription as unknown as {
    id: string
    status: string
    metadata?: { plan?: string }
    current_period_end: number
    cancel_at_period_end: boolean
  }

  const { error } = await getSupabaseAdmin()
    .from('institutions')
    .update({
      stripe_subscription_id: subscriptionData.id,
      subscription_status: status,
      subscription_tier: subscriptionData.metadata?.plan || 'starter',
      current_period_end: new Date(subscriptionData.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscriptionData.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    })
    .eq('id', institutionId)

  if (error) {
    console.error('Failed to update subscription:', error)
    throw error
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer.id

  const { data: institution } = await getSupabaseAdmin()
    .from('institutions')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (!institution) {
    console.error('No institution found for deleted subscription')
    return
  }

  const { error } = await getSupabaseAdmin()
    .from('institutions')
    .update({
      subscription_status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', institution.id)

  if (error) {
    console.error('Failed to update cancelled subscription:', error)
    throw error
  }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = typeof invoice.customer === 'string'
    ? invoice.customer
    : invoice.customer?.id

  if (!customerId) return

  // Find the institution by Stripe customer ID
  const { data: institution } = await getSupabaseAdmin()
    .from('institutions')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (!institution) {
    return
  }

  // Type assertion for invoice properties
  const inv = invoice as unknown as {
    id: string
    payment_intent: string | null
    amount_paid: number
    currency: string
    status_transitions?: { paid_at?: number }
    period_start?: number
    period_end?: number
  }

  // Record the payment in subscription_payments table
  const { error: paymentError } = await getSupabaseAdmin()
    .from('subscription_payments')
    .insert({
      institution_id: institution.id,
      stripe_payment_intent_id: inv.payment_intent as string,
      stripe_invoice_id: inv.id,
      amount: inv.amount_paid / 100, // Convert from cents to dollars
      currency: inv.currency || 'nad',
      status: 'succeeded',
      payment_date: new Date(inv.status_transitions?.paid_at ? inv.status_transitions.paid_at * 1000 : Date.now()).toISOString(),
      period_start: inv.period_start ? new Date(inv.period_start * 1000).toISOString() : null,
      period_end: inv.period_end ? new Date(inv.period_end * 1000).toISOString() : null,
    })

  if (paymentError) {
    console.error('Failed to record subscription payment:', paymentError)
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = typeof invoice.customer === 'string'
    ? invoice.customer
    : invoice.customer?.id

  if (!customerId) return

  const { data: institution } = await getSupabaseAdmin()
    .from('institutions')
    .select('id, email, name')
    .eq('stripe_customer_id', customerId)
    .single()

  if (!institution) return

  // Update subscription status to past_due
  await getSupabaseAdmin()
    .from('institutions')
    .update({
      subscription_status: 'past_due',
      updated_at: new Date().toISOString(),
    })
    .eq('id', institution.id)

  // Could add logic here to send payment failure notification
}

function mapSubscriptionStatus(stripeStatus: Stripe.Subscription.Status): string {
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

  return statusMap[stripeStatus] || 'inactive'
}
