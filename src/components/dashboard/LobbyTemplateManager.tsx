"use client";

/**
 * Port of the list + Add/Edit screens in members/event_lobby_templates.php / .tpl.
 *
 * The list columns (Title / Layout Type / Status / Manage) and the three Manage actions
 * (edit, copy, delete) follow the legacy exactly. The form carries Title, Image, Description,
 * Layout Type and Status.
 */

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios, { isAxiosError } from "axios";
import {
  Plus,
  Search,
  X,
  Pencil,
  Trash2,
  Copy,
  ArrowUpDown,
  ImageIcon,
  Upload,
  AlertTriangle,
  Loader2,
  LayoutTemplate,
} from "lucide-react";
import {
  eventLobbyTemplateSchema,
  LOBBY_TEMPLATE_LAYOUT_TYPES,
  LOBBY_TEMPLATE_STATUSES,
  LOBBY_TEMPLATE_LAYOUT_LABELS,
  normaliseLayoutType,
  normaliseTemplateStatus,
  type EventLobbyTemplateInput,
} from "@/lib/validations/eventLobbyTemplate";
import type { LobbyTemplateRow } from "@/lib/services/eventLobbyTemplates";

const FIELD_CLASS =
  "w-full rounded-lg border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-brand-pink focus:outline-none focus:ring-1 focus:ring-brand-pink";
const LABEL_CLASS = "mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-zinc-400";

/** Legacy help text under the upload box. */
const IMAGE_HINT = "Recommended: image resolution should be 1600px × 920px.";

type SortKey = "title" | "layoutType" | "status";

function extractErrorMessage(err: unknown, fallback: string): string {
  if (!isAxiosError(err)) return fallback;
  const apiError = err.response?.data?.error;
  if (typeof apiError === "string") return apiError;
  if (apiError && typeof apiError === "object") {
    const first = Object.values(apiError as Record<string, string[] | undefined>).find(
      (m) => Array.isArray(m) && m.length > 0
    );
    if (first?.[0]) return first[0];
  }
  return fallback;
}

function layoutLabel(value: string): string {
  return LOBBY_TEMPLATE_LAYOUT_LABELS[value] ?? value.replace(/_/g, " ");
}

/* ------------------------------- Add / Edit -------------------------------- */

