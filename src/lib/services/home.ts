import { prisma } from "@/lib/prisma";
import { CONTENT_BLOCK_SELECT } from "@/lib/services/contentBlocks";
import { getPhrases } from "@/lib/services/language";
import { getEventById, getEventDateRange } from "@/lib/services/events";
import { getApprovedSponsors } from "@/lib/services/sponsors";
import type { SiteDomain } from "@/lib/services/domain";
import { getEventExhibitors } from "@/lib/services/exhibitors";
import { getEventSchedule } from "@/lib/services/schedule";
import { createOutageCollector, type DatabaseOutage } from "@/lib/db-errors";

const SPEAKER_LIMIT = 8;

async function getSpeakers(eventId: number) {
  const speakers = await prisma.find_speakers.findMany({
    where: {
      event_id: eventId,
      status: "active",
      hide_home: { not: 1 },
      is_previous_speaker: null,
    },
    orderBy: [{ date: "asc" }, { start_time: "asc" }],
    take: SPEAKER_LIMIT,
    select: {
      id: true,
      name: true,
      position: true,
      business: true,
      profile_pic: true,
    },
  });
  return speakers;
}

async function getCharityPartners(listingId: number) {
  return prisma.find_listing_charity_partners.findMany({
    where: { listing_id: listingId, status: "PSA", NOT: { logo: null } },
    select: { id: true, charity_name: true, logo: true },
  });
}

/**
 * Exported so callers that guard `getOpportunityContent` against a database outage have a fallback
 * of exactly the right shape — see src/app/about/page.tsx. Hand-writing a partial object at each
 * call site drifts from this one as blocks are added.
 */
export const EMPTY_OPPORTUNITY_CONTENT = {
  aboutEvent: null as any,
  sponsorHostData: [] as any[],
  exploreEvent: null as any,
  joinFacebook: null as any,
  bookYourStand: null as any,
  topBanner: null as any,
};

export type OpportunityContent = typeof EMPTY_OPPORTUNITY_CONTENT;

export async function getOpportunityContent(listingId: number) {
  const [aboutEvent, sponsorHostData, exploreEvent, joinFacebook, bookYourStand, topBanner] =
    await Promise.all([
      prisma.find_listing_business_opportunity.findFirst({
        select: CONTENT_BLOCK_SELECT,
        where: { listing_id: listingId, opportunity_intro: "LOSNABTEV", domain_page_name: "About Events" },
        orderBy: { sequence: "asc" },
      }),
      prisma.find_listing_business_opportunity.findMany({
        select: CONTENT_BLOCK_SELECT,
        where: { listing_id: listingId, opportunity_intro: "LOSONI", domain_page_name: "Home" },
        orderBy: { sequence: "asc" },
      }),
      prisma.find_listing_business_opportunity.findFirst({
        select: CONTENT_BLOCK_SELECT,
        where: { listing_id: listingId, domain_page_name: "explore_the_event" },
      }),
      prisma.find_listing_business_opportunity.findFirst({
        select: CONTENT_BLOCK_SELECT,
        where: { listing_id: listingId, opportunity_intro: "LOSNJUOFG", domain_page_name: "Home" },
      }),
      prisma.find_listing_business_opportunity.findFirst({
        select: CONTENT_BLOCK_SELECT,
        where: { listing_id: listingId, opportunity_intro: "LOSNWHEXH", domain_page_name: "book_your_stand" },
        orderBy: { sequence: "asc" },
      }),
      prisma.find_listing_business_opportunity.findFirst({
        select: CONTENT_BLOCK_SELECT,
        where: { listing_id: listingId, domain_page_name: "dae_index_topbanner" },
      }),
    ]);

  return { aboutEvent, sponsorHostData, exploreEvent, joinFacebook, bookYourStand, topBanner };
}

/**
 * Loads everything the home page renders.
 *
 * Every query is individually guarded (see src/lib/db-errors.ts). Previously these ran bare
 * inside `Promise.all`, so one infrastructure-level rejection — the database hitting a plan
 * quota, going to sleep, or running out of connections — rejected the whole batch, propagated out
 * of the server component and replaced the entire site with a Prisma stack trace.
 *
 * Guarding each query means such a failure now degrades instead: the sections that could not load
 * come back empty, everything that did load still renders, and `dbOutage` carries a single
 * explanation for the page to show the visitor. Ordinary query bugs are NOT swallowed — they
 * still throw, so real regressions stay visible.
 */
