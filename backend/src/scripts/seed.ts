// Compatibility entrypoint for previously built commands. The implementation
// lives in scripts/seed-admin.mjs so the same safe seed runs locally and in Docker.
// @ts-expect-error Operational JavaScript entrypoint intentionally lives outside src.
const { seedAdmin } = await import('../../scripts/seed-admin.mjs')

try {
  const result = await seedAdmin({ syncExisting: process.argv.includes('--sync') })
  const messages: Record<string, string> = {
    created: 'ADMIN created successfully.',
    synchronized: 'ADMIN name and password synchronized successfully.',
    unchanged: 'ADMIN already exists; startup seed left credentials unchanged.',
  }
  process.stdout.write(`${messages[result.action] ?? 'ADMIN seed completed.'}\n`)
} catch (error) {
  process.stderr.write(`ADMIN seed failed: ${error instanceof Error ? error.message : 'Unknown error.'}\n`)
  process.exitCode = 1
}
