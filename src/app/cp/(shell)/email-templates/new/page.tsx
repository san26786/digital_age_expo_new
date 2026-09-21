import { requireCpPermission, CP_PERMISSIONS } from "@/lib/cp/rbac";
import { getBrand } from "@/lib/brand";
import { listTemplateOptions } from "@/lib/cp/email/emailTemplatesRepository";
import { TemplateBuilder } from "@/components/email-templates/TemplateBuilder";
import { PlatformWideNotice } from "@/components/email-templates/shared";
import { createEmailTemplateAction } from "../actions";

/** The CP's door onto the same builder. Creating is an EDIT-level permission. */
export default async function NewCpEmailTemplatePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; id?: string; title?: string; subject?: string; topic?: string }>;
}) {
  await requireCpPermission(CP_PERMISSIONS.EMAIL_TEMPLATES_EDIT);

  const [{ error, id, title, subject, topic }, startFrom, brand] = await Promise.all([
    searchParams,
    listTemplateOptions(),
    getBrand(),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-black uppercase tracking-wider text-white">New email template</h1>

      <PlatformWideNotice />

      <TemplateBuilder
        basePath="/cp/email-templates"
        apiBase="/api/email-templates"
        createAction={createEmailTemplateAction}
        startFrom={startFrom}
        site={{ name: brand.name, url: `https://${brand.host}` }}
        error={error}
        values={{ id, title, subject, topic }}
      />
    </div>
  );
}
