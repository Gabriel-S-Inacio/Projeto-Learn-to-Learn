import { config } from '../config.js'
import { AppError } from '../http/errors.js'

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

type TurnstileResult = {
  success?: boolean
  action?: string
}

export async function verifyTurnstile(token: string | undefined, remoteIp: string | undefined, expectedAction: 'login' | 'register') {
  if (!token) throw new AppError(400, 'ANTIBOT_TOKEN_REQUIRED', 'Conclua a verificação de segurança.')
  if (!config.TURNSTILE_SECRET_KEY) {
    throw new AppError(503, 'ANTIBOT_UNAVAILABLE', 'A verificação de segurança não está configurada.')
  }

  let response: Response
  try {
    response = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: config.TURNSTILE_SECRET_KEY, response: token, remoteip: remoteIp }),
      signal: AbortSignal.timeout(5_000),
    })
  } catch {
    throw new AppError(503, 'ANTIBOT_UNAVAILABLE', 'Não foi possível validar a verificação de segurança.')
  }

  if (!response.ok) throw new AppError(503, 'ANTIBOT_UNAVAILABLE', 'Não foi possível validar a verificação de segurança.')
  const result = await response.json() as TurnstileResult
  if (!result.success || (result.action && result.action !== expectedAction)) {
    throw new AppError(403, 'ANTIBOT_FAILED', 'A verificação de segurança falhou. Tente novamente.')
  }
}

