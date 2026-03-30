# Vomni Booking Platform — Changes Log

> All changes are isolated to the `booking-platform` branch.
> Do not merge to `main` until the booking feature is confirmed for production.

---

## Session 3 — Critical Fixes + Feature Expansion

### Critical Fixes

#### 1. Token Encryption (AES-256-GCM)
- **New:** `lib/crypto.ts` — `encrypt()` / `decrypt()` using Node.js `crypto` module
- **Updated:** `lib/google-calendar.ts` — `encryptTokenPayload()` / `decryptTokenPayload()`
- **Updated:** `app/api/google-calendar/callback/route.ts` — stores tokens encrypted
- **Requires:** `CALENDAR_TOKEN_SECRET` env var (64-char hex string)
- Backward-compatible: plain JSON tokens (pre-encryption) are still readable

#### 2. Email Reliability
- **New:** `lib/email.ts` — `sendEmail()` with pre/post logging to `email_log` table
- **New:** `supabase/migrations/008_email_log_and_constraints.sql` — `email_log` table
- `sendEmail()` writes a `pending` record → sends → updates to `sent`/`failed`
- Replaces all fire-and-forget `fetch()` calls

#### 3. Customer Booking Confirmation Email
- **Updated:** `app/api/booking/[slug]/create/route.ts`
- Sends `buildCustomerConfirmHtml()` to customer email if provided
- Contains: appointment date, service, staff, iCal link, cancel link, address

#### 4. Calendar Token Failure Handling
- **Updated:** `lib/google-calendar.ts` — `getAccessToken()` calls `markDisconnected()` on refresh failure
- Sets `google_calendar_connected = false` in DB
- Dashboard settings page shows `?error=gcal_disconnected` banner

#### 5. Availability Caching
- **Updated:** `lib/google-calendar.ts` — 60-second in-memory cache per `(businessId, date)` key
- Prevents hammering Google freeBusy API on repeated slot queries
- Auto-cleanup via `setInterval` every 5 minutes

#### 6. Atomic Recurring Bookings
- **New:** `insert_recurring_bookings(p_rows jsonb)` RPC function (migration 008)
- **Updated:** `app/dashboard/calendar/page.tsx` — calls RPC instead of direct insert
- Rolls back all inserts if any slot conflict or error occurs
- Returns `{ success: false, error: "slot_taken" }` on conflict

#### 7. Slug Collision Prevention
- **Updated:** `app/onboarding/page.tsx` — `handleComplete()` checks for existing slugs
- Appends `-2`, `-3` etc. if slug already taken by another business
- **New:** `UNIQUE INDEX businesses_booking_slug_unique` (migration 008)

#### 8. Booking Unique Constraint
- **New:** `bookings_slot_unique` partial index (migration 008)
- Enforces uniqueness on `(business_id, appointment_at, staff_id)` for `confirmed` bookings
- Separate constraint for solo businesses (no staff_id)

---

### New Features

#### Multi-Calendar Connections
- **New:** `lib/calendar-providers.ts` — unified provider interface
  - `getBusyTimes(conn, date, tz)` per provider
  - `getUnifiedBusyTimes(businessId, staffId, date, tz)` — unions all providers
- **New:** `supabase/migrations/009_multi_calendar.sql` — `calendar_connections` table
- **New:** `app/api/calendar/outlook/connect/route.ts` — Microsoft OAuth redirect
- **New:** `app/api/calendar/outlook/callback/route.ts` — token exchange + store
- **New:** `app/api/calendar/disconnect/route.ts` — remove connection
- **Updated:** `app/api/booking/[slug]/availability/route.ts` — calls `getUnifiedBusyTimes()`
- Supports: Google (legacy + new), Outlook/O365, Apple iCloud (CalDAV), Generic CalDAV

#### Multi-Staff Master/Child Accounts
- **New:** `supabase/migrations/010_master_child_accounts.sql`
  - `parent_business_id`, `is_master`, `staff_member_id`, `staff_can_see_others` on businesses
  - `staff_invites` table for pending invitations
  - `custom_price`, `is_available` on `staff_services`
  - `color`, `last_login_at` on `staff`
  - RLS policies on booking/services/hours/blocked_times/staff tables
- **New:** `app/api/staff/invite/route.ts` — POST sends invite email; GET validates token

