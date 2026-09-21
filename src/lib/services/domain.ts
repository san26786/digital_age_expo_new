import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { CACHE_TAGS, cachedRead } from "@/lib/cache";
import { DOMAIN_ID, DEFAULT_EVENT_ID, DEFAULT_LISTING_ID, ACTIVE_EVENT_SETTING_VARNAME } from "@/lib/site-config";
import { resolveSiteId } from "@/lib/tenant";

/**
 * Reads the CP-selected "active event" (find_settings, varname=ACTIVE_EVENT_SETTING_VARNAME,
 * grouptitle="events") directly via $queryRaw rather than importing
 * src/lib/cp/events/eventsRepository.ts's getActiveEventId() — this keeps the public/member
 * site's dependency graph independent of the CP admin module (same table + same varname,
 * read on both sides; see site-config.ts's comment on ACTIVE_EVENT_SETTING_VARNAME). Returns
 * null (not a throw) on any failure so getDomain() can fall back to DEFAULT_EVENT_ID exactly
 * like it already does for a missing find_domains row.
 */
async function getActiveEventIdSetting(siteId: number): Promise<number | null> {
  try {
    const raw = await readActiveEventSetting(siteId);
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) ? parsed : null;
  } catch (e) {
    console.warn("Failed to read active-event setting, falling back to DEFAULT_EVENT_ID", e);
    return null;
  }
}

/**
 * The bare read, cached across requests.
 *
 * Deliberately does NOT contain the try/catch or the fallback: `cachedRead` stores
 * whatever its function returns, so if the fallback lived in here then a momentary
 * database outage would get cached as "there is no active event" and the site would
 * keep serving the hardcoded default for the whole revalidate window even after the
 * database recovered. Letting the error escape means nothing is stored, the caller's
 * catch below supplies the fallback for that one request, and the very next request
 * retries the database.
 */
/*
 * `siteId` is an ARGUMENT, and that is load-bearing rather than tidy.
 *
 * cachedRead folds a function's arguments into its cache key, so a zero-argument cached read is
 * shared by every tenant: the first site to warm this entry would have its active event served
 * to all the others for the whole revalidate window. That is the multi-tenancy bug that is
 * hardest to notice - it looks like a caching flake, not a leak - so every read below that used
 * the DOMAIN_ID constant now takes the site instead.
 */
const readActiveEventSetting = cachedRead(
  ["domain", "activeEventSetting"],
  async function readActiveEventSetting(siteId: number): Promise<string | null> {
    const rows = await prisma.$queryRaw<{ value: string | null }[]>`
      SELECT value FROM find_settings WHERE varname = ${ACTIVE_EVENT_SETTING_VARNAME} AND "DOMAIN" = ${siteId} LIMIT 1
    `;
    return rows[0]?.value ?? null;
  },
  { tags: [CACHE_TAGS.domain] }
);

/** The find_domains row, cached across requests. Same no-fallback-inside rule as above. */
const readDomainRow = cachedRead(
  ["domain", "domainRow"],
  async function readDomainRow(siteId: number) {
    return prisma.find_domains.findUnique({
      where: { id: siteId },
      select: {
        id: true,
        name: true,
        brand: true,
        // The site's own hostname and address, needed by anything that prints "where" rather
        // than "who" — the About block's contact line, most visibly.
        link: true,
        address: true,
        event_id: true,
        linked_profile_listing_id: true,
        faq_listing_id: true,
        email: true,
        phone: true,
        partner_url: true,
        facebook: true,
        instagram: true,
        youtube: true,
        linkedin: true,
        twitter: true,
      },
    });
  },
  { tags: [CACHE_TAGS.domain] }
);

