import { NextResponse } from "next/server";
import { requireEventMember } from "@/lib/auth/requireEventMember";
import { eventLobbyAgendaTrackSchema } from "@/lib/validations/eventLobbyAgendaTrack";
import { getPrimaryLobby } from "@/lib/services/eventLobby";
import { getEventAgendas, createAgendaTrack } from "@/lib/services/eventLobbyAgendaItems";

export async function GET() {
  const context = await requireEventMember();
  if ("error" in context) return context.error;

  if (context.role !== "organiser") {
    return NextResponse.json({ error: "Only the event organiser can view the lobby agenda." }, { status: 403 });
  }

  // Deliberately NOT gated on a parent lobby existing. The legacy list query is event-scoped
  // only, and an event can hold agenda rows before (or without) a lobby being configured —
  // returning 404 there made a populated table look empty.
  const tracks = await getEventAgendas(context);
  return NextResponse.json({ tracks });
}

export async function POST(request: Request) {
  const context = await requireEventMember();
  if ("error" in context) return context.error;

  if (context.role !== "organiser") {
    return NextResponse.json({ error: "Only the event organiser can add a lobby agenda." }, { status: 403 });
  }

  const body = await request.json();
  const parsed = eventLobbyAgendaTrackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  // event_layout_id is NOT NULL. The form supplies one; the schedule builder's quick-add does
  // not, so fall back to the parent lobby and only then refuse.
  let layoutId = parsed.data.event_layout_id ?? null;
  if (!layoutId) {
    const lobby = await getPrimaryLobby(context);
    layoutId = lobby?.id ?? null;
  }
  if (!layoutId) {
    return NextResponse.json(
      { error: "Choose a layout, or set up the parent lobby first on the Configure Lobby page." },
      { status: 400 }
    );
  }

  const created = await createAgendaTrack(context, parsed.data, layoutId);
  if (!created) {
    return NextResponse.json({ error: "Could not create this agenda." }, { status: 400 });
  }
  return NextResponse.json({ success: true, id: created.id }, { status: 201 });
}
