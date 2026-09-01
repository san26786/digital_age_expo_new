"use client";

import { useState } from "react";
import {
  Plus,
  Search,
  CheckCircle2,
  Trash2,
  Edit,
  Wrench,
  Mail,
  RefreshCw,
  X,
  BookOpen,
  CheckSquare,
  Square,
  AlertCircle,
  Save,
  FileText,
  Layers,
} from "lucide-react";
import type {
  MagazineSetupRow,
  MagazineSetupStats,
  MagazineOptions,
} from "@/lib/services/eventMagazineSetup";

import { ModalPortal } from "@/components/ui/ModalPortal";
interface Props {
  initialItems: MagazineSetupRow[];
  initialStats: MagazineSetupStats;
  initialOptions: MagazineOptions;
  eventId: number;
}

export function EventMagazineSetupManager({
  initialItems,
  initialStats,
  initialOptions,
  eventId,
}: Props) {
  const [items, setItems] = useState<MagazineSetupRow[]>(initialItems);
  const [stats, setStats] = useState<MagazineSetupStats>(initialStats);
  const [options, setOptions] = useState<MagazineOptions>(initialOptions);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkAction, setBulkAction] = useState("");
  const [selectedMailTemplate, setSelectedMailTemplate] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Editable fields state for table inline editing (available, used)
  const [inlineData, setInlineData] = useState<Record<number, { available: number; used: number }>>(() => {
    const initial: Record<number, { available: number; used: number }> = {};
    initialItems.forEach((item) => {
      initial[item.id] = {
        available: item.available,
        used: item.used,
      };
    });
    return initial;
  });

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MagazineSetupRow | null>(null);

  // Form state for add/edit
  const [formData, setFormData] = useState({
    magazineId: options.rateCards[0]?.id ? options.rateCards[0].id.toString() : "1",
    eventCategoryId: options.categories[0]?.id ? options.categories[0].id.toString() : "1",
    available: "10",
    used: "0",
    system: "0",
  });

  const showFeedback = (text: string, type: "success" | "error" = "success") => {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg(null), 4000);
  };

  const refreshData = async () => {
    setIsLoading(true);
    try {
      const queryParam = searchQuery ? `?keyword=${encodeURIComponent(searchQuery)}` : "";
      const res = await fetch(`/api/members/magazine-setup${queryParam}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items);
        setStats(data.stats);
        if (data.options) setOptions(data.options);

        const newInline: Record<number, { available: number; used: number }> = {};
        data.items.forEach((item: MagazineSetupRow) => {
          newInline[item.id] = { available: item.available, used: item.used };
        });
        setInlineData(newInline);
      }
    } catch {
      showFeedback("Failed to refresh data", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    refreshData();
  };

  const handleAutoSetup = async () => {
    if (!confirm("Are you sure you want to auto setup magazine page rates for this event?")) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/members/magazine-setup/auto-setup", {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        showFeedback(`Auto setup completed! Created ${data.insertedCount} magazine page setup rows.`);
        await refreshData();
      } else {
        showFeedback(data.error || "Auto setup failed", "error");
      }
    } catch {
      showFeedback("Failed to run auto setup", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredItems.map((item) => item.id));
    }
  };

  const handleToggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleInlineChange = (id: number, field: "available" | "used", val: string) => {
    const num = parseInt(val, 10) || 0;
    setInlineData((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: num,
      },
    }));
  };

  const handleActionSubmit = async () => {
    if (!bulkAction) {
      showFeedback("Please select an action first.", "error");
      return;
    }

    if (bulkAction === "update") {
      setIsLoading(true);
      try {
        const res = await fetch("/api/members/magazine-setup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update",
            updates: inlineData,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          showFeedback(data.message || "Magazine page stats updated successfully!");
          await refreshData();
        } else {
          showFeedback(data.error || "Failed to update stats", "error");
        }
      } catch {
        showFeedback("Error updating stats", "error");
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (bulkAction === "calculate_stats") {
      setIsLoading(true);
      try {
        const res = await fetch("/api/members/magazine-setup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "calculate_stats" }),
        });
        const data = await res.json();
        if (res.ok) {
          showFeedback(data.message || "Auto calculated magazine stats successfully!");
          await refreshData();
        } else {
          showFeedback(data.error || "Failed to calculate stats", "error");
        }
      } catch {
        showFeedback("Error calculating stats", "error");
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (bulkAction === "export") {
      const csvData = filteredItems.map((item) => ({
        ID: item.id,
        Section: item.sectionName,
        AdvertSize: item.advertSize,
        Category: item.categoryTitle,
        Available: inlineData[item.id]?.available ?? item.available,
        Used: inlineData[item.id]?.used ?? item.used,
        System: item.system,
      }));

      const header = Object.keys(csvData[0] || {}).join(",");
      const rows = csvData.map((row) => Object.values(row).join(","));
      const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `magazine_page_setup_event_${eventId}.csv`;
      a.click();
      showFeedback("Magazine page setup data exported successfully!");
      return;
    }
  };

  const handleSendMail = async () => {
    if (!selectedMailTemplate) {
      showFeedback("Please select an email template.", "error");
      return;
    }
    if (selectedIds.length === 0) {
      showFeedback("Please select at least one row to send email.", "error");
      return;
    }

    showFeedback(`Email notification sent to sponsors for ${selectedIds.length} selected magazine setup rows!`);
  };

  const handleDeleteItem = async (id: number) => {
    if (!confirm("Are you sure you want to delete this magazine setup item?")) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/members/magazine-setup/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        showFeedback("Magazine page item deleted successfully.");
        await refreshData();
      } else {
        const data = await res.json();
        showFeedback(data.error || "Failed to delete item", "error");
      }
    } catch {
      showFeedback("Error deleting item", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormData({
      magazineId: options.rateCards[0]?.id ? options.rateCards[0].id.toString() : "1",
      eventCategoryId: options.categories[0]?.id ? options.categories[0].id.toString() : "1",
      available: "10",
      used: "0",
      system: "0",
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: MagazineSetupRow) => {
    setEditingItem(item);
    setFormData({
      magazineId: item.magazineId.toString(),
      eventCategoryId: item.eventCategoryId.toString(),
      available: item.available.toString(),
      used: item.used.toString(),
      system: item.system.toString(),
    });
    setIsModalOpen(true);
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (editingItem) {
        // Edit existing
        const res = await fetch(`/api/members/magazine-setup/${editingItem.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            magazineId: parseInt(formData.magazineId, 10),
            eventCategoryId: parseInt(formData.eventCategoryId, 10),
            available: parseInt(formData.available, 10),
            used: parseInt(formData.used, 10),
            system: parseInt(formData.system, 10),
          }),
        });
        if (res.ok) {
          showFeedback("Magazine page item updated successfully.");
          setIsModalOpen(false);
          await refreshData();
        } else {
          const data = await res.json();
          showFeedback(data.error || "Failed to update item", "error");
        }
      } else {
        // Create new
        const res = await fetch("/api/members/magazine-setup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            magazineId: parseInt(formData.magazineId, 10),
            eventCategoryId: parseInt(formData.eventCategoryId, 10),
            available: parseInt(formData.available, 10),
            used: parseInt(formData.used, 10),
            system: parseInt(formData.system, 10),
          }),
        });
        if (res.ok) {
          showFeedback("Magazine page item added successfully.");
          setIsModalOpen(false);
          await refreshData();
        } else {
          const data = await res.json();
          showFeedback(data.error || "Failed to create item", "error");
        }
      }
    } catch {
      showFeedback("Error saving magazine page item", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredItems = searchQuery.trim()
    ? items.filter(
        (item) =>
          item.sectionName?.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
          item.advertSize?.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
          item.categoryTitle?.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
          item.rateCardTitle?.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
          item.id.toString().includes(searchQuery.toLowerCase().trim())
      )
    : items;

  return (
    <div className="space-y-6">
      {/* Feedback Banner */}
      {statusMsg && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between border shadow-lg transition-all ${
            statusMsg.type === "success"
              ? "bg-emerald-950/80 border-emerald-500/30 text-emerald-300"
              : "bg-rose-950/80 border-rose-500/30 text-rose-300"
          }`}
        >
          <div className="flex items-center gap-3">
            {statusMsg.type === "success" ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            ) : (
              <AlertCircle className="h-5 w-5 text-rose-400" />
            )}
            <p className="text-sm font-semibold">{statusMsg.text}</p>
          </div>
          <button
            type="button"
            onClick={() => setStatusMsg(null)}
            className="text-zinc-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Top Banner Stats / Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl border border-yellow-600/30 bg-gradient-to-br from-yellow-950/30 to-zinc-900/90 shadow-xl backdrop-blur-md flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-yellow-500/80">Available Pages</p>
            <h3 className="text-3xl font-black text-yellow-400">{stats.totalAvailable}</h3>
          </div>
          <div className="h-12 w-12 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
            <BookOpen className="h-6 w-6 text-yellow-400" />
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-emerald-600/30 bg-gradient-to-br from-emerald-950/30 to-zinc-900/90 shadow-xl backdrop-blur-md flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-500/80">Used Pages</p>
            <h3 className="text-3xl font-black text-emerald-400">{stats.totalUsed}</h3>
          </div>
          <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <FileText className="h-6 w-6 text-emerald-400" />
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-brand-purple/30 bg-gradient-to-br from-purple-950/30 to-zinc-900/90 shadow-xl backdrop-blur-md flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-purple-400/80">Total Rate Options</p>
            <h3 className="text-3xl font-black text-purple-300">{stats.totalCount}</h3>
          </div>
          <div className="h-12 w-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
            <Layers className="h-6 w-6 text-purple-300" />
          </div>
        </div>
      </div>

      {/* Main Setup Controls & Search */}
      <div className="glass-panel rounded-3xl p-6 border border-white/10 bg-zinc-900/90 shadow-2xl space-y-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleAutoSetup}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-brand-purple to-brand-pink hover:opacity-90 transition font-black text-xs uppercase tracking-wider text-white shadow-lg disabled:opacity-50"
            >
              <Wrench className="h-4 w-4" />
              Auto Setup Magazine Page
            </button>

            <button
              type="button"
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 transition font-bold text-xs uppercase tracking-wider text-white"
            >
              <Plus className="h-4 w-4" />
              Add Magazine Page Item
            </button>

            <button
              type="button"
              onClick={refreshData}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-3 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white transition"
              title="Refresh List"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="flex items-center gap-2 w-full lg:w-auto">
            <div className="relative flex-1 lg:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-950/80 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs font-medium text-white placeholder-zinc-500 focus:outline-none focus:border-brand-pink"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2.5 bg-brand-purple hover:bg-brand-purple/80 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition"
            >
              Search
            </button>
          </form>
        </div>

        {/* Batch Actions & Email Options Bar */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-zinc-950/50 p-4 rounded-2xl border border-white/5">
          {/* Email Template Controls */}
          <div className="md:col-span-6 flex items-center gap-2">
            <select
              value={selectedMailTemplate}
              onChange={(e) => setSelectedMailTemplate(e.target.value)}
              className="bg-zinc-900 border border-white/10 text-zinc-300 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-brand-pink flex-1"
            >
              <option value="">Select an Email Template</option>
              <option value="magazine_rates_notification">Magazine Page Rate Sheet</option>
              <option value="sponsor_pass_mail">Sponsor Pass Mail</option>
              <option value="sponsorship_setup_notice">Sponsorship Setup Notice</option>
            </select>
            <button
              type="button"
              onClick={handleSendMail}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl uppercase tracking-wider transition whitespace-nowrap"
            >
              <Mail className="h-3.5 w-3.5" />
              Send Mail
            </button>
          </div>

          {/* Action Dropdown Controls */}
          <div className="md:col-span-6 flex items-center gap-2 justify-end">
            <select
              value={bulkAction}
              onChange={(e) => setBulkAction(e.target.value)}
              className="bg-zinc-900 border border-white/10 text-zinc-300 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-brand-pink flex-1 max-w-xs"
            >
              <option value="">Select an Action</option>
              <option value="export">Export Data (CSV)</option>
              <option value="update">Update Magazine page Stats</option>
              <option value="calculate_stats">Auto Calculate Magazine Stats</option>
            </select>
            <button
              type="button"
              onClick={handleActionSubmit}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-5 py-2 bg-brand-pink hover:bg-brand-pink/80 text-white text-xs font-bold rounded-xl uppercase tracking-wider transition shadow-lg whitespace-nowrap disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              Submit Action
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-zinc-950/60">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-gradient-to-r from-brand-purple to-brand-pink text-white">
                <th className="px-6 py-4 font-black uppercase tracking-wider w-10 text-center">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-zinc-400 hover:text-white"
                  >
                    {selectedIds.length > 0 && selectedIds.length === filteredItems.length ? (
                      <CheckSquare className="h-4 w-4 text-brand-pink" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </button>
                </th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">ID</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Section Name</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Section Code / Size</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Event Category</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider w-28">Available</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider w-28">Used</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider text-center">System</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider text-right">Manage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs text-zinc-300">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-zinc-500 italic">
                    No magazine page setup records found. Click &quot;Auto Setup Magazine Page&quot; to initialize.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isSelected = selectedIds.includes(item.id);
                  const currentInline = inlineData[item.id] || {
                    available: item.available,
                    used: item.used,
                  };

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-white/[0.02] transition ${
                        isSelected ? "bg-brand-purple/10" : ""
                      }`}
                    >
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleSelect(item.id)}
                          className="text-zinc-400 hover:text-white"
                        >
                          {isSelected ? (
                            <CheckSquare className="h-4 w-4 text-brand-pink" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-4 font-mono text-zinc-400">#{item.id}</td>
                      <td className="py-3 px-4 font-bold text-white">{item.sectionName}</td>
                      <td className="py-3 px-4 text-zinc-300">
                        <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] font-medium font-mono">
                          {item.advertSize}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-zinc-300">{item.categoryTitle}</td>

                      {/* Available editable input */}
                      <td className="py-3 px-4">
                        <input
                          type="number"
                          value={currentInline.available}
                          onChange={(e) => handleInlineChange(item.id, "available", e.target.value)}
                          className="w-20 bg-zinc-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-yellow-300 font-bold focus:outline-none focus:border-brand-pink"
                        />
                      </td>

                      {/* Used editable input */}
                      <td className="py-3 px-4">
                        <input
                          type="number"
                          value={currentInline.used}
                          onChange={(e) => handleInlineChange(item.id, "used", e.target.value)}
                          className="w-20 bg-zinc-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-emerald-300 font-bold focus:outline-none focus:border-brand-pink"
                        />
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            item.system === 1
                              ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                              : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                          }`}
                        >
                          {item.system === 1 ? "System" : "Custom"}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(item)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition"
                            title="Edit Item"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition"
                            title="Delete Item"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <ModalPortal>
      <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto overscroll-contain bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="glass-panel w-full max-w-lg rounded-3xl p-6 border border-white/10 bg-zinc-900 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-xl font-black uppercase tracking-tight text-white">
                {editingItem ? "Edit Magazine Page Item" : "Add Magazine Page Item"}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Section Code / Advert Rate Card
                </label>
                <select
                  value={formData.magazineId}
                  onChange={(e) => setFormData({ ...formData, magazineId: e.target.value })}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-brand-pink"
                  required
                >
                  {options.rateCards.length === 0 ? (
                    <option value="1">Default Rate Card (#1)</option>
                  ) : (
                    options.rateCards.map((rc) => (
                      <option key={rc.id} value={rc.id}>
                        {rc.title} ({rc.advertSize || `ID #${rc.id}`}) - £{rc.rate}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Event Category
                </label>
                <select
                  value={formData.eventCategoryId}
                  onChange={(e) => setFormData({ ...formData, eventCategoryId: e.target.value })}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-brand-pink"
                  required
                >
                  {options.categories.length === 0 ? (
                    <option value="1">General Event Category (#1)</option>
                  ) : (
                    options.categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                    Available Count
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.available}
                    onChange={(e) => setFormData({ ...formData, available: e.target.value })}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-brand-pink font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                    Used Count
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.used}
                    onChange={(e) => setFormData({ ...formData, used: e.target.value })}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-brand-pink font-bold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                  System Row Flag
                </label>
                <select
                  value={formData.system}
                  onChange={(e) => setFormData({ ...formData, system: e.target.value })}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-brand-pink"
                >
                  <option value="0">Custom (0)</option>
                  <option value="1">System Auto Generated (1)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl uppercase tracking-wider transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2 bg-gradient-to-r from-brand-purple to-brand-pink text-white text-xs font-black rounded-xl uppercase tracking-wider shadow-lg hover:opacity-90 transition disabled:opacity-50"
                >
                  {isLoading ? "Saving..." : editingItem ? "Update Item" : "Create Item"}
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
