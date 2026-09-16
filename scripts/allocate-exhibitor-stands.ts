/**
 * ===========================================================================
 *  ALLOCATE EVERY EXHIBITOR A ZONE AND A STAND NUMBER
 * ===========================================================================
 *
 *      npx tsx scripts/allocate-exhibitor-stands.ts --audit      # REPORT ONLY: who has a stand
 *      npx tsx scripts/allocate-exhibitor-stands.ts              # DRY RUN of a full reallocation
 *      npx tsx scripts/allocate-exhibitor-stands.ts --apply      # actually write
 *      npx tsx scripts/allocate-exhibitor-stands.ts --only-missing --apply   # fill the gaps only
 *      npx tsx scripts/allocate-exhibitor-stands.ts --restore=reports/<file>.json
 *      npx tsx scripts/allocate-exhibitor-stands.ts --cleanup            # report the bogus rows
 *      npx tsx scripts/allocate-exhibitor-stands.ts --cleanup --apply    # and delete them
 *
 *  WHAT IT DOES
 *
 *  Fills the exhibition zones in order: zone 1 takes 22 exhibitors, and only once
 *  it is full does zone 2 start. Zones are find_event_lobby_child_layout_manager
 *  rows (layout_type = "exhibition", under this event's lobby layout, status enabled
 *  — NOT "exhibition_stand", which is the Exhibitor Stand LAYOUT list, i.e. Ultra
 *  Stand and friends); each booth is a find_event_lobby_spots
 *  row (spot_type = "exhibitor") carrying a stand_no; an exhibitor is allocated by
 *  find_event_exhibitor.exhibition_zone_id + .spot_id + .stand_number. Those are
 *  exactly the fields, and exactly the 22-per-zone capacity, that the organiser's
 *  own Add/Edit Trade Stand form uses (BOOTHS_PER_ZONE in
 *  src/lib/services/eventExhibitorAdmin.ts) — this is the same allocation done in
 *  bulk, not a parallel scheme.
 *
 *  STAND NUMBERS ARE FIVE DIGITS, in the shape the site already uses (31040,
 *  31236), and they encode where the stand is:
 *
 *  The first stand number comes from the EVENT's own setting —
 *  find_events.starting_stand_number, the column the legacy app numbers stands from
 *  (which is why the current ones read 31040, 31236). --first-stand overrides it;
 *  31001 is used only if the event has no usable value.
 *
 *  From there each zone gets its own block of a hundred, so the number says where
 *  the stand is:
 *
 *      zone 1   31001, 31002 … 31022
 *      zone 2   31101, 31102 … 31122
 *      zone 12  32101, 32102 … 32122
 *
 *  Every number is unique across the floor and stays five digits for hundreds of
 *  zones. --stand-format=sequential numbers them 31001, 31002, 31003 … unbroken in
 *  fill order instead, if you would rather they ran consecutively.
 *
 *  THIS REWRITES EVERY ALLOCATION. Existing zone/booth/stand_number values are
 *  cleared first, including legacy imported stand numbers like 31040. That is the
 *  point of the run, and it is why:
 *
 *    - it is a DRY RUN unless you pass --apply,
 *    - --apply writes reports/exhibitor-allocation-backup-<timestamp>.json FIRST,
 *      holding every exhibitor's previous allocation and every booth's previous
 *      stand_no, and
 *    - --restore=<that file> puts all of it back.
 *
 *  Everything happens inside one transaction: either the whole floor plan is
 *  reallocated or nothing is.
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

/* ------------------------------------------------------------------ flags */

const flags = new Map<string, string>();
for (const arg of process.argv.slice(2)) {
  if (!arg.startsWith("--")) continue;
  const [key, value] = arg.replace(/^--/, "").split("=");
  flags.set(key, value ?? "true");
}

const APPLY = flags.get("apply") === "true";
/** Read-only: report what is and isn't allocated, change nothing, ever. */
const AUDIT = flags.get("audit") === "true";
/** Allocate ONLY exhibitors with no usable allocation; leave every valid one exactly as it is. */
const ONLY_MISSING = flags.get("only-missing") === "true";
/** --find=<text>: print the raw rows for exhibitors whose business name contains <text>. */
const FIND_TEXT = flags.get("find") ?? null;
const RESTORE_FILE = flags.get("restore");
/**
 * --cleanup: remove the wreckage of the first (buggy) run of this script, which matched
 * layout_type 'exhibition_stand' — the Exhibitor Stand LAYOUT list — instead of 'exhibition'.
 * Where it ran out of layouts it INSERTED more, so rows titled "Exhibition Zone 8".."Exhibition
 * Zone 11" are now sitting in the CP's stand-layout dropdown pretending to be stand designs.
 * They are removed only once nothing points at them, so this is safe to run after a re-allocation
 * and a no-op before one.
 */
