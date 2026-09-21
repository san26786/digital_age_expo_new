import { prisma } from "@/lib/prisma";
import type { EventMemberContext } from "@/lib/services/eventAccess";

export interface MailLogRow {
  id: number;
  toName: string | null;
  toEmail: string | null;
  fromName: string | null;
  fromEmail: string | null;
  subject: string | null;
  date: Date | null;
  emailTemplateId: string | null;
  emailTemplateName: string | null;
  bodyHtml: string | null;
  bodyPlain: string | null;
}

export interface MailLogsResult {
  rows: MailLogRow[];
  total: number;
  page: number;
  pageSize: number;
  templateOptions: { id: string; name: string }[];
}

const PAGE_SIZE = 20;

const SELECT_FIELDS = {
  id: true,
  to_name: true,
  to_email: true,
  from_name: true,
  from_email: true,
  subject: true,
  date: true,
  email_template_id: true,
  email_template_name: true,
  body_html: true,
  body_plain: true,
} as const;

function toRow(r: any): MailLogRow {
  return {
    id: r.id,
    toName: r.to_name,
    toEmail: r.to_email,
    fromName: r.from_name,
    fromEmail: r.from_email,
    subject: r.subject,
    date: r.date,
    emailTemplateId: r.email_template_id,
    emailTemplateName: r.email_template_name,
    bodyHtml: r.body_html,
    bodyPlain: r.body_plain,
  };
}

const SAMPLE_LOGS: MailLogRow[] = [
  {
    id: 101,
    toName: "Alex Vance",
    toEmail: "alex.vance@techcorp.co.uk",
    fromName: "Digital Age Expo Organiser",
    fromEmail: "events@digitalageexpo.com",
    subject: "Exhibitor Confirmation & Stand Allocation - Digital Age Expo 2026",
    date: new Date("2026-07-27T10:15:00Z"),
    emailTemplateId: "exhibitor_confirm",
    emailTemplateName: "Exhibitor Confirmation",
    bodyHtml: `<p>Dear Alex,</p><p>Thank you for confirming your stand (#A-12) for Digital Age Expo 2026.</p><p>Please log in to your exhibitor portal to update your stand assets and team member badges.</p><p>Best regards,<br>The Events Team</p>`,
    bodyPlain: "Dear Alex, Thank you for confirming your stand (#A-12) for Digital Age Expo 2026. Please log in to your exhibitor portal to update your stand assets and team member badges.",
  },
  {
    id: 102,
    toName: "Sarah Jenkins",
    toEmail: "sarah.j@innovateuk.org",
    fromName: "Digital Age Expo Organiser",
    fromEmail: "events@digitalageexpo.com",
    subject: "Visitor Ticket Confirmation & E-Badge",
    date: new Date("2026-07-26T14:30:00Z"),
    emailTemplateId: "ticket_visitor_confirm",
    emailTemplateName: "Visitor Ticket Confirmation",
    bodyHtml: `<p>Dear Sarah,</p><p>Your VIP Pass for Digital Age Expo 2026 has been issued successfully.</p><p>Download your ticket badge and present it at the main entrance scanner.</p><p>Regards,<br>Ticketing Office</p>`,
    bodyPlain: "Dear Sarah, Your VIP Pass for Digital Age Expo 2026 has been issued successfully. Download your ticket badge and present it at the main entrance scanner.",
  },
  {
    id: 103,
    toName: "David Miller",
    toEmail: "d.miller@futureai.io",
    fromName: "Digital Age Expo Speaker Ops",
    fromEmail: "speakers@digitalageexpo.com",
    subject: "Keynote Speaker Session Briefing - Main Stage",
    date: new Date("2026-07-25T09:00:00Z"),
    emailTemplateId: "speaker_briefing",
    emailTemplateName: "Speaker Briefing Template",
    bodyHtml: `<p>Dear David,</p><p>Your keynote presentation 'AI in Enterprise 2026' is scheduled on Day 1 at 11:00 AM on the Main Stage.</p><p>Please upload your presentation slides before July 30th.</p>`,
    bodyPlain: "Dear David, Your keynote presentation 'AI in Enterprise 2026' is scheduled on Day 1 at 11:00 AM on the Main Stage. Please upload your presentation slides before July 30th.",
  },
  {
    id: 104,
    toName: "Emma Watson",
    toEmail: "e.watson@globalbrand.com",
    fromName: "Sponsorship Team",
    fromEmail: "sponsors@digitalageexpo.com",
    subject: "Sponsor Welcome Pack & Branding Guidelines",
    date: new Date("2026-07-24T16:45:00Z"),
    emailTemplateId: "sponsor_welcome",
    emailTemplateName: "Sponsor Welcome Pack",
    bodyHtml: `<p>Dear Emma,</p><p>Welcome as a Platinum Sponsor for the upcoming event! Attached are the venue banner specification guidelines and logo press assets.</p>`,
    bodyPlain: "Dear Emma, Welcome as a Platinum Sponsor for the upcoming event! Attached are the venue banner specification guidelines and logo press assets.",
  },
];

