import { prisma } from "@/lib/prisma";
import { lobbyMenuIconUrl, lobbySiteImageUrl } from "@/lib/assets";
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
function resolveMenuChildHref(row: {
  networking_room_id: number | null;
  exhibitor_id: number | null;
  layout_id: number | null;
}): string | null {
  if (row.exhibitor_id) return `/exhibitors?exhibitor=${row.exhibitor_id}`;
  if (row.networking_room_id) return `/networking?room=${row.networking_room_id}`;
  // The Exhibition category's children are exhibition zones (find_event_lobby_child_layout_
  // manager rows, the same "exhibition_zone_id" find_event_exhibitor rows point at) — link
  // straight to the exhibitor directory filtered to that zone instead of a dead "#zone-N" anchor
  // that never had a matching element on the page.
  if (row.layout_id) return `/exhibitors?zone=${row.layout_id}`;
  return null;
}

/**
 * find_event_lobby_menu's own hierarchy — top-level rows (parent_id null/0) are footer
 * categories, their children are the dropdown entries. count = number of active children,
 * mirroring lobby.php's getEventMenu() exactly (that's where "Auditorium (6)" comes from).
 */
export async function getLobbyMenuGroups(eventId: number): Promise<LobbyMenuGroup[]> {
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
      children: kids.map((c) => ({ id: c.id, title: c.title ?? "", href: resolveMenuChildHref(c) })),
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
function resolveLobbyHref(row: {
  networking_room_id: number | null;
  exhibitor_id: number | null;
  layout_id: number | null;
}): string | null {
  return resolveMenuChildHref(row);
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

  const assetRowIds = topLevel
    .filter((row) => row.post_action_type === "asset" && row.post_asset_id)
    .map((row) => row.post_asset_id as number);
  const assets = assetRowIds.length
    ? await prisma.find_event_lobby_layout_type_assets.findMany({
        where: { id: { in: assetRowIds } },
        select: { id: true, asset_url: true, is_iframe: true },
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
        children: kids.map((k) => ({ id: k.id, title: k.title ?? "", href: resolveLobbyHref(k) })),
        emptyLabel: "Not configured yet.",
      };
    }

    let href: string | null = null;
    let external = false;

    switch (kind) {
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
        href = resolveLobbyHref(row);
        break;
      case "asset": {
        const asset = row.post_asset_id ? assetById.get(row.post_asset_id) : undefined;
        if (asset?.asset_url && !asset.is_iframe) {
          href = asset.asset_url;
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
        href = null;
    }

    return {
      id: row.id,
      title: row.title ?? "",
      iconUrl,
      kind,
      href,
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
