/**
 * ===========================================================================
 *  SET EVERY EXHIBITOR'S STAND LAYOUT (e.g. Ultra Stand)
 * ===========================================================================
 *
 *      npx tsx scripts/set-exhibitor-stand-layout.ts                     # DRY RUN
 *      npx tsx scripts/set-exhibitor-stand-layout.ts --apply             # write
 *      npx tsx scripts/set-exhibitor-stand-layout.ts --apply --with-colour
 *      npx tsx scripts/set-exhibitor-stand-layout.ts --layout="Basic Stand" --apply
 *      npx tsx scripts/set-exhibitor-stand-layout.ts --apply --restore=reports/<file>.json
 *
 *  Sets find_event_exhibitor.ex_stand_layout_id — the "Exhibitor Stand Layout"
 *  field on Edit Trade Stand — for every active exhibitor on the event.
 *
 *  The layout is matched BY NAME (default: "ultra") against this event's own
 *  find_event_lobby_child_layout_manager rows with layout_type = 'exhibition_stand',
 *  which is precisely the list that dropdown is built from. Ids differ per event,
 *  so nothing is hardcoded.
 *
 *  STAND COLOUR. The form disables Stand Color until a layout is chosen, because
 *  colours belong to the layout's template (find_event_template_color_options
 *  keyed by parent_template_id). Setting a layout therefore leaves stand_color_id
 *  pointing at a colour from whatever layout was there before — or at nothing.
 *  --with-colour sets each exhibitor to that template's first colour when their
 *  current one does not belong to it. Without the flag, colours are reported and
 *  left alone.
 *
 *  Dry run by default. --apply writes a backup first
 *  (reports/stand-layout-backup-<timestamp>.json) and runs in one transaction;
 *  --restore=<file> puts the previous values back.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");

try {
  const dotenv = require("dotenv");
  dotenv.config({ path: path.join(ROOT, ".env") });
  dotenv.config({ path: path.join(ROOT, ".env.local"), override: false });
} catch {
  console.warn("! dotenv unavailable — relying on the ambient environment");
}

const flags = new Map<string, string>();
for (const arg of process.argv.slice(2)) {
  if (!arg.startsWith("--")) continue;
  const [key, ...rest] = arg.replace(/^--/, "").split("=");
  flags.set(key, rest.join("=") || "true");
}

const APPLY = flags.get("apply") === "true";
const WITH_COLOUR = flags.get("with-colour") === "true" || flags.get("with-color") === "true";
const LAYOUT_MATCH = (flags.get("layout") ?? "ultra").toLowerCase();
const EVENT_FLAG = flags.get("event");
const RESTORE_FILE = flags.get("restore");
const ONLY_MISSING = flags.get("only-missing") === "true";

const ACTIVE_EVENT_SETTING = "cp_active_event_id";
const DOMAIN_ID = 150;
const line = (n = 74) => "=".repeat(n);

interface ExhibitorRow {
  id: number;
  business: string | null;
  ex_stand_layout_id: number | null;
  stand_color_id: number | null;
}

interface Backup {
  createdAt: string;
  eventId: number;
  layoutId: number;
  layoutTitle: string;
  exhibitors: ExhibitorRow[];
}

async function main() {
  const { Client } = require("pg");
  const url =
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL;
  if (!url) {
    console.error("No DATABASE_URL / POSTGRES_URL found in .env — nothing to connect to.");
    process.exit(1);
  }

  const client = new Client({ connectionString: url, connectionTimeoutMillis: 30_000 });
  await client.connect();

  try {
    if (RESTORE_FILE) {
      await restore(client, RESTORE_FILE);
      return;
    }
    await run(client);
  } finally {
    await client.end();
  }
}

async function resolveEventId(client: any): Promise<number> {
  if (EVENT_FLAG) {
    const parsed = Number(EVENT_FLAG);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      console.error(`--event=${EVENT_FLAG} is not a valid event id.`);
      process.exit(1);
    }
    return parsed;
  }
  const { rows } = await client.query(
    `SELECT value FROM find_settings WHERE varname = $1 AND "DOMAIN" = $2 LIMIT 1`,
    [ACTIVE_EVENT_SETTING, DOMAIN_ID]
  );
  const value = Number(rows[0]?.value);
  if (!Number.isInteger(value) || value <= 0) {
    console.error("No active event is set. Pass --event=<id>.");
    process.exit(1);
  }
  return value;
}

async function run(client: any) {
  const eventId = await resolveEventId(client);

  console.log(line());
  console.log(` EXHIBITOR STAND LAYOUT — event ${eventId}${APPLY ? "" : "   [DRY RUN — nothing will be written]"}`);
  console.log(line());

  // The Exhibitor Stand Layout list, exactly as the CP dropdown builds it.
  const { rows: layouts } = await client.query(
    `SELECT id, title, template_id
       FROM find_event_lobby_child_layout_manager
      WHERE event_id = $1 AND layout_type = 'exhibition_stand'
      ORDER BY sequence ASC NULLS LAST, id ASC`,
    [eventId]
  );

  console.log(`\n  stand layouts on this event:`);
  for (const l of layouts) {
    console.log(`      #${String(l.id).padEnd(8)} ${String(l.title ?? "(untitled)").padEnd(34)} template ${l.template_id ?? "—"}`);
  }
  if (layouts.length === 0) {
    console.error(`\n  ! This event has no exhibition_stand layouts, so there is nothing to select.\n`);
    process.exit(1);
  }

  const target =
    layouts.find((l: any) => String(l.title ?? "").toLowerCase().includes(LAYOUT_MATCH)) ?? null;
  if (!target) {
    console.error(
      `\n  ! No layout whose title contains "${LAYOUT_MATCH}". Pass --layout="<part of the title>" ` +
        `using one of the titles above.\n`
    );
    process.exit(1);
  }
  console.log(`\n  target layout            : #${target.id} "${target.title}" (template ${target.template_id ?? "—"})`);

  // Colours belong to the layout's TEMPLATE, not to the layout — same hop the form's
  // "Stand Color" dropdown makes (getExhibitorStandColors).
  const { rows: colours } = target.template_id
    ? await client.query(
        `SELECT id, color FROM find_event_template_color_options
          WHERE parent_template_id = $1 ORDER BY id ASC`,
        [target.template_id]
      )
    : { rows: [] as { id: number; color: string | null }[] };
  const colourIds = new Set<number>(colours.map((c: any) => c.id));
  console.log(`  colours for that template: ${colours.length > 0 ? colours.map((c: any) => `${c.id}:${c.color ?? "?"}`).join(", ") : "none"}`);

  const { rows: exhibitors } = (await client.query(
    `SELECT id, business, ex_stand_layout_id, stand_color_id
       FROM find_event_exhibitor
      WHERE event_id = $1 AND status = 'active'
      ORDER BY NULLIF(BTRIM(LOWER(COALESCE(business, ''))), '') ASC NULLS LAST, id ASC`,
    [eventId]
  )) as { rows: ExhibitorRow[] };

  const needsLayout = exhibitors.filter((e) =>
    ONLY_MISSING ? !e.ex_stand_layout_id : e.ex_stand_layout_id !== target.id
  );
  const needsColour = exhibitors.filter(
    (e) => colourIds.size > 0 && (!e.stand_color_id || !colourIds.has(e.stand_color_id))
  );

  console.log(`\n  active exhibitors        : ${exhibitors.length}`);
  console.log(`  already on this layout   : ${exhibitors.length - needsLayout.length}`);
  console.log(`  to be changed            : ${needsLayout.length}${ONLY_MISSING ? "  (--only-missing: only those with no layout at all)" : ""}`);
  console.log(
    `  colour not from template : ${needsColour.length}${
      WITH_COLOUR
        ? `  -> will be set to #${colours[0]?.id} (${colours[0]?.color ?? "?"})`
        : "  (left alone; pass --with-colour to fix)"
    }`
  );

  if (needsLayout.length === 0 && !(WITH_COLOUR && needsColour.length > 0)) {
    console.log(`\n  Nothing to do.\n`);
    return;
  }

  for (const e of needsLayout.slice(0, 6)) {
    console.log(
      `      ${(e.business ?? "(no business name)").slice(0, 46).padEnd(48)} layout ${e.ex_stand_layout_id ?? "—"} -> ${target.id}`
    );
  }
  if (needsLayout.length > 6) console.log(`      … and ${needsLayout.length - 6} more`);

  if (!APPLY) {
    console.log(`\n  Nothing was written. Re-run with --apply.\n`);
    return;
  }

  const backup: Backup = {
    createdAt: new Date().toISOString(),
    eventId,
    layoutId: target.id,
    layoutTitle: target.title ?? "",
    exhibitors,
  };
  const backupPath = writeBackup(backup);
  console.log(`\n  backup written           : ${path.relative(ROOT, backupPath)}`);

  await client.query("BEGIN");
  try {
    if (WITH_COLOUR && colours.length > 0) {
      // One statement: set the layout everywhere it is wrong, and repair only the colours that
      // do not belong to the new template — a colour already valid for it is a deliberate choice
      // and is kept.
      await client.query(
        `UPDATE find_event_exhibitor
            SET ex_stand_layout_id = $1,
                stand_color_id = CASE
                  WHEN stand_color_id = ANY($2::int[]) THEN stand_color_id
                  ELSE $3
                END
          WHERE event_id = $4 AND status = 'active'
            ${ONLY_MISSING ? "AND ex_stand_layout_id IS NULL" : ""}`,
        [target.id, [...colourIds], colours[0].id, eventId]
      );
    } else {
      await client.query(
        `UPDATE find_event_exhibitor
            SET ex_stand_layout_id = $1
          WHERE event_id = $2 AND status = 'active'
            ${ONLY_MISSING ? "AND ex_stand_layout_id IS NULL" : ""}`,
        [target.id, eventId]
      );
    }

    // The stand renders from this layout, so every affected booth is a new version.
    await client.query(
      `UPDATE find_event_exhibitor
          SET stand_version = COALESCE(stand_version, 0) + 1
        WHERE event_id = $1 AND status = 'active'`,
      [eventId]
    );

    await client.query("COMMIT");
    console.log(`\n  updated                  : ${needsLayout.length} exhibitor(s) now on "${target.title}"`);
    console.log(`\n  To undo: npx tsx scripts/set-exhibitor-stand-layout.ts --apply --restore=${path.relative(ROOT, backupPath)}\n`);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("\n  ! Rolled back — nothing was changed.\n", error);
    process.exitCode = 1;
  }
}

function writeBackup(backup: Backup): string {
  const dir = path.join(ROOT, "reports");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `stand-layout-backup-${backup.createdAt.replace(/[:.]/g, "-")}.json`);
  fs.writeFileSync(file, JSON.stringify(backup, null, 2), "utf8");
  return file;
}

async function restore(client: any, relativePath: string) {
  const file = path.isAbsolute(relativePath) ? relativePath : path.join(ROOT, relativePath);
  if (!fs.existsSync(file)) {
    console.error(`No such backup file: ${file}`);
    process.exit(1);
  }
  const backup: Backup = JSON.parse(fs.readFileSync(file, "utf8"));

  console.log(line());
  console.log(` RESTORE STAND LAYOUTS — event ${backup.eventId}, taken ${backup.createdAt}${APPLY ? "" : "   [DRY RUN]"}`);
  console.log(line());
  console.log(`\n  exhibitors to restore    : ${backup.exhibitors.length}`);

  if (!APPLY) {
    console.log(`\n  Nothing was written. Re-run with --apply --restore=…\n`);
    return;
  }

  await client.query("BEGIN");
  try {
    for (const e of backup.exhibitors) {
      await client.query(
        `UPDATE find_event_exhibitor SET ex_stand_layout_id = $1, stand_color_id = $2 WHERE id = $3`,
        [e.ex_stand_layout_id, e.stand_color_id, e.id]
      );
    }
    await client.query("COMMIT");
    console.log(`\n  Restored.\n`);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("\n  ! Rolled back — nothing was changed.\n", error);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
