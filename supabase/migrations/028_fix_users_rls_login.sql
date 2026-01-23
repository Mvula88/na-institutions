-- ============================================
-- FIX: Allow authenticated users to read their profile during login
-- ============================================
-- During login, users need to be able to query their own profile by email
-- after authentication but before the session is fully established.

-- First, create a SECURITY DEFINER function to check if user is super admin
-- This prevents infinite recursion
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (SELECT role = 'super_admin' FROM users WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Allow authenticated users to read their own profile by email
DROP POLICY IF EXISTS "Users can read their own profile by email" ON users;
CREATE POLICY "Users can read their own profile by email"
    ON users FOR SELECT
    USING (
        auth.uid() IS NOT NULL 
        AND email = auth.jwt()->>'email'
    );

-- Allow super admins to read all user profiles (using SECURITY DEFINER function)
DROP POLICY IF EXISTS "Super admins can read all profiles" ON users;
CREATE POLICY "Super admins can read all profiles"
    ON users FOR SELECT
    USING (is_super_admin());

-- Allow super admins to do everything with users table
DROP POLICY IF EXISTS "Super admins can do everything with users" ON users;
CREATE POLICY "Super admins can do everything with users"
    ON users FOR ALL
    USING (is_super_admin());

-- Verify policies are in place
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'users'
ORDER BY policyname;
