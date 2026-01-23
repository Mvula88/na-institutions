-- =============================================
-- Exam Scheduling System
-- =============================================
-- Allows centers to:
-- 1. Schedule exams with date, time, venue
-- 2. Assign exams to classes or subjects
-- 3. Track exam status (scheduled, completed, cancelled)
-- 4. Display exam schedules to students/teachers/parents

-- Exams table
CREATE TABLE exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    center_id UUID NOT NULL REFERENCES tutorial_centers(id) ON DELETE CASCADE,

    -- Exam details
    name VARCHAR(255) NOT NULL,
    description TEXT,
    exam_type VARCHAR(30) DEFAULT 'exam' CHECK (exam_type IN ('midterm', 'final', 'quiz', 'mock', 'practical', 'oral', 'test', 'exam', 'other')),

    -- Subject and class
    subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
    class_id UUID REFERENCES classes(id) ON DELETE SET NULL,

    -- Schedule
    exam_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration_minutes INT, -- Auto-calculated from times

    -- Venue
    venue VARCHAR(255),
    room_number VARCHAR(50),

    -- Scoring
    total_marks DECIMAL(10,2) DEFAULT 100,
    pass_mark DECIMAL(10,2),

    -- Instructions
    instructions TEXT,
    materials_allowed TEXT, -- e.g., "Calculator, ruler"
    materials_prohibited TEXT, -- e.g., "Cell phones, notes"

    -- Status
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'postponed', 'cancelled')),

    -- Created by
    created_by UUID REFERENCES users(id),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Exam invigilators (teachers assigned to supervise)
CREATE TABLE exam_invigilators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    role VARCHAR(30) DEFAULT 'invigilator', -- 'chief_invigilator', 'invigilator', 'assistant'

    UNIQUE(exam_id, teacher_id)
);

-- Student exam registrations (for tracking who should take which exam)
CREATE TABLE student_exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,

    -- Attendance
    attended BOOLEAN,
    attendance_notes TEXT,

    -- Results (optional, can be linked to grades instead)
    marks_obtained DECIMAL(10,2),
    grade VARCHAR(5),

    UNIQUE(exam_id, student_id)
);

-- Indexes
CREATE INDEX idx_exams_center ON exams(center_id);
CREATE INDEX idx_exams_date ON exams(exam_date);
CREATE INDEX idx_exams_class ON exams(class_id);
CREATE INDEX idx_exams_subject ON exams(subject_id);
CREATE INDEX idx_exams_status ON exams(status) WHERE status IN ('scheduled', 'in_progress');
CREATE INDEX idx_exam_invigilators_exam ON exam_invigilators(exam_id);
CREATE INDEX idx_exam_invigilators_teacher ON exam_invigilators(teacher_id);
CREATE INDEX idx_student_exams_exam ON student_exams(exam_id);
CREATE INDEX idx_student_exams_student ON student_exams(student_id);

-- Enable RLS
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_invigilators ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_exams ENABLE ROW LEVEL SECURITY;

-- RLS Policies for exams
CREATE POLICY "Super admins can manage all exams"
    ON exams FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'super_admin'
        )
    );

CREATE POLICY "Center staff can manage their center's exams"
    ON exams FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.center_id = exams.center_id
            AND users.role IN ('center_admin', 'center_staff')
        )
    );

-- Teachers can view exams (only if auth_user_id column exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teachers' AND column_name = 'auth_user_id') THEN
        EXECUTE 'CREATE POLICY "Teachers can view exams for their classes"
            ON exams FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM teachers t
                    JOIN timetable_entries te ON te.teacher_id = t.id
                    WHERE t.auth_user_id = auth.uid()
                    AND te.class_id = exams.class_id
                )
            )';
    END IF;
END $$;

-- Students can view exams (only if auth_user_id column exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'auth_user_id') THEN
        EXECUTE 'CREATE POLICY "Students can view exams for their class"
            ON exams FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM students
                    WHERE students.auth_user_id = auth.uid()
                    AND students.class_id = exams.class_id
                )
            )';
    END IF;
