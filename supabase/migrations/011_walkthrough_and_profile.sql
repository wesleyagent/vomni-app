-- 011: Platform walkthrough state + public business profile additions

-- Add address field to businesses (used in customer confirmation emails + public profile)
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS address           text,
  ADD COLUMN IF NOT EXISTS city              text,
  ADD COLUMN IF NOT EXISTS postcode          text,
  ADD COLUMN IF NOT EXISTS primary_color     text DEFAULT '#00C896',
  ADD COLUMN IF NOT EXISTS bio               text;

-- ── Review invites tracking ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS review_invites (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   uuid        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  booking_id    uuid        REFERENCES bookings(id) ON DELETE SET NULL,
  customer_name text        NOT NULL,
  method        text        NOT NULL CHECK (method IN ('qr','link','whatsapp','sms')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  clicked_at    timestamptz            -- set when /review-invite/[id] is visited
);

CREATE INDEX IF NOT EXISTS review_invites_business_idx ON review_invites(business_id);
CREATE INDEX IF NOT EXISTS review_invites_booking_idx  ON review_invites(booking_id);

-- ── PWA / notification support ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   uuid        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  endpoint      text        NOT NULL,
  p256dh        text        NOT NULL,
  auth          text        NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, endpoint)
);

CREATE INDEX IF NOT EXISTS push_subs_business_idx ON push_subscriptions(business_id);
