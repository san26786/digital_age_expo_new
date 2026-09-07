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
 * Buy Speaker Slot — "Choose Speaker Slot Payment".
 * ---------------------------------------------------------------------------
 *
 * Ports the `type=speaker_slot` branch of advertise.php: pick a slot, pick the listing it belongs
 * to, pay.
 *
 * WHERE THE SLOTS COME FROM. Not a table of its own — they are custom fields in
 * `find_fields` under GROUP 21, which is how the legacy builds this form
 * (`Fields->addToForm($form, 'speaker_slot')`) and how it prices the result:
 *
 *     SELECT id, name, selected FROM find_fields WHERE group_id = 21
 *     ... $price[] = $fieldList['selected'] for each chosen option
 *
 * So `name` is the slot's label ("Business Speakers Slot") and `selected` is its price as TEXT.
 *
 * NOT PORTED: the `find_speaker_slot` row the legacy also inserts. That table is not in
 * schema.prisma. It records which options were ticked; the order and invoice carry the money, and
 * both are complete without it. The chosen field id is used as the order's type_id so the
 * purchase still names what was bought.
 */

/** The find_fields group the legacy reads speaker slot options from. */
const SPEAKER_SLOT_GROUP_ID = 21;

export interface SpeakerSlotOption {
  id: number;
  name: string;
  price: number;
}

export interface SpeakerSlotFormOptions {
  slots: SpeakerSlotOption[];
  listings: { id: number; title: string }[];
}

/**
 * `selected` is a varchar, so it can hold "200", "£200", "200.00" or junk. Anything that is not a
 * usable number is treated as 0 rather than NaN — a NaN would propagate into the invoice total.
 */
function priceOf(value: string | null | undefined): number {
  if (!value) return 0;
  const n = Number(String(value).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export async function getSpeakerSlotFormOptions(
  context: EventMemberContext
): Promise<SpeakerSlotFormOptions> {
  const [fields, listings] = await Promise.all([
    prisma.find_fields.findMany({
      where: { group_id: SPEAKER_SLOT_GROUP_ID },
      select: { id: true, name: true, selected: true },
      orderBy: { ordering: "asc" },
    }),
    getBuyerListings(context),
  ]);

  return {
    slots: (fields as any[]).map((f): SpeakerSlotOption => ({
      id: f.id,
      name: f.name,
      price: priceOf(f.selected),
    })),
    listings,
  };
}

export interface SpeakerSlotPurchaseInput {
  slotId: number;
  listingId: number;
}

export async function createSpeakerSlotPurchase(
  context: EventMemberContext,
  input: SpeakerSlotPurchaseInput
): Promise<AdvertiseOrderResult | { error: string }> {
  /*
   * Scoped to group 21 on purpose. find_fields holds every custom field on the platform, so
   * looking one up by id alone would let any field — a banner stand option, an artwork extra —
   * be bought at its own price through the speaker slot form.
   */
  const slot = await prisma.find_fields.findFirst({
    where: { id: input.slotId, group_id: SPEAKER_SLOT_GROUP_ID },
    select: { id: true, name: true, selected: true },
  });
  if (!slot) return { error: "That speaker slot is no longer available." };

  if (!(await ownsListing(context, input.listingId))) {
    return { error: "Choose one of your own listings." };
  }

  return raiseOrderAndInvoice(context, {
    type: "speaker_slot",
    typeId: slot.id,
    listingId: input.listingId,
    // Read from the database, never from the request.
    subtotal: priceOf(slot.selected),
    description: slot.name,
    invoiceDescription: "Speaker Slot Payment",
  });
}
