/**
 * ===========================================================================
 *  ONE-TIME EXTERNAL IMAGE MIGRATION
 * ===========================================================================
 *
 *  Mirrors every externally-hosted image/video referenced by this project — in
 *  source code AND in Postgres — into `public/images/external/**`, so the
 *  deployed site never depends on digitalageexpo.com / apps.digitalageexpo.com
 *  / findusonweb.com / tradeshowslocal.com again.
 *
 *  RUN THIS ON A MACHINE WITH INTERNET ACCESS TO THE LEGACY HOSTS.
 *
 *  ---------------------------------------------------------------------
 *  USAGE
 *  ---------------------------------------------------------------------
 *    npx tsx scripts/download-external-images.ts audit
 *    npx tsx scripts/download-external-images.ts download [--insecure]
 *    npx tsx scripts/download-external-images.ts verify
 *    npx tsx scripts/download-external-images.ts update-db --confirm
 *    npx tsx scripts/download-external-images.ts all --insecure
 *
 *  COMMANDS
 *    audit       (default) Scan source + database, write reports. Changes NOTHING.
 *    download    Audit, then download every missing asset. Writes files + manifest
 *                + src/lib/asset-overrides.generated.ts. Does NOT touch the DB.
 *    verify      Re-validate every file already present in public/images/external.
 *    update-db   Rewrite DB columns that store an ABSOLUTE legacy URL into the
 *                local path. Requires --confirm. Writes a full JSON backup of
 *                every affected row first. Only touches rows whose image was
 *                downloaded AND verified.
 *    all         audit -> download -> verify (still never touches the DB).
 *
 *  FLAGS
 *    --insecure        Allow invalid/expired TLS certificates. See SSL note below.
 *    --concurrency=N   Parallel downloads (default 6).
 *    --timeout=MS      Per-request timeout (default 30000).
 *    --retries=N       Retries per URL for transient failures (default 3).
 *    --max-bytes=N     Skip assets larger than this (default 52428800 = 50MB).
 *    --skip-video      Do not mirror .mp4/.webm/.mov/.ogv/.m4v.
 *    --full-scan       Scan EVERY text column in the DB, not just image-named ones.
 *    --no-db           Skip the database entirely (source-code scan only).
 *    --force           Re-download even when a valid local file already exists.
 *    --confirm         Required by `update-db`. Without it, update-db is a dry run.
 *    --quiet           Less console noise.
 *
 *  ---------------------------------------------------------------------
 *  !! SSL / CERTIFICATE NOTE — READ BEFORE USING --insecure !!
 *  ---------------------------------------------------------------------
 *  The legacy Digital Age Expo hosts have intermittently served an expired or
 *  mismatched certificate. `--insecure` sets `rejectUnauthorized: false` for
 *  the HTTPS requests made BY THIS SCRIPT ONLY, and ONLY for hosts in
 *  LEGACY_MEDIA_HOSTS (src/lib/asset-map.ts). Any other host is always
 *  validated normally, even with the flag on.
 *
 *  This is acceptable because it is a one-time, operator-initiated migration
 *  against project-owned legacy servers, and every downloaded byte is
 *  independently validated afterwards (magic-byte sniffing, not just
 *  Content-Type).
 *
 *  It is NOT acceptable anywhere else. This script does not, and must not,
 *  set NODE_TLS_REJECT_UNAUTHORIZED, and nothing in next.config.ts, the app's
 *  fetch/axios calls, or any runtime code disables certificate validation.
 *
 *  ---------------------------------------------------------------------
 *  OUTPUTS
 *  ---------------------------------------------------------------------
 *    reports/image-audit.json            full audit: every reference found
 *    reports/image-audit.csv             the same, spreadsheet-friendly
 *    reports/image-manifest.json         sourceUrl -> localPath -> status
 *    reports/failed-image-downloads.json failures with url/error/table/id/field
 *    reports/db-backup-<ts>.json         written by update-db BEFORE any write
 *    src/lib/asset-overrides.generated.ts  duplicate -> existing-local-file map
 */

import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import * as https from "node:https";
import * as http from "node:http";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import {
  EXTERNAL_ROOT,
  LEGACY_FALLBACK_ORIGINS,
  LEGACY_ORIGIN,
  decodeAssetPath,
  isLegacyMediaHost,
  isVideoPath,
  localPathToLegacyRemotePath,
  looksLikeMedia,
  originForLocalPath,
  parseAbsoluteUrl,
  resolveAsset,
} from "../src/lib/asset-map";

// ---------------------------------------------------------------------------
// Paths & CLI
// ---------------------------------------------------------------------------

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const PUBLIC_DIR = path.join(ROOT, "public");
const REPORTS_DIR = path.join(ROOT, "reports");
const OVERRIDES_FILE = path.join(ROOT, "src", "lib", "asset-overrides.generated.ts");

type Command = "audit" | "download" | "verify" | "update-db" | "all";

const rawArgs = process.argv.slice(2);
const positional = rawArgs.filter((a) => !a.startsWith("--"));
const flags = new Map<string, string>();
for (const a of rawArgs.filter((x) => x.startsWith("--"))) {
  const [k, v] = a.replace(/^--/, "").split("=");
  flags.set(k, v ?? "true");
}

const COMMAND = (positional[0] ?? "audit") as Command;
const OPT = {
  insecure: flags.get("insecure") === "true",
  concurrency: Number(flags.get("concurrency") ?? 6),
  timeout: Number(flags.get("timeout") ?? 30_000),
  retries: Number(flags.get("retries") ?? 3),
  maxBytes: Number(flags.get("max-bytes") ?? 52_428_800),
  skipVideo: flags.get("skip-video") === "true",
  fullScan: flags.get("full-scan") === "true",
  noDb: flags.get("no-db") === "true",
  /**
   * `--tables=a,b,c` — restrict the DATABASE scan to these tables.
   *
   * The default hint-based scan covers 163 columns and surfaces ~13,000 assets across the whole
   * legacy media library: speaker portraits and sponsor logos that the public site renders, but
   * also 120 magazine rate cards, 331 sponsorship-category icons and a long tail of things nothing
   * reads. Mirroring all of it is gigabytes committed to git for no benefit.
   *
   * This narrows the scan to the tables whose media actually reaches a page, so the mirror stays
   * proportionate. Source-code references are unaffected — those are always scanned.
   */
  tables: new Set(
    String(flags.get("tables") ?? "")
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean),
  ),
  force: flags.get("force") === "true",
  confirm: flags.get("confirm") === "true",
  quiet: flags.get("quiet") === "true",
};