const CLEANUP = flags.get("cleanup") === "true";
const EVENT_FLAG = flags.get("event");
const BOOTHS_PER_ZONE = Number(flags.get("booths-per-zone") ?? 22);
const STAND_FORMAT = (flags.get("stand-format") ?? "zone-encoded") as "zone-encoded" | "sequential";
/** --first-stand wins; otherwise find_events.starting_stand_number; otherwise this. */
const STAND_FIRST_FALLBACK = 31001;
const STAND_FIRST_FLAG = flags.has("first-stand") ? Number(flags.get("first-stand")) : null;
/** Resolved in allocate() once the event row has been read. */
let STAND_FIRST = STAND_FIRST_FLAG ?? STAND_FIRST_FALLBACK;
/** How far apart two zones' blocks sit in zone-encoded mode. 100 leaves room for 99 booths a zone. */
const ZONE_STRIDE = Number(flags.get("zone-stride") ?? 100);
/** Statuses to leave out of the floor plan entirely, e.g. --exclude-status=excluded,Not Interested */
const EXCLUDED_STATUSES = new Set(
  (flags.get("exclude-status") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
);

/** find_settings varname the CP's General Settings "Event" dropdown writes. */
const ACTIVE_EVENT_SETTING = "cp_active_event_id";
const DOMAIN_ID = 150;

if (!Number.isInteger(BOOTHS_PER_ZONE) || BOOTHS_PER_ZONE < 1) {
  console.error("--booths-per-zone must be a positive whole number.");
  process.exit(1);
}
if (STAND_FORMAT !== "zone-encoded" && STAND_FORMAT !== "sequential") {
  console.error("--stand-format must be 'zone-encoded' or 'sequential'.");
  process.exit(1);
}
if (STAND_FIRST_FLAG !== null && (!Number.isInteger(STAND_FIRST_FLAG) || STAND_FIRST_FLAG < 10000 || STAND_FIRST_FLAG > 99999)) {
  console.error("--first-stand must be a five-digit number (10000-99999).");
  process.exit(1);
}
if (!Number.isInteger(ZONE_STRIDE) || ZONE_STRIDE <= BOOTHS_PER_ZONE) {
  console.error(`--zone-stride must be a whole number larger than --booths-per-zone (${BOOTHS_PER_ZONE}).`);
  process.exit(1);
}

/**
 * The stand number for booth `position` (1-based) in zone `zoneIndex` (0-based).
 *
 * Both shapes are deliberately five digits: the public exhibitor cards and the legacy data both
 * read as five-digit stand ids (31040, 31236), and a floor where some stands are "7" and others
 * are "31040" is the inconsistency this run exists to remove.
 */
function standNumberFor(zoneIndex: number, position: number): number {
  return STAND_FORMAT === "zone-encoded"
    ? STAND_FIRST + zoneIndex * ZONE_STRIDE + (position - 1)
    : STAND_FIRST + zoneIndex * BOOTHS_PER_ZONE + (position - 1);
}

/** Guards against a floor plan so large that the numbers stop being five digits. */
function assertFiveDigits(zonesNeeded: number) {
  const highest = standNumberFor(zonesNeeded - 1, BOOTHS_PER_ZONE);
  if (highest > 99999) {
    console.error(
      `\n  ! ${zonesNeeded} zones would push the highest stand number to ${highest}, which is six digits.\n` +
        `    Lower --first-stand, or use --stand-format=sequential (tighter packing), or --zone-stride=50.\n`
    );
    process.exit(1);
  }
  return highest;
}

/* ------------------------------------------------------------------ types */

interface ExhibitorRow {
  id: number;
  business: string | null;
  status: string | null;
  exhibition_zone_id: number | null;
  spot_id: number | null;
  stand_number: string | null;
}

interface ZoneRow {
  id: number;
  title: string | null;
  sequence: number | null;
  layout_id: number | null;
  event_layout_id: number | null;
  template_id: number | null;
  image: string | null;
  status: string | null;
}

interface BoothRow {
  id: number;
  stand_no: number | null;
  title: string | null;
}

interface Backup {
  createdAt: string;
  eventId: number;
  standFormat: string;
  firstStand: number;
  boothsPerZone: number;
  exhibitors: ExhibitorRow[];
  booths: { id: number; stand_no: number | null }[];
  /** Zones this run created, newest last — a restore deletes them and their empty booths. */
  createdZoneIds: number[];
  /** Zones that already existed but were disabled, and this run switched on. Restore disables them. */
  enabledZoneIds: number[];
  createdBoothIds: number[];
}

const line = (n = 74) => "=".repeat(n);

/** The site shows stand ids as five digits (31040, 31236); anything else reads as unallocated. */
function isFiveDigitStand(value: string | null | undefined): boolean {
  const trimmed = String(value ?? "").trim();
  return /^\d{5}$/.test(trimmed);
}

/**
 * An exhibitor counts as properly allocated only when all three agree: they hold a booth, that
 * booth is in the zone their record claims, and the stand number is a five-digit id. A row with
 * a stand number but no booth (the legacy imports) is NOT allocated — nothing reserves that
 * number, so two exhibitors can end up showing the same one.
 */
function allocationProblem(
  exhibitor: ExhibitorRow,
  boothZoneById: Map<number, number | null>
): string | null {
  if (!exhibitor.spot_id) {
    return isFiveDigitStand(exhibitor.stand_number) ? "stand number but no booth" : "no stand allocated";
  }
  if (!boothZoneById.has(exhibitor.spot_id)) return "booth no longer exists";
  if (!exhibitor.exhibition_zone_id) return "booth but no zone";
  if (boothZoneById.get(exhibitor.spot_id) !== exhibitor.exhibition_zone_id) {
    return "booth belongs to a different zone";
  }
  if (!isFiveDigitStand(exhibitor.stand_number)) {
    return `stand number is not five digits (${String(exhibitor.stand_number ?? "").trim() || "empty"})`;
  }
  return null;
}

function connectionString(): string {
  const url =
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL;
  if (!url) {
    console.error("No DATABASE_URL / POSTGRES_URL found in .env — nothing to connect to.");
    process.exit(1);
  }
  return url;
}

/* ------------------------------------------------------------------- main */

async function main() {
  const { Client } = require("pg");
  const client = new Client({ connectionString: connectionString(), connectionTimeoutMillis: 30_000 });
  await client.connect();

  try {
    if (RESTORE_FILE) {
      await restore(client, RESTORE_FILE);
      return;
    }
    if (CLEANUP) {
      await cleanupBogusStandLayouts(client);
      return;
    }
    await allocate(client);
  } finally {
    await client.end();
  }
}

/** The event whose floor plan we are allocating: --event=<id>, else the CP's active event. */
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
    console.error(
      `No active event is set (find_settings.${ACTIVE_EVENT_SETTING}). Pass --event=<id>, or pick one in\n` +
        `the CP under Settings -> General Settings -> Event.`
    );
    process.exit(1);
  }
  return value;
}