END $$;

-- RLS Policies for exam_invigilators
CREATE POLICY "Super admins can manage all invigilators"
    ON exam_invigilators FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'super_admin'
        )
    );

CREATE POLICY "Center staff can manage invigilators"
    ON exam_invigilators FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN exams e ON e.id = exam_invigilators.exam_id
            WHERE u.id = auth.uid()
            AND u.center_id = e.center_id
            AND u.role IN ('center_admin', 'center_staff')
        )
    );

-- RLS Policies for student_exams
CREATE POLICY "Super admins can manage all student exams"
    ON student_exams FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'super_admin'
        )
    );

CREATE POLICY "Center staff can manage student exams"
    ON student_exams FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN exams e ON e.id = student_exams.exam_id
            WHERE u.id = auth.uid()
            AND u.center_id = e.center_id
            AND u.role IN ('center_admin', 'center_staff')
        )
    );

-- Students can view their own exam records (only if auth_user_id column exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'auth_user_id') THEN
        EXECUTE 'CREATE POLICY "Students can view their own exam records"
            ON student_exams FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM students
                    WHERE students.auth_user_id = auth.uid()
                    AND students.id = student_exams.student_id
                )
            )';
    END IF;
END $$;

-- Function to calculate duration and auto-create student_exams
CREATE OR REPLACE FUNCTION handle_exam_insert()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate duration
    NEW.duration_minutes := EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 60;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_handle_exam_insert
    BEFORE INSERT OR UPDATE ON exams
    FOR EACH ROW
    EXECUTE FUNCTION handle_exam_insert();

-- Function to auto-create student_exams when exam is created for a class
CREATE OR REPLACE FUNCTION create_student_exams()
RETURNS TRIGGER AS $$
BEGIN
    -- If class_id is set, create entries for all active students in that class
    IF NEW.class_id IS NOT NULL THEN
        INSERT INTO student_exams (exam_id, student_id)
        SELECT NEW.id, s.id
        FROM students s
        WHERE s.class_id = NEW.class_id
        AND s.status = 'active'
        ON CONFLICT (exam_id, student_id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_student_exams
    AFTER INSERT ON exams
    FOR EACH ROW
    EXECUTE FUNCTION create_student_exams();

-- Function to update exam updated_at
CREATE OR REPLACE FUNCTION update_exam_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_exam_updated_at
    BEFORE UPDATE ON exams
    FOR EACH ROW
    EXECUTE FUNCTION update_exam_updated_at();

-- Function to get upcoming exams for a student
CREATE OR REPLACE FUNCTION get_student_upcoming_exams(p_student_id UUID)
RETURNS TABLE (
    exam_id UUID,
    exam_name VARCHAR,
    exam_type VARCHAR,
    subject_name VARCHAR,
    exam_date DATE,
    start_time TIME,
    end_time TIME,
    duration_minutes INT,
    venue VARCHAR,
    total_marks DECIMAL,
    days_until INT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.id as exam_id,
        e.name as exam_name,
        e.exam_type,
        s.name as subject_name,
        e.exam_date,
        e.start_time,
        e.end_time,
        e.duration_minutes,
        e.venue,
        e.total_marks,
        (e.exam_date - CURRENT_DATE)::INT as days_until
    FROM student_exams se
    JOIN exams e ON e.id = se.exam_id
    LEFT JOIN subjects s ON s.id = e.subject_id
    WHERE se.student_id = p_student_id
    AND e.exam_date >= CURRENT_DATE
    AND e.status = 'scheduled'
    ORDER BY e.exam_date ASC, e.start_time ASC;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE exams IS 'Scheduled exams and tests';
COMMENT ON TABLE exam_invigilators IS 'Teachers assigned to supervise exams';
COMMENT ON TABLE student_exams IS 'Student exam registrations and results';
COMMENT ON COLUMN exams.exam_type IS 'Type of exam: midterm, final, quiz, mock, practical, oral, test, exam, or other';
COMMENT ON COLUMN exams.status IS 'Current status: scheduled, in_progress, completed, postponed, or cancelled';