/**
 * Cached at two levels, because this is the hottest read in the application — it is called
 * independently from dozens of page/layout files plus every render of the root Header, each
 * doing its own 2 sequential DB round-trips (the active-event setting, then the find_domains
 * row):
 *
 *   1. React's cache() here — request-scoped memoization, cleared between requests. Without it
 *      a single page load could fire that same pair of queries 2-4+ times over; it makes every
 *      call within one request share a single in-flight/resolved promise.
 *   2. cachedRead() on each underlying query — cross-request, tagged CACHE_TAGS.domain. Level 1
 *      alone still meant one pair of queries per *request*, which at ~50 public routes made this
 *      the single largest contributor to the data-transfer overage described in src/lib/cache.ts.
 *
 * Both are needed: (1) collapses the many calls inside one render, (2) collapses across renders.
 */
export const getDomain = cache(async function getDomain() {
  // Which site this request is for. Every failure inside resolveSiteId returns DOMAIN_ID, so on
  // the main site - and on any request without a host, such as a script - this is 150 and
  // everything below behaves exactly as it did before multi-site existed.
  const siteId = await resolveSiteId();

  // Resolved independently of the find_domains lookup below so a missing/unreachable
  // find_domains row still gets the CP's chosen active event (not just the hardcoded
  // fallback) whenever the setting itself is readable.
  const activeEventId = await getActiveEventIdSetting(siteId);

  try {
    const domain = await readDomainRow(siteId);
    if (domain) {
      // find_domains.event_id / linked_profile_listing_id are unenforced legacy columns —
      // this site's event is resolved above (CP "active event" setting, falling back to
      // DEFAULT_EVENT_ID), NOT from whatever's stored on this row. That row drifted to other
      // event ids before (e.g. 1474) and silently pointed every page at the wrong event's
      // data; the CP's own "Mark Active" / General Settings "Event" dropdown is now the one
      // deliberate, visible way to change what this returns — see site-config.ts and
      // src/app/cp/(shell)/settings/general/page.tsx.
      /*
       * WHERE A SITE'S EVENT COMES FROM. Three sources, in this order, for every site:
       *
       *   1. The CP's "active event" setting for this DOMAIN. Deliberately first: it is the one
       *      visible, intentional control over what the site shows, and the reason it exists is
       *      that find_domains.event_id had drifted and was silently pointing pages at the wrong
       *      show. Being FIRST is what fixed that - the row can no longer override the choice.
       *
       *   2. The site's own find_domains.event_id. It sits below the setting, so it cannot
       *      reintroduce the drift; it can only replace a worse answer. For Digital Age Expo that
       *      is 1474, the current show, which is what should be served if the setting ever goes
       *      missing. For a Hub-created sub-site it is the event the Hub wrote at creation, and
       *      that site has no setting row of its own to speak for it.
       *
       *   3. DEFAULT_EVENT_ID, the hardcoded constant. Last, and it should now be unreachable in
       *      practice - it is 852, a 2021 show, and serving that to anyone is a bug rather than a
       *      default. It used to be second, which is precisely why a missing setting meant the
       *      main site quietly fell back four years.
       */
      const ownEventId = domain.event_id ?? null;
      const resolvedEventId = activeEventId ?? ownEventId ?? DEFAULT_EVENT_ID;

      return {
        ...domain,
        event_id: resolvedEventId,
        linked_profile_listing_id: domain.linked_profile_listing_id ?? DEFAULT_LISTING_ID,
      };
    }
  } catch (e) {
    console.warn("Failed to fetch domain from DB, using fallback", e);
  }

  return {
    id: DOMAIN_ID,
    name: "Digital Age Expo",
    brand: "Digital Age Expo",
    link: "digitalageexpo.com",
    address: null,
    event_id: activeEventId ?? DEFAULT_EVENT_ID,
    linked_profile_listing_id: DEFAULT_LISTING_ID,
    faq_listing_id: null,
    email: "expo@findusonweb.com",
    phone: "0123456789",
    partner_url: "",
    facebook: "",
    instagram: "",
    youtube: "",
    linkedin: "",
    twitter: "",
  };
});

export type SiteDomain = Awaited<ReturnType<typeof getDomain>>;
