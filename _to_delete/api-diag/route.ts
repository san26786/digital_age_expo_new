// TEMPORARY diagnostic + one-off repair route. Delete after use.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncEventDateRange } from "@/lib/services/eventDetails";
import { CACHE_TAGS, markContentStale } from "@/lib/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function snapshot() {
  const domain = await prisma.find_domains.findFirst({ select: { id: true, event_id: true } });
  const events = await prisma.find_events.findMany({
    select: { id: true, title: true, date_start: true, date_end: true },
    orderBy: { id: "desc" },
    take: 8,
  });
  const eventsDatesRows = await prisma.find_events_dates.findMany({
    select: { event_id: true, date_start: true, date_end: true },
    take: 50,
  });
  return { domain, events, eventsDatesRows };
}

export async function GET() {
  if (process.env.NODE_ENV === "production") return new NextResponse("Not found", { status: 404 });
  return NextResponse.json(await snapshot());
}

/** Re-runs the find_events_dates sync for the active event, from the dates already on find_events. */
export async function POST() {
  if (process.env.NODE_ENV === "production") return new NextResponse("Not found", { status: 404 });

  const domain = await prisma.find_domains.findFirst({ select: { event_id: true } });
  if (!domain?.event_id) return NextResponse.json({ error: "no active event" }, { status: 400 });

  const event = await prisma.find_events.findUnique({
    where: { id: domain.event_id },
    select: { id: true, date_start: true, date_end: true },
  });
  if (!event?.date_start) return NextResponse.json({ error: "event has no start date" }, { status: 400 });

  const before = await snapshot();
  await syncEventDateRange(event.id, event.date_start, event.date_end);
  markContentStale(CACHE_TAGS.event);
  const after = await snapshot();

  return NextResponse.json({ repairedEventId: event.id, before: before.eventsDatesRows, after: after.eventsDatesRows });
}
