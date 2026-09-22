import { NextResponse } from "next/server";
import { requireEventMember } from "@/lib/auth/requireEventMember";
import { eventDetailsSchema } from "@/lib/validations/eventDetails";
import { getEventDetails, updateEventDetails } from "@/lib/services/eventDetails";
import { CACHE_TAGS, markContentStale } from "@/lib/cache";

export async function GET(request: Request) {
  const context = await requireEventMember(request);
  if ("error" in context) return context.error;

  if (context.role !== "organiser") {
    return NextResponse.json({ error: "Only the event organiser can view this." }, { status: 403 });
  }

  const details = await getEventDetails(context);
  return NextResponse.json({ details });
}

export async function PUT(request: Request) {
  const context = await requireEventMember(request);
  if ("error" in context) return context.error;

  if (context.role !== "organiser") {
    return NextResponse.json({ error: "Only the event organiser can edit event details." }, { status: 403 });
  }

  const body = await request.json();
  const parsed = eventDetailsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  await updateEventDetails(context, parsed.data);

  /*
   * The public pages read the event through cachedRead (30 minute window), so without this an
   * organiser saved new dates or new copy here and the live site went on showing the old ones
   * for up to half an hour with nothing to indicate why. This is a route handler rather than a
   * Server Action, so it is markContentStale (revalidateTag) rather than revalidateContent —
   * see the note on both in src/lib/cache.ts.
   */
  markContentStale(CACHE_TAGS.event);

  return NextResponse.json({ success: true });
}