const log = (...a: unknown[]) => { if (!OPT.quiet) console.log(...a); };
const warn = (...a: unknown[]) => console.warn(...a);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Reference {
  /** Exactly what was found, verbatim. */
  rawValue: string;
  /** Absolute URL we will request (built from rawValue). */
  sourceUrl: string;
  /** Where it will live under public/ (URL form, may be percent-encoded). */
  localPath: string;
  /** "code" | "db" */
  origin: "code" | "db";
  /** code refs */
  file?: string;
  line?: number;
  /** db refs */
  table?: string;
  column?: string;
  recordId?: string | number | null;
  /** true when rawValue is a full http(s) URL (=> a candidate for update-db) */
  isAbsolute: boolean;
  isVideo: boolean;
}

interface ManifestEntry {
  sourceUrl: string;
  localPath: string | null;
  status: "downloaded" | "already-local" | "mapped-existing" | "skipped" | "failed";
  source: string;
  bytes?: number;
  sha256?: string;
  contentType?: string;
  mappedTo?: string;
  error?: string;
  references: number;
}

interface FailureEntry {
  sourceUrl: string;
  error: string;
  table: string | null;
  recordId: string | number | null;
  field: string | null;
  file: string | null;
  line: number | null;
  attemptedUrls: string[];
}

// ---------------------------------------------------------------------------
// 1. SOURCE CODE SCAN
// ---------------------------------------------------------------------------

const SCAN_DIRS = ["src", "scripts", "prisma", "public", "app", "lib", "components"];
const SCAN_EXTS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".mts",
  ".json", ".css", ".scss", ".md", ".html", ".prisma", ".txt", ".env.example",
]);
const IGNORE_DIRS = new Set([
  "node_modules", ".next", ".git", ".vercel", "dist", "build", "out", "coverage",
  "generated", "reports",
]);

/**
 * Matches an absolute legacy-host URL that ends in a media extension.
 *
 * The path part is `[^"'\`]*?` (non-greedy, quote-delimited) rather than the
 * more obvious `[^"'\`)\s]*` because real legacy filenames contain BOTH spaces
 * and parentheses, e.g.
 *   .../817601-27972070586_73eb8ef975_o (1).jpg
 *   .../Digital Age Expo Intro.mp4
 * Anchoring on the extension instead of on a terminator is what lets those
 * match without swallowing the rest of the line — non-greedy stops at the FIRST
 * media extension after the host.
 */
const LEGACY_URL_RE =
  /https?:\/\/(?:[a-z0-9-]+\.)*(?:digitalageexpo|tradeshowslocal|findusonweb)\.com\/[^"'`]*?\.(?:png|jpe?g|webp|gif|svg|ico|avif|bmp|tiff?|mp4|webm|ogv|mov|m4v)(?:\?[^\s"'`)]*)?/gi;

async function walk(dir: string, out: string[] = []): Promise<string[]> {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (e.isDirectory()) {
      if (IGNORE_DIRS.has(e.name)) continue;
      await walk(path.join(dir, e.name), out);
    } else if (SCAN_EXTS.has(path.extname(e.name))) {
      out.push(path.join(dir, e.name));
    }
  }
  return out;
}

async function scanSourceCode(): Promise<Reference[]> {
  const refs: Reference[] = [];
  const files: string[] = [];
  for (const d of SCAN_DIRS) {
    const abs = path.join(ROOT, d);
    try {
      if ((await fs.stat(abs)).isDirectory()) await walk(abs, files);
    } catch { /* dir doesn't exist — fine */ }
  }
  for (const f of ["next.config.ts", "next.config.js", "next.config.mjs"]) {
    const abs = path.join(ROOT, f);
    try { await fs.access(abs); files.push(abs); } catch { /* not present */ }
  }

  for (const file of files) {
    // Never let the migration script rewrite/report itself or the map it imports.
    if (file.endsWith(path.join("scripts", "download-external-images.ts"))) continue;
    if (file.endsWith(path.join("src", "lib", "asset-map.ts"))) continue;

    let text: string;
    try { text = await fs.readFile(file, "utf8"); } catch { continue; }
    if (!/digitalageexpo|tradeshowslocal|findusonweb/i.test(text)) continue;

    const lines = text.split(/\r?\n/);
    lines.forEach((lineText, i) => {
      const matches = lineText.match(LEGACY_URL_RE);
      if (!matches) return;
      for (const rawMatch of matches) {
        const url = rawMatch;
        if (!looksLikeMedia(url)) continue; // website/social/API links are left alone
        const resolved = resolveAsset(url);
        if (resolved.kind !== "mirrored" || !resolved.canonicalPath) continue;
        refs.push({
          rawValue: url,
          sourceUrl: url,
          localPath: resolved.canonicalPath,
          origin: "code",
          file: path.relative(ROOT, file).replace(/\\/g, "/"),
          line: i + 1,
          isAbsolute: true,
          isVideo: isVideoPath(url),
        });
      }
    });
  }
  return refs;
}

// ---------------------------------------------------------------------------
// 2. DATABASE SCAN
// ---------------------------------------------------------------------------

