import { notFound } from "next/navigation";
import { requireCpPermission, CP_PERMISSIONS } from "@/lib/cp/rbac";
import { getBrand } from "@/lib/brand";
import { getEmailTemplate, listTemplateOptions } from "@/lib/cp/email/emailTemplatesRepository";
import { topicForTemplate } from "@/lib/email/templateTopics";
import { TemplateBuilder } from "@/components/email-templates/TemplateBuilder";
import { PlatformWideNotice } from "@/components/email-templates/shared";
import { updateEmailTemplateAction, duplicateEmailTemplateAction } from "../actions";

/**
 * The CP's door onto the same builder.
 *
 * VIEW without EDIT sends people away rather than rendering a disabled form. The old plain-input
 * editor could sensibly grey out every field; a block editor with a live preview and a test-send
 * button cannot be made read-only without it reading as broken, so the honest answer is the
 * permission error the CP already shows everywhere else.
 */
export default async function EditEmailTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  await requireCpPermission(CP_PERMISSIONS.EMAIL_TEMPLATES_EDIT);

  const { id } = await params;

  const [template, startFrom, brand] = await Promise.all([
    getEmailTemplate(id),
    listTemplateOptions(),
    getBrand(),
  ]);
  if (!template) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-black uppercase tracking-wider text-white">Edit email template</h1>

      <PlatformWideNotice />

      <TemplateBuilder
        builderMode="edit"
        basePath="/cp/email-templates"
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
