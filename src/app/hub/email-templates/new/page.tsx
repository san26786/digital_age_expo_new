import { getBrand } from "@/lib/brand";
import { listTemplateOptions } from "@/lib/cp/email/emailTemplatesRepository";
import { TemplateBuilder } from "@/components/email-templates/TemplateBuilder";
import { PlatformWideNotice } from "@/components/email-templates/shared";
import { createEmailTemplateAction } from "../actions";

export const dynamic = "force-dynamic";

/**
 * A static segment, so Next resolves it before [id] — which is also why "new" is a reserved
 * template id (see RESERVED_TEMPLATE_IDS): a row called "new" would be the one the Edit link
 * could never open.
 */
export default async function NewHubEmailTemplatePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; id?: string; title?: string; subject?: string; topic?: string }>;
}) {
  const [{ error, id, title, subject, topic }, startFrom, brand] = await Promise.all([
    searchParams,
    listTemplateOptions(),
    getBrand(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-brand-pink">Organiser</p>
        <h1 className="mt-2 text-3xl font-bold text-white">New email template</h1>
      </div>

      <PlatformWideNotice />

      <TemplateBuilder
        basePath="/hub/email-templates"
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
