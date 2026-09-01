"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Search, X, FileEdit, FileText, Calendar, AlignLeft, CheckCircle2, Clipboard, Sparkles } from "lucide-react";
import { TablePagination } from "@/components/dashboard/TablePagination";

import { ModalPortal } from "@/components/ui/ModalPortal";
interface ContentRequest {
  id: number;
  title: string;
  outlet: string; // e.g. "Event Magazine", "Show Guide", "Press Release"
  wordCount: string;
  deadline: string;
  status: "Draft" | "In Progress" | "Under Review" | "Completed";
  keyPoints: string;
  completedText?: string;
}

const INITIAL_REQUESTS: ContentRequest[] = [
  {
    id: 1,
    title: "EcoTech Keynote Speaker Feature Article",
    outlet: "Event Magazine",
    wordCount: "600-800 words",
    deadline: "2026-08-05",
    status: "In Progress",
    keyPoints: "Highlight circular economy, battery recycling advances, and their new solar array. Quote CEO Dr. Henderson."
  },
  {
    id: 2,
    title: "Alpha Robotics Stand Promo Pitch",
    outlet: "Show Guide",
    wordCount: "100-150 words",
    deadline: "2026-08-01",
    status: "Completed",
    keyPoints: "Introduce Model X industrial arm. Highlight live demos at Stand A12.",
    completedText: "Experience the next wave of factory automation with Alpha Robotics at Stand A12! We are thrilled to host live, continuous demonstrations of our cutting-edge Model X industrial arm. Perfect for picking, sorting, and hazardous material manipulation, our latest technology boasts up to a 35% efficiency boost for warehouses. Visit us to speak with top product engineers and claim your exclusive live-trial vouchers!"
  },
  {
    id: 3,
    title: "Grand Opening Press Announcement",
    outlet: "Press Release",
    wordCount: "400-500 words",
    deadline: "2026-08-10",
    status: "Draft",
    keyPoints: "Emphasize city mayor attendance, official ribbon cutting at 10 AM, and 500+ global brands participating."
  }
];

const OUTLETS = ["Event Magazine", "Show Guide", "Press Release", "Event Directory", "Social Post"];

const STATUS_CLASSES: Record<string, string> = {
  Draft: "bg-zinc-800 text-zinc-300 border border-zinc-700 px-2.5 py-1 rounded-full text-xs font-bold",
  "In Progress": "bg-blue-500/15 text-blue-400 border border-blue-500/20 px-2.5 py-1 rounded-full text-xs font-bold",
  "Under Review": "bg-amber-500/15 text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-full text-xs font-bold",
  Completed: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full text-xs font-bold",
};

const FIELD_CLASS =
  "w-full rounded-xl border border-white/15 bg-zinc-950/85 px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-brand-pink focus:ring-1 focus:ring-brand-pink/30 focus:outline-none transition";

