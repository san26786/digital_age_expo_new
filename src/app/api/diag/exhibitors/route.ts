/**
 * DEV-ONLY exhibitor roster, for tooling that cannot reach the database directly.
 *
 *   GET /api/diag/exhibitors?event=1474   -> id, business, website and current image fields
 *
 * Read-only. Returns 404 in production.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const params = new URL(request.url).searchParams;
  const eventId = Number(params.get("event")) || 0;
  if (!eventId) {
    return NextResponse.json({ error: "pass ?event=<id>" }, { status: 400 });
  }

  // ?booth=<exhibitorId> — the stand's own spot rows, to see which tiles are real hotspots.
  const boothId = Number(params.get("booth")) || 0;
  if (boothId) {
    const exhibitor = await prisma.find_event_exhibitor.findFirst({
      where: { id: boothId },
      select: {
        id: true, business: true, first_name: true, last_name: true, name: true,
        email: true, phone: true, work_phone: true, position: true,
        logo: true, profile_pic: true, ex_stand_layout_id: true, stand_number: true,
      },
    });
    const spots = await prisma.find_event_lobby_spots.findMany({
      where: { event_layout_child_id: exhibitor?.ex_stand_layout_id ?? 0 },
      select: { id: true, title: true, spot_type: true, x_coordinates: true, y_coordinates: true, width: true, height: true, dimension: true },
      orderBy: { id: "asc" },
    });
    const assets = await prisma.find_event_lobby_layout_type_assets.findMany({
      where: { exhibition_stand_id: boothId },
      select: { id: true, title: true, asset_type: true, asset_attachment: true },
    });
    return NextResponse.json({ exhibitor, spotCount: spots.length, spots, assetCount: assets.length, assets },
      { headers: { "cache-control": "no-store" } });
  }

  const rows = await prisma.find_event_exhibitor.findMany({
    where: { event_id: eventId, status: "active" },
    orderBy: [{ business: "asc" }, { id: "asc" }],
    select: {
      id: true,
      business: true,
      website: true,
      logo: true,
      profile_pic: true,
      stand_logo: true,
      listing_id: true,
    },
  });

  const listingIds = [...new Set(rows.map((r) => r.listing_id).filter((v): v is number => !!v))];
  const listings = listingIds.length
    ? await prisma.find_listings.findMany({
        where: { id: { in: listingIds } },
        select: { id: true, www: true },
      })
    : [];
  const wwwById = new Map(listings.map((l) => [l.id, l.www]));

  return NextResponse.json(
    {
      eventId,
      count: rows.length,
      exhibitors: rows.map((r) => ({
        id: r.id,
        business: r.business,
        website: (r.website ?? "").trim() || (wwwById.get(r.listing_id ?? 0) ?? "").trim() || null,
        hasLogo: (r.logo ?? "").trim() !== "",
        hasProfilePic: (r.profile_pic ?? "").trim() !== "",
      })),
    },
    { headers: { "cache-control": "no-store" } }
  );
}
