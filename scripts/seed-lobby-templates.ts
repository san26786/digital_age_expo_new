/**
 * ===========================================================================
 *  SEED find_event_lobby_templates (the shared lobby-layout catalogue)
 * ===========================================================================
 *
 *      npm run db:lobby-templates
 *      npx tsx scripts/seed-lobby-templates.ts --dry-run     # show, change nothing
 *
 *  WHY THIS EXISTS
 *
 *  The table came across from MySQL empty, so /members/event_lobby_templates renders "No lobby
 *  templates yet" while the live site lists twelve. The cause was in the migration, not the page:
 *  scripts/migrate-to-neon.js scopes any table carrying an `event_id` column with
 *  `event_id IN (1474, 852)`, and this catalogue is platform-wide — its event_id is NULL on the
 *  seeded rows and only records which event created the others. `IN (...)` is false for NULL, so
 *  every row was filtered out. That rule is fixed (see GLOBAL_TABLES in migrate-to-neon.js), but
 *  a re-run of the full migration is a heavy way to recover twelve rows, so this restores them
 *  directly.
 *
 *  The set below is transcribed from the live site's own list at
 *  digitalageexpo.com/members/event_lobby_templates — same titles, same layout types, same
 *  order, all Enabled.
 *
 *  SAFE TO RE-RUN. Rows are matched on title: an existing template is left completely alone,
 *  including any image, description or colourways attached to it since.
 *
 *  NOT SEEDED: `image`. The preview files live under /files/lobby/template on the legacy host
 *  and are not in this repo, so a made-up path would render as a broken thumbnail. Upload one
 *  per template from the page's edit dialog, or copy the originals into
 *  public/files/lobby/template and set the column to /files/lobby/template/<file>.
 */

import * as path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");

const DRY_RUN = process.argv.slice(2).includes("--dry-run");

try {
  const dotenv = require("dotenv");
  dotenv.config({ path: path.join(ROOT, ".env") });
  dotenv.config({ path: path.join(ROOT, ".env.local"), override: false });
} catch {
  console.warn("! dotenv unavailable — relying on the ambient environment");
}

const TABLE = "find_event_lobby_templates";

/** Transcribed from the live list, in its displayed order. */
const TEMPLATES: { title: string; layout_type: string; status: string }[] = [
  { title: "Auditorium Template 1",                layout_type: "auditorium",       status: "enabled" },
  { title: "Exhibition Hall Template 1 (22 Stands)", layout_type: "exhibition",     status: "enabled" },
  { title: "Exhibition Hall Template 2 (16 Stands)", layout_type: "exhibition",     status: "enabled" },
  { title: "Exhibition Hall Template (20 Stands)",   layout_type: "exhibition",     status: "enabled" },
  { title: "Ultra Template",                       layout_type: "exhibition_stand", status: "enabled" },
  { title: "Premium Template",                     layout_type: "exhibition_stand", status: "enabled" },
  { title: "Standard Template",                    layout_type: "exhibition_stand", status: "enabled" },
  { title: "Advanced Template",                    layout_type: "exhibition_stand", status: "enabled" },
  { title: "Basic Template",                       layout_type: "exhibition_stand", status: "enabled" },
  { title: "Premium Template Version 2",           layout_type: "exhibition_stand", status: "enabled" },
  { title: "Advanced Template Version 2",          layout_type: "exhibition_stand", status: "enabled" },
  { title: "Auditorium Template 1 (Copy)",         layout_type: "auditorium",       status: "enabled" },
];

async function main() {
  // DDL/seed work goes over the DIRECT endpoint: the pooled one measured 34s for a trivial
  // query (see reports/db-ping.txt) while direct answered in 243ms.
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
    const { rows: reg } = await client.query(`SELECT to_regclass($1) AS oid`, [`public.${TABLE}`]);
    if (reg[0]?.oid === null) {
      console.error(`\n  Table "${TABLE}" does not exist. Run \`npx prisma db push\` first.`);
      process.exitCode = 1;
      return;
    }

    const { rows: existingRows } = await client.query(`SELECT id, title FROM "${TABLE}"`);
    const existingTitles = new Set(
      existingRows.map((r: { title: string | null }) => (r.title ?? "").trim().toLowerCase()),
    );
    console.log(`\n  existing rows : ${existingRows.length}`);

    let created = 0;
    let skipped = 0;

    for (const tpl of TEMPLATES) {
      if (existingTitles.has(tpl.title.toLowerCase())) {
        console.log(`  = kept    ${tpl.title}`);
        skipped += 1;
        continue;
      }
      if (DRY_RUN) {
        console.log(`  + would create  ${tpl.title}  (${tpl.layout_type})`);
        created += 1;
        continue;
      }
      await client.query(
        `INSERT INTO "${TABLE}" (title, layout_type, status, description, event_id, user_id, updated_on)
         VALUES ($1, $2, $3, NULL, NULL, NULL, NOW())`,
        [tpl.title, tpl.layout_type, tpl.status],
      );
      // event_id stays NULL on purpose: these belong to the shared catalogue, not to one event.
      console.log(`  + created ${tpl.title}  (${tpl.layout_type})`);
      created += 1;
    }

    console.log(`\n${"-".repeat(70)}`);
    console.log(` ${created} ${DRY_RUN ? "would be created" : "created"}, ${skipped} already present.`);
    if (!DRY_RUN && created > 0) {
      console.log(" Reload /members/event_lobby_templates to see them.");
      console.log(" Thumbnails stay blank until an image is uploaded per template.");
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("\nFATAL:", err?.stack ?? err);
  process.exit(1);
});
