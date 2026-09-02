import { prisma } from "@/lib/prisma";
import { CONTENT_BLOCK_SELECT } from "@/lib/services/contentBlocks";
import { CACHE_TAGS, cachedRead } from "@/lib/cache";
import { exhibitorLogoUrl } from "@/lib/assets";
export type find_event_exhibitor_status = "active" | "inactive" | "pending" | "cancelled" | string;

const EXHIBITOR_SELECT = {
  id: true,
  business: true,
  name: true,
  website: true,
  logo: true,
  stand_number: true,
  listing_id: true,
} as const;

async function mapExhibitorRows(exhibitors: any[]) {
  const listingIds = [...new Set(exhibitors.map((e: any) => e.listing_id).filter((id: any): id is number => !!id))];
  const listings =
    listingIds.length > 0
      ? await prisma.find_listings.findMany({
          where: { id: { in: listingIds } },
          select: { id: true, title: true, logo_extension: true },
        })
      : [];
  const listingById = new Map<any, any>(listings.map((l: any) => [l.id, l]));

  return exhibitors.map((exhibitor: any) => {
    const listing = exhibitor.listing_id ? listingById.get(exhibitor.listing_id) : undefined;
    return {
      id: exhibitor.id,
      business: exhibitor.business || listing?.title || "",
      website: exhibitor.website,
      logo: exhibitor.logo,
      listingId: listing?.id ?? null,
      logoExtension: listing?.logo_extension ?? null,
      standNumber: exhibitor.stand_number,
    };
  });
}

/** Mirrors includes/blocks/our_exhibitors.php — the actual data source rendered
 * on exhibitors.php (that controller's own find_listings query is unused dead code).
 * Optional zoneId narrows to one exhibition zone (find_event_exhibitor.exhibition_zone_id) —
 * used by the /exhibitors?zone=<id> filter a lobby hotspot's zone dropdown links into. */
async function read_getEventExhibitors(eventId: number, zoneId?: number) {
  const exhibitors = await prisma.find_event_exhibitor.findMany({
    where: { event_id: eventId, status: "active", ...(zoneId ? { exhibition_zone_id: zoneId } : {}) },
    orderBy: { business: "asc" },
    select: EXHIBITOR_SELECT,
  });
  return mapExhibitorRows(exhibitors);
}

export interface PagedExhibitorsResult {
  exhibitors: Awaited<ReturnType<typeof mapExhibitorRows>>;
  total: number;
  page: number;
  pageSize: number;
}

/** Same data as getEventExhibitors, but paginated for the /exhibitors directory page. */
async function read_getEventExhibitorsPaged(
  eventId: number,
  page = 1,
  pageSize = 20,
  zoneId?: number
): Promise<PagedExhibitorsResult> {
  const safePage = Math.max(1, Math.floor(page) || 1);
  const where = {
    event_id: eventId,
    status: "active" as const,
    ...(zoneId ? { exhibition_zone_id: zoneId } : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.find_event_exhibitor.count({ where }),
    prisma.find_event_exhibitor.findMany({
      where,
      orderBy: { business: "asc" },
      skip: (safePage - 1) * pageSize,
      take: pageSize,
      select: EXHIBITOR_SELECT,
    }),
  ]);

  const exhibitors = await mapExhibitorRows(rows);
  return { exhibitors, total, page: safePage, pageSize };
}

/** The zone's own display name, for the /exhibitors?zone=<id> filtered heading. */
async function read_getExhibitionZoneName(zoneId: number): Promise<string | null> {
  const zone = await prisma.find_event_lobby_child_layout_manager.findUnique({
    where: { id: zoneId },
    select: { title: true },
  });
  return zone?.title ?? null;
}

export interface AdminExhibitor {
  id: number;
  name: string | null;
  business: string | null;
  email: string | null;
  phone: string | null;
  standNumber: string | null;
  status: find_event_exhibitor_status;
  joiningStatus: string | null;
  date: Date | null;
}

/** Organiser-facing view of every exhibitor registration for an event, regardless of status. */
export async function getExhibitorsForAdmin(eventId: number): Promise<AdminExhibitor[]> {
  const exhibitors = await prisma.find_event_exhibitor.findMany({
    where: { event_id: eventId },
    orderBy: { id: "desc" },
    select: {
      id: true,
      name: true,
      business: true,
      email: true,
      phone: true,
      stand_number: true,
      status: true,
      joining_status: true,
      date: true,
    },
  });

  return exhibitors.map((exhibitor: any) => ({
    id: exhibitor.id,
    name: exhibitor.name,
    business: exhibitor.business,
    email: exhibitor.email,
    phone: exhibitor.phone,
    standNumber: exhibitor.stand_number,
    status: exhibitor.status,
    joiningStatus: exhibitor.joining_status,
    date: exhibitor.date,
  }));
}

export async function updateExhibitorStatus(id: number, status: find_event_exhibitor_status) {
  return prisma.find_event_exhibitor.update({ where: { id }, data: { status }, select: { id: true } });
}

