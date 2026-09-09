import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { CP_SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/cp/auth/session";
import { nextAuthSecret } from "@/lib/auth/secret";
import { SITE_DOMAIN_HEADER, normalizeHost } from "@/lib/siteHost";

/**
 * Runs before any route renders, and does two unrelated jobs — Next allows exactly one proxy
 * file per project (see node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md), so
 * both live here rather than in two modules.
 *
 * Note the name: from Next 16 this file is `proxy.ts`, not `middleware.ts`. The Middleware ->
 * Proxy rename is why the equivalent file in the sibling awards codebase cannot be copied over
 * as-is.
 *
 * ---------------------------------------------------------------------------
 *  1. Which site is this?  (the multi-site half)
 * ---------------------------------------------------------------------------
 *  Stamps the cleaned hostname onto the REQUEST headers as `x-site-domain`, which
 *  getDomain() reads to pick the find_domains row for this brand.
 *
 *  It must be `NextResponse.next({ request: { headers } })`. Setting the header on the
 *  *response* instead — `response.headers.set(...)`, which is what the sibling awards codebase
 *  does — sends it to the browser and leaves `headers()` inside a Server Component with
 *  nothing, so every request would silently fall back to the default site. The Next docs call
 *  this out explicitly: "NOT NextResponse.next({ headers: requestHeaders }) which makes
 *  requestHeaders available to clients".
 *
 * ---------------------------------------------------------------------------
 *  2. Route protection  (restored from the deleted src/proxy.ts)
 * ---------------------------------------------------------------------------
 *  /cp/**        Checks only that a validly-signed, unexpired CP session exists. Per-route
 *                permissions stay with requireCpPermission() in lib/cp/rbac.ts, since only
 *                Server Components/Actions can redirect with page-specific context. /cp/login
 *                is excluded so an unauthenticated admin can reach the sign-in form instead of
 *                redirect-looping. Edge can't use Node's `crypto`, which is why
 *                lib/cp/auth/session.ts's verify() is built on the Web Crypto API.
 *
 *  /dashboard/** A layout-level `redirect()` is NOT sufficient here, and that is the whole
 *                reason this block exists. Next renders a layout and its page concurrently, so
 *                the page's data loaders run and stream before the layout's redirect resolves —
 *                which meant an unauthenticated request to /dashboard/admin/exhibitors received
 *                a 307 to /login whose body still contained the registrant list. Verified
 *                against production at the time: 38 real registrant email addresses in the body
 *                of a redirect response. Gating here means the route never renders at all, so
 *                there is nothing to leak; the layouts' own session and organiser checks stay in
 *                place as the authoritative authorisation step.
 */

/** Continue to the route, telling server code which site the request arrived on. */
function withSiteDomain(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(SITE_DOMAIN_HEADER, normalizeHost(request.headers.get("host")));
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/dashboard")) {
    const token = await getToken({ req: request, secret: nextAuthSecret() });
    if (!token) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return withSiteDomain(request);
  }

  // The old matcher expressed this as "/cp/((?!login).*)". The matcher now has to admit every
  // route so job 1 can stamp the header, so the /cp/login exemption moves into code.
  if (pathname.startsWith("/cp") && !pathname.startsWith("/cp/login")) {
    const token = request.cookies.get(CP_SESSION_COOKIE_NAME)?.value;
    const session = await verifySessionToken(token);
    if (!session) {
      return NextResponse.redirect(new URL("/cp/login", request.url));
    }
    return withSiteDomain(request);
  }

  return withSiteDomain(request);
}

export const config = {
  /**
   * Every route except Next's own internals — job 1 needs the header on public pages too, which
   * the previous "/cp" + "/dashboard" matcher would never have reached.
   */
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|icon\\.png).*)"],
};
