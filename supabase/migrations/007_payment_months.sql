-- ============================================
-- PAYMENT MONTHS CONFIGURATION
-- ============================================
-- Allows each center to configure which months require student fee payments
-- Default: February (1) to October (9) = 9 months

-- Add payment_months column to tutorial_centers
-- This is an array of month numbers (0 = January, 1 = February, ..., 11 = December)
ALTER TABLE tutorial_centers
ADD COLUMN IF NOT EXISTS payment_months INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5, 6, 7, 8, 9];

-- Add academic_year_start_month (0-11 for Jan-Dec, default February = 1)
ALTER TABLE tutorial_centers
ADD COLUMN IF NOT EXISTS academic_year_start_month INTEGER DEFAULT 1;

-- Add academic_year_end_month (0-11 for Jan-Dec, default October = 9)
ALTER TABLE tutorial_centers
ADD COLUMN IF NOT EXISTS academic_year_end_month INTEGER DEFAULT 9;

-- Add registration_fee column if not exists (some centers may have different registration fees)
ALTER TABLE tutorial_centers
ADD COLUMN IF NOT EXISTS default_registration_fee DECIMAL(10, 2) DEFAULT 0;

-- Comment on the columns for clarity
COMMENT ON COLUMN tutorial_centers.payment_months IS 'Array of month numbers (0-11) that require fee payments. Default: Feb-Oct (1-9)';
COMMENT ON COLUMN tutorial_centers.academic_year_start_month IS 'Month number (0-11) when academic year starts. Default: February (1)';
COMMENT ON COLUMN tutorial_centers.academic_year_end_month IS 'Month number (0-11) when academic year ends. Default: October (9)';
