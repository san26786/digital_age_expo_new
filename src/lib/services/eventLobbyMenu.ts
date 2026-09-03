import { prisma } from "@/lib/prisma";
import type { EventMemberContext } from "@/lib/services/eventAccess";

/**
 * ---------------------------------------------------------------------------
 * Event (lobby footer) menu — organiser CRUD.
 * ---------------------------------------------------------------------------
 *
 * Backs /members/manage_event_menu, the Next replacement for legacy
 * members/manage_event_menu.php. Writes the SAME table the public lobby reads —
 * `find_event_lobby_menu` — so what an organiser configures here is exactly what
 * getLobbyFooterMenu() renders along the bottom of /virtual-event/[slug]. There is no separate
 * copy of the menu anywhere.
 *
 * Shape of the table, mirroring the legacy form:
 *  - a row with `parent_id` null/0 is a top-level footer button;
 *  - a row with `parent_id` set is a child, and a parent with children renders as a dropdown
 *    ("Auditorium (6)") rather than a link;
 *  - `seq` orders siblings;
 *  - `post_action_type` picks the destination, and the matching id column carries the target.
 */

/** The destinations a menu item can point at — legacy manage_event_menu.php's $post_option. */
export const MENU_ACTION_TYPES = [
  { value: "lobby", label: "Lobby (Home)" },
  { value: "layout", label: "Layout / Zone" },
  { value: "exhibitor_list", label: "Exhibitor List" },
  { value: "networking_room", label: "Networking Room" },
  { value: "photogallery", label: "Photo Gallery" },
  { value: "briefcase", label: "Briefcase" },
  { value: "chat", label: "Chat / Support" },
  { value: "asset", label: "Asset" },
  { value: "leadership-board", label: "Leaderboard" },
] as const;

export type MenuActionType = (typeof MENU_ACTION_TYPES)[number]["value"];

/** Which extra field each action type needs. Drives both the form and the server-side cleanup. */
export const ACTION_TARGET_FIELD: Record<string, "layout_id" | "networking_room_id" | "post_asset_id" | "exhibitor_id" | "chat_user_id" | null> = {
  layout: "layout_id",
  networking_room: "networking_room_id",
  asset: "post_asset_id",
  exhibitor_list: "exhibitor_id",
  chat: "chat_user_id",
  lobby: null,
  photogallery: null,
  briefcase: null,
  "leadership-board": null,
};

export interface LobbyMenuRow {
  id: number;
  title: string;
  seq: number;
  parentId: number | null;
  parentTitle: string | null;
  actionType: string | null;
  actionLabel: string;
  /** The resolved name of whatever the action points at, for the list view. */
  targetLabel: string | null;
  active: boolean;
  iconPath: string | null;
  mobileIconPath: string | null;
  postAssetId: number | null;
  layoutId: number | null;
  networkingRoomId: number | null;
  exhibitorId: number | null;
  chatUserId: number | null;
}

export interface LobbyMenuOption {
  id: number;
  label: string;
}

export interface LobbyMenuOptions {
  /** Top-level rows only — the menu cannot nest more than one level. */
  parents: LobbyMenuOption[];
  layouts: LobbyMenuOption[];
  rooms: LobbyMenuOption[];
  assets: LobbyMenuOption[];
  exhibitors: LobbyMenuOption[];
}

export interface LobbyMenuInput {
  title: string;
  seq: number;
  parent_id?: number | null;
  post_action_type?: string | null;
  post_asset_id?: number | null;
  layout_id?: number | null;
  networking_room_id?: number | null;
  exhibitor_id?: number | null;
  chat_user_id?: number | null;
  active?: boolean;
}

function actionLabel(type: string | null | undefined): string {
  const found = MENU_ACTION_TYPES.find((a) => a.value === type);
  return found ? found.label : type || "—";
}

/**
 * Blanks every target column except the one this action type actually uses.
 *
 * Without it, switching an item from "Networking Room" to "Layout" would leave the old
 * networking_room_id behind, and the lobby's resolveLobbyHref() — which checks the columns in a
 * fixed order — could send visitors to the previous destination.
 */
