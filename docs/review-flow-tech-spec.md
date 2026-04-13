# Vomni Review Flow — Technical Specification
**Version:** 2.0
**Last updated:** April 2026
**Status:** Production

---

## 1. Overview

Vomni operates two distinct review collection flows. Both flows are designed to collect customer feedback, route high-satisfaction customers to Google, and capture private feedback from dissatisfied customers — without review gating (all customers have equal access to the Google review button at every stage, in compliance with FTC and Google guidelines).

| Flow | Route | Entry Point | Has Booking Context |
|------|-------|-------------|---------------------|
| Post-Appointment | `/r/[booking_id]` | Post-appointment SMS / Manage page | Yes |
| Manual Review Invite | `/review-invite/[business_id]` | Dashboard "Request a Review" / QR code | No |

---

## 2. Flow 1 — Post-Appointment Review (`/r/[booking_id]`)

### 2.1 Entry Points

| Source | Mechanism |
|--------|-----------|
| Post-appointment SMS | Cron job runs after appointment time, sends SMS with direct link to `/r/[booking_id]` |
| Confirmation SMS manage link | Customer re-opens `/manage/[token]` after booking is marked `completed` or `no_show` — page shows `ReviewOnly` component with button to `/r/[booking_id]` |

### 2.2 Screen Flow

```
[loading] → [rating] → [google] (4–5★) → (done via Google, no screen change)
                     → [private] (1–3★) → [done]

[google] → "Send us a private message instead" link → [private_from_positive] → [done]
```

### 2.3 Screen-by-Screen Detail

#### Screen: `loading`
- Fires `GET /api/r/[booking_id]` immediately on mount
- Checks `review_status` on the booking
- If `review_status` is in completed set → shows `already_used` screen
- Otherwise proceeds to `rating` screen with booking + business data loaded

**One-use link check — completed statuses:**
```
form_submitted | redirected | private_feedback | reviewed_negative |
reviewed_positive | private_feedback_from_positive
```

#### Screen: `rating`
- Displays business name + logo (if set)
- 5-star selector with live label feedback per star:
  - 1★ → "We are sorry to hear that"
  - 2★ → "That is not good enough"
  - 3★ → "Thanks for letting us know"
  - 4★ → "Great to hear!"
  - 5★ → "Amazing — thank you!"
- Submit button appears only after a star is selected
- On submit: fires `POST /api/r/[booking_id]` with `{ rating, business_id }`

**POST writes:**
- `bookings.rating = <value>`
- `bookings.review_status = "form_submitted"`
- `bookings.rating_submitted_at = <timestamp>`
- Inserts row into `feedback` table: `{ business_id, booking_id, rating }`

After POST resolves:
- `rating >= 4` → navigate to `google` screen
- `rating < 4` → navigate to `private` screen

#### Screen: `google` (4–5★)
- Heading: *"Thank you, [first name]! 🙏"*
- Body: *"We are so glad you had a great experience."*
- **Google review button** — always visible; style controlled by velocity cap:
  - Under cap → full green filled button (primary CTA)
  - At/over cap → outline button (equal prominence)
- Small link: *"Send us a private message instead"* → navigates to `private_from_positive`
- Rebooking CTA shown if `booking_enabled = true` and `booking_slug` is set

**On Google button click:** fires `PATCH /api/r/[booking_id]` (fire-and-forget)

**PATCH writes:**
- `bookings.review_status = "redirected_to_google"`
- `bookings.redirected_at = <timestamp>`
- `businesses.weekly_google_redirects += 1`
- Inserts notification: `{ type: "google_redirect", title: "Customer sent to Google review", body: "[Name] was directed to leave a Google review." }` (deduplicated within 24h per customer)

#### Screen: `private` (1–3★)
- Heading: *"I'd like to personally make this right."*
- Body: *"Your message goes directly to my personal inbox. I aim to resolve all concerns within 24 business hours."*
- Textarea placeholder: *"Please tell me what happened and how I can fix it for you today..."*
- Send button: *"Send directly to [owner first name] →"*
- **Google review button** always shown below (green, full-width) — customer can still leave a Google review regardless of star rating
- On submit: fires `PUT /api/r/[booking_id]`

**PUT writes:**
- Updates existing `feedback` row: `feedback_text = <message>`, `rating = <value>`
- `bookings.review_status = "reviewed_negative"`
- Push notification sent to business owner

