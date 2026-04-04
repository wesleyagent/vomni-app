# Vomni — Full Technical Specification
**Version**: 1.0
**Branch**: `booking-platform`
**Last Updated**: April 2026
**Stack**: Next.js 15 (App Router) · TypeScript · Supabase · Vercel

---

## 1. Product Overview

Vomni is a multi-tenant SaaS platform for service businesses (salons, clinics, studios, etc.) with two core product pillars:

1. **Reputation Management** — Automated post-appointment review requests via SMS, feedback inbox, smart Google redirect (4★+ → Google, 1–3★ → private inbox)
2. **Booking System** — Native online booking page, calendar management, staff scheduling, and Google Calendar sync

The two pillars are unified: bookings automatically trigger review requests 24 hours after each appointment, eliminating the need for third-party automation tools.

**Target markets**: Israeli and UK service businesses. Full Hebrew/English bilingual support throughout.

---

## 2. Infrastructure & Architecture

### Hosting
- **Platform**: Vercel (serverless, App Router)
- **Team**: `wesleyagents-projects`
- **Production branch**: `main` → `vomni.io`
- **Staging branch**: `booking-platform` → `vomni-app-git-booking-platform-wesleyagents-projects.vercel.app`
- **Deployment method**: `vercel deploy` + `vercel alias set` (manual, GitHub webhook unreliable on staging)

### Database
- **Provider**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (email/password, magic link)
- **Two Supabase clients**:
  - `db` — anon key, subject to Row Level Security (RLS). Used for authenticated dashboard reads.
  - `supabaseAdmin` — service role key, bypasses RLS. Used in all API route writes, cron jobs, admin operations.

### Authentication
| Layer | Method |
|-------|--------|
| Business users | Supabase Auth (JWT Bearer token) |
| Admin portal | Password + TOTP 2FA (RFC 6238) + httpOnly session cookie (8h TTL) |

### Design System
- **Inline styles throughout** (no Tailwind classes)
- **Green**: `#00C896` (primary accent)
- **Navy**: `#0A0F1E` (headings, primary text)
- **Background**: `#F7F8FA`
- **Border**: `#E5E7EB`
- **Fonts**: `Bricolage Grotesque` (headlines) · `Inter` (body)
- **Radius**: 16px cards, 9999px pills
- **Shadows**: `0 2px 8px rgba(0,0,0,0.06)` standard

---

## 3. Database Schema

### 3.1 Core Tables

#### `businesses`
Multi-tenant root table. One row per registered business.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| name | text | Business display name |
| owner_name | text | |
| owner_email | text | Unique. Used as RLS identity. |
| phone | text | |
| plan | text | `trial` / `starter` / `growth` / `pro` |
| subscription_status | text | `active` / `cancelled` / `past_due` |
| lemon_customer_id | text | Lemon Squeezy customer ID |
| lemon_subscription_id | text | |
| subscription_period | text | `monthly` / `yearly` |
| billing_anchor_day | int | Day of month billing resets |
| google_review_link | text | Full Google Maps review URL |
| booking_slug | text | Unique URL slug for public booking page |
| booking_enabled | bool | Must be true for public booking page to work |
| booking_buffer_minutes | int | Buffer between appointments |
| booking_advance_days | int | How far ahead customers can book |
| booking_cancellation_hours | int | Minimum hours for cancellation |
| booking_confirmation_message | text | Custom EN confirmation |
| booking_confirmation_message_he | text | Custom HE confirmation |
| booking_currency | text | `ILS` / `GBP` / `USD` |
| booking_timezone | text | e.g. `Asia/Jerusalem` |
| require_phone | bool | |
| require_email | bool | |
| logo_url | text | Public Supabase storage URL |
| onboarding_step | int | |
| onboarding_gdpr_accepted | bool | |
| sms_sent_this_period | int | Resets monthly |
| sms_limit | int | Based on plan |
| created_at | timestamptz | |

#### `services`
Appointment types offered by a business.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| business_id | uuid FK → businesses | |
| name | text | EN name |
| name_he | text | HE name |
| duration_minutes | int | |
| price | numeric | |
| currency | text | |
| description | text | |
| is_active | bool | |
| display_order | int | Drag-to-reorder |

#### `staff`
Team members for a business.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| business_id | uuid FK → businesses | |
| name | text | EN name |
| name_he | text | HE name |
| email | text | |
| role | text | |
| avatar_url | text | |
| bio | text | EN bio |
| bio_he | text | HE bio |
| is_active | bool | |
| display_order | int | |

#### `staff_services`
Many-to-many: which staff members offer which services.

| Column | Type |
|--------|------|
| staff_id | uuid FK → staff |
| service_id | uuid FK → services |

