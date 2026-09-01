import { prisma } from "@/lib/prisma";
import type { EventMemberContext } from "@/lib/services/eventAccess";
import type { EventLobbyAgendaTrackInput } from "@/lib/validations/eventLobbyAgendaTrack";
import type { EventLobbyAgendaItemInput } from "@/lib/validations/eventLobbyAgendaItem";

export interface AgendaTrackRow {
  id: number;
  title: string;
  description: string;
  agendaType: string | null;
  status: string;
  agendaHallType: string | null;
  sessionMst: string | null;
  bufferTimeMst: string | null;
  defaultSessionTime: string | null;
  eventLayoutId: number | null;
  /** Resolved name of event_layout_id, from the parent lobby or one of its children. */
  layoutTitle: string | null;
  timezone: string | null;
  path: string | null;
  /** How many find_event_lobby_agenda_items rows hang off this agenda. */
  sessionCount: number;
}

const TRACK_SELECT = {
  id: true,
  title: true,
  description: true,
  agenda_type: true,
  status: true,
  agenda_hall_type: true,
  session_mst: true,
  buffer_time_mst: true,
  default_session_time: true,
  event_layout_id: true,
  timezone: true,
  path: true,
} as const;

function toTrackRow(
  row: any,
  extras: { layoutTitle?: string | null; sessionCount?: number } = {}
): AgendaTrackRow {
  return {
    id: row.id,
    title: row.title ?? "",
    description: row.description ?? "",
    agendaType: row.agenda_type,
    status: row.status ?? "active",
    agendaHallType: row.agenda_hall_type ?? null,
    sessionMst: row.session_mst ?? null,
    bufferTimeMst: row.buffer_time_mst ?? null,
    defaultSessionTime: row.default_session_time ?? null,
    eventLayoutId: row.event_layout_id ?? null,
    layoutTitle: extras.layoutTitle ?? null,
    timezone: row.timezone ?? null,
    path: row.path ?? null,
    sessionCount: extras.sessionCount ?? 0,
  };
}

/**
 * The track/hall picker in the schedule builder.
 *
 * `eventLayoutId` is OPTIONAL, and omitting it is the normal case. The legacy list query is
 * simply `select * from find_event_lobby_agenda where event_id = ?` — no layout filter — and the
 * Add form's Layout dropdown offers the parent lobby AND every child layout, so agendas
 * routinely carry a child's id. Filtering on the parent lobby id alone therefore hid every
 * agenda attached to a child layout, which is why this page could come up empty on an event
 * that plainly had halls configured.
 */
export async function getAgendaTracks(
  context: EventMemberContext,
  eventLayoutId?: number
): Promise<AgendaTrackRow[]> {
  if (context.role !== "organiser") return [];
  const rows = await prisma.find_event_lobby_agenda.findMany({
    where: {
      event_id: context.eventId,
      ...(eventLayoutId ? { event_layout_id: eventLayoutId } : {}),
    },
    orderBy: { title: "asc" },
    select: TRACK_SELECT,
  });
  return rows.map((row: any) => toTrackRow(row));
}

/**
 * The Lobby Agenda list view — every agenda on the event, in insertion order, enriched with the
 * session count and the layout name so the table can show what each row is attached to.
 * Equivalent to the legacy `$_GET['data'] == 'getData'` JSON feed.
 */
