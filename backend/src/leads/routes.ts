import { Router } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../http/errors.js'
import { createOrMergePublicLead } from './service.js'

const leadSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(320),
  phone: z.string().trim().min(8).max(32),
  source: z.literal('FORM').default('FORM'),
  utmSource: z.string().trim().max(200).optional(),
  utmMedium: z.string().trim().max(200).optional(),
  utmCampaign: z.string().trim().max(200).optional(),
  sessionId: z.string().trim().min(8).max(128).regex(/^[a-zA-Z0-9_-]+$/).optional(),
})

export const leadsRouter = Router()

leadsRouter.post('/', asyncHandler(async (request, response) => {
  const lead = await createOrMergePublicLead(leadSchema.parse(request.body))
  response.status(lead.created ? 201 : 200).json({ lead: { status: lead.status, created: lead.created } })
}))