#### Screen: `private_from_positive` (4–5★ chose private instead)
- Heading: *"We'd love to hear more! 😊"*
- Body: *"Your feedback goes directly to [owner name]. Every word helps us keep doing what we love."*
- Textarea placeholder: *"Tell us what you enjoyed or anything we could make even better..."*
- Send button: *"Send to [owner first name] →"*
- No Google button (customer already passed the Google screen)
- On submit: fires `PUT /api/r/[booking_id]` with `is_from_positive: true`

**PUT writes:**
- Updates `feedback` row with `feedback_text`
- `bookings.review_status = "private_feedback_from_positive"`
- Done message: *"Sent. Thank you for taking the time."*

#### Screen: `done`
- Tick animation
- Done message (varies by path — see above)
- Rebooking CTA shown for 4–5★ if `booking_enabled = true`

#### Screen: `already_used`
- Shown when booking's `review_status` is already in a completed state
- Displays business name and polite message — no action available
- Prevents double-submission

---

## 3. Flow 2 — Manual Review Invite (`/review-invite/[business_id]`)

### 3.1 Entry Points

| Source | Mechanism |
|--------|-----------|
| Dashboard "Request a Review" | Button generates URL: `/review-invite/[business_id]` — can be sent via SMS/WhatsApp/email manually |
| QR code | Static QR code pointing to `/review-invite/[business_id]` — can be printed and placed in-store |
| URL params | `?name=John` pre-fills customer name and skips the name/phone screen |

### 3.2 Screen Flow

```
[name_phone] (if no name pre-filled) → [rating] → [google] (4–5★)
                                                  → [private] (1–3★ or positive chose private)
                                                  → [done]
```

If `?name=` URL param present:
```
[rating] → [google] (4–5★) → ...
         → [private] (1–3★) → [done]
```

### 3.3 Screen-by-Screen Detail

#### Screen: `name_phone`
- Shown only when no `customerName` prop passed (i.e. no `?name=` URL param)
- Fields: full name (text), phone number (tel)
- Both fields required — Continue button disabled until both filled
- On continue: navigates to `rating` screen; name + phone held in component state for use in all subsequent API calls

#### Screen: `rating`
- Identical star selector and labels to Flow 1
- On submit: fires `POST /api/feedback` with `{ business_id, rating, customer_name, customer_phone }`

**POST writes:**
- Inserts into `feedback` table: `{ business_id, rating, customer_name, customer_phone, created_at }`
- `booking_id` is null (no booking context)

After POST resolves:
- `rating >= 4` → `google` screen
- `rating < 4` → `private` screen

#### Screen: `google` (4–5★)
- Identical layout to Flow 1 google screen
- Google button: full green, full-width
- *"Send us a private message instead"* small link → `private` screen
- Rebooking CTA if enabled

**On Google button click:** fires `PATCH /api/feedback` (fire-and-forget)

**PATCH writes:**
- `businesses.weekly_google_redirects += 1`
- Inserts dashboard notification: `{ type: "google_redirect", title: "Customer sent to Google review", body: "[Name] was directed to leave a Google review." }` (deduplicated within 24h)

#### Screen: `private` — copy branches on rating

**If arrived with rating 1–3★:**
- Heading: *"I'd like to personally make this right."*
- Body: *"Your message goes directly to my personal inbox. I aim to resolve all concerns within 24 business hours."*
- Placeholder: *"Please tell me what happened and how I can fix it for you today..."*
- Button: *"Send directly to [owner first name] →"*
- **Google review button** always shown below

**If arrived with rating 4–5★ (clicked private from google screen):**
- Heading: *"We'd love to hear more! 😊"*
- Body: *"Your feedback goes directly to [owner name]. Every word helps us keep doing what we love."*
- Placeholder: *"Tell us what you enjoyed or anything we could make even better..."*
- Button: *"Send to [owner first name] →"*
- **Google review button** always shown below

On submit: fires `POST /api/feedback` with `{ business_id, rating, customer_name, customer_phone, feedback_text }`

**POST writes:**
- Inserts into `feedback` table with full feedback text
- (Supabase DB webhook fires automatically — triggers email notification to business owner)

#### Screen: `done`
- Tick animation
- Message: *"Sent. [Owner name] at [Business name] will be in touch."*
- Rebooking CTA if enabled

---

## 4. Manage Page (`/manage/[token]`)

Not a review flow itself — the booking management page. Included here because it contains one review entry point.

