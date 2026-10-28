import { NextResponse } from "next/server";
import { z } from "zod";
import { requireEventMember } from "@/lib/auth/requireEventMember";
import { prisma } from "@/lib/prisma";
import { sendTemplatedEmail } from "@/lib/email/sendTemplatedEmail";
import { getBrand } from "@/lib/brand";

const schema = z.object({
  ids: z.array(z.number()).min(1, "Select at least one speaker"),
  templateId: z.string().min(1, "Choose an email template"),
});

/**
 * Sends one templated email per selected speaker.
 *
 * A direct counterpart of the exhibitor and sponsor routes, deliberately down to the details:
 * sends are sequential rather than fanned out with Promise.all, because SMTP relays rate-limit
 * and a burst of parallel connections is the reliable way to get a batch rejected partway
 * through; and the result reports `sent`/`failed` counts plus the first reason rather than a
 * blanket success, because "smtp_not_configured" is indistinguishable from a successful send
 * otherwise.
 *
 * find_speakers carries both a single `name` column and first/last - the legacy importer fills
 * whichever the source had - so the greeting variables fall back through all three rather than
 * addressing somebody as "Hi ,".
 */
export async function POST(request: Request) {
  const context = await requireEventMember();
  if ("error" in context) return context.error;

  if (context.role !== "organiser") {
    return NextResponse.json({ error: "Only the event organiser can send speaker mail." }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const fields = parsed.error.flatten().fieldErrors;
    const first = Object.values(fields).find((m) => Array.isArray(m) && m.length > 0)?.[0];
    return NextResponse.json({ error: first ?? "Invalid payload" }, { status: 400 });
  }

  // Scoped by event as well as id, so one organiser cannot mail another event's speakers by
  // posting guessed ids.
  const speakers = await prisma.find_speakers.findMany({
    where: { id: { in: parsed.data.ids }, event_id: context.eventId },
    select: { id: true, email: true, name: true, first_name: true, last_name: true, business: true },
  });

      /*
       * The site these are being sent from. The builder offers {{site_name}} and {{site_url}}
       * chips, and find_email_templates is shared by every site on the platform, so a template
       * naming its show in prose is wrong on every other site that uses it. Supplying them here
       * is what makes the neutral spelling possible — without them the token is left in the body
       * as literal text, which is worse than either.
       */

  const brand = await getBrand();

  let sent = 0;
  let failed = 0;
  let firstReason: string | null = null;

  for (const speaker of speakers) {
    const to = (speaker.email ?? "").trim();
    if (!to) {
      failed += 1;
      firstReason ??= "no_email_address";
      continue;
    }

    const full = (speaker.name ?? "").trim()
      || `${speaker.first_name ?? ""} ${speaker.last_name ?? ""}`.trim();
    const firstName = (speaker.first_name ?? "").trim() || full.split(" ")[0] || "";

    const result = await sendTemplatedEmail(
      parsed.data.templateId,
      {
        first_name: firstName,
        last_name: (speaker.last_name ?? "").trim(),
        name: full,
        business: speaker.business ?? "",
        email: to,
        site_name: brand.name,
        site_url: `https://${brand.host}`,
      },
      { to },
    );

    if (result.sent) sent += 1;
    else {
      failed += 1;
      firstReason ??= result.reason ?? "send_failed";
    }
  }

  const missing = parsed.data.ids.length - speakers.length;
  return NextResponse.json({ success: true, sent, failed, missing, reason: firstReason });
}
