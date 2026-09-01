"use client";

import { useMemo, useState, useEffect } from "react";
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
  Download,
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  LayoutGrid,
  List,
  Building2,
  Tag,
  Briefcase,
} from "lucide-react";
import { industrySchema, type IndustryInput } from "@/lib/validations/eventIndustry";
import type { IndustryRow } from "@/lib/services/eventIndustry";
import { TablePagination } from "@/components/dashboard/TablePagination";
import { readCsv, columnIndex, downloadCsv } from "@/lib/csv";

import { ModalPortal } from "@/components/ui/ModalPortal";
const PAGE_SIZE = 20;

// Matches the FIELD_CLASS convention every other member dashboard "Manager" component uses
// (see ShowInfoManager.tsx) — dark, translucent input on the site's zinc-950/glass theme,
// brand-pink focus ring, instead of this component's old white/slate/purple styling.
export interface ParsedImportRow {
  mstr_nm: string;
  mstr_cd: string;
  mstr_desc: string;
}

interface ParsedCsv {
  rows: ParsedImportRow[];
  /** Header names that were present but are not imported, so the user is told rather than surprised. */
  ignoredColumns: string[];
  /** Human-readable separator that was detected, surfaced so a misread file is obvious. */
  delimiterLabel: string;
  error?: string;
}

/**
 * Maps a CSV onto industry rows by HEADER NAME, so the column order does not matter and the
 * page's own export can be re-imported unchanged.
 *
 * Two columns are deliberately not imported:
 *   ID       — independent_mst.id is assigned by the database. The legacy ids in an exported file
 *              belong to a different sequence and would collide with live rows.
 *   Service  — there is no column for it. createIndustry()/updateIndustry() never persist it and
 *              the row always reads back as "", so importing it would be a lie.
 */
function mapCsvToRows(text: string): ParsedCsv {
  const { header, rows: table, delimiterLabel } = readCsv(text);
  if (header.length === 0) {
    return { rows: [], ignoredColumns: [], delimiterLabel, error: "That file is empty." };
  }

  const iName = columnIndex(header, "name", "industry", "industry name", "mstr_nm");
  const iCode = columnIndex(header, "code", "system code", "mstr_cd");
  const iDesc = columnIndex(header, "description", "mstr_desc");

  if (iName === -1) {
    // Columns are joined with " | " so an unsplit header (one long cell) is visibly one cell,
    // rather than looking like several columns separated by whitespace.
    return {
      rows: [],
      ignoredColumns: [],
      delimiterLabel,
      error:
        `No "Name" column found. Read the file as ${delimiterLabel}; ` +
        `columns came out as: ${header.map((h) => h || "(blank)").join(" | ") || "(empty)"}`,
    };
  }

  const ignoredColumns = header.filter((h) => ["id", "service"].includes(h));

  const rows = table
    .map((r) => ({
      mstr_nm: (r[iName] ?? "").trim(),
      mstr_cd: iCode === -1 ? "" : (r[iCode] ?? "").trim(),
      mstr_desc: iDesc === -1 ? "" : (r[iDesc] ?? "").trim(),
    }))
    .filter((r) => r.mstr_nm !== "");

  if (rows.length === 0) {
    return {
      rows: [],
      ignoredColumns,
      delimiterLabel,
      error: "That file has a header but no usable data rows.",
    };
  }
  return { rows, ignoredColumns, delimiterLabel };
}

interface ImportSummary {
  created: number;
  skipped: number;
  skippedNames: string[];
  invalid: { row: number; name: string; reason: string }[];
}

function ImportCsvModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const [fileName, setFileName] = useState("");
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  async function pickFile(file: File | undefined) {
    if (!file) return;
    setError("");
    setSummary(null);
    setFileName(file.name);
    const text = await file.text();
    const result = mapCsvToRows(text);
    setParsed(result);
    if (result.error) setError(result.error);
  }

  async function runImport() {
    if (!parsed?.rows.length) return;
    setBusy(true);
    setError("");
    try {
      const { data } = await axios.post("/api/members/event-industry/import", { rows: parsed.rows });
      setSummary(data as ImportSummary);
      onImported();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModalPortal onClose={onClose}>
      <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto overscroll-contain bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
        <div className="glass-panel max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-white/10 p-6 shadow-2xl">
          <div className="flex items-start justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-pink/15 text-brand-pink">
                <FileSpreadsheet className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-white">Import Industries from CSV</h3>
                <p className="text-xs text-zinc-400">
                  Same columns as Export CSV. Existing rows are skipped, never overwritten.
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
                    {summary.created === 1 ? "industry" : "industries"}.
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
                          Row {row.row}: {row.name || "(no name)"} — {row.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {summary.skippedNames.length > 0 && (
                  <details className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-zinc-400">
                    <summary className="cursor-pointer font-semibold text-zinc-300">
                      {summary.skippedNames.length} skipped as duplicates
                    </summary>
                    <p className="mt-2 leading-relaxed">{summary.skippedNames.join(", ")}</p>
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
                    Needs a <strong>Name</strong> column; Code and Description are optional.
                    Comma or tab separated.
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

                    {parsed.ignoredColumns.length > 0 && (
                      <p className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-[11px] leading-relaxed text-zinc-400">
                        Ignoring the {parsed.ignoredColumns.map((c) => `"${c}"`).join(" and ")} column
                        {parsed.ignoredColumns.length === 1 ? "" : "s"}: IDs are assigned by the database,
                        and Service is not stored on an industry record.
                      </p>
                    )}

                    <div className="max-h-48 overflow-y-auto rounded-xl border border-white/10">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-white/10 bg-gradient-to-r from-brand-purple to-brand-pink text-white">
                            <th className="px-6 py-4 font-black uppercase tracking-wider">Name</th>
                            <th className="px-6 py-4 font-black uppercase tracking-wider">Code</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {parsed.rows.slice(0, 50).map((row, i) => (
                            <tr key={`${row.mstr_cd}-${i}`} className="bg-zinc-900/30">
                              <td className="px-3 py-1.5 text-zinc-200">{row.mstr_nm}</td>
                              <td className="px-3 py-1.5 text-zinc-500">{row.mstr_cd || "—"}</td>
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
                className="inline-flex items-center gap-2 rounded-xl bg-brand-pink px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition hover:opacity-90 disabled:opacity-40"
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

const FIELD_CLASS =
  "w-full rounded-md border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-brand-pink focus:outline-none focus:ring-1 focus:ring-brand-pink/40 transition-colors";

function extractErrorMessage(err: unknown): string {
  if (!isAxiosError(err)) return "Could not save this industry. Please check the form and try again.";
  const apiError = err.response?.data?.error;
  if (typeof apiError === "string") return apiError;
  if (apiError && typeof apiError === "object") {
    const firstField = Object.values(apiError as Record<string, string[] | undefined>).find(
      (messages) => Array.isArray(messages) && messages.length > 0
    );
    if (firstField?.[0]) return firstField[0];
  }
  return "Could not save this industry. Please check the form and try again.";
}

interface FormDefaults extends Partial<IndustryInput> {
  id?: number;
}

function IndustryFormModal({
  defaultValues,
  onClose,
  onSaved,
}: {
  defaultValues?: FormDefaults;
  onClose: () => void;
  onSaved: (savedItem: IndustryRow) => void;
}) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isEdit = typeof defaultValues?.id === "number";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<IndustryInput>({
    resolver: zodResolver(industrySchema) as any,
    defaultValues: {
      mstr_nm: defaultValues?.mstr_nm ?? "",
      mstr_cd: defaultValues?.mstr_cd ?? "",
      service: defaultValues?.service ?? "",
      mstr_desc: defaultValues?.mstr_desc ?? "",
    },
  });

  async function onSubmit(data: IndustryInput) {
    setErrorMessage(null);
    try {
      let savedItem: IndustryRow;
      if (isEdit) {
        const res = await axios.patch(`/api/members/event-industry/${defaultValues!.id}`, data);
        savedItem = res.data.industry;
      } else {
        const res = await axios.post("/api/members/event-industry", data);
        savedItem = res.data.industry;
      }
      onSaved(savedItem);
    } catch (err) {
      // Surface the real failure instead of faking a saved row — a silently "successful" save
      // that never reached the database would vanish again on the next page refresh.
      setErrorMessage(extractErrorMessage(err));
    }
  }

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto overscroll-contain bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="glass-panel max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl p-6 shadow-2xl border border-white/10">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-pink/10 text-brand-pink">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                {isEdit ? "Edit Event Industry" : "Add New Event Industry"}
              </h3>
              <p className="text-xs text-zinc-500">
                {isEdit ? "Update industry details, system name, and service." : "Create a new industry category in the database."}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-500 hover:bg-white/10 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-5 grid gap-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-zinc-300">Industry Name *</label>
            <input {...register("mstr_nm")} placeholder="e.g. Information Technology & Software" className={FIELD_CLASS} />
            {errors.mstr_nm && <p className="mt-1 text-xs font-medium text-red-400">{errors.mstr_nm.message}</p>}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-zinc-300">System Code / Name</label>
              <input {...register("mstr_cd")} placeholder="e.g. IT-01 or tech_software" className={FIELD_CLASS} />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-zinc-300">Service Category</label>
              <input {...register("service")} placeholder="e.g. Cloud & AI, Medical" className={FIELD_CLASS} />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-zinc-300">Description</label>
            <textarea
              {...register("mstr_desc")}
              rows={3}
              placeholder="Brief summary of businesses and exhibitors represented in this industry..."
              className={FIELD_CLASS}
            />
          </div>

          {errorMessage && (
            <div className="rounded-lg bg-red-500/10 p-3 text-xs font-semibold text-red-400 border border-red-500/20">
              {errorMessage}
            </div>
          )}

          <div className="flex justify-end gap-3 border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-white/10 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-brand-pink px-5 py-2 text-sm font-bold text-white shadow-md shadow-brand-pink/20 transition hover:opacity-90 disabled:opacity-60"
            >
              {isSubmitting ? "Saving..." : isEdit ? "Save Changes" : "Create Industry"}
            </button>
          </div>
        </form>
      </div>
    </div>
    </ModalPortal>
  );
}

export function IndustryManager({ industries, canManage = true }: { industries: IndustryRow[]; canManage?: boolean }) {
  const router = useRouter();
  const [items, setItems] = useState<IndustryRow[]>(industries);
  const [modalRow, setModalRow] = useState<IndustryRow | "new" | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [keyword, setKeyword] = useState("");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setItems(industries);
  }, [industries]);

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.code.toLowerCase().includes(q) ||
        (i.service && i.service.toLowerCase().includes(q)) ||
        i.description.toLowerCase().includes(q)
    );
  }, [items, keyword]);

  useEffect(() => {
    setPage(1);
  }, [keyword]);

  const paged = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  );

  function handleSaved(savedItem: IndustryRow) {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.id === savedItem.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = savedItem;
        return next;
      }
      return [savedItem, ...prev];
    });
    setModalRow(null);
    router.refresh();
  }

  async function remove(id: number) {
    if (!window.confirm("Are you sure you want to delete this industry category?")) return;
    setPendingId(id);
    setErrorMessage(null);
    try {
      await axios.delete(`/api/members/event-industry/${id}`);
      setItems((prev) => prev.filter((i) => i.id !== id));
      router.refresh();
    } catch (err) {
      // Don't remove it from the list on failure — the row is still in the database, so hiding
      // it locally would just have it reappear (confusingly) on the next refresh.
      setErrorMessage(extractErrorMessage(err));
    } finally {
      setPendingId(null);
    }
  }

  function exportCsv() {
    downloadCsv(
      "event-industries.csv",
      ["ID", "Name", "Code", "Service", "Description"],
      filtered.map((i) => [i.id, i.name, i.code, i.service || "", i.description]),
    );
  }

  return (
    <div className="space-y-6">
      {errorMessage && (
        <div className="rounded-xl bg-red-500/10 p-3.5 text-sm font-medium text-red-400 border border-red-500/20">
          {errorMessage}
        </div>
      )}

      {/* Control Bar & Stats */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-xl bg-white/5 p-1 border border-white/10">
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                viewMode === "cards" ? "bg-brand-pink/10 text-brand-pink" : "text-zinc-500 hover:text-white"
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
              Cards
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                viewMode === "table" ? "bg-brand-pink/10 text-brand-pink" : "text-zinc-500 hover:text-white"
              }`}
            >
              <List className="h-4 w-4" />
              Table
            </button>
          </div>

          <span className="text-xs text-zinc-500 font-medium">
            Showing <strong className="text-white font-bold">{filtered.length}</strong> of {items.length} industry categories
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-[200px] flex-1 sm:w-60 sm:flex-initial">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              type="text"
              placeholder="Search industries..."
              autoComplete="off"
              className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-9 pr-8 text-sm text-white placeholder:text-zinc-600 focus:border-brand-pink focus:outline-none focus:ring-1 focus:ring-brand-pink/40"
            />
            {keyword && (
              <button
                type="button"
                onClick={() => setKeyword("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            title="Export CSV"
            onClick={exportCsv}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-semibold text-zinc-300 hover:bg-white/10 hover:text-white transition"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>

          {canManage && (
            <button
              type="button"
              title="Import CSV"
              onClick={() => setImportOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-semibold text-zinc-300 hover:bg-white/10 hover:text-white transition"
            >
              <Upload className="h-3.5 w-3.5" />
              Import CSV
            </button>
          )}

          {canManage && (
            <button
              type="button"
              onClick={() => setModalRow("new")}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-pink px-4 py-2 text-xs font-bold text-white shadow-sm shadow-brand-pink/20 transition hover:opacity-90 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Add Industry
            </button>
          )}
        </div>
      </div>

      {/* Cards View */}
      {viewMode === "cards" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-dashed border-white/10 bg-white/5 py-12 text-center text-zinc-500">
              <Building2 className="mx-auto h-10 w-10 text-zinc-600" />
              <p className="mt-2 text-sm font-semibold text-zinc-300">No industry categories found</p>
              <p className="text-xs text-zinc-500 mt-0.5">Try searching for another keyword or add a new category.</p>
              {canManage && (
                <button
                  type="button"
                  onClick={() => setModalRow("new")}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-brand-pink px-4 py-2 text-xs font-bold text-white shadow-sm shadow-brand-pink/20 hover:opacity-90"
                >
                  <Plus className="h-4 w-4" />
                  + Add Industry Now
                </button>
              )}
            </div>
          ) : (
            paged.map((industry) => (
              <div
                key={industry.id}
                className="group relative flex flex-col justify-between rounded-2xl border border-white/10 bg-zinc-900/40 p-5 shadow-xs transition hover:border-brand-pink/40 hover:shadow-md"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-pink/10 text-brand-pink">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      {industry.code && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-semibold text-zinc-300">
                          <Tag className="h-3 w-3 text-zinc-500" />
                          {industry.code}
                        </span>
                      )}
                      {industry.service && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-brand-pink/10 px-2.5 py-0.5 text-xs font-semibold text-brand-pink">
                          <Briefcase className="h-3 w-3 text-brand-pink" />
                          {industry.service}
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="mt-3 font-bold text-white group-hover:text-brand-pink transition-colors">
                    {industry.name}
                  </h3>

                  <p className="mt-2 text-xs text-zinc-400 line-clamp-3 leading-relaxed">
                    {industry.description || "No description provided."}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3 text-xs text-zinc-600">
                  <span>ID: #{industry.id}</span>

                  {canManage && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setModalRow(industry)}
                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 font-semibold text-zinc-400 hover:bg-white/10 hover:text-brand-pink transition"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={pendingId === industry.id}
                        onClick={() => remove(industry.id)}
                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 font-semibold text-zinc-500 hover:bg-red-500/10 hover:text-red-400 transition disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Table View */}
      {viewMode === "table" && (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/40 shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm text-zinc-300">
              <thead>
                <tr className="border-b border-white/10 bg-gradient-to-r from-brand-purple to-brand-pink text-white">
                  <th className="px-6 py-4 font-black uppercase tracking-wider text-center w-16">ID</th>
                  <th className="px-6 py-4 font-black uppercase tracking-wider">Industry Name</th>
                  <th className="px-6 py-4 font-black uppercase tracking-wider text-center">System Code</th>
                  <th className="px-6 py-4 font-black uppercase tracking-wider">Service</th>
                  <th className="px-6 py-4 font-black uppercase tracking-wider">Description</th>
                  {canManage && <th className="px-6 py-4 font-black uppercase tracking-wider text-center w-28">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={canManage ? 6 : 5} className="px-4 py-8 text-center text-zinc-600">
                      No matching records found.
                    </td>
                  </tr>
                ) : (
                  paged.map((industry) => (
                    <tr key={industry.id} className="hover:bg-white/5 transition">
                      <td className="px-4 py-3 text-center text-xs font-bold text-zinc-500">#{industry.id}</td>
                      <td className="px-4 py-3 font-semibold text-white">{industry.name}</td>
                      <td className="px-4 py-3 text-center text-xs font-mono text-zinc-400">
                        {industry.code ? (
                          <span className="inline-block rounded-md bg-white/10 px-2 py-0.5 font-semibold text-zinc-300">
                            {industry.code}
                          </span>
                        ) : (
                          <span className="text-zinc-700">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs font-medium text-zinc-400">
                        {industry.service ? (
                          <span className="inline-block rounded-md bg-brand-pink/10 px-2 py-0.5 text-xs font-semibold text-brand-pink border border-brand-pink/20">
                            {industry.service}
                          </span>
                        ) : (
                          <span className="text-zinc-700">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-400 max-w-md">
                        {industry.description || "—"}
                      </td>
                      {canManage && (
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              title="Edit Industry"
                              onClick={() => setModalRow(industry)}
                              className="rounded-lg p-1.5 text-zinc-400 hover:bg-brand-pink/10 hover:text-brand-pink transition"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              title="Delete Industry"
                              disabled={pendingId === industry.id}
                              onClick={() => remove(industry.id)}
                              className="rounded-lg p-1.5 text-zinc-500 hover:bg-red-500/10 hover:text-red-400 transition disabled:opacity-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <TablePagination currentPage={page} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} />

      {importOpen && (
        <ImportCsvModal
          onClose={() => setImportOpen(false)}
          onImported={() => router.refresh()}
        />
      )}

      {modalRow && (
        <IndustryFormModal
          defaultValues={
            modalRow === "new"
              ? undefined
              : {
                  id: modalRow.id,
                  mstr_nm: modalRow.name,
                  mstr_cd: modalRow.code,
                  service: modalRow.service,
                  mstr_desc: modalRow.description,
                }
          }
          onClose={() => setModalRow(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
