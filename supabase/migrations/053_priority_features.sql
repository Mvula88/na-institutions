-- Migration: Priority Features for VTC/University Readiness
-- Features: Certificates, Internships, Graduation Tracking, Email Notifications, Document Storage

-- ============================================================================
-- 1. CERTIFICATE/DIPLOMA GENERATION
-- ============================================================================

-- Certificate templates that institutions can customize
CREATE TABLE IF NOT EXISTS certificate_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    certificate_type VARCHAR(50) NOT NULL CHECK (certificate_type IN ('completion', 'diploma', 'certificate', 'transcript', 'attendance', 'custom')),
    description TEXT,
    template_content JSONB NOT NULL DEFAULT '{}', -- Stores layout, fields, styling
    header_text TEXT,
    footer_text TEXT,
    signature_lines JSONB DEFAULT '[]', -- Array of {title, name, position}
    logo_position VARCHAR(20) DEFAULT 'top-center',
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Issued certificates record
CREATE TABLE IF NOT EXISTS issued_certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    template_id UUID REFERENCES certificate_templates(id) ON DELETE SET NULL,
    program_id UUID REFERENCES programs(id) ON DELETE SET NULL,
    certificate_number VARCHAR(50) NOT NULL,
    certificate_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL, -- e.g., "Diploma in Information Technology"
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expiry_date DATE, -- For certificates that expire
    grade_achieved VARCHAR(20), -- e.g., "Distinction", "Merit", "Pass"
    final_gpa DECIMAL(3,2),
    status VARCHAR(30) DEFAULT 'issued' CHECK (status IN ('draft', 'issued', 'revoked', 'replaced')),
    revocation_reason TEXT,
    revoked_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}', -- Additional data like honors, specialization
    pdf_url TEXT, -- Stored PDF location
    verification_code VARCHAR(20) UNIQUE, -- For online verification
    issued_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(institution_id, certificate_number)
);

-- Certificate verification log (for when external parties verify)
CREATE TABLE IF NOT EXISTS certificate_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    certificate_id UUID NOT NULL REFERENCES issued_certificates(id) ON DELETE CASCADE,
    verified_at TIMESTAMPTZ DEFAULT NOW(),
    verifier_ip VARCHAR(45),
    verifier_info JSONB DEFAULT '{}'
);

-- ============================================================================
-- 2. INTERNSHIP/ATTACHMENT MODULE
-- ============================================================================

-- Companies/Organizations that host interns
CREATE TABLE IF NOT EXISTS internship_hosts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    industry VARCHAR(100),
    contact_person VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    region VARCHAR(100),
    website VARCHAR(255),
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Internship placements
CREATE TABLE IF NOT EXISTS internships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    host_id UUID REFERENCES internship_hosts(id) ON DELETE SET NULL,
    program_id UUID REFERENCES programs(id) ON DELETE SET NULL,
    course_id UUID REFERENCES courses(id) ON DELETE SET NULL, -- If linked to a specific course

    -- Internship details
    title VARCHAR(255) NOT NULL, -- e.g., "Industrial Attachment", "Practical Training"
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_hours INTEGER, -- Required hours
    completed_hours INTEGER DEFAULT 0,

    -- Supervision
    internal_supervisor_id UUID REFERENCES users(id), -- Institution supervisor
    external_supervisor_name VARCHAR(255),
    external_supervisor_contact VARCHAR(100),

    -- Status tracking
    status VARCHAR(30) DEFAULT 'pending' CHECK (status IN (
        'pending', 'approved', 'in_progress', 'completed',
        'terminated', 'deferred', 'failed'
    )),

    -- Assessment
    host_evaluation_score DECIMAL(5,2), -- Score from company (0-100)
    host_evaluation_comments TEXT,
    internal_evaluation_score DECIMAL(5,2), -- Score from institution
    final_grade VARCHAR(10),

    -- Documentation
    offer_letter_url TEXT,
    completion_letter_url TEXT,
    evaluation_form_url TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Internship log entries (weekly/daily logs)
