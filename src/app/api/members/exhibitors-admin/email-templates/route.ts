import { NextResponse } from "next/server";
import { requireEventMember } from "@/lib/auth/requireEventMember";
import { getExhibitorEmailTemplates } from "@/lib/services/eventExhibitorAdmin";

/** Feeds the "Select an Email Template" dropdown. */
export async function GET() {
  const context = await requireEventMember();
  if ("error" in context) return context.error;

  if (context.role !== "organiser") {
    return NextResponse.json({ error: "Only the event organiser can send exhibitor mail." }, { status: 403 });
  }

  return NextResponse.json({ templates: await getExhibitorEmailTemplates() });
}