function targetColumns(input: LobbyMenuInput) {
  const keep = ACTION_TARGET_FIELD[String(input.post_action_type ?? "")] ?? null;
  return {
    layout_id: keep === "layout_id" ? input.layout_id ?? null : null,
    networking_room_id: keep === "networking_room_id" ? input.networking_room_id ?? null : null,
    post_asset_id: keep === "post_asset_id" ? input.post_asset_id ?? null : null,
    exhibitor_id: keep === "exhibitor_id" ? input.exhibitor_id ?? null : null,
    chat_user_id: keep === "chat_user_id" ? input.chat_user_id ?? null : null,
  };
}

export async function getLobbyMenuRows(context: EventMemberContext): Promise<LobbyMenuRow[]> {
  if (context.role !== "organiser") return [];

  const rows = await prisma.find_event_lobby_menu.findMany({
    where: { event_id: context.eventId },
    orderBy: [{ seq: "asc" }, { id: "asc" }],
  });
  if (rows.length === 0) return [];

  const titleById = new Map<number, string>(rows.map((r: any) => [r.id, r.title ?? ""]));

  // Resolve the target names in bulk rather than per row — a menu is small, but N+1 on five
  // different tables adds up on a page that is already doing an event lookup.
  const layoutIds = rows.map((r: any) => r.layout_id).filter((v: any): v is number => !!v);
  const roomIds = rows.map((r: any) => r.networking_room_id).filter((v: any): v is number => !!v);
  const assetIds = rows.map((r: any) => r.post_asset_id).filter((v: any): v is number => !!v);
  const exhibitorIds = rows.map((r: any) => r.exhibitor_id).filter((v: any): v is number => !!v);

  const [layouts, rooms, assets, exhibitors] = await Promise.all([
    layoutIds.length
      ? prisma.find_event_lobby_child_layout_manager.findMany({
          where: { id: { in: layoutIds } },
          select: { id: true, title: true },
        })
      : Promise.resolve([] as { id: number; title: string | null }[]),
    roomIds.length
      ? prisma.find_event_networking_rooms.findMany({
          where: { id: { in: roomIds } },
          select: { id: true, room_name: true },
        })
      : Promise.resolve([] as { id: number; room_name: string | null }[]),
    assetIds.length
      ? prisma.find_event_lobby_layout_type_assets.findMany({
          where: { id: { in: assetIds } },
          select: { id: true, title: true },
        })
      : Promise.resolve([] as { id: number; title: string | null }[]),
    exhibitorIds.length
      ? prisma.find_event_exhibitor.findMany({
          where: { id: { in: exhibitorIds } },
          select: { id: true, business: true },
        })
      : Promise.resolve([] as { id: number; business: string | null }[]),
  ]);

  const layoutById = new Map<number, string>(layouts.map((l: any) => [l.id, l.title ?? ""]));
  const roomById = new Map<number, string>(rooms.map((r: any) => [r.id, r.room_name ?? ""]));
  const assetById = new Map<number, string>(assets.map((a: any) => [a.id, a.title ?? ""]));
  const exhibitorById = new Map<number, string>(exhibitors.map((e: any) => [e.id, e.business ?? ""]));

  return rows.map((r: any): LobbyMenuRow => {
    let targetLabel: string | null = null;
    if (r.layout_id) targetLabel = layoutById.get(r.layout_id) ?? `Layout #${r.layout_id}`;
    else if (r.networking_room_id) targetLabel = roomById.get(r.networking_room_id) ?? `Room #${r.networking_room_id}`;
    else if (r.post_asset_id) targetLabel = assetById.get(r.post_asset_id) ?? `Asset #${r.post_asset_id}`;
    else if (r.exhibitor_id) targetLabel = exhibitorById.get(r.exhibitor_id) ?? `Exhibitor #${r.exhibitor_id}`;

    const parentId = r.parent_id && r.parent_id > 0 ? r.parent_id : null;

    return {
      id: r.id,
      title: r.title ?? "",
      seq: r.seq ?? 0,
      parentId,
      parentTitle: parentId ? titleById.get(parentId) ?? null : null,
      actionType: r.post_action_type ?? null,
      actionLabel: actionLabel(r.post_action_type),
      targetLabel,
      active: r.active === 1,
      iconPath: r.icon_path ?? null,
      mobileIconPath: r.mobile_icon_path ?? null,
      postAssetId: r.post_asset_id ?? null,
      layoutId: r.layout_id ?? null,
      networkingRoomId: r.networking_room_id ?? null,
      exhibitorId: r.exhibitor_id ?? null,
      chatUserId: r.chat_user_id ?? null,
    };
  });
}

