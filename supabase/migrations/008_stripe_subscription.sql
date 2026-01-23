-- Add Stripe subscription fields to tutorial_centers table
-- This migration adds columns needed for Stripe subscription management

-- Add Stripe-related columns to tutorial_centers
ALTER TABLE tutorial_centers
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive',
ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT FALSE;

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_tutorial_centers_stripe_customer_id
ON tutorial_centers(stripe_customer_id);

CREATE INDEX IF NOT EXISTS idx_tutorial_centers_stripe_subscription_id
ON tutorial_centers(stripe_subscription_id);

CREATE INDEX IF NOT EXISTS idx_tutorial_centers_subscription_status
ON tutorial_centers(subscription_status);

-- Add constraint for valid subscription statuses
ALTER TABLE tutorial_centers
ADD CONSTRAINT valid_subscription_status
CHECK (subscription_status IN (
  'active',
  'inactive',
  'past_due',
  'cancelled',
  'incomplete',
  'expired',
  'trialing',
  'paused',
  'unpaid'
));

-- Create subscription_payments table for tracking Stripe payments
CREATE TABLE IF NOT EXISTS subscription_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id UUID NOT NULL REFERENCES tutorial_centers(id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT,
  stripe_invoice_id TEXT,
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'zar',
  status TEXT NOT NULL,
  payment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for subscription_payments
CREATE INDEX IF NOT EXISTS idx_subscription_payments_center_id
ON subscription_payments(center_id);

CREATE INDEX IF NOT EXISTS idx_subscription_payments_stripe_invoice_id
ON subscription_payments(stripe_invoice_id);

-- Enable RLS on subscription_payments
ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;

-- Super admin can see all subscription payments
CREATE POLICY "Super admin can view all subscription payments"
ON subscription_payments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'super_admin'
  )
);

-- Center admins can view their own subscription payments
CREATE POLICY "Center admin can view own subscription payments"
ON subscription_payments FOR SELECT
TO authenticated
USING (
  center_id IN (
    SELECT center_id FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'center_admin'
  )
);

COMMENT ON COLUMN tutorial_centers.stripe_customer_id IS 'Stripe customer ID for billing';
COMMENT ON COLUMN tutorial_centers.stripe_subscription_id IS 'Stripe subscription ID';
COMMENT ON COLUMN tutorial_centers.subscription_status IS 'Current subscription status';
COMMENT ON COLUMN tutorial_centers.current_period_end IS 'End of current billing period';
COMMENT ON COLUMN tutorial_centers.cancel_at_period_end IS 'Whether subscription will cancel at period end';
