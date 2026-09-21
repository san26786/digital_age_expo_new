import { cache } from "react";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { CACHE_TAGS, cachedRead } from "@/lib/cache";
import { DOMAIN_ID } from "@/lib/site-config";

/**
 * ===========================================================================
 *  WHICH SITE IS THIS REQUEST FOR?
 * ===========================================================================
 *
 *  Phase 1 of docs/multi-site-spec.md. Until this file existed, the answer was a constant:
 *  `DOMAIN_ID = 150`, hardcoded in site-config.ts, so every request to every hostname served
 *  Digital Age Expo. A second site could be created but never reached.
 *
 *  ---------------------------------------------------------------------------
 *  WHY THE HOST ARRIVES AS A HEADER THE PROXY SETS, RATHER THAN BEING READ HERE
 *  ---------------------------------------------------------------------------
 *
 *  Two reasons, and the second is the one that matters.
 *
 *  The mechanical one: `src/proxy.ts` runs on the Edge runtime, which has no Prisma, so it
 *  cannot do the database lookup itself. It can only observe the Host header and pass it along.
 *
 *  The security one: a header named `x-site-host` arriving from outside is an attacker choosing
 *  which tenant's data to be served. The proxy therefore DELETES any inbound copy and writes its
 *  own from the connection's real Host, on every request, before anything else happens. By the
 *  time this file reads the header, it is the proxy's value or it is absent — never the client's.
 *
 *  ---------------------------------------------------------------------------
 *  EVERY FAILURE FALLS BACK TO DOMAIN_ID
 *  ---------------------------------------------------------------------------
 *
 *  No header, an unknown host, a database that will not answer, or a call from outside a request
 *  (a script, a build-time render) all return the main site. That is deliberate and it is the
 *  conservative direction: the failure mode is "Digital Age Expo is served", which is exactly
 *  what happened before this file existed, rather than "a blank or wrong site is served".
 *
 *  §9 of the spec settled that an UNKNOWN host should 404 rather than fall back. That belongs at
 *  the edge — a 404 for a hostname nobody configured — and not here, where the same code path
 *  also covers scripts and build-time renders that legitimately have no host at all. Falling
 *  back here keeps those working; the 404 goes in when the deployment target is known and the
 *  set of valid hostnames is something the edge can be told about.
 */

/** Set by the proxy from the real Host header. Kept in step with the literal in src/proxy.ts. */
export const SITE_HOST_HEADER = "x-site-host";

/** Development-only override, so a sub-site can be previewed without DNS. See src/proxy.ts. */
export const SITE_ID_HEADER = "x-site-id";

/** Lowercased, port removed, scheme removed, leading `www.` removed. */
export function normaliseHost(value: string | null | undefined): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:.*$/, "")
    .replace(/^www\./, "")
    .replace(/\.+$/, "");
}

/**
 * Host → find_domains.id.
 *
 * Matched in SQL rather than by loading every site and comparing in JS, because this runs on
 * every request of every page and the table is the one thing that must not become a scan. The
 * stored `link` is not normalised — row 150 holds the full `https://digitalageexpo.com` — so the
 * comparison strips scheme and `www.` from the column too. `[.]` rather than `\.` because a
 * backslash inside a JS template literal is an escape before Postgres ever sees it.
 *
 * Cached with the `domain` tag, and `host` is an argument so cachedRead folds it into the cache
 * key — the property this whole file depends on. A zero-argument cached read here would serve
 * one tenant's id to every other tenant, which is the multi-tenancy bug that is hardest to see
 * and worst to ship.
 */
const readSiteIdForHost = cachedRead(
  ["tenant", "siteIdForHost"],
  async function readSiteIdForHost(host: string): Promise<number | null> {
    const rows = await prisma.$queryRaw<{ id: number }[]>`
      SELECT id FROM find_domains
      WHERE lower(
              regexp_replace(
                regexp_replace(coalesce(link, ''), '^https?://', ''),
                '^www[.]', ''
              )
            ) = ${host}
      ORDER BY id ASC
      LIMIT 1
    `;
    return rows[0]?.id ?? null;
  },
  { tags: [CACHE_TAGS.domain] }
);

/**
 * The site this request belongs to.
 *
 * Safe to call from anywhere on the server, including outside a request — `headers()` throws
 * there and the catch turns that into the main site.
 *
 * ---------------------------------------------------------------------------
 *  MEMOISED PER REQUEST, AND THAT IS LOAD-BEARING RATHER THAN TIDY
 * ---------------------------------------------------------------------------
 *
 *  Three separate things in the root layout need to know which site this is — getDomain(),
 *  getBrandAssets() and getSiteTheme() — and getBrandAssets runs twice itself (generateMetadata
 *  for the favicon, then <Header>). Unmemoised that is four resolutions, each with its own cached
 *  read, added to EVERY page in the application.
 *
 *  This app's pool is ten connections wide (DATABASE_POOL_SIZE=10, set deliberately after a
 *  db-ping report) with admission control queueing everything above that. Adding a handful of
 *  reads to the root layout is precisely how a page goes from slow to 500 here: the queue backs
 *  up, connections wait out the 30s acquire timeout, and the render dies with "Connection
 *  terminated due to connection timeout". Which is what happened.
 *
 *  React's cache() is request-scoped, so this resolves once per request and every later caller
 *  gets the same settled promise.
 */
export const resolveSiteId = cache(async function resolveSiteId(): Promise<number> {
  let bag: Awaited<ReturnType<typeof headers>>;
  try {
    bag = await headers();
  } catch {
    // No request context: a script, or a render outside a request. The main site is the answer.
    return DOMAIN_ID;
  }

  /*
   * The dev override, checked first and honoured ONLY in development. This is what makes a
   * sub-site previewable on localhost, where every hostname is "localhost" and no amount of
   * correct resolution will ever produce anything but the main site. The proxy refuses to set
   * this header in production, so this branch is unreachable there even if something sent it.
   */
  if (process.env.NODE_ENV !== "production") {
    const forced = Number(bag.get(SITE_ID_HEADER));
    if (Number.isInteger(forced) && forced > 0) return forced;
  }

  const host = normaliseHost(bag.get(SITE_HOST_HEADER));
  if (!host) return DOMAIN_ID;

  try {
    return (await readSiteIdForHost(host)) ?? DOMAIN_ID;
  } catch {
    return DOMAIN_ID;
  }
});
