-- ============================================================================
-- Vomni Booking System — Database Migration
-- ============================================================================

-- Services offered by each business
CREATE TABLE IF NOT EXISTS services (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  name_he text,
  description text,
  description_he text,
  duration_minutes integer NOT NULL DEFAULT 30,
  price numeric,
  currency text DEFAULT 'ILS',
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamp DEFAULT now()
);

-- Staff members for each business
CREATE TABLE IF NOT EXISTS staff (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  name_he text,
  email text,
  phone text,
  role text DEFAULT 'staff',
  avatar_url text,
  bio text,
  bio_he text,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamp DEFAULT now()
);

-- Which staff can perform which services
CREATE TABLE IF NOT EXISTS staff_services (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id uuid REFERENCES staff(id) ON DELETE CASCADE,
  service_id uuid REFERENCES services(id) ON DELETE CASCADE,
  UNIQUE(staff_id, service_id)
);

-- Business working hours
CREATE TABLE IF NOT EXISTS business_hours (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL, -- 0=Sunday, 1=Monday... 6=Saturday
  is_open boolean DEFAULT true,
  open_time time NOT NULL DEFAULT '09:00',
  close_time time NOT NULL DEFAULT '18:00'
);

-- Staff working hours (overrides business hours per staff)
CREATE TABLE IF NOT EXISTS staff_hours (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id uuid REFERENCES staff(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL,
  is_working boolean DEFAULT true,
  start_time time NOT NULL DEFAULT '09:00',
  end_time time NOT NULL DEFAULT '18:00'
);

-- Time off / blocked time
CREATE TABLE IF NOT EXISTS blocked_times (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid REFERENCES businesses(id),
  staff_id uuid REFERENCES staff(id),
  start_at timestamp NOT NULL,
  end_at timestamp NOT NULL,
  reason text,
  created_at timestamp DEFAULT now()
);

-- Update bookings table with new fields for native booking system
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

-- Update businesses table for booking system settings
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_services_business ON services(business_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_staff_business ON staff(business_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_bookings_staff_date ON bookings(staff_id, appointment_at) WHERE status = 'confirmed';
CREATE INDEX IF NOT EXISTS idx_bookings_business_date ON bookings(business_id, appointment_at);
CREATE INDEX IF NOT EXISTS idx_bookings_cancellation_token ON bookings(cancellation_token) WHERE cancellation_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_reminder ON bookings(appointment_at, reminder_sent) WHERE status = 'confirmed' AND reminder_sent = false;
CREATE INDEX IF NOT EXISTS idx_businesses_slug ON businesses(booking_slug) WHERE booking_slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_business_hours_biz ON business_hours(business_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_staff_hours_staff ON staff_hours(staff_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_blocked_times_range ON blocked_times(staff_id, start_at, end_at);
