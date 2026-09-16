/**
 * DEV-ONLY exhibition-zone probe.
 *
 *   GET /api/diag/zone                 -> every exhibition zone of every event, with its counts
 *   GET /api/diag/zone?zone=2733       -> that zone in full: its row, its booths, its exhibitors
 *   GET /api/diag/zone?zone=2733&bust=1 -> the same, after dropping the `exhibitors` cache
 *
 * Why this exists: the allocator writes straight to Postgres, so when a zone page renders empty
 * there are three candidate causes that look identical from the browser — the exhibitors are on
 * another event, their status is not "active", or the page is serving a cached read taken before
 * the allocation. This answers all three in one request, from inside the server process that
 * renders the page, and `bust=1` clears the third on the spot.
 *
 * Returns 404 in production.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CACHE_TAGS, markContentStale } from "@/lib/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const params = new URL(request.url).searchParams;
  const zoneId = Number(params.get("zone")) || 0;
  const bust = params.get("bust") === "1";

  if (bust) markContentStale(CACHE_TAGS.exhibitors, CACHE_TAGS.domain);

  // ---- overview: every exhibition zone, and how many exhibitors point at it ----
  const zones = await prisma.find_event_lobby_child_layout_manager.findMany({
    where: { layout_type: "exhibition" },
    orderBy: [{ event_id: "asc" }, { id: "asc" }],
    select: { id: true, event_id: true, title: true, image: true, status: true },
  });

  const grouped = await prisma.find_event_exhibitor.groupBy({
    by: ["exhibition_zone_id", "event_id", "status"],
    _count: { _all: true },
  });

  const overview = zones.map((z) => ({
    zoneId: z.id,
    eventId: z.event_id,
    title: z.title,
    hasOwnArtwork: String(z.image ?? "").trim() !== "",
    status: z.status,
    exhibitors: grouped
      .filter((g) => g.exhibition_zone_id === z.id)
      .map((g) => ({ eventId: g.event_id, status: g.status, count: g._count._all })),
  }));

  // Every child layout row of an event, whatever its type — the only way to see that an
  // exhibitor was allocated to an "exhibition_stand" row (a stand LAYOUT) rather than a zone.
  const layoutsFor = Number(params.get("layouts")) || 0;
  if (layoutsFor) {
    const rows = await prisma.find_event_lobby_child_layout_manager.findMany({
      where: { event_id: layoutsFor },
      orderBy: { id: "asc" },
      select: { id: true, layout_type: true, title: true, status: true, image: true, event_layout_id: true },
    });
    return NextResponse.json(
      { checkedAt: new Date().toISOString(), eventId: layoutsFor, count: rows.length, rows },
      { headers: { "cache-control": "no-store" } }
    );
  }

  const eventId = Number(params.get("event")) || 0;
  if (eventId) {
    const byZone = await prisma.find_event_exhibitor.groupBy({
      by: ["exhibition_zone_id", "status"],
      where: { event_id: eventId },
      _count: { _all: true },
    });
    const titleById = new Map(zones.map((z) => [z.id, z.title]));
    return NextResponse.json(
      {
        checkedAt: new Date().toISOString(),
        cacheBusted: bust,
        eventId,
        exhibitorsByZone: byZone
          .map((g) => ({
            zoneId: g.exhibition_zone_id,
            zoneTitle: g.exhibition_zone_id ? titleById.get(g.exhibition_zone_id) ?? "(not an exhibition zone)" : "(unallocated)",
            status: g.status,
            count: g._count._all,
          }))
          .sort((a, b) => (a.zoneId ?? 0) - (b.zoneId ?? 0)),
        zonesOfThisEvent: overview.filter((z) => z.eventId === eventId),
      },
      { headers: { "cache-control": "no-store" } }
    );
  }

  if (!zoneId) {
    return NextResponse.json(
      { checkedAt: new Date().toISOString(), cacheBusted: bust, zones: overview },
      { headers: { "cache-control": "no-store" } }
    );
  }

  // ---- one zone in detail ----
  const zone = zones.find((z) => z.id === zoneId) ?? null;

  const spots = await prisma.find_event_lobby_spots.findMany({
    where: { OR: [{ event_layout_child_id: zoneId }, { layout_child_id: zoneId }] },
    orderBy: [{ stand_no: "asc" }, { id: "asc" }],
    select: {
      id: true,
      event_id: true,
      stand_no: true,
      x_coordinates: true,
      y_coordinates: true,
      width: true,
      height: true,
      dimension: true,
    },
  });

  const exhibitors = await prisma.find_event_exhibitor.findMany({
    where: { exhibition_zone_id: zoneId },
    orderBy: [{ stand_number: "asc" }],
    select: {
      id: true,
      event_id: true,
      status: true,
      business: true,
      stand_number: true,
      spot_id: true,
      ex_stand_layout_id: true,
    },
  });

  return NextResponse.json(
    {
      checkedAt: new Date().toISOString(),
      cacheBusted: bust,
      zone: zone
        ? { ...zone, note: zone.image ? "has own artwork" : "no artwork — page uses /images/event_zone.jpg" }
        : { error: `id ${zoneId} is not a layout_type="exhibition" row` },
      spots: {
        count: spots.length,
        positioned: spots.filter(
          (s) => Number(s.x_coordinates) > 0 || Number(s.y_coordinates) > 0 || Number(s.width) > 0
        ).length,
        rows: spots.slice(0, 30),
      },
      exhibitors: {
        count: exhibitors.length,
        active: exhibitors.filter((e) => e.status === "active").length,
        withSpot: exhibitors.filter((e) => !!e.spot_id).length,
        eventIds: [...new Set(exhibitors.map((e) => e.event_id))],
        rows: exhibitors.slice(0, 40),
      },
      zones: overview,
    },
    { headers: { "cache-control": "no-store" } }
  );
}