async function allocate(client: any) {
  const eventId = await resolveEventId(client);

  // find_events.starting_stand_number is the event's own "stands start at" setting — the column
  // the legacy app numbered from, which is why the stands on the site today read 31040/31236.
  // Honouring it means this run continues the event's existing scheme instead of imposing one.
  const { rows: eventRows } = await client.query(
    `SELECT starting_stand_number FROM find_events WHERE id = $1 LIMIT 1`,
    [eventId]
  );
  const configuredFirst = Number(String(eventRows[0]?.starting_stand_number ?? "").trim());
  let standSource: string;
  if (STAND_FIRST_FLAG !== null) {
    standSource = "--first-stand";
  } else if (Number.isInteger(configuredFirst) && configuredFirst >= 10000 && configuredFirst <= 99999) {
    STAND_FIRST = configuredFirst;
    standSource = "find_events.starting_stand_number";
  } else {
    standSource = `default (event has ${eventRows[0]?.starting_stand_number ?? "no"} starting_stand_number)`;
  }

  console.log(line());
  console.log(` EXHIBITOR STAND ALLOCATION — event ${eventId}${APPLY ? "" : "   [DRY RUN — nothing will be written]"}`);
  console.log(line());

  // ---- exhibitors, in the order they will fill the floor ------------------
  // Alphabetical by business name, case- and whitespace-insensitive, with unnamed rows last and
  // the record id as a deterministic tie-break — two runs must produce the same floor plan.
  const { rows: allExhibitors } = (await client.query(
    `SELECT id, business, status::text AS status, exhibition_zone_id, spot_id, stand_number
       FROM find_event_exhibitor
      WHERE event_id = $1
      ORDER BY NULLIF(BTRIM(LOWER(COALESCE(business, ''))), '') ASC NULLS LAST, id ASC`,
    [eventId]
  )) as { rows: ExhibitorRow[] };

  const statusCounts = new Map<string, number>();
  for (const e of allExhibitors) {
    const key = e.status ?? "(none)";
    statusCounts.set(key, (statusCounts.get(key) ?? 0) + 1);
  }

  const exhibitors = allExhibitors.filter((e) => !EXCLUDED_STATUSES.has(e.status ?? ""));

  console.log(`\n  exhibitors on this event : ${allExhibitors.length}`);
  for (const [status, count] of [...statusCounts].sort((a, b) => b[1] - a[1])) {
    const skipped = EXCLUDED_STATUSES.has(status) ? "   (excluded by --exclude-status)" : "";
    console.log(`      ${String(count).padStart(5)}  ${status}${skipped}`);
  }
  console.log(`  to be allocated          : ${exhibitors.length}`);

  if (exhibitors.length === 0) {
    console.log("\n  Nothing to allocate.\n");
    return;
  }

  // Every booth on this event, so allocations can be checked against where the booth really is.
  const { rows: allBooths } = (await client.query(
    `SELECT id, event_layout_child_id, stand_no
       FROM find_event_lobby_spots
      WHERE event_id = $1 AND spot_type = 'exhibitor'`,
    [eventId]
  )) as { rows: { id: number; event_layout_child_id: number | null; stand_no: number | null }[] };
  const boothZoneById = new Map<number, number | null>(
    allBooths.map((b) => [b.id, b.event_layout_child_id])
  );

  if (AUDIT) {
    reportAllocationState(exhibitors, boothZoneById, allBooths.length);

    // Independent cross-check, straight from SQL rather than from the logic above — if these two
    // disagree with "NOT ALLOCATED: 0", the bug is in this script, not in the data.
    const { rows: counts } = await client.query(
      `SELECT
         COUNT(*) FILTER (WHERE spot_id IS NULL)                                  AS no_booth,
         COUNT(*) FILTER (WHERE COALESCE(BTRIM(stand_number), '') = '')            AS no_stand_number,
         COUNT(*) FILTER (WHERE BTRIM(COALESCE(stand_number, '')) !~ '^[0-9]{5}$'
                            AND COALESCE(BTRIM(stand_number), '') <> '')           AS odd_stand_number,
         COUNT(*) FILTER (WHERE status = 'active')                                 AS active_rows,
         COUNT(*)                                                                  AS all_rows
       FROM find_event_exhibitor WHERE event_id = $1`,
      [eventId]
    );
    const c = counts[0];
    console.log(`  Cross-check straight from SQL (event ${eventId}):`);
    console.log(`      rows total / active            : ${c.all_rows} / ${c.active_rows}`);
    console.log(`      with no booth (spot_id IS NULL): ${c.no_booth}`);
    console.log(`      with an empty stand_number     : ${c.no_stand_number}`);
    console.log(`      stand_number not five digits   : ${c.odd_stand_number}`);

    await reportEventSpread(client, eventId);
    if (FIND_TEXT) await reportNamedExhibitors(client, eventId, FIND_TEXT);
    console.log("");
    return;
  }

  // ---- zones --------------------------------------------------------------
  /*
   * Zones are layout_type = 'exhibition' rows belonging to THIS event's lobby layout, and only
   * the enabled ones — exactly the query behind the CP's own "Exhibition Zone" dropdown (see
   * getExhibitorOptions in src/lib/services/eventExhibitorAdmin.ts).
   *
   * An earlier version of this script matched 'exhibition_stand' instead. That is the Exhibitor
   * Stand LAYOUT list (Ultra Stand and the rest), so every exhibitor was allocated to a layout id
   * rather than a zone id — which is why the Edit Trade Stand form showed its zone as a bare
   * "2808 (current)": the saved value was not in the dropdown at all.
   */
  const { rows: lobbyLayoutRows } = await client.query(
    `SELECT id FROM find_event_lobby_layout_manager WHERE event_id = $1 ORDER BY id ASC LIMIT 1`,
    [eventId]
  );
  const lobbyLayoutId: number | null = lobbyLayoutRows[0]?.id ?? null;

  const { rows: existingZones } = (await client.query(
    `SELECT id, title, sequence, layout_id, event_layout_id, template_id, image, status
       FROM find_event_lobby_child_layout_manager
      WHERE event_id = $1 AND layout_type = 'exhibition'
        AND status = 'enabled'
        AND (event_layout_id = $2 OR $2 IS NULL)
      ORDER BY sequence ASC NULLS LAST, id ASC`,
    [eventId, lobbyLayoutId]
  )) as { rows: ZoneRow[] };

  /*
   * The event does not only have the zones that are switched ON. The lobby ships with the full
   * set — "Business Services Zone 6", "Micro Business - Zone 1" and the rest — most of them
   * disabled, each already carrying its proper title, its artwork and its booth coordinates.
   *
   * So when more zones are needed, those are switched on first and only then is a new row
   * invented. Creating "Exhibition Zone 12" beside a disabled "Finance & Accounting Zone 1" gives
   * the visitor a nameless room and leaves the real one dark, which is the wrong trade twice over.
   */
  const { rows: reserveZones } = (await client.query(
    `SELECT id, title, sequence, layout_id, event_layout_id, template_id, image, status
       FROM find_event_lobby_child_layout_manager
      WHERE event_id = $1 AND layout_type = 'exhibition'
        AND (status IS NULL OR status <> 'enabled')
        AND (event_layout_id = $2 OR $2 IS NULL)
      ORDER BY sequence ASC NULLS LAST, id ASC`,
    [eventId, lobbyLayoutId]
  )) as { rows: ZoneRow[] };

  const zonesNeeded = Math.ceil(exhibitors.length / BOOTHS_PER_ZONE);
  const zonesShort = Math.max(0, zonesNeeded - existingZones.length);
  const zonesToEnable = Math.min(zonesShort, reserveZones.length);
  const zonesToCreate = zonesShort - zonesToEnable;

  console.log(`\n  booths per zone          : ${BOOTHS_PER_ZONE}`);
  console.log(`  zones enabled already    : ${existingZones.length}`);
  console.log(`  zones needed             : ${zonesNeeded}`);
  console.log(`  disabled zones available : ${reserveZones.length}`);
  console.log(`  zones to switch on       : ${zonesToEnable}${zonesToEnable ? ` (${reserveZones.slice(0, zonesToEnable).map((z) => z.title).join(", ")})` : ""}`);
  console.log(`  zones to create new      : ${zonesToCreate}`);
  const highestStand = assertFiveDigits(zonesNeeded);
  console.log(
    `  stand numbering          : ${STAND_FORMAT} — ${standNumberFor(0, 1)}-${standNumberFor(0, BOOTHS_PER_ZONE)} in zone 1, ` +
      `up to ${highestStand} in zone ${zonesNeeded}`
  );
  console.log(`  first stand number from  : ${standSource}`);

  if (existingZones.length === 0 && reserveZones.length === 0 && zonesShort > 0) {
    console.error(
      `\n  ! This event has no exhibition zone to copy settings from (template, artwork,\n` +
        `    parent layout). Create the first zone in the Lobby Layout Manager, then re-run —\n` +
        `    every zone this script adds is cloned from the last existing one so the new zones\n` +
        `    render with the same template instead of appearing blank.\n`
    );
    process.exit(1);
  }

  if (ONLY_MISSING) {
    await allocateMissing(client, eventId, allExhibitors, exhibitors, existingZones, boothZoneById, allBooths);
    return;
  }

  if (!APPLY) {
    await previewOnly(client, eventId, exhibitors, existingZones, zonesNeeded);
    return;
  }

  /* ------------------------------------------------------------- APPLY --- */

  const backup: Backup = {
    createdAt: new Date().toISOString(),
    eventId,
    standFormat: STAND_FORMAT,
    firstStand: STAND_FIRST,
    boothsPerZone: BOOTHS_PER_ZONE,
    exhibitors: allExhibitors,
    booths: [],
    createdZoneIds: [],
    enabledZoneIds: [],
    createdBoothIds: [],
  };

  await client.query("BEGIN");
  try {
    // 1a. Switch on as many of the event's own disabled zones as the plan needs.
    const zones = [...existingZones];
    for (const zone of reserveZones.slice(0, zonesToEnable)) {
      await client.query(
        `UPDATE find_event_lobby_child_layout_manager
            SET status = 'enabled', updated_on = NOW()
          WHERE id = $1`,
        [zone.id]
      );
      zones.push({ ...zone, status: "enabled" });
      backup.enabledZoneIds.push(zone.id);
    }

    // 1b. Create any still missing, cloned from the last existing one.
    const template = zones[zones.length - 1];
    let nextSequence = zones.reduce((max, z) => Math.max(max, z.sequence ?? 0), 0) + 1;

    for (let i = 0; i < zonesToCreate; i++) {
      const title = `Exhibition Zone ${zones.length + 1}`;
      const { rows } = await client.query(
        `INSERT INTO find_event_lobby_child_layout_manager
           (layout_id, event_layout_id, template_id, layout_type, title, image, status, sequence,
            event_id, created_on, updated_on, is_default)
         VALUES ($1, $2, $3, 'exhibition', $4, $5, $6, $7, $8, NOW(), NOW(), 0)
         RETURNING id, title, sequence, layout_id, event_layout_id, template_id, image, status`,
        [
          template.layout_id,
          template.event_layout_id,
          template.template_id,
          title,
          template.image,
          template.status,
          nextSequence,
          eventId,
        ]
      );
      zones.push(rows[0]);
      backup.createdZoneIds.push(rows[0].id);
      nextSequence += 1;
    }

    // 2. Give every zone exactly BOOTHS_PER_ZONE booths, numbered for this plan.
    const boothsByZone: BoothRow[][] = [];

    for (let zoneIndex = 0; zoneIndex < zonesNeeded; zoneIndex++) {
      const zone = zones[zoneIndex];
      const { rows: existingBooths } = (await client.query(
        `SELECT id, stand_no, title
           FROM find_event_lobby_spots
          WHERE event_id = $1 AND event_layout_child_id = $2 AND spot_type = 'exhibitor'
          ORDER BY stand_no ASC NULLS LAST, id ASC`,
        [eventId, zone.id]
      )) as { rows: BoothRow[] };

      for (const booth of existingBooths) backup.booths.push({ id: booth.id, stand_no: booth.stand_no });

      const booths: BoothRow[] = [];
      for (let i = 0; i < BOOTHS_PER_ZONE; i++) {
        const standNo = standNumberFor(zoneIndex, i + 1);
        const existing = existingBooths[i];

        if (existing) {
          // Reuse the booth that is already there — it may carry artwork, coordinates and assets
          // that must not be thrown away. Only its number changes.
          if (existing.stand_no !== standNo) {
            await client.query(
              `UPDATE find_event_lobby_spots SET stand_no = $1, updated_on = NOW() WHERE id = $2`,
              [standNo, existing.id]
            );
          }
          booths.push({ ...existing, stand_no: standNo });
          continue;
        }

        const { rows } = await client.query(
          `INSERT INTO find_event_lobby_spots
             (event_id, event_layout_child_id, layout_id, event_layout_id, spot_type, stand_no,
              title, created_on, updated_on)
           VALUES ($1, $2, $3, $4, 'exhibitor', $5, '', NOW(), NOW())
           RETURNING id, stand_no, title`,
          [eventId, zone.id, zone.layout_id, zone.event_layout_id, standNo]
        );
        booths.push(rows[0]);
        backup.createdBoothIds.push(rows[0].id);
      }

      boothsByZone.push(booths);
    }

    // Backup is written before the destructive part, and outside the transaction's reach — if the
    // transaction rolls back the file is simply stale, which is harmless; the reverse (writing it
    // after a successful reallocation) would leave nothing to restore from if the run died.
    const backupPath = writeBackup(backup);
    console.log(`\n  backup written           : ${path.relative(ROOT, backupPath)}`);

    // 3. Clear every allocation on this event, then hand out booths in order.
    await client.query(
      `UPDATE find_event_exhibitor
          SET exhibition_zone_id = NULL, spot_id = NULL, stand_number = NULL
        WHERE event_id = $1`,
      [eventId]
    );

    for (let i = 0; i < exhibitors.length; i++) {
      const zoneIndex = Math.floor(i / BOOTHS_PER_ZONE);
      const booth = boothsByZone[zoneIndex][i % BOOTHS_PER_ZONE];
      await client.query(
        `UPDATE find_event_exhibitor
            SET exhibition_zone_id = $1, spot_id = $2, stand_number = $3
          WHERE id = $4`,
        [zones[zoneIndex].id, booth.id, String(booth.stand_no), exhibitors[i].id]
      );
    }

    await client.query("COMMIT");

    console.log(`\n  allocated                : ${exhibitors.length} exhibitors across ${zonesNeeded} zones`);
    for (let zoneIndex = 0; zoneIndex < zonesNeeded; zoneIndex++) {
      const from = zoneIndex * BOOTHS_PER_ZONE;
      const slice = exhibitors.slice(from, from + BOOTHS_PER_ZONE);
      const zone = zones[zoneIndex];
      const firstNo = boothsByZone[zoneIndex][0].stand_no;
      const lastNo = boothsByZone[zoneIndex][slice.length - 1].stand_no;
      console.log(
        `      ${String(zone.title ?? `Zone ${zone.id}`).padEnd(28)} stands ${firstNo}-${lastNo}` +
          `  (${slice.length}/${BOOTHS_PER_ZONE} filled)`
      );
    }
    console.log(`\n  To undo: npx tsx scripts/allocate-exhibitor-stands.ts --restore=${path.relative(ROOT, backupPath)}\n`);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("\n  ! Rolled back — nothing was changed.\n", error);
    process.exitCode = 1;
  }
}

