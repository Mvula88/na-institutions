-- Migration: 032_rename_to_institutions.sql
-- Description: Transform NamClass to NamInstitutions
-- - Rename tables from tutorial center terminology to institution terminology
-- - Rename center_id columns to institution_id across all tables
-- - Add new enums for institution types and qualification types
-- - Add new fields for NQF compliance and student number customization

-- ============================================
-- PART 1: CREATE NEW ENUM TYPES (IF NOT EXISTS)
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'institution_type') THEN
    CREATE TYPE institution_type AS ENUM (
      'vtc',
      'nursing_college',
      'university',
      'private_college',
      'polytechnic',
      'other'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'qualification_type') THEN
    CREATE TYPE qualification_type AS ENUM (
      'certificate',
      'higher_certificate',
      'diploma',
      'advanced_diploma',
      'bachelors_degree',
      'honours_degree',
      'masters_degree',
      'doctorate',
      'other'
    );
  END IF;
END $$;

-- ============================================
-- PART 2: UPDATE USER ROLE ENUM
-- ============================================

DO $$
BEGIN
  -- Check if 'center_admin' value exists before renaming
  IF EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'center_admin' AND enumtypid = 'user_role'::regtype) THEN
    ALTER TYPE user_role RENAME VALUE 'center_admin' TO 'institution_admin';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'center_staff' AND enumtypid = 'user_role'::regtype) THEN
    ALTER TYPE user_role RENAME VALUE 'center_staff' TO 'institution_staff';
  END IF;
END $$;

-- ============================================
-- PART 3: RENAME MAIN TABLES (IF EXIST)
-- ============================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tutorial_centers') THEN
    ALTER TABLE tutorial_centers RENAME TO institutions;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'teachers') THEN
    ALTER TABLE teachers RENAME TO lecturers;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subjects') THEN
    ALTER TABLE subjects RENAME TO courses;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'classes') THEN
    ALTER TABLE classes RENAME TO programs;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'teacher_subjects') THEN
    ALTER TABLE teacher_subjects RENAME TO lecturer_courses;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'student_subjects') THEN
    ALTER TABLE student_subjects RENAME TO student_enrollments;
  END IF;
END $$;

-- ============================================
-- PART 4: RENAME FOREIGN KEY COLUMNS
-- (center_id → institution_id)
-- ============================================

-- Helper function to safely rename columns
CREATE OR REPLACE FUNCTION safe_rename_column(
  p_table_name TEXT,
  p_old_column TEXT,
  p_new_column TEXT
) RETURNS VOID AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = p_table_name AND column_name = p_old_column
  ) THEN
    EXECUTE format('ALTER TABLE %I RENAME COLUMN %I TO %I', p_table_name, p_old_column, p_new_column);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Rename center_id to institution_id in all tables
SELECT safe_rename_column('users', 'center_id', 'institution_id');
SELECT safe_rename_column('students', 'center_id', 'institution_id');
SELECT safe_rename_column('lecturers', 'center_id', 'institution_id');
SELECT safe_rename_column('courses', 'center_id', 'institution_id');
SELECT safe_rename_column('programs', 'center_id', 'institution_id');
SELECT safe_rename_column('fee_structures', 'center_id', 'institution_id');
SELECT safe_rename_column('student_fees', 'center_id', 'institution_id');
SELECT safe_rename_column('payments', 'center_id', 'institution_id');
SELECT safe_rename_column('payment_reversals', 'center_id', 'institution_id');
SELECT safe_rename_column('refunds', 'center_id', 'institution_id');
SELECT safe_rename_column('hostel_blocks', 'center_id', 'institution_id');
SELECT safe_rename_column('hostel_rooms', 'center_id', 'institution_id');
SELECT safe_rename_column('hostel_allocations', 'center_id', 'institution_id');
SELECT safe_rename_column('audit_logs', 'center_id', 'institution_id');
SELECT safe_rename_column('transport_routes', 'center_id', 'institution_id');
SELECT safe_rename_column('vehicles', 'center_id', 'institution_id');
SELECT safe_rename_column('student_transport', 'center_id', 'institution_id');
SELECT safe_rename_column('books', 'center_id', 'institution_id');
SELECT safe_rename_column('book_borrowings', 'center_id', 'institution_id');
SELECT safe_rename_column('book_categories', 'center_id', 'institution_id');
SELECT safe_rename_column('client_contracts', 'center_id', 'institution_id');
SELECT safe_rename_column('referral_codes', 'center_id', 'institution_id');
SELECT safe_rename_column('attendance_records', 'center_id', 'institution_id');
SELECT safe_rename_column('grades', 'center_id', 'institution_id');
SELECT safe_rename_column('report_cards', 'center_id', 'institution_id');
SELECT safe_rename_column('sms_campaigns', 'center_id', 'institution_id');
SELECT safe_rename_column('sms_messages', 'center_id', 'institution_id');
SELECT safe_rename_column('sms_credits', 'center_id', 'institution_id');
SELECT safe_rename_column('portal_access_tokens', 'center_id', 'institution_id');
SELECT safe_rename_column('parent_accounts', 'center_id', 'institution_id');
SELECT safe_rename_column('notifications', 'center_id', 'institution_id');
SELECT safe_rename_column('notification_preferences', 'center_id', 'institution_id');
SELECT safe_rename_column('homework_assignments', 'center_id', 'institution_id');
SELECT safe_rename_column('homework_submissions', 'center_id', 'institution_id');
SELECT safe_rename_column('exam_schedules', 'center_id', 'institution_id');

