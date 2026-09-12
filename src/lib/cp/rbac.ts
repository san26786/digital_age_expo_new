import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { CP_SESSION_COOKIE_NAME, verifySessionToken, type CpSessionPayload } from "@/lib/cp/auth/session";

/**
 * Permission slug catalog for this CP. Slugs follow the legacy admin CP's own naming
 * convention (verb-suffixed module names, e.g. "admin_users_edit") so the seed script can
 * grant the exact same slugs the legacy `find_users_permissions` catalog already uses where
 * they overlap, and extend it with new module slugs for parts of this spec the legacy panel
 * didn't have (e.g. CMS, media manager). "Configurable" per the spec means: these are just
 * catalog rows in find_users_permissions, and grants are just rows in
 * find_users_groups_permissions_lookup — an Admin with admin_users_groups_edit can add/remove
 * grants for any group through the UI (module #6, User Management) without a code change.
 */
export const CP_PERMISSIONS = {
  ADMIN_LOGIN: "admin_login",
  SETTINGS_VIEW: "admin_settings_view",
  SETTINGS_EDIT: "admin_settings_edit",
  USERS_VIEW: "admin_users_view",
  USERS_EDIT: "admin_users_edit",
  USERS_DELETE: "admin_users_delete",
  USERS_GROUPS_VIEW: "admin_users_groups_view",
  USERS_GROUPS_EDIT: "admin_users_groups_edit",
  USERS_GROUPS_DELETE: "admin_users_groups_delete",
  EVENTS_VIEW: "admin_events_view",
  EVENTS_EDIT: "admin_events_edit",
  MENU_MANAGER_VIEW: "admin_menu_links_view",
  MENU_MANAGER_EDIT: "admin_menu_links_edit",
  MEMBER_MENU_VIEW: "admin_event_menus_view",
  MEMBER_MENU_EDIT: "admin_event_menus_edit",
  EMAIL_TEMPLATES_VIEW: "admin_email_templates_view",
  EMAIL_TEMPLATES_EDIT: "admin_email_templates_edit",
} as const;

export type CpPermissionSlug = (typeof CP_PERMISSIONS)[keyof typeof CP_PERMISSIONS];

/**
 * The 8 roles from the spec, seeded as find_users_groups rows (see _scripts/seed.ts). Kept
 * here as a single source of truth for the seed script and the "role" dropdown in the User
 * Management UI — the actual permission GRANTS are still just DB rows, editable without
 * touching this list.
 */
export const CP_SEED_ROLES = [
  "Super Admin",
  "Admin",
  "Event Manager",
  "Content Manager",
  "Marketing",
  "Sales",
  "Member Manager",
  "Read Only",
] as const;

/** Every slug the CP itself ever checks. See cpSessionPermissions() for why that matters. */
export const CP_PERMISSION_SLUGS: readonly string[] = Object.values(CP_PERMISSIONS);

/**
 * Request header src/proxy.ts stamps with the /cp path being requested. A Server Component
 * has no other way to learn its own URL, and the guards below need it to send you back to the
 * page you actually clicked after signing in again.
 */
export const CP_PATHNAME_HEADER = "x-cp-pathname";

/**
 * Narrows a user's full permission list down to the slugs this CP understands, for storage in
 * the session cookie.
 *
 * find_users_permissions is the LEGACY catalog: on the real database it carries a slug per
 * admin_*.php page of the old panel, which is far more rows than the ~17 this CP checks. The
 * whole list used to go into the signed cookie verbatim, and a browser silently DROPS a cookie
 * over ~4 KB — the account then looks signed in on whatever page is already open, and every
 * subsequent request arrives with no session at all and bounces to /cp/login. Storing only the
 * slugs that can ever be checked keeps the token small enough that this cannot happen.
 */
export function cpSessionPermissions(all: readonly string[]): string[] {
  const understood = new Set<string>(CP_PERMISSION_SLUGS);
  return all.filter((slug) => understood.has(slug));
}

