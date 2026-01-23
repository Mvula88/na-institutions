-- Add credit_balance field to students table
-- This tracks overpayments/surplus amounts that can be applied to future fees

ALTER TABLE students
ADD COLUMN IF NOT EXISTS credit_balance DECIMAL(10,2) DEFAULT 0;

-- Add comment to explain the field
COMMENT ON COLUMN students.credit_balance IS 'Stores overpayment/surplus amounts that can be applied to future fees';

-- Create index for quick lookups of students with credit
CREATE INDEX IF NOT EXISTS idx_students_credit_balance ON students(credit_balance) WHERE credit_balance > 0;