#### `business_hours`
Operating hours per day of week per business.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| business_id | uuid FK → businesses | |
| day_of_week | int | 0=Sunday … 6=Saturday |
| open_time | text | `HH:MM` |
| close_time | text | `HH:MM` |
| is_open | bool | |

#### `staff_hours`
Per-staff overrides of business hours.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| staff_id | uuid FK → staff | |
| business_id | uuid FK → businesses | |
| day_of_week | int | |
| open_time | text | |
| close_time | text | |
| is_working | bool | |

#### `blocked_times`
One-off closures or staff unavailability.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| business_id | uuid FK → businesses | |
| staff_id | uuid FK → staff | Null = whole business |
| start_at | timestamptz | |
| end_at | timestamptz | |
| reason | text | |

---

### 3.2 Booking Tables

#### `bookings`
Central appointments table.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| business_id | uuid FK → businesses | |
| staff_id | uuid FK → staff | |
| service_id | uuid FK → services | |
| service_name | text | Snapshot at booking time |
| service_duration_minutes | int | Snapshot |
| service_price | numeric | Snapshot |
| customer_name | text | |
| customer_phone | text | E.164 format |
| customer_email | text | |
| appointment_at | timestamptz | UTC |
| status | text | `confirmed` / `completed` / `no_show` / `cancelled` |
| booking_source | text | `vomni` / `manual` / `import` |
| cancellation_token | uuid | Secret token for self-cancellation link |
| cancellation_reason | text | |
| cancelled_at | timestamptz | |
| notes | text | Customer-supplied |
| internal_notes | text | Staff-only |
| reminder_sent | bool | |
| reminder_sent_at | timestamptz | |
| confirmation_sent | bool | |
| sms_status | text | `pending` / `sent` / `failed` / `suppressed` |
| rating_submitted_at | timestamptz | When customer rated (post-appointment) |
| redirected_at | timestamptz | When customer was redirected to Google |
| reviewed_at | timestamptz | When review confirmed |
| pii_cleaned | bool | |
| pii_cleaned_at | timestamptz | |
| created_at | timestamptz | |

#### `booking_waitlist`
Customers waiting for an available slot.

| Column | Type |
|--------|------|
| id | uuid PK |
| business_id | uuid FK |
| service_id | uuid FK |
| staff_id | uuid FK |
| customer_name | text |
| customer_phone | text |
| requested_date | date |
| notified_at | timestamptz |
| created_at | timestamptz |

#### `booking_audit_log`
Immutable record of all booking state changes.

| Column | Type |
|--------|------|
| id | uuid PK |
| booking_id | uuid FK |
| actor | text |
| action | text |
| previous_status | text |
| new_status | text |
| note | text |
| created_at | timestamptz |

#### `calendar_connections`
OAuth tokens for calendar integrations.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| business_id | uuid FK | |
| provider | text | `google` / `outlook` |
| access_token | text | AES-256-GCM encrypted |
| refresh_token | text | AES-256-GCM encrypted |
| token_expires_at | timestamptz | |
| calendar_id | text | Primary calendar email |
| is_active | bool | |
| webhook_channel_id | text | Google push notification channel |
| webhook_resource_id | text | |
| webhook_expires_at | timestamptz | |
| updated_at | timestamptz | |

---

### 3.3 Feedback & Communication Tables

#### `feedback`
Customer reviews and complaints.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| business_id | uuid FK | |
| booking_id | uuid FK | |
| customer_name | text | |
| rating | int | 1–5 |
| feedback_text | text | |
| status | text | `new` / `in_progress` / `resolved` |
| ai_reply | text | Claude-generated suggested reply |
| sentiment_topic | text | AI-classified topic |
| urgency | text | `low` / `medium` / `high` |
| source | text | `vomni_native` |
| updated_at | timestamptz | |

#### `chat_conversations`
Support chat sessions.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| business_id | uuid FK | |
| session_id | text | Client-generated UUID |
| messages | jsonb | Array of `{role, content, timestamp}` |
| status | text | `active` / `needs_human` / `resolved` |
| visitor_name | text | Extracted by AI |
| visitor_email | text | Extracted by AI |
| created_at | timestamptz | |

#### `email_log`
All email send attempts (reliability tracking).

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| business_id | uuid FK | |
| booking_id | uuid FK | |
| email_type | text | e.g. `booking_customer_confirm` |
| recipient | text | |
| status | text | `pending` / `sent` / `failed` |
| resend_id | text | Resend API message ID |
| error_message | text | |
| created_at | timestamptz | |

#### `notifications`
In-app notification queue.

| Column | Type |
|--------|------|
| id | uuid PK |
| business_id | uuid FK |
| type | text |
| title | text |
| body | text |
| read | bool |
| created_at | timestamptz |

