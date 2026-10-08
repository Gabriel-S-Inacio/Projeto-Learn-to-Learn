import type { ErrorRequestHandler, RequestHandler } from 'express'
import { ZodError } from 'zod'

export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message)
  }
}

export function asyncHandler(handler: RequestHandler): RequestHandler {
  return (request, response, next) => Promise.resolve(handler(request, response, next)).catch(next)
}

export const notFoundHandler: RequestHandler = (_request, _response, next) => {
  next(new AppError(404, 'NOT_FOUND', 'Recurso não encontrado.'))
}

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof ZodError) {
    response.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Revise os dados informados.',
        details: error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
      },
    })
    return
  }

  if (error instanceof AppError) {
    response.status(error.status).json({ error: { code: error.code, message: error.message, details: error.details } })
    return
  }

  const postgresCode = typeof error === 'object' && error && 'code' in error ? String(error.code) : ''
  if (postgresCode === '23505') {
    response.status(409).json({ error: { code: 'CONFLICT', message: 'Este registro já existe ou não está mais disponível.' } })
    return
  }

  if (process.env.NODE_ENV !== 'test') {
    const safeCode = postgresCode || (error instanceof Error ? error.name : 'UNKNOWN_ERROR')
    console.error('Unhandled request error', { code: safeCode })
  }
  response.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Não foi possível concluir a operação.' } })
}

