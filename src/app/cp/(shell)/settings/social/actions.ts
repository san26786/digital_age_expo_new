"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { CACHE_TAGS, revalidateContent } from "@/lib/cache";
import { requireCpPermission, CP_PERMISSIONS } from "@/lib/cp/rbac";
import { updateSocialMedia } from "@/lib/cp/settings/domainRepository";
import { setSettings } from "@/lib/cp/settings/settingsRepository";
import { SOCIAL_PLATFORMS, urlFieldName, enabledFieldName, orderFieldName } from "./fields";
import { optionalText, optionalUrl, onOffToggle, firstZodIssue } from "../_lib/validation";
import type { SettingsActionState } from "../_components/SettingsForm";

const orderField = z.union([z.literal(""), z.string().trim().regex(/^\d{1,3}$/, "Order must be a number.")]);

const socialSchemaShape: Record<string, z.ZodTypeAny> = { google: optionalText(255) };
for (const platform of SOCIAL_PLATFORMS) {
  socialSchemaShape[urlFieldName(platform.key)] = optionalUrl;
  socialSchemaShape[enabledFieldName(platform.key)] = onOffToggle;
  socialSchemaShape[orderFieldName(platform.key)] = orderField;
}
const socialSchema = z.object(socialSchemaShape);

export async function saveSocialMediaAction(
  _prevState: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  await requireCpPermission(CP_PERMISSIONS.SETTINGS_EDIT);

  const raw: Record<string, string> = { google: String(formData.get("google") ?? "") };
  for (const platform of SOCIAL_PLATFORMS) {
    raw[urlFieldName(platform.key)] = String(formData.get(urlFieldName(platform.key)) ?? "");
    raw[enabledFieldName(platform.key)] = formData.get(enabledFieldName(platform.key)) === "on" ? "on" : "off";
    raw[orderFieldName(platform.key)] = String(formData.get(orderFieldName(platform.key)) ?? "");
  }

  const parsed = socialSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, message: firstZodIssue(parsed.error) };
  }
  const v = parsed.data;

  // The five legacy-column URLs (+ the unrelated "google" business-profile link) go to
  // find_domains, same row Company Details edits.
  await updateSocialMedia({
    facebook: v.facebook,
    instagram: v.instagram,
    youtube: v.youtube,
    google: v.google,
    twitter: v.twitter,
    linkedin: v.linkedin,
  });

  // Everything with no find_domains column (tiktok/whatsapp/pinterest URLs) plus enabled/order
  // for all eight platforms goes to find_settings (grouptitle="social").
  const settingsToSave: Record<string, string> = {};
  for (const platform of SOCIAL_PLATFORMS) {
    if (platform.urlSource === "setting") settingsToSave[urlFieldName(platform.key)] = v[urlFieldName(platform.key)];
    settingsToSave[enabledFieldName(platform.key)] = v[enabledFieldName(platform.key)];
    settingsToSave[orderFieldName(platform.key)] = v[orderFieldName(platform.key)];
  }
  await setSettings(settingsToSave);

  revalidatePath("/cp/settings/social");
  revalidatePath("/", "layout");
  // revalidatePath only busts rendered routes. The footer's link list is an unstable_cache
  // entry stored under the domain tag (see getPublicSocialLinks()), so without this an
  // Enabled/Order change would keep showing the old icons until that window expired.
  revalidateContent(CACHE_TAGS.domain);
  return { success: true, message: "Settings updated successfully." };
}
