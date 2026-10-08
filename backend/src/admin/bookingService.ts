import { pool } from '../db/client.js'
import { AppError } from '../http/errors.js'
import { notificationService } from '../notifications/service.js'

export async function cancelBookingAsAdmin(adminId: number, bookingId: number, reason: string) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await client.query<{
      id: number
      slot_id: number
      slot_status: string
      cancelled_at: Date | null
    }>(
      `SELECT b.id, b.slot_id, b.cancelled_at, s.status AS slot_status
       FROM lesson_bookings b
       JOIN lesson_slots s ON s.id = b.slot_id
       WHERE b.id = $1
       FOR UPDATE OF b, s`,
      [bookingId],
    )
    const booking = result.rows[0]
    if (!booking) throw new AppError(404, 'BOOKING_NOT_FOUND', 'Reserva não encontrada.')
    if (booking.cancelled_at || booking.slot_status !== 'BOOKED') {
      throw new AppError(409, 'BOOKING_NOT_ACTIVE', 'Esta reserva não pode mais ser cancelada administrativamente.')
    }

    await client.query(
      `UPDATE lesson_bookings
       SET cancellation_reason = $2, cancelled_by = $3, cancelled_at = now(), updated_at = now()
       WHERE id = $1`,
      [bookingId, reason, adminId],
    )
    await client.query(
      `UPDATE lesson_slots
       SET status = 'BLOCKED', updated_at = now()
       WHERE id = $1 AND status = 'BOOKED'`,
      [booking.slot_id],
    )
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }

  await notificationService.sendAdministrativeCancellation(bookingId)
  return { bookingId }
}

