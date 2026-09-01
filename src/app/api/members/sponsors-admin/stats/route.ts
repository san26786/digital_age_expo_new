import { NextResponse } from "next/server";
import { requireEventMember } from "@/lib/auth/requireEventMember";
import { getSponsorStats } from "@/lib/services/eventSponsorAdmin";

/** Feeds the header badges, including the Available / Used sponsorship-slot counts. */
export async function GET() {
  const context = await requireEventMember();
  if ("error" in context) return context.error;

  return NextResponse.json({ stats: await getSponsorStats(context) });
}
