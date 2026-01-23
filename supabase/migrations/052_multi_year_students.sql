-- Migration: Multi-Year Student Journey System
-- Supports program enrollment, re-registration, year progression, transcripts, and cohorts

-- =====================================================
-- 1. Academic Years Table
-- =====================================================

CREATE TABLE IF NOT EXISTS academic_years (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,                -- e.g., "2026", "2026/2027"
    year INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_current BOOLEAN DEFAULT FALSE,
    registration_open_date DATE,
    registration_close_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(institution_id, year)
);

-- Indexes for academic_years
CREATE INDEX IF NOT EXISTS idx_academic_years_institution ON academic_years(institution_id);
CREATE INDEX IF NOT EXISTS idx_academic_years_current ON academic_years(is_current) WHERE is_current = true;

-- =====================================================
-- 2. Program Enrollments Table
-- Links students to programs with year/level tracking
-- =====================================================

CREATE TABLE IF NOT EXISTS program_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,

    -- Cohort/Intake tracking
    intake_year INTEGER NOT NULL,
    cohort_name VARCHAR(50),                  -- e.g., "2026 January Intake"

    -- Year/Level progression
    current_year INTEGER NOT NULL DEFAULT 1,

    -- Status tracking
    status VARCHAR(30) NOT NULL DEFAULT 'enrolled'
        CHECK (status IN ('enrolled', 'deferred', 'suspended', 'completed', 'withdrawn')),

    -- Dates
    enrollment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_completion_date DATE,
    actual_completion_date DATE,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(student_id, program_id)
);

-- Indexes for program_enrollments
CREATE INDEX IF NOT EXISTS idx_program_enrollments_institution ON program_enrollments(institution_id);
CREATE INDEX IF NOT EXISTS idx_program_enrollments_student ON program_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_program_enrollments_program ON program_enrollments(program_id);
CREATE INDEX IF NOT EXISTS idx_program_enrollments_intake ON program_enrollments(intake_year);
CREATE INDEX IF NOT EXISTS idx_program_enrollments_status ON program_enrollments(status);

-- =====================================================
-- 3. Program Year Registrations Table
-- Tracks each year's registration for a student
-- =====================================================

CREATE TABLE IF NOT EXISTS program_year_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    program_enrollment_id UUID NOT NULL REFERENCES program_enrollments(id) ON DELETE CASCADE,
    academic_year_id UUID NOT NULL REFERENCES academic_years(id),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,

    -- Year info
    year_of_study INTEGER NOT NULL,           -- 1, 2, 3...

    -- Registration status
    registration_status VARCHAR(30) NOT NULL DEFAULT 'registered'
        CHECK (registration_status IN ('pending', 'registered', 'confirmed', 'cancelled')),

    -- Year completion tracking
    year_status VARCHAR(30) DEFAULT 'in_progress'
        CHECK (year_status IN ('in_progress', 'passed', 'failed', 'incomplete', 'deferred')),
    year_average DECIMAL(5,2),
    credits_earned INTEGER DEFAULT 0,

    -- Fee tracking
    registration_fee_paid BOOLEAN DEFAULT FALSE,
    tuition_fee_generated BOOLEAN DEFAULT FALSE,

    -- Dates
    registered_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(program_enrollment_id, academic_year_id)
);

-- Indexes for program_year_registrations
CREATE INDEX IF NOT EXISTS idx_year_registrations_institution ON program_year_registrations(institution_id);
CREATE INDEX IF NOT EXISTS idx_year_registrations_enrollment ON program_year_registrations(program_enrollment_id);
CREATE INDEX IF NOT EXISTS idx_year_registrations_academic_year ON program_year_registrations(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_year_registrations_student ON program_year_registrations(student_id);
CREATE INDEX IF NOT EXISTS idx_year_registrations_status ON program_year_registrations(year_status);

-- =====================================================
-- 4. Program Courses Table
-- Links courses to programs by year of study
-- =====================================================

CREATE TABLE IF NOT EXISTS program_courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,

    -- Course positioning
    year_of_study INTEGER NOT NULL,           -- Which year this course belongs to
    semester INTEGER DEFAULT 1,                -- Which semester (1 or 2)
    is_compulsory BOOLEAN DEFAULT TRUE,        -- Core vs elective

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(program_id, course_id)
);

-- Indexes for program_courses
CREATE INDEX IF NOT EXISTS idx_program_courses_institution ON program_courses(institution_id);
CREATE INDEX IF NOT EXISTS idx_program_courses_program ON program_courses(program_id);
CREATE INDEX IF NOT EXISTS idx_program_courses_course ON program_courses(course_id);
CREATE INDEX IF NOT EXISTS idx_program_courses_year ON program_courses(year_of_study);

-- =====================================================
-- 5. Alter Students Table
-- =====================================================

ALTER TABLE students
ADD COLUMN IF NOT EXISTS current_year_of_study INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS intake_year INTEGER;

-- =====================================================
-- 6. Alter Student Enrollments Table
-- =====================================================

ALTER TABLE student_enrollments
ADD COLUMN IF NOT EXISTS academic_year_id UUID REFERENCES academic_years(id),
ADD COLUMN IF NOT EXISTS year_of_study INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS program_year_registration_id UUID REFERENCES program_year_registrations(id);

