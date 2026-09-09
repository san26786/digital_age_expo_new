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
 * ---------------------------------------------------------------------------
 * Auditorium hall artwork.
 * ---------------------------------------------------------------------------
 *
 * Each render is a room with one wide screen in an orange frame, and the hall captions are BAKED
 * INTO the image ("Ted Talk Hall", "Business Presentation Hall", "Keynote Forum Hall 1/2/3").
 * That is why the session panels are placed against the frame from stored spot coordinates rather
 * than being given headings of their own — the artwork already labels them, correctly, for the
 * room it was rendered for.
 *
 * `screen` is the fallback box for the panels when a layout has no spots placed yet, MEASURED off
 * each image: the frame's saturated-orange edges give the sides, the caption rail gives the
 * bottom. keynote_speaker.png is not interchangeable with the others — its frame spans the full
 * width where theirs inset to ~9.7% — so the box travels per artwork.
 */
export interface HallArtwork {
  url: string;
  screen: { left: number; top: number; width: number; height: number };
  /**
   * The room's own screen placement, taken from the LEGACY's rendered markup.
   *
   * The live site positions each screen from a find_event_lobby_spots row, so these are only used
   * when a layout has no spots placed — but they are the real numbers, not estimates, so the page
   * matches the live site even on an event whose spots were never positioned. From the Ted Talk
   * room (child_lobby_2732):
   *
   *   spot 62055  left 13.09817589124%  top 2.4074077606201%  w 35.833334922791%  h 35.138889595314%
   *   spot 62056  left 51.484372615814% top 2.3133680555556%  w 35.729165871938%  h 35.138889595314%
   *
   * Note the two are NOT equal in width or top — someone placed them by hand, which is exactly
   * why a shared grid box cannot reproduce this room.
   */
  panels?: { left: number; top: number; width: number; height: number }[];
  /**
   * Where the pulsating marker under each hall caption goes — one per screen.
   *
   * Used when the database's own spots do not yield usable doors. The Ted Talk pair are the
   * legacy's exact values (spots 48130 / 48131); the rest are MEASURED, sitting under each baked
   * caption's centre and just below that room's caption rail.
   */
  markers?: { x: number; y: number }[];
}

/** The inset frame shared by ted_talk, seminar_hall and live_workshop (frame x 178..1734px). */
const INSET_FRAME = { left: 9.69, top: 1.6, width: 80.21, height: 40.99 };

/**
 * The live site's TWO screen positions in the Ted Talk room, straight from its rendered markup
 * (spots 62055 and 62056) — see HallArtwork.panels. Exact, not estimated.
 *
 * Reused for seminar_hall and live_workshop: those renders share this frame (x 178..1734px) and
 * their baked captions sit at the same centres (30.42% / 67.21% and 30.36% / 67.11%, against Ted
 * Talk's 30.39% / 67.21%), so the same two boxes land on their screens too.
 */
const TED_TALK_PANELS = [
  { left: 13.09817589124, top: 2.4074077606201, width: 35.833334922791, height: 35.138889595314 },
  { left: 51.484372615814, top: 2.3133680555556, width: 35.729165871938, height: 35.138889595314 },
];

/**
 * The THREE screen positions in the Keynote Forum room ("Keynote Forum Hall 1/2/3").
 *
 * No legacy markup was supplied for this room, so these are MEASURED off keynote_speaker.png
 * rather than quoted: each panel is centred on one of the three baked captions (20.99%, 49.11%,
 * 79.82%), which are 29.41% apart, at a width/pitch ratio of 0.87.
 *
 * That ratio is the room's own, not Ted Talk's. Ted Talk's legacy panels run at 0.935 — nearly
 * touching — whereas the live Keynote page has a visible gap between its three screens; matching
 * it to the screenshot puts the edges at 8.19%..33.79%, 36.32%..61.91% and 67.02%..92.61%, within
 * ~1% of where the live page draws them.
 *
 * The bottom lands at 37.55%, clear of this room's caption rail at 40.37%.
 */
