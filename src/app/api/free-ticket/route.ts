import { NextResponse } from "next/server";
import { getDomain } from "@/lib/services/domain";
import { createFreeTicketRsvp, findFreeTicketConflict } from "@/lib/services/freeTicket";
import { sendRegistrationEmail } from "@/lib/email/sendRegistrationEmail";
import { freeTicketSchema } from "@/lib/validations/freeTicket";

/**
 * The visitor confirmation. Unlike the other three this one genuinely IS confirmed rather than
 * pending — nobody approves a free ticket — so its stored wording says "You are registered!"
 * instead of "we have received your application". Editable at /hub/email-templates.
 */
const TEMPLATE_ID = "ticket_confirmation";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = freeTicketSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const domain = await getDomain();
  if (!domain.event_id) {
    return NextResponse.json({ error: "No event is configured for this site." }, { status: 400 });
  }

  const conflict = await findFreeTicketConflict(domain.event_id, parsed.data.email);
  if (conflict) {
    return NextResponse.json({ error: "You have already claimed a free ticket with this email." }, { status: 409 });
  }

  const rsvp = await createFreeTicketRsvp(domain.event_id, parsed.data);

  const emailed = await sendRegistrationEmail(
    TEMPLATE_ID,
    {
      email: parsed.data.email,
      first_name: parsed.data.first_name,
      last_name: parsed.data.last_name,
      business: parsed.data.business,
      position: parsed.data.position,
    },
    "free-ticket"
  );

  return NextResponse.json({ success: true, id: rsvp.id, emailed });
}
