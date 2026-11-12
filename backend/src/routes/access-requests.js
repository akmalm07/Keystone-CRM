import { Router } from 'express';
import { sql } from 'drizzle-orm';
import { db } from '../../db/index.js';

const router = Router();
const leadVolumes = new Set(['0-5', '6-15', '16-30', '31-50', '51+']);
router.post('/', async (req, res) => {
  const { name, email, leadsPerWeek, leadVolume, reason } = req.body ?? {};
  const validVolume = leadVolume === undefined
    ? Number.isInteger(leadsPerWeek) && leadsPerWeek >= 0 && leadsPerWeek <= 100000
    : leadVolumes.has(leadVolume);
  if (typeof name !== 'string' || !name.trim() || name.length > 120 ||
      typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
      !validVolume ||
      typeof reason !== 'string' || !reason.trim() || reason.length > 2000) {
    return res.status(400).json({ error: 'Please provide a valid name, email, weekly lead count, and reason.' });
  }
  try {
    if (leadVolume === undefined) {
      await db.execute(sql`INSERT INTO access_requests (name, email, leads_per_week, reason) VALUES (${name.trim()}, ${email.trim().toLowerCase()}, ${leadsPerWeek}, ${reason.trim()})`);
    } else {
      await db.execute(sql`INSERT INTO access_requests (name, email, lead_volume, reason) VALUES (${name.trim()}, ${email.trim().toLowerCase()}, ${leadVolume}, ${reason.trim()})`);
    }
    return res.status(201).json({ ok: true });
  } catch (error) {
    console.error('Failed to save access request:', error);
    return res.status(500).json({ error: 'Could not submit your request. Please try again later.' });
  }
});
export default router;
