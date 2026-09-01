"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Plus, Pencil, Trash2, Search, X, CheckCircle2, Image as ImageIcon, ZoomIn, Calendar, Eye, Compass, Camera } from "lucide-react";
import { TablePagination } from "@/components/dashboard/TablePagination";

import { ModalPortal } from "@/components/ui/ModalPortal";
interface OrganiserPhoto {
  id: number;
  title: string;
  category: string;
  imageUrl: string;
  uploadedAt: string;
  featured: boolean;
  viewsCount: number;
}

const INITIAL_PHOTOS: OrganiserPhoto[] = [
  {
    id: 1,
    title: "Main Exhibition Hall Morning Rush",
    category: "Venue",
    imageUrl: "https://picsum.photos/seed/hall/800/600",
    uploadedAt: "2026-07-28",
    featured: true,
    viewsCount: 245
  },
  {
    id: 2,
    title: "Robotics Interactive Demo Stand",
    category: "Activities",
    imageUrl: "https://picsum.photos/seed/robot/800/600",
    uploadedAt: "2026-07-27",
    featured: true,
    viewsCount: 189
  },
  {
    id: 3,
    title: "Networking Lounge Panels",
    category: "Networking",
    imageUrl: "https://picsum.photos/seed/network/800/600",
    uploadedAt: "2026-07-26",
    featured: false,
    viewsCount: 92
  },
  {
    id: 4,
    title: "Opening Ceremony Ribbon Cutting",
    category: "Ceremony",
    imageUrl: "https://picsum.photos/seed/ribbon/800/600",
    uploadedAt: "2026-07-25",
    featured: true,
    viewsCount: 310
  }
];

const CATEGORIES = ["All", "Venue", "Activities", "Networking", "Ceremony"];
const FIELD_CLASS =
  "w-full rounded-xl border border-white/15 bg-zinc-950/85 px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-brand-pink focus:ring-1 focus:ring-brand-pink/30 focus:outline-none transition";

