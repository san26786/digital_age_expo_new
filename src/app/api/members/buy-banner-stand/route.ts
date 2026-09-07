import { NextResponse } from "next/server";
import { z } from "zod";
import { requireEventMember } from "@/lib/auth/requireEventMember";
import {
  getBannerStandFormOptions,
  createBannerStandPurchase,
} from "@/lib/services/eventBannerStandPurchase";

/**
 * Backs the Choose Banner Stand Payment form.
 *
 * Any signed-in member can buy — advertise.php only calls authenticate() for this branch, since
 * it is a member purchasing a banner stand for their own business rather than an organiser
 * administering anything.
 */

const purchaseSchema = z.object({
  option_ids: z
    .array(z.coerce.number().int().positive())
    .min(1, "Tick at least one banner stand option.")
    // A sane ceiling: this list is a handful of checkboxes, so a request naming hundreds is not a
    // buyer, and each id costs a lookup.
    .max(20, "Too many options selected."),
  listing_id: z.coerce.number().int().positive("Choose the listing this applies to."),
});

export async function GET(request: Request) {
  const context = await requireEventMember(request);
  if ("error" in context) return context.error;

  return NextResponse.json(await getBannerStandFormOptions(context));
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

  // No price in the payload — the service reads every price from find_fields itself.
  const result = await createBannerStandPurchase(context, {
    // De-duplicated: the same option posted twice would otherwise be charged twice.
    optionIds: Array.from(new Set(parsed.data.option_ids)),
    listingId: parsed.data.listing_id,
  });

  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ success: true, ...result });
}