export interface HomeCounters {
  visitors: number;
  exhibitors: number;
  speakers: number;
  workshops: number;
}

const EMPTY_COUNTERS: HomeCounters = { visitors: 0, exhibitors: 0, speakers: 0, workshops: 0 };

/**
 * Live figures for the homepage stat band.
 *
 * These were previously read only from `find_language_phrases` (counter_visitors, ...), i.e. a
 * number an organiser had typed in once and which then drifted from reality — the band advertised
 * "1000+ exhibitors" for an event with 232. Counting the rows means the band is right the day an
 * exhibitor is approved or a session is added, with no one to remember to update it.
 *
 * What each one counts, and why:
 *  - visitors   — rows in find_event_ticket_purchased for the event: one per ticket claimed, which
 *                 is the closest thing the schema has to "people coming".
 *  - exhibitors — approved stands only (`status: "active"`), matching what /exhibitors lists, so
 *                 the two pages cannot disagree.
 *  - speakers   — approved speakers only, same reasoning.
 *  - workshops  — agenda items, i.e. programmed sessions.
 *
 * Counts, not findMany().length: the row bodies are never used, and the exhibitor table is large.
 */
export async function getHomeCounters(eventId: number): Promise<HomeCounters> {
  if (!eventId) return EMPTY_COUNTERS;

  const [visitors, exhibitors, speakers, workshops] = await Promise.all([
    prisma.find_event_ticket_purchased.count({ where: { event_id: eventId } }),
    prisma.find_event_exhibitor.count({ where: { event_id: eventId, status: "active" } }),
    prisma.find_speakers.count({ where: { event_id: eventId, status: "active" } }),
    prisma.find_event_lobby_agenda_items.count({ where: { event_id: eventId } }),
  ]);

  return { visitors, exhibitors, speakers, workshops };
}

export async function getHomePageData(domain: SiteDomain) {
  const eventId = domain.event_id;
  const listingId = domain.linked_profile_listing_id;
  // NB: keep the collector object intact — `current` is a getter, so spreading/destructuring it
  // would snapshot the (still null) value before any query has had a chance to fail.
  const collector = createOutageCollector();
  const guard = collector.guard;

  const [
    event,
    eventDates,
    speakers,
    sponsors,
    charityPartners,
    opportunityContent,
    phrases,
    exhibitors,
    scheduleDays,
    counters,
  ] =
    await Promise.all([
      eventId ? guard(() => getEventById(eventId), null) : null,
      eventId ? guard(() => getEventDateRange(eventId), null) : null,
      eventId ? guard(() => getSpeakers(eventId), [] as any[]) : [],
      eventId ? guard(() => getApprovedSponsors(eventId), [] as any[]) : [],
      listingId ? guard(() => getCharityPartners(listingId), [] as any[]) : [],
      listingId
        ? guard(() => getOpportunityContent(listingId), EMPTY_OPPORTUNITY_CONTENT)
        : EMPTY_OPPORTUNITY_CONTENT,
      guard(
        () =>
          getPhrases([
            "counter_visitors",
            "counter_exhibitors",
            "counter_speakers",
            "counter_workshop",
            "buy_tickets_hurry_up",
            "buy_tickets_hurryup_subtext",
            "get_free_ticket_now",
            "get_free_ticket_now_desc",
            "listen_to_the",
            "speakers",
          ]),
        {} as Record<string, string>
      ),
      eventId ? guard(() => getEventExhibitors(eventId), [] as any[]) : [],
      eventId ? guard(() => getEventSchedule(eventId), [] as any[]) : [],
      eventId ? guard(() => getHomeCounters(eventId), EMPTY_COUNTERS) : EMPTY_COUNTERS,
    ]);

  return {
    event,
    eventDates,
    speakers,
    sponsors,
    charityPartners,
    opportunityContent,
    phrases,
    exhibitors,
    scheduleDays,
    /** Live row counts behind the homepage stat band. */
    counters,
    /** Non-null when at least one query was rejected by the database itself. */
    dbOutage: collector.current as DatabaseOutage | null,
  };
}

export type HomePageData = Awaited<ReturnType<typeof getHomePageData>>;
