"use client";

import { useState, useMemo } from "react";
import {
  Plus,
  Search,
  CheckCircle2,
  Trash2,
  Edit,
  Eye,
  Wrench,
  Download,
  Mail,
  RefreshCw,
  X,
  Layers,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  Save,
  CheckSquare,
  Square,
  DollarSign,
  Calendar,
  AlertCircle,
} from "lucide-react";
import type { SponsorshipSetupRow, SponsorshipSetupStats } from "@/lib/services/eventSponsorshipSetup";

import { ModalPortal } from "@/components/ui/ModalPortal";
interface Props {
  initialItems: SponsorshipSetupRow[];
  initialStats: SponsorshipSetupStats;
  eventId: number;
}

export function EventSponsorshipSetupManager({ initialItems, initialStats, eventId }: Props) {
  const [items, setItems] = useState<SponsorshipSetupRow[]>(initialItems);
  const [stats, setStats] = useState<SponsorshipSetupStats>(initialStats);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkAction, setBulkAction] = useState("");
  const [selectedMailTemplate, setSelectedMailTemplate] = useState("");
  
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Editable fields state for table inline editing (available, used, displayOrder)
  const [inlineData, setInlineData] = useState<Record<number, { available: number; used: number; displayOrder: number }>>(
    () => {
      const initial: Record<number, { available: number; used: number; displayOrder: number }> = {};
      initialItems.forEach((item) => {
        initial[item.id] = {
          available: item.available,
          used: item.used,
          displayOrder: item.displayOrder,
        };
      });
      return initial;
    }
  );

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SponsorshipSetupRow | null>(null);
  const [detailItem, setDetailItem] = useState<SponsorshipSetupRow | null>(null);

  // Form state for add/edit
  const [formData, setFormData] = useState({
    title: "",
    shortDescription: "",
    description: "",
    beforeEventBenefits: "",
    duringEventBenefits: "",
    afterEventBenefits: "",
    available: "5",
    used: "0",
    price: "0",
    applyEarlyBird: false,
    earlyBirdDiscount: "",
    earlyBirdExpiry: "",
    registeredMemberDiscount: false,
    soldOut: false,
    showBenefits: true,
    displayOrder: "1",
    active: true,
    banner1: "",
    banner2: "",
    eventCategoryId: "1",
  });

  const showFeedback = (text: string, type: "success" | "error" = "success") => {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg(null), 4000);
  };

  const refreshData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/members/sponsorship-setup?event_id=${eventId}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items);
        setStats(data.stats);
        
        const newInline: Record<number, { available: number; used: number; displayOrder: number }> = {};
        data.items.forEach((item: SponsorshipSetupRow) => {
          newInline[item.id] = {
            available: item.available,
            used: item.used,
            displayOrder: item.displayOrder,
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
        item.title.toLowerCase().includes(q) ||
        (item.categoryTitle && item.categoryTitle.toLowerCase().includes(q)) ||
        (item.shortDescription && item.shortDescription.toLowerCase().includes(q))
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

  // Auto Setup Sponsorship
  const handleAutoSetup = async () => {
    if (!confirm("Run Auto Setup? This will populate sponsorship categories from master templates.")) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/members/sponsorship-setup/auto-setup?event_id=${eventId}`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        showFeedback(`Auto setup completed! Added ${data.insertedCount || 0} sponsorship tiers.`);
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
    if (selectedIds.length === 0 && bulkAction !== "update") {
      showFeedback("Please select at least one item to perform this action.", "error");
      return;
    }

    if (bulkAction === "export") {
      const exportData = items.filter((i) => selectedIds.length === 0 || selectedIds.includes(i.id));
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(exportData, null, 2))}`;
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", jsonString);
      downloadAnchor.setAttribute("download", `sponsorship_setup_event_${eventId}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showFeedback(`Exported ${exportData.length} items successfully.`);
      return;
    }

    if (bulkAction === "delete") {
      if (!confirm(`Are you sure you want to delete ${selectedIds.length} selected items?`)) return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/members/sponsorship-setup?event_id=${eventId}`, {
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
    if (selectedIds.length === 0) {
      showFeedback("Please select at least one sponsorship tier to send mail.", "error");
      return;
    }
    showFeedback(`Mail template notification queued for ${selectedIds.length} items.`);
  };

  // Open Add Modal
  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormData({
      title: "",
      shortDescription: "",
      description: "",
      beforeEventBenefits: "",
      duringEventBenefits: "",
      afterEventBenefits: "",
      available: "5",
      used: "0",
      price: "0",
      applyEarlyBird: false,
      earlyBirdDiscount: "",
      earlyBirdExpiry: "",
      registeredMemberDiscount: false,
      soldOut: false,
      showBenefits: true,
      displayOrder: (items.length + 1).toString(),
      active: true,
      banner1: "",
      banner2: "",
      eventCategoryId: "1",
    });
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (item: SponsorshipSetupRow) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      shortDescription: item.shortDescription || "",
      description: item.description || "",
      beforeEventBenefits: item.beforeEventBenefits || "",
      duringEventBenefits: item.duringEventBenefits || "",
      afterEventBenefits: item.afterEventBenefits || "",
      available: item.available.toString(),
      used: item.used.toString(),
      price: item.price.toString(),
      applyEarlyBird: item.applyEarlyBird,
      earlyBirdDiscount: item.earlyBirdDiscount?.toString() || "",
      earlyBirdExpiry: item.earlyBirdExpiry || "",
      registeredMemberDiscount: item.registeredMemberDiscount,
      soldOut: item.soldOut,
      showBenefits: item.showBenefits === 1 || item.showBenefits === null,
      displayOrder: item.displayOrder.toString(),
      active: item.active,
      banner1: item.banner1 || "",
      banner2: item.banner2 || "",
      eventCategoryId: item.eventCategoryId.toString(),
    });
    setIsModalOpen(true);
  };

  // Save Add/Edit
  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      showFeedback("Title is required.", "error");
      return;
    }

    setIsLoading(true);
    try {
      const url = editingItem
        ? `/api/members/sponsorship-setup/${editingItem.id}?event_id=${eventId}`
        : `/api/members/sponsorship-setup?event_id=${eventId}`;
      const method = editingItem ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        showFeedback(editingItem ? "Sponsorship tier updated!" : "Sponsorship tier created!");
        setIsModalOpen(false);
        await refreshData();
      } else {
        const err = await res.json();
        showFeedback(err.error || "Operation failed", "error");
      }
    } catch (e: any) {
      showFeedback(e.message || "Failed to save sponsorship tier", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Single Delete
  const handleDeleteItem = async (id: number) => {
    if (!confirm("Are you sure you want to delete this sponsorship tier?")) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/members/sponsorship-setup/${id}?event_id=${eventId}`, { method: "DELETE" });
      if (res.ok) {
        showFeedback("Sponsorship tier deleted!");
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

      {/* Header & Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-amber-300">Total Available</span>
            <Sparkles className="h-4 w-4 text-amber-400" />
          </div>
          <p className="mt-2 text-3xl font-black text-amber-200">{stats.totalAvailable}</p>
          <p className="text-[11px] text-amber-300/70 mt-1 font-medium">Slots ready for sponsorship</p>
        </div>

        <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-5 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-blue-300">Total Used</span>
            <CheckCircle2 className="h-4 w-4 text-blue-400" />
          </div>
          <p className="mt-2 text-3xl font-black text-blue-200">{stats.totalUsed}</p>
          <p className="text-[11px] text-blue-300/70 mt-1 font-medium">Slots allocated / sold</p>
        </div>

        <div className="rounded-2xl border border-purple-500/20 bg-purple-500/10 p-5 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-purple-300">Active Tiers</span>
            <ShieldCheck className="h-4 w-4 text-purple-400" />
          </div>
          <p className="mt-2 text-3xl font-black text-purple-200">{stats.activeCount}</p>
          <p className="text-[11px] text-purple-300/70 mt-1 font-medium">Out of {stats.totalCount} total tiers</p>
        </div>

        <div className="rounded-2xl border border-brand-pink/20 bg-brand-pink/10 p-5 backdrop-blur-md flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-brand-pink">Actions</span>
            <Wrench className="h-4 w-4 text-brand-pink" />
          </div>
          <div className="flex items-center gap-2 mt-3">
            <button
              type="button"
              onClick={handleAutoSetup}
              disabled={isLoading}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-700 to-brand-pink px-3 py-2 text-xs font-black uppercase tracking-wider text-white shadow-lg hover:brightness-110 transition disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
              Auto Setup
            </button>
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="inline-flex items-center justify-center rounded-xl bg-white text-zinc-950 px-3 py-2 text-xs font-black uppercase tracking-wider shadow-lg hover:bg-zinc-200 transition"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Control Bar: Search & Mail Dispatcher */}
      <div className="rounded-2xl border border-white/10 bg-zinc-900/90 p-5 space-y-4 shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Search Box */}
          <div className="md:col-span-5 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search sponsorship tiers by keyword..."
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
              <option value="1">Sponsor Pass Confirmation</option>
              <option value="2">Sponsorship Opportunity Invitation</option>
              <option value="3">Sponsor Perks & Benefits Overview</option>
            </select>
            <button
              type="button"
              onClick={handleSendMail}
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-xs font-bold text-zinc-200 hover:bg-zinc-700 hover:text-white transition shrink-0"
            >
              <Mail className="h-3.5 w-3.5 text-brand-pink" />
              Send
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
              <option value="update">Update Sponsorship Stats</option>
              <option value="mark_active">Mark as Active</option>
              <option value="mark_inactive">Mark as Inactive</option>
              <option value="export">Export Data</option>
              <option value="delete">Delete Selected</option>
            </select>
            <button
              type="button"
              onClick={handleBulkSubmit}
              disabled={isLoading}
              className="inline-flex items-center justify-center rounded-xl bg-brand-purple px-4 py-2.5 text-xs font-black uppercase text-white hover:bg-brand-pink transition shrink-0 shadow-md"
            >
              Apply
            </button>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/90 shadow-2xl backdrop-blur-md">
        <div className="border-b border-white/10 px-6 py-4 flex items-center justify-between bg-zinc-950/50">
          <div className="flex items-center gap-3">
            <Layers className="h-5 w-5 text-brand-pink" />
            <h3 className="text-sm font-black uppercase tracking-wider text-white">
              Sponsorship Setup Tiers ({filteredItems.length})
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
              No sponsorship setup items found. Click &quot;Auto Setup&quot; or &quot;Add Sponsorship Tier&quot; to get started.
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
                  <th className="px-6 py-4 font-black uppercase tracking-wider">Sponsorship Title</th>
                  <th className="px-6 py-4 font-black uppercase tracking-wider">Category</th>
                  <th className="px-6 py-4 font-black uppercase tracking-wider w-24 text-center">Available</th>
                  <th className="px-6 py-4 font-black uppercase tracking-wider w-24 text-center">Used</th>
                  <th className="px-6 py-4 font-black uppercase tracking-wider w-20 text-center">Order</th>
                  <th className="px-6 py-4 font-black uppercase tracking-wider w-20 text-center">Active</th>
                  <th className="px-6 py-4 font-black uppercase tracking-wider w-20 text-center">Sold Out</th>
                  <th className="px-6 py-4 font-black uppercase tracking-wider text-right">Manage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredItems.map((item) => {
                  const isSelected = selectedIds.includes(item.id);
                  const currentInline = inlineData[item.id] || {
                    available: item.available,
                    used: item.used,
                    displayOrder: item.displayOrder,
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

                      <td className="px-6 py-4">
                        <div className="space-y-0.5">
                          <span className="font-bold text-white block text-sm">{item.title}</span>
                          {item.shortDescription && (
                            <span className="text-xs text-zinc-400 line-clamp-1">
                              {item.shortDescription}
                            </span>
                          )}
                          <div className="flex items-center gap-2 text-[11px] text-zinc-500 font-semibold pt-1">
                            <span className="text-emerald-400">${item.price.toFixed(2)}</span>
                            {item.applyEarlyBird && (
                              <span className="text-amber-400">Early Bird: -${item.earlyBirdDiscount || 0}</span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4 text-xs font-semibold text-zinc-300">
                        {item.categoryTitle || `Cat #${item.eventCategoryId}`}
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
                          className="w-16 rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 text-center text-xs font-bold text-amber-300 focus:border-brand-pink focus:outline-none"
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
                          className="w-16 rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 text-center text-xs font-bold text-blue-300 focus:border-brand-pink focus:outline-none"
                        />
                      </td>

                      {/* Inline Order Edit */}
                      <td className="px-4 py-4 text-center">
                        <input
                          type="number"
                          value={currentInline.displayOrder}
                          onChange={(e) =>
                            setInlineData((prev) => ({
                              ...prev,
                              [item.id]: { ...currentInline, displayOrder: parseInt(e.target.value, 10) || 0 },
                            }))
                          }
                          className="w-14 rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 text-center text-xs font-bold text-zinc-300 focus:border-brand-pink focus:outline-none"
                        />
                      </td>

                      {/* Active Status */}
                      <td className="px-4 py-4 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            item.active
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                          }`}
                        >
                          {item.active ? "Yes" : "No"}
                        </span>
                      </td>

                      {/* Sold Out Status */}
                      <td className="px-4 py-4 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            item.soldOut
                              ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                              : "bg-blue-500/10 text-blue-300 border border-blue-500/20"
                          }`}
                        >
                          {item.soldOut ? "Yes" : "No"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setDetailItem(item);
                              setIsDetailModalOpen(true);
                            }}
                            title="View Details"
                            className="p-1.5 rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white transition"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(item)}
                            title="Edit Tier"
                            className="p-1.5 rounded-lg border border-purple-500/30 bg-purple-950/40 text-purple-300 hover:bg-purple-900/60 transition"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.id)}
                            title="Delete Tier"
                            className="p-1.5 rounded-lg border border-rose-500/30 bg-rose-950/40 text-rose-300 hover:bg-rose-900/60 transition"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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

      {/* Detail Modal */}
      {isDetailModalOpen && detailItem && (
        <ModalPortal>
      <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto overscroll-contain bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-zinc-900 p-6 space-y-6 shadow-2xl text-white">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-xs font-black uppercase tracking-widest text-brand-pink">Sponsorship Details</span>
                <h2 className="text-2xl font-black">{detailItem.title}</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="p-2 rounded-xl text-zinc-400 hover:bg-zinc-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm text-zinc-300">
              <div className="grid grid-cols-2 gap-4 bg-zinc-950 p-4 rounded-2xl border border-zinc-800">
                <div>
                  <span className="text-xs text-zinc-500 uppercase font-bold block">Price</span>
                  <span className="text-lg font-black text-emerald-400">${detailItem.price.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-xs text-zinc-500 uppercase font-bold block">Availability</span>
                  <span className="text-lg font-black text-amber-300">
                    {detailItem.available} Total / {detailItem.used} Used
                  </span>
                </div>
              </div>

              {detailItem.shortDescription && (
                <div>
                  <h4 className="text-xs font-bold uppercase text-zinc-400 mb-1">Short Description</h4>
                  <p className="bg-zinc-950/60 p-3 rounded-xl border border-zinc-800">{detailItem.shortDescription}</p>
                </div>
              )}

              {detailItem.description && (
                <div>
                  <h4 className="text-xs font-bold uppercase text-zinc-400 mb-1">Full Description</h4>
                  <p className="bg-zinc-950/60 p-3 rounded-xl border border-zinc-800 whitespace-pre-wrap">
                    {detailItem.description}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="bg-zinc-950/80 p-3 rounded-xl border border-zinc-800">
                  <h5 className="text-[10px] font-black uppercase text-brand-pink">Before Event Benefits</h5>
                  <p className="text-xs text-zinc-400 mt-1">{detailItem.beforeEventBenefits || "N/A"}</p>
                </div>
                <div className="bg-zinc-950/80 p-3 rounded-xl border border-zinc-800">
                  <h5 className="text-[10px] font-black uppercase text-brand-purple">During Event Benefits</h5>
                  <p className="text-xs text-zinc-400 mt-1">{detailItem.duringEventBenefits || "N/A"}</p>
                </div>
                <div className="bg-zinc-950/80 p-3 rounded-xl border border-zinc-800">
                  <h5 className="text-[10px] font-black uppercase text-emerald-400">After Event Benefits</h5>
                  <p className="text-xs text-zinc-400 mt-1">{detailItem.afterEventBenefits || "N/A"}</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-zinc-800 text-sm font-bold text-white hover:bg-zinc-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
    </ModalPortal>
      )}

      {/* Add / Edit Form Modal */}
      {isModalOpen && (
        <ModalPortal>
      <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto overscroll-contain bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-3xl my-8 rounded-3xl border border-white/10 bg-zinc-900 p-6 space-y-6 shadow-2xl text-white">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-xs font-black uppercase tracking-widest text-brand-pink">
                  {editingItem ? "Edit Sponsorship Tier" : "Create Sponsorship Tier"}
                </span>
                <h2 className="text-xl font-black">
                  {editingItem ? editingItem.title : "New Sponsorship Package"}
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

            <form onSubmit={handleSaveForm} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 space-y-1">
                  <label className="text-xs font-bold uppercase text-zinc-300">Title *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm font-medium text-white focus:border-brand-pink focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-zinc-300">Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm font-medium text-white focus:border-brand-pink focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-zinc-300">Display Order</label>
                  <input
                    type="number"
                    value={formData.displayOrder}
                    onChange={(e) => setFormData({ ...formData, displayOrder: e.target.value })}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm font-medium text-white focus:border-brand-pink focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-zinc-300">Available Slots</label>
                  <input
                    type="number"
                    value={formData.available}
                    onChange={(e) => setFormData({ ...formData, available: e.target.value })}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm font-medium text-white focus:border-brand-pink focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-zinc-300">Used Slots</label>
                  <input
                    type="number"
                    value={formData.used}
                    onChange={(e) => setFormData({ ...formData, used: e.target.value })}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm font-medium text-white focus:border-brand-pink focus:outline-none"
                  />
                </div>
              </div>

              {/* Descriptions */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-zinc-300">Short Description</label>
                  <textarea
                    rows={2}
                    value={formData.shortDescription}
                    onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-sm font-medium text-white focus:border-brand-pink focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-zinc-300">Full Description</label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-sm font-medium text-white focus:border-brand-pink focus:outline-none"
                  />
                </div>
              </div>

              {/* Benefits breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase text-brand-pink">Before Event Benefits</label>
                  <textarea
                    rows={3}
                    value={formData.beforeEventBenefits}
                    onChange={(e) => setFormData({ ...formData, beforeEventBenefits: e.target.value })}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 p-2.5 text-xs text-white focus:border-brand-pink focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase text-brand-purple">During Event Benefits</label>
                  <textarea
                    rows={3}
                    value={formData.duringEventBenefits}
                    onChange={(e) => setFormData({ ...formData, duringEventBenefits: e.target.value })}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 p-2.5 text-xs text-white focus:border-brand-pink focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase text-emerald-400">After Event Benefits</label>
                  <textarea
                    rows={3}
                    value={formData.afterEventBenefits}
                    onChange={(e) => setFormData({ ...formData, afterEventBenefits: e.target.value })}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 p-2.5 text-xs text-white focus:border-brand-pink focus:outline-none"
                  />
                </div>
              </div>

              {/* Checkbox Options */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-zinc-950 p-4 rounded-2xl border border-zinc-800">
                <label className="flex items-center gap-2 text-xs font-bold text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="rounded border-zinc-700 bg-zinc-900 text-brand-pink focus:ring-brand-pink"
                  />
                  Active
                </label>

                <label className="flex items-center gap-2 text-xs font-bold text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.soldOut}
                    onChange={(e) => setFormData({ ...formData, soldOut: e.target.checked })}
                    className="rounded border-zinc-700 bg-zinc-900 text-brand-pink focus:ring-brand-pink"
                  />
                  Sold Out
                </label>

                <label className="flex items-center gap-2 text-xs font-bold text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.applyEarlyBird}
                    onChange={(e) => setFormData({ ...formData, applyEarlyBird: e.target.checked })}
                    className="rounded border-zinc-700 bg-zinc-900 text-brand-pink focus:ring-brand-pink"
                  />
                  Early Bird
                </label>

                <label className="flex items-center gap-2 text-xs font-bold text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.registeredMemberDiscount}
                    onChange={(e) => setFormData({ ...formData, registeredMemberDiscount: e.target.checked })}
                    className="rounded border-zinc-700 bg-zinc-900 text-brand-pink focus:ring-brand-pink"
                  />
                  Member Discount
                </label>
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
                  Save Changes
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
