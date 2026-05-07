require('dotenv').config();
const { Pool } = require('pg');

const postgres = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkSchema() {
  try {
    // 查詢 mentors 表的列
    const columnsResult = await postgres.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'vibeid' AND table_name = 'mentors'
      ORDER BY ordinal_position;
    `);

    console.log('\n📋 vibeid.mentors 的列結構:');
    console.log('─'.repeat(60));
    columnsResult.rows.forEach(col => {
      const nullable = col.is_nullable === 'YES' ? '✓' : '✗';
      console.log(`${col.column_name.padEnd(30)} ${col.data_type.padEnd(15)} [nullable: ${nullable}]`);
    });

    console.log('\n✅ 共', columnsResult.rows.length, '列');

  } catch (error) {
    console.error('❌ 查詢失敗:', error.message);
  } finally {
    await postgres.end();
  }
}

checkSchema();
