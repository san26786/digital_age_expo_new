import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDomain } from "@/lib/services/domain";
import { sendRegistrationEmail } from "@/lib/email/sendRegistrationEmail";
import { speakerRegistrationSchema } from "@/lib/validations/speakerRegistration";

/** Editable at /hub/email-templates — the wording is the organiser's, not the deploy's. */
const TEMPLATE_ID = "speaker_confirmation";

/** Legacy TIME columns store a time-of-day with no meaningful date part.
 * A real slot gets assigned by an admin once the speaker is scheduled. */
const UNSCHEDULED_TIME = new Date("1970-01-01T00:00:00Z");

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = speakerRegistrationSchema.safeParse(body);

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
    email,
    phone,
    business,
    position,
    linkedin_user_profile,
  } = parsed.data;

  // Check if speaker with this email already registered for this event
  const existing = await prisma.find_speakers.findFirst({
    where: {
      event_id: domain.event_id,
      email: email,
    },
  });

  if (existing) {
    return NextResponse.json(
      { error: "A speaker application with this email address already exists." },
      { status: 409 }
    );
  }

  const speaker = await prisma.find_speakers.create({
    data: {
      event_id: domain.event_id,
      exhibitor_user_id: "",
      speaker_price: 0,
      profile_pic: "",
      name: `${first_name} ${last_name}`,
      first_name,
      last_name,
      email,
      phone,
      business,
      position: position || null,
      linkedin_user_profile: linkedin_user_profile || null,
      date: new Date(),
      start_time: UNSCHEDULED_TIME,
      end_time: UNSCHEDULED_TIME,
      status: "pending",
    },
    select: { id: true },
  });

  /*
   * Sent before the questionnaire, deliberately.
   *
   * The response redirects to /speaker-questionaire, which many people will not finish in one
   * sitting. Waiting until the questionnaire is submitted would mean the ones who drop out get
   * nothing at all, with no record in their inbox that they applied.
   */
  const emailed = await sendRegistrationEmail(
    TEMPLATE_ID,
    { email, first_name, last_name, business, position },
    "speaker-registration"
  );

  return NextResponse.json({
    success: true,
    id: speaker.id,
    emailed,
    nextUrl: `/speaker-questionaire?speaker_id=${speaker.id}`,
  });
}

