import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { safeQuery } from "@/lib/db-errors";

/**
 * ===========================================================================
 *  WHAT WAS SENT, AND WHAT CAME BACK
 * ===========================================================================
 *
 *  `find_email_log` has been in this schema the whole time and NOTHING HAS EVER WRITTEN TO IT —
 *  three services read it, the CP dashboard counts it, and every one of them has been reporting
 *  on an empty table. So "which emails sent" was not a feature that needed improving; it was a
 *  question the app could not answer at all.
 *
 *  Every send now leaves a row here, and every refusal leaves one in find_email_bounces.
 *
 *  ---------------------------------------------------------------------------
 *  TWO KINDS OF BOUNCE, AND ONLY ONE OF THEM IS VISIBLE WITHOUT IMAP
 *  ---------------------------------------------------------------------------
 *
 *  An IMMEDIATE rejection happens during the SMTP conversation: the server refuses the recipient
 *  before accepting the message — unknown mailbox, domain that does not resolve, sender blocked.
 *  nodemailer throws, this module writes the bounce, and it is recorded within milliseconds of
 *  the attempt. That is what works today, with no extra moving parts.
 *
 *  An ASYNCHRONOUS bounce happens after the server accepted the message and then failed to
 *  deliver it. It comes back hours later as a delivery report to the sending mailbox, and reading
 *  those needs an IMAP client polling that mailbox — the part of the reference design that is
 *  still a step away. The UI says which of the two it is showing rather than implying it sees
 *  both.
 *
 *  ---------------------------------------------------------------------------
 *  EVERY QUERY HERE IS WRAPPED IN safeQuery
 *  ---------------------------------------------------------------------------
 *
 *  find_email_bounces is created by prisma/email_bounces.sql, which somebody has to run. Until
 *  they do, every read returns its fallback and every write is a no-op — the app sends mail
 *  exactly as it did before, and the panel says the table is missing instead of the page dying
 *  with a Postgres 42P01. Logging must never be the reason an email does not go out.
 *
 *  The existence check is an explicit `to_regclass` probe rather than catching the 42P01, because
 *  safeQuery only swallows errors it recognises as an outage and a missing relation is not one of
 *  those — it would rethrow, straight through the page. Asking first is one cheap query and it
 *  cannot be wrong.
 */

const bouncesTableExists = cache(async function bouncesTableExists(): Promise<boolean> {
  try {
    const rows = await prisma.$queryRaw<{ present: boolean }[]>`
      SELECT to_regclass('public.find_email_bounces') IS NOT NULL AS present
    `;
    return Boolean(rows[0]?.present);
  } catch {
    return false;
  }
});

export type BounceType = "hard" | "soft";

/** One line in find_email_log. Nothing here is nullable in the table, so blanks become "". */
export interface SendLogEntry {
  toEmail: string;
  toName?: string;
  fromEmail: string;
  fromName?: string;
  subject: string;
  bodyHtml?: string;
  templateId?: string | null;
  eventId?: number | null;
  userId?: number | null;
}

export async function recordSend(entry: SendLogEntry): Promise<void> {
  await safeQuery(
    () =>
      prisma.find_email_log.create({
        data: {
          date: new Date(),
          to_email: entry.toEmail.slice(0, 765),
          to_name: (entry.toName ?? "").slice(0, 300),
          from_email: entry.fromEmail.slice(0, 765),
          from_name: (entry.fromName ?? "").slice(0, 300),
          subject: entry.subject.slice(0, 765),
          body_html: entry.bodyHtml ?? null,
          email_template_id: entry.templateId?.slice(0, 255) ?? null,
          event_id: entry.eventId ?? null,
          user_id: entry.userId ?? null,
        },
      }),
    null
  );
}

/**
 * Was this a permanent failure or a temporary one?
 *
 * Read off the SMTP response code, because that is what it is for. 5xx is permanent by
 * definition — the RFC's own word is "permanent negative completion" — and 4xx is "try again".
 * Where there is no code at all (a DNS failure, a connection refused, a timeout) the answer is
 * SOFT: those are the failures most likely to be about the network between here and there rather
 * than about the address, and suppressing a valid address because a mail server was briefly
 * unreachable is the one mistake in this module that loses real mail.
 */
