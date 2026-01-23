-- ============================================
-- INITIAL SETUP COMPLETED FLAG
-- ============================================
-- Tracks whether a center has completed the initial setup wizard
-- This ensures new centers configure payment months and subjects before using the system

-- Add initial_setup_completed flag to tutorial_centers
ALTER TABLE tutorial_centers
ADD COLUMN IF NOT EXISTS initial_setup_completed BOOLEAN DEFAULT FALSE;

-- Comment for clarity
COMMENT ON COLUMN tutorial_centers.initial_setup_completed IS 'Whether the center has completed the initial setup wizard (payment months + subjects)';

-- Existing centers should be marked as having completed setup
-- (Only new centers need to go through the wizard)
UPDATE tutorial_centers
SET initial_setup_completed = TRUE
WHERE created_at < NOW() - INTERVAL '1 minute';
