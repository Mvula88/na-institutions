-- Migration: Add support for multiple fee models
-- Models: monthly_per_course, per_course_lumpsum, per_semester

-- =====================================================
-- 1. Fee Model Type for Institutions
-- =====================================================

-- Create fee model enum type
DO $$ BEGIN
    CREATE TYPE fee_model_type AS ENUM ('monthly_per_course', 'per_course_lumpsum', 'per_semester');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add fee model column to institutions
ALTER TABLE institutions
ADD COLUMN IF NOT EXISTS fee_model fee_model_type NOT NULL DEFAULT 'monthly_per_course';

-- =====================================================
-- 2. Semesters Table (for per_semester model)
-- =====================================================

CREATE TABLE IF NOT EXISTS semesters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,  -- e.g., "Semester 1 2025", "Term 1 2025"
    year INTEGER NOT NULL,
    semester_number INTEGER NOT NULL,  -- 1, 2, 3 (for trimesters)
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    fee_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    registration_deadline DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(institution_id, year, semester_number)
);

-- Indexes for semesters
CREATE INDEX IF NOT EXISTS idx_semesters_institution_id ON semesters(institution_id);
CREATE INDEX IF NOT EXISTS idx_semesters_year ON semesters(year);
CREATE INDEX IF NOT EXISTS idx_semesters_active ON semesters(is_active) WHERE is_active = true;

-- =====================================================
-- 3. Course Fee Extensions (for per_course_lumpsum model)
-- =====================================================

-- Add lump sum fee fields to courses
ALTER TABLE courses
ADD COLUMN IF NOT EXISTS total_course_fee DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS allow_installments BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS default_installments INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS duration_months INTEGER DEFAULT 12;

-- Course installment plans table
CREATE TABLE IF NOT EXISTS course_installment_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,  -- NULL for institution-wide templates
    name VARCHAR(100) NOT NULL,  -- e.g., "Full Payment", "2 Installments", "Monthly"
    description TEXT,
    num_installments INTEGER NOT NULL,
    installment_percentages DECIMAL(5,2)[] NOT NULL,  -- e.g., [50, 50] or [100] or [25,25,25,25]
    is_template BOOLEAN DEFAULT FALSE,  -- If true, can be applied to any course
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT valid_installment_count CHECK (
        array_length(installment_percentages, 1) = num_installments
    )
    -- Note: Percentage sum validation should be done at application level
    -- PostgreSQL doesn't support subqueries in CHECK constraints
);

-- Index for installment plans
CREATE INDEX IF NOT EXISTS idx_installment_plans_institution ON course_installment_plans(institution_id);
CREATE INDEX IF NOT EXISTS idx_installment_plans_course ON course_installment_plans(course_id);

-- =====================================================
-- 4. Student Course Fees (for per_course_lumpsum model)
-- =====================================================

CREATE TABLE IF NOT EXISTS student_course_fees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    enrollment_id UUID REFERENCES student_enrollments(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    installment_plan_id UUID REFERENCES course_installment_plans(id) ON DELETE SET NULL,

    -- Fee details
    total_course_fee DECIMAL(10, 2) NOT NULL,
    installment_number INTEGER NOT NULL,  -- 1, 2, 3...
    installment_amount DECIMAL(10, 2) NOT NULL,
    amount_paid DECIMAL(10, 2) DEFAULT 0,
    balance DECIMAL(10, 2) GENERATED ALWAYS AS (installment_amount - amount_paid) STORED,

    -- Dates
    due_date DATE NOT NULL,
    paid_date DATE,

    -- Status
    status VARCHAR(20) DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'partial', 'paid')),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(enrollment_id, installment_number)
);

-- Indexes for student course fees
CREATE INDEX IF NOT EXISTS idx_student_course_fees_institution ON student_course_fees(institution_id);
CREATE INDEX IF NOT EXISTS idx_student_course_fees_student ON student_course_fees(student_id);
CREATE INDEX IF NOT EXISTS idx_student_course_fees_enrollment ON student_course_fees(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_student_course_fees_status ON student_course_fees(status);

-- =====================================================
-- 5. Student Semester Fees (for per_semester model)
-- =====================================================

CREATE TABLE IF NOT EXISTS student_semester_fees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    semester_id UUID NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,

    -- Fee details
    amount_due DECIMAL(10, 2) NOT NULL,
    amount_paid DECIMAL(10, 2) DEFAULT 0,
    balance DECIMAL(10, 2) GENERATED ALWAYS AS (amount_due - amount_paid) STORED,

    -- Dates
    due_date DATE NOT NULL,
    paid_date DATE,

    -- Status
    status VARCHAR(20) DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'partial', 'paid')),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(student_id, semester_id)
);

