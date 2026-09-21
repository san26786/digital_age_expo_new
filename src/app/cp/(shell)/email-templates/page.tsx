import { requireCpPermission, CP_PERMISSIONS } from "@/lib/cp/rbac";
import { listEmailTemplates, ensureDefaultTemplates } from "@/lib/cp/email/emailTemplatesRepository";
import { EmailTemplateTable } from "@/components/email-templates/shared";

/**
 * The CP's door onto the Email Template Builder.
 *
 * The screen itself moved to src/components/email-templates/shared.tsx when the organiser area
 * gained a door of its own, so that there is one implementation behind two gates rather than two
 * implementations that drift. What stays here is the only thing that was ever CP-specific: the
 * permission check.
 */
export default async function EmailTemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; all?: string; q?: string }>;
}) {
  await requireCpPermission(CP_PERMISSIONS.EMAIL_TEMPLATES_VIEW);

  // Idempotent — only inserts whichever of the 10 named templates from the spec don't
  // already exist as find_email_templates rows (e.g. on a fresh database).
  await ensureDefaultTemplates();

  const { page, all, q } = await searchParams;
  const currentPage = page ? Number(page) : 1;

  const { templates, total, pageSize, scope, hidden, query, hiddenMatches } = await listEmailTemplates({
    page: currentPage,
    scope: all ? "all" : "expo",
    query: q ?? "",
  });

  return (
    <EmailTemplateTable
      templates={templates}
      total={total}
      currentPage={currentPage}
      totalPages={Math.max(1, Math.ceil(total / pageSize))}
      basePath="/cp/email-templates"
      scope={scope}
      hidden={hidden}
      query={query}
      hiddenMatches={hiddenMatches}
    />
  );
}
