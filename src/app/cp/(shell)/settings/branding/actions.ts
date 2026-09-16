"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { CACHE_TAGS, revalidateContent } from "@/lib/cache";
import { requireCpPermission, CP_PERMISSIONS } from "@/lib/cp/rbac";
import { updateBranding } from "@/lib/cp/settings/domainRepository";
import { setSettings } from "@/lib/cp/settings/settingsRepository";
import { BRANDING_TEXT_FIELDS, BRANDING_LOGO_FIELDS } from "./fields";
import { optionalText, optionalImagePath, faviconPath, firstZodIssue } from "../_lib/validation";
import type { SettingsActionState } from "../_components/SettingsForm";

const brandingSchema = z.object({
  template: optionalText(255),
  alternate_logo: optionalText(255),
  partner_logo: optionalText(255),
  partner_url: optionalText(255),
  domain_loader: optionalText(255),
  fav: faviconPath,
  cp_branding_primary_logo: optionalImagePath,
  cp_branding_secondary_logo: optionalImagePath,
  cp_branding_mobile_logo: optionalImagePath,
  cp_branding_footer_logo: optionalImagePath,
  cp_branding_login_logo: optionalImagePath,
});

export async function saveBrandingAction(
  _prevState: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  await requireCpPermission(CP_PERMISSIONS.SETTINGS_EDIT);

  const raw: Record<string, string> = {};
  for (const field of BRANDING_TEXT_FIELDS) raw[field.key] = String(formData.get(field.key) ?? "");
  for (const field of BRANDING_LOGO_FIELDS) raw[field.key] = String(formData.get(field.key) ?? "");

  const parsed = brandingSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, message: firstZodIssue(parsed.error) };
  }
  const v = parsed.data;

  // find_domains columns (legacy text fields + the favicon, which already lives there).
  await updateBranding({
    template: v.template,
    alternate_logo: v.alternate_logo,
    partner_logo: v.partner_logo,
    partner_url: v.partner_url,
    fav: v.fav,
    domain_loader: v.domain_loader,
    show_header_brand_logo: formData.get("show_header_brand_logo") === "on",
    hide_pricing: formData.get("hide_pricing") === "on",
  });

  // The five new logo slots — no matching find_domains column, so these live in find_settings
  // (grouptitle="branding") the same way Theme's colors do.
  await setSettings({
    cp_branding_primary_logo: v.cp_branding_primary_logo,
    cp_branding_secondary_logo: v.cp_branding_secondary_logo,
    cp_branding_mobile_logo: v.cp_branding_mobile_logo,
    cp_branding_footer_logo: v.cp_branding_footer_logo,
    cp_branding_login_logo: v.cp_branding_login_logo,
  });

  revalidatePath("/cp/settings/branding");
  // The header and footer read these logos through an unstable_cache entry tagged `domain`
  // (getBrandAssets()), and they render in the root layout — both need busting, or a new logo
  // would not appear until the cache window expired.
  revalidatePath("/", "layout");
  revalidateContent(CACHE_TAGS.domain);
  return { success: true, message: "Settings updated successfully." };
}
