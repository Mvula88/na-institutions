-- Migration: 035_update_helper_functions.sql
-- Description: Update helper functions and triggers for renamed tables

-- ============================================
-- PART 1: UPDATE TRIGGERS FOR RENAMED TABLES
-- ============================================

-- Drop old triggers that reference old table names
DROP TRIGGER IF EXISTS update_tutorial_centers_updated_at ON institutions;
DROP TRIGGER IF EXISTS update_teachers_updated_at ON lecturers;
DROP TRIGGER IF EXISTS update_subjects_updated_at ON courses;
DROP TRIGGER IF EXISTS update_classes_updated_at ON programs;

-- Create new triggers with correct names
CREATE TRIGGER update_institutions_updated_at
    BEFORE UPDATE ON institutions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_lecturers_updated_at
    BEFORE UPDATE ON lecturers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_courses_updated_at
    BEFORE UPDATE ON courses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_programs_updated_at
    BEFORE UPDATE ON programs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- PART 2: INSTITUTION CODE GENERATION
-- ============================================

-- Function to generate a unique institution code
CREATE OR REPLACE FUNCTION generate_institution_code()
RETURNS TRIGGER AS $$
DECLARE
    v_code VARCHAR(10);
    v_counter INT := 1;
BEGIN
    -- Only generate if code is not set
    IF NEW.code IS NOT NULL AND NEW.code != '' THEN
        RETURN NEW;
    END IF;

    -- Generate code from first 3 letters of name (uppercase)
    v_code := UPPER(LEFT(REGEXP_REPLACE(NEW.name, '[^A-Za-z]', '', 'g'), 3));

    -- If code is too short, pad with X
    v_code := RPAD(v_code, 3, 'X');

    -- Check if code exists, if so, append counter
    WHILE EXISTS (SELECT 1 FROM institutions WHERE code = v_code AND id != NEW.id) LOOP
        v_counter := v_counter + 1;
        v_code := UPPER(LEFT(REGEXP_REPLACE(NEW.name, '[^A-Za-z]', '', 'g'), 2)) || v_counter::VARCHAR;
    END LOOP;

    NEW.code := v_code;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for institution code generation
DROP TRIGGER IF EXISTS generate_institution_code_trigger ON institutions;
CREATE TRIGGER generate_institution_code_trigger
    BEFORE INSERT ON institutions
    FOR EACH ROW EXECUTE FUNCTION generate_institution_code();

-- ============================================
-- PART 3: HELPER FUNCTIONS FOR INSTITUTION DATA
-- ============================================

-- Get institution statistics
CREATE OR REPLACE FUNCTION get_institution_stats(p_institution_id UUID)
RETURNS TABLE (
    total_students BIGINT,
    active_students BIGINT,
    total_lecturers BIGINT,
    active_lecturers BIGINT,
    total_courses BIGINT,
    active_courses BIGINT,
    total_programs BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM students WHERE institution_id = p_institution_id)::BIGINT AS total_students,
        (SELECT COUNT(*) FROM students WHERE institution_id = p_institution_id AND status = 'active')::BIGINT AS active_students,
        (SELECT COUNT(*) FROM lecturers WHERE institution_id = p_institution_id)::BIGINT AS total_lecturers,
        (SELECT COUNT(*) FROM lecturers WHERE institution_id = p_institution_id AND status = 'active')::BIGINT AS active_lecturers,
        (SELECT COUNT(*) FROM courses WHERE institution_id = p_institution_id)::BIGINT AS total_courses,
        (SELECT COUNT(*) FROM courses WHERE institution_id = p_institution_id AND is_active = TRUE)::BIGINT AS active_courses,
        (SELECT COUNT(*) FROM programs WHERE institution_id = p_institution_id)::BIGINT AS total_programs;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_institution_stats(UUID) TO authenticated;

-- ============================================
-- PART 4: LECTURER COURSE MANAGEMENT
-- ============================================

