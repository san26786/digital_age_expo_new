import { NextResponse } from "next/server";
import { z } from "zod";
import { requireEventMember } from "@/lib/auth/requireEventMember";
import {
  getLobbyMenuRows,
  getLobbyMenuOptions,
  createLobbyMenu,
  updateLobbyMenu,
  deleteLobbyMenu,
  setLobbyMenuActive,
  reorderLobbyMenu,
  getMenuSourceEvents,
  copyLobbyMenuFromEvent,
  MENU_ACTION_TYPES,
} from "@/lib/services/eventLobbyMenu";

/**
 * The lobby footer menu, as managed from /members/manage_event_menu.
 *
 * Organiser-only: this writes `find_event_lobby_menu`, which is what every visitor's footer nav is
 * rendered from, so it is not something an exhibitor or speaker may touch.
 */

const ACTION_VALUES = MENU_ACTION_TYPES.map((a) => a.value) as [string, ...string[]];

/** "" and "0" both mean "nothing selected" in the form's selects — normalise them to null. */
const optionalId = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((v) => {
    if (v === null || v === undefined || v === "" || v === "0") return null;
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : null;
  });

const menuSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(100, "Title is too long"),
  seq: z
    .union([z.string(), z.number()])
    .transform((v) => Number(v))
    .refine((n) => Number.isFinite(n), "Sequence must be a number")
    .transform((n) => Math.trunc(n)),
  parent_id: optionalId,
  post_action_type: z
    .union([z.enum(ACTION_VALUES), z.literal(""), z.null(), z.undefined()])
    .transform((v) => (v ? String(v) : null)),
  post_asset_id: optionalId,
  layout_id: optionalId,
  networking_room_id: optionalId,
  exhibitor_id: optionalId,
  chat_user_id: optionalId,
  active: z.boolean().optional(),
});

export async function GET(request: Request) {
  const context = await requireEventMember(request);
  if ("error" in context) return context.error;
  if (context.role !== "organiser") {
    return NextResponse.json({ error: "Only the event organiser can manage the event menu." }, { status: 403 });
  }

  const [items, options, sourceEvents] = await Promise.all([
    getLobbyMenuRows(context),
    getLobbyMenuOptions(context),
    getMenuSourceEvents(context),
  ]);
  return NextResponse.json({ items, options, sourceEvents, actionTypes: MENU_ACTION_TYPES });
}

export async function POST(request: Request) {
  const context = await requireEventMember(request);
  if ("error" in context) return context.error;
  if (context.role !== "organiser") {
    return NextResponse.json({ error: "Only the event organiser can manage the event menu." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  // Ordering and visibility are their own small actions rather than a full update, so the client
  // never has to round-trip an entire row just to hide an item or drag it up one place.
  if (body.action === "reorder") {
    const ids = Array.isArray(body.ids) ? body.ids.map((v: unknown) => Number(v)).filter(Number.isFinite) : [];
    if (ids.length === 0) return NextResponse.json({ error: "No order supplied." }, { status: 400 });
    await reorderLobbyMenu(context, ids);
    return NextResponse.json({ success: true });
  }

  if (body.action === "toggle") {
    const id = Number(body.id);
    if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
    const result = await setLobbyMenuActive(context, id, Boolean(body.active));
    if (result.count === 0) return NextResponse.json({ error: "Menu item not found." }, { status: 404 });
    return NextResponse.json({ success: true });
  }

  if (body.action === "copy") {
    const sourceEventId = Number(body.source_event_id);
    if (!sourceEventId) return NextResponse.json({ error: "Choose an event to copy from." }, { status: 400 });
    if (sourceEventId === context.eventId) {
      return NextResponse.json({ error: "That is this event's own menu." }, { status: 400 });
    }
    const result = await copyLobbyMenuFromEvent(context, sourceEventId);
    return NextResponse.json({ success: true, ...result });
  }

  const parsed = menuSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." },
      { status: 400 }
    );
  }

  const id = Number(body.id);
  if (id) {
    const result = await updateLobbyMenu(context, id, parsed.data);
    if (result.count === 0) return NextResponse.json({ error: "Menu item not found." }, { status: 404 });
    return NextResponse.json({ success: true, id });
  }

  const created = await createLobbyMenu(context, parsed.data);
  return NextResponse.json({ success: true, id: created?.id });
}

export async function DELETE(request: Request) {
  const context = await requireEventMember(request);
  if ("error" in context) return context.error;
  if (context.role !== "organiser") {
    return NextResponse.json({ error: "Only the event organiser can manage the event menu." }, { status: 403 });
  }

  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

  const result = await deleteLobbyMenu(context, id);
  if (result.count === 0) return NextResponse.json({ error: "Menu item not found." }, { status: 404 });
  return NextResponse.json({ success: true });
}
