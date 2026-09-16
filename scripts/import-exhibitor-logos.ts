/**
 * ===========================================================================
 *  IMPORT EACH EXHIBITOR'S LOGO FROM THEIR OWN WEBSITE
 * ===========================================================================
 *
 *      npx tsx scripts/import-exhibitor-logos.ts                 # DRY RUN, 5 exhibitors
 *      npx tsx scripts/import-exhibitor-logos.ts --apply         # save those 5
 *      npx tsx scripts/import-exhibitor-logos.ts --apply --limit=0        # everyone
 *      npx tsx scripts/import-exhibitor-logos.ts --apply --limit=0 --force # replace existing
 *      ... --size=500        square canvas each logo is delivered on (default 500)
 *      ... --concurrency=6   sites fetched at once (default 6)
 *
 *  Fills two fields on find_event_exhibitor from the exhibitor's own site:
 *
 *      logo         -> public/files/exhibitor_profile_images/<file>   (website logo: directory, cards)
 *      profile_pic  -> public/files/exhibitor_profile_images/<file>   (profile image: admin/profile views)
 *
 *  stand_logo is DELIBERATELY NOT TOUCHED. The virtual stand is artwork an organiser
 *  or the exhibitor has composed for that panel, and a website logo dropped onto it
 *  is not the same thing — whatever is on the stand today stays there.
 *
 *  Those are exactly the folders and the bare-filename convention the app's own
 *  uploader uses (exhibitorImageUrl() in src/lib/services/eventExhibitorAdmin.ts),
 *  so an imported logo is indistinguishable from one an organiser uploaded by hand.
 *
 *  WHERE THE LOGO COMES FROM, in priority order — first one that yields a usable
 *  image wins:
 *
 *      1. <img> whose class/id/alt/src says "logo"  — the real wordmark, best quality
 *      2. <link rel="apple-touch-icon">             — usually a clean 180px square
 *      3. <meta property="og:image">                — a banner, but on-brand
 *      4. <link rel="icon"> / favicon.ico           — last resort, often tiny
 *
 *  Anything under MIN_LOGO_PX on its longest edge is rejected rather than saved as
 *  a blurry 16px smudge. The winner is trimmed of its empty margins, fitted inside
 *  the canvas, and centred on a CANVAS_PX square (500x500 by default) so every card
 *  in the directory and every stand panel gets the same shape to work with. A site that is unreachable, blocks the request, or offers nothing usable
 *  is simply skipped and listed at the end — it keeps whatever it has today.
 *
 *  These are the exhibitors' own marks, used to identify them on your event site.
 *  An exhibitor who has given you specific artwork keeps it: a field that already
 *  has a value is left alone unless you pass --force.
 *
 *  This changes nothing about the virtual stands. If you later DO want the stand
 *  panels rebuilt around these logos, that is generate-stand-artwork.ts, run
 *  separately and on purpose.
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
const FORCE = flags.get("force") === "true";
const LIMIT = flags.has("limit") ? Number(flags.get("limit")) : 5;
const TIMEOUT_MS = Number(flags.get("timeout") ?? 15000);
/** Sites are fetched in parallel; 250 of them one at a time is most of an hour of waiting. */
const CONCURRENCY = Math.max(1, Math.min(16, Number(flags.get("concurrency") ?? 6)));
/** Every logo is delivered on a square canvas of this many pixels. */
const CANVAS_PX = Math.max(64, Math.min(2000, Number(flags.get("size") ?? 500)));
const EVENT_FLAG = flags.get("event");
const ONLY_IDS = (flags.get("exhibitor") ?? "")
  .split(",")
  .map((v) => Number(v.trim()))
  .filter((v) => Number.isInteger(v) && v > 0);

const ACTIVE_EVENT_SETTING = "cp_active_event_id";
const DOMAIN_ID = 150;
const PROFILE_DIR = path.join(ROOT, "public", "files", "exhibitor_profile_images");
const PREVIEW_DIR = path.join(ROOT, "reports", "exhibitor-logo-preview");

