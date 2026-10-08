import type { RequestHandler } from 'express'
import { AppError } from '../http/errors.js'

type Entry = { count: number; resetAt: number }
const stores = new Set<Map<string, Entry>>()

export function createRateLimit(input: { windowMs: number; max: number; code: string; message: string }): RequestHandler {
  const store = new Map<string, Entry>()
  stores.add(store)

  return (request, response, next) => {
    const now = Date.now()
    const key = request.ip || request.socket.remoteAddress || 'unknown'
    const current = store.get(key)
    const entry = !current || current.resetAt <= now ? { count: 0, resetAt: now + input.windowMs } : current
    entry.count += 1
    store.set(key, entry)
    response.setHeader('RateLimit-Limit', String(input.max))
    response.setHeader('RateLimit-Remaining', String(Math.max(0, input.max - entry.count)))
    response.setHeader('RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)))

    if (entry.count > input.max) {
      response.setHeader('Retry-After', String(Math.max(1, Math.ceil((entry.resetAt - now) / 1000))))
      return next(new AppError(429, input.code, input.message))
    }
    next()
  }
}

export function resetRateLimitsForTests() {
  if (process.env.NODE_ENV !== 'test') return
  for (const store of stores) store.clear()
}

