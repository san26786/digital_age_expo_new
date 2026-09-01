import { NextResponse } from "next/server";
import { requireEventMember } from "@/lib/auth/requireEventMember";
import { SPONSOR_BULK_STATUS_ACTIONS } from "@/lib/validations/eventSponsorAdmin";
import { bulkSetSponsorStatus } from "@/lib/services/eventSponsorAdmin";

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
  const status = typeof body?.status === "string" ? body.status : "";

  if (ids.length === 0) {
    return NextResponse.json({ error: "No rows were selected." }, { status: 400 });
  }
  if (!SPONSOR_BULK_STATUS_ACTIONS.includes(status as (typeof SPONSOR_BULK_STATUS_ACTIONS)[number])) {
    return NextResponse.json({ error: "Unrecognised status." }, { status: 400 });
  }

  const result = await bulkSetSponsorStatus(context, ids, status);
  return NextResponse.json({ success: true, count: result.count });
}
