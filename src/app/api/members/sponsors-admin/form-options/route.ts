import { NextResponse } from "next/server";
import { requireEventMember } from "@/lib/auth/requireEventMember";
import { getSponsorFormOptions } from "@/lib/services/eventSponsorAdmin";

/**
 * Reference data for the Add / Edit Sponsor modal — the dropdowns the legacy form built inline
 * while rendering (members/view_sponsor.php:207-325).
 *
 * `order_id` is optional and only used when editing: it keeps the order already attached to this
 * sponsor in the "Available Sponsorship" list even though it is flagged used.
 */
export async function GET(request: Request) {
  const context = await requireEventMember();
  if ("error" in context) return context.error;

  if (context.role !== "organiser") {
    return NextResponse.json(
      { error: "Only the event organiser can manage sponsors." },
      { status: 403 },
    );
  }

  const raw = new URL(request.url).searchParams.get("order_id");
  const currentOrderId = raw && Number.isFinite(Number(raw)) ? Number(raw) : null;

  return NextResponse.json({ options: await getSponsorFormOptions(context, currentOrderId) });
}
