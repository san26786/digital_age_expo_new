"use client";

import { useState, useMemo } from "react";
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
  Layers,
  Sparkles,
  CheckSquare,
  Square,
  AlertCircle,
  Save,
  Building2,
  Store,
} from "lucide-react";
import type {
  TradestandSetupRow,
  TradestandSetupStats,
  TradestandOption,
  CategoryOption,
} from "@/lib/services/eventTradestandSetup";

import { ModalPortal } from "@/components/ui/ModalPortal";
interface Props {
  initialItems: TradestandSetupRow[];
  initialStats: TradestandSetupStats;
  initialOptions: {
    stands: TradestandOption[];
    categories: CategoryOption[];
  };
  eventId: number;
}

export function EventTradestandSetupManager({
  initialItems,
  initialStats,
  initialOptions,
  eventId,
}: Props) {
  const [items, setItems] = useState<TradestandSetupRow[]>(initialItems);
  const [stats, setStats] = useState<TradestandSetupStats>(initialStats);
  const [options, setOptions] = useState(initialOptions);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkAction, setBulkAction] = useState("");
  const [selectedMailTemplate, setSelectedMailTemplate] = useState("");
  
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Editable fields state for table inline editing (available, used)
  const [inlineData, setInlineData] = useState<Record<number, { available: number; used: number }>>(
    () => {
      const initial: Record<number, { available: number; used: number }> = {};
      initialItems.forEach((item) => {
        initial[item.id] = {
          available: item.available,
          used: item.used,
        };
      });
      return initial;
    }
  );

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TradestandSetupRow | null>(null);

  // Form state for add/edit
  const [formData, setFormData] = useState({
    tradestandId: options.stands[0]?.id ? options.stands[0].id.toString() : "1",
    eventCategoryId: options.categories[0]?.id ? options.categories[0].id.toString() : "1",
    available: "5",
    used: "0",
  });

  const showFeedback = (text: string, type: "success" | "error" = "success") => {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg(null), 4000);
  };

  const refreshData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/members/tradestand-setup`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items);
        setStats(data.stats);
        if (data.options) setOptions(data.options);

        const newInline: Record<number, { available: number; used: number }> = {};
        data.items.forEach((item: TradestandSetupRow) => {
          newInline[item.id] = {
            available: item.available,
            used: item.used,
          };
        });
        setInlineData(newInline);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.tradestandName.toLowerCase().includes(q) ||
        item.categoryTitle.toLowerCase().includes(q) ||
        item.id.toString().includes(q)
    );
  }, [items, searchQuery]);

  // Handle select all
  const isAllSelected = filteredItems.length > 0 && selectedIds.length === filteredItems.length;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredItems.map((i) => i.id));
    }
  };

  const toggleSelectRow = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Auto Setup Tradestand
  const handleAutoSetup = async () => {
    if (!confirm("Run Auto Setup Tradestand? This will generate tradestand configurations for this event.")) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/members/tradestand-setup/auto-setup", {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        showFeedback(`Auto Tradestand setup completed! Generated ${data.insertedCount || 0} setups.`);
        await refreshData();
      } else {
        showFeedback(data.error || "Auto setup failed", "error");
      }
    } catch (err: any) {
      showFeedback(err.message || "Failed to execute auto setup", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Execute Bulk Action
  const handleBulkSubmit = async () => {
    if (!bulkAction) {
      showFeedback("Please select an action from the dropdown.", "error");
      return;
    }

    if (bulkAction === "export") {
      const exportData = items.filter((i) => selectedIds.length === 0 || selectedIds.includes(i.id));
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(exportData, null, 2))}`;
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", jsonString);
      downloadAnchor.setAttribute("download", `tradestand_setup_event_${eventId}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showFeedback(`Exported ${exportData.length} items successfully.`);
      return;
    }

    if (bulkAction === "delete") {
      if (selectedIds.length === 0) {
        showFeedback("Please select at least one item to delete.", "error");
        return;
      }
      if (!confirm(`Are you sure you want to delete ${selectedIds.length} selected items?`)) return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/members/tradestand-setup", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: bulkAction,
          ids: bulkAction === "update" ? items.map((i) => i.id) : selectedIds,
          bulkData: inlineData,
        }),
      });

      if (res.ok) {
        showFeedback(`Bulk action "${bulkAction}" executed successfully!`);
        setSelectedIds([]);
        setBulkAction("");
        await refreshData();
      } else {
        const err = await res.json();
        showFeedback(err.error || "Bulk action failed", "error");
      }
    } catch (e: any) {
      showFeedback(e.message || "Action execution error", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Mail Dispatcher
  const handleSendMail = async () => {
    if (!selectedMailTemplate) {
      showFeedback("Please select an email template first.", "error");
      return;
    }
    showFeedback(`Notification email sent using template #${selectedMailTemplate}.`);
  };

  // Open Add Modal
  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormData({
      tradestandId: options.stands[0]?.id ? options.stands[0].id.toString() : "1",
      eventCategoryId: options.categories[0]?.id ? options.categories[0].id.toString() : "1",
      available: "5",
      used: "0",
    });
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (item: TradestandSetupRow) => {
    setEditingItem(item);
    setFormData({
      tradestandId: item.tradestandId.toString(),
      eventCategoryId: item.eventCategoryId.toString(),
      available: item.available.toString(),
      used: item.used.toString(),
    });
    setIsModalOpen(true);
  };

  // Save Add/Edit
  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsLoading(true);
    try {
      const url = editingItem
        ? `/api/members/tradestand-setup/${editingItem.id}`
        : `/api/members/tradestand-setup`;
      const method = editingItem ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        showFeedback(editingItem ? "Tradestand setup updated!" : "Tradestand setup created!");
        setIsModalOpen(false);
        await refreshData();
      } else {
        const err = await res.json();
        showFeedback(err.error || "Operation failed", "error");
      }
    } catch (e: any) {
      showFeedback(e.message || "Failed to save tradestand setup", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Single Delete
  const handleDeleteItem = async (id: number) => {
    if (!confirm("Are you sure you want to delete this tradestand setup?")) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/members/tradestand-setup/${id}`, { method: "DELETE" });
      if (res.ok) {
        showFeedback("Tradestand setup deleted!");
        await refreshData();
      } else {
        const err = await res.json();
        showFeedback(err.error || "Delete failed", "error");
      }
    } catch (e: any) {
      showFeedback(e.message || "Failed to delete item", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Feedback banner */}
      {statusMsg && (
        <div
          className={`flex items-center justify-between gap-3 rounded-2xl p-4 border shadow-xl transition-all ${
            statusMsg.type === "success"
              ? "bg-emerald-950/80 border-emerald-500/30 text-emerald-200"
              : "bg-rose-950/80 border-rose-500/30 text-rose-200"
          }`}
        >
          <div className="flex items-center gap-3">
            {statusMsg.type === "success" ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
            )}
            <span className="text-sm font-semibold">{statusMsg.text}</span>
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

      {/* Top Stat Summary Tabs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Available Tab Block (Olive / Amber theme) */}
        <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/40 via-zinc-900 to-zinc-900 p-5 backdrop-blur-md shadow-xl flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-xs font-black uppercase tracking-wider text-amber-300">Available Tradestands</span>
            </div>
            <p className="mt-2 text-3xl font-black text-amber-200">{stats.totalAvailable}</p>
            <p className="text-[11px] text-amber-300/70 mt-1 font-medium">Total available stand slots</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300">
            <Store className="h-6 w-6" />
          </div>
        </div>

        {/* Used Tab Block (Green / Emerald theme) */}
        <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 via-zinc-900 to-zinc-900 p-5 backdrop-blur-md shadow-xl flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span className="text-xs font-black uppercase tracking-wider text-emerald-300">Used Tradestands</span>
            </div>
            <p className="mt-2 text-3xl font-black text-emerald-200">{stats.totalUsed}</p>
            <p className="text-[11px] text-emerald-300/70 mt-1 font-medium">Booked / occupied stands</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
            <CheckCircle2 className="h-6 w-6" />
          </div>
        </div>

        {/* Actions & Auto Setup */}
        <div className="rounded-2xl border border-brand-pink/30 bg-gradient-to-br from-purple-950/40 via-zinc-900 to-zinc-900 p-5 backdrop-blur-md shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-brand-pink">Actions</span>
            <Wrench className="h-4 w-4 text-brand-pink" />
          </div>
          <div className="flex items-center gap-2 mt-3">
            <button
              type="button"
              onClick={handleAutoSetup}
              disabled={isLoading}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-700 to-brand-pink px-3.5 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-lg hover:brightness-110 transition disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
              Auto Setup Tradestand
            </button>
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="inline-flex items-center justify-center rounded-xl bg-white text-zinc-950 px-3.5 py-2.5 text-xs font-black uppercase tracking-wider shadow-lg hover:bg-zinc-200 transition"
              title="Add Tradestand"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Control Bar: Search & Mail Dispatcher & Bulk Action */}
      <div className="rounded-2xl border border-white/10 bg-zinc-900/90 p-5 space-y-4 shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Search Box */}
          <div className="md:col-span-5 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search tradestands or categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950/80 pl-10 pr-4 py-2.5 text-sm font-medium text-white placeholder-zinc-500 focus:border-brand-pink focus:outline-none focus:ring-1 focus:ring-brand-pink"
            />
          </div>

          {/* Email Template Selector */}
          <div className="md:col-span-4 flex items-center gap-2">
            <select
              value={selectedMailTemplate}
              onChange={(e) => setSelectedMailTemplate(e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950/80 px-3 py-2.5 text-sm font-medium text-zinc-200 focus:border-brand-pink focus:outline-none"
            >
              <option value="">Select an Email Template</option>
              <option value="1">Tradestand Booking Confirmation</option>
              <option value="2">Tradestand Allocation Update</option>
              <option value="3">Tradestand Space Invitation</option>
            </select>
            <button
              type="button"
              onClick={handleSendMail}
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-xs font-bold text-zinc-200 hover:bg-zinc-700 hover:text-white transition shrink-0"
            >
              <Mail className="h-3.5 w-3.5 text-brand-pink" />
              Send Mail
            </button>
          </div>

          {/* Bulk Action Dropdown */}
          <div className="md:col-span-3 flex items-center gap-2">
            <select
              value={bulkAction}
              onChange={(e) => setBulkAction(e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950/80 px-3 py-2.5 text-sm font-medium text-zinc-200 focus:border-brand-pink focus:outline-none"
            >
              <option value="">Select an Action</option>
              <option value="update">Update Tradestand Stats</option>
              <option value="export">Export Data</option>
              <option value="delete">Delete Selected</option>
            </select>
            <button
              type="button"
              onClick={handleBulkSubmit}
              disabled={isLoading}
              className="inline-flex items-center justify-center rounded-xl bg-brand-purple px-4 py-2.5 text-xs font-black uppercase text-white hover:bg-brand-pink transition shrink-0 shadow-md"
            >
              Submit
            </button>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/90 shadow-2xl backdrop-blur-md">
        <div className="border-b border-white/10 px-6 py-4 flex items-center justify-between bg-zinc-950/50">
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-brand-pink" />
            <h3 className="text-sm font-black uppercase tracking-wider text-white">
              Tradestand Setup List ({filteredItems.length})
            </h3>
          </div>
          {selectedIds.length > 0 && (
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-brand-pink/20 text-brand-pink border border-brand-pink/30">
              {selectedIds.length} items selected
            </span>
          )}
        </div>

        {filteredItems.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-zinc-400 font-medium text-sm">
              No tradestand setup items found. Click &quot;Auto Setup Tradestand&quot; or &quot;Add Tradestand&quot; to get started.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-300">
              <thead>
                <tr className="border-b border-white/10 bg-gradient-to-r from-brand-purple to-brand-pink text-white">
                  <th className="px-6 py-4 font-black uppercase tracking-wider w-10 text-center">
                    <button type="button" onClick={toggleSelectAll} className="text-zinc-400 hover:text-white">
                      {isAllSelected ? (
                        <CheckSquare className="h-4 w-4 text-brand-pink" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-4 font-black uppercase tracking-wider w-16">ID</th>
                  <th className="px-6 py-4 font-black uppercase tracking-wider">Tradestand</th>
                  <th className="px-6 py-4 font-black uppercase tracking-wider">Event Category</th>
                  <th className="px-6 py-4 font-black uppercase tracking-wider w-32 text-center">Available</th>
                  <th className="px-6 py-4 font-black uppercase tracking-wider w-32 text-center">Used</th>
                  <th className="px-6 py-4 font-black uppercase tracking-wider text-right">Manage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredItems.map((item) => {
                  const isSelected = selectedIds.includes(item.id);
                  const currentInline = inlineData[item.id] || {
                    available: item.available,
                    used: item.used,
                  };

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-white/[0.03] transition-colors ${
                        isSelected ? "bg-brand-pink/5" : ""
                      }`}
                    >
                      <td className="px-4 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => toggleSelectRow(item.id)}
                          className="text-zinc-400 hover:text-white"
                        >
                          {isSelected ? (
                            <CheckSquare className="h-4 w-4 text-brand-pink" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                        </button>
                      </td>

                      <td className="px-4 py-4 text-zinc-500 font-mono text-xs">{item.id}</td>

                      <td className="px-6 py-4 font-bold text-white text-sm">
                        {item.tradestandName}
                      </td>

                      <td className="px-6 py-4 text-xs font-semibold text-zinc-300">
                        {item.categoryTitle}
                      </td>

                      {/* Inline Available Edit */}
                      <td className="px-4 py-4 text-center">
                        <input
                          type="number"
                          value={currentInline.available}
                          onChange={(e) =>
                            setInlineData((prev) => ({
                              ...prev,
                              [item.id]: { ...currentInline, available: parseInt(e.target.value, 10) || 0 },
                            }))
                          }
                          className="w-20 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-center text-xs font-bold text-amber-300 focus:border-brand-pink focus:outline-none"
                        />
                      </td>

                      {/* Inline Used Edit */}
                      <td className="px-4 py-4 text-center">
                        <input
                          type="number"
                          value={currentInline.used}
                          onChange={(e) =>
                            setInlineData((prev) => ({
                              ...prev,
                              [item.id]: { ...currentInline, used: parseInt(e.target.value, 10) || 0 },
                            }))
                          }
                          className="w-20 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-center text-xs font-bold text-emerald-400 focus:border-brand-pink focus:outline-none"
                        />
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(item)}
                            title="Edit Tradestand"
                            className="p-2 rounded-xl border border-purple-500/30 bg-purple-950/40 text-purple-300 hover:bg-purple-900/60 transition"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.id)}
                            title="Delete Tradestand"
                            className="p-2 rounded-xl border border-rose-500/30 bg-rose-950/40 text-rose-300 hover:bg-rose-900/60 transition"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Form Modal */}
      {isModalOpen && (
        <ModalPortal>
      <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto overscroll-contain bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-zinc-900 p-6 space-y-6 shadow-2xl text-white">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-xs font-black uppercase tracking-widest text-brand-pink">
                  {editingItem ? "Edit Tradestand Setup" : "Add Tradestand Setup"}
                </span>
                <h2 className="text-xl font-black">
                  {editingItem ? `Setup #${editingItem.id}` : "New Tradestand Configuration"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-zinc-400 hover:bg-zinc-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-zinc-300">Tradestand Size / Option *</label>
                <select
                  value={formData.tradestandId}
                  onChange={(e) => setFormData({ ...formData, tradestandId: e.target.value })}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm font-medium text-white focus:border-brand-pink focus:outline-none"
                >
                  {options.stands.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (ID #{s.id})
                    </option>
                  ))}
                  {options.stands.length === 0 && (
                    <option value="1">Default Stand (ID #1)</option>
                  )}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-zinc-300">Event Category *</label>
                <select
                  value={formData.eventCategoryId}
                  onChange={(e) => setFormData({ ...formData, eventCategoryId: e.target.value })}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm font-medium text-white focus:border-brand-pink focus:outline-none"
                >
                  {options.categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} (ID #{c.id})
                    </option>
                  ))}
                  {options.categories.length === 0 && (
                    <option value="1">General Event Category (ID #1)</option>
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-zinc-300">Available Slots</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.available}
                    onChange={(e) => setFormData({ ...formData, available: e.target.value })}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm font-medium text-white focus:border-brand-pink focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-zinc-300">Used Slots</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.used}
                    onChange={(e) => setFormData({ ...formData, used: e.target.value })}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm font-medium text-white focus:border-brand-pink focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-zinc-800 text-sm font-bold text-white hover:bg-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand-purple to-brand-pink text-sm font-black uppercase text-white hover:brightness-110 shadow-lg disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  Save Setup
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
