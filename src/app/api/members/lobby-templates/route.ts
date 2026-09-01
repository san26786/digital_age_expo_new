import { NextResponse } from "next/server";
import { requireEventMember } from "@/lib/auth/requireEventMember";
import { eventLobbyTemplateSchema } from "@/lib/validations/eventLobbyTemplate";
import { listLobbyTemplates, createLobbyTemplate } from "@/lib/services/eventLobbyTemplates";

export async function GET(request: Request) {
  const context = await requireEventMember(request);
  if ("error" in context) return context.error;
  if (context.role !== "organiser") {
    return NextResponse.json({ error: "Only the event organiser can view lobby templates." }, { status: 403 });
  }
  return NextResponse.json({ templates: await listLobbyTemplates(context) });
}

export async function POST(request: Request) {
  const context = await requireEventMember(request);
  if ("error" in context) return context.error;
  if (context.role !== "organiser") {
    return NextResponse.json({ error: "Only the event organiser can add a lobby template." }, { status: 403 });
  }

  const parsed = eventLobbyTemplateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const created = await createLobbyTemplate(context, parsed.data);
  if (!created) return NextResponse.json({ error: "Could not create this template." }, { status: 400 });
  return NextResponse.json({ success: true, id: created.id }, { status: 201 });
}
