import { NextResponse } from "next/server";
import { requireEventMember } from "@/lib/auth/requireEventMember";
import { getExhibitorZoneSpots } from "@/lib/services/eventExhibitorAdmin";

/**
 * Free "Virtual Booth Number" spots inside one Exhibition Zone. Cascades off the Exhibition Zone
 * dropdown, exactly like the legacy form's zone -> booth AJAX.
 *
 * `exclude` is the exhibitor being edited, so their own booth stays selectable.
 */
export async function GET(request: Request) {
  const context = await requireEventMember();
  if ("error" in context) return context.error;

  if (context.role !== "organiser") {
    return NextResponse.json(
      { error: "Only the event organiser can allocate trade stands." },
      { status: 403 },
    );
  }

  const params = new URL(request.url).searchParams;
  const zoneId = Number(params.get("zone_id"));
  if (!zoneId || !Number.isInteger(zoneId)) {
    return NextResponse.json({ spots: [] });
  }

  const excludeRaw = params.get("exclude");
  const exclude = excludeRaw && Number.isFinite(Number(excludeRaw)) ? Number(excludeRaw) : null;

  const spots = await getExhibitorZoneSpots(context, zoneId, exclude);
  return NextResponse.json({ spots });
}
