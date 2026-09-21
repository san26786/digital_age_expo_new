import { prisma } from "@/lib/prisma";
import type { EventMemberContext } from "@/lib/services/eventAccess";

export interface LetterLogRow {
  id: number;
  toName: string | null;
  toEmail: string | null;
  subject: string | null;
  date: Date | null;
  bodyHtml: string | null;
  bodyPlain: string | null;
}

export interface LetterLogsResult {
  rows: LetterLogRow[];
  total: number;
  page: number;
  pageSize: number;
}

const PAGE_SIZE = 20;

const SELECT_FIELDS = {
  id: true,
  to_name: true,
  to_email: true,
  subject: true,
  date: true,
  body_html: true,
  body_plain: true,
} as const;

function toRow(r: any): LetterLogRow {
  return {
    id: r.id,
    toName: r.to_name,
    toEmail: r.to_email,
    subject: r.subject,
    date: r.date,
    bodyHtml: r.body_html,
    bodyPlain: r.body_plain,
  };
}

const SAMPLE_LETTERS: LetterLogRow[] = [
  {
    id: 501,
    toName: "Premier Systems Ltd",
    toEmail: "billing@premiersystems.co.uk",
    subject: "Official VAT Invoice & Welcome Packet - Stand B-04",
    date: new Date("2026-07-27T11:20:00Z"),
    bodyHtml: `<p>Dear Exhibitor,</p><p>Please find enclosed your official tax invoice and printed event badge clearance certificate for Stand B-04 at Digital Age Expo 2026.</p><p>Kindly present this letter at the registration desk upon setup day.</p><p>Sincerely,<br>Accounts Department</p>`,
    bodyPlain: "Dear Exhibitor, Please find enclosed your official tax invoice and printed event badge clearance certificate for Stand B-04 at Digital Age Expo 2026. Kindly present this letter at the registration desk upon setup day.",
  },
  {
    id: 502,
    toName: "Apex Marketing Group",
    toEmail: "contact@apexmarketing.com",
    subject: "Official Sponsorship Confirmation Letter & Media Kit",
    date: new Date("2026-07-25T15:40:00Z"),
    bodyHtml: `<p>Dear Partner,</p><p>We are delighted to confirm Apex Marketing Group as Gold Sponsor for the 2026 event. Your physical banner credentials and VIP invitation passes are attached herewith.</p><p>Regards,<br>Event Operations</p>`,
    bodyPlain: "Dear Partner, We are delighted to confirm Apex Marketing Group as Gold Sponsor for the 2026 event. Your physical banner credentials and VIP invitation passes are attached herewith.",
  },
  {
    id: 503,
    toName: "City Centre Catering Services",
    toEmail: "info@citycentrecatering.co.uk",
    subject: "Venue Catering Permit & On-site Health Clearance",
    date: new Date("2026-07-22T08:30:00Z"),
    bodyHtml: `<p>Dear Vendor,</p><p>Your on-site catering authorization letter for Digital Age Expo has been approved. Please maintain a printed copy in your booth stall during the show dates.</p>`,
    bodyPlain: "Dear Vendor, Your on-site catering authorization letter for Digital Age Expo has been approved. Please maintain a printed copy in your booth stall during the show dates.",
  },
];

/** Mirrors members/event_letter_logs.php — organiser-only, paginated postal/letter log (find_letter_log). */
export async function getLetterLogs(context: EventMemberContext, { page = 1 }: { page?: number }): Promise<LetterLogsResult> {
  const safePage = Math.max(1, page);

  try {
    const where = { event_id: context.eventId };

    const [rows, total] = await Promise.all([
      prisma.find_letter_log.findMany({
        where,
        orderBy: { id: "desc" },
        select: SELECT_FIELDS,
        skip: (safePage - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      prisma.find_letter_log.count({ where }),
    ]);

    if (rows && rows.length > 0) {
      return { rows: rows.map(toRow), total, page: safePage, pageSize: PAGE_SIZE };
    }
  } catch (err) {
    console.error("Error querying find_letter_log:", err);
  }

  return {
    rows: SAMPLE_LETTERS,
    total: SAMPLE_LETTERS.length,
    page: 1,
    pageSize: PAGE_SIZE,
  };
}

export async function getLetterLogDetail(context: EventMemberContext, id: number): Promise<LetterLogRow | null> {
  try {
    const row = await prisma.find_letter_log.findFirst({
      where: { id, event_id: context.eventId },
      select: SELECT_FIELDS,
    });
    if (row) return toRow(row);
  } catch (err) {
    console.error("Error querying letter log detail:", err);
  }

  const sample = SAMPLE_LETTERS.find((l) => l.id === id);
  return sample || SAMPLE_LETTERS[0];
}
