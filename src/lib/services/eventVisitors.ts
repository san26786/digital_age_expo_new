import { prisma } from "@/lib/prisma";
import type { EventMemberContext } from "@/lib/services/eventAccess";
import {
  eventVisitorSchema,
  VISITOR_STATUSES,
  type EventVisitorInput,
} from "@/lib/validations/eventVisitor";

export const VISITORS_PAGE_SIZE = 50;

export interface VisitorRow {
  id: number;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string | null;
  workphone: string | null;
  gender: string | null;
  business: string | null;
  position: string | null;
  linkedinUserProfile: string | null;
  referralCode: string | null;
  referralMstrId: string | null;
  visitorReferrerFrom: string | null;
  visitorWhyExhibit: string | null;
  visitorIsWebinars: boolean;
  visitorIsWorkshops: boolean;
  visitorIsEMagazine: boolean;
  visitorIsNewsletter: boolean;
  excludedFromAdvertise: boolean;
  awardGuest: boolean;
  allergyFromNuts: boolean;
  allergeyFromShellFish: boolean;
  allergeyFromDairyProducts: boolean;
  vegetarian: boolean;
  vegan: boolean;
  dietaryRequirement: string | null;
  anyOtherFoodAllergy: string | null;
  batchNumber: string | null;
  importBatchNumber: number | null;
  source: string | null;
  locationName: string | null;
  countryName: string | null;
  franchiseName: string | null;
  status: string;
  joiningStatus: string | null;
  createdOn: Date;
}

const SELECT_FIELDS = {
  id: true,
  first_name: true,
  last_name: true,
  name: true,
  email: true,
  phone: true,
  workphone: true,
  gender: true,
  business: true,
  position: true,
  linkedin_user_profile: true,
  referral_code: true,
  referral_mstr_id: true,
  visitor_referrer_from: true,
  visitor_why_exhibit: true,
  visitor_is_webinars: true,
  visitor_is_workshops: true,
  visitor_is_e_magazine: true,
  visitor_is_newsletter: true,
  excluded_from_advertise: true,
  award_guest: true,
  allergy_from_nuts: true,
  allergey_from_shell_fish: true,
  allergey_from_dairy_products: true,
  vegetarian: true,
  vegan: true,
  dietary_requirement: true,
  any_other_food_allergy: true,
  batch_number: true,
  import_batch_number: true,
  source: true,
  location_name: true,
  country_name: true,
  franchise_name: true,
  status: true,
  joining_status: true,
  date: true,
} as const;

function toRow(v: any): VisitorRow {
  return {
    id: v.id,
    firstName: v.first_name ?? "",
    lastName: v.last_name ?? "",
    fullName: v.name ?? `${v.first_name ?? ""} ${v.last_name ?? ""}`.trim(),
    email: v.email,
    phone: v.phone,
    workphone: v.workphone,
    gender: v.gender,
    business: v.business,
    position: v.position,
    linkedinUserProfile: v.linkedin_user_profile,
    referralCode: v.referral_code,
    referralMstrId: v.referral_mstr_id,
    visitorReferrerFrom: v.visitor_referrer_from,
    visitorWhyExhibit: v.visitor_why_exhibit,
    visitorIsWebinars: Boolean(v.visitor_is_webinars),
    visitorIsWorkshops: Boolean(v.visitor_is_workshops),
    visitorIsEMagazine: Boolean(v.visitor_is_e_magazine),
    visitorIsNewsletter: Boolean(v.visitor_is_newsletter),
    excludedFromAdvertise: Boolean(v.excluded_from_advertise),
    awardGuest: Boolean(v.award_guest),
    allergyFromNuts: Boolean(v.allergy_from_nuts),
    allergeyFromShellFish: Boolean(v.allergey_from_shell_fish),
    allergeyFromDairyProducts: Boolean(v.allergey_from_dairy_products),
    vegetarian: Boolean(v.vegetarian),
    vegan: Boolean(v.vegan),
    dietaryRequirement: v.dietary_requirement,
    anyOtherFoodAllergy: v.any_other_food_allergy,
    batchNumber: v.batch_number,
    importBatchNumber: v.import_batch_number,
    source: v.source,
    locationName: v.location_name,
    countryName: v.country_name,
    franchiseName: v.franchise_name,
    status: v.status,
    joiningStatus: v.joining_status,
    createdOn: v.date,
  };
}

