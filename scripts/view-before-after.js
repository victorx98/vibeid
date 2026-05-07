const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  const client = await pool.connect();
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
      LIMIT 20
    `);

    console.log(`\n📊 Found ${result.rows.length} before/after pairs\n`);

    result.rows.forEach((row, index) => {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`【ID: ${row.id}】 Pair Order: ${row.pair_order}`);
      console.log(`导师: ${row.mentor_name} @ ${row.company}`);
      console.log(`Session ID: ${row.session_id}`);
      if (row.issue_tags) console.log(`问题标签: ${row.issue_tags}`);
      if (row.L3_tag) console.log(`L3标签: ${row.L3_tag}`);
      if (row.freq_stat) console.log(`频率统计: ${row.freq_stat}`);

      console.log(`\n📝 Before:`);
      console.log(`  ${row.before_text}`);

      console.log(`\n✨ After:`);
      console.log(`  ${row.after_text}`);

      console.log(`\n💡 Reason:`);
      console.log(`  ${row.reason}`);

      if (row.mentor_quote) {
        console.log(`\n💬 Mentor Quote:`);
        console.log(`  "${row.mentor_quote}"`);
      }
    });

    console.log(`\n${'='.repeat(80)}\n`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
