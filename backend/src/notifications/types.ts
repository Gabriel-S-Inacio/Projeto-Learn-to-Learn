export type DeliveryStatus = 'SENT' | 'FAILED' | 'SKIPPED'

export type DeliveryResult = {
  status: DeliveryStatus
  provider: string
  failureCode?: string
}

export type EmailMessage = {
  to: string
  subject: string
  text: string
  idempotencyKey: string
}

export interface EmailProvider {
  send(message: EmailMessage): Promise<DeliveryResult>
}

export type WhatsAppMessage = {
  to: string
  text: string
}

export interface WhatsAppProvider {
  send(message: WhatsAppMessage): Promise<DeliveryResult>
}

