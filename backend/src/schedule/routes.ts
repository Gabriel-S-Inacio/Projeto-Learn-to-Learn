import { Router } from 'express'
import { pool } from '../db/client.js'
import { asyncHandler } from '../http/errors.js'

export const scheduleRouter = Router()

scheduleRouter.get('/available', asyncHandler(async (_request, response) => {
  const result = await pool.query<{
    id: number
    starts_at: Date
    duration_minutes: number
    status: 'AVAILABLE'
  }>(`SELECT id, starts_at, duration_minutes, status
      FROM lesson_slots
      WHERE starts_at > now() AND status = 'AVAILABLE' AND type IS NULL
      ORDER BY starts_at ASC`)

  response.json({
    slots: result.rows.map((slot) => ({
      id: slot.id,
      startsAt: slot.starts_at.toISOString(),
      durationMinutes: slot.duration_minutes,
      status: slot.status,
    })),
  })
}))

