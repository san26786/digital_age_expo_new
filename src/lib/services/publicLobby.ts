import { prisma } from "@/lib/prisma";
import { lobbyAssetUrl, lobbyMenuIconUrl, lobbySiteImageUrl } from "@/lib/assets";
import { PUBLIC_SITE_URL } from "@/lib/site-config";

/**
 * Public-facing reads for the /virtual-event/[slug] lobby (see also getPublicLobby() in
 * eventLobby.ts for the layout row itself). Everything here is intentionally ungated — unlike
 * eventLobby.ts / eventLobbyChild.ts, which restrict to context.role === "organiser" for the
 * CP-side management screens, this file backs the page any logged-in visitor/exhibitor/
 * speaker/organiser actually lands on after "Enter The Show".
 *
 * Mirrors lobby.php's data loading: find_event_lobby_spots for the on-image hotspot dots,
 * find_event_lobby_menu for the footer categories + their dropdown children (and the
 * "Auditorium (N)" style counts — see getEventMenu() in lobby.php), and two counts lobby.php
 * computes from entirely different tables instead of the menu hierarchy (Exhibitors from
 * find_event_exhibitor, Briefcase from find_event_lobby_briefcase per-visitor).
 */

export interface LobbyHotspot {
  id: number;
  title: string;
  xPct: number;
  yPct: number;
  color: string | null;
  isVideo: boolean;
  videoUrl: string | null;
  eventLayoutChildId: number | null;
}

/** x_coordinates/y_coordinates are stored as free-text strings (lobby.php just does
 * `left:calc(x%)`) — parse defensively and clamp so a bad/blank value can't push a dot
 * off-screen or crash the layout. */
function parsePercent(raw: string | null | undefined): number {
  const n = raw ? parseFloat(raw) : NaN;
  if (!Number.isFinite(n)) return 50;
  return Math.min(100, Math.max(0, n));
}

export async function getLobbyHotspots(eventId: number, layoutId: number): Promise<LobbyHotspot[]> {
  const rows = await prisma.find_event_lobby_spots.findMany({
    where: { event_id: eventId, event_layout_id: layoutId },
    orderBy: { id: "asc" },
    select: {
      id: true,
      title: true,
      x_coordinates: true,
      y_coordinates: true,
      spot_color: true,
      is_video: true,
      video_url: true,
      event_layout_child_id: true,
    },
  });
  return rows.map((r) => ({
    id: r.id,
    title: r.title ?? "",
    xPct: parsePercent(r.x_coordinates),
    yPct: parsePercent(r.y_coordinates),
    color: r.spot_color,
    isVideo: r.is_video === 1,
    videoUrl: r.video_url,
    eventLayoutChildId: r.event_layout_child_id,
  }));
}

export interface LobbyMenuChild {
  id: number;
  title: string;
  href: string | null;
}

export interface LobbyMenuGroup {
  id: number;
  title: string;
  count: number;
  children: LobbyMenuChild[];
}

/** Resolves a child menu row's link target — mirrors lobby.php's per-row post_action_type
 * switch (chat/asset/layout-zone/networking-room/exhibitor-booth redirects), simplified down
 * to the handful of destinations this app actually has native pages for so far. */
function resolveMenuChildHref(
  row: {
    networking_room_id: number | null;
    exhibitor_id: number | null;
    layout_id: number | null;
  },
  eventSlug?: string | null
): string | null {
  if (row.exhibitor_id) return `/exhibitors?exhibitor=${row.exhibitor_id}`;
  if (row.networking_room_id) return `/networking?room=${row.networking_room_id}`;
  // The Exhibition category's children are exhibition zones (find_event_lobby_child_layout_
  // manager rows, the same "exhibition_zone_id" find_event_exhibitor rows point at) — link
  // straight to the exhibitor directory filtered to that zone instead of a dead "#zone-N" anchor
  // that never had a matching element on the page.
  /*
   * Inside the virtual event a layout child opens its own room on this route — the auditorium
   * halls (Ted Talk Hall, Keynote Forum, ...) are layout children, so this is what makes clicking
   * one open the hall instead of leaving the show for the flat /exhibitors list.
   *
   * Without a slug (any caller outside the virtual event) the directory link is still right,
   * since there is no lobby to render a room inside.
   */
  if (row.layout_id) {
    return eventSlug
      ? `/virtual-event/${eventSlug}?zone=${row.layout_id}`
      : `/exhibitors?zone=${row.layout_id}`;
  }
  return null;
}

