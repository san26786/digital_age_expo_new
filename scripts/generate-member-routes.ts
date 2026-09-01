/**
 * Regenerates src/lib/members/memberRoutes.generated.ts from the filesystem.
 *
 * Run after adding or removing a page under src/app/members:
 *   npx tsx scripts/generate-member-routes.ts
 *
 * The set it writes is what tells a real /members destination from one that would be swallowed
 * by src/app/members/(event)/[slug]/page.tsx — see that file's note in the generated header.
 */
import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const MEMBERS_DIR = path.join(ROOT, "src", "app", "members");
const OUT_FILE = path.join(ROOT, "src", "lib", "members", "memberRoutes.generated.ts");

/** Collects the URL segment of every folder containing a page.tsx, skipping route groups. */
function collect(dir: string, prefix: string[], found: Set<string>): void {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;

    const name = entry.name;
    // "(event)" is a route group — it contributes no URL segment.
    const isGroup = name.startsWith("(") && name.endsWith(")");
    // "[slug]" is the catch-all itself, and never a concrete route.
    const isDynamic = name.startsWith("[");

    const next = isGroup ? prefix : [...prefix, name];
    const child = path.join(dir, name);

    if (!isDynamic && fs.existsSync(path.join(child, "page.tsx"))) {
      found.add(next.join("/"));
    }
    if (!isDynamic) collect(child, next, found);
  }
}

const routes = new Set<string>();
collect(MEMBERS_DIR, [], routes);

const header = `/**
 * AUTO-GENERATED — do not edit by hand.
 * Regenerate with:  npx tsx scripts/generate-member-routes.ts
 *
 * Every page that actually exists under src/app/members (the "(event)" route group adds no URL
 * segment, so its folders are real /members/<segment> routes).
 *
 * Why this file has to exist: src/app/members/(event)/[slug]/page.tsx is a catch-all that
 * renders a generic placeholder module with MOCK data for any unknown segment. That means a
 * wrong or stale link in find_event_menus never 404s — it silently lands the member on a
 * convincing-looking fake page. Checking a link against this set is the only way to tell a real
 * destination from one the catch-all is about to fake.
 */
`;

const body = `export const MEMBER_ROUTES: ReadonlySet<string> = new Set([
${[...routes].sort().map((r) => `  "${r}",`).join("\n")}
]);

/** True when \`/members/<segment>\` is a real implemented page rather than the [slug] catch-all. */
export function isRealMemberRoute(segment: string): boolean {
  return MEMBER_ROUTES.has(segment);
}
`;

fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
fs.writeFileSync(OUT_FILE, header + body, "utf8");
console.log(`Wrote ${routes.size} member routes to ${path.relative(ROOT, OUT_FILE)}`);
