-- ============================================
-- ENHANCEMENTS: SMS Credits, Timetable, Reports
-- ============================================

-- ============================================
-- SMS CREDITS TRACKING
-- Add SMS credits/balance to tutorial centers
-- ============================================

ALTER TABLE tutorial_centers
ADD COLUMN IF NOT EXISTS sms_credits INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS sms_credits_used INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS sms_low_balance_threshold INT DEFAULT 50;

-- SMS Credit Transactions (for tracking purchases and usage)
CREATE TABLE sms_credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    center_id UUID NOT NULL REFERENCES tutorial_centers(id) ON DELETE CASCADE,

    -- Transaction details
    transaction_type VARCHAR(20) NOT NULL, -- 'purchase', 'usage', 'refund', 'bonus'
    amount INT NOT NULL, -- positive for credits added, negative for usage
    balance_after INT NOT NULL, -- balance after this transaction

    -- Reference
    description TEXT,
    campaign_id UUID REFERENCES sms_campaigns(id) ON DELETE SET NULL,

    -- Metadata
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sms_credit_transactions_center_id ON sms_credit_transactions(center_id);
CREATE INDEX idx_sms_credit_transactions_created_at ON sms_credit_transactions(created_at);

ALTER TABLE sms_credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can do everything with sms_credit_transactions"
    ON sms_credit_transactions FOR ALL
    USING (is_super_admin());

CREATE POLICY "Center users can view their sms_credit_transactions"
    ON sms_credit_transactions FOR SELECT
    USING (center_id = get_user_center_id());

-- ============================================
-- CLASS TIMETABLE SYSTEM
-- ============================================

-- Timetable periods (define time slots)
CREATE TABLE timetable_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    center_id UUID NOT NULL REFERENCES tutorial_centers(id) ON DELETE CASCADE,

    -- Period details
    name VARCHAR(50) NOT NULL, -- e.g., "Period 1", "Break", "Lunch"
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    period_order INT NOT NULL, -- for ordering

    -- Type
    period_type VARCHAR(20) DEFAULT 'class', -- 'class', 'break', 'lunch', 'assembly'

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(center_id, name)
);

-- Timetable entries (actual schedule)
CREATE TABLE timetable_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    center_id UUID NOT NULL REFERENCES tutorial_centers(id) ON DELETE CASCADE,

    -- Schedule details
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
    period_id UUID NOT NULL REFERENCES timetable_periods(id) ON DELETE CASCADE,

    -- Day of week (1=Monday, 7=Sunday)
    day_of_week INT NOT NULL CHECK (day_of_week >= 1 AND day_of_week <= 7),

    -- Room/Venue (optional)
    room VARCHAR(50),

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure no double-booking of class+period+day
    UNIQUE(class_id, period_id, day_of_week)
);

-- Indexes for timetable
CREATE INDEX idx_timetable_periods_center_id ON timetable_periods(center_id);
CREATE INDEX idx_timetable_entries_center_id ON timetable_entries(center_id);
CREATE INDEX idx_timetable_entries_class_id ON timetable_entries(class_id);
CREATE INDEX idx_timetable_entries_teacher_id ON timetable_entries(teacher_id);
CREATE INDEX idx_timetable_entries_day_of_week ON timetable_entries(day_of_week);

-- RLS for timetable
ALTER TABLE timetable_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetable_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can do everything with timetable_periods"
    ON timetable_periods FOR ALL
    USING (is_super_admin());

CREATE POLICY "Center users can manage their timetable_periods"
    ON timetable_periods FOR ALL
    USING (center_id = get_user_center_id());

CREATE POLICY "Super admins can do everything with timetable_entries"
    ON timetable_entries FOR ALL
    USING (is_super_admin());

CREATE POLICY "Center users can manage their timetable_entries"
    ON timetable_entries FOR ALL
    USING (center_id = get_user_center_id());

-- Triggers
CREATE TRIGGER update_timetable_periods_updated_at
    BEFORE UPDATE ON timetable_periods
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_timetable_entries_updated_at
    BEFORE UPDATE ON timetable_entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- REPORT CARDS / STUDENT REPORTS
-- ============================================

-- Report card terms/periods
CREATE TABLE report_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    center_id UUID NOT NULL REFERENCES tutorial_centers(id) ON DELETE CASCADE,

    -- Period details
    name VARCHAR(100) NOT NULL, -- e.g., "Term 1 2024", "Quarter 2"
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    academic_year VARCHAR(10),

    -- Status
    is_current BOOLEAN DEFAULT FALSE,
    is_published BOOLEAN DEFAULT FALSE,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(center_id, name)
);

-- Student report cards
CREATE TABLE student_report_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    center_id UUID NOT NULL REFERENCES tutorial_centers(id) ON DELETE CASCADE,

    -- References
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    report_period_id UUID NOT NULL REFERENCES report_periods(id) ON DELETE CASCADE,
    class_id UUID REFERENCES classes(id) ON DELETE SET NULL,

    -- Overall results
    total_marks DECIMAL(10,2),
    total_possible DECIMAL(10,2),
    average_percentage DECIMAL(5,2),
    overall_grade VARCHAR(5),
    class_rank INT,

    -- Comments
    class_teacher_comment TEXT,
    principal_comment TEXT,

    -- Attendance summary
    days_present INT DEFAULT 0,
    days_absent INT DEFAULT 0,
    days_late INT DEFAULT 0,

    -- Status
    status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'reviewed', 'published'

    -- Metadata
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    published_at TIMESTAMPTZ,

    UNIQUE(student_id, report_period_id)
);

-- Subject results for report cards
CREATE TABLE report_card_subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_card_id UUID NOT NULL REFERENCES student_report_cards(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,

    -- Marks
    marks_obtained DECIMAL(10,2),
    max_marks DECIMAL(10,2),
    percentage DECIMAL(5,2),
    grade VARCHAR(5),

    -- Teacher comment
    teacher_comment TEXT,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(report_card_id, subject_id)
);

-- Indexes for report cards
CREATE INDEX idx_report_periods_center_id ON report_periods(center_id);
CREATE INDEX idx_report_periods_is_current ON report_periods(is_current);
CREATE INDEX idx_student_report_cards_center_id ON student_report_cards(center_id);
CREATE INDEX idx_student_report_cards_student_id ON student_report_cards(student_id);
CREATE INDEX idx_student_report_cards_report_period_id ON student_report_cards(report_period_id);
CREATE INDEX idx_report_card_subjects_report_card_id ON report_card_subjects(report_card_id);

-- RLS for report cards
ALTER TABLE report_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_report_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_card_subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can do everything with report_periods"
    ON report_periods FOR ALL
    USING (is_super_admin());

CREATE POLICY "Center users can manage their report_periods"
    ON report_periods FOR ALL
    USING (center_id = get_user_center_id());

CREATE POLICY "Super admins can do everything with student_report_cards"
    ON student_report_cards FOR ALL
    USING (is_super_admin());

CREATE POLICY "Center users can manage their student_report_cards"
    ON student_report_cards FOR ALL
    USING (center_id = get_user_center_id());

CREATE POLICY "Super admins can do everything with report_card_subjects"
    ON report_card_subjects FOR ALL
    USING (is_super_admin());

CREATE POLICY "Center users can manage their report_card_subjects"
    ON report_card_subjects FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM student_report_cards
            WHERE student_report_cards.id = report_card_subjects.report_card_id
            AND student_report_cards.center_id = get_user_center_id()
        )
    );

-- Triggers
CREATE TRIGGER update_report_periods_updated_at
    BEFORE UPDATE ON report_periods
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
