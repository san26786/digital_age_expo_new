import { NextResponse } from "next/server";
import { z } from "zod";
import { requireEventMember } from "@/lib/auth/requireEventMember";
import { ensureExhibitionZones, MAX_ZONES_PER_SETUP } from "@/lib/services/eventLobbyZones";

const schema = z.object({
  zones: z.number().int().min(1).max(MAX_ZONES_PER_SETUP),
});

/**
 * Create whatever the event is missing so stands can be allocated: a lobby if there is none, and
 * exhibition zones up to the requested count.
 *
 * Additive only — it never replaces an existing lobby or deletes a zone, so the worst a mistaken
 * press can do is leave spare empty zones behind, which the organiser can delete on Child Lobby
 * Details.
 */
export async function POST(request: Request) {
  const context = await requireEventMember();
  if ("error" in context) return context.error;

  if (context.role !== "organiser") {
    return NextResponse.json(
      { error: "Only the event organiser can set up exhibition zones." },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Could not read the request body." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: `Ask for between 1 and ${MAX_ZONES_PER_SETUP} zones.` },
      { status: 400 },
    );
  }

  try {
    const result = await ensureExhibitionZones(context.eventId, context.userId, parsed.data.zones);
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    console.error("[exhibitors-admin/allocate-stands/setup] failed:", err);
    return NextResponse.json({ error: "Could not set up the exhibition zones." }, { status: 500 });
  }
}
