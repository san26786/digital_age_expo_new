import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  CP_SESSION_COOKIE_NAME,
  CP_SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  verifySessionToken,
} from "@/lib/cp/auth/session";
import { nextAuthSecret } from "@/lib/auth/secret";

/**
 * Route protection that runs BEFORE a route renders.
 *
 * (This file was deleted once as an "unused file" — it is not unused. Both blocks below exist
 * for reasons that a page- or layout-level check cannot cover; see each one.)
 *
 * ---------------------------------------------------------------------------
 *  /cp/**  — the Admin Control Panel
 * ---------------------------------------------------------------------------
 *  Checks only that a validly-signed, unexpired CP session exists. It does NOT
 *  check per-route permissions — that's hasPermission()/requireCpPermission() in
 *  lib/cp/rbac.ts, called from each page/Server Action, since only Server
 *  Components/Actions can refuse with page-specific context. /cp/login is excluded
 *  so an unauthenticated admin can reach the sign-in form instead of redirect-looping.
 *
 *  Edge runtime can't use Node's `crypto` module, which is exactly why
 *  lib/cp/auth/session.ts's verify() is built on the Web Crypto API instead.
 *
 *  Two things beyond the original gate happen here, both aimed at the "I clicked a
 *  sidebar link and got thrown back to the login page" failure:
 *
 *   1. The requested path is stamped on the request as `x-cp-pathname`. A Server
 *      Component cannot otherwise know its own URL, and requireCpSession() needs it
 *      to build /cp/login?next=… so signing in again returns you to the page you
 *      clicked instead of the dashboard.
 *   2. A session past the halfway point of its life is re-signed and re-issued. The
 *      token is valid for 8 hours from sign-in with no renewal, so a long working day
 *      in one open tab ended with the next click — whichever it happened to be —
 *      landing on the login form. Renewal on activity means only genuine inactivity
 *      signs you out.
 *
 * ---------------------------------------------------------------------------
 *  /dashboard/**  — member and organiser dashboards
 * ---------------------------------------------------------------------------
 *  A layout-level `redirect()` is NOT sufficient here, and that is the whole
 *  reason this block exists. Next renders a layout and its page concurrently, so
 *  the page's data loaders run and stream before the layout's redirect resolves —
 *  which meant an unauthenticated request to /dashboard/admin/exhibitors received
 *  a 307 to /login whose body still contained the registrant list. Verified
 *  against production: 38 real registrant email addresses in the body of a
 *  redirect response.
 *
 *  Gating in the proxy means the route never renders at all, so there is nothing
 *  to leak. The layout's own session + organiser checks stay in place as the
 *  authoritative authorisation step — this only decides whether rendering starts.
 */

/** Kept in step with CP_PATHNAME_HEADER in lib/cp/rbac.ts (duplicated as a literal so this
 *  edge-runtime file doesn't import the Node-only cookies()/redirect() module). */
const CP_PATHNAME_HEADER = "x-cp-pathname";

/**
 * ---------------------------------------------------------------------------
 *  WHICH SITE IS THIS REQUEST FOR  (multi-site Phase 1)
 * ---------------------------------------------------------------------------
 *  The connection's real Host, stamped on every request so server components can resolve which
 *  tenant to serve. Edge cannot do the lookup itself (no Prisma), so it passes the fact along and
 *  src/lib/tenant.ts turns it into a site id.
 *
 *  BOTH HEADERS ARE DELETED BEFORE THEY ARE SET, ALWAYS. An inbound `x-site-host` is a client
 *  choosing which tenant's data to be served; deleting first means the value downstream is this
 *  proxy's or it is nothing, whatever the client sent and whichever branch below runs.
 *
 *  Literals rather than imports from @/lib/tenant: this file is Edge runtime and that module
 *  pulls in Prisma. Same reason CP_PATHNAME_HEADER above is duplicated rather than imported.
 */
const SITE_HOST_HEADER = "x-site-host";
const SITE_ID_HEADER = "x-site-id";

