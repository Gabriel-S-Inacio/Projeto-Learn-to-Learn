import type { PoolClient } from 'pg'
import { pool } from '../db/client.js'
import { AppError } from '../http/errors.js'
import { ensureLeadForUser } from '../leads/service.js'
import { recordAnalyticsEvent } from '../analytics/service.js'
import { notificationService } from '../notifications/service.js'

async function transaction<T>(operation: (client: PoolClient) => Promise<T>) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await operation(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function createBooking(studentId: number, slotId: number, sessionId?: string) {
  const result = await transaction(async (client) => {
    const slotResult = await client.query<{ id: number }>(
      `UPDATE lesson_slots
       SET status = 'BOOKED', updated_at = now()
       WHERE id = $1 AND status = 'AVAILABLE' AND type = 'TRIAL' AND starts_at > now()
       RETURNING id`,
      [slotId],
    )

    if (!slotResult.rowCount) {
      const exists = await client.query('SELECT 1 FROM lesson_slots WHERE id = $1', [slotId])
      if (!exists.rowCount) throw new AppError(404, 'SLOT_NOT_FOUND', 'Horário não encontrado.')
      throw new AppError(409, 'SLOT_UNAVAILABLE', 'Este horário não está mais disponível.')
    }

    const booking = await client.query<{ id: number }>(
      `INSERT INTO lesson_bookings (slot_id, student_id)
       VALUES ($1, $2)
       RETURNING id`,
      [slotId, studentId],
    )
    const leadId = await ensureLeadForUser(client, studentId, 'SCHEDULE', 'SCHEDULED')
    await recordAnalyticsEvent(client, {
      eventName: 'booking_completed', userId: studentId, leadId, sessionId,
      metadata: { bookingId: booking.rows[0]!.id, slotId },
    })
    return { bookingId: booking.rows[0]!.id, slotId }
  })
  await notificationService.sendBookingConfirmation(result.bookingId)
  return result
}

export function isAtLeast24HoursAway(startsAt: Date, now = new Date()) {
  return startsAt.getTime() >= now.getTime() + 24 * 60 * 60 * 1000
}

export async function cancelBooking(studentId: number, bookingId: number, now = new Date()) {
  return transaction(async (client) => {
    const result = await client.query<{
      id: number
      student_id: number
      slot_id: number
      starts_at: Date
      status: string
      type: string
    }>(
      `SELECT b.id, b.student_id, b.slot_id, s.starts_at, s.status, s.type
       FROM lesson_bookings b
       JOIN lesson_slots s ON s.id = b.slot_id
       WHERE b.id = $1
       FOR UPDATE OF b, s`,
      [bookingId],
    )
    const booking = result.rows[0]
    if (!booking) throw new AppError(404, 'BOOKING_NOT_FOUND', 'Reserva não encontrada.')
    if (booking.student_id !== studentId) throw new AppError(403, 'FORBIDDEN', 'Esta reserva pertence a outro aluno.')
    if (booking.status !== 'BOOKED') throw new AppError(409, 'BOOKING_NOT_ACTIVE', 'Esta reserva não pode mais ser cancelada.')
    if (booking.type !== 'TRIAL') throw new AppError(409, 'REGULAR_LESSON_MANAGED_BY_ADMIN', 'Aulas regulares são gerenciadas pela administração.')
    if (!isAtLeast24HoursAway(booking.starts_at, now)) {
      throw new AppError(409, 'CANCELLATION_WINDOW_CLOSED', 'Cancelamentos são permitidos até 24 horas antes da aula.')
    }

    await client.query('DELETE FROM lesson_bookings WHERE id = $1', [bookingId])
    await client.query(
      `UPDATE lesson_slots SET status = 'AVAILABLE', updated_at = now()
       WHERE id = $1 AND status = 'BOOKED'`,
      [booking.slot_id],
    )
  })
}

export async function rescheduleBooking(studentId: number, bookingId: number, newSlotId: number, now = new Date()) {
  return transaction(async (client) => {
    const result = await client.query<{
      id: number
      student_id: number
      slot_id: number
      starts_at: Date
      status: string
      type: string
    }>(
      `SELECT b.id, b.student_id, b.slot_id, s.starts_at, s.status, s.type
       FROM lesson_bookings b
       JOIN lesson_slots s ON s.id = b.slot_id
       WHERE b.id = $1
       FOR UPDATE OF b, s`,
      [bookingId],
    )
    const booking = result.rows[0]
    if (!booking) throw new AppError(404, 'BOOKING_NOT_FOUND', 'Reserva não encontrada.')
    if (booking.student_id !== studentId) throw new AppError(403, 'FORBIDDEN', 'Esta reserva pertence a outro aluno.')
    if (booking.status !== 'BOOKED') throw new AppError(409, 'BOOKING_NOT_ACTIVE', 'Esta reserva não pode mais ser remarcada.')
    if (booking.type !== 'TRIAL') throw new AppError(409, 'REGULAR_LESSON_MANAGED_BY_ADMIN', 'Aulas regulares são gerenciadas pela administração.')
    if (!isAtLeast24HoursAway(booking.starts_at, now)) {
      throw new AppError(409, 'RESCHEDULE_WINDOW_CLOSED', 'Remarcações são permitidas até 24 horas antes da aula.')
    }
    if (booking.slot_id === newSlotId) throw new AppError(422, 'SAME_SLOT', 'Escolha um horário diferente do atual.')

    const newSlot = await client.query<{ id: number }>(
      `UPDATE lesson_slots
       SET status = 'BOOKED', updated_at = now()
       WHERE id = $1 AND status = 'AVAILABLE' AND type = 'TRIAL' AND starts_at > now()
       RETURNING id`,
      [newSlotId],
    )
    if (!newSlot.rowCount) {
      const exists = await client.query('SELECT 1 FROM lesson_slots WHERE id = $1', [newSlotId])
      if (!exists.rowCount) throw new AppError(404, 'SLOT_NOT_FOUND', 'Novo horário não encontrado.')
      throw new AppError(409, 'SLOT_UNAVAILABLE', 'O novo horário não está mais disponível.')
    }

    await client.query('UPDATE lesson_bookings SET slot_id = $1, updated_at = now() WHERE id = $2', [newSlotId, bookingId])
    await client.query(
      `UPDATE lesson_slots SET status = 'AVAILABLE', updated_at = now()
       WHERE id = $1 AND status = 'BOOKED'`,
      [booking.slot_id],
    )
    return { bookingId, slotId: newSlotId }
  })
}
