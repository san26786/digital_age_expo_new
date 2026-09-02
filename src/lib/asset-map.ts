/**
 * ---------------------------------------------------------------------------
 * Legacy media host -> local /public mirror mapping.
 * ---------------------------------------------------------------------------
 *
 * This module is deliberately PURE and dependency-free (no Next.js, no React,
 * no `@/` alias imports, no env access) because it is imported by BOTH:
 *
 *   1. the runtime helper  ->  src/lib/assets.ts
 *   2. the one-time script ->  scripts/download-external-images.ts
 *
 * Keeping the mapping in one place is what guarantees that the path the
 * downloader WRITES to disk is byte-for-byte the same path the app READS at
 * render time. If you change a rule here, re-run the migration script.
 *
 * WHY THIS EXISTS
 * ---------------
 * Historically every uploaded asset (speaker photos, sponsor logos, listing
 * page banners, lobby backgrounds...) lived on the legacy PHP host and the app
 * only stored a *filename* in Postgres. `assetUrl()` glued
 * `ASSETS_BASE_URL + filename` together at render time, which meant the site
 * was only ever as reliable as `digitalageexpo.com` — a host with intermittent
 * TLS/certificate problems. On Vercel that produced broken images; on a local
 * XAMPP checkout it sometimes worked, which is why the bug looked flaky.
 *
 * Now every asset is mirrored into `public/images/external/**` and served by
 * Vercel itself. The database keeps storing exactly what it always stored —
 * only the *resolution* changed.
 */

import { ASSET_OVERRIDES } from "./asset-overrides.generated";

/** Hosts whose media we mirror locally. Matched case-insensitively, incl. subdomains. */
export const LEGACY_MEDIA_HOSTS = [
  "digitalageexpo.com",
  "apps.digitalageexpo.com",
  "tradeshowslocal.com",
  "findusonweb.com",
] as const;

/** Origin used by the migration script when a DB row stores only a bare path. */
export const LEGACY_ORIGIN = "https://digitalageexpo.com";

/**
 * Extra origins the downloader will try, in order, when the primary origin
 * fails (expired cert / 404). All four legacy domains are served by the same
 * platform and share the same `files/` store.
 */
export const LEGACY_FALLBACK_ORIGINS = [
  "https://digitalageexpo.com",
  "https://apps.digitalageexpo.com",
  "https://findusonweb.com",
  "https://tradeshowslocal.com",
] as const;

/** Public URL prefix (and, under `public/`, the folder) for every mirrored asset. */
export const EXTERNAL_ROOT = "/images/external";

/** Shown instead of a broken-image icon. See src/components/common/SafeImage.tsx. */
export const PLACEHOLDER_IMAGE = "/images/image-placeholder.png";

/**
 * `/files/...` normally means "legacy remote upload", but some of this app's own
 * upload routes write genuinely local files under `public/files/`:
 *   - src/app/api/cp/settings/upload      -> public/files/settings/
 *   - src/app/api/members/news-feed/upload -> public/files/feeds/
 *   - src/app/api/members/leadership-board/upload -> public/files/feeds/
 *   - src/app/api/members/exhibitors-admin/upload -> public/files/exhibitor/{profile,logo,stand_logo}/
 * Those must pass through untouched. Without `/files/exhibitor/` here, an image an
 * organiser had just uploaded through the Edit Trade Stand modal was rewritten to
 * `/images/external/exhibitor/...` — a mirror path that has no file behind it — so the
 * public exhibitor directory showed a broken image for exactly the exhibitors that DID
 * have a logo.
 *
 * Only *bare root-relative* values reach this check. Legacy rows store feed
 * images as ABSOLUTE urls (news_feed.php saved `BASE_URL.'/files/feeds/…'`),
 * which are handled by the absolute-url branch above and still map to the
 * mirror — so listing `/files/feeds/` here does not break legacy assets.
 */
const LOCAL_FILE_PREFIXES = ["/files/settings/", "/files/feeds/", "/files/exhibitor/"];

/** Anything already living under one of these is a real file in `public/`. */
const LOCAL_ROOT_PREFIXES = ["/images/", "/_next/", "/assets/", "/fonts/", "/videos/"];

const IMAGE_EXTENSIONS = [
  ".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".ico", ".avif", ".bmp", ".tiff", ".tif",
];

const VIDEO_EXTENSIONS = [".mp4", ".webm", ".ogv", ".mov", ".m4v"];

export const MEDIA_EXTENSIONS = [...IMAGE_EXTENSIONS, ...VIDEO_EXTENSIONS];

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function stripQueryAndHash(value: string): string {
  const q = value.indexOf("?");
  const h = value.indexOf("#");
  let end = value.length;
  if (q !== -1) end = Math.min(end, q);
  if (h !== -1) end = Math.min(end, h);
  return value.slice(0, end);
}

