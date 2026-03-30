-- 008: Email log table, booking unique constraint, recurring bookings RPC
-- All booking platform reliability improvements

-- ── email_log ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_log (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id  uuid        REFERENCES bookings(id) ON DELETE SET NULL,
  type        text        NOT NULL,  -- booking_owner_notify | booking_customer_confirm | etc
  status      text        NOT NULL DEFAULT 'pending',  -- pending | sent | failed
  to_address  text        NOT NULL,
  subject     text,
  error       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_log_booking_id_idx ON email_log(booking_id);
CREATE INDEX IF NOT EXISTS email_log_status_idx     ON email_log(status);
CREATE INDEX IF NOT EXISTS email_log_created_at_idx ON email_log(created_at DESC);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS email_log_updated_at ON email_log;
CREATE TRIGGER email_log_updated_at
  BEFORE UPDATE ON email_log
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── Unique constraint: prevent double-booking the same slot ───────────────────
-- Partial index: only enforced for confirmed bookings (cancelled/no_show are fine)
CREATE UNIQUE INDEX IF NOT EXISTS bookings_slot_unique
  ON bookings (business_id, appointment_at, staff_id)
  WHERE status = 'confirmed';

-- Solo businesses (no staff_id) also get a constraint
CREATE UNIQUE INDEX IF NOT EXISTS bookings_slot_no_staff_unique
  ON bookings (business_id, appointment_at)
  WHERE staff_id IS NULL AND status = 'confirmed';

-- ── Atomic recurring bookings RPC ─────────────────────────────────────────────
-- Called from the dashboard calendar page when creating recurring appointments.
-- Wraps all inserts in a single transaction — rolls back all if any fail.
CREATE OR REPLACE FUNCTION insert_recurring_bookings(
  p_rows jsonb
) RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_row      jsonb;
  v_ids      uuid[] := '{}';
  v_id       uuid;
BEGIN
  FOR v_row IN SELECT * FROM jsonb_array_elements(p_rows)
  LOOP
    INSERT INTO bookings (
      business_id, customer_name, customer_phone, customer_email,
      service, service_name, service_id, staff_id,
      appointment_at, booking_source, status, sms_status,
      notes, created_at, is_recurring, recurring_group_id, recurring_interval_weeks
    ) VALUES (
      (v_row->>'business_id')::uuid,
      v_row->>'customer_name',
      v_row->>'customer_phone',
      v_row->>'customer_email',
      v_row->>'service',
      v_row->>'service_name',
      (v_row->>'service_id')::uuid,
      CASE WHEN v_row->>'staff_id' IS NULL OR v_row->>'staff_id' = '' THEN NULL
           ELSE (v_row->>'staff_id')::uuid END,
      (v_row->>'appointment_at')::timestamptz,
      v_row->>'booking_source',
      v_row->>'status',
      v_row->>'sms_status',
      v_row->>'notes',
      COALESCE((v_row->>'created_at')::timestamptz, now()),
      (v_row->>'is_recurring')::boolean,
      CASE WHEN v_row->>'recurring_group_id' IS NULL THEN NULL
           ELSE (v_row->>'recurring_group_id')::uuid END,
      CASE WHEN v_row->>'recurring_interval_weeks' IS NULL THEN NULL
           ELSE (v_row->>'recurring_interval_weeks')::integer END
    )
    RETURNING id INTO v_id;

    v_ids := array_append(v_ids, v_id);
  END LOOP;

  RETURN jsonb_build_object('success', true, 'ids', to_jsonb(v_ids));
EXCEPTION WHEN unique_violation THEN
  RETURN jsonb_build_object('success', false, 'error', 'slot_taken');
WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ── booking_slug unique constraint ────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS businesses_booking_slug_unique
  ON businesses (booking_slug)
  WHERE booking_slug IS NOT NULL;
