-- Migration: 034_update_rls_policies.sql
-- Description: Update all RLS policies to use new table and column names
-- This migration drops old policies and recreates them with updated references

-- ============================================
-- PART 1: DROP ALL EXISTING POLICIES
-- ============================================

-- Institutions
DROP POLICY IF EXISTS "Super admins can do everything with centers" ON institutions;
DROP POLICY IF EXISTS "Center users can view their own center" ON institutions;
DROP POLICY IF EXISTS "Super admins can do everything with institutions" ON institutions;
DROP POLICY IF EXISTS "Institution users can view their own institution" ON institutions;
DROP POLICY IF EXISTS "Institution admins can update their institution" ON institutions;

-- Users
DROP POLICY IF EXISTS "Super admins can do everything with users" ON users;
DROP POLICY IF EXISTS "Center admins can manage their center's users" ON users;
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Institution admins can manage their institution's users" ON users;

-- Students
DROP POLICY IF EXISTS "Super admins can do everything with students" ON students;
DROP POLICY IF EXISTS "Center users can manage their students" ON students;
DROP POLICY IF EXISTS "Institution users can manage their students" ON students;

-- Lecturers
DROP POLICY IF EXISTS "Super admins can do everything with teachers" ON lecturers;
DROP POLICY IF EXISTS "Center users can manage their teachers" ON lecturers;
DROP POLICY IF EXISTS "Super admins can do everything with lecturers" ON lecturers;
DROP POLICY IF EXISTS "Institution users can manage their lecturers" ON lecturers;

-- Courses
DROP POLICY IF EXISTS "Super admins can do everything with subjects" ON courses;
DROP POLICY IF EXISTS "Center users can manage their subjects" ON courses;
DROP POLICY IF EXISTS "Super admins can do everything with courses" ON courses;
DROP POLICY IF EXISTS "Institution users can manage their courses" ON courses;

-- Programs
DROP POLICY IF EXISTS "Super admins can do everything with classes" ON programs;
DROP POLICY IF EXISTS "Center users can manage their classes" ON programs;
DROP POLICY IF EXISTS "Super admins can do everything with programs" ON programs;
DROP POLICY IF EXISTS "Institution users can manage their programs" ON programs;

-- Student Enrollments
DROP POLICY IF EXISTS "Super admins can do everything with student_subjects" ON student_enrollments;
DROP POLICY IF EXISTS "Center users can manage their student enrollments" ON student_enrollments;
DROP POLICY IF EXISTS "Super admins can do everything with student_enrollments" ON student_enrollments;
DROP POLICY IF EXISTS "Institution users can manage their student enrollments" ON student_enrollments;

-- Lecturer Courses
DROP POLICY IF EXISTS "Super admins can do everything with teacher_subjects" ON lecturer_courses;
DROP POLICY IF EXISTS "Center users can manage their teacher subjects" ON lecturer_courses;
DROP POLICY IF EXISTS "Super admins can do everything with lecturer_courses" ON lecturer_courses;
DROP POLICY IF EXISTS "Institution users can manage their lecturer courses" ON lecturer_courses;

-- Fee Structures
DROP POLICY IF EXISTS "Super admins can do everything with fee_structures" ON fee_structures;
DROP POLICY IF EXISTS "Center users can manage their fee structures" ON fee_structures;
DROP POLICY IF EXISTS "Institution users can manage their fee structures" ON fee_structures;

-- Student Fees
DROP POLICY IF EXISTS "Super admins can do everything with student_fees" ON student_fees;
DROP POLICY IF EXISTS "Center users can manage their student fees" ON student_fees;
DROP POLICY IF EXISTS "Institution users can manage their student fees" ON student_fees;

-- Payments
DROP POLICY IF EXISTS "Super admins can do everything with payments" ON payments;
DROP POLICY IF EXISTS "Center users can manage their payments" ON payments;
DROP POLICY IF EXISTS "Institution users can manage their payments" ON payments;

