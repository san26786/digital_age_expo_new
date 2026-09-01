"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  FileText, 
  Pencil, 
  Download, 
  Lock, 
  Eye, 
  RefreshCw, 
  Plus,
  ArrowLeft,
  Save,
  CheckCircle,
  AlertTriangle,
  Settings,
  ThumbsUp,
  ThumbsDown
} from "lucide-react";
import { TablePagination } from "@/components/dashboard/TablePagination";

const PAGE_SIZE = 20;

interface Record {
  id: number;
  event_id: number;
  book_id: number;
  title: string | null;
  publication_type: string | null;
  generated_pdf: string | null;
  status: string | null;
  issue_link: string;
  publication_pdf: string;
  is_generated: boolean;
  publication_title_id: string | null;
  book_title: string;
  is_static: number;
  page_format: number;
}

interface Book {
  id: number;
  book_title: string;
}

export default function EventAdvertiseBookClient({ eventId }: { eventId: number }) {
  const [records, setRecords] = useState<Record[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [viewState, setViewState] = useState<"list" | "add" | "edit" | "pages">("list");
  const [selectedRecord, setSelectedRecord] = useState<Record | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    book_id: "",
    title: "",
    publication_title_id: "",
    publication_type: "",
    issue_link: ""
  });
  
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [page, setPage] = useState(1);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/members/event-advertise-book?eventId=${eventId}`);
      const data = await res.json();
      if (data.records) setRecords(data.records);
      if (data.books) setBooks(data.books);
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "Failed to load data" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [eventId]);

  useEffect(() => {
    setPage(1);
  }, [eventId]);

  const paged = useMemo(
    () => records.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [records, page]
  );

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const method = viewState === "add" ? "POST" : "PUT";
      const payload = {
        ...formData,
        event_id: eventId,
        id: selectedRecord?.id
      };
      
      const res = await fetch(`/api/members/event-advertise-book`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Failed to save");
      
      showMessage("success", `Magazine ${viewState === "add" ? "Added" : "Updated"} Successfully!`);
      setViewState("list");
      loadData();
    } catch (err: any) {
      showMessage("error", err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAction = async (action: "lock" | "generate" | "activate" | "deactivate", id: number) => {
    try {
      const res = await fetch(`/api/members/event-advertise-book`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed");
      
      showMessage("success", `Magazine ${action === 'lock' ? 'Locked' : 'Generated'} Successfully!`);
      loadData();
    } catch (err: any) {
      showMessage("error", err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-zinc-400">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-sky-500 border-t-transparent mb-3" />
        <p className="text-sm font-medium">Loading magazine data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-6xl mx-auto font-sans text-zinc-200">
      
      {/* Toast Messages */}
      {message && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-6 py-3 rounded shadow-lg text-sm font-bold text-white ${message.type === 'error' ? 'bg-rose-600' : 'bg-emerald-600'}`}>
          {message.type === 'error' ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
          {message.text}
        </div>
      )}

      {/* Header Area */}
      <div className="bg-zinc-900 p-6 rounded shadow-md border-b border-white/10 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white uppercase flex items-center gap-3">
            <FileText className="w-7 h-7" /> Manage Magazines
          </h1>
          <p className="text-zinc-400 text-sm mt-1 font-medium">Configure digital publications and advertisement books</p>
        </div>
        {viewState === "list" && (
          <button
            onClick={() => {
              setFormData({ book_id: "", title: "", publication_title_id: "", publication_type: "", issue_link: "" });
              setViewState("add");
            }}
            className="bg-indigo-600 hover:bg-indigo-500 text-white transition px-5 py-2.5 rounded font-bold text-sm shadow flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Magazine
          </button>
        )}
      </div>

      {viewState === "list" && (
        <div className="bg-zinc-950 rounded border border-white/10 shadow-sm p-4 overflow-x-auto">
          {records.length === 0 ? (
            <div className="text-center py-12 text-zinc-400 bg-white/5 rounded border border-dashed border-white/10">
              <FileText className="w-12 h-12 mx-auto mb-3 text-zinc-600" />
              <p className="text-lg font-bold text-zinc-300">No Magazines Found</p>
              <p className="text-sm mt-1">Click "Add Magazine" to create your first publication.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse bg-zinc-900 rounded shadow-sm overflow-hidden">
              <thead>
                <tr className="border-b border-white/10 bg-gradient-to-r from-brand-purple to-brand-pink text-white">
                  <th className="px-6 py-4 font-black uppercase tracking-wider">ID</th>
                  <th className="px-6 py-4 font-black uppercase tracking-wider">Publication Title</th>
                  <th className="px-6 py-4 font-black uppercase tracking-wider">Magazine Book</th>
                  <th className="px-6 py-4 font-black uppercase tracking-wider">Type</th>
                  <th className="px-6 py-4 font-black uppercase tracking-wider">Manage</th>
                </tr>
              </thead>
              <tbody className="text-sm text-zinc-300 divide-y divide-white/5">
                {paged.map(record => (
                  <tr key={record.id} className="hover:bg-white/[0.02] transition border-b border-white/5 last:border-0">
                    <td className="p-4 font-mono text-zinc-500">{record.id}</td>
                    <td className="p-4 font-bold text-white">{record.title || "Untitled"}</td>
                    <td className="p-4 text-indigo-400 font-semibold">{record.book_title}</td>
                    <td className="p-4">{record.publication_type || "Standard"}</td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-2 items-center">
                        <button 
                          className="btn-action" 
                          style={{ color: record.status === "active" ? "var(--color-status-active)" : "var(--color-status-inactive)", backgroundColor: record.status === "active" ? "var(--color-status-active-bg)" : "var(--color-status-inactive-bg)" }}
                          title={record.status === "active" ? "Active" : "Deactive"}
                          onClick={() => handleAction(record.status === "active" ? "deactivate" : "activate", record.id)}
                        >
                          {record.status === "active" ? <ThumbsUp className="w-4 h-4" /> : <ThumbsDown className="w-4 h-4" />}
                        </button>

                        {record.is_static === 0 && (
                          <button className="btn-action bg-blue-900/20 text-blue-400 hover:bg-blue-900/40" title="View Pages">
                            <Settings className="w-4 h-4" />
                          </button>
                        )}
                        <button 
                          className="btn-action bg-zinc-800 text-zinc-300 hover:bg-zinc-700" 
                          title="Edit"
                          onClick={() => {
                            setSelectedRecord(record);
                            setFormData({
                              book_id: record.book_id.toString(),
                              title: record.title || "",
                              publication_title_id: record.publication_title_id || "",
                              publication_type: record.publication_type || "",
                              issue_link: record.issue_link || ""
                            });
                            setViewState("edit");
                          }}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        
                        {record.generated_pdf && (
                          <>
                            <a 
                              href={record.generated_pdf} 
                              target="_blank" 
                              rel="noreferrer"
                              className="btn-action bg-emerald-900/20 text-emerald-400 hover:bg-emerald-900/40" 
                              title="Download PDF"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                            {!record.is_generated && (
                              <button 
                                onClick={() => handleAction('lock', record.id)}
                                className="btn-action bg-rose-900/20 text-rose-400 hover:bg-rose-900/40" 
                                title="Lock Publication"
                              >
                                <Lock className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}

                        <button className="btn-action bg-amber-900/20 text-amber-400 hover:bg-amber-900/40" title="Preview Magazine">
                          <Eye className="w-4 h-4" />
                        </button>

                        <button 
                          onClick={() => handleAction('generate', record.id)}
                          className="btn-action bg-purple-900/20 text-purple-400 hover:bg-purple-900/40" 
                          title="Generate Magazine"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <TablePagination currentPage={page} totalItems={records.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
        </div>
      )}

      {(viewState === "add" || viewState === "edit") && (
        <div className="bg-zinc-950 rounded border border-white/10 shadow-sm p-6">
          <button 
            onClick={() => setViewState("list")}
            className="flex items-center gap-2 text-sm font-bold text-zinc-400 hover:text-white mb-6 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to List
          </button>
          
          <h2 className="text-xl font-black text-white border-b border-white/10 pb-3 mb-6 uppercase tracking-wider">
            {viewState === "add" ? "Add New Magazine" : "Edit Magazine"}
          </h2>

          <form onSubmit={handleSave} className="space-y-6 max-w-2xl">
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">Magazine Book *</label>
                <select
                  required
                  value={formData.book_id}
                  onChange={(e) => {
                    const selectedBook = books.find(b => b.id.toString() === e.target.value);
                    setFormData({
                      ...formData, 
                      book_id: e.target.value,
                      title: selectedBook ? selectedBook.book_title : formData.title
                    });
                  }}
                  className="w-full rounded-md border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                >
                  <option value="">-- Select Magazine --</option>
                  {books.map(b => (
                    <option key={b.id} value={b.id}>{b.book_title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">Publication Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full rounded-md border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                  placeholder="e.g. Annual Expo Guide"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">Magazine Title Code</label>
                  <input
                    type="text"
                    value={formData.publication_title_id}
                    onChange={(e) => setFormData({...formData, publication_title_id: e.target.value})}
                    className="w-full rounded-md border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                    placeholder="Optional (NPPT code)"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">Publication Type</label>
                  <input
                    type="text"
                    value={formData.publication_type}
                    onChange={(e) => setFormData({...formData, publication_type: e.target.value})}
                    className="w-full rounded-md border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                    placeholder="Optional (MPT code)"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">Issue Link</label>
                <input
                  type="url"
                  value={formData.issue_link}
                  onChange={(e) => setFormData({...formData, issue_link: e.target.value})}
                  className="w-full rounded-md border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="pt-4 flex gap-4">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-full font-bold transition shadow-sm disabled:opacity-50"
              >
                <Save className="w-5 h-5" /> {saving ? "Saving..." : "Save Magazine"}
              </button>
            </div>
          </form>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .btn-action {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 6px;
          border-radius: 4px;
          transition: all 0.2s;
        }
      `}} />
    </div>
  );
}
