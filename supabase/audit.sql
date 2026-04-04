-- ============================================================================
-- Vomni — Pre-launch Database Audit
-- Paste this entire script into Supabase SQL Editor and run it.
-- Every section produces a result set — check for any FAIL rows.
-- ============================================================================


-- ── 1. TABLES EXIST ──────────────────────────────────────────────────────────
SELECT
  t.table_name,
  CASE WHEN t.table_name IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING' END AS status
FROM (VALUES
  ('businesses'),
  ('bookings'),
  ('services'),
  ('staff'),
  ('staff_services'),
  ('business_hours'),
  ('staff_hours'),
  ('customer_profiles'),
  ('clients'),
  ('crm_nudges'),
  ('feedback'),
  ('whatsapp_log'),
  ('contact_submissions')
) AS expected(table_name)
LEFT JOIN information_schema.tables t
  ON t.table_name = expected.table_name
  AND t.table_schema = 'public'
ORDER BY expected.table_name;


-- ── 2. MIGRATIONS APPLIED (check key columns from each migration) ─────────────
SELECT
  migration,
  column_check,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = tbl
      AND column_name  = col
  ) THEN '✅ Applied' ELSE '❌ NOT applied — run this migration!' END AS status
FROM (VALUES
  ('019 — phone_encryption_optout',  'customer_profiles', 'opted_out',          'customer_profiles.opted_out'),
  ('019 — phone_encryption_optout',  'customer_profiles', 'source',              'customer_profiles.source'),
  ('019 — phone_encryption_optout',  'customer_profiles', 'phone_display',       'customer_profiles.phone_display'),
  ('019 — phone_encryption_optout',  'customer_profiles', 'notes',               'customer_profiles.notes'),
  ('019 — phone_encryption_optout',  'bookings',          'phone_display',       'bookings.phone_display'),
  ('022 — marketing_consent',        'customer_profiles', 'marketing_consent',   'customer_profiles.marketing_consent'),
  ('022 — marketing_consent',        'customer_profiles', 'consent_source',      'customer_profiles.consent_source'),
  ('022 — marketing_consent',        'bookings',          'marketing_consent',   'bookings.marketing_consent')
) AS checks(migration, tbl, col, column_check)
ORDER BY migration;


-- ── 3. COLUMN DEFAULTS (marketing_consent should be TRUE) ────────────────────
SELECT
  table_name,
  column_name,
  column_default,
  CASE
    WHEN column_default = 'true' THEN '✅ Correct (true)'
    WHEN column_default = 'false' THEN '⚠️  Wrong default — run: ALTER TABLE ' || table_name || ' ALTER COLUMN marketing_consent SET DEFAULT true;'
    ELSE '❓ Unknown: ' || coalesce(column_default, 'NULL')
  END AS status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name  = 'marketing_consent'
ORDER BY table_name;


-- ── 4. marketing_consent DATA ────────────────────────────────────────────────
-- For imported clients: marketing_consent should be true (with consent_source = 'imported_assumed')
-- For opted_out = true clients: marketing_consent should be false (they texted STOP — do not touch)
SELECT
  source,
  opted_out,
  marketing_consent,
  consent_source,
  COUNT(*) AS count,
  CASE
    WHEN opted_out = true AND marketing_consent = true
      THEN '❌ PROBLEM — opted_out but marketing_consent=true'
    WHEN opted_out = false AND marketing_consent = false AND source = 'import' AND consent_source IS NULL
      THEN '⚠️  Imported client needs backfill — run the scoped UPDATE'
    ELSE '✅ OK'
  END AS status
FROM customer_profiles
GROUP BY source, opted_out, marketing_consent, consent_source
ORDER BY status DESC, source;


-- ── 5. RLS ENABLED ───────────────────────────────────────────────────────────
SELECT
  c.relname AS table_name,
  CASE WHEN c.relrowsecurity THEN '✅ RLS ON' ELSE '❌ RLS OFF — run migration 023' END AS rls_status
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname IN ('businesses', 'bookings', 'customer_profiles')
ORDER BY c.relname;


-- ── 6. RLS POLICIES EXIST ────────────────────────────────────────────────────
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  '✅ EXISTS' AS status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('businesses', 'bookings', 'customer_profiles')
ORDER BY tablename, policyname;


-- ── 7. ROW COUNTS ────────────────────────────────────────────────────────────
SELECT 'businesses'        AS tbl, COUNT(*) AS rows FROM businesses
UNION ALL
SELECT 'bookings',                  COUNT(*) FROM bookings
UNION ALL
SELECT 'customer_profiles',         COUNT(*) FROM customer_profiles
UNION ALL
SELECT 'clients (import staging)',  COUNT(*) FROM clients
UNION ALL
SELECT 'services',                  COUNT(*) FROM services
UNION ALL
SELECT 'staff',                     COUNT(*) FROM staff
UNION ALL
SELECT 'feedback',                  COUNT(*) FROM feedback
UNION ALL
SELECT 'crm_nudges',                COUNT(*) FROM crm_nudges
ORDER BY tbl;


-- ── 8. UNIQUE CONSTRAINT ON customer_profiles ────────────────────────────────
SELECT
  conname AS constraint_name,
  '✅ EXISTS' AS status
FROM pg_constraint
WHERE conrelid = 'customer_profiles'::regclass
  AND contype = 'u'
UNION ALL
SELECT
  'customer_profiles_business_id_phone_key',
  CASE WHEN NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'customer_profiles'::regclass AND contype = 'u'
  ) THEN '❌ MISSING — run migration 020' ELSE NULL END
HAVING NOT EXISTS (
  SELECT 1 FROM pg_constraint
  WHERE conrelid = 'customer_profiles'::regclass AND contype = 'u'
);


-- ── 9. ORPHANED DATA CHECK ───────────────────────────────────────────────────
SELECT 'Bookings with no business'       AS check_name, COUNT(*) AS count,
  CASE WHEN COUNT(*) = 0 THEN '✅ Clean' ELSE '⚠️  Orphaned rows' END AS status
FROM bookings b
WHERE NOT EXISTS (SELECT 1 FROM businesses biz WHERE biz.id = b.business_id)

UNION ALL

SELECT 'customer_profiles with no business', COUNT(*),
  CASE WHEN COUNT(*) = 0 THEN '✅ Clean' ELSE '⚠️  Orphaned rows' END
FROM customer_profiles cp
WHERE NOT EXISTS (SELECT 1 FROM businesses biz WHERE biz.id = cp.business_id)

UNION ALL

SELECT 'clients with no business', COUNT(*),
  CASE WHEN COUNT(*) = 0 THEN '✅ Clean' ELSE '⚠️  Orphaned rows' END
FROM clients c
WHERE NOT EXISTS (SELECT 1 FROM businesses biz WHERE biz.id = c.business_id);


-- ── 10. BUSINESSES OVERVIEW ───────────────────────────────────────────────────
SELECT
  id,
  name,
  owner_email,
  plan,
  status,
  booking_timezone,
  CASE WHEN google_review_link IS NOT NULL THEN '✅' ELSE '⚠️  Missing' END AS google_link,
  created_at::date AS created
FROM businesses
ORDER BY created_at DESC;
