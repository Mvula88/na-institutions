import Stripe from 'stripe'
import {
  SUBSCRIPTION_PLANS as PRICING_PLANS,
  SMS_CREDIT_PACKAGES as PRICING_SMS_PACKAGES,
  type SubscriptionPlanId,
  type SMSPackageId,
} from './pricing'

// Lazy initialize Stripe to avoid build-time errors when env vars not set
let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not configured')
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-12-15.clover',
      typescript: true,
    })
  }
  return _stripe
}

/**
 * Subscription Plans Configuration
 * Prices are in Namibian Dollars (NAD)
 *
 * IMPORTANT: You must create these price IDs in your Stripe Dashboard:
 * - Create a product for each tier (Micro, Starter, Standard, Premium)
 * - Set the recurring price in NAD (or your configured currency)
 * - Copy the price IDs to your .env file
 */
export const SUBSCRIPTION_PLANS = {
  micro: {
    name: PRICING_PLANS.micro.name,
    description: PRICING_PLANS.micro.tagline,
    priceId: process.env.STRIPE_MICRO_PRICE_ID!,
    monthlyPrice: PRICING_PLANS.micro.monthlyPrice,  // N$99
    annualPrice: PRICING_PLANS.micro.annualPrice,    // N$990
    setupFee: 0,
    maxStudents: PRICING_PLANS.micro.maxStudents,
    maxStaff: PRICING_PLANS.micro.maxStaff,
    features: PRICING_PLANS.micro.features,
  },
  starter: {
    name: PRICING_PLANS.starter.name,
    description: PRICING_PLANS.starter.tagline,
    priceId: process.env.STRIPE_STARTER_PRICE_ID!,
    monthlyPrice: PRICING_PLANS.starter.monthlyPrice,  // N$299
    annualPrice: PRICING_PLANS.starter.annualPrice,    // N$2,990
    setupFee: 0,
    maxStudents: PRICING_PLANS.starter.maxStudents,
    maxStaff: PRICING_PLANS.starter.maxStaff,
    features: PRICING_PLANS.starter.features,
  },
  standard: {
    name: PRICING_PLANS.standard.name,
    description: PRICING_PLANS.standard.tagline,
    priceId: process.env.STRIPE_STANDARD_PRICE_ID!,
    monthlyPrice: PRICING_PLANS.standard.monthlyPrice,  // N$699
    annualPrice: PRICING_PLANS.standard.annualPrice,    // N$6,990
    setupFee: 0,
    maxStudents: PRICING_PLANS.standard.maxStudents,
    maxStaff: PRICING_PLANS.standard.maxStaff,
    features: PRICING_PLANS.standard.features,
  },
  premium: {
    name: PRICING_PLANS.premium.name,
    description: PRICING_PLANS.premium.tagline,
    priceId: process.env.STRIPE_PREMIUM_PRICE_ID!,
    monthlyPrice: PRICING_PLANS.premium.monthlyPrice,  // N$1,499
    annualPrice: PRICING_PLANS.premium.annualPrice,    // N$14,990
    setupFee: 0,
    maxStudents: PRICING_PLANS.premium.maxStudents,    // -1 = Unlimited
    maxStaff: PRICING_PLANS.premium.maxStaff,          // -1 = Unlimited
    features: PRICING_PLANS.premium.features,
  },
} as const

export type SubscriptionPlan = keyof typeof SUBSCRIPTION_PLANS

/**
 * SMS Credit Packages - One-time purchases
 * Prices are in Namibian Dollars (NAD)
 */
export const SMS_CREDIT_PACKAGES = {
  small: {
    name: PRICING_SMS_PACKAGES.small.name,
    credits: PRICING_SMS_PACKAGES.small.credits,
    priceId: process.env.STRIPE_SMS_SMALL_PRICE_ID || '',
    price: PRICING_SMS_PACKAGES.small.price,  // N$75
  },
  medium: {
    name: PRICING_SMS_PACKAGES.medium.name,
    credits: PRICING_SMS_PACKAGES.medium.credits,
    priceId: process.env.STRIPE_SMS_MEDIUM_PRICE_ID || '',
    price: PRICING_SMS_PACKAGES.medium.price,  // N$300
  },
  large: {
    name: PRICING_SMS_PACKAGES.large.name,
    credits: PRICING_SMS_PACKAGES.large.credits,
    priceId: process.env.STRIPE_SMS_LARGE_PRICE_ID || '',
    price: PRICING_SMS_PACKAGES.large.price,  // N$500
  },
  bulk: {
    name: PRICING_SMS_PACKAGES.bulk.name,
    credits: PRICING_SMS_PACKAGES.bulk.credits,
    priceId: process.env.STRIPE_SMS_BULK_PRICE_ID || '',
    price: PRICING_SMS_PACKAGES.bulk.price,  // N$2,000
  },
} as const

