"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  Plus,
  Pencil,
  Trash2,
  MessageCircle,
  BadgeCheck,
  Search,
  Download,
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  X,
} from "lucide-react";
import { TeamMemberFormModal } from "@/components/dashboard/TeamMemberFormModal";
import type { TeamMemberRow } from "@/lib/services/eventTeamMembers";
import { TablePagination } from "@/components/dashboard/TablePagination";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { readCsv, columnIndex, downloadCsv } from "@/lib/csv";

const PAGE_SIZE = 20;

const STATUS_BADGE: Record<string, string> = {
  Pending: "bg-amber-50 text-amber-900",
  Registered: "bg-emerald-50 text-emerald-900",
};

/* ------------------------------- CSV import -------------------------------- */

interface ParsedMemberRow {
  first_name: string;
  last_name: string;
  name: string;
  email: string;
  phone: string;
  work_phone: string;
  position: string;
  status: string;
  linkedin_user_profile: string;
  description: string;
  is_contact: string;
  enable_chat: string;
}

interface ParsedMemberCsv {
  rows: ParsedMemberRow[];
  delimiterLabel: string;
  ignoredColumns: string[];
  error?: string;
}

/**
 * Maps a CSV onto team-member rows by HEADER NAME, so column order does not matter and the
 * page's own export re-imports unchanged.
 *
 * Either "First Name" + "Last Name" or a single "Name" column works; the service splits a whole
 * name on the first space when the split columns are absent.
 *
 * "Business" and "Account" are accepted in the header and ignored: Business comes from the
 * member's linked listing and Account reflects whether a user record exists, so neither is a
 * property of the row that an import could set.
 */
