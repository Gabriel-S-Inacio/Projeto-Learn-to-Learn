import bcrypt from 'bcryptjs'
import { spawn } from 'node:child_process'
import request from 'supertest'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp } from '../src/app.js'
import { pool } from '../src/db/client.js'
import { isAtLeast24HoursAway } from '../src/bookings/service.js'
import { errorHandler } from '../src/http/errors.js'
import { resetRateLimitsForTests } from '../src/security/rateLimit.js'

const app = createApp()
const turnstileToken = 'valid-turnstile-token'

function mockExternalProviders(input?: { turnstileSuccess?: boolean; emailStatus?: number }) {
  return vi.fn(async (resource: string | URL | Request) => {
    const url = String(resource)
    if (url.includes('challenges.cloudflare.com/turnstile')) {
      return new Response(JSON.stringify({ success: input?.turnstileSuccess ?? true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    if (url.includes('api.resend.com/emails')) {
      return new Response(JSON.stringify({ id: 'test-email-id' }), {
        status: input?.emailStatus ?? 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    throw new Error('Unexpected external request in tests.')
  })
}

function runAdminSeed(
  environment: Record<string, string>,
  mode: 'explicit' | 'startup' = 'explicit',
) {
  const executable = mode === 'explicit'
    ? (process.platform === 'win32' ? 'npm.cmd' : 'npm')
    : process.execPath
  const args = mode === 'explicit'
    ? ['run', '--silent', 'db:seed:admin']
    : ['scripts/seed-admin.mjs']

  return new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(executable, args, {
      cwd: process.cwd(),
      env: { ...process.env, ...environment },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    child.stdout.setEncoding('utf8').on('data', (chunk) => { stdout += chunk })
    child.stderr.setEncoding('utf8').on('data', (chunk) => { stderr += chunk })
    child.once('error', reject)
    child.once('close', (code) => resolve({ code, stdout, stderr }))
  })
}

async function resetDatabase() {
  resetRateLimitsForTests()
  await pool.query('TRUNCATE notification_deliveries, analytics_events, leads, auth_sessions, lesson_bookings, lesson_slots, users RESTART IDENTITY CASCADE')
}

async function registerStudent(email: string, password = 'password-123') {
  const agent = request.agent(app)
  const response = await agent.post('/api/auth/register').send({
    name: `Aluno ${email}`,
    email,
    phone: '11999999999',
    password,
    turnstileToken,
  })
  expect(response.status).toBe(201)
  return { agent, user: response.body.user }
}

async function createAdmin(email = 'admin@example.test', password = 'admin-password') {
  const passwordHash = await bcrypt.hash(password, 4)
  await pool.query(
    `INSERT INTO users (name, email, password_hash, role) VALUES ('Administrador', $1, $2, 'ADMIN')`,
    [email, passwordHash],
  )
  const agent = request.agent(app)
  const response = await agent.post('/api/auth/login').send({ email, password, turnstileToken })
  expect(response.status).toBe(200)
  return agent
}

async function createSlot(hoursFromNow: number, status = 'AVAILABLE', duration = 60) {
  const startsAt = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000)
  const result = await pool.query<{ id: number; starts_at: Date }>(
    `INSERT INTO lesson_slots (starts_at, duration_minutes, status) VALUES ($1, $2, $3) RETURNING id, starts_at`,
    [startsAt, duration, status],
  )
  return result.rows[0]!
}

async function book(agent: request.SuperAgentTest, slotId: number) {
  return agent.post('/api/bookings').send({ slotId })
}

beforeAll(async () => {
  await pool.query('SELECT 1')
})

beforeEach(async () => {
  vi.stubGlobal('fetch', mockExternalProviders())
  await resetDatabase()
})
afterEach(() => vi.unstubAllGlobals())
afterAll(() => pool.end())

describe('authentication and authorization', () => {
  it('registers a STUDENT, hashes the password, exposes me and logs out', async () => {
    const { agent, user } = await registerStudent('student@example.test')
    expect(user).toMatchObject({ email: 'student@example.test', role: 'STUDENT' })
    expect(user.passwordHash).toBeUndefined()
    const stored = await pool.query('SELECT password_hash FROM users WHERE id = $1', [user.id])
    expect(stored.rows[0].password_hash).not.toBe('password-123')
    expect((await agent.get('/api/auth/me')).status).toBe(200)
    expect((await agent.post('/api/auth/logout')).status).toBe(204)
    expect((await agent.get('/api/auth/me')).status).toBe(401)
  })

  it('rejects invalid registration, duplicate email and invalid login variants', async () => {
    expect((await request(app).post('/api/auth/register').send({ name: '', email: 'bad', phone: '', password: 'x' })).status).toBe(422)
    await registerStudent('duplicate@example.test')
    expect((await request(app).post('/api/auth/register').send({ name: 'Outro', email: 'DUPLICATE@example.test', phone: '11999999999', password: 'password-123', turnstileToken })).status).toBe(409)
    expect((await request(app).post('/api/auth/login').send({ email: 'missing@example.test', password: 'wrong-password', turnstileToken })).status).toBe(401)
    expect((await request(app).post('/api/auth/login').send({ email: 'duplicate@example.test', password: 'wrong-password', turnstileToken })).status).toBe(401)
    expect((await request(app).get('/api/auth/me')).status).toBe(401)
  })

  it('enforces anonymous, STUDENT and ADMIN boundaries', async () => {
    const { agent: student } = await registerStudent('student@example.test')
    const admin = await createAdmin()
    expect((await request(app).get('/api/bookings/me')).status).toBe(401)
    expect((await student.get('/api/bookings/me')).status).toBe(200)
    expect((await student.get('/api/admin/schedule')).status).toBe(403)
    expect((await admin.get('/api/admin/schedule')).status).toBe(200)
  })

  it('requires backend antibot validation and rejects an invalid token', async () => {
    const payload = {
      name: 'Protected Student',
      email: 'protected@example.test',
      phone: '11999999999',
      password: 'password-123',
    }
    const missing = await request(app).post('/api/auth/register').send(payload)
    expect(missing.status).toBe(400)
    expect(missing.body.error.code).toBe('ANTIBOT_TOKEN_REQUIRED')

    vi.stubGlobal('fetch', mockExternalProviders({ turnstileSuccess: false }))
    const invalid = await request(app).post('/api/auth/register').send({ ...payload, turnstileToken: 'invalid-token' })
    expect(invalid.status).toBe(403)
    expect(invalid.body.error.code).toBe('ANTIBOT_FAILED')
    expect((await pool.query('SELECT count(*)::int AS count FROM users')).rows[0].count).toBe(0)
  })

  it('rate limits login and registration independently', async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await request(app).post('/api/auth/login').send({
        email: 'missing@example.test',
        password: 'wrong-password',
        turnstileToken,
      })
      expect(response.status).toBe(401)
    }
    const limitedLogin = await request(app).post('/api/auth/login').send({
      email: 'missing@example.test',
      password: 'wrong-password',
      turnstileToken,
    })
    expect(limitedLogin.status).toBe(429)
    expect(limitedLogin.body.error.code).toBe('LOGIN_RATE_LIMITED')

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await request(app).post('/api/auth/register').send({
        name: `Rate Student ${attempt}`,
        email: `rate-${attempt}@example.test`,
        phone: '11999999999',
        password: 'password-123',
        turnstileToken,
      })
      expect(response.status).toBe(201)
    }
    const limitedRegistration = await request(app).post('/api/auth/register').send({
      name: 'Rate Student Limited',
      email: 'rate-limited@example.test',
      phone: '11999999999',
      password: 'password-123',
      turnstileToken,
    })
    expect(limitedRegistration.status).toBe(429)
    expect(limitedRegistration.body.error.code).toBe('REGISTER_RATE_LIMITED')
  })
})

describe('ADMIN seed', () => {
  const seedEnvironment = {
    DATABASE_URL: process.env.DATABASE_URL!,
    ADMIN_NAME: 'Development Admin',
    ADMIN_EMAIL: 'seed-admin@example.test',
    ADMIN_PASSWORD: 'first-local-password',
  }

  it('creates once, preserves credentials at startup and explicitly synchronizes them', async () => {
    const created = await runAdminSeed(seedEnvironment, 'startup')
    expect(created).toMatchObject({ code: 0 })
    expect(created.stdout).toContain('ADMIN created successfully.')
    expect(`${created.stdout}${created.stderr}`).not.toContain(seedEnvironment.ADMIN_PASSWORD)
    expect(`${created.stdout}${created.stderr}`).not.toMatch(/\$2[aby]\$/)

    const before = await pool.query(
      'SELECT name, password_hash, role FROM users WHERE email = $1',
      [seedEnvironment.ADMIN_EMAIL],
    )
    expect(before.rows[0]).toMatchObject({ name: 'Development Admin', role: 'ADMIN' })
    expect(await bcrypt.compare(seedEnvironment.ADMIN_PASSWORD, before.rows[0].password_hash)).toBe(true)

    const changedEnvironment = {
      ...seedEnvironment,
      ADMIN_NAME: 'Updated Admin',
      ADMIN_PASSWORD: 'second-local-password',
    }
    const unchanged = await runAdminSeed(changedEnvironment, 'startup')
    expect(unchanged).toMatchObject({ code: 0 })
    expect(unchanged.stdout).toContain('startup seed left credentials unchanged')
    const afterStartup = await pool.query(
      'SELECT name, password_hash FROM users WHERE email = $1',
      [seedEnvironment.ADMIN_EMAIL],
    )
    expect(afterStartup.rows[0].name).toBe('Development Admin')
    expect(await bcrypt.compare(seedEnvironment.ADMIN_PASSWORD, afterStartup.rows[0].password_hash)).toBe(true)

    const synchronized = await runAdminSeed(changedEnvironment)
    expect(synchronized).toMatchObject({ code: 0 })
    expect(synchronized.stdout).toContain('ADMIN name and password synchronized successfully.')
    const terminalOutput = `${synchronized.stdout}${synchronized.stderr}`
    expect(terminalOutput).not.toContain(changedEnvironment.ADMIN_PASSWORD)
    expect(terminalOutput).not.toMatch(/\$2[aby]\$/)

    const afterSync = await pool.query(
      'SELECT name, password_hash FROM users WHERE email = $1',
      [seedEnvironment.ADMIN_EMAIL],
    )
    expect(afterSync.rows[0].name).toBe('Updated Admin')
    expect(await bcrypt.compare(changedEnvironment.ADMIN_PASSWORD, afterSync.rows[0].password_hash)).toBe(true)
    expect(await bcrypt.compare(seedEnvironment.ADMIN_PASSWORD, afterSync.rows[0].password_hash)).toBe(false)

    const admin = request.agent(app)
    const login = await admin.post('/api/auth/login').send({
      email: changedEnvironment.ADMIN_EMAIL,
      password: changedEnvironment.ADMIN_PASSWORD,
      turnstileToken,
    })
    expect(login.status).toBe(200)
    expect(login.body.user.role).toBe('ADMIN')
    expect((await admin.get('/api/admin/schedule')).status).toBe(200)
    expect((await admin.get('/api/admin/leads')).status).toBe(200)
  })

  it('reports missing credentials clearly and never promotes an existing STUDENT', async () => {
    const missing = await runAdminSeed({
      ...seedEnvironment,
      ADMIN_PASSWORD: '',
    })
    expect(missing.code).not.toBe(0)
    expect(missing.stderr).toContain('ADMIN_PASSWORD is required for the ADMIN seed.')
    expect(`${missing.stdout}${missing.stderr}`).not.toMatch(/\$2[aby]\$/)

    await registerStudent(seedEnvironment.ADMIN_EMAIL)
    const collision = await runAdminSeed(seedEnvironment)
    expect(collision.code).not.toBe(0)
    expect(collision.stderr).toContain('already assigned to a non-admin user')
    const user = await pool.query('SELECT role FROM users WHERE email = $1', [seedEnvironment.ADMIN_EMAIL])
    expect(user.rows[0].role).toBe('STUDENT')
  })
})

describe('public schedule and booking', () => {
  it('returns only future AVAILABLE slots in chronological order without private data', async () => {
    const late = await createSlot(72)
    const early = await createSlot(48)
    await createSlot(50, 'BLOCKED')
    await createSlot(51, 'BOOKED')
    await createSlot(52, 'COMPLETED')
    await createSlot(-2)
    const response = await request(app).get('/api/schedule/available')
    expect(response.status).toBe(200)
    expect(response.body.slots.map((slot: { id: number }) => slot.id)).toEqual([early.id, late.id])
    expect(JSON.stringify(response.body)).not.toMatch(/student|email|phone|booking/i)
  })

  it('books once and returns 404/409 for invalid, past, blocked and booked slots', async () => {
    const { agent } = await registerStudent('student@example.test')
    const available = await createSlot(48)
    const past = await createSlot(-2)
    const blocked = await createSlot(49, 'BLOCKED')
    expect((await book(agent, available.id)).status).toBe(201)
    expect((await book(agent, available.id)).status).toBe(409)
    expect((await book(agent, past.id)).status).toBe(409)
    expect((await book(agent, blocked.id)).status).toBe(409)
    expect((await book(agent, 999999)).status).toBe(404)
    expect((await request(app).post('/api/bookings').send({ slotId: available.id })).status).toBe(401)
  })

  it('allows exactly one winner under concurrent booking', async () => {
    const [{ agent: first }, { agent: second }] = await Promise.all([
      registerStudent('first@example.test'),
      registerStudent('second@example.test'),
    ])
    const slot = await createSlot(72)
    const responses = await Promise.all([book(first, slot.id), book(second, slot.id)])
    expect(responses.map((response) => response.status).sort()).toEqual([201, 409])
    const integrity = await pool.query('SELECT count(*)::int AS count FROM lesson_bookings WHERE slot_id = $1', [slot.id])
    expect(integrity.rows[0].count).toBe(1)
  })

  it('sends and audits booking confirmation with lesson details', async () => {
    const { agent } = await registerStudent('notified@example.test')
    const slot = await createSlot(72, 'AVAILABLE', 45)
    const response = await book(agent, slot.id)
    expect(response.status).toBe(201)

    const deliveries = await pool.query(
      `SELECT channel, event, status, provider, failure_code
       FROM notification_deliveries ORDER BY channel`,
    )
    expect(deliveries.rows).toEqual([
      expect.objectContaining({ channel: 'EMAIL', event: 'BOOKING_CONFIRMATION', status: 'SENT', provider: 'resend', failure_code: null }),
      expect.objectContaining({ channel: 'WHATSAPP', event: 'BOOKING_CONFIRMATION', status: 'SKIPPED', provider: 'disabled' }),
    ])

    const fetchMock = vi.mocked(fetch)
    const emailCall = fetchMock.mock.calls.find(([resource]) => String(resource).includes('api.resend.com/emails'))
    expect(emailCall).toBeTruthy()
    const emailBody = JSON.parse(String(emailCall?.[1]?.body))
    expect(emailBody.text).toContain('45 minutos')
    expect(emailBody.text).toContain('aula experimental')
  })

  it('keeps a persisted booking when the email provider fails', async () => {
    const { agent } = await registerStudent('email-failure@example.test')
    vi.stubGlobal('fetch', mockExternalProviders({ emailStatus: 503 }))
    const slot = await createSlot(72)
    const response = await book(agent, slot.id)
    expect(response.status).toBe(201)
    expect((await pool.query('SELECT count(*)::int AS count FROM lesson_bookings')).rows[0].count).toBe(1)
    expect((await pool.query('SELECT status FROM lesson_slots WHERE id = $1', [slot.id])).rows[0].status).toBe('BOOKED')
    const delivery = await pool.query(
      "SELECT status, failure_code FROM notification_deliveries WHERE channel = 'EMAIL' AND event = 'BOOKING_CONFIRMATION'",
    )
    expect(delivery.rows[0]).toEqual({ status: 'FAILED', failure_code: 'HTTP_503' })
  })
})

describe('cancellation', () => {
  it('uses an inclusive 24-hour boundary', () => {
    const now = new Date('2026-10-01T12:00:00.000Z')
    expect(isAtLeast24HoursAway(new Date('2026-10-02T12:00:00.000Z'), now)).toBe(true)
    expect(isAtLeast24HoursAway(new Date('2026-10-02T11:59:59.999Z'), now)).toBe(false)
  })

  it('cancels an owned booking over 24h and releases the slot', async () => {
    const { agent } = await registerStudent('student@example.test')
    const slot = await createSlot(72)
    const created = await book(agent, slot.id)
    expect((await agent.delete(`/api/bookings/${created.body.booking.bookingId}`)).status).toBe(204)
    const state = await pool.query('SELECT status FROM lesson_slots WHERE id = $1', [slot.id])
    expect(state.rows[0].status).toBe('AVAILABLE')
  })

  it('rejects under 24h, missing and another student booking', async () => {
    const { agent: owner } = await registerStudent('owner@example.test')
    const { agent: other } = await registerStudent('other@example.test')
    const slot = await createSlot(2)
    const created = await book(owner, slot.id)
    const id = created.body.booking.bookingId
    expect((await owner.delete(`/api/bookings/${id}`)).status).toBe(409)
    expect((await other.delete(`/api/bookings/${id}`)).status).toBe(403)
    expect((await owner.delete('/api/bookings/999999')).status).toBe(404)
  })
})

describe('administrative cancellation', () => {
  it('requires ADMIN and a reason, audits the cancellation and notifies the student', async () => {
    const admin = await createAdmin()
    const { agent: student } = await registerStudent('cancelled@example.test')
    const slot = await createSlot(72)
    const created = await book(student, slot.id)
    const bookingId = created.body.booking.bookingId
    const leadBefore = await pool.query("SELECT status, updated_at FROM leads WHERE email = 'cancelled@example.test'")

    expect((await student.post(`/api/admin/bookings/${bookingId}/cancel`).send({ reason: 'Professor indisponível.' })).status).toBe(403)
    expect((await admin.post(`/api/admin/bookings/${bookingId}/cancel`).send({ reason: '' })).status).toBe(422)

    const cancelled = await admin.post(`/api/admin/bookings/${bookingId}/cancel`).send({ reason: 'Professor indisponível.' })
    expect(cancelled.status).toBe(200)
    expect(cancelled.body.cancellation).toEqual({ bookingId })

    const stored = await pool.query(
      `SELECT b.cancellation_reason, b.cancelled_by, b.cancelled_at, s.status
       FROM lesson_bookings b JOIN lesson_slots s ON s.id = b.slot_id WHERE b.id = $1`,
      [bookingId],
    )
    expect(stored.rows[0]).toMatchObject({ cancellation_reason: 'Professor indisponível.', status: 'BLOCKED' })
    expect(stored.rows[0].cancelled_by).toBeTypeOf('number')
    expect(stored.rows[0].cancelled_at).toBeTruthy()

    const mine = await student.get('/api/bookings/me')
    expect(mine.body.lessons[0]).toMatchObject({ status: 'CANCELLED', cancellation: { reason: 'Professor indisponível.' } })
    const delivery = await pool.query(
      "SELECT status, provider FROM notification_deliveries WHERE channel = 'EMAIL' AND event = 'ADMIN_CANCELLATION'",
    )
    expect(delivery.rows[0]).toEqual({ status: 'SENT', provider: 'resend' })

    const schedule = await admin.get('/api/admin/schedule')
    expect(schedule.body.slots[0].booking.cancellation).toMatchObject({ reason: 'Professor indisponível.', cancelledBy: 'Administrador' })
    const release = await admin.patch(`/api/admin/schedule/${slot.id}`).send({ status: 'AVAILABLE' })
    expect(release.status).toBe(409)
    expect(release.body.error.code).toBe('CANCELLED_BOOKING_SLOT_LOCKED')
    expect((await admin.post(`/api/admin/bookings/${bookingId}/cancel`).send({ reason: 'Segunda tentativa.' })).status).toBe(409)

    const leadAfter = await pool.query("SELECT status, updated_at FROM leads WHERE email = 'cancelled@example.test'")
    expect(leadAfter.rows[0]).toEqual(leadBefore.rows[0])
  })
})

describe('rescheduling', () => {
  it('reschedules atomically and releases the previous slot', async () => {
    const { agent } = await registerStudent('student@example.test')
    const oldSlot = await createSlot(72)
    const newSlot = await createSlot(96)
    const created = await book(agent, oldSlot.id)
    const response = await agent.patch(`/api/bookings/${created.body.booking.bookingId}/reschedule`).send({ newSlotId: newSlot.id })
    expect(response.status).toBe(200)
    const states = await pool.query('SELECT id, status FROM lesson_slots WHERE id = ANY($1) ORDER BY id', [[oldSlot.id, newSlot.id]])
    expect(states.rows.map((row) => row.status)).toEqual(['AVAILABLE', 'BOOKED'])
  })

  it('rejects missing, BOOKED, BLOCKED, under-24h and foreign bookings without partial updates', async () => {
    const { agent: owner } = await registerStudent('owner@example.test')
    const { agent: other } = await registerStudent('other@example.test')
    const oldSlot = await createSlot(72)
    const blocked = await createSlot(96, 'BLOCKED')
    const occupied = await createSlot(97)
    const otherOld = await createSlot(98)
    const created = await book(owner, oldSlot.id)
    await book(other, occupied.id)
    const foreign = await book(other, otherOld.id)
    const id = created.body.booking.bookingId
    expect((await owner.patch(`/api/bookings/${id}/reschedule`).send({ newSlotId: 999999 })).status).toBe(404)
    expect((await owner.patch(`/api/bookings/${id}/reschedule`).send({ newSlotId: blocked.id })).status).toBe(409)
    expect((await owner.patch(`/api/bookings/${id}/reschedule`).send({ newSlotId: occupied.id })).status).toBe(409)
    expect((await owner.patch(`/api/bookings/${foreign.body.booking.bookingId}/reschedule`).send({ newSlotId: blocked.id })).status).toBe(403)
    const soon = await createSlot(2)
    const soonBooking = await book(owner, soon.id)
    expect((await owner.patch(`/api/bookings/${soonBooking.body.booking.bookingId}/reschedule`).send({ newSlotId: blocked.id })).status).toBe(409)
    const unchanged = await pool.query('SELECT slot_id FROM lesson_bookings WHERE id = $1', [id])
    expect(unchanged.rows[0].slot_id).toBe(oldSlot.id)
  })

  it('allows one winner under concurrent rescheduling and rolls the loser back', async () => {
    const [{ agent: first }, { agent: second }] = await Promise.all([
      registerStudent('first@example.test'),
      registerStudent('second@example.test'),
    ])
    const oldFirst = await createSlot(72)
    const oldSecond = await createSlot(73)
    const destination = await createSlot(100)
    const firstBooking = await book(first, oldFirst.id)
    const secondBooking = await book(second, oldSecond.id)
    const responses = await Promise.all([
      first.patch(`/api/bookings/${firstBooking.body.booking.bookingId}/reschedule`).send({ newSlotId: destination.id }),
      second.patch(`/api/bookings/${secondBooking.body.booking.bookingId}/reschedule`).send({ newSlotId: destination.id }),
    ])
    expect(responses.map((response) => response.status).sort()).toEqual([200, 409])
    const bookings = await pool.query('SELECT slot_id FROM lesson_bookings ORDER BY id')
    expect(bookings.rows.filter((row) => row.slot_id === destination.id)).toHaveLength(1)
    expect(bookings.rows).toHaveLength(2)
  })
})

describe('admin schedule', () => {
  it('creates, lists, blocks, releases and protects role access', async () => {
    const admin = await createAdmin()
    const { agent: student } = await registerStudent('student@example.test')
    const payload = { startsAt: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(), durationMinutes: 45, notes: 'Aula experimental' }
    expect((await student.post('/api/admin/schedule').send(payload)).status).toBe(403)
    const created = await admin.post('/api/admin/schedule').send(payload)
    expect(created.status).toBe(201)
    const id = created.body.slot.id
    expect((await admin.patch(`/api/admin/schedule/${id}`).send({ status: 'BLOCKED' })).status).toBe(200)
    expect((await admin.patch(`/api/admin/schedule/${id}`).send({ status: 'AVAILABLE' })).status).toBe(200)
    expect((await admin.get('/api/admin/schedule')).body.slots).toHaveLength(1)
  })

  it('does not block BOOKED and marks BOOKED as COMPLETED with student data', async () => {
    const admin = await createAdmin()
    const { agent: student } = await registerStudent('student@example.test')
    const slot = await createSlot(72)
    await book(student, slot.id)
    expect((await admin.patch(`/api/admin/schedule/${slot.id}`).send({ status: 'BLOCKED' })).status).toBe(409)
    expect((await admin.patch(`/api/admin/schedule/${slot.id}`).send({ status: 'COMPLETED' })).status).toBe(200)
    const list = await admin.get('/api/admin/schedule')
    expect(list.body.slots[0]).toMatchObject({ status: 'COMPLETED', booking: { student: { email: 'student@example.test' } } })
  })
})

describe('regular lessons', () => {
  it('allows only an ADMIN to assign REGULAR lessons to converted students without changing the lead', async () => {
    const admin = await createAdmin()
    const { agent: student, user } = await registerStudent('regular@example.test')
    const startsAt = new Date(Date.now() + 120 * 60 * 60 * 1000).toISOString()
    const payload = { studentId: user.id, startsAt, durationMinutes: 60, type: 'REGULAR', notes: 'Conversation class' }

    expect((await student.post('/api/admin/lessons').send(payload)).status).toBe(403)
    const beforeConversion = await admin.post('/api/admin/lessons').send(payload)
    expect(beforeConversion.status).toBe(409)
    expect(beforeConversion.body.error.code).toBe('STUDENT_NOT_CONVERTED')
    expect((await admin.post('/api/admin/lessons').send({ ...payload, studentId: 999999 })).status).toBe(404)

    const adminUser = await pool.query("SELECT id FROM users WHERE role = 'ADMIN'")
    const invalidRole = await admin.post('/api/admin/lessons').send({ ...payload, studentId: adminUser.rows[0].id })
    expect(invalidRole.status).toBe(422)
    expect(invalidRole.body.error.code).toBe('USER_NOT_STUDENT')
    expect((await admin.post('/api/admin/lessons').send({ ...payload, startsAt: new Date(Date.now() - 60_000).toISOString() })).status).toBe(422)
    expect((await admin.post('/api/admin/lessons').send({ ...payload, durationMinutes: 90 })).status).toBe(422)

    const trialSlot = await createSlot(72)
    await book(student, trialSlot.id)
    expect((await admin.patch(`/api/admin/schedule/${trialSlot.id}`).send({ status: 'COMPLETED' })).status).toBe(200)
    const lead = await pool.query("SELECT id FROM leads WHERE email = 'regular@example.test'")
    expect((await admin.patch(`/api/admin/leads/${lead.rows[0].id}/status`).send({ status: 'CONVERTED' })).status).toBe(200)

    const convertedStudents = await admin.get('/api/admin/students/converted')
    expect(convertedStudents.status).toBe(200)
    expect(convertedStudents.body.students).toEqual([expect.objectContaining({ id: user.id, email: 'regular@example.test' })])
    const leadBeforeRegular = await pool.query(
      'SELECT status, scheduled_at, trial_completed_at, converted_at, updated_at FROM leads WHERE id = $1',
      [lead.rows[0].id],
    )

    const created = await admin.post('/api/admin/lessons').send(payload)
    expect(created.status).toBe(201)
    expect(created.body.lesson).toMatchObject({ studentId: user.id, durationMinutes: 60, type: 'REGULAR', status: 'BOOKED' })
    const lessonId = created.body.lesson.id

    const conflict = await admin.post('/api/admin/lessons').send(payload)
    expect(conflict.status).toBe(409)
    expect(conflict.body.error.code).toBe('LESSON_TIME_CONFLICT')

    const mine = await student.get('/api/bookings/me')
    expect(mine.status).toBe(200)
    expect(mine.body.lessons).toEqual(expect.arrayContaining([
      expect.objectContaining({ slotId: lessonId, type: 'REGULAR', status: 'BOOKED' }),
    ]))
    const regularBooking = mine.body.lessons.find((lesson: { slotId: number }) => lesson.slotId === lessonId)
    expect((await student.delete(`/api/bookings/${regularBooking.bookingId}`)).body.error.code).toBe('REGULAR_LESSON_MANAGED_BY_ADMIN')
    expect((await student.patch(`/api/bookings/${regularBooking.bookingId}/reschedule`).send({ newSlotId: trialSlot.id })).body.error.code).toBe('REGULAR_LESSON_MANAGED_BY_ADMIN')

    const schedule = await admin.get('/api/admin/schedule')
    expect(schedule.body.slots).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: lessonId,
        type: 'REGULAR',
        booking: expect.objectContaining({ student: expect.objectContaining({ email: 'regular@example.test' }) }),
      }),
    ]))

    expect((await admin.patch(`/api/admin/schedule/${lessonId}`).send({ status: 'COMPLETED' })).status).toBe(200)
    const history = await student.get('/api/bookings/me')
    expect(history.body.lessons).toEqual(expect.arrayContaining([
      expect.objectContaining({ slotId: lessonId, type: 'REGULAR', status: 'COMPLETED' }),
    ]))

    const leadAfterRegular = await pool.query(
      'SELECT status, scheduled_at, trial_completed_at, converted_at, updated_at FROM leads WHERE id = $1',
      [lead.rows[0].id],
    )
    expect(leadAfterRegular.rows[0]).toEqual(leadBeforeRegular.rows[0])
    expect((await pool.query("SELECT count(*)::int AS count FROM analytics_events WHERE event_name = 'trial_completed'")).rows[0].count).toBe(1)

    const metrics = await admin.get('/api/admin/leads/metrics?days=30')
    expect(metrics.body.metrics).toMatchObject({ bookings: 1, trials: 1 })
  })
})

