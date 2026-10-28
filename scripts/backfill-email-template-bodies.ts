/**
 * ===========================================================================
 *  GIVE EVERY EMPTY EMAIL TEMPLATE A BODY
 * ===========================================================================
 *
 *      npx tsx scripts/backfill-email-template-bodies.ts            # DRY RUN
 *      npx tsx scripts/backfill-email-template-bodies.ts --apply    # write
 *      npx tsx scripts/backfill-email-template-bodies.ts --groups=exhibitors,speakers
 *      npx tsx scripts/backfill-email-template-bodies.ts --apply --restore=reports/<file>.json
 *
 *  WHAT THIS IS FOR
 *
 *  Most rows in find_email_templates are legacy: a title, and nothing else. A template with no
 *  subject or no body is not merely unfinished — getRoleEmailTemplates() hides it and
 *  sendTemplatedEmail() refuses it ("template_empty"), so it cannot be used at all. This fills
 *  those two columns with a complete, correctly-structured email built from the row's own title.
 *
 *  READ THIS BEFORE --apply
 *
 *  Filling subject and body is exactly what makes a template SENDABLE. Every row this touches
 *  becomes a one-click option in the organiser's Send Mail dropdown for its role. The wording
 *  here is generic by construction — it is derived from a title, not written for the occasion —
 *  so treat this as scaffolding that is now live, and edit the ones you actually intend to send.
 *
 *  WHAT IT WILL NOT DO
 *
 *    - Overwrite anything. A row is skipped unless subject AND body_html are BOTH empty, so
 *      copy somebody has written is never replaced. Re-running is therefore safe.
 *    - Change `disable`. Two rows in these groups are switched off on purpose and say "OLD" in
 *      their own titles; resurrecting them is not this script's business.
 *    - Touch `process_name`, which decides which dropdown a row appears in and which this app
 *      did not write.
 *
 *  find_email_templates has no per-site column: these rows are shared by every site on the
 *  platform. That is why the copy names the show only through {{site_name}} and never in prose.
 */

import { prisma } from "../src/lib/prisma";
import { templateTitle, topicForTemplate } from "../src/lib/email/templateTopics";
import { EMAIL_INK, EMAIL_ACCENT, EMAIL_WHITE, EMAIL_MUTED_TEXT } from "../src/lib/theme/emailColors";
import { writeFileSync, mkdirSync, readFileSync } from "fs";
import { join } from "path";

const DEFAULT_GROUPS = ["exhibitors", "speakers", "sponsors", "accounts"];

const argv = process.argv.slice(2);
const APPLY = argv.includes("--apply");
const restoreArg = argv.find((a) => a.startsWith("--restore="));
const groupsArg = argv.find((a) => a.startsWith("--groups="));
const GROUPS = groupsArg ? groupsArg.split("=")[1].split(",").map((s) => s.trim()) : DEFAULT_GROUPS;

/* ---------------------------------------------------------------- the copy */

/**
 * Only variables every role send-mail route actually supplies.
 *
 * first_name / last_name / name / business / email come from the selected row; site_name and
 * site_url are filled per batch from getBrand(). Anything else — {{login}}, {{position}} — is
 * left in the body as literal text by interpolate(), which is worse than not using it.
 */
type Shape = { lead: string; cta: string | null; closing: string };

/**
 * What kind of email the title is describing.
 *
 * Ordered most specific first: "exhibitor confirmation" is a confirmation, not an exhibitor
 * notice, and "invoice reminder" is about money rather than a date.
 */
function shapeFor(title: string, id: string): Shape {
  const t = `${title} ${id}`.toLowerCase();
  const has = (...w: string[]) => w.some((x) => t.includes(x));

  /*
   * Admin-facing first. "Admin user registration" is a notice TO THE ORGANISER that somebody
   * signed up; greeting them with "Welcome, your details are set up" would be addressed to the
   * wrong person entirely, and the welcome keywords below would otherwise claim it.
   */
  if (has("admin ", "admin_", "notification", " alert", "submitted"))
    return { lead: "This is an internal notification from {{site_name}}. The details are below.", cta: null, closing: "No action is needed unless something here looks wrong." };
  if (has("password"))
    return { lead: "Here are the details you need to get back into your {{site_name}} account.", cta: "Go to your account", closing: "If you did not ask for this, you can safely ignore this email." };
  if (has("invoice", "credit note", "payment", "order"))
    return { lead: "This email concerns your account with {{site_name}}. The details are below.", cta: "View your account", closing: "If anything here does not look right, reply to this email and we will check it." };
  if (has("confirmation", "confirmed", "thank you", "thankyou"))
    return { lead: "Thank you — this is confirmation that we have received it, and nothing further is needed from you right now.", cta: "View the details", closing: "We will be in touch if we need anything else." };
  if (has("reminder", "no show", "inactivity", "follow up", "follow-up"))
    return { lead: "A quick reminder about {{site_name}} — there is still time to act on this.", cta: "Take a look", closing: "If you have already dealt with this, please ignore this message." };
  if (has("invitation", "invite", "nomination", "request to become"))
    return { lead: "We would like to invite you to take part in {{site_name}}.", cta: "See the details", closing: "Reply to this email if you would like to talk it through first." };
  if (has("welcome", "registration", "register", "account", "activation", "login"))
    return { lead: "Welcome to {{site_name}} — your details are set up and you can get started straight away.", cta: "Sign in", closing: "If you have any trouble getting in, reply to this email and we will sort it out." };
  if (has("schedule", "meeting", "session", "agenda", "day 1", "day 2", "day 3"))
    return { lead: "Here is what is happening at {{site_name}}, and what you need to know before it starts.", cta: "View the schedule", closing: "Reply if anything about your timings needs changing." };
  if (has("enquiry", "contact", "submitted", "notification", "alert"))
    return { lead: "This is a notification from {{site_name}}. The details are below.", cta: null, closing: "No action is needed unless something here looks wrong." };
  if (has("stand", "booth", "artwork", "advert"))
    return { lead: "This is about your stand at {{site_name}} and what we still need from you.", cta: "Manage your stand", closing: "Reply to this email if you would like a hand with any of it." };

  return { lead: "This is a message from the {{site_name}} team.", cta: "Visit {{site_name}}", closing: "Reply to this email if you have any questions." };
}

