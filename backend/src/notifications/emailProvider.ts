import { config } from '../config.js'
import type { DeliveryResult, EmailMessage, EmailProvider } from './types.js'

const RESEND_URL = 'https://api.resend.com/emails'

export class ResendEmailProvider implements EmailProvider {
  async send(message: EmailMessage): Promise<DeliveryResult> {
    if (!config.RESEND_API_KEY || !config.EMAIL_FROM) {
      return { status: 'SKIPPED', provider: 'resend', failureCode: 'PROVIDER_DISABLED' }
    }

    try {
      const response = await fetch(RESEND_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': message.idempotencyKey,
        },
        body: JSON.stringify({
          from: config.EMAIL_FROM,
          to: [message.to],
          subject: message.subject,
          text: message.text,
        }),
        signal: AbortSignal.timeout(8_000),
      })
      if (!response.ok) return { status: 'FAILED', provider: 'resend', failureCode: `HTTP_${response.status}` }
      return { status: 'SENT', provider: 'resend' }
    } catch {
      return { status: 'FAILED', provider: 'resend', failureCode: 'NETWORK_ERROR' }
    }
  }
}

