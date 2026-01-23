-- =============================================
-- Notification System
-- =============================================
-- Supports:
-- 1. Attendance notifications (immediate, daily digest, weekly)
-- 2. Report card publication notifications
-- 3. Fee reminders
-- 4. Custom notifications from center admins

-- Notification queue table
CREATE TABLE notification_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    center_id UUID NOT NULL REFERENCES tutorial_centers(id) ON DELETE CASCADE,

    -- Recipient
    recipient_type VARCHAR(20) NOT NULL CHECK (recipient_type IN ('parent', 'student', 'teacher')),
    recipient_id UUID NOT NULL,

    -- Notification content
    notification_type VARCHAR(50) NOT NULL, -- 'attendance_absent', 'attendance_late', 'report_card_published', 'fee_due', 'fee_overdue', 'grade_recorded', 'custom'
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,

    -- Delivery
    channel VARCHAR(20) NOT NULL CHECK (channel IN ('email', 'sms', 'both')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'sent', 'failed', 'cancelled')),

    -- Scheduling
    scheduled_for TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ,

    -- Related entity (optional)
    related_entity_type VARCHAR(50), -- 'student', 'attendance', 'report_card', 'fee_transaction', 'grade'
    related_entity_id UUID,

    -- Error tracking
    error_message TEXT,
    retry_count INT DEFAULT 0,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- Center notification settings
CREATE TABLE notification_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    center_id UUID NOT NULL REFERENCES tutorial_centers(id) ON DELETE CASCADE UNIQUE,

    -- Attendance notification settings
    attendance_immediate_enabled BOOLEAN DEFAULT TRUE,
    attendance_daily_enabled BOOLEAN DEFAULT TRUE,
    attendance_daily_time TIME DEFAULT '18:00:00',
    attendance_weekly_enabled BOOLEAN DEFAULT TRUE,
    attendance_weekly_day INT DEFAULT 5, -- 0=Sunday, 5=Friday

    -- Report card notification settings
    report_card_email_enabled BOOLEAN DEFAULT TRUE,
    report_card_sms_enabled BOOLEAN DEFAULT FALSE,

    -- Fee notification settings
    fee_reminder_enabled BOOLEAN DEFAULT TRUE,
    fee_reminder_days_before INT DEFAULT 7, -- Days before due date
    fee_overdue_enabled BOOLEAN DEFAULT TRUE,

    -- Grade notification settings
    grade_notification_enabled BOOLEAN DEFAULT TRUE,

    -- SMS settings
    sms_sender_name VARCHAR(11) DEFAULT 'School', -- Max 11 chars for SMS sender ID
    sms_balance_alert_threshold INT DEFAULT 100,

    -- Email settings
    email_from_name VARCHAR(100),
    email_reply_to VARCHAR(255),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification templates
CREATE TABLE notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    center_id UUID REFERENCES tutorial_centers(id) ON DELETE CASCADE,

    -- Template details
    template_key VARCHAR(50) NOT NULL, -- 'attendance_absent', 'fee_reminder', etc.
    template_name VARCHAR(100) NOT NULL,
    channel VARCHAR(20) NOT NULL CHECK (channel IN ('email', 'sms')),

    -- Content
    subject VARCHAR(255), -- For email only
    body TEXT NOT NULL,

    -- Available variables (for documentation)
    available_variables TEXT[], -- ['student_name', 'center_name', 'date', etc.]

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(center_id, template_key, channel)
);

-- Notification logs for audit
CREATE TABLE notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID REFERENCES notification_queue(id) ON DELETE SET NULL,
    center_id UUID NOT NULL REFERENCES tutorial_centers(id) ON DELETE CASCADE,

    -- Delivery details
    channel VARCHAR(20) NOT NULL,
    recipient_address VARCHAR(255) NOT NULL, -- Email or phone
    status VARCHAR(20) NOT NULL,

    -- Response from provider
    provider VARCHAR(50), -- 'twilio', 'sendgrid', etc.
    provider_message_id VARCHAR(255),
    provider_response TEXT,

    -- Cost tracking
    cost_units DECIMAL(10, 4), -- SMS units or email count

    -- Timestamp
    sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_notification_queue_status ON notification_queue(status) WHERE status IN ('pending', 'scheduled');
