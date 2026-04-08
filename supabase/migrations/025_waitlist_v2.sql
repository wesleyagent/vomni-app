-- ============================================================================
-- Vomni Waitlist V2 — Migration 025
-- Full-featured waitlist: position tracking, 15-min confirmation window,
-- deduplication by phone fingerprint, and per-slot status lifecycle.
-- ============================================================================

CREATE TABLE IF NOT EXISTS waitlist (
  id                 uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id        uuid        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  service_id         uuid        REFERENCES services(id) ON DELETE SET NULL,
  staff_id           uuid        REFERENCES staff(id) ON DELETE SET NULL,
  requested_date     date        NOT NULL,
  requested_time     text        NOT NULL,        -- "HH:MM"
  customer_name      text        NOT NULL,
  customer_phone     text        NOT NULL,        -- masked display value ("+972 *** *** 567")
  phone_fingerprint  text        NOT NULL,        -- SHA-256(e164 + businessId) — for dedup
  position           integer     NOT NULL,        -- 1-based ordering within a slot
  status             text        NOT NULL DEFAULT 'waiting'
                                  CHECK (status IN ('waiting','notified','confirmed','expired','cancelled')),
  notified_at        timestamptz,
  expires_at         timestamptz,
  confirmation_token text        UNIQUE,
  cancellation_token text        UNIQUE,
  created_at         timestamptz DEFAULT now()
);

-- Dedup: one active entry per phone per slot.
-- Excludes terminal states so re-joining is allowed after cancel/expire.
CREATE UNIQUE INDEX IF NOT EXISTS idx_waitlist_dedup
  ON waitlist (phone_fingerprint, business_id, requested_date, requested_time)
  WHERE status NOT IN ('cancelled', 'confirmed', 'expired');

-- Query index: find waiting/notified entries for a slot in position order
CREATE INDEX IF NOT EXISTS idx_waitlist_slot_status
  ON waitlist (business_id, requested_date, requested_time, status, position);

-- Dashboard index: all entries for a business on a given date
CREATE INDEX IF NOT EXISTS idx_waitlist_biz_date
  ON waitlist (business_id, requested_date);

-- Cron index: find notified entries whose window has expired
CREATE INDEX IF NOT EXISTS idx_waitlist_notified_expires
  ON waitlist (expires_at)
  WHERE status = 'notified';
