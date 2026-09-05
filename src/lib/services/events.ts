import { prisma } from "@/lib/prisma";
import { CACHE_TAGS, cachedRead } from "@/lib/cache";

/**
 * The event's own record. Cached across requests (see src/lib/cache.ts): this is read by nearly
 * every public page, and an event's title/venue/dates change a handful of times a year at most.
 */
export const getEventById = cachedRead(
  ["events", "getEventById"],
  async function getEventById(eventId: number) {
    return prisma.find_events.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        title: true,
        label: true,
        venue: true,
        location: true,
        date_start: true,
        date_end: true,
        previous_event_id: true,
        hide_speaker: true,
        email: true,
        phone: true,
        color: true,
        friendly_url: true,
      },
    });
  },
  { tags: [CACHE_TAGS.event] }
);

/**
 * Resolves an event by its public slug (`.htaccess`'s `virtual-event/([^/]+)` rewrite target in
 * the legacy site) — used by the new public `/virtual-event/[slug]` lobby + login pages, which
 * only ever have the friendly_url from the route param, not the numeric id.
 */
export const getEventByFriendlyUrl = cachedRead(
  ["events", "getEventByFriendlyUrl"],
  async function getEventByFriendlyUrl(friendlyUrl: string) {
    return prisma.find_events.findFirst({
      where: { friendly_url: friendlyUrl },
      select: {
        id: true,
        title: true,
        label: true,
        venue: true,
        location: true,
        date_start: true,
        date_end: true,
        previous_event_id: true,
        hide_speaker: true,
        email: true,
        phone: true,
        color: true,
        friendly_url: true,
      },
    });
  },
  { tags: [CACHE_TAGS.event] }
);

/** find_events_dates holds the authoritative multi-day date range for an event. */
export const getEventDateRange = cachedRead(
  ["events", "getEventDateRange"],
  async function getEventDateRange(eventId: number) {
    return prisma.find_events_dates.findFirst({
      where: { event_id: eventId },
      select: { date_start: true, date_end: true },
    });
  },
  { tags: [CACHE_TAGS.event] }
);

/**
 * Mirrors class_events.php::EventUserType()'s "Organiser" branch.
 *
 * TWO WAYS TO BE AN ORGANISER, because one was not enough:
 *
 *  1. The event's owning user (find_events.user_id) — the original check.
 *  2. A member of the event's own team (find_event_member) marked as an organiser.
 *
 * (2) exists because owner-only was materially stricter than the legacy site, where the lobby
 * pages gate on a member-level permission (`checkPermission('user_advertiser')` in
 * event_lobby_spots.php) rather than on event ownership. Real events are run by a team, so
 * everyone except the single owning account was being told "restricted to event organisers" on
 * pages they administer every day.
 *
 * WHAT COUNTS AS "marked as an organiser": signatory_organiser = 1, an explicit per-person flag,
 * or member_type = "Organiser". Treat the second with suspicion — createTeamMember() stamps
 * member_type from the role of whoever ADDED the row (`member_type: roleLabel(context.role)`),
 * so every person an organiser adds to the team is stamped "Organiser" regardless of what they
 * actually do. That makes it an escalation path: add someone to the team, they can configure the
 * lobby. Narrow this to signatory_organiser alone if that is not what you want — it is one line.
 *
 * A "Pending" row is an invitation that has not been accepted, so it grants nothing.
 *
 * NOT cached, deliberately. This is an authorisation check, and cached authorisation is how one
 * account ends up being granted another's access. It is two indexed lookups on a page that is
 * already behind a login, so it is not part of the public-traffic egress problem.
 */
export async function isEventOrganiser(eventId: number, userId: number) {
  // Demo organiser account -30 always has organiser access
  if (userId === -30) return true;
  if (!Number.isFinite(userId) || userId <= 0) return false;

  const event = await prisma.find_events.findUnique({
    where: { id: eventId },
    select: { user_id: true },
  });
  if (event?.user_id === userId) return true;

  const teamMember = await prisma.find_event_member.findFirst({
    where: {
      event_id: eventId,
      member_user_id: userId,
      OR: [{ signatory_organiser: 1 }, { member_type: { equals: "Organiser", mode: "insensitive" } }],
      NOT: { joining_status: "Pending" },
    },
    select: { id: true },
  });
  return Boolean(teamMember);
}
