"use client";

import { useState } from "react";
import { Download, Plus, Pencil, Trash2, Search, X, FileText, FileCheck, HardDrive, Filter, CheckCircle2 } from "lucide-react";
import { TablePagination } from "@/components/dashboard/TablePagination";

import { ModalPortal } from "@/components/ui/ModalPortal";
interface ResourceItem {
  id: number;
  title: string;
  category: string;
  fileSize: string;
  fileType: string;
  uploadedAt: string;
  downloadsCount: number;
  description: string;
  url: string;
}

const INITIAL_RESOURCES: ResourceItem[] = [
  {
    id: 1,
    title: "Exhibitor Show Guide & Rules 2026",
    category: "Guides",
    fileSize: "4.2 MB",
    fileType: "PDF",
    uploadedAt: "2026-07-20",
    downloadsCount: 142,
    description: "Complete guide outlining setup times, safety guidelines, and operations.",
    url: "#"
  },
  {
    id: 2,
    title: "Official Event Logo Asset Pack",
    category: "Marketing",
    fileSize: "18.5 MB",
    fileType: "ZIP",
    uploadedAt: "2026-07-18",
    downloadsCount: 310,
    description: "High-resolution SVG, PNG, and EPS vector logo variants for print and web.",
    url: "#"
  },
  {
    id: 3,
    title: "Sponsorship Packages Booklet",
    category: "Marketing",
    fileSize: "2.8 MB",
    fileType: "PDF",
    uploadedAt: "2026-07-25",
    downloadsCount: 89,
    description: "Detailed description of all visual sponsorships, speaking slots, and stand locations.",
    url: "#"
  },
  {
    id: 4,
    title: "Trade Stand Power Grid Diagram",
    category: "Technical",
    fileSize: "1.5 MB",
    fileType: "PDF",
    uploadedAt: "2026-07-28",
    downloadsCount: 54,
    description: "Electrical layouts and power feed locations for exhibitors in Zones A and B.",
    url: "#"
  }
];

const CATEGORIES = ["All", "Guides", "Marketing", "Technical", "Schedules"];
const FIELD_CLASS =
  "w-full rounded-xl border border-white/15 bg-zinc-950/85 px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-brand-pink focus:ring-1 focus:ring-brand-pink/30 focus:outline-none transition";