CREATE INDEX idx_notification_queue_scheduled ON notification_queue(scheduled_for) WHERE status = 'scheduled';
CREATE INDEX idx_notification_queue_center ON notification_queue(center_id);
CREATE INDEX idx_notification_queue_recipient ON notification_queue(recipient_type, recipient_id);
CREATE INDEX idx_notification_logs_center ON notification_logs(center_id);
CREATE INDEX idx_notification_logs_sent ON notification_logs(sent_at);

-- Enable RLS
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notification_queue
CREATE POLICY "Super admins can manage all notifications"
    ON notification_queue FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'super_admin'
        )
    );

CREATE POLICY "Center admins can manage their notifications"
    ON notification_queue FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.center_id = notification_queue.center_id
            AND users.role IN ('center_admin', 'center_staff')
        )
    );

-- RLS Policies for notification_settings
CREATE POLICY "Super admins can manage all settings"
    ON notification_settings FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'super_admin'
        )
    );

CREATE POLICY "Center admins can manage their settings"
    ON notification_settings FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.center_id = notification_settings.center_id
            AND users.role IN ('center_admin', 'center_staff')
        )
    );

-- RLS Policies for notification_templates
CREATE POLICY "Super admins can manage all templates"
    ON notification_templates FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'super_admin'
        )
    );

CREATE POLICY "Center admins can manage their templates"
    ON notification_templates FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND (users.center_id = notification_templates.center_id OR notification_templates.center_id IS NULL)
            AND users.role IN ('center_admin', 'center_staff')
        )
    );

-- RLS Policies for notification_logs
CREATE POLICY "Super admins can view all logs"
    ON notification_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'super_admin'
        )
    );

CREATE POLICY "Center admins can view their logs"
    ON notification_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.center_id = notification_logs.center_id
            AND users.role IN ('center_admin', 'center_staff')
        )
    );

-- Insert default notification templates
INSERT INTO notification_templates (template_key, template_name, channel, subject, body, available_variables, is_default)
VALUES
    ('attendance_absent', 'Attendance - Absent Alert', 'sms',
     NULL,
     '{{center_name}}: {{student_name}} was marked absent on {{date}}. If this is incorrect, please contact the school.',
     ARRAY['center_name', 'student_name', 'date', 'subject_name'],
     true),

    ('attendance_absent', 'Attendance - Absent Alert', 'email',
     '{{center_name}} - Attendance Alert',
     'Dear Parent/Guardian,

This is to inform you that {{student_name}} was marked absent on {{date}}.

If you believe this is an error, please contact the school administration.

Best regards,
{{center_name}}',
     ARRAY['center_name', 'student_name', 'date', 'subject_name'],
     true),

    ('attendance_daily', 'Attendance - Daily Digest', 'email',
     '{{center_name}} - Daily Attendance Summary',
     'Dear Parent/Guardian,

Here is the attendance summary for {{student_name}} on {{date}}:

{{attendance_summary}}

Best regards,
{{center_name}}',
     ARRAY['center_name', 'student_name', 'date', 'attendance_summary'],
     true),

    ('report_card_published', 'Report Card Published', 'email',
     '{{center_name}} - Report Card Available',
     'Dear Parent/Guardian,

The report card for {{student_name}} for {{term}} has been published.

You can view the report card by logging into the parent portal.

Best regards,
{{center_name}}',
     ARRAY['center_name', 'student_name', 'term', 'portal_link'],
     true),

    ('report_card_published', 'Report Card Published', 'sms',
     NULL,
     '{{center_name}}: The report card for {{student_name}} ({{term}}) is now available. View it on the parent portal.',
     ARRAY['center_name', 'student_name', 'term'],
     true),

    ('fee_reminder', 'Fee Reminder', 'sms',
     NULL,
     '{{center_name}}: Reminder - Fee of R{{amount}} for {{student_name}} is due on {{due_date}}. Please arrange payment.',
     ARRAY['center_name', 'student_name', 'amount', 'due_date', 'fee_description'],
     true),

    ('fee_overdue', 'Fee Overdue', 'sms',
     NULL,
     '{{center_name}}: URGENT - Fee of R{{amount}} for {{student_name}} is overdue (was due {{due_date}}). Please pay immediately to avoid penalties.',
     ARRAY['center_name', 'student_name', 'amount', 'due_date', 'fee_description'],
     true);

