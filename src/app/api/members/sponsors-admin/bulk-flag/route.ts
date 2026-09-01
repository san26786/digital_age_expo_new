import { NextResponse } from "next/server";
import { requireEventMember } from "@/lib/auth/requireEventMember";
import { bulkSetSponsorFlag, SPONSOR_FLAGS, type SponsorFlag } from "@/lib/services/eventSponsorAdmin";

/**
 * The on/off promotion actions — Featured, Sold Out, the two banner placements and Enable
 * Sponsorship. Kept separate from bulk-status because these are independent flags, not one
 * mutually-exclusive state.
 */
export async function POST(request: Request) {
  const context = await requireEventMember();
  if ("error" in context) return context.error;

  if (context.role !== "organiser") {
    return NextResponse.json({ error: "Only the event organiser can update sponsors." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const ids = Array.isArray(body?.ids)
    ? body.ids.map(Number).filter((n: number) => Number.isInteger(n) && n > 0)
    : [];
  const flag = typeof body?.flag === "string" ? body.flag : "";
  const value = Boolean(body?.value);

  if (ids.length === 0) {
    return NextResponse.json({ error: "No rows were selected." }, { status: 400 });
  }
  if (!(SPONSOR_FLAGS as readonly string[]).includes(flag)) {
    return NextResponse.json({ error: "Unrecognised flag." }, { status: 400 });
  }

  const result = await bulkSetSponsorFlag(context, ids, flag as SponsorFlag, value);
  return NextResponse.json({ success: true, count: result.count });
}