export async function getEventAgendas(context: EventMemberContext): Promise<AgendaTrackRow[]> {
  if (context.role !== "organiser") return [];

  const rows = await prisma.find_event_lobby_agenda.findMany({
    where: { event_id: context.eventId },
    orderBy: { id: "asc" },
    select: TRACK_SELECT,
  });
  if (rows.length === 0) return [];

  const [counts, layouts] = await Promise.all([
    prisma.find_event_lobby_agenda_items.groupBy({
      by: ["agenda_id"],
      where: { event_id: context.eventId, agenda_id: { in: rows.map((r: any) => r.id) } },
      _count: { _all: true },
    }),
    getAgendaLayoutOptions(context),
  ]);

  const countByAgenda = new Map<number, number>(
    counts.map((c: any) => [c.agenda_id, c._count?._all ?? 0])
  );
  const layoutTitleById = new Map<number, string>(layouts.map((l) => [l.id, l.title]));

  return rows.map((row: any) =>
    toTrackRow(row, {
      sessionCount: countByAgenda.get(row.id) ?? 0,
      layoutTitle: row.event_layout_id ? layoutTitleById.get(row.event_layout_id) ?? null : null,
    })
  );
}

export interface AgendaLayoutOption {
  id: number;
  title: string;
  isChild: boolean;
}

/**
 * Options for the agenda form's Layout dropdown: the parent lobby first, then its children —
 * the same set the legacy form built from find_event_lobby_layout_manager +
 * find_event_lobby_child_layout_manager.
 */
export async function getAgendaLayoutOptions(context: EventMemberContext): Promise<AgendaLayoutOption[]> {
  if (context.role !== "organiser") return [];

  const [parents, children] = await Promise.all([
    prisma.find_event_lobby_layout_manager.findMany({
      where: { event_id: context.eventId },
      orderBy: { id: "asc" },
      select: { id: true, title: true },
    }),
    prisma.find_event_lobby_child_layout_manager.findMany({
      where: { event_id: context.eventId },
      orderBy: [{ sequence: "asc" }, { id: "asc" }],
      select: { id: true, title: true },
    }),
  ]);

  return [
    ...parents.map((p: any) => ({ id: p.id, title: p.title ?? `Lobby #${p.id}`, isChild: false })),
    ...children.map((c: any) => ({ id: c.id, title: c.title ?? `Child #${c.id}`, isChild: true })),
  ];
}

/**
 * `fallbackLayoutId` is used only when the caller did not pick a layout — event_layout_id is
 * NOT NULL, and the quick-add flow in the schedule builder posts a title and nothing else.
 */
export async function createAgendaTrack(
  context: EventMemberContext,
  input: EventLobbyAgendaTrackInput,
  fallbackLayoutId: number
) {
  if (context.role !== "organiser") return null;
  return prisma.find_event_lobby_agenda.create({
    data: {
      event_id: context.eventId,
      event_layout_id: input.event_layout_id ?? fallbackLayoutId,
      user_id: context.userId,
      title: input.title,
      description: input.description || "",
      agenda_type: input.agenda_type || null,
      session_mst: input.session_mst || null,
      buffer_time_mst: input.buffer_time_mst || null,
      agenda_hall_type: input.agenda_hall_type || null,
      timezone: input.timezone || null,
      status: input.status,
      updated_on: new Date(),
    },
    select: { id: true },
  });
}

/**
 * "Duplicate" in the list's Manage column. Copies the agenda row only — NOT its sessions, which
 * carry dates and time-slot assignments that would collide with the original's. The new row
 * records where it came from in `copied_agenda_id` and comes back as Pending, so a half-built
 * copy cannot appear live in the lobby before someone has looked at it.
 */
export async function duplicateAgendaTrack(context: EventMemberContext, id: number) {
  if (context.role !== "organiser") return null;

  const source = await prisma.find_event_lobby_agenda.findFirst({
    where: { id, event_id: context.eventId },
  });
  if (!source) return null;

  return prisma.find_event_lobby_agenda.create({
    data: {
      event_id: context.eventId,
      event_layout_id: source.event_layout_id,
      user_id: context.userId,
      listing_id: source.listing_id,
      title: `${source.title} (Copy)`.slice(0, 255),
      description: source.description ?? "",
      agenda_type: source.agenda_type,
      zoom_link: source.zoom_link,
      session_mst: source.session_mst,
      buffer_time_mst: source.buffer_time_mst,
      agenda_hall_type: source.agenda_hall_type,
      default_session_time: source.default_session_time,
      path: source.path,
      timezone: source.timezone,
      status: "pending",
      copied_agenda_id: source.id,
      updated_on: new Date(),
    },
    select: { id: true },
  });
}

