import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

async function main() {
  const client = await pool.connect()
  try {
    const result = await client.query(`
      SELECT
        ba.id,
        ba.session_id,
        ba.pair_order,
        ba.before_text,
        ba.after_text,
        ba.reason,
        ba.issue_tags,
        ba.mentor_quote,
        ba.L3_tag,
        ba.freq_stat,
        m.name as mentor_name,
        m.company
      FROM vibeid.before_after_pairs ba
      JOIN vibeid.sessions s ON ba.session_id = s.id
      JOIN vibeid.mentors m ON s.mentor_id = m.id
      ORDER BY ba.id DESC
      LIMIT 25
    `)

    console.log(`\n📊 Found ${result.rows.length} before/after pairs\n`)

    result.rows.forEach((row, index) => {
      console.log(`\n${'='.repeat(120)}`)
      console.log(`【${index + 1}】 ID: ${row.id} | Pair Order: ${row.pair_order} | Session: ${row.session_id}`)
      console.log(`👨‍🏫 Mentor: ${row.mentor_name} @ ${row.company}`)

      if (row.issue_tags) console.log(`🏷️  Issue Tags: ${row.issue_tags}`)
      if (row.L3_tag) console.log(`📍 L3 Tag: ${row.L3_tag}`)
      if (row.freq_stat) console.log(`📈 Freq Stat: ${row.freq_stat}`)

      console.log(`\n📝 BEFORE:`)
      console.log(`   ${row.before_text}`)

      console.log(`\n✨ AFTER:`)
      console.log(`   ${row.after_text}`)

      console.log(`\n💡 REASON:`)
      console.log(`   ${row.reason}`)

      if (row.mentor_quote) {
        console.log(`\n💬 MENTOR QUOTE:`)
        console.log(`   "${row.mentor_quote}"`)
      }
    })

    console.log(`\n${'='.repeat(120)}\n`)
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
