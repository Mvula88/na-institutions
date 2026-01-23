-- Migration: Create Super Admin User
-- Description: Creates a super admin user with full system access
-- Email: ismaelmvula@gmail.com
-- Password: NdapuniKwa@1953

-- Note: This script should be run in Supabase SQL Editor
-- The password will be hashed by Supabase Auth

DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Step 1: Create auth user using Supabase Auth Admin API
  -- This needs to be done via the Supabase Dashboard or API
  -- For SQL-only approach, we'll insert the user profile expecting auth user exists
  
  -- Generate a UUID for the super admin (you'll need to replace this with actual auth user ID)
  -- Or create the auth user first through Supabase Dashboard: Authentication > Users > Add User
  
  RAISE NOTICE 'To complete super admin creation:';
  RAISE NOTICE '1. Go to Supabase Dashboard > Authentication > Users';
  RAISE NOTICE '2. Click "Add User" and create user with:';
  RAISE NOTICE '   - Email: ismaelmvula@gmail.com';
  RAISE NOTICE '   - Password: NdapuniKwa@1953';
  RAISE NOTICE '   - Email confirmation: Enable';
  RAISE NOTICE '3. Copy the User ID from the created user';
  RAISE NOTICE '4. Run the second part of this script with the User ID';
  RAISE NOTICE '';
  RAISE NOTICE 'Then uncomment and run the INSERT statement below, replacing <USER_ID>';

END $$;

-- Step 2: Insert user profile in users table
-- IMPORTANT: Replace <USER_ID> with the actual UUID from the auth user created above
-- Uncomment the lines below after creating the auth user in Supabase Dashboard

/*
INSERT INTO users (
  id,
  email,
  full_name,
  role,
  center_id,
  is_active,
  created_at,
  updated_at
) VALUES (
  '<USER_ID>'::uuid,  -- Replace with actual auth user UUID
  'ismaelmvula@gmail.com',
  'Ismael Mvula',
  'super_admin',
  NULL,  -- Super admins have no center association
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE
SET
  role = 'super_admin',
  is_active = true,
  updated_at = NOW();

-- Verify the super admin was created
SELECT 
  id,
  email,
  full_name,
  role,
  is_active,
  created_at
FROM users
WHERE email = 'ismaelmvula@gmail.com';
*/

-- Alternative: If you want to promote an existing user to super_admin:
/*
UPDATE users
SET 
  role = 'super_admin',
  center_id = NULL,
  is_active = true,
  updated_at = NOW()
WHERE email = 'ismaelmvula@gmail.com';
*/
