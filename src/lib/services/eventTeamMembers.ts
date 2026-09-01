import { prisma } from "@/lib/prisma";
import type { EventMemberContext } from "@/lib/services/eventAccess";
import { roleLabel } from "@/lib/services/eventAccess";
import {
  eventTeamMemberSchema,
  type EventTeamMemberInput,
} from "@/lib/validations/eventTeamMember";

const SELECT_FIELDS = {
  id: true,
  event_id: true,
  member_user_id: true,
  first_name: true,
  last_name: true,
  email: true,
  phone: true,
  work_phone: true,
  listing_id: true,
  position: true,
  member_type: true,
  status: true,
  joining_status: true,
  description: true,
  profile_pic: true,
  is_contact: true,
  enable_chat: true,
  linkedin_user_profile: true,
} as const;

export interface TeamMemberRow {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  workPhone: string;
  business: string | null;
  position: string;
  memberType: string;
  status: string | null;
  joiningStatus: string | null;
  description: string | null;
  profilePic: string | null;
  isContact: boolean;
  enableChat: boolean;
  linkedinUserProfile: string | null;
  isOwn: boolean;
}

/** Mirrors members/event_member.php's list view — scoped to "own team" for non-organisers. */
export async function getTeamMembers(context: EventMemberContext): Promise<TeamMemberRow[]> {
  const where =
    context.role === "organiser"
      ? { event_id: context.eventId }
      : { event_id: context.eventId, member_user_id: context.userId };

  const members = await prisma.find_event_member.findMany({
    where,
    orderBy: { id: "desc" },
    select: SELECT_FIELDS,
  });
  if (members.length === 0) return [];

  const listingIds = [...new Set(members.map((m: any) => m.listing_id).filter((id: any): id is number => !!id))];
  const listings =
    listingIds.length > 0
      ? await prisma.find_listings.findMany({ where: { id: { in: listingIds } }, select: { id: true, title: true } })
      : [];
  const listingTitleById = new Map<any, any>(listings.map((l: any) => [l.id, l.title]));

  return members.map((m: any) => ({
    id: m.id,
    firstName: m.first_name,
    lastName: m.last_name,
    email: m.email,
    phone: m.phone,
    workPhone: m.work_phone,
    business: m.listing_id ? listingTitleById.get(m.listing_id) ?? null : null,
    position: m.position,
    memberType: m.member_type,
    status: m.status,
    joiningStatus: m.joining_status,
    description: m.description,
    profilePic: m.profile_pic,
    isContact: !!m.is_contact,
    enableChat: !!m.enable_chat,
    linkedinUserProfile: m.linkedin_user_profile,
    isOwn: m.member_user_id === context.userId,
  }));
}

function generateBatchNumber(eventId: number): string {
  return `EM-${eventId}-${Date.now().toString(36).toUpperCase()}`;
}

/** Mirrors event_member.php's action=add branch. */
export async function createTeamMember(context: EventMemberContext, input: EventTeamMemberInput) {
  return prisma.find_event_member.create({
    data: {
      event_id: context.eventId,
      member_user_id: context.userId,
      listing_id: context.listingId ?? null,
      batch_number: generateBatchNumber(context.eventId),
      first_name: input.first_name,
      last_name: input.last_name,
      email: input.email,
      phone: input.phone || null,
      work_phone: input.work_phone,
      position: input.position,
      member_type: roleLabel(context.role),
      status: input.status,
      description: input.description || null,
      linkedin_user_profile: input.linkedin_user_profile || null,
      is_contact: input.is_contact,
      enable_chat: input.enable_chat ? 1 : 0,
    },
    select: { id: true },
  });
}

/** Mirrors event_member.php's action=edit branch. Non-organisers may only touch their own team. */
export async function updateTeamMember(context: EventMemberContext, id: number, input: EventTeamMemberInput) {
  const where =
    context.role === "organiser"
      ? { id }
      : { id, member_user_id: context.userId };

  return prisma.find_event_member.updateMany({
    where,
    data: {
      first_name: input.first_name,
      last_name: input.last_name,
      email: input.email,
      phone: input.phone || null,
      work_phone: input.work_phone,
      position: input.position,
      status: input.status,
      description: input.description || null,
      linkedin_user_profile: input.linkedin_user_profile || null,
      is_contact: input.is_contact,
      enable_chat: input.enable_chat ? 1 : 0,
    },
  });
}

export async function deleteTeamMember(context: EventMemberContext, id: number) {
  const where =
    context.role === "organiser"
      ? { id }
      : { id, member_user_id: context.userId };

  return prisma.find_event_member.deleteMany({ where });
}

export interface TeamMemberImportRow {
  first_name?: string;
  last_name?: string;
  /** Accepted when the file has one "Name" column instead of two; split on the first space. */
  name?: string;
  email?: string;
  phone?: string;
  work_phone?: string;
  position?: string;
  status?: string;
  linkedin_user_profile?: string;
  description?: string;
  is_contact?: string;
  enable_chat?: string;
}

