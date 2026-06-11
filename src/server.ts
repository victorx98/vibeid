import 'dotenv/config'

import { assertConfig } from '../lib/backend-config'
import { buildApp } from './app'

async function main(): Promise<void> {
  // Fail fast on missing/invalid configuration before binding the port.
  assertConfig()

  const app = await buildApp()
  const port = Number(process.env.PORT ?? 3000)
  const host = process.env.HOST ?? '0.0.0.0'

  try {
    await app.listen({ port, host })
  } catch (error) {
    app.log.error(error)
    process.exit(1)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
