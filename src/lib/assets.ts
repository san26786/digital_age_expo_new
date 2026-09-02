import {
  EXTERNAL_ROOT,
  PLACEHOLDER_IMAGE,
  isVideoPath,
  legacyPathToLocalPath,
  resolveAsset,
} from "@/lib/asset-map";

export { EXTERNAL_ROOT, PLACEHOLDER_IMAGE };

/**
 * ---------------------------------------------------------------------------
 * Uploaded media resolution.
 * ---------------------------------------------------------------------------
 *
 * Previously this glued `ASSETS_BASE_URL` (the legacy PHP host) onto whatever
 * filename Postgres happened to store, which made every rendered page depend on
 * `digitalageexpo.com` staying up and keeping a valid certificate. It didn't,
 * so images were broken on Vercel and only intermittently present on a local
 * XAMPP checkout.
 *
 * Every uploaded asset is now mirrored into `public/images/external/**` by
 * `scripts/download-external-images.ts`, and this helper resolves to that local
 * path instead. The DATABASE IS UNCHANGED — it still stores the same filenames;
 * only the resolution rule moved. See `src/lib/asset-map.ts` for the mapping,
 * which the download script imports so the two can never disagree.
 *
 * Safe for: null | undefined | "" | "  " | relative paths | absolute URLs |
 * query strings | spaces | percent-encoded filenames.
 *
 * Returns `undefined` for empty input so the existing `?? fallback` call sites
 * keep working exactly as before.
 */
export function assetUrl(path: string | null | undefined): string | undefined {
  return resolveAsset(path).url;
}

/**
 * Same as {@link assetUrl} but guaranteed to return a string — use it for the
 * hardcoded legacy URLs that used to be inlined in JSX, where TypeScript would
 * otherwise complain about `string | undefined` in a `src` prop.
 *
 *   staticAssetUrl("https://apps.digitalageexpo.com/images/speaker_hall.png")
 *     -> "/images/external/apps/speaker_hall.png"
 */
export function staticAssetUrl(url: string): string {
  return resolveAsset(url).url ?? PLACEHOLDER_IMAGE;
}

/** {@link assetUrl} with the shared placeholder instead of `undefined`. */
export function assetUrlOrPlaceholder(path: string | null | undefined): string {
  return assetUrl(path) ?? PLACEHOLDER_IMAGE;
}

/**
 * The logo shown for one exhibitor in the public directory (`/exhibitors`, the home page's
 * featured strip, the lobby's exhibitor list).
 *
 * `find_event_exhibitor.logo` holds one of two shapes and they must NOT be treated alike:
 *
 *   1. a bare legacy filename ("186kloud.png") uploaded on the old PHP site, which lived in
 *      `files/exhibitor_profile_images/` and is mirrored locally by asset-map; and
 *   2. an absolute app path ("/files/exhibitor/logo/2140.png") written by this app's own
 *      /api/members/exhibitors-admin/upload route.
 *
 * Prefixing shape 2 with the legacy folder produced
 * `/files/exhibitor_profile_images//files/exhibitor/logo/2140.png`, which is why an exhibitor
 * whose logo rendered fine inside the Edit Trade Stand modal showed a broken image on
 * /exhibitors. Anything already absolute (or a full URL) is therefore passed straight to
 * assetUrl(), which leaves local paths alone.
 *
 * Falls back to the linked directory listing's logo (`files/logo/<listing id>.<ext>`) exactly as
 * every call site did before, and returns undefined when there is nothing to show so the caller
 * can render its initials avatar.
 */
export function exhibitorLogoUrl(
  logo: string | null | undefined,
  listingId?: number | string | null,
  logoExtension?: string | null,
): string | undefined {
  const raw = (logo ?? "").toString().trim();
  if (raw !== "") {
    const direct =
      raw.startsWith("/") || /^(https?:)?\/\//i.test(raw) || /^(data|blob):/i.test(raw)
        ? assetUrl(raw)
        : assetUrl(`/files/exhibitor_profile_images/${raw}`);
    if (direct) return direct;
  }
  if (listingId && logoExtension) {
    return assetUrl(`/files/logo/${listingId}.${logoExtension}`);
  }
  return undefined;
}

