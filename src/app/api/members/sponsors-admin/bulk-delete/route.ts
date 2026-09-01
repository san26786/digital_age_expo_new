import { NextResponse } from "next/server";
import { requireEventMember } from "@/lib/auth/requireEventMember";
import { bulkDeleteSponsors } from "@/lib/services/eventSponsorAdmin";

export async function POST(request: Request) {
  const context = await requireEventMember();
  if ("error" in context) return context.error;

  if (context.role !== "organiser") {
    return NextResponse.json({ error: "Only the event organiser can delete sponsors." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const ids = Array.isArray(body?.ids)
    ? body.ids.map(Number).filter((n: number) => Number.isInteger(n) && n > 0)
    : [];
  if (ids.length === 0) {
    return NextResponse.json({ error: "No rows were selected." }, { status: 400 });
  }

  const result = await bulkDeleteSponsors(context, ids);
  return NextResponse.json({ success: true, count: result.count });
}
