"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { setNamedFieldValue } from "./setFieldValue";

/**
 * Every Settings sub-page's Server Action returns this shape instead of `void`/`{ok:true}` —
 * that's what lets this one shared form shell show a real success/error toast, a "Saving..."
 * state, and a disabled-during-save form. Every action still does its own
 * requireCpPermission()/Zod validation server-side first — this component only renders
 * whatever the action reports back.
 */
export type SettingsActionState = { success: boolean; message: string };

export const INITIAL_SETTINGS_ACTION_STATE: SettingsActionState = { success: false, message: "" };

export function SettingsForm({
  action,
  children,
  saveLabel = "Save Changes",
  defaults,
}: {
  action: (prevState: SettingsActionState, formData: FormData) => Promise<SettingsActionState>;
  children: React.ReactNode;
  saveLabel?: string;
  /**
   * field name -> the value this setting ships with (checkboxes: "on"/"off"). Supplying it adds
   * a "Restore Defaults" button that puts those values back into the form.
   *
   * Deliberately NOT a save: restoring only repopulates the fields and marks the form dirty, so
   * nothing is overwritten in the database until the admin reviews the result and presses Save.
   * An irreversible one-click wipe of a live site's configuration is not what a button labelled
   * "reset" should do. Pages whose values come from a real find_domains record (Company,
   * Branding, Social) pass nothing, because "" is not a default for those — it's data loss.
   */
  defaults?: Record<string, string>;
}) {
  const [state, formAction, isPending] = useActionState(action, INITIAL_SETTINGS_ACTION_STATE);
  const [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // A save that came back (success OR a validation error) means the just-submitted values are
  // now what's on screen / what the server has — either way "unsaved changes" no longer applies
  // to that submission. A fresh edit right after still re-arms it via the form's onChange below.
  useEffect(() => {
    if (state.message) {
      setDirty(false);
      setNotice(null);
    }
  }, [state]);

  useEffect(() => {
    function warnOnUnload(e: BeforeUnloadEvent) {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", warnOnUnload);
    return () => window.removeEventListener("beforeunload", warnOnUnload);
  }, [dirty]);

  function restoreDefaults() {
    const form = formRef.current;
    if (!form || !defaults) return;

    for (const [name, value] of Object.entries(defaults)) {
      setNamedFieldValue(form, name, value);
    }

    setDirty(true);
    setNotice("Defaults restored below — press Save Changes to apply them, or Undo Changes to go back.");
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      onChange={() => setDirty(true)}
      onReset={() => {
        setDirty(false);
        setNotice(null);
      }}
      className="space-y-6 rounded-2xl border border-white/10 bg-zinc-900/40 p-6"
      noValidate
    >
      <fieldset disabled={isPending} className="space-y-6 border-0 p-0 m-0">
        {children}
      </fieldset>

      <div className="flex flex-col gap-4 border-t border-white/5 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <div aria-live="polite" role="status" className="min-h-[1rem] text-xs font-bold">
          {state.message ? (
            <span className={state.success ? "text-emerald-400" : "text-rose-400"}>{state.message}</span>
          ) : notice ? (
            <span className="font-medium text-sky-400">{notice}</span>
          ) : dirty ? (
            <span className="text-amber-400">Unsaved changes</span>
          ) : null}
        </div>
        <div className="flex flex-wrap justify-end gap-3">
          {defaults && (
            <button
              type="button"
              onClick={restoreDefaults}
              disabled={isPending}
              title="Put every field back to the value this setting ships with. Nothing is saved until you press Save Changes."
              className="rounded-full border border-white/10 px-8 py-3.5 text-xs font-black uppercase tracking-widest text-zinc-400 transition hover:bg-white/5 hover:text-white disabled:opacity-50"
            >
              Restore Defaults
            </button>
          )}
          <button
            type="reset"
            disabled={isPending}
            title="Discard your edits and go back to the values currently saved for this site."
            className="rounded-full border border-white/10 px-8 py-3.5 text-xs font-black uppercase tracking-widest text-zinc-400 transition hover:bg-white/5 disabled:opacity-50"
          >
            Undo Changes
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-full bg-brand-pink px-10 py-3.5 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-brand-pink/20 transition hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
          >
            {isPending ? "Saving…" : saveLabel}
          </button>
        </div>
      </div>
    </form>
  );
}
