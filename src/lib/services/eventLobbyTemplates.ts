import { prisma } from "@/lib/prisma";
import type { EventMemberContext } from "@/lib/services/eventAccess";
import type {
  EventLobbyTemplateInput,
  LobbyTemplateColorInput,
} from "@/lib/validations/eventLobbyTemplate";

/**
 * ---------------------------------------------------------------------------
 * find_event_lobby_templates — port of members/event_lobby_templates.php
 * ---------------------------------------------------------------------------
 *
 * IMPORTANT SCOPE NOTE: this library is GLOBAL, not per-event. The legacy list is
 * `select * from find_event_lobby_templates` with no event filter, which is why an organiser on
 * event 1474 sees Auditorium Template 1, the Exhibition Hall templates and the stand templates —
 * they are the platform's shared catalogue, imported into an event by
 * eventLobby.importLobbyFromTemplate().
 *
 * Rows still carry event_id, stamped from whichever event created them, so `ownedByThisEvent`
 * lets the UI mark the ones this organiser added. Editing or deleting a row affects every event
 * that has not yet imported it — same as the legacy screen, and worth knowing.
 */

export interface LobbyTemplateColorRow {
  id: number;
  color: string;
  image: string | null;
}

export interface LobbyTemplateRow {
  id: number;
  title: string;
  layoutType: string;
  description: string | null;
  image: string | null;
  status: string;
  eventId: number | null;
  /** True when this row was created from the event currently being managed. */
  ownedByThisEvent: boolean;
  colors: LobbyTemplateColorRow[];
}

function toRow(row: any, contextEventId: number, colors: LobbyTemplateColorRow[]): LobbyTemplateRow {
  return {
    id: row.id,
    title: row.title ?? "",
    layoutType: row.layout_type ?? "",
    description: row.description ?? null,
    image: row.image ?? null,
    status: row.status ?? "enabled",
    eventId: row.event_id ?? null,
    ownedByThisEvent: row.event_id === contextEventId,
    colors,
  };
}

export async function listLobbyTemplates(context: EventMemberContext): Promise<LobbyTemplateRow[]> {
  if (context.role !== "organiser") return [];

  const rows = await prisma.find_event_lobby_templates.findMany({ orderBy: { id: "asc" } });
  if (rows.length === 0) return [];

  // One query for every colourway, grouped in memory — the alternative is N queries for a list
  // that routinely runs to a dozen templates.
  const colorRows = await prisma.find_event_template_color_options.findMany({
    where: { parent_template_id: { in: rows.map((r: any) => r.id) } },
    orderBy: { id: "asc" },
  });

  const colorsByTemplate = new Map<number, LobbyTemplateColorRow[]>();
  for (const c of colorRows as any[]) {
    const list = colorsByTemplate.get(c.parent_template_id) ?? [];
    list.push({ id: c.id, color: c.color ?? "", image: c.image ?? null });
    colorsByTemplate.set(c.parent_template_id, list);
  }

  return rows.map((row: any) => toRow(row, context.eventId, colorsByTemplate.get(row.id) ?? []));
}

export async function createLobbyTemplate(context: EventMemberContext, input: EventLobbyTemplateInput) {
  if (context.role !== "organiser") return null;
  return prisma.find_event_lobby_templates.create({
    data: {
      title: input.title,
      description: input.description || null,
      layout_type: input.layout_type || "",
      status: input.status,
      event_id: context.eventId,
      user_id: context.userId,
      updated_on: new Date(),
    },
    select: { id: true },
  });
}

export async function updateLobbyTemplate(
  context: EventMemberContext,
  id: number,
  input: EventLobbyTemplateInput
) {
  if (context.role !== "organiser") return { count: 0 };
  return prisma.find_event_lobby_templates.updateMany({
    where: { id },
    data: {
      title: input.title,
      description: input.description || null,
      layout_type: input.layout_type || "",
      status: input.status,
      updated_on: new Date(),
    },
  });
}

export async function deleteLobbyTemplate(context: EventMemberContext, id: number) {
  if (context.role !== "organiser") return { count: 0 };
  // The colourways reference the template by parent_template_id with no FK cascade, so removing
  // the template alone would leave orphan rows that nothing can ever reach or clean up.
  await prisma.find_event_template_color_options.deleteMany({ where: { parent_template_id: id } });
  return prisma.find_event_lobby_templates.deleteMany({ where: { id } });
}

/** The copy icon in the Manage column — `Event_Lobby_Templates->copyTemplate($id)`. */
export async function copyLobbyTemplate(context: EventMemberContext, id: number) {
  if (context.role !== "organiser") return null;

  const source = await prisma.find_event_lobby_templates.findUnique({ where: { id } });
  if (!source) return null;

  const created = await prisma.find_event_lobby_templates.create({
    data: {
      title: `${source.title ?? "Template"} (Copy)`.slice(0, 255),
      description: source.description,
      layout_type: source.layout_type,
      image: source.image,
      help_image: source.help_image,
      total_steps: source.total_steps,
      status: source.status ?? "enabled",
      // The copy belongs to the event that made it, not to the source's event.
      event_id: context.eventId,
      user_id: context.userId,
      updated_on: new Date(),
    },
    select: { id: true },
  });

  // Colourways are part of what makes an exhibition-stand template usable, so they come along.
  // They share the source's image paths: the files are read-only assets, not per-row uploads.
  const colors = await prisma.find_event_template_color_options.findMany({
    where: { parent_template_id: id },
  });
  if (colors.length > 0) {
    await prisma.find_event_template_color_options.createMany({
      data: colors.map((c: any) => ({
        parent_template_id: created.id,
        color: c.color,
        image: c.image,
      })),
    });
  }

  return created;
}

/** Called after the file itself has been written to public/files/lobby/template. */
export async function setLobbyTemplateImage(context: EventMemberContext, id: number, url: string) {
  if (context.role !== "organiser") return { count: 0 };
  return prisma.find_event_lobby_templates.updateMany({
    where: { id },
    data: { image: url, updated_on: new Date() },
  });
}

export async function createTemplateColor(
  context: EventMemberContext,
  templateId: number,
  input: LobbyTemplateColorInput
) {
  if (context.role !== "organiser") return null;
  return prisma.find_event_template_color_options.create({
    data: { parent_template_id: templateId, color: input.color },
    select: { id: true },
  });
}

export async function updateTemplateColor(
  context: EventMemberContext,
  colorId: number,
  input: LobbyTemplateColorInput
) {
  if (context.role !== "organiser") return { count: 0 };
  return prisma.find_event_template_color_options.updateMany({
    where: { id: colorId },
    data: { color: input.color },
  });
}

export async function deleteTemplateColor(context: EventMemberContext, colorId: number) {
  if (context.role !== "organiser") return { count: 0 };
  return prisma.find_event_template_color_options.deleteMany({ where: { id: colorId } });
}

export async function setTemplateColorImage(context: EventMemberContext, colorId: number, url: string) {
  if (context.role !== "organiser") return { count: 0 };
  return prisma.find_event_template_color_options.updateMany({
    where: { id: colorId },
    data: { image: url },
  });
}
