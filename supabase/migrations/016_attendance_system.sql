-- ============================================
-- ATTENDANCE TRACKING SYSTEM
-- Track student attendance for subjects/classes
-- ============================================

-- Attendance status enum
CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'late', 'excused');

-- ============================================
-- ATTENDANCE SESSIONS
-- Represents a class/session for taking attendance
-- ============================================

CREATE TABLE attendance_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    center_id UUID NOT NULL REFERENCES tutorial_centers(id) ON DELETE CASCADE,

    -- Session details
    subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
    teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,

    -- Date and time
    session_date DATE NOT NULL DEFAULT CURRENT_DATE,
    start_time TIME,
    end_time TIME,

    -- Description (optional)
    title VARCHAR(255),
    notes TEXT,

    -- Status
    is_completed BOOLEAN DEFAULT FALSE,

    -- Metadata
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ATTENDANCE RECORDS
-- Individual student attendance for each session
-- ============================================

CREATE TABLE attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    center_id UUID NOT NULL REFERENCES tutorial_centers(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,

    -- Attendance status
    status attendance_status NOT NULL DEFAULT 'present',

    -- Time tracking (for late arrivals)
    arrival_time TIME,

    -- Notes (for excused absences, etc.)
    notes TEXT,

    -- Metadata
    marked_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure one record per student per session
    UNIQUE(session_id, student_id)
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX idx_attendance_sessions_center_id ON attendance_sessions(center_id);
CREATE INDEX idx_attendance_sessions_subject_id ON attendance_sessions(subject_id);
CREATE INDEX idx_attendance_sessions_date ON attendance_sessions(session_date);
CREATE INDEX idx_attendance_sessions_teacher_id ON attendance_sessions(teacher_id);

CREATE INDEX idx_attendance_records_center_id ON attendance_records(center_id);
CREATE INDEX idx_attendance_records_session_id ON attendance_records(session_id);
CREATE INDEX idx_attendance_records_student_id ON attendance_records(student_id);
CREATE INDEX idx_attendance_records_status ON attendance_records(status);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

-- Attendance Sessions policies
CREATE POLICY "Super admins can do everything with attendance_sessions"
    ON attendance_sessions FOR ALL
    USING (is_super_admin());

CREATE POLICY "Center users can manage their attendance sessions"
    ON attendance_sessions FOR ALL
    USING (center_id = get_user_center_id());

-- Attendance Records policies
CREATE POLICY "Super admins can do everything with attendance_records"
    ON attendance_records FOR ALL
    USING (is_super_admin());

CREATE POLICY "Center users can manage their attendance records"
    ON attendance_records FOR ALL
    USING (center_id = get_user_center_id());

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_attendance_sessions_updated_at
    BEFORE UPDATE ON attendance_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_attendance_records_updated_at
    BEFORE UPDATE ON attendance_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
