-- =============================================
-- Homework/Assignment System
-- =============================================
-- Allows teachers to:
-- 1. Create assignments with due dates
-- 2. Assign to classes or individual students
-- 3. Track completion status
-- 4. Add notes and feedback

-- Assignments table
CREATE TABLE assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    center_id UUID NOT NULL REFERENCES tutorial_centers(id) ON DELETE CASCADE,

    -- Assignment details
    title VARCHAR(255) NOT NULL,
    description TEXT,
    instructions TEXT,

    -- Subject and class
    subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
    class_id UUID REFERENCES classes(id) ON DELETE SET NULL,

    -- Assignment type
    assignment_type VARCHAR(30) DEFAULT 'homework' CHECK (assignment_type IN ('homework', 'project', 'essay', 'worksheet', 'reading', 'research', 'practice', 'other')),

    -- Teacher
    assigned_by UUID NOT NULL REFERENCES teachers(id),

    -- Dates
    assigned_date DATE DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,

    -- Scoring (optional)
    max_points DECIMAL(10,2),
    is_graded BOOLEAN DEFAULT FALSE,

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_published BOOLEAN DEFAULT TRUE,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Student assignments (track individual student progress)
CREATE TABLE student_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,

    -- Status tracking
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'incomplete', 'late', 'excused')),

    -- Completion
    completed_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ,

    -- Scoring (if graded)
    points_earned DECIMAL(10,2),

    -- Feedback
    teacher_notes TEXT,
    student_notes TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(assignment_id, student_id)
);

-- Indexes
CREATE INDEX idx_assignments_center ON assignments(center_id);
CREATE INDEX idx_assignments_class ON assignments(class_id);
CREATE INDEX idx_assignments_subject ON assignments(subject_id);
CREATE INDEX idx_assignments_teacher ON assignments(assigned_by);
CREATE INDEX idx_assignments_due ON assignments(due_date) WHERE is_active = TRUE;
CREATE INDEX idx_student_assignments_student ON student_assignments(student_id);
CREATE INDEX idx_student_assignments_status ON student_assignments(status) WHERE status IN ('pending', 'in_progress');

-- Enable RLS
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for assignments
CREATE POLICY "Super admins can manage all assignments"
    ON assignments FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'super_admin'
        )
    );

CREATE POLICY "Center staff can manage their center's assignments"
    ON assignments FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.center_id = assignments.center_id
            AND users.role IN ('center_admin', 'center_staff')
        )
    );

-- Teachers can manage their assignments (only if auth_user_id column exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teachers' AND column_name = 'auth_user_id') THEN
        EXECUTE 'CREATE POLICY "Teachers can manage their assignments"
            ON assignments FOR ALL
            USING (
                EXISTS (
                    SELECT 1 FROM teachers
                    WHERE teachers.auth_user_id = auth.uid()
                    AND teachers.id = assignments.assigned_by
                )
            )';
    END IF;
END $$;

-- Students can view assignments for their class (only if auth_user_id column exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'auth_user_id') THEN
        EXECUTE 'CREATE POLICY "Students can view assignments for their class"
            ON assignments FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM students
                    WHERE students.auth_user_id = auth.uid()
                    AND students.class_id = assignments.class_id
                )
            )';
    END IF;
END $$;

-- RLS Policies for student_assignments
CREATE POLICY "Super admins can manage all student assignments"
    ON student_assignments FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'super_admin'
        )
    );

CREATE POLICY "Center staff can manage student assignments"
    ON student_assignments FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN assignments a ON a.id = student_assignments.assignment_id
            WHERE u.id = auth.uid()
            AND u.center_id = a.center_id
            AND u.role IN ('center_admin', 'center_staff')
        )
    );

-- Teachers can manage student assignments (only if auth_user_id column exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teachers' AND column_name = 'auth_user_id') THEN
        EXECUTE 'CREATE POLICY "Teachers can manage student assignments they created"
            ON student_assignments FOR ALL
            USING (
                EXISTS (
                    SELECT 1 FROM teachers t
                    JOIN assignments a ON a.id = student_assignments.assignment_id
                    WHERE t.auth_user_id = auth.uid()
                    AND t.id = a.assigned_by
                )
            )';
    END IF;
END $$;

-- Students can view/update their own assignments (only if auth_user_id column exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'auth_user_id') THEN
        EXECUTE 'CREATE POLICY "Students can view and update their own assignments"
            ON student_assignments FOR ALL
            USING (
                EXISTS (
                    SELECT 1 FROM students
                    WHERE students.auth_user_id = auth.uid()
                    AND students.id = student_assignments.student_id
                )
            )';
    END IF;
END $$;

-- Function to auto-create student_assignments when assignment is created
CREATE OR REPLACE FUNCTION create_student_assignments()
RETURNS TRIGGER AS $$
BEGIN
    -- If class_id is set, create entries for all active students in that class
    IF NEW.class_id IS NOT NULL THEN
        INSERT INTO student_assignments (assignment_id, student_id, status)
        SELECT NEW.id, s.id, 'pending'
        FROM students s
        WHERE s.class_id = NEW.class_id
        AND s.status = 'active'
        ON CONFLICT (assignment_id, student_id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_student_assignments
    AFTER INSERT ON assignments
    FOR EACH ROW
    EXECUTE FUNCTION create_student_assignments();

-- Function to update assignment updated_at
CREATE OR REPLACE FUNCTION update_assignment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_assignment_updated_at
    BEFORE UPDATE ON assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_assignment_updated_at();

CREATE TRIGGER trigger_update_student_assignment_updated_at
    BEFORE UPDATE ON student_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_assignment_updated_at();

-- Function to get assignment stats for a teacher
CREATE OR REPLACE FUNCTION get_assignment_stats(p_assignment_id UUID)
RETURNS TABLE (
    total_students INT,
    completed INT,
    pending INT,
    late INT,
    average_points DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::INT as total_students,
        COUNT(*) FILTER (WHERE status = 'completed')::INT as completed,
        COUNT(*) FILTER (WHERE status IN ('pending', 'in_progress'))::INT as pending,
        COUNT(*) FILTER (WHERE status = 'late')::INT as late,
        AVG(points_earned) as average_points
    FROM student_assignments
    WHERE assignment_id = p_assignment_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get student's pending assignments
CREATE OR REPLACE FUNCTION get_student_pending_assignments(p_student_id UUID)
RETURNS TABLE (
    assignment_id UUID,
    title VARCHAR,
    description TEXT,
    subject_name VARCHAR,
    due_date DATE,
    days_until_due INT,
    status VARCHAR,
    is_overdue BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        a.id as assignment_id,
        a.title,
        a.description,
        s.name as subject_name,
        a.due_date,
        (a.due_date - CURRENT_DATE)::INT as days_until_due,
        sa.status,
        (a.due_date < CURRENT_DATE AND sa.status IN ('pending', 'in_progress')) as is_overdue
    FROM student_assignments sa
    JOIN assignments a ON a.id = sa.assignment_id
    LEFT JOIN subjects s ON s.id = a.subject_id
    WHERE sa.student_id = p_student_id
    AND a.is_active = TRUE
    AND sa.status IN ('pending', 'in_progress')
    ORDER BY a.due_date ASC;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE assignments IS 'Homework and assignments created by teachers';
COMMENT ON TABLE student_assignments IS 'Tracks individual student progress on assignments';
COMMENT ON COLUMN assignments.assignment_type IS 'Type of assignment: homework, project, essay, worksheet, reading, research, practice, or other';
COMMENT ON COLUMN student_assignments.status IS 'Current status: pending, in_progress, completed, incomplete, late, or excused';
