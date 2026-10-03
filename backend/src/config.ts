import 'dotenv/config'
import { z } from 'zod'

const optionalEnvironmentValue = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess(
    (value) => typeof value === 'string' && value.trim() === '' ? undefined : value,
    schema.optional(),
  )

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(32),
  FRONTEND_ORIGIN: z.string().url().default('http://localhost:5173'),
  SESSION_COOKIE_SECURE: z.enum(['true', 'false']).transform((value) => value === 'true').optional(),
  ADMIN_NAME: optionalEnvironmentValue(z.string().min(1)),
  ADMIN_EMAIL: optionalEnvironmentValue(z.string().email()),
  ADMIN_PASSWORD: optionalEnvironmentValue(z.string().min(8)),
})

const environment = environmentSchema.parse(process.env)

export const config = {
  ...environment,
  SESSION_COOKIE_SECURE: environment.SESSION_COOKIE_SECURE ?? environment.NODE_ENV === 'production',
}