export async function deleteExhibitorRegistration(id: number) {
  return prisma.find_event_exhibitor.delete({ where: { id }, select: { id: true } });
}

/** Mirrors includes/blocks/why_Join_Event.php — used on why_join_exhibit.php. The row with
 * sequence 0 is the section intro/header; the rest are individual "reason" cards. */
async function read_getWhyJoinExhibitContent(listingId: number | null) {
  if (!listingId) return { intro: null as any, reasons: [] as any[] };

  const rows = await prisma.find_listing_business_opportunity.findMany({
    select: CONTENT_BLOCK_SELECT,
    where: { listing_id: listingId, opportunity_intro: "LOSNWJ" },
    orderBy: { sequence: "asc" },
  });

  const intro = rows.find((r: any) => r.sequence === 0) ?? null;
  const reasons = rows.filter((r: any) => r.sequence !== 0);
  return { intro, reasons };
}

/** Mirrors includes/blocks/exhibitor_package_include.php + gain_from_exhibitor.php — used on
 * exhibitor-registration.php. */
async function read_getExhibitorRegistrationContent(listingId: number | null) {
  if (!listingId) return { packageIncludes: [] as any[], gains: [] as any[] };

  const [packageIncludes, gains] = await Promise.all([
    prisma.find_listing_business_opportunity.findMany({
      select: CONTENT_BLOCK_SELECT,
      where: { listing_id: listingId, opportunity_intro: "LOSNYEPI", domain_page_name: "Exhibitor" },
      orderBy: { sequence: "asc" },
    }),
    prisma.find_listing_business_opportunity.findMany({
      select: CONTENT_BLOCK_SELECT,
      where: { listing_id: listingId, opportunity_intro: "LOSNWYGFE", domain_page_name: "Exhibitor" },
      orderBy: { sequence: "asc" },
    }),
  ]);

  return { packageIncludes, gains };
}

/** Mirrors includes/blocks/view_exhibitor.php — the hero content block used on why_exhibit.php /
 * whyExhibitor.php (also reused with a different domain_page_name on the home page's "book a stand"
 * section, see home.ts's getOpportunityContent). */
async function read_getWhyExhibitHero(listingId: number | null) {
  if (!listingId) return null;

  return prisma.find_listing_business_opportunity.findFirst({
    select: CONTENT_BLOCK_SELECT,
    where: { listing_id: listingId, opportunity_intro: "LOSNWHEXH", domain_page_name: "Why Exhibit" },
    orderBy: { sequence: "asc" },
  });
}

export interface StandPackage {
  id: number;
  name: string;
  description: string | null;
  price: number;
  period: string;
  periodCount: number;
}

export interface StandPackagesResult {
  title: string;
  packages: StandPackage[];
}

/** Real stand/exhibitor pricing tiers for the "Stands & Packages" page. Mirrors membership_packages.php
 * (and includes/blocks/membership_packages.php): find_products_groups -> find_products (type=
 * 'listing_membership') -> find_products_pricing, scoped to this domain's single product group. */
async function read_getStandPackages(domainId: number): Promise<StandPackagesResult> {
  const DEFAULT_TITLE = "CHOOSE MEMBERSHIP OPTIONS";

  const group = await prisma.find_products_groups.findFirst({
    where: { domain_id: domainId },
    select: { id: true, display_package_name: true },
  });
  if (!group) return { title: DEFAULT_TITLE, packages: [] };

  const products = await prisma.find_products.findMany({
    where: { group_id: group.id, type: "listing_membership", hidden: 0, active: true },
    orderBy: { ordering: "asc" },
    select: { id: true, name: true, description: true },
  });
  if (products.length === 0) {
    return { title: group.display_package_name || DEFAULT_TITLE, packages: [] };
  }

  const pricingRows = await prisma.find_products_pricing.findMany({
    where: { product_id: { in: products.map((p: any) => p.id) }, hidden: 0, active: 1 },
    orderBy: { ordering: "asc" },
    select: { product_id: true, price: true, period: true, period_count: true },
  });
  const pricingByProduct = new Map<number, (typeof pricingRows)[number]>();
  for (const row of pricingRows) {
    if (!pricingByProduct.has(row.product_id)) pricingByProduct.set(row.product_id, row);
  }

  const packages: StandPackage[] = products
    .map((p: any) => {
      const pricing = pricingByProduct.get(p.id);
      if (!pricing) return null;
      return {
        id: p.id,
        name: p.name,
        description: p.description,
        price: Number(pricing.price),
        period: pricing.period,
        periodCount: pricing.period_count,
      };
    })
    .filter((p: any): p is StandPackage => p !== null);

  return { title: group.display_package_name || DEFAULT_TITLE, packages };
}
export interface ExhibitorDirectoryEntry {
  id: number;
  business: string;
  contactName: string | null;
  zoneName: string | null;
  standNumber: string | null;
  about: string | null;
  logoUrl?: string;
  friendlyUrl: string | null;
}