#### Platform Walkthrough
- **New:** `components/Walkthrough.tsx` — `WalkthroughProvider` + `useWalkthrough()`
  - Zero external dependencies — pure React + CSS
  - Tooltip anchored to `data-walkthrough="step-id"` elements
  - Semi-transparent overlay, progress dots, Back/Next/Skip
  - `onComplete` callback (use to PATCH `has_completed_walkthrough = true`)

#### Business Profile Page
- **New:** `app/biz/[slug]/page.tsx` — public-facing mini-profile
  - Shows: name, logo, bio, star rating, address, services + prices, Book Now CTA
  - Links to Google Maps, Instagram
  - SEO meta tags
  - "Powered by Vomni" footer

#### Review Invite Page
- **New:** `app/review-invite/[business_id]/page.tsx` — server component
  - Records `clicked_at` on `review_invites` table
  - Redirects to `google_maps_url` for the business
  - Falls back to thank-you screen if no Maps URL configured
- **New:** `supabase/migrations/011_walkthrough_and_profile.sql`
  - `review_invites` table (`id`, `business_id`, `booking_id`, `customer_name`, `method`, `created_at`, `clicked_at`)
  - `push_subscriptions` table for Web Push
  - `address`, `city`, `postcode`, `primary_color`, `bio` on businesses

#### PWA Support
- **New:** `public/manifest.json` — name, icons, shortcuts (Calendar, New Booking)
- **New:** `public/sw.js` — service worker
  - Network-first for API routes, cache-first for static
  - Push notification handler → shows notification with "Open Dashboard" action
  - Notification click → opens correct dashboard page
- **Updated:** `app/layout.tsx` — manifest link, theme-color, SW registration script

---

## Environment Variables Required

| Variable | Purpose | Required |
|----------|---------|----------|
| `CALENDAR_TOKEN_SECRET` | 32-byte hex key for AES-256-GCM encryption | **Yes** |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | Yes (for Google Calendar) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | Yes (for Google Calendar) |
| `MICROSOFT_CLIENT_ID` | Microsoft OAuth client ID | Yes (for Outlook Calendar) |
| `MICROSOFT_CLIENT_SECRET` | Microsoft OAuth client secret | Yes (for Outlook Calendar) |
| `MICROSOFT_TENANT_ID` | Microsoft tenant (default: `common`) | No |
| `RESEND_API_KEY` | Resend API key for emails | Yes |
| `RESEND_FROM_ADDRESS` | Sender address (default: `bookings@vomni.app`) | No |
| `NEXT_PUBLIC_APP_URL` | App base URL | Yes |
| `VAPID_PUBLIC_KEY` | Web Push VAPID public key | Yes (for push notifications) |
| `VAPID_PRIVATE_KEY` | Web Push VAPID private key | Yes (for push notifications) |

Generate `CALENDAR_TOKEN_SECRET`:
```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## DB Migrations to Run (in order)

```sql
-- Run in Supabase SQL Editor:
-- 008_email_log_and_constraints.sql
-- 009_multi_calendar.sql
-- 010_master_child_accounts.sql
-- 011_walkthrough_and_profile.sql
```

---

## Files Created / Modified

### New Files
- `lib/crypto.ts`
- `lib/email.ts`
- `lib/calendar-providers.ts`
- `components/Walkthrough.tsx`
- `app/api/calendar/outlook/connect/route.ts`
- `app/api/calendar/outlook/callback/route.ts`
- `app/api/calendar/disconnect/route.ts`
- `app/api/staff/invite/route.ts`
- `app/biz/[slug]/page.tsx`
- `app/review-invite/[business_id]/page.tsx`
- `public/manifest.json`
- `public/sw.js`
- `supabase/migrations/008_email_log_and_constraints.sql`
- `supabase/migrations/009_multi_calendar.sql`
- `supabase/migrations/010_master_child_accounts.sql`
- `supabase/migrations/011_walkthrough_and_profile.sql`

### Modified Files
- `lib/google-calendar.ts` — encryption + caching + auto-disconnect
- `app/api/google-calendar/callback/route.ts` — encrypted token storage
- `app/api/booking/[slug]/create/route.ts` — email lib, customer confirmation
- `app/api/booking/[slug]/availability/route.ts` — multi-calendar + caching
- `app/dashboard/calendar/page.tsx` — atomic recurring via RPC
- `app/dashboard/calendar/settings/page.tsx` — disconnect banner, business_id in disconnect call
- `app/onboarding/page.tsx` — slug collision prevention
- `app/layout.tsx` — PWA manifest + SW registration
