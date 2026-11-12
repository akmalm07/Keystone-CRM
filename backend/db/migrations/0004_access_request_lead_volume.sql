ALTER TABLE access_requests
  ALTER COLUMN leads_per_week DROP NOT NULL,
  ADD COLUMN lead_volume text CHECK (lead_volume IN ('0-5', '6-15', '16-30', '31-50', '51+')),
  ADD CONSTRAINT access_requests_has_lead_volume CHECK (leads_per_week IS NOT NULL OR lead_volume IS NOT NULL);
