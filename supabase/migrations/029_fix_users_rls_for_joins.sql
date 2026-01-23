-- ============================================
-- FIX: Allow users to read their own profile with joins to tutorial_centers
-- ============================================

-- Step 1: Ensure users can read their own profile
DROP POLICY IF EXISTS "Users can read their own profile" ON users;
DROP POLICY IF EXISTS "Users can read their own profile with joins" ON users;

CREATE POLICY "Users can read their own profile"
    ON users FOR SELECT
    USING (id = auth.uid());

-- Step 2: Allow reading tutorial_centers when needed for joins
-- This allows the foreign key join to work
DROP POLICY IF EXISTS "Allow reading centers for authenticated users" ON tutorial_centers;
DROP POLICY IF EXISTS "Users can read their center" ON tutorial_centers;

CREATE POLICY "Users can read their center"
    ON tutorial_centers FOR SELECT
    USING (
        -- Allow if user's center_id matches this center
        id IN (
            SELECT center_id 
            FROM users 
            WHERE id = auth.uid() 
            AND center_id IS NOT NULL
        )
        OR
        -- Allow if user is super admin (center_id is NULL, so allow all)
        EXISTS (
            SELECT 1 
            FROM users 
            WHERE id = auth.uid() 
            AND role = 'super_admin'
        )
    );

-- Verify policies
SELECT 
    tablename,
    policyname,
    cmd,
    qual
FROM pg_policies
WHERE tablename IN ('users', 'tutorial_centers')
ORDER BY tablename, policyname;
