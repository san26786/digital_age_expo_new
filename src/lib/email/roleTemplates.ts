import { prisma } from "@/lib/prisma";
import { ensureDefaultTemplates } from "@/lib/cp/email/emailTemplatesRepository";

/**
 * ===========================================================================
 *  WHAT THE SEND-MAIL DROPDOWNS OFFER
 * ===========================================================================
 *
 *  The four admin "Send Mail" screens each need a list of templates an organiser may send to
 *  that role. Until now the three that existed built the list themselves, and all three had the
 *  same two faults.
 *
 *  ---------------------------------------------------------------------------
 *  1. THE FALLBACK OFFERED THE WHOLE TABLE
 *  ---------------------------------------------------------------------------
 *
 *  Each one ended:
 *
 *      const rows = scoped.length > 0
 *        ? scoped
 *        : await prisma.find_email_templates.findMany({ where: { disable: 0 } });
 *
 *  find_email_templates is a legacy platform table with no per-site column, shared by every site
 *  on this deployment - around 246 rows, most of them belonging to flows this product does not
 *  have. So an empty role match did not degrade to "nothing to send", it degraded to "every
 *  template on the platform", which is the worst possible moment to hand somebody a list of
 *  hundreds of unrelated rows and a Send button.
 *
 *  It also booby-trapped the obvious cleanup: disable the rows this app does not use, and the
 *  role match for some role empties out, and that role's dropdown silently inflates from a
 *  handful of entries to the entire table. The fallback had to go before anything could safely
 *  be switched off.
 *
 *  ---------------------------------------------------------------------------
 *  2. THE APP'S OWN TEMPLATES WERE NEVER IN THE LIST
 *  ---------------------------------------------------------------------------
 *
 *  The ten templates ensureDefaultTemplates() seeds are created with no process_name at all, and
 *  the dropdowns matched on process_name alone. So exhibitor_confirmation - the template this
 *  application actually sends to exhibitors, and the one an organiser would most plausibly want
 *  to re-send - could not be picked from the exhibitor send-mail screen. Only legacy rows could.
 *
 *  Both are fixed here, once, for all four roles: the app's own templates first, then whatever
 *  legacy rows carry that role's process_name, deduplicated, and nothing else ever.
 * ---------------------------------------------------------------------------
 */

export type TemplateRole = "visitor" | "exhibitor" | "sponsor" | "speaker";

/**
 * The app's own templates offered for each role.
 *
 * Each role gets the confirmation this application sends it, plus the two event-wide messages.
 * event_invitation and event_reminder are seeded but have no automatic sender, so the dropdowns
 * are the only place they can be used at all - which is what they were seeded for.
 */
export const ROLE_APP_TEMPLATE_IDS: Record<TemplateRole, readonly string[]> = {
  visitor: ["ticket_confirmation", "event_invitation", "event_reminder"],
  exhibitor: ["exhibitor_confirmation", "event_invitation", "event_reminder"],
  sponsor: ["sponsor_confirmation", "event_invitation", "event_reminder"],
  speaker: ["speaker_confirmation", "event_invitation", "event_reminder"],
};

/**
 * process_name substrings the legacy rows use, kept exactly as the previous implementations had
 * them: the leading letter is dropped so the match is case-insensitive without relying on the
 * database collation ("ponsor" finds both "Sponsor" and "sponsor").
 */
const ROLE_PROCESS_MATCHES: Record<TemplateRole, readonly string[]> = {
  visitor: ["isitor"],
  exhibitor: ["xhibitor"],
  sponsor: ["ponsor"],
  speaker: ["peaker"],
};

export interface RoleEmailTemplateOption {
  id: string;
  label: string;
  processName: string | null;
}

export async function getRoleEmailTemplates(
  role: TemplateRole,
  /** Internal: set on the one retry after seeding, so an empty table cannot recurse forever. */
  opts: { seeded?: boolean } = {}
): Promise<RoleEmailTemplateOption[]> {
  const select = {
    id: true,
    type: true,
    action_btn_name: true,
    process_name: true,
    subject: true,
    body_html: true,
  } as const;
  const orderBy = [{ priority_order: "asc" as const }, { id: "asc" as const }];

  const [appRows, legacyRows] = await Promise.all([
    prisma.find_email_templates.findMany({
      where: { disable: 0, id: { in: [...ROLE_APP_TEMPLATE_IDS[role]] } },
      orderBy,
      select,
    }),
    prisma.find_email_templates.findMany({
      where: {
        disable: 0,
        OR: ROLE_PROCESS_MATCHES[role].map((needle) => ({ process_name: { contains: needle } })),
      },
      orderBy,
      select,
    }),
  ]);

  const seen = new Set<string>();
  const options: RoleEmailTemplateOption[] = [];

  for (const row of [...appRows, ...legacyRows]) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);

    /*
     * A template with no subject or no body is skipped rather than listed.
     *
     * Five of the ten seeded ids - password_reset, event_invitation, event_reminder,
     * contact_request, admin_notification - exist as empty rows waiting for somebody to write
     * them, and plenty of the legacy rows predate the subject/body columns entirely. Offering
     * one of those is offering a button that sends a blank email to everybody selected.
     * sendTemplatedEmail refuses them now too (reason: "template_empty"); this just means the
     * organiser never gets as far as pressing the button.
     *
     * They reappear here by themselves the moment someone gives them content on the templates
     * screen, so this hides nothing permanently.
     */
    if (!(row.subject ?? "").trim() || !(row.body_html ?? "").trim()) continue;
    options.push({
      // action_btn_name is the human label the CP sets; `type` is the internal key and always
      // present; `id` is the last resort so an option can never render blank.
      id: row.id,
      label: (row.action_btn_name || row.type || row.id) as string,
      processName: row.process_name ?? null,
    });
  }

  /*
   * Seeding is a fallback, not a warm-up.
   *
   * The first cut of this called ensureDefaultTemplates() on every request, which is ten
   * findUniques plus up to ten writes before a dropdown can render - on a hot path, against a
   * remote database, for rows that are almost always already there. sendRegistrationEmail.ts
   * had already worked this out and says so in its own comment: "ten queries on a ten-connection
   * pool for rows that are almost always there". It was enough to make this endpoint time out.
   *
   * So it runs only when the list came back empty, which is the one case it was meant for - a
   * deployment where nobody has opened the templates screen yet. One extra round trip in the
   * rare case, none in the normal one.
   */
  if (options.length === 0 && !opts.seeded) {
    await ensureDefaultTemplates();
    return getRoleEmailTemplates(role, { seeded: true });
  }

  return options;
}
