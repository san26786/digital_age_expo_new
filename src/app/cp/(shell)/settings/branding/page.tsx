import { getDomainSettings } from "@/lib/cp/settings/domainRepository";
import { getSettingsGroup, defineSetting } from "@/lib/cp/settings/settingsRepository";
import { BRANDING_TEXT_FIELDS, BRANDING_LOGO_FIELDS } from "./fields";
import { saveBrandingAction } from "./actions";
import { SettingsForm } from "../_components/SettingsForm";
import { ImageUploadField } from "../_components/ImageUploadField";
import { FIELD_CLASS, LABEL_CLASS, HINT_CLASS, SECTION_TITLE_CLASS, CHECKBOX_ROW_CLASS, CHECKBOX_CLASS } from "../_components/styles";

export default async function BrandingPage() {
  const newLogoFields = BRANDING_LOGO_FIELDS.filter((f) => f.source === "setting");
  for (const field of newLogoFields) {
    // Seeded with the asset the site already serves for that slot, so a fresh install starts
    // with its real marks rather than six empty boxes. See BRANDING_LOGO_FIELDS in ./fields.
    await defineSetting({
      varname: field.key,
      grouptitle: "branding",
      value: field.defaultValue,
      optioncodeType: "text",
    });
  }

  const [domain, settingRows] = await Promise.all([getDomainSettings(), getSettingsGroup("branding")]);
  const settingByVarname = new Map(settingRows.map((r) => [r.varname, r.value ?? ""]));

  const textValues: Record<string, string> = {
    template: domain.template ?? "",
    alternate_logo: domain.alternate_logo ?? "",
    partner_logo: domain.partner_logo ?? "",
    partner_url: domain.partner_url ?? "",
    domain_loader: domain.domain_loader ?? "",
  };

  /** Saved value wins; an empty slot shows the asset the live site is using for it today. */
  function logoValue(field: (typeof BRANDING_LOGO_FIELDS)[number]): string | null {
    const saved = field.source === "domain" ? domain.fav : settingByVarname.get(field.key);
    return (saved || "").trim() || field.defaultValue || null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black uppercase tracking-wider text-white">Branding</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Logos, favicon, and legacy template settings for this site. For theme colors, see the{" "}
          <span className="font-bold text-zinc-300">Theme</span> tab.
        </p>
      </div>

      <SettingsForm action={saveBrandingAction}>
        <div className="space-y-5">
          <h3 className={SECTION_TITLE_CLASS}>Logos & Favicon</h3>
          <div className="grid gap-6 sm:grid-cols-2">
            {BRANDING_LOGO_FIELDS.map((field) => (
              <ImageUploadField
                key={field.key}
                name={field.key}
                slot={field.slot}
                label={field.label}
                initialUrl={logoValue(field)}
                hint={field.hint}
                accept={(field as { accept?: string }).accept}
              />
            ))}
          </div>
        </div>

        <div className="space-y-5 border-t border-white/5 pt-6">
          <h3 className={SECTION_TITLE_CLASS}>Legacy Fields</h3>
          {BRANDING_TEXT_FIELDS.map((field) => (
            <div key={field.key} className="space-y-2">
              <label className={LABEL_CLASS} htmlFor={field.key}>
                {field.label}
              </label>
              <input id={field.key} name={field.key} defaultValue={textValues[field.key]} className={FIELD_CLASS} />
              {"hint" in field && field.hint && <p className={HINT_CLASS}>{field.hint}</p>}
            </div>
          ))}

          <label className={CHECKBOX_ROW_CLASS}>
            <input
              type="checkbox"
              name="show_header_brand_logo"
              defaultChecked={domain.show_header_brand_logo === 1}
              className={CHECKBOX_CLASS}
            />
            <span className={LABEL_CLASS}>Show Brand Logo In Header</span>
          </label>

          <label className={CHECKBOX_ROW_CLASS}>
            <input
              type="checkbox"
              name="hide_pricing"
              defaultChecked={domain.hide_pricing ?? false}
              className={CHECKBOX_CLASS}
            />
            <span className={LABEL_CLASS}>Hide Pricing Site-Wide</span>
          </label>
        </div>
      </SettingsForm>
    </div>
  );
}
