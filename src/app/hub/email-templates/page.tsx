import { listEmailTemplates, ensureDefaultTemplates } from "@/lib/cp/email/emailTemplatesRepository";
import { EmailTemplateTable } from "@/components/email-templates/shared";

export const dynamic = "force-dynamic";

/**
 * The Email Template Builder, reached from the organiser's own login.
 *
 * No permission check of its own: /hub/layout.tsx gates everything beneath it with getHubAccess,
 * and a second check here would be a second thing to keep in step with the first. The WRITES are
 * checked independently in actions.ts, which is the half that matters.
 */
export default async function HubEmailTemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; all?: string; q?: string }>;
}) {
  // Idempotent — only inserts whichever of the named default templates do not exist yet.
  await ensureDefaultTemplates();

  const { page, all, q } = await searchParams;
  const currentPage = page ? Number(page) : 1;

  // Filtered to this expo's own templates unless ?all=1 asks for the whole legacy table.
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
      basePath="/hub/email-templates"
      scope={scope}
      hidden={hidden}
      query={query}
      hiddenMatches={hiddenMatches}
    />
  );
}
