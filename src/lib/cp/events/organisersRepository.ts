import { prisma } from "@/lib/prisma";
import { DOMAIN_ID } from "@/lib/site-config";

/**
 * ===========================================================================
 *  MAKING SOMEONE AN ORGANISER OF AN EVENT
 * ===========================================================================
 *
 *  Until this module existed there was no way to do this from the CP at all. The panel's
 *  Users screen manages find_users_groups — the ADMIN CP's own roles and permissions — which
 *  has nothing to do with what the member portal calls a role. The member portal asks
 *  isEventOrganiser() in src/lib/services/events.ts, and that function reads two places:
 *
 *    1. find_events.user_id === userId          — the event OWNER, exactly one account
 *    2. a find_event_member row for this event  — the event's team
 *
 *  This module writes (2), deliberately, and never touches (1). Ownership is a single column:
 *  granting through it would mean taking organiser access away from whoever currently holds it,
 *  which is a destructive way to answer "also let this person in". A team row is additive, so an
 *  event can have as many organisers as it needs and revoking one leaves the rest alone.
 *
 *  ---------------------------------------------------------------------------
 *  THE THREE CLAUSES A ROW MUST SATISFY, AND THE ONE THAT IS EASY TO MISS
 *  ---------------------------------------------------------------------------
 *
 *  isEventOrganiser()'s team-member branch is:
 *
 *      event_id, member_user_id: userId,
 *      OR: [{ signatory_organiser: 1 }, { member_type: { equals: "Organiser", mode: "insensitive" } }],
 *      NOT: { joining_status: "Pending" }
 *
 *  All three matter, and the third is a trap. find_event_member.joining_status DEFAULTS TO
 *  "Pending" at the database level, and createTeamMember() in src/lib/services/eventTeamMembers.ts
 *  never sets it — so a row added the members-side way is invisible to isEventOrganiser() until
 *  something else approves it. A grant made here sets it explicitly to JOINING_STATUS_ACTIVE;
 *  leaving it to the default would write a row that looks correct in the table and grants nothing.
 *
 *  Both halves of the OR are written rather than just one. member_type carries the label the
 *  members-side team screens read and display, and signatory_organiser is the integer flag the
 *  legacy PHP checked; setting only one leaves the row's meaning dependent on which of the two
 *  a given screen happens to look at.
 *
 *  member_user_id is the GRANTEE, which is worth stating because the members-side
 *  createTeamMember() puts context.userId there — the person doing the adding. That is right for
 *  a contact list and wrong here: isEventOrganiser() matches member_user_id against the person
 *  signing in, so a row carrying the admin's id would grant the ADMIN access and not the person
 *  the CP admin picked.
 */

/** Written into member_type. Compared case-insensitively by isEventOrganiser(). */
const MEMBER_TYPE_ORGANISER = "Organiser";

/**
 * Anything other than the literal "Pending" satisfies isEventOrganiser(), but the value still
 * has to read sensibly to a human looking at the table, and it has to match what the
 * members-side team screens already show in their Joining Status column.
 */
const JOINING_STATUS_ACTIVE = "Active";

/** Mirrors generateBatchNumber() in src/lib/services/eventTeamMembers.ts — batch_number is NOT NULL. */
function generateBatchNumber(eventId: number): string {
  return `EM-${eventId}-${Date.now().toString(36).toUpperCase()}`;
}

export interface EventOrganiser {
  /** find_event_member.id — null for the event OWNER, which is a find_events column, not a row here. */
  memberRowId: number | null;
  userId: number;
  name: string;
  email: string;
  /** Owners come from find_events.user_id and cannot be revoked here. See the header. */
  isOwner: boolean;
  joiningStatus: string | null;
}

/**
 * Everyone the member portal would treat as an organiser of this event — the owner first, then
 * team rows. Deliberately built from the SAME two sources isEventOrganiser() reads, so what the
 * CP lists and what the portal honours cannot drift apart.
 */
