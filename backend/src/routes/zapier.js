import { timingSafeEqual } from 'node:crypto';
import { Router } from 'express';
import { sql } from 'drizzle-orm';
import { db } from '../../db/index.js';

const router = Router();
const keys = {
  zillow: process.env.ZAPIER_ZILLOW_WEBHOOK_KEY,
  streeteasy: process.env.ZAPIER_STREETEASY_WEBHOOK_KEY,
};

function matchesKey(header, expected) {
  const provided = Buffer.from(header ?? '');
  const secret = Buffer.from(expected);
  return provided.length === secret.length && timingSafeEqual(provided, secret);
}

router.post('/zapier/:source', async (req, res) => {
  const { source } = req.params;
  if (!Object.hasOwn(keys, source)) return res.sendStatus(404);

  const key = keys[source];
  const ownerEmail = process.env.ZAPIER_LEAD_OWNER_EMAIL?.trim().toLowerCase();
  if (!key || key.length < 32 || !ownerEmail) return res.status(503).json({ error: 'Zapier source is not configured.' });
  if (!matchesKey(req.get('X-Keystone-Key'), key)) return res.sendStatus(401);

  const fields = req.body ?? {};
  const limits = { deliveryId: 200, name: 160, email: 254, phone: 40, address: 300, message: 2000 };
  const lead = {};
  for (const [field, limit] of Object.entries(limits)) {
    const value = fields[field] ?? '';
    if (typeof value !== 'string' || value.length > limit) {
      return res.status(400).json({ error: `Invalid ${field}.` });
    }
    lead[field] = value.trim();
  }
  lead.email = lead.email.toLowerCase();
  if (!lead.deliveryId || (!lead.email && !lead.phone) ||
      (lead.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) ||
      (lead.phone && !/^\+[1-9]\d{6,14}$/.test(lead.phone))) {
    return res.status(400).json({ error: 'Provide a delivery ID and a valid email or E.164 phone number.' });
  }

  const note = [lead.address && `Listing: ${lead.address}`, lead.message].filter(Boolean).join('\n\n');
  try {
    const result = await db.execute(sql`
      WITH owner AS (
        SELECT id FROM users WHERE lower(email) = ${ownerEmail} LIMIT 1
      ), imported AS (
        INSERT INTO leads (user_id, property_id, source, zapier_delivery_id, name, email, phone, status, ai_enabled)
        SELECT owner.id, (
          SELECT id FROM properties
          WHERE user_id = owner.id AND deletion_date IS NULL
            AND lower(trim(address_line_1)) = lower(${lead.address})
          ORDER BY id LIMIT 1
        ), ${source}::source_type, ${lead.deliveryId}, ${lead.name || null}, ${lead.email || null},
          ${lead.phone || null}, 'unverified', false
        FROM owner
        ON CONFLICT (user_id, source, zapier_delivery_id) DO NOTHING
        RETURNING id
      ), notes AS (
        INSERT INTO lead_notes (lead_id, note)
        SELECT id, ${note} FROM imported WHERE ${Boolean(note)}
      )
      SELECT (SELECT id FROM owner) AS owner_id, (SELECT id FROM imported) AS lead_id
    `);
    const { owner_id: ownerId, lead_id: leadId } = result.rows[0];
    if (!ownerId) return res.status(503).json({ error: 'The configured Keystone account does not exist.' });
    if (!leadId) return res.status(200).json({ duplicate: true });
    return res.status(201).json({ leadId });
  } catch (error) {
    console.error('Zapier import failed:', error.cause?.code ?? error.name);
    return res.status(500).json({ error: 'Unable to import the lead.' });
  }
});

export default router;
