/**
 * ===========================================================================
 *  SEED independent_mst (typ_id = 7) — the Event Industry list
 * ===========================================================================
 *
 *      npm run db:industries
 *      npx tsx scripts/seed-industries.ts --dry-run     # show, change nothing
 *
 *  WHY THIS EXISTS
 *
 *  /members/view_industry_list showed a single industry (Agriculture) against a source list of
 *  fifty. Same migration gap as the lobby templates, different scope column:
 *  scripts/migrate-to-neon.js picks a table's filter from the first scope column it finds, and
 *  independent_mst has a `listing_id`, so it was copied as
 *  `listing_id IN (SELECT id FROM _dae_lids)`. independent_mst is platform master data — its
 *  industries have no owning listing — so all but one row was filtered out. The rule is fixed
 *  (see GLOBAL_TABLES in migrate-to-neon.js); this restores the rows without re-running a full
 *  migration.
 *
 *  Source of truth is scripts/data/industries.csv, exported from the live site. Editing that
 *  file and re-running is the supported way to extend the list.
 *
 *  SAFE TO RE-RUN. Rows are matched on `mstr_cd` (the INDST… code), so an industry that already
 *  exists is left untouched — including Agriculture, which is already present.
 *
 *  IDs ARE NOT PRESERVED. The CSV's ID column is the legacy id (334–383); this database has
 *  Agriculture at 18495, so independent_mst.id is a different sequence entirely. Forcing the old
 *  ids would collide with live rows, so the column is autoincremented and the CSV id ignored.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const CSV_PATH = path.join(HERE, "data", "industries.csv");

const DRY_RUN = process.argv.slice(2).includes("--dry-run");

try {
  const dotenv = require("dotenv");
  dotenv.config({ path: path.join(ROOT, ".env") });
  dotenv.config({ path: path.join(ROOT, ".env.local"), override: false });
} catch {
  console.warn("! dotenv unavailable — relying on the ambient environment");
}

/** independent_mst.typ_id for Industry — mirrors members/view_industry_list.php's `typ_id=7`. */
const INDUSTRY_TYP_ID = 7;

/**
 * Minimal RFC-4180 reader. The descriptions contain commas and quoted passages, so splitting on
 * "," is not an option; a dependency for one file is not worth it either.
 */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }   // "" is a literal quote
        else inQuotes = false;
      } else field += c;
      continue;
    }
    if (c === '"') { inQuotes = true; continue; }
    if (c === ",") { row.push(field); field = ""; continue; }
    if (c === "\r") continue;
    if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; continue; }
    field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

async function main() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`Missing ${path.relative(ROOT, CSV_PATH)} — nothing to import.`);
    process.exit(1);
  }

  const rows = parseCsv(fs.readFileSync(CSV_PATH, "utf8"));
  const header = rows.shift();
  if (!header) { console.error("CSV is empty."); process.exit(1); }

  const col = (name: string) => header.findIndex((h) => h.trim().toLowerCase() === name);
  const iName = col("name"), iCode = col("code"), iDesc = col("description");
  if (iName === -1 || iCode === -1) {
    console.error(`CSV must have Name and Code columns; got: ${header.join(", ")}`);
    process.exit(1);
  }

  const industries = rows
    .map((r) => ({
      name: (r[iName] ?? "").trim(),
      code: (r[iCode] ?? "").trim(),
      description: (r[iDesc] ?? "").trim(),
    }))
    .filter((r) => r.name && r.code);

  // DDL/seed work goes over the DIRECT endpoint — see reports/db-ping.txt for why.
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

  console.log("=".repeat(72));
  console.log(` independent_mst (typ_id=${INDUSTRY_TYP_ID}) — Event Industry` +
              `${DRY_RUN ? "   [DRY RUN — nothing will be written]" : ""}`);
  console.log("=".repeat(72));
  console.log(`\n  CSV rows      : ${industries.length}`);

  await client.connect();

  try {
    const { rows: existing } = await client.query(
      `SELECT mstr_cd FROM independent_mst WHERE typ_id = $1`, [INDUSTRY_TYP_ID],
    );
    const have = new Set(
      existing.map((r: { mstr_cd: string | null }) => (r.mstr_cd ?? "").trim().toUpperCase()),
    );
    console.log(`  already there : ${existing.length}`);

    let created = 0, skipped = 0;

    for (const ind of industries) {
      if (have.has(ind.code.toUpperCase())) { skipped += 1; continue; }
      if (DRY_RUN) { console.log(`  + would create  ${ind.code.padEnd(12)} ${ind.name}`); created += 1; continue; }

      // Deliberately the SAME column set createIndustry() writes when you submit the modal —
      // mstr_cd, mstr_nm, mstr_desc, typ_id and business_value: 0 — plus the three columns whose
      // values are already the DB defaults (sequence 0, status 'enabled', is_default 0), written
      // explicitly because this path is raw SQL rather than Prisma. A row created here is
      // therefore indistinguishable from one typed into the form.
      await client.query(
        `INSERT INTO independent_mst
           (mstr_cd, mstr_nm, mstr_desc, typ_id, business_value, sequence, status, is_default)
         VALUES ($1, $2, $3, $4, 0, 0, 'enabled', 0)`,
        [ind.code, ind.name, ind.description, INDUSTRY_TYP_ID],
      );
      console.log(`  + created ${ind.code.padEnd(12)} ${ind.name}`);
      created += 1;
    }

    console.log(`\n${"-".repeat(72)}`);
    console.log(` ${created} ${DRY_RUN ? "would be created" : "created"}, ${skipped} already present.`);
    if (!DRY_RUN && created > 0) {
      console.log(" Reload /members/view_industry_list to see them.");
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("\nFATAL:", err?.stack ?? err);
  process.exit(1);
});
