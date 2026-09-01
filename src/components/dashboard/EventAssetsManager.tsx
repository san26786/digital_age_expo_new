"use client";

import React, { useState } from "react";
import {
  FolderKanban,
  Plus,
  RefreshCw,
  Download,
  Trash2,
  Edit,
  ExternalLink,
  Search,
  CheckCircle2,
  X,
  FileText,
  Image as ImageIcon,
  Video,
  Briefcase,
  Megaphone,
} from "lucide-react";
import type { EventAssetItem } from "@/lib/services/eventAssets";

import { ModalPortal } from "@/components/ui/ModalPortal";
interface EventAssetsManagerProps {
  eventId: number;
  assets: EventAssetItem[];
  isOrganiser: boolean;
}

export function EventAssetsManager({ eventId, assets: initialAssets, isOrganiser }: EventAssetsManagerProps) {
  const [assets, setAssets] = useState<EventAssetItem[]>(initialAssets);
  const [keyword, setKeyword] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<EventAssetItem | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [assetType, setAssetType] = useState("logo");
  const [externalLink, setExternalLink] = useState("");

  const filteredAssets = assets.filter((item) => {
    const matchKeyword =
      !keyword ||
      item.title?.toLowerCase().includes(keyword.toLowerCase()) ||
      item.businessName?.toLowerCase().includes(keyword.toLowerCase()) ||
      item.assetType?.toLowerCase().includes(keyword.toLowerCase());

    const matchType = !typeFilter || item.assetType?.toLowerCase() === typeFilter.toLowerCase();

    return matchKeyword && matchType;
  });

  const handleOpenAdd = () => {
    setEditingAsset(null);
    setTitle("");
    setAssetType("logo");
    setExternalLink("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: EventAssetItem) => {
    setEditingAsset(item);
    setTitle(item.title || "");
    setAssetType(item.assetType || "logo");
    setExternalLink(item.externalLink || "");
    setIsModalOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this asset?")) {
      setAssets(assets.filter((a) => a.id !== id));
    }
  };

  const handleReset = () => {
    if (confirm("Are you sure you want to reset exhibitor assets?")) {
      alert("Exhibitor assets reset successfully!");
    }
  };

  const handleImport = () => {
    alert("Default exhibitor assets imported successfully!");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingAsset) {
      setAssets(
        assets.map((a) =>
          a.id === editingAsset.id
            ? { ...a, title, assetType, externalLink }
            : a
        )
      );
      alert("Asset updated successfully!");
    } else {
      const newAsset: EventAssetItem = {
        id: Date.now(),
        layoutId: 1,
        title,
        assetType,
        assetUrl: null,
        assetAttachment: null,
        externalLink,
        businessName: "Current User (My Business)",
        isExhibitorAsset: true,
        isDefault: false,
        eventId,
        exhibitorUserId: 1,
      };
      setAssets([newAsset, ...assets]);
      alert("Asset added successfully!");
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-fade-in text-white">
      {/* Action Toolbar */}
      <div className="glass-panel rounded-2xl p-6 border border-white/10 shadow-2xl space-y-4">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto flex-1">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Search assets by title, business, type..."
                className="w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-brand-pink focus:outline-none transition"
              />
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-xs text-white focus:border-brand-pink focus:outline-none transition"
            >
              <option value="" className="bg-zinc-900 text-white">All Asset Types</option>
              <option value="logo" className="bg-zinc-900 text-white">Logo</option>
              <option value="image" className="bg-zinc-900 text-white">Image</option>
              <option value="video" className="bg-zinc-900 text-white">Video</option>
              <option value="brochure" className="bg-zinc-900 text-white">Brochure</option>
              <option value="briefcase" className="bg-zinc-900 text-white">Briefcase</option>
              <option value="meeting" className="bg-zinc-900 text-white">Meeting</option>
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
            <button
              type="button"
              onClick={handleReset}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-zinc-300 hover:bg-white/10 hover:text-white transition flex items-center gap-2"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Reset
            </button>
            <button
              type="button"
              onClick={handleImport}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-zinc-300 hover:bg-white/10 hover:text-white transition flex items-center gap-2"
            >
              <Download className="h-3.5 w-3.5" /> Import / Sync
            </button>
            <button
              type="button"
              onClick={handleOpenAdd}
              className="btn-sophisticated rounded-xl px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-lg flex items-center gap-2"
            >
              <Plus className="h-4 w-4" /> Add Asset
            </button>
          </div>
        </div>
      </div>

      {/* Assets Table */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-200">
            <thead>
              <tr className="border-b border-white/10 bg-gradient-to-r from-brand-purple to-brand-pink text-white">
                <th className="px-6 py-4 font-black uppercase tracking-wider w-16">ID</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Business</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Title</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Asset Type</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider text-right">Manage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-zinc-400 italic font-medium">
                    No lobby assets found for Event #{eventId}. Click "Add Asset" or "Import / Sync" to get started.
                  </td>
                </tr>
              ) : (
                filteredAssets.map((item) => (
                  <tr key={item.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-fuchsia-300">#{item.id}</td>
                    <td className="px-6 py-4 font-semibold text-white">{item.businessName}</td>
                    <td className="px-6 py-4 font-bold text-zinc-200">{item.title || "Untitled Asset"}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30">
                        {item.assetType || "general"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(item)}
                          title="Edit Asset"
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 border border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white transition"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          title="Delete Asset"
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:bg-rose-500 hover:text-white transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <ModalPortal>
      <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto overscroll-contain bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="glass-panel w-full max-w-lg rounded-3xl border border-white/20 p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-purple to-brand-pink">
                  <FolderKanban className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase tracking-tight text-white">
                    {editingAsset ? "Edit Lobby Asset" : "Add New Lobby Asset"}
                  </h3>
                  <p className="text-xs text-zinc-400">Configure media, brochures, or booth branding for Event #{eventId}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-fuchsia-300 mb-2">Asset Type</label>
                <select
                  value={assetType}
                  onChange={(e) => setAssetType(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-xs text-white focus:border-brand-pink focus:outline-none"
                >
                  <option value="logo">Logo</option>
                  <option value="image">Image</option>
                  <option value="video">Video</option>
                  <option value="brochure">Brochure</option>
                  <option value="offers_and_competition">Offers & Competition</option>
                  <option value="briefcase">Briefcase</option>
                  <option value="meeting">Meeting</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-fuchsia-300 mb-2">Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Main Exhibition Banner"
                  className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-xs text-white focus:border-brand-pink focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-fuchsia-300 mb-2">External Link / URL</label>
                <input
                  type="url"
                  value={externalLink}
                  onChange={(e) => setExternalLink(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-xs text-white focus:border-brand-pink focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-zinc-300 hover:bg-white/10 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-sophisticated rounded-xl px-6 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-lg"
                >
                  {editingAsset ? "Save Changes" : "Create Asset"}
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