export interface TeamMemberImportResult {
  created: number;
  skipped: number;
  skippedEmails: string[];
  invalid: { row: number; name: string; reason: string }[];
}

/** "yes"/"true"/"y"/"1" -> true. Anything else, including blank, is false. */
function toBoolean(value: string | undefined): boolean {
  return ["yes", "true", "y", "1"].includes((value ?? "").trim().toLowerCase());
}

/**
 * The status enum is capitalised ("Pending" / "Registered"), but a spreadsheet will happily
 * contain "pending". Normalise rather than reject a row over letter case.
 */
function toStatus(value: string | undefined): "Pending" | "Registered" {
  return (value ?? "").trim().toLowerCase() === "registered" ? "Registered" : "Pending";
}

/**
 * Bulk import for the Event Team Members list — counterpart to its Export CSV.
 *
 * Duplicate detection is by EMAIL, case-insensitively, scoped to this event: an email is what
 * identifies a person, and find_event_member has no other stable key. Existing members are
 * SKIPPED, never updated — an import must not overwrite a chat or contact flag someone set by
 * hand — so re-importing the same file is a no-op.
 *
 * Rows go through the same eventTeamMemberSchema the Add Member form uses, which means first
 * name, last name, email, mobile and position are all required. Rows missing any of them are
 * reported with the reason rather than silently dropped or half-inserted.
 */
export async function importTeamMembers(
  context: EventMemberContext,
  rows: TeamMemberImportRow[]
): Promise<TeamMemberImportResult> {
  const result: TeamMemberImportResult = { created: 0, skipped: 0, skippedEmails: [], invalid: [] };

  const existing = await prisma.find_event_member.findMany({
    where: { event_id: context.eventId },
    select: { email: true },
  });
  const haveEmails = new Set(
    existing
      .map((r: { email: string | null }) => (r.email ?? "").trim().toLowerCase())
      .filter((e: string) => e !== ""),
  );

  const toCreate: EventTeamMemberInput[] = [];

  rows.forEach((raw, index) => {
    // A single "Name" column is split on the first space, so "Priya Sharma" becomes
    // Priya / Sharma. Explicit First/Last columns always win.
    let firstName = (raw.first_name ?? "").trim();
    let lastName = (raw.last_name ?? "").trim();
    if (!firstName && !lastName && raw.name) {
      const whole = raw.name.trim();
      const cut = whole.indexOf(" ");
      firstName = cut === -1 ? whole : whole.slice(0, cut);
      lastName = cut === -1 ? "" : whole.slice(cut + 1).trim();
    }

    const candidate = {
      first_name: firstName,
      last_name: lastName,
      email: (raw.email ?? "").trim(),
      phone: (raw.phone ?? "").trim(),
      work_phone: (raw.work_phone ?? "").trim(),
      position: (raw.position ?? "").trim(),
      status: toStatus(raw.status),
      linkedin_user_profile: (raw.linkedin_user_profile ?? "").trim(),
      description: (raw.description ?? "").trim(),
      is_contact: toBoolean(raw.is_contact),
      enable_chat: toBoolean(raw.enable_chat),
    };

    const parsed = eventTeamMemberSchema.safeParse(candidate);
    if (!parsed.success) {
      const fields = parsed.error.flatten().fieldErrors;
      const reason =
        Object.values(fields).find((m) => Array.isArray(m) && m.length > 0)?.[0] ?? "Invalid row";
      result.invalid.push({
        row: index + 1,
        name: `${firstName} ${lastName}`.trim() || candidate.email || "(blank)",
        reason,
      });
      return;
    }

    const key = parsed.data.email.trim().toLowerCase();
    // Catches a file that repeats someone, not just a clash with the database.
    if (haveEmails.has(key)) {
      result.skipped += 1;
      result.skippedEmails.push(parsed.data.email);
      return;
    }
    haveEmails.add(key);
    toCreate.push(parsed.data);
  });

  if (toCreate.length > 0) {
    // Same column set createTeamMember() writes when the form is submitted, including the
    // context-derived batch number, member type and listing.
    await prisma.find_event_member.createMany({
      data: toCreate.map((input) => ({
        event_id: context.eventId,
        member_user_id: context.userId,
        listing_id: context.listingId ?? null,
        batch_number: generateBatchNumber(context.eventId),
        first_name: input.first_name,
        last_name: input.last_name,
        email: input.email,
        phone: input.phone || null,
        work_phone: input.work_phone,
        position: input.position,
        member_type: roleLabel(context.role),
        status: input.status,
        description: input.description || null,
        linkedin_user_profile: input.linkedin_user_profile || null,
        is_contact: input.is_contact,
        enable_chat: input.enable_chat ? 1 : 0,
      })),
    });
    result.created = toCreate.length;
  }

  return result;
}
