import type { PoolClient } from 'pg'
import { pool } from '../db/client.js'
import type { LeadSource, LeadStatus } from '../db/schema.js'
import { AppError } from '../http/errors.js'

export const leadTransitions: Record<LeadStatus, LeadStatus[]> = {
  NEW: ['INTERESTED', 'SCHEDULED', 'LOST'],
  INTERESTED: ['SCHEDULED', 'LOST'],
  SCHEDULED: ['TRIAL_COMPLETED', 'LOST'],
  TRIAL_COMPLETED: ['CONVERTED', 'LOST'],
  CONVERTED: [],
  LOST: [],
}

export function canTransitionLead(from: LeadStatus, to: LeadStatus) {
  return leadTransitions[from].includes(to)
}

export async function createOrMergePublicLead(input: {
  name: string
  email: string
  phone: string
  source: 'FORM'
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  sessionId?: string
}) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await client.query<{ id: number; status: LeadStatus; created: boolean }>(
      `INSERT INTO leads (name, email, phone, source, utm_source, utm_medium, utm_campaign)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (lower(email)) DO UPDATE SET
         name = CASE WHEN leads.converted_user_id IS NULL THEN EXCLUDED.name ELSE leads.name END,
         phone = CASE WHEN leads.converted_user_id IS NULL THEN EXCLUDED.phone ELSE leads.phone END,
         utm_source = COALESCE(leads.utm_source, EXCLUDED.utm_source),
         utm_medium = COALESCE(leads.utm_medium, EXCLUDED.utm_medium),
         utm_campaign = COALESCE(leads.utm_campaign, EXCLUDED.utm_campaign),
         updated_at = now()
       RETURNING id, status, (xmax = 0) AS created`,
      [input.name, input.email, input.phone, input.source, input.utmSource ?? null, input.utmMedium ?? null, input.utmCampaign ?? null],
    )
    const lead = result.rows[0]!
    if (input.sessionId) {
      await client.query('UPDATE analytics_events SET lead_id = $1 WHERE session_id = $2 AND lead_id IS NULL', [lead.id, input.sessionId])
    }
    await client.query('COMMIT')
    return lead
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function ensureLeadForUser(client: PoolClient, userId: number, source: LeadSource, targetStatus: LeadStatus) {
  const userResult = await client.query<{ name: string; email: string; phone: string | null }>('SELECT name, email, phone FROM users WHERE id = $1', [userId])
  const user = userResult.rows[0]
  if (!user?.phone) throw new AppError(409, 'USER_CONTACT_INCOMPLETE', 'O usuário não possui contato suficiente para associação ao lead.')

  let leadResult = await client.query<{ id: number; status: LeadStatus; converted_user_id: number | null }>(
    'SELECT id, status, converted_user_id FROM leads WHERE lower(email) = lower($1) FOR UPDATE',
    [user.email],
  )
  if (!leadResult.rowCount) {
    leadResult = await client.query(
      `INSERT INTO leads (name, email, phone, source, status, converted_user_id,
        scheduled_at, trial_completed_at, converted_at)
       VALUES ($1, lower($2), $3, $4, $5::lead_status, $6,
        CASE WHEN $5::lead_status IN ('SCHEDULED', 'TRIAL_COMPLETED', 'CONVERTED') THEN now() END,
        CASE WHEN $5::lead_status IN ('TRIAL_COMPLETED', 'CONVERTED') THEN now() END,
        CASE WHEN $5::lead_status = 'CONVERTED' THEN now() END)
       RETURNING id, status, converted_user_id`,
      [user.name, user.email, user.phone, source, targetStatus, userId],
    )
  }

  const lead = leadResult.rows[0]!
  if (lead.converted_user_id && lead.converted_user_id !== userId) throw new AppError(409, 'LEAD_ALREADY_ASSOCIATED', 'Este lead já está associado a outra conta.')
  await client.query(
    `UPDATE leads SET converted_user_id = $2,
       status = CASE WHEN status = ANY($3::lead_status[]) THEN $4::lead_status ELSE status END,
       scheduled_at = CASE WHEN $4::lead_status IN ('SCHEDULED', 'TRIAL_COMPLETED', 'CONVERTED') THEN COALESCE(scheduled_at, now()) ELSE scheduled_at END,
       trial_completed_at = CASE WHEN $4::lead_status IN ('TRIAL_COMPLETED', 'CONVERTED') THEN COALESCE(trial_completed_at, now()) ELSE trial_completed_at END,
       converted_at = CASE WHEN $4::lead_status = 'CONVERTED' THEN COALESCE(converted_at, now()) ELSE converted_at END,
       updated_at = now()
     WHERE id = $1`,
    [lead.id, userId, targetStatus === 'INTERESTED' ? ['NEW'] : targetStatus === 'SCHEDULED' ? ['NEW', 'INTERESTED'] : targetStatus === 'TRIAL_COMPLETED' ? ['SCHEDULED'] : [], targetStatus],
  )
  return lead.id
}
