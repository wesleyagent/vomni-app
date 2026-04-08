-- ============================================================================
-- Migration 026: Country, locale, and currency on businesses
--
-- Adds three account-level columns to the `businesses` table:
--   country  — ISO 3166-1 alpha-2 code of the business's country (e.g. 'IL', 'GB')
--   locale   — UI locale resolved from the country at sign-up (e.g. 'he', 'en')
--   currency — ISO 4217 currency code resolved from the country (e.g. 'ILS', 'GBP')
--
-- Existing rows are left NULL (no default forced) so they continue to use
-- whatever behaviour was in place before (English, GBP).  New sign-ups will
-- always have these populated from lib/localeFromCountry.ts.
-- ============================================================================

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS country  text,
  ADD COLUMN IF NOT EXISTS locale   text,
  ADD COLUMN IF NOT EXISTS currency text;

-- Optional: add a check constraint so only valid ISO 3166-1 alpha-2 codes
-- can be stored (two uppercase letters).  Remove if you'd rather keep it loose.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'businesses_country_format'
      AND conrelid = 'businesses'::regclass
  ) THEN
    ALTER TABLE businesses
      ADD CONSTRAINT businesses_country_format
        CHECK (country IS NULL OR country ~ '^[A-Z]{2}$');
  END IF;
END$$;

-- Index — useful for filtering/grouping analytics by country
CREATE INDEX IF NOT EXISTS idx_businesses_country ON businesses (country);

COMMENT ON COLUMN businesses.country  IS 'ISO 3166-1 alpha-2 country code selected at sign-up (e.g. IL, GB, US)';
COMMENT ON COLUMN businesses.locale   IS 'UI locale resolved from country at sign-up (e.g. he, en)';
COMMENT ON COLUMN businesses.currency IS 'ISO 4217 currency code resolved from country at sign-up (e.g. ILS, GBP, USD)';
