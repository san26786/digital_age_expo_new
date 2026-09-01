import { prisma } from "@/lib/prisma";
import type { EventMemberContext } from "@/lib/services/eventAccess";
import {
  eventExhibitorAdminSchema,
  exhibitorOrderSubtotal,
  EXHIBITOR_STATUSES,
  type EventExhibitorAdminInput,
} from "@/lib/validations/eventExhibitorAdmin";
import { assetUrl } from "@/lib/assets";

export interface ExhibitorAdminRow {
  id: number;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string | null;
  workPhone: string | null;
  business: string | null;
  position: string | null;
  website: string | null;
  linkedinUserProfile: string | null;
  facebook: string | null;
  twitter: string | null;
  instagram: string | null;
  whatsappNo: string | null;
  zoom: string | null;
  calendly: string | null;
  youtube: string | null;
  aboutUs: string | null;
  standNumber: string | null;
  standSize: string | null;
  standPrice: number | null;
  discount: number | null;
  charitableAmount: number | null;
  exchangeAmount: number | null;
  exchangeServices: boolean;
  featured: boolean;
  memberCompanyProfile: boolean;
  excludedFromAdvertise: boolean;
  enableVideoCalling: boolean;
  videoCallingSoftwareProvider: string | null;
  videoCallUrl: string | null;
  specialInstructions: string | null;
  referralCode: string | null;
  referralMstrId: string | null;
  referrerFrom: string | null;
  keynoteSpeechTopic: string | null;
  isWebinars: boolean;
  isWorkshops: boolean;
  isBusinessPresentation: boolean;
  isEMagazine: boolean;
  isNewsletter: boolean;
  visitorNotificationMail: boolean;
  status: string;
  joiningStatus: string | null;
  orderId: number | null;
  telecallingGradeId: string | null;
  batchNumber: string | null;
  // --- Trade stand allocation -------------------------------------------------------------
  listingId: number | null;
  exhibitionZoneId: number | null;
  spotId: number | null;
  exStandLayoutId: number | null;
  standColorId: number | null;
  includeColumnListing: boolean;
  includeLogoListing: boolean;
  /** Derived, never stored — see exhibitorOrderSubtotal(). */
  orderSubtotal: number;
  // --- Images (public URLs, or null when the exhibitor has none) ---------------------------
  profilePic: string | null;
  logo: string | null;
  standLogo: string | null;
}

export interface ExhibitorStats {
  total: number;
  registered: number;
  interested: number;
  reserved: number;
  pending: number;
  notInterested: number;
  joinedAccounts: number;
  pendingAccounts: number;
  noStandNumber: number;
  noStandPrice: number;
  noStandSize: number;
  noOrder: number;
  uncontacted: number;
}

const SELECT_FIELDS = {
  id: true,
  first_name: true,
  last_name: true,
  name: true,
  email: true,
  phone: true,
  work_phone: true,
  business: true,
  position: true,
  website: true,
  linkedin_user_profile: true,
  facebook: true,
  twitter: true,
  instagram: true,
  whatsapp_no: true,
  zoom: true,
  calendly: true,
  youtube: true,
  about_us: true,
  stand_number: true,
  stand_size: true,
  stand_price: true,
  discount: true,
  charitable_amount: true,
  exchange_amount: true,
  exchange_services: true,
  featured: true,
  member_company_profile: true,
  excluded_from_advertise: true,
  enable_video_calling: true,
  video_calling_software_provider: true,
  video_call_url: true,
  special_instructions: true,
  referral_code: true,
  referral_mstr_id: true,
  referrer_from: true,
  keynote_speech_topic: true,
  is_webinars: true,
  is_workshops: true,
  is_business_presentation: true,
  is_e_magazine: true,
  is_newsletter: true,
  visitor_notification_mail: true,
  status: true,
  joining_status: true,
  order_id: true,
  telecalling_grade_id: true,
  batch_number: true,
  user_id: true,
  listing_id: true,
  exhibition_zone_id: true,
  spot_id: true,
  ex_stand_layout_id: true,
  stand_color_id: true,
  include_column_listing: true,
  include_logo_listing: true,
  profile_pic: true,
  logo: true,
  stand_logo: true,
} as const;