/**
 * READ-ONLY. Which events hold exhibitors, and how allocated each event's are.
 *
 * This exists because "the audit says every stand is allocated, the website shows blanks" has
 * exactly one shape of explanation: the two are reading different events. find_event_exhibitor
 * rows are per event, the same company appears under several, and the site renders whichever
 * event getDomain() resolves — the CP's active-event setting, falling back to DEFAULT_EVENT_ID
 * (852). If the event with partly-blank stands is not the event this script allocated, that is
 * the whole bug, and no amount of reallocating event ${eventId} would ever show up on the page.
 */
async function reportEventSpread(client: any, eventId: number) {
  const { rows } = await client.query(
    `SELECT event_id,
            COUNT(*)::int                                                        AS rows_total,
            COUNT(*) FILTER (WHERE status = 'active')::int                       AS active_rows,
            COUNT(*) FILTER (WHERE status = 'active'
                               AND BTRIM(COALESCE(stand_number, '')) ~ '^[0-9]{5}$')::int AS five_digit,
            COUNT(*) FILTER (WHERE status = 'active'
                               AND COALESCE(BTRIM(stand_number), '') = '')::int  AS blank_stand
       FROM find_event_exhibitor
      GROUP BY event_id
      ORDER BY active_rows DESC
      LIMIT 8`
  );

  const { rows: settingRows } = await client.query(
    `SELECT value FROM find_settings WHERE varname = $1 AND "DOMAIN" = $2 LIMIT 1`,
    ["cp_active_event_id", 150]
  );
  const { rows: domainRows } = await client.query(
    `SELECT event_id FROM find_domains WHERE id = $1 LIMIT 1`,
    [150]
  );

  console.log(`\n  Which event does what:`);
  console.log(`      CP active-event setting   : ${settingRows[0]?.value ?? "(not set)"}`);
  console.log(`      find_domains.event_id     : ${domainRows[0]?.event_id ?? "(none)"}  (legacy column, not what the site uses)`);
  console.log(`      this run is allocating    : ${eventId}`);
  console.log(`\n      event    active   5-digit stands   blank stands`);
  for (const r of rows) {
    const marker = r.event_id === eventId ? "<-- allocating" : "";
    console.log(
      `      ${String(r.event_id).padEnd(8)} ${String(r.active_rows).padStart(6)} ${String(r.five_digit).padStart(16)} ${String(r.blank_stand).padStart(14)}   ${marker}`
    );
  }
  console.log(`\n      The website lists the event above with BLANK STANDS — if that is not the`);
  console.log(`      "allocating" row, re-run with --event=<that id>.`);
}

