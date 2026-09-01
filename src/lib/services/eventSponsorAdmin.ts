import { prisma } from "@/lib/prisma";
import { assetUrl } from "@/lib/assets";
import type { EventMemberContext } from "@/lib/services/eventAccess";
import {
  eventSponsorAdminSchema,
  SPONSOR_STATUSES,
  type EventSponsorAdminInput,
} from "@/lib/validations/eventSponsorAdmin";

/* ===========================================================================
   members/view_sponsor.php — the organiser's sponsor list, form and bulk actions.
   =========================================================================== */

export interface SponsorAdminRow {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  business: string | null;
  position: string | null;
  website: string | null;
  linkedinUserProfile: string | null;
  /** find_sponsorship_categories.id, as stored. */
  sponsorshipType: string | null;
  /** Human title for the above, resolved from find_sponsorship_categories. */
  sponsorshipTypeName: string | null;
  /** The short code column the list shows under "Sponsor Type" (e.g. STES). */
  sponsorType: string | null;
  sponsorshipCategoryId: number | null;
  listingId: number | null;
  userId: number | null;
  orderId: number | null;
  /** find_orders.order_sub_total — the "Amount" column. */
  amount: number | null;
  /** find_orders.total_payable — the "TP" column. */
  totalPayable: number | null;
  /** Resolved through franchise_user_id, else the sponsor's own under_franchise_user. */
  franchiseName: string | null;
  status: string | null;
  joiningStatus: string | null;
  batchNumber: string | null;
  isApproved: boolean;
  activateSponsor: boolean;
  enableHomePage: boolean;
  enableEventBanner: boolean;
  enableDisplayAdvert: boolean;
  excludedFromAdvertise: boolean;
  featured: boolean;
  soldOutSponsor: boolean;
  showHome: boolean;
  showBanner: boolean;
  whiteBackgroundImage: boolean;
  exchangeServices: boolean;
  exchangeAmount: number | null;
  discount: number | null;
  charitableAmount: number | null;
  /** Public URL of the sponsor logo, or null. */
  sponsorImg: string | null;
  /** Public URL of the uploaded event banner, or null. */
  advertBanner: string | null;
  friendlyUrl: string | null;
  date: string | null;
}

export interface SponsorStats {
  total: number;
  registered: number;
  guest: number;
  approved: number;
  pending: number;
  featured: number;
  /** sum(available) / sum(used) over find_event_sponsorship_setup — the legacy header badges. */
  available: number;
  used: number;
}

const SELECT_FIELDS = {
  id: true,
  name: true,
  email: true,
  phone: true,
  business: true,
  position: true,
  website: true,
  linkedin_user_profile: true,
  sponsorship_type: true,
  sponsor_type: true,
  sponsorship_category_id: true,
  listing_id: true,
  user_id: true,
  order_id: true,
  franchise_user_id: true,
  status: true,
  joining_status: true,
  batch_number: true,
  is_approved: true,
  activate_sponsor: true,
  enable_home_page: true,
  enable_event_banner: true,
  enable_display_advert: true,
  excluded_from_advertise: true,
  featured: true,
  sold_out_sponsor: true,
  show_home: true,
  show_banner: true,
  white_background_image: true,
  exchange_services: true,
  exchange_amount: true,
  discount: true,
  charitable_amount: true,
  sponsor_img: true,
  banner_extension: true,
  date: true,
} as const;

/**
 * find_event_sponsorer stores images two ways and both have to render:
 *
 *  - Legacy rows hold a BARE FILENAME the PHP app resolved against /files/sponsor/. Those go
 *    through assetUrl(), which maps the legacy path onto the mirrored copy under
 *    public/images/external (src/lib/asset-map.ts), so the page does not depend on the old host.
 *  - Rows uploaded through THIS app hold an app-relative public URL already ("/files/sponsor/..."),
 *    written by /api/members/sponsors-admin/upload. Passing those through the legacy mapper would
 *    fail to find them and blank the image out.
 *
 * A leading "/" or a scheme separates the two.
 */
