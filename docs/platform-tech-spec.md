# Vomni Platform — Full Technical Specification
**Version:** 1.0
**Date:** April 2026
**Status:** Production
**Audience:** CTO / Engineering Leadership

---

## Executive Summary

Vomni is a multi-tenant SaaS platform for service businesses (salons, barbershops, clinics, spas, tattoo studios, etc.) combining two core product pillars:

1. **Reputation Management** — Automated post-appointment review routing, Google redirect tracking, private feedback capture, AI-powered reply generation and sentiment analysis
2. **Booking System** — Native online scheduling with staff management, real-time availability, Google/Microsoft Calendar 2-way sync, and automated SMS/WhatsApp/email communications

**Primary Markets:** Israel (Hebrew + ILS) and United Kingdom (English + GBP), with automatic locale detection via Cloudflare IP headers.

---

## 1. Infrastructure & Architecture

### 1.1 Hosting & Deployment

| Component | Provider | Detail |
|-----------|----------|--------|
| App hosting | Vercel | Serverless, App Router (Next.js) |
| Production URL | `vomni.io` | `main` branch auto-deploys |
| Staging URL | `vomni-app-git-booking-platform-wesleyagents-projects.vercel.app` | `booking-platform` branch |
| CDN | Vercel Edge Network + Cloudflare | Geo-detection via `cf-ipcountry` header |
| Database | Supabase (PostgreSQL 15+) | Hosted, managed, with RLS |
| File storage | Supabase Storage | Logos, invoice PDFs |
| Error tracking | Sentry | Client + server |

### 1.2 Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| UI | React 19, inline styles (no CSS framework) |
| Fonts | Bricolage Grotesque (headings), Inter (body) — Google Fonts |
| Database client | `@supabase/supabase-js` (anon + service role) |
| Auth | Supabase Auth (JWT, email/password, magic link) |
| Deployment | Vercel CLI + GitHub Actions |

### 1.3 Database Access Pattern

Two Supabase clients are used throughout the codebase with strictly separated concerns:

**`db` (anon key):**
- Subject to Row Level Security (RLS)
- Used in dashboard client components for reads
- Authenticated by Supabase session JWT
- Cannot write sensitive data or bypass business isolation

**`supabaseAdmin` (service role key):**
- Bypasses all RLS
- Used exclusively in API route handlers and server components
- Used for all writes from unauthenticated customers (booking creation, review submission)
- Used for all cron job operations
- Never exposed to the browser

### 1.4 Authentication

**Business owner (dashboard):**
- Supabase Auth — email/password or magic link
- Session stored in Supabase cookies (httpOnly)
- Dashboard routes protected via `middleware.ts` — redirects to `/login` if no session

**Admin portal (`/admin/`):**
- Separate auth stack independent of Supabase
- bcrypt hashed password + RFC 6238 TOTP (2FA) mandatory
- Session stored as httpOnly cookie (8h TTL)
- `ADMIN_TOTP_SECRET` and `ADMIN_PASSWORD_HASH` in environment variables

**Customer-facing pages:**
- No authentication — unauthenticated
- Booking pages: rate-limited per IP and per phone number (Upstash Redis)
- Review pages: `cancellation_token` (booking manage links) or `business_id` (review-invite)
- Review one-use enforcement via `review_status` field

### 1.5 External Integrations

| Service | Purpose | Auth Method |
|---------|---------|-------------|
| Twilio | SMS (IL: +972, UK: +44) + WhatsApp Business | Account SID + Auth Token |
| Resend | Transactional email | API key |
| Google Calendar API | 2-way calendar sync | OAuth 2.0, refresh token stored encrypted in DB |
| Microsoft Outlook API | 2-way calendar sync | OAuth 2.0, refresh token stored encrypted in DB |
| LemonSqueezy | Subscription billing, checkout | API key + HMAC webhook signing |
| Anthropic Claude API | AI feedback replies, insights, sentiment | API key |
| Upstash Redis | Rate limiting (global, per-IP, per-phone) | REST URL + token |
| Sentry | Error tracking | DSN |
| Telegram | Internal ops alerts (calendar sync failures, errors) | Bot token |

---

## 2. Application Structure

### 2.1 Public Routes