/**
 * READ-ONLY. Prints the raw database rows behind the exhibitors whose name matches, alongside the
 * booth they point at — the quickest way to settle "the page shows no stand but the audit says it
 * is allocated", because it shows exactly what the page's own query would read.
 */
async function reportNamedExhibitors(client: any, eventId: number, text: string) {
  const { rows } = await client.query(
    `SELECT e.id, e.business, e.status::text AS status, e.event_id, e.exhibition_zone_id,
            e.spot_id, e.stand_number, s.stand_no AS booth_stand_no,
            s.event_layout_child_id AS booth_zone_id
       FROM find_event_exhibitor e
       LEFT JOIN find_event_lobby_spots s ON s.id = e.spot_id
      WHERE e.business ILIKE $1
      ORDER BY e.event_id = $2 DESC, e.id ASC
      LIMIT 20`,
    [`%${text}%`, eventId]
  );

  console.log(`\n  Rows matching "${text}" (every event, this event's first):`);
  if (rows.length === 0) {
    console.log(`      none found`);
    return;
  }
  for (const r of rows) {
    const here = r.event_id === eventId ? " " : "!";
    console.log(
      `   ${here}  #${String(r.id).padEnd(8)} event ${String(r.event_id).padEnd(6)} ${(r.business ?? "").slice(0, 28).padEnd(30)}` +
        `status=${String(r.status).padEnd(8)} zone=${String(r.exhibition_zone_id ?? "—").padEnd(6)}` +
        `spot=${String(r.spot_id ?? "—").padEnd(7)} stand="${r.stand_number ?? ""}" booth_no=${r.booth_stand_no ?? "—"}`
    );
  }
  console.log(`      ("!" marks a row belonging to a different event — the site only reads event ${eventId}.)`);
}

/**
 * READ-ONLY. Answers "is a stand allocated or not" for every exhibitor, and names the exact
 * problem for each one that isn't, so the next run can be aimed at just those.
 */
