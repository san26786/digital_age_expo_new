import { prisma } from "@/lib/prisma";
import type { EventMemberContext } from "@/lib/services/eventAccess";
import { BOOTHS_PER_ZONE, resolveZoneBooths } from "@/lib/services/eventExhibitorAdmin";
import {
  getDefaultStandLayout,
  listExhibitionZones,
  type ExhibitionZone,
} from "@/lib/services/eventLobbyZones";

/**
 * ===========================================================================
 *  AUTO-ALLOCATE TRADE STANDS
 * ===========================================================================
 *
 *  One press: every ACTIVE exhibitor who does not yet hold a booth is given the next free one,
 *  in alphabetical order of business name, filling the exhibition zones in their own sequence.
 *
 *  ---------------------------------------------------------------------------
 *  WHY ALPHABETICAL, AND WHY IT IS COMPUTED TWICE
 *  ---------------------------------------------------------------------------
 *
 *  Alphabetical because it is the one order that is defensible to the exhibitors themselves: no
 *  one can argue they were pushed to the back of the hall. It is also stable — re-running the
 *  allocation after five more exhibitors join does not reshuffle the ones already placed, because
 *  allocated exhibitors are never moved.
 *
 *  The plan is computed for the preview and computed AGAIN at the moment of writing, from the
 *  database as it stands then. Between the two, someone can allocate a stand by hand, a new
 *  exhibitor can be approved, or the same page can be submitted from a second tab. A preview is a
 *  photograph; the write has to look again.
 *
 *  ---------------------------------------------------------------------------
 *  WHAT IT REFUSES TO DO
 *  ---------------------------------------------------------------------------
 *
 *  MOVE ANYONE. An exhibitor who already holds a booth is left exactly where they are, whatever
 *  the alphabet says. A stand number is frequently negotiated, printed and invoiced, and a bulk
 *  reshuffle would undo all of that silently. Only exhibitors with no booth are placed.
 *
 *  TOUCH A PENDING EXHIBITOR. Pending means not confirmed onto the event, so there is nothing to
 *  allocate yet. A pending exhibitor who somehow holds a booth still OCCUPIES it though — they are
 *  counted among the taken, or the allocator would hand their booth to someone else.
 *
 *  ---------------------------------------------------------------------------
 *  WHAT A BOOTH IS, AND IS NOT
 *  ---------------------------------------------------------------------------
 *
 *  Allocating writes three fields on the exhibitor — zone, spot and stand number — and captions
 *  the spot. It does NOT place a stand visually on the lobby artwork: booths created by the
 *  top-up in resolveZoneBooths() deliberately carry no coordinates, so an allocated exhibitor has
 *  a real, listable, invoiceable stand number but no dot on the floor plan until someone
 *  positions it.
 */

export interface StandAllocationAssignment {
  exhibitorId: number;
  business: string;
  contact: string;
  email: string;
  zoneId: number;
  zoneName: string;
  spotId: number;
  standNumber: string;
  /** The Exhibitor Stand Layout this stand will use. Null when the event has none defined. */
  standLayoutId: number | null;
  standLayoutName: string;
}

export interface StandAllocationUnplaced {
  exhibitorId: number;
  business: string;
  contact: string;
  email: string;
  reason: string;
}

export interface StandAllocationZone {
  id: number;
  name: string;
  total: number;
  free: number;
}

export interface StandAllocationPlan {
  assignments: StandAllocationAssignment[];
  unplaced: StandAllocationUnplaced[];
  zones: StandAllocationZone[];
  /**
   * Set only when there are no zones to allocate from: what is actually wrong and where to fix
   * it. Null whenever zones were found, including when they are simply full.
   */
  zoneProblem: string | null;
  summary: {
    /** Active exhibitors on this event, allocated or not. */
    activeTotal: number;
    /** Active exhibitors who already hold a booth and are therefore left alone. */
    alreadyAllocated: number;
    needingBooth: number;
    freeBooths: number;
    willAllocate: number;
    shortfall: number;
    /** How many booths one zone provides. Sent so the screen can suggest a zone count. */
    boothsPerZone: number;
  };
}

export type StandAllocationOutcomeStatus = "allocated" | "skipped" | "failed";

export interface StandAllocationOutcome {
  exhibitorId: number;
  business: string;
  contact: string;
  status: StandAllocationOutcomeStatus;
  zoneName?: string;
  standNumber?: string;
  reason?: string;
}

export interface StandAllocationResult {
  allocated: number;
  skipped: number;
  failed: number;
  unplaced: number;
  outcomes: StandAllocationOutcome[];
}

interface Candidate {
  id: number;
  business: string;
  contact: string;
  email: string;
  /** Already on a stand layout, so the allocator leaves that field alone. */
  hasStandLayout: boolean;
}