-- Indexes for student semester fees
CREATE INDEX IF NOT EXISTS idx_student_semester_fees_institution ON student_semester_fees(institution_id);
CREATE INDEX IF NOT EXISTS idx_student_semester_fees_student ON student_semester_fees(student_id);
CREATE INDEX IF NOT EXISTS idx_student_semester_fees_semester ON student_semester_fees(semester_id);
CREATE INDEX IF NOT EXISTS idx_student_semester_fees_status ON student_semester_fees(status);

-- =====================================================
-- 6. Update student_fees for unified tracking
-- =====================================================

-- Add source tracking columns to existing student_fees table
ALTER TABLE student_fees
ADD COLUMN IF NOT EXISTS source_type VARCHAR(50) DEFAULT 'monthly',  -- 'monthly', 'course_installment', 'semester'
ADD COLUMN IF NOT EXISTS source_id UUID;  -- Reference to student_course_fees or student_semester_fees

-- Index for source tracking
CREATE INDEX IF NOT EXISTS idx_student_fees_source ON student_fees(source_type, source_id);

-- =====================================================
-- 7. Row Level Security Policies
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_installment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_course_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_semester_fees ENABLE ROW LEVEL SECURITY;

-- RLS Policies for semesters
DROP POLICY IF EXISTS "Users can view their institution semesters" ON semesters;
CREATE POLICY "Users can view their institution semesters"
    ON semesters FOR SELECT
    USING (institution_id IN (
        SELECT institution_id FROM users WHERE id = auth.uid()
    ));

DROP POLICY IF EXISTS "Admins can manage semesters" ON semesters;
CREATE POLICY "Admins can manage semesters"
    ON semesters FOR ALL
    USING (institution_id IN (
        SELECT institution_id FROM users WHERE id = auth.uid() AND role IN ('institution_admin', 'super_admin')
    ));

-- RLS Policies for course_installment_plans
DROP POLICY IF EXISTS "Users can view their institution installment plans" ON course_installment_plans;
CREATE POLICY "Users can view their institution installment plans"
    ON course_installment_plans FOR SELECT
    USING (institution_id IN (
        SELECT institution_id FROM users WHERE id = auth.uid()
    ));

DROP POLICY IF EXISTS "Admins can manage installment plans" ON course_installment_plans;
CREATE POLICY "Admins can manage installment plans"
    ON course_installment_plans FOR ALL
    USING (institution_id IN (
        SELECT institution_id FROM users WHERE id = auth.uid() AND role IN ('institution_admin', 'super_admin')
    ));

-- RLS Policies for student_course_fees
DROP POLICY IF EXISTS "Users can view their institution student course fees" ON student_course_fees;
CREATE POLICY "Users can view their institution student course fees"
    ON student_course_fees FOR SELECT
    USING (institution_id IN (
        SELECT institution_id FROM users WHERE id = auth.uid()
    ));

DROP POLICY IF EXISTS "Admins can manage student course fees" ON student_course_fees;
CREATE POLICY "Admins can manage student course fees"
    ON student_course_fees FOR ALL
    USING (institution_id IN (
        SELECT institution_id FROM users WHERE id = auth.uid() AND role IN ('institution_admin', 'super_admin')
    ));

-- RLS Policies for student_semester_fees
DROP POLICY IF EXISTS "Users can view their institution student semester fees" ON student_semester_fees;
CREATE POLICY "Users can view their institution student semester fees"
    ON student_semester_fees FOR SELECT
    USING (institution_id IN (
        SELECT institution_id FROM users WHERE id = auth.uid()
    ));

DROP POLICY IF EXISTS "Admins can manage student semester fees" ON student_semester_fees;
CREATE POLICY "Admins can manage student semester fees"
    ON student_semester_fees FOR ALL
    USING (institution_id IN (
        SELECT institution_id FROM users WHERE id = auth.uid() AND role IN ('institution_admin', 'super_admin')
    ));

-- =====================================================
-- 8. Triggers for updated_at
-- =====================================================

-- Trigger for semesters
DROP TRIGGER IF EXISTS update_semesters_updated_at ON semesters;
CREATE TRIGGER update_semesters_updated_at
    BEFORE UPDATE ON semesters
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Trigger for student_course_fees
DROP TRIGGER IF EXISTS update_student_course_fees_updated_at ON student_course_fees;
CREATE TRIGGER update_student_course_fees_updated_at
    BEFORE UPDATE ON student_course_fees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Trigger for student_semester_fees
DROP TRIGGER IF EXISTS update_student_semester_fees_updated_at ON student_semester_fees;
CREATE TRIGGER update_student_semester_fees_updated_at
    BEFORE UPDATE ON student_semester_fees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- 9. Insert Default Installment Plan Templates
-- =====================================================

-- Note: These will be created per-institution when they select lump sum model
-- This is just a reference for what templates to create

COMMENT ON TABLE course_installment_plans IS 'Default templates to create for each institution:
1. Full Payment (1 installment, 100%)
2. Two Installments (2 installments, 50%/50%)
3. Three Installments (3 installments, 40%/30%/30%)
4. Four Installments (4 installments, 25%/25%/25%/25%)
5. Monthly (based on course duration)';