/**
 * Marker positions, one per hall caption.
 *
 * Ted Talk's are quoted from the legacy markup; the others are measured off their renders — the
 * caption centres (Keynote 20.99/49.11/79.82, Seminar 30.42/67.21, Workshop 30.36/67.11) with y
 * just past each room's caption rail (Ted/Seminar/Workshop end at 42.41%, Keynote at 43.52%).
 */
const TED_TALK_MARKERS = [
  { x: 29.609375198682, y: 43.055555555556 },
  { x: 66.223960121473, y: 42.96296260975 },
];
const KEYNOTE_MARKERS = [
  { x: 20.989583, y: 44.17 },
  { x: 49.114583, y: 44.17 },
  { x: 79.817708, y: 44.17 },
];
const SEMINAR_MARKERS = [
  { x: 30.416667, y: 43.06 },
  { x: 67.213542, y: 43.06 },
];
const WORKSHOP_MARKERS = [
  { x: 30.364583, y: 43.06 },
  { x: 67.109375, y: 43.06 },
];

const KEYNOTE_PANELS = [
  { left: 8.194466, top: 2.4074077606201, width: 25.590234, height: 35.138889595314 },
  { left: 36.319466, top: 2.4074077606201, width: 25.590234, height: 35.138889595314 },
  { left: 67.022591, top: 2.4074077606201, width: 25.590234, height: 35.138889595314 },
];

const HALL_ARTWORKS: { match: RegExp; artwork: HallArtwork }[] = [
  {
    match: /keynote/i,
    artwork: {
      url: "/images/keynote_speaker.png",
      screen: { left: 0.42, top: 1.6, width: 99.11, height: 42.1 },
      panels: KEYNOTE_PANELS,
      markers: KEYNOTE_MARKERS,
    },
  },
  {
    match: /workshop/i,
    artwork: {
      url: "/images/live_workshop.png",
      screen: INSET_FRAME,
      panels: TED_TALK_PANELS,
      markers: WORKSHOP_MARKERS,
    },
  },
  {
    match: /seminar/i,
    artwork: {
      url: "/images/seminar_hall.png",
      screen: INSET_FRAME,
      panels: TED_TALK_PANELS,
      markers: SEMINAR_MARKERS,
    },
  },
  {
    match: /ted\s*talk|business\s*(presentation|theat)|vip/i,
    artwork: {
      url: "/images/ted_talk.png",
      screen: INSET_FRAME,
      panels: TED_TALK_PANELS,
      markers: TED_TALK_MARKERS,
    },
  },
];

export const DEFAULT_AUDITORIUM_BACKGROUND = "/images/ted_talk.png";
export const DEFAULT_AUDITORIUM_SCREEN = INSET_FRAME;

/**
 * The room for a hall, chosen by NAME.
 *
 * Only four renders exist for the six Auditorium entries, so VIP Sessions and Business
 * Presentation Hall share the ted_talk room — correct for Business Presentation Hall, which is
 * one of the two halls that render carries, and the neutral default for VIP Sessions. Add a
 * `vip_sessions.png` beside the others and one line here gives it its own.
 */
export function hallArtworkFor(title: string | null | undefined): HallArtwork {
  const name = (title ?? "").trim();
  for (const { match, artwork } of HALL_ARTWORKS) {
    if (match.test(name)) return artwork;
  }
  /*
   * The generic room carries panels too. Without them an unnamed hall falls through to the grid
   * fallback and renders ONE full-width screen — the bug that showed "Keynote Forum" as a single
   * panel — and the generic room IS the ted_talk render, which has two screens.
   */
  return {
    url: DEFAULT_AUDITORIUM_BACKGROUND,
    screen: DEFAULT_AUDITORIUM_SCREEN,
    panels: TED_TALK_PANELS,
    markers: TED_TALK_MARKERS,
  };
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
