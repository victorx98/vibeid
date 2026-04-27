import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

import { loadEnvConfig } from '@next/env'
import { Pool, type PoolClient } from 'pg'

loadEnvConfig(process.cwd())

const execFileAsync = promisify(execFile)

const SQLITE_PATH = process.env.SQLITE_KB_PATH || 'data/resume_material_library.db'
const SCHEMA = 'vibeid'
const ADVISORY_LOCK_ID = 74200131

const EXPECTED_COUNTS = {
  mentors: 11,
  source_students: 11,
  sessions: 21,
  segments: 164,
  before_after_pairs: 29,
} as const

type TableName = keyof typeof EXPECTED_COUNTS
type Row = Record<string, unknown>

interface TableSpec {
  sqliteTable: string
  pgTable: TableName
  columns: string[]
}

const TABLES: TableSpec[] = [
  {
    sqliteTable: 'mentors',
    pgTable: 'mentors',
    columns: [
      'id',
      'name',
      'company',
      'title',
      'location',
      'industry_expertise',
      'coaching_positions',
      'tech_skills',
      'credibility_signal',
      'career_path',
      'insight_scope',
      'rating',
      'session_count',
      'created_at',
    ],
  },
  {
    sqliteTable: 'students',
    pgTable: 'source_students',
    columns: [
      'id',
      'name_en',
      'name_zh',
      'email',
      'school',
      'major',
      'gpa',
      'graduation_year',
      'experience_level',
      'target_roles',
      'resume_strengths',
      'resume_weaknesses',
      'key_experiences',
      'background_summary',
      'created_at',
    ],
  },
  {
    sqliteTable: 'sessions',
    pgTable: 'sessions',
    columns: [
      'id',
      'session_date',
      'mentor_id',
      'student_id',
      'source_file',
      'direction',
      'transcript_line_range',
      'notes',
      'created_at',
    ],
  },
  {
    sqliteTable: 'segments',
    pgTable: 'segments',
    columns: [
      'id',
      'session_id',
      'segment_id',
      'source_file',
      'source_line',
      'topic',
      'resume_section',
      'L1',
      'L2',
      'L3',
      'P_student',
      'P_mentor',
      'L_logic',
      'A_action',
      'I_insight',
      'I_scope',
      'E_example',
      'H_hook',
      'F_formula',
      'HR_os',
      'T_experience',
      'T_industry',
      'T_role',
      'confidence',
      'generality',
      'created_at',
      'target_student_archetype',
      'resume_section_tag',
      'advice_type',
      'keyword_tags',
      'industry_fit',
      'background_fit',
      'level_fit',
      'trigger_conditions',
    ],
  },
  {
    sqliteTable: 'before_after_pairs',
    pgTable: 'before_after_pairs',
    columns: [
      'id',
      'session_id',
      'pair_order',
      'before_text',
      'after_text',
      'reason',
      'issue_tags',
      'C_cta',
      'freq_stat',
      'mentor_quote',
      'L3_tag',
      'source_segment',
      'notes',
      'created_at',
    ],
  },
]

function parseMode(): 'dry-run' | 'apply' {
  const args = new Set(process.argv.slice(2))
  if (args.has('--apply') && args.has('--dry-run')) {
    throw new Error('Choose either --dry-run or --apply, not both')
  }
  if (args.has('--apply')) return 'apply'
  if (args.has('--dry-run')) return 'dry-run'
  throw new Error('Usage: npm run kb:migrate -- --dry-run OR npm run kb:migrate -- --apply')
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  const objectValue = value as Record<string, unknown>
  const keys = Object.keys(objectValue).sort()
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(objectValue[key])}`).join(',')}}`
}

function checksumRows(rows: Row[]): string {
  const hash = createHash('sha256')
  for (const row of rows) {
    hash.update(stableStringify(row))
    hash.update('\n')
  }
  return hash.digest('hex')
}

function fileSha256(filePath: string): string {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex')
}

async function readSqliteRows<T extends Row>(dbPath: string, table: string): Promise<T[]> {
  const sql = `select * from ${table} order by id`
  const { stdout } = await execFileAsync('sqlite3', ['-readonly', '-json', dbPath, sql], {
    maxBuffer: 20 * 1024 * 1024,
  })
  const trimmed = stdout.toString().trim()
  if (!trimmed) return []
  return JSON.parse(trimmed) as T[]
}

async function readSourceData(dbPath: string) {
  const data: Record<TableName, Row[]> = {
    mentors: [],
    source_students: [],
    sessions: [],
    segments: [],
    before_after_pairs: [],
  }

  for (const table of TABLES) {
    data[table.pgTable] = await readSqliteRows(dbPath, table.sqliteTable)
  }

  return data
}

function countRows(data: Record<TableName, Row[]>): Record<TableName, number> {
  return {
    mentors: data.mentors.length,
    source_students: data.source_students.length,
    sessions: data.sessions.length,
    segments: data.segments.length,
    before_after_pairs: data.before_after_pairs.length,
  }
}

function checksumTables(data: Record<TableName, Row[]>): Record<TableName, string> {
  return {
    mentors: checksumRows(data.mentors),
    source_students: checksumRows(data.source_students),
    sessions: checksumRows(data.sessions),
    segments: checksumRows(data.segments),
    before_after_pairs: checksumRows(data.before_after_pairs),
  }
}

