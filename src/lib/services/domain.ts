import { cache } from "react";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { CACHE_TAGS, cachedRead } from "@/lib/cache";
import { DOMAIN_ID, DEFAULT_EVENT_ID, DEFAULT_LISTING_ID, ACTIVE_EVENT_SETTING_VARNAME } from "@/lib/site-config";
import { SITE_DOMAIN_HEADER, DEFAULT_SITE_HOST, normalizeHost } from "@/lib/siteHost";

/**
 * Which hostname this request arrived on — the one input that decides which site the entire
 * render belongs to. It comes from src/proxy.ts via the x-site-domain request header; the raw
 * Host header is deliberately never read outside the proxy.
 *
 * Falls back to DEFAULT_SITE_HOST (overridable with DEV_SITE_DOMAIN) in the three cases where
 * there is no usable header: local development on localhost, `next build`'s pre-render pass
 * where headers() throws outright, and a request whose Host no find_domains row claims. That
 * fallback is what keeps this change a no-op for the existing single-site deployment.
 */
async function getSiteHost(): Promise<string> {
  try {
    const fromProxy = normalizeHost((await headers()).get(SITE_DOMAIN_HEADER));
    if (fromProxy && fromProxy !== "localhost") return fromProxy;
  } catch {
    // headers() is unavailable during static pre-rendering — fall through to the default.
  }
  return normalizeHost(process.env.DEV_SITE_DOMAIN) || DEFAULT_SITE_HOST;
}

/**
 * Reads the CP-selected "active event" (find_settings, varname=ACTIVE_EVENT_SETTING_VARNAME,
 * grouptitle="events") directly via $queryRaw rather than importing
 * src/lib/cp/events/eventsRepository.ts's getActiveEventId() — this keeps the public/member
 * site's dependency graph independent of the CP admin module (same table + same varname,
 * read on both sides; see site-config.ts's comment on ACTIVE_EVENT_SETTING_VARNAME). Returns
 * null (not a throw) on any failure so getDomain() can fall back to DEFAULT_EVENT_ID exactly
 * like it already does for a missing find_domains row.
 */
async function getActiveEventIdSetting(domainId: number): Promise<number | null> {
  try {
    const raw = await readActiveEventSetting(domainId);
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
const readActiveEventSetting = cachedRead(
  ["domain", "activeEventSetting"],
  async function readActiveEventSetting(domainId: number): Promise<string | null> {
    const rows = await prisma.$queryRaw<{ value: string | null }[]>`
      SELECT value FROM find_settings WHERE varname = ${ACTIVE_EVENT_SETTING_VARNAME} AND "DOMAIN" = ${domainId} LIMIT 1
    `;
    return rows[0]?.value ?? null;
  },
  { tags: [CACHE_TAGS.domain] }
);

/**
 * The find_domains row for one hostname, cached across requests. Same no-fallback-inside rule
 * as above.
 *
 * `host` and `domainId` are PARAMETERS, not constants closed over from site-config — and that
 * is the whole multi-site correctness argument, not a style choice. cachedRead passes its
 * arguments through to unstable_cache, which makes them part of the cache key, so each site
 * gets its own entry. A zero-argument reader (which is what both of these used to be) has a
 * single fixed key, so the first site to render would populate it and every other hostname
 * would then be served that site's row and that site's active event.
 *
 * Matching happens in JS rather than SQL because the two sides are stored differently:
 * find_domains.link holds a full URL (row 150 is "https://digitalageexpo.com") while the header
 * carries a bare hostname. normalizeHost() reduces both to the same shape. Fetching the active
 * rows to do it costs one small query per cache miss and there are only ever a handful of
 * sites, whereas a LIKE against a URL column would happily match the wrong tenant on a
 * substring.
 */
const readDomainRowByHost = cachedRead(
  ["domain", "domainRowByHost"],
  async function readDomainRowByHost(host: string) {
    const rows = await prisma.find_domains.findMany({
      where: { status: true },
      select: {
        id: true,
        name: true,
        brand: true,
        link: true,
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
    // `rows` is untyped because src/lib/prisma.ts loads PrismaClient as `any` (it falls back
    // between a generated client and @prisma/client at runtime), so the predicate's parameter
    // has to be annotated for noImplicitAny.
    return rows.find((row: { link: string | null }) => normalizeHost(row.link) === host) ?? null;
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
  const host = await getSiteHost();

  // The row now has to be resolved FIRST, because which find_settings rows belong to this site
  // depends on which site it is. When the row can't be read at all the active-event setting is
  // still looked up under DOMAIN_ID, which keeps the original behaviour: a missing/unreachable
  // find_domains row should still get the CP's chosen active event rather than dropping
  // straight to the hardcoded default.
  let domain: Awaited<ReturnType<typeof readDomainRowByHost>> = null;
  try {
    domain = await readDomainRowByHost(host);
  } catch (e) {
    console.warn("Failed to fetch domain from DB, using fallback", e);
  }

  const activeEventId = await getActiveEventIdSetting(domain?.id ?? DOMAIN_ID);
  const resolvedEventId = activeEventId ?? DEFAULT_EVENT_ID;

  if (domain) {
    // find_domains.event_id / linked_profile_listing_id are unenforced legacy columns —
    // this site's event is resolved above (CP "active event" setting, falling back to
    // DEFAULT_EVENT_ID), NOT from whatever's stored on this row. That row drifted to other
    // event ids before (e.g. 1474) and silently pointed every page at the wrong event's
    // data; the CP's own "Mark Active" / General Settings "Event" dropdown is now the one
    // deliberate, visible way to change what this returns — see site-config.ts and
    // src/app/cp/(shell)/settings/general/page.tsx.
    return {
      ...domain,
      event_id: resolvedEventId,
      linked_profile_listing_id: domain.linked_profile_listing_id ?? DEFAULT_LISTING_ID,
    };
  }

  // Reached when the hostname matches no active find_domains row, or the database is
  // unreachable. `link` is carried here too so SiteDomain has one shape on both branches.
  return {
    id: DOMAIN_ID,
    name: "Digital Age Expo",
    brand: "Digital Age Expo",
    link: `https://${DEFAULT_SITE_HOST}`,
    event_id: resolvedEventId,
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
