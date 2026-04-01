-- Clients table for imported/manual clients
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  notes text,
  source text DEFAULT 'manual',
  imported_at timestamptz DEFAULT now(),
  last_visited_at timestamptz,
  total_visits int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS clients_business_id_idx ON clients(business_id);
CREATE INDEX IF NOT EXISTS clients_phone_idx ON clients(phone);
CREATE UNIQUE INDEX IF NOT EXISTS clients_business_phone_unique ON clients(business_id, phone) WHERE phone IS NOT NULL;

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clients_business_owner" ON clients
  FOR ALL USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_email = auth.jwt() ->> 'email'
    )
  );

-- Migration imports tracking
CREATE TABLE IF NOT EXISTS migration_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
  source_platform text,
  file_name text,
  total_rows int DEFAULT 0,
  imported_rows int DEFAULT 0,
  skipped_rows int DEFAULT 0,
  error_rows int DEFAULT 0,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS migration_imports_business_idx ON migration_imports(business_id);

ALTER TABLE migration_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "migration_imports_business_owner" ON migration_imports
  FOR ALL USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_email = auth.jwt() ->> 'email'
    )
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON clients TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON migration_imports TO authenticated, anon;
