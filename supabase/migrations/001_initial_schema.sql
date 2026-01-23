-- ============================================
-- TUTORIAL CENTER SAAS - DATABASE SCHEMA
-- ============================================
-- Multi-tenant SaaS platform for tutorial centers
-- Features: Student management, Teacher management, Fee tracking, Hostel management
-- ============================================

-- No extension needed - using native gen_random_uuid()

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE user_role AS ENUM ('super_admin', 'center_admin', 'center_staff');
CREATE TYPE center_status AS ENUM ('active', 'inactive', 'suspended');
CREATE TYPE student_status AS ENUM ('active', 'inactive', 'graduated', 'withdrawn');
CREATE TYPE teacher_status AS ENUM ('active', 'inactive', 'terminated');
CREATE TYPE payment_status AS ENUM ('paid', 'partial', 'unpaid');
CREATE TYPE gender AS ENUM ('male', 'female', 'other');
CREATE TYPE room_type AS ENUM ('single', 'shared');
CREATE TYPE hostel_student_status AS ENUM ('checked_in', 'checked_out');

-- ============================================
-- TUTORIAL CENTERS (Tenants)
-- ============================================

CREATE TABLE tutorial_centers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),

    -- Branding
    logo_url TEXT,
    primary_color VARCHAR(7) DEFAULT '#1E40AF',
    secondary_color VARCHAR(7) DEFAULT '#F59E0B',

    -- Banking details (for fee statements)
    bank_name VARCHAR(100),
    account_number VARCHAR(50),
    branch_code VARCHAR(20),

    -- Status & Subscription
    status center_status DEFAULT 'active',
    subscription_tier VARCHAR(50) DEFAULT 'basic',
    subscription_start_date DATE,
    subscription_end_date DATE,

    -- Module activation
    hostel_module_enabled BOOLEAN DEFAULT FALSE,
    transport_module_enabled BOOLEAN DEFAULT FALSE,
    library_module_enabled BOOLEAN DEFAULT FALSE,
    sms_module_enabled BOOLEAN DEFAULT FALSE,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- USERS (All user types)
-- ============================================

CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    role user_role NOT NULL DEFAULT 'center_staff',

    -- Center association (NULL for super_admin)
    center_id UUID REFERENCES tutorial_centers(id) ON DELETE CASCADE,

    -- Profile
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);

-- ============================================
-- SUBJECTS
-- ============================================

CREATE TABLE subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    center_id UUID NOT NULL REFERENCES tutorial_centers(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20),
    description TEXT,
    monthly_fee DECIMAL(10, 2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(center_id, name)
);

-- ============================================
-- TEACHERS
-- ============================================

CREATE TABLE teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    center_id UUID NOT NULL REFERENCES tutorial_centers(id) ON DELETE CASCADE,

    -- Personal info
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    gender gender,
    date_of_birth DATE,
    address TEXT,

    -- Professional info
    employee_id VARCHAR(50),
    qualification TEXT,
    specialization TEXT,
    date_joined DATE,

    -- Status
    status teacher_status DEFAULT 'active',

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Teacher-Subject relationship
CREATE TABLE teacher_subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(teacher_id, subject_id)
);

-- ============================================
-- STUDENTS
-- ============================================

CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    center_id UUID NOT NULL REFERENCES tutorial_centers(id) ON DELETE CASCADE,

    -- Student info
    student_number VARCHAR(50),
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    gender gender,
    date_of_birth DATE,
    grade VARCHAR(20),
    school_name VARCHAR(255),
    address TEXT,

    -- Parent/Guardian info
    parent_name VARCHAR(255),
    parent_phone VARCHAR(50),
    parent_email VARCHAR(255),
    parent_address TEXT,
    relationship VARCHAR(50),

    -- Status
    status student_status DEFAULT 'active',
    registration_date DATE DEFAULT CURRENT_DATE,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Student-Subject enrollment
CREATE TABLE student_subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    enrolled_date DATE DEFAULT CURRENT_DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(student_id, subject_id)
);

-- ============================================
-- FEE MANAGEMENT
-- ============================================

