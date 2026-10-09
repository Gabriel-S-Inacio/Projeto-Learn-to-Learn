import { Router } from 'express'
import { z } from 'zod'
import { pool } from '../db/client.js'
import { leadSource, leadStatus, type LeadStatus } from '../db/schema.js'
import { AppError, asyncHandler } from '../http/errors.js'
import {
  canCorrectLeadStatus,
  canTransitionLead,
  leadCorrectionTransitions,
  leadTransitions,
} from '../leads/service.js'
import { recordAnalyticsEvent } from '../analytics/service.js'

const listSchema = z.object({
  status: z.enum(leadStatus.enumValues).optional(),
  source: z.enum(leadSource.enumValues).optional(),
  days: z.coerce.number().int().refine((value) => value === 7 || value === 30).optional(),
  from: z.iso.datetime({ offset: true }).optional(),
  to: z.iso.datetime({ offset: true }).optional(),
})
const idSchema = z.coerce.number().int().positive()
const statusSchema = z.object({ status: z.enum(leadStatus.enumValues) })
const correctionSchema = z.object({
  status: z.enum(leadStatus.enumValues),
  reason: z.string().trim().min(5, 'Informe um motivo com pelo menos 5 caracteres.').max(500),
})

function period(query: z.infer<typeof listSchema>) {
  const to = query.to ? new Date(query.to) : new Date()
  const from = query.from ? new Date(query.from) : new Date(to.getTime() - (query.days ?? 30) * 86_400_000)
  if (from >= to) throw new AppError(422, 'INVALID_PERIOD', 'O início do período deve ser anterior ao fim.')
  return { from, to }
}

export const adminLeadRouter = Router()

adminLeadRouter.get('/metrics', asyncHandler(async (request, response) => {
  const query = listSchema.pick({ days: true, from: true, to: true }).parse(request.query)
  const { from, to } = period(query)
  const result = await pool.query<{
    leads: number; bookings: number; trials: number; conversions: number
    funnel_scheduled: number; funnel_trials: number; funnel_converted: number
  }>(
    `WITH cohort AS (
       SELECT * FROM leads WHERE created_at >= $1 AND created_at < $2
     )
     SELECT
       (SELECT count(*)::int FROM cohort) AS leads,
       (SELECT count(*)::int FROM lesson_bookings b
         WHERE b.type = 'TRIAL' AND b.created_at >= $1 AND b.created_at < $2) AS bookings,
       (SELECT count(*)::int FROM lesson_bookings b JOIN lesson_slots s ON s.id = b.slot_id
         WHERE b.type = 'TRIAL' AND s.status = 'COMPLETED' AND s.updated_at >= $1 AND s.updated_at < $2) AS trials,
       (SELECT count(*)::int FROM leads
         WHERE status = 'CONVERTED' AND converted_at >= $1 AND converted_at < $2) AS conversions,
       (SELECT count(*)::int FROM cohort WHERE scheduled_at IS NOT NULL) AS funnel_scheduled,
       (SELECT count(*)::int FROM cohort WHERE trial_completed_at IS NOT NULL) AS funnel_trials,
       (SELECT count(*)::int FROM cohort WHERE status = 'CONVERTED') AS funnel_converted`,
    [from, to],
  )
  const values = result.rows[0]!
  response.json({
    period: { from: from.toISOString(), to: to.toISOString() },
    metrics: { leads: values.leads, bookings: values.bookings, trials: values.trials, conversions: values.conversions },
    funnel: {
      leads: values.leads,
      scheduled: values.funnel_scheduled,
      trialCompleted: values.funnel_trials,
      converted: values.funnel_converted,
      conversionRate: values.leads ? Number(((values.funnel_converted / values.leads) * 100).toFixed(1)) : 0,
    },
  })
}))

