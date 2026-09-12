import { getSettingsGroup, defineSetting } from "@/lib/cp/settings/settingsRepository";
import {
  TYPOGRAPHY_SETTINGS_FIELDS,
  TYPOGRAPHY_FONT_FIELDS,
  TYPOGRAPHY_NUMBER_FIELDS,
  TYPOGRAPHY_FONT_GROUPS,
  TYPOGRAPHY_KNOWN_FONTS,
} from "./fields";
import { saveTypographySettingsAction } from "./actions";
import { SettingsForm } from "../_components/SettingsForm";
import { FIELD_CLASS, LABEL_CLASS, HINT_CLASS } from "../_components/styles";

export default async function TypographySettingsPage() {
  for (const field of TYPOGRAPHY_SETTINGS_FIELDS) {
    await defineSetting({ varname: field.varname, grouptitle: "typography", value: field.defaultValue, optioncodeType: "text" });
  }

  const rows = await getSettingsGroup("typography");
  const valueByVarname = new Map(rows.map((r) => [r.varname, r.value ?? ""]));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black uppercase tracking-wider text-white">Typography</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Font family and scale settings. Stored in find_settings (grouptitle=&quot;typography&quot;) — this site&apos;s
          current fonts are hardcoded CSS variables in globals.css; these values are the intended replacements for
          when the public layout is wired to read them dynamically.
        </p>
      </div>

      <SettingsForm
        action={saveTypographySettingsAction}
        defaults={Object.fromEntries(
          TYPOGRAPHY_SETTINGS_FIELDS.map((field) => [field.varname, field.defaultValue])
        )}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          {TYPOGRAPHY_FONT_FIELDS.map((field) => {
            const current = valueByVarname.get(field.varname) || field.defaultValue;
            // A family saved before it was on the list (or typed straight into the database)
            // would otherwise vanish from the dropdown and be silently replaced by whichever
            // option happened to be first the next time someone pressed Save.
            const isCustom = current !== "" && !TYPOGRAPHY_KNOWN_FONTS.includes(current);

            return (
              <div key={field.varname} className="space-y-2">
                <label className={LABEL_CLASS} htmlFor={field.varname}>
                  {field.label}
                </label>
                <select
                  id={field.varname}
                  name={field.varname}
                  defaultValue={current}
                  className={FIELD_CLASS}
                  style={{ fontFamily: `"${current}", ui-sans-serif, system-ui, sans-serif` }}
                >
                  {isCustom && (
                    <optgroup label="Currently saved">
                      <option value={current}>{current}</option>
                    </optgroup>
                  )}
                  {TYPOGRAPHY_FONT_GROUPS.map((group) => (
                    <optgroup key={group.label} label={group.label}>
                      {group.fonts.map((font) => (
                        <option
                          key={font}
                          value={font}
                          style={{ fontFamily: `"${font}", ui-sans-serif, system-ui, sans-serif` }}
                        >
                          {font}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <p className={HINT_CLASS}>{field.hint}</p>
              </div>
            );
          })}
        </div>

        <div className="grid gap-5 border-t border-white/5 pt-6 sm:grid-cols-2">
          {TYPOGRAPHY_NUMBER_FIELDS.map((field) => (
            <div key={field.varname} className="space-y-2">
              <label className={LABEL_CLASS} htmlFor={field.varname}>
                {field.label}
              </label>
              <div className="relative">
                <input
                  id={field.varname}
                  name={field.varname}
                  type="number"
                  inputMode="decimal"
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  defaultValue={valueByVarname.get(field.varname) || field.defaultValue}
                  className={`${FIELD_CLASS} pr-12`}
                />
                <span className="pointer-events-none absolute right-9 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-600">
                  {field.unit}
                </span>
              </div>
              <p className={HINT_CLASS}>
                {field.hint} Allowed: {field.min}–{field.max}, in steps of {field.step}.
              </p>
            </div>
          ))}
        </div>

        <p className={HINT_CLASS}>
          Fonts under &quot;Used by this site&quot; are already referenced by globals.css. Google families need
          loading in the public layout before they will render on the live site.
        </p>
      </SettingsForm>
    </div>
  );
}
