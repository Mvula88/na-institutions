-- ============================================
-- FIX: Allow center admins to update their center's branding and details
-- ============================================

-- Add UPDATE policy for center admins on tutorial_centers
CREATE POLICY "Center admins can update their own center"
    ON tutorial_centers FOR UPDATE
    USING (
        id = get_user_center_id()
        AND (SELECT role FROM users WHERE id = auth.uid()) = 'center_admin'
    )
    WITH CHECK (
        id = get_user_center_id()
        AND (SELECT role FROM users WHERE id = auth.uid()) = 'center_admin'
    );
