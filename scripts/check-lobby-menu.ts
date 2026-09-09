/**
 * ===========================================================================
 *  LOBBY FOOTER MENU DIAGNOSTIC
 * ===========================================================================
 *
 *  Run this when a footer menu item does the wrong thing — most often when it
 *  opens an empty dropdown saying "Coming soon." instead of its destination.
 *
 *      npm run menu:check -- --event=1474
 *      npx tsx scripts/check-lobby-menu.ts --event=1474
 *
 *  It prints every active find_event_lobby_menu row for the event, the asset
 *  row each "asset" item points at, and the destination the lobby resolves —
 *  then names the reason for every item that resolves to nothing.
 *
 *  WHY THIS EXISTS
 *    "Coming soon." is not a code path with its own error: it is what the
 *    footer renders for a childless item whose href AND iframeUrl are both
 *    null. That can happen for four different data reasons, and the screen
 *    cannot tell you which. This can.
 *
 *  Read-only. It issues SELECTs and nothing else.
 */

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
for (const a of process.argv.slice(2).filter((x) => x.startsWith("--"))) {
  const [k, v] = a.replace(/^--/, "").split("=");
  flags.set(k, v ?? "true");
}
const EVENT_ID = Number(flags.get("event") ?? 0);

if (!EVENT_ID) {
  console.error("Usage: npm run menu:check -- --event=<id>");
  process.exit(1);
}

const line = (n = 78) => "-".repeat(n);
const show = (v: unknown) => (v === null || v === undefined || v === "" ? "(empty)" : String(v));

async function main() {
  const { prisma } = await import("../src/lib/prisma");
  const { getLobbyFooterMenu } = await import("../src/lib/services/publicLobby");

  const event = await prisma.find_events.findFirst({
    where: { id: EVENT_ID },
    select: { id: true, title: true, friendly_url: true },
  });
  if (!event) {
    console.error(`No find_events row with id ${EVENT_ID}.`);
    process.exit(1);
  }

  console.log("=".repeat(78));
  console.log(` Lobby footer menu for event ${event.id} — ${show(event.title)}`);
  console.log(` slug: ${show(event.friendly_url)}`);
  console.log("=".repeat(78));

  const rows = await prisma.find_event_lobby_menu.findMany({
    where: { event_id: EVENT_ID },
    orderBy: [{ parent_id: "asc" }, { seq: "asc" }, { id: "asc" }],
  });

  const assetIds = rows
    .filter((r: any) => r.post_asset_id)
    .map((r: any) => r.post_asset_id as number);
  const assets = assetIds.length
    ? await prisma.find_event_lobby_layout_type_assets.findMany({
        where: { id: { in: assetIds } },
        select: {
          id: true,
          title: true,
          event_id: true,
          asset_type: true,
          asset_url: true,
          external_link: true,
          asset_attachment: true,
          is_iframe: true,
        },
      })
    : [];
  const assetById = new Map<number, any>(assets.map((a: any) => [a.id, a]));

  console.log(`\n${rows.length} menu row(s):\n`);
  for (const r of rows as any[]) {
    const kind = show(r.post_action_type);
    const where = r.parent_id ? `child of #${r.parent_id}` : "top level";
    console.log(
      `#${String(r.id).padEnd(7)} seq ${String(r.seq).padEnd(4)} ${r.active ? "active " : "HIDDEN "} ${where.padEnd(14)} ${show(r.title)}`
    );
    console.log(`         action=${kind}  asset=${show(r.post_asset_id)}  layout=${show(r.layout_id)}  room=${show(r.networking_room_id)}  exhibitor=${show(r.exhibitor_id)}`);

    if (r.post_action_type === "asset") {
      const a = r.post_asset_id ? assetById.get(r.post_asset_id) : undefined;
      if (!r.post_asset_id) {
        console.log("         !! action is 'asset' but no post_asset_id is set — nothing to open.");
      } else if (!a) {
        console.log(`         !! post_asset_id ${r.post_asset_id} has no row in find_event_lobby_layout_type_assets.`);
      } else {
        console.log(`         asset #${a.id} "${show(a.title)}" (event ${a.event_id})`);
        console.log(`           asset_type       = ${show(a.asset_type)}`);
        console.log(`           is_iframe        = ${show(a.is_iframe)}`);
        console.log(`           external_link    = ${show(a.external_link)}`);
        console.log(`           asset_url        = ${show(a.asset_url)}`);
        console.log(`           asset_attachment = ${show(a.asset_attachment)}`);
        if (!a.external_link && !a.asset_url && !a.asset_attachment) {
          console.log("         !! all three URL columns are empty — this asset has no destination at all.");
        }
        if (a.event_id !== EVENT_ID) {
          console.log(`         !  this asset belongs to event ${a.event_id}, not ${EVENT_ID}.`);
        }
      }
    }
    console.log("");
  }

  // What the lobby actually renders.
  console.log(line());
  console.log(" Resolved footer (exactly what getLobbyFooterMenu returns)");
  console.log(line());
  const items = await getLobbyFooterMenu(EVENT_ID, event.friendly_url ?? "");
  for (const i of items) {
    const dest = i.iframeUrl
      ? `MODAL  ${i.iframeUrl}`
      : i.href
        ? `${i.external ? "LINK   " : "PAGE   "}${i.href}`
        : i.children?.length
          ? `DROPDOWN (${i.children.length})`
          : 'NOTHING -> renders the empty dropdown, i.e. "Coming soon."';
    console.log(`  ${String(i.title).padEnd(26)} ${dest}`);
    for (const c of i.children ?? []) {
      const cd = c.iframeUrl ? `MODAL  ${c.iframeUrl}` : c.href ? `PAGE   ${c.href}` : 'NOTHING -> "Coming soon."';
      console.log(`    - ${String(c.title).padEnd(24)} ${cd}`);
    }
  }

  const dead = items.filter((i) => !i.iframeUrl && !i.href && !i.children?.length);
  console.log(`\n${line()}`);
  if (dead.length === 0) {
    console.log(" RESULT: every footer item resolves to a destination.");
  } else {
    console.log(` RESULT: ${dead.length} item(s) resolve to nothing and will show "Coming soon.":`);
    for (const d of dead) console.log(`   - ${d.title} (action=${show(d.kind)})`);
    console.log("\n For an Event Guide item, the fix is on the ASSET row, not in the menu:");
    console.log("   put the embed URL in external_link (or asset_url) and set is_iframe = true.");
  }
  console.log(line());
}

main()
  .catch((e) => {
    console.error("\nFATAL:", e?.stack ?? e);
    process.exit(1);
  })
  .then(() => process.exit(0));
