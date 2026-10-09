import { Router } from 'express'
import { z } from 'zod'
import { authenticate, authorize } from '../auth/middleware.js'
import { pool } from '../db/client.js'
import { AppError, asyncHandler } from '../http/errors.js'
import { ensureLeadForUser } from '../leads/service.js'
import { recordAnalyticsEvent } from '../analytics/service.js'
import { adminLeadRouter } from './leadRoutes.js'
import { cancelBookingAsAdmin } from './bookingService.js'
import { notificationService } from '../notifications/service.js'

const createSlotSchema = z.object({
  startsAt: z.iso.datetime({ offset: true }),
  durationMinutes: z.number().int().min(30).max(60).default(60),
  notes: z.string().trim().max(2000).nullable().optional(),
  status: z.enum(['AVAILABLE', 'BLOCKED']).default('AVAILABLE'),
})

const createLessonSchema = z.object({
  studentId: z.number().int().positive(),
  startsAt: z.iso.datetime({ offset: true }),
  durationMinutes: z.number().int().min(30).max(60).default(60),
  type: z.literal('REGULAR'),
  notes: z.string().trim().max(2000).nullable().optional(),
})

const updateSlotSchema = z.object({
  status: z.enum(['AVAILABLE', 'BLOCKED', 'COMPLETED']).optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
}).refine((value) => value.status !== undefined || value.notes !== undefined, 'Informe ao menos uma alteração.')

const idSchema = z.coerce.number().int().positive()
const cancelBookingSchema = z.object({
  reason: z.string().trim().min(5, 'Informe um motivo com pelo menos 5 caracteres.').max(500),
})

export const adminRouter = Router()
adminRouter.use(authenticate, authorize('ADMIN'))
adminRouter.use('/leads', adminLeadRouter)

adminRouter.get('/schedule', asyncHandler(async (_request, response) => {
  const result = await pool.query<{
    id: number
    starts_at: Date
    duration_minutes: number
    booking_type: 'TRIAL' | 'REGULAR' | null
    status: string
    notes: string | null
    booking_id: number | null
    student_name: string | null
    student_email: string | null
    student_phone: string | null
    cancellation_reason: string | null
    cancelled_at: Date | null
    cancelled_by_name: string | null
  }>(
    `SELECT s.id, s.starts_at, s.duration_minutes, s.status, s.notes, b.type AS booking_type,
            b.id AS booking_id, u.name AS student_name, u.email AS student_email, u.phone AS student_phone,
            b.cancellation_reason, b.cancelled_at, cancelled_by.name AS cancelled_by_name
     FROM lesson_slots s
     LEFT JOIN lesson_bookings b ON b.slot_id = s.id
     LEFT JOIN users u ON u.id = b.student_id
     LEFT JOIN users cancelled_by ON cancelled_by.id = b.cancelled_by
     ORDER BY s.starts_at ASC`,
  )
  response.json({ slots: result.rows.map((row) => ({
    id: row.id,
    startsAt: row.starts_at.toISOString(),
    durationMinutes: row.duration_minutes,
    type: row.booking_type,
    status: row.status,
    notes: row.notes,
    booking: row.booking_id ? {
      id: row.booking_id,
      student: { name: row.student_name, email: row.student_email, phone: row.student_phone },
      cancellation: row.cancelled_at ? {
        reason: row.cancellation_reason,
        cancelledAt: row.cancelled_at.toISOString(),
        cancelledBy: row.cancelled_by_name,
      } : null,
    } : null,
  })) })
}))

adminRouter.get('/students/converted', asyncHandler(async (_request, response) => {
  const result = await pool.query<{ id: number; name: string; email: string }>(
    `SELECT u.id, u.name, u.email
     FROM users u
     JOIN leads l ON l.converted_user_id = u.id
     WHERE u.role = 'STUDENT' AND l.status = 'CONVERTED'
     ORDER BY u.name ASC, u.id ASC`,
  )
  response.json({ students: result.rows })
}))