export async function listEventOrganisers(eventId: number): Promise<EventOrganiser[]> {
  const [event, teamRows] = await Promise.all([
    prisma.find_events.findUnique({ where: { id: eventId }, select: { user_id: true } }),
    prisma.find_event_member.findMany({
      where: {
        event_id: eventId,
        OR: [{ signatory_organiser: 1 }, { member_type: { equals: MEMBER_TYPE_ORGANISER, mode: "insensitive" } }],
        NOT: { joining_status: "Pending" },
      },
      select: {
        id: true,
        member_user_id: true,
        first_name: true,
        last_name: true,
        email: true,
        joining_status: true,
      },
      orderBy: { id: "asc" },
    }),
  ]);

  const organisers: EventOrganiser[] = [];

  const ownerId = event?.user_id ?? null;
  if (ownerId && ownerId > 0) {
    const owner = await prisma.find_users.findUnique({
      where: { id: ownerId },
      select: { id: true, user_first_name: true, user_last_name: true, user_email: true },
    });
    if (owner) {
      organisers.push({
        memberRowId: null,
        userId: owner.id,
        name: `${owner.user_first_name} ${owner.user_last_name}`.trim() || `User ${owner.id}`,
        email: owner.user_email,
        isOwner: true,
        joiningStatus: null,
      });
    }
  }

  for (const row of teamRows) {
    // The owner may ALSO hold a team row. Listing them twice would offer a Revoke button that
    // appears to do nothing, since revoking the row leaves ownership — and therefore access —
    // untouched. One entry per person, owner wins.
    if (row.member_user_id === ownerId) continue;
    organisers.push({
      memberRowId: row.id,
      userId: row.member_user_id,
      name: `${row.first_name} ${row.last_name}`.trim() || `User ${row.member_user_id}`,
      email: row.email,
      isOwner: false,
      joiningStatus: row.joining_status,
    });
  }

  return organisers;
}

export type GrantOrganiserResult =
  | { ok: true }
  | { ok: false; error: "no-such-user" | "no-such-event" | "already-organiser" };

/**
 * Grants organiser access by writing a find_event_member row. Idempotent in the sense that it
 * refuses rather than writing a duplicate: two rows for one person would both have to be revoked
 * to actually remove access, which is exactly the kind of half-revoked state this should not
 * be able to create.
 */
export async function grantEventOrganiser(eventId: number, userId: number): Promise<GrantOrganiserResult> {
  const [event, user] = await Promise.all([
    prisma.find_events.findUnique({ where: { id: eventId }, select: { id: true, user_id: true } }),
    prisma.find_users.findUnique({
      where: { id: userId },
      select: { id: true, user_first_name: true, user_last_name: true, user_email: true, user_phone: true },
    }),
  ]);

  if (!event) return { ok: false, error: "no-such-event" };
  if (!user) return { ok: false, error: "no-such-user" };

  // Already the owner — they have organiser access through find_events.user_id and a team row
  // would add nothing but a revocable-looking entry that doesn't control anything.
  if (event.user_id === userId) return { ok: false, error: "already-organiser" };

  const existing = await prisma.find_event_member.findFirst({
    where: {
      event_id: eventId,
      member_user_id: userId,
      OR: [{ signatory_organiser: 1 }, { member_type: { equals: MEMBER_TYPE_ORGANISER, mode: "insensitive" } }],
      NOT: { joining_status: "Pending" },
    },
    select: { id: true },
  });
  if (existing) return { ok: false, error: "already-organiser" };

  /*
   * A row for this person may already exist as something OTHER than an active organiser — a
   * Pending invite, or a plain team contact. Promoting that row is better than adding a second
   * one beside it: it keeps one row per person per event, which is what the revoke path and the
   * duplicate check above both assume.
   */
  const promotable = await prisma.find_event_member.findFirst({
    where: { event_id: eventId, member_user_id: userId },
    select: { id: true },
    orderBy: { id: "asc" },
  });

  if (promotable) {
    await prisma.find_event_member.update({
      where: { id: promotable.id },
      data: {
        member_type: MEMBER_TYPE_ORGANISER,
        signatory_organiser: 1,
        joining_status: JOINING_STATUS_ACTIVE,
      },
      select: { id: true },
    });
    return { ok: true };
  }

  await prisma.find_event_member.create({
    data: {
      event_id: eventId,
      member_user_id: userId,
      batch_number: generateBatchNumber(eventId),
      first_name: user.user_first_name || "",
      last_name: user.user_last_name || "",
      email: user.user_email || "",
      phone: user.user_phone || null,
      // NOT NULL with no default in schema.prisma, and there is nothing meaningful to put in
      // them for a CP-side grant — an empty string is the honest value, not a placeholder.
      work_phone: "",
      position: "",
      member_type: MEMBER_TYPE_ORGANISER,
      signatory_organiser: 1,
      joining_status: JOINING_STATUS_ACTIVE,
    },
    select: { id: true },
  });

  return { ok: true };
}

export type RevokeOrganiserResult = { ok: true } | { ok: false; error: "is-owner" | "not-found" };

