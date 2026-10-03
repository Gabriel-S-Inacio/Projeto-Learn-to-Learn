import bcrypt from 'bcryptjs'
import { config as loadEnv } from 'dotenv'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import pg from 'pg'

const { Pool } = pg

loadEnv({ path: resolve(process.cwd(), '.env'), quiet: true })
loadEnv({ path: resolve(process.cwd(), '..', '.env'), quiet: true })

function required(env, name) {
  const value = env[name]?.trim()
  if (!value) throw new Error(`${name} is required for the ADMIN seed.`)
  return value
}

function readConfiguration(env) {
  const databaseUrl = required(env, 'DATABASE_URL')
  const name = required(env, 'ADMIN_NAME')
  const email = required(env, 'ADMIN_EMAIL').toLowerCase()
  const password = required(env, 'ADMIN_PASSWORD')
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('ADMIN_EMAIL must be a valid e-mail address.')
  if (password.length < 8) throw new Error('ADMIN_PASSWORD must contain at least 8 characters.')
  return { databaseUrl, name, email, password }
}

export async function seedAdmin({ env = process.env, syncExisting = false } = {}) {
  const configuration = readConfiguration(env)
  const pool = new Pool({ connectionString: configuration.databaseUrl })
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query('SELECT pg_advisory_xact_lock($1)', [841_2027])
    const result = await client.query(
      'SELECT id, role FROM users WHERE lower(email) = $1 FOR UPDATE',
      [configuration.email],
    )
    const existing = result.rows[0]

    if (existing && existing.role !== 'ADMIN') {
      throw new Error('ADMIN_EMAIL is already assigned to a non-admin user; no role was changed.')
    }

    if (!existing) {
      const passwordHash = await bcrypt.hash(configuration.password, 12)
      await client.query(
        `INSERT INTO users (name, email, phone, password_hash, role)
         VALUES ($1, $2, NULL, $3, 'ADMIN')`,
        [configuration.name, configuration.email, passwordHash],
      )
      await client.query('COMMIT')
      return { action: 'created' }
    }

    if (!syncExisting) {
      await client.query('COMMIT')
      return { action: 'unchanged' }
    }

    const passwordHash = await bcrypt.hash(configuration.password, 12)
    await client.query(
      `UPDATE users SET name = $2, password_hash = $3, updated_at = now()
       WHERE id = $1 AND role = 'ADMIN'`,
      [existing.id, configuration.name, passwordHash],
    )
    await client.query('COMMIT')
    return { action: 'synchronized' }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

async function main() {
  const result = await seedAdmin({ syncExisting: process.argv.includes('--sync') })
  const messages = {
    created: 'ADMIN created successfully.',
    synchronized: 'ADMIN name and password synchronized successfully.',
    unchanged: 'ADMIN already exists; startup seed left credentials unchanged.',
  }
  process.stdout.write(`${messages[result.action]}\n`)
}

const entrypoint = process.argv[1] ? resolve(process.argv[1]) : ''
if (entrypoint === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : 'Unknown error.'
    process.stderr.write(`ADMIN seed failed: ${message}\n`)
    process.exitCode = 1
  })
}