/**
 * find_event_lobby_menu's own hierarchy — top-level rows (parent_id null/0) are footer
 * categories, their children are the dropdown entries. count = number of active children,
 * mirroring lobby.php's getEventMenu() exactly (that's where "Auditorium (6)" comes from).
 */
export async function getLobbyMenuGroups(
  eventId: number,
  /** Present when rendering inside /virtual-event/[slug] — see resolveMenuChildHref. */
  eventSlug?: string | null
): Promise<LobbyMenuGroup[]> {
  const topLevel = await prisma.find_event_lobby_menu.findMany({
    where: { event_id: eventId, active: 1, OR: [{ parent_id: null }, { parent_id: 0 }] },
    orderBy: { seq: "asc" },
  });
  if (topLevel.length === 0) return [];

  const children = await prisma.find_event_lobby_menu.findMany({
    where: { event_id: eventId, active: 1, parent_id: { in: topLevel.map((t) => t.id) } },
    orderBy: { seq: "asc" },
  });

  return topLevel.map((t) => {
    const kids = children.filter((c) => c.parent_id === t.id);
    return {
      id: t.id,
      title: t.title ?? "",
      count: kids.length,
      children: kids.map((c) => ({
        id: c.id,
        title: c.title ?? "",
        href: resolveMenuChildHref(c, eventSlug),
      })),
    };
  });
}

/**
 * A hotspot's own title doesn't always come out byte-identical to the find_event_lobby_menu
 * category it's meant to open — e.g. the dot over the "Exhibition Hall" signage is titled
 * "Exhibitors" in this event's find_event_lobby_spots row, while the matching footer category
 * (the one with the 19 zones) is titled "Exhibition". Rather than requiring the CP admin to make
 * every hotspot and menu row match character-for-character, known synonyms are normalized to the
 * same key before comparing.
 */
const MENU_TITLE_ALIASES: Record<string, string> = {
  exhibitor: "exhibition",
  exhibitors: "exhibition",
  "exhibitor hall": "exhibition",
  "exhibition hall": "exhibition",
  // The lobby image's "Business Centre" signage is a second entry point into the same
  // exhibition zones (Business Growth Zone, Accounting and Finance Zone, Business Services
  // Zone, ...) as the "Exhibition Hall" building/hotspot — both should open the "Exhibition"
  // category's dropdown rather than needing their own separate menu row.
  "business centre": "exhibition",
  "business center": "exhibition",
  auditoria: "auditorium",
  auditoriums: "auditorium",
};

function normalizeMenuTitle(title: string): string {
  const key = title.trim().toLowerCase();
  return MENU_TITLE_ALIASES[key] ?? key;
}

/** Case-insensitive (and alias-aware, see MENU_TITLE_ALIASES) lookup tying an on-image hotspot
 * (or a fixed footer icon) to its matching find_event_lobby_menu category — the CP admin gives
 * a hotspot/category a title close to the menu row it should open (e.g. a hotspot titled
 * "Auditorium" opens the same dropdown as the footer's Auditorium icon). Returns null (not a
 * throw) when nothing matches yet. */
export function findMenuGroupByTitle(groups: LobbyMenuGroup[], title: string): LobbyMenuGroup | null {
  const needle = normalizeMenuTitle(title);
  return groups.find((g) => normalizeMenuTitle(g.title) === needle) ?? null;
}

/** Mirrors lobby.php's getExhibitorListModal() — "Exhibitors (N)" in the footer. */
export async function getExhibitorCount(eventId: number): Promise<number> {
  return prisma.find_event_exhibitor.count({ where: { event_id: eventId, status: "active" } });
}

export async function getNetworkingRoomCount(eventId: number): Promise<number> {
  return prisma.find_event_networking_rooms.count({ where: { event_id: eventId } });
}

