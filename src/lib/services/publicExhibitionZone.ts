import { prisma } from "@/lib/prisma";
import { CACHE_TAGS, cachedRead } from "@/lib/cache";
import { assetUrl, exhibitorAssetUrl, exhibitorLogoUrl, standTemplateUrl } from "@/lib/assets";
import fs from "node:fs";
import path from "node:path";
import { spotGeometry, type SpotBox } from "@/lib/spotGeometry";

/**
 * ===========================================================================
 *  ONE EXHIBITION ZONE AS A ROOM — the hall, with its stands on it
 * ===========================================================================
 *
 *  A zone link from the lobby (?zone=<id>) has to land somewhere. getAuditoriumScene()
 *  handles every other child layout but deliberately excludes layout_type "exhibition",
 *  so zones had no renderer at all.
 *
 *  This is the zone equivalent of that scene: the hall artwork as the room, and every
 *  allocated stand positioned on it, showing the exhibitor's stand header artwork with a
 *  marker that opens their booth. It mirrors the live site's exhibition hall, where each
 *  booth wears its own banner and a red dot reads "VISIT <business> (Booth No. <n>)".
 *
 *  Two deliberate fallbacks, because the legacy data is incomplete on exactly the rows
 *  that matter and a zone that cannot be drawn is worse than one drawn from defaults:
 *
 *    1. ARTWORK. Zones migrated from the legacy routinely carry an empty `image`, so
 *       resolving it yields nothing. The shipped hall render (public/images/event_zone.jpg)
 *       is used instead — it is the same top-down hall the live site shows.
 *
 *    2. GEOMETRY. The allocator assigns exhibition_zone_id and stand_number, but the booth
 *       rows it works from have no coordinates (nothing ever dragged them in Lobby Spots),
 *       so every spot resolves to x:0 y:0 and all stands would stack in one corner. The
 *       hall render has exactly BOOTHS_PER_ZONE (22) banner panels on it, and their boxes
 *       are transcribed below, so an un-positioned zone still lands each stand on a real
 *       panel. A spot that DOES carry stored geometry always wins over its slot — the
 *       organiser's own layout is never overridden by ours.
 *
 *  Returns null when the id is not an exhibition zone of this event, so the caller can fall
 *  through to its other modes.
 */

export interface ZoneStand {
  /** Unique per scene — spot ids are not, once un-placed exhibitors take fallback slots. */
  key: string;
  spotId: number;
  exhibitorId: number | null;
  business: string;
  standNumber: string | null;
  /** Percentage box on the hall, or null when the zone has more stands than it has panels. */
  box: SpotBox | null;
  /** The stand's own header banner if one has been placed, else their logo, else nothing. */
  artworkUrl: string | null;
  logoUrl: string | null;
}

/** A neighbouring hall, for the arrows that walk the visitor along the floor. */
export interface ZoneNeighbour {
  id: number;
  title: string;
}

export interface ExhibitionZoneScene {
  id: number;
  title: string;
  backgroundUrl: string | null;
  stands: ZoneStand[];
  /** The hall before and after this one in the organiser's own order. Wraps, so a visitor
   *  walking the floor with the arrows comes back round rather than hitting a dead end. */
  previous: ZoneNeighbour | null;
  next: ZoneNeighbour | null;
  /** 1-based position of this hall among the event's enabled zones, and how many there are. */
  position: number;
  totalZones: number;
}

/** A stand banner is small next to an agenda panel — hence its own fallback box. */
const STAND_FALLBACK_WIDTH = 12;
const STAND_FALLBACK_HEIGHT = 9;

/** The slot whose artwork reads as "this stand's sign" when seen from across the hall. */
const HEADER_SLOT = "top_banner";

/** The shipped hall render, used when the zone row has no artwork of its own that we hold. */
const ZONE_HALL_ARTWORK = "/images/event_zone.jpg";

/*
 * A zone row naming artwork is not the same as having it. Every zone on this event points at
 * `event_2581.jpg` in the legacy `files/lobby/child` folder, and that mirror holds eight files —
 * the stand templates — not that one. Resolving the name yields a tidy URL that 404s, and the
 * hall renders as a black room with the stands floating on nothing.
 *
 * So the resolved path is checked against what is actually in public/ before it is trusted.
 * The answer is memoised: a zone scene is a cached read, but it is read once per zone and the
 * same handful of paths come back every time.
 */
