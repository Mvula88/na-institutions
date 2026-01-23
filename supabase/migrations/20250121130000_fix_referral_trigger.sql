-- Migration: Fix referral code trigger to use institution_id
-- Description: Update the trigger function to use institution_id instead of center_id

-- Drop and recreate the trigger function with correct column name
CREATE OR REPLACE FUNCTION create_referral_code_for_center()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO referral_codes (institution_id, code)
    VALUES (NEW.id, generate_referral_code(NEW.name));
    RETURN NEW;
EXCEPTION
    WHEN undefined_column THEN
        -- Fallback: try with center_id if institution_id doesn't exist
        INSERT INTO referral_codes (center_id, code)
        VALUES (NEW.id, generate_referral_code(NEW.name));
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Make sure the trigger exists on the institutions table
DROP TRIGGER IF EXISTS trigger_create_referral_code ON institutions;

CREATE TRIGGER trigger_create_referral_code
    AFTER INSERT ON institutions
    FOR EACH ROW
    EXECUTE FUNCTION create_referral_code_for_center();

-- Also update the start_referral_qualifying_period function
CREATE OR REPLACE FUNCTION start_referral_qualifying_period()
RETURNS TRIGGER AS $$
DECLARE
    ref_record RECORD;
BEGIN
    -- Check if this institution was referred and subscription just became active
    IF NEW.subscription_status = 'active' AND
       (OLD.subscription_status IS NULL OR OLD.subscription_status != 'active') AND
       NEW.referred_by_code IS NOT NULL THEN

        -- Find the pending referral
        SELECT r.*, rc.institution_id as referrer_id
        INTO ref_record
        FROM referrals r
        JOIN referral_codes rc ON r.referral_code_id = rc.id
        WHERE r.referred_institution_id = NEW.id
        AND r.status = 'pending';

        IF FOUND THEN
            UPDATE referrals
            SET status = 'qualifying',
                qualifying_started_at = NOW()
            WHERE id = ref_record.id;
        END IF;
    END IF;

    -- Also check if subscription was cancelled during qualifying period
    IF OLD.subscription_status = 'active' AND
       NEW.subscription_status IN ('cancelled', 'inactive', 'past_due') THEN
        UPDATE referrals
        SET status = 'pending',
            qualifying_started_at = NULL
        WHERE referred_institution_id = NEW.id
        AND status = 'qualifying';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger for qualifying period
DROP TRIGGER IF EXISTS trigger_start_referral_qualifying ON institutions;

CREATE TRIGGER trigger_start_referral_qualifying
    AFTER UPDATE ON institutions
    FOR EACH ROW
    EXECUTE FUNCTION start_referral_qualifying_period();

-- Update complete_qualifying_referrals function
CREATE OR REPLACE FUNCTION complete_qualifying_referrals()
RETURNS INTEGER AS $$
DECLARE
    completed_count INTEGER := 0;
    ref_record RECORD;
BEGIN
    FOR ref_record IN
        SELECT r.*, rc.institution_id as referrer_id, i.name as referred_name
        FROM referrals r
        JOIN referral_codes rc ON r.referral_code_id = rc.id
        JOIN institutions i ON r.referred_institution_id = i.id
        WHERE r.status = 'qualifying'
        AND r.qualifying_started_at <= (NOW() - INTERVAL '30 days')
        AND i.subscription_status = 'active'
    LOOP
        UPDATE referrals
        SET status = 'completed',
            completed_at = NOW()
        WHERE id = ref_record.id;

        UPDATE referral_codes
        SET successful_referrals = successful_referrals + 1,
            total_rewards_earned = total_rewards_earned + 1,
            updated_at = NOW()
        WHERE id = ref_record.referral_code_id;

        INSERT INTO referral_rewards (institution_id, referral_id, free_months, reward_type, description)
        VALUES (
            ref_record.referrer_id,
            ref_record.id,
            1,
            'referrer_bonus',
            '1 month free for referring ' || ref_record.referred_name
        );

        UPDATE institutions
        SET referral_free_months = COALESCE(referral_free_months, 0) + 1
        WHERE id = ref_record.referrer_id;

        completed_count := completed_count + 1;
    END LOOP;

    RETURN completed_count;
END;
$$ LANGUAGE plpgsql;

-- Also fix referral_rewards table if needed
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'referral_rewards' AND column_name = 'center_id'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'referral_rewards' AND column_name = 'institution_id'
    ) THEN
        ALTER TABLE referral_rewards RENAME COLUMN center_id TO institution_id;
    END IF;
END $$;

-- Update RLS policies for referral tables to use institution_id
DROP POLICY IF EXISTS "Users can view their center's referral code" ON referral_codes;
DROP POLICY IF EXISTS "Users can view their institution's referral code" ON referral_codes;

CREATE POLICY "Users can view their institution's referral code"
    ON referral_codes FOR SELECT
    USING (
        institution_id IN (
            SELECT institution_id FROM users WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can view referrals they made" ON referrals;
CREATE POLICY "Users can view referrals they made"
    ON referrals FOR SELECT
    USING (
        referrer_institution_id IN (
            SELECT institution_id FROM users WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can view referrals made to them" ON referrals;
CREATE POLICY "Users can view referrals made to them"
    ON referrals FOR SELECT
    USING (
        referred_institution_id IN (
            SELECT institution_id FROM users WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can view their center's rewards" ON referral_rewards;
DROP POLICY IF EXISTS "Users can view their institution's rewards" ON referral_rewards;

CREATE POLICY "Users can view their institution's rewards"
    ON referral_rewards FOR SELECT
    USING (
        institution_id IN (
            SELECT institution_id FROM users WHERE id = auth.uid()
        )
    );
