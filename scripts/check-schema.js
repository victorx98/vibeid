require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkSchema() {
  try {
    // 查詢 vibeid schema 中的所有表
    const tablesResult = await pool.query(`
      SELECT
        table_name,
        (SELECT COUNT(*) FROM information_schema.columns
         WHERE table_schema = 'vibeid' AND table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'vibeid'
      ORDER BY table_name;
    `);

    console.log('\n📊 vibeid schema 中的表:');
    console.log('─'.repeat(50));

    if (tablesResult.rows.length === 0) {
      console.log('❌ 找不到任何表');
      return;
    }

    for (const table of tablesResult.rows) {
      // 查詢每個表的行數
      const countResult = await pool.query(`
        SELECT COUNT(*) as row_count FROM vibeid."${table.table_name}";
      `);
      const rowCount = countResult.rows[0].row_count;

      console.log(`✅ ${table.table_name.padEnd(25)} (${rowCount} rows, ${table.column_count} columns)`);
    }

    console.log('\n📋 表對比:');
    console.log('─'.repeat(50));
    const requiredTables = [
      'mentors',
      'students',
      'sessions',
      'segments',
      'before_after_pairs',
      'position_skills'
    ];

    const existingTables = tablesResult.rows.map(r => r.table_name);

    for (const table of requiredTables) {
      const exists = existingTables.includes(table);
      console.log(`${exists ? '✅' : '❌'} ${table}`);
    }

  } catch (error) {
    console.error('❌ 查詢出錯:', error.message);
    console.error('詳細錯誤:', error);
    console.error('DATABASE_URL:', process.env.DATABASE_URL ? '✅ 已設定' : '❌ 未設定');
  } finally {
    await pool.end();
  }
}

checkSchema();
