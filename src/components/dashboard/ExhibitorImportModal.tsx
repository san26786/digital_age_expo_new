"use client";

/**
 * ===========================================================================
 *  EXHIBITOR CSV IMPORT — UPLOAD, LOOK, CHOOSE, COMMIT
 * ===========================================================================
 *
 *  The old modal did upload-then-import in one press and reported what had happened afterwards.
 *  That is the wrong order for the only question an organiser actually has, which is "what is this
 *  file about to do to my exhibitor list?" — asked BEFORE anything is written, not after.
 *
 *  So there are two server calls, and they are different endpoints:
 *
 *      /import/analyze   classifies the whole file, writes nothing
 *      /import           inserts only the rows that are still ticked
 *
 *  Both run the same matcher (src/lib/exhibitors/importMatching.ts), and the second re-runs it
 *  against the database as it stands at that moment. The preview is advisory; the commit decides.
 *  A row that someone else added while this screen sat open comes back as "already exists" rather
 *  than being inserted twice, and says so on the results list.
 *
 *  Identity is BUSINESS + EMAIL together. Neither half alone: one person can represent two
 *  companies, and one company legitimately has several contacts.
 */

import { useMemo, useState } from "react";
import axios, { isAxiosError } from "axios";
import {
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  Info,
  Loader2,
  Trash2,
  Upload,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { readCsv, columnIndex } from "@/lib/csv";
import { EXHIBITOR_BULK_STATUS_ACTIONS } from "@/lib/validations/eventExhibitorAdmin";
import { canImport } from "@/lib/exhibitors/importMatching";
import type {
  ClassifiedRow,
  ExistingExhibitor,
  ImportAnalysis,
  ImportCategory,
} from "@/lib/exhibitors/importMatching";
import type { ExhibitorImportOutcome, ExhibitorImportResult } from "@/lib/services/eventExhibitorAdmin";

/* ------------------------------ CSV -> rows ------------------------------- */

interface ParsedExhibitorCsv {
  rows: Record<string, string>[];
  delimiterLabel: string;
  ignoredColumns: string[];
  error?: string;
}

/**
 * Maps a CSV onto exhibitor rows by HEADER NAME, so column order does not matter and the page's
 * own export re-imports unchanged. Either "First Name"+"Last Name" or a single "Name" works.
 *
 * Computed columns are accepted in the header and ignored — Stand/Spot assignment and the
 * account flags are derived when the exhibitor is created, not settable from a spreadsheet.
 */
function mapExhibitorCsv(text: string): ParsedExhibitorCsv {
  const { header, rows: table, delimiterLabel } = readCsv(text);
  if (header.length === 0) {
    return { rows: [], delimiterLabel, ignoredColumns: [], error: "That file is empty." };
  }

  const iFirst = columnIndex(header, "first name", "first_name", "firstname");
  const iLast = columnIndex(header, "last name", "last_name", "lastname", "surname");
  const iName = columnIndex(header, "name", "full name");
  const iEmail = columnIndex(header, "email", "email address", "e-mail");
  const iBusiness = columnIndex(header, "business", "company", "company name");
  const iPhone = columnIndex(header, "phone", "telephone");
  const iWork = columnIndex(header, "work phone", "work_phone", "mobile");
  const iPosition = columnIndex(header, "position", "job title", "role");
  const iWebsite = columnIndex(header, "website", "url");
  const iLinked = columnIndex(header, "linkedin", "linkedin_user_profile", "linkedin profile");
  const iStandNo = columnIndex(header, "stand number", "stand_number", "stand no");
  const iStandSize = columnIndex(header, "stand size", "stand_size");
  const iStandPrice = columnIndex(header, "stand price", "stand_price");
  const iAbout = columnIndex(header, "about us", "about_us", "about");
  const iFeatured = columnIndex(header, "featured");
  const iStatus = columnIndex(header, "status");

  if (iEmail === -1 || iBusiness === -1 || (iFirst === -1 && iName === -1)) {
    return {
      rows: [],
      delimiterLabel,
      ignoredColumns: [],
      error:
        `Needs "Email" and "Business", plus either "First Name" or "Name". Read the file as ` +
        `${delimiterLabel}; columns came out as: ` +
        `${header.map((h) => h || "(blank)").join(" | ") || "(empty)"}`,
    };
  }

  const ignoredColumns = header.filter((h) =>
    ["id", "account", "spot", "stand layout", "batch number"].includes(h),
  );
  const cell = (r: string[], i: number) => (i === -1 ? "" : (r[i] ?? "").trim());

  const rows = table
    .map((r) => ({
      first_name: cell(r, iFirst),
      last_name: cell(r, iLast),
      name: cell(r, iName),
      email: cell(r, iEmail),
      business: cell(r, iBusiness),
      phone: cell(r, iPhone),
      work_phone: cell(r, iWork),
      position: cell(r, iPosition),
      website: cell(r, iWebsite),
      linkedin_user_profile: cell(r, iLinked),
      stand_number: cell(r, iStandNo),
      stand_size: cell(r, iStandSize),
      stand_price: cell(r, iStandPrice),
      about_us: cell(r, iAbout),
      featured: cell(r, iFeatured),
      status: cell(r, iStatus),
    }))
    .filter((r) => r.email !== "" || r.business !== "" || r.name !== "");

  if (rows.length === 0) {
    return {
      rows: [],
      delimiterLabel,
      ignoredColumns,
      error: "That file has a header but no usable data rows.",
    };
  }

  /*
   * `_row` is stamped here, once, while the full file is still in hand. The commit step is sent a
   * SUBSET, so its own array positions mean nothing; every row number the admin is shown — in the
   * preview and in the results — comes from this field.
   */
  return {
    rows: rows.map((r, i) => ({ ...r, _row: String(i + 1) })),
    delimiterLabel,
    ignoredColumns,
  };
}

/* ------------------------------- categories ------------------------------- */

type TabKey = ImportCategory | "all" | "not_in_csv";

const CATEGORY_LABEL: Record<ImportCategory, string> = {
  new: "New",
  potential_email_match: "Check email",
  already_exists: "Already exists",
  csv_duplicate: "Duplicate in file",
  invalid: "Invalid",
};

const CATEGORY_BADGE: Record<ImportCategory, string> = {
  new: "bg-emerald-500/10 text-emerald-300 border border-emerald-500/25",
  potential_email_match: "bg-amber-500/10 text-amber-300 border border-amber-500/25",
  already_exists: "bg-sky-500/10 text-sky-300 border border-sky-500/25",
  csv_duplicate: "bg-purple-500/10 text-purple-300 border border-purple-500/25",
  invalid: "bg-red-500/10 text-red-300 border border-red-500/25",
};

const OUTCOME_LABEL: Record<ExhibitorImportOutcome["status"], string> = {
  imported: "Imported",
  potential_email_match_imported: "Imported (email flagged)",
  duplicate_imported: "Imported (duplicate, forced)",
  already_exists: "Skipped — already exists",
  csv_duplicate: "Skipped — duplicate in file",
  invalid: "Skipped — invalid",
  failed: "Failed",
};

const OUTCOME_BADGE: Record<ExhibitorImportOutcome["status"], string> = {
  imported: "bg-emerald-500/10 text-emerald-300 border border-emerald-500/25",
  potential_email_match_imported: "bg-emerald-500/10 text-emerald-300 border border-emerald-500/25",
  duplicate_imported: "bg-orange-500/10 text-orange-300 border border-orange-500/25",
  already_exists: "bg-sky-500/10 text-sky-300 border border-sky-500/25",
  csv_duplicate: "bg-purple-500/10 text-purple-300 border border-purple-500/25",
  invalid: "bg-red-500/10 text-red-300 border border-red-500/25",
  failed: "bg-red-500/10 text-red-300 border border-red-500/25",
};

/* --------------------------------- pieces --------------------------------- */

function SummaryTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "good" | "warn" | "info" | "bad" | "muted";
}) {
  const ring = {
    good: "border-emerald-500/25 bg-emerald-500/[0.07]",
    warn: "border-amber-500/25 bg-amber-500/[0.07]",
    info: "border-sky-500/25 bg-sky-500/[0.07]",
    bad: "border-red-500/25 bg-red-500/[0.07]",
    muted: "border-white/10 bg-white/[0.03]",
  }[tone];

  const text = {
    good: "text-emerald-300",
    warn: "text-amber-300",
    info: "text-sky-300",
    bad: "text-red-300",
    muted: "text-zinc-300",
  }[tone];

  return (
    <div className={`rounded-xl border px-3 py-2.5 ${ring}`}>
      <p className={`text-xl font-black leading-none ${text}`}>{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">{label}</p>
    </div>
  );
}

/* --------------------------------- modal ---------------------------------- */

export function ExhibitorImportModal({
  onClose,
  onImported,
}: {
  onClose: () => void;
  onImported: () => void;
}) {
  const [fileName, setFileName] = useState("");
  const [parsed, setParsed] = useState<ParsedExhibitorCsv | null>(null);
  const [analysis, setAnalysis] = useState<ImportAnalysis | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [tab, setTab] = useState<TabKey>("all");
  const [analysing, setAnalysing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ExhibitorImportResult | null>(null);

  /*
   * The "not in this file" list is held separately from `analysis`, because it is the one part of
   * this screen the organiser can CHANGE. Deleting an exhibitor or moving them to "Not Interested"
   * has to be reflected here immediately — re-running the whole analysis after every action would
   * be a round trip and would scroll the screen out from under them.
   */
  const [notInCsv, setNotInCsv] = useState<ExistingExhibitor[]>([]);
  const [absentSelected, setAbsentSelected] = useState<Set<number>>(new Set());
  const [absentStatus, setAbsentStatus] = useState<string>("Not Interested");
  const [absentBusy, setAbsentBusy] = useState<"" | "status" | "delete">("");
  const [absentNotice, setAbsentNotice] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const step: "upload" | "preview" | "done" = result ? "done" : analysis ? "preview" : "upload";

  /** The original CSV row behind each classified record, keyed by the row number it was stamped with. */
  const rawByRow = useMemo(() => {
    const map = new Map<number, Record<string, string>>();
    for (const row of parsed?.rows ?? []) map.set(Number(row._row), row);
    return map;
  }, [parsed]);

  async function pickFile(file: File | undefined) {
    if (!file) return;
    setError("");
    setResult(null);
    setAnalysis(null);
    setSelected(new Set());
    setFileName(file.name);
    const mapped = mapExhibitorCsv(await file.text());
    setParsed(mapped);
    if (mapped.error) setError(mapped.error);
  }

  async function runAnalysis() {
    if (!parsed?.rows.length) return;
    setAnalysing(true);
    setError("");
    try {
      const { data } = await axios.post("/api/members/exhibitors-admin/import/analyze", {
        rows: parsed.rows,
      });
      const next = data as ImportAnalysis;
      setAnalysis(next);
      // Ticked on arrival: plainly new rows. A "check email" row wants a person to look at it.
      setSelected(new Set(next.records.filter((r) => r.selectedByDefault).map((r) => r.row)));
      setNotInCsv(next.existingNotInCsv);
      setAbsentSelected(new Set());
      setAbsentNotice("");
      setTab("all");
    } catch (err) {
      setError(messageFrom(err, "Could not analyse this file."));
    } finally {
      setAnalysing(false);
    }
  }

  async function runImport() {
    if (!analysis || selected.size === 0) return;
    setImporting(true);
    setError("");
    try {
      /*
       * `_allowDuplicate` is stamped only on a row the organiser ticked WHILE it was showing as
       * already existing. The server re-classifies everything it receives, and without this flag it
       * cannot tell that decision apart from a row that was new here and got added by someone else
       * in the meantime — the first should be inserted, the second must not be.
       */
      const rows = analysis.records
        .filter((r) => selected.has(r.row))
        .map((r) => {
          const raw = rawByRow.get(r.row);
          if (!raw) return undefined;
          return r.category === "already_exists" ? { ...raw, _allowDuplicate: "1" } : raw;
        })
        .filter((r): r is Record<string, string> => Boolean(r));

      const { data } = await axios.post("/api/members/exhibitors-admin/import", { rows });
      setResult(data as ExhibitorImportResult);
      setConfirming(false);
      onImported();
    } catch (err) {
      setError(messageFrom(err, "Could not import this file."));
      setConfirming(false);
    } finally {
      setImporting(false);
    }
  }

  const records = analysis?.records ?? [];
  const importable = records.filter((r) => canImport(r.category));

  /** Ticked rows that are an exact match — each one will become a second contact on the event. */
  const forcedDuplicates = records.filter(
    (r) => r.category === "already_exists" && selected.has(r.row),
  ).length;

  const totalImported = result
    ? result.imported + result.potentialImported + result.duplicateImported
    : 0;

  const visible = useMemo(() => {
    if (tab === "all" || tab === "not_in_csv") return records;
    return records.filter((r) => r.category === tab);
  }, [records, tab]);

  const visibleImportable = visible.filter((r) => canImport(r.category));
  const allVisibleTicked =
    visibleImportable.length > 0 && visibleImportable.every((r) => selected.has(r.row));

  function toggleRow(row: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(row)) next.delete(row);
      else next.add(row);
      return next;
    });
  }

  function toggleVisible() {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const record of visibleImportable) {
        if (allVisibleTicked) next.delete(record.row);
        else next.add(record.row);
      }
      return next;
    });
  }

  /* ------------ actions on exhibitors the file does not mention ------------- */

  const absentIds = [...absentSelected];
  const allAbsentTicked = notInCsv.length > 0 && notInCsv.every((e) => absentSelected.has(e.id));

  function toggleAbsent(id: number) {
    setAbsentSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllAbsent() {
    setAbsentSelected(allAbsentTicked ? new Set() : new Set(notInCsv.map((e) => e.id)));
  }

  /**
   * Move the ticked exhibitors to another status.
   *
   * The usual reason a name is missing from this month's file is that they have dropped out, and
   * the honest record of that is a status change — "Not Interested", "Unable to attend" — not a
   * deletion. So this is the action offered first, and the one the dropdown defaults to.
   */
  async function applyAbsentStatus() {
    if (absentIds.length === 0) return;
    setAbsentBusy("status");
    setError("");
    setAbsentNotice("");
    try {
      await axios.post("/api/members/exhibitors-admin/bulk-status", {
        ids: absentIds,
        status: absentStatus,
      });
      setNotInCsv((prev) =>
        prev.map((entry) =>
          absentSelected.has(entry.id) ? { ...entry, status: absentStatus } : entry,
        ),
      );
      setAbsentNotice(
        `${absentIds.length} exhibitor${absentIds.length === 1 ? "" : "s"} moved to "${absentStatus}".`,
      );
      setAbsentSelected(new Set());
      onImported();
    } catch (err) {
      setError(messageFrom(err, "Could not update those exhibitors."));
    } finally {
      setAbsentBusy("");
    }
  }

  /** Delete them outright. Behind a confirmation, because nothing here puts them back. */
  async function deleteAbsent() {
    if (absentIds.length === 0) return;
    setAbsentBusy("delete");
    setError("");
    setAbsentNotice("");
    try {
      await axios.post("/api/members/exhibitors-admin/bulk-delete", { ids: absentIds });
      setNotInCsv((prev) => prev.filter((entry) => !absentSelected.has(entry.id)));
      setAbsentNotice(
        `${absentIds.length} exhibitor${absentIds.length === 1 ? "" : "s"} deleted from this event.`,
      );
      setAbsentSelected(new Set());
      setDeleteConfirm(false);
      onImported();
    } catch (err) {
      setError(messageFrom(err, "Could not delete those exhibitors."));
      setDeleteConfirm(false);
    } finally {
      setAbsentBusy("");
    }
  }

  const tabs: { key: TabKey; label: string; count: number }[] = analysis
    ? [
        { key: "all", label: "All rows", count: analysis.summary.total },
        { key: "new", label: "New", count: analysis.summary.newRows },
        { key: "potential_email_match", label: "Check email", count: analysis.summary.potentialEmailMatches },
        { key: "already_exists", label: "Already exists", count: analysis.summary.alreadyExists },
        { key: "csv_duplicate", label: "Duplicate in file", count: analysis.summary.csvDuplicates },
        { key: "invalid", label: "Invalid", count: analysis.summary.invalid },
        { key: "not_in_csv", label: "Not in this file", count: notInCsv.length },
      ]
    : [];

  return (
    <ModalPortal
      onClose={() => {
        // Escape backs out of a confirmation first, and does nothing at all mid-write.
        if (importing || absentBusy !== "") return;
        if (deleteConfirm) {
          setDeleteConfirm(false);
          return;
        }
        if (confirming) {
          setConfirming(false);
          return;
        }
        onClose();
      }}
    >
      <div className="fixed inset-0 z-50 grid place-items-start overflow-y-auto overscroll-contain bg-black/80 p-4 backdrop-blur-sm animate-fade-in sm:place-items-center">
        <div className="mx-auto w-full max-w-5xl rounded-2xl border border-white/10 bg-zinc-950 p-6 shadow-2xl">
          {/* ------------------------------ header ------------------------------ */}
          <div className="flex items-start justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-pink/15 text-brand-pink">
                <FileSpreadsheet className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-white">Import Exhibitors from CSV</h3>
                <p className="text-xs text-zinc-400">
                  {step === "upload" && "Same columns as Export CSV. Nothing is saved until you confirm."}
                  {step === "preview" && (
                    <>
                      {fileName} — reviewed against this event. Matched on{" "}
                      <strong className="text-zinc-300">business + email</strong>.
                    </>
                  )}
                  {step === "done" && "Import finished. Every row is accounted for below."}
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

            {/* ------------------------------ 1. upload ------------------------------ */}
            {step === "upload" && (
              <>
                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-8 text-center transition hover:border-brand-pink/40 hover:bg-white/[0.04]">
                  <Upload className="h-6 w-6 text-zinc-500" />
                  <span className="text-sm font-semibold text-zinc-200">
                    {fileName || "Choose a CSV file"}
                  </span>
                  <span className="text-[11px] text-zinc-500">
                    Needs Email and Business, plus First/Last Name (or Name). Comma or tab separated.
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
                      {parsed.rows.length === 1 ? "" : "s"} read{" "}
                      <span className="text-zinc-500">({parsed.delimiterLabel})</span>.
                    </p>
                    <p className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-[11px] leading-relaxed text-zinc-400">
                      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-500" />
                      <span>
                        Analysing compares every row against this event&apos;s exhibitors and writes
                        nothing. You choose what to import on the next screen.
                      </span>
                    </p>

                    <div className="max-h-48 overflow-y-auto rounded-xl border border-white/10">
                      <table className="w-full text-left text-xs">
                        <thead className="sticky top-0 z-10">
                          <tr className="text-zinc-300 [&>th]:border-b [&>th]:border-white/10 [&>th]:bg-zinc-900">
                            <th className="px-3 py-2 font-black uppercase tracking-wider">Name</th>
                            <th className="px-3 py-2 font-black uppercase tracking-wider">Business</th>
                            <th className="px-3 py-2 font-black uppercase tracking-wider">Email</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {parsed.rows.slice(0, 50).map((row) => (
                            <tr key={row._row} className="bg-zinc-900/30">
                              <td className="px-3 py-1.5 text-zinc-200">
                                {`${row.first_name} ${row.last_name}`.trim() || row.name || "—"}
                              </td>
                              <td className="px-3 py-1.5 text-zinc-400">{row.business || "—"}</td>
                              <td className="px-3 py-1.5 text-zinc-500">{row.email || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {parsed.rows.length > 50 && (
                      <p className="text-[11px] text-zinc-500">
                        Showing the first 50 — all {parsed.rows.length} will be analysed.
                      </p>
                    )}
                  </div>
                )}
              </>
            )}

            {/* ------------------------------ 2. preview ----------------------------- */}
            {step === "preview" && analysis && (
              <>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                  <SummaryTile label="Rows" value={analysis.summary.total} tone="muted" />
                  <SummaryTile label="New" value={analysis.summary.newRows} tone="good" />
                  <SummaryTile label="Check email" value={analysis.summary.potentialEmailMatches} tone="warn" />
                  <SummaryTile label="Already exists" value={analysis.summary.alreadyExists} tone="info" />
                  <SummaryTile label="Dup in file" value={analysis.summary.csvDuplicates} tone="muted" />
                  <SummaryTile label="Invalid" value={analysis.summary.invalid} tone="bad" />
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {tabs.map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setTab(t.key)}
                      className={`rounded-lg px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition ${
                        tab === t.key
                          ? "bg-brand-pink text-white"
                          : "border border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      {t.label} <span className="opacity-70">({t.count})</span>
                    </button>
                  ))}
                </div>

                {tab === "not_in_csv" ? (
                  <div className="space-y-2">
                    <p className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-[11px] leading-relaxed text-zinc-400">
                      <Users className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-500" />
                      <span>
                        Already exhibiting, but this file does not mention them. The import itself
                        never touches these — tick any you want to move to another status or remove
                        from the event, and act on them here.
                      </span>
                    </p>

                    {absentNotice && (
                      <p className="flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs font-medium text-emerald-300">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>{absentNotice}</span>
                      </p>
                    )}

                    {/* The action bar. Status first, delete second and separated — they are not peers. */}
                    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
                      <span className="text-xs text-zinc-400">
                        <strong className="text-white">{absentSelected.size}</strong> selected
                      </span>

                      <button
                        type="button"
                        onClick={toggleAllAbsent}
                        disabled={notInCsv.length === 0}
                        className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-300 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
                      >
                        {allAbsentTicked ? "Deselect all" : "Select all"}
                      </button>

                      <span className="mx-1 hidden h-5 w-px bg-white/10 sm:block" />

                      <select
                        value={absentStatus}
                        onChange={(e) => setAbsentStatus(e.target.value)}
                        disabled={absentSelected.size === 0 || absentBusy !== ""}
                        className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-1.5 text-xs text-white focus:border-brand-pink focus:outline-none disabled:opacity-40"
                      >
                        {EXHIBITOR_BULK_STATUS_ACTIONS.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={applyAbsentStatus}
                        disabled={absentSelected.size === 0 || absentBusy !== ""}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-brand-pink px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-white transition hover:opacity-90 disabled:opacity-40"
                      >
                        {absentBusy === "status" && <Loader2 className="h-3 w-3 animate-spin" />}
                        Apply status
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeleteConfirm(true)}
                        disabled={absentSelected.size === 0 || absentBusy !== ""}
                        className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-red-300 transition hover:bg-red-500/20 disabled:opacity-40"
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </button>
                    </div>

                    <div className="max-h-[22rem] overflow-y-auto rounded-xl border border-white/10">
                      <table className="w-full text-left text-xs">
                        <thead className="sticky top-0 z-10">
                          <tr className="text-zinc-300">
                            <th className="w-10 border-b border-white/10 bg-zinc-900 px-3 py-2" />
                            <th className="border-b border-white/10 bg-zinc-900 px-3 py-2 font-black uppercase tracking-wider">
                              Business
                            </th>
                            <th className="border-b border-white/10 bg-zinc-900 px-3 py-2 font-black uppercase tracking-wider">
                              Contact
                            </th>
                            <th className="border-b border-white/10 bg-zinc-900 px-3 py-2 font-black uppercase tracking-wider">
                              Email
                            </th>
                            <th className="border-b border-white/10 bg-zinc-900 px-3 py-2 font-black uppercase tracking-wider">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {notInCsv.map((entry) => (
                            <tr
                              key={entry.id}
                              className={
                                absentSelected.has(entry.id) ? "bg-brand-pink/10" : "bg-zinc-900/30"
                              }
                            >
                              <td className="px-3 py-1.5">
                                <input
                                  type="checkbox"
                                  checked={absentSelected.has(entry.id)}
                                  onChange={() => toggleAbsent(entry.id)}
                                  aria-label={`Select ${entry.business || entry.email}`}
                                  className="h-4 w-4 cursor-pointer rounded border-white/10 bg-white/5 text-brand-pink focus:ring-brand-pink"
                                />
                              </td>
                              <td className="px-3 py-1.5 text-zinc-200">{entry.business || "—"}</td>
                              <td className="px-3 py-1.5 text-zinc-400">{entry.contact || "—"}</td>
                              <td className="px-3 py-1.5 text-zinc-500">{entry.email || "—"}</td>
                              <td className="px-3 py-1.5">
                                <span className="inline-block rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-300">
                                  {entry.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                          {notInCsv.length === 0 && (
                            <tr>
                              <td colSpan={5} className="px-3 py-6 text-center text-zinc-500">
                                Every exhibitor on this event appears in the file.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {tab === "already_exists" && (
                      <p className="flex items-start gap-2 rounded-xl border border-orange-500/25 bg-orange-500/10 px-4 py-2.5 text-[11px] leading-relaxed text-orange-200">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>
                          These are already on the event with the same business and email. They stay
                          unticked, but you can tick any of them to add a second contact anyway — the
                          existing one is never changed or replaced.
                        </span>
                      </p>
                    )}

                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs text-zinc-400">
                        <strong className="text-white">{selected.size}</strong> of {importable.length}{" "}
                        importable row{importable.length === 1 ? "" : "s"} selected
                        {forcedDuplicates > 0 && (
                          <span className="text-orange-300">
                            {" "}
                            — {forcedDuplicates} forced duplicate
                            {forcedDuplicates === 1 ? "" : "s"}
                          </span>
                        )}
                        .
                      </p>
                      {visibleImportable.length > 0 && (
                        <button
                          type="button"
                          onClick={toggleVisible}
                          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-300 transition hover:bg-white/10 hover:text-white"
                        >
                          {allVisibleTicked ? "Deselect these" : "Select these"}
                        </button>
                      )}
                    </div>

                    <div className="max-h-[22rem] overflow-y-auto rounded-xl border border-white/10">
                      <table className="w-full text-left text-xs">
                        <thead className="sticky top-0 z-10">
                          <tr className="text-zinc-300 [&>th]:border-b [&>th]:border-white/10 [&>th]:bg-zinc-900">
                            <th className="w-10 px-3 py-2" />
                            <th className="w-12 px-3 py-2 font-black uppercase tracking-wider">Row</th>
                            <th className="px-3 py-2 font-black uppercase tracking-wider">Business</th>
                            <th className="px-3 py-2 font-black uppercase tracking-wider">Contact</th>
                            <th className="px-3 py-2 font-black uppercase tracking-wider">Email</th>
                            <th className="px-3 py-2 font-black uppercase tracking-wider">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {visible.map((record) => (
                            <PreviewRow
                              key={record.row}
                              record={record}
                              checked={selected.has(record.row)}
                              onToggle={() => toggleRow(record.row)}
                            />
                          ))}
                          {visible.length === 0 && (
                            <tr>
                              <td colSpan={6} className="px-3 py-6 text-center text-zinc-500">
                                No rows in this group.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ------------------------------- 3. done ------------------------------- */}
            {step === "done" && result && (
              <div className="space-y-3">
                <p className="flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-300">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    Imported <strong>{totalImported}</strong>{" "}
                    {totalImported === 1 ? "exhibitor" : "exhibitors"}.
                    {result.duplicateImported > 0 && (
                      <> {result.duplicateImported} of them duplicate an existing contact, as chosen.</>
                    )}
                    {result.alreadyExists > 0 && <> {result.alreadyExists} were left alone.</>}
                    {result.failed > 0 && <> {result.failed} could not be saved.</>}
                  </span>
                </p>

                <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                  <SummaryTile label="Imported" value={result.imported} tone="good" />
                  <SummaryTile label="Email flagged" value={result.potentialImported} tone="warn" />
                  <SummaryTile label="Forced dup" value={result.duplicateImported} tone="warn" />
                  <SummaryTile label="Left alone" value={result.alreadyExists} tone="info" />
                  <SummaryTile label="Skipped" value={result.csvDuplicates + result.invalid} tone="muted" />
                  <SummaryTile label="Failed" value={result.failed} tone="bad" />
                </div>

                <div className="max-h-[20rem] overflow-y-auto rounded-xl border border-white/10">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 z-10">
                      <tr className="text-zinc-300 [&>th]:border-b [&>th]:border-white/10 [&>th]:bg-zinc-900">
                        <th className="w-12 px-3 py-2 font-black uppercase tracking-wider">Row</th>
                        <th className="px-3 py-2 font-black uppercase tracking-wider">Business</th>
                        <th className="px-3 py-2 font-black uppercase tracking-wider">Email</th>
                        <th className="px-3 py-2 font-black uppercase tracking-wider">Result</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {result.outcomes.map((outcome) => (
                        <tr key={outcome.row} className="bg-zinc-900/30 align-top">
                          <td className="px-3 py-1.5 text-zinc-500">{outcome.row}</td>
                          <td className="px-3 py-1.5 text-zinc-200">{outcome.business || "—"}</td>
                          <td className="px-3 py-1.5 text-zinc-500">{outcome.email || "—"}</td>
                          <td className="px-3 py-1.5">
                            <span
                              className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${OUTCOME_BADGE[outcome.status]}`}
                            >
                              {OUTCOME_LABEL[outcome.status]}
                            </span>
                            {outcome.reason && (
                              <p className="mt-1 text-[11px] leading-snug text-zinc-500">{outcome.reason}</p>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* ------------------------------- footer -------------------------------- */}
          <div className="mt-6 flex justify-end gap-2 border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-zinc-300 transition hover:bg-white/10 hover:text-white"
            >
              {step === "done" ? "Done" : "Cancel"}
            </button>

            {step === "upload" && (
              <button
                type="button"
                onClick={runAnalysis}
                disabled={analysing || !parsed?.rows.length}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-pink px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white transition hover:opacity-90 disabled:opacity-40"
              >
                {analysing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {analysing ? "Analysing..." : "Analyse CSV"}
              </button>
            )}

            {step === "preview" && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setAnalysis(null);
                    setSelected(new Set());
                    setError("");
                  }}
                  className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-zinc-300 transition hover:bg-white/10 hover:text-white"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(true)}
                  disabled={selected.size === 0}
                  className="inline-flex items-center gap-2 rounded-xl bg-brand-pink px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white transition hover:opacity-90 disabled:opacity-40"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Import {selected.size} selected
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* --------------------------- confirmation step --------------------------- */}
      {confirming && analysis && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950 p-6 shadow-2xl">
            <h4 className="text-base font-bold text-white">Import {selected.size} exhibitors?</h4>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              They are created through the same code path as Add Exhibitor, so batch numbers, linked
              listings and default stand layout are derived exactly as they would be by hand.
            </p>
            <p className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-[11px] leading-relaxed text-zinc-400">
              Nothing already on this event is changed or removed. Rows are checked once more as
              they are written, so anything added by someone else in the meantime is skipped rather
              than duplicated.
            </p>

            {forcedDuplicates > 0 && (
              <p className="mt-2 flex items-start gap-2 rounded-xl border border-orange-500/25 bg-orange-500/10 px-4 py-2.5 text-[11px] leading-relaxed text-orange-200">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  <strong>{forcedDuplicates}</strong> of these already exist on this event with the
                  same business and email. You have ticked them, so each one is added as a second
                  contact alongside the existing entry.
                </span>
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={importing}
                className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-zinc-300 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
              >
                Back
              </button>
              <button
                type="button"
                onClick={runImport}
                disabled={importing}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-pink px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white transition hover:opacity-90 disabled:opacity-40"
              >
                {importing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {importing ? "Importing..." : "Yes, import"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------- delete confirmation step ------------------------ */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-red-500/30 bg-zinc-950 p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/15 text-red-300">
                <Trash2 className="h-5 w-5" />
              </span>
              <div>
                <h4 className="text-base font-bold text-white">
                  Delete {absentSelected.size} exhibitor{absentSelected.size === 1 ? "" : "s"}?
                </h4>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                  They are removed from this event along with anything attached to them. This cannot
                  be undone from here.
                </p>
              </div>
            </div>

            <p className="mt-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-2.5 text-[11px] leading-relaxed text-amber-200">
              If they have simply dropped out for this edition, a status change keeps the history and
              is reversible. Deletion does not.
            </p>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirm(false)}
                disabled={absentBusy === "delete"}
                className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-zinc-300 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
              >
                Back
              </button>
              <button
                type="button"
                onClick={deleteAbsent}
                disabled={absentBusy === "delete"}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white transition hover:bg-red-500 disabled:opacity-40"
              >
                {absentBusy === "delete" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {absentBusy === "delete" ? "Deleting..." : "Yes, delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ModalPortal>
  );
}

/* --------------------------------- one row -------------------------------- */

function PreviewRow({
  record,
  checked,
  onToggle,
}: {
  record: ClassifiedRow;
  checked: boolean;
  onToggle: () => void;
}) {
  const importable = canImport(record.category);
  // An exact match that has been ticked on purpose. Worth shouting about; it is the one choice here
  // that knowingly puts a second identical contact on the event.
  const forced = record.category === "already_exists" && checked;

  return (
    <tr
      className={`align-top ${
        forced
          ? "bg-orange-500/10"
          : importable
            ? "bg-zinc-900/30"
            : "bg-zinc-900/60 opacity-70"
      }`}
    >
      <td className="px-3 py-1.5">
        {importable ? (
          <input
            type="checkbox"
            checked={checked}
            onChange={onToggle}
            aria-label={`Import row ${record.row}`}
            className="h-4 w-4 cursor-pointer rounded border-white/10 bg-white/5 text-brand-pink focus:ring-brand-pink"
          />
        ) : (
          <span className="text-zinc-700">—</span>
        )}
      </td>
      <td className="px-3 py-1.5 text-zinc-500">{record.row}</td>
      <td className="px-3 py-1.5 text-zinc-200">{record.business || "—"}</td>
      <td className="px-3 py-1.5 text-zinc-400">{record.contact || "—"}</td>
      <td className="px-3 py-1.5 text-zinc-500">{record.email || "—"}</td>
      <td className="px-3 py-1.5">
        <span
          className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${CATEGORY_BADGE[record.category]}`}
        >
          {CATEGORY_LABEL[record.category]}
        </span>
        {forced && (
          <span className="ml-1.5 inline-block rounded-md border border-orange-500/25 bg-orange-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-orange-300">
            Will add anyway
          </span>
        )}
        <p className="mt-1 text-[11px] leading-snug text-zinc-500">{record.reason}</p>
        {forced && (
          <p className="mt-0.5 text-[11px] leading-snug text-orange-300/90">
            Adds a second contact with the same business and email.
          </p>
        )}
      </td>
    </tr>
  );
}

/* --------------------------------- helpers -------------------------------- */

function messageFrom(err: unknown, fallback: string): string {
  return isAxiosError(err) && typeof err.response?.data?.error === "string"
    ? err.response.data.error
    : fallback;
}