---

### 3.4 Data Privacy Tables

#### `customer_fingerprints`
Prevents repeat SMS to same customer without storing full PII.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| business_id | uuid FK | |
| fingerprint | text | SHA-256 of `{first initial}{last initial}{last 3 phone digits}` |
| created_at | timestamptz | |

#### `cleanup_log`
Audit trail for GDPR PII removal runs.

| Column | Type |
|--------|------|
| id | uuid PK |
| run_at | timestamptz |
| records_cleaned | int |
| details | jsonb |

---

### 3.5 Migration / Import Tables

#### `clients`
Customer directory populated via CSV import or manual entry.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| business_id | uuid FK | |
| name | text | |
| email | text | |
| phone | text | E.164 format |
| notes | text | |
| source | text | `manual` / `fresha` / `booksy` / etc. |
| imported_at | timestamptz | |
| last_visited_at | timestamptz | |
| total_visits | int | |
| created_at | timestamptz | |

Unique index on `(business_id, phone)` where `phone IS NOT NULL` — prevents duplicate imports.

#### `migration_imports`
History of import jobs.

| Column | Type |
|--------|------|
| id | uuid PK |
| business_id | uuid FK |
| source_platform | text |
| file_name | text |
| total_rows | int |
| imported_rows | int |
| skipped_rows | int |
| error_rows | int |
| status | text |
| created_at | timestamptz |
| completed_at | timestamptz |

---

### 3.6 CRM / Sales Tables (Internal)

#### `leads`
Business prospects in the sales pipeline.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| name | text | Business name |
| owner_name | text | |
| phone | text | |
| tier | text | `hot` / `warm` / `cold` |
| preferred_channel | text | `whatsapp` / `sms` / `email` |
| has_website | bool | |
| has_online_booking | bool | |
| booking_system | text | Current platform |
| icp_score | int | Ideal customer profile score 0–100 |
| icp_notes | text | |

#### `outreach_activities`
Log of sales outreach attempts per lead.

#### `growth_snapshots`
Weekly metric snapshots per business (for trend analytics).

---

### 3.7 Agent Memory Tables (Internal)

For the internal AI sales agent:
- `agent_memory_episodes` — Individual interaction memories
- `agent_memory_facts` — Extracted facts about leads/businesses
- `agent_memory_procedures` — Learned best practices
- `agent_memory_strategic` — High-level strategic insights
- `agent_performance_log` — KPI tracking per session

---

## 4. API Routes

### 4.1 Public Booking API

#### `GET /api/booking/[slug]`
Fetches everything needed to render the public booking page.
- Returns: business details, services[], staff[], business_hours[], is_active flag
- No auth required

#### `GET /api/booking/[slug]/availability`
Computes available time slots for a given date/service/staff combination.
- Query params: `date` (YYYY-MM-DD), `service_id`, `staff_id` (or `any`)
- Returns: `{ slots: string[] }` in HH:MM format
- Logic:
  1. Get service duration
  2. Get business hours for `day_of_week`
  3. Override with staff hours if set
  4. Query existing confirmed bookings for staff + date
  5. Query blocked_times
  6. Generate slots from open→close in `duration_minutes` increments
  7. Remove slots that overlap (booking duration + buffer minutes)
  8. Remove past slots
  9. If `staff_id=any` → aggregate across all staff, return merged available slots

#### `POST /api/booking/[slug]/create`
Creates a booking atomically.
- Rate limited: 5/hr per IP, 3/hr per phone number
- Re-checks availability before inserting (race condition protection)
- Uses Supabase RPC `create_booking_atomic()` when staff assigned
- On success:
  - Sets `sms_status=pending`, `booking_source=vomni`
  - Generates `cancellation_token`
  - Fires confirmation email to customer (async)
  - Fires notification email to business owner (async)
  - Pushes event to Google Calendar (async, non-blocking)
  - Creates audit log entry

#### `GET /api/booking/cancel/[token]`
Cancels a booking via the secret cancellation token from the confirmation SMS/email.
- No auth required (token is the auth)
- Validates token, updates status to `cancelled`, records `cancelled_at`

#### `GET /api/booking/[slug]/calendar.ics`
Returns iCalendar (.ics) feed of all confirmed bookings for a business.
- Protected by a secret token stored in `calendar_ics` table

---

### 4.2 Calendar Integration API

#### `GET /api/auth/google-calendar?business_id=xxx`
Initiates Google OAuth flow.
- Scopes: `calendar.events`, `calendar.readonly`
- Passes `business_id` through OAuth `state` parameter
- `access_type=offline`, `prompt=consent` to force refresh token issuance