function buildSubject(title: string): string {
  const clean = title.replace(/\s+/g, " ").trim();
  return `${clean} — {{site_name}}`;
}

function buildBody(title: string, id: string): string {
  const s = shapeFor(title, id);
  const heading = title.replace(/\s+/g, " ").trim();
  const cta = s.cta
    ? `<p style="text-align: center; margin: 32px 0;">` +
      `<a href="{{site_url}}" style="background: ${EMAIL_ACCENT}; color: ${EMAIL_WHITE}; padding: 12px 28px; border-radius: 999px; text-decoration: none; font-weight: bold;">${s.cta}</a>` +
      `</p>`
    : "";

  return (
    `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: ${EMAIL_INK};">` +
    `<div style="background: ${EMAIL_ACCENT}; padding: 24px; text-align: center;">` +
    `<h1 style="color: ${EMAIL_WHITE}; margin: 0; font-size: 22px;">${escapeHtml(heading)}</h1>` +
    `</div>` +
    `<div style="padding: 24px; background: ${EMAIL_WHITE};">` +
    `<p>Hi {{first_name}},</p>` +
    `<p>${s.lead}</p>` +
    cta +
    `<p>${s.closing}</p>` +
    `<p>{{signature}}</p>` +
    `<p style="color: ${EMAIL_MUTED_TEXT}; font-size: 12px; margin-top: 24px;">Sent by {{site_name}} — {{site_url}}</p>` +
    `</div>` +
    `</div>`
  );
}

function escapeHtml(v: string): string {
  return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/* ------------------------------------------------------------------- main */

async function main() {
  if (restoreArg) return restore(restoreArg.split("=")[1]);

  const rows = await prisma.find_email_templates.findMany({
    select: { id: true, type: true, process_name: true, action_btn_name: true, subject: true, body_html: true, disable: true },
    orderBy: { id: "asc" },
  });

  const targets = rows.filter((r) => {
    const topic = topicForTemplate(r);
    if (!topic || !GROUPS.includes(topic.key)) return false;
    // BOTH blank, or it is somebody's work and stays untouched.
    return !(r.subject ?? "").trim() && !(r.body_html ?? "").trim();
  });

  const skippedWritten = rows.filter((r) => {
    const topic = topicForTemplate(r);
    return topic && GROUPS.includes(topic.key) && ((r.subject ?? "").trim() || (r.body_html ?? "").trim());
  });

  console.log(`groups:          ${GROUPS.join(", ")}`);
  console.log(`in those groups: ${targets.length + skippedWritten.length}`);
  console.log(`already written: ${skippedWritten.length}  (left alone)`);
  console.log(`to fill:         ${targets.length}`);
  console.log(`disabled among them: ${targets.filter((r) => r.disable).length}  (disable is not changed)\n`);

  for (const r of targets.slice(0, APPLY ? 0 : 12)) {
    const title = templateTitle(r);
    console.log(`  ${r.id}\n     subject: ${buildSubject(title)}`);
  }
  if (!APPLY) {
    if (targets.length > 12) console.log(`  … and ${targets.length - 12} more`);
    console.log(`\nDRY RUN — nothing written. Re-run with --apply to write.`);
    return;
  }

  // A restore file first, so this is reversible.
  mkdirSync("reports", { recursive: true });
  const backup = join("reports", `email-template-backfill-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  writeFileSync(backup, JSON.stringify(targets.map((r) => ({ id: r.id, subject: r.subject, body_html: r.body_html })), null, 1));
  console.log(`backup written: ${backup}`);

  let done = 0;
  for (const r of targets) {
    const title = templateTitle(r);
    await prisma.find_email_templates.update({
      where: { id: r.id },
      data: { subject: buildSubject(title), body_html: buildBody(title, r.id), updated_on: new Date() },
    });
    done += 1;
  }
  console.log(`filled ${done} template(s).`);
}

async function restore(file: string) {
  const saved = JSON.parse(readFileSync(file, "utf8")) as { id: string; subject: string | null; body_html: string | null }[];
  for (const row of saved) {
    await prisma.find_email_templates.update({
      where: { id: row.id },
      data: { subject: row.subject, body_html: row.body_html, updated_on: new Date() },
    });
  }
  console.log(`restored ${saved.length} template(s) from ${file}`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
