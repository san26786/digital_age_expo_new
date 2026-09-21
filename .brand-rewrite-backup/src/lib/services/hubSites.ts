import { prisma } from "@/lib/prisma";
import { safeQuery } from "@/lib/db-errors";
import { COPY_TOGGLES, type CopyToggleKey } from "@/lib/hub/copyOptions";
import { DOMAIN_ID } from "@/lib/site-config";

/**
 * ===========================================================================
 *  READS BEHIND THE HUB
 * ===========================================================================
 *
 *  Everything here is a read. Nothing in this file creates, edits or deletes a site — the clone
 *  engine is Phase 3 and lives elsewhere when it arrives. That separation is deliberate while the
 *  Hub is new: the screens can be opened, clicked through and shown to people with no possibility
 *  that doing so writes anything.
 *
 *  NOT CACHED, AND THAT IS THE POINT. Every other service in this app goes through `cachedRead`.
 *  These do not, for two reasons. The Hub is a superadmin screen loaded a handful of times a day,
 *  so there is nothing to gain; and it is the one screen whose entire job is to tell you the
 *  truth about what exists right now. A cached site list that is thirty seconds stale is a site
 *  list that can show a site somebody just made as absent, or one they just deleted as present,
 *  and either would be acted on.
 */

export interface HubSiteRow {
  id: number;
  name: string;
  brand: string | null;
  /** The host this site answers on, as stored. */
  link: string;
  live: boolean;
  eventId: number | null;
  eventTitle: string | null;
  email: string | null;
  /** True for the row this deployment is currently hardcoded to serve (see site-config). */
  isCurrent: boolean;
}

/**
 * Every site row the system knows about.
 *
 * WHY THIS LIST IS SHORTER THAN YOU EXPECT TODAY. `find_domains` is the legacy platform's
 * multi-tenant table and it still holds rows from other products that were never part of this
 * app. They are listed anyway rather than filtered to a guess: this screen's promise is "these
 * are the rows that exist", and quietly hiding some would make the one you are looking for
 * appear to be missing. `isCurrent` marks the row this deployment actually serves.
 */
export async function listHubSites(): Promise<HubSiteRow[]> {
  const rows = await safeQuery(
    () =>
      prisma.find_domains.findMany({
        select: {
          id: true,
          name: true,
          brand: true,
          link: true,
          status: true,
          event_id: true,
          email: true,
        },
        orderBy: [{ id: "asc" }],
      }),
    [] as {
      id: number;
      name: string;
      brand: string | null;
      link: string;
      status: boolean;
      event_id: number | null;
      email: string | null;
    }[]
  );

  const eventIds = Array.from(
    new Set(rows.map((row) => row.event_id).filter((id): id is number => typeof id === "number" && id > 0))
  );

  const events = eventIds.length
    ? await safeQuery(
        () =>
          prisma.find_events.findMany({
            where: { id: { in: eventIds } },
            select: { id: true, title: true },
          }),
        [] as { id: number; title: string }[]
      )
    : [];

  const titleById = new Map<number, string>(events.map((event): [number, string] => [event.id, event.title]));

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    brand: row.brand,
    link: row.link,
    live: row.status,
    eventId: row.event_id ?? null,
    eventTitle: row.event_id ? titleById.get(row.event_id) ?? null : null,
    email: row.email,
    isCurrent: row.id === DOMAIN_ID,
  }));
}

export interface CopyableEvent {
  id: number;
  title: string;
  friendlyUrl: string;
  status: string;
  date: string | null;
  /** Exhibitor headcount, shown beside the title so the right event is recognisable at a glance. */
  exhibitorCount: number;
}