/**
 * Every active exhibitor for the lobby footer's "Exhibitor List" modal — mirrors the legacy
 * footer's getExhibitorListModal(): business name + contact person, zone, booth number, a short
 * blurb, logo, and a link to the exhibitor's own stand. Unlike getEventExhibitors() (the plain
 * marketing grid on /exhibitors), this also resolves the zone name and about-us blurb the modal
 * actually displays.
 */
async function read_getEventExhibitorDirectory(eventId: number): Promise<ExhibitorDirectoryEntry[]> {
  const rows = await prisma.find_event_exhibitor.findMany({
    where: { event_id: eventId, status: "active" },
    orderBy: { business: "asc" },
    select: {
      id: true,
      business: true,
      first_name: true,
      last_name: true,
      name: true,
      logo: true,
      listing_id: true,
      exhibition_zone_id: true,
      stand_number: true,
      about_us: true,
      org_comments: true,
      friendly_url: true,
    },
  });

  const listingIds = [...new Set(rows.map((r: any) => r.listing_id).filter((id: any): id is number => !!id))];
  const zoneIds = [...new Set(rows.map((r: any) => r.exhibition_zone_id).filter((id: any): id is number => !!id))];

  const [listings, zones] = await Promise.all([
    listingIds.length
      ? prisma.find_listings.findMany({
          where: { id: { in: listingIds } },
          select: { id: true, title: true, logo_extension: true },
        })
      : Promise.resolve([] as any[]),
    zoneIds.length
      ? prisma.find_event_lobby_child_layout_manager.findMany({
          where: { id: { in: zoneIds } },
          select: { id: true, title: true },
        })
      : Promise.resolve([] as any[]),
  ]);

  // Explicit generics: `listings`/`zones` come from a ternary whose other branch is `[] as any[]`,
  // so the inferred entry tuple collapsed the value side to `{}` and every `listing?.title` /
  // `listing.logo_extension` read below was a type error.
  const listingById = new Map<number, any>(listings.map((l: any) => [l.id, l]));
  const zoneById = new Map<number, any>(zones.map((z: any) => [z.id, z]));

  return rows.map((row: any): ExhibitorDirectoryEntry => {
    const listing = row.listing_id ? listingById.get(row.listing_id) : undefined;
    const contactName = [row.first_name, row.last_name].filter(Boolean).join(" ").trim() || row.name || null;
    const about = (row.about_us || row.org_comments || "").trim() || null;
    const zone = row.exhibition_zone_id ? zoneById.get(row.exhibition_zone_id) : undefined;

    return {
      id: row.id,
      business: row.business || listing?.title || "Exhibitor",
      contactName,
      zoneName: zone?.title ?? null,
      standNumber: row.stand_number,
      about,
      logoUrl: exhibitorLogoUrl(row.logo, listing?.id, listing?.logo_extension) ?? undefined,
      friendlyUrl: row.friendly_url,
    };
  });
}

/**
 * ---------------------------------------------------------------------------
 *  Cached public reads
 * ---------------------------------------------------------------------------
 *
 *  These wrap the readers above so their results are reused across requests
 *  instead of re-queried on every page view — see src/lib/cache.ts for why that
 *  matters here and what is deliberately left uncached (anything per-user or
 *  organiser-facing, which in this file means the *ForAdmin readers and every
 *  update/delete path).
 */
export const getEventExhibitors = cachedRead(["exhibitors", "getEventExhibitors"], read_getEventExhibitors, {
  tags: [CACHE_TAGS.exhibitors],
});
export const getEventExhibitorsPaged = cachedRead(["exhibitors", "getEventExhibitorsPaged"], read_getEventExhibitorsPaged, {
  tags: [CACHE_TAGS.exhibitors],
});
export const getExhibitionZoneName = cachedRead(["exhibitors", "getExhibitionZoneName"], read_getExhibitionZoneName, {
  tags: [CACHE_TAGS.exhibitors],
});
export const getWhyJoinExhibitContent = cachedRead(["exhibitors", "getWhyJoinExhibitContent"], read_getWhyJoinExhibitContent, {
  tags: [CACHE_TAGS.exhibitors],
});
export const getExhibitorRegistrationContent = cachedRead(["exhibitors", "getExhibitorRegistrationContent"], read_getExhibitorRegistrationContent, {
  tags: [CACHE_TAGS.exhibitors],
});
export const getWhyExhibitHero = cachedRead(["exhibitors", "getWhyExhibitHero"], read_getWhyExhibitHero, {
  tags: [CACHE_TAGS.exhibitors],
});
export const getStandPackages = cachedRead(["exhibitors", "getStandPackages"], read_getStandPackages, {
  tags: [CACHE_TAGS.exhibitors],
});
export const getEventExhibitorDirectory = cachedRead(["exhibitors", "getEventExhibitorDirectory"], read_getEventExhibitorDirectory, {
  tags: [CACHE_TAGS.exhibitors],
});
