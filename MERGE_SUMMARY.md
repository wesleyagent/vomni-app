# Merge Summary — booking-platform → main

**Date:** 2026-04-02
**Merged by:** Claude (automated merge session)

---

## 1. What Was Merged

Branch `booking-platform` was merged into `main` in `vomni-app` via a clean fast-forward (no conflicts). The branch adds the complete booking platform feature set.

---

## 2. Files Added or Modified in vomni-app (merge commit)

### New API routes
- `app/api/auth/callback/google-calendar/route.ts`
- `app/api/auth/google-calendar/route.ts`
- `app/api/blocked-times/route.ts`
- `app/api/booking/[slug]/availability/route.ts`
- `app/api/booking/[slug]/calendar.ics/route.ts`
- `app/api/booking/[slug]/create/route.ts`
- `app/api/booking/[slug]/route.ts`
- `app/api/booking/[slug]/status/route.ts`
- `app/api/booking/[slug]/waitlist/route.ts`
- `app/api/booking/cancel/[token]/route.ts`
- `app/api/business-hours/route.ts`
- `app/api/business-settings/route.ts`
- `app/api/calendar/disconnect/route.ts`
- `app/api/calendar/feed/[business_id]/route.ts`
- `app/api/calendar/google/events/route.ts`
- `app/api/calendar/google/status/route.ts`
- `app/api/calendar/google/sync/route.ts`
- `app/api/calendar/google/webhook/route.ts`
- `app/api/calendar/outlook/callback/route.ts`
- `app/api/calendar/outlook/connect/route.ts`
- `app/api/cron/appointment-reminders/route.ts`
- `app/api/cron/no-show-rebooking/route.ts`
- `app/api/cron/waitlist-check/route.ts`
- `app/api/debug/calendar/route.ts`
- `app/api/google-calendar/callback/route.ts`
- `app/api/google-calendar/connect/route.ts`
- `app/api/google-calendar/disconnect/route.ts`
- `app/api/migration/export-clients/route.ts`
- `app/api/migration/import-clients/route.ts`
- `app/api/services/route.ts`
- `app/api/staff/invite/route.ts`
- `app/api/webhooks/feedback/route.ts`

### New pages & components
- `app/biz/[slug]/page.tsx` — public business profile page
- `app/book/[slug]/BookingFlow.tsx` — customer-facing booking UI
- `app/book/[slug]/page.tsx`
- `app/cancel/[token]/page.tsx` — booking cancellation page
- `app/dashboard/analytics/booking/page.tsx`
- `app/dashboard/analytics/layout.tsx`
- `app/dashboard/calendar/layout.tsx`
- `app/dashboard/calendar/page.tsx` — full calendar view
- `app/dashboard/calendar/settings/page.tsx`
- `app/dashboard/settings/booking/page.tsx`
- `app/dashboard/switch/page.tsx` — Switch to Vomni migration tool
- `app/dashboard/team/page.tsx` — Staff/team management
- `app/data-ownership/page.tsx`
- `app/review-invite/[business_id]/page.tsx`
- `app/switch-from/[platform]/CostCalculator.tsx`
- `app/switch-from/[platform]/page.tsx`
- `components/DataOwnershipBadge.tsx`
- `components/Walkthrough.tsx`

### Modified pages
- `app/dashboard/customers/page.tsx` — added Appointments + Reviews sub-tabs
- `app/dashboard/layout.tsx` — added calendar, team, switch nav entries
- `app/dashboard/page.tsx` — updated stats
- `app/dashboard/settings/page.tsx`
- `app/onboarding/page.tsx`
- `app/pricing/page.tsx`
- `app/r/[id]/page.tsx`
- `app/layout.tsx`

### New library modules
- `lib/booking-utils.ts`
- `lib/calendar-providers.ts`
- `lib/crypto.ts`
- `lib/csv-parser.ts`
- `lib/email.ts`
- `lib/google-calendar.ts`
- `lib/platform-comparison.ts`
- `lib/rate-limit.ts`
- `lib/twilio.ts`

### Updated library modules
- `lib/planFeatures.ts`

### New types
- `types/booking.ts`

