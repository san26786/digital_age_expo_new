import { NextResponse } from "next/server";
import { requireEventMember } from "@/lib/auth/requireEventMember";
import { lobbyTemplateColorSchema } from "@/lib/validations/eventLobbyTemplate";
import { updateTemplateColor, deleteTemplateColor } from "@/lib/services/eventLobbyTemplates";

export async function PATCH(request: Request, { params }: { params: Promise<{ colorId: string }> }) {
  const context = await requireEventMember(request);
  if ("error" in context) return context.error;
  if (context.role !== "organiser") {
    return NextResponse.json({ error: "Only the event organiser can edit a colour option." }, { status: 403 });
  }

  const { colorId } = await params;
  const parsed = lobbyTemplateColorSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const result = await updateTemplateColor(context, Number(colorId), parsed.data);
  if (result.count === 0) return NextResponse.json({ error: "Colour option not found." }, { status: 404 });
  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ colorId: string }> }) {
  const context = await requireEventMember(request);
  if ("error" in context) return context.error;
  if (context.role !== "organiser") {
    return NextResponse.json({ error: "Only the event organiser can delete a colour option." }, { status: 403 });
  }

  const { colorId } = await params;
  const result = await deleteTemplateColor(context, Number(colorId));
  if (result.count === 0) return NextResponse.json({ error: "Colour option not found." }, { status: 404 });
  return NextResponse.json({ success: true });
}
