CREATE TABLE IF NOT EXISTS device_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
  token text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(business_id, token)
);

-- Enable RLS
ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: business owner can manage their own device tokens
CREATE POLICY "Business owner manages device tokens"
  ON device_tokens
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_email = auth.jwt() ->> 'email'
    )
  );
