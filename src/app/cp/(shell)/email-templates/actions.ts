"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCpPermission, CP_PERMISSIONS } from "@/lib/cp/rbac";
import {
  updateEmailTemplate,
  duplicateEmailTemplate,
  createEmailTemplate,
} from "@/lib/cp/email/emailTemplatesRepository";

export async function updateEmailTemplateAction(id: string, formData: FormData): Promise<void> {
  await requireCpPermission(CP_PERMISSIONS.EMAIL_TEMPLATES_EDIT);

  await updateEmailTemplate(id, {
    title: String(formData.get("title") ?? ""),
    topicKey: String(formData.get("topic") ?? ""),
    recipients: String(formData.get("recipients") ?? ""),
    from_name: String(formData.get("from_name") ?? ""),
    from_address: String(formData.get("from_address") ?? ""),
    reply_name: String(formData.get("reply_name") ?? ""),
    reply_address: String(formData.get("reply_address") ?? ""),
    subject: String(formData.get("subject") ?? ""),
    body_html: String(formData.get("body_html") ?? ""),
    disable: formData.get("disable") === "on",
    moderate: formData.get("moderate") === "on",
  });

  revalidatePath("/cp/email-templates");
  revalidatePath(`/cp/email-templates/${id}`);
}

export async function duplicateEmailTemplateAction(sourceId: string, formData: FormData): Promise<void> {
  await requireCpPermission(CP_PERMISSIONS.EMAIL_TEMPLATES_EDIT);
  const newId = String(formData.get("newId") ?? "").trim();
  if (!newId) return;

  await duplicateEmailTemplate(sourceId, newId);
  revalidatePath("/cp/email-templates");
  redirect(`/cp/email-templates/${newId}`);
}

/**
 * Create a blank template, then open its editor.
 *
 * On the two failures a person can fix - a malformed id, an id already taken - this redirects
 * back to the form with the message AND everything they typed, rather than throwing an error page
 * that costs them the title and subject they had already written.
 */
export async function createEmailTemplateAction(formData: FormData): Promise<void> {
  await requireCpPermission(CP_PERMISSIONS.EMAIL_TEMPLATES_EDIT);

  const input = {
    id: String(formData.get("id") ?? ""),
    title: String(formData.get("title") ?? ""),
    subject: String(formData.get("subject") ?? ""),
    topicKey: String(formData.get("topic") ?? ""),
    bodyHtml: String(formData.get("body_html") ?? ""),
  };

  const result = await createEmailTemplate(input);

  // redirect() works by throwing, so it must sit outside anything that catches.
  if ("error" in result) {
    const params = new URLSearchParams({
      error: result.error,
      id: input.id,
      title: input.title,
      subject: input.subject,
      topic: input.topicKey,
    });
    // body_html is deliberately not round-tripped: it is kilobytes of markup and belongs nowhere
    // near a URL. The builder keeps its own state, so a failed save leaves the design on screen.
    redirect(`/cp/email-templates/new?${params.toString()}`);
  }

  revalidatePath("/hub/email-templates");
  revalidatePath("/cp/email-templates");
  redirect(`/cp/email-templates/${result.id}`);
}
