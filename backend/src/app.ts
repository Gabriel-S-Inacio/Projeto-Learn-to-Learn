import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { adminRouter } from './admin/routes.js'
import { authRouter } from './auth/routes.js'
import { bookingsRouter } from './bookings/routes.js'
import { config } from './config.js'
import { errorHandler, notFoundHandler } from './http/errors.js'
import { scheduleRouter } from './schedule/routes.js'
import { analyticsRouter } from './analytics/routes.js'
import { leadsRouter } from './leads/routes.js'
import { accountRouter } from './account/routes.js'

export function createApp() {
  const app = express()
  app.disable('x-powered-by')
  app.use(helmet())
  app.use(cors({ origin: config.FRONTEND_ORIGIN, credentials: true, methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'] }))
  app.use(express.json({ limit: '32kb' }))
  app.use(cookieParser())

  app.get('/api/health', (_request, response) => response.json({ status: 'ok' }))
  app.use('/api/auth', authRouter)
  app.use('/api/account', accountRouter)
  app.use('/api/leads', leadsRouter)
  app.use('/api/analytics', analyticsRouter)
  app.use('/api/schedule', scheduleRouter)
  app.use('/api/bookings', bookingsRouter)
  app.use('/api/admin', adminRouter)

  app.use(notFoundHandler)
  app.use(errorHandler)
  return app
}
