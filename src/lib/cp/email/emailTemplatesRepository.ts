import { prisma } from "@/lib/prisma";
import { EMAIL_INK, EMAIL_ACCENT, EMAIL_WHITE, EMAIL_MUTED_TEXT } from "@/lib/theme/emailColors";
import {
  EMAIL_TEMPLATE_TOPICS,
  normaliseTemplateId,
  templateIdError,
  templateTitle,
  type EmailTemplateScope,
} from "@/lib/email/templateTopics";

/*
 * The topic definitions live in @/lib/email/templateTopics, which imports nothing, so that a
 * client component can classify a template without dragging Prisma into the browser bundle - the
 * same split brandAssets.ts exists for. Re-exported here because every current caller already
 * imports from this module.
 */
export { EMAIL_TEMPLATE_TOPICS, topicForTemplate } from "@/lib/email/templateTopics";
export type { EmailTemplateTopic, EmailTemplateScope } from "@/lib/email/templateTopics";

const PAGE_SIZE = 20;


/**
 * The scope filter, as a Prisma `where`.
 *
 * Built as one flat OR of case-insensitive `contains` across the three identifying columns. It is
 * a scan either way - the table has one index, on `type` - but this is an admin list of a table
 * measured in dozens of rows, and doing it in SQL rather than in JS is what keeps the pagination
 * and the counts honest. Filtering after the page was fetched would produce pages of four rows
 * and a total that did not match them.
 */
function scopeWhere(scope: EmailTemplateScope) {
  if (scope === "all") return {};

  const insensitive = "insensitive" as const;
  const words = EMAIL_TEMPLATE_TOPICS.flatMap((topic) => topic.keywords);

  return {
    OR: words.flatMap((word) => [
      { id: { contains: word, mode: insensitive } },
      { type: { contains: word, mode: insensitive } },
      { process_name: { contains: word, mode: insensitive } },
    ]),
  };
}

/**
 * ---------------------------------------------------------------------------
 *  SEARCH MATCHES WHAT THE CARD SHOWS, AND NOTHING ELSE
 * ---------------------------------------------------------------------------
 *
 *  Name, id and subject — the three things printed on a card. The body is deliberately NOT
 *  searched: a result whose visible text does not contain what was typed reads as a bug, and
 *  "why is this one here?" is a worse experience than not finding a template by a phrase buried
 *  in its HTML.
 *
 *  `action_btn_name` is included because it is what the card's heading actually shows for most
 *  rows (see templateTitle), so searching for the name somebody can see has to look there. `type`
 *  is not: it duplicates `id` for everything this app seeds and adds nothing but noise.
 */
function searchWhere(query: string) {
  const term = query.trim();
  if (!term) return {};

  const insensitive = "insensitive" as const;

  return {
    OR: [
      { id: { contains: term, mode: insensitive } },
      { action_btn_name: { contains: term, mode: insensitive } },
      { subject: { contains: term, mode: insensitive } },
    ],
  };
}

/**
 * Scope AND search, as one `where`.
 *
 * AND rather than merging the two OR arrays, which would have made a search widen the scope
 * instead of narrowing it — "show me this expo's templates matching 'booth'" must not start
 * returning platform templates because they happen to match 'booth'.
 */
function templatesWhere(scope: EmailTemplateScope, query: string) {
  const parts = [scopeWhere(scope), searchWhere(query)].filter(
    (part) => Object.keys(part).length > 0
  );

  if (parts.length === 0) return {};
  if (parts.length === 1) return parts[0];
  return { AND: parts };
}


/**
 * Backs the Email Template Builder module. find_email_templates.id is the template "type"
 * slug (e.g. "user_registration") - see schema.prisma's comment on this model for why
 * `subject`/`body_html` are new columns rather than reusing the legacy find_language_phrases
 * convention (unverifiable from here without live data).
 *
 * Paginated the same way as every other CP list page (Users, Events, Menu Manager, ...) - see
 * src/app/cp/_components/Pagination.tsx.
 *
 * `hidden` is how many rows the expo scope left out, so the screen can offer them rather than
 * pretend they do not exist.
 */