function assertExpectedCounts(counts: Record<TableName, number>) {
  const mismatches = Object.entries(EXPECTED_COUNTS).filter(
    ([table, expected]) => counts[table as TableName] !== expected
  )
  if (mismatches.length === 0) return

  const details = mismatches
    .map(([table, expected]) => `${table}: expected ${expected}, got ${counts[table as TableName]}`)
    .join('; ')
  throw new Error(`SQLite KB counts do not match expected source snapshot: ${details}`)
}

function quoteIdent(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`
}

function valueFor(row: Row, column: string): unknown {
  return row[column] ?? null
}

async function assertDestinationSchema(client: PoolClient) {
  const expectedTables = [...TABLES.map((table) => table.pgTable), 'migration_runs']
  const tables = await client.query<{ table_name: string }>(
    `
      select table_name
      from information_schema.tables
      where table_schema = $1
        and table_name = any($2::text[])
    `,
    [SCHEMA, expectedTables]
  )
  const found = new Set(tables.rows.map((row) => row.table_name))
  const missing = expectedTables.filter((table) => !found.has(table))

  if (missing.length > 0) {
    throw new Error(
      `Missing destination tables in schema "${SCHEMA}": ${missing.join(', ')}. Apply supabase/migrations/0002_vibeid_kb.sql first.`
    )
  }
}

async function truncateDestination(client: PoolClient) {
  await client.query(`truncate table ${SCHEMA}.before_after_pairs`)
  await client.query(`truncate table ${SCHEMA}.segments`)
  await client.query(`truncate table ${SCHEMA}.sessions`)
  await client.query(`truncate table ${SCHEMA}.source_students`)
  await client.query(`truncate table ${SCHEMA}.mentors`)
}

async function insertRows(client: PoolClient, table: TableSpec, rows: Row[]) {
  if (rows.length === 0) return

  const columns = table.columns.map(quoteIdent).join(', ')
  const rowWidth = table.columns.length
  const values: unknown[] = []
  const placeholders = rows.map((row, rowIndex) => {
    const offset = rowIndex * rowWidth
    const rowPlaceholders = table.columns.map((column, columnIndex) => {
      values.push(valueFor(row, column))
      return `$${offset + columnIndex + 1}`
    })
    return `(${rowPlaceholders.join(', ')})`
  })

  await client.query(
    `insert into ${SCHEMA}.${table.pgTable} (${columns}) values ${placeholders.join(', ')}`,
    values
  )
}

async function verifyDestinationCounts(client: PoolClient, expected: Record<TableName, number>) {
  for (const table of TABLES) {
    const result = await client.query<{ count: string }>(
      `select count(*)::text as count from ${SCHEMA}.${table.pgTable}`
    )
    const count = Number(result.rows[0].count)
    if (count !== expected[table.pgTable]) {
      throw new Error(`${table.pgTable} destination count mismatch: expected ${expected[table.pgTable]}, got ${count}`)
    }
  }
}

async function applyMigration(input: {
  dbPath: string
  sourceSha: string
  data: Record<TableName, Row[]>
  counts: Record<TableName, number>
  checksums: Record<TableName, string>
}) {
  const databaseUrl = process.env.DATABASE_URL?.trim()
  if (!databaseUrl) throw new Error('DATABASE_URL is required for --apply')

  const pool = new Pool({ connectionString: databaseUrl, max: 1 })
  const client = await pool.connect()
  try {
    await client.query('begin')
    await client.query('select pg_advisory_xact_lock($1)', [ADVISORY_LOCK_ID])
    await assertDestinationSchema(client)
    await truncateDestination(client)

    for (const table of TABLES) {
      await insertRows(client, table, input.data[table.pgTable])
    }

    await verifyDestinationCounts(client, input.counts)
    await client.query(
      `
        insert into ${SCHEMA}.migration_runs
          (source_path, source_sha256, mode, table_counts, table_checksums, expected_counts)
        values ($1, $2, 'apply', $3, $4, $5)
      `,
      [
        input.dbPath,
        input.sourceSha,
        JSON.stringify(input.counts),
        JSON.stringify(input.checksums),
        JSON.stringify(EXPECTED_COUNTS),
      ]
    )
    await client.query('commit')
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

function printSummary(input: {
  mode: 'dry-run' | 'apply'
  dbPath: string
  sourceSha: string
  counts: Record<TableName, number>
  checksums: Record<TableName, string>
}) {
  const summary = {
    mode: input.mode,
    sourcePath: input.dbPath,
    sourceSha256: input.sourceSha,
    counts: input.counts,
    checksums: input.checksums,
    expectedCounts: EXPECTED_COUNTS,
  }
  console.log(JSON.stringify(summary, null, 2))
}

async function main() {
  const mode = parseMode()
  const dbPath = path.resolve(process.cwd(), SQLITE_PATH)
  if (!existsSync(dbPath)) throw new Error(`SQLite KB not found at ${dbPath}`)

  const sourceSha = fileSha256(dbPath)
  const data = await readSourceData(dbPath)
  const counts = countRows(data)
  const checksums = checksumTables(data)
  assertExpectedCounts(counts)

  if (mode === 'apply') {
    await applyMigration({ dbPath, sourceSha, data, counts, checksums })
  }

  printSummary({ mode, dbPath, sourceSha, counts, checksums })
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Unknown migration error')
  process.exit(1)
})
