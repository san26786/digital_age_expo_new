import { prisma } from "@/lib/prisma";
import type { EventMemberContext } from "@/lib/services/eventAccess";

/**
 * ---------------------------------------------------------------------------
 * Event invoices.
 * ---------------------------------------------------------------------------
 *
 * NO `include` ANYWHERE IN HERE, deliberately.
 *
 * schema.prisma was introspected from a database whose tables carry no foreign keys, so not one
 * of these models has a relation field — `find_invoices` is a flat list of scalars, and so are
 * `find_orders` and `find_listings`. The previous version asked for
 *
 *     include: { find_orders: { include: { find_listings: true } }, find_users: true }
 *
 * which threw at runtime:
 *
 *     Unknown field `find_orders` for include statement on model `find_invoices`
 *
 * TypeScript never caught it because `prisma` is exported as `any`. The joins are therefore done
 * here: fetch the invoices, collect the ids they point at, fetch each related table once, and
 * stitch. Three extra queries for the whole page rather than three per row.
 */

export interface EventInvoiceItem {
  id: number;
  orderId: number | null;
  orderNumber: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  businessName: string | null;
  type: string;
  amount: number;
  totalPayable: number;
  date: Date | null;
  status: string;
  used: boolean;
  paymentSubmitted: boolean;
  gatewayId: string | null;
  listingId: number | null;
  typeId: number | null;
}

/** Unique, non-null, non-zero ids — 0 is the legacy's "unset", and would match row id 0 nowhere. */
function ids(values: (number | null | undefined)[]): number[] {
  return [...new Set(values.filter((v): v is number => typeof v === "number" && v > 0))];
}

export async function getEventInvoices(
  context: EventMemberContext,
  filters?: { keyword?: string; option?: string; orderType?: string }
): Promise<EventInvoiceItem[]> {
  const eventId = context.eventId;

  const invoices = await prisma.find_invoices.findMany({
    where: {
      event_id: eventId,
      ...(filters?.option === "paid" ? { status: "paid" } : {}),
      ...(filters?.option === "unpaid" ? { status: "unpaid" } : {}),
    },
    orderBy: { id: "desc" },
    take: 100,
  });

  if (invoices.length === 0) return [];

  const orderKeys = ids(invoices.map((inv: any) => inv.order_id));
  const userIds = ids(invoices.map((inv: any) => inv.user_id));

  /*
   * `find_invoices.order_id` is matched against BOTH `find_orders.order_id` and `find_orders.id`.
   *
   * Without foreign keys there is nothing in the schema that says which one it references, and
   * the two are different numbers. `order_id` is the better candidate — it is the same column
   * name and is @unique on find_orders, i.e. the natural key other tables were built to quote —
   * so it wins when both match. Looking up both is what stops the whole Order column silently
   * rendering blank if the legacy actually stored the surrogate id.
   */
  const orders = orderKeys.length
    ? await prisma.find_orders.findMany({
        where: { OR: [{ order_id: { in: orderKeys } }, { id: { in: orderKeys } }] },
        select: {
          id: true,
          order_id: true,
          total_payable: true,
          used: true,
          order_listing_id: true,
          type_id: true,
        },
      })
    : [];

  const orderByKey = new Map<number, any>();
  for (const o of orders as any[]) orderByKey.set(o.id, o);
  // Second pass so an order_id match overwrites an id match on the same key, never the reverse.
  for (const o of orders as any[]) orderByKey.set(o.order_id, o);

  const listingIds = ids((orders as any[]).map((o) => o.order_listing_id));

  const [users, listings] = await Promise.all([
    userIds.length
      ? prisma.find_users.findMany({
          where: { id: { in: userIds } },
          select: {
            id: true,
            user_first_name: true,
            user_last_name: true,
            user_email: true,
            user_phone: true,
          },
        })
      : [],
    listingIds.length
      ? prisma.find_listings.findMany({
          where: { id: { in: listingIds } },
          select: { id: true, title: true },
        })
      : [],
  ]);

  const userById = new Map<number, any>((users as any[]).map((u) => [u.id, u]));
  const listingById = new Map<number, any>((listings as any[]).map((l) => [l.id, l]));

  return invoices.map((inv: any): EventInvoiceItem => {
    const user = inv.user_id ? userById.get(inv.user_id) : null;
    const order = inv.order_id ? orderByKey.get(inv.order_id) : null;
    const listing = order?.order_listing_id ? listingById.get(order.order_listing_id) : null;

    const name = user
      ? `${user.user_first_name ?? ""} ${user.user_last_name ?? ""}`.trim() || "Guest User"
      : "Guest User";

    return {
      id: inv.id,
      orderId: inv.order_id ?? null,
      // order_id is an Int on find_orders; the display column is a string, hence String().
      orderNumber: order?.order_id ? String(order.order_id) : `#${inv.id}`,
      name,
      email: user?.user_email ?? null,
      phone: user?.user_phone ?? null,
      businessName: listing?.title ?? inv.type ?? "Business",
      type: inv.type ?? "invoice",
      amount: Number(inv.subtotal ?? inv.total ?? 0),
      totalPayable: Number(order?.total_payable ?? inv.total ?? 0),
      date: inv.date ?? null,
      status: inv.status ?? "unpaid",
      // `used` is an Int flag (0/1) on find_orders, not a boolean column.
      used: Boolean(order?.used),
      paymentSubmitted: Boolean(inv.payment_submitted),
      gatewayId: inv.gateway_id ?? null,
      listingId: order?.order_listing_id ?? null,
      typeId: order?.type_id ?? null,
    };
  });
}
