/**
 * ===========================================================================
 *  GENERATE STAND ARTWORK FOR EXHIBITORS
 * ===========================================================================
 *
 *      npx tsx scripts/generate-stand-artwork.ts                  # DRY RUN, 5 stands
 *      npx tsx scripts/generate-stand-artwork.ts --apply          # publish those 5
 *      npx tsx scripts/generate-stand-artwork.ts --apply --limit=0     # every exhibitor
 *      npx tsx scripts/generate-stand-artwork.ts --apply --exhibitor=123,456
 *      npx tsx scripts/generate-stand-artwork.ts --apply --force   # redo slots already filled
 *
 *  WHAT IT MAKES
 *
 *  The six upload areas of the default stand (mirroring STAND_TEMPLATE_SLOTS in
 *  src/lib/standTemplateSlots.ts), at the sizes the artwork spec asks for:
 *
 *      top_banner          678 x 188   stand header
 *      top_banner_left     325 x 395   hanging banner
 *      top_banner_right    325 x 395   hanging banner
 *      bottom_banner_left  335 x 727   pull-up
 *      bottom_banner_right 335 x 727   pull-up
 *      tabletop_banner     232 x  94   table front
 *
 *  Each panel is COMPOSED from what we already know about the exhibitor — their
 *  business name, their strapline, their web address, and their logo where the
 *  platform holds one — set on a colour taken from their own site. Nothing of
 *  theirs is republished: no photography is lifted off their pages, so there is
 *  no third-party imagery on the stand that they did not give this platform.
 *
 *  WHAT IT READS FROM THEIR SITE
 *
 *  One request per exhibitor, for the page's <head> only: <title>, the meta or
 *  og description (the strapline) and theme-color (the brand colour). Sites that
 *  are slow, blocked or offline simply fall back to the database's own values and
 *  a colour derived from the business name — a stand is still generated. Use
 *  --no-fetch to skip the network entirely.
 *
 *  HOW IT PUBLISHES
 *
 *  Exactly like the Manage Stand Assets screen does (the `update_template_asset`
 *  action in /api/members/stand-assets/route.ts): one
 *  find_event_lobby_layout_type_assets row per exhibitor per slot keyed by
 *  `title = <slot key>`, a single find_event_lobby_asset_gallery row pointing at a
 *  file in public/images/lobby_assets, and a bumped stand_version so the lobby
 *  re-reads it. A slot that already has artwork is left alone unless --force.
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
const FORCE = flags.get("force") === "true";
const NO_FETCH = flags.get("no-fetch") === "true";
const LIMIT = flags.has("limit") ? Number(flags.get("limit")) : 5;
const TIMEOUT_MS = Number(flags.get("timeout") ?? 8000);
const EVENT_FLAG = flags.get("event");
const ONLY_IDS = (flags.get("exhibitor") ?? "")
  .split(",")
  .map((v) => Number(v.trim()))
  .filter((v) => Number.isInteger(v) && v > 0);

const ACTIVE_EVENT_SETTING = "cp_active_event_id";
const DOMAIN_ID = 150;
const UPLOAD_DIR = path.join(ROOT, "public", "images", "lobby_assets");

/** Mirrors STAND_TEMPLATE_SLOTS in src/lib/standTemplateSlots.ts — keys must match exactly. */
const SLOTS = [
  { key: "top_banner", label: "Stand Header", width: 678, height: 188, kind: "header" },
  { key: "top_banner_left", label: "Hanging Banner (Left)", width: 325, height: 395, kind: "portrait" },
  { key: "top_banner_right", label: "Hanging Banner (Right)", width: 325, height: 395, kind: "portrait" },
  { key: "bottom_banner_left", label: "Pull-up (Left)", width: 335, height: 727, kind: "pullup" },
  { key: "bottom_banner_right", label: "Pull-up (Right)", width: 335, height: 727, kind: "pullup" },
  { key: "tabletop_banner", label: "Tabletop", width: 232, height: 94, kind: "tabletop" },
] as const;

type Slot = (typeof SLOTS)[number];

interface ExhibitorRow {
  id: number;
  business: string | null;
  website: string | null;
  logo: string | null;
  listing_id: number | null;
  listing_title: string | null;
  listing_logo_extension: string | null;
  listing_description: string | null;
  listing_www: string | null;
}

interface Brand {
  name: string;
  strapline: string;
  website: string;
  colour: string;
  accent: string;
  logoDataUri: string | null;
  source: string;
}

const line = (n = 74) => "=".repeat(n);

