import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/prisma";
import { safeQuery } from "@/lib/db-errors";
import { resolveSiteId } from "@/lib/tenant";
import { DOMAIN_ID } from "@/lib/site-config";

/**
 * ===========================================================================
 *  WHO MAY REACH THE HUB
 * ===========================================================================
 *
 *  The Hub creates whole websites. One click here can mint a live domain, copy a show's
 *  exhibitor list into it, and (once Phase 4 lands) point DNS at it. That is a materially
 *  different blast radius from every other members-side screen, which at worst edits one
 *  event, so it does not reuse the members-side guard.
 *
 *  It does not reuse it for a second reason, which is worth stating plainly rather than
 *  discovering later: `requireOrganiser()` and the dashboard layout both fall back to a
 *  hardcoded demo session when `getServerSession` returns nothing —
 *
 *      const session = (await getServerSession(authOptions)) ?? { user: { id: "1", ... } };
 *
 *  — so an unauthenticated request is currently treated as user 1. That is survivable for a
 *  screen that shows one event's FAQs. It is not survivable for a screen that creates sites.
 *  Nothing below falls back to anything.
 *
 *  TWO GATES, AND THEY ANSWER DIFFERENT QUESTIONS:
 *
 *    getHubAccess()       is this PERSON allowed in? Nothing about which site is being served.
 *                         Email Templates uses this one, so an organiser can reach it from
 *                         whichever of their sites they happen to be signed in to.
 *
 *    getSitesHubAccess()  the same, AND is this the parent site? Creating, editing and deleting
 *                         whole sites is a thing the platform does, not a thing one expo does, so
 *                         it does not appear inside a sub-site at all.
 *
 *  TWO WAYS IN, AND THEY ARE DELIBERATELY DIFFERENT IN KIND:
 *
 *    1. HUB_SUPERADMIN_EMAILS — a comma-separated allowlist in the environment. This is the
 *       authoritative one. It lives outside the database, so granting Hub access is a
 *       deployment action, not something reachable from any CP screen: an attacker who gets
 *       write access to `find_users` still cannot make themselves a superadmin.
 *
 *    2. find_users.user_role — a free-text column the legacy app already carries. Honoured so
 *       existing superadmins are not locked out of their own system on day one, but it is the
 *       weaker of the two by design, and it is checked only when the allowlist has not already
 *       answered.
 *
 *  FAIL CLOSED IN PRODUCTION. With no allowlist configured, production denies everyone —
 *  an unconfigured deployment must not be an open one. Development allows through, because a
 *  local checkout has no session to speak of and the alternative is that this feature cannot
 *  be looked at while it is being built; `reason` says which of the two happened so the UI can
 *  be honest about it on screen rather than silently implying a real check passed.
 */

export type HubAccess =
  | { ok: true; userId: number | null; email: string | null; reason: "allowlist" | "user_role" | "dev" }
  | { ok: false; reason: "no-session" | "not-superadmin" | "not-configured" | "not-parent-site" };

/** Matches "superadmin", "super admin", "super_admin", "Super-Admin". */
const SUPERADMIN_ROLE = /^super[\s_-]?admin$/i;

