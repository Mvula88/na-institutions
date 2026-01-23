-- Verify and update super admin user profile
-- Run this in Supabase SQL Editor to ensure all fields are correct

-- First, check the current state
SELECT 
  id,
  email,
  full_name,
  role,
  center_id,
  is_active,
  created_at
FROM users
WHERE email = 'ismaelmvula@gmail.com';

-- If is_active is not true, update it:
UPDATE users
SET is_active = true
WHERE email = 'ismaelmvula@gmail.com';

-- Verify the update
SELECT 
  id,
  email,
  full_name,
  role,
  center_id,
  is_active,
  created_at
FROM users
WHERE email = 'ismaelmvula@gmail.com';