const IMAGE_COLUMN_HINTS = [
  "image", "img", "logo", "banner", "photo", "picture", "pic", "thumb", "thumbnail",
  "gallery", "media", "file", "filename", "icon", "avatar", "artwork", "background",
  "splash", "cover", "poster", "attachment", "upload", "asset", "video", "ratecard",
  "prospectus", "creative",
];

/** Postgres regex: value looks like a media filename or contains a legacy host. */
const DB_VALUE_FILTER = `(
     $COL$ ~* '\\.(png|jpe?g|webp|gif|svg|ico|avif|bmp|tiff?|mp4|webm|ogv|mov|m4v)([?#]|$)'
  OR $COL$ ~* '(digitalageexpo|tradeshowslocal|findusonweb)\\.com'
)`;

function loadEnv() {
  // dotenv is already a devDependency of this project.
  try {
    const dotenv = require("dotenv");
    dotenv.config({ path: path.join(ROOT, ".env") });
    dotenv.config({ path: path.join(ROOT, ".env.local"), override: false });
  } catch {
    warn("! dotenv not available — relying on the ambient environment for DATABASE_URL");
  }
}

async function scanDatabase(): Promise<{ refs: Reference[]; scannedColumns: number; error?: string }> {
  loadEnv();
  const connectionString =
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL;

  if (!connectionString) {
    return { refs: [], scannedColumns: 0, error: "No DATABASE_URL / POSTGRES_URL found in .env" };
  }

  const { Client } = require("pg");
  const client = new Client({
    connectionString,
    statement_timeout: 120_000,
    // Fail fast instead of hanging for minutes when the DB is unreachable.
    connectionTimeoutMillis: 20_000,
  });
  await client.connect();

  const refs: Reference[] = [];
  let scannedColumns = 0;

  try {
    const { rows: columns } = await client.query(`
      SELECT c.table_name, c.column_name, c.data_type
      FROM information_schema.columns c
      JOIN information_schema.tables t
        ON t.table_schema = c.table_schema AND t.table_name = c.table_name
      WHERE c.table_schema = 'public'
        AND t.table_type = 'BASE TABLE'
        AND c.data_type IN ('character varying','text','character')
      ORDER BY c.table_name, c.ordinal_position
    `);

    // Primary key per table, so the audit can name an actual record id.
    const { rows: pkRows } = await client.query(`
      SELECT tc.table_name, kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON kcu.constraint_name = tc.constraint_name
       AND kcu.table_schema = tc.table_schema
      WHERE tc.table_schema = 'public' AND tc.constraint_type = 'PRIMARY KEY'
      ORDER BY kcu.ordinal_position
    `);
    const pkByTable = new Map<string, string>();
    for (const r of pkRows) if (!pkByTable.has(r.table_name)) pkByTable.set(r.table_name, r.column_name);

    const candidates = columns.filter(
      (c: any) =>
        (OPT.fullScan || IMAGE_COLUMN_HINTS.some((h) => c.column_name.toLowerCase().includes(h))) &&
        (OPT.tables.size === 0 || OPT.tables.has(String(c.table_name).toLowerCase())),
    );

    log(
      `  scanning ${candidates.length} candidate column(s) across ${new Set(candidates.map((c: any) => c.table_name)).size} table(s)` +
        `${OPT.fullScan ? " [FULL SCAN]" : ""}${OPT.tables.size ? ` [tables: ${[...OPT.tables].join(", ")}]` : ""}`,
    );

    for (const col of candidates) {
      const table = col.table_name as string;
      const column = col.column_name as string;
      const pk = pkByTable.get(table);
      const idSelect = pk ? `"${pk}"::text AS __id` : `ctid::text AS __id`;
      const filter = DB_VALUE_FILTER.replace(/\$COL\$/g, `"${column}"`);

      let rows: any[];
      try {
        const res = await client.query(
          `SELECT ${idSelect}, "${column}"::text AS __value
             FROM "${table}"
            WHERE "${column}" IS NOT NULL AND "${column}" <> '' AND ${filter}
            LIMIT 50000`,
        );
        rows = res.rows;
      } catch (e: any) {
        warn(`  ! skipped ${table}.${column}: ${e.message}`);
        continue;
      }
      scannedColumns++;
      if (rows.length === 0) continue;

      for (const row of rows) {
        const value = String(row.__value).trim();
        if (!value) continue;
        const resolved = resolveAsset(value);
        if (resolved.kind !== "mirrored" || !resolved.canonicalPath) continue;

        const absolute = parseAbsoluteUrl(value);
        const isAbsolute = !!absolute && isLegacyMediaHost(absolute.hostname);
        const sourceUrl = isAbsolute
          ? value
          : `${LEGACY_ORIGIN}/${value.replace(/^\/+/, "")}`;

        refs.push({
          rawValue: value,
          sourceUrl,
          localPath: resolved.canonicalPath,
          origin: "db",
          table,
          column,
          recordId: row.__id ?? null,
          isAbsolute,
          isVideo: isVideoPath(value),
        });
      }
      log(`    ${table}.${column}: ${rows.length} row(s) with media values`);
    }
  } finally {
    await client.end();
  }

  return { refs, scannedColumns };
}

// ---------------------------------------------------------------------------
// 3. DOWNLOAD
// ---------------------------------------------------------------------------

interface FetchResult {
  ok: boolean;
  status?: number;
  contentType?: string;
  body?: Buffer;
  error?: string;
  url: string;
}

