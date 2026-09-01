import { NextResponse } from "next/server";
import { requireEventMember } from "@/lib/auth/requireEventMember";
import { getExhibitorStandColors } from "@/lib/services/eventExhibitorAdmin";

/**
 * Colour options for one Exhibitor Stand Layout — the port of view_exhibitor.php's
 * `action=getColorOptions` AJAX endpoint.
 */
export async function GET(request: Request) {
  const context = await requireEventMember();
  if ("error" in context) return context.error;

  if (context.role !== "organiser") {
    return NextResponse.json(
      { error: "Only the event organiser can manage trade stands." },
      { status: 403 },
    );
  }

  const layoutId = Number(new URL(request.url).searchParams.get("layout_id"));
  if (!layoutId || !Number.isInteger(layoutId)) {
    return NextResponse.json({ colors: [] });
  }

  const colors = await getExhibitorStandColors(context, layoutId);
  return NextResponse.json({ colors });
}
