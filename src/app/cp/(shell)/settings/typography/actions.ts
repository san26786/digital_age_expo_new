"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireCpPermission, CP_PERMISSIONS } from "@/lib/cp/rbac";
import { setSettings } from "@/lib/cp/settings/settingsRepository";
import { TYPOGRAPHY_SETTINGS_FIELDS, TYPOGRAPHY_NUMBER_FIELDS } from "./fields";
import { optionalText, firstZodIssue } from "../_lib/validation";
import type { SettingsActionState } from "../_components/SettingsForm";

/**
 * Range check built from the SAME min/max the number inputs declare, so the form and the
 * Server Action can't drift apart. The inputs already stop an out-of-range value in the
 * browser; a Server Action is directly callable, so the bound has to exist here too — and
 * expressing it once means widening the stepper automatically widens what is accepted.
 */
function boundedNumber(field: { label: string; min: number; max: number }) {
  return z.union([
    z.literal(""),
    z
      .string()
      .trim()
      .refine((value) => {
        const parsed = Number(value);
        return Number.isFinite(parsed) && parsed >= field.min && parsed <= field.max;
      }, `${field.label} must be a number between ${field.min} and ${field.max}.`),
  ]);
}

const [BASE_FONT_SIZE_FIELD, HEADING_SCALE_FIELD] = TYPOGRAPHY_NUMBER_FIELDS;

const typographySchema = z.object({
  cp_typography_primary_font: optionalText(150),
  cp_typography_secondary_font: optionalText(150),
  cp_typography_heading_font: optionalText(150),
  cp_typography_body_font: optionalText(150),
  cp_typography_base_font_size: boundedNumber(BASE_FONT_SIZE_FIELD),
  cp_typography_heading_scale: boundedNumber(HEADING_SCALE_FIELD),
});

export async function saveTypographySettingsAction(
  _prevState: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  await requireCpPermission(CP_PERMISSIONS.SETTINGS_EDIT);

  const raw: Record<string, string> = {};
  for (const field of TYPOGRAPHY_SETTINGS_FIELDS) raw[field.varname] = String(formData.get(field.varname) ?? "");

  const parsed = typographySchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, message: firstZodIssue(parsed.error) };
  }

  await setSettings(parsed.data as Record<string, string>);
  revalidatePath("/cp/settings/typography");
  revalidatePath("/", "layout");
  return { success: true, message: "Settings updated successfully." };
}
