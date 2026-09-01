"use client";

/**
 * The Lobby Agenda list — the landing view of /members/event_lobby_agenda_items, and the direct
 * replacement for the legacy bootstrap-table in members/event_lobby_agenda_items.tpl.
 *
 * Columns, actions and form fields follow members/event_lobby_agenda_items.php: the list is
 * Title / Description / Agenda Type / Status / Manage, and the Add-Edit form carries Session
 * Time, Buffer Time, Agenda Hall Type, Agenda Type, Layout, Status and Timezone.
 */

import { useMemo, useState } from "react";
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
  CalendarDays,
  AlertTriangle,
  Loader2,
  Download,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
} from "lucide-react";
import {
  eventLobbyAgendaTrackSchema,
  AGENDA_TRACK_TYPES,
  normaliseAgendaTrackStatus,
  normaliseAgendaTrackType,
  type EventLobbyAgendaTrackInput,
} from "@/lib/validations/eventLobbyAgendaTrack";
import type { AgendaTrackRow, AgendaLayoutOption } from "@/lib/services/eventLobbyAgendaItems";
import { readCsv, columnIndex, downloadCsv } from "@/lib/csv";
import type { MasterOption } from "@/lib/services/eventServices";

import { ModalPortal } from "@/components/ui/ModalPortal";
const FIELD_CLASS =
  "w-full rounded-lg border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-brand-pink focus:outline-none focus:ring-1 focus:ring-brand-pink";
const LABEL_CLASS = "mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-zinc-400";

/** The legacy form offers only these two; "inactive" stays valid for rows that already hold it. */
const FORM_STATUSES = ["active", "pending"] as const;

type SortKey = "title" | "description" | "agendaType" | "status" | "sessionCount";

function extractErrorMessage(err: unknown, fallback: string): string {
  if (!isAxiosError(err)) return fallback;
  const apiError = err.response?.data?.error;
  if (typeof apiError === "string") return apiError;
  if (apiError && typeof apiError === "object") {
    const firstField = Object.values(apiError as Record<string, string[] | undefined>).find(
      (messages) => Array.isArray(messages) && messages.length > 0
    );
    if (firstField?.[0]) return firstField[0];
  }
  return fallback;
}

/**
 * Browsers have shipped the full IANA list since 2022; the short fallback keeps the field usable
 * anywhere that has not, rather than rendering an empty dropdown.
 */
function timezoneOptions(): string[] {
  const withValues = Intl as unknown as { supportedValuesOf?: (key: string) => string[] };
  try {
    const zones = withValues.supportedValuesOf?.("timeZone");
    if (zones?.length) return zones;
  } catch {
    /* fall through */
  }
  return ["UTC", "Europe/London", "America/New_York", "Asia/Kolkata", "Asia/Dubai", "Australia/Sydney"];
}

/* ------------------------------ Add / Edit form ----------------------------- */