| Route | Description |
|-------|-------------|
| `/` | Marketing homepage |
| `/login` | Supabase auth login |
| `/signup` | Account creation |
| `/book/[slug]` | **Customer-facing booking page** |
| `/manage/[token]` | **Customer booking management** (reschedule / cancel) |
| `/r/[booking_id]` | **Post-appointment review page** |
| `/review-invite/[business_id]` | **Manual review invite page** |
| `/cancel/[token]` | Direct cancellation link |
| `/widget/[business_id]` | Embeddable booking widget (iframe) |
| `/demo/[slug]` | Demo booking flows |
| `/he` | Hebrew locale entry point (IP-detected redirect) |
| `/blog/[slug]` | MDX blog |
| `/contact`, `/privacy`, `/terms`, `/data-ownership`, `/dpa` | Legal + info pages |
| `/checkout/[slug]` | LemonSqueezy checkout redirect |
| `/migrate/` | Data import tools (Booksy, Fresha, Calmark CSV importers) |
| `/admin/` | Admin portal (password + 2FA) |

### 2.2 Dashboard Routes (Auth-Protected)

| Route | Description |
|-------|-------------|
| `/dashboard/` | Overview — next appointment, today's bookings, stats, recent feedback |
| `/dashboard/calendar/` | 7-day calendar with drag-drop, staff filter, booking management |
| `/dashboard/calendar/settings/` | Google/Microsoft Calendar connect/disconnect |
| `/dashboard/customers/` | Customer list, appointments, waitlist, invoices tabs |
| `/dashboard/customers/crm/` | CRM profiles, lapsed detection, nudge history |
| `/dashboard/feedback/` | Feedback inbox — ratings, sentiment, AI reply generator |
| `/dashboard/analytics/` | Review funnel analytics, conversion rates, AI insights |
| `/dashboard/analytics/booking/` | Booking analytics |
| `/dashboard/settings/` | Business settings — name, type, timezone, logo, Google review link, password |
| `/dashboard/settings/booking/` | Booking config — advance days, buffer, cancellation hours, currency, confirmations |
| `/dashboard/team/` | Staff management — add/edit, service assignments, invites |
| `/dashboard/invoices/` | Invoice management (Israel: Heshbonit/Kabala, CSV export) |
| `/dashboard/upgrade/` | Subscription upgrade |
| `/dashboard/waitlist/` | Waitlist management |
| `/dashboard/switch/` | Switch between owned businesses |

---

## 3. Booking System

### 3.1 Customer Booking Flow (`/book/[slug]`)

The booking page is a fully client-side multi-step wizard. All data loaded via `/api/booking/[slug]/` (public, anon).

**Steps:**
1. **Service selection** — lists all active services with name (EN/HE), duration, price
2. **Staff selection** — lists active staff for the selected service (or "any staff")
3. **Date/time selection** — 30-day calendar; slots computed server-side from:
   - `business_hours` — operating hours per day
   - `staff_hours` — per-staff overrides
   - `blocked_times` — one-off closures
   - Existing `bookings` — avoids double-booking
   - `booking_buffer_minutes` — gap between appointments
4. **Customer details** — name, phone (E.164), optional notes, marketing consent
5. **Confirmation** — booking confirmed, confirmation SMS/WhatsApp/email sent

**Returning customer detection:** On phone entry, fires `POST /api/check-returning-customer` — if customer profile exists, pre-fills name.

**Rate limiting (Upstash Redis):**
- Per IP: max 5 bookings per hour
- Per phone: max 3 bookings per 24h
- Global: configurable

**On successful booking creation (`POST /api/booking/[slug]/create`):**
1. Insert `bookings` row
2. Upsert `customer_profiles` row
3. `after()` — fire calendar sync (Google + Microsoft, with 1 retry + 2s delay)
4. `after()` — send confirmation SMS (Twilio) or WhatsApp (Twilio template)
5. `after()` — send confirmation email (Resend) to business owner
6. `after()` — send customer confirmation email if email provided

**Cancellation token:** Each booking gets a `cancellation_token` (UUID) stored at creation. Used in `/manage/[token]` links embedded in confirmation SMS.

### 3.2 Manage Page (`/manage/[token]`)

Customer-facing booking management. Server component — fetches booking by `cancellation_token`.

| Booking Status | Page Shows |
|----------------|-----------|
| `confirmed` | Reschedule + Cancel buttons (with ManageClient) |
| `cancelled` | "This appointment has already been cancelled" (EN + HE) |
| `completed` / `no_show` | "Leave a review" CTA → `/r/[booking_id]` |
| Not found | "This link is no longer valid" (EN + HE) |

**Reschedule flow:** Customer picks new date/time → `POST /api/booking/reschedule` → updates booking → deletes old calendar event → creates new calendar event → sends reschedule SMS.

