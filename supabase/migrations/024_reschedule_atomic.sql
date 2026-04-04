-- 024_reschedule_atomic.sql
-- Atomically reschedule a booking: cancel the old one and insert a new one
-- in a single transaction, with a server-side availability check to prevent
-- race conditions (double-booking).
--
-- Called by: POST /api/booking/reschedule

CREATE OR REPLACE FUNCTION reschedule_booking_atomic(
  p_old_token          text,
  p_new_appointment_at timestamptz,
  p_new_staff_id       uuid    DEFAULT NULL,
  p_buffer_minutes     int     DEFAULT 0
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking        record;
  v_new_token      text;
  v_new_booking_id uuid;
  v_conflict_count int;
  v_new_end_at     timestamptz;
BEGIN
  -- Lock the old booking to prevent concurrent reschedule/cancel races
  SELECT *
  INTO   v_booking
  FROM   bookings
  WHERE  cancellation_token = p_old_token
    AND  status             = 'confirmed'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error',   'booking_not_found_or_not_confirmed'
    );
  END IF;

  -- New slot end time, including buffer
  v_new_end_at := p_new_appointment_at
    + ((v_booking.service_duration_minutes + p_buffer_minutes) || ' minutes')::interval;

  -- Check that the new slot is free for this staff member (or business-wide if no staff).
  -- Uses IS NOT DISTINCT FROM for null-safe comparison so solo businesses (staff_id IS NULL)
  -- are handled correctly. Excludes the booking being rescheduled to allow same-slot moves.
  SELECT COUNT(*)
  INTO   v_conflict_count
  FROM   bookings
  WHERE  staff_id IS NOT DISTINCT FROM p_new_staff_id
    AND  status     = 'confirmed'
    AND  id        != v_booking.id
    -- existing booking overlaps with requested window
    AND  appointment_at < v_new_end_at
    AND (appointment_at
         + ((service_duration_minutes + p_buffer_minutes) || ' minutes')::interval)
         > p_new_appointment_at;

  IF v_conflict_count > 0 THEN
    RETURN json_build_object(
      'success', false,
      'error',   'slot_not_available'
    );
  END IF;

  -- Generate a URL-safe cancellation token for the new booking
  v_new_token := replace(
    replace(
      replace(encode(gen_random_bytes(24), 'base64'), '+', '-'),
      '/', '_'),
    '=', '');

  -- Cancel the old booking
  UPDATE bookings
  SET    status              = 'cancelled',
         cancellation_reason = 'rescheduled',
         cancelled_at        = now()
  WHERE  id = v_booking.id;

  -- Insert the rescheduled booking, copying all customer details
  INSERT INTO bookings (
    business_id,
    service_id,
    staff_id,
    customer_name,
    customer_phone,
    customer_email,
    service,
    service_name,
    service_duration_minutes,
    service_price,
    appointment_at,
    status,
    booking_source,
    notes,
    cancellation_token,
    whatsapp_opt_in,
    marketing_consent,
    reminder_sent,
    confirmation_sent,
    phone_display,
    whatsapp_status,
    sms_status,
    created_at
  ) VALUES (
    v_booking.business_id,
    v_booking.service_id,
    COALESCE(p_new_staff_id, v_booking.staff_id),
    v_booking.customer_name,
    v_booking.customer_phone,
    v_booking.customer_email,
    v_booking.service,
    v_booking.service_name,
    v_booking.service_duration_minutes,
    v_booking.service_price,
    p_new_appointment_at,
    'confirmed',
    v_booking.booking_source,
    v_booking.notes,
    v_new_token,
    v_booking.whatsapp_opt_in,
    v_booking.marketing_consent,
    false,
    false,
    v_booking.phone_display,
    'pending',
    'pending',
    now()
  )
  RETURNING id INTO v_new_booking_id;

  RETURN json_build_object(
    'success',            true,
    'new_booking_id',     v_new_booking_id::text,
    'new_token',          v_new_token,
    'new_appointment_at', p_new_appointment_at::text
  );
END;
$$;
