import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDomain } from "@/lib/services/domain";
import { sendRegistrationEmail } from "@/lib/email/sendRegistrationEmail";
import { sponsorRegistrationSchema } from "@/lib/validations/sponsorRegistration";

/** Editable at /hub/email-templates — the wording is the organiser's, not the deploy's. */
const TEMPLATE_ID = "sponsor_confirmation";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = sponsorRegistrationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const domain = await getDomain();
  if (!domain.event_id) {
    return NextResponse.json({ error: "No event is configured for this site." }, { status: 400 });
  }

  const {
    first_name,
    last_name,
    position,
    business,
    email,
    phone,
    work_phone,
    linkedin_user_profile,
    referral_source,
    referral_code,
    why_exhibit,
    is_webinars,
    is_workshops,
    is_e_magazine,
    is_newsletter,
    is_business_presentation,
    sponsorship_tier_id,
  } = parsed.data;

  const sponsor = await prisma.find_event_sponsorer.create({
    data: {
      event_id: domain.event_id,
      name: `${first_name} ${last_name}`,
      first_name,
      last_name,
      position,
      business,
      email,
      phone,
      work_phone: work_phone || null,
      linkedin_user_profile: linkedin_user_profile || null,
      referrer_from: referral_source || null,
      referral_code: referral_code || null,
      why_exhibit: why_exhibit || null,
      is_webinars: is_webinars ? 1 : 0,
      is_workshops: is_workshops ? 1 : 0,
      is_e_magazine: is_e_magazine ? 1 : 0,
      is_newsletter: is_newsletter ? 1 : 0,
      is_business_presentation: is_business_presentation ? 1 : 0,
      sponsorship_type: sponsorship_tier_id || null,
      status: "pending",
      is_approved: 0,
    },
    select: { id: true },
  });

  const emailed = await sendRegistrationEmail(
    TEMPLATE_ID,
    { email, first_name, last_name, business, position },
    "sponsor-registration"
  );

  return NextResponse.json({ success: true, id: sponsor.id, emailed });
}