#### `GET /api/auth/callback/google-calendar`
OAuth redirect handler.
- Exchanges code for tokens
- Fetches primary calendar ID
- Deletes existing connection (avoids upsert constraint issues)
- Inserts fresh `calendar_connections` record
- Registers Google push notification webhook (7-day channel)

#### `GET /api/calendar/google/status`
Returns `{ connected: boolean, email: string, error?: string }`.
- Checks `calendar_connections.is_active`
- Attempts token refresh if expired

#### `GET /api/calendar/google/events`
Fetches events from connected Google Calendar.
- Auth required
- Uses `getAccessTokenForBusiness()` with refresh logic
- Returns events for the requested date range

#### `POST /api/calendar/google/sync`
Pushes Vomni bookings to Google Calendar as events.

#### `GET /api/calendar/google/webhook`
Receives Google push notifications when calendar changes.
- Validates `X-Goog-Channel-Token` header
- Triggers incremental sync

#### `POST /api/calendar/disconnect`
Revokes OAuth tokens, sets `is_active=false`.

---

### 4.3 Business Settings API

#### `GET/POST /api/business-hours`
Read and write business operating hours.
- Uses `supabaseAdmin` to bypass RLS (required for saves to work)
- Upserts rows in `business_hours` by `(business_id, day_of_week)`

#### `GET/POST /api/business-settings`
Read and write general business settings.

#### `GET/POST /api/blocked-times`
Manage one-off blocked periods.

---

### 4.4 Migration API

#### `POST /api/migration/import-clients`
Bulk import customers from a CSV file.
- Accepts multipart form: `file`, `business_id`, `platform`, `preview` flag
- Preview mode: returns first 5 rows without writing to DB
- Full import:
  - Parses CSV using fuzzy column matching (Hebrew + English variants)
  - Normalises phone numbers to E.164 (Israeli 05X and UK 07X)
  - Deduplicates by phone (skips existing)
  - Inserts in batches of 100
  - Creates `migration_imports` record on completion
- Returns: `{ imported, skipped, errors, preview[] }`

#### `GET /api/migration/export-clients`
Exports all clients for a business as a CSV download.
- Query params: `business_id`
- Returns `Content-Disposition: attachment; filename=clients.csv`

---

### 4.5 AI API

#### `POST /api/chat`
Main chat endpoint powering the `ChatWidget`.
- Rate limited: 20/hr per IP
- Uses Anthropic Claude API (`claude-3-5-haiku`)
- System prompt is context-aware (injects business info for logged-in users)
- Parses structured signals from response: `[ESCALATE]`, `[NAME:...]`, `[EMAIL:...]`
- Saves conversation to `chat_conversations` (upsert by session_id)
- Returns: `{ message, conversationId }`

#### `POST /api/ai/sentiment`
Classifies feedback text into sentiment + topic.

#### `POST /api/ai/insights`
Generates business insights from patterns in feedback data.

#### `POST /api/ai/feedback-reply`
Generates a suggested reply to a negative review.

#### `POST /api/ai/recovery`
Generates a win-back message for a customer who gave low rating.

---

### 4.6 Cron Jobs (Vercel Scheduled)

All cron endpoints verify `Authorization: Bearer {CRON_SECRET}` header.

| Route | Schedule | Purpose |
|-------|----------|---------|
| `/api/cron/appointment-reminders` | Hourly | Find bookings 23–25h from now, `reminder_sent=false`, send SMS reminder |
| `/api/cron/cleanup-pii` | Daily | Anonymize names/phones of customers whose SMS was sent 30+ days ago |
| `/api/cron/cleanup-data` | Weekly | Delete old bookings per retention policy |
| `/api/cron/no-show-rebooking` | Daily | Send rebooking offer to no-shows |
| `/api/cron/waitlist-check` | Hourly | Check waitlist against newly available slots |
| `/api/cron/reset-sms-counters` | Daily | Reset `sms_sent_this_period` on billing anchor day |
| `/api/cron/update-velocity` | Weekly | Recalculate lead velocity metrics |
| `/api/cron/weekly-report` | Weekly (Mon 8am) | Generate and email weekly summary to business |

---

### 4.7 Payments API

#### `POST /api/lemonsqueezy/checkout`
Creates a Lemon Squeezy checkout session.
- Maps plan + period to variant ID
- Returns checkout URL

#### `POST /api/webhooks/lemonsqueezy`
Handles subscription lifecycle events.
- Verifies HMAC-SHA256 signature (`X-Signature` header)
- Events handled: `subscription_created`, `subscription_updated`, `subscription_cancelled`, `order_created`
- Updates `businesses.plan`, `subscription_status`, `billing_anchor_day`

