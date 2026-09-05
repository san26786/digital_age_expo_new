import { prisma } from "@/lib/prisma";
import { canManageLobby } from "@/lib/services/eventAccess";
import type { EventMemberContext } from "@/lib/services/eventAccess";

/**
 * ---------------------------------------------------------------------------
 * User Activity Report — what visitors actually did in the lobby.
 * ---------------------------------------------------------------------------
 *
 * Ports members/event_user_activity_report.php. Every row is one logged interaction in
 * `find_event_lobby_engagement_report`: a footer-nav click, a zone navigation, a booth visit, a
 * resource download.
 *
 * RAW SQL, deliberately. That table has no Prisma model — it is not in schema.prisma at all — so
 * there is no `prisma.find_event_lobby_engagement_report` to call. Rather than add a model for a
 * table whose shape cannot be verified from here, this reads it directly and asks Postgres
 * whether it exists first (see activityTableExists), so an event whose tracking table was never
 * migrated renders an honest empty state instead of a 500.
 *
 * Everything the rows POINT AT does have a model, so those lookups go through Prisma as usual.
 */

const ACTIVITY_TABLE = "find_event_lobby_engagement_report";

/** One interaction, already resolved into something displayable. */
export interface ActivityEntry {
  id: number;
  /** ISO timestamp — formatted client-side so it renders in the reader's own timezone. */
  at: string;
  userId: number | null;
  userName: string;
  /** Plain-language sentence, e.g. "Clicked on Exhibitor List in Footer Area". */
  description: string;
  /** The part worth emphasising in the sentence — the zone name, the business, the asset. */
  highlight: string | null;
}

export interface ActivityUserOption {
  userId: number;
  label: string;
}

export interface ActivityFilters {
  userId?: number | null;
  /** YYYY-MM-DD, inclusive. */
  from?: string | null;
  to?: string | null;
  offset?: number;
  limit?: number;
}

export interface ActivityPage {
  entries: ActivityEntry[];
  /** False once the source has no more rows, so the client can retire "Load More". */
  hasMore: boolean;
  /** Null when the tracking table itself is absent — a different thing from "no activity yet". */
  available: boolean;
}

export const ACTIVITY_PAGE_SIZE = 10;

/**
 * Does the tracking table exist in this database?
 *
 * `to_regclass` returns NULL rather than throwing for an unknown relation, which is exactly the
 * "ask without failing" this needs — a plain SELECT against a missing table aborts the request.
 */
async function activityTableExists(): Promise<boolean> {
  try {
    const rows = await prisma.$queryRawUnsafe<{ oid: string | null }[]>(
      `SELECT to_regclass($1)::text AS oid`,
      `public.${ACTIVITY_TABLE}`
    );
    return Boolean(rows?.[0]?.oid);
  } catch {
    return false;
  }
}

/**
 * The people who can be filtered on — attendees of this event, from find_events_rsvp, exactly as
 * the legacy select was built. Distinct by user id, because one person can hold several RSVP
 * rows for the same event.
 */
export async function getActivityUsers(context: EventMemberContext): Promise<ActivityUserOption[]> {
  if (!canManageLobby(context)) return [];

  const rows = await prisma.find_events_rsvp.findMany({
    where: { event_id: context.eventId, is_deleted: 0, user_id: { not: null } },
    select: { user_id: true, name: true, first_name: true, last_name: true, email: true },
    orderBy: { id: "asc" },
  });

  const byUser = new Map<number, ActivityUserOption>();
  for (const r of rows as any[]) {
    if (!r.user_id || byUser.has(r.user_id)) continue;
    const name =
      (r.name ?? "").trim() ||
      `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim() ||
      r.email ||
      `User #${r.user_id}`;
    byUser.set(r.user_id, { userId: r.user_id, label: r.email ? `${name} (${r.email})` : name });
  }

  return [...byUser.values()].sort((a, b) => a.label.localeCompare(b.label));
}

