import { createApp } from './app.js'
import { config } from './config.js'
import { closeDatabase } from './db/client.js'

const server = createApp().listen(config.PORT, () => {
  process.stdout.write(`Learn to Learn API listening on port ${config.PORT}\n`)
})

async function shutdown(signal: string) {
  process.stdout.write(`Received ${signal}; shutting down.\n`)
  server.close(async () => {
    await closeDatabase()
    process.exit(0)
  })
}

process.on('SIGTERM', () => void shutdown('SIGTERM'))
process.on('SIGINT', () => void shutdown('SIGINT'))

