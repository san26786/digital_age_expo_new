import { NextResponse } from "next/server";
import { z } from "zod";
import { requireEventMember } from "@/lib/auth/requireEventMember";
import {
  getSpeakerSlotFormOptions,
  createSpeakerSlotPurchase,
} from "@/lib/services/eventSpeakerSlotPurchase";

/**
 * Backs the Choose Speaker Slot Payment form.
 *
 * Any signed-in member can buy — advertise.php only calls authenticate() for this, since it is a
 * member purchasing a slot for their own business rather than an organiser administering
 * anything.
 */

const purchaseSchema = z.object({
  slot_id: z.coerce.number().int().positive("Choose a speaker slot."),
  listing_id: z.coerce.number().int().positive("Choose the listing this applies to."),
});

export async function GET(request: Request) {
  const context = await requireEventMember(request);
  if ("error" in context) return context.error;

  return NextResponse.json(await getSpeakerSlotFormOptions(context));
}

export async function POST(request: Request) {
  const context = await requireEventMember(request);
  if ("error" in context) return context.error;

  const body = await request.json().catch(() => null);
  const parsed = purchaseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Please complete the form." },
      { status: 400 }
    );
  }

  // No price in the payload — the service reads it from find_fields.
  const result = await createSpeakerSlotPurchase(context, {
    slotId: parsed.data.slot_id,
    listingId: parsed.data.listing_id,
  });

  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ success: true, ...result });
}