-- Rename other columns (teacher_id → lecturer_id, subject_id → course_id)
SELECT safe_rename_column('lecturer_courses', 'teacher_id', 'lecturer_id');
SELECT safe_rename_column('student_enrollments', 'subject_id', 'course_id');
SELECT safe_rename_column('grades', 'subject_id', 'course_id');
SELECT safe_rename_column('homework_assignments', 'subject_id', 'course_id');
SELECT safe_rename_column('homework_assignments', 'teacher_id', 'lecturer_id');
SELECT safe_rename_column('exam_schedules', 'subject_id', 'course_id');

-- Drop helper function
DROP FUNCTION IF EXISTS safe_rename_column(TEXT, TEXT, TEXT);

-- ============================================
-- PART 5: ADD NEW COLUMNS TO INSTITUTIONS
-- ============================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'institutions' AND column_name = 'institution_type') THEN
    ALTER TABLE institutions ADD COLUMN institution_type institution_type DEFAULT 'vtc';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'institutions' AND column_name = 'nqa_accreditation_number') THEN
    ALTER TABLE institutions ADD COLUMN nqa_accreditation_number VARCHAR(50);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'institutions' AND column_name = 'nqa_accreditation_expiry') THEN
    ALTER TABLE institutions ADD COLUMN nqa_accreditation_expiry DATE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'institutions' AND column_name = 'student_number_prefix') THEN
    ALTER TABLE institutions ADD COLUMN student_number_prefix VARCHAR(10);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'institutions' AND column_name = 'student_number_format') THEN
    ALTER TABLE institutions ADD COLUMN student_number_format VARCHAR(100) DEFAULT '{PREFIX}{YEAR:2}{SEQ:4}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'institutions' AND column_name = 'student_number_separator') THEN
    ALTER TABLE institutions ADD COLUMN student_number_separator VARCHAR(5) DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'institutions' AND column_name = 'student_number_year_format') THEN
    ALTER TABLE institutions ADD COLUMN student_number_year_format VARCHAR(10) DEFAULT '2';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'institutions' AND column_name = 'student_number_sequence_padding') THEN
    ALTER TABLE institutions ADD COLUMN student_number_sequence_padding INT DEFAULT 4;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'institutions' AND column_name = 'level_terminology') THEN
    ALTER TABLE institutions ADD COLUMN level_terminology VARCHAR(10) DEFAULT 'level' CHECK (level_terminology IN ('level', 'year'));
  END IF;
END $$;

-- ============================================
-- PART 6: ADD NEW COLUMNS TO COURSES
-- ============================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'courses') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'course_code') THEN
      ALTER TABLE courses ADD COLUMN course_code VARCHAR(20);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'nqf_level') THEN
      ALTER TABLE courses ADD COLUMN nqf_level INT CHECK (nqf_level BETWEEN 1 AND 10);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'credits') THEN
      ALTER TABLE courses ADD COLUMN credits INT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'duration_months') THEN
      ALTER TABLE courses ADD COLUMN duration_months INT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'prerequisite_course_id') THEN
      ALTER TABLE courses ADD COLUMN prerequisite_course_id UUID REFERENCES courses(id);
    END IF;
  END IF;
END $$;

-- ============================================
-- PART 7: ADD NEW COLUMNS TO PROGRAMS
-- ============================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'programs') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'programs' AND column_name = 'program_code') THEN
      ALTER TABLE programs ADD COLUMN program_code VARCHAR(20);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'programs' AND column_name = 'qualification_type') THEN
      ALTER TABLE programs ADD COLUMN qualification_type qualification_type;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'programs' AND column_name = 'nqf_level') THEN
      ALTER TABLE programs ADD COLUMN nqf_level INT CHECK (nqf_level BETWEEN 1 AND 10);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'programs' AND column_name = 'total_credits') THEN
      ALTER TABLE programs ADD COLUMN total_credits INT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'programs' AND column_name = 'duration_years') THEN
      ALTER TABLE programs ADD COLUMN duration_years DECIMAL(3,1);
    END IF;
  END IF;
END $$;

-- ============================================
-- PART 8: ADD NEW COLUMNS TO LECTURERS
-- ============================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lecturers') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lecturers' AND column_name = 'employee_number') THEN
      ALTER TABLE lecturers ADD COLUMN employee_number VARCHAR(20);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lecturers' AND column_name = 'qualifications') THEN
      ALTER TABLE lecturers ADD COLUMN qualifications TEXT[];
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lecturers' AND column_name = 'specializations') THEN
      ALTER TABLE lecturers ADD COLUMN specializations TEXT[];
    END IF;
  END IF;