-- Hostel Blocks
DROP POLICY IF EXISTS "Super admins can do everything with hostel_blocks" ON hostel_blocks;
DROP POLICY IF EXISTS "Center users can manage their hostel blocks" ON hostel_blocks;
DROP POLICY IF EXISTS "Institution users can manage their hostel blocks" ON hostel_blocks;

-- Hostel Rooms
DROP POLICY IF EXISTS "Super admins can do everything with hostel_rooms" ON hostel_rooms;
DROP POLICY IF EXISTS "Center users can manage their hostel rooms" ON hostel_rooms;
DROP POLICY IF EXISTS "Institution users can manage their hostel rooms" ON hostel_rooms;

-- Hostel Allocations
DROP POLICY IF EXISTS "Super admins can do everything with hostel_allocations" ON hostel_allocations;
DROP POLICY IF EXISTS "Center users can manage their hostel allocations" ON hostel_allocations;
DROP POLICY IF EXISTS "Institution users can manage their hostel allocations" ON hostel_allocations;

-- Audit Logs
DROP POLICY IF EXISTS "Super admins can view all audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Center admins can view their audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Institution admins can view their audit logs" ON audit_logs;

-- Transport Routes
DROP POLICY IF EXISTS "Center users can manage routes" ON transport_routes;
DROP POLICY IF EXISTS "Super admins can manage all routes" ON transport_routes;
DROP POLICY IF EXISTS "Center users can manage their transport routes" ON transport_routes;
DROP POLICY IF EXISTS "Institution users can manage their transport routes" ON transport_routes;
DROP POLICY IF EXISTS "Super admins can manage all transport routes" ON transport_routes;

-- Vehicles
DROP POLICY IF EXISTS "Center users can manage vehicles" ON vehicles;
DROP POLICY IF EXISTS "Super admins can manage all vehicles" ON vehicles;
DROP POLICY IF EXISTS "Institution users can manage their vehicles" ON vehicles;

-- Student Transport
DROP POLICY IF EXISTS "Center users can manage student transport" ON student_transport;
DROP POLICY IF EXISTS "Super admins can manage all student transport" ON student_transport;
DROP POLICY IF EXISTS "Center users can manage their student transport" ON student_transport;
DROP POLICY IF EXISTS "Institution users can manage their student transport" ON student_transport;

-- Books
DROP POLICY IF EXISTS "Center users can manage books" ON books;
DROP POLICY IF EXISTS "Super admins can manage all books" ON books;
DROP POLICY IF EXISTS "Institution users can manage their books" ON books;

-- Book Borrowings
DROP POLICY IF EXISTS "Center users can manage borrowings" ON book_borrowings;
DROP POLICY IF EXISTS "Super admins can manage all borrowings" ON book_borrowings;
DROP POLICY IF EXISTS "Institution users can manage their book borrowings" ON book_borrowings;
DROP POLICY IF EXISTS "Super admins can manage all book borrowings" ON book_borrowings;

-- Book Categories
DROP POLICY IF EXISTS "Center users can manage book categories" ON book_categories;
DROP POLICY IF EXISTS "Super admins can manage all book categories" ON book_categories;
DROP POLICY IF EXISTS "Institution users can manage their book categories" ON book_categories;

-- Attendance Records
DROP POLICY IF EXISTS "Center users can manage their attendance records" ON attendance_records;
DROP POLICY IF EXISTS "Super admins can manage all attendance records" ON attendance_records;
DROP POLICY IF EXISTS "Institution users can manage their attendance records" ON attendance_records;

-- Grades (if table exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'grades') THEN
    DROP POLICY IF EXISTS "Center users can manage their grades" ON grades;
    DROP POLICY IF EXISTS "Super admins can manage all grades" ON grades;
    DROP POLICY IF EXISTS "Institution users can manage their grades" ON grades;
  END IF;
END $$;

