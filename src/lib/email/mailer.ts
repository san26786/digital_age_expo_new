import nodemailer, { type Transporter } from "nodemailer";
import { resolveMailTransport, type ResolvedMailTransport } from "./siteMailSettings";
import { resolveSiteId } from "@/lib/tenant";
import { classifyBounce, recordBounce, recordSend } from "./emailLog";

/**
 * Single shared SMTP transport, built from the SMTP_* env vars already documented in .env
 * ("Outbound email (password reset). Required for /forgot-password to actually deliver a
 * code — leave unset and that endpoint will return a clear error instead of failing
 * silently."). This module is what makes that promise real: isSmtpConfigured()/getTransport()
 * fail with one specific, readable error instead of nodemailer failing later with an opaque
 * connection error when SMTP_HOST is blank (the shipped .env default).
 *
 * Requires the `nodemailer` package — add it with `npm install nodemailer @types/nodemailer`
 * (already added to package.json's dependencies; this cloud sandbox has no network access to
 * your machine, so the actual `npm install` has to run on your side).
 */

/**
 * ===========================================================================
 *  ONE TRANSPORT PER MAILBOX, NOT ONE PER PROCESS
 * ===========================================================================
 *
 *  This used to be a single module-level transport built from the SMTP_* environment variables,
 *  which was right while one mailbox sent everything. Sites can now carry their own (see
 *  siteMailSettings.ts), so the cache is keyed by the connection rather than being a singleton —
 *  otherwise the first site to send would have lent its mailbox to every other site for the life
 *  of the process, which is the multi-tenancy bug that looks like a caching oddity.
 *
 *  Still cached, because a transport holds a connection pool and building one per email is how a
 *  bulk send turns into a few hundred TCP handshakes.
 */
const transports = new Map<string, Transporter>();

/** True when the ENVIRONMENT mailbox is configured. Sites may have their own regardless. */
export function isSmtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

/** True when THIS site can send — its own mailbox, or the environment's as a fallback. */
export async function isMailConfigured(siteId?: number): Promise<boolean> {
  return (await resolveMailTransport(siteId)) !== null;
}

function getTransport(config: ResolvedMailTransport): Transporter {
  const key = `${config.host}:${config.port}:${config.username}:${config.secure ? 1 : 0}`;
  const existing = transports.get(key);
  if (existing) return existing;

  const transport = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    // The standard convention: 465 is implicit TLS, 587/25 use STARTTLS.
    secure: config.secure && config.port === 465,
    auth: { user: config.username, pass: config.password },
  });

  transports.set(key, transport);
  return transport;
}

export interface SendMailInput {
  /** Whose mailbox to send from. Omitted, it resolves from the request's host. */
  siteId?: number;
  /** Recorded against the log and the bounce, so a failure can be traced to a template. */
  templateId?: string | null;
  eventId?: number | null;
  /** Set false for a test send, which should not clutter the record of real mail. */
  log?: boolean;
  to: string;
  subject: string;
  html: string;
  text?: string;
  cc?: string;
  bcc?: string;
  replyTo?: string;
  fromName?: string;
  fromAddress?: string;
}

/**
 * Low-level send — one email, no template lookup. Throws on failure (nothing configured, auth
 * error, etc.); callers that shouldn't ever throw (e.g. a registration flow's welcome email)
 * should use sendTemplatedEmail() instead, which catches this.
 *
 * WHAT WINS OVER WHAT, and the order is deliberate: an address the caller passed explicitly beats
 * the site's configured one, which beats the mailbox's own username. A template with its own
 * from_address has said something specific; the site setting is the default for everything that
 * has not.
 */
export async function sendMail(input: SendMailInput): Promise<void> {
  const config = await resolveMailTransport(input.siteId);
  if (!config) {
    throw new Error(
      "No mailbox is configured — set this site's SMTP details on the Send Queue screen, or " +
        "SMTP_HOST, SMTP_USER and SMTP_PASS in .env."
    );
  }

  const transport = getTransport(config);
  const fromAddress = input.fromAddress || config.fromAddress;
  const from = input.fromName ? `"${input.fromName}" <${fromAddress}>` : fromAddress;

  /*
   * ---------------------------------------------------------------------------
   *  THE SEND IS RECORDED EITHER WAY, AND NEITHER RECORD CAN BREAK THE SEND
   * ---------------------------------------------------------------------------
   *
   *  An SMTP server that refuses a recipient does so DURING the conversation, before accepting
   *  the message — unknown mailbox, domain that does not resolve, sender blocked. nodemailer
   *  turns that into a throw carrying the server's own response code, which is the most reliable
   *  bounce signal there is: it is the mail server saying, in its own words, that this address
   *  did not work.
   *
   *  So the catch records it and rethrows. Callers see exactly the failure they saw before this
   *  existed; the difference is that the address is now on record, and a permanent failure will
   *  stop the next send to it rather than being repeated until the sending domain is in trouble.
   */
  try {
    await transport.sendMail({
      from,
      to: input.to,
      cc: input.cc || undefined,
      bcc: input.bcc || undefined,
      replyTo: input.replyTo || config.replyTo || undefined,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
  } catch (error) {
    if (input.log !== false) {
      const bounce = classifyBounce(error);
      await recordBounce(input.siteId ?? (await resolveSiteId()), input.to, {
        ...bounce,
        templateId: input.templateId ?? null,
      });
    }
    throw error;
  }

  if (input.log !== false) {
    await recordSend({
      toEmail: input.to,
      fromEmail: fromAddress,
      fromName: input.fromName,
      subject: input.subject,
      bodyHtml: input.html,
      templateId: input.templateId ?? null,
      eventId: input.eventId ?? null,
    });
  }
}