---

### 4.8 Admin API

All admin routes verify TOTP session cookie via `requireAdmin()`.

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/admin/auth` | POST | Verify TOTP code, set session cookie |
| `/api/admin/businesses` | GET | List all businesses |
| `/api/admin/businesses/[id]` | GET | Fetch single business |
| `/api/admin/delete-business` | POST | Hard delete business + cascade |
| `/api/admin/db/[table]` | GET | Generic table browser |
| `/api/admin/send-checkin` | POST | Send check-in email |
| `/api/admin/update-rating` | POST | Manually update Google metrics |

---

## 5. Pages

### 5.1 Public Pages

#### `/book/[slug]`
Public booking flow. Server component fetches business data, passes to client `BookingFlow`.

**BookingFlow** — 4-step client component:
1. **Service selection** — Cards with name, duration, price. Green highlight on select.
2. **Staff selection** — Horizontal scroll cards with avatar/initials. Skipped if only 1 staff. "Any available" shown first.
3. **Date & time** — Month calendar (Sunday-first). Available dates highlighted. Time slot pills in 2-col grid below calendar.
4. **Details form** — Name, phone (+972 prefix for IL), email (if required), notes, reminder opt-in checkbox. Summary card. Green confirm button.

Confirmation screen: animated checkmark, booking summary, "Add to calendar" (.ics download), share button.

`DataOwnershipBadge` shown at bottom of form.

RTL support: `dir="rtl"` applied when Hebrew language selected. Language toggle top-right.

#### `/cancel/[token]`
Self-service booking cancellation. Shows booking details and one-tap cancel button.

#### `/review/[id]`
Post-appointment rating flow (1–5 stars). Smart redirect: 4–5★ → Google review link, 1–3★ → private feedback form.

#### `/switch-from/[platform]`
Static SEO marketing pages for 9 platforms: `fresha`, `booksy`, `square`, `vagaro`, `treatwell`, `calmark`, `styleseat`, `mindbody`, `other`.

Each page contains:
- Hero section with platform-specific headline
- Feature comparison table (Vomni vs competitor)
- Interactive cost calculator (sliders for appointments/month, avg price, staff count)
- 4-step migration guide with export instructions
- Message templates (EN + HE) for notifying existing clients
- Data ownership guarantee section
- Bottom CTA

Generated with `generateStaticParams` for all 9 platforms (SSG).

#### `/data-ownership`
Plain-language data ownership policy. States what Vomni will never do with customer data and what businesses always retain the right to do.

---

### 5.2 Dashboard Pages

All dashboard pages are protected by auth. Rendered within the shared `DashboardLayout` which provides:
- Left sidebar with navigation tabs
- Top header with business name, "Request Review" button, notification bell
- Review request modal (Copy Link + QR Code)
- ChatWidget in bottom-right corner

#### `/dashboard` — Overview
Stats cards: bookings today, bookings this week, no-show rate, most popular service, review count, average rating.

Next upcoming appointment banner.

#### `/dashboard/calendar`
Three views (toggle via tab pills):

**Day view** (default): Vertical timeline. Appointment blocks show customer name, service, time, status badge. Click → side panel with full details + action buttons (complete, no-show, cancel, call, WhatsApp).

**Week view**: 7-column grid (Sun–Sat). Click empty slot → manual entry modal.

**Upcoming list**: Chronological list of confirmed future appointments.

Manual appointment modal: service, staff, customer name/phone, date/time, notes.

Google Calendar warning banner shown if token is expired/invalid.

FAB (+ button) at `bottom: 90, right: 24, zIndex: 1002` — above ChatWidget.

#### `/dashboard/calendar/settings`
- Google Calendar connect/disconnect (OAuth flow)
- Booking URL display (client-side origin to avoid SSR fallback to vomni.io)
- Business hours configuration
- Booking settings: buffer time, advance days, cancellation policy, custom confirmation message

#### `/dashboard/customers`
Two sub-tabs:

**Appointments tab**: Full paginated list of all bookings. Status badges (confirmed/completed/no_show/cancelled). "Mark No-Show" action per row. Sortable columns.

**Reviews tab**: Existing review journey tracking table (previous functionality).

#### `/dashboard/feedback`
Feedback inbox. Filters by status and rating. AI-generated reply suggestions. Mark resolved.

#### `/dashboard/analytics`
Charts: bookings over time, revenue, service popularity, staff utilisation.

#### `/dashboard/analytics/booking`
Booking-specific analytics deep dive.

#### `/dashboard/settings`
General settings: business name, logo upload, Google review link.

Includes:
- "Switch to Vomni" card → `/dashboard/switch`
- "Your Data" section: client count, export CSV button, delete account option

#### `/dashboard/settings/booking`
Full booking system configuration wizard:
- Business hours (per day, open/close times, toggle)
- Services (add/edit/reorder, HE + EN names, duration, price)
- Staff (add/edit, assign services)
- Booking URL slug
- Enable/disable booking page

#### `/dashboard/team`
Staff management (add, edit, deactivate team members).

#### `/dashboard/switch`
5-step migration wizard:
1. Platform selection grid (9 platforms with coloured cards)
2. Export instructions (platform-specific steps + screenshots)
3. File upload (drag-and-drop CSV, live preview table of first 5 rows)
4. Results + post-import checklist (8 items with tick boxes, links, tooltips)
5. Celebration screen + send message templates (EN + HE with copy buttons)

#### `/dashboard/upgrade`
Plan comparison and upgrade prompt.

---

### 5.3 Admin Portal

#### `/admin`
Internal admin dashboard. TOTP-protected. Shows business list, revenue metrics, lead pipeline.

#### `/admin/businesses/[id]`
Per-business view: settings, bookings, feedback, subscription status, SMS usage.

#### `/admin/agents`
AI agent management: conversation list, lead pipeline, KPI results, copy management.

---

### 5.4 Auth Pages

| Page | Purpose |
|------|---------|
| `/login` | Email/password login |
| `/signup` | New business registration |
| `/reset-password` | Password reset flow |
| `/onboarding` | Multi-step setup wizard (business details → Google review link → logo → booking setup → GDPR → done) |

---

### 5.5 Legal / Informational

`/pricing`, `/terms`, `/privacy`, `/dpa`, `/data-ownership`, `/cookies`, `/refunds`, `/acceptable-use`, `/complaints`, `/contact`

---

## 6. Core Library Modules

### `lib/booking-utils.ts`
Slot computation engine.

```typescript
computeAvailableSlots(params: {
  date: string;
  openTime: string;        // "HH:MM"
  closeTime: string;       // "HH:MM"
  durationMinutes: number;
  bufferMinutes: number;
  existingBookings: { appointment_at: string; service_duration_minutes: number }[];
  blockedTimes: { start_at: string; end_at: string }[];
  timezone: string;
}) => string[]             // Available start times as "HH:MM"
```

Also exports: `timeToMinutes()`, `minutesToTime()`, `getWorkingWindow()`

### `lib/google-calendar.ts`
Google Calendar token lifecycle management.

- `getAccessTokenForBusiness(businessId)` — Returns valid access token, refreshing if expired. If refresh fails and token is less than 2 hours stale, tries token anyway before marking disconnected.
- `markDisconnected(businessId)` — Sets `is_active=false`
- `encryptToken(token)` / `decryptToken(encrypted)` — AES-256-GCM

### `lib/email.ts`
Email sending via Resend with logging.

- Writes to `email_log` before sending (status: `pending`)
- Calls Resend API
- Updates status to `sent` or `failed`
- Non-blocking — failures don't propagate to caller

Email types: `booking_owner_notify`, `booking_customer_confirm`, `booking_reminder`, `booking_cancellation`, `limit_reached`, `weekly_report`

### `lib/csv-parser.ts`
Fuzzy CSV column detection and phone normalisation.

**Column detection** (fuzzy match):
- Name: `name`, `שם`, `customer`, `client`, `full name`, `fullname`
- Phone: `phone`, `טלפון`, `נייד`, `mobile`, `tel`, `whatsapp`
- Email: `email`, `דוא"ל`, `mail`, `e-mail`
- Notes: `notes`, `הערות`, `comments`, `remarks`