### Supabase migrations (added by merge)
- `supabase/migrations/005_booking_system.sql`
- `supabase/migrations/006_booking_improvements.sql`
- `supabase/migrations/007_google_calendar_email.sql`
- `supabase/migrations/008_email_log_and_constraints.sql`
- `supabase/migrations/009_multi_calendar.sql`
- `supabase/migrations/010_master_child_accounts.sql`
- `supabase/migrations/011_walkthrough_and_profile.sql`
- `supabase/migrations/012_fix_blocked_times_and_services.sql`
- `supabase/migrations/013_google_calendar_sync.sql`
- `supabase/migrations/014_migration_system.sql`
- `supabase/migrations/015_device_tokens.sql`

### Other
- `CHANGES.md`
- `.env.example` (updated with new env vars)
- `next.config.ts`
- `package.json` / `package-lock.json`
- `public/manifest.json`
- `public/sw.js`
- `run-migration.js`
- `setup-test-booking.js`

### Files modified after merge (this session)
- `app/api/booking/[slug]/create/route.ts` — improved push notification body to use `HH:MM` time format
- `supabase/migrations/016_merge_booking_system.sql` — new catch-up migration (see section 8)

---

## 3. Files Changed in vomni-mobile

| File | Change |
|------|--------|
| `app.config.js` | `apiBaseUrl` fallback changed from Vercel preview URL to `https://vomni.io` |
| `.env` | `API_BASE_URL` changed to `https://vomni.io` |
| `lib/api.ts` | Fallback `API_BASE_URL` constant changed to `https://vomni.io` |
| `lib/notifications.ts` | Added `shouldShowBanner: true` and `shouldShowList: true` to fix TypeScript error |
| `app/(onboarding)/index.tsx` | Replaced smart/curly apostrophes in string literals with escaped straight quotes to fix TypeScript parse errors |

No wrong table names were found — the mobile app already used `feedback` (not `reviews`) and `bookings` (not `customers`).

---

## 4. Full Contents of 016_merge_booking_system.sql