describe('leads and attribution', () => {
  it('creates, validates and merges a public lead while preserving first-touch source and UTM', async () => {
    const first = await request(app).post('/api/leads').send({
      name: 'Lead Original', email: 'Lead@Example.test', phone: '11911112222', source: 'FORM',
      utmSource: 'google', utmMedium: 'cpc', utmCampaign: 'english-2026', sessionId: 'session-lead-001',
    })
    expect(first.status).toBe(201)
    const duplicate = await request(app).post('/api/leads').send({
      name: 'Lead Atualizado', email: 'lead@example.test', phone: '11999998888', source: 'FORM',
      utmSource: 'instagram', utmCampaign: 'overwrite-attempt',
    })
    expect(duplicate.status).toBe(200)
    expect((await request(app).post('/api/leads').send({ name: '', email: 'bad', phone: '', source: 'REGISTER' })).status).toBe(422)
    const stored = await pool.query('SELECT * FROM leads')
    expect(stored.rows).toHaveLength(1)
    expect(stored.rows[0]).toMatchObject({ name: 'Lead Atualizado', phone: '11999998888', source: 'FORM', utm_source: 'google', utm_medium: 'cpc', utm_campaign: 'english-2026', status: 'NEW' })
  })

  it('associates an existing lead on registration and creates a REGISTER lead when absent', async () => {
    await request(app).post('/api/leads').send({ name: 'Lead', email: 'existing@example.test', phone: '11911112222', source: 'FORM', utmSource: 'newsletter' })
    await registerStudent('existing@example.test')
    await registerStudent('new@example.test')
    const leads = await pool.query('SELECT email, source, status, converted_user_id, utm_source FROM leads ORDER BY email')
    expect(leads.rows).toHaveLength(2)
    expect(leads.rows[0]).toMatchObject({ email: 'existing@example.test', source: 'FORM', status: 'INTERESTED', utm_source: 'newsletter' })
    expect(leads.rows[0].converted_user_id).toBeTypeOf('number')
    expect(leads.rows[1]).toMatchObject({ email: 'new@example.test', source: 'REGISTER', status: 'INTERESTED' })
  })
})

