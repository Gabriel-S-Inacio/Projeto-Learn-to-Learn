import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    env: {
      TURNSTILE_SECRET_KEY: '1x0000000000000000000000000000000AA',
      RESEND_API_KEY: 'test-resend-key',
      EMAIL_FROM: 'tests@example.test',
      WHATSAPP_PROVIDER: 'disabled',
    },
    fileParallelism: false,
    pool: 'threads',
    sequence: { concurrent: false },
    testTimeout: 15_000,
  },
})