function sponsorImageUrl(stored: string | null | undefined, legacyFolder: string): string | null {
  const value = (stored ?? "").trim();
  if (!value) return null;
  if (value.startsWith("/") || /^https?:\/\//i.test(value)) return value;
  return assetUrl(`/files/${legacyFolder}/${value}`) ?? null;
}

function toNumberOrNull(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

interface RowExtras {
  sponsorshipTypeName?: string | null;
  amount?: number | null;
  totalPayable?: number | null;
  franchiseName?: string | null;
  friendlyUrl?: string | null;
}

function toRow(s: any, extras: RowExtras = {}): SponsorAdminRow {
  return {
    id: s.id,
    name: s.name ?? "",
    email: s.email,
    phone: s.phone,
    business: s.business,
    position: s.position,
    website: s.website,
    linkedinUserProfile: s.linkedin_user_profile,
    sponsorshipType: s.sponsorship_type,
    sponsorshipTypeName: extras.sponsorshipTypeName ?? null,
    sponsorType: s.sponsor_type,
    sponsorshipCategoryId: s.sponsorship_category_id ?? null,
    listingId: s.listing_id ?? null,
    userId: s.user_id ?? null,
    orderId: s.order_id ?? null,
    amount: extras.amount ?? null,
    totalPayable: extras.totalPayable ?? null,
    franchiseName: extras.franchiseName ?? null,
    status: s.status ?? null,
    joiningStatus: s.joining_status ?? null,
    batchNumber: s.batch_number ?? null,
    isApproved: Boolean(s.is_approved),
    activateSponsor: Boolean(s.activate_sponsor),
    enableHomePage: Boolean(s.enable_home_page),
    enableEventBanner: Boolean(s.enable_event_banner),
    enableDisplayAdvert: Boolean(s.enable_display_advert),
    excludedFromAdvertise: Boolean(s.excluded_from_advertise),
    featured: Boolean(s.featured),
    soldOutSponsor: Boolean(s.sold_out_sponsor),
    showHome: Boolean(s.show_home),
    showBanner: Boolean(s.show_banner),
    whiteBackgroundImage: Boolean(s.white_background_image),
    exchangeServices: Boolean(s.exchange_services),
    exchangeAmount: s.exchange_amount ?? null,
    discount: s.discount ?? null,
    charitableAmount: s.charitable_amount ?? null,
    sponsorImg: sponsorImageUrl(s.sponsor_img, "sponsor"),
    // The legacy schema stores only the EXTENSION for the banner; the file itself is named after
    // the sponsor id (view_sponsor.php:489-494). Rebuild the path the same way.
    advertBanner: s.banner_extension
      ? sponsorImageUrl(
          String(s.banner_extension).startsWith("/")
            ? String(s.banner_extension)
            : `${s.id}.${s.banner_extension}`,
          "SponsorEventBanner",
        )
      : null,
    friendlyUrl: extras.friendlyUrl ?? null,
    date: s.date ? new Date(s.date).toISOString() : null,
  };
}

/**
 * The sponsor list.
 *
 * The legacy page does this in one SQL statement with four LEFT JOINs and two correlated
 * subselects. Prisma has no relations declared between these tables (the schema was introspected
 * from a legacy database with no foreign keys), so the joins are done here as a handful of batched
 * lookups instead — one query per related table rather than one per row, which is what an
 * `include` would have produced anyway.
 */
export async function getSponsorsAdmin(context: EventMemberContext): Promise<SponsorAdminRow[]> {
  if (context.role !== "organiser") return [];

  const rows = await prisma.find_event_sponsorer.findMany({
    where: { event_id: context.eventId },
    orderBy: { id: "desc" },
    select: SELECT_FIELDS,
  });
  if (rows.length === 0) return [];

  const orderIds = unique(rows.map((r: any) => r.order_id));
  const listingIds = unique(rows.map((r: any) => r.listing_id));
  const userIds = unique(rows.map((r: any) => r.user_id));
  const franchiseIds = unique(rows.map((r: any) => r.franchise_user_id));
  // sponsorship_type is a VarChar holding a numeric id — anything non-numeric is legacy junk and
  // is dropped here rather than blowing up the `in` filter.
  const typeIds = unique(
    rows.map((r: any) => (r.sponsorship_type && /^\d+$/.test(String(r.sponsorship_type)) ? Number(r.sponsorship_type) : null)),
  );

  const [orders, listings, sponsorUsers, categories] = await Promise.all([
    orderIds.length
      ? prisma.find_orders.findMany({
          where: { id: { in: orderIds } },
          select: { id: true, order_sub_total: true, total_payable: true },
        })
      : Promise.resolve([] as any[]),
    listingIds.length
      ? prisma.find_listings.findMany({
          where: { id: { in: listingIds } },
          select: { id: true, friendly_url: true },
        })
      : Promise.resolve([] as any[]),
    userIds.length
      ? prisma.find_users.findMany({
          where: { id: { in: userIds } },
          select: { id: true, under_franchise_user: true },
        })
      : Promise.resolve([] as any[]),
    typeIds.length
      ? prisma.find_sponsorship_categories.findMany({
          where: { id: { in: typeIds } },
          select: { id: true, title: true },
        })
      : Promise.resolve([] as any[]),
  ]);

  const orderById = new Map<number, { order_sub_total: number | null; total_payable: number | null }>(
    orders.map((o: any) => [o.id, o]),
  );
  const listingById = new Map<number, { friendly_url: string | null }>(
    listings.map((l: any) => [l.id, l]),
  );
  const userById = new Map<number, { under_franchise_user: number | null }>(
    sponsorUsers.map((u: any) => [u.id, u]),
  );
  const categoryById = new Map<number, string>(categories.map((c: any) => [c.id, c.title]));

  // The franchise name resolves through franchise_user_id when set, else through the sponsor's
  // own under_franchise_user — so the second set of ids is only knowable after the users above.
  const resolvedFranchiseIds = unique([
    ...franchiseIds,
    ...rows.map((r: any) => {
      if (r.franchise_user_id) return null;
      const owner = userById.get(r.user_id);
      return owner?.under_franchise_user || null;
    }),
  ]);

  const franchiseUsers = resolvedFranchiseIds.length
    ? await prisma.find_users.findMany({
        where: { id: { in: resolvedFranchiseIds } },
        select: { id: true, user_first_name: true, user_last_name: true },
      })
    : [];
  const franchiseById = new Map<number, string>(
    franchiseUsers.map((u: any) => [u.id, `${u.user_first_name ?? ""} ${u.user_last_name ?? ""}`.trim()]),
  );

  return rows.map((r: any) => {
    const order = r.order_id ? orderById.get(r.order_id) : undefined;
    const franchiseId = r.franchise_user_id || userById.get(r.user_id)?.under_franchise_user || null;
    const typeId = r.sponsorship_type && /^\d+$/.test(String(r.sponsorship_type)) ? Number(r.sponsorship_type) : null;

    return toRow(r, {
      sponsorshipTypeName: typeId ? (categoryById.get(typeId) ?? null) : null,
      amount: order?.order_sub_total ?? null,
      totalPayable: order?.total_payable ?? null,
      franchiseName: franchiseId ? (franchiseById.get(franchiseId) || null) : null,
      friendlyUrl: r.listing_id ? (listingById.get(r.listing_id)?.friendly_url ?? null) : null,
    });
  });
}

function unique(values: (number | null | undefined)[]): number[] {
  return [...new Set(values.filter((v): v is number => typeof v === "number" && v > 0))];
}

/**
 * The four header badges plus the quick-filter counts.
 *
 * "Available" and "Used" come from find_event_sponsorship_setup, NOT from the sponsor rows — they
 * are how many sponsorship slots this event has configured and how many are taken
 * (view_sponsor.php:884). A sponsor without a slot and a slot without a sponsor are both normal,
 * so counting one from the other would be wrong.
 */
export async function getSponsorStats(context: EventMemberContext): Promise<SponsorStats> {
  const empty: SponsorStats = {
    total: 0, registered: 0, guest: 0, approved: 0, pending: 0, featured: 0, available: 0, used: 0,
  };
  if (context.role !== "organiser") return empty;

  const [rows, setup] = await Promise.all([
    prisma.find_event_sponsorer.findMany({
      where: { event_id: context.eventId },
      select: { user_id: true, status: true, is_approved: true, featured: true },
    }),
    prisma.find_event_sponsorship_setup.aggregate({
      where: { event_id: context.eventId },
      _sum: { available: true, used: true },
    }),
  ]);

  let registered = 0;
  let approved = 0;
  let pending = 0;
  let featured = 0;
  for (const r of rows) {
    if (r.user_id) registered += 1;
    if (r.is_approved || r.status === "approved") approved += 1;
    if (r.status === "pending") pending += 1;
    if (r.featured) featured += 1;
  }

  return {
    total: rows.length,
    registered,
    guest: rows.length - registered,
    approved,
    pending,
    featured,
    available: setup._sum.available ?? 0,
    used: setup._sum.used ?? 0,
  };
}

/* --------------------------------- writes --------------------------------- */

function generateBatchNumber(eventId: number): string {
  return `SP-${eventId}-${Date.now().toString(36).toUpperCase()}`;
}

/**
 * Shared column payload for create and update.
 *
 * `business` is deliberately derived from the chosen listing when one is picked: the legacy page
 * does the same (`select title from find_listings where id=...`), and it is the difference between
 * the list showing a company name and showing a numeric id.
 */
async function sponsorData(input: EventSponsorAdminInput) {
  const listingId = toNumberOrNull(input.listing_id);

  let business = (input.business ?? "").trim() || null;
  if (listingId) {
    const listing = await prisma.find_listings.findFirst({
      where: { id: listingId },
      select: { title: true },
    });
    if (listing?.title) business = listing.title;
  }

  return {
    name: input.name,
    email: input.email || null,
    phone: input.phone || null,
    position: input.position || null,
    business,
    listing_id: listingId ?? 0,
    website: input.website || null,
    linkedin_user_profile: input.linkedin_user_profile || null,
    sponsorship_type: input.sponsorship_type || null,
    sponsor_type: input.sponsor_type || null,
    sponsorship_category_id: toNumberOrNull(input.sponsorship_category_id),
    order_id: toNumberOrNull(input.order_id),
    exchange_services: input.exchange_services ? 1 : 0,
    exchange_amount: toNumberOrNull(input.exchange_amount),
    discount: toNumberOrNull(input.discount) ?? 0,
    charitable_amount: toNumberOrNull(input.charitable_amount) ?? 0,
    activate_sponsor: input.activate_sponsor ? 1 : 0,
    enable_home_page: input.enable_home_page ? 1 : 0,
    enable_event_banner: input.enable_event_banner ? 1 : 0,
    enable_display_advert: input.enable_display_advert ? 1 : 0,
    excluded_from_advertise: input.excluded_from_advertise ?? false,
    featured: input.featured ? 1 : 0,
    sold_out_sponsor: input.sold_out_sponsor ? 1 : 0,
    show_home: input.show_home ?? false,
    show_banner: input.show_banner ?? false,
    white_background_image: input.white_background_image ? 1 : 0,
    status: input.status as any,
    is_approved: input.is_approved ? 1 : 0,
  };
}

/**
 * Consuming a sponsorship order marks it used, and releasing one puts it back — the legacy page
 * only does the first half (view_sponsor.php:431-433, :481-483), which is why an order swapped
 * away from a sponsor stays locked out of every future dropdown. Both halves are done here.
 */
async function syncSponsorOrder(orderId: number | null, previousOrderId: number | null) {
  if (previousOrderId && previousOrderId !== orderId) {
    await prisma.find_orders.updateMany({ where: { id: previousOrderId }, data: { used: 0 } });
  }
  if (orderId) {
    await prisma.find_orders.updateMany({ where: { id: orderId }, data: { used: 1 } });
  }
}

export async function createSponsorAdmin(context: EventMemberContext, input: EventSponsorAdminInput) {
  if (context.role !== "organiser") return null;

  const data = await sponsorData(input);
  const created = await prisma.find_event_sponsorer.create({
    data: {
      ...data,
      event_id: context.eventId,
      batch_number: generateBatchNumber(context.eventId),
      user_id: context.userId,
      created_by_user_id: context.userId,
    },
    select: { id: true },
  });

  await syncSponsorOrder(data.order_id, null);
  return created;
}

export async function updateSponsorAdmin(
  context: EventMemberContext,
  id: number,
  input: EventSponsorAdminInput,
) {
  if (context.role !== "organiser") return { count: 0 };

  // Read BEFORE the write: once the row is updated its old order_id is gone, and with it any way
  // to release the order the sponsor is moving off.
  const previous = await prisma.find_event_sponsorer.findFirst({
    where: { id, event_id: context.eventId },
    select: { order_id: true },
  });

  const data = await sponsorData(input);
  const result = await prisma.find_event_sponsorer.updateMany({
    where: { id, event_id: context.eventId },
    data,
  });

  if (result.count > 0) await syncSponsorOrder(data.order_id, previous?.order_id ?? null);
  return result;
}

export async function deleteSponsorAdmin(context: EventMemberContext, id: number) {
  if (context.role !== "organiser") return { count: 0 };

  // Release the slot the sponsor was holding, otherwise deleting them silently burns the order.
  const row = await prisma.find_event_sponsorer.findFirst({
    where: { id, event_id: context.eventId },
    select: { order_id: true },
  });
  const result = await prisma.find_event_sponsorer.deleteMany({ where: { id, event_id: context.eventId } });
  if (result.count > 0 && row?.order_id) await syncSponsorOrder(null, row.order_id);
  return result;
}

export async function bulkSetSponsorStatus(context: EventMemberContext, ids: number[], status: string) {
  if (context.role !== "organiser") return { count: 0 };
  // Approve / Reject in the legacy page write BOTH status and is_approved, because the public
  // site reads is_approved while the list reads status. Keeping them in step here means the two
  // views can never disagree.
  const isApproved = status === "approved" ? 1 : status === "unapproved" ? 0 : undefined;
  return prisma.find_event_sponsorer.updateMany({
    where: { id: { in: ids }, event_id: context.eventId },
    data: { status: status as any, ...(isApproved === undefined ? {} : { is_approved: isApproved }) },
  });
}

/** The "Featured", "Sold Out", "Enable Banner" and "Activate" bulk buttons. */
export type SponsorFlag =
  | "featured"
  | "sold_out_sponsor"
  | "enable_home_page"
  | "activate_sponsor"
  | "show_home"
  | "show_banner";

export const SPONSOR_FLAGS: readonly SponsorFlag[] = [
  "featured",
  "sold_out_sponsor",
  "enable_home_page",
  "activate_sponsor",
  "show_home",
  "show_banner",
] as const;

export async function bulkSetSponsorFlag(
  context: EventMemberContext,
  ids: number[],
  flag: SponsorFlag,
  value: boolean,
) {
  if (context.role !== "organiser") return { count: 0 };
  // show_home / show_banner are real booleans in the schema; the rest are legacy 0/1 integers.
  const asBoolean = flag === "show_home" || flag === "show_banner";
  return prisma.find_event_sponsorer.updateMany({
    where: { id: { in: ids }, event_id: context.eventId },
    data: { [flag]: asBoolean ? value : value ? 1 : 0 },
  });
}

export async function bulkDeleteSponsors(context: EventMemberContext, ids: number[]) {
  if (context.role !== "organiser") return { count: 0 };

  const rows = await prisma.find_event_sponsorer.findMany({
    where: { id: { in: ids }, event_id: context.eventId },
    select: { order_id: true },
  });
  const result = await prisma.find_event_sponsorer.deleteMany({
    where: { id: { in: ids }, event_id: context.eventId },
  });

  const heldOrders = unique(rows.map((r: any) => r.order_id));
  if (result.count > 0 && heldOrders.length > 0) {
    await prisma.find_orders.updateMany({ where: { id: { in: heldOrders } }, data: { used: 0 } });
  }
  return result;
}

export async function setSponsorImage(
  context: EventMemberContext,
  id: number,
  field: "sponsor_img" | "banner_extension",
  value: string,
) {
  if (context.role !== "organiser") return { count: 0 };
  return prisma.find_event_sponsorer.updateMany({
    where: { id, event_id: context.eventId },
    data: { [field]: value },
  });
}

/* ---------------------------- form reference data ---------------------------- */

export interface SponsorOption {
  id: number;
  label: string;
  /** Only on sponsorship types — the code that fills the read-only "Sponsor Type" field. */
  code?: string | null;
}

export interface SponsorFormOptions {
  /** "Business" — the organiser's own find_listings rows. */
  businesses: SponsorOption[];
  /** "Sponsorship Type" — categories active for this event's event-categories. */
  sponsorshipTypes: SponsorOption[];
  /** "Sponsorship category" — this event's categories. */
  sponsorshipCategories: SponsorOption[];
  /** "Available Sponsorship" — unused sponsorship orders belonging to this user. */
  availableSponsorships: SponsorOption[];
}

const EMPTY_FORM_OPTIONS: SponsorFormOptions = {
  businesses: [],
  sponsorshipTypes: [],
  sponsorshipCategories: [],
  availableSponsorships: [],
};

export async function getSponsorFormOptions(
  context: EventMemberContext,
  /**
   * When editing, the order already attached to this sponsor must stay selectable even though it
   * is flagged used — otherwise opening the form and saving silently drops the allocation. Legacy
   * does the same with `(ao.used = 0 or ao.id = ...)`.
   */
  currentOrderId?: number | null,
): Promise<SponsorFormOptions> {
  if (context.role !== "organiser") return EMPTY_FORM_OPTIONS;

  // find_events_categories_lookup has no primary key, so Prisma marks it @@ignore and generates
  // no model for it — a raw query is the only way to read this event's categories.
  const lookup = await prisma.$queryRaw<{ category_id: number }[]>`
    SELECT category_id FROM find_events_categories_lookup WHERE event_id = ${context.eventId}
  `;
  const categoryIds = [
    ...new Set(lookup.map((r: { category_id: number }) => Number(r.category_id)).filter(Boolean)),
  ];

  const [listings, eventCategories, sponsorshipTypes] = await Promise.all([
    prisma.find_listings.findMany({
      where: { user_id: context.userId },
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
    categoryIds.length
      ? prisma.find_events_categories.findMany({
          where: { id: { in: categoryIds }, active: true },
          orderBy: { title: "asc" },
          select: { id: true, title: true },
        })
      : Promise.resolve([] as any[]),
    categoryIds.length
      ? prisma.find_sponsorship_categories.findMany({
          // `category` is a VarChar holding the category id — compare as strings.
          where: { category: { in: categoryIds.map(String) }, active: true },
          orderBy: [{ display_order: "asc" }, { id: "asc" }],
          select: { id: true, title: true, price: true, sponsor_type: true },
        })
      : Promise.resolve([] as any[]),
  ]);

  // "Available Sponsorship": the paid sponsorship orders this user has not yet spent.
  const typeIds = sponsorshipTypes.map((t: any) => t.id);
  const orders = typeIds.length
    ? await prisma.find_orders.findMany({
        where: {
          user_id: context.userId,
          type_id: { in: typeIds },
          OR: [{ used: 0 }, ...(currentOrderId ? [{ id: currentOrderId }] : [])],
        },
        orderBy: { id: "desc" },
        select: { id: true, order_id: true, type_id: true, order_sub_total: true },
      })
    : [];
  const typeById = new Map<number, { title: string; price: number | null }>(
    sponsorshipTypes.map((t: any) => [t.id, t]),
  );

  return {
    businesses: listings.map((l: any) => ({ id: l.id, label: l.title || `Listing #${l.id}` })),
    sponsorshipTypes: sponsorshipTypes.map((t: any) => ({
      id: t.id,
      label: t.price ? `${t.title} — £${Number(t.price).toLocaleString("en-GB")}` : t.title,
      code: t.sponsor_type ?? null,
    })),
    sponsorshipCategories: eventCategories.map((c: any) => ({ id: c.id, label: c.title })),
    availableSponsorships: orders.map((o: any) => {
      const type = typeById.get(o.type_id);
      const price = o.order_sub_total ?? type?.price;
      return {
        id: o.id,
        label: `${type?.title ?? "Sponsorship"}${price ? ` — £${Number(price).toLocaleString("en-GB")}` : ""} (PO-${o.order_id})`,
      };
    }),
  };
}

/* ------------------------------ email templates ------------------------------ */

export interface SponsorEmailTemplateOption {
  id: string;
  label: string;
  processName: string | null;
}

/**
 * Options for "Select an Email Template".
 *
 * The legacy page builds this from `getEmailTemplateOptionsByProcessName('Manage Sponsor')`.
 * Sponsor-facing templates are matched first; if that returns nothing — which is what happens on a
 * database where process_name was never populated — every enabled template is offered rather than
 * an empty dropdown, since an empty control looks broken and gives the organiser nothing to do.
 */
export async function getSponsorEmailTemplates(): Promise<SponsorEmailTemplateOption[]> {
  const select = { id: true, type: true, action_btn_name: true, process_name: true } as const;
  const orderBy = [{ priority_order: "asc" as const }, { id: "asc" as const }];

  const scoped = await prisma.find_email_templates.findMany({
    where: {
      disable: 0,
      OR: [{ process_name: { contains: "ponsor" } }, { process_name: { contains: "Sponsor" } }],
    },
    orderBy,
    select,
  });

  const rows = scoped.length > 0
    ? scoped
    : await prisma.find_email_templates.findMany({ where: { disable: 0 }, orderBy, select });

  return rows.map((r: any) => ({
    id: r.id,
    label: (r.action_btn_name || r.type || r.id) as string,
    processName: r.process_name ?? null,
  }));
}

/* --------------------------------- CSV import --------------------------------- */

export interface SponsorImportResult {
  created: number;
  skipped: number;
  skippedEmails: string[];
  invalid: { row: number; name: string; reason: string }[];
}

/**
 * Bulk CSV import — counterpart to Export CSV.
 *
 * Duplicates match on EMAIL, case-insensitively, scoped to this event. Existing sponsors are
 * SKIPPED, never updated: an import must not silently overwrite a sponsorship type, order or
 * approval someone has negotiated, so re-importing the same file is a no-op.
 *
 * Rows go through createSponsorAdmin() rather than a bulk insert, so imported sponsors get the
 * same derived fields (batch number, resolved business name, order bookkeeping) as one added by
 * hand. Slower than createMany and deliberately so — skipping it produces sponsors that look
 * right in the table but are wired up wrong.
 */
export async function importSponsors(
  context: EventMemberContext,
  rows: Record<string, string>[],
): Promise<SponsorImportResult> {
  const result: SponsorImportResult = { created: 0, skipped: 0, skippedEmails: [], invalid: [] };
  if (context.role !== "organiser") return result;

  const existing = await prisma.find_event_sponsorer.findMany({
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

    const statusRaw = (raw.status ?? "").trim().toLowerCase();
    const status = (SPONSOR_STATUSES as readonly string[]).includes(statusRaw) ? statusRaw : "pending";

    const candidate = {
      name: (raw.name ?? "").trim(),
      email: (raw.email ?? "").trim(),
      phone: (raw.phone ?? "").trim(),
      business: (raw.business ?? "").trim(),
      position: (raw.position ?? "").trim(),
      website: (raw.website ?? "").trim(),
      linkedin_user_profile: (raw.linkedin_user_profile ?? "").trim(),
      sponsorship_type: (raw.sponsorship_type ?? "").trim(),
      sponsor_type: (raw.sponsor_type ?? "").trim(),
      exchange_amount: (raw.exchange_amount ?? "").trim() || null,
      featured: truthy(raw.featured),
      enable_home_page: truthy(raw.enable_home_page),
      show_home: truthy(raw.show_home),
      show_banner: truthy(raw.show_banner),
      is_approved: truthy(raw.is_approved) || status === "approved",
      status,
    };

    const parsed = eventSponsorAdminSchema.safeParse(candidate);
    if (!parsed.success) {
      const fields = parsed.error.flatten().fieldErrors;
      const reason =
        Object.values(fields).find((m) => Array.isArray(m) && m.length > 0)?.[0] ?? "Invalid row";
      result.invalid.push({
        row: index + 1,
        name: candidate.name || candidate.email || "(blank)",
        reason,
      });
      continue;
    }

    // An email is the only stable key a sponsor row has; without one there is nothing to
    // deduplicate against, so those rows import as-is rather than being silently merged.
    const key = (parsed.data.email ?? "").trim().toLowerCase();
    if (key && haveEmails.has(key)) {
      result.skipped += 1;
      result.skippedEmails.push(parsed.data.email as string);
      continue;
    }
    if (key) haveEmails.add(key);

    try {
      await createSponsorAdmin(context, parsed.data);
      result.created += 1;
    } catch (err) {
      console.error("[importSponsors] row failed:", err);
      result.invalid.push({
        row: index + 1,
        name: parsed.data.name,
        reason: "Could not be saved — see server log",
      });
    }
  }

  return result;
}
