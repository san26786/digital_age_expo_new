import fs from "fs";
import path from "path";

/**
 * ---------------------------------------------------------------------------
 * Does this app-relative URL correspond to a file we actually ship?
 * ---------------------------------------------------------------------------
 *
 * SERVER ONLY (it touches fs). Exists to keep URLs that will 404 from ever reaching an <img>.
 *
 * WHY THIS IS NEEDED AT ALL, rather than just handling the error in the browser. Two things
 * conspire in this app:
 *
 *  1. `src/app/[...slug]/page.tsx` is a root catch-all, so a request for a missing
 *     /images/external/... path is NOT a 404 — the catch-all matches it and returns HTTP 200
 *     with an HTML page. The <img> then fails at DECODE time rather than fetch time.
 *
 *  2. An <img> rendered by the server starts loading before React hydrates. When it fails that
 *     early, the error event happens with no handler attached yet, and React does not replay
 *     missed load/error events. An `onError` fallback therefore never runs for exactly the
 *     images that are fastest to fail — the local ones. That is why the zone scene stayed black
 *     with a broken-image icon even with a fallback in place.
 *
 * The database stores legacy filenames, and only some of that media was ever mirrored into
 * `public/images/external/**` (the child-layout folder holds 8 files, not one per zone). Since
 * the mirror is on our own disk, the server can simply look — which is exact, needs no network,
 * and removes the race entirely.
 *
 * Only app-relative paths can be checked. A remote URL is reported as present, because that is
 * not something a filesystem can answer and hiding it would be worse than trying it.
 */

/**
 * `existsSync` per distinct URL, memoised for the life of the process.
 *
 * These files are shipped build artefacts, so a path does not start or stop existing while the
 * server runs. Without the cache a zone would stat 22 logos on every single render.
 */
const cache = new Map<string, boolean>();

export function publicFileExists(url: string | null | undefined): boolean {
  const raw = (url ?? "").trim();
  if (raw === "") return false;

  // Not a local path — data:/blob:/http(s):. Nothing to check; assume it is fine.
  if (!raw.startsWith("/")) return true;

  const cached = cache.get(raw);
  if (cached !== undefined) return cached;

  let exists = true;
  try {
    // Strip any query/hash (`?v=` cache-busters are written by the upload routes) and decode
    // percent-escapes, since the filename on disk is the decoded form.
    const clean = decodeURIComponent(raw.split(/[?#]/)[0]);

    const full = path.join(process.cwd(), "public", clean);
    // Refuse to look outside public/ — the input traces back to a database column, so a stored
    // "../../.env" must not become a filesystem probe.
    const root = path.join(process.cwd(), "public");
    exists = full.startsWith(root + path.sep) && fs.existsSync(full);
  } catch {
    /*
     * The check itself failed (undecodable escape, permissions, a read-only FS quirk). Treat the
     * file as present: a false negative here would blank out an image that works, which is worse
     * than letting the browser try and fail.
     */
    exists = true;
  }

  cache.set(raw, exists);
  return exists;
}

/** The URL if we ship it, otherwise undefined — for `existingPublicFile(x) ?? fallback`. */
export function existingPublicFile(url: string | null | undefined): string | undefined {
  const raw = (url ?? "").trim();
  if (raw === "") return undefined;
  return publicFileExists(raw) ? raw : undefined;
}
