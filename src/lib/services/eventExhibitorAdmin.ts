import { prisma } from "@/lib/prisma";
import {
  canImport,
  classifyImportRows,
  type CandidateRow,
  type ExistingExhibitor,
  type ImportAnalysis,
} from "@/lib/exhibitors/importMatching";
import type { EventMemberContext } from "@/lib/services/eventAccess";
import { listExhibitionZones } from "@/lib/services/eventLobbyZones";
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

/**
 * One exhibitor's full record, for the dedicated details page
 * (/members/view_exhibitor?action=edit&id=<id>&event_id=<id>).
 *
 * Event-scoped like every other read here, so an organiser cannot pull a record from an event
 * they do not run by editing the id in the URL.
 */
export async function getExhibitorAdminById(
  context: EventMemberContext,
  id: number
): Promise<ExhibitorAdminRow | null> {
  if (context.role !== "organiser" || !id) return null;
  const row = await prisma.find_event_exhibitor.findFirst({
    where: { id, event_id: context.eventId },
    select: SELECT_FIELDS,
  });
  return row ? toRow(row) : null;
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

/* ===========================================================================
 *  CSV IMPORT — ANALYSE, THEN COMMIT
 * ===========================================================================
 *
 *  Two entry points over one matcher. analyzeExhibitorImport() classifies a file and writes
 *  nothing; importExhibitors() takes back the rows the admin ticked, classifies them AGAIN against
 *  the database as it stands at that moment, and inserts only the ones that still qualify.
 *
 *  The second classification is not belt and braces. Between the preview and the confirm the admin
 *  can leave the screen open over lunch, another organiser can add the same exhibitor, or the same
 *  file can be submitted from a second tab. A preview is a photograph; the insert has to look
 *  again.
 *
 *  WHAT IT STILL CANNOT DO ALONE: stop two imports landing in the same millisecond. Both read,
 *  both see nothing, both insert — a read-then-write check cannot prevent that however carefully
 *  it is written. prisma/exhibitor_unique_contact.sql adds the index that can, and the catch below
 *  turns its violation into an "already exists" row rather than a failure.
 *
 *  ---------------------------------------------------------------------------
 *  THE DUPLICATE OVERRIDE
 *  ---------------------------------------------------------------------------
 *
 *  An `already_exists` row can be imported anyway, but ONLY when it arrives carrying
 *  `_allowDuplicate` — a flag the screen sets on a row the organiser ticked while it was showing as
 *  already existing. The flag is what separates the two ways a row can be an exact match at commit
 *  time, which otherwise look identical from here:
 *
 *      ticked as already_exists      -> a decision. Insert it, and say so on the results list.
 *      was NEW, matched in the gap   -> a race. Skip it, exactly as before the override existed.
 *
 *  Without the flag the second case would silently become the first, and the re-classification
 *  above would have been pointless.
 */

export interface ExhibitorImportOutcome {
  row: number;
  business: string;
  email: string;
  status:
    | "imported"
    | "potential_email_match_imported"
    | "duplicate_imported"
    | "already_exists"
    | "csv_duplicate"
    | "invalid"
    | "failed";
  reason?: string;
}

export interface ExhibitorImportResult {
  imported: number;
  potentialImported: number;
  /** Exact matches the organiser chose to add anyway. */
  duplicateImported: number;
  alreadyExists: number;
  csvDuplicates: number;
  invalid: number;
  failed: number;
  outcomes: ExhibitorImportOutcome[];
}

/** A spreadsheet's idea of yes. Module level, because the commit path reads a flag with it too. */
function truthy(value: string | undefined): boolean {
  return ["yes", "true", "y", "1"].includes((value ?? "").trim().toLowerCase());
}

/**
 * One raw CSV row -> the shape the schema validates.
 *
 * Shared by the analyse and the commit paths so a row cannot be judged valid during the preview
 * and invalid at insert, which would strand it in a category with no explanation.
 */
function toCandidate(raw: Record<string, string>) {
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
  const status = (EXHIBITOR_STATUSES as readonly string[]).includes(statusRaw) ? statusRaw : "pending";

  return {
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
}

/** Validate every row, keeping the raw row alongside so the commit can re-use it. */
function prepare(rows: Record<string, string>[]) {
  return rows.map((raw, index) => {
    const candidate = toCandidate(raw);
    const parsed = eventExhibitorAdminSchema.safeParse(candidate);

    let invalidReason: string | undefined;
    if (!parsed.success) {
      const fields = parsed.error.flatten().fieldErrors;
      invalidReason =
        Object.values(fields).find((m) => Array.isArray(m) && m.length > 0)?.[0] ?? "Invalid row";
    }

    return {
      raw,
      parsed: parsed.success ? parsed.data : null,
      candidate: {
        /*
         * The commit step is sent only the rows the admin ticked, so its own position in that
         * array is not the position the admin saw. `_row` carries the original file row through
         * from the preview; without it every outcome would cite a row number nobody can find.
         */
        row: Number(raw._row) > 0 ? Number(raw._row) : index + 1,
        business: candidate.business,
        email: candidate.email,
        contact: `${candidate.first_name} ${candidate.last_name}`.trim(),
        phone: candidate.phone,
        valid: parsed.success,
        invalidReason,
      } satisfies CandidateRow,
    };
  });
}

/** This event's exhibitors, in the shape the matcher wants. One query. */
async function existingForEvent(eventId: number): Promise<ExistingExhibitor[]> {
  const rows = await prisma.find_event_exhibitor.findMany({
    where: { event_id: eventId },
    select: {
      id: true,
      business: true,
      email: true,
      name: true,
      first_name: true,
      last_name: true,
      status: true,
    },
  });

  return rows.map(
    (r: {
      id: number;
      business: string | null;
      email: string | null;
      name: string | null;
      first_name: string | null;
      last_name: string | null;
      status: string;
    }) => ({
      id: r.id,
      business: r.business ?? "",
      email: r.email ?? "",
      // `name` is the legacy single column; the admin form writes first/last, so fall back to those.
      contact: (r.name ?? "").trim() || `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim(),
      status: r.status || "pending",
    }),
  );
}

/** Classify a file without writing anything. */
export async function analyzeExhibitorImport(
  context: EventMemberContext,
  rows: Record<string, string>[]
): Promise<ImportAnalysis> {
  const prepared = prepare(rows);
  const existing = await existingForEvent(context.eventId);
  return classifyImportRows(prepared.map((p) => p.candidate), existing);
}

/**
 * Insert the rows the admin ticked, and only those that still qualify.
 *
 * Inserted one at a time rather than in a single transaction, deliberately: the screen reports a
 * per-row outcome, and one failing row must not roll back the other sixty-seven. At this scale —
 * a file of a hundred or so against an event of a few hundred — the cost of that is nothing.
 */
export async function importExhibitors(
  context: EventMemberContext,
  rows: Record<string, string>[]
): Promise<ExhibitorImportResult> {
  const result: ExhibitorImportResult = {
    imported: 0,
    potentialImported: 0,
    duplicateImported: 0,
    alreadyExists: 0,
    csvDuplicates: 0,
    invalid: 0,
    failed: 0,
    outcomes: [],
  };

  if (context.role !== "organiser") return result;

  const prepared = prepare(rows);
  const existing = await existingForEvent(context.eventId);
  const analysis = classifyImportRows(prepared.map((p) => p.candidate), existing);

  for (let index = 0; index < analysis.records.length; index += 1) {
    const record = analysis.records[index];
    const data = prepared[index].parsed;

    // Set by the preview screen on a row the organiser ticked while it showed as already existing.
    const overridden = truthy(prepared[index].raw._allowDuplicate);

    const outcome: ExhibitorImportOutcome = {
      row: record.row,
      business: record.business,
      email: record.email,
      status: "failed",
    };

    /*
     * An exact match is skipped unless it was deliberately overridden. csv_duplicate and invalid
     * have no override at all, so the flag is not even consulted for them.
     */
    const blocked =
      !data ||
      !canImport(record.category) ||
      (record.category === "already_exists" && !overridden);

    if (blocked) {
      outcome.status =
        record.category === "already_exists"
          ? "already_exists"
          : record.category === "csv_duplicate"
            ? "csv_duplicate"
            : "invalid";
      outcome.reason =
        record.category === "already_exists" && !overridden
          ? "Already on this event, and not marked to add anyway."
          : record.reason;

      if (outcome.status === "already_exists") result.alreadyExists += 1;
      else if (outcome.status === "csv_duplicate") result.csvDuplicates += 1;
      else result.invalid += 1;

      result.outcomes.push(outcome);
      continue;
    }

    try {
      await createExhibitorAdmin(context, data);

      if (record.category === "already_exists") {
        outcome.status = "duplicate_imported";
        outcome.reason = "Already on this event — added as a second contact because you chose to.";
        result.duplicateImported += 1;
      } else if (record.category === "potential_email_match") {
        outcome.status = "potential_email_match_imported";
        outcome.reason = "Same email exists for another company; imported because it was selected.";
        result.potentialImported += 1;
      } else {
        outcome.status = "imported";
        result.imported += 1;
      }
    } catch (err) {
      /*
       * P2002 means a unique index refused the write. Two quite different situations reach here:
       *
       *   - an ordinary row that someone else inserted in the gap. Reporting "already exists" is
       *     exactly right; it is the outcome the admin would have seen a moment earlier.
       *   - a deliberate override, refused by prisma/exhibitor_unique_contact.sql. The index and
       *     the override contradict each other by design, so the message says which one won
       *     rather than pretending the row was a race.
       */
      const code = (err as { code?: string })?.code;
      if (code === "P2002") {
        outcome.status = "already_exists";
        outcome.reason = overridden
          ? "The database rejected the duplicate — a unique index on business + email is in place."
          : "Added by someone else while this import was open.";
        result.alreadyExists += 1;
      } else {
        console.error("[importExhibitors] row failed:", err);
        outcome.status = "failed";
        outcome.reason = "This row could not be saved.";
        result.failed += 1;
      }
    }

    result.outcomes.push(outcome);
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
  /**
   * Rendered but not choosable. Used by the Virtual Booth Number list so every booth 1..22 stays
   * visible in its zone — hiding the allocated ones made the numbering look like it skipped.
   */
  disabled?: boolean;
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

  const [listings, tickets, standLayouts, groupProducts, zoneLookup] = await Promise.all([
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
    prisma.find_event_lobby_child_layout_manager.findMany({
      where: { event_id: context.eventId, layout_type: "exhibition_stand" },
      orderBy: [{ sequence: "asc" }, { id: "asc" }],
      select: { id: true, title: true },
    }),
    // type="membership_options" orders only count when the product sits in group 19 — the legacy
    // query expresses this as a subselect; resolving the ids first keeps it to plain Prisma.
    prisma.find_products.findMany({ where: { group_id: 19 }, select: { id: true } }),
    /*
     * Shared with the auto-allocator, deliberately. If this dropdown and the allocator each had
     * their own idea of which zones exist, the allocator could fill a zone this form cannot show
     * — leaving stands nobody could subsequently change.
     */
    listExhibitionZones(context.eventId),
  ]);

  const exhibitionZones = zoneLookup.zones;

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

/** Every exhibition zone holds exactly this many virtual booths. */
export const BOOTHS_PER_ZONE = 22;

/**
 * Stand numbers are five digits by house style — 31225, not 7.
 *
 * BASE is where an event's very first booth series starts; the +1 makes it 31001. MIN is simply
 * the smallest five-digit number, used to tell "this is a real stand number" from "this is a
 * leftover ordinal" without hard-coding the 31xxx block as the only valid one: an event whose
 * numbers legitimately run 42xxx is left alone.
 */
export const STAND_NUMBER_BASE = 31000;
export const STAND_NUMBER_MIN = 10000;

/** A booth row as the allocation form needs it. */
export interface ZoneBooth {
  id: number;
  stand_no: number | null;
  title: string | null;
}

/**
 * Brings one zone's booth rows into the shape the allocation form assumes: at most
 * {@link BOOTHS_PER_ZONE} `find_event_lobby_spots` rows of `spot_type = "exhibitor"`.
 *
 * WHAT IT DOES NOT DO: renumber. `stand_no` carries the real booth identity an exhibitor is known
 * by on the floor and in print (31040, 31041, ...), so it is never rewritten to a 1..22 ordinal.
 * The per-zone "22 booths" rule is about HOW MANY booths a zone offers, not about what they are
 * called.
 *
 * Three passes, all scoped to one event:
 *   1. REPAIR — for a booth an exhibitor currently holds, that exhibitor's own `stand_number` is
 *      the authoritative booth id. Where the spot row disagrees, the exhibitor wins and the spot
 *      is corrected. This is also what restores a zone whose stand_no values were previously
 *      flattened to 1..22.
 *   2. TRIM — a zone holding more than 22 booths gives up the surplus, but only rows nobody holds
 *      and nobody has captioned. A surplus booth an exhibitor is standing on is left alone and
 *      still offered, because deleting it would strand that allocation.
 *   3. TOP UP — a short zone gains booths until it has 22. New numbers continue the zone's own
 *      series (its highest existing stand_no + 1), so a zone running 31040..31048 gains 31049
 *      next, not 10. New rows deliberately leave `event_layout_id` null and the coordinates unset:
 *      getLobbyHotspots() selects on `event_layout_id`, so a booth created here is an allocation
 *      slot only and never paints a stray dot on the lobby artwork.
 *
 * Runs on read because the form is the only place booths are consumed and it is organiser-only;
 * there is no migration step in this project to hang it off. Once a zone is settled it writes
 * nothing.
 *
 * Exported for src/lib/services/standAllocation.ts, which needs every zone brought into this same
 * shape before it can count what is free. The two must agree on how many booths a zone has, so
 * they share this rather than each having their own idea of it.
 */
export async function resolveZoneBooths(
  context: EventMemberContext,
  zoneId: number,
  takenSpotIds: Set<number>
): Promise<ZoneBooth[]> {
  let booths: ZoneBooth[] = await prisma.find_event_lobby_spots.findMany({
    where: {
      event_id: context.eventId,
      event_layout_child_id: zoneId,
      spot_type: "exhibitor",
    },
    orderBy: [{ stand_no: "asc" }, { id: "asc" }],
    select: { id: true, stand_no: true, title: true },
  });

  // ---- 1. Repair from the exhibitor that holds the booth.
  if (booths.length > 0) {
    const holders = await prisma.find_event_exhibitor.findMany({
      where: {
        event_id: context.eventId,
        spot_id: { in: booths.map((b) => b.id) },
      },
      select: { spot_id: true, stand_number: true },
    });

    for (const holder of holders) {
      const standNo = Number(String(holder.stand_number ?? "").trim());
      if (!holder.spot_id || !Number.isInteger(standNo) || standNo <= 0) continue;
      const booth = booths.find((b) => b.id === holder.spot_id);
      if (!booth || booth.stand_no === standNo) continue;

      await prisma.find_event_lobby_spots.updateMany({
        where: { id: booth.id, event_id: context.eventId },
        data: { stand_no: standNo, updated_on: new Date() },
      });
      booth.stand_no = standNo;
    }
    booths.sort((a, b) => (a.stand_no ?? 0) - (b.stand_no ?? 0) || a.id - b.id);
  }

  // ---- 2. Trim the surplus.
  if (booths.length > BOOTHS_PER_ZONE) {
    const removable = booths
      .slice(BOOTHS_PER_ZONE)
      .filter((b) => !takenSpotIds.has(b.id) && !(b.title ?? "").trim())
      .map((b) => b.id);
    if (removable.length > 0) {
      await prisma.find_event_lobby_spots.deleteMany({
        where: { id: { in: removable }, event_id: context.eventId },
      });
      const removed = new Set(removable);
      booths = booths.filter((b) => !removed.has(b.id));
    }
  }

  /*
   * ---- 3. Top up to 22, in this event's five-digit series.
   *
   * A stand number is printed on floor plans, quoted in invoices and read out on the phone, and
   * the house style is five digits — 31225, not 7. A zone that already has real numbers keeps
   * continuing its own run; one that is starting from nothing picks up after the highest
   * five-digit number anywhere on the event, so numbers stay unique across zones and read as one
   * series rather than each zone restarting.
   */
  let nextNumber = booths.reduce((max, b) => Math.max(max, b.stand_no ?? 0), 0) + 1;

  if (nextNumber <= STAND_NUMBER_MIN) {
    const highest = await prisma.find_event_lobby_spots.aggregate({
      where: {
        event_id: context.eventId,
        spot_type: "exhibitor",
        stand_no: { gte: STAND_NUMBER_MIN },
      },
      _max: { stand_no: true },
    });
    nextNumber = Math.max(STAND_NUMBER_BASE + 1, (highest._max.stand_no ?? 0) + 1);

    /*
     * Lift any short numbers already in this zone into the series — but ONLY when no exhibitor
     * stands on them. A booth someone holds keeps its number whatever it looks like: that number
     * is on their paperwork, and the repair pass above treats the exhibitor as authoritative
     * precisely so a renumbering here can never contradict it.
     */
    const short = booths.filter((b) => (b.stand_no ?? 0) < STAND_NUMBER_MIN);
    if (short.length > 0 && !short.some((b) => takenSpotIds.has(b.id))) {
      for (const booth of short) {
        await prisma.find_event_lobby_spots.updateMany({
          where: { id: booth.id, event_id: context.eventId },
          data: { stand_no: nextNumber, updated_on: new Date() },
        });
        booth.stand_no = nextNumber;
        nextNumber += 1;
      }
      booths.sort((a, b) => (a.stand_no ?? 0) - (b.stand_no ?? 0) || a.id - b.id);
    }
  }

  // Sequential rather than Promise.all so two booths can never claim the same number if the
  // organiser reopens the form while this is still running.
  while (booths.length < BOOTHS_PER_ZONE) {
    const created = await prisma.find_event_lobby_spots.create({
      data: {
        event_id: context.eventId,
        event_layout_child_id: zoneId,
        spot_type: "exhibitor",
        stand_no: nextNumber,
        title: "",
        user_id: context.userId,
        updated_on: new Date(),
      },
      select: { id: true, stand_no: true, title: true },
    });
    booths.push(created);
    nextNumber += 1;
  }

  return booths;
}

/**
 * The booths of one Exhibition Zone — all {@link BOOTHS_PER_ZONE} of them, in booth-number order.
 *
 * Allocated booths are returned `disabled` rather than dropped, so the caller can tell "already
 * taken" apart from "does not exist" and can hand out the next genuinely free one.
 *
 * `excludeExhibitorId` is the exhibitor being edited, so their own booth counts as free and the
 * form does not move them off it just by being opened.
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
  const takenIds = new Set<number>(
    taken
      .map((t: { spot_id: number | null }) => t.spot_id)
      .filter((id: number | null): id is number => typeof id === "number" && id > 0)
  );

  // resolveZoneBooths() repairs, trims and tops up — i.e. it WRITES. If any of that fails (the
  // database is unreachable, a create is rejected) the organiser should still get the booths that
  // already exist rather than a 500 that empties the whole allocation panel.
  let booths: ZoneBooth[];
  try {
    booths = await resolveZoneBooths(context, zoneId, takenIds);
  } catch {
    booths = await prisma.find_event_lobby_spots.findMany({
      where: { event_id: context.eventId, event_layout_child_id: zoneId, spot_type: "exhibitor" },
      orderBy: [{ stand_no: "asc" }, { id: "asc" }],
      select: { id: true, stand_no: true, title: true },
    });
  }

  return booths.map((b) => ({
    id: b.id,
    label: b.stand_no !== null && b.stand_no !== undefined ? String(b.stand_no) : b.title || `Spot #${b.id}`,
    disabled: takenIds.has(b.id),
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
