import { prisma } from "@/lib/prisma";
import { canManageLobby } from "@/lib/services/eventAccess";
import type { EventMemberContext } from "@/lib/services/eventAccess";
import type { EventLobbySpotInput } from "@/lib/validations/eventLobbySpot";

export interface LobbySpotRow {
  id: number;
  title: string;
  spotType: string;
  redirectionPath: string | null;
  x: number;
  y: number;
  /** Percentage size, when this spot is a sized panel rather than a point. Null for markers. */
  width: number | null;
  height: number | null;
  /** Rotation in RADIANS, as the legacy builder stores and renders it (`rotate(0rad)`). */
  angle: number;
  /** Artwork shown inside a sized panel — the hall screens, etc. */
  imageUrl: string | null;
}

const SELECT_FIELDS = {
  id: true,
  title: true,
  spot_type: true,
  post_action_path: true,
  x_coordinates: true,
  y_coordinates: true,
  width: true,
  height: true,
  dimension: true,
  video_url: true,
} as const;

/**
 * A spot's size, in percentages of the background.
 *
 * The legacy builder writes the whole geometry as a JSON blob in `dimension`
 * ({x, y, width, height, angle, ...}) AND mirrors width/height into their own columns, but not
 * consistently — plenty of rows carry the blob with the columns left null. Reading the blob
 * first and falling back to the columns is what makes both shapes work.
 *
 * A point spot (a plain marker) has no width/height in either place; that is the signal to draw
 * a dot rather than a panel, so `null` here is meaningful and must not be defaulted to 0.
 */
function parseSize(s: any): { width: number | null; height: number | null; angle: number } {
  let raw: any = null;
  if (typeof s.dimension === "string" && s.dimension.trim() !== "") {
    try {
      raw = JSON.parse(s.dimension);
    } catch {
      raw = null;
    }
  } else if (s.dimension && typeof s.dimension === "object") {
    raw = s.dimension;
  }

  const pick = (fromBlob: unknown, fromColumn: unknown): number | null => {
    for (const candidate of [fromBlob, fromColumn]) {
      if (candidate === null || candidate === undefined || candidate === "") continue;
      const n = Number(candidate);
      if (Number.isFinite(n) && n > 0) return n;
    }
    return null;
  };

  // Radians, not degrees — the legacy writes `transform: rotate(<angle>rad)` straight from this
  // number. 0 is both the common case and a safe default, so a missing/garbage value is not an
  // error worth surfacing.
  const angle = Number(raw?.angle);

  return {
    width: pick(raw?.width, s.width),
    height: pick(raw?.height, s.height),
    angle: Number.isFinite(angle) ? angle : 0,
  };
}

function toRow(s: any): LobbySpotRow {
  const { width, height, angle } = parseSize(s);
  return {
    id: s.id,
    title: s.title ?? "",
    spotType: s.spot_type ?? "info",
    redirectionPath: s.post_action_path,
    x: Number(s.x_coordinates ?? 0),
    y: Number(s.y_coordinates ?? 0),
    width,
    height,
    angle,
    // `video_url` is where the legacy builder puts ANY file uploaded onto a spot — see
    // event_lobby_spots.php, which copies the upload to LOBBY_PATH and writes the filename here
    // regardless of type. Reusing it keeps one column for "this spot's own media" instead of
    // adding a second that the legacy pages would not know to read.
    imageUrl: s.video_url ?? null,
  };
}

interface LobbyScope {
  eventLayoutId: number;
  childId?: number | null;
}

function scopeWhere(context: EventMemberContext, scope: LobbyScope) {
  return {
    event_id: context.eventId,
    event_layout_id: scope.eventLayoutId,
    event_layout_child_id: scope.childId ?? null,
  };
}

/**
 * Mirrors members/event_lobby_spots.php's spot listing — a simplified generic hotspot
 * placer over the lobby background image (see eventLobbySpot.ts validation for what's
 * intentionally not ported from the legacy multi-type drag/drop builder).
 */
export async function getSpots(context: EventMemberContext, scope: LobbyScope): Promise<LobbySpotRow[]> {
  if (!canManageLobby(context)) return [];
  const rows = await prisma.find_event_lobby_spots.findMany({
    where: scopeWhere(context, scope),
    orderBy: { id: "asc" },
    select: SELECT_FIELDS,
  });
  return rows.map(toRow);
}

/**
 * Persist a spot's geometry in BOTH shapes the platform uses.
 *
 * The width/height columns are what this app reads back, but the legacy pages read the
 * `dimension` JSON blob, and event_lobby_spots.php rebuilds every spot from it on save. Writing
 * only the columns would make a spot created here look sizeless to the old builder — and then
 * silently lose its size the next time someone saved that zone over there.
 */
function sizeData(input: { x: number; y: number; width?: number; height?: number }) {
  if (!input.width || !input.height) return {};
  return {
    width: String(input.width),
    height: String(input.height),
    dimension: JSON.stringify({
      is_video: null,
      x: input.x,
      y: input.y,
      width: input.width,
      height: input.height,
      angle: 0,
    }),
  };
}

export async function createSpot(context: EventMemberContext, scope: LobbyScope, input: EventLobbySpotInput) {
  if (!canManageLobby(context)) return null;
  return prisma.find_event_lobby_spots.create({
    data: {
      event_id: context.eventId,
      event_layout_id: scope.eventLayoutId,
      event_layout_child_id: scope.childId ?? null,
      user_id: context.userId,
      title: input.title || null,
      spot_type: input.spot_type,
      post_action_type: input.redirection_path ? "external_link" : null,
      post_action_path: input.redirection_path || null,
      x_coordinates: String(input.x),
      y_coordinates: String(input.y),
      ...sizeData(input),
      updated_on: new Date(),
    },
    select: { id: true },
  });
}

export async function updateSpot(context: EventMemberContext, id: number, input: Partial<EventLobbySpotInput>) {
  if (!canManageLobby(context)) return { count: 0 };
  const data: Record<string, unknown> = { updated_on: new Date() };
  if (input.title !== undefined) data.title = input.title || null;
  if (input.spot_type !== undefined) data.spot_type = input.spot_type;
  if (input.redirection_path !== undefined) {
    data.post_action_path = input.redirection_path || null;
    data.post_action_type = input.redirection_path ? "external_link" : null;
  }
  if (input.x !== undefined) data.x_coordinates = String(input.x);
  if (input.y !== undefined) data.y_coordinates = String(input.y);
  if (input.width !== undefined || input.height !== undefined) {
    Object.assign(data, sizeData({ x: input.x ?? 0, y: input.y ?? 0, width: input.width, height: input.height }));
  }

  return prisma.find_event_lobby_spots.updateMany({
    where: { id, event_id: context.eventId },
    data,
  });
}

/**
 * Attach an uploaded file to a spot.
 *
 * Scoped to the caller's event, so a spot id from another event cannot be repointed by guessing
 * the number — the `event_id` in the where clause is the whole protection here.
 */
export async function setSpotImage(context: EventMemberContext, id: number, url: string | null) {
  if (!canManageLobby(context)) return { count: 0 };
  return prisma.find_event_lobby_spots.updateMany({
    where: { id, event_id: context.eventId },
    data: { video_url: url, updated_on: new Date() },
  });
}

export async function deleteSpot(context: EventMemberContext, id: number) {
  if (!canManageLobby(context)) return { count: 0 };
  return prisma.find_event_lobby_spots.deleteMany({ where: { id, event_id: context.eventId } });
}