**Cancel flow:** `POST /api/booking/cancel/[token]` → marks `status = cancelled` → deletes calendar event → sends cancellation SMS.

### 3.3 Availability Calculation

`GET /api/booking/[slug]/availability?date=&service_id=&staff_id=`

Algorithm:
1. Load business hours for the requested day
2. Load staff hours for that day (override business hours if set)
3. Load all `blocked_times` overlapping the day
4. Load all confirmed bookings for that day + staff
5. Generate 30-minute slots across the working day
6. Filter out slots that overlap with: existing bookings (+ buffer), blocked times, outside working hours
7. Return available slots array

**Timezone handling:** All stored times are UTC. Slots converted to `booking_timezone` for display. iCal feed provided at `/api/booking/[slug]/calendar.ics`.

### 3.4 Waitlist

When no slots are available, customers can join the waitlist via `POST /api/booking/[slug]/waitlist`. Cron job (`/api/cron/waitlist-check`) runs daily and notifies waiting customers when slots open.

---

## 4. Calendar Sync

### 4.1 Architecture

Calendar sync uses extracted library functions — **not** self-referential HTTP calls — to guarantee execution inside Vercel's serverless lifecycle via `after()`.

**Key files:**
- `lib/google-calendar-sync.ts` — `syncBookingToGoogle()`, `removeBookingFromGoogle()`, `getValidGoogleAccessToken()`
- `lib/microsoft-calendar-sync.ts` — `syncBookingToMicrosoft()`, `removeBookingFromMicrosoft()`, `getValidMicrosoftAccessToken()`

### 4.2 Sync Triggers

| Action | Calendar Effect |
|--------|----------------|
| Booking created | Create event on Google + Microsoft |
| Booking rescheduled | Delete old event → create new event |
| Booking cancelled | Delete event |

All syncs use `after()` from `next/server` to run post-response. Each sync is retried once after 2 seconds on failure. On second failure, a Telegram alert is sent to ops.

### 4.3 Token Management

OAuth tokens are encrypted at rest using `CALENDAR_TOKEN_SECRET` (AES-GCM). On each sync:
1. Check token expiry
2. If expired: refresh using stored `refresh_token`
3. If refresh fails: mark `is_active = false` in `calendar_connections`, fire `logCalendarDisconnect()` (Telegram alert + sets `is_active = false`)
4. If refresh succeeds: store new `access_token` + `token_expires_at`

### 4.4 Google Calendar Webhook

Google Calendar sends push notifications to `POST /api/calendar/google/webhook` when events are changed externally. This allows Vomni to detect manual changes made in Google Calendar and update booking status accordingly.

### 4.5 Manual Sync

`POST /api/calendar/google/sync` and `POST /api/calendar/microsoft/sync` — thin HTTP wrappers around the lib functions. Used for manual backfill and the dashboard "Sync now" button.

---

## 5. Messaging System

### 5.1 SMS (Twilio)

**Country routing:**
- Israel (`+972`): uses IL Twilio number
- UK (`+44`): uses UK Twilio number
- Other: falls back to IL number

**Message types:**

| Type | Trigger | Content |
|------|---------|---------|
| Booking confirmation | On create | Appointment details + manage link |
| Appointment reminder | Cron (24h before) | Reminder + manage link |
| Review request | Cron (1.5–2.5h post-appointment) | Link to `/r/[booking_id]` |
| Cancellation | On cancel | Cancellation confirmation |
| Reschedule | On reschedule | New appointment details |
| Nudge (pattern) | Cron — customer due for return visit | "We haven't seen you lately" |
| Nudge (lapsed) | Cron — significantly overdue | Lapsed re-engagement |
| No-show recovery | Cron (next day) | Rebook link |
| Waitlist notification | Cron — slot available | Slot available + booking link |

**Rate limiting:** `sms_sent_this_period` tracked per business, resets on `billing_anchor_day` each month. Limit by plan. Alert sent at threshold.

**Opt-out handling:** Twilio webhook `POST /api/webhooks/twilio-stop` — records opt-out in `customer_profiles.opted_out = true`. All subsequent sends skipped for opted-out numbers.

### 5.2 WhatsApp (Twilio Business API)

Sent via approved Twilio WhatsApp templates. Requires `whatsapp_opt_in = true` on the customer profile. Templates:
- `confirmation` — booking confirmed
- `reminder` — 24h reminder
- `review_request` — post-appointment review link
- `nudge_pattern` — return visit nudge
- `nudge_lapsed` — lapsed customer