| Booking Status | Page Behaviour |
|----------------|----------------|
| `confirmed` | Shows reschedule + cancel options. No review link. |
| `cancelled` | Shows "This appointment has already been cancelled." No review link. |
| `completed` or `no_show` | Shows `ReviewOnly` component: *"We'd love to hear how it went"* + green button → `/r/[booking_id]` |
| Not found | Shows "This link is no longer valid." |

---

## 5. API Endpoints Reference

### `GET /api/r/[booking_id]`
Loads booking and business data for the review page. Server-side, uses service role key to bypass RLS.

- Checks `review_status` — returns `{ alreadyUsed: true }` if already completed
- Marks `review_status = "form_opened"` and sets `form_opened_at`
- Returns full business data including `google_review_link`, `owner_name`, `weekly_google_redirects`, `weekly_redirect_cap`, `booking_slug`, `booking_enabled`

### `POST /api/r/[booking_id]`
Submits star rating for a specific booking.
- Updates `bookings`: `rating`, `review_status = "form_submitted"`, `rating_submitted_at`
- Inserts into `feedback`: `business_id`, `booking_id`, `rating`
- Returns `{ feedbackId }` for use in subsequent PUT

### `PATCH /api/r/[booking_id]`
Records that customer clicked the Google review button.
- Updates `bookings`: `review_status = "redirected_to_google"`, `redirected_at`
- Increments `businesses.weekly_google_redirects`
- Inserts `notifications` record (deduplicated within 24h)

### `PUT /api/r/[booking_id]`
Submits private feedback text for a specific booking.
- Updates `feedback` row: `feedback_text`, `rating`
- Updates `bookings.review_status`: `"reviewed_negative"` or `"private_feedback_from_positive"` based on `is_from_positive` flag
- Triggers push notification to business owner

### `POST /api/feedback`
Saves feedback from the manual review-invite flow (no booking context).
- Inserts into `feedback`: `business_id`, `booking_id (null)`, `rating`, `feedback_text`, `customer_name`, `customer_phone`, `created_at`
- Returns `{ success: true }`
- Supabase DB webhook fires on insert → email notification to business owner

### `PATCH /api/feedback`
Records Google redirect from manual review-invite flow.
- Increments `businesses.weekly_google_redirects`
- Inserts `notifications` record (same format as PATCH `/api/r/`, deduplicated within 24h)

---

## 6. Database Tables

### `bookings`
Relevant columns for review tracking:

| Column | Type | Description |
|--------|------|-------------|
| `review_status` | text | Lifecycle state — see states below |
| `rating` | int | Star rating submitted by customer |
| `form_opened_at` | timestamptz | When customer opened the review link |
| `rating_submitted_at` | timestamptz | When customer submitted their star rating |
| `redirected_at` | timestamptz | When customer clicked Google review button |
| `cancellation_token` | text | Token used in `/manage/[token]` URL |

**`review_status` lifecycle:**

```
pending → form_opened → form_submitted → redirected_to_google
                                       → reviewed_negative
                                       → reviewed_positive
                                       → private_feedback_from_positive
```

### `feedback`
Captures all feedback — both booking-linked (Flow 1) and standalone (Flow 2).

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `business_id` | uuid | FK → businesses |
| `booking_id` | uuid / null | FK → bookings (null for Flow 2) |
| `rating` | int | 1–5 star rating |
| `feedback_text` | text / null | Private message text |
| `customer_name` | text / null | Customer name (Flow 2 only, or where available) |
| `customer_phone` | text / null | Customer phone (Flow 2 only) |
| `status` | text | Processing status |
| `source` | text | `"vomni_native"` |
| `created_at` | timestamptz | Creation timestamp |

### `businesses`
Relevant columns:

