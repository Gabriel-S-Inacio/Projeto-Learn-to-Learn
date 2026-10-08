import { pool } from '../db/client.js'
import { ResendEmailProvider } from './emailProvider.js'
import type { DeliveryResult, EmailProvider, WhatsAppProvider } from './types.js'
import { DisabledWhatsAppProvider } from './whatsappProvider.js'

type NotificationEvent = 'BOOKING_CONFIRMATION' | 'ADMIN_CANCELLATION'
type BookingDetails = {
  booking_id: number
  student_id: number
  email: string
  phone: string | null
  starts_at: Date
  duration_minutes: number
  type: 'TRIAL' | 'REGULAR'
  cancellation_reason: string | null
}

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  dateStyle: 'full',
})
const timeFormatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  hour: '2-digit',
  minute: '2-digit',
})

function lessonTypeLabel(type: BookingDetails['type']) {
  return type === 'REGULAR' ? 'aula regular' : 'aula experimental'
}

export class NotificationService {
  constructor(
    private readonly emailProvider: EmailProvider,
    private readonly whatsappProvider: WhatsAppProvider,
  ) {}

  async sendBookingConfirmation(bookingId: number) {
    await this.notify(bookingId, 'BOOKING_CONFIRMATION')
  }

  async sendAdministrativeCancellation(bookingId: number) {
    await this.notify(bookingId, 'ADMIN_CANCELLATION')
  }

  private async notify(bookingId: number, event: NotificationEvent) {
    try {
      const details = await this.getBookingDetails(bookingId)
      if (!details) return
      const date = dateFormatter.format(details.starts_at)
      const time = timeFormatter.format(details.starts_at)
      const type = lessonTypeLabel(details.type)
      const confirmation = `Sua ${type} está confirmada para ${date}, às ${time}, com duração de ${details.duration_minutes} minutos.`
      const cancellation = `Sua ${type} de ${date}, às ${time}, foi cancelada pela administração. Motivo: ${details.cancellation_reason || 'Não informado'}.`
      const text = event === 'BOOKING_CONFIRMATION' ? confirmation : cancellation
      const subject = event === 'BOOKING_CONFIRMATION' ? 'Confirmação da sua aula' : 'Cancelamento da sua aula'

      const emailResult = await this.safeSend(() => this.emailProvider.send({
        to: details.email,
        subject,
        text,
        idempotencyKey: `${event.toLowerCase()}/${details.booking_id}`,
      }), 'email')
      await this.audit(details, event, 'EMAIL', emailResult)

      const whatsappResult = details.phone
        ? await this.safeSend(() => this.whatsappProvider.send({ to: details.phone!, text }), 'whatsapp')
        : { status: 'SKIPPED', provider: 'disabled', failureCode: 'RECIPIENT_UNAVAILABLE' } as DeliveryResult
      await this.audit(details, event, 'WHATSAPP', whatsappResult)
    } catch {
      // Notifications are best-effort and must never change the booking transaction outcome.
    }
  }

  private async safeSend(operation: () => Promise<DeliveryResult>, provider: string): Promise<DeliveryResult> {
    try {
      return await operation()
    } catch {
      return { status: 'FAILED', provider, failureCode: 'PROVIDER_ERROR' }
    }
  }

  private async getBookingDetails(bookingId: number) {
    const result = await pool.query<BookingDetails>(
      `SELECT b.id AS booking_id, b.student_id, u.email, u.phone, s.starts_at, s.duration_minutes, s.type,
              b.cancellation_reason
       FROM lesson_bookings b
       JOIN users u ON u.id = b.student_id
       JOIN lesson_slots s ON s.id = b.slot_id
       WHERE b.id = $1`,
      [bookingId],
    )
    return result.rows[0]
  }

  private async audit(details: BookingDetails, event: NotificationEvent, channel: 'EMAIL' | 'WHATSAPP', result: DeliveryResult) {
    await pool.query(
      `INSERT INTO notification_deliveries
         (booking_id, user_id, channel, event, status, provider, failure_code)
       VALUES ($1, $2, $3, $4, $5::notification_delivery_status, $6, $7)`,
      [details.booking_id, details.student_id, channel, event, result.status, result.provider, result.failureCode ?? null],
    )
  }
}

export const notificationService = new NotificationService(
  new ResendEmailProvider(),
  new DisabledWhatsAppProvider(),
)

