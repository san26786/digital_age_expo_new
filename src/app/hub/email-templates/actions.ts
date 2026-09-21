"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getHubAccess } from "@/lib/hub/access";
import {
  updateEmailTemplate,
  duplicateEmailTemplate,
  createEmailTemplate,
} from "@/lib/cp/email/emailTemplatesRepository";

/**
 * The Hub's own gate on the email-template writes.
 *
 * The CP's copies of these actions ask CP RBAC; these ask getHubAccess, because the whole point
 * of surfacing this module in the organiser area is that it does NOT require a second login.
 *
 * The check is HERE rather than only on the page that renders the form. A server action is a
 * POST endpoint with a generated URL: anything that can reach the app can call it, form or no
 * form, so a page-level check protects the page and nothing else.
 */
async function requireHub(): Promise<void> {
  const access = await getHubAccess();
  if (!access.ok) throw new Error("Not permitted: the Hub is restricted to superadmins.");
}

export async function updateEmailTemplateAction(id: string, formData: FormData): Promise<void> {
  await requireHub();

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

  /*
   * Both doors are revalidated, not just this one. The rows are shared, so a save made from the
   * Hub leaves the CP's cached list showing the old subject line — the kind of staleness that
   * gets read as "my change did not save" and then made twice.
   */
  revalidatePath("/hub/email-templates");
  revalidatePath(`/hub/email-templates/${id}`);
  revalidatePath("/cp/email-templates");
  revalidatePath(`/cp/email-templates/${id}`);
}

export async function duplicateEmailTemplateAction(sourceId: string, formData: FormData): Promise<void> {
  await requireHub();

  const newId = String(formData.get("newId") ?? "").trim();
  if (!newId) return;

  await duplicateEmailTemplate(sourceId, newId);

  revalidatePath("/hub/email-templates");
  revalidatePath("/cp/email-templates");
  redirect(`/hub/email-templates/${newId}`);
}

/**
 * Create a blank template, then open its editor.
 *
 * On the two failures a person can fix - a malformed id, an id already taken - this redirects
 * back to the form with the message AND everything they typed, rather than throwing an error page
 * that costs them the title and subject they had already written.
 */
export async function createEmailTemplateAction(formData: FormData): Promise<void> {
  await requireHub();

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
    redirect(`/hub/email-templates/new?${params.toString()}`);
  }

  revalidatePath("/hub/email-templates");
  revalidatePath("/cp/email-templates");
  redirect(`/hub/email-templates/${result.id}`);
}
