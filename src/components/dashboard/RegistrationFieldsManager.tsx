"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios, { isAxiosError } from "axios";
import { Lock, Pencil, Plus, Trash2, X, Palette, AlertTriangle } from "lucide-react";
import {
  OPTION_BACKED_FIELD_TYPES,
  REGISTRATION_FIELD_TYPES,
  type RegistrationFieldType,
} from "@/lib/validations/eventRegistrationField";
import type { RegistrationFieldRow } from "@/lib/services/eventRegistrationFields";

/**
 * Port of legacy members/manage_registration.tpl.
 *
 * Behaviour kept from the original:
 *  - three switches per row: Include / Required / Validate on Login
 *  - only custom fields show the delete action
 *  - select / checkbox / radio types get a repeatable option editor
 *
 * Fixed while porting:
 *  - "Validate on Login" now actually saves. The legacy template gave it a
 *    `change_login` class but only ever bound AJAX to `.change_active` and
 *    `.change_required`, so that switch silently did nothing.
 *  - switches save optimistically and roll back visibly on failure, instead of
 *    the original's `success: console.log(response)` with no error path at all.
 *  - built-in (non-custom) rows are no longer rendered with DISABLED switches.
 *    Every row seeded for a new event is non-custom, so locking them left the
 *    screen completely inert on a fresh event — and it contradicted this
 *    component's own edit dialog, which has always let the same three flags be
 *    changed on any row via the pencil. A switch you cannot move next to a
 *    pencil that moves it is not a safety rail, just a dead end. Built-ins keep
 *    their lock badge and still cannot be deleted.
 */

interface Props {
  eventId: number;
  fields: RegistrationFieldRow[];
}

type FormState = {
  id: number | null;
  field_name: string;
  field_variable: string;
  field_type: RegistrationFieldType;
  is_active: boolean;
  is_required: boolean;
  login: boolean;
  options: string[];
};

const EMPTY_FORM: FormState = {
  id: null,
  field_name: "",
  field_variable: "",
  field_type: "text",
  is_active: false,
  is_required: false,
  login: false,
  options: [],
};

const TYPE_LABELS: Record<RegistrationFieldType, string> = {
  text: "Text",
  select: "Select",
  checkbox: "Checkbox",
  radio: "Radio",
  date: "Date",
  password: "Password",
};

function ToggleSwitch({
  checked,
  disabled,
  onChange,
  label,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <label
      className={`inline-flex items-center ${disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"}`}
      title={disabled ? "Built-in field — this setting is fixed." : undefined}
    >
      <input
        type="checkbox"
        role="switch"
        className="peer sr-only"
        checked={checked}
        disabled={disabled}
        aria-label={label}
        onChange={(e) => onChange(e.target.checked)}
      />
      {/*
        Both track and knob are styled from the `checked` prop rather than from
        Tailwind's `peer-checked:` variant. That variant compiles to a general
        SIBLING selector (`.peer:checked ~ …`), so it can colour the track (a
        sibling of the input) but never reaches the knob, which is a descendant
        of the track — the knob silently stayed on the left in every "on" state.
        Deriving both from state we already have removes the whole class of bug.
      */}
      <span
        className={`relative h-6 w-11 rounded-full transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-brand-pink/50 ${
          checked ? "bg-brand-pink" : "bg-white/15"
        }`}
      >
        <span
          className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </span>
    </label>
  );
}

