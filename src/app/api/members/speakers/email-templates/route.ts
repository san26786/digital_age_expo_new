import { NextResponse } from "next/server";
import { requireEventMember } from "@/lib/auth/requireEventMember";
import { getSpeakerEmailTemplates } from "@/lib/services/eventSpeakers";

/**
 * Feeds the speakers' "Select an Email Template" dropdown.
 *
 * Visitors, exhibitors and sponsors have had this since the send-mail screens were built;
 * speakers never did, which is why an organiser could mail every other role from the admin and
 * not that one. Same auth and same shape as the other three.
 */
export async function GET() {
  const context = await requireEventMember();
  if ("error" in context) return context.error;

  if (context.role !== "organiser") {
    return NextResponse.json({ error: "Only the event organiser can send speaker mail." }, { status: 403 });
  }

  return NextResponse.json({ templates: await getSpeakerEmailTemplates() });
}
