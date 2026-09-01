import { NextResponse } from "next/server";
import { z } from "zod";
import { requireEventMember } from "@/lib/auth/requireEventMember";
import { prisma } from "@/lib/prisma";
import { sendTemplatedEmail } from "@/lib/email/sendTemplatedEmail";

const schema = z.object({
  ids: z.array(z.number()).min(1, "Select at least one exhibitor"),
  templateId: z.string().min(1, "Choose an email template"),
});

/**
 * Sends one templated email per selected exhibitor — the "Send Mail" button beside the template
 * dropdown, mirroring view_visitor.php's `mail_submit` branch.
 *
 * Sends are sequential rather than fanned out with Promise.all: SMTP relays rate-limit, and a
 * burst of parallel connections is the reliable way to get a batch rejected partway through.
 *
 * A partial result is reported honestly — `sent` and `failed` counts plus the first reason —
 * rather than a blanket success, because "smtp_not_configured" looks identical to a successful
 * send from the caller's point of view otherwise.
 */
export async function POST(request: Request) {
  const context = await requireEventMember();
  if ("error" in context) return context.error;

  if (context.role !== "organiser") {
    return NextResponse.json({ error: "Only the event organiser can send exhibitor mail." }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const fields = parsed.error.flatten().fieldErrors;
    const first = Object.values(fields).find((m) => Array.isArray(m) && m.length > 0)?.[0];
    return NextResponse.json({ error: first ?? "Invalid payload" }, { status: 400 });
  }

  // Scoped by event as well as id, so one organiser cannot mail another event's exhibitors by
  // posting guessed ids.
  const exhibitors = await prisma.find_event_exhibitor.findMany({
    where: { id: { in: parsed.data.ids }, event_id: context.eventId },
    select: { id: true, email: true, first_name: true, last_name: true, business: true },
  });

  let sent = 0;
  let failed = 0;
  let firstReason: string | null = null;

  for (const exhibitor of exhibitors) {
    const to = (exhibitor.email ?? "").trim();
    if (!to) {
      failed += 1;
      firstReason ??= "no_email_address";
      continue;
    }

    const result = await sendTemplatedEmail(
      parsed.data.templateId,
      {
        first_name: exhibitor.first_name ?? "",
        last_name: exhibitor.last_name ?? "",
        name: `${exhibitor.first_name ?? ""} ${exhibitor.last_name ?? ""}`.trim(),
        business: exhibitor.business ?? "",
        email: to,
      },
      { to },
    );

    if (result.sent) sent += 1;
    else {
      failed += 1;
      firstReason ??= result.reason ?? "send_failed";
    }
  }

  const missing = parsed.data.ids.length - exhibitors.length;
  return NextResponse.json({ success: true, sent, failed, missing, reason: firstReason });
}
