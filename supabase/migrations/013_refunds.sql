-- Migration: Add refunds table for tracking student refunds
-- This allows tutorial centers to process and track refunds with proper audit trails

-- Create refund_reason enum type
DO $$ BEGIN
  CREATE TYPE refund_reason AS ENUM (
    'relocation',
    'medical',
    'financial_hardship',
    'schedule_conflicts',
    'dissatisfaction',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create refunds table
CREATE TABLE IF NOT EXISTS refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id UUID NOT NULL REFERENCES tutorial_centers(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  original_payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  reason refund_reason NOT NULL,
  reason_notes TEXT,
  student_status_updated BOOLEAN DEFAULT FALSE,
  processed_by UUID NOT NULL REFERENCES users(id),
  refund_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_refunds_center_id ON refunds(center_id);
CREATE INDEX IF NOT EXISTS idx_refunds_student_id ON refunds(student_id);
CREATE INDEX IF NOT EXISTS idx_refunds_original_payment_id ON refunds(original_payment_id);
CREATE INDEX IF NOT EXISTS idx_refunds_refund_date ON refunds(refund_date DESC);

-- Enable RLS
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Only super_admin and center_admin can manage refunds

-- Super admin can do everything
CREATE POLICY "Super admins can manage all refunds"
  ON refunds
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  );

-- Center admins can manage refunds for their center only
CREATE POLICY "Center admins can manage their center refunds"
  ON refunds
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'center_admin'
      AND users.center_id = refunds.center_id
    )
  );

-- Center staff can view refunds (read-only) for their center
CREATE POLICY "Center staff can view their center refunds"
  ON refunds
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'center_staff'
      AND users.center_id = refunds.center_id
    )
  );

-- Add comment for documentation
COMMENT ON TABLE refunds IS 'Tracks refunds issued to students with reasons and audit trail';
COMMENT ON COLUMN refunds.reason IS 'Predefined reason: relocation, medical, financial_hardship, schedule_conflicts, dissatisfaction, other';
COMMENT ON COLUMN refunds.reason_notes IS 'Additional notes, required when reason is other';
COMMENT ON COLUMN refunds.student_status_updated IS 'Whether the student status was updated to withdrawn when processing this refund';