/** "resources_download" -> "Resources Download", matching the legacy ucwords/str_replace pair. */
function humanise(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

interface RawActivityRow {
  id: number;
  user_id: number | null;
  created_on: Date | string | null;
  post_action_type: string | null;
  post_asset_id: number | null;
  post_layout_id: number | null;
  nav_clicked_title: string | null;
  spot_type: string | null;
  spot_id: number | null;
  exhibitor_id: number | null;
}

/**
 * A page of activity, newest first.
 *
 * ORDERING differs from the legacy on purpose: it does `order by created_on` (oldest first), so
 * page 1 of a long-running event shows activity from months ago and "Load More" walks slowly
 * forwards. A report is read to find out what happened recently, so this returns newest first.
 *
 * BATCHED LOOKUPS, also on purpose. The legacy resolves names inside the row loop — a query per
 * row for the user, and more for exhibitors and assets. At 10 rows that is up to ~30 round trips
 * per page. Here each kind of reference is collected across the whole page and fetched once.
 */
export async function getActivityFeed(
  context: EventMemberContext,
  filters: ActivityFilters = {}
): Promise<ActivityPage> {
  if (!canManageLobby(context)) return { entries: [], hasMore: false, available: true };
  if (!(await activityTableExists())) return { entries: [], hasMore: false, available: false };

  const limit = Math.min(Math.max(filters.limit ?? ACTIVITY_PAGE_SIZE, 1), 100);
  const offset = Math.max(filters.offset ?? 0, 0);

  const conditions: string[] = ["event_id = $1"];
  const params: unknown[] = [context.eventId];

  if (filters.userId) {
    params.push(filters.userId);
    conditions.push(`user_id = $${params.length}`);
  }
  if (filters.from) {
    params.push(filters.from);
    conditions.push(`created_on::date >= $${params.length}::date`);
  }
  if (filters.to) {
    params.push(filters.to);
    conditions.push(`created_on::date <= $${params.length}::date`);
  }

  // One row beyond the page, purely to answer "is there more?" without a second COUNT query.
  params.push(limit + 1, offset);
  const sql =
    `SELECT id, user_id, created_on, post_action_type, post_asset_id, post_layout_id, ` +
    `nav_clicked_title, spot_type, spot_id, exhibitor_id ` +
    `FROM "${ACTIVITY_TABLE}" WHERE ${conditions.join(" AND ")} ` +
    `ORDER BY created_on DESC, id DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;

  let rows: RawActivityRow[] = [];
  try {
    rows = await prisma.$queryRawUnsafe<RawActivityRow[]>(sql, ...params);
  } catch (err) {
    // A column this query names may not exist on an older copy of the table. Report it as
    // unavailable rather than taking the page down with it.
    console.error("[eventActivityReport] activity query failed:", err);
    return { entries: [], hasMore: false, available: false };
  }

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  if (page.length === 0) return { entries: [], hasMore: false, available: true };

  const ids = <T,>(values: (T | null | undefined)[]) =>
    [...new Set(values.filter((v): v is T => v !== null && v !== undefined && v !== (0 as unknown as T)))];

  const userIds = ids(page.map((r) => r.user_id));
  const exhibitorIds = ids(page.map((r) => r.exhibitor_id));
  const layoutIds = ids(page.map((r) => r.post_layout_id));
  const assetIds = ids(page.map((r) => r.post_asset_id));
  const spotIds = ids(page.map((r) => (r.spot_type === "exhibitor_asset" ? r.spot_id : null)));

  const [users, exhibitors, layouts, assets, spots] = await Promise.all([
    userIds.length
      ? prisma.find_users.findMany({
          where: { id: { in: userIds } },
          select: { id: true, user_first_name: true, user_last_name: true },
        })
      : [],
    exhibitorIds.length
      ? prisma.find_event_exhibitor.findMany({
          where: { id: { in: exhibitorIds } },
          select: { id: true, name: true, business: true, stand_number: true },
        })
      : [],
    layoutIds.length
      ? prisma.find_event_lobby_child_layout_manager.findMany({
          where: { id: { in: layoutIds } },
          select: { id: true, title: true },
        })
      : [],
    assetIds.length
      ? prisma.find_event_lobby_layout_type_assets.findMany({
          where: { id: { in: assetIds } },
          select: { id: true, title: true, exhibitor_user_id: true },
        })
      : [],
    spotIds.length
      ? prisma.find_event_lobby_spots.findMany({
          where: { id: { in: spotIds } },
          select: { id: true, title: true, exhibitor_asset_id: true },
        })
      : [],
  ]);

  const userById = new Map<number, string>(
    (users as any[]).map((u) => [u.id, `${u.user_first_name ?? ""} ${u.user_last_name ?? ""}`.trim()])
  );
  const exhibitorById = new Map<number, any>((exhibitors as any[]).map((e) => [e.id, e]));
  const layoutById = new Map<number, string>((layouts as any[]).map((l) => [l.id, l.title ?? ""]));
  const assetById = new Map<number, any>((assets as any[]).map((a) => [a.id, a]));
  const spotById = new Map<number, any>((spots as any[]).map((s) => [s.id, s]));

  /*
   * An exhibitor_asset row names a SPOT, the spot names an ASSET, and the asset names the
   * exhibitor's USER — so the exhibitor for those rows can only be resolved after the spots and
   * assets are in hand. Hence this second, smaller round trip rather than folding it above.
   */
  const assetOwnerUserIds = ids(
    page.map((r) => {
      if (r.spot_type !== "exhibitor_asset" || !r.spot_id) return null;
      const spot = spotById.get(r.spot_id);
      const asset = spot?.exhibitor_asset_id ? assetById.get(spot.exhibitor_asset_id) : null;
      return asset?.exhibitor_user_id ?? null;
    })
  ).concat(
    ids(
      page.map((r) =>
        r.post_action_type === "resources_download" && r.post_asset_id
          ? assetById.get(r.post_asset_id)?.exhibitor_user_id ?? null
          : null
      )
    )
  );

  const ownerExhibitors = assetOwnerUserIds.length
    ? await prisma.find_event_exhibitor.findMany({
        where: { event_id: context.eventId, user_id: { in: [...new Set(assetOwnerUserIds)] } },
        select: { id: true, user_id: true, name: true, business: true, stand_number: true },
      })
    : [];
  const exhibitorByUserId = new Map<number, any>((ownerExhibitors as any[]).map((e) => [e.user_id, e]));

  const boothLabel = (ex: any) =>
    ex ? `${ex.business ?? ""}${ex.name ? ` (${ex.name})` : ""}`.trim() : "an exhibitor";

  const entries: ActivityEntry[] = page.map((row) => {
    const userName = row.user_id ? userById.get(row.user_id) || `User #${row.user_id}` : "Someone";
    let description = "did something in the lobby";
    let highlight: string | null = null;

    /*
     * Order matters and mirrors the legacy's precedence. The legacy APPENDS every matching
     * branch, which is why its output occasionally reads as two sentences run together; each row
     * describes one interaction, so the most specific match wins here instead.
     */
    if (row.nav_clicked_title) {
      highlight = humanise(row.nav_clicked_title);
      description = `Clicked on ${highlight} in Footer Area`;
    } else if (row.spot_type === "exhibitor" && row.exhibitor_id) {
      const ex = exhibitorById.get(row.exhibitor_id);
      highlight = boothLabel(ex);
      description = `Visited Exhibitor Booth of ${highlight}${
        ex?.stand_number ? ` with Stand No: ${ex.stand_number}` : ""
      }`;
    } else if (row.spot_type === "exhibitor_asset" && row.spot_id) {
      const spot = spotById.get(row.spot_id);
      const asset = spot?.exhibitor_asset_id ? assetById.get(spot.exhibitor_asset_id) : null;
      const ex = asset?.exhibitor_user_id ? exhibitorByUserId.get(asset.exhibitor_user_id) : null;
      highlight = spot?.title || "an asset";
      description = `Clicked on ${highlight} in Exhibitor Booth of ${boothLabel(ex)}${
        ex?.stand_number ? ` with Stand No: ${ex.stand_number}` : ""
      }`;
    } else if (row.post_action_type === "resources_download" && row.post_asset_id) {
      const asset = assetById.get(row.post_asset_id);
      const ex = asset?.exhibitor_user_id ? exhibitorByUserId.get(asset.exhibitor_user_id) : null;
      highlight = asset?.title || "a resource";
      description = `Downloaded ${highlight} from ${boothLabel(ex)} Booth`;
    } else if (row.post_action_type === "layout" && row.post_layout_id) {
      highlight = layoutById.get(row.post_layout_id) || `Zone #${row.post_layout_id}`;
      description = `Navigated to ${highlight}`;
    } else if (row.post_action_type) {
      highlight = humanise(row.post_action_type);
      description = `Clicked on ${highlight}`;
    }

    const at =
      row.created_on instanceof Date
        ? row.created_on.toISOString()
        : new Date(row.created_on ?? Date.now()).toISOString();

    return { id: row.id, at, userId: row.user_id, userName, description, highlight };
  });

  return { entries, hasMore, available: true };
}