export async function updateAgendaTrack(context: EventMemberContext, id: number, input: EventLobbyAgendaTrackInput) {
  if (context.role !== "organiser") return { count: 0 };
  return prisma.find_event_lobby_agenda.updateMany({
    where: { id, event_id: context.eventId },
    data: {
      title: input.title,
      description: input.description || "",
      agenda_type: input.agenda_type || null,
      session_mst: input.session_mst || null,
      buffer_time_mst: input.buffer_time_mst || null,
      agenda_hall_type: input.agenda_hall_type || null,
      timezone: input.timezone || null,
      // Only move the agenda to a different layout when one was actually chosen — the quick-add
      // form in the schedule builder does not include the field, and event_layout_id is NOT NULL.
      ...(input.event_layout_id ? { event_layout_id: input.event_layout_id } : {}),
      status: input.status,
      updated_on: new Date(),
    },
  });
}

export async function deleteAgendaTrack(context: EventMemberContext, id: number) {
  if (context.role !== "organiser") return { count: 0 };
  // Sessions under this track would otherwise be orphaned (agenda_id is required, not nullable).
  const itemCount = await prisma.find_event_lobby_agenda_items.count({ where: { agenda_id: id, event_id: context.eventId } });
  if (itemCount > 0) return { count: 0, error: "blocked" as const };
  return prisma.find_event_lobby_agenda.deleteMany({ where: { id, event_id: context.eventId } });
}

export interface AgendaItemRow {
  id: number;
  agendaId: number;
  agendaTitle: string;
  title: string;
  description: string;
  sessionDate: string; // yyyy-mm-dd
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  speakerId: number | null;
  speakerName: string | null;
  videoType: string;
  meetingId: string | null;
  meetingPassword: string | null;
  videoLink: string | null;
  status: string;
  tentativeSchedule: boolean;
}

