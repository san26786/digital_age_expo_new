import { prisma } from "@/lib/prisma";
import { isEventOrganiser } from "@/lib/services/events";

export type EventRole = "organiser" | "exhibitor" | "speaker" | "sponsor" | "visitor";

export interface EventMemberContext {
  role: EventRole;
  eventId: number;
  userId: number;
  userEmail?: string;
  /** The member's own find_event_exhibitor row, when role is "exhibitor". */
  exhibitorId?: number;
  listingId?: number | null;
  /** The member's own find_speakers row, when role is "speaker". */
  speakerId?: number;
  /** The member's own find_event_sponsorer row, when role is "sponsor". */
  sponsorId?: number;
}

/**
 * Mirrors class_events.php::EventUserType() — resolves what relationship the signed-in
 * user has to this event (organiser, or a registered exhibitor/speaker/sponsor "member").
 * Returns null if the user has no relationship to the event at all.
 */
export async function getEventMemberContext(eventId: number, userId: number): Promise<EventMemberContext | null> {
  if (userId === -30 || (await isEventOrganiser(eventId, userId))) {
    return { role: "organiser", eventId, userId };
  }

  // Demo accounts (see verifyMemberCredentials) don't have real rows in the legacy
  // tables — give them a synthetic context so the demo experience isn't a dead end.
  if (userId === -10) {
    return { role: "exhibitor", eventId, userId, exhibitorId: -10, listingId: null };
  }
  if (userId === -20) {
    return { role: "speaker", eventId, userId, speakerId: -20 };
  }
  if (userId === -40) {
    return { role: "visitor", eventId, userId };
  }

  const exhibitor = await prisma.find_event_exhibitor.findFirst({
    where: { event_id: eventId, user_id: userId },
    select: { id: true, listing_id: true },
  });
  if (exhibitor) {
    return { role: "exhibitor", eventId, userId, exhibitorId: exhibitor.id, listingId: exhibitor.listing_id };
  }

  const speaker = await prisma.find_speakers.findFirst({
    where: { event_id: eventId, user_id: userId },
    select: { id: true },
  });
  if (speaker) {
    return { role: "speaker", eventId, userId, speakerId: speaker.id };
  }

  const sponsor = await prisma.find_event_sponsorer.findFirst({
    where: { event_id: eventId, user_id: userId },
    select: { id: true },
  });
  if (sponsor) {
    return { role: "sponsor", eventId, userId, sponsorId: sponsor.id };
  }

  // Fallback context for authenticated members without specific DB role rows
  return { role: "visitor", eventId, userId };
}

/**
 * ---------------------------------------------------------------------------
 * Who may configure this event's virtual lobby.
 * ---------------------------------------------------------------------------
 *
 * Every lobby-management page and service asks THIS, not `role === "organiser"`, so the rule
 * lives in one place and can be tightened in one place.
 *
 * Currently: any signed-in user. That is the legacy site's behaviour, not a widening of it —
 * members/event_lobby_spots.php gates on `checkPermission('user_advertiser')`, a member-level
 * permission that has nothing to do with the event, and members/*.php is already behind
 * `Authentication->authenticate()`. Two narrower rules were tried first and both locked out the
 * people who actually run the show:
 *
 *   - `role === "organiser"` admitted only find_events.user_id, one account per event.
 *   - `role !== "visitor"` admitted exhibitors/speakers/sponsors, but getEventMemberContext()
 *     returns `visitor` for anyone with no row tying them to THIS event — which is the normal
 *     state for event staff who are not exhibiting at it.
 *
 * BE CLEAR ABOUT WHAT THIS GRANTS. The lobby is what every visitor sees, and these pages write
 * it: anyone with a login can reposition or delete spots, repoint the auditorium and replace
 * zone artwork, for any event they can name in the URL. If that is too broad, this function is
 * the single seam to narrow — the obvious next step is a per-person flag on find_event_member
 * (signatory_organiser) rather than inferring authority from an exhibitor/speaker row.
 */
export function canManageLobby(_context: EventMemberContext): boolean {
  return true;
}

/** The message shown when canManageLobby() says no — kept next to the rule that produces it. */
export const LOBBY_ACCESS_DENIED =
  "Sign in to configure this event's virtual lobby.";

const ROLE_LABEL: Record<EventRole, string> = {
  organiser: "Organiser",
  exhibitor: "Exhibitor",
  speaker: "Speaker",
  sponsor: "Sponsor",
  visitor: "Visitor",
};

export function roleLabel(role: EventRole): string {
  return ROLE_LABEL[role];
}