**Phone normalisation**:
- Israeli: `05XXXXXXXX` → `+9725XXXXXXXX`
- UK: `07XXXXXXXXX` → `+447XXXXXXXXX`
- Already E.164: returned as-is

### `lib/platform-comparison.ts`
Competitor data for marketing pages.

```typescript
PLATFORMS: Record<string, {
  id: string;
  name: string;
  color: string;
  monthlyFee: number;
  commissionRate: number;  // 0–1
  staffFee: number;        // Per additional staff/month
  exportInstructions: string[];
  exportDifficulty: "easy" | "medium" | "hard";
  clientsExportNote: string;
}>
```

### `lib/planFeatures.ts`
Feature matrix per plan.

```typescript
PLAN_FEATURES: {
  trial:   { ai_insights: false, ai_replies: false, analytics: false, ... }
  starter: { ai_insights: true,  ai_replies: false, analytics: true,  ... }
  growth:  { ai_insights: true,  ai_replies: true,  analytics: true,  ... }
  pro:     { ai_insights: true,  ai_replies: true,  analytics: true, white_label: true, ... }
}
```

### `lib/rate-limit.ts`
In-memory sliding-window rate limiter.

```typescript
rateLimit(key: string, limit: number, windowMs: number): { allowed: boolean; remaining: number }
```