| Column | Type | Description |
|--------|------|-------------|
| `google_review_link` | text / null | URL to Google review page (normalised to https:// on save) |
| `owner_name` | text / null | Used in review copy ("Send directly to [owner]") |
| `weekly_google_redirects` | int | Rolling count of Google redirects this week |
| `weekly_redirect_cap` | int / null | Max redirects before changing button prominence (null = no cap) |
| `booking_slug` | text / null | Used for rebooking CTA on review pages |
| `booking_enabled` | boolean | Controls whether rebooking CTA is shown |

### `notifications`
Dashboard notification feed.

| Column | Description |
|--------|-------------|
| `type = "google_redirect"` | Customer was sent to Google review |
| `title` | "Customer sent to Google review" |
| `body` | "[Name] was directed to leave a Google review." |
| `read` | false on creation |

---

## 7. URL Normalisation

`google_review_link` is normalised at two points:

1. **On save (Settings page):** Before writing to DB, the value is checked for a `https?://` prefix. If missing, `https://` is prepended.
2. **On render (both review pages):** `safeGoogleLink` is computed from the prop before any JSX renders. Same normalisation applied as a runtime safeguard against pre-existing bad data.

This ensures a bare domain like `google.review.com` never renders as a relative path on vomni.io.

---

## 8. Velocity Capping (Flow 1 only)

Controls the visual prominence of the Google button to manage the business's review velocity:

- **Under cap** (`weekly_google_redirects < weekly_redirect_cap`, or no cap set): Google button is the primary CTA — full green filled button, private option is a small underline link below.
- **At or over cap**: Both buttons rendered at equal size and prominence — outline style, neither is primary.

The cap resets weekly (managed externally / cron). The manual review-invite flow (Flow 2) does not apply velocity capping — the Google button is always the primary full green CTA.

---

## 9. Google Review Link Button Visibility

**Explicit design decision: no review gating.**

The Google review button is visible to ALL customers regardless of star rating at every stage:

| Screen | Google Button Present |
|--------|-----------------------|
| `google` (4–5★) | Yes — primary CTA |
| `private` (1–3★) | Yes — secondary CTA below feedback form |
| `private_from_positive` (4–5★ chose private) | Yes — secondary CTA below feedback form |

This applies equally to both Flow 1 and Flow 2.

---

## 10. Copy Matrix

| Screen | Rating Path | Heading | Subtext | Placeholder | Button |
|--------|-------------|---------|---------|-------------|--------|
| `rating` | All | "How was your visit, [name]?" | "Tap the stars to rate your experience" | — | "Submit →" |
| `google` | 4–5★ | "Thank you, [name]! 🙏" | "We are so glad you had a great experience." | — | "Leave us a Google review ★" |
| `private` | 1–3★ | "I'd like to personally make this right." | "Your message goes directly to my personal inbox. I aim to resolve all concerns within 24 business hours." | "Please tell me what happened and how I can fix it for you today..." | "Send directly to [owner] →" |
| `private_from_positive` / `private` with 4–5★ | 4–5★ chose private | "We'd love to hear more! 😊" | "Your feedback goes directly to [owner]. Every word helps us keep doing what we love." | "Tell us what you enjoyed or anything we could make even better..." | "Send to [owner] →" |
| `done` | Negative path | — | "Sent. [Owner] at [Business] will be in touch." | — | — |
| `done` | Positive-from-private | — | "Sent. Thank you for taking the time." | — | — |

---

## 11. Data Captured Per Flow

| Data Point | Flow 1 (`/r/`) | Flow 2 (`/review-invite/`) |
|------------|----------------|---------------------------|
| Customer name | From booking record | Entered in name/phone screen |
| Customer phone | From booking record | Entered in name/phone screen |
| Star rating | Saved to `bookings.rating` + `feedback.rating` | Saved to `feedback.rating` |
| Private feedback text | Saved to `feedback.feedback_text` | Saved to `feedback.feedback_text` |
| Google redirect tracked | Yes — `bookings.review_status`, `businesses.weekly_google_redirects`, notification | Yes — `businesses.weekly_google_redirects`, notification |
| Dashboard notification on Google click | Yes | Yes |
| One-use enforcement | Yes — `review_status` checked on load | No — reusable link |
| Rebooking CTA shown | Yes (4–5★ or done screen) | Yes (done screen) |

---

## 12. Known Limitations

| Limitation | Notes |
|------------|-------|
| Flow 2 private feedback does not update `feedback` row | Flow 2 always inserts a new row on each POST — there is no update path. If a customer submits the rating and then submits private feedback, two rows are inserted. This is not harmful but is less efficient than Flow 1 which updates the same row. |
| Weekly redirect cap not applied to Flow 2 | The velocity cap logic (`weekly_redirect_cap`) only controls button styling in Flow 1. Flow 2 always shows the Google button as the primary CTA. |
| No one-use enforcement on Flow 2 | The `/review-invite/` URL is reusable. This is by design for QR codes but means a single customer could submit multiple feedback entries. |
| `google_review_link` must be a real Google URL | The field is a free-text input. It is normalised to include `https://` but not validated as a real Google review URL. An incorrect URL will show the button but take the customer to the wrong page. |