const ITEM_SELECT = {
  id: true,
  agenda_id: true,
  title: true,
  description: true,
  session_date: true,
  start_date_time: true,
  end_date_time: true,
  speaker_id: true,
  speaker_name: true,
  video_type: true,
  meeting_id: true,
  meeting_password: true,
  video_link: true,
  status: true,
  tentative_schedule: true,
} as const;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toTimeKey(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toItemRow(row: any, agendaTitleById: Map<number, string>): AgendaItemRow {
  return {
    id: row.id,
    agendaId: row.agenda_id,
    agendaTitle: agendaTitleById.get(row.agenda_id) ?? "Untitled Track",
    title: row.title ?? "",
    description: row.description ?? "",
    sessionDate: row.session_date ? toDateKey(row.session_date) : toDateKey(row.start_date_time),
    startTime: toTimeKey(row.start_date_time),
    endTime: toTimeKey(row.end_date_time),
    speakerId: row.speaker_id,
    speakerName: row.speaker_name,
    videoType: row.video_type ?? "",
    meetingId: row.meeting_id,
    meetingPassword: row.meeting_password,
    videoLink: row.video_link,
    status: row.status ?? "active",
    tentativeSchedule: !!row.tentative_schedule,
  };
}

/** Mirrors members/event_lobby_agenda_items.php's list — every scheduled session across this
 * lobby's tracks, for this organiser's event. */
export async function getAgendaItems(context: EventMemberContext, eventLayoutId?: number): Promise<AgendaItemRow[]> {
  if (context.role !== "organiser") return [];

  const tracks = await prisma.find_event_lobby_agenda.findMany({
    where: {
      event_id: context.eventId,
      ...(eventLayoutId ? { event_layout_id: eventLayoutId } : {}),
    },
    select: { id: true, title: true },
  });
  if (tracks.length === 0) return [];

  const agendaTitleById = new Map<number, string>(tracks.map((t: any) => [t.id, t.title ?? "Untitled Track"]));
  const trackIds = tracks.map((t: any) => t.id);

  const rows = await prisma.find_event_lobby_agenda_items.findMany({
    where: { event_id: context.eventId, agenda_id: { in: trackIds } },
    orderBy: [{ session_date: "asc" }, { start_date_time: "asc" }],
    select: ITEM_SELECT,
  });

  return rows.map((row: any) => toItemRow(row, agendaTitleById));
}

function combineDateTime(sessionDate: string, time: string): Date {
  return new Date(`${sessionDate}T${time}:00`);
}

/**
 * `layout_type_setup_id` and `linked_profile_user_id` are legacy NOT NULL columns on
 * find_event_lobby_agenda_items with no dedicated selector surfaced on this page (they aren't
 * referenced anywhere else in the app either). We default them to the lobby's own layout id and
 * the organiser's user id respectively, rather than leaving the insert to fail on a required
 * column with nothing meaningful to put there yet.
 */
export async function createAgendaItem(
  context: EventMemberContext,
  eventLayoutId: number,
  input: EventLobbyAgendaItemInput
) {
  if (context.role !== "organiser") return null;
  return prisma.find_event_lobby_agenda_items.create({
    data: {
      event_id: context.eventId,
      agenda_id: input.agenda_id,
      title: input.title,
      description: input.description || "",
      session_date: new Date(`${input.session_date}T00:00:00`),
      start_date_time: combineDateTime(input.session_date, input.start_time),
      end_date_time: combineDateTime(input.session_date, input.end_time),
      speaker_id: input.speaker_id || null,
      speaker_name: input.speaker_name || null,
      video_type: input.video_type || null,
      meeting_id: input.meeting_id || null,
      meeting_password: input.meeting_password || null,
      video_link: input.video_link || null,
      status: input.status,
      tentative_schedule: input.tentative_schedule,
      layout_type_setup_id: eventLayoutId,
      linked_profile_user_id: context.userId,
      user_id: context.userId,
      updated_on: new Date(),
    },
    select: { id: true },
  });
}

export async function updateAgendaItem(context: EventMemberContext, id: number, input: EventLobbyAgendaItemInput) {
  if (context.role !== "organiser") return { count: 0 };
  return prisma.find_event_lobby_agenda_items.updateMany({
    where: { id, event_id: context.eventId },
    data: {
      agenda_id: input.agenda_id,
      title: input.title,
      description: input.description || "",
      session_date: new Date(`${input.session_date}T00:00:00`),
      start_date_time: combineDateTime(input.session_date, input.start_time),
      end_date_time: combineDateTime(input.session_date, input.end_time),
      speaker_id: input.speaker_id || null,
      speaker_name: input.speaker_name || null,
      video_type: input.video_type || null,
      meeting_id: input.meeting_id || null,
      meeting_password: input.meeting_password || null,
      video_link: input.video_link || null,
      status: input.status,
      tentative_schedule: input.tentative_schedule,
      updated_on: new Date(),
    },
  });
}

export async function deleteAgendaItem(context: EventMemberContext, id: number) {
  if (context.role !== "organiser") return { count: 0 };
  return prisma.find_event_lobby_agenda_items.deleteMany({ where: { id, event_id: context.eventId } });
}

export interface AssignableSpeakerOption {
  id: number;
  name: string;
}

/** Active speakers for this event, for the optional speaker picker on a session. */
export async function getAgendaAssignableSpeakers(context: EventMemberContext): Promise<AssignableSpeakerOption[]> {
  if (context.role !== "organiser") return [];
  const speakers = await prisma.find_speakers.findMany({
    where: { event_id: context.eventId, status: "active" },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  return speakers.map((s: any) => ({ id: s.id, name: s.name }));
}