export type SMSCreditPackage = keyof typeof SMS_CREDIT_PACKAGES

// Re-export pricing types for convenience
export type { SubscriptionPlanId, SMSPackageId }

/**
 * Create a Stripe Checkout Session for subscription
 */
export async function createCheckoutSession({
  institutionId,
  institutionEmail,
  institutionName,
  plan,
  successUrl,
  cancelUrl,
}: {
  institutionId: string
  institutionEmail: string
  institutionName: string
  plan: SubscriptionPlan
  successUrl: string
  cancelUrl: string
}) {
  const planConfig = SUBSCRIPTION_PLANS[plan]

  // Create line items for the subscription
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    {
      price: planConfig.priceId,
      quantity: 1,
    },
  ]

  // Build session params
  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: 'subscription',
    payment_method_types: ['card'],
    customer_email: institutionEmail,
    client_reference_id: institutionId,
    line_items: lineItems,
    success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl,
    metadata: {
      institutionId,
      institutionName,
      plan,
      setupFee: planConfig.setupFee.toString(), // Store setup fee for webhook to handle
    },
    subscription_data: {
      metadata: {
        institutionId,
        plan,
      },
    },
    allow_promotion_codes: true,
    billing_address_collection: 'required',
  }

  const session = await getStripe().checkout.sessions.create(sessionParams)

  return session
}

/**
 * Create a Stripe Checkout Session for SMS Credits (one-time payment)
 */
export async function createSMSCreditCheckoutSession({
  institutionId,
  institutionEmail,
  institutionName,
  packageType,
  successUrl,
  cancelUrl,
}: {
  institutionId: string
  institutionEmail: string
  institutionName: string
  packageType: SMSCreditPackage
  successUrl: string
  cancelUrl: string
}) {
  const packageConfig = SMS_CREDIT_PACKAGES[packageType]

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: 'payment',
    payment_method_types: ['card'],
    customer_email: institutionEmail,
    client_reference_id: institutionId,
    line_items: [
      {
        price_data: {
          currency: 'nad',
          product_data: {
            name: packageConfig.name,
            description: `${packageConfig.credits} SMS credits for ${institutionName}`,
          },
          unit_amount: packageConfig.price * 100, // Convert to cents
        },
        quantity: 1,
      },
    ],
    success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl,
    metadata: {
      institutionId,
      institutionName,
      type: 'sms_credits',
      package: packageType,
      credits: packageConfig.credits.toString(),
    },
  }

  const session = await getStripe().checkout.sessions.create(sessionParams)
  return session
}

/**
 * Create a Stripe Customer Portal Session
 */
export async function createCustomerPortalSession({
  customerId,
  returnUrl,
}: {
  customerId: string
  returnUrl: string
}) {
  const session = await getStripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  })

  return session
}

/**
 * Get subscription details
 */
export async function getSubscription(subscriptionId: string) {
  const subscription = await getStripe().subscriptions.retrieve(subscriptionId, {
    expand: ['customer', 'default_payment_method'],
  })

  return subscription
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(subscriptionId: string) {
  const subscription = await getStripe().subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  })

  return subscription
}

/**
 * Reactivate cancelled subscription
 */
export async function reactivateSubscription(subscriptionId: string) {
  const subscription = await getStripe().subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  })

  return subscription
}

/**
 * Get customer by email
 */
export async function getCustomerByEmail(email: string) {
  const customers = await getStripe().customers.list({
    email,
    limit: 1,
  })

  return customers.data[0] || null
}

/**
 * Create or get Stripe customer
 */
export async function createOrGetCustomer({
  email,
  name,
  metadata,
}: {
  email: string
  name: string
  metadata?: Record<string, string>
}) {
  // Check if customer already exists
  const existingCustomer = await getCustomerByEmail(email)

  if (existingCustomer) {
    return existingCustomer
  }

  // Create new customer
  const customer = await getStripe().customers.create({
    email,
    name,
    metadata,
  })

  return customer
}

/**
 * Verify Stripe webhook signature
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  return getStripe().webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  )
}