/** A blank business name sorts last rather than first, where it would head the whole list. */
function byBusinessThenContact(a: Candidate, b: Candidate): number {
  const left = a.business.trim().toLowerCase();
  const right = b.business.trim().toLowerCase();
  if (!left && right) return 1;
  if (left && !right) return -1;

  const byBusiness = left.localeCompare(right);
  if (byBusiness !== 0) return byBusiness;

  const byContact = a.contact.trim().toLowerCase().localeCompare(b.contact.trim().toLowerCase());
  // id last, so the order is total: two identical names must not swap places between the preview
  // and the write, or the booths they were shown would swap with them.
  return byContact !== 0 ? byContact : a.id - b.id;
}


/**
 * Work out who goes where, writing nothing to the exhibitor rows.
 *
 * Not strictly read-only: resolveZoneBooths() repairs and tops each zone up to its full set of
 * booths, which can create `find_event_lobby_spots` rows. That is the same thing opening the
 * Exhibition Zone dropdown on the Add Trade Stand form already does, and it has to happen before
 * anything can be counted — a zone's free capacity is not knowable until its booths exist.
 */
export async function planStandAllocation(context: EventMemberContext): Promise<StandAllocationPlan> {
  const empty: StandAllocationPlan = {
    assignments: [],
    unplaced: [],
    zones: [],
    zoneProblem: null,
    summary: {
      activeTotal: 0,
      alreadyAllocated: 0,
      needingBooth: 0,
      freeBooths: 0,
      willAllocate: 0,
      shortfall: 0,
      boothsPerZone: BOOTHS_PER_ZONE,
    },
  };

  if (context.role !== "organiser") return empty;

  const [zoneLookup, standLayout, activeExhibitors, holders] = await Promise.all([
    listExhibitionZones(context.eventId),
    getDefaultStandLayout(context.eventId),
    prisma.find_event_exhibitor.findMany({
      where: { event_id: context.eventId, status: "active" },
      select: {
        id: true,
        business: true,
        name: true,
        first_name: true,
        last_name: true,
        email: true,
        spot_id: true,
        ex_stand_layout_id: true,
      },
    }),
    /*
     * Every booth held by ANYONE on this event, not just the active ones. A pending exhibitor
     * sitting on a booth still occupies it; counting only active holders would hand that booth
     * out a second time.
     */
    prisma.find_event_exhibitor.findMany({
      where: { event_id: context.eventId, spot_id: { not: null } },
      select: { spot_id: true },
    }),
  ]);

  const takenIds = new Set<number>(
    holders
      .map((h: { spot_id: number | null }) => h.spot_id)
      .filter((id: number | null): id is number => typeof id === "number" && id > 0),
  );

  const toCandidate = (e: {
    id: number;
    business: string | null;
    name: string | null;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    ex_stand_layout_id: number | null;
  }): Candidate => ({
    id: e.id,
    business: (e.business ?? "").trim(),
    contact: (e.name ?? "").trim() || `${e.first_name ?? ""} ${e.last_name ?? ""}`.trim(),
    email: (e.email ?? "").trim(),
    hasStandLayout: typeof e.ex_stand_layout_id === "number" && e.ex_stand_layout_id > 0,
  });

  const alreadyAllocated = activeExhibitors.filter(
    (e: { spot_id: number | null }) => typeof e.spot_id === "number" && e.spot_id > 0,
  ).length;

  const candidates = activeExhibitors
    .filter((e: { spot_id: number | null }) => !(typeof e.spot_id === "number" && e.spot_id > 0))
    .map(toCandidate)
    .sort(byBusinessThenContact);

  const summaryBase = {
    activeTotal: activeExhibitors.length,
    alreadyAllocated,
    needingBooth: candidates.length,
    boothsPerZone: BOOTHS_PER_ZONE,
  };

  const zones = zoneLookup.zones;

  if (zones.length === 0) {
    // One sentence, repeated on every row, saying exactly which of the four things is wrong.
    const reason = zoneLookup.problem ?? "This event has no enabled exhibition zones to allocate from.";
    return {
      assignments: [],
      unplaced: candidates.map((c) => ({
        exhibitorId: c.id,
        business: c.business,
        contact: c.contact,
        email: c.email,
        reason,
      })),
      zones: [],
      zoneProblem: reason,
      summary: { ...summaryBase, freeBooths: 0, willAllocate: 0, shortfall: candidates.length },
    };
  }

  /*
   * Build the free-booth queue zone by zone, in sequence order. Sequential rather than in
   * parallel: resolveZoneBooths() creates rows, and running several zones at once against the
   * same pool makes the numbering it hands out non-deterministic.
   */
  const queue: { zone: ExhibitionZone; spotId: number; standNo: number | null }[] = [];
  const zoneSummaries: StandAllocationZone[] = [];

  for (const zone of zones) {
    let booths: { id: number; stand_no: number | null; title: string | null }[] = [];
    try {
      booths = await resolveZoneBooths(context, zone.id, takenIds);
    } catch {
      // A zone that cannot be normalised contributes nothing rather than failing the whole plan.
      booths = [];
    }

    const free = booths.filter((b) => !takenIds.has(b.id));
    zoneSummaries.push({
      id: zone.id,
      name: zone.title || `Zone #${zone.id}`,
      total: booths.length,
      free: free.length,
    });

    for (const booth of free) queue.push({ zone, spotId: booth.id, standNo: booth.stand_no });
  }

  const assignments: StandAllocationAssignment[] = [];
  const unplaced: StandAllocationUnplaced[] = [];

  candidates.forEach((candidate, index) => {
    const slot = queue[index];
    if (!slot) {
      unplaced.push({
        exhibitorId: candidate.id,
        business: candidate.business,
        contact: candidate.contact,
        email: candidate.email,
        reason: `No free booth left — all ${queue.length} across ${zones.length} zone${
          zones.length === 1 ? "" : "s"
        } are taken.`,
      });
      return;
    }

    assignments.push({
      exhibitorId: candidate.id,
      business: candidate.business,
      contact: candidate.contact,
      email: candidate.email,
      zoneId: slot.zone.id,
      zoneName: slot.zone.title || `Zone #${slot.zone.id}`,
      spotId: slot.spotId,
      /*
       * Null means "leave it alone": either the event has no stand layout to give, or this
       * exhibitor is already on one that somebody chose. Only a genuinely unset layout is filled
       * in, for the same reason a held booth is never reassigned.
       */
      standLayoutId: candidate.hasStandLayout ? null : (standLayout?.id ?? null),
      standLayoutName: candidate.hasStandLayout
        ? "Already set"
        : (standLayout?.title ?? "None on this event"),
      /*
       * The exhibitor's stand_number and the spot's stand_no must agree. resolveZoneBooths()
       * treats the EXHIBITOR's value as authoritative and rewrites the spot to match it, so
       * writing anything else here would corrupt the zone's numbering on the next read.
       */
      standNumber: slot.standNo !== null && slot.standNo !== undefined ? String(slot.standNo) : "",
    });
  });

  return {
    assignments,
    unplaced,
    zones: zoneSummaries,
    zoneProblem: null,
    summary: {
      ...summaryBase,
      freeBooths: queue.length,
      willAllocate: assignments.length,
      shortfall: unplaced.length,
    },
  };
}

