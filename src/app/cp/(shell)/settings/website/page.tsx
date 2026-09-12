import { getSettingsGroup, defineSetting } from "@/lib/cp/settings/settingsRepository";
import { WEBSITE_TOGGLE_FIELDS, WEBSITE_MAINTENANCE_MESSAGE_VARNAME, WEBSITE_MAINTENANCE_MESSAGE_DEFAULT } from "./fields";
import { saveWebsiteBehaviourAction } from "./actions";
import { SettingsForm } from "../_components/SettingsForm";
import { FIELD_CLASS, LABEL_CLASS, HINT_CLASS, CHECKBOX_ROW_CLASS, CHECKBOX_CLASS } from "../_components/styles";

export default async function WebsiteBehaviourPage() {
  for (const field of WEBSITE_TOGGLE_FIELDS) {
    await defineSetting({ varname: field.varname, grouptitle: "website", value: field.defaultValue, optioncodeType: "text" });
  }
  await defineSetting({
    varname: WEBSITE_MAINTENANCE_MESSAGE_VARNAME,
    grouptitle: "website",
    value: WEBSITE_MAINTENANCE_MESSAGE_DEFAULT,
    optioncodeType: "text",
  });

  const rows = await getSettingsGroup("website");
  const valueByVarname = new Map(rows.map((r) => [r.varname, r.value ?? ""]));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black uppercase tracking-wider text-white">Website Behaviour</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Global feature toggles for the public site. Stored in find_settings (grouptitle=&quot;website&quot;).
        </p>
      </div>

      <SettingsForm
        action={saveWebsiteBehaviourAction}
        defaults={{
          ...Object.fromEntries(WEBSITE_TOGGLE_FIELDS.map((field) => [field.varname, field.defaultValue])),
          [WEBSITE_MAINTENANCE_MESSAGE_VARNAME]: WEBSITE_MAINTENANCE_MESSAGE_DEFAULT,
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {WEBSITE_TOGGLE_FIELDS.map((field) => (
            <label key={field.varname} className={`${CHECKBOX_ROW_CLASS} rounded-xl border border-white/5 bg-white/[0.02] p-4`}>
              <input
                type="checkbox"
                name={field.varname}
                defaultChecked={(valueByVarname.get(field.varname) ?? field.defaultValue) === "on"}
                className={CHECKBOX_CLASS}
              />
              <span className={LABEL_CLASS}>{field.label}</span>
            </label>
          ))}
        </div>

        <div className="space-y-2 border-t border-white/5 pt-6">
          <label className={LABEL_CLASS} htmlFor={WEBSITE_MAINTENANCE_MESSAGE_VARNAME}>
            Maintenance Message
          </label>
          <textarea
            id={WEBSITE_MAINTENANCE_MESSAGE_VARNAME}
            name={WEBSITE_MAINTENANCE_MESSAGE_VARNAME}
            defaultValue={valueByVarname.get(WEBSITE_MAINTENANCE_MESSAGE_VARNAME) ?? WEBSITE_MAINTENANCE_MESSAGE_DEFAULT}
            rows={3}
            className={FIELD_CLASS}
          />
          <p className={HINT_CLASS}>
            Shown to public visitors when Maintenance Mode is on. CP administrators are never blocked from the admin
            panel by this setting.
          </p>
        </div>
      </SettingsForm>
    </div>
  );
}