-- Function to assign a lecturer to a course
CREATE OR REPLACE FUNCTION assign_lecturer_to_course(
    p_lecturer_id UUID,
    p_course_id UUID
)
RETURNS UUID AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO lecturer_courses (lecturer_id, course_id)
    VALUES (p_lecturer_id, p_course_id)
    ON CONFLICT (lecturer_id, course_id) DO NOTHING
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- Function to remove a lecturer from a course
CREATE OR REPLACE FUNCTION remove_lecturer_from_course(
    p_lecturer_id UUID,
    p_course_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    DELETE FROM lecturer_courses
    WHERE lecturer_id = p_lecturer_id AND course_id = p_course_id;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION assign_lecturer_to_course(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION remove_lecturer_from_course(UUID, UUID) TO authenticated;

-- ============================================
-- PART 5: STUDENT ENROLLMENT MANAGEMENT
-- ============================================

-- Function to enroll a student in a course
CREATE OR REPLACE FUNCTION enroll_student_in_course(
    p_student_id UUID,
    p_course_id UUID
)
RETURNS UUID AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO student_enrollments (student_id, course_id, enrolled_date, is_active)
    VALUES (p_student_id, p_course_id, CURRENT_DATE, TRUE)
    ON CONFLICT (student_id, course_id) DO UPDATE SET is_active = TRUE
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- Function to unenroll a student from a course
CREATE OR REPLACE FUNCTION unenroll_student_from_course(
    p_student_id UUID,
    p_course_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE student_enrollments
    SET is_active = FALSE
    WHERE student_id = p_student_id AND course_id = p_course_id;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION enroll_student_in_course(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION unenroll_student_from_course(UUID, UUID) TO authenticated;

-- ============================================
-- PART 6: NQF LEVEL HELPERS
-- ============================================

-- Function to get NQF level name
CREATE OR REPLACE FUNCTION get_nqf_level_name(p_level INT)
RETURNS VARCHAR AS $$
BEGIN
    RETURN CASE p_level
        WHEN 1 THEN 'Grade 9 / ABET Level 4'
        WHEN 2 THEN 'Grade 10 / NSSCO'
        WHEN 3 THEN 'Grade 12 / NSSCAS'
        WHEN 4 THEN 'Certificate / Higher Certificate'
        WHEN 5 THEN 'Diploma'
        WHEN 6 THEN 'Advanced Diploma / Bachelor''s Degree'
        WHEN 7 THEN 'Bachelor''s Honours Degree / Postgraduate Diploma'
        WHEN 8 THEN 'Master''s Degree'
        WHEN 9 THEN 'Doctoral Degree'
        WHEN 10 THEN 'Post-Doctoral Research'
        ELSE 'Unknown Level'
    END;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_nqf_level_name(INT) TO authenticated;

-- ============================================
-- PART 7: RENAME ENUM TYPE IF NEEDED
-- ============================================

-- Rename center_status to institution_status for consistency
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'center_status') THEN
        ALTER TYPE center_status RENAME TO institution_status;
    END IF;
END $$;

-- Rename teacher_status to lecturer_status for consistency
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'teacher_status') THEN
        ALTER TYPE teacher_status RENAME TO lecturer_status;
    END IF;
END $$;

-- ============================================
-- PART 8: ADD COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON FUNCTION get_user_institution_id() IS 'Returns the institution_id of the current authenticated user';
COMMENT ON FUNCTION get_institution_stats(UUID) IS 'Returns statistics for an institution (students, lecturers, courses, programs)';
COMMENT ON FUNCTION assign_lecturer_to_course(UUID, UUID) IS 'Assigns a lecturer to teach a course';
COMMENT ON FUNCTION enroll_student_in_course(UUID, UUID) IS 'Enrolls a student in a course';
COMMENT ON FUNCTION get_nqf_level_name(INT) IS 'Returns the Namibian NQF level name for a given level number';