/**
 * find_event_exhibitor stores image columns two different ways and both have to render:
 *
 *  - Legacy rows hold a BARE FILENAME that the PHP app resolved against EXHIBITOR_PROFILE_PATH /
 *    EXHIBITOR_LOGO_PATH / EXHIBITOR_STAND_LOGO_PATH. Those go through assetUrl(), which maps the
 *    legacy path onto the mirrored copy under public/images/external (see src/lib/asset-map.ts) so
 *    the page does not depend on the old host being up.
 *  - Rows whose image was uploaded through THIS app hold an app-relative public URL already
 *    ("/files/exhibitor/..."), written by /api/members/exhibitors-admin/upload — the same
 *    convention news_feed uses. Those must be passed through untouched; running them through the
 *    legacy mapper would not find them and would blank the image out.
 *
 * A leading "/" or a scheme is what separates the two.
 */
function exhibitorImageUrl(stored: string | null | undefined, legacyFolder: string): string | null {
  const value = (stored ?? "").trim();
  if (!value) return null;
  if (value.startsWith("/") || /^https?:\/\//i.test(value)) return value;
  return assetUrl(`/files/${legacyFolder}/${value}`) ?? null;
}

function toRow(e: any): ExhibitorAdminRow {
  return {
    id: e.id,
    firstName: e.first_name ?? "",
    lastName: e.last_name ?? "",
    fullName: e.name ?? `${e.first_name ?? ""} ${e.last_name ?? ""}`.trim(),
    email: e.email ?? "",
    phone: e.phone,
    workPhone: e.work_phone,
    business: e.business,
    position: e.position,
    website: e.website,
    linkedinUserProfile: e.linkedin_user_profile,
    facebook: e.facebook,
    twitter: e.twitter,
    instagram: e.instagram,
    whatsappNo: e.whatsapp_no,
    zoom: e.zoom,
    calendly: e.calendly,
    youtube: e.youtube,
    aboutUs: e.about_us,
    standNumber: e.stand_number,
    standSize: e.stand_size,
    standPrice: e.stand_price,
    discount: e.discount,
    charitableAmount: e.charitable_amount,
    exchangeAmount: e.exchange_amount,
    exchangeServices: Boolean(e.exchange_services),
    featured: Boolean(e.featured),
    memberCompanyProfile: Boolean(e.member_company_profile),
    excludedFromAdvertise: Boolean(e.excluded_from_advertise),
    enableVideoCalling: Boolean(e.enable_video_calling),
    videoCallingSoftwareProvider: e.video_calling_software_provider,
    videoCallUrl: e.video_call_url,
    specialInstructions: e.special_instructions,
    referralCode: e.referral_code,
    referralMstrId: e.referral_mstr_id,
    referrerFrom: e.referrer_from,
    keynoteSpeechTopic: e.keynote_speech_topic,
    isWebinars: Boolean(e.is_webinars),
    isWorkshops: Boolean(e.is_workshops),
    isBusinessPresentation: Boolean(e.is_business_presentation),
    isEMagazine: Boolean(e.is_e_magazine),
    isNewsletter: Boolean(e.is_newsletter),
    visitorNotificationMail: Boolean(e.visitor_notification_mail),
    status: e.status ?? "pending",
    joiningStatus: e.joining_status,
    orderId: e.order_id,
    telecallingGradeId: e.telecalling_grade_id,
    batchNumber: e.batch_number,
    listingId: e.listing_id ?? null,
    exhibitionZoneId: e.exhibition_zone_id ?? null,
    spotId: e.spot_id ?? null,
    exStandLayoutId: e.ex_stand_layout_id ?? null,
    standColorId: e.stand_color_id ?? null,
    includeColumnListing: Boolean(e.include_column_listing),
    includeLogoListing: Boolean(e.include_logo_listing),
    orderSubtotal: exhibitorOrderSubtotal({
      stand_price: e.stand_price,
      discount: e.discount,
      exchange_amount: e.exchange_amount,
      charitable_amount: e.charitable_amount,
    }),
    profilePic: exhibitorImageUrl(e.profile_pic, "exhibitor_profile_images"),
    logo: exhibitorImageUrl(e.logo, "exhibitor_profile_images"),
    standLogo: exhibitorImageUrl(e.stand_logo, "exhibitor_stand_logo"),
  };
}

export async function getExhibitorsAdmin(context: EventMemberContext): Promise<ExhibitorAdminRow[]> {
  if (context.role !== "organiser") return [];
  const rows = await prisma.find_event_exhibitor.findMany({
    where: { event_id: context.eventId },
    orderBy: { id: "desc" },
    select: SELECT_FIELDS,
  });
  return rows.map(toRow);
}

export async function getExhibitorsAdminStats(context: EventMemberContext): Promise<ExhibitorStats> {
  if (context.role !== "organiser") {
    return {
      total: 0,
      registered: 0,
      interested: 0,
      reserved: 0,
      pending: 0,
      notInterested: 0,
      joinedAccounts: 0,
      pendingAccounts: 0,
      noStandNumber: 0,
      noStandPrice: 0,
      noStandSize: 0,
      noOrder: 0,
      uncontacted: 0,
    };
  }

  const rows = await prisma.find_event_exhibitor.findMany({
    where: { event_id: context.eventId, status: { not: "excluded" } },
    select: {
      status: true,
      joining_status: true,
      stand_number: true,
      stand_price: true,
      stand_size: true,
      order_id: true,
      telecalling_grade_id: true,
      user_id: true,
    },
  });

  let registered = 0;
  let interested = 0;
  let reserved = 0;
  let pending = 0;
  let notInterested = 0;
  let joinedAccounts = 0;
  let pendingAccounts = 0;
  let noStandNumber = 0;
  let noStandPrice = 0;
  let noStandSize = 0;
  let noOrder = 0;
  let uncontacted = 0;

  for (const r of rows) {
    if (r.status === "active") registered++;
    else if (r.status === "Interested") interested++;
    else if (r.status === "Reserved") reserved++;
    else if (r.status === "Not Interested") notInterested++;
    else if (r.status === "pending") pending++;

    if (r.joining_status === "Joined") joinedAccounts++;
    else if (r.joining_status === "Pending") pendingAccounts++;

    if (r.status === "active") {
      if (!r.stand_number) noStandNumber++;
      if (r.stand_price === null || r.stand_price === undefined) noStandPrice++;
      if (!r.stand_size) noStandSize++;
      if (!r.order_id) noOrder++;
    }

    if (!r.telecalling_grade_id && r.status !== "active") uncontacted++;
  }

  return {
    total: rows.length,
    registered,
    interested,
    reserved,
    pending,
    notInterested,
    joinedAccounts,
    pendingAccounts,
    noStandNumber,
    noStandPrice,
    noStandSize,
    noOrder,
    uncontacted,
  };
}

function generateBatchNumber(eventId: number): string {
  return `EX-${eventId}-${Date.now().toString(36).toUpperCase()}`;
}

function toNumberOrNull(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Stand Number is a READ-ONLY field on the legacy form — it is filled in by the Virtual Booth
 * Number dropdown, whose options are the free find_event_lobby_spots rows in the chosen Exhibition
 * Zone (view_exhibitor.php:664-665, and the AJAX that populates them). Deriving it here from the
 * chosen spot rather than trusting whatever the browser posted keeps the two columns from drifting
 * apart, which is what produces an exhibitor whose stand number points at somebody else's booth.
 *
 * When no spot is chosen the typed/imported stand_number is kept as-is: CSV import and the
 * physical-only shows that never set up a virtual lobby both rely on that.
 */
async function resolveStandNumber(
  context: EventMemberContext,
  input: EventExhibitorAdminInput
): Promise<string | null> {
  const spotId = toNumberOrNull(input.spot_id);
  if (!spotId) return input.stand_number || null;

  const spot = await prisma.find_event_lobby_spots.findFirst({
    where: { id: spotId, event_id: context.eventId },
    select: { stand_no: true },
  });
  if (spot?.stand_no === null || spot?.stand_no === undefined) return input.stand_number || null;
  return String(spot.stand_no);
}

/**
 * Mirrors the spot bookkeeping in view_exhibitor.php:951-953 — the lobby renders a booth's caption
 * from find_event_lobby_spots.title, so allocating a stand has to stamp "Visit <business>" onto the
 * chosen spot, and RELEASING one has to blank the caption on the spot the exhibitor previously
 * held. Skipping the second half is what leaves a ghost booth in the lobby advertising a business
 * that has since moved to a different zone.
 */
async function syncExhibitorSpot(
  context: EventMemberContext,
  input: EventExhibitorAdminInput,
  previousSpotId: number | null
) {
  const spotId = toNumberOrNull(input.spot_id);

  if (previousSpotId && previousSpotId !== spotId) {
    await prisma.find_event_lobby_spots.updateMany({
      where: { id: previousSpotId, event_id: context.eventId },
      data: { title: "" },
    });
  }

  if (spotId) {
    await prisma.find_event_lobby_spots.updateMany({
      where: { id: spotId, event_id: context.eventId },
      // VarChar(255) — a long business name would otherwise fail the insert outright.
      data: { title: `Visit ${input.business}`.slice(0, 255) },
    });
  }
}

export async function createExhibitorAdmin(context: EventMemberContext, input: EventExhibitorAdminInput) {
  if (context.role !== "organiser") return null;
  const standNumber = await resolveStandNumber(context, input);
  const created = await prisma.find_event_exhibitor.create({
    data: {
      event_id: context.eventId,
      batch_number: generateBatchNumber(context.eventId),
      first_name: input.first_name,
      last_name: input.last_name,
      name: `${input.first_name} ${input.last_name}`.trim(),
      email: input.email,
      phone: input.phone || null,
      work_phone: input.work_phone || null,
      business: input.business,
      position: input.position || null,
      website: input.website || null,
      linkedin_user_profile: input.linkedin_user_profile || null,
      facebook: input.facebook || null,
      twitter: input.twitter || null,
      instagram: input.instagram || null,
      whatsapp_no: input.whatsapp_no || null,
      zoom: input.zoom || null,
      calendly: input.calendly || null,
      youtube: input.youtube || null,
      about_us: input.about_us || null,
      stand_number: standNumber,
      stand_size: input.stand_size || null,
      stand_price: toNumberOrNull(input.stand_price),
      discount: toNumberOrNull(input.discount) ?? 0,
      charitable_amount: toNumberOrNull(input.charitable_amount) ?? 0,
      exchange_amount: toNumberOrNull(input.exchange_amount) ?? 0,
      exchange_services: input.exchange_services ? 1 : 0,
      featured: input.featured ? 1 : 0,
      member_company_profile: input.member_company_profile ? 1 : 0,
      excluded_from_advertise: input.excluded_from_advertise ?? false,
      enable_video_calling: input.enable_video_calling ?? false,
      video_calling_software_provider: input.video_calling_software_provider || null,
      video_call_url: input.video_call_url || null,
      special_instructions: input.special_instructions || null,
      referral_code: input.referral_code || null,
      referral_mstr_id: input.referral_mstr_id || null,
      referrer_from: input.referrer_from || null,
      keynote_speech_topic: input.keynote_speech_topic || null,
      is_webinars: input.is_webinars ? 1 : 0,
      is_workshops: input.is_workshops ? 1 : 0,
      is_business_presentation: input.is_business_presentation ? 1 : 0,
      is_e_magazine: input.is_e_magazine ? 1 : 0,
      is_newsletter: input.is_newsletter ? 1 : 0,
      visitor_notification_mail: input.visitor_notification_mail ? 1 : 0,
      listing_id: toNumberOrNull(input.listing_id) ?? 0,
      exhibition_zone_id: toNumberOrNull(input.exhibition_zone_id),
      spot_id: toNumberOrNull(input.spot_id),
      ex_stand_layout_id: toNumberOrNull(input.ex_stand_layout_id),
      stand_color_id: toNumberOrNull(input.stand_color_id),
      include_column_listing: input.include_column_listing ?? false,
      include_logo_listing: input.include_logo_listing ?? false,
      order_id: toNumberOrNull(input.available_stand_size),
      status: input.status as any,
    },
    select: { id: true },
  });

  await syncExhibitorSpot(context, input, null);
  return created;
}

export async function updateExhibitorAdmin(context: EventMemberContext, id: number, input: EventExhibitorAdminInput) {
  if (context.role !== "organiser") return { count: 0 };

  // Read BEFORE the write: once the row is updated its old spot_id is gone, and without it the
  // previously-held booth keeps its "Visit <business>" caption forever.
  const previous = await prisma.find_event_exhibitor.findFirst({
    where: { id, event_id: context.eventId },
    select: { spot_id: true },
  });

  const standNumber = await resolveStandNumber(context, input);
  const result = await prisma.find_event_exhibitor.updateMany({
    where: { id, event_id: context.eventId },
    data: {
      first_name: input.first_name,
      last_name: input.last_name,
      name: `${input.first_name} ${input.last_name}`.trim(),
      email: input.email,
      phone: input.phone || null,
      work_phone: input.work_phone || null,
      business: input.business,
      position: input.position || null,
      website: input.website || null,
      linkedin_user_profile: input.linkedin_user_profile || null,
      facebook: input.facebook || null,
      twitter: input.twitter || null,
      instagram: input.instagram || null,
      whatsapp_no: input.whatsapp_no || null,
      zoom: input.zoom || null,
      calendly: input.calendly || null,
      youtube: input.youtube || null,
      about_us: input.about_us || null,
      stand_number: standNumber,
      stand_size: input.stand_size || null,
      stand_price: toNumberOrNull(input.stand_price),
      discount: toNumberOrNull(input.discount) ?? 0,
      charitable_amount: toNumberOrNull(input.charitable_amount) ?? 0,
      exchange_amount: toNumberOrNull(input.exchange_amount) ?? 0,
      exchange_services: input.exchange_services ? 1 : 0,
      featured: input.featured ? 1 : 0,
      member_company_profile: input.member_company_profile ? 1 : 0,
      excluded_from_advertise: input.excluded_from_advertise ?? false,
      enable_video_calling: input.enable_video_calling ?? false,
      video_calling_software_provider: input.video_calling_software_provider || null,
      video_call_url: input.video_call_url || null,
      special_instructions: input.special_instructions || null,
      referral_code: input.referral_code || null,
      referral_mstr_id: input.referral_mstr_id || null,
      referrer_from: input.referrer_from || null,
      keynote_speech_topic: input.keynote_speech_topic || null,
      is_webinars: input.is_webinars ? 1 : 0,
      is_workshops: input.is_workshops ? 1 : 0,
      is_business_presentation: input.is_business_presentation ? 1 : 0,
      is_e_magazine: input.is_e_magazine ? 1 : 0,
      is_newsletter: input.is_newsletter ? 1 : 0,
      visitor_notification_mail: input.visitor_notification_mail ? 1 : 0,
      listing_id: toNumberOrNull(input.listing_id) ?? 0,
      exhibition_zone_id: toNumberOrNull(input.exhibition_zone_id),
      spot_id: toNumberOrNull(input.spot_id),
      ex_stand_layout_id: toNumberOrNull(input.ex_stand_layout_id),
      stand_color_id: toNumberOrNull(input.stand_color_id),
      include_column_listing: input.include_column_listing ?? false,
      include_logo_listing: input.include_logo_listing ?? false,
      order_id: toNumberOrNull(input.available_stand_size),
      status: input.status as any,
    },
  });

  if (result.count > 0) await syncExhibitorSpot(context, input, previous?.spot_id ?? null);
  return result;
}

export async function bulkUpdateExhibitorAdminStatus(context: EventMemberContext, ids: number[], status: string) {
  if (context.role !== "organiser") return { count: 0 };
  return prisma.find_event_exhibitor.updateMany({
    where: { id: { in: ids }, event_id: context.eventId },
    data: { status: status as any },
  });
}

export async function bulkDeleteExhibitorsAdmin(context: EventMemberContext, ids: number[]) {
  if (context.role !== "organiser") return { count: 0 };
  return prisma.find_event_exhibitor.deleteMany({
    where: { id: { in: ids }, event_id: context.eventId },
  });
}

export async function deleteExhibitorAdmin(context: EventMemberContext, id: number) {
  if (context.role !== "organiser") return { count: 0 };
  return prisma.find_event_exhibitor.deleteMany({ where: { id, event_id: context.eventId } });
}

/* ===========================================================================
   Email templates, bulk mail and CSV import — the "Select an Email Template" /
   "Select an Action" toolbar ported from members/view_visitor.php.
   =========================================================================== */

export interface ExhibitorEmailTemplateOption {
  id: string;
  label: string;
  processName: string | null;
}

/**
 * Options for the "Select an Email Template" dropdown.
 *
 * The legacy page builds this from `Email_General->getEmailTemplateOptionsByProcessName()`,
 * i.e. find_email_templates filtered to one process. Exhibitor-facing templates are matched
 * first; if that returns nothing — which is what happens on a database where process_name was
 * never populated — every enabled template is offered rather than an empty dropdown, since an
 * empty control looks broken and gives the organiser nothing to do.
 */
export async function getExhibitorEmailTemplates(): Promise<ExhibitorEmailTemplateOption[]> {
  const select = { id: true, type: true, action_btn_name: true, process_name: true } as const;
  const orderBy = [{ priority_order: "asc" as const }, { id: "asc" as const }];

  const scoped = await prisma.find_email_templates.findMany({
    where: {
      disable: 0,
      OR: [
        { process_name: { contains: "xhibitor" } },
        { process_name: { contains: "Exhibitor" } },
      ],
    },
    orderBy,
    select,
  });

  const rows = scoped.length > 0
    ? scoped
    : await prisma.find_email_templates.findMany({ where: { disable: 0 }, orderBy, select });

  return rows.map((r: any) => ({
    id: r.id,
    // action_btn_name is the human label the CP sets; `type` is the internal key and the only
    // thing guaranteed to be present.
    label: (r.action_btn_name || r.type || r.id) as string,
    processName: r.process_name ?? null,
  }));
}

export interface ExhibitorImportResult {
  created: number;
  skipped: number;
  skippedEmails: string[];
  invalid: { row: number; name: string; reason: string }[];
}

/**
 * Bulk CSV import — counterpart to Export CSV.
 *
 * Duplicates match on EMAIL, case-insensitively, scoped to this event: it is what identifies an
 * exhibitor contact and find_event_exhibitor has no other stable key. Existing exhibitors are
 * SKIPPED, never updated — an import must not silently overwrite a stand number, price or status
 * someone has negotiated — so re-importing the same file is a no-op.
 *
 * Rows are validated with the same eventExhibitorAdminSchema the Add Exhibitor form uses, and
 * each row is created through createExhibitorAdmin() rather than a bulk insert, so imported
 * exhibitors get exactly the same derived fields (batch number, linked listing, default stand
 * layout) as one added by hand. That is slower than createMany and deliberately so: skipping it
 * would produce exhibitors that look right in the table but are wired up wrong in the lobby.
 */
export async function importExhibitors(
  context: EventMemberContext,
  rows: Record<string, string>[]
): Promise<ExhibitorImportResult> {
  const result: ExhibitorImportResult = { created: 0, skipped: 0, skippedEmails: [], invalid: [] };
  if (context.role !== "organiser") return result;

  const existing = await prisma.find_event_exhibitor.findMany({
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

    const statusRaw = (raw.status ?? "").trim();
    const status = (EXHIBITOR_STATUSES as readonly string[]).includes(statusRaw)
      ? statusRaw
      : "pending";

    const candidate = {
      first_name: firstName,
      last_name: lastName,
      email: (raw.email ?? "").trim(),
      phone: (raw.phone ?? "").trim(),
      work_phone: (raw.work_phone ?? "").trim(),
      business: (raw.business ?? "").trim(),
      position: (raw.position ?? "").trim(),
      website: (raw.website ?? "").trim(),
      linkedin_user_profile: (raw.linkedin_user_profile ?? "").trim(),
      stand_number: (raw.stand_number ?? "").trim(),
      stand_size: (raw.stand_size ?? "").trim(),
      stand_price: (raw.stand_price ?? "").trim() || null,
      about_us: (raw.about_us ?? "").trim(),
      featured: truthy(raw.featured),
      status,
    };

    const parsed = eventExhibitorAdminSchema.safeParse(candidate);
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
      await createExhibitorAdmin(context, parsed.data);
      result.created += 1;
    } catch (err) {
      console.error("[importExhibitors] row failed:", err);
      result.invalid.push({
        row: index + 1,
        name: parsed.data.email,
        reason: "Could not be saved — see server log",
      });
    }
  }

  return result;
}

/* ===========================================================================
   Reference data for the Add / Edit Trade Stand form.

   Everything below is the read side of members/view_exhibitor.php's form builder
   (view_exhibitor.php:520-671). The legacy page ran these queries inline while rendering the
   form; here they are one endpoint the modal fetches once on open, plus two small cascading
   endpoints (zone -> free booths, stand layout -> colours) that the legacy page fetched over
   AJAX for exactly the same reason: the options depend on another field's current value.
   =========================================================================== */

export interface ExhibitorOption {
  id: number;
  label: string;
}

export interface ExhibitorFormOptions {
  /** "Exhibitor" — the organiser's own find_listings businesses (view_exhibitor.php:520-526). */
  businesses: ExhibitorOption[];
  /** "Allocated Stand Size" — this event's exhibitor tickets (view_exhibitor.php:635). */
  standSizes: ExhibitorOption[];
  /** "Exhibition Zone" (view_exhibitor.php:622-623). */
  exhibitionZones: ExhibitorOption[];
  /** "Exhibitor Stand Layout" (view_exhibitor.php:639). */
  standLayouts: ExhibitorOption[];
  /** "Available Stand Size" — unused trade-stand orders this user has paid for (:546-554). */
  availableStandSizes: ExhibitorOption[];
}

const EMPTY_FORM_OPTIONS: ExhibitorFormOptions = {
  businesses: [],
  standSizes: [],
  exhibitionZones: [],
  standLayouts: [],
  availableStandSizes: [],
};

export async function getExhibitorFormOptions(
  context: EventMemberContext,
  /**
   * When editing, the order already attached to this exhibitor must stay selectable even though
   * it is marked used — otherwise opening the form and saving silently drops the allocation.
   * Legacy does the same with `( used=0 or id="'.$order_id.'" )`.
   */
  currentOrderId?: number | null
): Promise<ExhibitorFormOptions> {
  if (context.role !== "organiser") return EMPTY_FORM_OPTIONS;

  const [listings, tickets, layout, standLayouts, groupProducts] = await Promise.all([
    prisma.find_listings.findMany({
      where: { user_id: context.userId },
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
    prisma.find_event_ticket.findMany({
      where: { event_id: context.eventId, for_exhibitor: 1 },
      orderBy: [{ sequence: "asc" }, { id: "asc" }],
      select: { id: true, name: true, amount: true },
    }),
    prisma.find_event_lobby_layout_manager.findFirst({
      where: { event_id: context.eventId },
      orderBy: { id: "asc" },
      select: { id: true },
    }),
    prisma.find_event_lobby_child_layout_manager.findMany({
      where: { event_id: context.eventId, layout_type: "exhibition_stand" },
      orderBy: [{ sequence: "asc" }, { id: "asc" }],
      select: { id: true, title: true },
    }),
    // type="membership_options" orders only count when the product sits in group 19 — the legacy
    // query expresses this as a subselect; resolving the ids first keeps it to plain Prisma.
    prisma.find_products.findMany({ where: { group_id: 19 }, select: { id: true } }),
  ]);

  const exhibitionZones = layout
    ? await prisma.find_event_lobby_child_layout_manager.findMany({
        where: {
          event_id: context.eventId,
          layout_type: "exhibition",
          event_layout_id: layout.id,
          status: "enabled",
        },
        orderBy: [{ sequence: "asc" }, { id: "asc" }],
        select: { id: true, title: true },
      })
    : [];

  const productIds = groupProducts.map((p: { id: number }) => p.id);
  const orders = await prisma.find_orders.findMany({
    where: {
      user_id: context.userId,
      OR: [
        { used: 0 },
        ...(currentOrderId ? [{ id: currentOrderId }] : []),
      ],
      AND: [
        {
          OR: [
            { type: "trade_show" },
            ...(productIds.length > 0
              ? [{ type: "membership_options", type_id: { in: productIds } }]
              : []),
          ],
        },
      ],
    },
    orderBy: { id: "desc" },
    select: { id: true, order_id: true, trade_stand_id: true, trade_stand_size: true },
  });

  return {
    businesses: listings.map((l: { id: number; title: string }) => ({
      id: l.id,
      label: l.title || `Listing #${l.id}`,
    })),
    standSizes: tickets.map((t: { id: number; name: string; amount: unknown }) => ({
      id: t.id,
      // CONCAT(name,"- (£",amount," + VAT)") in the legacy query.
      label: t.amount === null || t.amount === undefined
        ? t.name
        : `${t.name} — (£${Number(t.amount).toFixed(2)} + VAT)`,
    })),
    exhibitionZones: exhibitionZones.map((z: { id: number; title: string | null }) => ({
      id: z.id,
      label: z.title || `Zone #${z.id}`,
    })),
    standLayouts: standLayouts.map((l: { id: number; title: string | null }) => ({
      id: l.id,
      label: l.title || `Layout #${l.id}`,
    })),
    availableStandSizes: orders
      // Legacy keeps only rows that have all three, since a stand order missing its size is not
      // something an organiser can allocate against.
      .filter(
        (o: { trade_stand_id: number | null; trade_stand_size: string | null }) =>
          Boolean(o.trade_stand_id) && Boolean(o.trade_stand_size)
      )
      .map((o: { id: number; order_id: number; trade_stand_size: string | null }) => ({
        id: o.id,
        label: `${o.trade_stand_size} (PO-${o.order_id})`,
      })),
  };
}

/**
 * "Virtual Booth Number" options for one Exhibition Zone: every exhibitor spot in that zone that
 * no OTHER exhibitor at this event already holds (view_exhibitor.php:940's commented-out query is
 * the same set). `excludeExhibitorId` keeps the exhibitor's own current booth in the list while
 * editing, so opening the form does not make their allocation disappear.
 */
export async function getExhibitorZoneSpots(
  context: EventMemberContext,
  zoneId: number,
  excludeExhibitorId?: number | null
): Promise<ExhibitorOption[]> {
  if (context.role !== "organiser" || !zoneId) return [];

  const taken = await prisma.find_event_exhibitor.findMany({
    where: {
      event_id: context.eventId,
      spot_id: { not: null },
      ...(excludeExhibitorId ? { id: { not: excludeExhibitorId } } : {}),
    },
    select: { spot_id: true },
  });
  const takenIds = taken
    .map((t: { spot_id: number | null }) => t.spot_id)
    .filter((id: number | null): id is number => typeof id === "number" && id > 0);

  const spots = await prisma.find_event_lobby_spots.findMany({
    where: {
      event_id: context.eventId,
      event_layout_child_id: zoneId,
      spot_type: "exhibitor",
      ...(takenIds.length > 0 ? { id: { notIn: takenIds } } : {}),
    },
    orderBy: [{ stand_no: "asc" }, { id: "asc" }],
    select: { id: true, stand_no: true, title: true },
  });

  return spots.map((s: { id: number; stand_no: number | null; title: string | null }) => ({
    id: s.id,
    label: s.stand_no !== null && s.stand_no !== undefined ? String(s.stand_no) : (s.title || `Spot #${s.id}`),
  }));
}

/**
 * "Stand Color" options for one Exhibitor Stand Layout — the exact hop the legacy page makes in
 * its `action=getColorOptions` AJAX handler (view_exhibitor.php:96-103): the chosen child layout
 * names a parent template, and the colours belong to that template, not to the layout.
 */
export async function getExhibitorStandColors(
  context: EventMemberContext,
  standLayoutId: number
): Promise<ExhibitorOption[]> {
  if (context.role !== "organiser" || !standLayoutId) return [];

  const layout = await prisma.find_event_lobby_child_layout_manager.findFirst({
    where: { id: standLayoutId, event_id: context.eventId },
    select: { template_id: true },
  });
  if (!layout?.template_id) return [];

  const colors = await prisma.find_event_template_color_options.findMany({
    where: { parent_template_id: layout.template_id },
    orderBy: { id: "asc" },
    select: { id: true, color: true },
  });

  return colors.map((c: { id: number; color: string | null }) => ({
    id: c.id,
    label: c.color || `Colour #${c.id}`,
  }));
}

export type ExhibitorImageField = "profile_pic" | "logo" | "stand_logo";

export const EXHIBITOR_IMAGE_FIELDS: readonly ExhibitorImageField[] = [
  "profile_pic",
  "logo",
  "stand_logo",
] as const;

/**
 * Stores the public URL of an uploaded image on the exhibitor row. Scoped by event_id so an
 * organiser cannot write an image onto another event's exhibitor by guessing an id.
 */
export async function setExhibitorImage(
  context: EventMemberContext,
  id: number,
  field: ExhibitorImageField,
  publicUrl: string
) {
  if (context.role !== "organiser") return { count: 0 };
  return prisma.find_event_exhibitor.updateMany({
    where: { id, event_id: context.eventId },
    data: { [field]: publicUrl },
  });
}