/** Below this on the longest edge it is a favicon, not a logo — better to keep initials. */
const MIN_LOGO_PX = 48;
/** The mark is fitted inside this much of the canvas, leaving an even margin around it. */
const INNER_RATIO = 0.86;
const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };
/** For a mark drawn in white on transparency, which would vanish on a white canvas. */
const DARK = { r: 17, g: 24, b: 39, alpha: 1 };
/** SVG has no intrinsic pixel size; rasterise well above the canvas so it stays crisp. */
const SVG_DENSITY = 384;
const MAX_DOWNLOAD_BYTES = 5 * 1024 * 1024;

/*
 * A real browser's User-Agent, not a custom one.
 *
 * This is not about hiding what we are — it is about getting a page at all. Cloudflare, Sucuri,
 * Wordfence and most managed WordPress hosts refuse an unrecognised UA outright, and small
 * business sites sit behind exactly those. An honest "DigitalAgeExpo-LogoImport/1.0" was
 * returning 403 for a large share of the roster, which reads downstream as "this exhibitor has
 * no logo" when in truth the page was never served.
 */
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) " +
  "Chrome/128.0.0.0 Safari/537.36";
const line = (n = 74) => "=".repeat(n);

interface ExhibitorRow {
  id: number;
  business: string | null;
  website: string | null;
  logo: string | null;
  profile_pic: string | null;
  stand_logo: string | null;
  listing_www: string | null;
}

function plainText(value?: string | null): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function normaliseUrl(raw?: string | null): string {
  const trimmed = plainText(raw).replace(/\s+/g, "");
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed.replace(/^\/+/, "")}`;
}

async function fetchWithTimeout(url: string, accept: string): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "user-agent": USER_AGENT,
        accept,
        "accept-language": "en-GB,en;q=0.9",
        "cache-control": "no-cache",
      },
    });
    return response.ok ? response : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * The exhibitor's home page, trying the spellings of an address that a person's browser would
 * resolve silently and `fetch` will not.
 *
 * A website column filled in by hand holds things like "acme.co.uk", "http://acme.co.uk" or a
 * deep link to a contact page. Any one of those can fail on its own while the site is perfectly
 * reachable: the apex may not serve TLS, the certificate may only cover www, or the deep page may
 * be gone while the home page is fine. Each variant is cheap, and giving up after one spelling
 * throws away exhibitors whose sites are working.
 */
async function fetchSite(site: string): Promise<Response | null> {
  const accept = "text/html,application/xhtml+xml";
  const variants: string[] = [site];

  try {
    const u = new URL(site);
    const root = `${u.protocol}//${u.host}/`;
    if (root !== site) variants.push(root);
    if (!u.hostname.startsWith("www.")) variants.push(`${u.protocol}//www.${u.host}/`);
    if (u.protocol === "https:") variants.push(`http://${u.host}/`);
  } catch {
    /* unparseable — the single spelling we were given is all we have */
  }

  for (const variant of variants) {
    const response = await fetchWithTimeout(variant, accept);
    if (response) return response;
  }
  return null;
}

