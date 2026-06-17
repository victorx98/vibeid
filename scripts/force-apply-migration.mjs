#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Client } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, "..", "supabase", "migrations");

const version = process.argv[2];
if (!version) {
  console.error("Usage: node scripts/force-apply-migration.mjs <version>");
  console.error("Example: node scripts/force-apply-migration.mjs 0005");
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const ssl = databaseUrl.includes("supabase.com")
  ? { rejectUnauthorized: false }
  : undefined;

function parseMigrationFilename(filename) {
  const match = /^(\d+)_(.+)\.sql$/.exec(filename);
  if (!match) return null;
  return { version: match[1], name: match[2], filename };
}

async function ensureMigrationTable(client) {
  await client.query(`
    create schema if not exists supabase_migrations;
    create table if not exists supabase_migrations.schema_migrations (
      version text primary key,
      statements text[],
      name text
    );
  `);
}

async function main() {
  const files = fs
    .readdirSync(migrationsDir)
    .filter((name) => name.endsWith(".sql"))
    .sort();

  const target = files
    .map((filename) => parseMigrationFilename(filename))
    .find((parsed) => parsed && parsed.version === version);

  if (!target) {
    console.error(`No migration found for version ${version}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(path.join(migrationsDir, target.filename), "utf8");
  const client = new Client({ connectionString: databaseUrl, ssl });
  await client.connect();

  try {
    await ensureMigrationTable(client);
    console.log(`force apply ${target.version}_${target.name}...`);

    await client.query("begin");
    try {
      await client.query(sql);
      await client.query(
        `insert into supabase_migrations.schema_migrations (version, name, statements)
         values ($1, $2, $3::text[])
         on conflict (version) do update
           set name = excluded.name,
               statements = excluded.statements`,
        [target.version, target.name, [sql.trim()]],
      );
      await client.query("commit");
      console.log(`ok  ${target.version}_${target.name}`);
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
