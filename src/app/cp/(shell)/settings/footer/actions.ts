"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { CACHE_TAGS, revalidateContent } from "@/lib/cache";
import { requireCpPermission, CP_PERMISSIONS } from "@/lib/cp/rbac";
import { setSettings } from "@/lib/cp/settings/settingsRepository";
import { FOOTER_TEXT_FIELDS } from "./fields";
import { optionalText, optionalEmail, optionalUrl, firstZodIssue } from "../_lib/validation";
import type { SettingsActionState } from "../_components/SettingsForm";

const kindToSchema: Record<string, z.ZodTypeAny> = {
  text: optionalText(255),
  textarea: optionalText(2000),
  email: optionalEmail,
  url: optionalUrl,
};

const footerSchema = z.object(Object.fromEntries(FOOTER_TEXT_FIELDS.map((f) => [f.varname, kindToSchema[f.kind]])));

export async function saveFooterSettingsAction(
  _prevState: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  await requireCpPermission(CP_PERMISSIONS.SETTINGS_EDIT);

  const raw: Record<string, string> = {};
  for (const field of FOOTER_TEXT_FIELDS) raw[field.varname] = String(formData.get(field.varname) ?? "");

  const parsed = footerSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, message: firstZodIssue(parsed.error) };
  }

  await setSettings(parsed.data as Record<string, string>);
  revalidatePath("/cp/settings/footer");
  revalidatePath("/", "layout");
  // The rendered footer reads these through an unstable_cache entry tagged `domain`
  // (getFooterContent()), which revalidatePath alone does not clear.
  revalidateContent(CACHE_TAGS.domain);
  return { success: true, message: "Settings updated successfully." };
}
