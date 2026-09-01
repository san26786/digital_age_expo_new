/**
 * ===========================================================================
 *  CREATE find_event_registration_fields (+ seed the default field set)
 * ===========================================================================
 *
 *  The members "Manage Registration Fields" screen
 *  (src/app/members/(event)/manage_registration/page.tsx) reads this table, but
 *  it was never carried across in the MySQL -> Neon/Postgres migration, so the
 *  page fails with:
 *
 *      42P01  relation "find_event_registration_fields" does not exist
 *
 *  Run once:
 *
 *      npm run db:registration-fields
 *      npx tsx scripts/create-registration-fields-table.ts --dry-run   # show, change nothing
 *
 *  SAFE TO RE-RUN. It only ever creates what is missing:
 *    - CREATE TABLE IF NOT EXISTS      (never drops, never alters)
 *    - adds any individually missing column
 *    - seeds the `event_id = 0, is_default = 1` template rows only when there
 *      are none
 *
 *  Nothing here touches per-event rows, so an event that organisers have
 *  already configured is left completely alone.
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

const TABLE = "find_event_registration_fields";

/**
 * Column set is taken from what legacy manage_registration.php actually reads
 * and writes: field_name, field_type, field_variable, is_active, is_required,
 * login, is_custom, is_default, options, event_id.
 *
 * Flags are SMALLINT rather than BOOLEAN because the PHP wrote literal 1/0 and
 * the service layer normalises 1/"1"/true alike (see toBool in
 * src/lib/services/eventRegistrationFields.ts).
 */
const COLUMNS: { name: string; ddl: string }[] = [
  { name: "event_id", ddl: "INTEGER NOT NULL DEFAULT 0" },
  { name: "field_name", ddl: "VARCHAR(150) NOT NULL DEFAULT ''" },
  { name: "field_variable", ddl: "VARCHAR(100) NOT NULL DEFAULT ''" },
  { name: "field_type", ddl: "VARCHAR(30) NOT NULL DEFAULT 'text'" },
  { name: "is_active", ddl: "SMALLINT NOT NULL DEFAULT 0" },
  { name: "is_required", ddl: "SMALLINT NOT NULL DEFAULT 0" },
  { name: "login", ddl: "SMALLINT NOT NULL DEFAULT 0" },
  { name: "is_custom", ddl: "SMALLINT NOT NULL DEFAULT 0" },
  { name: "is_default", ddl: "SMALLINT NOT NULL DEFAULT 0" },
  { name: "options", ddl: "TEXT" },
];

/**
 * The template rows copied into an event on its first visit to the screen.
 *
 * These are transcribed from the LIVE legacy screen at
 * apps.digitalageexpo.com/members/manage_registration?event_id=1474 — same
 * seven fields, same order, same switch positions:
 *
 *   Field         Include  Required  Validate on Login
 *   Business         on       on           off
 *   First Name       on       on           off
 *   Last Name        on       on           off
 *   Email            on       on           off
 *   Password         on       on           ON      <- the only login-validated field
 *   Mobile           on       on           off
 *   Work Phone       on       off          off
 *
 * is_custom = 0 on every one, which is what makes their switches read-only on
 * the screen — the same rule the legacy template used.
 */
const DEFAULT_FIELDS: {
  field_name: string;
  field_variable: string;
  field_type: string;
  is_active: number;
  is_required: number;
  login: number;
}[] = [
  { field_name: "Business",   field_variable: "business",   field_type: "text",     is_active: 1, is_required: 1, login: 0 },
  { field_name: "First Name", field_variable: "first_name", field_type: "text",     is_active: 1, is_required: 1, login: 0 },
  { field_name: "Last Name",  field_variable: "last_name",  field_type: "text",     is_active: 1, is_required: 1, login: 0 },
  // Email + Password are the login credential pair — both carry login = 1, matching the live
  // site's configuration for this table.
  { field_name: "Email",      field_variable: "email",      field_type: "text",     is_active: 1, is_required: 1, login: 1 },
  { field_name: "Password",   field_variable: "password",   field_type: "password", is_active: 1, is_required: 1, login: 1 },
  { field_name: "Mobile",     field_variable: "mobile",     field_type: "text",     is_active: 1, is_required: 1, login: 0 },
  { field_name: "Work Phone", field_variable: "work_phone", field_type: "text",     is_active: 1, is_required: 0, login: 0 },
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
    const { rows: existing } = await client.query(
      `SELECT to_regclass($1) AS oid`,
      [`public.${TABLE}`],
    );
    const tableExists = existing[0]?.oid !== null;
    console.log(`\n  table exists : ${tableExists ? "yes" : "NO — will be created"}`);

    if (DRY_RUN) {
      console.log("\n  Dry run: re-run without --dry-run to apply.");
      return;
    }

    // ---- 1. table -------------------------------------------------------
    if (!tableExists) {
      const body = COLUMNS.map((c) => `  "${c.name}" ${c.ddl}`).join(",\n");
      await client.query(
        `CREATE TABLE IF NOT EXISTS "${TABLE}" (\n  "id" SERIAL PRIMARY KEY,\n${body}\n)`,
      );
      console.log(`  + created table "${TABLE}"`);
    }

    // ---- 2. any individually missing column -----------------------------
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

    // ---- 3. index on the column every query filters by -------------------
    await client.query(
      `CREATE INDEX IF NOT EXISTS "${TABLE}_event_id_idx" ON "${TABLE}" ("event_id")`,
    );

    // ---- 4. seed the template rows, only if there are none ---------------
    const { rows: templateCount } = await client.query(
      `SELECT COUNT(*)::int AS count FROM "${TABLE}" WHERE event_id = 0 AND is_default = 1`,
    );
    const count = templateCount[0]?.count ?? 0;

    if (count > 0) {
      console.log(`  = ${count} default template row(s) already present — left untouched`);
    } else {
      for (const field of DEFAULT_FIELDS) {
        await client.query(
          `INSERT INTO "${TABLE}"
             (event_id, field_name, field_variable, field_type, is_active, is_required, login, is_custom, is_default, options)
           VALUES (0, $1, $2, $3, $4, $5, $6, 0, 1, NULL)`,
          [
            field.field_name,
            field.field_variable,
            field.field_type,
            field.is_active,
            field.is_required,
            field.login,
          ],
        );
      }
      console.log(`  + seeded ${DEFAULT_FIELDS.length} default template row(s)`);
    }

    // ---- 5. report ------------------------------------------------------
    const { rows: summary } = await client.query(
      `SELECT event_id, COUNT(*)::int AS fields
         FROM "${TABLE}" GROUP BY event_id ORDER BY event_id`,
    );
    console.log("\n  rows per event_id:");
    for (const row of summary) {
      console.log(`    event_id ${String(row.event_id).padStart(6)} : ${row.fields} field(s)`);
    }

    console.log("\n  Done. Open /members/manage_registration?event_id=<id> — the default set");
    console.log("  is copied into an event automatically on its first visit.");
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error("\nFATAL:", e?.message ?? e);
  process.exit(1);
});
