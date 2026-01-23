-- Create payment_reversals table for audit trail
CREATE TABLE IF NOT EXISTS payment_reversals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  center_id UUID NOT NULL REFERENCES tutorial_centers(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  reason TEXT NOT NULL,
  reversed_by UUID NOT NULL REFERENCES users(id),
  reversed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_payment_reversals_center_id ON payment_reversals(center_id);
CREATE INDEX IF NOT EXISTS idx_payment_reversals_student_id ON payment_reversals(student_id);
CREATE INDEX IF NOT EXISTS idx_payment_reversals_original_payment_id ON payment_reversals(original_payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_reversals_reversed_at ON payment_reversals(reversed_at);

-- Add status column to payments table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'status'
  ) THEN
    ALTER TABLE payments ADD COLUMN status TEXT DEFAULT 'completed';
  END IF;
END $$;

-- Enable RLS on payment_reversals
ALTER TABLE payment_reversals ENABLE ROW LEVEL SECURITY;

-- Super admin can see all reversals
CREATE POLICY "Super admin can view all payment reversals"
ON payment_reversals FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'super_admin'
  )
);

-- Center users can view their own center's reversals
CREATE POLICY "Center users can view own center payment reversals"
ON payment_reversals FOR SELECT
TO authenticated
USING (
  center_id IN (
    SELECT center_id FROM users
    WHERE users.id = auth.uid()
  )
);

-- Only center admins can create reversals
CREATE POLICY "Center admin can create payment reversals"
ON payment_reversals FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('super_admin', 'center_admin')
    AND (users.role = 'super_admin' OR users.center_id = payment_reversals.center_id)
  )
);

COMMENT ON TABLE payment_reversals IS 'Audit trail for reversed payments';
COMMENT ON COLUMN payment_reversals.reason IS 'Reason for the payment reversal';
COMMENT ON COLUMN payment_reversals.reversed_by IS 'User who performed the reversal';
