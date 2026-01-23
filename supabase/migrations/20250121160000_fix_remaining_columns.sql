-- Migration to fix remaining column renames that were missed

-- Helper function to safely rename columns
CREATE OR REPLACE FUNCTION safe_rename_column_v2(
  p_table_name TEXT,
  p_old_column TEXT,
  p_new_column TEXT
) RETURNS VOID AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = p_table_name AND column_name = p_old_column
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = p_table_name AND column_name = p_new_column
  ) THEN
    EXECUTE format('ALTER TABLE %I RENAME COLUMN %I TO %I', p_table_name, p_old_column, p_new_column);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Fix assessments table
SELECT safe_rename_column_v2('assessments', 'center_id', 'institution_id');
SELECT safe_rename_column_v2('assessments', 'subject_id', 'course_id');

-- Fix student_grades table
SELECT safe_rename_column_v2('student_grades', 'center_id', 'institution_id');

-- Fix attendance table
SELECT safe_rename_column_v2('attendance', 'center_id', 'institution_id');
SELECT safe_rename_column_v2('attendance', 'subject_id', 'course_id');
SELECT safe_rename_column_v2('attendance', 'teacher_id', 'lecturer_id');

-- Fix homework_assignments table
SELECT safe_rename_column_v2('homework_assignments', 'subject_id', 'course_id');
SELECT safe_rename_column_v2('homework_assignments', 'teacher_id', 'lecturer_id');

-- Fix exam_schedules table
SELECT safe_rename_column_v2('exam_schedules', 'subject_id', 'course_id');

-- Drop helper function
DROP FUNCTION IF EXISTS safe_rename_column_v2(TEXT, TEXT, TEXT);

-- Update foreign key constraints for assessments
DO $$
BEGIN
  -- Drop old constraints
  ALTER TABLE assessments DROP CONSTRAINT IF EXISTS assessments_center_id_fkey;
  ALTER TABLE assessments DROP CONSTRAINT IF EXISTS assessments_subject_id_fkey;

  -- Add new constraints
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assessments' AND column_name = 'institution_id') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'assessments_institution_id_fkey') THEN
      ALTER TABLE assessments ADD CONSTRAINT assessments_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assessments' AND column_name = 'course_id') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'assessments_course_id_fkey') THEN
      ALTER TABLE assessments ADD CONSTRAINT assessments_course_id_fkey FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- Update indexes for assessments
DROP INDEX IF EXISTS idx_assessments_center_id;
CREATE INDEX IF NOT EXISTS idx_assessments_institution_id ON assessments(institution_id);
CREATE INDEX IF NOT EXISTS idx_assessments_course_id ON assessments(course_id);