export default function ManageEventContentRequestPage() {
  const [requests, setRequests] = useState<ContentRequest[]>(INITIAL_REQUESTS);
  const [searchQuery, setSearchQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<ContentRequest | null>(null);
  const [viewingResult, setViewingResult] = useState<ContentRequest | null>(null);

  // Form states
  const [formTitle, setFormTitle] = useState("");
  const [formOutlet, setFormOutlet] = useState("Event Magazine");
  const [formWordCount, setFormWordCount] = useState("400-500 words");
  const [formDeadline, setFormDeadline] = useState("");
  const [formKeyPoints, setFormKeyPoints] = useState("");
  const [formStatus, setFormStatus] = useState<ContentRequest["status"]>("Draft");
  const [formCompletedText, setFormCompletedText] = useState("");
  
  const [toastMessage, setToastMessage] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 4000);
  };

  const openAddModal = () => {
    setEditingRequest(null);
    setFormTitle("");
    setFormOutlet("Event Magazine");
    setFormWordCount("300-400 words");
    setFormDeadline(new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split("T")[0]);
    setFormKeyPoints("");
    setFormStatus("Draft");
    setFormCompletedText("");
    setModalOpen(true);
  };

  const openEditModal = (req: ContentRequest) => {
    setEditingRequest(req);
    setFormTitle(req.title);
    setFormOutlet(req.outlet);
    setFormWordCount(req.wordCount);
    setFormDeadline(req.deadline);
    setFormKeyPoints(req.keyPoints);
    setFormStatus(req.status);
    setFormCompletedText(req.completedText || "");
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    if (editingRequest) {
      setRequests(requests.map(r => r.id === editingRequest.id ? {
        ...r,
        title: formTitle.trim(),
        outlet: formOutlet,
        wordCount: formWordCount,
        deadline: formDeadline,
        status: formStatus,
        keyPoints: formKeyPoints.trim(),
        completedText: formStatus === "Completed" ? (formCompletedText.trim() || "The requested copy is drafted and ready.") : undefined
      } : r));
      showToast("Content request updated successfully!");
    } else {
      const newItem: ContentRequest = {
        id: Date.now(),
        title: formTitle.trim(),
        outlet: formOutlet,
        wordCount: formWordCount,
        deadline: formDeadline,
        status: "Draft",
        keyPoints: formKeyPoints.trim()
      };
      setRequests([newItem, ...requests]);
      showToast("New content request submitted!");
    }
    setModalOpen(false);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this request?")) {
      setRequests(requests.filter(r => r.id !== id));
      showToast("Request deleted.");
    }
  };

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast("Content copied to clipboard!");
  };

  const filtered = requests.filter(r => 
    r.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    r.keyPoints.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.outlet.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-purple to-brand-pink shadow-lg shadow-brand-pink/20">
            <FileText className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white flex items-center gap-2">Manage Content Requests</h1>
            <p className="text-xs font-medium text-zinc-400 mt-1">Request, draft, and approve custom directory copywriting, newsletter features, and magazine articles.</p>
          </div>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full btn-brand-gradient px-5 py-2.5 text-sm font-bold text-white transition self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          Request Content
        </button>
      </div>

      {/* Toast Feedback */}
      {toastMessage && (
        <div className="flex items-center gap-3 rounded-xl bg-emerald-500/15 border border-emerald-500/20 p-4 text-emerald-400 animate-fade-in">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Stats Counter */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-white/5 bg-zinc-950/40 p-4">
          <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Total Drafts</p>
          <p className="text-2xl font-black text-white mt-0.5">{requests.filter(r => r.status === "Draft").length}</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-zinc-950/40 p-4 border-l-blue-500/30">
          <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider text-blue-400">In Progress</p>
          <p className="text-2xl font-black text-blue-400 mt-0.5">{requests.filter(r => r.status === "In Progress").length}</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-zinc-950/40 p-4 border-l-amber-500/30">
          <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider text-amber-400">Under Review</p>
          <p className="text-2xl font-black text-amber-400 mt-0.5">{requests.filter(r => r.status === "Under Review").length}</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-zinc-950/40 p-4 border-l-emerald-500/30">
          <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider text-emerald-400">Completed</p>
          <p className="text-2xl font-black text-emerald-400 mt-0.5">{requests.filter(r => r.status === "Completed").length}</p>
        </div>
      </div>

      {/* Search Filter */}
      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-950/60 px-3 py-2">
        <Search className="h-4 w-4 shrink-0 text-zinc-500" />
        <input
          type="text"
          placeholder="Search requests by title, publication outlet, or description..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-transparent text-sm text-white placeholder:text-zinc-500 focus:outline-none"
        />
      </div>

      {/* Interactive Request Cards */}
      <div className="space-y-4">
        {filtered.length === 0 && (
          <div className="rounded-xl border border-white/10 bg-zinc-950/30 p-12 text-center text-zinc-500 font-medium">
            No content requests found matching your query.
          </div>
        )}
        {filtered.map((req) => (
          <div key={req.id} className="rounded-xl border border-white/10 bg-zinc-950/40 p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-white/20 transition">
            <div className="space-y-1.5 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className={STATUS_CLASSES[req.status]}>{req.status}</span>
                <span className="rounded-full bg-brand-purple/10 px-2.5 py-0.5 text-[10px] font-bold text-brand-purple border border-brand-purple/20">
                  {req.outlet}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500">
                  <Calendar className="h-3.5 w-3.5" /> Deadline: {req.deadline}
                </span>
              </div>
              <h3 className="text-base font-black text-white">{req.title}</h3>
              <p className="text-xs text-zinc-400 leading-relaxed font-medium">
                <span className="text-brand-pink font-semibold">Targets:</span> {req.keyPoints}
              </p>
              <div className="flex items-center gap-2 text-[11px] text-zinc-500 pt-0.5">
                <AlignLeft className="h-3.5 w-3.5 text-zinc-500" />
                <span>Length Target: {req.wordCount}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end md:self-auto pt-2 md:pt-0">
              {req.status === "Completed" && req.completedText && (
                <button
                  onClick={() => setViewingResult(req)}
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 px-3.5 py-2 text-xs font-bold text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition"
                >
                  <Sparkles className="h-3.5 w-3.5" /> View Text
                </button>
              )}

              <button
                onClick={() => openEditModal(req)}
                className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-zinc-200 hover:bg-white/10 hover:text-white transition"
              >
                <FileEdit className="h-3.5 w-3.5 text-zinc-400" /> Edit
              </button>
              <button
                onClick={() => handleDelete(req.id)}
                className="inline-flex items-center gap-1 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-400 hover:bg-red-500 hover:text-white transition"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      <TablePagination currentPage={page} totalItems={filtered.length} pageSize={pageSize} onPageChange={setPage} className="mt-4" />

      {/* Copywriting Result Drawer / Modal */}
      {viewingResult && (
        <ModalPortal>
      <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto overscroll-contain bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-xl rounded-2xl bg-zinc-950 border border-white/10 p-6 shadow-2xl text-white">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="space-y-0.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-brand-pink">Completed Copywriting</span>
                <h3 className="text-base font-black text-white">{viewingResult.title}</h3>
              </div>
              <button onClick={() => setViewingResult(null)} className="text-zinc-400 hover:text-white transition shrink-0">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 bg-zinc-900/60 rounded-xl border border-white/5 p-4 text-zinc-300 text-sm leading-relaxed whitespace-pre-line relative">
              {viewingResult.completedText}
            </div>

            <div className="flex justify-between items-center mt-5 pt-4 border-t border-white/10">
              <span className="text-xs text-zinc-500">Publication target: <strong className="text-zinc-300">{viewingResult.outlet}</strong></span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleCopyToClipboard(viewingResult.completedText || "")}
                  className="inline-flex items-center gap-1.5 rounded-full btn-brand-gradient px-4 py-2 text-xs font-bold text-white transition"
                >
                  <Clipboard className="h-3.5 w-3.5" /> Copy Text
                </button>
                <button
                  onClick={() => setViewingResult(null)}
                  className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-white/5 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
    </ModalPortal>
      )}

      {/* Form modal */}
      {modalOpen && (
        <ModalPortal>
      <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto overscroll-contain bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-zinc-950 border border-white/10 p-6 shadow-2xl text-white">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-lg font-black uppercase tracking-wider brand-gradient-text">
                {editingRequest ? "Edit Content Request" : "New Content Request"}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-zinc-400 hover:text-white transition">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-5 grid gap-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-zinc-300">Topic / Article Title*</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className={FIELD_CLASS}
                  placeholder="e.g. Exhibitor Spotlight Interview"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-zinc-300">Target Outlet</label>
                  <select
                    value={formOutlet}
                    onChange={(e) => setFormOutlet(e.target.value)}
                    className={FIELD_CLASS}
                  >
                    {OUTLETS.map((out) => (
                      <option key={out} value={out} className="bg-zinc-950 text-white">
                        {out}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-zinc-300">Word Count Target</label>
                  <input
                    type="text"
                    required
                    value={formWordCount}
                    onChange={(e) => setFormWordCount(e.target.value)}
                    className={FIELD_CLASS}
                    placeholder="e.g. 200-300 words"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-zinc-300">Deadline Date*</label>
                <input
                  type="date"
                  required
                  value={formDeadline}
                  onChange={(e) => setFormDeadline(e.target.value)}
                  className={FIELD_CLASS}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-zinc-300">Key Points / Details to Cover</label>
                <textarea
                  required
                  value={formKeyPoints}
                  onChange={(e) => setFormKeyPoints(e.target.value)}
                  rows={4}
                  className={FIELD_CLASS}
                  placeholder="Provide details about products, speaker quotes, or company facts..."
                />
              </div>

              {editingRequest && (
                <div className="border-t border-white/10 pt-4 mt-2 space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-zinc-300">Workflow Status</label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as any)}
                      className={FIELD_CLASS}
                    >
                      <option value="Draft" className="bg-zinc-950 text-white">Draft</option>
                      <option value="In Progress" className="bg-zinc-950 text-white">In Progress</option>
                      <option value="Under Review" className="bg-zinc-950 text-white">Under Review</option>
                      <option value="Completed" className="bg-zinc-950 text-white">Completed</option>
                    </select>
                  </div>

                  {formStatus === "Completed" && (
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-zinc-300">Completed Text Content</label>
                      <textarea
                        value={formCompletedText}
                        onChange={(e) => setFormCompletedText(e.target.value)}
                        rows={4}
                        className={FIELD_CLASS}
                        placeholder="Paste the final copywriting draft here..."
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-3 border-t border-white/10 pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-full border border-white/10 px-5 py-2.5 text-sm font-semibold text-zinc-300 hover:bg-white/5 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-full btn-brand-gradient px-6 py-2.5 text-sm font-bold text-white transition"
                >
                  Save Request
                </button>
              </div>
            </form>
          </div>
        </div>
    </ModalPortal>
      )}
    </div>
  );
}
