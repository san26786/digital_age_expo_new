import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { CP_SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/cp/auth/session";
import { nextAuthSecret } from "@/lib/auth/secret";

/**
 * Route protection that runs BEFORE a route renders.
 *
 * Two areas are gated here, for different reasons.
 *
 * ---------------------------------------------------------------------------
 *  /cp/**  — the Admin Control Panel
 * ---------------------------------------------------------------------------
 *  Checks only that a validly-signed, unexpired CP session exists. It does NOT
 *  check per-route permissions — that's requireCpPermission() in lib/cp/rbac.ts,
 *  called from each page/Server Action, since only Server Components/Actions can
 *  redirect with page-specific context. /cp/login is excluded so an
 *  unauthenticated admin can reach the sign-in form instead of redirect-looping.
 *
 *  Edge runtime can't use Node's `crypto` module, which is exactly why
 *  lib/cp/auth/session.ts's verify() is built on the Web Crypto API instead.
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

  const token = request.cookies.get(CP_SESSION_COOKIE_NAME)?.value;
  const session = await verifySessionToken(token);

  if (!session) {
    const loginUrl = new URL("/cp/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/cp/((?!login).*)", "/dashboard/:path*"],
};
