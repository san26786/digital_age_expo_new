import { NextResponse } from "next/server";
import { requireEventMember } from "@/lib/auth/requireEventMember";
import { lobbyTemplateColorSchema } from "@/lib/validations/eventLobbyTemplate";
import { createTemplateColor } from "@/lib/services/eventLobbyTemplates";

/** Colourways for an exhibition-stand template — find_event_template_color_options. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requireEventMember(request);
  if ("error" in context) return context.error;
  if (context.role !== "organiser") {
    return NextResponse.json({ error: "Only the event organiser can add a colour option." }, { status: 403 });
  }

  const { id } = await params;
  const parsed = lobbyTemplateColorSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const created = await createTemplateColor(context, Number(id), parsed.data);
  if (!created) return NextResponse.json({ error: "Could not add this colour." }, { status: 400 });
  return NextResponse.json({ success: true, id: created.id }, { status: 201 });
}