-- Fee structure per center
CREATE TABLE fee_structures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    center_id UUID NOT NULL REFERENCES tutorial_centers(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    amount DECIMAL(10, 2) NOT NULL,
    fee_type VARCHAR(50) NOT NULL, -- 'tuition', 'registration', 'hostel', 'transport', 'other'
    is_recurring BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Monthly fee records
CREATE TABLE student_fees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    center_id UUID NOT NULL REFERENCES tutorial_centers(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,

    -- Fee details
    fee_month DATE NOT NULL, -- First day of the month
    fee_type VARCHAR(50) NOT NULL, -- 'tuition', 'hostel', etc.
    amount_due DECIMAL(10, 2) NOT NULL,
    amount_paid DECIMAL(10, 2) DEFAULT 0,
    balance DECIMAL(10, 2) GENERATED ALWAYS AS (amount_due - amount_paid) STORED,

    -- Status
    status payment_status DEFAULT 'unpaid',
    due_date DATE,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(student_id, fee_month, fee_type)
);

-- Payment transactions
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    center_id UUID NOT NULL REFERENCES tutorial_centers(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    student_fee_id UUID REFERENCES student_fees(id) ON DELETE SET NULL,

    -- Payment details
    amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(50), -- 'cash', 'bank_transfer', 'card', 'mobile_money'
    reference_number VARCHAR(100),
    notes TEXT,

    -- Who recorded it
    recorded_by UUID REFERENCES users(id),

    -- Metadata
    payment_date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- HOSTEL MANAGEMENT (Optional Module)
-- ============================================

-- Hostel buildings/blocks
CREATE TABLE hostel_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    center_id UUID NOT NULL REFERENCES tutorial_centers(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    gender_restriction gender, -- NULL means mixed
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rooms
CREATE TABLE hostel_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    center_id UUID NOT NULL REFERENCES tutorial_centers(id) ON DELETE CASCADE,
    block_id UUID REFERENCES hostel_blocks(id) ON DELETE SET NULL,

    room_number VARCHAR(20) NOT NULL,
    room_type room_type DEFAULT 'shared',
    capacity INT NOT NULL DEFAULT 1,
    current_occupancy INT DEFAULT 0,
    monthly_fee DECIMAL(10, 2) DEFAULT 0,

    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(center_id, room_number)
);

-- Room allocations
CREATE TABLE hostel_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    center_id UUID NOT NULL REFERENCES tutorial_centers(id) ON DELETE CASCADE,
    room_id UUID NOT NULL REFERENCES hostel_rooms(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,

    -- Allocation details
    check_in_date DATE NOT NULL DEFAULT CURRENT_DATE,
    check_out_date DATE,
    status hostel_student_status DEFAULT 'checked_in',

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- AUDIT LOG
-- ============================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    center_id UUID REFERENCES tutorial_centers(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,

    action VARCHAR(50) NOT NULL, -- 'create', 'update', 'delete'
    entity_type VARCHAR(50) NOT NULL, -- 'student', 'teacher', 'payment', etc.
    entity_id UUID,

    old_values JSONB,
    new_values JSONB,

    ip_address VARCHAR(50),
    user_agent TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX idx_users_center_id ON users(center_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_students_center_id ON students(center_id);
CREATE INDEX idx_students_status ON students(status);
CREATE INDEX idx_students_gender ON students(gender);
CREATE INDEX idx_teachers_center_id ON teachers(center_id);
CREATE INDEX idx_subjects_center_id ON subjects(center_id);
CREATE INDEX idx_student_fees_center_id ON student_fees(center_id);
CREATE INDEX idx_student_fees_student_id ON student_fees(student_id);
CREATE INDEX idx_student_fees_status ON student_fees(status);
CREATE INDEX idx_student_fees_fee_month ON student_fees(fee_month);
CREATE INDEX idx_payments_center_id ON payments(center_id);
CREATE INDEX idx_payments_student_id ON payments(student_id);
CREATE INDEX idx_hostel_rooms_center_id ON hostel_rooms(center_id);
CREATE INDEX idx_hostel_allocations_center_id ON hostel_allocations(center_id);
CREATE INDEX idx_audit_logs_center_id ON audit_logs(center_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE tutorial_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE hostel_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE hostel_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE hostel_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's center_id
CREATE OR REPLACE FUNCTION get_user_center_id()
RETURNS UUID AS $$
BEGIN
    RETURN (SELECT center_id FROM users WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (SELECT role = 'super_admin' FROM users WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Tutorial Centers policies
CREATE POLICY "Super admins can do everything with centers"
    ON tutorial_centers FOR ALL
    USING (is_super_admin());

CREATE POLICY "Center users can view their own center"
    ON tutorial_centers FOR SELECT
    USING (id = get_user_center_id());

-- Users policies
CREATE POLICY "Super admins can do everything with users"
    ON users FOR ALL
    USING (is_super_admin());

CREATE POLICY "Center admins can manage their center's users"
    ON users FOR ALL
    USING (
        (SELECT role FROM users WHERE id = auth.uid()) = 'center_admin'
        AND center_id = get_user_center_id()
    );

CREATE POLICY "Users can view their own profile"
    ON users FOR SELECT
    USING (id = auth.uid());

-- Students policies
CREATE POLICY "Super admins can do everything with students"
    ON students FOR ALL
    USING (is_super_admin());

CREATE POLICY "Center users can manage their students"
    ON students FOR ALL
    USING (center_id = get_user_center_id());

-- Teachers policies
CREATE POLICY "Super admins can do everything with teachers"
    ON teachers FOR ALL
    USING (is_super_admin());

CREATE POLICY "Center users can manage their teachers"
    ON teachers FOR ALL
    USING (center_id = get_user_center_id());

-- Subjects policies
CREATE POLICY "Super admins can do everything with subjects"
    ON subjects FOR ALL
    USING (is_super_admin());

CREATE POLICY "Center users can manage their subjects"
    ON subjects FOR ALL
    USING (center_id = get_user_center_id());

-- Student Subjects policies
CREATE POLICY "Super admins can do everything with student_subjects"
    ON student_subjects FOR ALL
    USING (is_super_admin());

CREATE POLICY "Center users can manage their student enrollments"
    ON student_subjects FOR ALL
    USING (
        (SELECT center_id FROM students WHERE id = student_id) = get_user_center_id()
    );

-- Teacher Subjects policies
CREATE POLICY "Super admins can do everything with teacher_subjects"
    ON teacher_subjects FOR ALL
    USING (is_super_admin());

CREATE POLICY "Center users can manage their teacher subjects"
    ON teacher_subjects FOR ALL
    USING (
        (SELECT center_id FROM teachers WHERE id = teacher_id) = get_user_center_id()
    );

-- Fee Structures policies
CREATE POLICY "Super admins can do everything with fee_structures"
    ON fee_structures FOR ALL
    USING (is_super_admin());

CREATE POLICY "Center users can manage their fee structures"
    ON fee_structures FOR ALL
    USING (center_id = get_user_center_id());

-- Student Fees policies
CREATE POLICY "Super admins can do everything with student_fees"
    ON student_fees FOR ALL
    USING (is_super_admin());

CREATE POLICY "Center users can manage their student fees"
    ON student_fees FOR ALL
    USING (center_id = get_user_center_id());

-- Payments policies
CREATE POLICY "Super admins can do everything with payments"
    ON payments FOR ALL
    USING (is_super_admin());

CREATE POLICY "Center users can manage their payments"
    ON payments FOR ALL
    USING (center_id = get_user_center_id());

-- Hostel Blocks policies
CREATE POLICY "Super admins can do everything with hostel_blocks"
    ON hostel_blocks FOR ALL
    USING (is_super_admin());

CREATE POLICY "Center users can manage their hostel blocks"
    ON hostel_blocks FOR ALL
    USING (center_id = get_user_center_id());

-- Hostel Rooms policies
CREATE POLICY "Super admins can do everything with hostel_rooms"
    ON hostel_rooms FOR ALL
    USING (is_super_admin());

CREATE POLICY "Center users can manage their hostel rooms"
    ON hostel_rooms FOR ALL
    USING (center_id = get_user_center_id());

-- Hostel Allocations policies
CREATE POLICY "Super admins can do everything with hostel_allocations"
    ON hostel_allocations FOR ALL
    USING (is_super_admin());

CREATE POLICY "Center users can manage their hostel allocations"
    ON hostel_allocations FOR ALL
    USING (center_id = get_user_center_id());

-- Audit Logs policies
CREATE POLICY "Super admins can view all audit logs"
    ON audit_logs FOR SELECT
    USING (is_super_admin());

CREATE POLICY "Center admins can view their audit logs"
    ON audit_logs FOR SELECT
    USING (
        center_id = get_user_center_id()
        AND (SELECT role FROM users WHERE id = auth.uid()) = 'center_admin'
    );

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update trigger to all tables with updated_at
CREATE TRIGGER update_tutorial_centers_updated_at
    BEFORE UPDATE ON tutorial_centers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_subjects_updated_at
    BEFORE UPDATE ON subjects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_teachers_updated_at
    BEFORE UPDATE ON teachers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_students_updated_at
    BEFORE UPDATE ON students
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_fee_structures_updated_at
    BEFORE UPDATE ON fee_structures
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_student_fees_updated_at
    BEFORE UPDATE ON student_fees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_hostel_blocks_updated_at
    BEFORE UPDATE ON hostel_blocks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_hostel_rooms_updated_at
    BEFORE UPDATE ON hostel_rooms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_hostel_allocations_updated_at
    BEFORE UPDATE ON hostel_allocations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to update room occupancy
CREATE OR REPLACE FUNCTION update_room_occupancy()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.status = 'checked_in' THEN
        UPDATE hostel_rooms SET current_occupancy = current_occupancy + 1 WHERE id = NEW.room_id;
    ELSIF TG_OP = 'UPDATE' AND OLD.status = 'checked_in' AND NEW.status = 'checked_out' THEN
        UPDATE hostel_rooms SET current_occupancy = current_occupancy - 1 WHERE id = NEW.room_id;
    ELSIF TG_OP = 'DELETE' AND OLD.status = 'checked_in' THEN
        UPDATE hostel_rooms SET current_occupancy = current_occupancy - 1 WHERE id = OLD.room_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_room_occupancy_trigger
    AFTER INSERT OR UPDATE OR DELETE ON hostel_allocations
    FOR EACH ROW EXECUTE FUNCTION update_room_occupancy();

-- Function to update payment status
CREATE OR REPLACE FUNCTION update_fee_status()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE student_fees
    SET status = CASE
        WHEN amount_paid >= amount_due THEN 'paid'::payment_status
        WHEN amount_paid > 0 THEN 'partial'::payment_status
        ELSE 'unpaid'::payment_status
    END
    WHERE id = NEW.student_fee_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_fee_status_after_payment
    AFTER INSERT ON payments
    FOR EACH ROW
    WHEN (NEW.student_fee_id IS NOT NULL)
    EXECUTE FUNCTION update_fee_status();

-- Function to generate student number
CREATE OR REPLACE FUNCTION generate_student_number()
RETURNS TRIGGER AS $$
DECLARE
    center_prefix VARCHAR(3);
    year_suffix VARCHAR(2);
    sequence_num INT;
BEGIN
    IF NEW.student_number IS NULL THEN
        -- Get first 3 letters of center name
        SELECT UPPER(LEFT(name, 3)) INTO center_prefix
        FROM tutorial_centers WHERE id = NEW.center_id;

        -- Get last 2 digits of year
        year_suffix := TO_CHAR(NOW(), 'YY');

        -- Get next sequence number for this center
        SELECT COALESCE(MAX(
            NULLIF(REGEXP_REPLACE(student_number, '[^0-9]', '', 'g'), '')::INT
        ), 0) + 1 INTO sequence_num
        FROM students WHERE center_id = NEW.center_id;

        NEW.student_number := center_prefix || year_suffix || LPAD(sequence_num::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_student_number_trigger
    BEFORE INSERT ON students
    FOR EACH ROW EXECUTE FUNCTION generate_student_number();
