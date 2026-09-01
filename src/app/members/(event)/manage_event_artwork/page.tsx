"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Plus, Pencil, Trash2, Search, X, CheckSquare, XSquare, Clock, LayoutGrid, List, FileImage, CheckCircle2, Image } from "lucide-react";
import { TablePagination } from "@/components/dashboard/TablePagination";

import { ModalPortal } from "@/components/ui/ModalPortal";
interface ArtworkSubmission {
  id: number;
  exhibitor: string;
  standNumber: string;
  bannerType: string;
  dimensions: string;
  imageUrl: string;
  status: "Pending" | "Approved" | "Rejected";
  submittedAt: string;
  comments?: string;
}

const INITIAL_ARTWORKS: ArtworkSubmission[] = [
  {
    id: 1,
    exhibitor: "Alpha Robotics Corp",
    standNumber: "A12",
    bannerType: "Main Backdrop Banner",
    dimensions: "3000 x 2400 mm",
    imageUrl: "https://picsum.photos/seed/alpha/600/400",
    status: "Pending",
    submittedAt: "2026-07-29",
  },
  {
    id: 2,
    exhibitor: "Zenith Software Solutions",
    standNumber: "B04",
    bannerType: "Reception Counter Front",
    dimensions: "1000 x 900 mm",
    imageUrl: "https://picsum.photos/seed/zenith/600/400",
    status: "Approved",
    submittedAt: "2026-07-25",
    comments: "Excellent color contrast and high vector resolution."
  },
  {
    id: 3,
    exhibitor: "EcoTech Innovations",
    standNumber: "C19",
    bannerType: "Roll-up Banner Standard",
    dimensions: "850 x 2000 mm",
    imageUrl: "https://picsum.photos/seed/ecotech/600/400",
    status: "Rejected",
    submittedAt: "2026-07-27",
    comments: "Text size on bottom footer is too small to be legible from 3m distance. Please update and re-submit."
  },
  {
    id: 4,
    exhibitor: "NextGen Biotech",
    standNumber: "A15",
    bannerType: "Main Backdrop Banner",
    dimensions: "3000 x 2400 mm",
    imageUrl: "https://picsum.photos/seed/biotech/600/400",
    status: "Approved",
    submittedAt: "2026-07-22",
  }
];

const STATUS_BADGES: Record<string, string> = {
  Pending: "bg-amber-500/15 text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-full text-xs font-bold",
  Approved: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full text-xs font-bold",
  Rejected: "bg-red-500/15 text-red-400 border border-red-500/20 px-2.5 py-1 rounded-full text-xs font-bold",
};

const FIELD_CLASS =
  "w-full rounded-xl border border-white/15 bg-zinc-950/85 px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-brand-pink focus:ring-1 focus:ring-brand-pink/30 focus:outline-none transition";