export async function getLobbyMenuOptions(context: EventMemberContext): Promise<LobbyMenuOptions> {
  const empty: LobbyMenuOptions = { parents: [], layouts: [], rooms: [], assets: [], exhibitors: [] };
  if (context.role !== "organiser") return empty;

  // Zones/rooms hang off this event's lobby layout, exactly as the legacy page looked them up.
  const layout = await prisma.find_event_lobby_layout_manager.findFirst({
    where: { event_id: context.eventId },
    select: { id: true },
  });

  const [parents, layouts, rooms, assets, exhibitors] = await Promise.all([
    prisma.find_event_lobby_menu.findMany({
      where: { event_id: context.eventId, OR: [{ parent_id: null }, { parent_id: 0 }] },
      orderBy: [{ seq: "asc" }, { id: "asc" }],
      select: { id: true, title: true },
    }),
    layout
      ? prisma.find_event_lobby_child_layout_manager.findMany({
          where: { event_layout_id: layout.id },
          orderBy: { title: "asc" },
          select: { id: true, title: true },
        })
      : Promise.resolve([] as { id: number; title: string | null }[]),
    prisma.find_event_networking_rooms.findMany({
      where: { event_id: context.eventId },
      orderBy: { room_name: "asc" },
      select: { id: true, room_name: true },
    }),
    prisma.find_event_lobby_layout_type_assets.findMany({
      where: {
        event_id: context.eventId,
        default_asset_type: null,
        default_asset_id: null,
        exhibitor_user_id: null,
      },
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
    prisma.find_event_exhibitor.findMany({
      where: { event_id: context.eventId, status: "active" },
      orderBy: { business: "asc" },
      select: { id: true, business: true },
    }),
  ]);

  return {
    parents: parents.map((p: any) => ({ id: p.id, label: p.title || `Menu #${p.id}` })),
    layouts: layouts.map((l: any) => ({ id: l.id, label: l.title || `Layout #${l.id}` })),
    rooms: rooms.map((r: any) => ({ id: r.id, label: r.room_name || `Room #${r.id}` })),
    assets: assets.map((a: any) => ({ id: a.id, label: a.title || `Asset #${a.id}` })),
    exhibitors: exhibitors.map((e: any) => ({ id: e.id, label: e.business || `Exhibitor #${e.id}` })),
  };
}

export async function createLobbyMenu(context: EventMemberContext, input: LobbyMenuInput) {
  if (context.role !== "organiser") return null;
  return prisma.find_event_lobby_menu.create({
    data: {
      event_id: context.eventId,
      title: input.title,
      seq: input.seq,
      parent_id: input.parent_id ?? null,
      post_action_type: input.post_action_type || null,
      active: input.active === false ? 0 : 1,
      ...targetColumns(input),
    },
    select: { id: true },
  });
}

export async function updateLobbyMenu(context: EventMemberContext, id: number, input: LobbyMenuInput) {
  if (context.role !== "organiser") return { count: 0 };

  // An item cannot be its own parent — that would make it vanish from the footer (it is no longer
  // top-level) while also never appearing as anyone's child.
  const parentId = input.parent_id && input.parent_id !== id ? input.parent_id : null;

  return prisma.find_event_lobby_menu.updateMany({
    where: { id, event_id: context.eventId },
    data: {
      title: input.title,
      seq: input.seq,
      parent_id: parentId,
      post_action_type: input.post_action_type || null,
      active: input.active === false ? 0 : 1,
      ...targetColumns(input),
    },
  });
}

/**
 * Delete one item.
 *
 * Its children are promoted to top level rather than deleted: silently removing menu entries the
 * organiser did not ask about is the kind of thing nobody notices until the footer is missing a
 * whole section on show day.
 */
export async function deleteLobbyMenu(context: EventMemberContext, id: number) {
  if (context.role !== "organiser") return { count: 0 };

  await prisma.find_event_lobby_menu.updateMany({
    where: { parent_id: id, event_id: context.eventId },
    data: { parent_id: null },
  });

  return prisma.find_event_lobby_menu.deleteMany({ where: { id, event_id: context.eventId } });
}

/** Show/hide without deleting — `active` is what getLobbyFooterMenu() filters on. */
export async function setLobbyMenuActive(context: EventMemberContext, id: number, active: boolean) {
  if (context.role !== "organiser") return { count: 0 };
  return prisma.find_event_lobby_menu.updateMany({
    where: { id, event_id: context.eventId },
    data: { active: active ? 1 : 0 },
  });
}

/** Persist a new order. Sequential, so a partial failure cannot interleave two items' seq values. */
export async function reorderLobbyMenu(context: EventMemberContext, orderedIds: number[]) {
  if (context.role !== "organiser") return { count: 0 };
  let count = 0;
  for (let i = 0; i < orderedIds.length; i += 1) {
    const res = await prisma.find_event_lobby_menu.updateMany({
      where: { id: orderedIds[i], event_id: context.eventId },
      data: { seq: i + 1 },
    });
    count += res.count;
  }
  return { count };
}

/**
 * ---------------------------------------------------------------------------
 * Copying a menu from another event.
 * ---------------------------------------------------------------------------
 *
 * Building a 40-item footer by hand is not reasonable, and every one of these events is a
 * variation on the same nav. The legacy platform solved this with the `copied_menu_id` column —
 * a menu row remembering the row it was cloned from — so this does the same rather than
 * inventing a parallel mechanism.
 *
 * Nothing here is transcribed or hardcoded: the source rows are read live from
 * find_event_lobby_menu, so whatever the source event's footer looks like right now is what
 * gets copied.
 */

export interface MenuSourceEvent {
  eventId: number;
  title: string;
  itemCount: number;
}

/**
 * Events whose menu could be copied into this one — every event with at least one menu row,
 * excluding the current event, most items first.
 */
export async function getMenuSourceEvents(context: EventMemberContext): Promise<MenuSourceEvent[]> {
  if (context.role !== "organiser") return [];

  const grouped = await prisma.find_event_lobby_menu.groupBy({
    by: ["event_id"],
    _count: { _all: true },
    where: { event_id: { not: context.eventId } },
  });

  const eventIds = grouped
    .map((g: any) => g.event_id)
    .filter((v: any): v is number => typeof v === "number" && v > 0);
  if (eventIds.length === 0) return [];

  const events = await prisma.find_events.findMany({
    where: { id: { in: eventIds } },
    select: { id: true, title: true },
  });
  const titleById = new Map<number, string>(events.map((e: any) => [e.id, e.title ?? ""]));

  return grouped
    .filter((g: any) => typeof g.event_id === "number" && g.event_id > 0)
    .map((g: any): MenuSourceEvent => ({
      eventId: g.event_id,
      // An event row can be missing where the menu outlived it; show the id rather than a blank.
      title: titleById.get(g.event_id) || `Event #${g.event_id}`,
      itemCount: g._count._all,
    }))
    .sort((a: MenuSourceEvent, b: MenuSourceEvent) => b.itemCount - a.itemCount);
}

export interface CopyMenuResult {
  copied: number;
  skipped: number;
}

/**
 * Clone the source event's menu into this event.
 *
 * Two things make this more than an insert loop:
 *
 *  - PARENT REMAPPING. Children point at their parent by id, and the clones get new ids, so the
 *    parents are inserted first and a source-id -> new-id map rewrites each child's parent_id.
 *    Copying the raw parent_id would point this event's children at another event's rows.
 *
 *  - TARGET COLUMNS ARE DROPPED. layout_id, networking_room_id, post_asset_id and exhibitor_id
 *    all reference rows belonging to the SOURCE event. Carried over verbatim they would send
 *    this event's visitors into another event's zones — so the structure is copied and the
 *    destinations are left blank for the organiser to set. `post_action_type` is kept only where
 *    it needs no target ("lobby", "briefcase", "chat", ...); a "layout" row arrives with no
 *    action, reading as "not configured yet".
 *
 * Idempotent: a title already present at the same level is skipped, so re-running after adding
 * items to the source tops this event up instead of duplicating it.
 */
export async function copyLobbyMenuFromEvent(
  context: EventMemberContext,
  sourceEventId: number
): Promise<CopyMenuResult> {
  if (context.role !== "organiser") return { copied: 0, skipped: 0 };
  if (!Number.isFinite(sourceEventId) || sourceEventId <= 0 || sourceEventId === context.eventId) {
    return { copied: 0, skipped: 0 };
  }

  const [sourceRows, existingRows] = await Promise.all([
    prisma.find_event_lobby_menu.findMany({
      where: { event_id: sourceEventId },
      orderBy: [{ seq: "asc" }, { id: "asc" }],
    }),
    prisma.find_event_lobby_menu.findMany({
      where: { event_id: context.eventId },
      select: { id: true, title: true, parent_id: true },
    }),
  ]);
  if (sourceRows.length === 0) return { copied: 0, skipped: 0 };

  const key = (title: string | null, parentId: number | null) =>
    `${(title ?? "").trim().toLowerCase()}::${parentId ?? 0}`;
  // Keyed to the id, not just present/absent: when a parent is skipped because this event already
  // has it, its children still need somewhere to attach — the EXISTING row. Tracking only
  // "taken" would drop every child of an already-present parent, which is precisely the
  // top-up case a second run is for.
  const existingIdByKey = new Map<string, number>(
    existingRows.map((r: any) => [key(r.title, r.parent_id || null), r.id] as [string, number])
  );

  /**
   * Actions that are meaningless once their target column is dropped, and so must not survive
   * the copy. Note this is NOT the same as "has an entry in ACTION_TARGET_FIELD": that map gives
   * "exhibitor_list" -> exhibitor_id and "chat" -> chat_user_id, but getLobbyFooterMenu resolves
   * both to a fixed page (/exhibitors, /contact) whether or not the id is set. Keying off the map
   * would strip the action from Exhibitor List and Support and leave them dead.
   */
  const NEEDS_TARGET = new Set(["layout", "networking_room", "asset"]);
  const keepsAction = (action: string | null) => !!action && !NEEDS_TARGET.has(action);

  const idMap = new Map<number, number>();
  let copied = 0;
  let skipped = 0;

  const isTopLevel = (r: any) => !r.parent_id || r.parent_id === 0;
  // Parents first so their new ids exist before any child needs one.
  const ordered = [...sourceRows.filter(isTopLevel), ...sourceRows.filter((r: any) => !isTopLevel(r))];

  for (const row of ordered) {
    const sourceParent = row.parent_id && row.parent_id > 0 ? row.parent_id : null;
    const newParent = sourceParent ? idMap.get(sourceParent) ?? null : null;
    // Only reachable for an ORPHAN — a child whose parent_id points at a row that is not in the
    // source event (the legacy data has a few). A present-but-skipped parent still resolves,
    // via the idMap entry the skip branch below records. Dropping an orphan is better than
    // silently promoting it into the top level of the footer.
    if (sourceParent && !newParent) {
      skipped += 1;
      continue;
    }

    const alreadyHere = existingIdByKey.get(key(row.title, newParent));
    if (alreadyHere) {
      // Point this source row's children at the row already in this event.
      idMap.set(row.id, alreadyHere);
      skipped += 1;
      continue;
    }

    const created = await prisma.find_event_lobby_menu.create({
      data: {
        event_id: context.eventId,
        title: row.title,
        seq: row.seq ?? 0,
        parent_id: newParent,
        post_action_type: keepsAction(row.post_action_type) ? row.post_action_type : null,
        icon_path: row.icon_path,
        mobile_icon_path: row.mobile_icon_path,
        copied_menu_id: row.id,
        active: row.active ?? 1,
      },
      select: { id: true },
    });

    idMap.set(row.id, created.id);
    existingIdByKey.set(key(row.title, newParent), created.id);
    copied += 1;
  }

  return { copied, skipped };
}
