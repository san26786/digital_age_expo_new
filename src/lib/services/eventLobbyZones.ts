import { prisma } from "@/lib/prisma";

/**
 * ===========================================================================
 *  WHICH EXHIBITION ZONES AN EVENT HAS — ONE ANSWER, FOR EVERY CALLER
 * ===========================================================================
 *
 *  An exhibition zone is a `find_event_lobby_child_layout_manager` row with
 *  `layout_type = "exhibition"`, hanging off one of the event's lobby layouts. Two places need
 *  that list and they must never disagree: the Exhibition Zone dropdown on Add / Edit Trade Stand,
 *  and the auto-allocator. A zone the allocator can fill but the form cannot display would produce
 *  stands nobody could subsequently change.
 *
 *  ---------------------------------------------------------------------------
 *  WHY THIS DOES NOT JUST TAKE THE FIRST LOBBY
 *  ---------------------------------------------------------------------------
 *
 *  It used to. `findFirst({ orderBy: { id: "asc" } })` picks the lowest-numbered lobby layout on
 *  the event and reads zones from that one alone — which is correct right up until an event has
 *  two lobby rows. A cloned site is exactly that case: the copy brings a fresh, empty lobby, the
 *  zones stay attached to the lobby they were created under, and because the new row can sort
 *  first, every zone on the event becomes invisible. The dropdown empties, the allocator reports
 *  nothing to allocate from, and the data is perfectly fine the whole time.
 *
 *  So the rule is: prefer the lobby that actually HAS enabled exhibition zones. The lowest id is
 *  only a tie-break between lobbies that are equally usable, which is what it was standing in for
 *  all along.
 *
 *  Zones whose `event_layout_id` is null are treated as their own group and used if nothing else
 *  qualifies — an orphaned zone is still a zone, and refusing to see it helps nobody.
 */

export interface ExhibitionZone {
  id: number;
  title: string | null;
}

export interface ExhibitionZoneLookup {
  /** Enabled zones on the chosen lobby, in the order the organiser arranged them. */
  zones: ExhibitionZone[];
  /** The lobby they were read from. Null when there are none. */
  lobbyId: number | null;
  /**
   * Set only when `zones` is empty: which of the three things is wrong, and where to fix it.
   * "No enabled exhibition zones" is true but useless — it does not say whether to create a
   * lobby, create a zone, or switch one on, and those are different jobs on different screens.
   */
  problem: string | null;
}

interface ZoneChild {
  id: number;
  title: string | null;
  status: string | null;
  event_layout_id: number | null;
}

/** Group key for a zone's lobby. Null lobby gets its own bucket rather than being discarded. */
function lobbyKey(zone: ZoneChild): number {
  return zone.event_layout_id ?? 0;
}

