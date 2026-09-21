import { getBrand } from "@/lib/brand";
import { sendTemplatedEmail } from "./sendTemplatedEmail";
import { ensureDefaultTemplates } from "@/lib/cp/email/emailTemplatesRepository";

/**
 * ===========================================================================
 *  THE "WE GOT YOUR APPLICATION" EMAIL, FOR ALL FOUR PUBLIC FORMS
 * ===========================================================================
 *
 *  Exhibitor, speaker, sponsor and free-ticket registration each create a row and then owe the
 *  person a confirmation. The sending part is identical every time — the same variables, the same
 *  seeding retry, the same refusal to let a mail problem break a registration — so it lives here
 *  once rather than as four copies that drift the first time any one of them is touched.
 *
 *  ---------------------------------------------------------------------------
 *  IT RETURNS A BOOLEAN AND NEVER THROWS
 *  ---------------------------------------------------------------------------
 *
 *  By the time this is called the row is already written, and the row is the thing that matters.
 *  An application recorded whose email bounced is an annoyance; an application REJECTED because
 *  SMTP was misconfigured is a lost exhibitor, speaker or sponsor. So every failure is logged with
 *  its reason and reported back as `false`, and the caller responds with success either way.
 *
 *  ---------------------------------------------------------------------------
 *  THE SEEDING RETRY IS NOT PARANOIA
 *  ---------------------------------------------------------------------------
 *
 *  ensureDefaultTemplates() runs only when somebody opens the email templates screen, so on a
 *  fresh database these templates can genuinely not exist yet. Seeding on every registration would
 *  be ten queries on a ten-connection pool for rows that are almost always there. Seeding only
 *  when a send reports the template missing costs nothing in the normal case, and means the first
 *  person through the form still gets their email.
 */

export interface RegistrationRecipient {
  email: string;
  first_name: string;
  last_name: string;
  business?: string | null;
  position?: string | null;
}

export async function sendRegistrationEmail(
  templateId: string,
  recipient: RegistrationRecipient,
  /** Named in the log line when a send fails, so the warning says which form it came from. */
  context: string
): Promise<boolean> {
  const brand = await getBrand();

  const variables = {
    first_name: recipient.first_name,
    last_name: recipient.last_name,
    name: `${recipient.first_name} ${recipient.last_name}`.trim(),
    email: recipient.email,
    business: recipient.business?.trim() || "",
    position: recipient.position?.trim() || "",
    site_name: brand.name,
    site_url: `https://${brand.host}`,
  };

  let result = await sendTemplatedEmail(templateId, variables, { to: recipient.email });

  if (!result.sent && result.reason === "template_not_found") {
    await ensureDefaultTemplates();
    result = await sendTemplatedEmail(templateId, variables, { to: recipient.email });
  }

  if (!result.sent) {
    console.warn(
      `[${context}] confirmation email not sent to ${recipient.email} (template "${templateId}"): ${result.reason}`,
      "error" in result ? result.error : undefined
    );
  }

  return result.sent;
}
