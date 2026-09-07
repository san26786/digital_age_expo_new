import { prisma } from "@/lib/prisma";
import type { EventMemberContext } from "@/lib/services/eventAccess";
import {
  raiseOrderAndInvoice,
  getBuyerListings,
  ownsListing,
  type AdvertiseOrderResult,
} from "@/lib/services/advertiseOrders";

/**
 * ---------------------------------------------------------------------------
 * Buy Sponsorship — the "Choose Sponsorship" purchase flow.
 * ---------------------------------------------------------------------------
 *
 * Ports the `type=sponsorship_option` branch of advertise.php: pick an event category, a
 * sponsorship type, one of that category's sponsorship options and the listing it applies to,
 * then raise an order and an invoice for it.
 *
 * TWO MIGRATION TRAPS handled here, both of which would fail silently or loudly on Postgres:
 *
 *  1. `find_sponsorship_categories.category` IS A VARCHAR holding a numeric id. The legacy joins
 *     `c.id = sc.category` and filters `sc.category = 5`, which MySQL allows by coercing the
 *     string. Postgres refuses to compare varchar to integer, so every id is stringified before
 *     it reaches a where clause.
 *
 *  2. `find_orders` and `find_invoices` HAVE REQUIRED COLUMNS WITH NO DEFAULTS —
 *     order_id/type/type_id/listing_user_id on the order, and payment_type/cheque_no/remittance/
 *     bank_name/remark on the invoice. Omitting any of them makes create() throw. They are all
 *     written explicitly below, blank where the legacy leaves them blank.
 *
 * NOT PORTED: the `find_sponsorship_option` row the legacy also inserts. That table is not in
 * schema.prisma at all. It is a record of the chosen options, not part of the money trail — the
 * legacy's own order and invoice both carry `type_id = sponsorship_id` (the category), not the
 * find_sponsorship_option id — so the order and invoice produced here are complete without it.
 */

export interface SponsorshipChoice {
  id: number;
  /** "Gold Sponsor (Business Growth - £1,500.00)" — same shape the legacy select used. */
  label: string;
  price: number;
  categoryId: string;
  sponsorType: string | null;
}

export interface SponsorshipFormOptions {
  categories: { id: number; title: string }[];
  sponsorTypes: { code: string; name: string }[];
  options: SponsorshipChoice[];
  listings: { id: number; title: string }[];
}

function money(value: number): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(value);
}

/**
 * Everything the form needs, narrowed by whatever the user has picked so far.
 *
 * The legacy re-rendered the whole page to cascade (its selects pushed `category_id` and
 * `sponsor_type` back into the URL). This returns the lists for a given selection so the client
 * can narrow them without a navigation.
 */
export async function getSponsorshipFormOptions(
  context: EventMemberContext,
  selection: { categoryId?: number | null; sponsorType?: string | null } = {}
): Promise<SponsorshipFormOptions> {
  const categories = await prisma.find_events_categories.findMany({
    where: { active: true },
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  });

  // See trap 1 — the column is a varchar, so the id has to be compared as text.
  const categoryKey = selection.categoryId ? String(selection.categoryId) : null;

  const sponsorshipWhere: Record<string, unknown> = {};
  if (categoryKey) sponsorshipWhere.category = categoryKey;
  if (selection.sponsorType) sponsorshipWhere.sponsor_type = selection.sponsorType;

  const sponsorships = await prisma.find_sponsorship_categories.findMany({
    where: sponsorshipWhere,
    select: { id: true, title: true, category: true, sponsor_type: true, price: true },
    orderBy: { display_order: "asc" },
  });

  /*
   * Sponsorship type names live in independent_mst under typ_id 25 — a lookup table of codes.
   * With a category chosen, only the types that category actually offers are shown, which is what
   * stops "Nothing selected" being the only workable value on a category with one type.
   */
  const typeRows = await prisma.independent_mst.findMany({
    where: { typ_id: 25 },
    select: { mstr_cd: true, mstr_nm: true },
  });
  const typeNameByCode = new Map<string, string>(
    (typeRows as any[]).filter((t) => t.mstr_cd).map((t) => [t.mstr_cd as string, t.mstr_nm])
  );

  const availableTypeCodes = categoryKey
    ? [...new Set((sponsorships as any[]).map((s) => s.sponsor_type).filter(Boolean))]
    : [...typeNameByCode.keys()];

  const categoryTitleById = new Map<number, string>(
    (categories as any[]).map((c) => [c.id, c.title])
  );

  return {
    categories: categories as { id: number; title: string }[],
    sponsorTypes: (availableTypeCodes as string[])
      .map((code) => ({ code, name: typeNameByCode.get(code) ?? code }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    options: (sponsorships as any[]).map((s): SponsorshipChoice => {
      const catTitle = categoryTitleById.get(Number(s.category)) ?? s.category;
      return {
        id: s.id,
        label: `${s.title} (${catTitle} - ${money(Number(s.price ?? 0))})`,
        price: Number(s.price ?? 0),
        categoryId: String(s.category),
        sponsorType: s.sponsor_type ?? null,
      };
    }),
    // The businesses this member owns — the legacy read find_listings by session user id.
    listings: await getBuyerListings(context),
  };
}

export interface SponsorshipPurchaseInput {
  sponsorshipId: number;
  listingId: number;
}

export async function createSponsorshipPurchase(
  context: EventMemberContext,
  input: SponsorshipPurchaseInput
): Promise<AdvertiseOrderResult | { error: string }> {
  const sponsorship = await prisma.find_sponsorship_categories.findUnique({
    where: { id: input.sponsorshipId },
    select: { id: true, title: true, price: true },
  });
  if (!sponsorship) return { error: "That sponsorship option no longer exists." };

  if (!(await ownsListing(context, input.listingId))) {
    return { error: "Choose one of your own listings." };
  }

  return raiseOrderAndInvoice(context, {
    type: "sponsorship_option",
    typeId: sponsorship.id,
    listingId: input.listingId,
    // Read from the database, never from the request — the form's List Price is display only.
    subtotal: Number(sponsorship.price ?? 0),
    description: sponsorship.title,
    invoiceDescription: "SponsorShip Payment",
  });
}
