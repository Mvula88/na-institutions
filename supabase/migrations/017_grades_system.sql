-- ============================================
-- GRADES/MARKS RECORDING SYSTEM
-- Track student marks and assessments per subject
-- ============================================

-- Assessment type enum
CREATE TYPE assessment_type AS ENUM ('test', 'exam', 'quiz', 'assignment', 'project', 'practical', 'other');

-- ============================================
-- ASSESSMENTS
-- Represents a test/exam/assignment
-- ============================================

CREATE TABLE assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    center_id UUID NOT NULL REFERENCES tutorial_centers(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,

    -- Assessment details
    name VARCHAR(255) NOT NULL,
    description TEXT,
    assessment_type assessment_type NOT NULL DEFAULT 'test',

    -- Scoring
    max_marks DECIMAL(10, 2) NOT NULL DEFAULT 100,
    pass_mark DECIMAL(10, 2) DEFAULT 50,
    weight DECIMAL(5, 2) DEFAULT 100, -- Weight for calculating final grade (percentage)

    -- Date
    assessment_date DATE NOT NULL DEFAULT CURRENT_DATE,

    -- Term/Period (optional)
    term VARCHAR(50), -- e.g., "Term 1", "Q1", "First Semester"
    academic_year VARCHAR(10), -- e.g., "2024"

    -- Status
    is_published BOOLEAN DEFAULT FALSE,

    -- Metadata
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- STUDENT GRADES
-- Individual student marks for each assessment
-- ============================================

CREATE TABLE student_grades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    center_id UUID NOT NULL REFERENCES tutorial_centers(id) ON DELETE CASCADE,
    assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,

    -- Marks
    marks_obtained DECIMAL(10, 2),
    percentage DECIMAL(5, 2), -- Calculated in application layer

    -- Grade (A, B, C, etc.) - can be auto-calculated or manually set
    grade VARCHAR(10),

    -- Status
    status VARCHAR(20) DEFAULT 'graded', -- 'graded', 'absent', 'excused', 'pending'

    -- Feedback
    feedback TEXT,

    -- Metadata
    graded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    graded_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure one grade per student per assessment
    UNIQUE(assessment_id, student_id)
);

-- ============================================
-- GRADE SCALE (Optional - for letter grades)
-- ============================================

CREATE TABLE grade_scales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    center_id UUID NOT NULL REFERENCES tutorial_centers(id) ON DELETE CASCADE,

    name VARCHAR(50) NOT NULL, -- e.g., "Standard", "CAPS", "IEB"
    is_default BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE grade_scale_levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grade_scale_id UUID NOT NULL REFERENCES grade_scales(id) ON DELETE CASCADE,

    grade VARCHAR(10) NOT NULL, -- e.g., "A", "B", "C"
    description VARCHAR(100), -- e.g., "Outstanding", "Achieved"
    min_percentage DECIMAL(5, 2) NOT NULL,
    max_percentage DECIMAL(5, 2) NOT NULL,
    points DECIMAL(5, 2), -- GPA points if applicable

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX idx_assessments_center_id ON assessments(center_id);
CREATE INDEX idx_assessments_subject_id ON assessments(subject_id);
CREATE INDEX idx_assessments_date ON assessments(assessment_date);
CREATE INDEX idx_assessments_type ON assessments(assessment_type);

CREATE INDEX idx_student_grades_center_id ON student_grades(center_id);
CREATE INDEX idx_student_grades_assessment_id ON student_grades(assessment_id);
CREATE INDEX idx_student_grades_student_id ON student_grades(student_id);

CREATE INDEX idx_grade_scales_center_id ON grade_scales(center_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE grade_scales ENABLE ROW LEVEL SECURITY;
ALTER TABLE grade_scale_levels ENABLE ROW LEVEL SECURITY;

-- Assessments policies
CREATE POLICY "Super admins can do everything with assessments"
    ON assessments FOR ALL
    USING (is_super_admin());

CREATE POLICY "Center users can manage their assessments"
    ON assessments FOR ALL
    USING (center_id = get_user_center_id());

-- Student Grades policies
CREATE POLICY "Super admins can do everything with student_grades"
    ON student_grades FOR ALL
    USING (is_super_admin());

CREATE POLICY "Center users can manage their student grades"
    ON student_grades FOR ALL
    USING (center_id = get_user_center_id());

-- Grade Scales policies
CREATE POLICY "Super admins can do everything with grade_scales"
    ON grade_scales FOR ALL
    USING (is_super_admin());

CREATE POLICY "Center users can manage their grade scales"
    ON grade_scales FOR ALL
    USING (center_id = get_user_center_id());

-- Grade Scale Levels policies
CREATE POLICY "Super admins can do everything with grade_scale_levels"
    ON grade_scale_levels FOR ALL
    USING (is_super_admin());

CREATE POLICY "Center users can view their grade scale levels"
    ON grade_scale_levels FOR SELECT
    USING (
        (SELECT center_id FROM grade_scales WHERE id = grade_scale_id) = get_user_center_id()
    );

CREATE POLICY "Center users can manage their grade scale levels"
    ON grade_scale_levels FOR ALL
    USING (
        (SELECT center_id FROM grade_scales WHERE id = grade_scale_id) = get_user_center_id()
    );

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_assessments_updated_at
    BEFORE UPDATE ON assessments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_student_grades_updated_at
    BEFORE UPDATE ON student_grades
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_grade_scales_updated_at
    BEFORE UPDATE ON grade_scales
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- INSERT DEFAULT GRADE SCALE FOR SA (CAPS)
-- This will be applied per center when they first use grades
-- ============================================

-- Note: The default grade scale should be created per center
-- Here's the typical SA CAPS grading scale for reference:
-- Level 7: 80-100% (Outstanding Achievement)
-- Level 6: 70-79% (Meritorious Achievement)
-- Level 5: 60-69% (Substantial Achievement)
-- Level 4: 50-59% (Adequate Achievement)
-- Level 3: 40-49% (Moderate Achievement)
-- Level 2: 30-39% (Elementary Achievement)
-- Level 1: 0-29% (Not Achieved)