adminLeadRouter.get('/', asyncHandler(async (request, response) => {
  const query = listSchema.parse(request.query)
  const { from, to } = period(query)
  const result = await pool.query<{
    id: number; name: string; email: string; phone: string; source: string; status: LeadStatus
    utm_source: string | null; utm_medium: string | null; utm_campaign: string | null
    converted_user_id: number | null; user_name: string | null; created_at: Date; updated_at: Date
  }>(
    `SELECT l.id, l.name, l.email, l.phone, l.source, l.status,
            l.utm_source, l.utm_medium, l.utm_campaign, l.converted_user_id,
            u.name AS user_name, l.created_at, l.updated_at
     FROM leads l
     LEFT JOIN users u ON u.id = l.converted_user_id
     WHERE l.created_at >= $1 AND l.created_at < $2
       AND ($3::lead_status IS NULL OR l.status = $3)
       AND ($4::lead_source IS NULL OR l.source = $4)
     ORDER BY l.created_at DESC
     LIMIT 500`,
    [from, to, query.status ?? null, query.source ?? null],
  )
  response.json({
    leads: result.rows.map((lead) => ({
      id: lead.id, name: lead.name, email: lead.email, phone: lead.phone,
      source: lead.source, status: lead.status,
      utmSource: lead.utm_source, utmMedium: lead.utm_medium, utmCampaign: lead.utm_campaign,
      convertedUserId: lead.converted_user_id, userName: lead.user_name,
      createdAt: lead.created_at.toISOString(), updatedAt: lead.updated_at.toISOString(),
      allowedTransitions: leadTransitions[lead.status],
      allowedCorrections: leadCorrectionTransitions[lead.status],
    })),
  })
}))

adminLeadRouter.patch('/:id/status', asyncHandler(async (request, response) => {
  const leadId = idSchema.parse(request.params.id)
  const input = statusSchema.parse(request.body)
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await client.query<{ status: LeadStatus; converted_user_id: number | null }>('SELECT status, converted_user_id FROM leads WHERE id = $1 FOR UPDATE', [leadId])
    const lead = result.rows[0]
    if (!lead) throw new AppError(404, 'LEAD_NOT_FOUND', 'Lead não encontrado.')
    if (!canTransitionLead(lead.status, input.status)) {
      throw new AppError(409, 'INVALID_LEAD_TRANSITION', `A transição ${lead.status} → ${input.status} não é permitida.`)
    }
    await client.query(
      `UPDATE leads SET status = $2::lead_status,
         scheduled_at = CASE WHEN $2::lead_status IN ('SCHEDULED', 'TRIAL_COMPLETED', 'CONVERTED') THEN COALESCE(scheduled_at, now()) ELSE scheduled_at END,
         trial_completed_at = CASE WHEN $2::lead_status IN ('TRIAL_COMPLETED', 'CONVERTED') THEN COALESCE(trial_completed_at, now()) ELSE trial_completed_at END,
         converted_at = CASE WHEN $2::lead_status = 'CONVERTED' THEN now() ELSE converted_at END,
         updated_at = now()
       WHERE id = $1`,
      [leadId, input.status],
    )
    if (input.status === 'CONVERTED') {
      await recordAnalyticsEvent(client, { eventName: 'lead_converted', leadId, userId: lead.converted_user_id, metadata: { previousStatus: lead.status } })
    }
    await client.query('COMMIT')
    response.json({
      lead: {
        id: leadId,
        status: input.status,
        allowedTransitions: leadTransitions[input.status],
        allowedCorrections: leadCorrectionTransitions[input.status],
      },
    })
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}))

adminLeadRouter.patch('/:id/reopen', asyncHandler(async (request, response) => {
  const leadId = idSchema.parse(request.params.id)
  const input = correctionSchema.parse(request.body)
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await client.query<{ status: LeadStatus }>(
      'SELECT status FROM leads WHERE id = $1 FOR UPDATE',
      [leadId],
    )
    const lead = result.rows[0]
    if (!lead) throw new AppError(404, 'LEAD_NOT_FOUND', 'Lead não encontrado.')
    if (!canCorrectLeadStatus(lead.status, input.status)) {
      throw new AppError(409, 'INVALID_LEAD_CORRECTION', `A correção ${lead.status} → ${input.status} não é permitida.`)
    }

    await client.query(
      `UPDATE leads SET
         status = $2::lead_status,
         scheduled_at = CASE
           WHEN $2::lead_status IN ('SCHEDULED', 'TRIAL_COMPLETED') THEN COALESCE(scheduled_at, now())
           ELSE NULL
         END,
         trial_completed_at = CASE
           WHEN $2::lead_status = 'TRIAL_COMPLETED' THEN COALESCE(trial_completed_at, now())
           ELSE NULL
         END,
         converted_at = NULL,
         updated_at = now()
       WHERE id = $1`,
      [leadId, input.status],
    )
    await client.query(
      `INSERT INTO lead_status_changes
         (lead_id, previous_status, new_status, changed_by, reason)
       VALUES ($1, $2::lead_status, $3::lead_status, $4, $5)`,
      [leadId, lead.status, input.status, request.auth!.userId, input.reason],
    )
    await client.query('COMMIT')
    response.json({
      lead: {
        id: leadId,
        status: input.status,
        allowedTransitions: leadTransitions[input.status],
        allowedCorrections: leadCorrectionTransitions[input.status],
      },
    })
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}))