export async function listExhibitionZones(eventId: number): Promise<ExhibitionZoneLookup> {
  const [lobbies, allZones] = await Promise.all([
    prisma.find_event_lobby_layout_manager.findMany({
      where: { event_id: eventId },
      orderBy: { id: "asc" },
      select: { id: true, title: true },
    }),
    /*
     * Every exhibition child on the event, unfiltered by lobby and by status. The extra rows cost
     * nothing, and they are what makes "create a zone" distinguishable from "switch on the one
     * you already have".
     */
    prisma.find_event_lobby_child_layout_manager.findMany({
      where: { event_id: eventId, layout_type: "exhibition" },
      orderBy: [{ sequence: "asc" }, { id: "asc" }],
      select: { id: true, title: true, status: true, event_layout_id: true },
    }),
  ]);

  const enabled = allZones.filter((z: ZoneChild) => (z.status ?? "") === "enabled");

  if (enabled.length > 0) {
    // Pick the lobby carrying the most enabled zones; lowest lobby id breaks a tie.
    const byLobby = new Map<number, ZoneChild[]>();
    for (const zone of enabled) {
      const key = lobbyKey(zone);
      const bucket = byLobby.get(key);
      if (bucket) bucket.push(zone);
      else byLobby.set(key, [zone]);
    }

    let chosenKey = -1;
    let chosen: ZoneChild[] = [];
    for (const [key, group] of byLobby) {
      if (group.length > chosen.length || (group.length === chosen.length && key < chosenKey)) {
        chosenKey = key;
        chosen = group;
      }
    }

    return {
      zones: chosen.map((z) => ({ id: z.id, title: z.title })),
      lobbyId: chosenKey > 0 ? chosenKey : null,
      problem: null,
    };
  }

  // ---- Nothing usable. Work out which of the three it is.

  if (lobbies.length === 0 && allZones.length === 0) {
    return {
      zones: [],
      lobbyId: null,
      problem:
        `Event #${eventId} has no virtual lobby, and exhibition zones live inside one. Create the ` +
        `lobby on Configure Lobby, then add zones to it on Child Lobby Details.`,
    };
  }

  if (allZones.length === 0) {
    const names = lobbies.map((l) => l.title || `#${l.id}`).join(", ");
    return {
      zones: [],
      lobbyId: lobbies[0]?.id ?? null,
      problem:
        `Event #${eventId} has a lobby (${names}) but no exhibition zones in it. Add one on Child ` +
        `Lobby Details with Layout type set to Exhibition — each zone provides a block of booths ` +
        `for exhibitors to be allocated to.`,
    };
  }

  const listed = allZones
    .map((z: ZoneChild) => `${z.title || `Zone #${z.id}`} (${z.status || "no status"})`)
    .join(", ");
  return {
    zones: [],
    lobbyId: lobbies[0]?.id ?? null,
    problem:
      `Event #${eventId} has ${allZones.length} exhibition zone${allZones.length === 1 ? "" : "s"}, ` +
      `but none ${allZones.length === 1 ? "is" : "are"} enabled: ${listed}. Set at least one to ` +
      `Enabled on Child Lobby Details.`,
  };
}

/* ===========================================================================
 *  CREATING WHAT IS MISSING
 * ======================================================================== */

export interface EnsureZonesResult {
  lobbyId: number;
  createdLobby: boolean;
  enabledExisting: number;
  createdZones: number;
  totalZones: number;
  /** The Exhibitor Stand Layout allocated stands will use, created here if there was none. */
  standLayoutTitle: string | null;
  createdStandLayout: boolean;
}

/**
 * The Exhibitor Stand Layout an event falls back to.
 *
 * NOT "Basic Stand". slotsForStandLayout() switches on the title: anything matching /basic/i gets
 * the Basic Stand's five upload slots, measured against artwork this layout does not have.
 * "Standard Stand" lands on the default six, which are measured against the fallback
 * `stand_img.png` the designer already shows when no artwork is set — so the slots line up with
 * what an organiser actually sees.
 */
const DEFAULT_STAND_LAYOUT_TITLE = "Standard Stand";

/**
 * The stand layout allocated exhibitors should be given: the event's default if one is marked,
 * otherwise its first. Null when the event has none at all.
 */
export async function getDefaultStandLayout(
  eventId: number,
): Promise<{ id: number; title: string } | null> {
  const rows = await prisma.find_event_lobby_child_layout_manager.findMany({
    where: { event_id: eventId, layout_type: "exhibition_stand" },
    // is_default first — it is the flag the organiser sets to mean exactly this.
    orderBy: [{ is_default: "desc" }, { sequence: "asc" }, { id: "asc" }],
    select: { id: true, title: true },
    take: 1,
  });
  const row = rows[0];
  return row ? { id: row.id, title: row.title || `Layout #${row.id}` } : null;
}

/** Ceiling on one press, so a mistyped number cannot create hundreds of zones. */
export const MAX_ZONES_PER_SETUP = 40;

/**
 * The event's lobby, created if it has none.
 *
 * An existing lobby is REUSED, never replaced — its artwork, description and spots are somebody's
 * work and nothing here has any business overwriting them. Only a genuinely absent lobby is
 * created, and it is created bare: a lobby with no template is enough to hang zones off, and
 * guessing at artwork would be worse than leaving it for the organiser to import.
 */
async function ensureLobby(
  eventId: number,
  userId: number,
): Promise<{ lobbyId: number; createdLobby: boolean }> {
  const existing = await prisma.find_event_lobby_layout_manager.findFirst({
    where: { event_id: eventId },
    orderBy: { id: "asc" },
    select: { id: true },
  });
  if (existing) return { lobbyId: existing.id, createdLobby: false };

  const created = await prisma.find_event_lobby_layout_manager.create({
    data: {
      event_id: eventId,
      user_id: userId,
      title: "Main Lobby",
      description: "Created automatically so exhibition zones could be added.",
      status: "enabled",
      // The spot editor's default dot size. Matches what importLobbyFromTemplate() uses.
      spot_size: 5,
      updated_on: new Date(),
    },
    select: { id: true },
  });
  return { lobbyId: created.id, createdLobby: true };
}

/**
 * Bring an event up to `zoneCount` usable exhibition zones, creating only what is missing.
 *
 * This exists because the three failure modes above all have the same shape — something further
 * up the chain was never created — and walking an organiser through Configure Lobby and then
 * Child Lobby Details, once per zone, to produce rows with no artwork and no settings is busywork
 * a button can do. It is deliberately additive:
 *
 *   - an existing lobby is reused, never replaced. Its artwork, description and spots are
 *     somebody's work and this function has no business touching them.
 *   - a DISABLED exhibition zone is switched on rather than duplicated, because it was almost
 *     certainly created on purpose and switched off later.
 *   - zones are topped up to the requested count, not created blindly. Asking for 3 when 2 exist
 *     adds 1.
 *
 * Booths are not created here. resolveZoneBooths() fills each zone on first read, which keeps one
 * definition of how many booths a zone holds instead of two that can drift apart.
 */
export async function ensureExhibitionZones(
  eventId: number,
  userId: number,
  zoneCount: number,
): Promise<EnsureZonesResult> {
  const wanted = Math.max(1, Math.min(MAX_ZONES_PER_SETUP, Math.floor(zoneCount) || 1));

  // ---- 1. A lobby to hang them off.
  const { lobbyId, createdLobby } = await ensureLobby(eventId, userId);

  // ---- 2. Switch on anything that is already there but disabled.
  const onLobby = await prisma.find_event_lobby_child_layout_manager.findMany({
    where: { event_id: eventId, event_layout_id: lobbyId, layout_type: "exhibition" },
    orderBy: [{ sequence: "asc" }, { id: "asc" }],
    select: { id: true, status: true, sequence: true },
  });

  const disabled = onLobby.filter((z) => (z.status ?? "") !== "enabled");
  if (disabled.length > 0) {
    await prisma.find_event_lobby_child_layout_manager.updateMany({
      where: { id: { in: disabled.map((z) => z.id) }, event_id: eventId },
      data: { status: "enabled", updated_on: new Date() },
    });
  }

  // ---- 3. Top up to the requested count.
  // Sequential rather than createMany, so each zone's `sequence` continues the existing run
  // rather than colliding with it.
  let nextSequence = onLobby.reduce((max, z) => Math.max(max, z.sequence ?? 0), 0) + 1;
  let createdZones = 0;

  while (onLobby.length + createdZones < wanted) {
    await prisma.find_event_lobby_child_layout_manager.create({
      data: {
        event_id: eventId,
        event_layout_id: lobbyId,
        user_id: userId,
        title: `Exhibition Zone ${nextSequence}`,
        layout_type: "exhibition",
        status: "enabled",
        sequence: nextSequence,
        updated_on: new Date(),
      },
      select: { id: true },
    });
    createdZones += 1;
    nextSequence += 1;
  }

  /*
   * ---- 4. A stand layout to put exhibitors on.
   *
   * Zones decide WHERE a stand sits; the layout decides what it LOOKS like — which background and
   * which upload slots the designer offers. An event with zones but no layout allocates fine and
   * then shows every booth as an empty placeholder, so the two are set up together.
   */
  let standLayout = await getDefaultStandLayout(eventId);
  let createdStandLayout = false;

  if (!standLayout) {
    const created = await prisma.find_event_lobby_child_layout_manager.create({
      data: {
        event_id: eventId,
        event_layout_id: lobbyId,
        user_id: userId,
        title: DEFAULT_STAND_LAYOUT_TITLE,
        layout_type: "exhibition_stand",
        status: "enabled",
        sequence: 1,
        is_default: 1,
        updated_on: new Date(),
      },
      select: { id: true, title: true },
    });
    standLayout = { id: created.id, title: created.title || DEFAULT_STAND_LAYOUT_TITLE };
    createdStandLayout = true;
  }

  return {
    lobbyId,
    createdLobby,
    enabledExisting: disabled.length,
    createdZones,
    totalZones: onLobby.length + createdZones,
    standLayoutTitle: standLayout.title,
    createdStandLayout,
  };
}

/* ===========================================================================
 *  COPYING ZONES FROM ANOTHER EVENT
 * ======================================================================== */

/**
 * Setting up a new edition of a show almost never means inventing its exhibition halls. They are
 * last year's halls: the same names, the same artwork, the same booth positions on the same floor
 * plan. Rebuilding them by hand — a zone at a time, then twenty-two booths dragged onto the
 * artwork in each — is hours of work to arrive back where the previous event already was.
 *
 * So this copies them. It brings across the zones, the stand layouts, and each zone's booth
 * positions, and it brings NOTHING that belongs to the old event's exhibitors: no allocations, no
 * captions, no uploaded stand artwork. The result is last year's empty hall, ready to allocate
 * into.
 */

export interface ZoneSourceEvent {
  eventId: number;
  title: string;
  zones: number;
  standLayouts: number;
  booths: number;
}

export interface CopyZonesResult {
  lobbyId: number;
  createdLobby: boolean;
  zonesCopied: number;
  standLayoutsCopied: number;
  boothsCopied: number;
  /** Titles already present on the target, left alone rather than duplicated. */
  skipped: string[];
}

/** A hard stop, so a mis-picked source cannot import a thousand rows in one press. */
const MAX_COPIED_ZONES = 60;
const MAX_COPIED_BOOTHS = 3000;

/** Both halves of the Child Lobby Zones list: the halls, and the stand designs used inside them. */
const COPYABLE_LAYOUT_TYPES = ["exhibition", "exhibition_stand"] as const;

/**
 * Events worth offering as a source: any event that actually has zones to copy, newest first.
 *
 * Deliberately not filtered to events the signed-in person organises. canManageLobby() already
 * admits any signed-in user to every lobby screen on any event they can name in a URL — that is
 * this app's current posture, documented at length in eventAccess.ts — so filtering here would
 * imply a protection the surrounding pages do not provide. If that posture is tightened, this is
 * one of the places that should be tightened with it.
 */
export async function listZoneSourceEvents(excludeEventId: number): Promise<ZoneSourceEvent[]> {
  const zones = await prisma.find_event_lobby_child_layout_manager.findMany({
    where: {
      layout_type: { in: [...COPYABLE_LAYOUT_TYPES] },
      event_id: { not: excludeEventId, gt: 0 },
    },
    select: { id: true, event_id: true, layout_type: true },
  });
  if (zones.length === 0) return [];

  const eventIds = [...new Set(zones.map((z) => z.event_id))];

  const [events, boothCounts] = await Promise.all([
    prisma.find_events.findMany({
      where: { id: { in: eventIds } },
      orderBy: { id: "desc" },
      select: { id: true, title: true, label: true },
    }),
    prisma.find_event_lobby_spots.groupBy({
      by: ["event_id"],
      where: { event_id: { in: eventIds }, spot_type: "exhibitor" },
      _count: { _all: true },
    }),
  ]);

  const boothsByEvent = new Map<number, number>(
    boothCounts.map((b: { event_id: number; _count: { _all: number } }) => [b.event_id, b._count._all]),
  );

  return events
    .map((e: { id: number; title: string | null; label: string | null }) => {
      const mine = zones.filter((z) => z.event_id === e.id);
      return {
        eventId: e.id,
        title: e.title || e.label || `Event #${e.id}`,
        zones: mine.filter((z) => z.layout_type === "exhibition").length,
        standLayouts: mine.filter((z) => z.layout_type === "exhibition_stand").length,
        booths: boothsByEvent.get(e.id) ?? 0,
      };
    })
    .filter((e: ZoneSourceEvent) => e.zones > 0 || e.standLayouts > 0);
}

/**
 * Copy one event's exhibition zones, stand layouts and booth positions onto another.
 *
 * ADDITIVE AND RE-RUNNABLE. A zone whose title and layout type already exist on the target is
 * skipped, not duplicated — so running it twice, or running it again after the source gains a
 * zone, does the right thing instead of producing "Zone 1", "Zone 1", "Zone 1".
 *
 * `enableCopied` exists because zones are very often left disabled on the event they came from,
 * and copying that state across produces zones that look present and allocate nothing. The
 * screen asks rather than deciding silently.
 */
export async function copyZonesFromEvent(
  targetEventId: number,
  userId: number,
  sourceEventId: number,
  options: { enableCopied: boolean; copyBooths: boolean },
): Promise<CopyZonesResult> {
  if (sourceEventId === targetEventId) {
    throw new Error("An event cannot copy its zones from itself.");
  }

  const sourceZones = await prisma.find_event_lobby_child_layout_manager.findMany({
    where: { event_id: sourceEventId, layout_type: { in: [...COPYABLE_LAYOUT_TYPES] } },
    orderBy: [{ sequence: "asc" }, { id: "asc" }],
    take: MAX_COPIED_ZONES,
  });

  if (sourceZones.length === 0) {
    throw new Error("That event has no exhibition zones or stand layouts to copy.");
  }

  const { lobbyId, createdLobby } = await ensureLobby(targetEventId, userId);

  // What the target already has, so an existing zone is never duplicated.
  const existing = await prisma.find_event_lobby_child_layout_manager.findMany({
    where: { event_id: targetEventId, layout_type: { in: [...COPYABLE_LAYOUT_TYPES] } },
    select: { title: true, layout_type: true },
  });
  const have = new Set(
    existing.map((z: { title: string | null; layout_type: string }) =>
      `${z.layout_type}\u0000${(z.title ?? "").trim().toLowerCase()}`,
    ),
  );

  const result: CopyZonesResult = {
    lobbyId,
    createdLobby,
    zonesCopied: 0,
    standLayoutsCopied: 0,
    boothsCopied: 0,
    skipped: [],
  };

  for (const source of sourceZones) {
    const key = `${source.layout_type}\u0000${(source.title ?? "").trim().toLowerCase()}`;
    if (have.has(key)) {
      result.skipped.push(source.title || `Zone #${source.id}`);
      continue;
    }
    have.add(key);

    const created = await prisma.find_event_lobby_child_layout_manager.create({
      data: {
        event_id: targetEventId,
        event_layout_id: lobbyId,
        user_id: userId,
        title: source.title,
        layout_type: source.layout_type,
        image: source.image,
        help_image: source.help_image,
        description: source.description,
        total_steps: source.total_steps,
        sequence: source.sequence,
        template_id: source.template_id,
        is_default: source.is_default,
        ex_default_zone_as_visitor: source.ex_default_zone_as_visitor,
        // Disabled zones copy across as disabled unless the organiser asked otherwise; a stand
        // layout's status is not a hall being open, so it is carried over untouched.
        status:
          options.enableCopied && source.layout_type === "exhibition"
            ? "enabled"
            : (source.status ?? "enabled"),
        // The provenance trail the app's own Copy button writes. Worth keeping: it is the only
        // record of where a zone came from once the titles have been edited.
        copied_child_id: source.id,
        updated_on: new Date(),
      },
      select: { id: true },
    });

    if (source.layout_type === "exhibition") result.zonesCopied += 1;
    else result.standLayoutsCopied += 1;

    if (!options.copyBooths || result.boothsCopied >= MAX_COPIED_BOOTHS) continue;

    /*
     * The booths, with their positions.
     *
     * This is the part that makes copying worth doing rather than creating blank zones: x/y, size
     * and stand number are what took someone an afternoon to place on the artwork. Everything
     * tying a booth to an EXHIBITOR is dropped — the caption, the linked asset, the post-action
     * exhibitor id — because those belong to the old event's allocations, not to its floor plan.
     */
    const sourceBooths = await prisma.find_event_lobby_spots.findMany({
      where: { event_layout_child_id: source.id, spot_type: "exhibitor" },
      orderBy: [{ stand_no: "asc" }, { id: "asc" }],
      take: Math.min(200, MAX_COPIED_BOOTHS - result.boothsCopied),
    });
    if (sourceBooths.length === 0) continue;

    const now = new Date();
    const made = await prisma.find_event_lobby_spots.createMany({
      data: sourceBooths.map((b) => ({
        event_id: targetEventId,
        event_layout_child_id: created.id,
        // Only painted on the lobby artwork if the source booth was — getLobbyHotspots() selects
        // on this column, so carrying the source's choice keeps the floor plan looking the same.
        event_layout_id: b.event_layout_id ? lobbyId : null,
        user_id: userId,
        spot_type: b.spot_type,
        stand_no: b.stand_no,
        x_coordinates: b.x_coordinates,
        y_coordinates: b.y_coordinates,
        width: b.width,
        height: b.height,
        dimension: b.dimension,
        spot_color: b.spot_color,
        // Blank: this is the "Visit <business>" caption of whoever stood here last year.
        title: "",
        updated_on: now,
      })),
    });
    result.boothsCopied += made.count;
  }

  return result;
}
