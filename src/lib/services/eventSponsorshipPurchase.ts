import { prisma } from "@/lib/prisma";
import type { EventMemberContext } from "@/lib/services/eventAccess";

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

/** The legacy hardcodes 20% VAT in every branch of advertise.php. */
const VAT_RATE = 20;

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
    listings: (await prisma.find_listings.findMany({
      where: { user_id: context.userId },
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    })) as { id: number; title: string }[],
  };
}

export interface SponsorshipPurchaseInput {
  sponsorshipId: number;
  listingId: number;
}

export interface SponsorshipPurchaseResult {
  invoiceId: number;
  orderId: number;
  subtotal: number;
  tax: number;
  total: number;
  description: string;
}

/**
 * A unique `find_orders.order_id`.
 *
 * That column is NOT NULL and @unique, and the legacy fills it with a random number then
 * immediately rewrites it as random+rowid. Rather than reproduce the double write, this picks up
 * from the current maximum, which cannot collide and keeps the numbers human-readable.
 */
async function nextOrderId(): Promise<number> {
  const highest = await prisma.find_orders.findFirst({
    orderBy: { order_id: "desc" },
    select: { order_id: true },
  });
  return Number(highest?.order_id ?? 100000) + 1;
}

/**
 * Raise the order and invoice for a chosen sponsorship.
 *
 * The PRICE IS READ FROM THE DATABASE, never taken from the request. The form shows a List Price
 * field, and a posted price would let anyone buy a £1,500 sponsorship for £1 by editing it.
 */
export async function createSponsorshipPurchase(
  context: EventMemberContext,
  input: SponsorshipPurchaseInput
): Promise<SponsorshipPurchaseResult | { error: string }> {
  const sponsorship = await prisma.find_sponsorship_categories.findUnique({
    where: { id: input.sponsorshipId },
    select: { id: true, title: true, price: true },
  });
  if (!sponsorship) return { error: "That sponsorship option no longer exists." };

  // The listing must belong to the buyer — otherwise an order could be attached to someone
  // else's business by posting their id.
  const listing = await prisma.find_listings.findFirst({
    where: { id: input.listingId, user_id: context.userId },
    select: { id: true, user_id: true },
  });
  if (!listing) return { error: "Choose one of your own listings." };

  const subtotal = Number(sponsorship.price ?? 0);
  const tax = Math.round(((subtotal * VAT_RATE) / 100) * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;
  const description = sponsorship.title;

  const order = await prisma.find_orders.create({
    data: {
      // Required, no defaults — see trap 2.
      order_id: await nextOrderId(),
      type: "sponsorship_option",
      type_id: sponsorship.id,
      listing_user_id: context.userId,

      user_id: context.userId,
      event_id: context.eventId,
      order_listing_id: listing.id,
      order_description: description,
      order_sub_total: subtotal,
      tax_amount: tax,
      price: total,
      date: new Date(),
    },
    select: { id: true, order_id: true },
  });

  const invoice = await prisma.find_invoices.create({
    data: {
      type: "sponsorship_option",
      type_id: sponsorship.id,
      user_id: context.userId,
      event_id: context.eventId,
      order_id: order.id,
      description: "SponsorShip Payment",
      subtotal,
      tax,
      total,
      tax_rate: VAT_RATE,
      date: new Date(),
      status: "unpaid",

      // Required, no defaults — blank exactly as the legacy leaves them until payment.
      payment_type: "",
      cheque_no: "",
      remittance: 0,
      bank_name: "",
      remark: "",
    },
    select: { id: true },
  });

  // The legacy links the two after the fact; same here, since the invoice needs the order id.
  await prisma.find_orders.update({
    where: { id: order.id },
    data: { invoice_id: invoice.id },
  });

  return {
    invoiceId: invoice.id,
    orderId: order.order_id,
    subtotal,
    tax,
    total,
    description,
  };
}
