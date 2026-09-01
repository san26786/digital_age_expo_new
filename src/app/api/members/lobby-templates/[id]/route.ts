import { NextResponse } from "next/server";
import { requireEventMember } from "@/lib/auth/requireEventMember";
import { eventLobbyTemplateSchema } from "@/lib/validations/eventLobbyTemplate";
import { updateLobbyTemplate, deleteLobbyTemplate } from "@/lib/services/eventLobbyTemplates";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requireEventMember(request);
  if ("error" in context) return context.error;
  if (context.role !== "organiser") {
    return NextResponse.json({ error: "Only the event organiser can edit a lobby template." }, { status: 403 });
  }

  const { id } = await params;
  const parsed = eventLobbyTemplateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const result = await updateLobbyTemplate(context, Number(id), parsed.data);
  if (result.count === 0) return NextResponse.json({ error: "Template not found." }, { status: 404 });
  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requireEventMember(request);
  if ("error" in context) return context.error;
  if (context.role !== "organiser") {
    return NextResponse.json({ error: "Only the event organiser can delete a lobby template." }, { status: 403 });
  }

  const { id } = await params;
  const result = await deleteLobbyTemplate(context, Number(id));
  if (result.count === 0) return NextResponse.json({ error: "Template not found." }, { status: 404 });
  return NextResponse.json({ success: true });
}