function fetchOnce(url: string, redirectsLeft = 5): Promise<FetchResult> {
  return new Promise((resolve) => {
    let parsed: URL;
    try {
      parsed = new URL(url.replace(/ /g, "%20"));
    } catch (e: any) {
      return resolve({ ok: false, error: `Invalid URL: ${e.message}`, url });
    }

    const isHttps = parsed.protocol === "https:";
    const transport = isHttps ? https : http;

    // --insecure applies to legacy project-owned hosts ONLY, never to anything else.
    const allowInsecure = OPT.insecure && isLegacyMediaHost(parsed.hostname);

    const req = transport.request(
      {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port || (isHttps ? 443 : 80),
        path: parsed.pathname + parsed.search,
        method: "GET",
        timeout: OPT.timeout,
        headers: {
          // Some legacy PHP hosts 403 an unknown agent.
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
          Accept: "image/avif,image/webp,image/apng,image/*,video/*,*/*;q=0.8",
          Referer: `${LEGACY_ORIGIN}/`,
        },
        ...(isHttps ? { rejectUnauthorized: !allowInsecure } : {}),
      },
      (res) => {
        const status = res.statusCode ?? 0;

        if (status >= 300 && status < 400 && res.headers.location && redirectsLeft > 0) {
          res.resume();
          const next = new URL(res.headers.location, parsed).toString();
          return resolve(fetchOnce(next, redirectsLeft - 1));
        }

        if (status !== 200) {
          res.resume();
          return resolve({ ok: false, status, error: `HTTP ${status}`, url });
        }

        const declared = Number(res.headers["content-length"] ?? 0);
        if (declared && declared > OPT.maxBytes) {
          res.destroy();
          return resolve({
            ok: false,
            status,
            error: `Too large (${declared} bytes > --max-bytes ${OPT.maxBytes})`,
            url,
          });
        }

        const chunks: Buffer[] = [];
        let total = 0;
        res.on("data", (c: Buffer) => {
          total += c.length;
          if (total > OPT.maxBytes) {
            res.destroy();
            return resolve({ ok: false, status, error: `Too large (> ${OPT.maxBytes} bytes)`, url });
          }
          chunks.push(c);
        });
        res.on("end", () =>
          resolve({
            ok: true,
            status,
            contentType: String(res.headers["content-type"] ?? ""),
            body: Buffer.concat(chunks),
            url,
          }),
        );
        res.on("error", (e) => resolve({ ok: false, status, error: e.message, url }));
      },
    );

    req.on("timeout", () => { req.destroy(); resolve({ ok: false, error: `Timeout after ${OPT.timeout}ms`, url }); });
    req.on("error", (e: any) => resolve({ ok: false, error: `${e.code ?? ""} ${e.message}`.trim(), url }));
    req.end();
  });
}

const TRANSIENT = /ETIMEDOUT|ECONNRESET|ECONNREFUSED|EAI_AGAIN|ENOTFOUND|socket hang up|Timeout|HTTP 5\d\d|HTTP 429/i;

async function fetchWithRetry(url: string): Promise<FetchResult> {
  let last: FetchResult = { ok: false, error: "not attempted", url };
  for (let attempt = 1; attempt <= Math.max(1, OPT.retries); attempt++) {
    last = await fetchOnce(url);
    if (last.ok) return last;
    if (!TRANSIENT.test(last.error ?? "")) return last; // 404 / cert error: no point retrying
    if (attempt < OPT.retries) await sleep(400 * attempt * attempt);
  }
  return last;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// 4. VALIDATION — never trust Content-Type alone
// ---------------------------------------------------------------------------

type SniffResult = { ok: true; format: string; ext: string } | { ok: false; reason: string };

function sniff(buf: Buffer): SniffResult {
  if (buf.length === 0) return { ok: false, reason: "Empty file (0 bytes)" };
  const b = (i: number) => buf[i];
  const startsWith = (sig: number[], off = 0) => sig.every((v, i) => b(off + i) === v);
  const ascii = (n: number, off = 0) => buf.slice(off, off + n).toString("latin1");

  if (startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { ok: true, format: "png", ext: ".png" };
  if (startsWith([0xff, 0xd8, 0xff])) return { ok: true, format: "jpeg", ext: ".jpg" };
  if (ascii(6) === "GIF87a" || ascii(6) === "GIF89a") return { ok: true, format: "gif", ext: ".gif" };
  if (ascii(4) === "RIFF" && ascii(4, 8) === "WEBP") return { ok: true, format: "webp", ext: ".webp" };
  if (startsWith([0x42, 0x4d])) return { ok: true, format: "bmp", ext: ".bmp" };
  if (startsWith([0x00, 0x00, 0x01, 0x00])) return { ok: true, format: "ico", ext: ".ico" };
  if (startsWith([0x49, 0x49, 0x2a, 0x00]) || startsWith([0x4d, 0x4d, 0x00, 0x2a]))
    return { ok: true, format: "tiff", ext: ".tiff" };
  if (ascii(12, 4) === "ftypavif" || ascii(8, 8) === "avifmif1") return { ok: true, format: "avif", ext: ".avif" };
  if (ascii(4, 4) === "ftyp") return { ok: true, format: "mp4", ext: ".mp4" };
  if (startsWith([0x1a, 0x45, 0xdf, 0xa3])) return { ok: true, format: "webm", ext: ".webm" };

  const head = buf.slice(0, 1024).toString("utf8").trim().toLowerCase();
  if (head.startsWith("<?xml") || head.startsWith("<svg")) {
    return head.includes("<svg")
      ? { ok: true, format: "svg", ext: ".svg" }
      : { ok: false, reason: "XML but not SVG" };
  }
  if (head.startsWith("<!doctype html") || head.startsWith("<html") || head.includes("<body")) {
    return { ok: false, reason: "Server returned an HTML page, not an image" };
  }
  if (head.startsWith("{") || head.startsWith("[")) return { ok: false, reason: "Server returned JSON, not an image" };

  return { ok: false, reason: `Unrecognised file signature (${buf.slice(0, 8).toString("hex")})` };
}

const sha256 = (buf: Buffer) => createHash("sha256").update(buf).digest("hex");

// ---------------------------------------------------------------------------
// 5. EXISTING LOCAL FILES (dedupe target)
// ---------------------------------------------------------------------------

/** Every file already in public/images, indexed by SHA-256, EXCLUDING the mirror. */
async function indexExistingPublicImages(): Promise<Map<string, string>> {
  const byHash = new Map<string, string>();
  const mirrorAbs = path.join(PUBLIC_DIR, EXTERNAL_ROOT.replace(/^\//, ""));

  async function walkPublic(dir: string) {
    let entries;
    try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const abs = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (path.resolve(abs) === path.resolve(mirrorAbs)) continue; // don't dedupe against ourselves
        await walkPublic(abs);
      } else {
        try {
          const buf = await fs.readFile(abs);
          if (buf.length === 0) continue;
          const url = "/" + path.relative(PUBLIC_DIR, abs).split(path.sep).join("/");
          const h = sha256(buf);
          if (!byHash.has(h)) byHash.set(h, url);
        } catch { /* unreadable — ignore */ }
      }
    }
  }

  await walkPublic(path.join(PUBLIC_DIR, "images"));
  return byHash;
}

// ---------------------------------------------------------------------------
// 6. REPORT HELPERS
// ---------------------------------------------------------------------------

async function writeJson(file: string, data: unknown) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(data, null, 2) + "\n", "utf8");
}

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