/**
 * ---------------------------------------------------------------------------
 *  THE DEVELOPMENT PREVIEW
 * ---------------------------------------------------------------------------
 *
 *  On localhost every hostname is "localhost", so host resolution can never produce anything but
 *  the main site — which would leave a newly created site impossible to look at until DNS exists
 *  for it.
 *
 *  A COOKIE WAS THE WRONG ANSWER, AND IT IS WORTH SAYING WHY. The first version of this made
 *  `?__site=<id>` sticky by storing it in a cookie, so the preview survived clicking around. It
 *  did — and it also made "whichever site you last previewed" the default for the entire browser,
 *  for hours, in every tab. Opening plain localhost:3000 in a fresh tab served B2B Growth Expo.
 *  A preview that changes what the DEFAULT address shows is not a preview; it is a mode you can
 *  leave switched on by accident and then misread every page you look at.
 *
 *  So the site now lives in the HOSTNAME, where it belongs — the same place production will keep
 *  it. Browsers resolve any *.localhost name to the loopback address without a hosts-file entry
 *  (RFC 6761), so:
 *
 *      http://localhost:3000        →  Digital Age Expo, always
 *      http://site-151.localhost:3000  →  site 151
 *
 *  It survives navigation for the same reason a real hostname does, needs no state anywhere, and
 *  cannot leak into the default address because it IS a different address.
 *
 *  `?__site=<id>` still works for a single request, as a quick look without changing tab. It sets
 *  nothing and persists nothing, so the next click is back on the default site — which is the
 *  correct behaviour for a one-shot override rather than a bug in it.
 *
 *  Both are refused in production, where the Host header is the only thing permitted to decide
 *  which tenant is served.
 */
const PREVIEW_HOST = /^site-([0-9]{1,9})\.localhost$/;

/** The request headers every branch below forwards: the client's, with ours stamped over them. */
function siteHeaders(request: NextRequest): Headers {
  const headers = new Headers(request.headers);

  headers.delete(SITE_HOST_HEADER);
  headers.delete(SITE_ID_HEADER);

  const host = (request.headers.get("host") ?? "")
    .split(":")[0]
    .trim()
    .toLowerCase()
    .replace(/^www\./, "");
  if (host) headers.set(SITE_HOST_HEADER, host);

  if (process.env.NODE_ENV !== "production") {
    // The hostname first: it is the durable one, and the one that matches how production works.
    const fromHost = PREVIEW_HOST.exec(host);
    const fromQuery = request.nextUrl.searchParams.get("__site");

    if (fromHost) {
      headers.set(SITE_ID_HEADER, fromHost[1]);
    } else if (fromQuery && /^[0-9]{1,9}$/.test(fromQuery)) {
      headers.set(SITE_ID_HEADER, fromQuery);
    }
  }

  return headers;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestHeaders = siteHeaders(request);

  if (pathname.startsWith("/dashboard")) {
    const token = await getToken({ req: request, secret: nextAuthSecret() });
    if (!token) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  /*
   * EVERYTHING THAT IS NOT /cp LEAVES HERE, and this early return is the reason the matcher
   * below could be widened safely.
   *
   * The matcher used to cover only /cp and /dashboard, so "not /dashboard" could be treated as
   * "must be /cp" and fall through to the session gate under it. Widening the matcher to every
   * route - which stamping the host on every request requires - turns that assumption into a
   * redirect of the entire public site to /cp/login. The check is explicit now.
   */
  if (!pathname.startsWith("/cp")) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // Every cp_session cookie is tried, not just the first — a browser may still hold the old
  // path="/cp"-scoped cookie alongside the current path="/" one, and cookies are keyed by
  // (name, path). Same reasoning as getCpSession() in lib/cp/rbac.ts; the two must agree, or
  // the proxy and the page would reach opposite conclusions about the same request.
  const candidates = request.cookies
    .getAll(CP_SESSION_COOKIE_NAME)
    .map((cookie) => cookie.value)
    .filter(Boolean);

  let session = null;
  for (const value of candidates) {
    session = await verifySessionToken(value);
    if (session) break;
  }

  if (!session) {
    const loginUrl = new URL("/cp/login", request.url);
    loginUrl.searchParams.set("reason", "session");
    if (pathname !== "/cp") loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  requestHeaders.set(CP_PATHNAME_HEADER, pathname);
  const response = NextResponse.next({ request: { headers: requestHeaders } });

  const now = Math.floor(Date.now() / 1000);
  if (session.exp - now < CP_SESSION_MAX_AGE_SECONDS / 2) {
    const { iat: _iat, exp: _exp, ...payload } = session;
    response.cookies.set(CP_SESSION_COOKIE_NAME, await createSessionToken(payload), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: CP_SESSION_MAX_AGE_SECONDS,
    });
  }

  return response;
}

/**
 * Every route, minus the static ones.
 *
 * Widened from ["/cp", "/cp/((?!login).*)", "/dashboard/:path*"] because the site header has to
 * be stamped on requests the proxy previously never saw - which is every public page. The gates
 * themselves are unchanged: /dashboard and /cp are matched by the same prefixes inside the
 * function, and /cp/login is excluded here exactly as before so the sign-in form stays reachable.
 *
 * The exclusions are the paths where running this would be pure cost: Next's own static output,
 * the image optimiser, and the public asset folders this app serves from disk. None of them
 * render a page, so none of them need to know which site they belong to.
 */
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|_next/webpack-hmr|favicon.ico|images/|files/|cp/login).*)",
  ],
};
