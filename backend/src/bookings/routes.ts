import { Router } from 'express'
import { z } from 'zod'
import { authenticate, authorize } from '../auth/middleware.js'
import { pool } from '../db/client.js'
import { asyncHandler } from '../http/errors.js'
import { cancelBooking, createBooking, rescheduleBooking } from './service.js'

const idSchema = z.coerce.number().int().positive()
const createSchema = z.object({
  slotId: z.number().int().positive(),
  sessionId: z.string().trim().min(8).max(128).regex(/^[a-zA-Z0-9_-]+$/).optional(),
})
const rescheduleSchema = z.object({ newSlotId: z.number().int().positive() })

export const bookingsRouter = Router()
bookingsRouter.use(authenticate, authorize('STUDENT'))

bookingsRouter.post('/', asyncHandler(async (request, response) => {
  const input = createSchema.parse(request.body)
  const booking = await createBooking(request.auth!.userId, input.slotId, input.sessionId)
  response.status(201).json({ booking })
}))

bookingsRouter.get('/me', asyncHandler(async (request, response) => {
  const result = await pool.query<{
    booking_id: number
    slot_id: number
    starts_at: Date
    duration_minutes: number
    type: 'TRIAL' | 'REGULAR'
    status: string
    cancellation_reason: string | null
    cancelled_at: Date | null
  }>(
    `SELECT b.id AS booking_id, s.id AS slot_id, s.starts_at, s.duration_minutes, s.type, s.status,
            b.cancellation_reason, b.cancelled_at
     FROM lesson_bookings b
     JOIN lesson_slots s ON s.id = b.slot_id
     WHERE b.student_id = $1
     ORDER BY s.starts_at ASC`,
    [request.auth!.userId],
  )
  response.json({ lessons: result.rows.map((row) => ({
    bookingId: row.booking_id,
    slotId: row.slot_id,
    startsAt: row.starts_at.toISOString(),
    durationMinutes: row.duration_minutes,
    type: row.type,
    status: row.cancelled_at ? 'CANCELLED' : row.status,
    cancellation: row.cancelled_at ? {
      reason: row.cancellation_reason,
      cancelledAt: row.cancelled_at.toISOString(),
    } : null,
  })) })
}))

bookingsRouter.delete('/:id', asyncHandler(async (request, response) => {
  await cancelBooking(request.auth!.userId, idSchema.parse(request.params.id))
  response.status(204).send()
}))

bookingsRouter.patch('/:id/reschedule', asyncHandler(async (request, response) => {
  const bookingId = idSchema.parse(request.params.id)
  const input = rescheduleSchema.parse(request.body)
  const booking = await rescheduleBooking(request.auth!.userId, bookingId, input.newSlotId)
  response.json({ booking })
}))