async function writeAuditCsv(refs: Reference[]) {
  const header = [
    "external_image_url", "origin", "table", "column", "record_id",
    "file", "line", "current_value", "suggested_local_path", "is_absolute_url", "is_video",
  ];
  const lines = [header.join(",")];
  for (const r of refs) {
    lines.push([
      r.sourceUrl, r.origin, r.table ?? "", r.column ?? "", r.recordId ?? "",
      r.file ?? "", r.line ?? "", r.rawValue, r.localPath, r.isAbsolute, r.isVideo,
    ].map(csvCell).join(","));
  }
  await fs.mkdir(REPORTS_DIR, { recursive: true });
  await fs.writeFile(path.join(REPORTS_DIR, "image-audit.csv"), lines.join("\n") + "\n", "utf8");
}

/** Group references by the local path they all resolve to. */
function groupByLocalPath(refs: Reference[]) {
  const groups = new Map<string, Reference[]>();
  for (const r of refs) {
    const list = groups.get(r.localPath);
    if (list) list.push(r); else groups.set(r.localPath, [r]);
  }
  return groups;
}

/**
 * Which legacy upload folder a bare filename belongs to, per source column.
 *
 * On the legacy host, uploads are filed by WHAT they are, not in one flat root:
 * `files/speaker/153.jpg`, `files/exhibitor_profile_images/…`, `files/listing_pages/…`.
 * The database stores only the bare filename (`153.jpg`), so the filename alone is
 * ambiguous - the same `153.jpg` could be a speaker portrait or an exhibitor logo.
 * The column it came from is what disambiguates it.
 *
 * This is why every speaker portrait failed before: the only paths tried were the
 * site root and `files/`, and neither exists, so Cloudflare answered 525 rather
 * than 404 and it read like an origin outage. `files/speaker/153.jpg` returns a
 * perfectly good 9KB JPEG.
 *
 * Verified against the live site: view_speaker requests
 * `https://digitalageexpo.com/files/speaker/<file>` for every portrait it renders.
 */
const LEGACY_UPLOAD_DIRS: Record<string, string> = {
  // Both verified against the live host with real filenames:
  //   /files/speaker/211.jpg        -> 200 image/jpeg
  //   /files/speaker_social/498.png -> 200 image/png
  // The two columns do NOT share a folder - a social avatar asked for under
  // `speaker/` returns 404, which is how the second batch was missed first time.
  "find_speakers.profile_pic": "speaker",
  "find_speakers.social_media_pic": "speaker_social",

  // Unverified - no filename from this table has been tested. Harmless if wrong:
  // it is one extra candidate and the generic paths are still tried afterwards.
  "find_speakers_questions.profile_pic": "speaker",
};

/** Candidate remote URLs for a group, most-likely first, deduplicated. */
function candidateUrls(localPath: string, refs: Reference[]): string[] {
  const urls: string[] = [];
  const push = (u: string) => { if (u && !urls.includes(u)) urls.push(u); };

  for (const r of refs) if (r.isAbsolute) push(r.sourceUrl);
  for (const r of refs) if (!r.isAbsolute) push(r.sourceUrl);

  /*
   * Column-specific upload folders FIRST - when we know the folder, that URL is the
   * one that works, and trying it first means the generic guesses below are never
   * requested. That is the difference between one fast request per portrait and five
   * slow ones that all time out.
   */
  for (const r of refs) {
    if (r.isAbsolute || !r.table || !r.column) continue;
    const dir = LEGACY_UPLOAD_DIRS[`${r.table.toLowerCase()}.${r.column.toLowerCase()}`];
    if (!dir) continue;
    const file = r.rawValue.replace(/^\/+/, "").split("/").pop();
    if (!file) continue;
    push(`${LEGACY_ORIGIN}/files/${dir}/${file}`);
    for (const origin of LEGACY_FALLBACK_ORIGINS) push(`${origin}/files/${dir}/${file}`);
  }

  const remotePath = localPathToLegacyRemotePath(localPath);
  if (remotePath) {
    push(originForLocalPath(localPath) + remotePath);
    for (const origin of LEGACY_FALLBACK_ORIGINS) push(origin + remotePath);
  }
  return urls;
}

async function runPool<T>(items: T[], size: number, worker: (item: T, i: number) => Promise<void>) {
  let cursor = 0;
  const runners = Array.from({ length: Math.max(1, size) }, async () => {
    for (;;) {
      const i = cursor++;
      if (i >= items.length) return;
      await worker(items[i], i);
    }
  });
  await Promise.all(runners);
}

// ---------------------------------------------------------------------------
// 7. COMMANDS
// ---------------------------------------------------------------------------