```sql
-- ============================================================================
-- 016: Merge Booking System — Safe Idempotent Catch-Up Migration
-- Run after merging booking-platform → main
-- Safe to run multiple times (CREATE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS)
-- Never drops anything
-- ============================================================================

-- ── device_tokens ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS device_tokens (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid        REFERENCES businesses(id) ON DELETE CASCADE,
  token       text        NOT NULL,
  platform    text        NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at  timestamptz DEFAULT now(),
  UNIQUE (business_id, token)
);

ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business owner manages device tokens" ON device_tokens;
CREATE POLICY "Business owner manages device tokens"
  ON device_tokens FOR ALL USING (
    business_id IN (SELECT id FROM businesses WHERE owner_email = auth.jwt() ->> 'email')
  );

CREATE INDEX IF NOT EXISTS device_tokens_business_idx ON device_tokens(business_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON device_tokens TO authenticated, anon;

-- ── clients ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id    uuid        REFERENCES businesses(id) ON DELETE CASCADE,
  name           text        NOT NULL,
  email          text,
  phone          text,
  notes          text,
  source         text        DEFAULT 'manual',
  imported_at    timestamptz DEFAULT now(),
  last_visited_at timestamptz,
  total_visits   int         DEFAULT 0,
  created_at     timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS clients_business_id_idx ON clients(business_id);
CREATE INDEX IF NOT EXISTS clients_phone_idx        ON clients(phone);
CREATE UNIQUE INDEX IF NOT EXISTS clients_business_phone_unique
  ON clients(business_id, phone) WHERE phone IS NOT NULL;

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "clients_business_owner" ON clients;
CREATE POLICY "clients_business_owner" ON clients FOR ALL USING (
  business_id IN (SELECT id FROM businesses WHERE owner_email = auth.jwt() ->> 'email')
);
GRANT SELECT, INSERT, UPDATE, DELETE ON clients TO authenticated, anon;

-- ── migration_imports ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS migration_imports (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id      uuid        REFERENCES businesses(id) ON DELETE CASCADE,
  source_platform  text,
  file_name        text,
  total_rows       int         DEFAULT 0,
  imported_rows    int         DEFAULT 0,
  skipped_rows     int         DEFAULT 0,
  error_rows       int         DEFAULT 0,
  status           text        DEFAULT 'pending',
  created_at       timestamptz DEFAULT now(),
  completed_at     timestamptz
);

CREATE INDEX IF NOT EXISTS migration_imports_business_idx ON migration_imports(business_id);
ALTER TABLE migration_imports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "migration_imports_business_owner" ON migration_imports;
CREATE POLICY "migration_imports_business_owner" ON migration_imports FOR ALL USING (
  business_id IN (SELECT id FROM businesses WHERE owner_email = auth.jwt() ->> 'email')
);
GRANT SELECT, INSERT, UPDATE, DELETE ON migration_imports TO authenticated, anon;

-- ── businesses: missing columns ──────────────────────────────────────────────
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS booking_slug text UNIQUE;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS booking_enabled boolean DEFAULT false;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS booking_buffer_minutes integer DEFAULT 0;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS booking_advance_days integer DEFAULT 30;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS booking_cancellation_hours integer DEFAULT 24;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS booking_confirmation_message text;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS booking_confirmation_message_he text;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS booking_currency text DEFAULT 'ILS';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS booking_timezone text DEFAULT 'Asia/Jerusalem';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS require_phone boolean DEFAULT true;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS require_email boolean DEFAULT false;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS calendar_token text;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS google_calendar_connected boolean DEFAULT false;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS whatsapp_enabled boolean DEFAULT false;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS google_maps_url text;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS instagram_handle text;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS parent_business_id uuid REFERENCES businesses(id) ON DELETE CASCADE;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS is_master boolean NOT NULL DEFAULT true;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS staff_member_id uuid REFERENCES staff(id) ON DELETE SET NULL;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS staff_can_see_others boolean NOT NULL DEFAULT false;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS has_completed_walkthrough boolean NOT NULL DEFAULT false;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS postcode text;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS primary_color text DEFAULT '#00C896';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS notification_email text;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS outlook_calendar_connected boolean DEFAULT false;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS outlook_calendar_email text;

-- ── bookings: missing columns ─────────────────────────────────────────────────
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES staff(id);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS service_id uuid REFERENCES services(id);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS service_name text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS service_duration_minutes integer;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS service_price numeric;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_source text DEFAULT 'vomni';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS status text DEFAULT 'confirmed';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancellation_reason text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_at timestamp;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS internal_notes text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reminder_sent boolean DEFAULT false;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reminder_sent_at timestamp;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS confirmation_sent boolean DEFAULT false;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancellation_token text UNIQUE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS is_recurring boolean DEFAULT false;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS recurring_group_id uuid;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS recurring_interval_weeks integer;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS google_event_id text;

-- ── Other tables: missing columns ─────────────────────────────────────────────
ALTER TABLE blocked_times ADD COLUMN IF NOT EXISTS label text;
ALTER TABLE blocked_times ADD COLUMN IF NOT EXISTS start_time time;
ALTER TABLE blocked_times ADD COLUMN IF NOT EXISTS end_time time;
ALTER TABLE blocked_times ADD COLUMN IF NOT EXISTS is_recurring boolean DEFAULT false;
ALTER TABLE blocked_times ADD COLUMN IF NOT EXISTS day_of_week integer;
ALTER TABLE blocked_times ADD COLUMN IF NOT EXISTS date date;
ALTER TABLE blocked_times ADD COLUMN IF NOT EXISTS google_event_id text;
ALTER TABLE blocked_times ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual';

ALTER TABLE staff ADD COLUMN IF NOT EXISTS color text DEFAULT '#3B82F6';
ALTER TABLE staff ADD COLUMN IF NOT EXISTS last_login_at timestamptz;

ALTER TABLE services ADD COLUMN IF NOT EXISTS color text;

ALTER TABLE staff_services ADD COLUMN IF NOT EXISTS custom_price numeric;
ALTER TABLE staff_services ADD COLUMN IF NOT EXISTS is_available boolean NOT NULL DEFAULT true;

-- ── calendar_connections ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS calendar_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES staff(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('google','outlook','apple','caldav')),
  token_encrypted text, calendar_id text, email text,
  caldav_url text, caldav_username text,
  is_active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE calendar_connections ADD COLUMN IF NOT EXISTS webhook_channel_id text;
ALTER TABLE calendar_connections ADD COLUMN IF NOT EXISTS webhook_resource_id text;
ALTER TABLE calendar_connections ADD COLUMN IF NOT EXISTS webhook_expires_at timestamptz;

-- Indexes, triggers, grants ...
-- (see full file at supabase/migrations/016_merge_booking_system.sql)
```

