import { NextResponse } from "next/server";
import { z } from "zod";
import { requireEventMember } from "@/lib/auth/requireEventMember";
import { canManageLobby, LOBBY_ACCESS_DENIED } from "@/lib/services/eventAccess";
import { copyZonesFromEvent, listZoneSourceEvents } from "@/lib/services/eventLobbyZones";

/**
 * Copy exhibition zones, stand layouts and booth positions from one event onto another.
 *
 * Gated with canManageLobby(), the same rule every other lobby screen and route uses, so this
 * does not quietly become the one lobby operation with its own access rules. That rule is
 * currently permissive by design — see the long note in eventAccess.ts — and tightening it there
 * tightens this too.
 */

/** GET — events that have zones worth copying. */
export async function GET() {
  const context = await requireEventMember();
  if ("error" in context) return context.error;
  if (!canManageLobby(context)) {
    return NextResponse.json({ error: LOBBY_ACCESS_DENIED }, { status: 403 });
  }

  try {
    const events = await listZoneSourceEvents(context.eventId);
    return NextResponse.json({ events });
  } catch (err) {
    console.error("[lobby-child/copy-from-event] list failed:", err);
    return NextResponse.json({ error: "Could not load the events to copy from." }, { status: 500 });
  }
}

const schema = z.object({
  source_event_id: z.number().int().positive(),
  enable_copied: z.boolean().optional().default(true),
  copy_booths: z.boolean().optional().default(true),
});

/** POST — do the copy. */
export async function POST(request: Request) {
  const context = await requireEventMember();
  if ("error" in context) return context.error;
  if (!canManageLobby(context)) {
    return NextResponse.json({ error: LOBBY_ACCESS_DENIED }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Could not read the request body." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Pick an event to copy from." }, { status: 400 });
  }

  try {
    const result = await copyZonesFromEvent(
      context.eventId,
      context.userId,
      parsed.data.source_event_id,
      { enableCopied: parsed.data.enable_copied, copyBooths: parsed.data.copy_booths },
    );
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    // copyZonesFromEvent throws with a message written for the organiser (same event, nothing to
    // copy); anything else is ours and should not be echoed back.
    const message = err instanceof Error ? err.message : "";
    const expected = message.includes("cannot copy") || message.includes("no exhibition zones");
    if (!expected) console.error("[lobby-child/copy-from-event] copy failed:", err);
    return NextResponse.json(
      { error: expected ? message : "Could not copy those zones." },
      { status: expected ? 400 : 500 },
    );
  }
}
