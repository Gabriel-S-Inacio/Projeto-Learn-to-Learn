import { Router } from 'express'
import { z } from 'zod'
import { authenticate, authorize } from '../auth/middleware.js'
import { pool } from '../db/client.js'
import { AppError, asyncHandler } from '../http/errors.js'
import { ensureLeadForUser } from '../leads/service.js'
import { recordAnalyticsEvent } from '../analytics/service.js'
import { adminLeadRouter } from './leadRoutes.js'

const createSlotSchema = z.object({
  startsAt: z.iso.datetime({ offset: true }),
  durationMinutes: z.number().int().min(30).max(60).default(60),
  notes: z.string().trim().max(2000).nullable().optional(),
  status: z.enum(['AVAILABLE', 'BLOCKED']).default('AVAILABLE'),
})

const updateSlotSchema = z.object({
  status: z.enum(['AVAILABLE', 'BLOCKED', 'COMPLETED']).optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
}).refine((value) => value.status !== undefined || value.notes !== undefined, 'Informe ao menos uma alteração.')

const idSchema = z.coerce.number().int().positive()

export const adminRouter = Router()
adminRouter.use(authenticate, authorize('ADMIN'))
adminRouter.use('/leads', adminLeadRouter)

adminRouter.get('/schedule', asyncHandler(async (_request, response) => {
  const result = await pool.query<{
    id: number
    starts_at: Date
    duration_minutes: number
    status: string
    notes: string | null
    booking_id: number | null
    student_name: string | null
    student_email: string | null
    student_phone: string | null
  }>(
    `SELECT s.id, s.starts_at, s.duration_minutes, s.status, s.notes,
            b.id AS booking_id, u.name AS student_name, u.email AS student_email, u.phone AS student_phone
     FROM lesson_slots s
     LEFT JOIN lesson_bookings b ON b.slot_id = s.id
     LEFT JOIN users u ON u.id = b.student_id
     ORDER BY s.starts_at ASC`,
  )
  response.json({ slots: result.rows.map((row) => ({
    id: row.id,
    startsAt: row.starts_at.toISOString(),
    durationMinutes: row.duration_minutes,
    status: row.status,
    notes: row.notes,
    booking: row.booking_id ? {
      id: row.booking_id,
      student: { name: row.student_name, email: row.student_email, phone: row.student_phone },
    } : null,
  })) })
}))

adminRouter.post('/schedule', asyncHandler(async (request, response) => {
  const input = createSlotSchema.parse(request.body)
  const startsAt = new Date(input.startsAt)
  if (startsAt.getTime() <= Date.now()) throw new AppError(422, 'PAST_SLOT', 'O horário precisa estar no futuro.')

  const result = await pool.query<{ id: number; starts_at: Date; duration_minutes: number; status: string; notes: string | null }>(
    `INSERT INTO lesson_slots (starts_at, duration_minutes, status, notes)
     VALUES ($1, $2, $3, $4)
     RETURNING id, starts_at, duration_minutes, status, notes`,
    [startsAt, input.durationMinutes, input.status, input.notes ?? null],
  )
  const slot = result.rows[0]!
  response.status(201).json({ slot: { id: slot.id, startsAt: slot.starts_at.toISOString(), durationMinutes: slot.duration_minutes, status: slot.status, notes: slot.notes } })
}))

adminRouter.patch('/schedule/:id', asyncHandler(async (request, response) => {
  const slotId = idSchema.parse(request.params.id)
  const input = updateSlotSchema.parse(request.body)
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await client.query<{ id: number; status: string }>('SELECT id, status FROM lesson_slots WHERE id = $1 FOR UPDATE', [slotId])
    const slot = result.rows[0]
    if (!slot) throw new AppError(404, 'SLOT_NOT_FOUND', 'Horário não encontrado.')

    if (input.status && input.status !== slot.status) {
      const transition = `${slot.status}->${input.status}`
      const allowed = new Set(['AVAILABLE->BLOCKED', 'BLOCKED->AVAILABLE', 'BOOKED->COMPLETED'])
      if (!allowed.has(transition)) {
        throw new AppError(409, 'INVALID_SLOT_TRANSITION', 'Esta alteração de status não é permitida.')
      }
    }

    const updated = await client.query<{ id: number; starts_at: Date; duration_minutes: number; status: string; notes: string | null }>(
      `UPDATE lesson_slots
       SET status = COALESCE($2::lesson_slot_status, status),
           notes = CASE WHEN $3::boolean THEN $4 ELSE notes END,
           updated_at = now()
       WHERE id = $1
       RETURNING id, starts_at, duration_minutes, status, notes`,
      [slotId, input.status ?? null, Object.prototype.hasOwnProperty.call(input, 'notes'), input.notes ?? null],
    )
    if (input.status === 'COMPLETED') {
      const booking = await client.query<{ student_id: number }>('SELECT student_id FROM lesson_bookings WHERE slot_id = $1', [slotId])
      const studentId = booking.rows[0]?.student_id
      if (studentId) {
        await ensureLeadForUser(client, studentId, 'SCHEDULE', 'SCHEDULED')
        const leadId = await ensureLeadForUser(client, studentId, 'SCHEDULE', 'TRIAL_COMPLETED')
        await recordAnalyticsEvent(client, { eventName: 'trial_completed', userId: studentId, leadId, metadata: { slotId } })
      }
    }
    await client.query('COMMIT')
    const value = updated.rows[0]!
    response.json({ slot: { id: value.id, startsAt: value.starts_at.toISOString(), durationMinutes: value.duration_minutes, status: value.status, notes: value.notes } })
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}))
