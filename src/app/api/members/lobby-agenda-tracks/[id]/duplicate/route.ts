import { NextResponse } from "next/server";
import { requireEventMember } from "@/lib/auth/requireEventMember";
import { duplicateAgendaTrack } from "@/lib/services/eventLobbyAgendaItems";

/** Backs the copy icon in the Lobby Agenda list's Manage column. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requireEventMember();
  if ("error" in context) return context.error;

  if (context.role !== "organiser") {
    return NextResponse.json({ error: "Only the event organiser can duplicate an agenda." }, { status: 403 });
  }

  const { id } = await params;
  const created = await duplicateAgendaTrack(context, Number(id));
  if (!created) {
    return NextResponse.json({ error: "Agenda not found or access denied." }, { status: 404 });
  }
  return NextResponse.json({ success: true, id: created.id }, { status: 201 });
}
