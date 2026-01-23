-- Migration: Add code column to institutions table
-- Description: Add the missing 'code' column to institutions table for the trigger

-- Add code column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'institutions' AND column_name = 'code'
    ) THEN
        ALTER TABLE institutions ADD COLUMN code VARCHAR(10) UNIQUE;
    END IF;
END $$;

-- Update existing institutions to have a code based on their name
UPDATE institutions
SET code = UPPER(LEFT(REGEXP_REPLACE(name, '[^A-Za-z]', '', 'g'), 3))
WHERE code IS NULL;

-- Handle any duplicates by adding a suffix
DO $$
DECLARE
    rec RECORD;
    v_counter INT;
    v_new_code VARCHAR(10);
BEGIN
    FOR rec IN
        SELECT id, name, code FROM institutions
        WHERE code IN (SELECT code FROM institutions GROUP BY code HAVING COUNT(*) > 1)
        ORDER BY created_at DESC
    LOOP
        v_counter := 1;
        v_new_code := rec.code;
        WHILE EXISTS (SELECT 1 FROM institutions WHERE code = v_new_code AND id != rec.id) LOOP
            v_counter := v_counter + 1;
            v_new_code := LEFT(rec.code, 2) || v_counter::TEXT;
        END LOOP;

        UPDATE institutions SET code = v_new_code WHERE id = rec.id;
    END LOOP;
END $$;
