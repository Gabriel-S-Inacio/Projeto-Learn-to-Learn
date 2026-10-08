import bcrypt from 'bcryptjs'
import { Router } from 'express'
import { eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db, pool } from '../db/client.js'
import { users } from '../db/schema.js'
import { AppError, asyncHandler } from '../http/errors.js'
import { recordAnalyticsEvent } from '../analytics/service.js'
import { ensureLeadForUser } from '../leads/service.js'
import { createRateLimit } from '../security/rateLimit.js'
import { verifyTurnstile } from '../security/turnstile.js'
import { authenticate } from './middleware.js'
import { clearSessionCookie, createSession, deleteSession, SESSION_COOKIE, setSessionCookie } from './session.js'

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Informe seu nome.').max(120),
  email: z.string().trim().toLowerCase().email('Informe um e-mail válido.').max(320),
  phone: z.string().trim().min(8, 'Informe um telefone válido.').max(32),
  password: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres.').max(128),
  utmSource: z.string().trim().max(200).optional(),
  utmMedium: z.string().trim().max(200).optional(),
  utmCampaign: z.string().trim().max(200).optional(),
  sessionId: z.string().trim().min(8).max(128).regex(/^[a-zA-Z0-9_-]+$/).optional(),
  turnstileToken: z.string().trim().max(2048).optional(),
})

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Informe um e-mail válido.'),
  password: z.string().min(1, 'Informe sua senha.').max(128),
  turnstileToken: z.string().trim().max(2048).optional(),
})

const registerRateLimit = createRateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  code: 'REGISTER_RATE_LIMITED',
  message: 'Muitas tentativas de cadastro. Aguarde antes de tentar novamente.',
})

const loginRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  code: 'LOGIN_RATE_LIMITED',
  message: 'Muitas tentativas de login. Aguarde antes de tentar novamente.',
})

function publicUser(user: { id: number; name: string; email: string; phone: string | null; role: 'STUDENT' | 'ADMIN' }) {
  return { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role }
}

export const authRouter = Router()

authRouter.post('/register', registerRateLimit, asyncHandler(async (request, response) => {
  const input = registerSchema.parse(request.body)
  await verifyTurnstile(input.turnstileToken, request.ip, 'register')
  const [existing] = await db.select({ id: users.id }).from(users).where(sql`lower(${users.email}) = ${input.email}`).limit(1)
  if (existing) throw new AppError(409, 'EMAIL_IN_USE', 'Já existe uma conta com este e-mail.')

  const passwordHash = await bcrypt.hash(input.password, 12)
  const client = await pool.connect()
  let user: { id: number; name: string; email: string; phone: string | null; role: 'STUDENT' | 'ADMIN' }
  try {
    await client.query('BEGIN')
    const result = await client.query<typeof user>(
      `INSERT INTO users (name, email, phone, password_hash, role)
       VALUES ($1, $2, $3, $4, 'STUDENT')
       RETURNING id, name, email, phone, role`,
      [input.name, input.email, input.phone, passwordHash],
    )
    user = result.rows[0]!
    const leadId = await ensureLeadForUser(client, user.id, 'REGISTER', 'INTERESTED')
    await client.query(
      `UPDATE leads SET utm_source = COALESCE(utm_source, $2), utm_medium = COALESCE(utm_medium, $3),
        utm_campaign = COALESCE(utm_campaign, $4), updated_at = now() WHERE id = $1`,
      [leadId, input.utmSource ?? null, input.utmMedium ?? null, input.utmCampaign ?? null],
    )
    if (input.sessionId) await client.query('UPDATE analytics_events SET user_id = $1, lead_id = $2 WHERE session_id = $3', [user.id, leadId, input.sessionId])
    await recordAnalyticsEvent(client, {
      eventName: 'registration_completed', userId: user.id, leadId, sessionId: input.sessionId,
      utmSource: input.utmSource, utmMedium: input.utmMedium, utmCampaign: input.utmCampaign,
    })
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }

  const session = await createSession(user.id)
  setSessionCookie(response, session.token, session.expiresAt)
  response.status(201).json({ user: publicUser(user) })
}))

authRouter.post('/login', loginRateLimit, asyncHandler(async (request, response) => {
  const input = loginSchema.parse(request.body)
  await verifyTurnstile(input.turnstileToken, request.ip, 'login')
  const [user] = await db.select().from(users).where(sql`lower(${users.email}) = ${input.email}`).limit(1)
  if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'E-mail ou senha incorretos.')
  }

  const session = await createSession(user.id)
  setSessionCookie(response, session.token, session.expiresAt)
  response.json({ user: publicUser(user) })
}))

authRouter.post('/logout', asyncHandler(async (request, response) => {
  const token = request.cookies?.[SESSION_COOKIE]
  if (typeof token === 'string') await deleteSession(token)
  clearSessionCookie(response)
  response.status(204).send()
}))

authRouter.get('/me', authenticate, asyncHandler(async (request, response) => {
  const [user] = await db.select().from(users).where(eq(users.id, request.auth!.userId)).limit(1)
  if (!user) throw new AppError(401, 'UNAUTHORIZED', 'Sua sessão não é mais válida.')
  response.json({ user: publicUser(user) })
}))
