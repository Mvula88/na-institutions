-- =============================================
-- Parent Portal System
-- =============================================
-- Allows parents to:
-- 1. Register with email/password (via Supabase Auth)
-- 2. Link multiple children to their account
-- 3. View attendance, grades, fees for all linked children
-- 4. Configure notification preferences

-- Parent accounts table
CREATE TABLE parents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    -- Basic info
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),

    -- Address (optional)
    address TEXT,
    city VARCHAR(100),

    -- Notification preferences
    notification_attendance VARCHAR(20) DEFAULT 'daily' CHECK (notification_attendance IN ('immediate', 'daily', 'weekly', 'none')),
    notification_grades BOOLEAN DEFAULT TRUE,
    notification_fees BOOLEAN DEFAULT TRUE,
    notification_sms BOOLEAN DEFAULT TRUE,
    notification_email BOOLEAN DEFAULT TRUE,

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Link parents to students (many-to-many)
CREATE TABLE parent_students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,

    -- Relationship details
    relationship VARCHAR(50) DEFAULT 'parent', -- parent, guardian, relative, other
    is_primary BOOLEAN DEFAULT FALSE, -- Primary contact for this student
    can_view_grades BOOLEAN DEFAULT TRUE,
    can_view_attendance BOOLEAN DEFAULT TRUE,
    can_view_fees BOOLEAN DEFAULT TRUE,
    can_receive_notifications BOOLEAN DEFAULT TRUE,

    -- Verification
    verified_at TIMESTAMPTZ, -- NULL until admin verifies the relationship
    verified_by UUID REFERENCES users(id),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(parent_id, student_id)
);

-- Indexes
CREATE INDEX idx_parents_auth_user ON parents(auth_user_id);
CREATE INDEX idx_parents_email ON parents(email);
CREATE INDEX idx_parents_phone ON parents(phone);
CREATE INDEX idx_parent_students_parent ON parent_students(parent_id);
CREATE INDEX idx_parent_students_student ON parent_students(student_id);
CREATE INDEX idx_parent_students_verified ON parent_students(verified_at) WHERE verified_at IS NOT NULL;

-- Enable RLS
ALTER TABLE parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_students ENABLE ROW LEVEL SECURITY;

-- RLS Policies for parents table
CREATE POLICY "Parents can view own profile"
    ON parents FOR SELECT
    USING (auth_user_id = auth.uid());

CREATE POLICY "Parents can update own profile"
    ON parents FOR UPDATE
    USING (auth_user_id = auth.uid())
    WITH CHECK (auth_user_id = auth.uid());

CREATE POLICY "Super admins can manage all parents"
    ON parents FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'super_admin'
        )
    );

CREATE POLICY "Center admins can view parents of their students"
    ON parents FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN parent_students ps ON ps.parent_id = parents.id
            JOIN students s ON s.id = ps.student_id
            WHERE u.id = auth.uid()
            AND u.center_id = s.center_id
            AND u.role IN ('center_admin', 'center_staff')
        )
    );

-- RLS Policies for parent_students table
CREATE POLICY "Parents can view own student links"
    ON parent_students FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM parents
            WHERE parents.id = parent_students.parent_id
            AND parents.auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Parents can create unverified links"
    ON parent_students FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM parents
            WHERE parents.id = parent_students.parent_id
            AND parents.auth_user_id = auth.uid()
        )
        AND verified_at IS NULL
    );

CREATE POLICY "Super admins can manage all parent-student links"
    ON parent_students FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'super_admin'
        )
    );

CREATE POLICY "Center admins can manage links for their students"
    ON parent_students FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN students s ON s.id = parent_students.student_id
            WHERE u.id = auth.uid()
            AND u.center_id = s.center_id
            AND u.role IN ('center_admin', 'center_staff')
        )
    );

-- Function to update parent updated_at
CREATE OR REPLACE FUNCTION update_parent_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_parent_updated_at
    BEFORE UPDATE ON parents
    FOR EACH ROW
    EXECUTE FUNCTION update_parent_updated_at();

-- Function to get parent's children with their info
CREATE OR REPLACE FUNCTION get_parent_children(p_parent_id UUID)
RETURNS TABLE (
    student_id UUID,
    student_name VARCHAR,
    student_number VARCHAR,
    grade VARCHAR,
    class_name VARCHAR,
    center_name VARCHAR,
    center_id UUID,
    relationship VARCHAR,
    is_verified BOOLEAN,
    can_view_grades BOOLEAN,
    can_view_attendance BOOLEAN,
    can_view_fees BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.id as student_id,
        s.full_name as student_name,
        s.student_number,
        s.grade,
        c.name as class_name,
        tc.name as center_name,
        s.center_id,
        ps.relationship,
        (ps.verified_at IS NOT NULL) as is_verified,
        ps.can_view_grades,
        ps.can_view_attendance,
        ps.can_view_fees
    FROM parent_students ps
    JOIN students s ON s.id = ps.student_id
    LEFT JOIN classes c ON c.id = s.class_id
    LEFT JOIN tutorial_centers tc ON tc.id = s.center_id
    WHERE ps.parent_id = p_parent_id
    AND s.status = 'active'
    ORDER BY s.full_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON TABLE parents IS 'Parent accounts for the parent portal - can link to multiple students';
COMMENT ON TABLE parent_students IS 'Links between parents and students with relationship details and permissions';
COMMENT ON COLUMN parent_students.verified_at IS 'NULL until center admin verifies the parent-student relationship';
COMMENT ON COLUMN parents.notification_attendance IS 'When to send attendance notifications: immediate, daily digest, weekly digest, or none';