Default limits:
- Booking creation: 5/hr per IP, 3/hr per phone
- Chat: 20/hr per IP
- Waitlist: 5/hr per IP

Auto-cleanup every 10 minutes. Note: not distributed — resets per Vercel instance.

### `lib/crypto.ts`
AES-256-GCM encryption for sensitive tokens (Google OAuth).

### `lib/require-auth.ts`
```typescript
requireAuth(req: NextRequest): Promise<{ businessId: string } | NextResponse>
```
Verifies Supabase JWT from `Authorization: Bearer` header. Returns `businessId` or 401.

### `lib/require-admin.ts`
```typescript
requireAdmin(req: NextRequest): Promise<true | NextResponse>
```
Verifies admin TOTP session cookie. Returns `true` or 403.

---

## 7. Components

### `ChatWidget.tsx`
Fixed bottom-right support chat. Powered by `/api/chat`.
- Position: `bottom: 24, right: 24, zIndex: 1000`
- Features: conversation history, lead collection (name/email via AI signal parsing), escalation to human
- Persists session ID in localStorage

### `DataOwnershipBadge.tsx`
Small pill badge: "🔒 Your data is never sold or shared" linking to `/data-ownership`. Shown on public booking page.

### `UpgradePrompt.tsx`
Modal shown when user tries to access a feature above their plan. Shows plan comparison.

### `LimitReachedModal.tsx`
Shown when monthly SMS quota is exhausted. Options: upgrade plan or purchase top-up credits.

### `CookieBanner.tsx`
GDPR cookie consent. Auto-declines non-essential cookies unless user consents.

### `TranslateWidget.tsx`
EN/HE language toggle. Persists to localStorage.

### `Walkthrough.tsx`
Step-by-step onboarding guide overlay.

---

## 8. Key Data Flows

### 8.1 Customer Books Appointment

```
Customer visits /book/[slug]
  → GET /api/booking/[slug] (business + services + staff + hours)
  → Customer selects service, staff, date
  → GET /api/booking/[slug]/availability?date=&service_id=&staff_id=
  → Customer fills form, submits
  → POST /api/booking/[slug]/create
      Rate limit check
      Re-validate availability
      create_booking_atomic() RPC
      → INSERT bookings (status=confirmed, sms_status=pending)
      → INSERT booking_audit_log
      → Send confirmation email (async)
      → Send business notification email (async)
      → Push to Google Calendar (async)
  → Customer sees confirmation screen
  → Customer gets SMS confirmation (cron picks up sms_status=pending)
```

### 8.2 Post-Appointment Review Flow

```
24h after appointment_at:
  cron/appointment-reminders fires
  → Find bookings where appointment_at BETWEEN now()-25h AND now()-23h
    AND reminder_sent = false AND status = confirmed
  → Send SMS with review link /r/[booking_id]
  → UPDATE bookings SET reminder_sent=true, reminder_sent_at=now()

Customer clicks SMS link → /r/[booking_id]
  → Redirect to /review/[id]
  → Customer rates 1-5 stars
  → 4-5★: redirect to google_review_link
  → 1-3★: show feedback form → INSERT feedback
  → UPDATE bookings SET rating_submitted_at=now()
```

### 8.3 CSV Migration Import

```
Business visits /dashboard/switch
  → Selects source platform
  → Views export instructions
  → Uploads CSV file
  → POST /api/migration/import-clients (preview=true)
      Parse CSV, fuzzy-match columns
      Return first 5 rows for preview
  → Business confirms column mapping
  → POST /api/migration/import-clients (preview=false)
      Normalise phones to E.164
      Deduplicate against existing clients (by phone)
      Batch insert (100 rows/batch)
      INSERT migration_imports record
  → Show results: imported / skipped / errors
  → Post-import checklist
  → Message template to notify existing clients
```

### 8.4 Payment & Plan Upgrade

```
Business clicks Upgrade
  → POST /api/lemonsqueezy/checkout
      Create checkout session with variant ID
  → Redirect to Lemon Squeezy hosted checkout
  → Customer pays
  → Lemon Squeezy → POST /api/webhooks/lemonsqueezy
      Verify HMAC-SHA256 signature
      Map variant ID → plan name
      UPDATE businesses SET plan=..., subscription_status=active
      Set billing_anchor_day
```

---

## 9. Third-Party Integrations