/** The /cp path currently being rendered, if src/proxy.ts stamped it on the request. */
async function currentCpPath(): Promise<string | null> {
  try {
    const store = await headers();
    const raw = store.get(CP_PATHNAME_HEADER) ?? store.get("next-url");
    return raw && raw.startsWith("/cp") ? raw : null;
  } catch {
    return null;
  }
}

/** Sign-in URL that comes back to `returnTo` once the admin has signed in again. */
export function cpLoginUrl(returnTo: string | null | undefined): string {
  const params = new URLSearchParams({ reason: "session" });
  if (returnTo && returnTo.startsWith("/cp") && !returnTo.startsWith("/cp/login")) {
    params.set("next", returnTo);
  }
  return `/cp/login?${params.toString()}`;
}

/**
 * Sanitises a ?next= value before redirecting to it. Only same-site /cp paths are honoured, so
 * a crafted link can't turn the login form into an open redirect to another origin
 * ("//evil.example" is a protocol-relative URL, not a local path — hence the explicit check).
 */
export function safeCpReturnPath(value: string | null | undefined): string {
  if (!value) return "/cp";
  if (!value.startsWith("/cp")) return "/cp";
  if (value.startsWith("//") || value.startsWith("/cp/login")) return "/cp";
  return value;
}

/**
 * Reads and verifies the CP session cookie. Returns null rather than redirecting — use
 * requireCpSession() in Server Components/Actions that must redirect on failure.
 *
 * Every cookie named cp_session is tried, not just the first. Cookies are keyed by (name,
 * PATH), and this cookie used to be written with path="/cp" before it was widened to "/" — a
 * browser that still holds the old one sends BOTH on every /cp request, most-specific first.
 * Taking only the first match meant a stale path="/cp" token (signed with a previous secret,
 * or simply older) shadowed the good one and logged the admin out on the next page they
 * clicked. Verifying each candidate and keeping the first that passes makes that impossible.
 */
export async function getCpSession(): Promise<CpSessionPayload | null> {
  const store = await cookies();
  const candidates = store
    .getAll(CP_SESSION_COOKIE_NAME)
    .map((cookie) => cookie.value)
    .filter(Boolean);

  for (const token of candidates) {
    const session = await verifySessionToken(token);
    if (session) return session;
  }
  return null;
}

/** For Server Components/Actions: redirects to /cp/login if there's no valid session. */
export async function requireCpSession(): Promise<CpSessionPayload> {
  const session = await getCpSession();
  if (!session) {
    const returnTo = await currentCpPath();
    // Deliberately noisy: a silent bounce to the sign-in form is indistinguishable from a
    // broken link, and that ambiguity is what made this hard to diagnose the first time.
    console.warn(
      `[cp auth] no valid "${CP_SESSION_COOKIE_NAME}" cookie on ${returnTo ?? "a CP request"} — sending the browser to /cp/login`
    );
    redirect(cpLoginUrl(returnTo));
  }
  return session;
}

/**
 * Whether `session` may do `slug`.
 *
 * A group flagged `administrator` in find_users_groups passes everything. The legacy catalog
 * this CP inherits does not necessarily contain the newer admin_* slugs (they only exist once
 * /api/cp/bootstrap has run), so a genuine Super Admin could be refused a page their own
 * sidebar had just offered them — the sidebar rows and the page guard were reading the same
 * missing grant and disagreeing about what to do about it. Administrator status is decided at
 * login from the group row itself, so it can't go missing that way.
 */
export function hasPermission(session: CpSessionPayload | null, slug: string): boolean {
  if (!session) return false;
  if (session.admin) return true;
  return session.perms.includes(slug);
}

/** For Server Components/Actions: redirects to /cp (with a denial banner) if the session lacks `slug`. */
export async function requireCpPermission(slug: CpPermissionSlug): Promise<CpSessionPayload> {
  const session = await requireCpSession();
  if (!hasPermission(session, slug)) {
    console.warn(
      `[cp rbac] ${session.email} (role "${session.groupName}") is missing "${slug}" — redirecting to /cp`
    );
    redirect(`/cp?denied=${encodeURIComponent(slug)}`);
  }
  return session;
}
