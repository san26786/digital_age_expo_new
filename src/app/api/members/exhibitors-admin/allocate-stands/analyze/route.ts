import { NextResponse } from "next/server";
import { requireEventMember } from "@/lib/auth/requireEventMember";
import { planStandAllocation } from "@/lib/services/standAllocation";

/**
 * Preview of the auto-allocation: who would get which booth, and who would not fit.
 *
 * POST rather than GET even though it allocates nothing, because working out a zone's free
 * capacity means normalising its booth rows first, and that can create them. A URL that writes
 * should not be one a browser can prefetch.
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
    const plan = await planStandAllocation(context);
    return NextResponse.json({ success: true, ...plan });
  } catch (err) {
    console.error("[exhibitors-admin/allocate-stands/analyze] failed:", err);
    return NextResponse.json({ error: "Could not work out an allocation." }, { status: 500 });
  }
}