async function collectReferences() {
  log("\n[1/4] Scanning source code…");
  const codeRefs = await scanSourceCode();
  log(`      ${codeRefs.length} external media reference(s) in source files`);

  let dbRefs: Reference[] = [];
  let dbError: string | undefined;
  if (OPT.noDb) {
    log("\n[2/4] Database scan skipped (--no-db)");
  } else {
    log("\n[2/4] Scanning database…");
    try {
      const res = await scanDatabase();
      dbRefs = res.refs;
      dbError = res.error;
      if (res.error) warn(`      ! ${res.error}`);
      log(`      ${dbRefs.length} media value(s) across ${res.scannedColumns} column(s)`);
    } catch (e: any) {
      dbError = e.message;
      warn(`      ! Database scan failed: ${e.message}`);
    }
  }

  const refs = [...codeRefs, ...dbRefs];
  const groups = groupByLocalPath(refs);

  await writeJson(path.join(REPORTS_DIR, "image-audit.json"), {
    generatedAt: new Date().toISOString(),
    options: OPT,
    dbError: dbError ?? null,
    totals: {
      references: refs.length,
      fromCode: codeRefs.length,
      fromDatabase: dbRefs.length,
      uniqueAssets: groups.size,
      videos: [...groups.values()].filter((g) => g[0].isVideo).length,
    },
    references: refs,
  });
  await writeAuditCsv(refs);

  log(`\n      -> reports/image-audit.json`);
  log(`      -> reports/image-audit.csv`);
  log(`      ${groups.size} unique asset(s) to mirror`);

  return { refs, groups, dbError };
}