-- Index for new columns
CREATE INDEX IF NOT EXISTS idx_student_enrollments_academic_year ON student_enrollments(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_student_enrollments_year_of_study ON student_enrollments(year_of_study);

-- =====================================================
-- 7. Row Level Security Policies
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_year_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_courses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for academic_years
DROP POLICY IF EXISTS "Users can view their institution academic years" ON academic_years;
CREATE POLICY "Users can view their institution academic years"
    ON academic_years FOR SELECT
    USING (institution_id IN (
        SELECT institution_id FROM users WHERE id = auth.uid()
    ));

DROP POLICY IF EXISTS "Admins can manage academic years" ON academic_years;
CREATE POLICY "Admins can manage academic years"
    ON academic_years FOR ALL
    USING (institution_id IN (
        SELECT institution_id FROM users WHERE id = auth.uid() AND role IN ('institution_admin', 'super_admin')
    ));

-- RLS Policies for program_enrollments
DROP POLICY IF EXISTS "Users can view their institution program enrollments" ON program_enrollments;
CREATE POLICY "Users can view their institution program enrollments"
    ON program_enrollments FOR SELECT
    USING (institution_id IN (
        SELECT institution_id FROM users WHERE id = auth.uid()
    ));

DROP POLICY IF EXISTS "Admins can manage program enrollments" ON program_enrollments;
CREATE POLICY "Admins can manage program enrollments"
    ON program_enrollments FOR ALL
    USING (institution_id IN (
        SELECT institution_id FROM users WHERE id = auth.uid() AND role IN ('institution_admin', 'super_admin')
    ));

-- RLS Policies for program_year_registrations
DROP POLICY IF EXISTS "Users can view their institution year registrations" ON program_year_registrations;
CREATE POLICY "Users can view their institution year registrations"
    ON program_year_registrations FOR SELECT
    USING (institution_id IN (
        SELECT institution_id FROM users WHERE id = auth.uid()
    ));

DROP POLICY IF EXISTS "Admins can manage year registrations" ON program_year_registrations;
CREATE POLICY "Admins can manage year registrations"
    ON program_year_registrations FOR ALL
    USING (institution_id IN (
        SELECT institution_id FROM users WHERE id = auth.uid() AND role IN ('institution_admin', 'super_admin')
    ));

-- RLS Policies for program_courses
DROP POLICY IF EXISTS "Users can view their institution program courses" ON program_courses;
CREATE POLICY "Users can view their institution program courses"
    ON program_courses FOR SELECT
    USING (institution_id IN (
        SELECT institution_id FROM users WHERE id = auth.uid()
    ));

DROP POLICY IF EXISTS "Admins can manage program courses" ON program_courses;
CREATE POLICY "Admins can manage program courses"
    ON program_courses FOR ALL
    USING (institution_id IN (
        SELECT institution_id FROM users WHERE id = auth.uid() AND role IN ('institution_admin', 'super_admin')
    ));

-- =====================================================
-- 8. Triggers for updated_at
-- =====================================================

-- Trigger for academic_years
DROP TRIGGER IF EXISTS update_academic_years_updated_at ON academic_years;
CREATE TRIGGER update_academic_years_updated_at
    BEFORE UPDATE ON academic_years
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Trigger for program_enrollments
DROP TRIGGER IF EXISTS update_program_enrollments_updated_at ON program_enrollments;
CREATE TRIGGER update_program_enrollments_updated_at
    BEFORE UPDATE ON program_enrollments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Trigger for program_year_registrations
DROP TRIGGER IF EXISTS update_program_year_registrations_updated_at ON program_year_registrations;
CREATE TRIGGER update_program_year_registrations_updated_at
    BEFORE UPDATE ON program_year_registrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- 9. Helper Function: Ensure only one current academic year per institution
-- =====================================================

CREATE OR REPLACE FUNCTION ensure_single_current_academic_year()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_current = TRUE THEN
        UPDATE academic_years
        SET is_current = FALSE
        WHERE institution_id = NEW.institution_id
        AND id != NEW.id
        AND is_current = TRUE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ensure_single_current_academic_year_trigger ON academic_years;
CREATE TRIGGER ensure_single_current_academic_year_trigger
    BEFORE INSERT OR UPDATE ON academic_years
    FOR EACH ROW
    WHEN (NEW.is_current = TRUE)
    EXECUTE FUNCTION ensure_single_current_academic_year();

-- =====================================================
-- 10. Comments
-- =====================================================

COMMENT ON TABLE academic_years IS 'Defines academic year periods for each institution';
COMMENT ON TABLE program_enrollments IS 'Links students to programs with year/level tracking and cohort info';
COMMENT ON TABLE program_year_registrations IS 'Tracks each year registration for students in programs';
COMMENT ON TABLE program_courses IS 'Defines which courses belong to which year of a program';

COMMENT ON COLUMN program_enrollments.intake_year IS 'Year the student started the program (cohort identifier)';
COMMENT ON COLUMN program_enrollments.current_year IS 'Current year of study (1, 2, 3, etc.)';
COMMENT ON COLUMN program_year_registrations.year_of_study IS 'The year being registered for (1, 2, 3, etc.)';
COMMENT ON COLUMN program_year_registrations.year_status IS 'Outcome of the academic year';
COMMENT ON COLUMN program_courses.is_compulsory IS 'True for core courses, false for electives';