describe('lead lifecycle integration', () => {
  it('promotes one lead to SCHEDULED after real bookings without duplication', async () => {
    const { agent } = await registerStudent('student@example.test')
    const first = await createSlot(72)
    const second = await createSlot(96)
    expect((await agent.post('/api/bookings').send({ slotId: first.id, sessionId: 'booking-session-01' })).status).toBe(201)
    expect((await book(agent, second.id)).status).toBe(201)
    const leads = await pool.query('SELECT status, scheduled_at FROM leads')
    expect(leads.rows).toHaveLength(1)
    expect(leads.rows[0].status).toBe('SCHEDULED')
    expect(leads.rows[0].scheduled_at).toBeTruthy()
    expect((await pool.query("SELECT count(*)::int AS count FROM analytics_events WHERE event_name = 'booking_completed'")).rows[0].count).toBe(2)
  })

  it('promotes completed trials without automatic conversion, then requires an ADMIN conversion', async () => {
    const admin = await createAdmin()
    const { agent: student } = await registerStudent('student@example.test')
    const slot = await createSlot(72)
    await book(student, slot.id)
    expect((await admin.patch(`/api/admin/schedule/${slot.id}`).send({ status: 'COMPLETED' })).status).toBe(200)
    const leadBefore = await pool.query('SELECT id, status, converted_at FROM leads')
    expect(leadBefore.rows[0]).toMatchObject({ status: 'TRIAL_COMPLETED', converted_at: null })
    expect((await student.patch(`/api/admin/leads/${leadBefore.rows[0].id}/status`).send({ status: 'CONVERTED' })).status).toBe(403)
    const converted = await admin.patch(`/api/admin/leads/${leadBefore.rows[0].id}/status`).send({ status: 'CONVERTED' })
    expect(converted.status).toBe(200)
    expect((await admin.patch(`/api/admin/leads/${leadBefore.rows[0].id}/status`).send({ status: 'LOST' })).status).toBe(409)
    const events = await pool.query("SELECT event_name FROM analytics_events WHERE event_name IN ('trial_completed', 'lead_converted') ORDER BY id")
    expect(events.rows.map((row) => row.event_name)).toEqual(['trial_completed', 'lead_converted'])
  })

  it('allows valid LOST transitions and rejects arbitrary transitions', async () => {
    const admin = await createAdmin()
    await request(app).post('/api/leads').send({ name: 'Lead', email: 'lead@example.test', phone: '11911112222', source: 'FORM' })
    const lead = await pool.query('SELECT id FROM leads')
    expect((await admin.patch(`/api/admin/leads/${lead.rows[0].id}/status`).send({ status: 'CONVERTED' })).status).toBe(409)
    expect((await admin.patch(`/api/admin/leads/${lead.rows[0].id}/status`).send({ status: 'LOST' })).status).toBe(200)
  })
})

