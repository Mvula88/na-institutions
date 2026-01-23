-- ============================================
-- ENHANCED STUDENT FIELDS
-- Based on client registration form requirements
-- ============================================

-- Add new fields to students table
ALTER TABLE students
ADD COLUMN IF NOT EXISTS surname VARCHAR(100),
ADD COLUMN IF NOT EXISTS first_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS health_conditions TEXT,
ADD COLUMN IF NOT EXISTS photo_url TEXT,
ADD COLUMN IF NOT EXISTS id_number VARCHAR(50);

-- Person responsible for payment (can be different from parent/guardian)
ALTER TABLE students
ADD COLUMN IF NOT EXISTS payer_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS payer_id_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS payer_phone VARCHAR(50),
ADD COLUMN IF NOT EXISTS payer_relationship VARCHAR(50);

-- Registration fee tracking
ALTER TABLE students
ADD COLUMN IF NOT EXISTS registration_fee_paid BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS registration_fee_amount DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS registration_fee_paid_date DATE;

-- Terms acceptance
ALTER TABLE students
ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS terms_accepted_date TIMESTAMPTZ;

-- ============================================
-- TUTORIAL CENTER SETTINGS
-- For customizable fees and terms per center
-- ============================================

-- Add settings fields to tutorial_centers
ALTER TABLE tutorial_centers
ADD COLUMN IF NOT EXISTS registration_fee DECIMAL(10, 2) DEFAULT 300.00,
ADD COLUMN IF NOT EXISTS late_payment_penalty DECIMAL(10, 2) DEFAULT 70.00,
ADD COLUMN IF NOT EXISTS payment_due_day INT DEFAULT 5,
ADD COLUMN IF NOT EXISTS academic_year_start DATE,
ADD COLUMN IF NOT EXISTS academic_year_end DATE,
ADD COLUMN IF NOT EXISTS terms_and_conditions TEXT;

-- ============================================
-- UPDATE FEE STRUCTURES
-- Add registration fee type
-- ============================================

-- Add penalty tracking to student_fees
ALTER TABLE student_fees
ADD COLUMN IF NOT EXISTS penalty_amount DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS penalty_applied BOOLEAN DEFAULT FALSE;