CREATE TABLE IF NOT EXISTS internship_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    internship_id UUID NOT NULL REFERENCES internships(id) ON DELETE CASCADE,
    log_date DATE NOT NULL,
    hours_worked DECIMAL(4,1) DEFAULT 0,
    activities TEXT NOT NULL,
    skills_learned TEXT,
    challenges TEXT,
    supervisor_comments TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 3. GRADUATION REQUIREMENTS TRACKER
-- ============================================================================

-- Program graduation requirements
CREATE TABLE IF NOT EXISTS graduation_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,

    -- Credit requirements
    min_total_credits INTEGER NOT NULL DEFAULT 0,
    min_core_credits INTEGER DEFAULT 0,
    min_elective_credits INTEGER DEFAULT 0,

    -- GPA requirements
    min_gpa DECIMAL(3,2) DEFAULT 2.00,
    min_major_gpa DECIMAL(3,2),

    -- Other requirements
    requires_internship BOOLEAN DEFAULT FALSE,
    min_internship_hours INTEGER DEFAULT 0,
    requires_thesis BOOLEAN DEFAULT FALSE,
    requires_final_exam BOOLEAN DEFAULT FALSE,

    -- Financial requirements
    requires_fee_clearance BOOLEAN DEFAULT TRUE,

    -- Additional requirements (flexible)
    additional_requirements JSONB DEFAULT '[]', -- Array of {name, description, is_required}

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(program_id)
);

-- Student graduation status tracking
CREATE TABLE IF NOT EXISTS student_graduation_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    program_enrollment_id UUID REFERENCES program_enrollments(id) ON DELETE CASCADE,

    -- Calculated status
    total_credits_earned INTEGER DEFAULT 0,
    core_credits_earned INTEGER DEFAULT 0,
    elective_credits_earned INTEGER DEFAULT 0,
    current_gpa DECIMAL(3,2),

    -- Requirement completion
    credits_requirement_met BOOLEAN DEFAULT FALSE,
    gpa_requirement_met BOOLEAN DEFAULT FALSE,
    internship_requirement_met BOOLEAN DEFAULT FALSE,
    thesis_requirement_met BOOLEAN DEFAULT FALSE,
    fee_clearance_met BOOLEAN DEFAULT FALSE,

    -- Overall status
    graduation_status VARCHAR(30) DEFAULT 'in_progress' CHECK (graduation_status IN (
        'in_progress', 'requirements_met', 'pending_approval',
        'approved', 'graduated', 'not_eligible'
    )),

    -- Graduation details
    expected_graduation_date DATE,
    actual_graduation_date DATE,
    graduation_honors VARCHAR(50), -- "Summa Cum Laude", "Magna Cum Laude", etc.
    graduation_ceremony_id UUID,

    -- Approval workflow
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,

    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, program_enrollment_id)
);

