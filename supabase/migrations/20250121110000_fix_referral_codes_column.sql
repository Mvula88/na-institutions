-- Migration: Fix referral_codes table column name
-- Description: Rename center_id to institution_id in referral_codes table

-- Rename center_id to institution_id in referral_codes table
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'referral_codes' AND column_name = 'center_id'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'referral_codes' AND column_name = 'institution_id'
    ) THEN
        ALTER TABLE referral_codes RENAME COLUMN center_id TO institution_id;
    END IF;
END $$;

-- Also fix the referrals table if needed
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'referrals' AND column_name = 'referrer_center_id'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'referrals' AND column_name = 'referrer_institution_id'
    ) THEN
        ALTER TABLE referrals RENAME COLUMN referrer_center_id TO referrer_institution_id;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'referrals' AND column_name = 'referred_center_id'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'referrals' AND column_name = 'referred_institution_id'
    ) THEN
        ALTER TABLE referrals RENAME COLUMN referred_center_id TO referred_institution_id;
    END IF;
END $$;