export interface BriefcaseItem {
  id: number;
  title: string;
  url: string;
  thumbnailUrl: string | null;
}

/**
 * Mirrors lobby.php's getBriefcaseAssets() — per-visitor, hence "(0)" for anyone who hasn't
 * saved anything yet. Demo accounts (negative ids — see verifyMemberCredentials) have no real
 * find_users row to own briefcase items against, so they always see an empty briefcase rather
 * than erroring.
 */
export async function getVisitorBriefcase(eventLayoutId: number, userId: number): Promise<BriefcaseItem[]> {
  if (!Number.isFinite(userId) || userId <= 0) return [];
  const rows = await prisma.find_event_lobby_briefcase.findMany({
    where: { event_layout_id: eventLayoutId, user_id: userId },
    orderBy: { created_on: "desc" },
    select: { id: true, title: true, url: true, thumbnail_url: true },
  });
  return rows.map((r) => ({ id: r.id, title: r.title, url: r.url, thumbnailUrl: r.thumbnail_url }));
}

// ---------------------------------------------------------------------------------------------
// Bottom nav footer (lobby.tpl's `.footer-nav`) — see LobbyFooterNav.tsx. Everything below is
// driven directly off find_event_lobby_menu (the same table + rows the organiser configures from
// the CP's Lobby Manager), instead of a fixed guessed-at item list, so the footer always mirrors
// whatever menu the organiser actually set up for this event — including its own per-row icon.
// ---------------------------------------------------------------------------------------------

export interface LobbyFooterMenuChild {
  id: number;
  title: string;
  href: string | null;
  /**
   * Same meaning as LobbyFooterMenuItem.iframeUrl — embedded content that opens in a modal.
   *
   * A child needs it because "Show Guide" is not necessarily a top-level footer icon: an
   * organiser may just as well hang it inside an "Info" dropdown, and without this the child
   * resolved to null and rendered as the greyed-out "Coming soon" entry.
   */
  iframeUrl?: string | null;
}

export interface LobbyFooterMenuItem {
  id: number | string;
  title: string;
  iconUrl?: string;
  /** Mirrors find_event_lobby_menu.post_action_type ("lobby" | "layout" | "chat" | "briefcase" |
   *  "exhibitor_list" | "asset" | ...) — lets the footer pick a sensible fallback icon and lets
   *  callers (page.tsx) special-case "briefcase" to merge in the visitor's live asset count. */
  kind: string;
  href: string | null;
  /**
   * Embedded content that opens in a modal instead of navigating — the "Show Guide" Event Guide.
   *
   * Deliberately separate from `href`: an asset flagged `is_iframe` is a Canva/embed URL, and
   * making it a link would send the visitor out of the virtual event to view it.
   */
  iframeUrl?: string | null;
  external?: boolean;
  count?: number | null;
  children?: LobbyFooterMenuChild[];
  /** Shown inside an opened dropdown that has no children yet — defaults to "Coming soon." in
   *  the component; overridden per-item where a more specific message reads better (e.g. an
   *  empty briefcase). */
  emptyLabel?: string;
}

/** Resolves a menu row's real destination — mirrors the handful of post-actions this app
 * actually has native pages for. Returns null (never a dead "#") when nothing matches yet.
 *
 * This is the same resolution the hotspot/dropdown children use, so it simply delegates rather
 * than keeping a second copy: the two drifted apart once already, and the footer's copy was the
 * one missing the layout_id branch — which meant every exhibition-zone entry in the footer
 * dropdown rendered as "coming soon" even though its zone existed. */
function resolveLobbyHref(
  row: {
    networking_room_id: number | null;
    exhibitor_id: number | null;
    layout_id: number | null;
  },
  eventSlug?: string | null
): string | null {
  return resolveMenuChildHref(row, eventSlug);
}