| Service | Purpose | SDK/Method |
|---------|---------|-----------|
| **Supabase** | Database, auth, real-time | `@supabase/supabase-js` |
| **Anthropic Claude** | Chat support, AI features | `@anthropic-ai/sdk` |
| **Google Calendar** | Calendar sync, availability | REST API (OAuth 2.0) |
| **Microsoft Outlook** | Calendar sync | REST API (OAuth 2.0) |
| **Twilio** | SMS + WhatsApp | REST API |
| **Resend** | Transactional email | REST API |
| **Lemon Squeezy** | Subscriptions + payments | `@lemonsqueezy/lemonsqueezy.js` |
| **Sentry** | Error tracking | `@sentry/nextjs` |

---

## 10. Security

### Token Storage
- Google OAuth tokens: AES-256-GCM encrypted before storing in `calendar_connections`
- Cancellation tokens: UUID v4 (unguessable), stored in `bookings.cancellation_token`

### API Security
- Business API routes: Supabase JWT (`requireAuth`)
- Admin API routes: TOTP session cookie (`requireAdmin`)
- Webhook routes: HMAC-SHA256 signature verification
- Cron routes: `CRON_SECRET` bearer token

### Rate Limiting
- In-memory sliding window per IP and per phone
- Booking: 5/hr per IP, 3/hr per phone
- Chat: 20/hr per IP

### HTTP Security Headers
Set in `next.config.ts`:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: geolocation=(), microphone=(), camera=()`

Widget route (`/widget/[business_id]`) is exempt from `X-Frame-Options` to allow embedding.

### RLS Policies
All dashboard tables require `business_id IN (SELECT id FROM businesses WHERE owner_email = auth.jwt() ->> 'email')`.

`supabaseAdmin` (service role) bypasses RLS for server-side operations.

---

## 11. Environment Variables

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role (server-only) |
| `GOOGLE_CLIENT_ID` | Google OAuth app client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth app client secret |
| `ENCRYPTION_KEY` | 32-byte key for AES-256-GCM token encryption |
| `ANTHROPIC_API_KEY` | Claude API key |
| `TWILIO_ACCOUNT_SID` | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `TWILIO_FROM_NUMBER` | Twilio sender phone number |
| `RESEND_API_KEY` | Resend email API key |
| `LEMON_SQUEEZY_API_KEY` | Lemon Squeezy API key |
| `LEMON_SQUEEZY_WEBHOOK_SECRET` | HMAC secret for webhook verification |
| `CRON_SECRET` | Bearer token for cron job endpoints |
| `ADMIN_TOTP_SECRET` | Base32-encoded TOTP secret for admin 2FA |
| `ADMIN_PASSWORD_HASH` | Bcrypt hash of admin password |

---

## 12. Plan Feature Matrix

| Feature | Trial | Starter | Growth | Pro |
|---------|-------|---------|--------|-----|
| Booking system | ✓ | ✓ | ✓ | ✓ |
| Review requests (SMS) | ✓ | ✓ | ✓ | ✓ |
| Feedback inbox | ✓ | ✓ | ✓ | ✓ |
| AI insights | — | ✓ | ✓ | ✓ |
| Analytics | — | ✓ | ✓ | ✓ |
| AI reply suggestions | — | — | ✓ | ✓ |
| Custom sender number | — | — | ✓ | ✓ |
| Priority support | — | — | — | ✓ |
| White label | — | — | — | ✓ |
| Max staff | 2 | 2 | 5 | Unlimited |
| Max locations | 1 | 1 | 3 | Unlimited |

---

## 13. Deployment Checklist

After every code change on `booking-platform`:
```bash
git add -p && git commit -m "..."
git push origin booking-platform
PATH="/Users/nickyleslie/node/bin:$PATH" vercel deploy
# Copy the Preview URL from output, then:
PATH="/Users/nickyleslie/node/bin:$PATH" vercel alias set <preview-url> vomni-app-git-booking-platform-wesleyagents-projects.vercel.app
```

**Never** run `vercel deploy --prod` or push to `main`. All work stays on `booking-platform`.

---

## 14. Outstanding Setup Steps

| Item | Status | Action Required |
|------|--------|-----------------|
| `014_migration_system.sql` | ✅ Done | Run in Supabase SQL Editor |
| Google Calendar reconnect | ⚠️ Needed | Dashboard → Calendar Settings → Disconnect → Reconnect |
| Business hours save | ⚠️ Needed | Dashboard → Calendar Settings → re-save hours |
| `booking_enabled = true` | ⚠️ Needed | Dashboard → Booking Settings → Enable |
| Booking slug set | ⚠️ Needed | Dashboard → Booking Settings → set slug |
| Twilio live credentials | 🔲 Pending | SMS sends currently stubbed |
| Google OAuth production | 🔲 Pending | Add production domain to Google Console allowed origins |
