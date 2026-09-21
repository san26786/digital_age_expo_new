import { NextResponse } from "next/server";
import { requireEventMember } from "@/lib/auth/requireEventMember";
import { allocateStands } from "@/lib/services/standAllocation";

/**
 * Apply the auto-allocation.
 *
 * Takes no body on purpose. The plan is not sent up from the browser — it is recomputed here, from
 * the database as it stands at this moment. Accepting a client-supplied list of booth assignments
 * would mean trusting a page that may have been open for an hour, and would let a crafted request
 * put any exhibitor on any booth.
 */
export async function POST() {
  const context = await requireEventMember();
  if ("error" in context) return context.error;

  if (context.role !== "organiser") {
    return NextResponse.json(
      { error: "Only the event organiser can allocate trade stands." },
      { status: 403 },
    );
  }

  try {
    const result = await allocateStands(context);
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    console.error("[exhibitors-admin/allocate-stands] failed:", err);
    return NextResponse.json({ error: "The allocation failed." }, { status: 500 });
  }
}
