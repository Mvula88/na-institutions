-- ============================================
-- CLASS/GRADE GROUPING SYSTEM
-- Organize students into classes (Grade 10A, 10B, etc.)
-- ============================================

-- ============================================
-- CLASSES TABLE
-- Represents a class/group (e.g., Grade 10A, Grade 11B)
-- ============================================

CREATE TABLE classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    center_id UUID NOT NULL REFERENCES tutorial_centers(id) ON DELETE CASCADE,

    -- Class details
    name VARCHAR(100) NOT NULL, -- e.g., "Grade 10A", "Form 3B"
    grade_level VARCHAR(50), -- e.g., "Grade 10", "Form 3"
    section VARCHAR(20), -- e.g., "A", "B", "C"
    description TEXT,

    -- Capacity
    max_capacity INT,

    -- Academic year
    academic_year VARCHAR(10), -- e.g., "2024", "2024/2025"

    -- Class teacher (optional)
    class_teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure unique class name per center per academic year
    UNIQUE(center_id, name, academic_year)
);

-- ============================================
-- ADD CLASS REFERENCE TO STUDENTS
-- ============================================

ALTER TABLE students
ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES classes(id) ON DELETE SET NULL;

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX idx_classes_center_id ON classes(center_id);
CREATE INDEX idx_classes_grade_level ON classes(grade_level);
CREATE INDEX idx_classes_academic_year ON classes(academic_year);
CREATE INDEX idx_classes_is_active ON classes(is_active);
CREATE INDEX idx_students_class_id ON students(class_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

-- Classes policies
CREATE POLICY "Super admins can do everything with classes"
    ON classes FOR ALL
    USING (is_super_admin());

CREATE POLICY "Center users can manage their classes"
    ON classes FOR ALL
    USING (center_id = get_user_center_id());

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_classes_updated_at
    BEFORE UPDATE ON classes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