function reportAllocationState(
  exhibitors: ExhibitorRow[],
  boothZoneById: Map<number, number | null>,
  boothCount: number
) {
  const problems = new Map<string, ExhibitorRow[]>();
  const allocated: ExhibitorRow[] = [];

  for (const exhibitor of exhibitors) {
    const problem = allocationProblem(exhibitor, boothZoneById);
    if (!problem) {
      allocated.push(exhibitor);
      continue;
    }
    const bucket = problems.get(problem) ?? [];
    bucket.push(exhibitor);
    problems.set(problem, bucket);
  }

  // Two exhibitors showing the same stand id is invisible on any single card, and it is what a
  // half-migrated floor plan produces — so it gets counted separately from the buckets above.
  const byNumber = new Map<string, ExhibitorRow[]>();
  for (const exhibitor of exhibitors) {
    const number = String(exhibitor.stand_number ?? "").trim();
    if (!number) continue;
    const bucket = byNumber.get(number) ?? [];
    bucket.push(exhibitor);
    byNumber.set(number, bucket);
  }
  const duplicates = [...byNumber.entries()].filter(([, rows]) => rows.length > 1);

  const bySpot = new Map<number, ExhibitorRow[]>();
  for (const exhibitor of exhibitors) {
    if (!exhibitor.spot_id) continue;
    const bucket = bySpot.get(exhibitor.spot_id) ?? [];
    bucket.push(exhibitor);
    bySpot.set(exhibitor.spot_id, bucket);
  }
  const doubleBooked = [...bySpot.entries()].filter(([, rows]) => rows.length > 1);

  console.log(`\n  exhibitor booths that exist : ${boothCount}`);
  console.log(`\n  ALLOCATED PROPERLY          : ${allocated.length} / ${exhibitors.length}`);
  console.log(`  NOT ALLOCATED               : ${exhibitors.length - allocated.length}`);
  for (const [problem, rows] of [...problems].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`      ${String(rows.length).padStart(5)}  ${problem}`);
    for (const row of rows.slice(0, 3)) {
      console.log(`             e.g. ${(row.business ?? "(no business name)").slice(0, 44)}`);
    }
  }

  if (duplicates.length > 0) {
    console.log(`\n  DUPLICATE STAND NUMBERS     : ${duplicates.length}`);
    for (const [number, rows] of duplicates.slice(0, 5)) {
      console.log(`      ${number}  ->  ${rows.map((r) => (r.business ?? "?").slice(0, 24)).join(", ")}`);
    }
  }
  if (doubleBooked.length > 0) {
    console.log(`\n  BOOTHS HELD BY TWO EXHIBITORS: ${doubleBooked.length}`);
    for (const [spotId, rows] of doubleBooked.slice(0, 5)) {
      console.log(`      booth #${spotId}  ->  ${rows.map((r) => (r.business ?? "?").slice(0, 24)).join(", ")}`);
    }
  }

  console.log(`\n  Nothing was written (--audit).`);
  console.log(`  To allocate only the ones above:  --only-missing --apply`);
  console.log(`  To renumber the whole floor:      --apply\n`);
}

/** Dry run: show the plan, touch nothing. */
async function previewOnly(
  client: any,
  eventId: number,
  exhibitors: ExhibitorRow[],
  zones: ZoneRow[],
  zonesNeeded: number
) {
  const alreadyAllocated = exhibitors.filter((e) => e.spot_id !== null).length;
  console.log(`  already hold a booth     : ${alreadyAllocated} (these will be reallocated)`);

  console.log(`\n  Planned floor plan:`);
  for (let zoneIndex = 0; zoneIndex < zonesNeeded; zoneIndex++) {
    const zone = zones[zoneIndex];
    const from = zoneIndex * BOOTHS_PER_ZONE;
    const slice = exhibitors.slice(from, from + BOOTHS_PER_ZONE);
    const firstNo = standNumberFor(zoneIndex, 1);
    const lastNo = standNumberFor(zoneIndex, slice.length);
    const name = zone ? String(zone.title ?? `Zone ${zone.id}`) : `Exhibition Zone ${zoneIndex + 1} (would be created)`;
    console.log(`      ${name.padEnd(38)} stands ${firstNo}-${lastNo}  (${slice.length}/${BOOTHS_PER_ZONE})`);
  }

  const sample = exhibitors.slice(0, 5);
  console.log(`\n  First ${sample.length} in fill order:`);
  for (let i = 0; i < sample.length; i++) {
    const standNo = standNumberFor(Math.floor(i / BOOTHS_PER_ZONE), (i % BOOTHS_PER_ZONE) + 1);
    console.log(
      `      stand ${String(standNo).padStart(5)}  ${(sample[i].business ?? "(no business name)").slice(0, 46).padEnd(48)}` +
        `was: ${sample[i].stand_number ?? "—"}`
    );
  }

  const { rows: boothCount } = await client.query(
    `SELECT COUNT(*)::int AS n FROM find_event_lobby_spots
      WHERE event_id = $1 AND spot_type = 'exhibitor'`,
    [eventId]
  );
  console.log(`\n  exhibitor booths that exist today : ${boothCount[0].n}`);
  console.log(`\n  Nothing was written. Re-run with --apply to allocate.\n`);
}

/**
 * Allocates ONLY the exhibitors that have no usable allocation, into the free booths, zone by
 * zone — zone 1's spare booths first, then zone 2's, creating zones when they run out.
 *
 * Every exhibitor that already holds a valid booth keeps it: same zone, same booth, same stand
 * number. That is the difference from the full run above, and it is what makes this safe to use
 * on a floor plan people have already been told about.
 */
