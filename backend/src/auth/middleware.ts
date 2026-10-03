import type { RequestHandler } from 'express'
import type { UserRole } from '../db/schema.js'
import { AppError, asyncHandler } from '../http/errors.js'
import { findSessionUser, SESSION_COOKIE } from './session.js'

export const authenticate = asyncHandler(async (request, _response, next) => {
  const token = request.cookies?.[SESSION_COOKIE]
  if (!token || typeof token !== 'string') throw new AppError(401, 'UNAUTHORIZED', 'Faça login para continuar.')

  const user = await findSessionUser(token)
  if (!user) throw new AppError(401, 'UNAUTHORIZED', 'Sua sessão expirou. Entre novamente.')
  request.auth = user
  next()
})

export function authorize(...roles: UserRole[]): RequestHandler {
  return (request, _response, next) => {
    if (!request.auth) return next(new AppError(401, 'UNAUTHORIZED', 'Faça login para continuar.'))
    if (!roles.includes(request.auth.role)) return next(new AppError(403, 'FORBIDDEN', 'Você não tem permissão para esta ação.'))
    next()
  }
}

