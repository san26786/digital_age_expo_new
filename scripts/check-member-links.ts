/**
 * ===========================================================================
 *  MEMBER NAV LINK CHECK
 * ===========================================================================
 *
 *      npx tsx scripts/check-member-links.ts        (or: npm run members:check-links)
 *
 *  Every destination in src/components/EventAdminNavbar must be a page that really exists under
 *  src/app/members. Exits non-zero when one isn't, so this can gate a build.
 *
 *  This is not busywork. src/app/members/(event)/[slug]/page.tsx is a catch-all: any unknown
 *  segment renders a generic module populated with MOCK records. A typo in the navbar therefore
 *  does NOT produce a 404 — it produces a page of convincing fake data with the member's own
 *  breadcrumb on it. The filesystem is the only thing that can tell the two apart.
 *
 *  Also reports member pages that exist but nothing in the nav links to, which is usually either
 *  a module someone forgot to surface or a page that can be deleted.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { MEMBER_ROUTES } from "../src/lib/members/memberRoutes.generated";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const NAVBAR = path.join(ROOT, "src", "components", "EventAdminNavbar", "index.tsx");

/** Auth/entry pages that are reached directly, never from the signed-in nav. */
const NOT_MENU_ITEMS = new Set(["index", "register", "user_index"]);

const source = fs.readFileSync(NAVBAR, "utf8");

// Matches the `${BASE}/<segment>?...` template literals the navbar is built from.
const used = new Set<string>();
for (const match of source.matchAll(/\$\{BASE\}\/([A-Za-z0-9_-]+)/g)) {
  used.add(match[1]);
}

if (used.size === 0) {
  console.error("Found no `${BASE}/...` links in the navbar — has it been restructured?");
  process.exit(1);
}

const broken = [...used].filter((segment) => !MEMBER_ROUTES.has(segment)).sort();
const unreachable = [...MEMBER_ROUTES]
  .filter((segment) => !used.has(segment) && !NOT_MENU_ITEMS.has(segment))
  .sort();

console.log(`Checked ${used.size} distinct destinations against ${MEMBER_ROUTES.size} member pages.\n`);

if (broken.length) {
  console.error("BROKEN — no page exists, so the [slug] catch-all would fake it:");
  for (const segment of broken) console.error(`  /members/${segment}`);
  console.error("");
} else {
  console.log("OK — every navbar link resolves to a real page.\n");
}

if (unreachable.length) {
  console.log("Pages with no menu entry (informational):");
  for (const segment of unreachable) console.log(`  /members/${segment}`);
  console.log("");
}

process.exit(broken.length ? 1 : 0);