async function allocateMissing(
  client: any,
  eventId: number,
  allExhibitors: ExhibitorRow[],
  exhibitors: ExhibitorRow[],
  existingZones: ZoneRow[],
  boothZoneById: Map<number, number | null>,
  allBooths: { id: number; event_layout_child_id: number | null; stand_no: number | null }[]
) {
  const needy = exhibitors.filter((e) => allocationProblem(e, boothZoneById) !== null);
  const holders = exhibitors.filter((e) => allocationProblem(e, boothZoneById) === null);

  console.log(`\n  already allocated        : ${holders.length} (left untouched)`);
  console.log(`  needing a stand          : ${needy.length}`);

  if (needy.length === 0) {
    console.log(`\n  Every exhibitor already holds a valid booth. Nothing to do.\n`);
    return;
  }

  const takenSpots = new Set<number>(holders.map((h) => h.spot_id!).filter(Boolean));
  // Numbers already in play, whether on a booth or on an exhibitor record — a newly handed out
  // stand id must not collide with either.
  const usedNumbers = new Set<number>();
  for (const booth of allBooths) if (booth.stand_no) usedNumbers.add(booth.stand_no);
  for (const exhibitor of exhibitors) {
    const parsed = Number(String(exhibitor.stand_number ?? "").trim());
    if (Number.isInteger(parsed) && parsed > 0) usedNumbers.add(parsed);
  }

  const boothsByZoneId = new Map<number, typeof allBooths>();
  for (const booth of allBooths) {
    if (!booth.event_layout_child_id) continue;
    const bucket = boothsByZoneId.get(booth.event_layout_child_id) ?? [];
    bucket.push(booth);
    boothsByZoneId.set(booth.event_layout_child_id, bucket);
  }

  interface Assignment {
    exhibitor: ExhibitorRow;
    zoneIndex: number;
    zoneLabel: string;
    boothId: number | null;
    standNo: number;
  }

  const assignments: Assignment[] = [];
  const newBoothsByZoneIndex = new Map<number, number>();
  let zonesToCreate = 0;
  let queue = [...needy];
  let zoneIndex = 0;

  while (queue.length > 0) {
    const zone: ZoneRow | undefined = existingZones[zoneIndex];
    const zoneLabel = zone
      ? String(zone.title ?? `Zone ${zone.id}`)
      : `Exhibition Zone ${zoneIndex + 1} (would be created)`;
    if (!zone) zonesToCreate = Math.max(zonesToCreate, zoneIndex - existingZones.length + 1);

    const existing = zone ? (boothsByZoneId.get(zone.id) ?? []).slice().sort((a, b) => (a.stand_no ?? 0) - (b.stand_no ?? 0) || a.id - b.id) : [];
    const free = existing.filter((b) => !takenSpots.has(b.id));

    // Spare booths that already exist, in this zone, keep whatever five-digit number they carry.
    for (const booth of free) {
      if (queue.length === 0) break;
      const keepNumber = booth.stand_no && String(booth.stand_no).length === 5 && booth.stand_no >= 10000;
      const standNo = keepNumber ? booth.stand_no! : nextFreeNumber(zoneIndex, usedNumbers);
      usedNumbers.add(standNo);
      assignments.push({ exhibitor: queue.shift()!, zoneIndex, zoneLabel, boothId: booth.id, standNo });
    }

    // Then top the zone up to capacity with brand new booths.
    let created = 0;
    while (queue.length > 0 && existing.length + created < BOOTHS_PER_ZONE) {
      const standNo = nextFreeNumber(zoneIndex, usedNumbers);
      usedNumbers.add(standNo);
      assignments.push({ exhibitor: queue.shift()!, zoneIndex, zoneLabel, boothId: null, standNo });
      created += 1;
    }
    if (created > 0) newBoothsByZoneIndex.set(zoneIndex, created);

    zoneIndex += 1;
    if (zoneIndex > 10_000) throw new Error("Refusing to plan more than 10,000 zones — check --booths-per-zone.");
  }

  const zonesTouched = new Set(assignments.map((a) => a.zoneIndex)).size;
  console.log(`  zones used for the gaps  : ${zonesTouched} (${zonesToCreate} would be created)`);
  console.log(`  booths to create         : ${[...newBoothsByZoneIndex.values()].reduce((a, b) => a + b, 0)}`);

  console.log(`\n  First ${Math.min(8, assignments.length)} allocations:`);
  for (const a of assignments.slice(0, 8)) {
    console.log(
      `      stand ${String(a.standNo).padStart(5)}  ${a.zoneLabel.slice(0, 22).padEnd(24)}` +
        `${(a.exhibitor.business ?? "(no business name)").slice(0, 40)}`
    );
  }

  if (!APPLY) {
    console.log(`\n  Nothing was written. Re-run with --only-missing --apply to allocate these.\n`);
    return;
  }

  if (zonesToCreate > 0 && existingZones.length === 0) {
    console.error(`\n  ! No exhibition zone exists to clone settings from. Create one first.\n`);
    process.exit(1);
  }

  const backup: Backup = {
    createdAt: new Date().toISOString(),
    eventId,
    standFormat: STAND_FORMAT,
    firstStand: STAND_FIRST,
    boothsPerZone: BOOTHS_PER_ZONE,
    exhibitors: allExhibitors,
    booths: allBooths.map((b) => ({ id: b.id, stand_no: b.stand_no })),
    createdZoneIds: [],
    enabledZoneIds: [],
    createdBoothIds: [],
  };

  await client.query("BEGIN");
  try {
    const zones = [...existingZones];
    const template = existingZones[existingZones.length - 1];
    let nextSequence = existingZones.reduce((max, z) => Math.max(max, z.sequence ?? 0), 0) + 1;

    const maxZoneIndex = Math.max(...assignments.map((a) => a.zoneIndex));
    while (zones.length <= maxZoneIndex) {
      const { rows } = await client.query(
        `INSERT INTO find_event_lobby_child_layout_manager
           (layout_id, event_layout_id, template_id, layout_type, title, image, status, sequence,
            event_id, created_on, updated_on, is_default)
         VALUES ($1, $2, $3, 'exhibition', $4, $5, $6, $7, $8, NOW(), NOW(), 0)
         RETURNING id, title, sequence, layout_id, event_layout_id, template_id, image, status`,
        [
          template.layout_id,
          template.event_layout_id,
          template.template_id,
          `Exhibition Zone ${zones.length + 1}`,
          template.image,
          template.status,
          nextSequence,
          eventId,
        ]
      );
      zones.push(rows[0]);
      backup.createdZoneIds.push(rows[0].id);
      nextSequence += 1;
    }

    const backupPath = writeBackup(backup);
    console.log(`\n  backup written           : ${path.relative(ROOT, backupPath)}`);

    for (const assignment of assignments) {
      const zone = zones[assignment.zoneIndex];
      let boothId = assignment.boothId;

      if (boothId === null) {
        const { rows } = await client.query(
          `INSERT INTO find_event_lobby_spots
             (event_id, event_layout_child_id, layout_id, event_layout_id, spot_type, stand_no,
              title, created_on, updated_on)
           VALUES ($1, $2, $3, $4, 'exhibitor', $5, '', NOW(), NOW())
           RETURNING id`,
          [eventId, zone.id, zone.layout_id, zone.event_layout_id, assignment.standNo]
        );
        boothId = rows[0].id as number;
        backup.createdBoothIds.push(boothId);
      } else {
        await client.query(
          `UPDATE find_event_lobby_spots SET stand_no = $1, updated_on = NOW() WHERE id = $2`,
          [assignment.standNo, boothId]
        );
      }

      await client.query(
        `UPDATE find_event_exhibitor
            SET exhibition_zone_id = $1, spot_id = $2, stand_number = $3
          WHERE id = $4`,
        [zone.id, boothId, String(assignment.standNo), assignment.exhibitor.id]
      );
    }

    await client.query("COMMIT");
    // Rewritten with the created ids filled in, so a restore can remove them.
    writeBackupTo(backupPath, backup);

    console.log(`\n  allocated                : ${assignments.length} exhibitors`);
    console.log(`  left untouched           : ${holders.length}`);
    console.log(`\n  To undo: npx tsx scripts/allocate-exhibitor-stands.ts --apply --restore=${path.relative(ROOT, backupPath)}\n`);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("\n  ! Rolled back — nothing was changed.\n", error);
    process.exitCode = 1;
  }
}

/** The next unused stand number in this zone's block, spilling past the block only if it is full. */
function nextFreeNumber(zoneIndex: number, used: Set<number>): number {
  for (let position = 1; position <= BOOTHS_PER_ZONE * 4; position++) {
    const candidate = standNumberFor(zoneIndex, position);
    if (!used.has(candidate)) return candidate;
  }
  throw new Error(`Could not find a free stand number for zone ${zoneIndex + 1}.`);
}

function writeBackup(backup: Backup): string {
  const dir = path.join(ROOT, "reports");
  fs.mkdirSync(dir, { recursive: true });
  const stamp = backup.createdAt.replace(/[:.]/g, "-");
  const file = path.join(dir, `exhibitor-allocation-backup-${stamp}.json`);
  fs.writeFileSync(file, JSON.stringify(backup, null, 2), "utf8");
  return file;
}

