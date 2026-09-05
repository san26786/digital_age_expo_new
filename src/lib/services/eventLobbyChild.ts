import { prisma } from "@/lib/prisma";
import { canManageLobby } from "@/lib/services/eventAccess";
import type { EventMemberContext } from "@/lib/services/eventAccess";
import type { EventLobbyChildInput } from "@/lib/validations/eventLobbyChild";

export interface ChildLobbyRow {
  id: number;
  title: string;
  layoutType: string;
  image: string | null;
  helpImage: string | null;
  description: string | null;
  sequence: number | null;
  status: string;
  createdOn: Date;
}

const SELECT_FIELDS = {
  id: true,
  title: true,
  layout_type: true,
  image: true,
  help_image: true,
  description: true,
  sequence: true,
  status: true,
  created_on: true,
} as const;

function toRow(c: any): ChildLobbyRow {
  return {
    id: c.id,
    title: c.title ?? "",
    layoutType: c.layout_type ?? "",
    image: c.image,
    helpImage: c.help_image,
    description: c.description,
    sequence: c.sequence,
    status: c.status ?? "enabled",
    createdOn: c.created_on,
  };
}

export async function getChildLobbyById(context: EventMemberContext, id: number): Promise<ChildLobbyRow | null> {
  if (!canManageLobby(context)) return null;
  const row = await prisma.find_event_lobby_child_layout_manager.findFirst({
    where: { id, event_id: context.eventId },
    select: SELECT_FIELDS,
  });
  return row ? toRow(row) : null;
}

/** Mirrors members/event_lobby_layout_child.php's list — child layouts (zones) under an event's primary lobby. */
export async function getChildLobbies(context: EventMemberContext, eventLayoutId: number): Promise<ChildLobbyRow[]> {
  if (!canManageLobby(context)) return [];
  const rows = await prisma.find_event_lobby_child_layout_manager.findMany({
    where: { event_layout_id: eventLayoutId, event_id: context.eventId },
    orderBy: { id: "desc" },
    select: SELECT_FIELDS,
  });
  return rows.map(toRow);
}

/** Mirrors the `action=change_auditiorium_link` branch of event_lobby_layout_manager.php, which
 * resolves the event's single "auditorium" zone to jump straight to its spot editor.
 *
 * SCOPED BY event_layout_id, NOT event_id. The legacy lookup is
 * `WHERE event_layout_id=? AND layout_type='auditorium'`, and copying our usual
 * `event_id: context.eventId` filter onto it quietly breaks on migrated data: these lobby tables
 * carry rows whose event_id was never stamped. The column is a non-null Int here, so the
 * degenerate value is 0 — event_lobby_spots.php ships a repair statement for exactly that case
 * on its own table —
 *
 *     UPDATE find_event_lobby_spots SET event_id=? WHERE event_layout_id=? AND (event_id IS NULL OR event_id=0)
 *
 * A row like that still has the right event_layout_id, so it belongs to this event; requiring
 * event_id as well would return nothing and send the organiser to "no auditorium zone" instead
 * of the spot editor. The scoping is not weakened: eventLayoutId comes from getPrimaryLobby(),
 * which is already event-scoped and organiser-gated, so a child of that layout is by definition
 * a child of this event's lobby. Rows that DO carry an event_id must still match it, so a
 * mis-stamped row from another event cannot slip through. */
export async function getAuditoriumChildLobby(context: EventMemberContext, eventLayoutId: number): Promise<ChildLobbyRow | null> {
  if (!canManageLobby(context)) return null;
  const row = await prisma.find_event_lobby_child_layout_manager.findFirst({
    where: {
      event_layout_id: eventLayoutId,
      layout_type: "auditorium",
      OR: [{ event_id: context.eventId }, { event_id: 0 }],
    },
    orderBy: { id: "asc" },
    select: SELECT_FIELDS,
  });
  return row ? toRow(row) : null;
}

export async function createChildLobby(context: EventMemberContext, eventLayoutId: number, input: EventLobbyChildInput) {
  if (!canManageLobby(context)) return null;
  return prisma.find_event_lobby_child_layout_manager.create({
    data: {
      event_id: context.eventId,
      event_layout_id: eventLayoutId,
      user_id: context.userId,
      title: input.title,
      layout_type: input.layout_type,
      image: input.image || null,
      help_image: input.help_image || null,
      description: input.description || null,
      sequence: input.sequence ?? null,
      status: input.status,
      updated_on: new Date(),
    },
    select: { id: true },
  });
}

export async function updateChildLobby(context: EventMemberContext, id: number, input: EventLobbyChildInput) {
  if (!canManageLobby(context)) return { count: 0 };
  return prisma.find_event_lobby_child_layout_manager.updateMany({
    where: { id, event_id: context.eventId },
    data: {
      title: input.title,
      layout_type: input.layout_type,
      image: input.image || null,
      help_image: input.help_image || null,
      description: input.description || null,
      sequence: input.sequence ?? null,
      status: input.status,
      updated_on: new Date(),
    },
  });
}

export async function deleteChildLobby(context: EventMemberContext, id: number) {
  if (!canManageLobby(context)) return { count: 0 };
  return prisma.find_event_lobby_child_layout_manager.deleteMany({ where: { id, event_id: context.eventId } });
}

/** Mirrors Event_Lobby::copyChild() — duplicates a child layout row, only offered for exhibition/auditorium zones. */
export async function copyChildLobby(context: EventMemberContext, id: number) {
  if (!canManageLobby(context)) return null;
  const source = await prisma.find_event_lobby_child_layout_manager.findFirst({
    where: { id, event_id: context.eventId },
  });
  if (!source) return null;
  if (source.layout_type !== "exhibition" && source.layout_type !== "auditorium") return null;

  return prisma.find_event_lobby_child_layout_manager.create({
    data: {
      event_id: source.event_id,
      event_layout_id: source.event_layout_id,
      user_id: source.user_id,
      title: `${source.title ?? "Untitled"} (Copy)`,
      layout_type: source.layout_type,
      image: source.image,
      help_image: source.help_image,
      description: source.description,
      sequence: source.sequence,
      status: source.status,
      copied_child_id: source.id,
      updated_on: new Date(),
    },
    select: { id: true },
  });
}
