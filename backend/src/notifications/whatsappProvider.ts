import type { DeliveryResult, WhatsAppMessage, WhatsAppProvider } from './types.js'

export class DisabledWhatsAppProvider implements WhatsAppProvider {
  async send(_message: WhatsAppMessage): Promise<DeliveryResult> {
    return { status: 'SKIPPED', provider: 'disabled', failureCode: 'PROVIDER_DISABLED' }
  }
}

