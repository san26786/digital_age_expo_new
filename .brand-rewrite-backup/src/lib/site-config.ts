/**
 * This migration targets a single find_domains row (Digital Age Expo) rather
 * than re-implementing the legacy host-based domain resolution. See
 * find_domains.id = 150 in the connectlocal_website database.
 */
export const DOMAIN_ID = 150;

/**
 * Fallbacks for when a DB lookup can't resolve an event/listing on its own (e.g. getDomain()'s
 * find_domains row is missing event_id, or an organiser has no listing linked at all). These are
 * this site's real IDs (find_domains.id=150 -> find_events.id=852 -> find_listings.id=810210),
 * used as a single source of truth instead of scattering the same literals across call sites.
 *
 * DEFAULT_EVENT_ID is now a FALLBACK, not necessarily the live value — see getDomain() in
 * src/lib/services/domain.ts, which resolves the real "active event" from the
 * ACTIVE_EVENT_SETTING_VARNAME setting first (set from the CP's General Settings "Event"
 * dropdown, or Events Management's "Mark Active" button) and only falls back to this constant
 * when that setting is unset or unreadable.
 */
export const DEFAULT_EVENT_ID = 852;
export const DEFAULT_LISTING_ID = 810210;

/**
 * find_settings varname (grouptitle="events") that stores the CP-selected "active event" id —
 * the single source of truth getDomain() reads to decide which event's data the entire public/
 * member site shows. Shared between src/lib/services/domain.ts (reads it) and
 * src/lib/cp/events/eventsRepository.ts (writes it, from both the Events Management page's
 * "Mark Active" button and General Settings' "Event" dropdown) so both sides always agree on
 * the exact same key.
 */
export const ACTIVE_EVENT_SETTING_VARNAME = "cp_active_event_id";

/**
 * @deprecated NO LONGER USED FOR IMAGE RESOLUTION — and must not be reintroduced.
 *
 * Every uploaded asset is now mirrored into `public/images/external/**` and
 * resolved by `assetUrl()` (see src/lib/asset-map.ts). Prefixing this base URL
 * onto a stored filename is what made images depend on the legacy PHP host, and
 * why they rendered on a local XAMPP checkout but broke on Vercel. It is also
 * why a genuinely local path like `/images/visualytes.png` used to come out as
 * `http://localhost/findusonweb/images/visualytes.png`.
 *
 * Kept only so any straggling import still compiles. Delete it once nothing
 * references it, and remove NEXT_PUBLIC_ASSETS_BASE_URL from your Vercel
 * project settings — it no longer has any effect on image URLs.
 */
export const ASSETS_BASE_URL =
  process.env.NEXT_PUBLIC_ASSETS_BASE_URL ?? "http://localhost/findusonweb";

/**
 * The public-facing site that hosts the live virtual event experience (/virtual-event/...).
 * Mirrors legacy BASE_URL in members/event_lobby_layout_manager.php's view_my_booth /
 * view_lobby redirects. Overridable so previews/staging can point at a different host.
 */
export const PUBLIC_SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://digitalageexpo.com";
