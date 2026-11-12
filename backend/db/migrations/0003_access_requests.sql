CREATE TABLE IF NOT EXISTS access_requests (
  id bigserial PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  leads_per_week integer NOT NULL CHECK (leads_per_week >= 0),
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
