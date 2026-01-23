-- Fix: Make enrollment_id nullable in student_course_fees table
-- This allows course fees to be created before or without explicit enrollment links

ALTER TABLE student_course_fees ALTER COLUMN enrollment_id DROP NOT NULL;