const publicRoot = path.join(process.cwd(), "public");
const fileChecks = new Map<string, boolean>();

function localAssetExists(url: string | undefined | null): boolean {
  if (!url) return false;
  // Anything remote we cannot vouch for either way; let the browser try it.
  if (/^(https?:)?\/\//i.test(url) || url.startsWith("data:")) return true;
  if (!url.startsWith("/")) return false;
  const cleaned = url.split("?")[0].split("#")[0];
  const cached = fileChecks.get(cleaned);
  if (cached !== undefined) return cached;
  let exists = false;
  try {
    exists = fs.existsSync(path.join(publicRoot, decodeURIComponent(cleaned).replace(/^\/+/, "")));
  } catch {
    exists = false;
  }
  fileChecks.set(cleaned, exists);
  return exists;
}

/**
 * The 22 banner panels on ZONE_HALL_ARTWORK, as percentages of the 1920x1080 render, read off
 * the artwork row by row (6, 5, 6, 5 — front of hall to back). These are the white sign faces,
 * not the whole booth, so an exhibitor's top_banner sits where a real hall would print it.
 */
const ZONE_HALL_SLOTS: ReadonlyArray<{ x: number; y: number; width: number; height: number }> = [
  // Row 1 — nearest the glazed wall
  { x: 6.25, y: 23.7, width: 14.17, height: 4.07 },
  { x: 21.88, y: 23.7, width: 11.46, height: 4.07 },
  { x: 36.82, y: 23.89, width: 11.35, height: 4.35 },
  { x: 52.34, y: 23.89, width: 11.3, height: 4.17 },
  { x: 67.71, y: 23.89, width: 11.46, height: 4.35 },
  { x: 83.33, y: 24.26, width: 11.98, height: 4.44 },
  // Row 2
  { x: 10.68, y: 38.43, width: 12.24, height: 4.91 },
  { x: 28.13, y: 38.7, width: 12.08, height: 4.81 },
  { x: 45.68, y: 38.89, width: 11.61, height: 4.81 },
  { x: 62.76, y: 38.89, width: 11.82, height: 4.81 },
  { x: 78.75, y: 39.26, width: 12.5, height: 5.0 },
  // Row 3
  { x: 1.3, y: 53.7, width: 12.66, height: 5.56 },
  { x: 17.97, y: 53.98, width: 12.34, height: 5.46 },
  { x: 36.04, y: 54.17, width: 11.88, height: 5.56 },
  { x: 52.6, y: 54.44, width: 12.08, height: 5.56 },
  { x: 69.79, y: 54.63, width: 12.08, height: 5.56 },
  { x: 86.2, y: 54.81, width: 12.34, height: 5.56 },
  // Row 4 — nearest the camera
  { x: 7.55, y: 68.98, width: 14.95, height: 6.2 },
  { x: 26.04, y: 69.26, width: 12.08, height: 6.2 },
  { x: 45.05, y: 69.63, width: 11.82, height: 6.11 },
  { x: 64.06, y: 69.91, width: 14.06, height: 6.2 },
  { x: 80.73, y: 70.19, width: 15.1, height: 6.48 },
];

/**
 * Whether a spot row was ever actually positioned. spotGeometry() cannot answer this — it is
 * built to always return a usable box, so an untouched row and a row flush to the top-left are
 * indistinguishable once it has run. Asked here, before the defaults are applied.
 */
function hasStoredGeometry(spot: any): boolean {
  if (!spot) return false;
  const usable = (value: unknown) => {
    if (value === null || value === undefined || value === "") return false;
    const n = Number(value);
    return Number.isFinite(n) && n > 0;
  };
  if (typeof spot.dimension === "string" && spot.dimension.trim() !== "") {
    try {
      const blob = JSON.parse(spot.dimension);
      if (usable(blob?.width) || usable(blob?.height) || usable(blob?.x) || usable(blob?.y)) {
        return true;
      }
    } catch {
      /* a malformed blob is no geometry at all */
    }
  }
  return (
    usable(spot.x_coordinates) ||
    usable(spot.y_coordinates) ||
    usable(spot.width) ||
    usable(spot.height) ||
    usable(spot.block_width) ||
    usable(spot.block_height)
  );
}

/** `find_event_exhibitor.stand_logo` — a bare filename under the legacy stand-logo folder. */
function standLogoUrl(value: string | null | undefined): string | undefined {
  const raw = (value ?? "").toString().trim();
  if (raw === "") return undefined;
  if (raw.startsWith("/") || /^(https?:)?\/\//i.test(raw)) return assetUrl(raw);
  return assetUrl(`/files/exhibitor_stand_logo/${raw}`);
}

/** The url when we actually hold the file (or it is remote), else null. */
function present(url: string | undefined | null): string | null {
  return localAssetExists(url) ? (url as string) : null;
}

async function read_getExhibitionZoneScene(
  eventId: number,
  zoneId: number
): Promise<ExhibitionZoneScene | null> {
  const zone = await prisma.find_event_lobby_child_layout_manager.findFirst({
    where: { id: zoneId, event_id: eventId, layout_type: "exhibition" },
    select: { id: true, title: true, image: true },
  });
  if (!zone) return null;

  /*
   * The halls in the organiser's own order — the same order the lobby's zone menu lists, which
   * is what the arrows have to follow for "next" to mean what the visitor sees it mean. Only
   * enabled zones are walkable: a disabled one is not in the menu and must not be steppable into.
   */
  const siblings = await prisma.find_event_lobby_child_layout_manager.findMany({
    where: { event_id: eventId, layout_type: "exhibition", status: "enabled" },
    orderBy: [{ sequence: "asc" }, { id: "asc" }],
    select: { id: true, title: true },
  });
  const index = siblings.findIndex((z: { id: number }) => z.id === zone.id);
  const neighbour = (offset: number): ZoneNeighbour | null => {
    if (index < 0 || siblings.length < 2) return null;
    const target = siblings[(index + offset + siblings.length) % siblings.length];
    return target ? { id: target.id, title: target.title || "Exhibition Zone" } : null;
  };

  /*
   * Same relaxation the auditorium scene documents: migrated spot rows routinely carry
   * event_id 0 and populate layout_child_id rather than event_layout_child_id, so demanding
   * both exact columns finds nothing on exactly the rows that came from the legacy.
   */
  const spots = await prisma.find_event_lobby_spots.findMany({
    where: {
      AND: [
        { OR: [{ event_id: eventId }, { event_id: 0 }] },
        { OR: [{ event_layout_child_id: zoneId }, { layout_child_id: zoneId }] },
      ],
    },
    orderBy: [{ stand_no: "asc" }, { id: "asc" }],
    select: {
      id: true,
      title: true,
      stand_no: true,
      spot_type: true,
      x_coordinates: true,
      y_coordinates: true,
      width: true,
      height: true,
      block_width: true,
      block_height: true,
      dimension: true,
    },
  });

  // Who is standing where. Both directions are read: spot_id is the authoritative link, but an
  // exhibitor allocated to the zone without a booth row still belongs in this room's list —
  // and after a bulk allocation that is, in practice, all of them.
  const exhibitors = await prisma.find_event_exhibitor.findMany({
    where: {
      event_id: eventId,
      status: "active",
      OR: [
        { spot_id: { in: spots.map((s: { id: number }) => s.id) } },
        { exhibition_zone_id: zoneId },
      ],
    },
    orderBy: [{ stand_number: "asc" }, { business: "asc" }],
    select: {
      id: true,
      business: true,
      stand_number: true,
      spot_id: true,
      logo: true,
      stand_logo: true,
      listing_id: true,
    },
  });

  const listingIds = [
    ...new Set(
      exhibitors
        .map((e: { listing_id: number | null }) => e.listing_id)
        .filter((id: number | null): id is number => !!id)
    ),
  ];
  const [listings, headerAssets] = await Promise.all([
    listingIds.length
      ? prisma.find_listings.findMany({
          where: { id: { in: listingIds } },
          select: { id: true, logo_extension: true },
        })
      : Promise.resolve([] as { id: number; logo_extension: string | null }[]),
    exhibitors.length
      ? prisma.find_event_lobby_layout_type_assets.findMany({
          where: {
            event_id: eventId,
            title: HEADER_SLOT,
            exhibition_stand_id: { in: exhibitors.map((e: { id: number }) => e.id) },
          },
          select: { exhibition_stand_id: true, asset_attachment: true },
        })
      : Promise.resolve([] as { exhibition_stand_id: number; asset_attachment: string }[]),
  ]);

  const listingById = new Map<number, any>(listings.map((l: any) => [l.id, l]));
  /*
   * Stand banners are written by scripts/generate-stand-artwork.ts into this app's OWN
   * public/images/lobby_assets folder as `event_<id>_top_banner_<stamp>.png`, which is what
   * exhibitorAssetUrl() resolves. lobbyAssetUrl() points at the legacy lobby mirror instead and
   * returns a 404 for every one of them — the broken-image boxes across the hall.
   */
  const headerByExhibitor = new Map<number, string>(
    headerAssets
      .filter((a: any) => String(a.asset_attachment ?? "").trim() !== "")
      .map((a: any) => [a.exhibition_stand_id, a.asset_attachment as string])
  );
  const spotById = new Map<number, any>((spots as any[]).map((s) => [s.id, s]));

  /*
   * Placement. A spot that was really positioned keeps its own box; everyone else is dealt the
   * next unused panel on the hall render, in stand-number order, so booth 1 is the first panel
   * and the room fills the way the numbers read.
   */
  let nextSlot = 0;
  const takenSlots = new Set<number>();
  const stands: ZoneStand[] = (exhibitors as any[]).map((exhibitor) => {
    const spot = exhibitor.spot_id ? spotById.get(exhibitor.spot_id) : undefined;
    const listing = exhibitor.listing_id ? listingById.get(exhibitor.listing_id) : undefined;
    const header = headerByExhibitor.get(exhibitor.id);

    let box: SpotBox | null;
    if (spot && hasStoredGeometry(spot)) {
      box = spotGeometry(spot, STAND_FALLBACK_WIDTH, STAND_FALLBACK_HEIGHT);
    } else {
      while (nextSlot < ZONE_HALL_SLOTS.length && takenSlots.has(nextSlot)) nextSlot += 1;
      const slot = ZONE_HALL_SLOTS[nextSlot];
      if (slot) {
        takenSlots.add(nextSlot);
        nextSlot += 1;
        box = { ...slot, angle: 0 };
      } else {
        box = null; // more exhibitors than panels — listed beneath the hall instead of stacked
      }
    }

    return {
      key: `ex-${exhibitor.id}`,
      spotId: exhibitor.spot_id ?? 0,
      exhibitorId: exhibitor.id,
      business: exhibitor.business || "Exhibitor",
      standNumber:
        (exhibitor.stand_number && String(exhibitor.stand_number).trim()) ||
        (spot?.stand_no != null ? String(spot.stand_no) : null),
      box,
      // Checked the same way as the hall artwork: a banner we do not hold renders as a broken
      // image box, which looks worse on the floor than the exhibitor's name on a clean plate.
      artworkUrl: present(header ? exhibitorAssetUrl(header) : undefined),
      /*
       * The live hall hangs the exhibitor's STAND logo on the panel (files/exhibitor_stand_logo),
       * which is the image cut for that space. It is second only to a generated top_banner, and
       * ahead of the profile logo, which is a square avatar and reads badly stretched across a
       * wide sign.
       */
      logoUrl:
        present(standLogoUrl(exhibitor.stand_logo)) ??
        present(exhibitorLogoUrl(exhibitor.logo, listing?.id, listing?.logo_extension)),
    };
  });

  const own = [standTemplateUrl(zone.image), exhibitorAssetUrl(zone.image), assetUrl(zone.image)].find(
    (candidate) => localAssetExists(candidate)
  );
  const background = own ?? ZONE_HALL_ARTWORK;

  return {
    id: zone.id,
    title: zone.title || "Exhibition Zone",
    backgroundUrl: background,
    stands,
    previous: neighbour(-1),
    next: neighbour(1),
    position: index >= 0 ? index + 1 : 0,
    totalZones: siblings.length,
  };
}

export const getExhibitionZoneScene = cachedRead(
  ["exhibitors", "getExhibitionZoneScene"],
  read_getExhibitionZoneScene,
  { tags: [CACHE_TAGS.exhibitors] }
);

/**
 * Whether a room can be drawn at all, or the caller should fall back to a list.
 *
 * Artwork is no longer part of the test — there is always a hall to stand on now. What is left
 * is the only thing that can still be empty: whether anyone is allocated to this zone.
 */
export function zoneSceneIsRenderable(scene: ExhibitionZoneScene | null): boolean {
  return !!scene && scene.stands.length > 0;
}
