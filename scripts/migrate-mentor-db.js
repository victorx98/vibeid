require('dotenv').config();
const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');
const { Pool } = require('pg');

let db;
const postgres = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// 列映射：SQLite → Supabase
const COLUMN_MAPPINGS = {
  mentors: {
    'industry_expertise_json': 'industry_expertise',
    'coaching_positions_json': 'coaching_positions',
    'tech_skills_json': 'tech_skills',
    'insight_scope_json': 'insight_scope',
  },
};

async function tableExists(tableName) {
  try {
    const result = await postgres.query(`
      SELECT EXISTS(
        SELECT FROM information_schema.tables
        WHERE table_schema = 'vibeid' AND table_name = $1
      )
    `, [tableName]);
    return result.rows[0].exists;
  } catch (error) {
    return false;
  }
}

async function migrate() {
  try {
    console.log('\n🔄 開始遷移...\n');

    // 初始化 SQL.js
    const SQL = await initSqlJs();
    const sqlitePath = process.env.MENTOR_KB_PATH
      ? path.join(process.env.MENTOR_KB_PATH, 'mentor_kb.db')
      : 'C:\\Users\\viviy\\OneDrive\\文件\\GitHub\\db_creator\\data\\mentor_kb.db';

    console.log(`📖 讀取 SQLite: ${sqlitePath}`);
    const fileBuffer = fs.readFileSync(sqlitePath);
    db = new SQL.Database(fileBuffer);

    // 1️⃣ 遷移 mentors（完全覆蓋）
    await migrateMentorsTable();

    // 2️⃣ 遷移 students
    const studentsExists = await tableExists('students');
    if (studentsExists) {
      await migrateTable('students', true);
    } else {
      console.log(`⚠️  跳過 students: 表不存在\n`);
    }

    // 3️⃣ 遷移 position_skills
    const positionSkillsExists = await tableExists('position_skills');
    if (positionSkillsExists) {
      await migrateTable('position_skills', true);
    } else {
      console.log(`⚠️  跳過 position_skills: 表不存在\n`);
    }

    // 4️⃣ 合併 sessions
    const sessionsExists = await tableExists('sessions');
    if (sessionsExists) {
      await mergeTable('sessions', 'id');
    } else {
      console.log(`⚠️  跳過 sessions: 表不存在\n`);
    }

    // 5️⃣ 合併 segments
    const segmentsExists = await tableExists('segments');
    if (segmentsExists) {
      await mergeTable('segments', 'id');
    } else {
      console.log(`⚠️  跳過 segments: 表不存在\n`);
    }

    // 6️⃣ 合併 before_after_pairs
    const baExists = await tableExists('before_after_pairs');
    if (baExists) {
      await mergeTable('before_after_pairs', 'id');
    } else {
      console.log(`⚠️  跳過 before_after_pairs: 表不存在\n`);
    }

    console.log('\n✅ 遷移完成！');

    // 驗證
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
    // 從 SQLite 讀取資料
    const stmt = db.prepare(`SELECT * FROM mentors`);
    const rows = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();

    console.log(`📥 mentors: 從 SQLite 讀取 ${rows.length} rows`);

    if (rows.length === 0) {
      console.log(`⚠️  mentors 在 SQLite 中沒有數據`);
      return;
    }

    // 清空 mentors 表
    await postgres.query(`TRUNCATE TABLE vibeid.mentors CASCADE`);
    console.log(`🗑️  已清空 vibeid.mentors`);

    // 映射 SQLite 的列到 Supabase 的列
    const targetColumns = [
      'id', 'name', 'company', 'title', 'location',
      'industry_expertise', 'coaching_positions', 'tech_skills',
      'credibility_signal', 'career_path', 'insight_scope',
      'rating', 'session_count', 'active', 'consent_status'
    ];

    const mappings = COLUMN_MAPPINGS.mentors;
    const insertQuery = `
      INSERT INTO vibeid.mentors (${targetColumns.join(', ')})
      VALUES (${targetColumns.map((_, i) => `$${i + 1}`).join(', ')})
    `;

    let inserted = 0;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const values = targetColumns.map(col => {
        // 查詢是否需要從其他列映射
        let sourceCol = col;
        for (const [sqliteCol, postgresCol] of Object.entries(mappings)) {
          if (postgresCol === col) {
            sourceCol = sqliteCol;
            break;
          }
        }

        let value = row[sourceCol];

        // 特殊欄位處理
        if (col === 'id') {
          // 用遞增的整數而不是 UUID
          value = i + 1;
        } else if (col === 'active') {
          // active 欄位必須為 true 或 false
          value = true;
        } else if (col === 'consent_status') {
          // consent_status 必須有值
          value = value || 'pending';
        }

        // 其他欄位如果不存在則為 null
        return value ?? null;
      });

      try {
        await postgres.query(insertQuery, values);
        inserted++;
      } catch (error) {
        if (error.code !== '23505' && error.code !== '23502') {
          if (inserted % 100 === 0) {
            // 只印出每 100 筆的第一個錯誤
            console.error(`  ⚠️  錯誤 [${i}/${rows.length}]:`, error.message.substring(0, 40));
          }
        }
      }
    }

    console.log(`✅ mentors: 已插入 ${inserted} rows\n`);

  } catch (error) {
    console.error(`❌ mentors 遷移失敗:`, error.message);
    throw error;
  }
}

