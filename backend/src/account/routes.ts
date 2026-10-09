import bcrypt from 'bcryptjs'
import { Router } from 'express'
import { z } from 'zod'
import { pool } from '../db/client.js'
import { AppError, asyncHandler } from '../http/errors.js'
import { authenticate } from '../auth/middleware.js'
import { hashSessionToken, SESSION_COOKIE } from '../auth/session.js'

const emailSchema = z.string().trim().toLowerCase().email('Informe um e-mail válido.').max(320)
const phoneSchema = z.preprocess(
  (value) => typeof value === 'string' && value.trim() === '' ? null : value,
  z.string().trim().min(8, 'Informe um telefone válido.').max(32).nullable(),
)

const profileSchema = z.object({
  email: emailSchema.optional(),
  phone: phoneSchema.optional(),
}).strict().refine((value) => value.email !== undefined || value.phone !== undefined, {
  message: 'Informe ao menos um dado para atualizar.',
})

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Informe sua senha atual.').max(128),
  newPassword: z.string().min(8, 'A nova senha deve ter pelo menos 8 caracteres.').max(128),
}).strict()

type PublicUser = { id: number; name: string; email: string; phone: string | null; role: 'STUDENT' | 'ADMIN' }

export const accountRouter = Router()
accountRouter.use(authenticate)

accountRouter.patch('/profile', asyncHandler(async (request, response) => {
  const input = profileSchema.parse(request.body)
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const currentResult = await client.query<PublicUser>(
      'SELECT id, name, email, phone, role FROM users WHERE id = $1 FOR UPDATE',
      [request.auth!.userId],
    )
    const current = currentResult.rows[0]
    if (!current) throw new AppError(401, 'UNAUTHORIZED', 'Sua sessão não é mais válida.')

    const email = input.email ?? current.email
    const phone = input.phone === undefined ? current.phone : input.phone
    if (current.role === 'STUDENT' && !phone) {
      throw new AppError(422, 'STUDENT_PHONE_REQUIRED', 'O telefone é obrigatório para alunos.')
    }

    const duplicate = await client.query(
      'SELECT 1 FROM users WHERE lower(email) = lower($1) AND id <> $2 LIMIT 1',
      [email, current.id],
    )
    if (duplicate.rowCount) throw new AppError(409, 'EMAIL_IN_USE', 'Já existe uma conta com este e-mail.')

    const updatedResult = await client.query<PublicUser>(
      `UPDATE users SET email = lower($2), phone = $3, updated_at = now()
       WHERE id = $1 RETURNING id, name, email, phone, role`,
      [current.id, email, phone],
    )

    const associatedLead = await client.query<{ id: number }>(
      'SELECT id FROM leads WHERE converted_user_id = $1 FOR UPDATE',
      [current.id],
    )
    if (associatedLead.rows[0]) {
      const conflictingLead = await client.query(
        'SELECT 1 FROM leads WHERE lower(email) = lower($1) AND id <> $2 LIMIT 1',
        [email, associatedLead.rows[0].id],
      )
      await client.query(
        `UPDATE leads SET email = CASE WHEN $4::boolean THEN email ELSE lower($2) END,
          phone = COALESCE($3, phone), updated_at = now()
         WHERE id = $1`,
        [associatedLead.rows[0].id, email, phone, Boolean(conflictingLead.rowCount)],
      )
    }

    await client.query('COMMIT')
    response.json({ user: updatedResult.rows[0] })
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}))

accountRouter.patch('/password', asyncHandler(async (request, response) => {
  const input = passwordSchema.parse(request.body)
  const token = request.cookies?.[SESSION_COOKIE]
  if (!token || typeof token !== 'string') throw new AppError(401, 'UNAUTHORIZED', 'Faça login para continuar.')

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const userResult = await client.query<{ password_hash: string }>(
      'SELECT password_hash FROM users WHERE id = $1 FOR UPDATE',
      [request.auth!.userId],
    )
    const user = userResult.rows[0]
    if (!user || !(await bcrypt.compare(input.currentPassword, user.password_hash))) {
      throw new AppError(400, 'CURRENT_PASSWORD_INVALID', 'A senha atual está incorreta.')
    }
    const passwordHash = await bcrypt.hash(input.newPassword, 12)
    await client.query('UPDATE users SET password_hash = $2, updated_at = now() WHERE id = $1', [request.auth!.userId, passwordHash])
    await client.query(
      'DELETE FROM auth_sessions WHERE user_id = $1 AND token_hash <> $2',
      [request.auth!.userId, hashSessionToken(token)],
    )
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }

  response.json({ message: 'Senha alterada com sucesso.' })
}))
