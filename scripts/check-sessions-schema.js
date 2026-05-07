require('dotenv').config();
const { Pool } = require('pg');

const postgres = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkSchema() {
  try {
    console.log('\n📋 vibeid.sessions 的列結構:');
    console.log('─'.repeat(60));

    const columnsResult = await postgres.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'vibeid' AND table_name = 'sessions'
      ORDER BY ordinal_position;
    `);

    columnsResult.rows.forEach(col => {
      const nullable = col.is_nullable === 'YES' ? '✓' : '✗';
      console.log(`${col.column_name.padEnd(30)} ${col.data_type.padEnd(15)} [nullable: ${nullable}]`);
    });

    console.log('\n📋 vibeid.segments 的列結構:');
    console.log('─'.repeat(60));

    const segmentsResult = await postgres.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'vibeid' AND table_name = 'segments'
      ORDER BY ordinal_position;
    `);

    segmentsResult.rows.forEach(col => {
      const nullable = col.is_nullable === 'YES' ? '✓' : '✗';
      console.log(`${col.column_name.padEnd(30)} ${col.data_type.padEnd(15)} [nullable: ${nullable}]`);
    });

    console.log('\n📋 vibeid.before_after_pairs 的列結構:');
    console.log('─'.repeat(60));

    const baResult = await postgres.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'vibeid' AND table_name = 'before_after_pairs'
      ORDER BY ordinal_position;
    `);

    baResult.rows.forEach(col => {
      const nullable = col.is_nullable === 'YES' ? '✓' : '✗';
      console.log(`${col.column_name.padEnd(30)} ${col.data_type.padEnd(15)} [nullable: ${nullable}]`);
    });

  } catch (error) {
    console.error('❌ 查詢失敗:', error.message);
  } finally {
    await postgres.end();
  }
}

checkSchema();