Inbound WhatsApp messages handled at `POST /api/webhooks/twilio-whatsapp`.

### 5.3 Email (Resend)

**From:** `Vomni <hello@mail.vomni.io>`
**Reply-to:** `hello@vomni.io`

| Email Type | Recipient | Trigger |
|-----------|-----------|---------|
| New booking notification | Business owner | On booking create |
| Customer booking confirmation | Customer (if email provided) | On booking create |
| 24h reminder | Customer (if email provided) | Cron |
| Review request | Customer (if email provided) | Cron |
| SMS limit reached | Business owner | On SMS limit hit |
| Weekly insights report | Business owner | Monday 8am cron |
| Feedback received | Business owner | Supabase DB webhook on `feedback` insert |

---

## 6. Review System

### 6.1 Overview

Two review collection flows exist. Both are compliant with FTC and Google guidelines — the Google review button is always visible to all customers regardless of star rating (no review gating).

### 6.2 Flow 1 — Post-Appointment Review (`/r/[booking_id]`)

**Entry points:**
- Post-appointment SMS (sent by cron 1.5–2.5h after appointment completes)
- `/manage/[token]` page when booking status is `completed` or `no_show`

**One-use enforcement:** On load, `GET /api/r/[booking_id]` checks `review_status`. If already in a completed state (`form_submitted`, `redirected_to_google`, `reviewed_negative`, `reviewed_positive`, `private_feedback_from_positive`, `redirected`, `private_feedback`), returns `{ alreadyUsed: true }` and shows the already-used screen.

**Screen flow:**

```
loading → rating → google (4-5★) ──────────────────────────── [customer leaves for Google]
                              └── "send private message" ──→ private_from_positive → done
               → private (1-3★) ──────────────────────────── done
```

**API calls per screen:**

| Action | Endpoint | Writes |
|--------|----------|--------|
| Page load | `GET /api/r/[booking_id]` | `bookings.review_status = form_opened`, `form_opened_at` |
| Submit rating | `POST /api/r/[booking_id]` | `bookings.rating`, `bookings.review_status = form_submitted`, `bookings.rating_submitted_at`; insert `feedback` row |
| Click Google button | `PATCH /api/r/[booking_id]` (fire-and-forget) | `bookings.review_status = redirected_to_google`, `bookings.redirected_at`; `businesses.weekly_google_redirects += 1`; insert notification |
| Submit private feedback (1-3★) | `PUT /api/r/[booking_id]` | update `feedback.feedback_text`; `bookings.review_status = reviewed_negative`; push notification |
| Submit private feedback (4-5★ chose private) | `PUT /api/r/[booking_id]` with `is_from_positive: true` | update `feedback.feedback_text`; `bookings.review_status = private_feedback_from_positive` |

**Velocity capping:** `weekly_redirect_cap` on the `businesses` table. When `weekly_google_redirects < weekly_redirect_cap` (or no cap set): Google button is primary CTA (full green). When at/over cap: both Google and private options shown at equal prominence (outline buttons).

### 6.3 Flow 2 — Manual Review Invite (`/review-invite/[business_id]`)

**Entry points:**
- Dashboard "Request a Review" button → generates URL
- QR code (static, placed in-store)
- URL param `?name=John` pre-fills name and skips name/phone screen

**No one-use enforcement** — reusable link by design.

**Screen flow:**

```
name_phone (if no ?name= param) → rating → google (4-5★) → [customer leaves for Google]
                                                          └── "send private message" → private → done
                                        → private (1-3★) ──────────────────────────────────→ done
```

**API calls:**

| Action | Endpoint | Writes |
|--------|----------|--------|
| Submit rating | `POST /api/feedback` | Insert `feedback` row: `business_id`, `rating`, `customer_name`, `customer_phone` |
| Click Google button | `PATCH /api/feedback` (fire-and-forget) | `businesses.weekly_google_redirects += 1`; insert notification |
| Submit private feedback | `POST /api/feedback` | Insert `feedback` row with `feedback_text` |

### 6.4 Copy Matrix (Both Flows)

| Screen | Rating Path | Heading | Subtext |
|--------|-------------|---------|---------|
| `rating` | All | "How was your visit, [name]?" | "Tap the stars to rate your experience" |
| `google` | 4-5★ | "Thank you, [name]! 🙏" | "We are so glad you had a great experience." |
| `private` | 1-3★ | "I'd like to personally make this right." | "Your message goes directly to my personal inbox. I aim to resolve all concerns within 24 business hours." |
| `private_from_positive` | 4-5★ chose private | "We'd love to hear more! 😊" | "Your feedback goes directly to [owner]. Every word helps us keep doing what we love." |