export interface GetVisitorsOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  typeFilter?: string;
}

export interface VisitorsPage {
  rows: VisitorRow[];
  total: number;
  page: number;
  pageSize: number;
}

/** Mirrors members/view_visitor.php's AJAX-paginated list — organiser-only, event-wide
 * (soft-deleted rows excluded), server-side LIMIT/OFFSET + a LIKE search across the same fields
 * the legacy table's search box covers (name, email, business). */
export async function getVisitors(context: EventMemberContext, options: GetVisitorsOptions = {}): Promise<VisitorsPage> {
  if (context.role !== "organiser") return { rows: [], total: 0, page: 1, pageSize: VISITORS_PAGE_SIZE };

  const page = Math.max(1, options.page ?? 1);
  const pageSize = options.pageSize ?? VISITORS_PAGE_SIZE;
  const keyword = options.search?.trim();
  const typeFilter = options.typeFilter?.trim();

  let typeCondition: any = {};
  if (typeFilter) {
    if (typeFilter === "with_mobile") {
      typeCondition = { NOT: { phone: "" }, phone: { not: null } };
    } else if (typeFilter === "without_mobile") {
      typeCondition = { OR: [{ phone: "" }, { phone: null }] };
    } else if (typeFilter === "with_workphone") {
      typeCondition = { NOT: { workphone: null } };
    } else if (typeFilter === "without_workphone") {
      typeCondition = { workphone: null };
    } else if (typeFilter === "pending_account") {
      typeCondition = { linked_profile_user_id: null };
    } else if (typeFilter === "registered_account") {
      typeCondition = { NOT: { linked_profile_user_id: null } };
    } else {
      typeCondition = { status: typeFilter };
    }
  }

  const where = {
    event_id: context.eventId,
    is_deleted: 0,
    ...typeCondition,
    ...(keyword
      ? {
          OR: [
            { first_name: { contains: keyword } },
            { last_name: { contains: keyword } },
            { name: { contains: keyword } },
            { email: { contains: keyword } },
            { business: { contains: keyword } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.find_events_rsvp.findMany({
      where,
      orderBy: { id: "desc" },
      select: SELECT_FIELDS,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.find_events_rsvp.count({ where }),
  ]);

  return { rows: rows.map(toRow), total, page, pageSize };
}

export interface VisitorStats {
  guest: number;
  invited: number;
  registered: number;
  checkedIn: number;
  excluded: number;
  excludedEmail: number;
  excludedMobile: number;
  withMobile: number;
  withoutMobile: number;
  withWorkphone: number;
  withoutWorkphone: number;
  notInterested: number;
  unableToAttend: number;
  callBack: number;
  noAnswer: number;
  invalidNumber: number;
  voiceMail: number;
  meetingScheduled: number;
  total: number;
  pendingAccounts: number;
  registeredAccounts: number;
  nonExhibitors: number;
}

/** Mirrors the ~19 fixed stat badges in view_visitor.php — each a separate COUNT(*) against
 * find_events_rsvp for this event. The dynamic "N Tick" (telecalling grade) and country badges
 * aren't included here — those key off separate master-data tables not yet modeled in this app. */
export async function getVisitorStats(context: EventMemberContext): Promise<VisitorStats> {
  const empty: VisitorStats = {
    guest: 0,
    invited: 0,
    registered: 0,
    checkedIn: 0,
    excluded: 0,
    excludedEmail: 0,
    excludedMobile: 0,
    withMobile: 0,
    withoutMobile: 0,
    withWorkphone: 0,
    withoutWorkphone: 0,
    notInterested: 0,
    unableToAttend: 0,
    callBack: 0,
    noAnswer: 0,
    invalidNumber: 0,
    voiceMail: 0,
    meetingScheduled: 0,
    total: 0,
    pendingAccounts: 0,
    registeredAccounts: 0,
    nonExhibitors: 0,
  };
  if (context.role !== "organiser") return empty;

  const base = { event_id: context.eventId, is_deleted: 0 };
  const byStatus = (status: string) => prisma.find_events_rsvp.count({ where: { ...base, status } });

  const [
    guest,
    invited,
    registered,
    checkedIn,
    excluded,
    excludedEmail,
    excludedMobile,
    withMobile,
    withoutMobile,
    withWorkphone,
    withoutWorkphone,
    notInterested,
    unableToAttend,
    callBack,
    noAnswer,
    invalidNumber,
    voiceMail,
    meetingScheduled,
    total,
    pendingAccounts,
    registeredAccounts,
    exhibitorUserIds,
    linkedUserIds,
  ] = await Promise.all([
    byStatus("Pending"),
    byStatus("Invited"),
    byStatus("Registered"),
    byStatus("Checked In"),
    byStatus("Excluded"),
    byStatus("Excluded_Email"),
    byStatus("Excluded_Mobile"),
    prisma.find_events_rsvp.count({ where: { ...base, NOT: { phone: "" } } }),
    prisma.find_events_rsvp.count({ where: { ...base, phone: "" } }),
    prisma.find_events_rsvp.count({ where: { ...base, workphone: { not: null } } }),
    prisma.find_events_rsvp.count({ where: { ...base, workphone: null } }),
    byStatus("Not Interested"),
    byStatus("Unable to attend"),
    byStatus("Call Back"),
    byStatus("No Answer"),
    byStatus("Invalid Number"),
    byStatus("Voice Mail"),
    // Legacy's "Meeting Scheduled" count skips the is_deleted filter (a minor legacy bug) — matched here.
    prisma.find_events_rsvp.count({ where: { event_id: context.eventId, status: "Meeting Scheduled" } }),
    prisma.find_events_rsvp.count({ where: base }),
    prisma.find_events_rsvp.count({ where: { ...base, linked_profile_user_id: null } }),
    prisma.find_events_rsvp.count({ where: { ...base, NOT: { linked_profile_user_id: null } } }),
    prisma.find_event_exhibitor.findMany({ where: { event_id: context.eventId }, select: { user_id: true } }),
    prisma.find_events_rsvp.findMany({ where: { ...base, NOT: { linked_profile_user_id: null } }, select: { linked_profile_user_id: true } }),
  ]);

  const exhibitorUserIdSet = new Set(exhibitorUserIds.map((e: any) => e.user_id).filter(Boolean));
  const nonExhibitors = linkedUserIds.filter((r: any) => !exhibitorUserIdSet.has(r.linked_profile_user_id)).length;

  return {
    guest,
    invited,
    registered,
    checkedIn,
    excluded,
    excludedEmail,
    excludedMobile,
    withMobile,
    withoutMobile,
    withWorkphone,
    withoutWorkphone,
    notInterested,
    unableToAttend,
    callBack,
    noAnswer,
    invalidNumber,
    voiceMail,
    meetingScheduled,
    total,
    pendingAccounts,
    registeredAccounts,
    nonExhibitors,
  };
}

/** Mirrors the bulk status-change buttons. The three "Excluded*" variants additionally copy each
 * affected row into find_event_excluded, matching the legacy EXCLUDE/EXCLUDE EMAIL/EXCLUDE MOBILE
 * buttons (which both flag the visitor row and record it in the exclusion list). */
export async function bulkSetVisitorStatus(context: EventMemberContext, ids: number[], status: string) {
  if (context.role !== "organiser" || ids.length === 0) return { count: 0 };

  const result = await prisma.find_events_rsvp.updateMany({
    where: { id: { in: ids }, event_id: context.eventId },
    data: { status },
  });

  if (status === "Excluded" || status === "Excluded_Email" || status === "Excluded_Mobile") {
    const rows = await prisma.find_events_rsvp.findMany({
      where: { id: { in: ids }, event_id: context.eventId },
      select: {
        event_id: true,
        batch_number: true,
        first_name: true,
        last_name: true,
        name: true,
        email: true,
        phone: true,
        workphone: true,
        business: true,
        position: true,
        joining_status: true,
        linked_profile_user_id: true,
        linked_profile_listing_id: true,
      },
    });
    for (const row of rows) {
      await prisma.find_event_excluded.create({
        data: {
          event_id: row.event_id,
          batch_number: row.batch_number || `EXC-${Date.now()}`,
          first_name: row.first_name,
          last_name: row.last_name,
          name: row.name,
          email: row.email || "",
          phone: row.phone,
          workphone: row.workphone,
          business: row.business,
          position: row.position,
          status,
          joining_status: row.joining_status,
          linked_profile_user_id: row.linked_profile_user_id,
          linked_profile_listing_id: row.linked_profile_listing_id,
          added_by_user_id: context.userId,
          created_by_user_id: context.userId,
        },
      });
    }
  }

  return result;
}

/** Mirrors the legacy "BULK DELETE" button (soft-delete, `is_deleted=1`). */
export async function bulkDeleteVisitors(context: EventMemberContext, ids: number[]) {
  if (context.role !== "organiser" || ids.length === 0) return { count: 0 };
  return prisma.find_events_rsvp.updateMany({
    where: { id: { in: ids }, event_id: context.eventId },
    data: { is_deleted: 1 },
  });
}

// A handful of legacy required-but-defaultless columns unrelated to this simplified CRUD
// (originally for table-seating and a specific email-campaign flow). Filled with inert
// values so `create` doesn't fail on NOT NULL columns this form doesn't expose.
const REQUIRED_LEGACY_DEFAULTS = {
  initial_table_position: 0,
  anchor_seat_holder: 0,
  last_position_holder: 0,
  the_booth_announcement: false,
  send_along_information: false,
  booth_teaser: false,
  while_at_the_show: false,
  keep_it_simple: false,
  request_a_follow_up_chat: false,
  offer_to_soothe_their_pain_points: false,
  how_can_i_help: false,
} as const;

export async function createVisitor(context: EventMemberContext, input: EventVisitorInput) {
  if (context.role !== "organiser") return null;
  return prisma.find_events_rsvp.create({
    data: {
      event_id: context.eventId,
      first_name: input.first_name,
      last_name: input.last_name,
      name: `${input.first_name} ${input.last_name}`.trim(),
      email: input.email,
      phone: input.phone || null,
      workphone: input.workphone || null,
      gender: input.gender || null,
      business: input.business || null,
      position: input.position || null,
      linkedin_user_profile: input.linkedin_user_profile || null,
      referral_code: input.referral_code || null,
      referral_mstr_id: input.referral_mstr_id || null,
      visitor_referrer_from: input.visitor_referrer_from || null,
      visitor_why_exhibit: input.visitor_why_exhibit || null,
      visitor_is_webinars: input.visitor_is_webinars ? 1 : 0,
      visitor_is_workshops: input.visitor_is_workshops ? 1 : 0,
      visitor_is_e_magazine: input.visitor_is_e_magazine ? 1 : 0,
      visitor_is_newsletter: input.visitor_is_newsletter ? 1 : 0,
      excluded_from_advertise: input.excluded_from_advertise ?? false,
      award_guest: input.award_guest ? 1 : 0,
      allergy_from_nuts: input.allergy_from_nuts ? 1 : 0,
      allergey_from_shell_fish: input.allergey_from_shell_fish ? 1 : 0,
      allergey_from_dairy_products: input.allergey_from_dairy_products ? 1 : 0,
      vegetarian: input.vegetarian ? 1 : 0,
      vegan: input.vegan ? 1 : 0,
      dietary_requirement: input.dietary_requirement || null,
      any_other_food_allergy: input.any_other_food_allergy || null,
      batch_number: input.batch_number || null,
      source: input.source || null,
      status: input.status,
      added_by_user_id: context.userId,
      created_by_user_id: context.userId,
      ...REQUIRED_LEGACY_DEFAULTS,
    },
    select: { id: true },
  });
}

export async function updateVisitor(context: EventMemberContext, id: number, input: EventVisitorInput) {
  if (context.role !== "organiser") return { count: 0 };
  return prisma.find_events_rsvp.updateMany({
    where: { id, event_id: context.eventId },
    data: {
      first_name: input.first_name,
      last_name: input.last_name,
      name: `${input.first_name} ${input.last_name}`.trim(),
      email: input.email,
      phone: input.phone || null,
      workphone: input.workphone || null,
      gender: input.gender || null,
      business: input.business || null,
      position: input.position || null,
      linkedin_user_profile: input.linkedin_user_profile || null,
      referral_code: input.referral_code || null,
      referral_mstr_id: input.referral_mstr_id || null,
      visitor_referrer_from: input.visitor_referrer_from || null,
      visitor_why_exhibit: input.visitor_why_exhibit || null,
      visitor_is_webinars: input.visitor_is_webinars ? 1 : 0,
      visitor_is_workshops: input.visitor_is_workshops ? 1 : 0,
      visitor_is_e_magazine: input.visitor_is_e_magazine ? 1 : 0,
      visitor_is_newsletter: input.visitor_is_newsletter ? 1 : 0,
      excluded_from_advertise: input.excluded_from_advertise ?? false,
      award_guest: input.award_guest ? 1 : 0,
      allergy_from_nuts: input.allergy_from_nuts ? 1 : 0,
      allergey_from_shell_fish: input.allergey_from_shell_fish ? 1 : 0,
      allergey_from_dairy_products: input.allergey_from_dairy_products ? 1 : 0,
      vegetarian: input.vegetarian ? 1 : 0,
      vegan: input.vegan ? 1 : 0,
      dietary_requirement: input.dietary_requirement || null,
      any_other_food_allergy: input.any_other_food_allergy || null,
      batch_number: input.batch_number || null,
      source: input.source || null,
      status: input.status,
    },
  });
}

/** Mirrors the legacy soft-delete (`is_deleted=1`) rather than a hard row delete. */
export async function deleteVisitor(context: EventMemberContext, id: number) {
  if (context.role !== "organiser") return { count: 0 };
  return prisma.find_events_rsvp.updateMany({
    where: { id, event_id: context.eventId },
    data: { is_deleted: 1 },
  });
}

/* ===========================================================================
   Email templates, bulk mail and CSV import — the "Select an Email Template"
   and "Select an Action" toolbar from members/view_visitor_list.tpl.
   =========================================================================== */

export interface VisitorEmailTemplateOption {
  id: string;
  label: string;
}

/**
 * Options for the "Select an Email Template" dropdown.
 *
 * The legacy page builds this from `Email_General->getEmailTemplateOptionsByProcessName()` —
 * find_email_templates narrowed to one process. Visitor-facing templates are preferred; if that
 * matches nothing (which is what happens where process_name was never populated) every enabled
 * template is offered instead, because an empty dropdown reads as broken.
 */
export async function getVisitorEmailTemplates(): Promise<VisitorEmailTemplateOption[]> {
  const select = { id: true, type: true, action_btn_name: true } as const;
  const orderBy = [{ priority_order: "asc" as const }, { id: "asc" as const }];

  const scoped = await prisma.find_email_templates.findMany({
    where: { disable: 0, process_name: { contains: "isitor" } },
    orderBy,
    select,
  });

  const rows = scoped.length > 0
    ? scoped
    : await prisma.find_email_templates.findMany({ where: { disable: 0 }, orderBy, select });

  return rows.map((r: any) => ({
    id: r.id,
    // action_btn_name is the label the CP sets; `type` is the internal key and always present.
    label: (r.action_btn_name || r.type || r.id) as string,
  }));
}

export interface VisitorImportResult {
  created: number;
  skipped: number;
  skippedEmails: string[];
  invalid: { row: number; name: string; reason: string }[];
}

/**
 * Bulk CSV import — the Next port of view_visitor.php's `importform` modal, which uploaded a
 * file and inserted rows into find_events_rsvp.
 *
 * Duplicates match on EMAIL, case-insensitively, scoped to this event: it is what identifies a
 * visitor and find_events_rsvp has no other stable key. Existing visitors are SKIPPED, never
 * updated — an import must not overwrite a status someone set while working a call list — so
 * re-importing the same file is a no-op.
 *
 * Rows are created through createVisitor(), the same function the Add Visitor form calls, so an
 * imported visitor carries the identical REQUIRED_LEGACY_DEFAULTS and added_by/created_by
 * stamping as one added by hand. A bulk insert would skip those and produce rows the rest of the
 * app treats differently.
 */
export async function importVisitors(
  context: EventMemberContext,
  rows: Record<string, string>[]
): Promise<VisitorImportResult> {
  const result: VisitorImportResult = { created: 0, skipped: 0, skippedEmails: [], invalid: [] };
  if (context.role !== "organiser") return result;

  const existing = await prisma.find_events_rsvp.findMany({
    where: { event_id: context.eventId },
    select: { email: true },
  });
  const haveEmails = new Set(
    existing
      .map((r: { email: string | null }) => (r.email ?? "").trim().toLowerCase())
      .filter((e: string) => e !== ""),
  );

  const truthy = (v: string | undefined) =>
    ["yes", "true", "y", "1"].includes((v ?? "").trim().toLowerCase());

  for (let index = 0; index < rows.length; index++) {
    const raw = rows[index] ?? {};

    // A single "Name" column is split on the first space when First/Last are absent.
    let firstName = (raw.first_name ?? "").trim();
    let lastName = (raw.last_name ?? "").trim();
    if (!firstName && !lastName && raw.name) {
      const whole = raw.name.trim();
      const cut = whole.indexOf(" ");
      firstName = cut === -1 ? whole : whole.slice(0, cut);
      lastName = cut === -1 ? "" : whole.slice(cut + 1).trim();
    }

    // Status is matched case-insensitively so a spreadsheet saying "registered" is accepted;
    // anything unrecognised falls back to Pending rather than failing the row.
    const wanted = (raw.status ?? "").trim().toLowerCase();
    const status =
      (VISITOR_STATUSES as readonly string[]).find((s) => s.toLowerCase() === wanted) ?? "Pending";

    const candidate = {
      first_name: firstName,
      last_name: lastName,
      email: (raw.email ?? "").trim(),
      phone: (raw.phone ?? "").trim(),
      workphone: (raw.workphone ?? "").trim(),
      gender: (raw.gender ?? "").trim(),
      business: (raw.business ?? "").trim(),
      position: (raw.position ?? "").trim(),
      linkedin_user_profile: (raw.linkedin_user_profile ?? "").trim(),
      referral_code: (raw.referral_code ?? "").trim(),
      batch_number: (raw.batch_number ?? "").trim(),
      source: (raw.source ?? "").trim() || "csv_import",
      visitor_is_webinars: truthy(raw.visitor_is_webinars),
      visitor_is_workshops: truthy(raw.visitor_is_workshops),
      visitor_is_e_magazine: truthy(raw.visitor_is_e_magazine),
      visitor_is_newsletter: truthy(raw.visitor_is_newsletter),
      status,
    };

    const parsed = eventVisitorSchema.safeParse(candidate);
    if (!parsed.success) {
      const fields = parsed.error.flatten().fieldErrors;
      const reason =
        Object.values(fields).find((m) => Array.isArray(m) && m.length > 0)?.[0] ?? "Invalid row";
      result.invalid.push({
        row: index + 1,
        name: `${firstName} ${lastName}`.trim() || candidate.email || "(blank)",
        reason,
      });
      continue;
    }

    const key = parsed.data.email.trim().toLowerCase();
    // Catches a file that repeats someone, not just a clash with the database.
    if (haveEmails.has(key)) {
      result.skipped += 1;
      result.skippedEmails.push(parsed.data.email);
      continue;
    }
    haveEmails.add(key);

    try {
      await createVisitor(context, parsed.data);
      result.created += 1;
    } catch (err) {
      console.error("[importVisitors] row failed:", err);
      result.invalid.push({
        row: index + 1,
        name: parsed.data.email,
        reason: "Could not be saved — see server log",
      });
    }
  }

  return result;
}
