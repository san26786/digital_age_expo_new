import { getSettingsGroup, defineSetting } from "@/lib/cp/settings/settingsRepository";
import { THEME_SETTINGS_FIELDS, THEME_COLOR_FIELDS } from "./fields";
import { saveThemeSettingsAction } from "./actions";
import { SettingsForm } from "../_components/SettingsForm";
import { ColorField } from "../_components/ColorField";
import { LABEL_CLASS, CHECKBOX_ROW_CLASS, CHECKBOX_CLASS } from "../_components/styles";

/**
 * Theme — stored in find_settings (grouptitle="theme"), NOT find_domains. Unlike Company/
 * Social/Branding (real find_domains columns), find_domains has no theme-color field at all,
 * so this follows the same find_settings pattern General Settings uses instead. Once Phase 2
 * wires the public site to these values, each color below becomes a CSS custom property the
 * whole site reads from, replacing whatever is currently hardcoded.
 *
 * THEME_SETTINGS_FIELDS carries the shipped default for every field, so the same catalog that
 * seeds find_settings on first load also feeds SettingsForm's "Restore Defaults" button —
 * there is no second copy of the palette to drift out of step with this one.
 */
export default async function ThemeSettingsPage() {
  for (const field of THEME_SETTINGS_FIELDS) {
    await defineSetting({
      varname: field.varname,
      grouptitle: "theme",
      value: field.defaultValue,
      // find_settings.optioncode_type is a fixed Postgres enum (text/textarea/select/radio/
      // checkbox/file/eval/text_tags/number_toggle) with no "color" member — this page renders
      // its own color input (or checkbox) based on field.type below, independently of what's
      // stored here, so "text" is always a safe, valid value to persist.
      optioncodeType: "text",
    });
  }

  const rows = await getSettingsGroup("theme");
  const valueByVarname = new Map(rows.map((r) => [r.varname, r.value ?? ""]));

  const defaults = Object.fromEntries(
    THEME_SETTINGS_FIELDS.map((field) => [field.varname, field.defaultValue])
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black uppercase tracking-wider text-white">Theme</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Site-wide color palette. Stored in find_settings (grouptitle=&quot;theme&quot;) — see the Branding tab for
          the legacy `template` field.
        </p>
      </div>

      <SettingsForm action={saveThemeSettingsAction} defaults={defaults}>
        <div className="grid gap-5 sm:grid-cols-2">
          {THEME_COLOR_FIELDS.map((field) => (
            <ColorField
              key={field.varname}
              name={field.varname}
              label={field.label}
              value={valueByVarname.get(field.varname) || field.defaultValue}
            />
          ))}
        </div>

        <label className={`${CHECKBOX_ROW_CLASS} border-t border-white/5 pt-6`}>
          <input
            type="checkbox"
            name="cp_theme_dark_mode"
            defaultChecked={(valueByVarname.get("cp_theme_dark_mode") || "on") === "on"}
            className={CHECKBOX_CLASS}
          />
          <span className={LABEL_CLASS}>Dark Mode</span>
        </label>
      </SettingsForm>
    </div>
  );
}
