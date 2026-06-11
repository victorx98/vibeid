import { Pool, PoolClient, QueryResultRow } from 'pg'

import { databaseConfigured, requireEnv } from './backend-config'

const globalForDb = globalThis as typeof globalThis & {
  __vibeidPgPool?: Pool
}

export { databaseConfigured }

export function getPool(): Pool {
  if (!databaseConfigured()) throw new Error('DATABASE_URL is not configured')

  if (!globalForDb.__vibeidPgPool) {
    globalForDb.__vibeidPgPool = new Pool({
      connectionString: requireEnv('DATABASE_URL'),
      max: 10,
    })
  }

  return globalForDb.__vibeidPgPool
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  values: unknown[] = []
) {
  return getPool().query<T>(text, values)
}

export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getPool().connect()
  try {
    await client.query('begin')
    const result = await callback(client)
    await client.query('commit')
    return result
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
  }
}
