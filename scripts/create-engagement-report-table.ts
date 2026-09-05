/**
 * ===========================================================================
 *  CREATE find_event_lobby_engagement_report
 * ===========================================================================
 *
 *  Backs the User Activity Report
 *  (src/app/members/(event)/event_user_activity_report/page.tsx), which lists every logged lobby
 *  interaction for an event.
 *
 *  Like find_event_configurations and find_event_registration_fields, this table exists in the
 *  legacy MySQL install but was never carried across to Postgres. It is not in schema.prisma
 *  either, so the report reads it with raw SQL and asks `to_regclass` whether it exists — which
 *  is why the page currently says "Activity tracking isn't set up for this database" instead of
 *  failing with:
 *
 *      42P01  relation "find_event_lobby_engagement_report" does not exist
 *
 *  Run once:
 *
 *      npm run db:engagement-report
 *      npx tsx scripts/create-engagement-report-table.ts --dry-run
 *
 *  SAFE TO RE-RUN — creates only what is missing, never drops or alters, and never touches
 *  existing rows.
 *
 *  ---------------------------------------------------------------------------
 *  READ THIS BEFORE EXPECTING ROWS
 *  ---------------------------------------------------------------------------
 *
 *  Creating the table gives you an EMPTY report, not a populated one. Nothing in this app writes
 *  engagement rows yet — the legacy site records them as visitors move around lobby.php. So
 *  after running this you will see "No lobby activity recorded yet" rather than the panel about
 *  the missing table. Two ways to change that, and they are independent:
 *
 *    1. BACKFILL. Copy the existing rows across from the legacy MySQL database for the events
 *       you care about. That is what makes the report show history like the live site's.
 *    2. START LOGGING. Have the new lobby record interactions as they happen, so the report
 *       fills going forward. That is application work, not a migration.
 *
 *  The column list below is derived from every column members/event_user_activity_report.php
 *  reads, not from the legacy DDL — so types are chosen to be permissive (the id columns are
 *  nullable, because the legacy writes only the ones relevant to each interaction). If you later
 *  backfill from MySQL and hit a type mismatch, widen the column rather than dropping the table.
 */

import * as path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");

const flags = new Set(process.argv.slice(2).filter((a) => a.startsWith("--")).map((a) => a.slice(2)));
const DRY_RUN = flags.has("dry-run");

try {
  const dotenv = require("dotenv");
  dotenv.config({ path: path.join(ROOT, ".env") });
  dotenv.config({ path: path.join(ROOT, ".env.local"), override: false });
} catch {
  console.warn("! dotenv unavailable — relying on the ambient environment");
}

const TABLE = "find_event_lobby_engagement_report";

/**
 * Every column the legacy report reads.
 *
 * Only `event_id` is required: one interaction sets `nav_clicked_title`, another sets
 * `spot_type` + `exhibitor_id`, another `post_action_type` + `post_layout_id`. Making any of
 * those NOT NULL would reject the majority of rows.
 */
const COLUMNS: { name: string; ddl: string }[] = [
  { name: "event_id", ddl: "INTEGER NOT NULL" },
  { name: "user_id", ddl: "INTEGER" },
  { name: "listing_id", ddl: "INTEGER" },
  // The report orders and groups by this, so it must always have a value.
  { name: "created_on", ddl: "TIMESTAMP(0) NOT NULL DEFAULT NOW()" },
  { name: "post_action_type", ddl: "VARCHAR(255)" },
  { name: "post_asset_id", ddl: "INTEGER" },
  { name: "post_layout_id", ddl: "INTEGER" },
  { name: "nav_clicked_title", ddl: "VARCHAR(255)" },
  { name: "spot_type", ddl: "VARCHAR(255)" },
  { name: "spot_id", ddl: "INTEGER" },
  { name: "exhibitor_id", ddl: "INTEGER" },
];

async function main() {
  const connectionString =
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL;

  if (!connectionString) {
    console.error("No DATABASE_URL / POSTGRES_URL found in .env — nothing to connect to.");
    process.exit(1);
  }

  const { Client } = require("pg");
  const client = new Client({ connectionString, connectionTimeoutMillis: 20_000 });

  console.log("=".repeat(70));
  console.log(` ${TABLE}${DRY_RUN ? "   [DRY RUN — nothing will be written]" : ""}`);
  console.log("=".repeat(70));

  await client.connect();

  try {
    const { rows } = await client.query(`SELECT to_regclass($1) AS oid`, [`public.${TABLE}`]);
    const tableExists = rows[0]?.oid !== null;
    console.log(`\n  table exists : ${tableExists ? "yes" : "NO — will be created"}`);

    if (DRY_RUN) {
      console.log("\n  Dry run: re-run without --dry-run to apply.");
      return;
    }

    if (!tableExists) {
      const body = COLUMNS.map((c) => `  "${c.name}" ${c.ddl}`).join(",\n");
      await client.query(
        `CREATE TABLE IF NOT EXISTS "${TABLE}" (\n  "id" SERIAL PRIMARY KEY,\n${body}\n)`,
      );
      console.log(`  + created table "${TABLE}"`);
    }

    const { rows: cols } = await client.query(
      `SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1`,
      [TABLE],
    );
    const present = new Set(cols.map((c: any) => c.column_name));
    for (const column of COLUMNS) {
      if (!present.has(column.name)) {
        await client.query(`ALTER TABLE "${TABLE}" ADD COLUMN "${column.name}" ${column.ddl}`);
        console.log(`  + added missing column "${column.name}"`);
      }
    }

    /*
     * The report's only query filters on event_id and orders by created_on DESC, so this index
     * matches it exactly. Worth having from the start: this is an append-only log that grows
     * with every click, and it is the one table here that will be large.
     */
    await client.query(
      `CREATE INDEX IF NOT EXISTS "${TABLE}_event_created_idx" ON "${TABLE}" ("event_id", "created_on" DESC)`,
    );
    console.log(`  = index on (event_id, created_on DESC) ensured`);

    // The per-user filter narrows on both columns together.
    await client.query(
      `CREATE INDEX IF NOT EXISTS "${TABLE}_event_user_idx" ON "${TABLE}" ("event_id", "user_id")`,
    );
    console.log(`  = index on (event_id, user_id) ensured`);

    const { rows: summary } = await client.query(`SELECT COUNT(*)::int AS count FROM "${TABLE}"`);
    const count = summary[0]?.count ?? 0;
    console.log(`\n  rows: ${count}`);

    if (count === 0) {
      console.log(`\n  The table is empty, so /members/event_user_activity_report will now say`);
      console.log(`  "No lobby activity recorded yet" instead of reporting the table as missing.`);
      console.log(`  Nothing in this app writes to it yet — backfill from the legacy MySQL, or`);
      console.log(`  add interaction logging to the lobby, before expecting rows.`);
    } else {
      console.log(`\n  Done. Open /members/event_user_activity_report?event_id=<id>`);
    }
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error("\nFATAL:", e?.message ?? e);
  process.exit(1);
});
