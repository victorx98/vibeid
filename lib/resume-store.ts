import { query, withTransaction } from './db'

export interface ResumeRecord {
  id: string
  fileName: string | null
  resumeText: string
  isCurrent: boolean
  createdAt: string
  updatedAt: string
}

interface ResumeRow {
  id: string
  file_name: string | null
  resume_text: string
  is_current: boolean
  created_at: Date | string
  updated_at: Date | string
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value
}

function mapResume(row: ResumeRow): ResumeRecord {
  return {
    id: row.id,
    fileName: row.file_name,
    resumeText: row.resume_text,
    isCurrent: row.is_current,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  }
}

const SELECT_COLUMNS =
  'id, file_name, resume_text, is_current, created_at, updated_at'

export async function listResumesForUser(userId: string): Promise<ResumeRecord[]> {
  const result = await query<ResumeRow>(
    `
      select ${SELECT_COLUMNS}
      from public.resumes
      where user_id = $1
      order by is_current desc, updated_at desc
    `,
    [userId]
  )
  return result.rows.map(mapResume)
}

export async function getResumeForUser(
  userId: string,
  resumeId: string
): Promise<ResumeRecord | null> {
  const result = await query<ResumeRow>(
    `
      select ${SELECT_COLUMNS}
      from public.resumes
      where id = $1 and user_id = $2
    `,
    [resumeId, userId]
  )
  return result.rows[0] ? mapResume(result.rows[0]) : null
}

export async function getCurrentResumeForUser(
  userId: string
): Promise<ResumeRecord | null> {
  const result = await query<ResumeRow>(
    `
      select ${SELECT_COLUMNS}
      from public.resumes
      where user_id = $1 and is_current = true
      order by updated_at desc
      limit 1
    `,
    [userId]
  )
  return result.rows[0] ? mapResume(result.rows[0]) : null
}

export async function createResume(input: {
  userId: string
  resumeText: string
  fileName?: string | null
  makeCurrent?: boolean
}): Promise<ResumeRecord> {
  const makeCurrent = input.makeCurrent ?? true

  return withTransaction(async (client) => {
    if (makeCurrent) {
      await client.query(
        `update public.resumes set is_current = false where user_id = $1 and is_current = true`,
        [input.userId]
      )
    }

    const result = await client.query<ResumeRow>(
      `
        insert into public.resumes (user_id, file_name, resume_text, is_current)
        values ($1, $2, $3, $4)
        returning ${SELECT_COLUMNS}
      `,
      [input.userId, input.fileName ?? null, input.resumeText, makeCurrent]
    )
    return mapResume(result.rows[0])
  })
}

export async function deleteResumeForUser(
  userId: string,
  resumeId: string
): Promise<boolean> {
  const result = await query(
    `delete from public.resumes where id = $1 and user_id = $2`,
    [resumeId, userId]
  )
  return result.rowCount === 1
}