/**
 * Mirrors lobby.php's getEventMenu(): every active, top-level find_event_lobby_menu row for this
 * event, in seq order. A row with active children renders as a dropdown ("Auditorium (6)"); a
 * childless row resolves straight to a destination based on its post_action_type — "lobby" is
 * Home, "exhibitor_list" is the exhibitor directory, "chat" is Support, "briefcase" opens the
 * visitor's saved-assets list (populated by the caller from getVisitorBriefcase — this table has
 * no live count), "asset" is a CP-uploaded link/file (rendered as an external link when it has a
 * plain asset_url; image/video/iframe assets need a lightbox this app hasn't built yet, so those
 * resolve to null/"coming soon" rather than a dead link), and "layout" opens a lobby zone/room —
 * resolved the same way hotspot children are.
 */
/** The columns of find_event_lobby_layout_type_assets a menu destination can come from. */
interface MenuAssetRow {
  id: number;
  asset_url: string | null;
  is_iframe: boolean | null;
  asset_type: string | null;
  external_link: string | null;
  asset_attachment: string | null;
}

/**
 * Turns one asset row into a destination, and says whether it embeds or navigates.
 *
 * THREE COLUMNS CAN HOLD THE URL, and which one is populated depends on how the asset was
 * created. `asset_url` only was the original assumption here, and it is the one that is empty
 * for exactly the assets that matter: the CP's own asset manager writes a link asset to
 * `external_link` (see stand-assets/route.ts, which sets both, and StandAssetsManager, which
 * reads `external_link || asset_url`), while an *uploaded* asset keeps a bare filename — not a
 * URL — in `asset_url`/`asset_attachment`. With only `asset_url` consulted, an Event Guide row
 * whose URL lives in `external_link` resolved to nothing at all, and the footer rendered it as
 * a dropdown whose only content was "Coming soon."
 *
 * `is_iframe` is the intended flag for "embed this rather than link to it", but legacy rows
 * predate it, so an `asset_type` of iframe/embed counts too. Only an absolute URL can be
 * embedded; a bare filename is a file in the lobby asset store and becomes a plain link.
 */
function menuAssetTarget(asset: MenuAssetRow): { kind: "iframe" | "link"; url: string } | null {
  const raw = [asset.external_link, asset.asset_url, asset.asset_attachment]
    .map((v) => (v ? String(v).trim() : ""))
    .find((v) => v !== "");
  if (!raw) return null;

  const isAbsolute = /^(https?:)?\/\//i.test(raw);
  /*
   * A URL that is *itself* an embed URL — ".../view?embed", ".../embed/xyz" — is embedded
   * content by construction, whatever the row says. Migration lost `is_iframe` on some rows, and
   * linking a visitor to a bare Canva embed URL throws them out of the show, which is never the
   * intended behaviour for a menu item. Deliberately narrow: it matches only an explicit embed
   * marker, so an ordinary link or a PDF is unaffected.
   */
  const urlIsAnEmbed = /[?&]embed\b/i.test(raw) || /\/embed(\/|\?|$)/i.test(raw);
  const embeds =
    asset.is_iframe === true || /iframe|embed/i.test(asset.asset_type ?? "") || urlIsAnEmbed;

  if (embeds && isAbsolute) return { kind: "iframe", url: raw };
  if (isAbsolute) return { kind: "link", url: raw };

  // A stored filename — resolve it against the mirrored lobby asset folder rather than handing
  // the browser a relative path that resolves against /virtual-event/<slug>.
  const resolved = lobbyAssetUrl(raw);
  return resolved ? { kind: "link", url: resolved } : null;
}

/**
 * Where one find_event_lobby_menu row actually points, for both top-level rows and dropdown
 * children.
 *
 * Split out because the asset case has to be resolved identically in both places. It was
 * top-level-only once, which is why a "Show Guide" row nested under a dropdown opened nothing.
 */