export function RegistrationFieldsManager({ eventId, fields }: Props) {
  const router = useRouter();
  const [rows, setRows] = useState(fields);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => setRows(fields), [fields]);

  const showsOptions = OPTION_BACKED_FIELD_TYPES.includes(form.field_type);

  function openAdd() {
    setForm(EMPTY_FORM);
    setError(null);
    setModalOpen(true);
  }

  function openEdit(row: RegistrationFieldRow) {
    setForm({
      id: row.id,
      field_name: row.fieldName,
      field_variable: row.fieldVariable,
      field_type: (REGISTRATION_FIELD_TYPES as readonly string[]).includes(row.fieldType)
        ? (row.fieldType as RegistrationFieldType)
        : "text",
      is_active: row.isActive,
      is_required: row.isRequired,
      login: row.login,
      options: row.options.length > 0 ? row.options : [],
    });
    setError(null);
    setModalOpen(true);
  }

  /** Optimistic: flip locally, then roll back if the request fails. */
  async function toggleFlag(
    row: RegistrationFieldRow,
    flag: "is_active" | "is_required" | "login",
    value: boolean,
  ) {
    const key = { is_active: "isActive", is_required: "isRequired", login: "login" } as const;
    const property = key[flag];

    setRows((current) =>
      current.map((r) => (r.id === row.id ? { ...r, [property]: value } : r)),
    );
    setError(null);

    try {
      await axios.patch(`/api/members/registration-fields?event_id=${eventId}`, {
        id: row.id,
        flag,
        value,
      });
    } catch (err) {
      setRows((current) =>
        current.map((r) => (r.id === row.id ? { ...r, [property]: !value } : r)),
      );
      setError(
        isAxiosError(err) && typeof err.response?.data?.error === "string"
          ? err.response.data.error
          : `Could not update "${row.fieldName}". The change has been reverted.`,
      );
    }
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      field_name: form.field_name,
      field_variable: form.field_variable,
      field_type: form.field_type,
      is_active: form.is_active,
      is_required: form.is_required,
      login: form.login,
      options: showsOptions ? form.options.filter((o) => o.trim() !== "") : [],
    };

    try {
      if (form.id) {
        await axios.put(`/api/members/registration-fields/${form.id}?event_id=${eventId}`, payload);
        setNotice("Field updated.");
      } else {
        await axios.post(`/api/members/registration-fields?event_id=${eventId}`, payload);
        setNotice("Field added.");
      }
      setModalOpen(false);
      router.refresh();
    } catch (err) {
      const data = isAxiosError(err) ? err.response?.data?.error : null;
      setError(
        typeof data === "string"
          ? data
          : data && typeof data === "object"
            ? Object.values(data as Record<string, string[]>).flat().join(" ")
            : "Could not save this field.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function removeField(row: RegistrationFieldRow) {
    if (!window.confirm(`Delete the "${row.fieldName}" field? This cannot be undone.`)) return;
    setError(null);
    try {
      await axios.delete(`/api/members/registration-fields/${row.id}?event_id=${eventId}`);
      setRows((current) => current.filter((r) => r.id !== row.id));
      setNotice("Field deleted.");
      router.refresh();
    } catch (err) {
      setError(
        isAxiosError(err) && typeof err.response?.data?.error === "string"
          ? err.response.data.error
          : "Could not delete this field.",
      );
    }
  }

  return (
    <div className="space-y-5">
      {/* Header actions — mirrors the two pull-right buttons in the .tpl */}
      <div className="flex flex-wrap items-center justify-end gap-3">
        <Link
          href={`/members/event_configurations?event_id=${eventId}`}
          className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white transition hover:border-white/25 hover:bg-white/10"
        >
          <Palette className="h-4 w-4" /> Register / Login Design
        </Link>
        <button
          type="button"
          onClick={openAdd}
          className="btn-brand-gradient inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-black uppercase tracking-wider"
        >
          <Plus className="h-4 w-4" /> Add Field
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs font-bold text-red-300"
        >
          <AlertTriangle className="mt-px h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {notice && !error && (
        <div
          role="status"
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs font-bold text-emerald-300"
        >
          {notice}
        </div>
      )}

      {/* Column headings — Include / Required / Validate on Login */}
      <div className="hidden grid-cols-[1fr_repeat(3,7rem)_5rem] items-center gap-4 border-b border-white/10 px-4 pb-3 text-[10px] font-black uppercase tracking-widest text-brand-pink md:grid">
        <span>Field</span>
        <span className="text-center">Include</span>
        <span className="text-center">Required</span>
        <span className="text-center">Validate on Login</span>
        <span className="text-right">Actions</span>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-zinc-400">
          No registration fields yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li
              key={row.id}
              className="grid grid-cols-1 items-center gap-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 transition hover:border-white/20 md:grid-cols-[1fr_repeat(3,7rem)_5rem]"
            >
              <div className="min-w-0">
                <p className="flex items-center gap-2 truncate text-sm font-bold text-white">
                  {row.fieldName}
                  {!row.isCustom && (
                    <span
                      title="Built-in field — configurable, but cannot be renamed away or deleted."
                      className="text-zinc-500"
                    >
                      <Lock className="h-3 w-3" />
                    </span>
                  )}
                </p>
                <p className="truncate text-[11px] text-zinc-500">
                  {row.fieldVariable} · {TYPE_LABELS[row.fieldType as RegistrationFieldType] ?? row.fieldType}
                  {row.options.length > 0 ? ` · ${row.options.length} option(s)` : ""}
                </p>
              </div>

              <div className="flex items-center gap-2 md:justify-center">
                <span className="text-[10px] font-bold uppercase text-zinc-500 md:hidden">Include</span>
                <ToggleSwitch
                  checked={row.isActive}
                  label={`Include ${row.fieldName}`}
                  onChange={(v) => toggleFlag(row, "is_active", v)}
                />
              </div>

              <div className="flex items-center gap-2 md:justify-center">
                <span className="text-[10px] font-bold uppercase text-zinc-500 md:hidden">Required</span>
                <ToggleSwitch
                  checked={row.isRequired}
                  label={`Require ${row.fieldName}`}
                  onChange={(v) => toggleFlag(row, "is_required", v)}
                />
              </div>

              <div className="flex items-center gap-2 md:justify-center">
                <span className="text-[10px] font-bold uppercase text-zinc-500 md:hidden">
                  Validate on Login
                </span>
                <ToggleSwitch
                  checked={row.login}
                  label={`Validate ${row.fieldName} on login`}
                  onChange={(v) => toggleFlag(row, "login", v)}
                />
              </div>

              <div className="flex items-center gap-1 md:justify-end">
                <button
                  type="button"
                  onClick={() => openEdit(row)}
                  aria-label={`Edit ${row.fieldName}`}
                  className="rounded-lg p-2 text-zinc-400 transition hover:bg-white/10 hover:text-white"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                {row.isCustom && (
                  <button
                    type="button"
                    onClick={() => removeField(row)}
                    aria-label={`Delete ${row.fieldName}`}
                    className="rounded-lg p-2 text-red-400 transition hover:bg-red-500/10 hover:text-red-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Add / edit modal — the .tpl's #add_form_block */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="glass-panel max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl p-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-lg font-black uppercase text-white">
                {form.id ? "Edit Field" : "Add Field"}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-zinc-400 transition hover:text-white"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={submitForm} className="mt-5 space-y-4">
              <div>
                <label htmlFor="field_name" className="mb-1.5 block text-xs font-bold text-zinc-300">
                  Field Name
                </label>
                <input
                  id="field_name"
                  value={form.field_name}
                  onChange={(e) => setForm({ ...form, field_name: e.target.value })}
                  className="w-full rounded-xl border px-3.5 py-2.5 text-sm"
                  placeholder="Company Name"
                  required
                />
              </div>

              <div>
                <label htmlFor="field_type" className="mb-1.5 block text-xs font-bold text-zinc-300">
                  Field Type
                </label>
                <select
                  id="field_type"
                  value={form.field_type}
                  onChange={(e) =>
                    setForm({ ...form, field_type: e.target.value as RegistrationFieldType })
                  }
                  className="w-full rounded-xl border px-3.5 py-2.5 text-sm"
                >
                  {REGISTRATION_FIELD_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {TYPE_LABELS[type]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="field_variable"
                  className="mb-1.5 block text-xs font-bold text-zinc-300"
                >
                  Field Variable
                </label>
                <input
                  id="field_variable"
                  value={form.field_variable}
                  onChange={(e) => setForm({ ...form, field_variable: e.target.value })}
                  className="w-full rounded-xl border px-3.5 py-2.5 text-sm"
                  placeholder="company_name"
                  required
                />
                <p className="mt-1 text-[11px] text-zinc-500">
                  Used as the input name on the registration form — letters, numbers and
                  underscores only.
                </p>
              </div>

              {/* Repeatable options — the .tpl's .option_dropdown block */}
              {showsOptions && (
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-300">Options</span>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, options: [...form.options, ""] })}
                      className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-3 py-1.5 text-[11px] font-bold uppercase text-white transition hover:bg-white/10"
                    >
                      <Plus className="h-3 w-3" /> Add Option
                    </button>
                  </div>

                  {form.options.length === 0 ? (
                    <p className="text-[11px] text-zinc-500">
                      Add at least one option for a {form.field_type} field.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {form.options.map((option, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <input
                            value={option}
                            onChange={(e) => {
                              const next = [...form.options];
                              next[index] = e.target.value;
                              setForm({ ...form, options: next });
                            }}
                            className="w-full rounded-lg border px-3 py-2 text-sm"
                            placeholder={`Option ${index + 1}`}
                            aria-label={`Option ${index + 1}`}
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setForm({
                                ...form,
                                options: form.options.filter((_, i) => i !== index),
                              })
                            }
                            aria-label={`Remove option ${index + 1}`}
                            className="rounded-lg p-2 text-red-400 transition hover:bg-red-500/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-5 border-t border-white/10 pt-4">
                {(
                  [
                    ["is_active", "Is Active"],
                    ["is_required", "Is Required"],
                    ["login", "Validate on Login"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-zinc-300">
                    <input
                      type="checkbox"
                      checked={form[key]}
                      onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
                      className="h-4 w-4 accent-[var(--color-brand-pink)]"
                    />
                    {label}
                  </label>
                ))}
              </div>

              {error && <p className="text-xs font-semibold text-red-400">{error}</p>}

              <div className="flex justify-end gap-3 border-t border-white/10 pt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-white/15 px-5 py-2.5 text-xs font-bold uppercase text-white transition hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-brand-gradient rounded-xl px-6 py-2.5 text-xs font-black uppercase tracking-wider disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Submit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
