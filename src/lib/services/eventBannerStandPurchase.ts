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
 * Buy Banner Stand — "Choose Banner Stand Payment".
 * ---------------------------------------------------------------------------
 *
 * Ports the `type=banner_stand` branch of advertise.php: tick the banner stand options you want,
 * pick the listing they belong to, pay.
 *
 * WHERE THE OPTIONS COME FROM. Like the speaker slot form, these are not a table of their own —
 * they are custom fields rendered by `Fields->addToForm($form, 'banner_stand')`, so each row's
 * `name` is the checkbox label ("Display Banner Stand"), `description` is the small print under
 * it ("£150 per banner") and `selected` is the price as TEXT. The legacy sums `selected` across
 * every ticked option to get the total, which is what makes this a checkbox list rather than the
 * radio list the speaker slot form uses.
 *
 * THE GROUP IS RESOLVED BY TYPE, NOT BY A HARDCODED ID. The speaker slot port pins group 21
 * because that number was visible in the legacy query. Nothing here tells us the banner stand
 * group's id, and guessing wrong would not fail loudly — it would silently render a form with no
 * options and no explanation. `find_fields_groups.type` is the same string the legacy passes to
 * addToForm(), so looking the group up by it is both safer and closer to what the legacy does.
 */

/** The `find_fields_groups.type` the legacy passes to `Fields->addToForm($form, ...)`. */
const BANNER_STAND_GROUP_TYPE = "banner_stand";

export interface BannerStandOption {
  id: number;
  name: string;
  /** The small print under the checkbox — "£150 per banner". */
  description: string | null;
  price: number;
}

export interface BannerStandFormOptions {
  options: BannerStandOption[];
  listings: { id: number; title: string }[];
}

/**
 * `selected` is a varchar, so it can hold "150", "£150", "150.00" or junk. Anything that is not a
 * usable number becomes 0 rather than NaN — a NaN would propagate into the invoice total and
 * write a broken row.
 */
function priceOf(value: string | null | undefined): number {
  if (!value) return 0;
  const n = Number(String(value).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/**
 * The banner stand field group.
 *
 * Falls back to a title match so a database whose group is typed differently (the legacy's own
 * `type` values are not perfectly consistent across installs) still finds its options instead of
 * showing an empty form.
 */
async function bannerStandGroupId(): Promise<number | null> {
  const byType = await prisma.find_fields_groups.findFirst({
    where: { type: BANNER_STAND_GROUP_TYPE },
    select: { id: true },
  });
  if (byType) return byType.id;

  const byTitle = await prisma.find_fields_groups.findFirst({
    where: { title: { contains: "banner", mode: "insensitive" } },
    select: { id: true },
  });
  return byTitle?.id ?? null;
}

export async function getBannerStandFormOptions(
  context: EventMemberContext
): Promise<BannerStandFormOptions> {
  const [groupId, listings] = await Promise.all([bannerStandGroupId(), getBuyerListings(context)]);

  if (groupId === null) return { options: [], listings };

  const fields = await prisma.find_fields.findMany({
    where: { group_id: groupId, hidden: 0 },
    select: { id: true, name: true, description: true, selected: true },
    orderBy: { ordering: "asc" },
  });

  return {
    options: (fields as any[]).map((f): BannerStandOption => ({
      id: f.id,
      name: f.name,
      description: f.description ?? null,
      price: priceOf(f.selected),
    })),
    listings,
  };
}

export interface BannerStandPurchaseInput {
  /** The ticked options. The legacy allows more than one and adds their prices together. */
  optionIds: number[];
  listingId: number;
}

export async function createBannerStandPurchase(
  context: EventMemberContext,
  input: BannerStandPurchaseInput
): Promise<AdvertiseOrderResult | { error: string }> {
  if (input.optionIds.length === 0) return { error: "Tick at least one banner stand option." };

  const groupId = await bannerStandGroupId();
  if (groupId === null) return { error: "Banner stands are not set up on this platform yet." };

  /*
   * Scoped to the banner stand group on purpose. find_fields holds every custom field on the
   * platform, so looking these up by id alone would let a cheaper field from any other group —
   * or a free one — be bought through this form at its own price.
   */
  const fields = await prisma.find_fields.findMany({
    where: { id: { in: input.optionIds }, group_id: groupId },
    select: { id: true, name: true, selected: true },
  });

  // Every posted id has to resolve, or a request naming one real option and three foreign ones
  // would quietly buy just the real one while the buyer believes they bought four.
  if (fields.length !== input.optionIds.length) {
    return { error: "One of those banner stand options is no longer available." };
  }

  if (!(await ownsListing(context, input.listingId))) {
    return { error: "Choose one of your own listings." };
  }

  // Read from the database, never from the request.
  const subtotal = (fields as any[]).reduce((sum, f) => sum + priceOf(f.selected), 0);
  const description = (fields as any[]).map((f) => f.name).join(", ");

  const result = await raiseOrderAndInvoice(context, {
    type: "banner_stand",
    typeId: fields[0].id,
    listingId: input.listingId,
    subtotal,
    description,
    invoiceDescription: "Banner Stand Payment",
  });

  /*
   * The banner stand row itself, which the speaker slot port had to skip because its table is not
   * in schema.prisma. find_banner_stands IS, and it is what /members/manage_banner_stands lists —
   * without this the money would be recorded but the purchase would never appear on the screen
   * that manages it.
   *
   * A failure here must not lose the order: the order and invoice are already committed and are
   * what the buyer is charged on, so this is logged rather than thrown.
   */
  try {
    const listing = await prisma.find_listings.findFirst({
      where: { id: input.listingId },
      select: { title: true },
    });

    await prisma.find_banner_stands.create({
      data: {
        // Required, no defaults.
        event_id: context.eventId,
        user_id: context.userId,
        name: listing?.title ?? description,
        // Ex-VAT in both columns. Manage Banner Stand totals these to show what the event has
        // sold, and tax belongs on the invoice, not in a sales figure.
        amount: subtotal,

        listing_id: input.listingId,
        stand_id: fields[0].id,
        stand_price: Math.round(subtotal),
        // The order number the buyer sees on their receipt, so the two can be matched by hand.
        order_id: result.orderId,
        status: "pending",
      },
    });
  } catch (err) {
    console.error("[banner-stand] order raised but the banner stand row could not be written:", err);
  }

  return result;
}
