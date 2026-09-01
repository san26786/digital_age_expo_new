import { NextResponse } from "next/server";
import { requireEventMember } from "@/lib/auth/requireEventMember";
import { getExhibitorFormOptions } from "@/lib/services/eventExhibitorAdmin";

/**
 * Reference data for the Add / Edit Trade Stand modal — the dropdowns the legacy form built
 * inline while rendering (members/view_exhibitor.php:520-671).
 *
 * `order_id` is optional and only used when editing: it keeps the order already attached to this
 * exhibitor in the "Available Stand Size" list even though it is flagged used.
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

  const raw = new URL(request.url).searchParams.get("order_id");
  const currentOrderId = raw && Number.isFinite(Number(raw)) ? Number(raw) : null;

  const options = await getExhibitorFormOptions(context, currentOrderId);
  return NextResponse.json({ options });
}
