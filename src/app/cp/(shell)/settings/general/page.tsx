import { getSettingsGroup, defineSetting } from "@/lib/cp/settings/settingsRepository";
import { listUpcomingEventsForDropdown, getActiveEventId } from "@/lib/cp/events/eventsRepository";
import { GENERAL_SETTINGS_FIELDS } from "./fields";
import { saveGeneralSettingsAction } from "./actions";
import { SettingsForm } from "../_components/SettingsForm";
import { FIELD_CLASS, LABEL_CLASS, HINT_CLASS } from "../_components/styles";

/**
 * Site Information — stored in find_settings (grouptitle="general"), the same table the legacy
 * admin panel's own Settings screen reads and writes. Site Name / Organisation Name / Short
 * Description live on the Company tab instead (real find_domains columns) — see fields.ts for
 * why they aren't duplicated here.
 *
 * The "Event" dropdown below is NOT one of GENERAL_SETTINGS_FIELDS (it isn't a find_settings
 * grouptitle="general" varname) — it reads/writes the same cp_active_event_id setting Events
 * Management's "Mark Active" button uses (see eventsRepository.ts), because this IS the
 * site-wide active event control: whichever event is selected here is what
 * src/lib/services/domain.ts's getDomain() resolves for the entire public/member site.
 */
export default async function GeneralSettingsPage() {
  // Idempotent: only inserts a row the very first time a field is loaded on this domain.
  for (const field of GENERAL_SETTINGS_FIELDS) {
    await defineSetting({
      varname: field.varname,
      grouptitle: "general",
      value: field.defaultValue,
      optioncodeType: field.type === "textarea" ? "textarea" : "text",
    });
  }

  const [rows, upcomingEvents, activeEventId] = await Promise.all([
    getSettingsGroup("general"),
    listUpcomingEventsForDropdown(),
    getActiveEventId(),
  ]);
  const valueByVarname = new Map(rows.map((r) => [r.varname, r.value ?? ""]));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black uppercase tracking-wider text-white">Site Information</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Core identity fields for this site. Site Name, Organisation Name, and Short Description are managed on the{" "}
          <span className="font-bold text-zinc-300">Company</span> tab instead, since those already have a real
          record on find_domains.
        </p>
      </div>

      <SettingsForm
        action={saveGeneralSettingsAction}
        /* The Event dropdown below is deliberately left out of the defaults: "no active event"
           is not a sensible thing to hand an admin, and it is not a find_settings general
           field in the first place. Restoring defaults leaves the active event untouched. */
        defaults={Object.fromEntries(
          GENERAL_SETTINGS_FIELDS.map((field) => [field.varname, field.defaultValue])
        )}
      >
        {GENERAL_SETTINGS_FIELDS.map((field) => (
          <div key={field.varname} className="space-y-2">
            <label className={LABEL_CLASS} htmlFor={field.varname}>
              {field.label}
            </label>
            {field.type === "textarea" ? (
              <textarea
                id={field.varname}
                name={field.varname}
                defaultValue={valueByVarname.get(field.varname) ?? field.defaultValue}
                rows={4}
                className={FIELD_CLASS}
              />
            ) : (
              <input
                id={field.varname}
                name={field.varname}
                defaultValue={valueByVarname.get(field.varname) ?? field.defaultValue}
                className={FIELD_CLASS}
              />
            )}
          </div>
        ))}

        <div className="space-y-2 border-t border-white/5 pt-6">
          <label className={LABEL_CLASS} htmlFor="event_id">
            Event
          </label>
          <select
            id="event_id"
            name="event_id"
            defaultValue={activeEventId ?? ""}
            className={FIELD_CLASS}
          >
            <option value="">Select an Event</option>
            {upcomingEvents.map((event) => (
              <option key={event.id} value={event.id}>
                {event.id} - {event.title}
              </option>
            ))}
          </select>
          <p className={HINT_CLASS}>
            Only upcoming events are listed (past events are hidden). Whichever event is selected here becomes the
            site-wide active event — it&apos;s what the entire public/member site shows via getDomain(), same
            setting as Events Management&apos;s &quot;Mark Active&quot; button.
          </p>
        </div>
      </SettingsForm>
    </div>
  );
}
