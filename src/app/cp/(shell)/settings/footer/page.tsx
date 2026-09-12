import { getSettingsGroup, defineSetting } from "@/lib/cp/settings/settingsRepository";
import { getDomainSettings } from "@/lib/cp/settings/domainRepository";
import { buildFooterDefaults } from "@/lib/services/footer";
import { FOOTER_TEXT_FIELDS } from "./fields";
import { saveFooterSettingsAction } from "./actions";
import { SettingsForm } from "../_components/SettingsForm";
import { FIELD_CLASS, LABEL_CLASS, HINT_CLASS } from "../_components/styles";

export default async function FooterSettingsPage() {
  // The suggestions come from the very function the rendered footer falls back to, so what this
  // form shows for an unsaved field is exactly what the public site is displaying right now.
  const domain = await getDomainSettings();
  const suggested = buildFooterDefaults({
    siteName: domain.name,
    email: domain.email,
    phone: domain.phone,
    address: domain.address,
  });

  for (const field of FOOTER_TEXT_FIELDS) {
    await defineSetting({
      varname: field.varname,
      grouptitle: "footer",
      value: suggested[field.varname] ?? "",
      optioncodeType: "text",
    });
  }

  const rows = await getSettingsGroup("footer");
  const valueByVarname = new Map(rows.map((r) => [r.varname, r.value ?? ""]));
  const currentYear = new Date().getFullYear();

  /** Saved value wins; an empty row shows what the footer is rendering today. */
  const displayValue = (varname: string) => valueByVarname.get(varname) || suggested[varname] || "";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black uppercase tracking-wider text-white">Footer</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Stored in find_settings (grouptitle=&quot;footer&quot;). Copyright year (currently {currentYear}) is always
          computed automatically, never stored.
        </p>
      </div>

      <SettingsForm
        action={saveFooterSettingsAction}
        /* Restoring puts back what the footer shows with nothing saved — not blanks. */
        defaults={suggested}
      >
        {FOOTER_TEXT_FIELDS.map((field) => (
          <div key={field.varname} className="space-y-2">
            <label className={LABEL_CLASS} htmlFor={field.varname}>
              {field.label}
            </label>
            {field.kind === "textarea" ? (
              <textarea
                id={field.varname}
                name={field.varname}
                defaultValue={displayValue(field.varname)}
                rows={3}
                className={FIELD_CLASS}
              />
            ) : (
              <input
                id={field.varname}
                name={field.varname}
                type={field.kind === "email" ? "email" : field.kind === "url" ? "url" : "text"}
                defaultValue={displayValue(field.varname)}
                className={FIELD_CLASS}
              />
            )}
            {"hint" in field && field.hint && <p className={HINT_CLASS}>{field.hint}</p>}
          </div>
        ))}
      </SettingsForm>
    </div>
  );
}
