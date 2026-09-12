import { getSettingsGroup, defineSetting } from "@/lib/cp/settings/settingsRepository";
import { CONTACT_SETTINGS_FIELDS } from "./fields";
import { saveContactSettingsAction } from "./actions";
import { SettingsForm } from "../_components/SettingsForm";
import { FIELD_CLASS, LABEL_CLASS } from "../_components/styles";

/** Contact Information — find_settings, grouptitle="contact". See fields.ts for why this is a
 * new section rather than an extension of Company's single legacy email/phone/address. */
export default async function ContactSettingsPage() {
  for (const field of CONTACT_SETTINGS_FIELDS) {
    await defineSetting({ varname: field.varname, grouptitle: "contact", value: "", optioncodeType: "text" });
  }

  const rows = await getSettingsGroup("contact");
  const valueByVarname = new Map(rows.map((r) => [r.varname, r.value ?? ""]));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black uppercase tracking-wider text-white">Contact Information</h2>
        <p className="mt-1 text-sm text-zinc-500">
          The structured contact details the public site&apos;s contact page and footer draw from — separate from
          Company&apos;s single legacy email/phone/address, which other parts of this app already depend on.
        </p>
      </div>

      <SettingsForm
        action={saveContactSettingsAction}
        /* Contact details ship empty — there is no plausible factory value for someone else's
           phone number — so "Restore Defaults" here clears the form back to unset. */
        defaults={Object.fromEntries(CONTACT_SETTINGS_FIELDS.map((field) => [field.varname, ""]))}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          {CONTACT_SETTINGS_FIELDS.map((field) => (
            <div key={field.varname} className="space-y-2">
              <label className={LABEL_CLASS} htmlFor={field.varname}>
                {field.label}
              </label>
              <input
                id={field.varname}
                name={field.varname}
                type={field.kind === "email" ? "email" : field.kind === "url" ? "url" : "text"}
                defaultValue={valueByVarname.get(field.varname) ?? ""}
                className={FIELD_CLASS}
              />
            </div>
          ))}
        </div>
      </SettingsForm>
    </div>
  );
}
