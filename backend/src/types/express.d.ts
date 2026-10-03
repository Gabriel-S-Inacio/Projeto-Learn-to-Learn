import type { UserRole } from '../db/schema.js'

declare global {
  namespace Express {
    interface Request {
      auth?: { userId: number; role: UserRole; name: string; email: string; phone: string | null }
    }
  }
}

export {}