-- Graduation ceremonies
CREATE TABLE IF NOT EXISTS graduation_ceremonies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    academic_year_id UUID REFERENCES academic_years(id),
    name VARCHAR(255) NOT NULL,
    ceremony_date DATE NOT NULL,
    venue VARCHAR(255),
    capacity INTEGER,
    registration_deadline DATE,
    status VARCHAR(30) DEFAULT 'planned' CHECK (status IN ('planned', 'registration_open', 'registration_closed', 'completed', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 4. EMAIL NOTIFICATIONS SYSTEM
-- ============================================================================

-- Email templates
CREATE TABLE IF NOT EXISTS email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    body_html TEXT NOT NULL,
    body_text TEXT, -- Plain text version
    category VARCHAR(50) DEFAULT 'general' CHECK (category IN (
        'general', 'enrollment', 'fees', 'grades', 'attendance',
        'internship', 'graduation', 'announcement', 'reminder'
    )),
    variables JSONB DEFAULT '[]', -- Available merge variables
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email campaigns (bulk emails)
CREATE TABLE IF NOT EXISTS email_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    body_html TEXT NOT NULL,
    body_text TEXT,

    -- Targeting
    target_type VARCHAR(30) NOT NULL CHECK (target_type IN (
        'all_students', 'all_staff', 'all_parents', 'program',
        'cohort', 'class', 'custom', 'individual'
    )),
    target_filters JSONB DEFAULT '{}', -- Filters for targeting

    -- Status
    status VARCHAR(30) DEFAULT 'draft' CHECK (status IN (
        'draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled'
    )),
    scheduled_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,

    -- Stats
    total_recipients INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    opened_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,

    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual email logs
CREATE TABLE IF NOT EXISTS email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES email_campaigns(id) ON DELETE SET NULL,
    recipient_email VARCHAR(255) NOT NULL,
    recipient_name VARCHAR(255),
    recipient_type VARCHAR(30), -- 'student', 'parent', 'staff'
    recipient_id UUID, -- Reference to student/user
    subject VARCHAR(255) NOT NULL,
    status VARCHAR(30) DEFAULT 'pending' CHECK (status IN (
        'pending', 'sent', 'delivered', 'opened', 'bounced', 'failed'
    )),
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email settings per institution
CREATE TABLE IF NOT EXISTS email_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,

    -- SMTP settings (optional - can use default)
    smtp_host VARCHAR(255),
    smtp_port INTEGER,
    smtp_user VARCHAR(255),
    smtp_password_encrypted TEXT,
    smtp_from_email VARCHAR(255),
    smtp_from_name VARCHAR(255),
    use_custom_smtp BOOLEAN DEFAULT FALSE,

    -- Default from
    default_from_email VARCHAR(255),
    default_from_name VARCHAR(255),
    default_reply_to VARCHAR(255),

    -- Notification preferences
    send_enrollment_emails BOOLEAN DEFAULT TRUE,
    send_fee_reminder_emails BOOLEAN DEFAULT TRUE,
    send_grade_notification_emails BOOLEAN DEFAULT TRUE,
    send_attendance_alert_emails BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(institution_id)
);

-- ============================================================================
-- 5. DOCUMENT STORAGE
-- ============================================================================

-- Document categories
CREATE TABLE IF NOT EXISTS document_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_required BOOLEAN DEFAULT FALSE, -- Required for enrollment
    applies_to VARCHAR(30) DEFAULT 'student' CHECK (applies_to IN ('student', 'staff', 'both')),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Student documents
CREATE TABLE IF NOT EXISTS student_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    category_id UUID REFERENCES document_categories(id) ON DELETE SET NULL,

    -- Document info
    document_name VARCHAR(255) NOT NULL,
    document_type VARCHAR(50), -- 'id_card', 'passport', 'certificate', 'transcript', etc.
    description TEXT,

    -- File info
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(100), -- MIME type
    file_size INTEGER, -- in bytes
    file_url TEXT NOT NULL, -- Supabase storage URL

    -- Metadata
    issue_date DATE,
    expiry_date DATE,
    document_number VARCHAR(100), -- ID number, passport number, etc.
    issuing_authority VARCHAR(255),

    -- Verification
    is_verified BOOLEAN DEFAULT FALSE,
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMPTZ,
    verification_notes TEXT,

    -- Status
    status VARCHAR(30) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'replaced', 'deleted')),

    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Staff documents (similar structure)