### 6.5 Google Review Link Normalisation

`google_review_link` is normalised at two independent points:
1. **Settings save** — before writing to DB, `https://` is prepended if no protocol present
2. **Render time** — `safeGoogleLink` computed from prop before any `<a>` renders, same normalisation applied as runtime safeguard

---

## 7. Feedback & AI System

### 7.1 Feedback Inbox (`/dashboard/feedback/`)

Displays all `feedback` rows for the business. Each row shows:
- Star rating (1-5)
- Customer name
- Feedback text
- Sentiment topic (wait_time | quality | staff | price | cleanliness | other)
- Sentiment intensity
- Urgency badge
- Status (new | in_progress | resolved)
- AI-generated reply (if generated)

### 7.2 AI Reply Generation

`POST /api/ai/feedback-reply` — Takes `feedback_text` + `business_name` + `owner_name`.

Returns three reply variants in different tones:
- **Professional** — formal, apologetic / grateful
- **Friendly** — warm, personal
- **Concise** — short, direct

Business owner selects a tone and copies the reply to use externally.

### 7.3 AI Sentiment Analysis

`POST /api/ai/sentiment` — Analyses feedback text, returns:
- `sentiment_topic` — categorised topic
- `sentiment_intensity` — severity level
- `sentiment_urgency` — how quickly to respond

Runs automatically on new feedback submissions (DB webhook trigger).

### 7.4 AI Insights

`POST /api/ai/insights` — Analyses batch of recent bookings + feedback. Returns natural-language insights (e.g. "Your busiest day is Saturday", "3 customers mentioned wait times this week"). Cached in `businesses.ai_insights_cache` with TTL.

`POST /api/ai/recovery` — Generates personalised no-show recovery SMS message.

---

## 8. CRM System

### 8.1 Customer Profiles

Customer profiles are built and maintained by the cron job `POST /api/cron/sync-customer-profiles` (daily 3am). Profiles are keyed by `phone_fingerprint` (normalised E.164) to deduplicate across bookings.

Each profile tracks:
- `total_visits`, `first_visit_at`, `last_visit_at`
- `avg_days_between_visits` — calculated from booking history
- `predicted_next_visit_at` — `last_visit_at + avg_days_between_visits`
- `is_lapsed` — true when overdue by 2× average interval
- `nudge_count`, `nudge_sent_at` — anti-spam for nudge campaigns

### 8.2 Nudge Campaigns (Cron)

`POST /api/cron/crm-nudges` runs daily at 10am.

**Pattern nudge:** Customer has visited 2+ times with a consistent interval and their predicted next visit date has passed.

**Lapsed nudge:** Customer is significantly overdue (> 2× average interval). Sent less frequently than pattern nudges.

Both check: `opted_out = false`, last nudge > X days ago, no active booking already exists.

Nudges sent via SMS (IL/UK routing) or WhatsApp (if `whatsapp_opt_in = true`). Recorded in `crm_nudges` table with `converted` tracking.

### 8.3 Manual Outreach

From the CRM page, business owners can:
- Send a one-off nudge to any customer
- Send a review request
- Bulk send review requests to all customers who haven't left a review
- View full visit history per customer

---

## 9. Analytics

### 9.1 Review Funnel Analytics (`/dashboard/analytics/`)

Tracks the conversion funnel from form sent → rating submitted → Google redirect:

| Metric | Source |
|--------|--------|
| Forms sent | Count `review_status != null` |
| Forms opened | Count `review_status = form_opened` or later |
| Ratings submitted | Count `review_status = form_submitted` or later |
| Google redirects | Count `review_status = redirected_to_google` + `businesses.weekly_google_redirects` |
| Private feedback | Count `review_status = reviewed_negative or private_feedback_from_positive` |
| Average rating | Avg `bookings.rating` where rated |

Displayed as donut charts + conversion percentages.

### 9.2 Booking Analytics (`/dashboard/analytics/booking/`)

- Bookings per day/week/month
- Revenue tracking
- Service popularity
- Staff utilisation
- No-show rate
- Cancellation rate

### 9.3 Google Rating Tracking

Stored on `businesses`:
- `initial_google_rating` — rating at signup
- `current_google_rating` — latest known rating
- `initial_review_count` — count at signup
- `google_review_count` — current count
- Delta shown in analytics as "lift since joining Vomni"

---

## 10. Invoicing (Israel)

Available only when `booking_timezone = "Asia/Jerusalem"` (Israel market).

