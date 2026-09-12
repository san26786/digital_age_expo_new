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

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/dashboard")) {
    const token = await getToken({ req: request, secret: nextAuthSecret() });
    if (!token) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
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

  const requestHeaders = new Headers(request.headers);
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

export const config = {
  matcher: ["/cp", "/cp/((?!login).*)", "/dashboard/:path*"],
};