END $$;

-- ============================================
-- PART 9: RENAME INDEXES (SAFE)
-- ============================================

ALTER INDEX IF EXISTS idx_users_center_id RENAME TO idx_users_institution_id;
ALTER INDEX IF EXISTS idx_students_center_id RENAME TO idx_students_institution_id;
ALTER INDEX IF EXISTS idx_teachers_center_id RENAME TO idx_lecturers_institution_id;
ALTER INDEX IF EXISTS idx_subjects_center_id RENAME TO idx_courses_institution_id;
ALTER INDEX IF EXISTS idx_classes_center_id RENAME TO idx_programs_institution_id;
ALTER INDEX IF EXISTS idx_fee_structures_center_id RENAME TO idx_fee_structures_institution_id;
ALTER INDEX IF EXISTS idx_payments_center_id RENAME TO idx_payments_institution_id;
ALTER INDEX IF EXISTS idx_audit_logs_center_id RENAME TO idx_audit_logs_institution_id;

-- ============================================
-- PART 10: UPDATE FOREIGN KEY CONSTRAINTS
-- ============================================

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_center_id_fkey;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'users_institution_id_fkey') THEN
    ALTER TABLE users ADD CONSTRAINT users_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE students DROP CONSTRAINT IF EXISTS students_center_id_fkey;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'students_institution_id_fkey') THEN
    ALTER TABLE students ADD CONSTRAINT students_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE lecturers DROP CONSTRAINT IF EXISTS teachers_center_id_fkey;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'lecturers_institution_id_fkey') THEN
    ALTER TABLE lecturers ADD CONSTRAINT lecturers_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE courses DROP CONSTRAINT IF EXISTS subjects_center_id_fkey;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'courses_institution_id_fkey') THEN
    ALTER TABLE courses ADD CONSTRAINT courses_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE programs DROP CONSTRAINT IF EXISTS classes_center_id_fkey;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'programs_institution_id_fkey') THEN
    ALTER TABLE programs ADD CONSTRAINT programs_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE lecturer_courses DROP CONSTRAINT IF EXISTS teacher_subjects_teacher_id_fkey;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lecturer_courses' AND column_name = 'lecturer_id') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'lecturer_courses_lecturer_id_fkey') THEN
      ALTER TABLE lecturer_courses ADD CONSTRAINT lecturer_courses_lecturer_id_fkey FOREIGN KEY (lecturer_id) REFERENCES lecturers(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

ALTER TABLE lecturer_courses DROP CONSTRAINT IF EXISTS teacher_subjects_subject_id_fkey;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lecturer_courses' AND column_name = 'course_id') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'lecturer_courses_course_id_fkey') THEN
      ALTER TABLE lecturer_courses ADD CONSTRAINT lecturer_courses_course_id_fkey FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

ALTER TABLE student_enrollments DROP CONSTRAINT IF EXISTS student_subjects_subject_id_fkey;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'student_enrollments' AND column_name = 'course_id') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'student_enrollments_course_id_fkey') THEN
      ALTER TABLE student_enrollments ADD CONSTRAINT student_enrollments_course_id_fkey FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

ALTER TABLE fee_structures DROP CONSTRAINT IF EXISTS fee_structures_center_id_fkey;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fee_structures_institution_id_fkey') THEN
    ALTER TABLE fee_structures ADD CONSTRAINT fee_structures_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE student_fees DROP CONSTRAINT IF EXISTS student_fees_center_id_fkey;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'student_fees_institution_id_fkey') THEN
    ALTER TABLE student_fees ADD CONSTRAINT student_fees_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_center_id_fkey;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'payments_institution_id_fkey') THEN
    ALTER TABLE payments ADD CONSTRAINT payments_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================
-- PART 11: ADD COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE institutions IS 'Educational institutions (VTCs, nursing colleges, universities, etc.)';
COMMENT ON TABLE lecturers IS 'Teaching staff at institutions (formerly teachers)';
COMMENT ON TABLE courses IS 'Academic courses offered by institutions (formerly subjects)';
COMMENT ON TABLE programs IS 'Academic programs/cohorts at institutions (formerly classes)';
COMMENT ON TABLE lecturer_courses IS 'Mapping of lecturers to courses they teach';
COMMENT ON TABLE student_enrollments IS 'Student course enrollments (formerly student_subjects)';

COMMENT ON COLUMN institutions.institution_type IS 'Type of institution (vtc, nursing_college, university, etc.)';
COMMENT ON COLUMN institutions.nqa_accreditation_number IS 'NQA accreditation number';
COMMENT ON COLUMN institutions.student_number_format IS 'Custom format for student numbers: {PREFIX}, {YEAR:2}, {YEAR:4}, {SEQ:N}, {DEPT}';
COMMENT ON COLUMN institutions.level_terminology IS 'Whether to use "Level" or "Year" terminology';
