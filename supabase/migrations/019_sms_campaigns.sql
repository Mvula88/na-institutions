-- ============================================
-- BULK SMS CAMPAIGNS SYSTEM
-- Send targeted SMS messages to groups of students/parents
-- ============================================

-- ============================================
-- SMS TEMPLATES TABLE
-- Reusable message templates
-- ============================================

CREATE TABLE sms_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    center_id UUID NOT NULL REFERENCES tutorial_centers(id) ON DELETE CASCADE,

    -- Template details
    name VARCHAR(100) NOT NULL,
    content TEXT NOT NULL, -- Template with placeholders like {{student_name}}, {{amount}}
    category VARCHAR(50), -- e.g., 'reminder', 'announcement', 'payment', 'event'

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    -- Metadata
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(center_id, name)
);

-- ============================================
-- SMS CAMPAIGNS TABLE
-- Campaign details and status
-- ============================================

CREATE TABLE sms_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    center_id UUID NOT NULL REFERENCES tutorial_centers(id) ON DELETE CASCADE,

    -- Campaign details
    name VARCHAR(200) NOT NULL,
    message TEXT NOT NULL, -- The actual message to send

    -- Targeting
    target_type VARCHAR(50) NOT NULL, -- 'all', 'grade', 'class', 'status', 'custom'
    target_grade VARCHAR(50), -- Filter by grade level
    target_class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
    target_status VARCHAR(50), -- 'active', 'inactive', 'with_balance', etc.

    -- Scheduling
    scheduled_at TIMESTAMPTZ, -- NULL means send immediately

    -- Status
    status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled'

    -- Statistics
    total_recipients INT DEFAULT 0,
    sent_count INT DEFAULT 0,
    failed_count INT DEFAULT 0,

    -- Timestamps
    sent_at TIMESTAMPTZ, -- When actually sent
    completed_at TIMESTAMPTZ, -- When all messages processed

    -- Metadata
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SMS CAMPAIGN RECIPIENTS TABLE
-- Individual recipients for each campaign
-- ============================================

CREATE TABLE sms_campaign_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES sms_campaigns(id) ON DELETE CASCADE,

    -- Recipient info
    student_id UUID REFERENCES students(id) ON DELETE SET NULL,
    phone_number VARCHAR(20) NOT NULL, -- Store the actual phone used
    recipient_name VARCHAR(200), -- Parent/guardian name or student name

    -- Status
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed'
    message_id VARCHAR(100), -- From SMS provider
    error_message TEXT,

    -- Timestamps
    sent_at TIMESTAMPTZ,

    -- Ensure unique phone per campaign
    UNIQUE(campaign_id, phone_number)
);

-- ============================================
-- SMS LOG TABLE
-- Track all SMS messages sent (for billing/auditing)
-- ============================================

CREATE TABLE sms_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    center_id UUID NOT NULL REFERENCES tutorial_centers(id) ON DELETE CASCADE,

    -- Message details
    phone_number VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    message_type VARCHAR(50), -- 'campaign', 'payment_receipt', 'fee_reminder', 'notification'

    -- Reference
    campaign_id UUID REFERENCES sms_campaigns(id) ON DELETE SET NULL,
    student_id UUID REFERENCES students(id) ON DELETE SET NULL,

    -- Result
    status VARCHAR(20) NOT NULL, -- 'sent', 'delivered', 'failed'
    message_id VARCHAR(100), -- From SMS provider
    error_message TEXT,

    -- Cost tracking (optional)
    credits_used DECIMAL(10,2) DEFAULT 1,

    -- Metadata
    sent_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX idx_sms_templates_center_id ON sms_templates(center_id);
CREATE INDEX idx_sms_templates_category ON sms_templates(category);
CREATE INDEX idx_sms_templates_is_active ON sms_templates(is_active);

CREATE INDEX idx_sms_campaigns_center_id ON sms_campaigns(center_id);
CREATE INDEX idx_sms_campaigns_status ON sms_campaigns(status);
CREATE INDEX idx_sms_campaigns_scheduled_at ON sms_campaigns(scheduled_at);
CREATE INDEX idx_sms_campaigns_created_at ON sms_campaigns(created_at);

CREATE INDEX idx_sms_campaign_recipients_campaign_id ON sms_campaign_recipients(campaign_id);
CREATE INDEX idx_sms_campaign_recipients_status ON sms_campaign_recipients(status);
CREATE INDEX idx_sms_campaign_recipients_student_id ON sms_campaign_recipients(student_id);

CREATE INDEX idx_sms_logs_center_id ON sms_logs(center_id);
CREATE INDEX idx_sms_logs_campaign_id ON sms_logs(campaign_id);
CREATE INDEX idx_sms_logs_student_id ON sms_logs(student_id);
CREATE INDEX idx_sms_logs_created_at ON sms_logs(created_at);
CREATE INDEX idx_sms_logs_message_type ON sms_logs(message_type);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE sms_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;

-- SMS Templates policies
CREATE POLICY "Super admins can do everything with sms_templates"
    ON sms_templates FOR ALL
    USING (is_super_admin());

CREATE POLICY "Center users can manage their sms_templates"
    ON sms_templates FOR ALL
    USING (center_id = get_user_center_id());

-- SMS Campaigns policies
CREATE POLICY "Super admins can do everything with sms_campaigns"
    ON sms_campaigns FOR ALL
    USING (is_super_admin());

CREATE POLICY "Center users can manage their sms_campaigns"
    ON sms_campaigns FOR ALL
    USING (center_id = get_user_center_id());

-- SMS Campaign Recipients policies
CREATE POLICY "Super admins can do everything with sms_campaign_recipients"
    ON sms_campaign_recipients FOR ALL
    USING (is_super_admin());

CREATE POLICY "Center users can manage their sms_campaign_recipients"
    ON sms_campaign_recipients FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM sms_campaigns
            WHERE sms_campaigns.id = sms_campaign_recipients.campaign_id
            AND sms_campaigns.center_id = get_user_center_id()
        )
    );

-- SMS Logs policies
CREATE POLICY "Super admins can do everything with sms_logs"
    ON sms_logs FOR ALL
    USING (is_super_admin());

CREATE POLICY "Center users can view their sms_logs"
    ON sms_logs FOR SELECT
    USING (center_id = get_user_center_id());

CREATE POLICY "Center users can insert sms_logs"
    ON sms_logs FOR INSERT
    WITH CHECK (center_id = get_user_center_id());

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_sms_templates_updated_at
    BEFORE UPDATE ON sms_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_sms_campaigns_updated_at
    BEFORE UPDATE ON sms_campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- DEFAULT TEMPLATES
-- (Optional - can be inserted on center creation)
-- ============================================

-- These would typically be inserted when a center is created
-- Example templates:
-- INSERT INTO sms_templates (center_id, name, content, category) VALUES
-- ('center-id', 'Fee Reminder', 'Dear Parent, this is a reminder that R{{amount}} is due for {{student_name}}. Please pay by {{due_date}}.', 'reminder'),
-- ('center-id', 'Payment Thank You', 'Thank you for your payment of R{{amount}} for {{student_name}}. Receipt #{{receipt_no}}.', 'payment'),
-- ('center-id', 'School Closure', 'Dear Parent, please note that school will be closed on {{date}} due to {{reason}}.', 'announcement');
