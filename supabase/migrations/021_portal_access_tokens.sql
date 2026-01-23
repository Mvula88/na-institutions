-- =============================================
-- Portal Authentication System
-- =============================================
-- Supports both:
-- 1. Email/password login (via Supabase Auth)
-- 2. Secure token-based access links (JWT tokens)

-- Add auth_user_id to students table for email/password login
ALTER TABLE students ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_students_auth_user_id ON students(auth_user_id);

-- Add auth_user_id to teachers table for email/password login
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_teachers_auth_user_id ON teachers(auth_user_id);

-- Portal access tokens table
CREATE TABLE portal_access_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    center_id UUID NOT NULL REFERENCES tutorial_centers(id) ON DELETE CASCADE,

    -- Token ownership
    entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('student', 'teacher', 'parent')),
    entity_id UUID NOT NULL, -- References student, teacher, or parent ID

    -- Token details
    token_hash VARCHAR(64) NOT NULL, -- SHA256 hash of the token for lookup

    -- Expiration and usage
    expires_at TIMESTAMPTZ NOT NULL,
    last_used_at TIMESTAMPTZ,
    is_revoked BOOLEAN DEFAULT FALSE,

    -- Security tracking
    created_ip VARCHAR(50),
    last_ip VARCHAR(50),
    user_agent TEXT,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),

    UNIQUE(token_hash)
);

-- Indexes for performance
CREATE INDEX idx_portal_tokens_entity ON portal_access_tokens(entity_type, entity_id);
CREATE INDEX idx_portal_tokens_hash ON portal_access_tokens(token_hash);
CREATE INDEX idx_portal_tokens_expires ON portal_access_tokens(expires_at) WHERE is_revoked = FALSE;
CREATE INDEX idx_portal_tokens_center ON portal_access_tokens(center_id);

-- Portal access logs for audit trail
CREATE TABLE portal_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    center_id UUID NOT NULL REFERENCES tutorial_centers(id) ON DELETE CASCADE,

    -- Access details
    entity_type VARCHAR(20) NOT NULL,
    entity_id UUID NOT NULL,
    token_id UUID REFERENCES portal_access_tokens(id) ON DELETE SET NULL,

    -- Request info
    ip_address VARCHAR(50),
    user_agent TEXT,
    page_path TEXT,

    -- Status
    access_granted BOOLEAN NOT NULL,
    failure_reason TEXT,

    -- Timestamp
    accessed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_portal_access_logs_entity ON portal_access_logs(entity_type, entity_id);
CREATE INDEX idx_portal_access_logs_center ON portal_access_logs(center_id);
CREATE INDEX idx_portal_access_logs_date ON portal_access_logs(accessed_at);

-- Enable RLS
ALTER TABLE portal_access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_access_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for portal_access_tokens
CREATE POLICY "Super admins can manage all tokens"
    ON portal_access_tokens FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'super_admin'
        )
    );

CREATE POLICY "Center admins can manage their center tokens"
    ON portal_access_tokens FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.center_id = portal_access_tokens.center_id
            AND users.role IN ('center_admin', 'center_staff')
        )
    );

-- RLS Policies for portal_access_logs
CREATE POLICY "Super admins can view all logs"
    ON portal_access_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'super_admin'
        )
    );

CREATE POLICY "Center admins can view their center logs"
    ON portal_access_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.center_id = portal_access_logs.center_id
            AND users.role IN ('center_admin', 'center_staff')
        )
    );

-- Function to clean up expired tokens (can be called by cron)
CREATE OR REPLACE FUNCTION cleanup_expired_portal_tokens()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM portal_access_tokens
    WHERE expires_at < NOW() - INTERVAL '7 days'
    OR (is_revoked = TRUE AND created_at < NOW() - INTERVAL '30 days');

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment
COMMENT ON TABLE portal_access_tokens IS 'Stores hashed portal access tokens for students, teachers, and parents with expiration and revocation support';
COMMENT ON TABLE portal_access_logs IS 'Audit log for portal access attempts';