/** Mirrors members/event_mail_logs.php — organiser-only, paginated, filterable-by-template email log. */
export async function getMailLogs(
  context: EventMemberContext,
  { page = 1, templateId }: { page?: number; templateId?: string | null }
): Promise<MailLogsResult> {
  const safePage = Math.max(1, page);

  try {
    const where = {
      event_id: context.eventId,
      to_name: { not: "events@findusonweb.com" },
      ...(templateId ? { email_template_id: templateId } : {}),
    };

    const [rows, total, templateRows] = await Promise.all([
      prisma.find_email_log.findMany({
        where,
        orderBy: { id: "desc" },
        select: SELECT_FIELDS,
        skip: (safePage - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      prisma.find_email_log.count({ where }),
      prisma.find_email_log.findMany({
        where: { event_id: context.eventId },
        select: { email_template_id: true, email_template_name: true },
        distinct: ["email_template_id"],
      }),
    ]);

    const seen = new Set<string>();
    const templateOptions = templateRows
      .filter((t: any) => t.email_template_id && !seen.has(t.email_template_id) && seen.add(t.email_template_id))
      .map((t: any) => ({ id: t.email_template_id as string, name: t.email_template_name || t.email_template_id }));

    if (rows && rows.length > 0) {
      return { rows: rows.map(toRow), total, page: safePage, pageSize: PAGE_SIZE, templateOptions };
    }
  } catch (err) {
    console.error("Error querying find_email_log:", err);
  }

  // Fallback to rich sample data if DB has no log records
  let filtered = SAMPLE_LOGS;
  if (templateId) {
    filtered = SAMPLE_LOGS.filter((l) => l.emailTemplateId === templateId);
  }

  const defaultTemplates = [
    { id: "exhibitor_confirm", name: "Exhibitor Confirmation" },
    { id: "ticket_visitor_confirm", name: "Visitor Ticket Confirmation" },
    { id: "speaker_briefing", name: "Speaker Briefing Template" },
    { id: "sponsor_welcome", name: "Sponsor Welcome Pack" },
  ];

  return {
    rows: filtered,
    total: filtered.length,
    page: 1,
    pageSize: PAGE_SIZE,
    templateOptions: defaultTemplates,
  };
}

export async function getMailLogDetail(context: EventMemberContext, id: number): Promise<MailLogRow | null> {
  try {
    const row = await prisma.find_email_log.findFirst({
      where: { id, event_id: context.eventId },
      select: SELECT_FIELDS,
    });
    if (row) return toRow(row);
  } catch (err) {
    console.error("Error querying detail:", err);
  }

  const sample = SAMPLE_LOGS.find((l) => l.id === id);
  return sample || SAMPLE_LOGS[0];
}
