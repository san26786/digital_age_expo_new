"use server";

import { revalidatePath } from "next/cache";
import { getHubAccess } from "@/lib/hub/access";
import { resolveSiteId } from "@/lib/tenant";
import { saveSiteMailSettings } from "@/lib/email/siteMailSettings";

/**
 * Save this site's mailbox.
 *
 * Gated with getHubAccess rather than getSitesHubAccess: these settings belong to the site being
 * served, so the screen is reachable from every site — it is site MANAGEMENT that lives on the
 * parent only.
 *
 * The site id comes from resolveSiteId(), never from the form. A site id in a hidden input is an
 * invitation to edit another site's mailbox by changing a number, and nothing about this form
 * needs the client to be the one that decides which site it is editing.
 */
export async function saveMailSettingsAction(formData: FormData): Promise<void> {
  const access = await getHubAccess();
  if (!access.ok) throw new Error("Not permitted.");

  const siteId = await resolveSiteId();

  await saveSiteMailSettings(siteId, {
    provider: String(formData.get("provider") ?? ""),
    fromAddress: String(formData.get("fromAddress") ?? ""),
    replyTo: String(formData.get("replyTo") ?? ""),
    signatureHtml: String(formData.get("signatureHtml") ?? ""),
    host: String(formData.get("host") ?? ""),
    port: String(formData.get("port") ?? ""),
    username: String(formData.get("username") ?? ""),
    password: String(formData.get("password") ?? ""),
    secure: formData.get("secure") === "on",
  });

  revalidatePath("/hub/send-queue");
}
