-- ============================================================================
-- Vomni Booking Improvements — Migration 006
-- ============================================================================

-- Audit log for booking events
CREATE TABLE IF NOT EXISTS booking_audit_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  action text NOT NULL, -- 'created', 'cancelled', 'no_show', 'completed', 'rescheduled'
  actor text NOT NULL,  -- 'customer', 'business', 'system'
  details jsonb,
  created_at timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_booking ON booking_audit_log(booking_id);

-- Waitlist table
CREATE TABLE IF NOT EXISTS booking_waitlist (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES staff(id) ON DELETE SET NULL,
  service_id uuid REFERENCES services(id) ON DELETE SET NULL,
  date date NOT NULL,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  notified boolean DEFAULT false,
  notified_at timestamp,
  booked boolean DEFAULT false,
  created_at timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_waitlist_biz_date ON booking_waitlist(business_id, date) WHERE notified = false AND booked = false;

-- Calendar sync columns on businesses
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS calendar_token text;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS google_calendar_connected boolean DEFAULT false;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS whatsapp_enabled boolean DEFAULT false;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS google_maps_url text;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS instagram_handle text;

-- Recurring booking columns on bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS is_recurring boolean DEFAULT false;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS recurring_group_id uuid;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS recurring_interval_weeks integer;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bookings_recurring ON bookings(recurring_group_id) WHERE recurring_group_id IS NOT NULL;

-- ============================================================================
-- Atomic booking creation — prevents double-booking via row-level locking
-- ============================================================================
CREATE OR REPLACE FUNCTION create_booking_atomic(
  p_business_id uuid,
  p_staff_id uuid,
  p_service_id uuid,
  p_appointment_at timestamp,
  p_duration_minutes integer,
  p_buffer_minutes integer,
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text,
  p_notes text,
  p_cancellation_token text,
  p_service_name text,
  p_service_price numeric
) RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  conflict_count integer;
  new_booking_id uuid;
  slot_end timestamp;
BEGIN
  slot_end := p_appointment_at + ((p_duration_minutes + p_buffer_minutes) * interval '1 minute');

  -- Lock competing rows to prevent race conditions
  SELECT COUNT(*) INTO conflict_count
  FROM bookings
  WHERE staff_id = p_staff_id
    AND status = 'confirmed'
    AND appointment_at < slot_end
    AND (appointment_at + (service_duration_minutes * interval '1 minute')) > p_appointment_at
  FOR UPDATE;

  IF conflict_count > 0 THEN
    RETURN json_build_object('success', false, 'error', 'slot_taken');
  END IF;

  INSERT INTO bookings (
    business_id, staff_id, service_id, service_name,
    service_duration_minutes, service_price,
    customer_name, customer_phone, customer_email,
    service, appointment_at, booking_source, status, sms_status,
    notes, cancellation_token, reminder_sent, confirmation_sent,
    created_at
  ) VALUES (
    p_business_id, p_staff_id, p_service_id, p_service_name,
    p_duration_minutes, p_service_price,
    p_customer_name, p_customer_phone, p_customer_email,
    p_service_name, p_appointment_at, 'vomni', 'confirmed', 'pending',
    p_notes, p_cancellation_token, false, false,
    now()
  ) RETURNING id INTO new_booking_id;

  RETURN json_build_object('success', true, 'booking_id', new_booking_id);
END;
$$;

-- ============================================================================
-- Waitlist notification function — called when a slot opens up
-- ============================================================================
CREATE OR REPLACE FUNCTION notify_waitlist_for_slot(
  p_business_id uuid,
  p_staff_id uuid,
  p_date date
) RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  notified_count integer := 0;
BEGIN
  UPDATE booking_waitlist
  SET notified = true, notified_at = now()
  WHERE business_id = p_business_id
    AND (staff_id = p_staff_id OR staff_id IS NULL)
    AND date = p_date
    AND notified = false
    AND booked = false;

  GET DIAGNOSTICS notified_count = ROW_COUNT;
  RETURN notified_count;
END;
$$;
