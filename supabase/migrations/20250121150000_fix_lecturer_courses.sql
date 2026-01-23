-- Migration to fix lecturer_courses table
-- The previous migration missed renaming subject_id to course_id in lecturer_courses

-- Rename subject_id to course_id if it still exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lecturer_courses' AND column_name = 'subject_id'
  ) THEN
    ALTER TABLE lecturer_courses RENAME COLUMN subject_id TO course_id;
  END IF;
END $$;

-- Drop old constraints if they exist
ALTER TABLE lecturer_courses DROP CONSTRAINT IF EXISTS teacher_subjects_teacher_id_subject_id_key;
ALTER TABLE lecturer_courses DROP CONSTRAINT IF EXISTS teacher_subjects_subject_id_fkey;

-- Add new constraint if course_id column exists and constraint doesn't
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lecturer_courses' AND column_name = 'course_id'
  ) THEN
    -- Add foreign key if not exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'lecturer_courses_course_id_fkey'
    ) THEN
      ALTER TABLE lecturer_courses
        ADD CONSTRAINT lecturer_courses_course_id_fkey
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;
    END IF;

    -- Add unique constraint if not exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'lecturer_courses_lecturer_id_course_id_key'
    ) THEN
      ALTER TABLE lecturer_courses
        ADD CONSTRAINT lecturer_courses_lecturer_id_course_id_key
        UNIQUE (lecturer_id, course_id);
    END IF;
  END IF;
END $$;

-- Make sure RLS is enabled
ALTER TABLE lecturer_courses ENABLE ROW LEVEL SECURITY;

-- Recreate RLS policies (drop first to avoid conflicts)
DROP POLICY IF EXISTS "Super admins can do everything with lecturer_courses" ON lecturer_courses;
DROP POLICY IF EXISTS "Institution users can manage their lecturer courses" ON lecturer_courses;

CREATE POLICY "Super admins can do everything with lecturer_courses"
    ON lecturer_courses FOR ALL
    USING (is_super_admin());

CREATE POLICY "Institution users can manage their lecturer courses"
    ON lecturer_courses FOR ALL
    USING (
        (SELECT institution_id FROM lecturers WHERE id = lecturer_id) = get_user_institution_id()
    );