function TemplateFormModal({
  template,
  onClose,
  onSaved,
}: {
  template: LobbyTemplateRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = Boolean(template);
  const [formError, setFormError] = useState("");
  const [preview, setPreview] = useState<string | null>(template?.image ?? null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EventLobbyTemplateInput>({
    resolver: zodResolver(eventLobbyTemplateSchema) as never,
    defaultValues: {
      title: template?.title ?? "",
      description: template?.description ?? "",
      layout_type: normaliseLayoutType(template?.layoutType),
      status: normaliseTemplateStatus(template?.status),
    },
  });

  const layoutType = watch("layout_type");

  function pickFile(file: File | undefined) {
    if (!file) return;
    setPendingFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(String(e.target?.result ?? ""));
    reader.readAsDataURL(file);
  }

  async function onSubmit(data: EventLobbyTemplateInput) {
    setFormError("");
    try {
      // The image is named after the row id on disk, so a new template has to be created first
      // and the file uploaded against the id that comes back — the same two-step the legacy used.
      const id = isEdit
        ? template!.id
        : (await axios.post("/api/members/lobby-templates", data)).data.id;

      if (isEdit) {
        await axios.patch(`/api/members/lobby-templates/${template!.id}`, data);
      }

      if (pendingFile) {
        const body = new FormData();
        body.append("file", pendingFile);
        body.append("id", String(id));
        body.append("kind", "template");
        await axios.post("/api/members/lobby-templates/upload", body);
      }

      onSaved();
    } catch (err) {
      setFormError(extractErrorMessage(err, "Could not save this template."));
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
      <div className="my-8 w-full max-w-2xl rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <h3 className="text-sm font-black uppercase tracking-wider text-white">
            {isEdit ? "Edit Lobby Template" : "Add Lobby Template"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 px-6 py-5">
          {formError && (
            <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-300">
              {formError}
            </p>
          )}

          <div>
            <label className={LABEL_CLASS} htmlFor="tpl-title">
              Title *
            </label>
            <input id="tpl-title" {...register("title")} className={FIELD_CLASS} placeholder="Auditorium Template 1" />
            {errors.title && <p className="mt-1 text-xs text-red-400">{errors.title.message}</p>}
          </div>

          <div>
            <span className={LABEL_CLASS}>Image</span>
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative flex h-[100px] w-[200px] shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-white/20 bg-black/40">
                {preview ? (
                  // Preview is a data: URL before upload and a /files path afterwards; next/image
                  // cannot handle the former, so a plain img is the honest choice here.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview} alt="" className="h-full w-full object-cover" />
                ) : (
                  <ImageIcon className="h-7 w-7 text-zinc-600" />
                )}
              </div>
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-wider text-zinc-200 transition hover:bg-white/10"
                >
                  <Upload className="h-3.5 w-3.5" />
                  {preview ? "Replace image" : "Choose image"}
                </button>
                <p className="max-w-[240px] text-[11px] font-medium text-zinc-500">{IMAGE_HINT}</p>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                onChange={(e) => pickFile(e.target.files?.[0])}
              />
            </div>
          </div>

          <div>
            <label className={LABEL_CLASS} htmlFor="tpl-description">
              Description
            </label>
            <textarea id="tpl-description" rows={3} {...register("description")} className={FIELD_CLASS} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={LABEL_CLASS} htmlFor="tpl-layout">
                Layout Type
              </label>
              <select id="tpl-layout" {...register("layout_type")} className={FIELD_CLASS}>
                <option value="">None</option>
                {LOBBY_TEMPLATE_LAYOUT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {LOBBY_TEMPLATE_LAYOUT_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={LABEL_CLASS} htmlFor="tpl-status">
                Status
              </label>
              <select id="tpl-status" {...register("status")} className={FIELD_CLASS}>
                {LOBBY_TEMPLATE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s === "enabled" ? "Enabled" : "Disabled"}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {layoutType === "exhibition_stand" && (
            <p className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-zinc-400">
              Exhibition-stand templates can carry colourways. Save the template, then manage its colours
              from the list.
            </p>
          )}

          <div className="flex justify-end gap-2 border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-zinc-300 transition hover:bg-white/10 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-brand-gradient inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-xs font-black uppercase tracking-wider text-white disabled:opacity-60"
            >
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {isSubmitting ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ------------------------------- Colourways -------------------------------- */

function ColorsModal({
  template,
  onClose,
  onChanged,
}: {
  template: LobbyTemplateRow;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [color, setColor] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function add() {
    if (!color.trim()) {
      setError("Colour is required.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      const { data } = await axios.post(`/api/members/lobby-templates/${template.id}/colors`, {
        color: color.trim(),
      });
      if (file) {
        const body = new FormData();
        body.append("file", file);
        body.append("id", String(data.id));
        body.append("kind", "color");
        await axios.post("/api/members/lobby-templates/upload", body);
      }
      setColor("");
      setFile(null);
      onChanged();
    } catch (err) {
      setError(extractErrorMessage(err, "Could not add this colour."));
    } finally {
      setBusy(false);
    }
  }

  async function remove(colorId: number) {
    setError("");
    setBusy(true);
    try {
      await axios.delete(`/api/members/lobby-templates/colors/${colorId}`);
      onChanged();
    } catch (err) {
      setError(extractErrorMessage(err, "Could not delete this colour."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
      <div className="my-8 w-full max-w-xl rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <h3 className="text-sm font-black uppercase tracking-wider text-white">
            Colour options — {template.title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          {error && (
            <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-300">
              {error}
            </p>
          )}

          {template.colors.length === 0 ? (
            <p className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-zinc-500">
              No colourways yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {template.colors.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2"
                >
                  <div className="h-10 w-16 shrink-0 overflow-hidden rounded-md border border-white/10 bg-black/40">
                    {c.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.image} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <span className="flex-1 text-sm font-semibold text-white">{c.color}</span>
                  <button
                    type="button"
                    onClick={() => remove(c.id)}
                    disabled={busy}
                    aria-label={`Delete ${c.color}`}
                    className="rounded-lg p-2 text-red-400 transition hover:bg-red-500/10 disabled:opacity-40"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <label className={LABEL_CLASS} htmlFor="colour-name">
              Add a colour
            </label>
            <input
              id="colour-name"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className={FIELD_CLASS}
              placeholder="Midnight Blue"
            />
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-wider text-zinc-200 transition hover:bg-white/10"
              >
                <Upload className="h-3.5 w-3.5" />
                {file ? file.name.slice(0, 24) : "Swatch image"}
              </button>
              <span className="text-[11px] text-zinc-500">{IMAGE_HINT}</span>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                onClick={add}
                disabled={busy}
                className="btn-brand-gradient ml-auto inline-flex items-center gap-2 rounded-xl px-5 py-2 text-xs font-black uppercase tracking-wider text-white disabled:opacity-60"
              >
                {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Add
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------- List ----------------------------------- */

export function LobbyTemplateManager({ templates }: { templates: LobbyTemplateRow[] }) {
  const router = useRouter();
  const [keyword, setKeyword] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "title", dir: "asc" });
  const [formTemplate, setFormTemplate] = useState<LobbyTemplateRow | "new" | null>(null);
  const [colorsTemplate, setColorsTemplate] = useState<LobbyTemplateRow | null>(null);
  const [pendingDelete, setPendingDelete] = useState<LobbyTemplateRow | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const visible = useMemo(() => {
    const needle = keyword.trim().toLowerCase();
    const filtered = needle
      ? templates.filter((t) =>
          [t.title, layoutLabel(t.layoutType), t.status, t.description ?? ""]
            .join(" ")
            .toLowerCase()
            .includes(needle)
        )
      : templates;

    const dir = sort.dir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const left = sort.key === "layoutType" ? layoutLabel(a.layoutType) : String(a[sort.key] ?? "");
      const right = sort.key === "layoutType" ? layoutLabel(b.layoutType) : String(b[sort.key] ?? "");
      return left.toLowerCase().localeCompare(right.toLowerCase()) * dir;
    });
  }, [templates, keyword, sort]);

  function toggleSort(key: SortKey) {
    setSort((p) => (p.key === key ? { key, dir: p.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  }

  async function copy(template: LobbyTemplateRow) {
    setError("");
    setBusyId(template.id);
    try {
      await axios.post(`/api/members/lobby-templates/${template.id}/copy`);
      router.refresh();
    } catch (err) {
      setError(extractErrorMessage(err, "Could not copy this template."));
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setError("");
    setBusyId(pendingDelete.id);
    try {
      await axios.delete(`/api/members/lobby-templates/${pendingDelete.id}`);
      setPendingDelete(null);
      router.refresh();
    } catch (err) {
      setError(extractErrorMessage(err, "Could not delete this template."));
      setPendingDelete(null);
    } finally {
      setBusyId(null);
    }
  }

  const columns: { key: SortKey; label: string }[] = [
    { key: "title", label: "Title" },
    { key: "layoutType", label: "Layout Type" },
    { key: "status", label: "Status" },
  ];

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-300">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            type="search"
            placeholder="Search templates..."
            aria-label="Search templates"
            autoComplete="off"
            className="w-full rounded-xl border border-white/10 bg-black/40 py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-zinc-500 focus:border-brand-pink focus:outline-none focus:ring-1 focus:ring-brand-pink"
          />
        </div>

        <button
          type="button"
          onClick={() => setFormTemplate("new")}
          className="btn-brand-gradient inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white"
        >
          <Plus className="h-4 w-4" />
          Add Event Lobby Template
        </button>
      </div>

      {templates.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-6 py-12 text-center">
          <LayoutTemplate className="mx-auto h-10 w-10 text-zinc-600" />
          <p className="mt-3 text-sm font-bold text-zinc-300">No lobby templates in this database</p>
          <p className="mx-auto mt-2 max-w-xl text-xs leading-relaxed text-zinc-500">
            The live site lists twelve, so this is almost certainly the migration gap rather than an
            empty catalogue: <code className="text-zinc-400">scripts/migrate-to-neon.js</code> scoped every
            table with an <code className="text-zinc-400">event_id</code> column by event, and this
            catalogue is platform-wide with a NULL event_id — so none of its rows were copied. Restore
            them with:
          </p>
          <code className="mt-4 inline-block rounded-lg border border-white/10 bg-black/50 px-4 py-2 text-xs font-semibold text-emerald-300">
            npm run db:lobby-templates
          </code>
          <p className="mt-3 text-[11px] text-zinc-600">
            Safe to re-run — it matches on title and never touches a template that already exists.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="bg-brand-purple/40">
                <th scope="col" className="w-20 px-4 py-3" />
                {columns.map((col) => (
                  <th key={col.key} scope="col" className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key)}
                      aria-label={`Sort by ${col.label}`}
                      className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-white transition hover:text-brand-pink"
                    >
                      {col.label}
                      <ArrowUpDown className={`h-3 w-3 ${sort.key === col.key ? "text-brand-pink" : "text-white/40"}`} />
                    </button>
                  </th>
                ))}
                <th scope="col" className="px-4 py-3 text-[11px] font-black uppercase tracking-wider text-white">
                  Manage
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 2} className="px-4 py-10 text-center text-sm italic text-zinc-500">
                    No templates match “{keyword}”.
                  </td>
                </tr>
              ) : (
                visible.map((template) => (
                  <tr key={template.id} className="bg-zinc-900/40 transition hover:bg-white/5">
                    <td className="px-4 py-3">
                      <div className="h-10 w-16 overflow-hidden rounded-md border border-white/10 bg-black/40">
                        {template.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={template.image} alt="" className="h-full w-full object-cover" />
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-bold text-white">{template.title || "Untitled"}</span>
                      {template.ownedByThisEvent && (
                        <span className="ml-2 rounded-md border border-brand-pink/30 bg-brand-pink/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-brand-pink">
                          This event
                        </span>
                      )}
                      {template.colors.length > 0 && (
                        <span className="mt-0.5 block text-[11px] text-zinc-500">
                          {template.colors.length} colourway{template.colors.length === 1 ? "" : "s"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm capitalize text-zinc-300">{layoutLabel(template.layoutType)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          template.status === "enabled"
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                            : "border-zinc-600/40 bg-zinc-700/20 text-zinc-400"
                        }`}
                      >
                        {template.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setFormTemplate(template)}
                          title="Edit"
                          aria-label={`Edit ${template.title}`}
                          className="rounded-lg p-2 text-zinc-400 transition hover:bg-white/10 hover:text-white"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => copy(template)}
                          disabled={busyId === template.id}
                          title="Copy"
                          aria-label={`Copy ${template.title}`}
                          className="rounded-lg p-2 text-zinc-400 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
                        >
                          {busyId === template.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                        {template.layoutType === "exhibition_stand" && (
                          <button
                            type="button"
                            onClick={() => setColorsTemplate(template)}
                            title="Colour options"
                            aria-label={`Colour options for ${template.title}`}
                            className="rounded-lg p-2 text-zinc-400 transition hover:bg-white/10 hover:text-white"
                          >
                            <ImageIcon className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setPendingDelete(template)}
                          title="Delete"
                          aria-label={`Delete ${template.title}`}
                          className="rounded-lg p-2 text-zinc-400 transition hover:bg-red-500/15 hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {formTemplate && (
        <TemplateFormModal
          template={formTemplate === "new" ? null : formTemplate}
          onClose={() => setFormTemplate(null)}
          onSaved={() => {
            setFormTemplate(null);
            router.refresh();
          }}
        />
      )}

      {colorsTemplate && (
        <ColorsModal
          template={colorsTemplate}
          onClose={() => setColorsTemplate(null)}
          onChanged={() => {
            setColorsTemplate(null);
            router.refresh();
          }}
        />
      )}

      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950 p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-white">Delete this template?</h3>
                <p className="mt-2 text-sm text-zinc-400">
                  <span className="font-semibold text-zinc-200">{pendingDelete.title}</span> and its colourways will be
                  removed.
                </p>
                <p className="mt-2 text-xs font-medium text-amber-400">
                  Templates are a shared catalogue — this removes it for every event that has not already imported
                  it.
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-zinc-300 transition hover:bg-white/10 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={busyId === pendingDelete.id}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white transition hover:bg-red-500 disabled:opacity-60"
              >
                {busyId === pendingDelete.id && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