function AgendaFormModal({
  agenda,
  layouts,
  sessionMasters,
  hallTypeMasters,
  onClose,
  onSaved,
}: {
  agenda: AgendaTrackRow | null;
  layouts: AgendaLayoutOption[];
  sessionMasters: MasterOption[];
  hallTypeMasters: MasterOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = Boolean(agenda);
  const [formError, setFormError] = useState("");
  const zones = useMemo(timezoneOptions, []);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EventLobbyAgendaTrackInput>({
    resolver: zodResolver(eventLobbyAgendaTrackSchema) as never,
    defaultValues: {
      title: agenda?.title ?? "",
      description: agenda?.description ?? "",
      agenda_type: normaliseAgendaTrackType(agenda?.agendaType) || "table",
      session_mst: agenda?.sessionMst ?? "",
      buffer_time_mst: agenda?.bufferTimeMst ?? "",
      agenda_hall_type: agenda?.agendaHallType ?? "",
      event_layout_id: agenda?.eventLayoutId ?? layouts[0]?.id ?? null,
      timezone: agenda?.timezone ?? "",
      status: normaliseAgendaTrackStatus(agenda?.status),
    },
  });

  async function onSubmit(data: EventLobbyAgendaTrackInput) {
    setFormError("");
    try {
      if (isEdit) {
        await axios.patch(`/api/members/lobby-agenda-tracks/${agenda!.id}`, data);
      } else {
        await axios.post("/api/members/lobby-agenda-tracks", data);
      }
      onSaved();
    } catch (err) {
      setFormError(extractErrorMessage(err, "Could not save this agenda."));
    }
  }

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto overscroll-contain bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="my-8 w-full max-w-2xl rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <h3 className="text-sm font-black uppercase tracking-wider text-white">
            {isEdit ? "Edit Lobby Agenda" : "Add Lobby Agenda"}
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
            <label className={LABEL_CLASS} htmlFor="agenda-title">
              Title *
            </label>
            <input id="agenda-title" {...register("title")} className={FIELD_CLASS} placeholder="Keynote Forum 1" />
            {errors.title && <p className="mt-1 text-xs text-red-400">{errors.title.message}</p>}
          </div>

          <div>
            <label className={LABEL_CLASS} htmlFor="agenda-description">
              Description
            </label>
            <input id="agenda-description" {...register("description")} className={FIELD_CLASS} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={LABEL_CLASS} htmlFor="agenda-session-mst">
                Session Time
              </label>
              <select id="agenda-session-mst" {...register("session_mst")} className={FIELD_CLASS}>
                <option value="">Please Select</option>
                {sessionMasters.map((m) => (
                  <option key={m.code} value={m.code}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={LABEL_CLASS} htmlFor="agenda-buffer-mst">
                Buffer Time
              </label>
              <select id="agenda-buffer-mst" {...register("buffer_time_mst")} className={FIELD_CLASS}>
                <option value="">Please Select</option>
                {sessionMasters.map((m) => (
                  <option key={m.code} value={m.code}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={LABEL_CLASS} htmlFor="agenda-hall-type">
                Agenda Hall Type
              </label>
              <select id="agenda-hall-type" {...register("agenda_hall_type")} className={FIELD_CLASS}>
                <option value="">Please Select</option>
                {hallTypeMasters.map((m) => (
                  <option key={m.code} value={m.code}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={LABEL_CLASS} htmlFor="agenda-type">
                Agenda Type
              </label>
              <select id="agenda-type" {...register("agenda_type")} className={FIELD_CLASS}>
                {AGENDA_TRACK_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={LABEL_CLASS} htmlFor="agenda-layout">
                Layout
              </label>
              <select
                id="agenda-layout"
                {...register("event_layout_id")}
                className={FIELD_CLASS}
                disabled={layouts.length === 0}
              >
                {layouts.length === 0 && <option value="">No layouts configured yet</option>}
                {layouts.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.isChild ? `— ${l.title}` : l.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={LABEL_CLASS} htmlFor="agenda-status">
                Status
              </label>
              <select id="agenda-status" {...register("status")} className={FIELD_CLASS}>
                {FORM_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s === "active" ? "Active" : "Pending"}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={LABEL_CLASS} htmlFor="agenda-timezone">
              Timezone
            </label>
            <select id="agenda-timezone" {...register("timezone")} className={FIELD_CLASS}>
              <option value="">Please Select</option>
              {zones.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>
          </div>

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
    </ModalPortal>
  );
}

/* ------------------------------- CSV import -------------------------------- */

interface ParsedAgendaRow {
  title: string;
  description: string;
  agenda_type: string;
  session_mst: string;
  buffer_time_mst: string;
  agenda_hall_type: string;
  status: string;
  layout: string;
}

interface ParsedAgendaCsv {
  rows: ParsedAgendaRow[];
  delimiterLabel: string;
  error?: string;
}

/**
 * Maps a CSV onto agenda rows by HEADER NAME, so column order does not matter and the page's own
 * export re-imports unchanged. Only Title is required; everything else falls back to the same
 * defaults the Add form uses.
 *
 * "Sessions" is accepted in the header and ignored: it is a computed count of the rows in
 * find_event_lobby_agenda_items, not a property of the agenda, and the sessions themselves are
 * not part of this file.
 */
function mapAgendaCsv(text: string): ParsedAgendaCsv {
  const { header, rows: table, delimiterLabel } = readCsv(text);
  if (header.length === 0) return { rows: [], delimiterLabel, error: "That file is empty." };

  const iTitle = columnIndex(header, "title", "name", "agenda", "hall");
  const iDesc = columnIndex(header, "description");
  const iType = columnIndex(header, "agenda type", "agenda_type", "type");
  const iSession = columnIndex(header, "session time", "session_mst");
  const iBuffer = columnIndex(header, "buffer time", "buffer_time_mst");
  const iHall = columnIndex(header, "agenda hall type", "hall type", "agenda_hall_type");
  const iStatus = columnIndex(header, "status");
  const iLayout = columnIndex(header, "layout", "event_layout");

  if (iTitle === -1) {
    return {
      rows: [],
      delimiterLabel,
      error:
        `No "Title" column found. Read the file as ${delimiterLabel}; ` +
        `columns came out as: ${header.map((h) => h || "(blank)").join(" | ") || "(empty)"}`,
    };
  }

  const cell = (r: string[], i: number) => (i === -1 ? "" : (r[i] ?? "").trim());

  const rows = table
    .map((r) => ({
      title: cell(r, iTitle),
      description: cell(r, iDesc),
      agenda_type: cell(r, iType).toLowerCase(),
      session_mst: cell(r, iSession),
      buffer_time_mst: cell(r, iBuffer),
      agenda_hall_type: cell(r, iHall),
      status: cell(r, iStatus).toLowerCase(),
      layout: cell(r, iLayout),
    }))
    .filter((r) => r.title !== "");

  if (rows.length === 0) {
    return { rows: [], delimiterLabel, error: "That file has a header but no usable data rows." };
  }
  return { rows, delimiterLabel };
}

interface AgendaImportSummary {
  created: number;
  skipped: number;
  skippedTitles: string[];
  invalid: { row: number; title: string; reason: string }[];
}

function ImportAgendaModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const [fileName, setFileName] = useState("");
  const [parsed, setParsed] = useState<ParsedAgendaCsv | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<AgendaImportSummary | null>(null);

  async function pickFile(file: File | undefined) {
    if (!file) return;
    setError("");
    setSummary(null);
    setFileName(file.name);
    const result = mapAgendaCsv(await file.text());
    setParsed(result);
    if (result.error) setError(result.error);
  }

  async function runImport() {
    if (!parsed?.rows.length) return;
    setBusy(true);
    setError("");
    try {
      const { data } = await axios.post("/api/members/lobby-agenda-tracks/import", { rows: parsed.rows });
      setSummary(data as AgendaImportSummary);
      onImported();
    } catch (err) {
      setError(extractErrorMessage(err, "Could not import this file."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModalPortal onClose={onClose}>
      <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto overscroll-contain bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
        <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-zinc-950 p-6 shadow-2xl">
          <div className="flex items-start justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-pink/15 text-brand-pink">
                <FileSpreadsheet className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-white">Import Agendas from CSV</h3>
                <p className="text-xs text-zinc-400">
                  Same columns as Export CSV. Existing halls are skipped, never overwritten.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-4 pt-5">
            {error && (
              <p className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-300">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </p>
            )}

            {summary ? (
              <div className="space-y-3">
                <p className="flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-300">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    Imported <strong>{summary.created}</strong>{" "}
                    {summary.created === 1 ? "agenda" : "agendas"}.
                    {summary.skipped > 0 && <> {summary.skipped} already existed and were left alone.</>}
                  </span>
                </p>

                {summary.invalid.length > 0 && (
                  <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
                    <p className="mb-1 font-bold uppercase tracking-wider">
                      {summary.invalid.length} row(s) rejected
                    </p>
                    <ul className="space-y-0.5">
                      {summary.invalid.slice(0, 6).map((row) => (
                        <li key={row.row}>
                          Row {row.row}: {row.title || "(no title)"} — {row.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {summary.skippedTitles.length > 0 && (
                  <details className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-zinc-400">
                    <summary className="cursor-pointer font-semibold text-zinc-300">
                      {summary.skippedTitles.length} skipped as duplicates
                    </summary>
                    <p className="mt-2 leading-relaxed">{summary.skippedTitles.join(", ")}</p>
                  </details>
                )}
              </div>
            ) : (
              <>
                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-8 text-center transition hover:border-brand-pink/40 hover:bg-white/[0.04]">
                  <Upload className="h-6 w-6 text-zinc-500" />
                  <span className="text-sm font-semibold text-zinc-200">
                    {fileName || "Choose a CSV file"}
                  </span>
                  <span className="text-[11px] text-zinc-500">
                    Needs a <strong>Title</strong> column; the rest are optional. Comma or tab separated.
                  </span>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(e) => pickFile(e.target.files?.[0])}
                  />
                </label>

                {parsed && !parsed.error && (
                  <div className="space-y-3">
                    <p className="text-sm text-zinc-300">
                      <strong className="text-white">{parsed.rows.length}</strong> row
                      {parsed.rows.length === 1 ? "" : "s"} ready to import{" "}
                      <span className="text-zinc-500">({parsed.delimiterLabel})</span>.
                    </p>
                    <p className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-[11px] leading-relaxed text-zinc-400">
                      A Layout column is matched to this event&apos;s lobby by name; anything blank or
                      unrecognised goes to the parent lobby. Sessions are not part of this file.
                    </p>

                    <div className="max-h-48 overflow-y-auto rounded-xl border border-white/10">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-white/10 bg-gradient-to-r from-brand-purple to-brand-pink text-white">
                            <th className="px-6 py-4 font-black uppercase tracking-wider">Title</th>
                            <th className="px-6 py-4 font-black uppercase tracking-wider">Type</th>
                            <th className="px-6 py-4 font-black uppercase tracking-wider">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {parsed.rows.slice(0, 50).map((row, i) => (
                            <tr key={`${row.title}-${i}`} className="bg-zinc-900/30">
                              <td className="px-3 py-1.5 text-zinc-200">{row.title}</td>
                              <td className="px-3 py-1.5 text-zinc-500">{row.agenda_type || "table"}</td>
                              <td className="px-3 py-1.5 text-zinc-500">{row.status || "active"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {parsed.rows.length > 50 && (
                      <p className="text-[11px] text-zinc-500">
                        Showing the first 50 — all {parsed.rows.length} will be imported.
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="mt-6 flex justify-end gap-2 border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-zinc-300 transition hover:bg-white/10 hover:text-white"
            >
              {summary ? "Done" : "Cancel"}
            </button>
            {!summary && (
              <button
                type="button"
                onClick={runImport}
                disabled={busy || !parsed?.rows.length}
                className="btn-brand-gradient inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white disabled:opacity-40"
              >
                {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {busy ? "Importing..." : `Import ${parsed?.rows.length ?? 0}`}
              </button>
            )}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

/* --------------------------------- The list -------------------------------- */

export function AgendaTrackTable({
  agendas,
  layouts,
  sessionMasters,
  hallTypeMasters,
}: {
  agendas: AgendaTrackRow[];
  layouts: AgendaLayoutOption[];
  sessionMasters: MasterOption[];
  hallTypeMasters: MasterOption[];
}) {
  const router = useRouter();
  const [keyword, setKeyword] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "title", dir: "asc" });
  const [formAgenda, setFormAgenda] = useState<AgendaTrackRow | "new" | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AgendaTrackRow | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const visible = useMemo(() => {
    const needle = keyword.trim().toLowerCase();
    const filtered = needle
      ? agendas.filter((a) =>
          [a.title, a.description, a.agendaType ?? "", a.status, a.layoutTitle ?? ""]
            .join(" ")
            .toLowerCase()
            .includes(needle)
        )
      : agendas;

    const direction = sort.dir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (sort.key === "sessionCount") return (a.sessionCount - b.sessionCount) * direction;
      const left = String(a[sort.key] ?? "").toLowerCase();
      const right = String(b[sort.key] ?? "").toLowerCase();
      return left.localeCompare(right) * direction;
    });
  }, [agendas, keyword, sort]);

  /**
   * Exports what the importer reads back, so a file can round-trip. The Sessions count is
   * included for reference only — it is derived from find_event_lobby_agenda_items and the
   * importer ignores it.
   */
  function exportCsv() {
    downloadCsv(
      "lobby-agendas.csv",
      ["Title", "Description", "Agenda Type", "Session Time", "Buffer Time", "Agenda Hall Type", "Status", "Layout", "Sessions"],
      visible.map((a) => [
        a.title,
        a.description,
        a.agendaType ?? "",
        a.sessionMst ?? "",
        a.bufferTimeMst ?? "",
        a.agendaHallType ?? "",
        a.status,
        a.layoutTitle ?? "",
        a.sessionCount,
      ]),
    );
  }

  function toggleSort(key: SortKey) {
    setSort((prev) => (prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  }

  async function duplicate(agenda: AgendaTrackRow) {
    setErrorMessage("");
    setBusyId(agenda.id);
    try {
      await axios.post(`/api/members/lobby-agenda-tracks/${agenda.id}/duplicate`);
      router.refresh();
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, "Could not duplicate this agenda."));
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setErrorMessage("");
    setBusyId(pendingDelete.id);
    try {
      await axios.delete(`/api/members/lobby-agenda-tracks/${pendingDelete.id}`);
      setPendingDelete(null);
      router.refresh();
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, "Could not delete this agenda."));
      setPendingDelete(null);
    } finally {
      setBusyId(null);
    }
  }

  const columns: { key: SortKey; label: string; className?: string }[] = [
    { key: "title", label: "Title" },
    { key: "description", label: "Description", className: "hidden md:table-cell" },
    { key: "agendaType", label: "Agenda Type" },
    { key: "sessionCount", label: "Sessions", className: "hidden lg:table-cell" },
    { key: "status", label: "Status" },
  ];

  return (
    <div className="space-y-4">
      {errorMessage && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-300">
          {errorMessage}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            type="search"
            placeholder="Search agendas..."
            aria-label="Search agendas"
            autoComplete="off"
            className="w-full rounded-xl border border-white/10 bg-black/40 py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-zinc-500 focus:border-brand-pink focus:outline-none focus:ring-1 focus:ring-brand-pink"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            title="Export CSV"
            onClick={exportCsv}
            disabled={agendas.length === 0}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-xs font-semibold text-zinc-300 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>

          <button
            type="button"
            title="Import CSV"
            onClick={() => setImportOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-xs font-semibold text-zinc-300 transition hover:bg-white/10 hover:text-white"
          >
            <Upload className="h-3.5 w-3.5" />
            Import CSV
          </button>

          <button
            type="button"
            onClick={() => setFormAgenda("new")}
            className="btn-brand-gradient inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white"
          >
            <Plus className="h-4 w-4" />
            Add Agenda
          </button>
        </div>
      </div>

      {agendas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 py-14 text-center">
          <CalendarDays className="mx-auto h-10 w-10 text-zinc-600" />
          <p className="mt-3 text-sm font-bold text-zinc-300">No lobby agendas yet</p>
          <p className="mt-1 text-xs text-zinc-500">
            Add a hall — Keynote Forum, Seminar Hall, Workshop — then build its sessions below.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="border-b border-white/10 bg-gradient-to-r from-brand-purple to-brand-pink text-white">
                {columns.map((col) => (
                  <th key={col.key} scope="col" className={`px-4 py-3 ${col.className ?? ""}`}>
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key)}
                      aria-label={`Sort by ${col.label}`}
                      className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-white transition hover:text-brand-pink"
                    >
                      {col.label}
                      <ArrowUpDown
                        className={`h-3 w-3 ${sort.key === col.key ? "text-brand-pink" : "text-white/40"}`}
                      />
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
                  <td colSpan={columns.length + 1} className="px-4 py-10 text-center text-sm italic text-zinc-500">
                    No agendas match “{keyword}”.
                  </td>
                </tr>
              ) : (
                visible.map((agenda) => (
                  <tr key={agenda.id} className="bg-zinc-900/40 transition hover:bg-white/5">
                    <td className="px-4 py-3">
                      <span className="text-sm font-bold text-white">{agenda.title}</span>
                      {agenda.layoutTitle && (
                        <span className="mt-0.5 block text-[11px] font-medium text-zinc-500">
                          {agenda.layoutTitle}
                        </span>
                      )}
                    </td>
                    <td className="hidden px-4 py-3 text-sm text-zinc-400 md:table-cell">
                      {agenda.description || <span className="text-zinc-600">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-300">
                        {(agenda.agendaType ?? "—").toUpperCase()}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 text-sm font-semibold text-zinc-300 lg:table-cell">
                      {agenda.sessionCount}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          agenda.status === "active"
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                            : "border-amber-500/30 bg-amber-500/10 text-amber-400"
                        }`}
                      >
                        {agenda.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setFormAgenda(agenda)}
                          title="Edit Agenda"
                          aria-label={`Edit ${agenda.title}`}
                          className="rounded-lg p-2 text-zinc-400 transition hover:bg-white/10 hover:text-white"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => duplicate(agenda)}
                          disabled={busyId === agenda.id}
                          title="Duplicate Agenda"
                          aria-label={`Duplicate ${agenda.title}`}
                          className="rounded-lg p-2 text-zinc-400 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
                        >
                          {busyId === agenda.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingDelete(agenda)}
                          title="Delete Agenda"
                          aria-label={`Delete ${agenda.title}`}
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

      {importOpen && (
        <ImportAgendaModal
          onClose={() => setImportOpen(false)}
          onImported={() => router.refresh()}
        />
      )}

      {formAgenda && (
        <AgendaFormModal
          agenda={formAgenda === "new" ? null : formAgenda}
          layouts={layouts}
          sessionMasters={sessionMasters}
          hallTypeMasters={hallTypeMasters}
          onClose={() => setFormAgenda(null)}
          onSaved={() => {
            setFormAgenda(null);
            router.refresh();
          }}
        />
      )}

      {pendingDelete && (
        <ModalPortal>
      <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto overscroll-contain bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950 p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-white">Delete this agenda?</h3>
                <p className="mt-2 text-sm text-zinc-400">
                  <span className="font-semibold text-zinc-200">{pendingDelete.title}</span> will be removed. This
                  cannot be undone.
                </p>
                {pendingDelete.sessionCount > 0 && (
                  <p className="mt-2 text-xs font-medium text-amber-400">
                    It still holds {pendingDelete.sessionCount} session
                    {pendingDelete.sessionCount === 1 ? "" : "s"} — move or remove those first.
                  </p>
                )}
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
    </ModalPortal>
      )}
    </div>
  );
}
