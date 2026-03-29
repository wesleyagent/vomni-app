-- Add trial_start_date column to businesses table for free trial tracking
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS trial_start_date TIMESTAMPTZ DEFAULT NULL;
