-- Add trial_ends_at column for free trial tracking
ALTER TABLE tutorial_centers
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

-- Add index for efficient trial expiry checks
CREATE INDEX IF NOT EXISTS idx_tutorial_centers_trial_ends_at
ON tutorial_centers(trial_ends_at)
WHERE trial_ends_at IS NOT NULL;

COMMENT ON COLUMN tutorial_centers.trial_ends_at IS 'End date of free trial period';
