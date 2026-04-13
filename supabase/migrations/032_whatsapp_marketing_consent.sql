-- Add WhatsApp marketing consent field to businesses table.
-- Captured at signup when NEXT_PUBLIC_SHOW_META_LEGAL=true (Meta WhatsApp Business API approval).
-- Defaults to false. Can be removed once Meta approval is granted.
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS whatsapp_marketing_consent boolean NOT NULL DEFAULT false;
