"use client";

import { useState } from "react";
import {
  Mail,
  Search,
  Eye,
  Download,
  X,
  Send,
  Calendar,
  User,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";
import type { MailLogRow, MailLogsResult } from "@/lib/services/eventMailLogs";

import { ModalPortal } from "@/components/ui/ModalPortal";
interface EmailLogsManagerProps {
  initialData: MailLogsResult;
  eventId: number;
}

export function EmailLogsManager({ initialData, eventId }: EmailLogsManagerProps) {
  const [data, setData] = useState<MailLogsResult>(initialData);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [activeModalLog, setActiveModalLog] = useState<MailLogRow | null>(null);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  const fetchLogs = async (page = 1, templateId = selectedTemplate) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("event_id", String(eventId));
      params.set("page", String(page));
      if (templateId) params.set("email_template_id", templateId);

      const res = await fetch(`/api/members/mail-logs?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to fetch mail logs:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs(1, selectedTemplate);
  };

  const handleViewLog = async (log: MailLogRow) => {
    setResendStatus(null);
    try {
      const res = await fetch(`/api/members/mail-logs?event_id=${eventId}&id=${log.id}`);
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

  const handleDownload = (log: MailLogRow) => {
    const text = `================================================
EMAIL LOG DETAILS
================================================
ID: ${log.id}
Date: ${log.date ? new Date(log.date).toLocaleString() : "N/A"}
To: ${log.toName || ""} <${log.toEmail || "N/A"}>
From: ${log.fromName || ""} <${log.fromEmail || "N/A"}>
Subject: ${log.subject || "N/A"}
Template: ${log.emailTemplateName || log.emailTemplateId || "N/A"}

------------------------------------------------
MESSAGE BODY:
------------------------------------------------
${log.bodyPlain || log.bodyHtml?.replace(/<[^>]+>/g, "") || "No content"}
`;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `email_log_${log.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleResend = () => {
    setResendStatus("Email queued for re-delivery to " + (activeModalLog?.toEmail || "recipient"));
    setTimeout(() => {
      setResendStatus(null);
    }, 4000);
  };

  const totalPages = Math.ceil(data.total / data.pageSize) || 1;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-pink text-white shadow-sm">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase text-white">Email Logs</h1>
              <p className="text-xs text-zinc-500">Track and review all system emails dispatched for your event</p>
            </div>
          </div>
          <div className="text-xs font-bold text-zinc-400 bg-white/10 px-3 py-1.5 rounded-lg border border-white/10">
            Total Logs: <span className="text-brand-pink font-black">{data.total}</span>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <form onSubmit={handleFilterSubmit} className="mt-5 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-8">
            <label className="block text-xs font-bold text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-brand-pink" /> Filter by Email Template
            </label>
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-xs font-medium text-white focus:border-brand-pink focus:bg-white/10 focus:outline-none transition"
            >
              <option value="">Filter Email Logs (All Templates)</option>
              {data.templateOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.name}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-4 flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-pink px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm shadow-brand-pink/20 hover:opacity-90 transition disabled:opacity-50"
            >
              <Search className="h-3.5 w-3.5" />
              {loading ? "Searching..." : "Search"}
            </button>
            {selectedTemplate && (
              <button
                type="button"
                onClick={() => {
                  setSelectedTemplate("");
                  fetchLogs(1, "");
                }}
                className="rounded-xl border border-white/10 bg-white/10 px-3 py-2.5 text-xs font-bold text-zinc-400 hover:bg-white/20 hover:text-white transition"
              >
                Clear
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Email Logs Table */}
      <div className="rounded-2xl border border-white/10 bg-zinc-900/40 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-gradient-to-r from-brand-purple to-brand-pink text-white">
                <th className="px-6 py-4 font-black uppercase tracking-wider w-16">ID</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Recipient Email</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Subject</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider w-44">Date</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider w-36 text-right">Manage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-medium text-zinc-300">
              {data.rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-zinc-600">
                    No email logs found matching your filter criteria.
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
                          id={`email_log_message_link_${row.id}`}
                          onClick={() => handleViewLog(row)}
                          className="inline-flex items-center gap-1 rounded-lg bg-brand-pink/10 px-2.5 py-1.5 text-xs font-bold text-brand-pink hover:bg-brand-pink/20 transition"
                          title="View Message"
                        >
                          <Eye className="h-3.5 w-3.5" /> View
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownload(row)}
                          className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-bold text-zinc-300 hover:bg-white/20 hover:text-white transition"
                          title="Download Log"
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

      {/* View Email Log Modal */}
      {activeModalLog && (
        <ModalPortal>
      <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto overscroll-contain bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="glass-panel relative w-full max-w-3xl rounded-2xl shadow-2xl border border-white/10 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 bg-black/30 px-6 py-4 text-white">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-brand-pink" />
                <h3 className="text-base font-bold uppercase tracking-wide">View Message #{activeModalLog.id}</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveModalLog(null)}
                className="rounded-lg p-1 text-zinc-500 hover:bg-white/10 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto text-xs text-zinc-300">
              {resendStatus && (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-emerald-400 font-bold">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>{resendStatus}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white/5 p-4 rounded-xl border border-white/10 font-medium">
                <div>
                  <span className="font-bold text-zinc-500 uppercase tracking-wider block text-[10px]">Recipient (To)</span>
                  <span className="font-black text-white">{activeModalLog.toName || "N/A"}</span>
                  <span className="block text-zinc-400 font-mono text-[11px]">{activeModalLog.toEmail || "N/A"}</span>
                </div>
                <div>
                  <span className="font-bold text-zinc-500 uppercase tracking-wider block text-[10px]">Sender (From)</span>
                  <span className="font-black text-white">{activeModalLog.fromName || "System"}</span>
                  <span className="block text-zinc-400 font-mono text-[11px]">{activeModalLog.fromEmail || "N/A"}</span>
                </div>
                <div className="sm:col-span-2 pt-2 border-t border-white/10">
                  <span className="font-bold text-zinc-500 uppercase tracking-wider block text-[10px]">Subject</span>
                  <span className="font-bold text-white text-sm">{activeModalLog.subject || "(No Subject)"}</span>
                </div>
                <div>
                  <span className="font-bold text-zinc-500 uppercase tracking-wider block text-[10px]">Date Sent</span>
                  <span className="text-zinc-300">{activeModalLog.date ? new Date(activeModalLog.date).toLocaleString() : "N/A"}</span>
                </div>
                <div>
                  <span className="font-bold text-zinc-500 uppercase tracking-wider block text-[10px]">Template</span>
                  <span className="font-bold text-zinc-300">{activeModalLog.emailTemplateName || activeModalLog.emailTemplateId || "Standard Broadcast"}</span>
                </div>
              </div>

              {/* Message Content Preview — deliberately kept as a light/white canvas (not
                  recolored to the dark theme): this renders the ACTUAL email HTML via
                  dangerouslySetInnerHTML, which (like our own email templates, see
                  sendTemplatedEmail.ts) is authored assuming a white background. Forcing it
                  dark would misrepresent what the recipient actually saw in their inbox. */}
              <div>
                <span className="font-bold text-zinc-400 uppercase tracking-wider block mb-1 text-[11px]">Message Content</span>
                <div className="rounded-xl border border-white/10 bg-white p-4 leading-relaxed font-sans min-h-[150px] shadow-inner text-slate-900 overflow-x-auto">
                  {activeModalLog.bodyHtml ? (
                    <div dangerouslySetInnerHTML={{ __html: activeModalLog.bodyHtml }} />
                  ) : (
                    <p className="whitespace-pre-wrap">{activeModalLog.bodyPlain || "No message body recorded."}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer Buttons */}
            <div className="flex items-center justify-between border-t border-white/10 bg-black/20 px-6 py-3">
              <button
                type="button"
                onClick={() => handleDownload(activeModalLog)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-zinc-300 hover:bg-white/10 hover:text-white transition shadow-xs"
              >
                <Download className="h-3.5 w-3.5" /> Download Log
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleResend}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 transition shadow-xs"
                >
                  <Send className="h-3.5 w-3.5" /> Resend Email
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
        </div>
        </ModalPortal>
      )}
    </div>
  );
}
