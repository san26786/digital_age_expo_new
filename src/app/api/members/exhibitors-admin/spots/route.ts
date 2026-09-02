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

  // This handler now normalises the zone's booth rows as a side effect, so it can fail in ways a
  // plain read could not. An empty list renders as "No booths in this zone", which is a far better
  // outcome than an unhandled throw taking the Add/Edit Trade Stand form down with it.
  try {
    const spots = await getExhibitorZoneSpots(context, zoneId, exclude);
    return NextResponse.json({ spots });
  } catch (error: any) {
    console.error("[exhibitors-admin/spots] failed to resolve zone booths:", error);
    return NextResponse.json({ spots: [], error: "Could not load the booths for this zone." });
  }
}
