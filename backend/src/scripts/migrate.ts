import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pool } from '../db/client.js'

async function migrate() {
  const client = await pool.connect()
  try {
    await client.query('SELECT pg_advisory_lock($1)', [841_2026])
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )`)

    const migrationsDirectory = join(process.cwd(), 'migrations')
    const files = (await readdir(migrationsDirectory)).filter((file) => file.endsWith('.sql')).sort()

    for (const file of files) {
      const existing = await client.query('SELECT 1 FROM schema_migrations WHERE name = $1', [file])
      if (existing.rowCount) continue

      await client.query('BEGIN')
      try {
        await client.query(await readFile(join(migrationsDirectory, file), 'utf8'))
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file])
        await client.query('COMMIT')
        process.stdout.write(`Applied migration ${file}\n`)
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      }
    }
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [841_2026]).catch(() => undefined)
    client.release()
    await pool.end()
  }
}

migrate().catch((error) => {
  console.error('Migration failed:', error instanceof Error ? error.message : 'unknown error')
  process.exitCode = 1
})

