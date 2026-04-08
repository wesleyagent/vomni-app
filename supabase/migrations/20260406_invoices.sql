-- ============================================================
-- Invoice system for Israeli-locale Vomni accounts
-- Apply via: Supabase Dashboard → SQL Editor
-- ============================================================

-- ── 1. Extend businesses table ──────────────────────────────
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS osek_type text DEFAULT 'osek_patur'
    CHECK (osek_type IN ('osek_patur', 'osek_murshe')),
  ADD COLUMN IF NOT EXISTS osek_murshe_number text,
  ADD COLUMN IF NOT EXISTS business_legal_name text,
  ADD COLUMN IF NOT EXISTS business_address text;

-- ── 2. Create invoices table ─────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id         uuid        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  booking_id          uuid        REFERENCES bookings(id) ON DELETE SET NULL,
  invoice_number      text        NOT NULL,
  document_type       text        NOT NULL CHECK (document_type IN ('heshbonit_mas', 'kabala')),
  customer_name       text        NOT NULL,
  customer_phone      text,
  service_description text        NOT NULL,
  quantity            integer     NOT NULL DEFAULT 1,
  unit_price          numeric(10,2) NOT NULL,
  subtotal            numeric(10,2) NOT NULL,
  vat_rate            numeric(5,2)  NOT NULL DEFAULT 0,
  vat_amount          numeric(10,2) NOT NULL DEFAULT 0,
  total               numeric(10,2) NOT NULL,
  payment_method      text        NOT NULL CHECK (payment_method IN ('cash', 'credit', 'bit', 'paybox')),
  pdf_storage_path    text,
  issued_at           timestamptz NOT NULL DEFAULT now(),
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, invoice_number)
);

-- ── 3. Row-level security ────────────────────────────────────
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'invoices' AND policyname = 'businesses_own_invoices'
  ) THEN
    CREATE POLICY businesses_own_invoices ON invoices
      FOR ALL
      USING (
        business_id IN (
          SELECT id FROM businesses WHERE owner_email = (auth.jwt() ->> 'email')
        )
      );
  END IF;
END $$;

-- ── 4. Storage bucket RLS (apply after creating 'invoices' bucket) ──
-- Run this after creating the private 'invoices' bucket via the Supabase dashboard.
-- Authenticated users may only access paths prefixed with their own business_id.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects' AND schemaname = 'storage'
      AND policyname = 'invoice_bucket_owner_access'
  ) THEN
    CREATE POLICY invoice_bucket_owner_access ON storage.objects
      FOR ALL TO authenticated
      USING (
        bucket_id = 'invoices'
        AND (storage.foldername(name))[1] = (
          SELECT id::text FROM businesses WHERE owner_email = auth.email() LIMIT 1
        )
      )
      WITH CHECK (
        bucket_id = 'invoices'
        AND (storage.foldername(name))[1] = (
          SELECT id::text FROM businesses WHERE owner_email = auth.email() LIMIT 1
        )
      );
  END IF;
END $$;

-- ── 5. Invoice number sequencing function ────────────────────
-- Returns the next INV-XXXX number for a given business.
-- Uses a pg_advisory_xact_lock per business to prevent duplicates under concurrency.
CREATE OR REPLACE FUNCTION generate_invoice_number(p_business_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_seq    integer;
  v_number text;
BEGIN
  -- Lock scoped to this business for the duration of the calling transaction.
  -- Prevents two concurrent calls from generating the same sequence number.
  PERFORM pg_advisory_xact_lock(
    ('x' || substr(md5(p_business_id::text), 1, 16))::bit(64)::bigint
  );

  SELECT COALESCE(
    MAX(
      CASE
        WHEN invoice_number ~ '^INV-[0-9]{1,}$'
        THEN CAST(substring(invoice_number FROM 5) AS integer)
        ELSE 0
      END
    ),
    0
  ) + 1
  INTO v_seq
  FROM invoices
  WHERE business_id = p_business_id;

  v_number := 'INV-' || LPAD(v_seq::text, 4, '0');
  RETURN v_number;
END;
$$;

GRANT EXECUTE ON FUNCTION generate_invoice_number(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION generate_invoice_number(uuid) TO authenticated;
