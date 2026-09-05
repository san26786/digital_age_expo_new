import { NextResponse } from "next/server";
import { z } from "zod";
import { requireEventMember } from "@/lib/auth/requireEventMember";
import {
  getSponsorshipFormOptions,
  createSponsorshipPurchase,
} from "@/lib/services/eventSponsorshipPurchase";

/**
 * Backs the Choose Sponsorship form.
 *
 * GET narrows the cascading selects; POST raises the order and invoice. Any signed-in member can
 * buy — the legacy's advertise.php only calls authenticate(), since this is a member purchasing
 * for their own business rather than an organiser administering the event.
 */

const purchaseSchema = z.object({
  sponsorship_id: z.coerce.number().int().positive("Choose a sponsorship option."),
  listing_id: z.coerce.number().int().positive("Choose the listing this applies to."),
});

export async function GET(request: Request) {
  const context = await requireEventMember(request);
  if ("error" in context) return context.error;

  const url = new URL(request.url);
  const categoryId = Number(url.searchParams.get("category_id")) || null;
  const sponsorType = url.searchParams.get("sponsor_type") || null;

  const options = await getSponsorshipFormOptions(context, { categoryId, sponsorType });
  return NextResponse.json(options);
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

  /*
   * No price in the payload, deliberately — createSponsorshipPurchase reads it from
   * find_sponsorship_categories. The form displays a List Price, and accepting one from the
   * client would let a £1,500 sponsorship be bought for £1.
   */
  const result = await createSponsorshipPurchase(context, {
    sponsorshipId: parsed.data.sponsorship_id,
    listingId: parsed.data.listing_id,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true, ...result });
}
