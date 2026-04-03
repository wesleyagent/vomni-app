-- Migration 020: Ensure customer_profiles unique constraint exists
-- Safe to run multiple times (IF NOT EXISTS guards).
-- Run in Supabase SQL Editor.

-- Ensure the unique constraint on (business_id, phone) exists.
-- The original migration 017 creates it via the table definition,
-- but this ensures it exists even if the table was created differently.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM   pg_constraint
    WHERE  conrelid = 'customer_profiles'::regclass
    AND    contype  = 'u'
    AND    array_length(conkey, 1) = 2
    AND    conkey @> ARRAY[
             (SELECT attnum FROM pg_attribute WHERE attrelid = 'customer_profiles'::regclass AND attname = 'business_id'),
             (SELECT attnum FROM pg_attribute WHERE attrelid = 'customer_profiles'::regclass AND attname = 'phone')
           ]::smallint[]
  ) THEN
    ALTER TABLE customer_profiles
      ADD CONSTRAINT customer_profiles_business_id_phone_key
      UNIQUE (business_id, phone);
  END IF;
END $$;

-- Also ensure the opted_out, source, import_platform, phone_display,
-- phone_encrypted columns exist (idempotent adds from migration 019).
ALTER TABLE customer_profiles
  ADD COLUMN IF NOT EXISTS phone_encrypted text,
  ADD COLUMN IF NOT EXISTS phone_display    text,
  ADD COLUMN IF NOT EXISTS opted_out        boolean default false,
  ADD COLUMN IF NOT EXISTS opted_out_at     timestamptz,
  ADD COLUMN IF NOT EXISTS source           text default 'booking',
  ADD COLUMN IF NOT EXISTS import_platform  text,
  ADD COLUMN IF NOT EXISTS notes            text;