function collapseSlashes(value: string): string {
  return value.replace(/\/{2,}/g, "/");
}

/** Decode a path segment without ever throwing on malformed `%` sequences. */
function safeDecodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

/**
 * Re-encode a path so it is safe inside `src="..."`, WITHOUT double-encoding an
 * already-encoded input (`%20` must not become `%2520`). Every segment is
 * decoded first, then encoded exactly once.
 */
export function encodeAssetPath(path: string): string {
  return path
    .split("/")
    .map((seg) => (seg === "" ? "" : encodeURIComponent(safeDecodeSegment(seg))))
    .join("/");
}

/** The on-disk (decoded) form of a public path — what the downloader writes. */
export function decodeAssetPath(path: string): string {
  return path
    .split("/")
    .map((seg) => safeDecodeSegment(seg))
    .join("/");
}

function hostSlug(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, "").replace(/[^a-z0-9.-]/g, "").replace(/\./g, "-");
}

/** True for `digitalageexpo.com`, `apps.digitalageexpo.com`, `www.findusonweb.com`, ... */
export function isLegacyMediaHost(hostname: string | null | undefined): boolean {
  if (!hostname) return false;
  const h = hostname.toLowerCase().replace(/^www\./, "");
  return LEGACY_MEDIA_HOSTS.some((legacy) => h === legacy || h.endsWith(`.${legacy}`));
}

/** True when the path looks like an image/video we can mirror. */
export function looksLikeMedia(value: string | null | undefined): boolean {
  if (!value) return false;
  const clean = stripQueryAndHash(value).toLowerCase();
  return MEDIA_EXTENSIONS.some((ext) => clean.endsWith(ext));
}

export function isVideoPath(value: string | null | undefined): boolean {
  if (!value) return false;
  const clean = stripQueryAndHash(value).toLowerCase();
  return VIDEO_EXTENSIONS.some((ext) => clean.endsWith(ext));
}

/** Parse an absolute URL without throwing. Returns null for non-absolute input. */
export function parseAbsoluteUrl(value: string): { hostname: string; pathname: string } | null {
  if (!/^https?:\/\//i.test(value.trim())) return null;
  try {
    const u = new URL(value.trim());
    return { hostname: u.hostname, pathname: u.pathname };
  } catch {
    // Legacy rows occasionally contain a raw space (e.g. ".../Digital Age Expo Intro.mp4").
    try {
      const u = new URL(value.trim().replace(/ /g, "%20"));
      return { hostname: u.hostname, pathname: u.pathname };
    } catch {
      return null;
    }
  }
}

// ---------------------------------------------------------------------------
// The mapping itself
// ---------------------------------------------------------------------------

/**
 * Deterministic legacy-path -> local-public-path mapping. Same input always
 * produces the same output, on every machine, forever.
 *
 *   files/listing_pages/817601-tillu_white.png
 *     -> /images/external/listing_pages/817601-tillu_white.png
 *
 *   (apps.digitalageexpo.com) images/speaker_hall.png
 *     -> /images/external/apps/speaker_hall.png
 *
 *   (digitalageexpo.com) images/get_ticket.mp4
 *     -> /images/external/site/get_ticket.mp4
 *
 *   files/lobby/child/event_327.jpg
 *     -> /images/external/lobby/child/event_327.jpg
 *
 * The `files/` segment is dropped because on the legacy host it was just the
 * upload root; `/images/external` is our upload root now.
 */
export function legacyPathToLocalPath(pathname: string, hostname?: string | null): string {
  const p = collapseSlashes(stripQueryAndHash(pathname)).replace(/^\/+/, "");

  if (p.startsWith("files/")) {
    return encodeAssetPath(`${EXTERNAL_ROOT}/${p.slice("files/".length)}`);
  }

  if (p.startsWith("images/")) {
    const bucket = hostname && /^(www\.)?apps\./i.test(hostname) ? "apps" : "site";
    return encodeAssetPath(`${EXTERNAL_ROOT}/${bucket}/${p.slice("images/".length)}`);
  }

  if (hostname && !isPrimaryLegacyHost(hostname)) {
    return encodeAssetPath(`${EXTERNAL_ROOT}/misc/${hostSlug(hostname)}/${p}`);
  }

  return encodeAssetPath(`${EXTERNAL_ROOT}/${p}`);
}

function isPrimaryLegacyHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^www\./, "");
  return h === "digitalageexpo.com";
}