/* -------------------------------------------------------------- utilities */

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function plainText(value?: string | null): string {
  return (value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

/** Greedy word wrap, measured in characters — good enough for a fixed font size on a banner. */
function wrap(text: string, charsPerLine: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= charsPerLine) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    current = word;
    if (lines.length === maxLines) break;
  }
  if (current && lines.length < maxLines) lines.push(current);
  if (lines.length === maxLines && words.join(" ").length > lines.join(" ").length) {
    lines[maxLines - 1] = lines[maxLines - 1].replace(/[\s,.;:-]+$/, "") + "…";
  }
  return lines;
}

/**
 * A stable brand colour for an exhibitor with no theme-color of their own.
 *
 * Derived from the business name, so the same company always gets the same colour and two
 * neighbouring stands do not come out identical. Saturation and lightness are fixed to a range
 * that keeps white text readable — a random hex would produce unreadable pastels.
 */
function colourFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  const hue = hash % 360;
  return hslToHex(hue, 62, 34);
}

function hslToHex(h: number, s: number, l: number): string {
  const sn = s / 100;
  const ln = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sn * Math.min(ln, 1 - ln);
  const f = (n: number) => {
    const value = ln - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return Math.round(255 * value)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/** 0-1 relative luminance, the WCAG definition — what decides whether white text can sit on it. */
function luminance(hex: string): number {
  const value = hex.replace("#", "");
  const full = value.length === 3 ? value.replace(/(.)/g, "$1$1") : value;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
  const channel = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** How far the colour is from grey, 0-1 — a near-grey "brand colour" carries no brand at all. */
function saturationOf(hex: string): number {
  const value = hex.replace("#", "");
  const full = value.length === 3 ? value.replace(/(.)/g, "$1$1") : value;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
}

/**
 * Makes a site's own theme-color usable as a panel behind WHITE text.
 *
 * This is the bug that produced a blank-looking stand: ABA Events' website is an Instagram
 * profile, Instagram declares `theme-color: #ffffff`, and the generator took it at face value —
 * white panel, white text, nothing visible. A brand colour is only a brand colour if you can
 * read the company's name on it.
 *
 *   - near-grey (no hue to preserve, e.g. #ffffff, #f5f5f5, #111) -> fall back to the colour
 *     derived from the business name, which is always in a readable band by construction
 *   - too light but genuinely coloured -> keep the hue, darken until white text passes
 */
function readableBackground(hex: string, name: string): string {
  if (saturationOf(hex) < 0.15) return colourFromName(name);

  let colour = hex;
  let guard = 0;
  while (luminance(colour) > 0.28 && guard < 24) {
    colour = lighten(colour, -12);
    guard += 1;
  }
  return luminance(colour) > 0.28 ? colourFromName(name) : colour;
}

function lighten(hex: string, amount: number): string {
  const value = hex.replace("#", "");
  const num = parseInt(value.length === 3 ? value.replace(/(.)/g, "$1$1") : value, 16);
  const r = Math.min(255, ((num >> 16) & 255) + amount);
  const g = Math.min(255, ((num >> 8) & 255) + amount);
  const b = Math.min(255, (num & 255) + amount);
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

function normaliseUrl(raw?: string | null): string {
  const trimmed = plainText(raw).replace(/\s+/g, "");
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed.replace(/^\/+/, "")}`;
}

function prettyHost(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./i, "");
  } catch {
    return url.replace(/^https?:\/\/(www\.)?/i, "").split("/")[0];
  }
}

/* ------------------------------------------------------- their own website */

/**
 * One HEAD-of-page fetch per exhibitor. Deliberately tolerant: any failure — DNS, TLS, 403,
 * timeout, a site that is simply gone — returns nothing and the caller falls back to the
 * database. 232 third-party sites will never all respond, and a stand must still be produced.
 */
async function readSiteMeta(
  url: string
): Promise<{ title?: string; description?: string; themeColor?: string } | null> {
  if (!url || NO_FETCH) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        // Identifies the caller honestly rather than pretending to be a person's browser.
        "user-agent": "DigitalAgeExpo-StandArtwork/1.0 (+event exhibitor stand generation)",
        accept: "text/html,application/xhtml+xml",
      },
    });
    if (!response.ok) return null;
    const html = (await response.text()).slice(0, 200_000);

    const meta = (pattern: RegExp): string | undefined => {
      const match = html.match(pattern);
      return match ? plainText(match[1]) : undefined;
    };

    return {
      title: meta(/<title[^>]*>([\s\S]*?)<\/title>/i),
      description:
        meta(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i) ??
        meta(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i),
      themeColor: meta(/<meta[^>]+name=["']theme-color["'][^>]+content=["']([^"']+)["']/i),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** The exhibitor's logo as a data URI, if this platform holds the file locally. */
function findLocalLogo(exhibitor: ExhibitorRow): string | null {
  const candidates: string[] = [];
  const raw = plainText(exhibitor.logo);
  if (raw && !/^https?:/i.test(raw)) {
    candidates.push(path.join(ROOT, "public", "files", "exhibitor_profile_images", raw));
    candidates.push(path.join(ROOT, "public", raw.replace(/^\//, "")));
  }
  if (exhibitor.listing_id && exhibitor.listing_logo_extension) {
    candidates.push(
      path.join(ROOT, "public", "files", "logo", `${exhibitor.listing_id}.${exhibitor.listing_logo_extension}`)
    );
    candidates.push(
      path.join(
        ROOT,
        "public",
        "images",
        "external",
        "files",
        "logo",
        `${exhibitor.listing_id}.${exhibitor.listing_logo_extension}`
      )
    );
  }

  for (const candidate of candidates) {
    try {
      if (!fs.existsSync(candidate)) continue;
      const ext = path.extname(candidate).toLowerCase().replace(".", "");
      const mime = ext === "svg" ? "image/svg+xml" : ext === "jpg" ? "image/jpeg" : `image/${ext}`;
      return `data:${mime};base64,${fs.readFileSync(candidate).toString("base64")}`;
    } catch {
      /* unreadable file — treat as no logo */
    }
  }
  return null;
}

async function buildBrand(exhibitor: ExhibitorRow): Promise<Brand> {
  const name = plainText(exhibitor.business) || plainText(exhibitor.listing_title) || "Exhibitor";
  const website = normaliseUrl(exhibitor.website || exhibitor.listing_www);
  const meta = await readSiteMeta(website);

  const strapline =
    plainText(meta?.description) ||
    plainText(exhibitor.listing_description) ||
    plainText(meta?.title) ||
    "";

  const themeColour = plainText(meta?.themeColor);
  const colour = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(themeColour)
    ? readableBackground(themeColour, name)
    : colourFromName(name);

  return {
    name,
    strapline,
    website: website ? prettyHost(website) : "",
    colour,
    accent: lighten(colour, 48),
    logoDataUri: findLocalLogo(exhibitor),
    source: meta ? (themeColour ? "site (colour + text)" : "site (text)") : NO_FETCH ? "database" : "database (site unreachable)",
  };
}

/* ---------------------------------------------------------------- artwork */

function logoBlock(brand: Brand, x: number, y: number, w: number, h: number): string {
  if (brand.logoDataUri) {
    return `<image href="${brand.logoDataUri}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet"/>`;
  }
  const initials = escapeXml(brand.name.trim().slice(0, 2).toUpperCase());
  return `<text x="${x + w / 2}" y="${y + h / 2}" font-family="Arial, Helvetica, sans-serif" font-size="${Math.round(
    h * 0.5
  )}" font-weight="700" fill="#ffffff" opacity="0.9" text-anchor="middle" dominant-baseline="central">${initials}</text>`;
}

function svgFor(slot: Slot, brand: Brand): string {
  const { width: W, height: H } = slot;
  const name = escapeXml(brand.name.toUpperCase());
  const web = escapeXml(brand.website);
  const bg = `
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${brand.colour}"/>
        <stop offset="100%" stop-color="${lighten(brand.colour, -18)}"/>
      </linearGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#g)"/>
    <rect x="0" y="${H - Math.max(4, H * 0.012)}" width="${W}" height="${Math.max(4, H * 0.012)}" fill="${brand.accent}"/>`;

  const font = `font-family="Arial, Helvetica, sans-serif"`;

  if (slot.kind === "header") {
    const nameLines = wrap(brand.name.toUpperCase(), 22, 2);
    // Fit to the panel rather than trusting a fixed size: "ABUELITA'S WELLBEING CIC" at 44px is
    // wider than the 678px header and was running off the edge mid-word. 0.62em is a good width
    // estimate for bold Arial capitals.
    const longest = Math.max(...nameLines.map((l) => l.length), 1);
    const available = (brand.logoDataUri ? W - 202 : W - 34) - 30;
    const size = Math.max(18, Math.min(nameLines.length > 1 ? 34 : 44, Math.floor(available / (longest * 0.62))));
    const logo = brand.logoDataUri
      ? `<rect x="26" y="${H / 2 - 52}" width="150" height="104" rx="12" fill="#ffffff"/>${logoBlock(brand, 38, H / 2 - 42, 126, 84)}`
      : "";
    const textX = brand.logoDataUri ? 202 : 34;
    const startY = H / 2 - ((nameLines.length - 1) * size) / 2 + 4;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${bg}${logo}
      ${nameLines
        .map(
          (l, i) =>
            `<text x="${textX}" y="${startY + i * (size + 6)}" ${font} font-size="${size}" font-weight="800" fill="#ffffff" letter-spacing="1.5" dominant-baseline="middle">${escapeXml(
              l
            )}</text>`
        )
        .join("")}
      ${web ? `<text x="${W - 26}" y="${H - 24}" ${font} font-size="17" fill="#ffffff" opacity="0.85" text-anchor="end">${web}</text>` : ""}
    </svg>`;
  }

  if (slot.kind === "tabletop") {
    const lines = wrap(brand.name.toUpperCase(), 18, 2);
    const size = lines.length > 1 ? 17 : 23;
    const startY = H / 2 - ((lines.length - 1) * size) / 2;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${bg}
      ${lines
        .map(
          (l, i) =>
            `<text x="${W / 2}" y="${startY + i * (size + 3)}" ${font} font-size="${size}" font-weight="800" fill="#ffffff" letter-spacing="1" text-anchor="middle" dominant-baseline="middle">${escapeXml(
              l
            )}</text>`
        )
        .join("")}
    </svg>`;
  }

  // Portrait banners and pull-ups share a layout: logo plate, name, strapline, web address.
  const isPullup = slot.kind === "pullup";
  const plateSize = isPullup ? 150 : 120;
  const plateY = isPullup ? 90 : 56;
  const nameSize = isPullup ? 30 : 26;
  const nameLines = wrap(brand.name.toUpperCase(), isPullup ? 16 : 15, 3);
  const nameY = plateY + plateSize + (isPullup ? 90 : 64);
  const straplineSize = isPullup ? 19 : 16;
  const straplineLines = brand.strapline
    ? wrap(brand.strapline, isPullup ? 28 : 26, isPullup ? 6 : 4)
    : [];
  const straplineY = nameY + nameLines.length * (nameSize + 6) + (isPullup ? 44 : 30);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${bg}
    <rect x="${(W - plateSize) / 2}" y="${plateY}" width="${plateSize}" height="${plateSize}" rx="18" fill="#ffffff" opacity="${
      brand.logoDataUri ? 1 : 0.14
    }"/>
    ${logoBlock(brand, (W - plateSize) / 2 + 16, plateY + 16, plateSize - 32, plateSize - 32)}
    ${nameLines
      .map(
        (l, i) =>
          `<text x="${W / 2}" y="${nameY + i * (nameSize + 6)}" ${font} font-size="${nameSize}" font-weight="800" fill="#ffffff" letter-spacing="1.2" text-anchor="middle">${escapeXml(
            l
          )}</text>`
      )
      .join("")}
    ${straplineLines
      .map(
        (l, i) =>
          `<text x="${W / 2}" y="${straplineY + i * (straplineSize + 8)}" ${font} font-size="${straplineSize}" fill="#ffffff" opacity="0.88" text-anchor="middle">${escapeXml(
            l
          )}</text>`
      )
      .join("")}
    ${
      web
        ? `<text x="${W / 2}" y="${H - (isPullup ? 54 : 38)}" ${font} font-size="${
            isPullup ? 19 : 16
          }" font-weight="700" fill="#ffffff" text-anchor="middle">${web}</text>`
        : ""
    }
  </svg>`;
}

/* ------------------------------------------------------------------- main */

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
    console.log(` STAND ARTWORK — event ${eventId}${APPLY ? "" : "   [DRY RUN — files written, database untouched]"}`);
    console.log(line());

    const { rows: exhibitors } = (await client.query(
      `SELECT e.id, e.business, e.website, e.logo, e.listing_id,
              l.title AS listing_title, l.logo_extension AS listing_logo_extension,
              COALESCE(NULLIF(BTRIM(l.description_short), ''), l.description) AS listing_description,
              l.www AS listing_www
         FROM find_event_exhibitor e
         LEFT JOIN find_listings l ON l.id = e.listing_id
        WHERE e.event_id = $1 AND e.status = 'active'
          ${ONLY_IDS.length > 0 ? "AND e.id = ANY($2::int[])" : ""}
        ORDER BY NULLIF(BTRIM(LOWER(COALESCE(e.business, ''))), '') ASC NULLS LAST, e.id ASC
        ${LIMIT > 0 ? `LIMIT ${Math.floor(LIMIT)}` : ""}`,
      ONLY_IDS.length > 0 ? [eventId, ONLY_IDS] : [eventId]
    )) as { rows: ExhibitorRow[] };

    console.log(`\n  exhibitors in this run   : ${exhibitors.length}${LIMIT > 0 && ONLY_IDS.length === 0 ? `  (--limit=${LIMIT}; use --limit=0 for all)` : ""}`);
    console.log(`  slots per stand          : ${SLOTS.length}`);
    console.log(`  website lookups          : ${NO_FETCH ? "skipped (--no-fetch)" : `on, ${TIMEOUT_MS}ms timeout`}`);
    console.log(`  existing artwork         : ${FORCE ? "will be REPLACED (--force)" : "left alone"}`);

    fs.mkdirSync(UPLOAD_DIR, { recursive: true });

    let generated = 0;
    let skipped = 0;

    for (const exhibitor of exhibitors) {
      const brand = await buildBrand(exhibitor);
      console.log(`\n  ${(brand.name || "(unnamed)").slice(0, 44)}`);
      console.log(`      colour ${brand.colour}  logo ${brand.logoDataUri ? "yes" : "initials"}  data: ${brand.source}`);
      if (brand.strapline) console.log(`      "${brand.strapline.slice(0, 70)}${brand.strapline.length > 70 ? "…" : ""}"`);

      for (const slot of SLOTS) {
        const existing = APPLY
          ? await client.query(
              `SELECT id, asset_attachment FROM find_event_lobby_layout_type_assets
                WHERE exhibition_stand_id = $1 AND event_id = $2 AND title = $3 LIMIT 1`,
              [exhibitor.id, eventId, slot.key]
            )
          : { rows: [] as { id: number; asset_attachment: string }[] };

        const already = existing.rows[0];
        if (already && String(already.asset_attachment || "").trim() && !FORCE) {
          skipped += 1;
          console.log(`      · ${slot.key.padEnd(20)} already has artwork — left alone`);
          continue;
        }

        const png: Buffer = await sharp(Buffer.from(svgFor(slot, brand)))
          .png({ compressionLevel: 9 })
          .toBuffer();

        if (!APPLY) {
          // Dry run still writes the images, under a preview name, so the template can be judged
          // before a single database row is touched.
          const previewDir = path.join(ROOT, "reports", "stand-artwork-preview");
          fs.mkdirSync(previewDir, { recursive: true });
          const previewFile = path.join(previewDir, `ex${exhibitor.id}_${slot.key}.png`);
          fs.writeFileSync(previewFile, png);
          generated += 1;
          console.log(`      + ${slot.key.padEnd(20)} ${slot.width}x${slot.height}  -> ${path.relative(ROOT, previewFile)}`);
          continue;
        }

        let assetId: number = already?.id ?? 0;
        if (!assetId) {
          const { rows } = await client.query(
            `INSERT INTO find_event_lobby_layout_type_assets
               (title, exhibition_stand_id, event_id, asset_type, asset_attachment, extension,
                agenda_id, layout_type_setup_id, is_exhibitor_asset, version)
             VALUES ($1, $2, $3, 'template_slot', '', '', 0, 0, true, 0)
             RETURNING id`,
            [slot.key, exhibitor.id, eventId]
          );
          assetId = rows[0].id;
        }

        // Same filename shape and same one-file-per-slot rule as the Manage Stand Assets screen.
        const filename = `event_${assetId}_${slot.key}_${Date.now()}.png`;
        fs.writeFileSync(path.join(UPLOAD_DIR, filename), png);

        await client.query(`DELETE FROM find_event_lobby_asset_gallery WHERE parent_asset_id = $1`, [assetId]);
        await client.query(
          `INSERT INTO find_event_lobby_asset_gallery (parent_asset_id, asset_url) VALUES ($1, $2)`,
          [assetId, filename]
        );
        await client.query(
          `UPDATE find_event_lobby_layout_type_assets
              SET asset_attachment = $1, extension = 'png', version = version + 1
            WHERE id = $2`,
          [filename, assetId]
        );

        generated += 1;
        console.log(`      + ${slot.key.padEnd(20)} ${slot.width}x${slot.height}  -> ${filename}`);
      }

      if (APPLY) {
        await client.query(
          `UPDATE find_event_exhibitor SET stand_version = COALESCE(stand_version, 0) + 1 WHERE id = $1`,
          [exhibitor.id]
        );
      }
    }

    console.log(`\n  images generated         : ${generated}`);
    console.log(`  slots left alone         : ${skipped}`);
    if (!APPLY) {
      console.log(`\n  Previews are in reports/stand-artwork-preview/ — open a few, then re-run with --apply.\n`);
    } else {
      console.log(`\n  Published. Open Manage Stand Assets for one of these exhibitors to see them in place.\n`);
    }
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
    console.error(`No active event is set. Pass --event=<id>.`);
    process.exit(1);
  }
  return value;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
