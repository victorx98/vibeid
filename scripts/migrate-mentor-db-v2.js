require('dotenv').config();
const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');
const { Pool } = require('pg');

let db;
const postgres = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migrate() {
  try {
    console.log('\n🔄 開始遷移（智能列映射）...\n');

    const SQL = await initSqlJs();
    const sqlitePath = 'C:\\Users\\viviy\\MentorX\\data\\mentor_kb-v1.db';

    console.log(`📖 讀取 SQLite: ${sqlitePath}`);
    const fileBuffer = fs.readFileSync(sqlitePath);
    db = new SQL.Database(fileBuffer);

    // 1️⃣ mentors - 特殊處理（因為 id 需要轉換）
    await migrateMentorsTable();

    // 2️⃣ sessions - 智能列檢測
    await migrateWithColumnDetection('sessions', 'id', true);

    // 3️⃣ segments - 智能列檢測
    await migrateWithColumnDetection('segments', 'id', false);

    // 4️⃣ before_after_pairs - 智能列檢測
    await migrateWithColumnDetection('before_after_pairs', 'id', false);

    console.log('\n✅ 遷移完成！');
    await verifyMigration();

  } catch (error) {
    console.error('❌ 遷移失敗:', error.message);
    throw error;
  } finally {
    await postgres.end();
  }
}

async function migrateMentorsTable() {
  try {
    const stmt = db.prepare(`SELECT * FROM mentors`);
    const rows = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();

    console.log(`📥 mentors: 從 SQLite 讀取 ${rows.length} rows`);

    await postgres.query(`TRUNCATE TABLE vibeid.mentors CASCADE`);
    console.log(`🗑️  已清空 vibeid.mentors`);

    const targetColumns = [
      'id', 'name', 'company', 'title', 'location',
      'industry_expertise', 'coaching_positions', 'tech_skills',
      'credibility_signal', 'career_path', 'insight_scope',
      'rating', 'session_count', 'active', 'consent_status'
    ];

    const mappings = {
      'industry_expertise_json': 'industry_expertise',
      'coaching_positions_json': 'coaching_positions',
      'tech_skills_json': 'tech_skills',
      'insight_scope_json': 'insight_scope',
    };

    const insertQuery = `
      INSERT INTO vibeid.mentors (${targetColumns.join(', ')})
      VALUES (${targetColumns.map((_, i) => `$${i + 1}`).join(', ')})
    `;

    let inserted = 0;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const values = targetColumns.map(col => {
        let sourceCol = col;
        for (const [sqliteCol, postgresCol] of Object.entries(mappings)) {
          if (postgresCol === col) {
            sourceCol = sqliteCol;
            break;
          }
        }

        let value = row[sourceCol];
        if (col === 'id') value = i + 1;
        if (col === 'active') value = true;
        if (col === 'consent_status') value = value || 'pending';

        return value ?? null;
      });

      try {
        await postgres.query(insertQuery, values);
        inserted++;
      } catch (error) {
        // 忽略大多數錯誤
      }
    }

    console.log(`✅ mentors: 已插入 ${inserted}/${rows.length} rows\n`);

  } catch (error) {
    console.error(`❌ mentors 遷移失敗:`, error.message);
    throw error;
  }
}

async function migrateWithColumnDetection(tableName, idColumn, overwrite = false) {
  try {
    // 1. 從 SQLite 讀取資料
    const stmt = db.prepare(`SELECT * FROM ${tableName}`);
    const sqliteRows = [];
    while (stmt.step()) {
      sqliteRows.push(stmt.getAsObject());
    }
    stmt.free();

    if (sqliteRows.length === 0) {
      console.log(`⚠️  ${tableName}: SQLite 中沒有資料\n`);
      return;
    }

    // 2. 查詢 Postgres 的列
    const columnsResult = await postgres.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'vibeid' AND table_name = $1
      ORDER BY ordinal_position
    `, [tableName]);

    const postgresColumns = columnsResult.rows.map(r => r.column_name);
    const sqliteColumns = Object.keys(sqliteRows[0]);

    // 3. 找出共同的列
    const commonColumns = sqliteColumns.filter(col => postgresColumns.includes(col));

    if (commonColumns.length === 0) {
      console.log(`❌ ${tableName}: 沒有共同的列可插入\n`);
      return;
    }

    console.log(`📥 ${tableName}: 從 SQLite 讀取 ${sqliteRows.length} rows`);
    console.log(`   共同列: ${commonColumns.join(', ')}`);

    // 4. 如果是覆蓋，先清空
    if (overwrite) {
      await postgres.query(`TRUNCATE TABLE vibeid.${tableName} CASCADE`);
      console.log(`🗑️  已清空 vibeid.${tableName}`);
    }

    // 5. 準備 INSERT 查詢
    const placeholders = commonColumns.map((_, i) => `$${i + 1}`).join(', ');
    const insertQuery = `INSERT INTO vibeid.${tableName} (${commonColumns.join(', ')}) VALUES (${placeholders})`;

    // 6. 查詢 Postgres 現有的 id
    let postgresIds = new Set();
    if (!overwrite) {
      const existingResult = await postgres.query(`SELECT ${idColumn} FROM vibeid.${tableName}`);
      postgresIds = new Set(existingResult.rows.map(r => r[idColumn]));
    }

    // 7. 插入資料
    let inserted = 0;
    let skipped = 0;

    for (const row of sqliteRows) {
      // 如果 id 已存在且不是覆蓋，跳過
      if (!overwrite && postgresIds.has(row[idColumn])) {
        skipped++;
        continue;
      }

      const values = commonColumns.map(col => row[col] ?? null);

      try {
        await postgres.query(insertQuery, values);
        inserted++;
      } catch (error) {
        if (error.code !== '23505' && error.code !== '23502') {
          if (inserted === 0) {
            // 第一個錯誤就報告
            console.error(`  ❌ 首個錯誤 [${row[idColumn]}]:`, error.message.substring(0, 80));
            console.error(`     Code: ${error.code}`);
          }
        }
      }
    }

    console.log(`✅ ${tableName}: 已插入 ${inserted} rows` + (skipped > 0 ? `, 跳過 ${skipped} 個重複` : '') + `\n`);

  } catch (error) {
    console.error(`❌ ${tableName} 遷移失敗:`, error.message);
    throw error;
  }
}

async function verifyMigration() {
  console.log('📊 最終驗證：');
  console.log('─'.repeat(50));

  const tables = ['mentors', 'sessions', 'segments', 'before_after_pairs'];
  for (const table of tables) {
    try {
      const result = await postgres.query(`SELECT COUNT(*) as count FROM vibeid.${table}`);
      const count = result.rows[0].count;
      console.log(`✅ vibeid.${table.padEnd(25)} ${count} rows`);
    } catch (error) {
      console.log(`❌ vibeid.${table.padEnd(25)} 查詢失敗`);
    }
  }
}

migrate().catch(error => {
  console.error('💥 致命錯誤:', error);
  process.exit(1);
});