describe('analytics and admin metrics', () => {
  it('accepts allowlisted behavioral events and rejects invalid or sensitive metadata', async () => {
    const valid = await request(app).post('/api/analytics/events').send({ eventName: 'page_view', sessionId: 'analytics-session-01', path: '/metodo', metadata: { section: 'hero' } })
    expect(valid.status).toBe(202)
    expect((await request(app).post('/api/analytics/events').send({ eventName: 'unknown', sessionId: 'analytics-session-01' })).status).toBe(422)
    expect((await request(app).post('/api/analytics/events').send({ eventName: 'registration_completed', sessionId: 'analytics-session-01' })).status).toBe(422)
    expect((await request(app).post('/api/analytics/events').send({ eventName: 'cta_clicked', sessionId: 'analytics-session-01', metadata: { email: 'private@example.test' } })).status).toBe(422)
    expect((await pool.query('SELECT count(*)::int AS count FROM analytics_events')).rows[0].count).toBe(1)
  })

  it('keeps sensitive values out of operational logs and notification audit columns', async () => {
    const secretValue = 'private-person@example.test bearer-sensitive-token'
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const previousNodeEnvironment = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    const response = {
      status: vi.fn(),
      json: vi.fn(),
    }
    response.status.mockReturnValue(response)
    try {
      errorHandler(new Error(secretValue), {} as never, response as never, (() => undefined) as never)
      expect(response.status).toHaveBeenCalledWith(500)
      expect(JSON.stringify(consoleError.mock.calls)).not.toContain(secretValue)
    } finally {
      process.env.NODE_ENV = previousNodeEnvironment
      consoleError.mockRestore()
    }

    const columns = await pool.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'notification_deliveries'`,
    )
    expect(columns.rows.map((row) => row.column_name)).not.toEqual(expect.arrayContaining(['email', 'phone', 'token', 'password']))
  })

  it('returns filtered leads and transaction-backed metrics/funnel for a controlled cohort', async () => {
    const admin = await createAdmin()
    const { agent: first } = await registerStudent('first@example.test')
    await registerStudent('second@example.test')
    const slot = await createSlot(72)
    await book(first, slot.id)
    await admin.patch(`/api/admin/schedule/${slot.id}`).send({ status: 'COMPLETED' })
    const lead = await pool.query("SELECT id FROM leads WHERE email = 'first@example.test'")
    await admin.patch(`/api/admin/leads/${lead.rows[0].id}/status`).send({ status: 'CONVERTED' })

    const metrics = await admin.get('/api/admin/leads/metrics?days=30')
    expect(metrics.status).toBe(200)
    expect(metrics.body.metrics).toEqual({ leads: 2, bookings: 1, trials: 1, conversions: 1 })
    expect(metrics.body.funnel).toMatchObject({ leads: 2, scheduled: 1, trialCompleted: 1, converted: 1, conversionRate: 50 })
    const filtered = await admin.get('/api/admin/leads?days=30&status=CONVERTED&source=REGISTER')
    expect(filtered.status).toBe(200)
    expect(filtered.body.leads).toHaveLength(1)
    expect(filtered.body.leads[0].email).toBe('first@example.test')
  })
})