/**
 * The events a new site may copy from.
 *
 * "also add in that button which i want to copy from which event_id that also mentioned" — so the
 * source event is chosen, never assumed. This deliberately does not restrict itself to the
 * current domain's own event: copying London Growth Expo's shell from last year's DAE is exactly
 * the case this feature exists for.
 *
 * The exhibitor count is here rather than in the dry run because it is what makes the list
 * usable. Several events share near-identical titles, and "Digital Age Expo 2025 — 251
 * exhibitors" is recognisable where four rows called "Digital Age Expo" are not.
 */
export async function listCopyableEvents(limit = 60): Promise<CopyableEvent[]> {
  const events = await safeQuery(
    () =>
      prisma.find_events.findMany({
        select: { id: true, title: true, friendly_url: true, status: true, date: true },
        orderBy: [{ date: "desc" }, { id: "desc" }],
        take: limit,
      }),
    [] as { id: number; title: string; friendly_url: string; status: string; date: Date }[]
  );

  if (events.length === 0) return [];

  /*
   * One grouped count rather than a count per event. With 60 events in the list the per-event
   * shape would be 60 round trips on a page the admin is simply waiting on, and this app's pool
   * is the thing that falls over when a page fans out — see the admission control in prisma.ts.
   */
  type ExhibitorGroup = { event_id: number; _count: { _all: number } };

  const grouped = await safeQuery<ExhibitorGroup[]>(
    () =>
      prisma.find_event_exhibitor.groupBy({
        by: ["event_id"],
        where: { event_id: { in: events.map((event) => event.id) } },
        _count: { _all: true },
      }) as unknown as Promise<ExhibitorGroup[]>,
    []
  );

  const countByEvent = new Map<number, number>(
    grouped.map((row): [number, number] => [row.event_id, row._count._all])
  );

  return events.map((event) => ({
    id: event.id,
    title: event.title,
    friendlyUrl: event.friendly_url,
    status: event.status,
    date: event.date ? event.date.toISOString().slice(0, 10) : null,
    exhibitorCount: countByEvent.get(event.id) ?? 0,
  }));
}

export interface DryRunLine {
  key: CopyToggleKey;
  label: string;
  /** Per-model counts, in the order the toggle declares them. null = that table could not be read. */
  models: { model: string; rows: number | null }[];
  total: number;
}

/**
 * How much there actually is to copy, per toggle, for one source event.
 *
 * THE FORM IS NOT USABLE WITHOUT THIS. A toggle called "Speakers" tells you nothing about
 * whether ticking it brings across forty people or nobody, and an organiser who ticks six
 * toggles expecting a populated site and gets an empty one has no way to tell whether the clone
 * failed or there was never anything there. The counts turn the form from a set of promises into
 * a statement about real rows.
 *
 * Counted by model name off COPY_TOGGLES rather than as a hand-written list of queries, so a
 * toggle can never drift out of sync with what it claims to copy. The cost of that is an
 * indexed lookup on the client, hence the `any` — Prisma's generated client has no typed index
 * signature, and the alternative is eleven near-identical blocks that a future edit updates ten
 * of.
 */
export async function dryRunCounts(eventId: number): Promise<DryRunLine[]> {
  const client = prisma as unknown as Record<
    string,
    { count?: (args: unknown) => Promise<number> } | undefined
  >;

  const lines = await Promise.all(
    COPY_TOGGLES.map(async (toggle) => {
      const models = await Promise.all(
        toggle.models.map(async (model) => {
          const delegate = client[model];
          if (!delegate || typeof delegate.count !== "function") {
            // The model is not in the generated client — a spec table that was renamed, or a
            // schema that has moved on. Reported as unknown rather than as zero: "0" would read
            // as "there is nothing there", which is a different and more reassuring claim.
            return { model, rows: null as number | null };
          }

          const rows = await safeQuery<number | null>(
            () => delegate.count!({ where: { event_id: eventId } }),
            null
          );

          return { model, rows };
        })
      );

      return {
        key: toggle.key,
        label: toggle.label,
        models,
        total: models.reduce((sum, entry) => sum + (entry.rows ?? 0), 0),
      };
    })
  );

  return lines;
}