export function classifyBounce(error: unknown): { type: BounceType; reason: string } {
  const source = error as { responseCode?: number; code?: string; response?: string; message?: string };

  const code = typeof source?.responseCode === "number" ? source.responseCode : null;
  const reason =
    (source?.response ?? source?.message ?? String(error ?? "Unknown error")).toString().slice(0, 500);

  if (code && code >= 500 && code < 600) return { type: "hard", reason };
  return { type: "soft", reason };
}

export async function recordBounce(
  siteId: number,
  email: string,
  bounce: { type: BounceType; reason: string; templateId?: string | null }
): Promise<void> {
  if (!(await bouncesTableExists())) return;

  try {
    await prisma.$executeRaw`
      INSERT INTO find_email_bounces ("DOMAIN", email, bounce_type, reason, email_template_id)
      VALUES (${siteId}, ${email.slice(0, 765)}, ${bounce.type}, ${bounce.reason}, ${bounce.templateId ?? null})
    `;
  } catch (error) {
    console.warn("[email] could not record a bounce", error);
  }
}

/**
 * Has this address permanently failed for this site?
 *
 * Checked before every templated send. A hard bounce means the address does not exist, and
 * continuing to mail it is how a sending domain's reputation is spent: mailbox providers count
 * repeated unknown-user attempts as a signal that the sender does not clean its list, and the
 * cost lands on everyone else's mail from the same domain.
 */
export async function isSuppressed(siteId: number, email: string): Promise<boolean> {
  if (!(await bouncesTableExists())) return false;

  const rows = await safeQuery(
    () => prisma.$queryRaw<{ n: bigint }[]>`
      SELECT count(*) AS n FROM find_email_bounces
      WHERE "DOMAIN" = ${siteId} AND bounce_type = 'hard' AND lower(email) = lower(${email})
    `,
    [] as { n: bigint }[]
  );

  return Number(rows[0]?.n ?? 0) > 0;
}

export interface BounceSummary {
  /** null when the table has not been created yet, so the UI can say so rather than show zeros. */
  available: boolean;
  hard: number;
  soft: number;
  sends: number;
  /** Percentage, or null when nothing has been sent and a rate would be a division by zero. */
  rate: number | null;
  recent: {
    email: string;
    type: BounceType;
    reason: string;
    templateId: string | null;
    detectedOn: Date;
  }[];
}

export async function getBounceSummary(siteId: number, eventId: number | null): Promise<BounceSummary> {
  const available = await bouncesTableExists();

  const [counts, sends, recent] = await Promise.all([
    available
      ? safeQuery(
          () => prisma.$queryRaw<{ bounce_type: string; n: bigint }[]>`
            SELECT bounce_type, count(*) AS n FROM find_email_bounces
            WHERE "DOMAIN" = ${siteId}
            GROUP BY bounce_type
          `,
          [] as { bounce_type: string; n: bigint }[]
        )
      : Promise.resolve([] as { bounce_type: string; n: bigint }[]),

    safeQuery(
      () => prisma.find_email_log.count(eventId ? { where: { event_id: eventId } } : undefined),
      0
    ),

    available
      ? safeQuery(
          () => prisma.$queryRaw<
            {
              email: string;
              bounce_type: string;
              reason: string | null;
              email_template_id: string | null;
              detected_on: Date;
            }[]
          >`
            SELECT email, bounce_type, reason, email_template_id, detected_on
            FROM find_email_bounces
            WHERE "DOMAIN" = ${siteId}
            ORDER BY detected_on DESC
            LIMIT 25
          `,
          []
        )
      : Promise.resolve(
          [] as {
            email: string;
            bounce_type: string;
            reason: string | null;
            email_template_id: string | null;
            detected_on: Date;
          }[]
        ),
  ]);

  const hard = Number(counts.find((row) => row.bounce_type === "hard")?.n ?? 0);
  const soft = Number(counts.find((row) => row.bounce_type === "soft")?.n ?? 0);

  return {
    available,
    hard,
    soft,
    sends,
    rate: sends > 0 ? ((hard + soft) / sends) * 100 : null,
    recent: recent.map((row) => ({
      email: row.email,
      type: row.bounce_type === "hard" ? ("hard" as BounceType) : ("soft" as BounceType),
      reason: row.reason ?? "",
      templateId: row.email_template_id,
      detectedOn: row.detected_on,
    })),
  };
}