/**
 * Reverse of {@link legacyPathToLocalPath} — given a local mirror path, the
 * remote path the downloader should request (relative to a legacy origin).
 * Used only by the migration script.
 */
export function localPathToLegacyRemotePath(localPath: string): string | null {
  if (!localPath.startsWith(`${EXTERNAL_ROOT}/`)) return null;
  const rest = decodeAssetPath(localPath.slice(EXTERNAL_ROOT.length + 1));
  if (rest.startsWith("apps/")) return `/images/${rest.slice("apps/".length)}`;
  if (rest.startsWith("site/")) return `/images/${rest.slice("site/".length)}`;
  if (rest.startsWith("misc/")) {
    const withoutBucket = rest.slice("misc/".length);
    const slash = withoutBucket.indexOf("/");
    return slash === -1 ? `/${withoutBucket}` : `/${withoutBucket.slice(slash + 1)}`;
  }
  return `/files/${rest}`;
}

/** Which legacy origin a mirror path originally came from (best effort). */
export function originForLocalPath(localPath: string): string {
  const rest = localPath.slice(EXTERNAL_ROOT.length + 1);
  if (rest.startsWith("apps/")) return "https://apps.digitalageexpo.com";
  if (rest.startsWith("misc/")) {
    const withoutBucket = rest.slice("misc/".length);
    const slash = withoutBucket.indexOf("/");
    const slug = slash === -1 ? withoutBucket : withoutBucket.slice(0, slash);
    return `https://${slug.replace(/-/g, ".")}`;
  }
  return LEGACY_ORIGIN;
}

// ---------------------------------------------------------------------------
// The resolver used at runtime
// ---------------------------------------------------------------------------

export type AssetKind =
  /** Empty / null / undefined input. */
  | "empty"
  /** Already a path inside this app's own `public/` folder. */
  | "local"
  /** A legacy remote asset that we now serve from `public/images/external`. */
  | "mirrored"
  /** An intentional third-party URL (YouTube thumbnail, gravatar, ...) — left alone. */
  | "external"
  /** `data:` / `blob:` URI — left alone. */
  | "inline";

export interface ResolvedAsset {
  kind: AssetKind;
  /** The value to put in `src`. `undefined` only for `kind === "empty"`. */
  url: string | undefined;
  /** For mirrored assets: the canonical mirror path BEFORE overrides were applied. */
  canonicalPath?: string;
}

/**
 * Single source of truth for turning any stored asset reference into something
 * the browser can load. Safe for: null, undefined, "", "   ", relative paths,
 * absolute URLs, query strings, spaces and percent-encoded filenames.
 */
export function resolveAsset(value: string | null | undefined): ResolvedAsset {
  if (value === null || value === undefined) return { kind: "empty", url: undefined };

  const raw = String(value).trim();
  if (raw === "") return { kind: "empty", url: undefined };

  // data: / blob: URIs pass straight through.
  if (/^(data|blob):/i.test(raw)) return { kind: "inline", url: raw };

  // Protocol-relative (//host/path) — normalise to https so URL() can parse it.
  const candidate = raw.startsWith("//") ? `https:${raw}` : raw;

  const absolute = parseAbsoluteUrl(candidate);
  if (absolute) {
    if (!isLegacyMediaHost(absolute.hostname)) {
      // A deliberate third-party URL. Not our problem to mirror.
      return { kind: "external", url: raw };
    }
    const canonical = legacyPathToLocalPath(absolute.pathname, absolute.hostname);
    return { kind: "mirrored", url: applyOverride(canonical), canonicalPath: canonical };
  }

  // Root-relative paths that are genuinely ours.
  if (LOCAL_ROOT_PREFIXES.some((prefix) => raw.startsWith(prefix))) {
    return { kind: "local", url: raw };
  }
  if (LOCAL_FILE_PREFIXES.some((prefix) => raw.startsWith(prefix))) {
    return { kind: "local", url: raw };
  }

  // Everything else is a legacy upload path or bare filename stored in Postgres.
  const canonical = legacyPathToLocalPath(raw, null);
  return { kind: "mirrored", url: applyOverride(canonical), canonicalPath: canonical };
}

/**
 * Applies `src/lib/asset-overrides.generated.ts` — written by the migration
 * script when a mirrored asset turned out to be byte-identical to an image the
 * project already ships (e.g. `public/images/sponsors/tillu_white.png`). Lets
 * us reuse the existing file instead of committing a duplicate.
 */
function applyOverride(canonicalPath: string): string {
  const direct = ASSET_OVERRIDES[canonicalPath];
  if (direct) return direct;
  const decoded = decodeAssetPath(canonicalPath);
  return ASSET_OVERRIDES[decoded] ?? canonicalPath;
}
