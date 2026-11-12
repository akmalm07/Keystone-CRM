CREATE TABLE IF NOT EXISTS authorized_signup_emails (
  email text PRIMARY KEY CHECK (email = lower(btrim(email)) AND email <> ''),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TYPE source_type ADD VALUE IF NOT EXISTS 'streeteasy';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS zapier_delivery_id text;
CREATE UNIQUE INDEX IF NOT EXISTS leads_zapier_delivery_unique ON leads (user_id, source, zapier_delivery_id);
