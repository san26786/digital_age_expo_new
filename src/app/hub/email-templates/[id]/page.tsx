import { notFound } from "next/navigation";
import { getBrand } from "@/lib/brand";
import { getEmailTemplate, listTemplateOptions } from "@/lib/cp/email/emailTemplatesRepository";
import { topicForTemplate } from "@/lib/email/templateTopics";
import { TemplateBuilder } from "@/components/email-templates/TemplateBuilder";
import { PlatformWideNotice } from "@/components/email-templates/shared";
import { updateEmailTemplateAction, duplicateEmailTemplateAction } from "../actions";

export const dynamic = "force-dynamic";

/**
 * Editing one template, in the same builder that creates them.
 *
 * `canEdit` has no equivalent here: reaching this page at all means getHubAccess said yes in the
 * layout, and the Hub has no read-only tier the way the CP does.
 */
export default async function HubEditEmailTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [template, startFrom, brand] = await Promise.all([
    getEmailTemplate(id),
    listTemplateOptions(),
    getBrand(),
  ]);
  if (!template) notFound();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-brand-pink">Organiser</p>
        <h1 className="mt-2 text-3xl font-bold text-white">Edit email template</h1>
      </div>

      <PlatformWideNotice />

      <TemplateBuilder
        builderMode="edit"
        basePath="/hub/email-templates"
        apiBase="/api/email-templates"
        createAction={updateEmailTemplateAction.bind(null, id)}
        duplicateAction={duplicateEmailTemplateAction.bind(null, id)}
        startFrom={startFrom}
        site={{ name: brand.name, url: `https://${brand.host}` }}
        values={{
          id: template.id,
          title: template.action_btn_name ?? "",
          subject: template.subject ?? "",
          bodyHtml: template.body_html ?? "",
          // The topic this row already matches, so the select opens on the truth rather than on
          // "choose one" — and leaving it alone on save leaves process_name alone.
          topicKey: topicForTemplate(template)?.key ?? "",
          fromName: template.from_name ?? "",
          fromAddress: template.from_address ?? "",
          replyName: template.reply_name ?? "",
          replyAddress: template.reply_address ?? "",
          recipients: template.recipients ?? "",
          disable: Boolean(template.disable),
          moderate: Boolean(template.moderate),
        }}
      />
    </div>
  );
}
