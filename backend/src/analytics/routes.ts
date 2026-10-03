import { Router } from 'express'
import { z } from 'zod'
import { pool } from '../db/client.js'
import { AppError, asyncHandler } from '../http/errors.js'
import { findSessionUser, SESSION_COOKIE } from '../auth/session.js'
import { findLeadIdForUser, recordAnalyticsEvent } from './service.js'

const publicEventNames = ['page_view', 'cta_clicked', 'schedule_viewed', 'registration_started', 'booking_started'] as const
const forbiddenMetadataKey = /(password|token|cookie|authorization|secret|email|phone)/i
const metadataKeys: Record<(typeof publicEventNames)[number], string[]> = {
  page_view: ['section'],
  cta_clicked: ['cta', 'location'],
  schedule_viewed: ['availability'],
  registration_started: ['form'],
  booking_started: ['slotId'],
}

const eventSchema = z.object({
  eventName: z.enum(publicEventNames),
  sessionId: z.string().trim().min(8).max(128).regex(/^[a-zA-Z0-9_-]+$/),
  path: z.string().trim().startsWith('/').max(2048).optional(),
  utmSource: z.string().trim().max(200).optional(),
  utmMedium: z.string().trim().max(200).optional(),
  utmCampaign: z.string().trim().max(200).optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
})

function validateMetadata(eventName: (typeof publicEventNames)[number], metadata: Record<string, unknown>) {
  if (JSON.stringify(metadata).length > 2048) throw new AppError(422, 'METADATA_TOO_LARGE', 'Os metadados excedem o limite permitido.')
  const allowed = metadataKeys[eventName]
  for (const [key, value] of Object.entries(metadata)) {
    if (!allowed.includes(key) || forbiddenMetadataKey.test(key)) throw new AppError(422, 'INVALID_METADATA', 'Os metadados informados não são permitidos para este evento.')
    if (!['string', 'number', 'boolean'].includes(typeof value)) throw new AppError(422, 'INVALID_METADATA', 'Os metadados devem usar apenas valores simples.')
    if (typeof value === 'string' && (value.length > 100 || !/^[a-zA-Z0-9_./:-]+$/.test(value))) {
      throw new AppError(422, 'SENSITIVE_METADATA', 'O valor informado não é seguro para analytics.')
    }
  }
}

export const analyticsRouter = Router()

analyticsRouter.post('/events', asyncHandler(async (request, response) => {
  const input = eventSchema.parse(request.body)
  validateMetadata(input.eventName, input.metadata)

  const token = request.cookies?.[SESSION_COOKIE]
  const auth = typeof token === 'string' ? await findSessionUser(token) : undefined
  const leadId = auth ? await findLeadIdForUser(pool, auth.userId) : null
  await recordAnalyticsEvent(pool, { ...input, userId: auth?.userId, leadId })
  response.status(202).json({ accepted: true })
}))
