import { getDomainSettings } from "@/lib/cp/settings/domainRepository";
import { COMPANY_DETAILS_FIELDS } from "./fields";
import { saveCompanyDetailsAction } from "./actions";
import { SettingsForm } from "../_components/SettingsForm";
import { FIELD_CLASS, LABEL_CLASS, CHECKBOX_ROW_CLASS, CHECKBOX_CLASS } from "../_components/styles";

/**
 * Company Details — reads/writes find_domains directly (the row for whichever site's hostname
 * this request arrived on), NOT find_settings. Unlike most of the newer tabs (an EAV table keyed
 * by varname), every field on this page is a real, typed column — see domainRepository.ts.
 */
export default async function CompanyDetailsPage() {
  const domain = await getDomainSettings();
  const values: Record<string, string> = {
    name: domain.name ?? "",
    brand: domain.brand ?? "",
    link: domain.link ?? "",
    short_description: domain.short_description ?? "",
    email: domain.email ?? "",
    phone: domain.phone ?? "",
    address: domain.address ?? "",
    index_page: domain.index_page ?? "",
    parent_domain: domain.parent_domain ?? "",
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black uppercase tracking-wider text-white">Company</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Stored directly on find_domains — the legacy admin&apos;s own Domain Details record for this site.
        </p>
      </div>

      <SettingsForm action={saveCompanyDetailsAction}>
        {COMPANY_DETAILS_FIELDS.map((field) => (
          <div key={field.key} className="space-y-2">
            <label className={LABEL_CLASS} htmlFor={field.key}>
              {field.label}
            </label>
            {field.type === "textarea" ? (
              <textarea id={field.key} name={field.key} defaultValue={values[field.key]} rows={3} className={FIELD_CLASS} />
            ) : (
              <input id={field.key} name={field.key} defaultValue={values[field.key]} className={FIELD_CLASS} />
            )}
          </div>
        ))}

        <label className={CHECKBOX_ROW_CLASS}>
          <input type="checkbox" name="status" defaultChecked={domain.status} className={CHECKBOX_CLASS} />
          <span className={LABEL_CLASS}>Domain Active</span>
        </label>
      </SettingsForm>
    </div>
  );
}