/** Every plausible logo URL on the page, best first. */
function logoCandidates(html: string, pageUrl: string): string[] {
  const out: string[] = [];
  const push = (href?: string | null) => {
    const value = (href ?? "").trim();
    if (!value || value.startsWith("data:")) return;
    try {
      out.push(new URL(value, pageUrl).toString());
    } catch {
      /* unparseable href */
    }
  };

  // 1. An <img> that calls itself a logo. Matched on the whole tag so class, id, alt and src all
  //    count — sites label it in any of them.
  for (const tag of html.match(/<img\b[^>]*>/gi) ?? []) {
    if (!/logo/i.test(tag)) continue;

    /*
     * src is frequently NOT where the image is. A lazy-loading theme (most WordPress ones) puts
     * a transparent placeholder in src and the real file in data-src / data-lazy-src; a
     * responsive theme puts a whole set in srcset and may leave src as the smallest. So every
     * shape is collected, widest srcset entry first, and the placeholders are dropped.
     */
    const attr = (name: string) =>
      tag.match(new RegExp(`\\b${name}=["']([^"']+)["']`, "i"))?.[1];

    const srcset = attr("srcset") ?? attr("data-srcset");
    if (srcset) {
      const widest = srcset
        .split(",")
        .map((part) => part.trim().split(/\s+/))
        .map(([url, size]) => ({ url, width: Number((size ?? "").replace(/[^\d.]/g, "")) || 0 }))
        .filter((c) => c.url)
        .sort((a, b) => b.width - a.width)[0];
      if (widest) push(widest.url);
    }

    for (const name of ["data-src", "data-lazy-src", "data-original", "src"]) {
      const value = attr(name);
      // Skip the tracking pixels and spacers that also sometimes carry "logo" in a class.
      if (value && !/sprite|placeholder|1x1|blank|spacer|lazy-?load/i.test(value)) push(value);
    }
  }

  /*
   * schema.org Organization.logo. Published deliberately, by the site, as "this is our logo" —
   * when it is present it beats guessing from markup, so it goes in right after the <img> tags.
   */
  for (const block of html.match(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi) ?? []) {
    const json = block.replace(/^[\s\S]*?>/, "").replace(/<\/script>$/i, "");
    for (const match of json.matchAll(/"logo"\s*:\s*(?:"([^"]+)"|\{[^{}]*?"url"\s*:\s*"([^"]+)")/g)) {
      push(match[1] || match[2]);
    }
  }

  // 2/4. Icons declared in <head>, apple-touch-icon first (bigger, no favicon compression).
  const links = html.match(/<link\b[^>]*>/gi) ?? [];
  // Largest declared size first: a page often lists 180, 152, 120 and 76, and the 76 is useless.
  const bySizeDesc = (tags: string[]) =>
    [...tags].sort((a, b) => {
      const px = (tag: string) => Number(tag.match(/sizes=["'](\d+)/i)?.[1] ?? 0);
      return px(b) - px(a);
    });
  for (const tag of bySizeDesc(links.filter((t) => /rel=["'][^"']*apple-touch-icon/i.test(t)))) {
    push(tag.match(/\bhref=["']([^"']+)["']/i)?.[1]);
  }

  // 3. og:image — a banner rather than a mark, but it is the brand's own chosen image.
  const og = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1];
  push(og);

  for (const tag of links) {
    if (/rel=["'][^"']*\bicon\b/i.test(tag) && !/apple-touch-icon/i.test(tag)) {
      push(tag.match(/\bhref=["']([^"']+)["']/i)?.[1]);
    }
  }

  try {
    push(new URL("/favicon.ico", pageUrl).toString());
  } catch {
    /* unparseable page url */
  }

  return [...new Set(out)];
}

async function downloadLogo(
  sharp: any,
  candidates: string[]
): Promise<{ buffer: Buffer; from: string; width: number; height: number } | null> {
  for (const url of candidates) {
    const response = await fetchWithTimeout(url, "image/*");
    if (!response) continue;

    const type = response.headers.get("content-type") ?? "";
    if (type && !/^image\//i.test(type)) continue;

    const raw = Buffer.from(await response.arrayBuffer());
    if (raw.length === 0 || raw.length > MAX_DOWNLOAD_BYTES) continue;

    try {
      const isSvg = /svg/i.test(type) || /\.svg(\?|#|$)/i.test(url);
      const inner = Math.round(CANVAS_PX * INNER_RATIO);

      /*
       * Step 1 — the mark itself. .trim() removes the empty margin most logo files carry, so
       * the mark fills the space it is given instead of floating in a box of whitespace, and
       * it is then fitted inside the canvas's inner box. Never enlarged: a 180px touch icon
       * blown up to 430px is a blurry smudge, and it is better to sit small and sharp.
       */
      const mark: Buffer = await sharp(raw, { failOn: "none", density: isSvg ? SVG_DENSITY : 72 })
        .trim()
        .resize({ width: inner, height: inner, fit: "inside", withoutEnlargement: true })
        .png()
        .toBuffer();

      const markMeta = await sharp(mark).metadata();
      const longest = Math.max(markMeta.width ?? 0, markMeta.height ?? 0);
      // Measured on the MARK, before it is padded — every finished file is CANVAS_PX square,
      // so measuring the output would pass a 12px favicon as a 500px logo.
      if (longest < MIN_LOGO_PX) continue;

      /*
       * Step 2 — the canvas. Every logo comes out the same square so the directory grid and the
       * stand panels are uniform. White by default; but a wordmark drawn in white on a
       * transparent background would disappear on white, so that case is flattened onto dark
       * instead. Detected by flattening onto white and asking whether anything is left.
       */
      const onWhite: Buffer = await sharp(mark).flatten({ background: WHITE }).png().toBuffer();
      let background = WHITE;
      if (markMeta.hasAlpha) {
        const stats = await sharp(onWhite).stats();
        const nearlyBlank = stats.channels
          .slice(0, 3)
          .every((c: { mean: number }) => c.mean > 247);
        if (nearlyBlank) background = DARK;
      }

      const buffer: Buffer = await sharp(mark)
        .flatten({ background })
        .resize({
          width: CANVAS_PX,
          height: CANVAS_PX,
          fit: "contain",
          background,
          withoutEnlargement: true,
        })
        .png()
        .toBuffer();

      return { buffer, from: url, width: markMeta.width ?? 0, height: markMeta.height ?? 0 };
    } catch {
      // Not a decodable image (an HTML error page served as .png, an ICO sharp cannot read…).
      continue;
    }
  }
  return null;
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

async function main() {
  const sharp = require("sharp");
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
    const eventId = await resolveEventId(client);

    console.log(line());
    console.log(` EXHIBITOR LOGO IMPORT — event ${eventId}${APPLY ? "" : "   [DRY RUN — files saved to reports/, database untouched]"}`);
    console.log(line());

    const { rows: exhibitors } = (await client.query(
      `SELECT e.id, e.business, e.website, e.logo, e.profile_pic, e.stand_logo, l.www AS listing_www
         FROM find_event_exhibitor e
         LEFT JOIN find_listings l ON l.id = e.listing_id
        WHERE e.event_id = $1 AND e.status = 'active'
          ${ONLY_IDS.length > 0 ? "AND e.id = ANY($2::int[])" : ""}
        ORDER BY NULLIF(BTRIM(LOWER(COALESCE(e.business, ''))), '') ASC NULLS LAST, e.id ASC
        ${LIMIT > 0 ? `LIMIT ${Math.floor(LIMIT)}` : ""}`,
      ONLY_IDS.length > 0 ? [eventId, ONLY_IDS] : [eventId]
    )) as { rows: ExhibitorRow[] };

    console.log(`\n  exhibitors in this run   : ${exhibitors.length}${LIMIT > 0 && ONLY_IDS.length === 0 ? `  (--limit=${LIMIT}; use --limit=0 for all)` : ""}`);
    console.log(`  fields written           : logo (website) + profile_pic — stand_logo untouched`);
    console.log(`  existing images          : ${FORCE ? "will be REPLACED (--force)" : "left alone"}`);
    console.log(`  minimum usable size      : ${MIN_LOGO_PX}px on the longest edge`);
    console.log(`  delivered as             : ${CANVAS_PX}x${CANVAS_PX} PNG, mark centred on a solid canvas`);
    console.log(`  sites fetched at once    : ${CONCURRENCY}\n`);

    fs.mkdirSync(APPLY ? PROFILE_DIR : PREVIEW_DIR, { recursive: true });

    let imported = 0;
    let skippedHave = 0;
    const failures: string[] = [];

    /*
     * One exhibitor, start to finish. Pulled out of the loop so the pool below can have several
     * in flight: almost all of the time here is spent waiting on someone else's web server, and
     * 250 of those in series is most of an hour of doing nothing.
     */
    const processOne = async (exhibitor: ExhibitorRow): Promise<void> => {
      const name = plainText(exhibitor.business) || `#${exhibitor.id}`;
      const site = normaliseUrl(exhibitor.website || exhibitor.listing_www);

      const alreadyHas = [exhibitor.logo, exhibitor.profile_pic].every(
        (v) => (v ?? "").trim() !== ""
      );
      if (alreadyHas && !FORCE) {
        skippedHave += 1;
        console.log(`  · ${name.slice(0, 44).padEnd(46)} already has both — left alone`);
        return;
      }

      if (!site) {
        failures.push(`${name} — no website on file`);
        console.log(`  · ${name.slice(0, 44).padEnd(46)} no website`);
        return;
      }

      const page = await fetchSite(site);
      if (!page) {
        failures.push(`${name} — site unreachable (${site})`);
        console.log(`  · ${name.slice(0, 44).padEnd(46)} site unreachable`);
        return;
      }

      const html = (await page.text()).slice(0, 400_000);
      const found = await downloadLogo(sharp, logoCandidates(html, page.url || site));
      if (!found) {
        failures.push(`${name} — no usable logo found on ${site}`);
        console.log(`  · ${name.slice(0, 44).padEnd(46)} no usable logo`);
        return;
      }

      const filename = `ex${exhibitor.id}_logo.png`;

      if (!APPLY) {
        fs.writeFileSync(path.join(PREVIEW_DIR, filename), found.buffer);
        imported += 1;
        console.log(
          `  + ${name.slice(0, 44).padEnd(46)} ${found.width}x${found.height}  <- ${found.from.slice(0, 60)}`
        );
        return;
      }

      fs.writeFileSync(path.join(PROFILE_DIR, filename), found.buffer);

      /*
       * Bare filename: the app resolves it under each field's own legacy folder.
       *
       * stand_logo and stand_version are untouched on purpose — the stand keeps whatever
       * artwork it has, and bumping its version would only invalidate a cache for artwork
       * that has not changed.
       */
      await client.query(
        `UPDATE find_event_exhibitor
            SET logo        = CASE WHEN $1 OR COALESCE(BTRIM(logo), '') = ''        THEN $2 ELSE logo        END,
                profile_pic = CASE WHEN $1 OR COALESCE(BTRIM(profile_pic), '') = '' THEN $2 ELSE profile_pic END
          WHERE id = $3`,
        [FORCE, filename, exhibitor.id]
      );

      imported += 1;
      console.log(
        `  + ${name.slice(0, 44).padEnd(46)} ${found.width}x${found.height}  <- ${found.from.slice(0, 60)}`
      );
    };

    /*
     * A fixed pool of workers sharing one queue, rather than Promise.all over everything: that
     * would open 250 sockets at once and get this treated as an attack by more than one host.
     * One exhibitor failing is never allowed to end the run — it is recorded and the pool moves on.
     */
    let cursor = 0;
    const worker = async () => {
      while (cursor < exhibitors.length) {
        const exhibitor = exhibitors[cursor++];
        try {
          await processOne(exhibitor);
        } catch (error) {
          const name = plainText(exhibitor.business) || `#${exhibitor.id}`;
          failures.push(`${name} — ${(error as Error).message}`);
          console.log(`  · ${name.slice(0, 44).padEnd(46)} failed: ${(error as Error).message}`);
        }
      }
    };
    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, exhibitors.length) }, () => worker())
    );

    console.log(`\n  logos imported           : ${imported}`);
    console.log(`  already had images       : ${skippedHave}`);
    console.log(`  no logo obtained         : ${failures.length}`);
    for (const f of failures.slice(0, 15)) console.log(`      - ${f}`);
    if (failures.length > 15) console.log(`      … and ${failures.length - 15} more`);

    if (failures.length > 0) {
      // The full list on disk: with 250 exhibitors the console tail is not where you go to
      // work out whose logo still needs adding by hand.
      const reportPath = path.join(ROOT, "reports", "exhibitor-logo-failures.txt");
      fs.mkdirSync(path.dirname(reportPath), { recursive: true });
      fs.writeFileSync(reportPath, failures.join("\n") + "\n", "utf8");
      console.log(`\n  Full list of the ones without a logo: ${path.relative(ROOT, reportPath)}`);
    }

    if (!APPLY) {
      console.log(`\n  Previews are in reports/exhibitor-logo-preview/ — check a few, then re-run with --apply.\n`);
    } else {
      console.log(`\n  Saved to the profile image and website logo. Virtual stands were not touched.\n`);
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