-- Report Cards/Transcripts (if table exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'report_cards') THEN
    DROP POLICY IF EXISTS "Center users can manage their report cards" ON report_cards;
    DROP POLICY IF EXISTS "Super admins can manage all report cards" ON report_cards;
    DROP POLICY IF EXISTS "Institution users can manage their transcripts" ON report_cards;
    DROP POLICY IF EXISTS "Super admins can manage all transcripts" ON report_cards;
  END IF;
END $$;

-- SMS Campaigns (if table exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sms_campaigns') THEN
    DROP POLICY IF EXISTS "Center users can manage their SMS campaigns" ON sms_campaigns;
    DROP POLICY IF EXISTS "Super admins can manage all SMS campaigns" ON sms_campaigns;
    DROP POLICY IF EXISTS "Institution users can manage their SMS campaigns" ON sms_campaigns;
  END IF;
END $$;

-- Notifications (if table exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
    DROP POLICY IF EXISTS "Center users can manage their notifications" ON notifications;
    DROP POLICY IF EXISTS "Super admins can manage all notifications" ON notifications;
    DROP POLICY IF EXISTS "Institution users can manage their notifications" ON notifications;
  END IF;
END $$;

-- Homework Assignments (if table exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'homework_assignments') THEN
    DROP POLICY IF EXISTS "Center users can manage their homework" ON homework_assignments;
    DROP POLICY IF EXISTS "Super admins can manage all homework" ON homework_assignments;
    DROP POLICY IF EXISTS "Institution users can manage their assignments" ON homework_assignments;
    DROP POLICY IF EXISTS "Super admins can manage all assignments" ON homework_assignments;
  END IF;
END $$;

-- Exam Schedules (if table exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'exam_schedules') THEN
    DROP POLICY IF EXISTS "Center users can manage their exam schedules" ON exam_schedules;
    DROP POLICY IF EXISTS "Super admins can manage all exam schedules" ON exam_schedules;
    DROP POLICY IF EXISTS "Institution users can manage their exam schedules" ON exam_schedules;
  END IF;
END $$;

-- ============================================
-- PART 2: UPDATE HELPER FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION get_user_institution_id()
RETURNS UUID AS $$
BEGIN
    RETURN (SELECT institution_id FROM users WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Keep old function as alias for backward compatibility
CREATE OR REPLACE FUNCTION get_user_center_id()
RETURNS UUID AS $$
BEGIN
    RETURN get_user_institution_id();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PART 3: CREATE NEW POLICIES
-- ============================================

-- INSTITUTIONS
CREATE POLICY "Super admins can do everything with institutions"
    ON institutions FOR ALL
    USING (is_super_admin());

CREATE POLICY "Institution users can view their own institution"
    ON institutions FOR SELECT
    USING (id = get_user_institution_id());

CREATE POLICY "Institution admins can update their institution"
    ON institutions FOR UPDATE
    USING (
        id = get_user_institution_id()
        AND (SELECT role FROM users WHERE id = auth.uid()) = 'institution_admin'
    );

-- USERS
CREATE POLICY "Super admins can do everything with users"
    ON users FOR ALL
    USING (is_super_admin());

CREATE POLICY "Institution admins can manage their institution's users"
    ON users FOR ALL
    USING (
        (SELECT role FROM users WHERE id = auth.uid()) = 'institution_admin'
        AND institution_id = get_user_institution_id()
    );

CREATE POLICY "Users can view their own profile"
    ON users FOR SELECT
    USING (id = auth.uid());

CREATE POLICY "Users can update their own profile"
    ON users FOR UPDATE
    USING (id = auth.uid());

-- STUDENTS
CREATE POLICY "Super admins can do everything with students"
    ON students FOR ALL
    USING (is_super_admin());

CREATE POLICY "Institution users can manage their students"
    ON students FOR ALL
    USING (institution_id = get_user_institution_id());

-- LECTURERS
CREATE POLICY "Super admins can do everything with lecturers"
    ON lecturers FOR ALL
    USING (is_super_admin());

CREATE POLICY "Institution users can manage their lecturers"
    ON lecturers FOR ALL
    USING (institution_id = get_user_institution_id());

-- COURSES
CREATE POLICY "Super admins can do everything with courses"
    ON courses FOR ALL
    USING (is_super_admin());

CREATE POLICY "Institution users can manage their courses"
    ON courses FOR ALL
    USING (institution_id = get_user_institution_id());

-- PROGRAMS
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can do everything with programs"
    ON programs FOR ALL
    USING (is_super_admin());

CREATE POLICY "Institution users can manage their programs"
    ON programs FOR ALL
    USING (institution_id = get_user_institution_id());

-- STUDENT ENROLLMENTS
CREATE POLICY "Super admins can do everything with student_enrollments"
    ON student_enrollments FOR ALL
    USING (is_super_admin());

CREATE POLICY "Institution users can manage their student enrollments"
    ON student_enrollments FOR ALL
    USING (
        (SELECT institution_id FROM students WHERE id = student_id) = get_user_institution_id()
    );

-- LECTURER COURSES
CREATE POLICY "Super admins can do everything with lecturer_courses"
    ON lecturer_courses FOR ALL
    USING (is_super_admin());

CREATE POLICY "Institution users can manage their lecturer courses"
    ON lecturer_courses FOR ALL
    USING (
        (SELECT institution_id FROM lecturers WHERE id = lecturer_id) = get_user_institution_id()
    );

-- FEE STRUCTURES
CREATE POLICY "Super admins can do everything with fee_structures"
    ON fee_structures FOR ALL
    USING (is_super_admin());

CREATE POLICY "Institution users can manage their fee structures"
    ON fee_structures FOR ALL
    USING (institution_id = get_user_institution_id());

-- STUDENT FEES
CREATE POLICY "Super admins can do everything with student_fees"
    ON student_fees FOR ALL
    USING (is_super_admin());

CREATE POLICY "Institution users can manage their student fees"
    ON student_fees FOR ALL
    USING (institution_id = get_user_institution_id());

-- PAYMENTS
CREATE POLICY "Super admins can do everything with payments"
    ON payments FOR ALL
    USING (is_super_admin());

CREATE POLICY "Institution users can manage their payments"
    ON payments FOR ALL
    USING (institution_id = get_user_institution_id());

-- HOSTEL BLOCKS
CREATE POLICY "Super admins can do everything with hostel_blocks"
    ON hostel_blocks FOR ALL
    USING (is_super_admin());

CREATE POLICY "Institution users can manage their hostel blocks"
    ON hostel_blocks FOR ALL
    USING (institution_id = get_user_institution_id());

-- HOSTEL ROOMS
CREATE POLICY "Super admins can do everything with hostel_rooms"
    ON hostel_rooms FOR ALL
    USING (is_super_admin());

CREATE POLICY "Institution users can manage their hostel rooms"
    ON hostel_rooms FOR ALL
    USING (institution_id = get_user_institution_id());

-- HOSTEL ALLOCATIONS
CREATE POLICY "Super admins can do everything with hostel_allocations"
    ON hostel_allocations FOR ALL
    USING (is_super_admin());

CREATE POLICY "Institution users can manage their hostel allocations"
    ON hostel_allocations FOR ALL
    USING (institution_id = get_user_institution_id());

-- AUDIT LOGS
CREATE POLICY "Super admins can view all audit logs"
    ON audit_logs FOR SELECT
    USING (is_super_admin());

CREATE POLICY "Institution admins can view their audit logs"
    ON audit_logs FOR SELECT
    USING (
        institution_id = get_user_institution_id()
        AND (SELECT role FROM users WHERE id = auth.uid()) = 'institution_admin'
    );

-- TRANSPORT ROUTES
CREATE POLICY "Institution users can manage their transport routes"
    ON transport_routes FOR ALL
    USING (institution_id = get_user_institution_id());

CREATE POLICY "Super admins can manage all transport routes"
    ON transport_routes FOR ALL
    USING (is_super_admin());

-- VEHICLES
CREATE POLICY "Institution users can manage their vehicles"
    ON vehicles FOR ALL
    USING (institution_id = get_user_institution_id());

CREATE POLICY "Super admins can manage all vehicles"
    ON vehicles FOR ALL
    USING (is_super_admin());

-- STUDENT TRANSPORT
CREATE POLICY "Institution users can manage their student transport"
    ON student_transport FOR ALL
    USING (institution_id = get_user_institution_id());

CREATE POLICY "Super admins can manage all student transport"
    ON student_transport FOR ALL
    USING (is_super_admin());

-- BOOKS
CREATE POLICY "Institution users can manage their books"
    ON books FOR ALL
    USING (institution_id = get_user_institution_id());

CREATE POLICY "Super admins can manage all books"
    ON books FOR ALL
    USING (is_super_admin());

-- BOOK BORROWINGS
CREATE POLICY "Institution users can manage their book borrowings"
    ON book_borrowings FOR ALL
    USING (institution_id = get_user_institution_id());

CREATE POLICY "Super admins can manage all book borrowings"
    ON book_borrowings FOR ALL
    USING (is_super_admin());

-- BOOK CATEGORIES
CREATE POLICY "Institution users can manage their book categories"
    ON book_categories FOR ALL
    USING (institution_id = get_user_institution_id());

CREATE POLICY "Super admins can manage all book categories"
    ON book_categories FOR ALL
    USING (is_super_admin());

-- ATTENDANCE RECORDS
CREATE POLICY "Institution users can manage their attendance records"
    ON attendance_records FOR ALL
    USING (institution_id = get_user_institution_id());

CREATE POLICY "Super admins can manage all attendance records"
    ON attendance_records FOR ALL
    USING (is_super_admin());

-- GRADES (if table exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'grades') THEN
    EXECUTE 'CREATE POLICY "Institution users can manage their grades" ON grades FOR ALL USING (institution_id = get_user_institution_id())';
    EXECUTE 'CREATE POLICY "Super admins can manage all grades" ON grades FOR ALL USING (is_super_admin())';
  END IF;
END $$;

-- REPORT CARDS/TRANSCRIPTS (if table exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'report_cards') THEN
    EXECUTE 'CREATE POLICY "Institution users can manage their transcripts" ON report_cards FOR ALL USING (institution_id = get_user_institution_id())';
    EXECUTE 'CREATE POLICY "Super admins can manage all transcripts" ON report_cards FOR ALL USING (is_super_admin())';
  END IF;
END $$;

-- SMS CAMPAIGNS (if table exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sms_campaigns') THEN
    EXECUTE 'CREATE POLICY "Institution users can manage their SMS campaigns" ON sms_campaigns FOR ALL USING (institution_id = get_user_institution_id())';
    EXECUTE 'CREATE POLICY "Super admins can manage all SMS campaigns" ON sms_campaigns FOR ALL USING (is_super_admin())';
  END IF;
END $$;

-- NOTIFICATIONS (if table exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
    EXECUTE 'CREATE POLICY "Institution users can manage their notifications" ON notifications FOR ALL USING (institution_id = get_user_institution_id())';
    EXECUTE 'CREATE POLICY "Super admins can manage all notifications" ON notifications FOR ALL USING (is_super_admin())';
  END IF;
END $$;

-- HOMEWORK ASSIGNMENTS (if table exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'homework_assignments') THEN
    EXECUTE 'CREATE POLICY "Institution users can manage their assignments" ON homework_assignments FOR ALL USING (institution_id = get_user_institution_id())';
    EXECUTE 'CREATE POLICY "Super admins can manage all assignments" ON homework_assignments FOR ALL USING (is_super_admin())';
  END IF;
END $$;

-- EXAM SCHEDULES (if table exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'exam_schedules') THEN
    EXECUTE 'CREATE POLICY "Institution users can manage their exam schedules" ON exam_schedules FOR ALL USING (institution_id = get_user_institution_id())';
    EXECUTE 'CREATE POLICY "Super admins can manage all exam schedules" ON exam_schedules FOR ALL USING (is_super_admin())';
  END IF;
END $$;
