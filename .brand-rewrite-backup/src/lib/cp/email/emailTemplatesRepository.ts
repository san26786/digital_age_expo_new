import { prisma } from "@/lib/prisma";
import { EMAIL_INK, EMAIL_ACCENT, EMAIL_WHITE, EMAIL_MUTED_TEXT } from "@/lib/theme/emailColors";

const PAGE_SIZE = 20;

/**
 * Backs the Email Template Builder module. find_email_templates.id is the template "type"
 * slug (e.g. "user_registration") — see schema.prisma's comment on this model for why
 * `subject`/`body_html` are new columns rather than reusing the legacy find_language_phrases
 * convention (unverifiable from here without live data).
 *
 * Paginated the same way as every other CP list page (Users, Events, Menu Manager, ...) — see
 * src/app/cp/_components/Pagination.tsx — even though the default 10 seeded templates fit on one
 * page today, since organisers can grow this table past that via duplicateEmailTemplate().
 */
export async function listEmailTemplates(params: { page?: number } = {}) {
  const page = Math.max(1, params.page ?? 1);

  const [templates, total] = await Promise.all([
    prisma.find_email_templates.findMany({
      orderBy: { id: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.find_email_templates.count(),
  ]);

  return { templates, total, page, pageSize: PAGE_SIZE };
}

export async function getEmailTemplate(id: string) {
  return prisma.find_email_templates.findUnique({ where: { id } });
}

export interface EmailTemplateInput {
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
  await prisma.find_email_templates.update({
    where: { id },
    data: {
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
 * Real starter content for templates that have a concrete send flow wired up already — see
 * "user_registration", sent from POST /api/register on successful sign-up (src/lib/email/
 * sendTemplatedEmail.ts fills in these {{placeholders}}). The other 9 default template ids
 * intentionally stay blank here (no send flow calls them yet); this only backfills a NEW row
 * (see the `if (existing) continue` below) — an already-existing "user_registration" row (e.g.
 * from a previous visit to this page before this content existed) needs the one-time
 * prisma/cp_email_template_user_registration_content.sql UPDATE instead.
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
};

export async function ensureDefaultTemplates(): Promise<void> {
  for (const id of DEFAULT_TEMPLATE_IDS) {
    const existing = await prisma.find_email_templates.findUnique({ where: { id } });
    if (existing) continue;
    const content = DEFAULT_TEMPLATE_CONTENT[id];
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
