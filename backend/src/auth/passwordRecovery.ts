import { createHmac, randomBytes } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { config } from '../config.js'
import { pool } from '../db/client.js'
import { AppError } from '../http/errors.js'
import { ResendEmailProvider } from '../notifications/emailProvider.js'

const RESET_TOKEN_DURATION_MS = 30 * 60 * 1000
const emailProvider = new ResendEmailProvider()

export const PASSWORD_RESET_PUBLIC_MESSAGE = 'Se existir uma conta com esse e-mail, enviaremos as instruções de recuperação.'

export function hashPasswordResetToken(token: string) {
  return createHmac('sha256', config.AUTH_SECRET).update(`password-reset:${token}`).digest('hex')
}

export async function requestPasswordReset(email: string) {
  const userResult = await pool.query<{ id: number; email: string }>(
    'SELECT id, email FROM users WHERE lower(email) = lower($1) LIMIT 1',
    [email],
  )
  const user = userResult.rows[0]
  if (!user) return

  const token = randomBytes(32).toString('base64url')
  const tokenHash = hashPasswordResetToken(token)
  const expiresAt = new Date(Date.now() + RESET_TOKEN_DURATION_MS)
  const client = await pool.connect()
  let tokenId: number
  try {
    await client.query('BEGIN')
    await client.query(
      'UPDATE password_reset_tokens SET used_at = now() WHERE user_id = $1 AND used_at IS NULL',
      [user.id],
    )
    const inserted = await client.query<{ id: number }>(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3) RETURNING id`,
      [user.id, tokenHash, expiresAt],
    )
    tokenId = inserted.rows[0]!.id
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }

  const resetUrl = new URL('/reset-password', config.FRONTEND_ORIGIN)
  resetUrl.searchParams.set('token', token)
  const delivery = await emailProvider.send({
    to: user.email,
    subject: 'Recuperação de senha',
    text: `Recebemos uma solicitação para redefinir sua senha. Use este link nos próximos 30 minutos: ${resetUrl.toString()}\n\nSe você não fez esta solicitação, ignore esta mensagem.`,
    idempotencyKey: `password-reset/${tokenId}`,
  })

  if (delivery.status !== 'SENT') {
    console.warn('Password reset notification not sent', {
      provider: delivery.provider,
      status: delivery.status,
      failureCode: delivery.failureCode ?? 'UNKNOWN',
    })
  }
}

export async function resetPassword(token: string, password: string) {
  const tokenHash = hashPasswordResetToken(token)
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const tokenResult = await client.query<{ id: number; user_id: number; expires_at: Date; used_at: Date | null }>(
      `SELECT id, user_id, expires_at, used_at
       FROM password_reset_tokens
       WHERE token_hash = $1
       FOR UPDATE`,
      [tokenHash],
    )
    const resetToken = tokenResult.rows[0]
    if (!resetToken || resetToken.used_at || resetToken.expires_at.getTime() <= Date.now()) {
      throw new AppError(400, 'INVALID_RESET_TOKEN', 'Este link de recuperação é inválido ou expirou.')
    }

    const passwordHash = await bcrypt.hash(password, 12)
    await client.query('UPDATE users SET password_hash = $2, updated_at = now() WHERE id = $1', [resetToken.user_id, passwordHash])
    await client.query('UPDATE password_reset_tokens SET used_at = now() WHERE id = $1', [resetToken.id])
    await client.query('DELETE FROM auth_sessions WHERE user_id = $1', [resetToken.user_id])
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