async function commandDownload(groups: Map<string, Reference[]>) {
  log("\n[3/4] Downloading…");
  const existing = await indexExistingPublicImages();
  log(`      ${existing.size} existing local image(s) indexed for de-duplication`);

  const manifest: ManifestEntry[] = [];
  const failures: FailureEntry[] = [];
  const overrides: Record<string, string> = {};

  const entries = [...groups.entries()];

  await runPool(entries, OPT.concurrency, async ([localPath, refs]) => {
    const first = refs[0];

    if (first.isVideo && OPT.skipVideo) {
      manifest.push({
        sourceUrl: first.sourceUrl, localPath: null, status: "skipped",
        source: hostOf(first.sourceUrl), error: "video skipped (--skip-video)",
        references: refs.length,
      });
      return;
    }

    const diskPath = path.join(PUBLIC_DIR, decodeAssetPath(localPath).replace(/^\//, ""));

    // Never overwrite an already-valid local file.
    if (!OPT.force) {
      try {
        const buf = await fs.readFile(diskPath);
        const s = sniff(buf);
        if (s.ok && buf.length > 0) {
          manifest.push({
            sourceUrl: first.sourceUrl, localPath, status: "already-local",
            source: hostOf(first.sourceUrl), bytes: buf.length, sha256: sha256(buf),
            references: refs.length,
          });
          return;
        }
      } catch { /* not present yet */ }
    }

    const urls = candidateUrls(localPath, refs);
    let result: FetchResult | null = null;
    const errors: string[] = [];

    for (const url of urls) {
      const res = await fetchWithRetry(url);
      if (!res.ok) { errors.push(`${url} -> ${res.error}`); continue; }
      const s = sniff(res.body!);
      if (!s.ok) { errors.push(`${url} -> ${s.reason} (Content-Type: ${res.contentType})`); continue; }
      result = res;
      break;
    }

    if (!result) {
      const f = refs.find((r) => r.origin === "db") ?? first;
      failures.push({
        sourceUrl: first.sourceUrl,
        error: errors[errors.length - 1] ?? "no candidate URL succeeded",
        table: f.table ?? null,
        recordId: f.recordId ?? null,
        field: f.column ?? null,
        file: f.file ?? null,
        line: f.line ?? null,
        attemptedUrls: urls,
      });
      manifest.push({
        sourceUrl: first.sourceUrl, localPath: null, status: "failed",
        source: hostOf(first.sourceUrl), error: errors.join(" | "), references: refs.length,
      });
      warn(`      x ${localPath}`);
      return;
    }

    const buf = result.body!;
    const hash = sha256(buf);

    // Item 8: reuse an image the project already ships, if byte-identical.
    const already = existing.get(hash);
    if (already) {
      overrides[decodeAssetPath(localPath)] = already;
      manifest.push({
        sourceUrl: result.url, localPath: already, status: "mapped-existing",
        source: hostOf(result.url), bytes: buf.length, sha256: hash,
        contentType: result.contentType, mappedTo: already, references: refs.length,
      });
      log(`      = ${localPath}  ->  ${already} (identical, not duplicated)`);
      return;
    }

    await fs.mkdir(path.dirname(diskPath), { recursive: true });
    await fs.writeFile(diskPath, buf);
    existing.set(hash, localPath);
    manifest.push({
      sourceUrl: result.url, localPath, status: "downloaded",
      source: hostOf(result.url), bytes: buf.length, sha256: hash,
      contentType: result.contentType, references: refs.length,
    });
    log(`      + ${localPath} (${(buf.length / 1024).toFixed(1)} KB)`);
  });

  manifest.sort((a, b) => (a.localPath ?? a.sourceUrl).localeCompare(b.localPath ?? b.sourceUrl));
  await writeJson(path.join(REPORTS_DIR, "image-manifest.json"), manifest);
  await writeJson(path.join(REPORTS_DIR, "failed-image-downloads.json"), failures);
  await writeOverrides(overrides);

  return { manifest, failures, overrides };
}

function hostOf(url: string): string {
  const p = parseAbsoluteUrl(url);
  return p ? p.hostname : "local";
}

/**
 * Read the mappings already committed in the generated file.
 *
 * Parsed with a regex rather than imported, deliberately: this script may be running precisely
 * because that file is stale or malformed, and an `import` of a broken module takes the whole
 * run down. A line that does not match is skipped rather than fatal.
 */
async function readExistingOverrides(): Promise<Record<string, string>> {
  try {
    const text = await fs.readFile(OVERRIDES_FILE, "utf8");
    const out: Record<string, string> = {};
    for (const m of text.matchAll(/^\s*"((?:[^"\\]|\\.)*)":\s*"((?:[^"\\]|\\.)*)",?\s*$/gm)) {
      try { out[JSON.parse(`"${m[1]}"`)] = JSON.parse(`"${m[2]}"`); } catch { /* skip */ }
    }
    return out;
  } catch {
    return {};
  }
}

/**
 * MERGES with what is already on disk. It used to overwrite.
 *
 * That was fine while the only documented invocation was a full run, but the moment anyone
 * narrows the scan — `--tables=find_speakers`, say — the map is rebuilt from that slice alone
 * and every mapping outside it is silently dropped. A scoped speaker download cut this file from
 * 27 mappings to 7, which un-resolved the sponsor logos, the charity logo, several event-feature
 * images and the intro video: assets that are NOT committed under their mirror path and exist
 * only because an override points them at a file the project already ships.
 *
 * Nothing in the output said so, because the run genuinely succeeded at what it was asked to do.
 * Merging makes a narrow run incapable of destroying work a wider one did.
 *
 * A freshly computed mapping still wins over a stored one for the same key, so a real change is
 * not blocked by history. `--force` drops the stored map entirely, for the rebuild-from-scratch
 * case.
 */
async function writeOverrides(overrides: Record<string, string>) {
  const stored = OPT.force ? {} : await readExistingOverrides();
  const merged = { ...stored, ...overrides };
  const kept = Object.keys(stored).filter((k) => !(k in overrides)).length;
  if (kept) log(`      (kept ${kept} existing mapping(s) outside this run's scope)`);
  overrides = merged;
  const keys = Object.keys(overrides).sort();
  const body = keys.length
    ? keys.map((k) => `  ${JSON.stringify(k)}: ${JSON.stringify(overrides[k])},`).join("\n")
    : "";
  const content = `/**
 * GENERATED FILE — do not edit by hand.
 *
 * Written by \`scripts/download-external-images.ts\` (phase: dedupe). Maps a
 * canonical mirror path produced by \`legacyPathToLocalPath()\` onto an image the
 * project ALREADY ships in \`public/\`, when the two turned out to be
 * byte-identical (same SHA-256). This is what keeps us from committing a second
 * copy of e.g. \`tillu_white.png\`.
 *
 * Regenerate with:
 *   npx tsx scripts/download-external-images.ts download
 *
 * An empty object is the correct state before the first run.
 */
export const ASSET_OVERRIDES: Record<string, string> = {${keys.length ? `\n${body}\n` : ""}};
`;
  await fs.writeFile(OVERRIDES_FILE, content, "utf8");
  log(`      -> src/lib/asset-overrides.generated.ts (${keys.length} mapping(s))`);
}

async function commandVerify(): Promise<{ ok: number; bad: string[] }> {
  log("\n[4/4] Verifying mirrored files…");
  const root = path.join(PUBLIC_DIR, EXTERNAL_ROOT.replace(/^\//, ""));
  const bad: string[] = [];
  let ok = 0;

  async function walkMirror(dir: string) {
    let entries;
    try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const abs = path.join(dir, e.name);
      if (e.isDirectory()) { await walkMirror(abs); continue; }
      const rel = "/" + path.relative(PUBLIC_DIR, abs).split(path.sep).join("/");
      try {
        const buf = await fs.readFile(abs);
        if (buf.length === 0) { bad.push(`${rel}: empty file`); continue; }
        const s = sniff(buf);
        if (!s.ok) { bad.push(`${rel}: ${s.reason}`); continue; }
        const declaredExt = path.extname(abs).toLowerCase();
        const compatible =
          declaredExt === s.ext ||
          (s.format === "jpeg" && [".jpg", ".jpeg"].includes(declaredExt)) ||
          (s.format === "tiff" && [".tif", ".tiff"].includes(declaredExt)) ||
          (s.format === "mp4" && [".mp4", ".m4v", ".mov"].includes(declaredExt));
        if (!compatible) bad.push(`${rel}: extension ${declaredExt} but content is ${s.format}`);
        else ok++;
      } catch (e: any) {
        bad.push(`${rel}: unreadable (${e.message})`);
      }
    }
  }

  await walkMirror(root);
  log(`      ${ok} valid, ${bad.length} problem(s)`);
  for (const b of bad) warn(`      ! ${b}`);
  return { ok, bad };
}

/**
 * Rewrites DB columns that store an ABSOLUTE legacy URL into the local path.
 *
 * Columns that store a bare filename are deliberately LEFT ALONE — the app
 * resolves those through assetUrl(), so the database stays the source of truth
 * and nothing has to be re-migrated if the mirror layout ever changes.
 */
async function commandUpdateDb(refs: Reference[], manifest: ManifestEntry[]) {
  const okByLocalPath = new Map<string, string>();
  for (const m of manifest) {
    if (m.status === "downloaded" || m.status === "already-local") okByLocalPath.set(m.localPath!, m.localPath!);
    if (m.status === "mapped-existing" && m.mappedTo) {
      // manifest.localPath already IS the existing file for mapped entries
      okByLocalPath.set(m.mappedTo, m.mappedTo);
    }
  }

  const candidates = refs.filter(
    (r) => r.origin === "db" && r.isAbsolute && r.table && r.column && r.recordId !== null,
  );

  // Only rows whose asset actually exists on disk now.
  const updatable: Reference[] = [];
  for (const r of candidates) {
    const target = resolveAsset(r.rawValue).url!; // post-override local path
    const disk = path.join(PUBLIC_DIR, decodeAssetPath(target).replace(/^\//, ""));
    try {
      const buf = await fs.readFile(disk);
      if (buf.length > 0 && sniff(buf).ok) updatable.push(r);
    } catch { /* not downloaded — skip, per spec */ }
  }

  log(`\n[db] ${candidates.length} row(s) store an absolute legacy URL`);
  log(`[db] ${updatable.length} of those have a verified local file and can be updated`);
  log(`[db] ${candidates.length - updatable.length} skipped (download failed or missing)`);

  if (updatable.length === 0) return { backupFile: null, updated: 0 };

  loadEnv();
  const connectionString =
    process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING ||
    process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!connectionString) throw new Error("No DATABASE_URL found");

  const { Client } = require("pg");
  const client = new Client({ connectionString });
  await client.connect();

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFile = path.join(REPORTS_DIR, `db-backup-${stamp}.json`);

  try {
    // ---- 1. BACKUP every affected row, in full, before touching anything ----
    const backup: any[] = [];
    for (const r of updatable) {
      try {
        const pkCol = await primaryKeyColumn(client, r.table!);
        const res = await client.query(
          `SELECT * FROM "${r.table}" WHERE ${pkCol ? `"${pkCol}"::text` : "ctid::text"} = $1`,
          [String(r.recordId)],
        );
        backup.push({
          table: r.table, column: r.column, recordId: r.recordId,
          oldValue: r.rawValue, newValue: resolveAsset(r.rawValue).url,
          row: res.rows[0] ?? null,
        });
      } catch (e: any) {
        backup.push({ table: r.table, column: r.column, recordId: r.recordId, oldValue: r.rawValue, backupError: e.message });
      }
    }
    await writeJson(backupFile, { generatedAt: new Date().toISOString(), rows: backup });
    log(`[db] backup written -> ${path.relative(ROOT, backupFile)}`);

    if (!OPT.confirm) {
      log("\n[db] DRY RUN — no rows were changed. Re-run with --confirm to apply.");
      for (const r of updatable.slice(0, 20)) {
        log(`     ${r.table}.${r.column} #${r.recordId}`);
        log(`       - ${r.rawValue}`);
        log(`       + ${resolveAsset(r.rawValue).url}`);
      }
      if (updatable.length > 20) log(`     … and ${updatable.length - 20} more (see reports/image-audit.csv)`);
      return { backupFile, updated: 0 };
    }

    // ---- 2. APPLY, one transaction, guarded on the old value ----
    let updated = 0;
    await client.query("BEGIN");
    for (const r of updatable) {
      const pkCol = await primaryKeyColumn(client, r.table!);
      const newValue = resolveAsset(r.rawValue).url!;
      const res = await client.query(
        `UPDATE "${r.table}" SET "${r.column}" = $1
          WHERE ${pkCol ? `"${pkCol}"::text` : "ctid::text"} = $2 AND "${r.column}" = $3`,
        [newValue, String(r.recordId), r.rawValue],
      );
      updated += res.rowCount ?? 0;
    }
    await client.query("COMMIT");
    log(`[db] ${updated} row(s) updated.`);
    return { backupFile, updated };
  } catch (e) {
    try { await client.query("ROLLBACK"); } catch { /* already closed */ }
    throw e;
  } finally {
    await client.end();
  }
}

const pkCache = new Map<string, string | null>();
async function primaryKeyColumn(client: any, table: string): Promise<string | null> {
  if (pkCache.has(table)) return pkCache.get(table)!;
  const res = await client.query(
    `SELECT kcu.column_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON kcu.constraint_name = tc.constraint_name AND kcu.table_schema = tc.table_schema
      WHERE tc.table_schema='public' AND tc.constraint_type='PRIMARY KEY' AND tc.table_name=$1
      ORDER BY kcu.ordinal_position LIMIT 1`,
    [table],
  );
  const col = res.rows[0]?.column_name ?? null;
  pkCache.set(table, col);
  return col;
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

async function main() {
  log("=".repeat(70));
  log(" Digital Age Expo — external image migration");
  log(` command: ${COMMAND}${OPT.insecure ? "   [--insecure: TLS validation OFF for legacy hosts only]" : ""}`);
  log("=".repeat(70));

  // `verify` only inspects files already on disk — no source scan, no DB round-trip.
  if (COMMAND === "verify") {
    const { bad } = await commandVerify();
    process.exitCode = bad.length ? 1 : 0;
    return;
  }

  const { refs, groups } = await collectReferences();

  if (COMMAND === "audit") {
    log("\nAudit only — nothing was downloaded and nothing was written to the database.");
    log("Next: npx tsx scripts/download-external-images.ts download --insecure");
    return;
  }

  if (COMMAND === "download" || COMMAND === "all") {
    const { manifest, failures } = await commandDownload(groups);
    await commandVerify();

    const count = (s: ManifestEntry["status"]) => manifest.filter((m) => m.status === s).length;
    log("\n" + "-".repeat(70));
    log(` unique assets referenced : ${groups.size}`);
    log(` downloaded               : ${count("downloaded")}`);
    log(` already present locally  : ${count("already-local")}`);
    log(` mapped to existing image : ${count("mapped-existing")}`);
    log(` skipped                  : ${count("skipped")}`);
    log(` failed                   : ${count("failed")}`);
    log("-".repeat(70));
    if (failures.length) {
      log("\nFailures (see reports/failed-image-downloads.json):");
      for (const f of failures.slice(0, 40)) log(`  x ${f.sourceUrl}\n      ${f.error}`);
      if (failures.length > 40) log(`  … and ${failures.length - 40} more`);
    }
    log("\nNext: review the reports, then");
    log("  npx tsx scripts/download-external-images.ts update-db          # dry run");
    log("  npx tsx scripts/download-external-images.ts update-db --confirm");
    return;
  }

  if (COMMAND === "update-db") {
    let manifest: ManifestEntry[] = [];
    try {
      manifest = JSON.parse(await fs.readFile(path.join(REPORTS_DIR, "image-manifest.json"), "utf8"));
    } catch {
      throw new Error("reports/image-manifest.json not found — run the `download` command first.");
    }
    await commandUpdateDb(refs, manifest);
    return;
  }

  throw new Error(`Unknown command "${COMMAND}". Use audit | download | verify | update-db | all`);
}

main().catch((e) => {
  console.error("\nFATAL:", e?.stack ?? e);
  process.exit(1);
});
