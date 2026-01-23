-- Migration: 033_student_number_system.sql
-- Description: Enhanced student number generation system
-- - Create sequence tracking table per institution/year
-- - Create configurable student number generation function
-- - Support for custom prefixes, formats, and separators

-- ============================================
-- PART 1: CREATE SEQUENCE TRACKING TABLE
-- ============================================

CREATE TABLE student_number_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  year INT NOT NULL,
  department_code VARCHAR(10), -- Optional department-specific sequences
  current_sequence INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(institution_id, year, department_code)
);

-- Create index for fast lookups
CREATE INDEX idx_student_number_sequences_lookup
  ON student_number_sequences(institution_id, year, department_code);

-- Enable RLS
ALTER TABLE student_number_sequences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Institution admins can view sequences"
  ON student_number_sequences FOR SELECT
  TO authenticated
  USING (
    institution_id IN (
      SELECT institution_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Institution admins can manage sequences"
  ON student_number_sequences FOR ALL
  TO authenticated
  USING (
    institution_id IN (
      SELECT institution_id FROM users
      WHERE id = auth.uid()
      AND role IN ('institution_admin', 'super_admin')
    )
  );

-- ============================================
-- PART 2: DROP OLD TRIGGER AND FUNCTION
-- ============================================

-- Drop existing trigger on students table
DROP TRIGGER IF EXISTS generate_student_number_trigger ON students;

-- Drop existing function
DROP FUNCTION IF EXISTS generate_student_number();

-- ============================================
-- PART 3: CREATE NEW GENERATION FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION generate_student_number()
RETURNS TRIGGER AS $$
DECLARE
  v_institution RECORD;
  v_year INT;
  v_year_str VARCHAR(4);
  v_sequence INT;
  v_department_code VARCHAR(10);
  v_student_number VARCHAR(50);
  v_format VARCHAR(100);
  v_separator VARCHAR(5);
BEGIN
  -- Only generate if student_number is not already set
  IF NEW.student_number IS NOT NULL AND NEW.student_number != '' THEN
    RETURN NEW;
  END IF;

  -- Get institution settings
  SELECT
    student_number_prefix,
    student_number_format,
    student_number_separator,
    student_number_year_format,
    student_number_sequence_padding,
    code
  INTO v_institution
  FROM institutions
  WHERE id = NEW.institution_id;

  -- Get current year
  v_year := EXTRACT(YEAR FROM CURRENT_DATE)::INT;

  -- Format year based on institution preference (2 or 4 digits)
  IF v_institution.student_number_year_format = '4' THEN
    v_year_str := v_year::VARCHAR;
  ELSE
    v_year_str := RIGHT(v_year::VARCHAR, 2);
  END IF;

  -- Get department code if student has a program with a code
  -- (For future department-based sequences)
  v_department_code := NULL;

  -- Get and increment sequence atomically
  INSERT INTO student_number_sequences (institution_id, year, department_code, current_sequence)
  VALUES (NEW.institution_id, v_year, v_department_code, 1)
  ON CONFLICT (institution_id, year, department_code)
  DO UPDATE SET
    current_sequence = student_number_sequences.current_sequence + 1,
    updated_at = NOW()
  RETURNING current_sequence INTO v_sequence;

  -- Get format template (default if not set)
  v_format := COALESCE(v_institution.student_number_format, '{PREFIX}{YEAR:2}{SEQ:4}');
  v_separator := COALESCE(v_institution.student_number_separator, '');

  -- Build student number based on format
  -- Supported tokens:
  --   {PREFIX} - Institution prefix (e.g., IUM, NUST)
  --   {YEAR:2} - 2-digit year (e.g., 26)
  --   {YEAR:4} - 4-digit year (e.g., 2026)
  --   {SEQ:N}  - Sequence padded to N digits (e.g., SEQ:4 = 0001)
  --   {DEPT}   - Department code (if applicable)
  --   {CODE}   - Institution code

  v_student_number := v_format;

  -- Replace PREFIX token
  v_student_number := REPLACE(
    v_student_number,
    '{PREFIX}',
    COALESCE(v_institution.student_number_prefix, v_institution.code)
  );

  -- Replace CODE token
  v_student_number := REPLACE(
    v_student_number,
    '{CODE}',
    COALESCE(v_institution.code, '')
  );

  -- Replace YEAR tokens
  v_student_number := REPLACE(v_student_number, '{YEAR:2}', RIGHT(v_year::VARCHAR, 2));
  v_student_number := REPLACE(v_student_number, '{YEAR:4}', v_year::VARCHAR);
  v_student_number := REPLACE(v_student_number, '{YEAR}', v_year_str);

  -- Replace DEPT token
  v_student_number := REPLACE(
    v_student_number,
    '{DEPT}',
    COALESCE(v_department_code, '')
  );

  -- Replace SEQ tokens with various padding options
  v_student_number := REPLACE(
    v_student_number,
    '{SEQ:3}',
    LPAD(v_sequence::VARCHAR, 3, '0')
  );
  v_student_number := REPLACE(
    v_student_number,
    '{SEQ:4}',
    LPAD(v_sequence::VARCHAR, 4, '0')
  );
  v_student_number := REPLACE(
    v_student_number,
    '{SEQ:5}',
    LPAD(v_sequence::VARCHAR, 5, '0')
  );
  v_student_number := REPLACE(
    v_student_number,
    '{SEQ:6}',
    LPAD(v_sequence::VARCHAR, 6, '0')
  );
  v_student_number := REPLACE(
    v_student_number,
    '{SEQ}',
    LPAD(v_sequence::VARCHAR, COALESCE(v_institution.student_number_sequence_padding, 4), '0')
  );

  -- Replace separator placeholders
  v_student_number := REPLACE(v_student_number, '{SEP}', v_separator);

  -- Clean up any remaining braces from unused tokens
  v_student_number := REGEXP_REPLACE(v_student_number, '\{[^}]+\}', '', 'g');

  NEW.student_number := v_student_number;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PART 4: CREATE TRIGGER
-- ============================================

CREATE TRIGGER generate_student_number_trigger
  BEFORE INSERT ON students
  FOR EACH ROW
  EXECUTE FUNCTION generate_student_number();

-- ============================================
-- PART 5: HELPER FUNCTION TO PREVIEW FORMAT
-- ============================================

-- Function to preview what a student number would look like
CREATE OR REPLACE FUNCTION preview_student_number_format(
  p_institution_id UUID,
  p_format VARCHAR(100) DEFAULT NULL
)
RETURNS VARCHAR AS $$
DECLARE
  v_institution RECORD;
  v_year INT;
  v_preview VARCHAR(50);
  v_format VARCHAR(100);
BEGIN
  -- Get institution settings
  SELECT
    student_number_prefix,
    student_number_format,
    student_number_separator,
    code
  INTO v_institution
  FROM institutions
  WHERE id = p_institution_id;

  v_year := EXTRACT(YEAR FROM CURRENT_DATE)::INT;
  v_format := COALESCE(p_format, v_institution.student_number_format, '{PREFIX}{YEAR:2}{SEQ:4}');

  -- Build preview with sample sequence number
  v_preview := v_format;
  v_preview := REPLACE(v_preview, '{PREFIX}', COALESCE(v_institution.student_number_prefix, v_institution.code, 'XXX'));
  v_preview := REPLACE(v_preview, '{CODE}', COALESCE(v_institution.code, 'XXX'));
  v_preview := REPLACE(v_preview, '{YEAR:2}', RIGHT(v_year::VARCHAR, 2));
  v_preview := REPLACE(v_preview, '{YEAR:4}', v_year::VARCHAR);
  v_preview := REPLACE(v_preview, '{YEAR}', RIGHT(v_year::VARCHAR, 2));
  v_preview := REPLACE(v_preview, '{DEPT}', 'ENG');
  v_preview := REPLACE(v_preview, '{SEQ:3}', '001');
  v_preview := REPLACE(v_preview, '{SEQ:4}', '0001');
  v_preview := REPLACE(v_preview, '{SEQ:5}', '00001');
  v_preview := REPLACE(v_preview, '{SEQ:6}', '000001');
  v_preview := REPLACE(v_preview, '{SEQ}', '0001');
  v_preview := REPLACE(v_preview, '{SEP}', COALESCE(v_institution.student_number_separator, ''));
  v_preview := REGEXP_REPLACE(v_preview, '\{[^}]+\}', '', 'g');

  RETURN v_preview;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PART 6: FUNCTION TO RESET SEQUENCE
-- ============================================

-- Function to reset sequence for a new year or manual reset
CREATE OR REPLACE FUNCTION reset_student_number_sequence(
  p_institution_id UUID,
  p_year INT DEFAULT NULL,
  p_department_code VARCHAR(10) DEFAULT NULL,
  p_new_sequence INT DEFAULT 0
)
RETURNS VOID AS $$
BEGIN
  UPDATE student_number_sequences
  SET
    current_sequence = p_new_sequence,
    updated_at = NOW()
  WHERE
    institution_id = p_institution_id
    AND year = COALESCE(p_year, EXTRACT(YEAR FROM CURRENT_DATE)::INT)
    AND (department_code = p_department_code OR (department_code IS NULL AND p_department_code IS NULL));
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION preview_student_number_format(UUID, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION reset_student_number_sequence(UUID, INT, VARCHAR, INT) TO authenticated;

-- ============================================
-- PART 7: ADD COMMENTS
-- ============================================

COMMENT ON TABLE student_number_sequences IS 'Tracks student number sequences per institution/year/department';
COMMENT ON FUNCTION generate_student_number() IS 'Automatically generates student numbers based on institution settings';
COMMENT ON FUNCTION preview_student_number_format(UUID, VARCHAR) IS 'Preview what a student number would look like with given format';
COMMENT ON FUNCTION reset_student_number_sequence(UUID, INT, VARCHAR, INT) IS 'Reset student number sequence for an institution';