function mapMemberCsv(text: string): ParsedMemberCsv {
  const { header, rows: table, delimiterLabel } = readCsv(text);
  if (header.length === 0) {
    return { rows: [], ignoredColumns: [], delimiterLabel, error: "That file is empty." };
  }

  const iFirst = columnIndex(header, "first name", "first_name", "firstname");
  const iLast = columnIndex(header, "last name", "last_name", "lastname", "surname");
  const iName = columnIndex(header, "name", "full name");
  const iEmail = columnIndex(header, "email", "email address", "e-mail");
  const iPhone = columnIndex(header, "phone", "telephone");
  const iWork = columnIndex(header, "mobile", "work phone", "work_phone", "mobile number");
  const iPosition = columnIndex(header, "position", "job title", "role");
  const iStatus = columnIndex(header, "status");
  const iLinked = columnIndex(header, "linkedin", "linkedin_user_profile", "linkedin profile");
  const iDesc = columnIndex(header, "description", "notes", "bio");
  const iContact = columnIndex(header, "is contact", "is_contact", "contact");
  const iChat = columnIndex(header, "enable chat", "enable_chat", "chat");

  if (iEmail === -1 || (iFirst === -1 && iName === -1)) {
    return {
      rows: [],
      ignoredColumns: [],
      delimiterLabel,
      error:
        `Needs an "Email" column plus either "First Name" or "Name". Read the file as ` +
        `${delimiterLabel}; columns came out as: ` +
        `${header.map((h) => h || "(blank)").join(" | ") || "(empty)"}`,
    };
  }

  const ignoredColumns = header.filter((h) => ["business", "account", "id"].includes(h));
  const cell = (r: string[], i: number) => (i === -1 ? "" : (r[i] ?? "").trim());

  const rows = table
    .map((r) => ({
      first_name: cell(r, iFirst),
      last_name: cell(r, iLast),
      name: cell(r, iName),
      email: cell(r, iEmail),
      phone: cell(r, iPhone),
      work_phone: cell(r, iWork),
      position: cell(r, iPosition),
      status: cell(r, iStatus),
      linkedin_user_profile: cell(r, iLinked),
      description: cell(r, iDesc),
      is_contact: cell(r, iContact),
      enable_chat: cell(r, iChat),
    }))
    .filter((r) => r.email !== "" || r.first_name !== "" || r.name !== "");

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

interface MemberImportSummary {
  created: number;
  skipped: number;
  skippedEmails: string[];
  invalid: { row: number; name: string; reason: string }[];
}

function ImportMembersModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const [fileName, setFileName] = useState("");
  const [parsed, setParsed] = useState<ParsedMemberCsv | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<MemberImportSummary | null>(null);

  async function pickFile(file: File | undefined) {
    if (!file) return;
    setError("");
    setSummary(null);
    setFileName(file.name);
    const result = mapMemberCsv(await file.text());
    setParsed(result);
    if (result.error) setError(result.error);
  }

  async function runImport() {
    if (!parsed?.rows.length) return;
    setBusy(true);
    setError("");
    try {
      const { data } = await axios.post("/api/members/team-members/import", { rows: parsed.rows });
      setSummary(data as MemberImportSummary);
      onImported();
    } catch (err) {
      const message =
        (axios.isAxiosError(err) && typeof err.response?.data?.error === "string"
          ? err.response.data.error
          : null) ?? "Could not import this file.";
      setError(message);
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
                <h3 className="text-base font-bold text-white">Import Team Members from CSV</h3>
                <p className="text-xs text-zinc-400">
                  Same columns as Export CSV. Existing emails are skipped, never overwritten.
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
                    {summary.created === 1 ? "member" : "members"}.
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
                          Row {row.row}: {row.name} — {row.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {summary.skippedEmails.length > 0 && (
                  <details className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-zinc-400">
                    <summary className="cursor-pointer font-semibold text-zinc-300">
                      {summary.skippedEmails.length} skipped as duplicates
                    </summary>
                    <p className="mt-2 leading-relaxed">{summary.skippedEmails.join(", ")}</p>
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
                    Needs Email plus First/Last Name (or Name), Mobile and Position. Comma or tab
                    separated.
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
                        Ignoring {parsed.ignoredColumns.map((c) => `"${c}"`).join(", ")}: Business comes
                        from the linked listing and Account reflects whether a user record exists, so
                        neither can be set by an import.
                      </p>
                    )}

                    <div className="max-h-48 overflow-y-auto rounded-xl border border-white/10">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-white/10 bg-gradient-to-r from-brand-purple to-brand-pink text-white">
                            <th className="px-6 py-4 font-black uppercase tracking-wider">Name</th>
                            <th className="px-6 py-4 font-black uppercase tracking-wider">Email</th>
                            <th className="px-6 py-4 font-black uppercase tracking-wider">Position</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {parsed.rows.slice(0, 50).map((row, i) => (
                            <tr key={`${row.email}-${i}`} className="bg-zinc-900/30">
                              <td className="px-3 py-1.5 text-zinc-200">
                                {`${row.first_name} ${row.last_name}`.trim() || row.name || "—"}
                              </td>
                              <td className="px-3 py-1.5 text-zinc-500">{row.email || "—"}</td>
                              <td className="px-3 py-1.5 text-zinc-500">{row.position || "—"}</td>
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

interface Props {
  members: TeamMemberRow[];
}

export function TeamMembersManager({ members }: Props) {
  const router = useRouter();
  const [modalMember, setModalMember] = useState<TeamMemberRow | "new" | null>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [page, setPage] = useState(1);

  const filteredMembers = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) =>
      [m.firstName, m.lastName, m.email, m.business, m.position, m.status]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(q))
    );
  }, [members, keyword]);

  useEffect(() => {
    setPage(1);
  }, [keyword]);

  const paged = useMemo(
    () => filteredMembers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filteredMembers, page]
  );

  async function remove(id: number) {
    if (!window.confirm("Remove this team member? This cannot be undone.")) return;
    setPendingId(id);
    setErrorMessage(null);
    try {
      await axios.delete(`/api/members/team-members/${id}`);
      router.refresh();
    } catch {
      setErrorMessage("Could not remove this team member. Please try again.");
    } finally {
      setPendingId(null);
    }
  }

  function handleSaved() {
    setModalMember(null);
    router.refresh();
  }

  /**
   * Exports what the importer reads back, so a file can round-trip. Business and Account are
   * included for reference only — Business comes from the linked listing, Account reflects
   * whether a user record exists, and the importer ignores both.
   */
  function exportCsv() {
    downloadCsv(
      "event-team-members.csv",
      [
        "First Name", "Last Name", "Email", "Phone", "Mobile", "Position",
        "Status", "LinkedIn", "Description", "Is Contact", "Enable Chat", "Business",
      ],
      filteredMembers.map((m) => [
        m.firstName,
        m.lastName,
        m.email,
        m.phone ?? "",
        m.workPhone,
        m.position,
        m.status ?? "Pending",
        m.linkedinUserProfile ?? "",
        m.description ?? "",
        m.isContact ? "Yes" : "No",
        m.enableChat ? "Yes" : "No",
        m.business ?? "",
      ]),
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <p className="text-sm font-medium text-zinc-400 max-w-xl">
          People who help you run your stand or session — added here can be given event access and chat.
        </p>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button
            type="button"
            title="Export CSV"
            onClick={exportCsv}
            disabled={members.length === 0}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-4 py-3 text-xs font-bold uppercase tracking-wider text-zinc-300 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>

          <button
            type="button"
            title="Import CSV"
            onClick={() => setImportOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-4 py-3 text-xs font-bold uppercase tracking-wider text-zinc-300 transition hover:bg-white/10 hover:text-white"
          >
            <Upload className="h-3.5 w-3.5" />
            Import CSV
          </button>

          <button
            onClick={() => setModalMember("new")}
            className="btn-brand-gradient inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-black uppercase tracking-widest text-white shadow-2xl transition hover:scale-105"
          >
            <Plus className="h-4 w-4" />
            Add Member
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-400 font-bold">
          {errorMessage}
        </div>
      )}

      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 shadow-xl backdrop-blur-md">
        <Search className="h-5 w-5 shrink-0 text-brand-pink" />
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Search members by name, email, business or status…"
          className="w-full bg-transparent text-sm text-white placeholder:text-zinc-600 focus:outline-none font-medium"
        />
      </div>

      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-gradient-to-r from-brand-purple to-brand-pink text-white">
                <th className="px-6 py-4 font-black uppercase tracking-wider">Name</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Contact</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Position</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Business</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Account</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider text-right">Manage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredMembers.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center text-zinc-500 italic font-medium">
                    {members.length === 0
                      ? "No team members yet — add the people who'll help staff your stand or session."
                      : "No team members match your search."}
                  </td>
                </tr>
              )}
              {paged.map((member) => (
                <tr key={member.id} className="align-top hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2 font-black text-white tracking-tight">
                      {member.firstName} {member.lastName}
                      {member.isContact && <BadgeCheck className="h-4 w-4 text-brand-pink" aria-label="Event contact" />}
                      {member.enableChat && <MessageCircle className="h-4 w-4 text-brand-purple" aria-label="Chat enabled" />}
                    </div>
                  </td>
                  <td className="px-6 py-5 text-zinc-400 font-medium">
                    <div className="text-zinc-200">{member.email}</div>
                    <div className="text-[10px] font-bold uppercase tracking-wider mt-1">{member.workPhone}</div>
                  </td>
                  <td className="px-6 py-5 text-zinc-300 font-bold text-xs uppercase tracking-wide">{member.position}</td>
                  <td className="px-6 py-5 text-zinc-300 font-medium">{member.business || "—"}</td>
                  <td className="px-6 py-5">
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest border shadow-lg ${
                      member.status === 'Registered' 
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                        : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    }`}>
                      {member.status || "—"}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-zinc-400 text-xs font-bold">{member.joiningStatus || "—"}</td>
                  <td className="px-6 py-5">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setModalMember(member)}
                        className="inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-300 hover:bg-white/10 hover:text-white transition shadow-xl"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </button>
                      <button
                        disabled={pendingId === member.id}
                        onClick={() => remove(member.id)}
                        className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 border border-red-500/20 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-red-400 hover:bg-red-500/20 transition shadow-xl disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <TablePagination
          currentPage={page}
          totalItems={filteredMembers.length}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          className="px-6 pb-5"
        />
      </div>

      {modalMember && (
        <TeamMemberFormModal
          defaultValues={
            modalMember === "new"
              ? undefined
              : {
                  id: modalMember.id,
                  first_name: modalMember.firstName,
                  last_name: modalMember.lastName,
                  email: modalMember.email,
                  phone: modalMember.phone ?? "",
                  work_phone: modalMember.workPhone,
                  position: modalMember.position,
                  status: (modalMember.status as "Pending" | "Registered") ?? "Pending",
                  linkedin_user_profile: modalMember.linkedinUserProfile ?? "",
                  description: modalMember.description ?? "",
                  is_contact: modalMember.isContact,
                  enable_chat: modalMember.enableChat,
                }
          }
          onClose={() => setModalMember(null)}
          onSaved={handleSaved}
        />
      )}

      {importOpen && (
        <ImportMembersModal
          onClose={() => setImportOpen(false)}
          onImported={() => router.refresh()}
        />
      )}
    </div>
  );
}