export async function listEmailTemplates(
  params: { page?: number; scope?: EmailTemplateScope; query?: string } = {}
) {
  const page = Math.max(1, params.page ?? 1);
  const scope = params.scope ?? "expo";
  const query = (params.query ?? "").trim();
  const where = templatesWhere(scope, query);

  /*
   * Four counts rather than one, and each earns its place:
   *
   *   total          what the search and scope together matched — drives the pagination.
   *   grandTotal     every row in the table, so "N hidden" is a real number and not a guess.
   *   elsewhere      matches this search would have found OUTSIDE the expo scope. Without it, a
   *                  search for a platform template from the default view says "nothing found",
   *                  which is both true and unhelpful: the thing exists, it is just filtered out.
   */
  const [templates, total, grandTotal, elsewhere] = await Promise.all([
    prisma.find_email_templates.findMany({
      where,
      orderBy: { id: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.find_email_templates.count({ where }),
    scope === "all" ? Promise.resolve(0) : prisma.find_email_templates.count(),
    query && scope !== "all"
      ? prisma.find_email_templates.count({ where: searchWhere(query) })
      : Promise.resolve(0),
  ]);

  return {
    templates,
    total,
    page,
    pageSize: PAGE_SIZE,
    scope,
    query,
    hidden: scope === "all" ? 0 : Math.max(0, grandTotal - total),
    /** Matches the expo scope filtered out. Zero unless a search is running in the expo scope. */
    hiddenMatches: Math.max(0, elsewhere - total),
  };
}


/**
 * id + display name for every template this expo uses, for the builder's "start from an existing
 * template" picker.
 *
 * Three columns, not whole rows: the picker needs a label and a key, and shipping 246 stored HTML
 * bodies to the browser to populate a dropdown would be a megabyte of payload to choose one of
 * them. The chosen one is fetched on its own afterwards.
 */
export async function listTemplateOptions(): Promise<{ id: string; title: string }[]> {
  const rows = await prisma.find_email_templates.findMany({
    where: templatesWhere("expo", ""),
    select: { id: true, type: true, action_btn_name: true },
    orderBy: { id: "asc" },
  });

  return rows
    .map((row) => ({ id: row.id, title: templateTitle(row) }))
    .sort((a, b) => a.title.localeCompare(b.title));
}

export async function getEmailTemplate(id: string) {
  return prisma.find_email_templates.findUnique({ where: { id } });
}

export interface EmailTemplateInput {
  /** action_btn_name — the label the cards and the send-mail pickers show. */
  title: string;
  /** A topic key from EMAIL_TEMPLATE_TOPICS; rewrites process_name. Blank leaves it alone. */
  topicKey: string;
  recipients: string;
  from_name: string;
  from_address: string;
  reply_name: string;
  reply_address: string;
  subject: string;
  body_html: string;
  disable: boolean;
  moderate: boolean;
}

export async function updateEmailTemplate(id: string, input: EmailTemplateInput): Promise<void> {
  /*
   * A blank topic leaves process_name exactly as it is.
   *
   * These are legacy rows whose process_name this app did not write and does not fully understand
   * — "Visitor Reminder 3", say. Rewriting it to the bare topic keyword on every save would
   * quietly flatten whatever the old system used it for, and the only visible symptom would be a
   * template going missing from a send-mail dropdown weeks later.
   */
  const topic = EMAIL_TEMPLATE_TOPICS.find((entry) => entry.key === input.topicKey);

  await prisma.find_email_templates.update({
    where: { id },
    data: {
      action_btn_name: input.title.trim() || null,
      ...(topic ? { process_name: topic.processName } : {}),
      recipients: input.recipients,
      from_name: input.from_name,
      from_address: input.from_address,
      reply_name: input.reply_name,
      reply_address: input.reply_address,
      subject: input.subject,
      body_html: input.body_html,
      disable: input.disable ? 1 : 0,
      moderate: input.moderate ? 1 : 0,
      updated_on: new Date(),
    },
  });
}

export interface NewEmailTemplate {
  id: string;
  /** The human label the card and the send-mail dropdowns show. */
  title: string;
  subject: string;
  /** A topic key from EMAIL_TEMPLATE_TOPICS; decides the process_name stamped on the row. */
  topicKey: string;
  /** The rendered body. Empty is fine — the editor can fill it in afterwards. */
  bodyHtml?: string;
  fromName?: string;
  fromAddress?: string;
  replyName?: string;
  replyAddress?: string;
  recipients?: string;
}

/**
 * Create a blank template.
 *
 * ---------------------------------------------------------------------------
 *  THE COLUMNS THAT ARE NOT NULLABLE ARE THE WHOLE DIFFICULTY
 * ---------------------------------------------------------------------------
 *
 *  `find_email_templates` is a legacy table: `type`, `disable`, `moderate` and `custom` are all
 *  NOT NULL with no default, so a create that only sets the fields a person filled in fails at
 *  the database rather than in the form. The values below mirror ensureDefaultTemplates() exactly,
 *  which is the one place in this codebase already known to insert a row this table accepts.
 *
 *  `process_name` is stamped from the chosen topic - see EMAIL_TEMPLATE_TOPICS.processName for
 *  why a template that does not carry it would disappear from the screen that just created it.
 *
 *  Returns an error string rather than throwing for the two failures a person can cause and fix:
 *  a malformed id and an id already taken. Anything else is a genuine fault and throws.
 */
export async function createEmailTemplate(input: NewEmailTemplate): Promise<{ id: string } | { error: string }> {
  const invalid = templateIdError(input.id);
  if (invalid) return { error: invalid };

  const id = normaliseTemplateId(input.id);

  const topic = EMAIL_TEMPLATE_TOPICS.find((entry) => entry.key === input.topicKey);
  if (!topic) return { error: "Choose what this template is used for." };

  const existing = await prisma.find_email_templates.findUnique({ where: { id }, select: { id: true } });
  if (existing) return { error: `A template called "${id}" already exists.` };

  await prisma.find_email_templates.create({
    data: {
      id,
      type: id,
      process_name: topic.processName,
      action_btn_name: input.title.trim() || null,
      recipients: input.recipients?.trim() ?? "",
      from_name: input.fromName?.trim() || null,
      from_address: input.fromAddress?.trim() || null,
      reply_name: input.replyName?.trim() || null,
      reply_address: input.replyAddress?.trim() || null,
      disable: 0,
      moderate: 0,
      custom: 1,
      is_non_franchise: false,
      is_admin: true,
      subject: input.subject.trim(),
      body_html: input.bodyHtml ?? "",
    },
  });

  return { id };
}

export async function duplicateEmailTemplate(sourceId: string, newId: string): Promise<void> {
  const source = await prisma.find_email_templates.findUnique({ where: { id: sourceId } });
  if (!source) throw new Error("Source template not found.");
  const { id: _id, ...rest } = source;
  await prisma.find_email_templates.create({
    data: { ...rest, id: newId, created_on: new Date(), updated_on: new Date() },
  });
}

/** Seeds the 10 named templates from the spec as rows, if they don't already exist — safe to call repeatedly. */
export const DEFAULT_TEMPLATE_IDS = [
  "user_registration",
  "password_reset",
  "event_invitation",
  "event_reminder",
  "exhibitor_confirmation",
  "sponsor_confirmation",
  "speaker_confirmation",
  "ticket_confirmation",
  "contact_request",
  "admin_notification",
] as const;

/**
 * ---------------------------------------------------------------------------
 *  ONE SHAPE FOR ALL FOUR "WE GOT YOUR APPLICATION" EMAILS
 * ---------------------------------------------------------------------------
 *
 *  Exhibitor, speaker, sponsor and free-ticket registration all send the same kind of message and
 *  differ only in wording. Written out four times they would be four 20-line HTML blobs that drift
 *  apart the first time anyone adjusts the padding, so the markup is built once here.
 *
 *  EVERY ONE OF THEM SAYS "RECEIVED", NOT "CONFIRMED". All four routes write their row with
 *  status "pending" and somebody has to approve it. An email that reads like acceptance would have
 *  people turning up to a stand, a slot or a sponsorship they were never given — which is why the
 *  closing line is part of the shared shape rather than something each one remembers to add.
 */
function applicationEmail(options: {
  heading: string;
  intro: string;
  rows: { label: string; value: string }[];
  cta: string;
  closing: string;
}): { subject: string; body_html: string } {
  const rows = options.rows
    .map(
      (row) =>
        `<tr><td style="padding: 8px 0; color: ${EMAIL_MUTED_TEXT};">${row.label}</td>` +
        `<td style="padding: 8px 0; font-weight: bold;">${row.value}</td></tr>`
    )
    .join("");

  return {
    subject: `${options.heading} — {{site_name}}`,
    body_html:
      `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: ${EMAIL_INK};">` +
      `<div style="background: ${EMAIL_ACCENT}; padding: 24px; text-align: center;">` +
      `<h1 style="color: ${EMAIL_WHITE}; margin: 0; font-size: 22px;">${options.heading}</h1>` +
      "</div>" +
      `<div style="padding: 24px; background: ${EMAIL_WHITE};">` +
      "<p>Hi {{first_name}},</p>" +
      `<p>${options.intro}</p>` +
      "<p>Here is what you sent us:</p>" +
      `<table style="width: 100%; border-collapse: collapse; margin: 16px 0;">${rows}</table>` +
      '<p style="text-align: center; margin: 32px 0;">' +
      `<a href="{{site_url}}" style="background: ${EMAIL_ACCENT}; color: ${EMAIL_WHITE}; padding: 12px 28px; border-radius: 999px; text-decoration: none; font-weight: bold;">${options.cta}</a>` +
      "</p>" +
      "{{signature}}" +
      `<p style="color: ${EMAIL_MUTED_TEXT}; font-size: 12px;">${options.closing}</p>` +
      "</div>" +
      "</div>",
  };
}

const CONTACT_ROWS = [
  { label: "Name", value: "{{name}}" },
  { label: "Company", value: "{{business}}" },
  { label: "Position", value: "{{position}}" },
  { label: "Email", value: "{{email}}" },
];

/** Sent by the four public registration routes, through sendRegistrationEmail(). */
const APPLICATION_EMAILS = {
  exhibitor_confirmation: applicationEmail({
    heading: "Application Submitted Successfully!",
    intro:
      "Thank you for applying to exhibit at {{site_name}}. We have received your application and the team will be in touch shortly about stand availability and next steps.",
    rows: CONTACT_ROWS,
    cta: "Visit {{site_name}}",
    closing:
      "Your application is with our team for review — this email confirms we received it, not that a stand has been allocated.",
  }),

  speaker_confirmation: applicationEmail({
    heading: "Application Submitted Successfully!",
    intro:
      "Thank you for offering to speak at {{site_name}}. We have received your application, and the programme team will be in touch about session topics and timings.",
    rows: CONTACT_ROWS,
    cta: "See the schedule",
    closing:
      "Your application is with the programme team — this email confirms we received it, not that a speaking slot has been agreed.",
  }),

  sponsor_confirmation: applicationEmail({
    heading: "Application Submitted Successfully!",
    intro:
      "Thank you for your interest in sponsoring {{site_name}}. We have received your enquiry and a member of the team will be in touch to talk through the packages available.",
    rows: CONTACT_ROWS,
    cta: "Visit {{site_name}}",
    closing:
      "Your enquiry is with our team — this email confirms we received it, not that a sponsorship package has been reserved.",
  }),

  /*
   * The free ticket is the one that is genuinely CONFIRMED rather than pending: nobody approves a
   * free ticket, the row is created and the visitor is registered. So its wording is the odd one
   * out on purpose, and its closing line promises joining details rather than a review.
   */
  ticket_confirmation: applicationEmail({
    heading: "You are registered!",
    intro:
      "Your free ticket for {{site_name}} is confirmed. We will send joining details and a reminder closer to the event.",
    rows: [
      { label: "Name", value: "{{name}}" },
      { label: "Company", value: "{{business}}" },
      { label: "Email", value: "{{email}}" },
    ],
    cta: "See what is on",
    closing: "Keep this email — it is your confirmation that you are registered to attend.",
  }),
};

/**
 * Real starter content for templates that have a concrete send flow wired up already — see
 * "user_registration", sent from POST /api/register on successful sign-up (src/lib/email/
 * sendTemplatedEmail.ts fills in these {{placeholders}}). The other 9 default template ids
 * intentionally stay blank here (no send flow calls them yet); this only backfills a NEW row
 * (see the `if (existing) continue` below) — an already-existing "user_registration" row (e.g.
 * from a previous visit to this page before this content existed) is now backfilled by
 * ensureDefaultTemplates() itself, but ONLY while its subject and body are both still empty - see
 * the note there. The one-time prisma/cp_email_template_user_registration_content.sql UPDATE is no
 * longer needed for that.
 */
const DEFAULT_TEMPLATE_CONTENT: Partial<
  Record<(typeof DEFAULT_TEMPLATE_IDS)[number], { subject: string; body_html: string; from_name?: string }>
> = {
  user_registration: {
    subject: "Welcome to {{site_name}}, {{first_name}}!",
    from_name: "Digital Age Expo",
    body_html:
      `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: ${EMAIL_INK};">` +
      `<div style="background: ${EMAIL_ACCENT}; padding: 24px; text-align: center;">` +
      `<h1 style="color: ${EMAIL_WHITE}; margin: 0; font-size: 22px;">Welcome to {{site_name}}!</h1>` +
      "</div>" +
      `<div style="padding: 24px; background: ${EMAIL_WHITE};">` +
      "<p>Hi {{first_name}},</p>" +
      "<p>Your account has been created successfully. Here are your account details:</p>" +
      '<table style="width: 100%; border-collapse: collapse; margin: 16px 0;">' +
      `<tr><td style="padding: 8px 0; color: ${EMAIL_MUTED_TEXT};">Username</td><td style="padding: 8px 0; font-weight: bold;">{{login}}</td></tr>` +
      `<tr><td style="padding: 8px 0; color: ${EMAIL_MUTED_TEXT};">Email</td><td style="padding: 8px 0; font-weight: bold;">{{email}}</td></tr>` +
      "</table>" +
      '<p style="text-align: center; margin: 32px 0;">' +
      `<a href="{{site_url}}/login" style="background: ${EMAIL_ACCENT}; color: ${EMAIL_WHITE}; padding: 12px 28px; border-radius: 999px; text-decoration: none; font-weight: bold;">Sign In</a>` +
      "</p>" +
      `<p style="color: ${EMAIL_MUTED_TEXT}; font-size: 12px;">If you did not create this account, you can safely ignore this email.</p>` +
      "</div>" +
      "</div>",
  },

  ...APPLICATION_EMAILS,
};



export async function ensureDefaultTemplates(): Promise<void> {
  for (const id of DEFAULT_TEMPLATE_IDS) {
    const existing = await prisma.find_email_templates.findUnique({ where: { id } });
    const content = DEFAULT_TEMPLATE_CONTENT[id];

    if (existing) {
      /*
       * BACKFILL, BUT ONLY INTO A ROW THAT IS COMPLETELY EMPTY.
       *
       * These ten ids were seeded long before any of them had content, so the rows exist with a
       * blank subject and a blank body — and a create-only seeder can never reach them. That is
       * why user_registration needed a hand-run SQL file
       * (prisma/cp_email_template_user_registration_content.sql) to get its copy.
       *
       * The condition is both fields empty, which makes this safe in the only way that matters:
       * a template somebody has written, or half-written, is never touched. A row with no subject
       * AND no body cannot send anything but an empty email, so filling it is strictly better
       * than leaving it, and nobody loses work they did.
       */
      const blank = !(existing.subject ?? "").trim() && !(existing.body_html ?? "").trim();
      if (content && blank) {
        await prisma.find_email_templates.update({
          where: { id },
          data: {
            subject: content.subject,
            body_html: content.body_html,
            from_name: existing.from_name ?? content.from_name ?? null,
            updated_on: new Date(),
          },
        });
      }
      continue;
    }

    await prisma.find_email_templates.create({
      data: {
        id,
        type: id,
        recipients: "",
        disable: 0,
        moderate: 0,
        custom: 0,
        is_non_franchise: false,
        is_admin: true,
        subject: content?.subject ?? "",
        body_html: content?.body_html ?? "",
        from_name: content?.from_name ?? null,
      },
    });
  }
}