### 10.1 Document Types

| Type | Hebrew | Use |
|------|--------|-----|
| `heshbonit_mas` | חשבונית מס | VAT invoice (Osek Murshe only) |
| `kabala` | קבלה | Receipt (Osek Patur) |

### 10.2 Fields

- Invoice number (auto-incrementing per business)
- Customer name + phone
- Service description
- Subtotal, VAT (17%), total
- Payment method (cash, credit, Bit, Paybox)
- PDF generated and stored in Supabase Storage

### 10.3 Legal Config

Businesses set `osek_type` (Patur/Murshe) and `osek_murshe_number` in Settings. These appear on the invoice PDF. `business_legal_name` used for official name.

---

## 11. Team Management

### 11.1 Staff

Each `staff` record has:
- Name + Hebrew name
- Role (free text, e.g. "Stylist")
- Avatar (uploaded to Supabase Storage)
- Bio (EN + HE)
- Active status
- Display order (drag-to-reorder in dashboard)

### 11.2 Staff–Service Assignments

Many-to-many via `staff_services`. The booking page only shows staff who are assigned to the selected service.

### 11.3 Staff Hours

Staff can have hours different from the business. `staff_hours` overrides `business_hours` per day. This allows part-time staff with non-standard schedules.

### 11.4 Invitations

Business owners can invite staff via email (`POST /api/staff/invite`). Staff receive an invite link with a one-time token. On accepting, they're linked to the business.

---

## 12. Subscription & Billing

### 12.1 Plans

| Plan | Status |
|------|--------|
| `trial` | Default on signup, time-limited |
| `starter` | Entry paid plan |
| `growth` | Mid-tier |
| `pro` | Full features |

Trial expiry cron (`/api/cron/downgrade-expired-trials`) runs daily and marks expired trials.

### 12.2 LemonSqueezy Integration

Checkout initiated via `/api/upgrade` → redirect to LemonSqueezy hosted checkout.

Webhook `POST /api/webhooks/lemonsqueezy` (HMAC-verified) handles:
- `order_created` — one-time purchase
- `subscription_created` — new recurring subscription
- `subscription_updated` — plan change, renewal
- `subscription_cancelled` — cancellation
- `subscription_expired` — lapsed payment

On each event: updates `businesses.plan`, `subscription_status`, `lemon_customer_id`, `lemon_subscription_id`.

### 12.3 SMS Limits

Each plan has an `sms_limit` per billing period. `sms_sent_this_period` is tracked per business and reset on `billing_anchor_day`. When limit is reached, owner receives email alert and SMS sends are blocked.

---

## 13. Notifications System

In-app notification bell on the dashboard, with unread count badge.

### 13.1 Notification Types

| Type | Trigger | Description |
|------|---------|-------------|
| `negative_review` | Feedback submitted with 1-3★ | Customer left low rating |
| `low_rating` | Feedback submitted with 1-2★ | Urgent — very low rating |
| `feedback` | Any feedback received | General feedback notification |
| `complaint` | AI sentiment detects complaint | Urgent complaint flagged |
| `no_show` | Booking marked no_show | Customer did not attend |
| `new_booking` | Booking created | New appointment confirmed |
| `nudge_converted` | Nudge resulted in booking | Re-engagement campaign success |
| `google_redirect` | Customer clicked Google review button | Sent to Google review page |

Notifications deduplicated within 24h per customer per type.

---

## 14. Admin Portal (`/admin/`)

Password + TOTP 2FA protected. Separate auth stack from Supabase.

### 14.1 Capabilities

- **Business management** — view all businesses, impersonate, edit settings
- **Hard delete** — remove business + all related data (irreversible)
- **Raw DB access** — read any table via `/api/admin/db/[table]`
- **Ad-hoc SMS** — send manual SMS to any phone
- **System monitoring** — `/api/admin/radar` real-time system health
- **AI agent dashboard** — view agent conversations and leads
- **Support queue** — `/api/admin/support`
- **Rating override** — manually update review status on any booking
- **Data migration** — backfill tools (phone fingerprints, etc.)

---

## 15. Database Schema — Full Reference

### Core Tables

#### `businesses`
Central multi-tenant table. Every other table has `business_id FK` pointing here.

Key columns: `id`, `name`, `owner_name`, `owner_email`, `plan`, `subscription_status`, `booking_slug`, `booking_enabled`, `booking_timezone`, `booking_currency`, `booking_buffer_minutes`, `booking_advance_days`, `google_review_link`, `logo_url`, `weekly_google_redirects`, `weekly_redirect_cap`, `sms_sent_this_period`, `sms_limit`, `ai_insights_cache`, `osek_type`, `osek_murshe_number`, `business_legal_name`