function allowlist(): string[] {
  return (process.env.HUB_SUPERADMIN_EMAILS ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

export async function getHubAccess(): Promise<HubAccess> {
  const isDev = process.env.NODE_ENV !== "production";
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase() ?? null;
  const userId = session?.user?.id ? Number(session.user.id) : null;

  const allowed = allowlist();

  if (email && allowed.includes(email)) {
    return { ok: true, userId, email, reason: "allowlist" };
  }

  /*
   * The database check runs only when the allowlist did not already say yes, and only for a
   * real session. safeQuery keeps a database outage from reading as "access denied" — but note
   * which way the fallback points: `null`, not a role. An unreachable database denies access
   * here rather than granting it.
   */
  if (userId && Number.isFinite(userId)) {
    const user = await safeQuery(
      () =>
        prisma.find_users.findUnique({
          where: { id: userId },
          select: { user_role: true, user_email: true },
        }),
      null
    );

    if (user?.user_role && SUPERADMIN_ROLE.test(user.user_role.trim())) {
      return { ok: true, userId, email: email ?? user.user_email ?? null, reason: "user_role" };
    }
  }

  if (isDev) {
    return { ok: true, userId, email, reason: "dev" };
  }

  if (allowed.length === 0) return { ok: false, reason: "not-configured" };
  if (!session) return { ok: false, reason: "no-session" };
  return { ok: false, reason: "not-superadmin" };
}

/** What to tell the person who was turned away. Deliberately vague about WHY they failed. */
/**
 * The Hub's SITE management, which is the parent site's alone.
 *
 * ---------------------------------------------------------------------------
 *  WHY THIS IS A SEPARATE FUNCTION RATHER THAN A FLAG ON THE ONE ABOVE
 * ---------------------------------------------------------------------------
 *
 *  Because the two questions have different answers, and the first version of this got that
 *  wrong: it put the site check inside getHubAccess() and took Email Templates down with it.
 *  Email Templates is a screen an organiser wants from whichever site they are working on;
 *  "create a site, copy an event into it, delete one" is not a thing that belongs inside one of
 *  the sites it manages, whoever is asking.
 *
 *  The site test runs FIRST, before the person test and before the development bypass. Without
 *  that ordering, previewing a sub-site locally would still show the site Hub — which is exactly
 *  the case that needs testing.
 *
 *  resolveSiteId() is memoised per request with React cache() and the root layout has already
 *  called it, so this costs nothing. Outside a request it falls back to DOMAIN_ID, so a script
 *  behaves as it did before this existed.
 */
export async function getSitesHubAccess(): Promise<HubAccess> {
  if ((await resolveSiteId()) !== DOMAIN_ID) {
    return { ok: false, reason: "not-parent-site" };
  }

  return getHubAccess();
}

/**
 * May this request edit the settings of ONE PARTICULAR site?
 *
 * ---------------------------------------------------------------------------
 *  TWO WAYS TO BE ALLOWED, AND THE SECOND IS THE NEW ONE
 * ---------------------------------------------------------------------------
 *
 *  Either you manage every site on this platform — the parent-site Hub — or the site you are
 *  asking about IS the site serving this request. An organiser signed in on B2B Growth Expo may
 *  change B2B Growth Expo's name, colours, logo and contact email; they may not touch Digital Age
 *  Expo's, and nothing they can put in a URL changes that, because the comparison is against
 *  resolveSiteId() and not against anything the client sent.
 *
 *  That second case is what makes a created site self-sufficient. The alternative — every colour
 *  change routed through the parent site's Hub — is exactly the "you need a second login for
 *  that" problem this whole area exists to remove.
 *
 *  DELETING IS NOT IN HERE, deliberately. A site being able to remove itself is not a feature
 *  anybody asked for and is a very bad accident to make possible, so DELETE stays on
 *  getSitesHubAccess and lives at the parent only.
 */
export async function canEditSite(siteId: number): Promise<boolean> {
  const hub = await getSitesHubAccess();
  if (hub.ok) return true;

  const person = await getHubAccess();
  if (!person.ok) return false;

  return siteId === (await resolveSiteId());
}

export function hubDenialMessage(
  reason: "no-session" | "not-superadmin" | "not-configured" | "not-parent-site"
): {
  title: string;
  detail: string;
} {
  switch (reason) {
    case "not-parent-site":
      return {
        title: "Not available on this site",
        detail:
          "Creating and managing sites is done from the main site, not from inside one of the " +
          "sites it manages. Open the Hub at the main site's address and you will find this one " +
          "listed there. Email templates are still available here.",
      };
    case "not-configured":
      return {
        title: "The Hub is not configured",
        detail:
          "No superadmin has been nominated for this deployment, so the Hub is closed to " +
          "everyone. Set HUB_SUPERADMIN_EMAILS to a comma-separated list of addresses and " +
          "restart the app.",
      };
    case "no-session":
      return {
        title: "Sign in required",
        detail: "The Hub is restricted to superadmins. Sign in with an account that has access.",
      };
    default:
      return {
        title: "Not available to your account",
        detail:
          "The Hub creates and manages whole sites, so it is restricted to superadmins. " +
          "Ask whoever administers this deployment if you need access.",
      };
  }
}