/**
 * Removes organiser access granted through a team row.
 *
 * Demotes rather than deletes. The row may carry a person's contact details, position and
 * description that the members-side team screens show, and deleting it to remove a permission
 * would throw all of that away — so this clears the two organiser markers and leaves the row.
 * signatory_organiser goes back to 0 and member_type to "Member"; either one left set would keep
 * satisfying isEventOrganiser()'s OR on its own.
 */
export async function revokeEventOrganiser(eventId: number, userId: number): Promise<RevokeOrganiserResult> {
  const event = await prisma.find_events.findUnique({ where: { id: eventId }, select: { user_id: true } });

  // Ownership is not revocable here by design — it is a single column on find_events, and
  // clearing it would leave the event with no owner at all. See this module's header.
  if (event?.user_id === userId) return { ok: false, error: "is-owner" };

  const rows = await prisma.find_event_member.findMany({
    where: {
      event_id: eventId,
      member_user_id: userId,
      OR: [{ signatory_organiser: 1 }, { member_type: { equals: MEMBER_TYPE_ORGANISER, mode: "insensitive" } }],
    },
    select: { id: true },
  });
  if (rows.length === 0) return { ok: false, error: "not-found" };

  await prisma.find_event_member.updateMany({
    where: { id: { in: rows.map((r) => r.id) } },
    data: { signatory_organiser: 0, member_type: "Member" },
  });

  return { ok: true };
}

export interface OrganiserEvent {
  eventId: number;
  title: string;
  isOwner: boolean;
}

/** Every event this user is an organiser of — the Users-side view of the same two sources. */
export async function listUserOrganiserEvents(userId: number): Promise<OrganiserEvent[]> {
  const [owned, teamRows] = await Promise.all([
    prisma.find_events.findMany({
      where: { user_id: userId },
      select: { id: true, title: true },
      orderBy: { id: "desc" },
    }),
    prisma.find_event_member.findMany({
      where: {
        member_user_id: userId,
        OR: [{ signatory_organiser: 1 }, { member_type: { equals: MEMBER_TYPE_ORGANISER, mode: "insensitive" } }],
        NOT: { joining_status: "Pending" },
      },
      select: { event_id: true },
    }),
  ]);

  const events: OrganiserEvent[] = owned.map((e) => ({
    eventId: e.id,
    title: e.title,
    isOwner: true,
  }));
  const ownedIds = new Set(owned.map((e) => e.id));

  const teamEventIds = Array.from(new Set(teamRows.map((r) => r.event_id))).filter((id) => !ownedIds.has(id));
  if (teamEventIds.length) {
    const teamEvents = await prisma.find_events.findMany({
      where: { id: { in: teamEventIds } },
      select: { id: true, title: true },
      orderBy: { id: "desc" },
    });
    for (const e of teamEvents) {
      events.push({ eventId: e.id, title: e.title, isOwner: false });
    }
  }

  return events;
}

/** Events to offer in the Users page's "grant organiser on…" dropdown. Newest first. */
export async function listEventsForOrganiserPicker() {
  return prisma.find_events.findMany({
    select: { id: true, title: true, date_start: true },
    orderBy: { id: "desc" },
    take: 200,
  });
}

/**
 * Resolves what a CP admin typed in the "add organiser" box to one find_users row. Accepts a
 * numeric id, a username or an email, because an admin looking at this screen may have any of
 * the three to hand and guessing which one they meant is worse than trying all three.
 *
 * Scoped `{ in: [DOMAIN_ID, 0] }` for the same reason every other find_users read is: the
 * MySQL -> Postgres migration left domain_id at 0 on every imported row, so a bare DOMAIN_ID
 * filter matches nothing and this box would report "no such user" for every real account. See
 * USER_DOMAIN_SCOPE in src/lib/cp/users/usersRepository.ts.
 */
export async function findUserByIdentifier(identifier: string) {
  const trimmed = identifier.trim();
  if (!trimmed) return null;

  const domainScope = { in: [DOMAIN_ID, 0] };
  const asId = Number(trimmed);
  if (Number.isInteger(asId) && asId > 0) {
    const byId = await prisma.find_users.findFirst({
      where: { id: asId, domain_id: domainScope },
      select: { id: true, login: true, user_first_name: true, user_last_name: true, user_email: true },
    });
    if (byId) return byId;
  }

  return prisma.find_users.findFirst({
    where: {
      domain_id: domainScope,
      OR: [{ login: trimmed }, { user_email: trimmed }],
    },
    select: { id: true, login: true, user_first_name: true, user_last_name: true, user_email: true },
  });
}
