-- Migration: Fix infinite recursion in users RLS policies
-- Description: Use SECURITY DEFINER functions to avoid recursion when checking user roles

-- First, drop all existing policies on users table to start fresh
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can view users in their institution" ON users;
DROP POLICY IF EXISTS "Institution admins can manage their institution's users" ON users;
DROP POLICY IF EXISTS "Super admins can do everything" ON users;
DROP POLICY IF EXISTS "Super admins can manage all users" ON users;
DROP POLICY IF EXISTS "Admins can view all users in their institution" ON users;
DROP POLICY IF EXISTS "Institution admins can insert users" ON users;
DROP POLICY IF EXISTS "Institution admins can update users" ON users;
DROP POLICY IF EXISTS "Institution admins can delete users" ON users;
DROP POLICY IF EXISTS "Service role bypass" ON users;

-- Create helper functions with SECURITY DEFINER to avoid recursion
-- These functions run with the privileges of the function owner (postgres)

CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS TEXT AS $$
  SELECT role FROM users WHERE id = user_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_user_institution_id(user_id UUID)
RETURNS UUID AS $$
  SELECT institution_id FROM users WHERE id = user_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_super_admin(user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM users WHERE id = user_id AND role = 'super_admin');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Now create policies using these functions

-- Policy 1: Users can always view their own profile
CREATE POLICY "Users can view own profile"
    ON users FOR SELECT
    USING (id = auth.uid());

-- Policy 2: Super admins can view all users (using helper function)
CREATE POLICY "Super admins can view all users"
    ON users FOR SELECT
    USING (is_super_admin(auth.uid()));

-- Policy 3: Users can view other users in their institution (using helper function)
CREATE POLICY "Users can view institution users"
    ON users FOR SELECT
    USING (
        institution_id = get_user_institution_id(auth.uid())
        AND institution_id IS NOT NULL
    );

-- Policy 4: Super admins can insert/update/delete all users
CREATE POLICY "Super admins can insert users"
    ON users FOR INSERT
    WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update users"
    ON users FOR UPDATE
    USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete users"
    ON users FOR DELETE
    USING (is_super_admin(auth.uid()));

-- Policy 5: Institution admins can manage users in their institution
CREATE POLICY "Institution admins can insert institution users"
    ON users FOR INSERT
    WITH CHECK (
        get_user_role(auth.uid()) = 'institution_admin'
        AND institution_id = get_user_institution_id(auth.uid())
    );

CREATE POLICY "Institution admins can update institution users"
    ON users FOR UPDATE
    USING (
        get_user_role(auth.uid()) = 'institution_admin'
        AND institution_id = get_user_institution_id(auth.uid())
    );

CREATE POLICY "Institution admins can delete institution users"
    ON users FOR DELETE
    USING (
        get_user_role(auth.uid()) = 'institution_admin'
        AND institution_id = get_user_institution_id(auth.uid())
        AND id != auth.uid()  -- Can't delete themselves
    );

-- Policy 6: Users can update their own profile (limited fields)
CREATE POLICY "Users can update own profile"
    ON users FOR UPDATE
    USING (id = auth.uid());
