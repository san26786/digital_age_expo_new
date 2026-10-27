/**
 * ===========================================================================
 *  CREATE find_email_bounces
 * ===========================================================================
 *
 *  The table that records why a send failed. Without it, nothing anywhere in this application
 *  knows that mail is being refused.
 *
 *  src/lib/email/emailLog.ts guards every bounce call with `to_regclass('public.find_email_bounces')`
 *  and returns quietly when the answer is null. That guard is why the app does not crash without
 *  this table — and why the failure is silent:
 *
 *    - recordBounce()  writes nothing, so a refused send leaves no trace at all.
 *    - isSuppressed()  always answers false, so an address the mail server has already rejected
 *                      as non-existent keeps being mailed. Repeated unknown-user attempts are
 *                      exactly what mailbox providers score a sending domain down for, and the
 *                      cost lands on every other email from the same domain.
 *    - getBounceSummary() reports `available: false`, which is why the Send Queue screen says
 *                      "the bounce table does not exist yet" beside 0 hard / 0 soft.
 *
 *  The DDL here matches prisma/email_bounces.sql, which was written but never run. This script
 *  exists because a .sql file sitting in the repo is easy to miss — the db:* scripts are how
 *  every other missing table in this project gets created.
 *
 *  Run once:
 *
 *      npm run db:email-bounces
 *      npx tsx scripts/create-email-bounces-table.ts --dry-run
 *
 *  SAFE TO RE-RUN — creates only what is missing, never drops or alters, never touches rows.
 *
 *  ---------------------------------------------------------------------------
 *  WHAT A ROW MEANS, AND WHY IT IS SCOPED PER SITE
 *  ---------------------------------------------------------------------------
 *
 *  At `detected_on`, sending to `email` for site `DOMAIN` failed in the way `reason` describes.
 *  `hard` means the address is wrong and always will be — unknown mailbox, bad domain — and the
 *  app stops sending to it. `soft` means it failed this time (full mailbox, greylisting) and
 *  blocks nothing.
 *
 *  A mailbox that rejects mail from Digital Age Expo's sender may accept it from B2B Growth
 *  Expo's: different senders, different IPs, different reputations. Suppressing one site's bad
 *  address across every site would be guessing, so "DOMAIN" is part of every lookup.
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

const TABLE = "find_email_bounces";

/**
 * Every column emailLog.ts reads or writes.
 *
 * `email` is varchar(765) to match find_email_log.to_email — the legacy width, kept so the two
 * tables can be joined on an address without a cast. recordBounce() truncates to the same 765.
 */
const COLUMNS: { name: string; ddl: string }[] = [
  // Quoted and upper-case everywhere: the legacy schema's own spelling, and DOMAIN is a reserved
  // word in Postgres, so an unquoted lower-case `domain` would be a different column.
  { name: "DOMAIN", ddl: "INTEGER NOT NULL" },
  { name: "email", ddl: "VARCHAR(765) NOT NULL" },
  { name: "bounce_type", ddl: "VARCHAR(16) NOT NULL" },
  { name: "reason", ddl: "TEXT" },
  { name: "email_template_id", ddl: "VARCHAR(255)" },
  { name: "detected_on", ddl: "TIMESTAMP(0) NOT NULL DEFAULT NOW()" },
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
        `CREATE TABLE IF NOT EXISTS "${TABLE}" (\n  "id" BIGSERIAL PRIMARY KEY,\n${body}\n)`,
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
     * isSuppressed() runs on EVERY templated send and asks "has this address hard-bounced for
     * this site?". It is the one lookup here that must never become a scan, and it compares
     * lower(email), so the index has to be on the same expression or Postgres will not use it.
     */
    await client.query(
      `CREATE INDEX IF NOT EXISTS "${TABLE}_lookup" ON "${TABLE}" ("DOMAIN", "bounce_type", lower("email"))`,
    );
    console.log(`  = index on ("DOMAIN", bounce_type, lower(email)) ensured`);

    // getBounceSummary()'s recent list: newest 25 for one site.
    await client.query(
      `CREATE INDEX IF NOT EXISTS "${TABLE}_recent" ON "${TABLE}" ("DOMAIN", "detected_on" DESC)`,
    );
    console.log(`  = index on ("DOMAIN", detected_on DESC) ensured`);

    const { rows: summary } = await client.query(`SELECT COUNT(*)::int AS count FROM "${TABLE}"`);
    console.log(`\n  rows: ${summary[0]?.count ?? 0}`);
    console.log(`\n  Bounces are recorded from the next send onwards. The Send Queue screen will`);
    console.log(`  now show hard/soft counts instead of "the bounce table does not exist yet",`);
    console.log(`  and a hard-bounced address stops being mailed.`);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error("\nFATAL:", e?.message ?? e);
  process.exit(1);
});