export default function ManageOrganiserPhotosPage() {
  const [photos, setPhotos] = useState<OrganiserPhoto[]>(INITIAL_PHOTOS);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [zoomImage, setZoomImage] = useState<OrganiserPhoto | null>(null);
  const [editingPhoto, setEditingPhoto] = useState<OrganiserPhoto | null>(null);

  // Modals are portaled to document.body, so they must wait for client mount
  // before rendering (document isn't available during SSR).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Form Inputs
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState("Venue");
  const [formImage, setFormImage] = useState("");
  const [formFeatured, setFormFeatured] = useState(false);
  
  const [toastMessage, setToastMessage] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 4000);
  };

  const openAddModal = () => {
    setEditingPhoto(null);
    setFormTitle("");
    setFormCategory("Venue");
    setFormImage(`https://picsum.photos/seed/${Date.now()}/800/600`);
    setFormFeatured(false);
    setModalOpen(true);
  };

  const openEditModal = (photo: OrganiserPhoto) => {
    setEditingPhoto(photo);
    setFormTitle(photo.title);
    setFormCategory(photo.category);
    setFormImage(photo.imageUrl);
    setFormFeatured(photo.featured);
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    if (editingPhoto) {
      setPhotos(photos.map(p => p.id === editingPhoto.id ? {
        ...p,
        title: formTitle.trim(),
        category: formCategory,
        imageUrl: formImage,
        featured: formFeatured
      } : p));
      showToast("Photo details updated!");
    } else {
      const newItem: OrganiserPhoto = {
        id: Date.now(),
        title: formTitle.trim(),
        category: formCategory,
        imageUrl: formImage,
        uploadedAt: new Date().toISOString().split("T")[0],
        featured: formFeatured,
        viewsCount: 0
      };
      setPhotos([newItem, ...photos]);
      showToast("Photo uploaded successfully to official gallery!");
    }
    setModalOpen(false);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this photo from the official gallery?")) {
      setPhotos(photos.filter(p => p.id !== id));
      showToast("Photo deleted.");
    }
  };

  const filtered = photos.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "All" || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-purple to-brand-pink shadow-lg shadow-brand-pink/20">
            <Camera className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white flex items-center gap-2">Manage Organiser Photos</h1>
            <p className="text-xs font-medium text-zinc-400 mt-1">Curate and manage the official photographic gallery, press photos, and highlight albums for this event.</p>
          </div>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full btn-brand-gradient px-5 py-2.5 text-sm font-bold text-white transition self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          Add Photo
        </button>
      </div>

      {/* Toast */}
      {toastMessage && (
        <div className="flex items-center gap-3 rounded-xl bg-emerald-500/15 border border-emerald-500/20 p-4 text-emerald-400 animate-fade-in">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Control bar */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
        {/* Search */}
        <div className="flex-1 flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-950/60 px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-zinc-500" />
          <input
            type="text"
            placeholder="Search photos by title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-white placeholder:text-zinc-500 focus:outline-none"
          />
        </div>

        {/* Category filters */}
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

      {/* Photos Masonry / Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        {filtered.length === 0 && (
          <div className="col-span-full rounded-xl border border-white/10 bg-zinc-950/30 p-12 text-center text-zinc-500 font-medium">
            No gallery photos found matching your criteria.
          </div>
        )}
        {filtered.map((photo) => (
          <div key={photo.id} className="group rounded-xl border border-white/10 bg-zinc-950/40 overflow-hidden flex flex-col justify-between hover:border-white/20 transition">
            {/* Image Tile */}
            <div className="relative aspect-video w-full bg-zinc-900 cursor-pointer overflow-hidden" onClick={() => setZoomImage(photo)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.imageUrl}
                alt={photo.title}
                className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                <ZoomIn className="h-6 w-6 text-white" />
              </div>
              <span className="absolute top-2 left-2 bg-brand-purple text-[9px] font-black uppercase text-white px-2 py-0.5 rounded-full tracking-wider border border-brand-purple/20">
                {photo.category}
              </span>
              {photo.featured && (
                <span className="absolute top-2 right-2 bg-brand-pink text-[9px] font-black uppercase text-white px-2 py-0.5 rounded-full tracking-wider">
                  Featured
                </span>
              )}
            </div>

            {/* Photo details */}
            <div className="p-4 flex-1 flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-black text-white group-hover:text-brand-pink transition line-clamp-1">{photo.title}</h4>
                <div className="flex items-center gap-3 mt-2 text-[11px] text-zinc-500">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> {photo.uploadedAt}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Eye className="h-3 w-3" /> {photo.viewsCount} views
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 border-t border-white/5 pt-3 mt-4">
                <button
                  onClick={() => openEditModal(photo)}
                  className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/5 py-1.5 text-xs font-bold text-zinc-200 hover:bg-brand-pink hover:text-white hover:border-brand-pink transition"
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </button>
                <button
                  onClick={() => handleDelete(photo.id)}
                  className="inline-flex items-center justify-center rounded-lg border border-red-500/20 bg-red-500/10 p-1.5 text-xs font-bold text-red-400 hover:bg-red-500 hover:text-white transition"
                  title="Delete Photo"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <TablePagination currentPage={page} totalItems={filtered.length} pageSize={pageSize} onPageChange={setPage} className="mt-4" />

      {/* Zoom lightbox modal */}
      {zoomImage &&
        mounted &&
        createPortal(
          <ModalPortal>
      <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto overscroll-contain bg-black/80 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setZoomImage(null)}>
            <button className="absolute top-4 right-4 text-white hover:text-zinc-400 shrink-0">
              <X className="h-8 w-8" />
            </button>
            <div className="max-w-4xl w-full flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={zoomImage.imageUrl}
                alt={zoomImage.title}
                className="max-h-[80vh] w-full object-contain rounded-xl border border-white/10 shadow-2xl"
              />
              <div className="p-3 bg-zinc-950/80 backdrop-blur-md border border-white/10 rounded-xl text-white flex justify-between items-center">
                <div>
                  <h3 className="text-base font-black">{zoomImage.title}</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">Category: {zoomImage.category} • Uploaded: {zoomImage.uploadedAt}</p>
                </div>
                <button
                  onClick={() => {
                    setZoomImage(null);
                    openEditModal(zoomImage);
                  }}
                  className="inline-flex items-center gap-1 rounded-full btn-brand-gradient px-4 py-2 text-xs font-bold"
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit Photo
                </button>
              </div>
            </div>
          </div>
    </ModalPortal>,
          document.body
        )}

      {/* Add / Edit Form Modal */}
      {modalOpen &&
        mounted &&
        createPortal(
          <ModalPortal>
      <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto overscroll-contain bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
            <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-zinc-950 border border-white/10 p-6 shadow-2xl text-white">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <h3 className="text-lg font-black uppercase tracking-wider brand-gradient-text">
                  {editingPhoto ? "Edit Photo Details" : "Upload Official Photo"}
                </h3>
                <button onClick={() => setModalOpen(false)} className="text-zinc-400 hover:text-white transition">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSave} className="mt-5 grid gap-4">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-zinc-300">Photo Title*</label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className={FIELD_CLASS}
                    placeholder="e.g. Closing Address Crowd Shot"
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
                    <label className="mb-1 block text-sm font-semibold text-zinc-300">Media Source</label>
                    <div className="rounded-xl border border-dashed border-white/20 bg-white/5 p-2 text-center text-xs text-zinc-400 cursor-pointer hover:bg-white/10 transition">
                      Drag/Select File
                    </div>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-zinc-300">Simulated / Remote Image URL</label>
                  <input
                    type="text"
                    required
                    value={formImage}
                    onChange={(e) => setFormImage(e.target.value)}
                    className={FIELD_CLASS}
                  />
                </div>

                <div className="flex items-center gap-2 py-2">
                  <input
                    type="checkbox"
                    id="featuredCheck"
                    checked={formFeatured}
                    onChange={(e) => setFormFeatured(e.target.checked)}
                    className="h-4 w-4 rounded border-white/10 bg-zinc-950 text-brand-pink focus:ring-brand-pink"
                  />
                  <label htmlFor="featuredCheck" className="text-xs text-zinc-300 font-semibold cursor-pointer select-none">
                    Feature this photo prominently on the event homepage banner
                  </label>
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
                    Save Photo
                  </button>
                </div>
              </form>
            </div>
          </div>
    </ModalPortal>,
          document.body
        )}
    </div>
  );
}