function resolveMenuRowTarget(
  row: {
    post_action_type: string | null;
    post_asset_id: number | null;
    networking_room_id: number | null;
    exhibitor_id: number | null;
    layout_id: number | null;
  },
  assetById: Map<number, MenuAssetRow>,
  eventSlug: string
): { href: string | null; external: boolean; iframeUrl: string | null } {
  let href: string | null = null;
  let external = false;
  /** Set for embedded content that opens in a modal rather than navigating — see "asset". */
  let iframeUrl: string | null = null;

  switch (row.post_action_type ?? "") {
    case "lobby":
      href = `/virtual-event/${eventSlug}`;
      break;
    case "exhibitor_list":
      href = "/exhibitors";
      break;
    case "chat":
      href = "/contact";
      break;
    case "layout":
      href = resolveLobbyHref(row, eventSlug);
      break;
    case "asset": {
      /*
       * An asset opens one of TWO ways, and the `is_iframe` flag is which.
       *
       * A normal asset is a file to open — a PDF, an image — so it becomes an external link.
       * An asset flagged `is_iframe` is embedded content: the legacy renders it inside a modal
       * with `<iframe style="width:100%;height:80vh;">`, which is how "Show Guide" opens the
       * Event Guide (a Canva embed). That branch used to be excluded outright (`!is_iframe`),
       * leaving href null, so the item resolved to nothing and rendered as "coming soon".
       *
       * The URL goes to `iframeUrl` rather than `href`: it must NOT become a link, because
       * navigating to a Canva embed URL throws the visitor out of the show — the whole point of
       * the modal is that the guide opens over the lobby.
       */
      const asset = row.post_asset_id ? assetById.get(row.post_asset_id) : undefined;
      const target = asset ? menuAssetTarget(asset) : null;
      if (target?.kind === "iframe") {
        iframeUrl = target.url;
      } else if (target) {
        href = target.url;
        external = true;
      }
      break;
    }
    case "briefcase":
      // Left null on purpose — page.tsx overrides this item's href/count/children with the
      // visitor's live getVisitorBriefcase() result, same as everything else that isn't a
      // plain find_event_lobby_menu destination.
      href = null;
      break;
    default:
      // Unchanged from before: an unrecognised action type resolves to nothing rather than a
      // dead link. Callers that have a sensible fallback (dropdown children, which resolve off
      // their target columns) apply it themselves.
      href = null;
  }

  return { href, external, iframeUrl };
}

export async function getLobbyFooterMenu(eventId: number, eventSlug: string): Promise<LobbyFooterMenuItem[]> {
  const topLevel = await prisma.find_event_lobby_menu.findMany({
    where: { event_id: eventId, active: 1, OR: [{ parent_id: null }, { parent_id: 0 }] },
    orderBy: { seq: "asc" },
  });
  if (topLevel.length === 0) return [];

  const children = await prisma.find_event_lobby_menu.findMany({
    where: { event_id: eventId, active: 1, parent_id: { in: topLevel.map((t) => t.id) } },
    orderBy: { seq: "asc" },
  });

  // Children as well as top-level rows: "Show Guide" is just as likely to sit inside a dropdown
  // as to be its own footer icon, and an asset id that was never fetched can only resolve to
  // "coming soon".
  const assetRowIds = [...topLevel, ...children]
    .filter((row) => row.post_action_type === "asset" && row.post_asset_id)
    .map((row) => row.post_asset_id as number);
  const assets = assetRowIds.length
    ? await prisma.find_event_lobby_layout_type_assets.findMany({
        where: { id: { in: assetRowIds } },
        select: {
          id: true,
          asset_url: true,
          is_iframe: true,
          asset_type: true,
          external_link: true,
          asset_attachment: true,
        },
      })
    : [];
  const assetById = new Map(assets.map((a) => [a.id, a]));

  return topLevel.map((row): LobbyFooterMenuItem => {
    const kids = children.filter((c) => c.parent_id === row.id);
    const kind = row.post_action_type ?? "";
    const iconUrl = lobbyMenuIconUrl(row.icon_path);

    if (kids.length > 0) {
      return {
        id: row.id,
        title: row.title ?? "",
        iconUrl,
        kind,
        href: null,
        count: kids.length,
        children: kids.map((k) => {
          const target = resolveMenuRowTarget(k, assetById, eventSlug);
          return {
            id: k.id,
            title: k.title ?? "",
            // Target columns stay the fallback, so every child that resolved before still does.
            href: target.href ?? resolveLobbyHref(k, eventSlug),
            iframeUrl: target.iframeUrl,
          };
        }),
        emptyLabel: "Not configured yet.",
      };
    }

    const { href, external, iframeUrl } = resolveMenuRowTarget(row, assetById, eventSlug);

    return {
      id: row.id,
      title: row.title ?? "",
      iconUrl,
      kind,
      href,
      iframeUrl,
      external,
      count: null,
      children: [],
    };
  });
}