adminRouter.post('/lessons', asyncHandler(async (request, response) => {
  const input = createLessonSchema.parse(request.body)
  const startsAt = new Date(input.startsAt)
  if (startsAt.getTime() <= Date.now()) throw new AppError(422, 'PAST_LESSON', 'A aula precisa estar no futuro.')

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const userResult = await client.query<{ id: number; role: 'STUDENT' | 'ADMIN'; lead_id: number | null; lead_status: string | null }>(
      `SELECT u.id, u.role, l.id AS lead_id, l.status AS lead_status
       FROM users u
       LEFT JOIN leads l ON l.converted_user_id = u.id
       WHERE u.id = $1
       FOR UPDATE OF u`,
      [input.studentId],
    )
    const student = userResult.rows[0]
    if (!student) throw new AppError(404, 'USER_NOT_FOUND', 'Usuário não encontrado.')
    if (student.role !== 'STUDENT') throw new AppError(422, 'USER_NOT_STUDENT', 'A aula regular só pode ser atribuída a um aluno.')
    if (!student.lead_id) throw new AppError(409, 'STUDENT_WITHOUT_LEAD', 'O aluno não possui um lead associado.')
    if (student.lead_status !== 'CONVERTED') throw new AppError(409, 'STUDENT_NOT_CONVERTED', 'A aula regular exige um aluno com lead convertido.')

    const slotResult = await client.query<{
      id: number
      starts_at: Date
      duration_minutes: number
      status: 'BOOKED'
      notes: string | null
    }>(
      `INSERT INTO lesson_slots (starts_at, duration_minutes, status, notes)
       VALUES ($1, $2, 'BOOKED', $3)
       ON CONFLICT (starts_at) DO NOTHING
       RETURNING id, starts_at, duration_minutes, status, notes`,
      [startsAt, input.durationMinutes, input.notes ?? null],
    )
    const slot = slotResult.rows[0]
    if (!slot) throw new AppError(409, 'LESSON_TIME_CONFLICT', 'Já existe uma aula ou horário neste momento.')

    const bookingResult = await client.query<{ id: number }>(
      `INSERT INTO lesson_bookings (slot_id, student_id, type)
       VALUES ($1, $2, 'REGULAR')
       RETURNING id`,
      [slot.id, input.studentId],
    )
    await client.query('COMMIT')
    await notificationService.sendBookingConfirmation(bookingResult.rows[0]!.id)
    response.status(201).json({
      lesson: {
        id: slot.id,
        startsAt: slot.starts_at.toISOString(),
        durationMinutes: slot.duration_minutes,
        type: 'REGULAR',
        status: slot.status,
        notes: slot.notes,
        bookingId: bookingResult.rows[0]!.id,
        studentId: input.studentId,
      },
    })
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}))

adminRouter.post('/bookings/:id/cancel', asyncHandler(async (request, response) => {
  const bookingId = idSchema.parse(request.params.id)
  const input = cancelBookingSchema.parse(request.body)
  const cancellation = await cancelBookingAsAdmin(request.auth!.userId, bookingId, input.reason)
  response.json({ cancellation })
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
    const result = await client.query<{ id: number; status: string; booking_type: 'TRIAL' | 'REGULAR' | null; has_cancellation: boolean }>(
      `SELECT s.id, s.status,
              (SELECT b.type FROM lesson_bookings b WHERE b.slot_id = s.id LIMIT 1) AS booking_type,
              EXISTS (
                SELECT 1 FROM lesson_bookings b
                WHERE b.slot_id = s.id AND b.cancelled_at IS NOT NULL
              ) AS has_cancellation
       FROM lesson_slots s
       WHERE s.id = $1
       FOR UPDATE`,
      [slotId],
    )
    const slot = result.rows[0]
    if (!slot) throw new AppError(404, 'SLOT_NOT_FOUND', 'Horário não encontrado.')

    if (input.status && input.status !== slot.status) {
      if (input.status === 'AVAILABLE' && slot.has_cancellation) {
        throw new AppError(409, 'CANCELLED_BOOKING_SLOT_LOCKED', 'Um horário com cancelamento administrativo não pode ser liberado.')
      }
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
    if (input.status === 'COMPLETED' && slot.booking_type === 'TRIAL') {
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
    response.json({ slot: { id: value.id, startsAt: value.starts_at.toISOString(), durationMinutes: value.duration_minutes, type: slot.booking_type, status: value.status, notes: value.notes } })
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}))