-- Function to queue attendance notification
CREATE OR REPLACE FUNCTION queue_attendance_notification(
    p_student_id UUID,
    p_attendance_status VARCHAR,
    p_attendance_date DATE
)
RETURNS VOID AS $$
DECLARE
    v_student RECORD;
    v_parent RECORD;
    v_settings RECORD;
    v_template TEXT;
    v_message TEXT;
    v_title TEXT;
BEGIN
    -- Get student info
    SELECT s.id, s.full_name, s.center_id, tc.name as center_name
    INTO v_student
    FROM students s
    JOIN tutorial_centers tc ON tc.id = s.center_id
    WHERE s.id = p_student_id;

    IF v_student IS NULL THEN
        RETURN;
    END IF;

    -- Get notification settings
    SELECT * INTO v_settings
    FROM notification_settings
    WHERE center_id = v_student.center_id;

    -- Check if immediate notifications are enabled
    IF v_settings IS NULL OR NOT v_settings.attendance_immediate_enabled THEN
        RETURN;
    END IF;

    -- Only notify for absences
    IF p_attendance_status != 'absent' THEN
        RETURN;
    END IF;

    -- Get parents who want immediate notifications
    FOR v_parent IN
        SELECT p.id, p.full_name, p.phone, p.email,
               p.notification_attendance, p.notification_sms, p.notification_email
        FROM parents p
        JOIN parent_students ps ON ps.parent_id = p.id
        WHERE ps.student_id = p_student_id
        AND ps.verified_at IS NOT NULL
        AND ps.can_receive_notifications = TRUE
        AND p.notification_attendance = 'immediate'
    LOOP
        v_title := v_student.center_name || ' - Attendance Alert';
        v_message := v_student.center_name || ': ' || v_student.full_name || ' was marked absent on ' || to_char(p_attendance_date, 'DD Mon YYYY') || '.';

        -- Determine channel
        IF v_parent.notification_sms AND v_parent.notification_email THEN
            INSERT INTO notification_queue (center_id, recipient_type, recipient_id, notification_type, title, message, channel, related_entity_type, related_entity_id)
            VALUES (v_student.center_id, 'parent', v_parent.id, 'attendance_absent', v_title, v_message, 'both', 'student', p_student_id);
        ELSIF v_parent.notification_sms THEN
            INSERT INTO notification_queue (center_id, recipient_type, recipient_id, notification_type, title, message, channel, related_entity_type, related_entity_id)
            VALUES (v_student.center_id, 'parent', v_parent.id, 'attendance_absent', v_title, v_message, 'sms', 'student', p_student_id);
        ELSIF v_parent.notification_email THEN
            INSERT INTO notification_queue (center_id, recipient_type, recipient_id, notification_type, title, message, channel, related_entity_type, related_entity_id)
            VALUES (v_student.center_id, 'parent', v_parent.id, 'attendance_absent', v_title, v_message, 'email', 'student', p_student_id);
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for attendance notifications
CREATE OR REPLACE FUNCTION trigger_attendance_notification()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'absent' THEN
        PERFORM queue_attendance_notification(NEW.student_id, NEW.status, NEW.date);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Only create trigger if attendance table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'attendance') THEN
        DROP TRIGGER IF EXISTS attendance_notification_trigger ON attendance;
        CREATE TRIGGER attendance_notification_trigger
            AFTER INSERT ON attendance
            FOR EACH ROW
            EXECUTE FUNCTION trigger_attendance_notification();
    END IF;
END $$;

-- Comments
COMMENT ON TABLE notification_queue IS 'Queue for pending notifications (SMS, email) to be processed';
COMMENT ON TABLE notification_settings IS 'Per-center notification configuration';
COMMENT ON TABLE notification_templates IS 'Customizable notification message templates';
COMMENT ON TABLE notification_logs IS 'Audit log of sent notifications';
COMMENT ON FUNCTION queue_attendance_notification IS 'Queues attendance notifications for parents based on their preferences';