#### `services`
`id`, `business_id`, `name`, `name_he`, `duration_minutes`, `price`, `currency`, `is_active`, `display_order`

#### `staff`
`id`, `business_id`, `name`, `name_he`, `email`, `phone`, `role`, `avatar_url`, `bio`, `bio_he`, `is_active`, `display_order`

#### `staff_services`
`staff_id`, `service_id` — many-to-many join

#### `business_hours`
`id`, `business_id`, `day_of_week` (0=Sun–6=Sat), `is_open`, `open_time`, `close_time`

#### `staff_hours`
`id`, `staff_id`, `business_id`, `day_of_week`, `is_working`, `start_time`, `end_time`

#### `blocked_times`
`id`, `business_id`, `staff_id` (nullable = whole business), `start_at`, `end_at`, `reason`

#### `bookings`
`id`, `business_id`, `staff_id`, `service_id`, `customer_name`, `customer_phone`, `customer_phone_encrypted`, `customer_email`, `appointment_at`, `status` (confirmed | cancelled | completed | no_show), `cancellation_token`, `review_status`, `rating`, `google_event_id`, `microsoft_event_id`, `is_recurring`, `recurring_group_id`, `booking_source`, `sms_sent_at`, `reminder_sent_at`, `form_opened_at`, `rating_submitted_at`, `redirected_at`, `pii_cleaned`, `pii_cleaned_at`

**`review_status` states:** `pending` → `form_sent` → `form_opened` → `form_submitted` → `redirected_to_google` | `reviewed_negative` | `reviewed_positive` | `private_feedback_from_positive`

#### `feedback`
`id`, `booking_id` (nullable), `business_id`, `rating`, `feedback_text`, `status` (new | in_progress | resolved), `source`, `ai_reply`, `sentiment_topic`, `sentiment_intensity`, `sentiment_urgency`, `customer_name`, `customer_phone`, `created_at`

#### `customer_profiles`
`id`, `business_id`, `phone`, `phone_encrypted`, `phone_fingerprint`, `name`, `email`, `total_visits`, `first_visit_at`, `last_visit_at`, `avg_days_between_visits`, `predicted_next_visit_at`, `is_lapsed`, `nudge_count`, `nudge_sent_at`, `opted_out`, `marketing_consent`, `whatsapp_opt_in`, `has_left_review`

#### `calendar_connections`
`id`, `business_id`, `provider` (google | microsoft), `is_active`, `access_token` (encrypted), `refresh_token` (encrypted), `token_expires_at`, `calendar_id`, `sync_enabled`

#### `notifications`
`id`, `business_id`, `type`, `title`, `body`, `link`, `read`, `created_at`

#### `invoices`
`id`, `business_id`, `invoice_number`, `document_type`, `issued_at`, `customer_name`, `customer_phone`, `service_description`, `subtotal`, `vat_amount`, `total`, `payment_method`, `pdf_storage_path`

#### `waitlist`
`id`, `business_id`, `customer_name`, `customer_phone`, `requested_date`, `service_id`, `status`, `position`, `notified_at`

#### `crm_nudges`
`id`, `business_id`, `customer_phone`, `nudge_type` (pattern | lapsed), `message_sid`, `converted`, `converted_booking_id`, `sent_at`

#### `sms_log`, `email_log`, `whatsapp_log`
Delivery tracking tables per channel. Keyed to `booking_id` / `customer_profile_id`. Track `status`, `message_sid`, error messages.

#### `staff_invites`
`id`, `staff_id`, `business_id`, `email`, `status` (pending | accepted), `invite_token`, `accepted_at`, `expires_at`

#### `review_invites`
`id`, `business_id`, `booking_id`, `sent_at`, `clicked_at` — tracks manual review request link send + click events

---

## 16. Security

### 16.1 Data Isolation
- Every table has `business_id FK` with RLS policies enforcing tenant isolation
- `supabaseAdmin` (service role) bypasses RLS — only used in server-side API routes, never in client code

### 16.2 Phone Number Encryption
- Customer phone numbers stored in two forms:
  - `customer_phone_encrypted` — AES-256-GCM encrypted E.164 format (stored in DB)
  - `phone_fingerprint` — consistent hash used for deduplication across bookings without exposing the number
- Display masked in dashboard (e.g. `+44 *** *** 1234`)

