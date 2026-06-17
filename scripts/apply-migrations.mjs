#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Client } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, "..", "supabase", "migrations");

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const ssl = databaseUrl.includes("supabase.com")
  ? { rejectUnauthorized: false }
  : undefined;

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

function parseMigrationFilename(filename) {
  const match = /^(\d+)_(.+)\.sql$/.exec(filename);
  if (!match) return null;
  return { version: match[1], name: match[2], filename };
}

async function appliedVersions(client) {
  const { rows } = await client.query(
    "select version from supabase_migrations.schema_migrations order by version",
  );
  return new Set(rows.map((row) => row.version));
}

async function main() {
  const client = new Client({ connectionString: databaseUrl, ssl });
  await client.connect();

  try {
    await ensureMigrationTable(client);
    const applied = await appliedVersions(client);

    const files = fs
      .readdirSync(migrationsDir)
      .filter((name) => name.endsWith(".sql"))
      .sort();

    for (const filename of files) {
      const parsed = parseMigrationFilename(filename);
      if (!parsed) {
        console.warn(`Skipping ${filename}`);
        continue;
      }

      if (applied.has(parsed.version)) {
        console.log(`skip ${parsed.version}_${parsed.name} (already applied)`);
        continue;
      }

      const sql = fs.readFileSync(path.join(migrationsDir, filename), "utf8");
      console.log(`apply ${parsed.version}_${parsed.name}...`);

      await client.query("begin");
      try {
        await client.query(sql);
        await client.query(
          `insert into supabase_migrations.schema_migrations (version, name, statements)
           values ($1, $2, $3::text[])`,
          [parsed.version, parsed.name, [sql.trim()]],
        );
        await client.query("commit");
        console.log(`ok  ${parsed.version}_${parsed.name}`);
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