export default function ManageEventArtworkPage() {
  const [artworks, setArtworks] = useState<ArtworkSubmission[]>(INITIAL_ARTWORKS);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Pending" | "Approved" | "Rejected">("All");
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingArtwork, setEditingArtwork] = useState<ArtworkSubmission | null>(null);
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  // Modals are portaled to document.body, so they must wait for client mount
  // before rendering (document isn't available during SSR).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Form inputs
  const [formExhibitor, setFormExhibitor] = useState("");
  const [formStand, setFormStand] = useState("");
  const [formBannerType, setFormBannerType] = useState("Main Backdrop Banner");
  const [formDimensions, setFormDimensions] = useState("3000 x 2400 mm");
  const [formImage, setFormImage] = useState("");
  const [formComments, setFormComments] = useState("");
  const [formStatus, setFormStatus] = useState<"Pending" | "Approved" | "Rejected">("Pending");
  const [toastMessage, setToastMessage] = useState("");

  const [page, setPage] = useState(1);
  const pageSize = 10;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 4000);
  };

  const openAddModal = () => {
    setEditingArtwork(null);
    setFormExhibitor("");
    setFormStand("");
    setFormBannerType("Main Backdrop Banner");
    setFormDimensions("3000 x 2400 mm");
    setFormImage(`https://picsum.photos/seed/${Date.now()}/600/400`);
    setFormComments("");
    setFormStatus("Pending");
    setModalOpen(true);
  };

  const openEditModal = (artwork: ArtworkSubmission) => {
    setEditingArtwork(artwork);
    setFormExhibitor(artwork.exhibitor);
    setFormStand(artwork.standNumber);
    setFormBannerType(artwork.bannerType);
    setFormDimensions(artwork.dimensions);
    setFormImage(artwork.imageUrl);
    setFormComments(artwork.comments || "");
    setFormStatus(artwork.status);
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formExhibitor.trim() || !formStand.trim()) return;

    if (editingArtwork) {
      setArtworks(artworks.map(a => a.id === editingArtwork.id ? {
        ...a,
        exhibitor: formExhibitor.trim(),
        standNumber: formStand.trim().toUpperCase(),
        bannerType: formBannerType,
        dimensions: formDimensions,
        imageUrl: formImage,
        status: formStatus,
        comments: formComments.trim() || undefined
      } : a));
      showToast("Artwork submission updated!");
    } else {
      const newItem: ArtworkSubmission = {
        id: Date.now(),
        exhibitor: formExhibitor.trim(),
        standNumber: formStand.trim().toUpperCase(),
        bannerType: formBannerType,
        dimensions: formDimensions,
        imageUrl: formImage,
        status: "Pending",
        submittedAt: new Date().toISOString().split("T")[0],
        comments: formComments.trim() || undefined
      };
      setArtworks([newItem, ...artworks]);
      showToast("Artwork submitted successfully!");
    }
    setModalOpen(false);
  };

  const handleUpdateStatus = (id: number, newStatus: "Approved" | "Rejected", comment?: string) => {
    setArtworks(artworks.map(a => a.id === id ? {
      ...a,
      status: newStatus,
      comments: comment || a.comments
    } : a));
    showToast(`Artwork successfully ${newStatus}!`);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to remove this artwork submission?")) {
      setArtworks(artworks.filter(a => a.id !== id));
      showToast("Submission removed.");
    }
  };

  const filtered = artworks.filter(a => {
    const matchesSearch = a.exhibitor.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          a.standNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          a.bannerType.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "All" || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-purple to-brand-pink shadow-lg shadow-brand-pink/20">
            <Image className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white flex items-center gap-2">Manage Stand Artworks</h1>
            <p className="text-xs font-medium text-zinc-400 mt-1">Review, approve, and manage exhibition stand graphics and banner artwork submissions from exhibitors.</p>
          </div>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full btn-brand-gradient px-5 py-2.5 text-sm font-bold text-white transition self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          Submit Artwork
        </button>
      </div>

      {/* Toast */}
      {toastMessage && (
        <div className="flex items-center gap-3 rounded-xl bg-emerald-500/15 border border-emerald-500/20 p-4 text-emerald-400 animate-fade-in">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-white/5 bg-zinc-950/40 p-4">
          <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Total Submissions</p>
          <p className="text-2xl font-black text-white mt-1">{artworks.length}</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-zinc-950/40 p-4 border-l-amber-500/30">
          <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider text-amber-400">Pending Review</p>
          <p className="text-2xl font-black text-amber-400 mt-1">{artworks.filter(a => a.status === "Pending").length}</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-zinc-950/40 p-4 border-l-emerald-500/30">
          <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider text-emerald-400">Approved</p>
          <p className="text-2xl font-black text-emerald-400 mt-1">{artworks.filter(a => a.status === "Approved").length}</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-zinc-950/40 p-4 border-l-red-500/30">
          <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider text-red-400">Rejected</p>
          <p className="text-2xl font-black text-red-400 mt-1">{artworks.filter(a => a.status === "Rejected").length}</p>
        </div>
      </div>

      {/* Control bar */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
        {/* Search */}
        <div className="flex-1 flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-950/60 px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by company name, stand, or banner type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-white placeholder:text-zinc-500 focus:outline-none"
          />
        </div>

        {/* Filter status */}
        <div className="flex flex-wrap gap-1 bg-zinc-950/40 border border-white/10 p-1 rounded-xl">
          {(["All", "Pending", "Approved", "Rejected"] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                statusFilter === st
                  ? "bg-brand-pink text-white"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Submissions Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filtered.length === 0 && (
          <div className="col-span-full rounded-xl border border-white/10 bg-zinc-950/30 p-12 text-center text-zinc-500 font-medium">
            No artwork submissions match your query.
          </div>
        )}
        {filtered.map((art) => (
          <div key={art.id} className="rounded-xl border border-white/10 bg-zinc-950/40 overflow-hidden flex flex-col md:flex-row group transition hover:border-white/20">
            {/* Visual Preview panel */}
            <div className="relative w-full md:w-48 h-44 bg-zinc-900 shrink-0 cursor-pointer overflow-hidden" onClick={() => setViewingImage(art.imageUrl)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={art.imageUrl}
                alt={art.bannerType}
                className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                <span className="text-white font-bold text-xs bg-black/70 px-3 py-1.5 rounded-full backdrop-blur-md">
                  Zoom View
                </span>
              </div>
              <span className="absolute top-2 left-2 bg-black/70 text-[10px] font-bold text-white px-2 py-0.5 rounded-md border border-white/10">
                Stand {art.standNumber}
              </span>
            </div>

            {/* Description Details panel */}
            <div className="p-5 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className={STATUS_BADGES[art.status]}>{art.status}</span>
                  <span className="text-[11px] text-zinc-500 font-medium">{art.submittedAt}</span>
                </div>
                <h3 className="text-base font-black text-white mt-2 group-hover:text-brand-pink transition">{art.exhibitor}</h3>
                <p className="text-xs text-zinc-400 font-bold mt-1">{art.bannerType}</p>
                <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 mt-1">
                  <FileImage className="h-3 w-3" />
                  <span>Specs: {art.dimensions}</span>
                </div>

                {art.comments && (
                  <div className="mt-3 bg-white/5 rounded-lg border border-white/5 p-2.5 text-xs text-zinc-300 leading-relaxed italic">
                    {art.comments}
                  </div>
                )}
              </div>

              {/* Admin Actions */}
              <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-4">
                <div className="flex gap-1.5">
                  <button
                    onClick={() => openEditModal(art)}
                    className="p-1.5 rounded-lg border border-white/10 bg-white/5 text-zinc-300 hover:bg-brand-pink hover:text-white transition"
                    title="Edit Submission"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(art.id)}
                    className="p-1.5 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition"
                    title="Remove Submission"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                {art.status === "Pending" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpdateStatus(art.id, "Approved")}
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => {
                        const reason = prompt("Enter rejection reason:");
                        if (reason !== null) {
                          handleUpdateStatus(art.id, "Rejected", reason);
                        }
                      }}
                      className="inline-flex items-center gap-1 rounded-lg bg-red-500/15 px-3 py-1 text-xs font-bold text-red-400 border border-red-500/20 hover:bg-red-500 hover:text-white transition"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Submission modal */}
      {modalOpen &&
        mounted &&
        createPortal(
          <ModalPortal>
      <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto overscroll-contain bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
            <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-zinc-950 border border-white/10 p-6 shadow-2xl text-white">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <h3 className="text-lg font-black uppercase tracking-wider brand-gradient-text">
                  {editingArtwork ? "Edit Submission" : "Submit Stand Artwork"}
                </h3>
                <button onClick={() => setModalOpen(false)} className="text-zinc-400 hover:text-white transition">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSave} className="mt-5 grid gap-4">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-zinc-300">Exhibitor Company Name*</label>
                  <input
                    type="text"
                    required
                    value={formExhibitor}
                    onChange={(e) => setFormExhibitor(e.target.value)}
                    className={FIELD_CLASS}
                    placeholder="e.g. Zenith Tech Corp"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-zinc-300">Stand Number*</label>
                    <input
                      type="text"
                      required
                      value={formStand}
                      onChange={(e) => setFormStand(e.target.value)}
                      className={FIELD_CLASS}
                      placeholder="e.g. A15"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-zinc-300">Banner Type</label>
                    <select
                      value={formBannerType}
                      onChange={(e) => setFormBannerType(e.target.value)}
                      className={FIELD_CLASS}
                    >
                      <option className="bg-zinc-950 text-white">Main Backdrop Banner</option>
                      <option className="bg-zinc-950 text-white">Reception Counter Front</option>
                      <option className="bg-zinc-950 text-white">Roll-up Banner Standard</option>
                      <option className="bg-zinc-950 text-white">Fascia Nameboard</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-zinc-300">Dimensions Spec</label>
                    <input
                      type="text"
                      required
                      value={formDimensions}
                      onChange={(e) => setFormDimensions(e.target.value)}
                      className={FIELD_CLASS}
                      placeholder="e.g. 3000 x 2400 mm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-zinc-300">Mock Image URL</label>
                    <input
                      type="text"
                      required
                      value={formImage}
                      onChange={(e) => setFormImage(e.target.value)}
                      className={FIELD_CLASS}
                    />
                  </div>
                </div>

                {editingArtwork && (
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-zinc-300">Review Status</label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as any)}
                      className={FIELD_CLASS}
                    >
                      <option value="Pending" className="bg-zinc-950 text-white">Pending</option>
                      <option value="Approved" className="bg-zinc-950 text-white">Approved</option>
                      <option value="Rejected" className="bg-zinc-950 text-white">Rejected</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="mb-1 block text-sm font-semibold text-zinc-300">Feedback / Comments</label>
                  <textarea
                    value={formComments}
                    onChange={(e) => setFormComments(e.target.value)}
                    rows={3}
                    className={FIELD_CLASS}
                    placeholder="Approve checklist notes or correction specs if rejected..."
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
                    {editingArtwork ? "Update Review" : "Submit Artwork"}
                  </button>
                </div>
              </form>
            </div>
          </div>
    </ModalPortal>,
          document.body
        )}

      {/* Image Viewer Zoom Modal */}
      {viewingImage &&
        mounted &&
        createPortal(
          <ModalPortal>
      <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto overscroll-contain bg-black/80 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setViewingImage(null)}>
            <button className="absolute top-4 right-4 text-white hover:text-zinc-400">
              <X className="h-8 w-8" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={viewingImage}
              alt="Expanded Artwork"
              className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg border border-white/10 shadow-2xl"
            />
          </div>
    </ModalPortal>,
          document.body
        )}
    </div>
  );
}