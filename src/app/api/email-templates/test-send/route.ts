import { NextResponse } from "next/server";
import { z } from "zod";
import { canEditEmailTemplates } from "@/lib/email/editorAccess";
import { sendMail, isMailConfigured } from "@/lib/email/mailer";
import { applySignature, resolveMailTransport } from "@/lib/email/siteMailSettings";
import { interpolateSample } from "@/lib/email/emailBlocks";

const Body = z.object({
  to: z.string().email("That does not look like an email address."),
  subject: z.string().max(500).default(""),
  html: z.string().max(200_000).default(""),
});

/**
 * Send the thing on screen to one address, right now.
 *
 * ---------------------------------------------------------------------------
 *  IT SENDS WHAT IS IN THE EDITOR, NOT WHAT IS IN THE DATABASE
 * ---------------------------------------------------------------------------
 *
 *  Deliberate, and stated on the button: the point of a test is to check the thing you have just
 *  written, before committing it. Reading the stored row instead would make "send test" useless
 *  for the only moment anyone wants it.
 *
 *  Placeholders are filled with the same sample values the preview uses, so the mail that arrives
 *  says "Hello Alex" rather than "Hello {{first_name}}" — an email full of raw placeholders tells
 *  you nothing about whether the template reads well.
 *
 *  A missing SMTP configuration comes back as its own message. Nodemailer's own failure here is
 *  an opaque connection error, and "the test could not be sent" would send somebody looking for a
 *  bug in their template.
 */
export async function POST(request: Request) {
  if (!(await canEditEmailTemplates())) {
    return NextResponse.json({ ok: false, error: "Not permitted." }, { status: 403 });
  }

  if (!(await isMailConfigured())) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "No mailbox is configured — set this site's SMTP details on the Send Queue screen, or SMTP_HOST, SMTP_USER and SMTP_PASS in .env.",
      },
      { status: 503 }
    );
  }

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Check the address and try again." },
      { status: 400 }
    );
  }

  try {
    await sendMail({
      // A test is not a send: it must not land in the record of real mail, and a typo in the
      // "send test to" box must not suppress a real recipient's address.
      log: false,
      to: parsed.data.to,
      subject: `[Test] ${interpolateSample(parsed.data.subject) || "(no subject)"}`,
      html: applySignature(
        interpolateSample(parsed.data.html),
        (await resolveMailTransport())?.signatureHtml ?? ""
      ),
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[email-templates] test send failed", error);
    return NextResponse.json(
      { ok: false, error: "The mail server refused the message. Check the SMTP settings and the address." },
      { status: 502 }
    );
  }
}
