import { prisma } from "@/lib/prisma";
import { canManageLobby } from "@/lib/services/eventAccess";
import type { EventMemberContext } from "@/lib/services/eventAccess";
import type { EventLobbyInput } from "@/lib/validations/eventLobby";

export interface LobbyRow {
  id: number;
  title: string;
  splashImage: string | null;
  image: string | null;
  videoPath: string | null;
  playLobbyVideo: boolean;
  description: string | null;
  agendaWelcomeMessage: string | null;
  status: string;
  chatScript: string | null;
  spotColor: string | null;
  spotSize: number;
  createdOn: Date;
}

const SELECT_FIELDS = {
  id: true,
  title: true,
  splash_image: true,
  image: true,
  video_path: true,
  play_lobby_video: true,
  description: true,
  agenda_welcome_message: true,
  status: true,
  chat_script: true,
  spot_color: true,
  spot_size: true,
  created_on: true,
} as const;

function toRow(l: any): LobbyRow {
  return {
    id: l.id,
    title: l.title ?? "",
    splashImage: l.splash_image,
    image: l.image,
    videoPath: l.video_path,
    playLobbyVideo: l.play_lobby_video === 1,
    description: l.description,
    agendaWelcomeMessage: l.agenda_welcome_message,
    status: l.status ?? "enabled",
    chatScript: l.chat_script,
    spotColor: l.spot_color,
    spotSize: l.spot_size ?? 5,
    createdOn: l.created_on,
  };
}

/**
 * Mirrors the `select id from find_event_lobby_layout_manager where event_id=?` lookup that
 * members/event_lobby_layout_child.php and event_lobby_spots.php both do to resolve "the"
 * lobby layout for an event (this app assumes a single primary layout per event, same as the
 * legacy pages' single-row assumption).
 */
export async function getPrimaryLobby(context: EventMemberContext): Promise<LobbyRow | null> {
  if (!canManageLobby(context)) return null;
  const row = await prisma.find_event_lobby_layout_manager.findFirst({
    where: { event_id: context.eventId },
    orderBy: { id: "asc" },
    select: SELECT_FIELDS,
  });
  return row ? toRow(row) : null;
}

/**
 * Same lookup as getPrimaryLobby(), but ungated — for the actual public /virtual-event/[slug]
 * lobby page that any logged-in visitor/exhibitor/speaker/organiser reaches, not just an
 * organiser managing it from the CP-side members area. getPrimaryLobby() intentionally stays
 * organiser-only (it's used by member-only management pages); this is its public counterpart.
 */
export async function getPublicLobby(eventId: number): Promise<LobbyRow | null> {
  const row = await prisma.find_event_lobby_layout_manager.findFirst({
    where: { event_id: eventId, status: "enabled" },
    orderBy: { id: "asc" },
    select: SELECT_FIELDS,
  });
  return row ? toRow(row) : null;
}

/** Mirrors members/event_lobby_layout_manager.php's list view — organiser-only lobby layouts for this event. */
export async function getLobbies(context: EventMemberContext): Promise<LobbyRow[]> {
  if (!canManageLobby(context)) return [];
  const rows = await prisma.find_event_lobby_layout_manager.findMany({
    where: { event_id: context.eventId },
    orderBy: { id: "desc" },
    select: SELECT_FIELDS,
  });
  return rows.map(toRow);
}

export async function createLobby(context: EventMemberContext, input: EventLobbyInput) {
  if (!canManageLobby(context)) return null;
  return prisma.find_event_lobby_layout_manager.create({
    data: {
      event_id: context.eventId,
      user_id: context.userId,
      title: input.title,
      splash_image: input.splash_image || null,
      image: input.image || null,
      video_path: input.video_path || null,
      play_lobby_video: input.play_lobby_video ? 1 : 0,
      description: input.description || null,
      agenda_welcome_message: input.agenda_welcome_message || null,
      status: input.status,
      chat_script: input.chat_script || null,
      spot_color: input.spot_color || null,
      spot_size: input.spot_size,
      updated_on: new Date(),
    },
    select: { id: true },
  });
}

export async function updateLobby(context: EventMemberContext, id: number, input: EventLobbyInput) {
  if (!canManageLobby(context)) return { count: 0 };
  return prisma.find_event_lobby_layout_manager.updateMany({
    where: { id, event_id: context.eventId },
    data: {
      title: input.title,
      splash_image: input.splash_image || null,
      image: input.image || null,
      video_path: input.video_path || null,
      play_lobby_video: input.play_lobby_video ? 1 : 0,
      description: input.description || null,
      agenda_welcome_message: input.agenda_welcome_message || null,
      status: input.status,
      chat_script: input.chat_script || null,
      spot_color: input.spot_color || null,
      spot_size: input.spot_size,
      updated_on: new Date(),
    },
  });
}

export async function deleteLobby(context: EventMemberContext, id: number) {
  if (!canManageLobby(context)) return { count: 0 };
  return prisma.find_event_lobby_layout_manager.deleteMany({ where: { id, event_id: context.eventId } });
}

export interface LobbyTemplateOption {
  id: number;
  title: string;
  layoutType: string;
  image: string | null;
  description: string | null;
}

/** Mirrors the template picker `Lobby->importLobby()` reads from — find_event_lobby_templates. */
export async function getLobbyTemplates(): Promise<LobbyTemplateOption[]> {
  const rows = await prisma.find_event_lobby_templates.findMany({
    where: { status: "enabled" },
    orderBy: { title: "asc" },
    select: { id: true, title: true, layout_type: true, image: true, description: true },
  });
  return rows.map((t: any) => ({
    id: t.id,
    title: t.title ?? `Template #${t.id}`,
    layoutType: t.layout_type,
    image: t.image,
    description: t.description,
  }));
}

/**
 * Mirrors the `action=import` branch of members/event_lobby_layout_manager.php
 * (Lobby->importLobby($event_id)) — clones a shared find_event_lobby_templates row into a
 * fresh find_event_lobby_layout_manager row scoped to this organiser's event.
 */
export async function importLobbyFromTemplate(context: EventMemberContext, templateId: number) {
  if (!canManageLobby(context)) return null;
  const template = await prisma.find_event_lobby_templates.findUnique({ where: { id: templateId } });
  if (!template) return null;

  return prisma.find_event_lobby_layout_manager.create({
    data: {
      event_id: context.eventId,
      user_id: context.userId,
      title: template.title || "Imported Lobby",
      image: template.image || null,
      description: template.description || null,
      status: "enabled",
      spot_size: 5,
      updated_on: new Date(),
    },
    select: { id: true },
  });
}
