import { NextResponse } from "next/server";
import { requireEventMember } from "@/lib/auth/requireEventMember";
import { copyLobbyTemplate } from "@/lib/services/eventLobbyTemplates";

/** The copy icon in the Manage column — legacy `?action=copy&id=…`. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requireEventMember(request);
  if ("error" in context) return context.error;
  if (context.role !== "organiser") {
    return NextResponse.json({ error: "Only the event organiser can copy a lobby template." }, { status: 403 });
  }

  const { id } = await params;
  const created = await copyLobbyTemplate(context, Number(id));
  if (!created) return NextResponse.json({ error: "Template not found." }, { status: 404 });
  return NextResponse.json({ success: true, id: created.id }, { status: 201 });
}