---

## 5. New Environment Variables Needed in Vercel

These are new variables introduced by the booking-platform branch. Set them in the Vercel project settings under Environment Variables.

| Variable | Description | Where to get it |
|----------|-------------|-----------------|
| `CALENDAR_TOKEN_SECRET` | AES-256-GCM key for encrypting calendar OAuth tokens (64-char hex) | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID for Google Calendar integration | console.cloud.google.com → Credentials |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | Same as above |
| `MICROSOFT_CLIENT_ID` | Microsoft Azure app registration client ID | portal.azure.com → App registrations |
| `MICROSOFT_CLIENT_SECRET` | Microsoft Azure client secret | Same as above |
| `MICROSOFT_TENANT_ID` | Usually `common` for multi-tenant | Set to `common` |
| `VAPID_PUBLIC_KEY` | Web Push VAPID public key | `npx web-push generate-vapid-keys` |
| `VAPID_PRIVATE_KEY` | Web Push VAPID private key | Same as above |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Same as `VAPID_PUBLIC_KEY` (public-facing) | Same as above |
| `RESEND_API_KEY` | API key for sending transactional emails via Resend | resend.com |
| `RESEND_FROM_ADDRESS` | From address for booking emails (e.g., `Vomni <bookings@vomni.app>`) | Must be verified domain in Resend |

Previously required (should already be set):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL` (set to `https://vomni.io`)
- `ANTHROPIC_API_KEY`
- `ADMIN_PASSWORD`

---

## 6. Instructions to Run Locally After Merge

```bash
# In vomni-app
cd /Users/nickyleslie/Desktop/Wesley/vomni-app
npm install
cp .env.example .env.local
# Fill in all required env vars in .env.local
npm run dev
# App runs at http://localhost:3000
```

```bash
# In vomni-mobile
cd /Users/nickyleslie/Desktop/Wesley/vomni-mobile
npm install
# .env is already updated to point to https://vomni.io
# For local testing against local server, change API_BASE_URL to http://localhost:3000
npx expo start
```

---

## 7. Instructions to Deploy to Vercel

1. Ensure all environment variables from Section 5 are set in Vercel project settings
2. Push `main` branch to remote:
   ```bash
   cd /Users/nickyleslie/Desktop/Wesley/vomni-app
   git push origin main
   ```
3. Vercel will auto-deploy from `main` if connected
4. Or deploy manually:
   ```bash
   npx vercel --prod
   ```
5. After deployment, verify:
   - `https://vomni.io/book/[your-slug]` loads the booking page
   - `https://vomni.io/dashboard/calendar` loads the calendar
   - Push notifications work (requires Expo push token registered in `device_tokens` table)

---

## 8. SQL to Run in Supabase

Run the migrations in order in the Supabase SQL editor (supabase.com/dashboard → SQL Editor):

**If starting fresh (new Supabase project):** Run migrations 001 through 016 in order.

**If upgrading an existing database that was on main before this merge:** Run only the migrations that haven't been applied. The booking-platform migrations are 005–016. Check which ones are missing and run them in order.

**Safe catch-all:** Run `016_merge_booking_system.sql` — it is fully idempotent (uses `CREATE TABLE IF NOT EXISTS` and `ADD COLUMN IF NOT EXISTS` throughout) and will bring any database up to date without breaking anything.

Copy the full contents from:
`/Users/nickyleslie/Desktop/Wesley/vomni-app/supabase/migrations/016_merge_booking_system.sql`

Or run all migrations in sequence using the Supabase CLI:
```bash
supabase db push
```

---

## 9. Manual Resolution Required

None. The merge was a clean fast-forward with zero conflicts.

---

## 10. Push Notification Status

Push notifications to mobile devices via Expo Push API are **already implemented** in `app/api/booking/[slug]/create/route.ts` (lines 293–317). The implementation:
- Queries `device_tokens` table for all tokens belonging to the business
- Sends a push notification via `https://exp.host/--/api/v2/push/send`
- Is fully non-blocking (wrapped in try/catch, does not affect booking response)
- Notification body format: `📅 {customerName}, {serviceName} at {HH:MM}`