### 16.3 PII Cleanup
- Cron `POST /api/cron/cleanup-pii` runs daily
- After retention period (90 days post-appointment), `customer_phone_encrypted` and `customer_email` are nulled
- `pii_cleaned = true` and `pii_cleaned_at` set on the booking

### 16.4 Rate Limiting
- Upstash Redis used for all customer-facing rate limiting
- Booking creation: per-IP (5/hour) and per-phone (3/24h)
- Internal API warnings: `/api/internal/system-warn` rate-limited

### 16.5 Webhook Verification
- LemonSqueezy webhooks verified via HMAC-SHA256 signature (`LEMONSQUEEZY_WEBHOOK_SECRET`)
- Supabase webhooks verified via `SUPABASE_WEBHOOK_SECRET`
- Cron endpoints protected by `CRON_SECRET` Bearer token

### 16.6 Admin Security
- Admin portal requires bcrypt password + TOTP 2FA
- Session is httpOnly cookie (8h TTL)
- Admin routes not accessible via normal Supabase auth

---

## 17. Cron Jobs Reference

All cron endpoints protected by `Authorization: Bearer CRON_SECRET` header.

| Cron | Schedule | Purpose |
|------|----------|---------|
| `/api/cron/appointment-reminders` | Hourly | Send 24h SMS/WhatsApp/email reminders |
| `/api/cron/review-requests` | Daily 6pm | Send post-appointment review SMS (1.5–2.5h after appt) |
| `/api/cron/crm-nudges` | Daily 10am | Pattern + lapsed customer nudges |
| `/api/cron/no-show-rebooking` | Daily 12pm | No-show recovery SMS |
| `/api/cron/auto-complete-appointments` | Daily 2am | Auto-mark past confirmed bookings as completed |
| `/api/cron/sync-customer-profiles` | Daily 3am | Rebuild customer_profiles from bookings |
| `/api/cron/waitlist-check` | Daily 9am | Notify waitlist when slot opens |
| `/api/cron/update-velocity` | Daily 4am | Recalculate booking velocity |
| `/api/cron/reset-sms-counters` | Daily midnight | Reset `sms_sent_this_period` on billing anchor day |
| `/api/cron/downgrade-expired-trials` | Daily 6am | Mark expired trials |
| `/api/cron/cleanup-data` | Daily 5am | Archive old data |
| `/api/cron/cleanup-pii` | Daily 7am | Delete PII after 90-day retention |
| `/api/cron/weekly-report` | Monday 8am | Send weekly insights email to owners |

---

## 18. Embeddable Widget

`/widget/[business_id]` — A stripped-down version of the booking page designed for iframe embedding on third-party websites. Accepts the same booking flow as the full `/book/[slug]` page but with minimal chrome and no navigation.

---

## 19. Internationalisation

| Element | Implementation |
|---------|---------------|
| Language detection | Cloudflare `cf-ipcountry` header — IL → Hebrew, else English |
| `/he` route | Entry point for Hebrew locale |
| Bilingual DB fields | `name` / `name_he`, `description` / `description_he`, `bio` / `bio_he` on services and staff |
| Bilingual copy | Static strings in UI components have EN + HE variants |
| Currency | `booking_currency` per business (ILS / GBP / USD) |
| Timezone | `booking_timezone` per business (IANA string) |
| Invoice locale | Hebrew legal copy on invoices for Israel market |
| Cancellation copy | EN + HE on manage page |

---

## 20. Known Limitations & Technical Debt

| Item | Description | Risk |
|------|-------------|------|
| No velocity cap on Flow 2 | Manual review-invite always shows primary Google CTA regardless of `weekly_redirect_cap` | Low — cap is advisory |
| Flow 2 double-inserts feedback | Rating submit and private feedback submit are separate `POST /api/feedback` calls — creates two rows | Low — doesn't break anything |
| No one-use enforcement on Flow 2 | `/review-invite/` can be submitted multiple times by the same customer | Low — by design for QR codes |
| `google_review_link` not validated | Free text field normalised to https:// but not checked against Google domain | Medium — bad URLs silently accepted |
| `microsoft_event_id` column | Referenced in sync code but may not exist in all DB environments — sync falls back gracefully | Low |
| Cron timing on Vercel Hobby | Vercel Hobby plan limits cron frequency; production uses Pro for true hourly crons | Infra — resolved on Pro plan |
| AI API key not populated | `ANTHROPIC_API_KEY` is empty in current `.env.local` — AI features will fail silently | Medium if AI features in use |