/** Re-serialises the same backup to a path it was already written to. */
function writeBackupTo(file: string, backup: Backup): void {
  fs.writeFileSync(file, JSON.stringify(backup, null, 2), "utf8");
}

/** Puts every exhibitor's allocation and every booth's number back as they were. */
async function restore(client: any, relativePath: string) {
  const file = path.isAbsolute(relativePath) ? relativePath : path.join(ROOT, relativePath);
  if (!fs.existsSync(file)) {
    console.error(`No such backup file: ${file}`);
    process.exit(1);
  }
  const backup: Backup = JSON.parse(fs.readFileSync(file, "utf8"));

  console.log(line());
  console.log(` RESTORE — event ${backup.eventId}, taken ${backup.createdAt}${APPLY ? "" : "   [DRY RUN]"}`);
  console.log(line());
  console.log(`\n  exhibitors to restore : ${backup.exhibitors.length}`);
  console.log(`  booth numbers to restore: ${backup.booths.length}`);
  console.log(`  zones to delete (created by that run): ${backup.createdZoneIds.length}`);
  console.log(`  zones to switch back off             : ${backup.enabledZoneIds?.length ?? 0}`);
  console.log(`  booths to delete (created by that run): ${backup.createdBoothIds.length}`);

  if (!APPLY) {
    console.log(`\n  Nothing was written. Re-run with --apply --restore=… to actually restore.\n`);
    return;
  }

  await client.query("BEGIN");
  try {
    for (const e of backup.exhibitors) {
      await client.query(
        `UPDATE find_event_exhibitor
            SET exhibition_zone_id = $1, spot_id = $2, stand_number = $3
          WHERE id = $4`,
        [e.exhibition_zone_id, e.spot_id, e.stand_number, e.id]
      );
    }
    for (const b of backup.booths) {
      await client.query(`UPDATE find_event_lobby_spots SET stand_no = $1, updated_on = NOW() WHERE id = $2`, [
        b.stand_no,
        b.id,
      ]);
    }
    // Only rows this tool created are removed, and only if no exhibitor is sitting on them.
    if (backup.createdBoothIds.length > 0) {
      await client.query(
        `DELETE FROM find_event_lobby_spots
          WHERE id = ANY($1::int[])
            AND id NOT IN (SELECT spot_id FROM find_event_exhibitor WHERE spot_id IS NOT NULL)`,
        [backup.createdBoothIds]
      );
    }
    if (backup.enabledZoneIds?.length) {
      await client.query(
        `UPDATE find_event_lobby_child_layout_manager
            SET status = 'disabled', updated_on = NOW()
          WHERE id = ANY($1::int[])`,
        [backup.enabledZoneIds]
      );
    }
    if (backup.createdZoneIds.length > 0) {
      await client.query(
        `DELETE FROM find_event_lobby_child_layout_manager
          WHERE id = ANY($1::int[])
            AND id NOT IN (SELECT event_layout_child_id FROM find_event_lobby_spots
                            WHERE event_layout_child_id IS NOT NULL)`,
        [backup.createdZoneIds]
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

/**
 * Deletes the fake "Exhibition Zone N" rows the first buggy run inserted into the stand-layout
 * list, and reports any exhibitor still pointing at one so nothing is removed out from under a
 * live reference. Dry run unless --apply.
 */
async function cleanupBogusStandLayouts(client: any) {
  const eventId = await resolveEventId(client);

  const { rows: bogus } = await client.query(
    `SELECT id, title, status
       FROM find_event_lobby_child_layout_manager
      WHERE event_id = $1
        AND layout_type = 'exhibition_stand'
        AND title ~ '^Exhibition Zone [0-9]+$'
      ORDER BY id ASC`,
    [eventId]
  );

  console.log(`\n${line()}`);
  console.log(` CLEANUP — event ${eventId}${APPLY ? "" : "   [DRY RUN]"}`);
  console.log(line());

  if (bogus.length === 0) {
    console.log(`\n  Nothing to clean up — no "Exhibition Zone N" rows in the stand-layout list.\n`);
    return;
  }

  const ids = bogus.map((r: { id: number }) => r.id);
  const { rows: stillUsed } = await client.query(
    `SELECT exhibition_zone_id AS id, COUNT(*)::int AS exhibitors
       FROM find_event_exhibitor
      WHERE event_id = $1 AND exhibition_zone_id = ANY($2::int[])
      GROUP BY exhibition_zone_id`,
    [eventId, ids]
  );
  const { rows: usedAsLayout } = await client.query(
    `SELECT ex_stand_layout_id AS id, COUNT(*)::int AS exhibitors
       FROM find_event_exhibitor
      WHERE event_id = $1 AND ex_stand_layout_id = ANY($2::int[])
      GROUP BY ex_stand_layout_id`,
    [eventId, ids]
  );
  const busy = new Map<number, number>();
  for (const r of [...stillUsed, ...usedAsLayout]) {
    busy.set(r.id, (busy.get(r.id) ?? 0) + r.exhibitors);
  }

  console.log("");
  for (const row of bogus) {
    const holding = busy.get(row.id) ?? 0;
    console.log(
      `  ${String(row.id).padStart(6)}  "${row.title}"  ` +
        (holding ? `KEPT — ${holding} exhibitor(s) still point at it` : "remove")
    );
  }

  const removable = ids.filter((id: number) => !busy.has(id));
  if (busy.size > 0) {
    console.log(
      `\n  ! ${busy.size} row(s) are still referenced. Re-allocate first\n` +
        `    (npx tsx scripts/allocate-exhibitor-stands.ts --apply), then re-run this cleanup.`
    );
  }

  if (!APPLY) {
    console.log(`\n  Nothing was written. Re-run with --cleanup --apply to delete ${removable.length} row(s).\n`);
    return;
  }
  if (removable.length === 0) {
    console.log(`\n  Nothing removed.\n`);
    return;
  }

  await client.query("BEGIN");
  try {
    await client.query(
      `DELETE FROM find_event_lobby_layout_type_assets
        WHERE event_id = $1 AND event_layout_child_id = ANY($2::int[])`,
      [eventId, removable]
    );
    await client.query(
      `DELETE FROM find_event_lobby_spots
        WHERE event_id = $1 AND event_layout_child_id = ANY($2::int[])
          AND id NOT IN (SELECT spot_id FROM find_event_exhibitor WHERE spot_id IS NOT NULL)`,
      [eventId, removable]
    );
    const { rowCount } = await client.query(
      `DELETE FROM find_event_lobby_child_layout_manager WHERE id = ANY($1::int[])`,
      [removable]
    );
    await client.query("COMMIT");
    console.log(`\n  Removed ${rowCount} row(s) from the stand-layout list.\n`);
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
