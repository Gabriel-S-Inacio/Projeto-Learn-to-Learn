import { createHmac, randomBytes } from 'node:crypto'
import type { Response } from 'express'
import { and, eq, gt } from 'drizzle-orm'
import { config } from '../config.js'
import { db } from '../db/client.js'
import { authSessions, users } from '../db/schema.js'

export const SESSION_COOKIE = 'ltl_session'
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000

export function hashSessionToken(token: string) {
  return createHmac('sha256', config.AUTH_SECRET).update(token).digest('hex')
}

export async function createSession(userId: number) {
  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS)
  await db.insert(authSessions).values({ userId, tokenHash: hashSessionToken(token), expiresAt })
  return { token, expiresAt }
}

export function setSessionCookie(response: Response, token: string, expiresAt: Date) {
  response.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: config.SESSION_COOKIE_SECURE,
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  })
}

export function clearSessionCookie(response: Response) {
  response.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    secure: config.SESSION_COOKIE_SECURE,
    sameSite: 'lax',
    path: '/',
  })
}

export async function findSessionUser(token: string) {
  const [result] = await db
    .select({ userId: users.id, role: users.role, name: users.name, email: users.email, phone: users.phone })
    .from(authSessions)
    .innerJoin(users, eq(authSessions.userId, users.id))
    .where(and(eq(authSessions.tokenHash, hashSessionToken(token)), gt(authSessions.expiresAt, new Date())))
    .limit(1)
  return result
}

export async function deleteSession(token: string) {
  await db.delete(authSessions).where(eq(authSessions.tokenHash, hashSessionToken(token)))
}