/**
 * Apply the allocation.
 *
 * Re-plans first, so what is written reflects the database now rather than when the preview was
 * drawn. Each exhibitor is then claimed with `spot_id: null` in the WHERE clause — an optimistic
 * check that costs nothing and means an exhibitor allocated by hand in the meantime is reported
 * as skipped instead of being quietly overwritten.
 *
 * Written one at a time rather than in a single transaction, deliberately: the screen reports a
 * per-exhibitor outcome, and one failing row must not roll back two hundred good ones.
 *
 * WHAT THIS STILL CANNOT DO: stop two organisers pressing the button in the same instant. Both
 * plan against the same free booths and both write. `spot_id` carries no unique constraint, so
 * the second one wins the row. Rare, recoverable by hand, and the alternative — locking the
 * exhibitor table for the length of a two-hundred-row write — is worse.
 */
export async function allocateStands(context: EventMemberContext): Promise<StandAllocationResult> {
  const result: StandAllocationResult = {
    allocated: 0,
    skipped: 0,
    failed: 0,
    unplaced: 0,
    outcomes: [],
  };

  if (context.role !== "organiser") return result;

  const plan = await planStandAllocation(context);
  result.unplaced = plan.unplaced.length;

  for (const assignment of plan.assignments) {
    const outcome: StandAllocationOutcome = {
      exhibitorId: assignment.exhibitorId,
      business: assignment.business,
      contact: assignment.contact,
      status: "failed",
      zoneName: assignment.zoneName,
      standNumber: assignment.standNumber,
    };

    try {
      const claimed = await prisma.find_event_exhibitor.updateMany({
        where: { id: assignment.exhibitorId, event_id: context.eventId, spot_id: null },
        data: {
          exhibition_zone_id: assignment.zoneId,
          spot_id: assignment.spotId,
          stand_number: assignment.standNumber,
          // undefined tells Prisma to leave the column untouched — see standLayoutId above.
          ex_stand_layout_id: assignment.standLayoutId ?? undefined,
        },
      });

      if (claimed.count === 0) {
        outcome.status = "skipped";
        outcome.reason = "Allocated by someone else while this was open.";
        result.skipped += 1;
      } else {
        // Same caption the Add/Edit Trade Stand form writes, so a booth allocated either way
        // reads identically in the lobby. VarChar(255) — a long business name would not fit.
        await prisma.find_event_lobby_spots.updateMany({
          where: { id: assignment.spotId, event_id: context.eventId },
          data: { title: `Visit ${assignment.business}`.slice(0, 255), updated_on: new Date() },
        });
        outcome.status = "allocated";
        result.allocated += 1;
      }
    } catch (err) {
      console.error("[allocateStands] exhibitor failed:", assignment.exhibitorId, err);
      outcome.status = "failed";
      outcome.reason = "This exhibitor could not be allocated.";
      result.failed += 1;
    }

    result.outcomes.push(outcome);
  }

  for (const entry of plan.unplaced) {
    result.outcomes.push({
      exhibitorId: entry.exhibitorId,
      business: entry.business,
      contact: entry.contact,
      status: "skipped",
      reason: entry.reason,
    });
  }

  return result;
}