interface ExhibitorMenuRow {
  id: number;
  business: string | null;
  status: string;
  friendly_url: string | null;
}

/**
 * Mirrors lobby.php's getEventUserMenu(): the "View My Booth" / "Manage My Booth" / "Manage My
 * Sessions" items that only show up for a visitor who is *also* one of this event's own
 * exhibitors and/or speakers — a single exhibitor gets a plain link, more than one gets a
 * dropdown listing each business by name, exactly like the legacy footer. "Manage My Booth" uses
 * this app's own /members/manage_stand_assets editor; "Manage My Sessions" has no native
 * self-service page yet, so it falls back to the legacy site's edit_speaker_registration.php
 * (same URL the reference footer links to) rather than a dead link.
 */
export async function getExhibitorMenuExtras(eventId: number, userId: number): Promise<LobbyFooterMenuItem[]> {
  if (!Number.isFinite(userId) || userId <= 0) return [];

  const [exhibitorRows, speakerRows] = await Promise.all([
    prisma.find_event_exhibitor.findMany({
      where: { event_id: eventId, user_id: userId },
      select: { id: true, business: true, status: true, friendly_url: true },
    }),
    prisma.find_speakers.findMany({
      where: { event_id: eventId, user_id: userId },
      select: { id: true },
    }),
  ]);

  const items: LobbyFooterMenuItem[] = [];
  const boothIconUrl = lobbySiteImageUrl("lobby-booth.png");
  const activeExhibitors = exhibitorRows.filter((ex: ExhibitorMenuRow) => ex.status === "active");

  if (activeExhibitors.length === 1) {
    const ex = activeExhibitors[0];
    items.push({
      id: `view-booth-${ex.id}`,
      title: "View My Booth",
      iconUrl: boothIconUrl,
      kind: "my-booth",
      href: ex.friendly_url ? `/virtual-directory/${ex.friendly_url}` : null,
    });
  } else if (activeExhibitors.length > 1) {
    items.push({
      id: "view-booth",
      title: "View My Booth",
      iconUrl: boothIconUrl,
      kind: "my-booth",
      href: null,
      count: activeExhibitors.length,
      children: activeExhibitors.map((ex: ExhibitorMenuRow) => ({
        id: ex.id,
        title: ex.business || "My Booth",
        href: ex.friendly_url ? `/virtual-directory/${ex.friendly_url}` : null,
      })),
      emptyLabel: "No published booths yet.",
    });
  }

  if (exhibitorRows.length === 1) {
    const ex = exhibitorRows[0];
    items.push({
      id: `manage-booth-${ex.id}`,
      title: "Manage My Booth",
      iconUrl: boothIconUrl,
      kind: "manage-booth",
      href: `/members/manage_stand_assets?event_id=${eventId}&ex_id=${ex.id}`,
    });
  } else if (exhibitorRows.length > 1) {
    items.push({
      id: "manage-booth",
      title: "Manage My Booth",
      iconUrl: boothIconUrl,
      kind: "manage-booth",
      href: null,
      count: exhibitorRows.length,
      children: exhibitorRows.map((ex: ExhibitorMenuRow) => ({
        id: ex.id,
        title: ex.business || "My Booth",
        href: `/members/manage_stand_assets?event_id=${eventId}&ex_id=${ex.id}`,
      })),
    });
  }

  if (speakerRows.length > 0) {
    items.push({
      id: "manage-sessions",
      title: "Manage My Sessions",
      iconUrl: lobbySiteImageUrl("lobby-mic-blank.png"),
      kind: "manage-sessions",
      href: `${PUBLIC_SITE_URL}/edit_speaker_registration.php?event_id=${eventId}`,
      external: true,
    });
  }

  return items;
}
