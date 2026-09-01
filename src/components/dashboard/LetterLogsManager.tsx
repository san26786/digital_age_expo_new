"use client";

import { useState } from "react";
import {
  FileText,
  Download,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  Printer,
  Calendar,
} from "lucide-react";
import type { LetterLogRow, LetterLogsResult } from "@/lib/services/eventLetterLogs";

import { ModalPortal } from "@/components/ui/ModalPortal";
interface LetterLogsManagerProps {
  initialData: LetterLogsResult;
  eventId: number;
}

export function LetterLogsManager({ initialData, eventId }: LetterLogsManagerProps) {
  const [data, setData] = useState<LetterLogsResult>(initialData);
  const [loading, setLoading] = useState<boolean>(false);
  const [activeModalLog, setActiveModalLog] = useState<LetterLogRow | null>(null);

  const fetchLogs = async (page = 1) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/members/letter-logs?event_id=${eventId}&page=${page}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to fetch letter logs:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewLog = async (log: LetterLogRow) => {
    try {
      const res = await fetch(`/api/members/letter-logs?event_id=${eventId}&id=${log.id}`);
      if (res.ok) {
        const json = await res.json();
        setActiveModalLog(json.log || log);
      } else {
        setActiveModalLog(log);
      }
    } catch {
      setActiveModalLog(log);
    }
  };

  const handleDownload = (log: LetterLogRow) => {
    const text = `================================================
LETTER LOG RECORD
================================================
ID: #${log.id}
Date: ${log.date ? new Date(log.date).toLocaleString() : "N/A"}
To: ${log.toName || ""} <${log.toEmail || "N/A"}>
Subject: ${log.subject || "N/A"}

------------------------------------------------
LETTER BODY:
------------------------------------------------
${log.bodyPlain || log.bodyHtml?.replace(/<[^>]+>/g, "") || "No content recorded"}
`;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `letter_log_${log.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const totalPages = Math.ceil(data.total / data.pageSize) || 1;

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-pink text-white shadow-sm">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase text-white">Letter Logs</h1>
              <p className="text-xs text-zinc-500">
                Official postal letters, formal notices, and downloadable attachments dispatched for this event
              </p>
            </div>
          </div>
          <div className="text-xs font-bold text-zinc-400 bg-white/10 px-3 py-1.5 rounded-lg border border-white/10">
            Total Records: <span className="text-brand-pink font-black">{data.total}</span>
          </div>
        </div>
      </div>

      {/* Letter Logs Table */}
      <div className="rounded-2xl border border-white/10 bg-zinc-900/40 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-gradient-to-r from-brand-purple to-brand-pink text-white">
                <th className="px-6 py-4 font-black uppercase tracking-wider w-16">ID</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Recipient</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Subject</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider w-44">Date</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider w-36 text-right">Manage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-medium text-zinc-300">
              {data.rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-zinc-600">
                    No letter logs found for this event.
                  </td>
                </tr>
              ) : (
                data.rows.map((row) => (
                  <tr key={row.id} className="hover:bg-white/5 transition">
                    <td className="px-4 py-3.5 font-bold text-zinc-500">#{row.id}</td>
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-white">{row.toName || "Recipient"}</div>
                      <div className="text-[11px] text-zinc-500 font-mono">{row.toEmail || "N/A"}</div>
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-white line-clamp-1 max-w-xs">
                      {row.subject || "(No Subject)"}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-zinc-400 text-[11px]">
                      {row.date ? new Date(row.date).toLocaleString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }) : "N/A"}
                    </td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        <button
                          type="button"
                          onClick={() => handleViewLog(row)}
                          className="inline-flex items-center gap-1 rounded-lg bg-brand-pink/10 px-2.5 py-1.5 text-xs font-bold text-brand-pink hover:bg-brand-pink/20 transition"
                          title="View Letter"
                        >
                          <Eye className="h-3.5 w-3.5" /> View
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownload(row)}
                          className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-bold text-zinc-300 hover:bg-white/20 hover:text-white transition"
                          title="Download Letter"
                        >
                          <Download className="h-3.5 w-3.5" /> Download
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-white/5 bg-white/5 px-4 py-3 text-xs font-medium text-zinc-400">
            <div>
              Showing Page <span className="font-bold text-white">{data.page}</span> of{" "}
              <span className="font-bold text-white">{totalPages}</span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={data.page <= 1 || loading}
                onClick={() => fetchLogs(data.page - 1)}
                className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-zinc-300 hover:bg-white/10 hover:text-white disabled:opacity-40 transition"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Previous
              </button>
              <button
                type="button"
                disabled={data.page >= totalPages || loading}
                onClick={() => fetchLogs(data.page + 1)}
                className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-zinc-300 hover:bg-white/10 hover:text-white disabled:opacity-40 transition"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal for Viewing Letter */}
      {activeModalLog && (
        <ModalPortal>
      <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto overscroll-contain bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="glass-panel relative w-full max-w-3xl rounded-2xl shadow-2xl border border-white/10 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-white/10 bg-black/30 px-6 py-4 text-white">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-brand-pink" />
                <h3 className="text-base font-bold uppercase tracking-wide">View Letter Record #{activeModalLog.id}</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveModalLog(null)}
                className="rounded-lg p-1 text-zinc-500 hover:bg-white/10 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto text-xs text-zinc-300">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white/5 p-4 rounded-xl border border-white/10 font-medium">
                <div>
                  <span className="font-bold text-zinc-500 uppercase tracking-wider block text-[10px]">Recipient</span>
                  <span className="font-black text-white">{activeModalLog.toName || "N/A"}</span>
                  <span className="block text-zinc-400 font-mono text-[11px]">{activeModalLog.toEmail || "N/A"}</span>
                </div>
                <div>
                  <span className="font-bold text-zinc-500 uppercase tracking-wider block text-[10px]">Date Logged</span>
                  <span className="font-semibold text-zinc-300">{activeModalLog.date ? new Date(activeModalLog.date).toLocaleString() : "N/A"}</span>
                </div>
                <div className="sm:col-span-2 pt-2 border-t border-white/10">
                  <span className="font-bold text-zinc-500 uppercase tracking-wider block text-[10px]">Subject / Document Title</span>
                  <span className="font-bold text-white text-sm">{activeModalLog.subject || "(No Subject)"}</span>
                </div>
              </div>

              {/* Letter Document Content — deliberately kept as a light/white canvas (like
                  EmailLogsManager's Message Content box): this renders the actual letter HTML
                  via dangerouslySetInnerHTML, authored assuming a white page/document
                  background, so forcing it dark would misrepresent the real document. */}
              <div>
                <span className="font-bold text-zinc-400 uppercase tracking-wider block mb-1 text-[11px]">Letter Document Content</span>
                <div className="rounded-xl border border-white/10 bg-white p-5 leading-relaxed font-sans min-h-[160px] shadow-inner text-slate-900 overflow-x-auto">
                  {activeModalLog.bodyHtml ? (
                    <div dangerouslySetInnerHTML={{ __html: activeModalLog.bodyHtml }} />
                  ) : (
                    <p className="whitespace-pre-wrap">{activeModalLog.bodyPlain || "No letter text recorded."}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-white/10 bg-black/20 px-6 py-3">
              <button
                type="button"
                onClick={() => handleDownload(activeModalLog)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-zinc-300 hover:bg-white/10 hover:text-white transition shadow-xs"
              >
                <Download className="h-3.5 w-3.5" /> Download Document
              </button>

              <button
                type="button"
                onClick={() => setActiveModalLog(null)}
                className="rounded-xl border border-white/10 bg-white/5 px-5 py-2 text-xs font-bold text-zinc-300 hover:bg-white/10 hover:text-white transition shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}
    </div>
  );
}