CREATE TABLE IF NOT EXISTS staff_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id UUID REFERENCES document_categories(id) ON DELETE SET NULL,

    document_name VARCHAR(255) NOT NULL,
    document_type VARCHAR(50),
    description TEXT,

    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(100),
    file_size INTEGER,
    file_url TEXT NOT NULL,

    issue_date DATE,
    expiry_date DATE,
    document_number VARCHAR(100),
    issuing_authority VARCHAR(255),

    is_verified BOOLEAN DEFAULT FALSE,
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMPTZ,

    status VARCHAR(30) DEFAULT 'active',
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_issued_certificates_student ON issued_certificates(student_id);
CREATE INDEX IF NOT EXISTS idx_issued_certificates_verification ON issued_certificates(verification_code);
CREATE INDEX IF NOT EXISTS idx_internships_student ON internships(student_id);
CREATE INDEX IF NOT EXISTS idx_internships_status ON internships(institution_id, status);
CREATE INDEX IF NOT EXISTS idx_internship_logs_internship ON internship_logs(internship_id);
CREATE INDEX IF NOT EXISTS idx_graduation_status_student ON student_graduation_status(student_id);
CREATE INDEX IF NOT EXISTS idx_graduation_status_status ON student_graduation_status(institution_id, graduation_status);
CREATE INDEX IF NOT EXISTS idx_email_logs_campaign ON email_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON email_logs(recipient_email);
CREATE INDEX IF NOT EXISTS idx_student_documents_student ON student_documents(student_id);
CREATE INDEX IF NOT EXISTS idx_student_documents_category ON student_documents(category_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE certificate_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE issued_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificate_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE internship_hosts ENABLE ROW LEVEL SECURITY;
ALTER TABLE internships ENABLE ROW LEVEL SECURITY;
ALTER TABLE internship_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE graduation_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_graduation_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE graduation_ceremonies ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies (institution-scoped access)
CREATE POLICY "Institution access" ON certificate_templates FOR ALL USING (
    institution_id IN (SELECT institution_id FROM users WHERE id = auth.uid())
);
CREATE POLICY "Institution access" ON issued_certificates FOR ALL USING (
    institution_id IN (SELECT institution_id FROM users WHERE id = auth.uid())
);
CREATE POLICY "Institution access" ON internship_hosts FOR ALL USING (
    institution_id IN (SELECT institution_id FROM users WHERE id = auth.uid())
);
CREATE POLICY "Institution access" ON internships FOR ALL USING (
    institution_id IN (SELECT institution_id FROM users WHERE id = auth.uid())
);
CREATE POLICY "Institution access" ON internship_logs FOR ALL USING (
    internship_id IN (SELECT id FROM internships WHERE institution_id IN (SELECT institution_id FROM users WHERE id = auth.uid()))
);
CREATE POLICY "Institution access" ON graduation_requirements FOR ALL USING (
    institution_id IN (SELECT institution_id FROM users WHERE id = auth.uid())
);
CREATE POLICY "Institution access" ON student_graduation_status FOR ALL USING (
    institution_id IN (SELECT institution_id FROM users WHERE id = auth.uid())
);
CREATE POLICY "Institution access" ON graduation_ceremonies FOR ALL USING (
    institution_id IN (SELECT institution_id FROM users WHERE id = auth.uid())
);
CREATE POLICY "Institution access" ON email_templates FOR ALL USING (
    institution_id IN (SELECT institution_id FROM users WHERE id = auth.uid())
);
CREATE POLICY "Institution access" ON email_campaigns FOR ALL USING (
    institution_id IN (SELECT institution_id FROM users WHERE id = auth.uid())
);
CREATE POLICY "Institution access" ON email_logs FOR ALL USING (
    institution_id IN (SELECT institution_id FROM users WHERE id = auth.uid())
);
CREATE POLICY "Institution access" ON email_settings FOR ALL USING (
    institution_id IN (SELECT institution_id FROM users WHERE id = auth.uid())
);
CREATE POLICY "Institution access" ON document_categories FOR ALL USING (
    institution_id IN (SELECT institution_id FROM users WHERE id = auth.uid())
);
CREATE POLICY "Institution access" ON student_documents FOR ALL USING (
    institution_id IN (SELECT institution_id FROM users WHERE id = auth.uid())
);
CREATE POLICY "Institution access" ON staff_documents FOR ALL USING (
    institution_id IN (SELECT institution_id FROM users WHERE id = auth.uid())
);

-- Public verification access for certificates
CREATE POLICY "Public verification" ON certificate_verifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Public verification read" ON issued_certificates FOR SELECT USING (
    verification_code IS NOT NULL AND status = 'issued'
);

-- ============================================================================
-- DEFAULT DATA
-- ============================================================================

-- Insert default document categories (will be copied per institution on signup)
-- This is handled in application code during institution setup
