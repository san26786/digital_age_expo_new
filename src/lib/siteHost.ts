/**
 * Hostname handling for the multi-site (one codebase, many event domains) setup.
 *
 * Deliberately its own module rather than part of site-config.ts: src/proxy.ts imports
 * `normalizeHost` and runs on the Edge runtime, so whatever it pulls in has to stay free of
 * Prisma, Node built-ins and anything else that only exists on the server runtime.
 */

/**
 * Request header the proxy stamps with the resolved hostname, and the only channel through
 * which server code learns which site it is rendering. Nothing reads the raw Host header
 * directly — see getSiteHost() in src/lib/services/domain.ts.
 */
export const SITE_DOMAIN_HEADER = "x-site-domain";

/**
 * The site served when no hostname is available: local development, `next build`'s
 * pre-render pass (where headers() throws), and any request whose Host doesn't match a
 * find_domains row. Overridable with DEV_SITE_DOMAIN so a developer can work on a different
 * tenant without editing code.
 *
 * Keeping this as the fallback is what makes the multi-site change a no-op for the existing
 * deployment: digitalageexpo.com resolves to the same find_domains row it always did, and so
 * does localhost.
 */
export const DEFAULT_SITE_HOST = "digitalageexpo.com";

/**
 * Reduces anything host-shaped to a bare, comparable hostname.
 *
 * Needed on both sides of the comparison, because they arrive in different shapes:
 *   - the Host header is `www.digitalageexpo.com` or `localhost:3000`
 *   - find_domains.link stores a full URL — row 150 holds `https://digitalageexpo.com`
 *
 * Comparing those two raw is how a site silently fails to resolve, so both go through here.
 * Returns "" for anything unusable, which callers treat as "no host" rather than as a
 * hostname that simply matches nothing.
 */
export function normalizeHost(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .trim()
    .toLowerCase()
    .replace(/^[a-z][a-z0-9+.-]*:\/\//, "") // scheme, if this came from find_domains.link
    .replace(/\/.*$/, "") // path, query or a trailing slash
    .replace(/:\d+$/, "") // :3000, so localhost works in development
    .replace(/^www\./, ""); // www and apex are the same site
}