/**
 * Exhibitor stand assets (banner creatives, gallery uploads, brochures).
 *
 * Assets uploaded through `/api/members/stand-assets` are written to this app's
 * own `public/images/lobby_assets` folder and are always named `event_<id>_...`
 * — those keep resolving to the real local folder, untouched.
 *
 * Pre-existing/seeded stand assets migrated from the legacy site used to fall
 * back to the legacy CDN; they now resolve to the local mirror instead.
 */
export function exhibitorAssetUrl(filename?: string | null): string | undefined {
  if (!filename) return undefined;
  const raw = String(filename).trim();
  if (raw === "") return undefined;
  if (raw.startsWith("event_")) return `/images/lobby_assets/${raw}`;
  if (raw.startsWith("/images/") || raw.startsWith("/files/settings/")) return raw;
  if (/^(https?:)?\/\//i.test(raw) || raw.startsWith("/")) return assetUrl(raw);
  return assetUrl(`files/lobby_assets/${raw}`);
}

/**
 * Stand background templates (`find_event_lobby_child_layout_manager.image` /
 * `find_event_template_color_options.image`) live in the legacy `files/lobby/child`
 * folder, mirrored to `/images/external/lobby/child`.
 */
export function standTemplateUrl(filename?: string | null): string | undefined {
  if (!filename) return undefined;
  const raw = String(filename).trim();
  if (raw === "") return undefined;
  if (/^(https?:)?\/\//i.test(raw) || raw.startsWith("/")) return assetUrl(raw);
  return assetUrl(`files/lobby/child/${raw}`);
}

/**
 * The main lobby background (`find_event_lobby_layout_manager.image` — either an
 * image or, when the filename ends in .mp4/.webm, a looping background video)
 * and the lobby's intro video (`video_path`), both from the legacy
 * `files/lobby/` folder -> mirrored to `/images/external/lobby`.
 */
export function lobbyAssetUrl(filename?: string | null): string | undefined {
  if (!filename) return undefined;
  const raw = String(filename).trim();
  if (raw === "") return undefined;
  if (/^(https?:)?\/\//i.test(raw) || raw.startsWith("/")) return assetUrl(raw);
  return assetUrl(`files/lobby/${raw}`);
}

/** True when a lobby background filename should render as a `<video>` instead of an `<img>`. */
export function isLobbyVideoAsset(filename?: string | null): boolean {
  return isVideoPath(filename);
}

/**
 * Footer/menu icons for the lobby's bottom nav (`find_event_lobby_menu.icon_path`)
 * — organiser-uploaded per menu row via the CP, so this deliberately does NOT
 * fall back to a bundled icon set.
 *
 * These used to be resolved against `PUBLIC_SITE_URL` (the live legacy site)
 * because a local XAMPP checkout has the PHP files but not the multi-gigabyte
 * uploaded `files/` media folder. That workaround is obsolete now that the
 * icons are mirrored locally.
 */
export function lobbyMenuIconUrl(filename?: string | null): string | undefined {
  if (!filename) return undefined;
  const raw = String(filename).trim();
  if (raw === "") return undefined;
  if (/^(https?:)?\/\//i.test(raw) || raw.startsWith("/")) return assetUrl(raw);
  return assetUrl(`files/lobby/lobby_menu/${raw}`);
}

/**
 * A handful of the legacy lobby's footer icons (My Booth / Manage My Sessions)
 * aren't per-event DB rows at all — `lobby.php` hardcodes them as site-root
 * relative filenames (`../images/lobby-booth.png`). They mirror to
 * `/images/external/site/<filename>`.
 */
export function lobbySiteImageUrl(filename: string): string {
  return legacyPathToLocalPath(`images/${filename}`, "digitalageexpo.com");
}
