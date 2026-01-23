-- Add auth_user_id column to students and teachers tables
-- This links the student/teacher record to their Supabase Auth user account

-- Add auth_user_id to students table
ALTER TABLE students
ADD COLUMN IF NOT EXISTS auth_user_id uuid REFERENCES auth.users(id);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_students_auth_user_id ON students(auth_user_id);

-- Add auth_user_id to teachers table
ALTER TABLE teachers
ADD COLUMN IF NOT EXISTS auth_user_id uuid REFERENCES auth.users(id);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_teachers_auth_user_id ON teachers(auth_user_id);

-- Add comment for documentation
COMMENT ON COLUMN students.auth_user_id IS 'Links to auth.users for portal login';
COMMENT ON COLUMN teachers.auth_user_id IS 'Links to auth.users for portal login';