async function migrateTable(tableName, overwrite = false) {
  try {
    // 從 SQLite 讀取資料
    const stmt = db.prepare(`SELECT * FROM ${tableName}`);
    const rows = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();

    console.log(`📥 ${tableName}: 從 SQLite 讀取 ${rows.length} rows`);

    if (rows.length === 0) {
      console.log(`⚠️  ${tableName} 在 SQLite 中沒有數據`);
      return;
    }

    // 清空或備份
    if (overwrite) {
      await postgres.query(`TRUNCATE TABLE vibeid.${tableName} CASCADE`);
      console.log(`🗑️  已清空 vibeid.${tableName}`);
    }

    // 插入數據
    const columns = Object.keys(rows[0]);
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
    const columnNames = columns.join(', ');

    const insertQuery = `INSERT INTO vibeid.${tableName} (${columnNames}) VALUES (${placeholders})`;

    let inserted = 0;
    for (const row of rows) {
      const values = columns.map(col => row[col] ?? null);
      try {
        await postgres.query(insertQuery, values);
        inserted++;
      } catch (error) {
        if (error.code === '23505') {
          // 忽略重複的主鍵
        } else {
          console.error(`  ❌ 錯誤 [${row.id || row.name}]:`, error.message);
        }
      }
    }

    console.log(`✅ ${tableName}: 已插入 ${inserted} rows\n`);

  } catch (error) {
    console.error(`❌ ${tableName} 遷移失敗:`, error.message);
    throw error;
  }
}

async function mergeTable(tableName, idColumn) {
  try {
    // 從 SQLite 讀取資料
    const stmt = db.prepare(`SELECT * FROM ${tableName}`);
    const sqliteRows = [];
    while (stmt.step()) {
      sqliteRows.push(stmt.getAsObject());
    }
    stmt.free();

    console.log(`📥 ${tableName}: 從 SQLite 讀取 ${sqliteRows.length} rows`);

    // 從 Postgres 讀取現有資料
    const pgResult = await postgres.query(`SELECT ${idColumn} FROM vibeid.${tableName}`);
    const pgIds = new Set(pgResult.rows.map(r => r[idColumn]));
    console.log(`📦 ${tableName}: Postgres 已有 ${pgIds.size} rows`);

    // 找出需要插入的新行
    const newRows = sqliteRows.filter(row => !pgIds.has(row[idColumn]));
    console.log(`🆕 ${tableName}: 需要插入 ${newRows.length} 新 rows`);

    if (newRows.length === 0) {
      console.log(`✅ ${tableName}: 無新數據需要插入\n`);
      return;
    }

    // 插入新行
    const columns = Object.keys(newRows[0]);
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
    const columnNames = columns.join(', ');
    const insertQuery = `INSERT INTO vibeid.${tableName} (${columnNames}) VALUES (${placeholders})`;

    let inserted = 0;
    for (const row of newRows) {
      const values = columns.map(col => row[col] ?? null);
      try {
        await postgres.query(insertQuery, values);
        inserted++;
      } catch (error) {
        if (error.code !== '23505') {
          console.error(`  ❌ 錯誤 [${row[idColumn]}]:`, error.message);
        }
      }
    }

    console.log(`✅ ${tableName}: 已插入 ${inserted} 新 rows\n`);

  } catch (error) {
    console.error(`❌ ${tableName} 合併失敗:`, error.message);
    throw error;
  }
}

async function verifyMigration() {
  console.log('\n📊 驗證結果：');
  console.log('─'.repeat(50));

  const tables = ['mentors', 'students', 'sessions', 'segments', 'before_after_pairs', 'position_skills'];
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
