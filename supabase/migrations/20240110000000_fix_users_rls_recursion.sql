-- ============================================
-- FIX: Infinite recursion in users RLS policy
-- ============================================
-- The original admin policy caused infinite recursion by querying
-- the users table within the policy.
-- This migration fixes it by using SECURITY DEFINER functions.

-- Create helper function to check if current user is an institution admin
CREATE OR REPLACE FUNCTION is_institution_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (SELECT role = 'institution_admin' FROM users WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Keep old function for backward compatibility
CREATE OR REPLACE FUNCTION is_center_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN is_institution_admin();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the old problematic policies
DROP POLICY IF EXISTS "Center admins can manage their center's users" ON users;
DROP POLICY IF EXISTS "Institution admins can manage their center's users" ON users;

-- Note: The actual policy for institution admins is now created in migration 034
-- This migration just ensures the helper functions exist