export default function ManageEventDownloadPage() {
  const [resources, setResources] = useState<ResourceItem[]>(INITIAL_RESOURCES);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ResourceItem | null>(null);
  
  // Form States
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState("Guides");
  const [formDescription, setFormDescription] = useState("");
  const [formSize, setFormSize] = useState("1.2 MB");
  const [formType, setFormType] = useState("PDF");
  const [toastMessage, setToastMessage] = useState("");

  const [page, setPage] = useState(1);
  const pageSize = 10;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 4000);
  };

  const openAddModal = () => {
    setEditingItem(null);
    setFormTitle("");
    setFormCategory("Guides");
    setFormDescription("");
    setFormSize("1.5 MB");
    setFormType("PDF");
    setModalOpen(true);
  };

  const openEditModal = (item: ResourceItem) => {
    setEditingItem(item);
    setFormTitle(item.title);
    setFormCategory(item.category);
    setFormDescription(item.description);
    setFormSize(item.fileSize);
    setFormType(item.fileType);
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    if (editingItem) {
      // Edit
      setResources(resources.map(r => r.id === editingItem.id ? {
        ...r,
        title: formTitle.trim(),
        category: formCategory,
        description: formDescription.trim(),
        fileSize: formSize,
        fileType: formType.toUpperCase()
      } : r));
      showToast("Resource updated successfully!");
    } else {
      // Add
      const newItem: ResourceItem = {
        id: Date.now(),
        title: formTitle.trim(),
        category: formCategory,
        description: formDescription.trim(),
        fileSize: formSize,
        fileType: formType.toUpperCase(),
        uploadedAt: new Date().toISOString().split("T")[0],
        downloadsCount: 0,
        url: "#"
      };
      setResources([newItem, ...resources]);
      showToast("New resource added successfully!");
    }
    setModalOpen(false);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this resource?")) {
      setResources(resources.filter(r => r.id !== id));
      showToast("Resource deleted successfully.");
    }
  };

  const filtered = resources.filter(r => {
    const matchesSearch = r.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          r.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "All" || r.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const totalDownloads = resources.reduce((acc, r) => acc + r.downloadsCount, 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-purple to-brand-pink shadow-lg shadow-brand-pink/20">
            <Download className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white flex items-center gap-2">Manage Downloads</h1>
            <p className="text-xs font-medium text-zinc-400 mt-1">Provide and distribute downloadable materials, directories, and guides for this event.</p>
          </div>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full btn-brand-gradient px-5 py-2.5 text-sm font-bold text-white transition self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          Add Resource
        </button>
      </div>

      {/* Toast Feedback */}
      {toastMessage && (
        <div className="flex items-center gap-3 rounded-xl bg-emerald-500/15 border border-emerald-500/20 p-4 text-emerald-400 animate-fade-in">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-white/5 bg-zinc-950/40 p-4 flex items-center gap-4">
          <div className="rounded-lg bg-brand-pink/10 p-3 text-brand-pink border border-brand-pink/20">
            <HardDrive className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Total Materials</p>
            <p className="text-2xl font-black text-white mt-0.5">{resources.length}</p>
          </div>
        </div>

        <div className="rounded-xl border border-white/5 bg-zinc-950/40 p-4 flex items-center gap-4">
          <div className="rounded-lg bg-brand-purple/15 p-3 text-brand-purple border border-brand-purple/20">
            <Download className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Total Downloads</p>
            <p className="text-2xl font-black text-white mt-0.5">{totalDownloads}</p>
          </div>
        </div>

        <div className="rounded-xl border border-white/5 bg-zinc-950/40 p-4 flex items-center gap-4">
          <div className="rounded-lg bg-emerald-500/10 p-3 text-emerald-400 border border-emerald-500/20">
            <FileCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Formats</p>
            <p className="text-2xl font-black text-white mt-0.5">PDF, ZIP, DOCX</p>
          </div>
        </div>
      </div>

      {/* Control bar */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
        {/* Search Input */}
        <div className="flex-1 flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-950/60 px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-zinc-500" />
          <input
            type="text"
            placeholder="Search downloads by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-white placeholder:text-zinc-500 focus:outline-none"
          />
        </div>

        {/* Categories Tab Selector */}
        <div className="flex flex-wrap gap-1 bg-zinc-950/40 border border-white/10 p-1 rounded-xl">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                selectedCategory === cat
                  ? "bg-brand-pink text-white"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Table List */}
      <div className="overflow-x-auto rounded-xl border border-white/10 bg-zinc-950/40 backdrop-blur-md">
        <table className="w-full min-w-[780px] text-left text-sm text-zinc-300">
          <thead>
            <tr className="border-b border-white/10 bg-gradient-to-r from-brand-purple to-brand-pink text-white">
              <th className="px-6 py-4 font-black uppercase tracking-wider">Resource Info</th>
              <th className="px-6 py-4 font-black uppercase tracking-wider">Category</th>
              <th className="px-6 py-4 font-black uppercase tracking-wider">File Info</th>
              <th className="px-6 py-4 font-black uppercase tracking-wider">Downloads</th>
              <th className="px-6 py-4 font-black uppercase tracking-wider">Uploaded</th>
              <th className="px-6 py-4 font-black uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-zinc-500 font-medium">
                  {resources.length === 0 ? "No downloads have been added yet." : "No downloads match your query."}
                </td>
              </tr>
            )}
            {filtered.map((item) => (
              <tr key={item.id} className="hover:bg-white/5 border-b border-white/5 transition align-middle">
                <td className="px-5 py-4 max-w-sm">
                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-brand-pink mt-0.5 shrink-0" />
                    <div>
                      <div className="font-bold text-white text-sm">{item.title}</div>
                      <div className="text-zinc-400 text-xs mt-1 line-clamp-2 leading-relaxed">{item.description}</div>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <span className="rounded-full bg-brand-purple/15 px-2.5 py-1 text-xs font-bold text-brand-purple border border-brand-purple/20">
                    {item.category}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className="text-white font-bold text-sm">{item.fileType}</div>
                  <div className="text-zinc-500 text-xs mt-0.5">{item.fileSize}</div>
                </td>
                <td className="px-5 py-4 font-bold text-zinc-300 text-sm">{item.downloadsCount} times</td>
                <td className="px-5 py-4 text-zinc-400 text-xs">{item.uploadedAt}</td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditModal(item)}
                      className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-zinc-200 hover:bg-brand-pink hover:text-white hover:border-brand-pink transition"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-400 hover:bg-red-500 hover:text-white transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TablePagination currentPage={page} totalItems={filtered.length} pageSize={pageSize} onPageChange={setPage} className="mt-4" />

      {/* Add / Edit Resource Modal */}
      {modalOpen && (
        <ModalPortal>
      <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto overscroll-contain bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-zinc-950 border border-white/10 p-6 shadow-2xl text-white">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-lg font-black uppercase tracking-wider brand-gradient-text">
                {editingItem ? "Edit Resource" : "Add Resource"}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-zinc-400 hover:text-white transition">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-5 grid gap-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-zinc-300">Title*</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className={FIELD_CLASS}
                  placeholder="e.g. Venue Parking Map 2026"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-zinc-300">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className={FIELD_CLASS}
                  >
                    {CATEGORIES.slice(1).map((cat) => (
                      <option key={cat} value={cat} className="bg-zinc-950 text-white">
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-zinc-300">Format</label>
                  <input
                    type="text"
                    required
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className={FIELD_CLASS}
                    placeholder="e.g. PDF"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-zinc-300">File Size Estimate</label>
                  <input
                    type="text"
                    required
                    value={formSize}
                    onChange={(e) => setFormSize(e.target.value)}
                    className={FIELD_CLASS}
                    placeholder="e.g. 1.5 MB"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-zinc-300">Simulated Upload</label>
                  <div className="rounded-xl border border-dashed border-white/20 bg-white/5 p-2 text-center text-xs text-zinc-400 cursor-pointer hover:bg-white/10 transition">
                    Drag/Select File
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-zinc-300">Description</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={3}
                  className={FIELD_CLASS}
                  placeholder="What is this downloadable resource about..."
                />
              </div>

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
                  Save Resource
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
