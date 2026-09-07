import { prisma } from "@/lib/prisma";
import type { EventMemberContext } from "@/lib/services/eventAccess";

/**
 * ---------------------------------------------------------------------------
 * Raising an order + invoice for anything bought through advertise.php.
 * ---------------------------------------------------------------------------
 *
 * Every purchase branch of the legacy advertise.php ends the same way: work out a price, add 20%
 * VAT, create a find_orders row, create a find_invoices row, then link the two. Only the `type`
 * string and where the price came from differ. That tail is here once, so sponsorship, speaker
 * slots, banner stands, artwork and content writing cannot drift apart on tax, on the required
 * columns, or on the order/invoice link.
 *
 * TWO THINGS THIS EXISTS TO GET RIGHT:
 *
 *  1. REQUIRED COLUMNS WITH NO DEFAULTS. find_orders needs order_id, type, type_id and
 *     listing_user_id; find_invoices needs payment_type, cheque_no, remittance, bank_name and
 *     remark. None are nullable or defaulted, so omitting any makes create() throw. They are all
 *     written here, blank where the legacy leaves them blank until payment.
 *
 *  2. THE PRICE IS NEVER TAKEN FROM THE CLIENT. Callers pass a subtotal they read from the
 *     database themselves. Every Buy form displays a price, and accepting a posted one would let
 *     a £200 slot be bought for £1.
 */

/** The legacy hardcodes 20% VAT in every branch of advertise.php. */
export const VAT_RATE = 20;

export interface AdvertiseOrderInput {
  /** find_orders.type / find_invoices.type — "sponsorship_option", "speaker_slot", ... */
  type: string;
  /** What was bought, in that type's own id space. */
  typeId: number;
  /** The buyer's listing this applies to. Must already be verified as theirs. */
  listingId: number;
  /** Ex-VAT, read from the database by the caller. */
  subtotal: number;
  /** Shown on the order ("Business Speakers Slot"). */
  description: string;
  /** Shown on the invoice ("Speaker Slot Payment"). */
  invoiceDescription: string;
}

export interface AdvertiseOrderResult {
  invoiceId: number;
  orderId: number;
  subtotal: number;
  tax: number;
  total: number;
  description: string;
}

/** Round to pence — floating-point money accumulates error that shows up on an invoice. */
function pence(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * A unique `find_orders.order_id`.
 *
 * That column is NOT NULL and @unique. The legacy inserts a random number then immediately
 * rewrites it as random+rowid; this takes the next value above the current maximum instead,
 * which cannot collide and stays readable.
 */
async function nextOrderId(): Promise<number> {
  const highest = await prisma.find_orders.findFirst({
    orderBy: { order_id: "desc" },
    select: { order_id: true },
  });
  return Number(highest?.order_id ?? 100000) + 1;
}

export async function raiseOrderAndInvoice(
  context: EventMemberContext,
  input: AdvertiseOrderInput
): Promise<AdvertiseOrderResult> {
  const subtotal = pence(input.subtotal);
  const tax = pence((subtotal * VAT_RATE) / 100);
  const total = pence(subtotal + tax);

  const order = await prisma.find_orders.create({
    data: {
      // Required, no defaults — see (1) above.
      order_id: await nextOrderId(),
      type: input.type,
      type_id: input.typeId,
      listing_user_id: context.userId,

      user_id: context.userId,
      event_id: context.eventId,
      order_listing_id: input.listingId,
      order_description: input.description,
      order_sub_total: subtotal,
      tax_amount: tax,
      price: total,
      date: new Date(),
    },
    select: { id: true, order_id: true },
  });

  const invoice = await prisma.find_invoices.create({
    data: {
      type: input.type,
      type_id: input.typeId,
      user_id: context.userId,
      event_id: context.eventId,
      order_id: order.id,
      description: input.invoiceDescription,
      subtotal,
      tax,
      total,
      tax_rate: VAT_RATE,
      date: new Date(),
      status: "unpaid",

      // Required, no defaults — blank until the invoice is settled, as the legacy leaves them.
      payment_type: "",
      cheque_no: "",
      remittance: 0,
      bank_name: "",
      remark: "",
    },
    select: { id: true },
  });

  // The invoice needs the order id, so the back-link is written afterwards — same order as the
  // legacy's updateOrder(['invoice_id' => ...]).
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
    description: input.description,
  };
}

/**
 * The buyer's own listings.
 *
 * Every Buy form needs this list, and every one of them must check the posted listing belongs to
 * the buyer — otherwise an order can be attached to someone else's business by posting their id.
 */
export async function getBuyerListings(
  context: EventMemberContext
): Promise<{ id: number; title: string }[]> {
  return (await prisma.find_listings.findMany({
    where: { user_id: context.userId },
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  })) as { id: number; title: string }[];
}

/** True when this listing is the buyer's. */
export async function ownsListing(context: EventMemberContext, listingId: number): Promise<boolean> {
  const listing = await prisma.find_listings.findFirst({
    where: { id: listingId, user_id: context.userId },
    select: { id: true },
  });
  return Boolean(listing);
}
