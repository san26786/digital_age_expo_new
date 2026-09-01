"use client";

import { useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Plus, Pencil, Trash2, Search, Percent, ShieldCheck, ShieldAlert, BadgeInfo, Coins, ArrowRightLeft, DollarSign } from "lucide-react";
import type { BannerStandRow, BannerStandStats } from "@/lib/services/eventBannerStands";
import type { EventBannerStandInput } from "@/lib/validations/eventBannerStand";
import { TablePagination } from "@/components/dashboard/TablePagination";

import { ModalPortal } from "@/components/ui/ModalPortal";
const PAGE_SIZE = 20;

interface Props {
  initialBannerStands: BannerStandRow[];
  initialStats: BannerStandStats;
  exhibitors: { userId: number; name: string; business: string }[];
  userRole: string;
}

export function BannerStandsManager({
  initialBannerStands,
  initialStats,
  exhibitors,
  userRole,
}: Props) {
  const router = useRouter();
  const [bannerStands, setBannerStands] = useState<BannerStandRow[]>(initialBannerStands);
  const [stats, setStats] = useState<BannerStandStats>(initialStats);
  const [exhibitorList, setExhibitorList] = useState(exhibitors);
  const [userRoleState, setUserRoleState] = useState(userRole);

  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [page, setPage] = useState(1);
  const [modalMode, setModalMode] = useState<"add" | "edit" | null>(null);
  const [activeRecord, setActiveRecord] = useState<BannerStandRow | null>(null);
  const [amountModalOpen, setAmountModalOpen] = useState(false);

  // Form states
  const [formName, setName] = useState("");
  const [exhibitorUserId, setExhibitorUserId] = useState("");
  const [listingId, setListingId] = useState("");
  const [linkedinProfile, setLinkedinProfile] = useState("");
  const [date, setDate] = useState("");
  const [exchangeServices, setExchangeServices] = useState(false);
  const [exchangeAmount, setExchangeAmount] = useState(0);
  const [status, setStatus] = useState("active");
  const [standPrice, setStandPrice] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [charitableAmount, setCharitableAmount] = useState(0);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Amount Override Form State
  const [overridePrice, setOverridePrice] = useState(0);
  const [overrideDiscount, setOverrideDiscount] = useState(0);
  const [overrideCharitable, setOverrideCharitable] = useState(0);
  const [overrideExchange, setOverrideExchange] = useState(0);

  // Listing options based on selected user
  const [userListings, setUserListings] = useState<{ id: number; title: string }[]>([]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Fetch listing options when exhibitor is changed
  useEffect(() => {
    async function fetchListings() {
      const uId = exhibitorUserId ? Number(exhibitorUserId) : null;
      if (!uId) {
        setUserListings([]);
        return;
      }
      try {
        const res = await axios.get(`/api/members/listings-options?userId=${uId}`);
        setUserListings(res.data.listings || []);
      } catch {
        setUserListings([]);
      }
    }
    fetchListings();
  }, [exhibitorUserId]);

  // Load record into Form states
  function openAdd() {
    setFormErrors({});
    setName("");
    setExhibitorUserId("");
    setListingId("");
    setLinkedinProfile("");
    setDate(new Date().toISOString().split("T")[0]);
    setExchangeServices(false);
    setExchangeAmount(0);
    setStatus("active");
    setStandPrice(0);
    setDiscount(0);
    setCharitableAmount(0);
    setModalMode("add");
  }

  function openEdit(record: BannerStandRow) {
    setFormErrors({});
    setActiveRecord(record);
    setName(record.name);
    setExhibitorUserId(String(record.userId));
    setListingId(record.listingId ? String(record.listingId) : "");
    setLinkedinProfile(record.linkedinUserProfile || "");
    setDate(record.date || "");
    setExchangeServices(record.exchangeServices);
    setExchangeAmount(record.exchangeAmount);
    setStatus(record.status);
    setStandPrice(record.standPrice);
    setDiscount(record.discount);
    setCharitableAmount(record.charitableAmount);
    setModalMode("edit");
  }

  function openAmountModal(record: BannerStandRow) {
    setActiveRecord(record);
    setOverridePrice(record.standPrice);
    setOverrideDiscount(record.discount);
    setOverrideCharitable(record.charitableAmount);
    setOverrideExchange(record.exchangeAmount);
    setAmountModalOpen(true);
  }

  async function refreshData() {
    try {
      const res = await axios.get(`/api/members/banner-stands?filter=${statusFilter}`);
      setBannerStands(res.data.bannerStands || []);
      setStats(res.data.stats);
      setExhibitorList(res.data.exhibitors || []);
      setUserRoleState(res.data.userRole);
    } catch (err) {
      console.error("Failed to load banner stands", err);
    }
  }

  useEffect(() => {
    refreshData();
  }, [statusFilter]);

  const filteredBannerStands = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return bannerStands;
    return bannerStands.filter((s) => {
      return (
        s.name.toLowerCase().includes(q) ||
        (s.listingName && s.listingName.toLowerCase().includes(q)) ||
        (s.title && s.title.toLowerCase().includes(q)) ||
        s.status.toLowerCase().includes(q)
      );
    });
  }, [bannerStands, keyword]);

  useEffect(() => {
    setPage(1);
  }, [keyword, statusFilter]);

  const paged = useMemo(
    () => filteredBannerStands.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filteredBannerStands, page]
  );

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setFormErrors({});

    const payload: EventBannerStandInput = {
      name: formName,
      exhibitor_user_id: exhibitorUserId,
      listing_id: listingId ? Number(listingId) : null,
      linkedin_user_profile: linkedinProfile,
      date,
      exchange_services: exchangeServices,
      exchange_amount: Number(exchangeAmount) || 0,
      status: status as any,
      stand_price: Number(standPrice) || 0,
      discount: Number(discount) || 0,
      charitable_amount: Number(charitableAmount) || 0,
    };

    try {
      if (modalMode === "add") {
        await axios.post("/api/members/banner-stands", payload);
      } else if (modalMode === "edit" && activeRecord) {
        await axios.patch(`/api/members/banner-stands/${activeRecord.id}`, payload);
      }
      setModalMode(null);
      refreshData();
      router.refresh();
    } catch (err: any) {
      if (err.response?.data?.error) {
        setFormErrors(err.response.data.error);
      } else {
        alert("Failed to save. Please check your network and try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleAmountSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeRecord) return;
    setLoading(true);

    try {
      await axios.patch(`/api/members/banner-stands/${activeRecord.id}`, {
        action: "change_amount",
        stand_price: overridePrice,
        discount: overrideDiscount,
        charitable_amount: overrideCharitable,
        exchange_amount: overrideExchange,
      });
      setAmountModalOpen(false);
      refreshData();
      router.refresh();
    } catch {
      alert("Could not update amounts. Please check your access and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleBulkAction(action: string) {
    if (selectedIds.length === 0) return;
    if (action === "delete" && !window.confirm(`Are you sure you want to delete ${selectedIds.length} banner stand(s)?`)) {
      return;
    }

    setLoading(true);
    try {
      await axios.patch("/api/members/banner-stands", { ids: selectedIds, action });
      setSelectedIds([]);
      refreshData();
      router.refresh();
    } catch {
      alert("Failed to perform action. Ensure you have Organiser permissions.");
    } finally {
      setLoading(false);
    }
  }

  async function deleteSingle(id: number) {
    if (!window.confirm("Are you sure you want to delete this banner stand?")) return;
    setLoading(true);
    try {
      await axios.delete(`/api/members/banner-stands/${id}`);
      refreshData();
      router.refresh();
    } catch {
      alert("Failed to delete record.");
    } finally {
      setLoading(false);
    }
  }

  function toggleSelectAll() {
    const pageIds = paged.map((s) => s.id);
    const allOnPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));
    if (allOnPageSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedIds((prev) => [...new Set([...prev, ...pageIds])]);
    }
  }

  function toggleSelect(id: number) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  return (
    <div className="space-y-8">
      {/* Dynamic Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-brand-purple/20 p-3 text-brand-purple">
              <BadgeInfo className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-zinc-500">Total Stands</p>
              <h3 className="text-2xl font-black text-white mt-1">{stats.total}</h3>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-emerald-500/20 p-3 text-emerald-400">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-zinc-500">Active Stands</p>
              <h3 className="text-2xl font-black text-emerald-400 mt-1">{stats.active}</h3>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-amber-500/20 p-3 text-amber-400">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-zinc-500">Pending Stands</p>
              <h3 className="text-2xl font-black text-amber-400 mt-1">{stats.pending}</h3>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-md col-span-2 lg:col-span-1">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-brand-pink/20 p-3 text-brand-pink">
              <Coins className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-zinc-500">Stand Revenue</p>
              <h3 className="text-xl font-black text-brand-pink mt-1">
                £{stats.totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* Control Navigation (Allocate stand options) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-black uppercase text-brand-purple tracking-tight">Manage Banner Stands</h1>
          <p className="text-sm font-medium text-zinc-400 max-w-xl mt-1">
            Allocate and configure banner stands for event sponsors. Organisers can approve allocations, adjust pricing, and send passes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={openAdd}
            className="btn-brand-gradient inline-flex items-center gap-2 rounded-full px-6 py-3 text-xs font-black uppercase tracking-widest text-white shadow-2xl transition hover:scale-105"
          >
            <Plus className="h-4 w-4" />
            Allocate Stand
          </button>
        </div>
      </div>

      {/* Bulk and Search Filters */}
      <div className="space-y-4">
        <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
          <div className="flex flex-wrap items-center gap-2 border-b border-white/5 pb-2 lg:pb-0 lg:border-none">
            {["all", "active", "pending", "reject"].map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition ${
                  statusFilter === filter
                    ? "bg-brand-pink text-white shadow-lg"
                    : "bg-white/5 hover:bg-white/10 text-zinc-400"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          <div className="flex-1 lg:max-w-md flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 shadow-xl backdrop-blur-md">
            <Search className="h-5 w-5 shrink-0 text-brand-pink" />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Search banner stands by name, business, status..."
              className="w-full bg-transparent text-sm text-white placeholder:text-zinc-600 focus:outline-none font-medium"
            />
          </div>
        </div>

        {/* Bulk Action Controls */}
        {userRoleState === "organiser" && selectedIds.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 p-4 rounded-2xl border border-brand-purple/20 bg-brand-purple/5 animate-fade-in">
            <span className="text-xs font-bold text-brand-purple tracking-wide">
              {selectedIds.length} Row(s) selected:
            </span>
            <button
              onClick={() => handleBulkAction("approve")}
              disabled={loading}
              className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-400 hover:bg-emerald-500/20 transition disabled:opacity-50"
            >
              Approve
            </button>
            <button
              onClick={() => handleBulkAction("pending")}
              disabled={loading}
              className="rounded-full bg-amber-500/10 border border-amber-500/20 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-amber-400 hover:bg-amber-500/20 transition disabled:opacity-50"
            >
              Disapprove
            </button>
            <button
              onClick={() => handleBulkAction("delete")}
              disabled={loading}
              className="rounded-full bg-red-500/10 border border-red-500/20 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-red-400 hover:bg-red-500/20 transition disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Main Allocation Table */}
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-gradient-to-r from-brand-purple to-brand-pink text-white">
                {userRoleState === "organiser" && (
                  <th className="px-6 py-4 font-black uppercase tracking-wider w-12 text-center">
                    <input
                      type="checkbox"
                      checked={paged.length > 0 && paged.every((s) => selectedIds.includes(s.id))}
                      onChange={toggleSelectAll}
                      className="rounded border-zinc-700 bg-zinc-800 text-brand-pink focus:ring-brand-pink"
                    />
                  </th>
                )}
                <th className="px-6 py-4 font-black uppercase tracking-wider">Exhibitor Details</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Sponsor's Business</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Topic / Title</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Event Date</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Price Matrix</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Exchange</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider text-right">Manage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-medium">
              {filteredBannerStands.length === 0 && (
                <tr>
                  <td colSpan={userRoleState === "organiser" ? 9 : 8} className="px-6 py-20 text-center text-zinc-500 italic">
                    {bannerStands.length === 0
                      ? "No allocated stands currently available for this event."
                      : "No allocated stands match your current filter."}
                  </td>
                </tr>
              )}
              {paged.map((item) => (
                <tr key={item.id} className="align-top hover:bg-white/[0.02] transition-colors">
                  {userRoleState === "organiser" && (
                    <td className="px-6 py-5 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(item.id)}
                        onChange={() => toggleSelect(item.id)}
                        className="rounded border-zinc-700 bg-zinc-800 text-brand-pink focus:ring-brand-pink"
                      />
                    </td>
                  )}
                  <td className="px-6 py-5">
                    <div className="font-black text-white text-base tracking-tight">{item.name}</div>
                    <div className="text-zinc-500 text-xs mt-1">{item.email || "No Email Provided"}</div>
                    <div className="text-[10px] uppercase font-bold text-zinc-600 mt-0.5">{item.phone || "—"}</div>
                  </td>
                  <td className="px-6 py-5 text-zinc-300">
                    {item.listingName || <span className="text-zinc-600 italic">No business linked</span>}
                  </td>
                  <td className="px-6 py-5 text-zinc-300 max-w-xs truncate">
                    <div className="font-semibold text-zinc-200">{item.title || "—"}</div>
                    <div className="text-xs text-zinc-500 mt-1 max-w-[200px] truncate">{item.description || ""}</div>
                  </td>
                  <td className="px-6 py-5 text-zinc-400">
                    <div className="text-zinc-200 text-xs font-black uppercase tracking-wider">{item.date || "—"}</div>
                    <div className="text-[10px] font-bold text-zinc-500 mt-1">
                      {item.startTime ? `${item.startTime} - ${item.endTime || ""}` : ""}
                    </div>
                  </td>
                  <td className="px-6 py-5 text-xs">
                    <div className="flex items-center gap-1.5 text-zinc-200">
                      <span className="text-zinc-500 font-bold">Price:</span> £{item.standPrice.toFixed(2)}
                    </div>
                    {item.discount > 0 && (
                      <div className="flex items-center gap-1.5 text-red-400 mt-1 font-bold">
                        <Percent className="h-3 w-3 shrink-0" /> Disc: -£{item.discount.toFixed(2)}
                      </div>
                    )}
                    {item.charitableAmount > 0 && (
                      <div className="flex items-center gap-1.5 text-emerald-400 mt-1">
                        <span className="text-zinc-500 font-bold">Charity:</span> -£{item.charitableAmount.toFixed(2)}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-5">
                    {item.exchangeServices ? (
                      <div>
                        <span className="inline-flex items-center gap-1 text-[10px] bg-brand-purple/10 text-brand-purple px-2 py-0.5 rounded-full border border-brand-purple/20 font-black uppercase tracking-widest">
                          <ArrowRightLeft className="h-2.5 w-2.5" /> Exchange
                        </span>
                        <div className="text-xs text-zinc-300 mt-1.5 font-bold">£{item.exchangeAmount.toFixed(2)}</div>
                      </div>
                    ) : (
                      <span className="text-zinc-600 italic text-xs">—</span>
                    )}
                  </td>
                  <td className="px-6 py-5">
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest border shadow-lg ${
                      item.status === 'active'
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : item.status === 'pending'
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        : "bg-red-500/10 text-red-400 border-red-500/20"
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center justify-end gap-2">
                      {userRoleState === "organiser" && (
                        <button
                          onClick={() => openAmountModal(item)}
                          className="inline-flex items-center gap-1 rounded-full bg-white/5 border border-white/10 px-3.5 py-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-300 hover:bg-white/10 hover:text-white transition shadow-xl"
                        >
                          <DollarSign className="h-3 w-3" /> Adjust Amount
                        </button>
                      )}
                      <button
                        onClick={() => openEdit(item)}
                        className="inline-flex items-center gap-1 rounded-full bg-white/5 border border-white/10 px-3.5 py-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-300 hover:bg-white/10 hover:text-white transition shadow-xl"
                      >
                        <Pencil className="h-3 w-3" /> Edit
                      </button>
                      {userRoleState === "organiser" && (
                        <button
                          onClick={() => deleteSingle(item.id)}
                          className="inline-flex items-center gap-1 rounded-full bg-red-500/10 border border-red-500/20 px-3.5 py-1.5 text-[10px] font-black uppercase tracking-widest text-red-400 hover:bg-red-500/20 transition shadow-xl"
                        >
                          <Trash2 className="h-3 w-3" /> Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-6 pb-6">
          <TablePagination currentPage={page} totalItems={filteredBannerStands.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
        </div>
      </div>

      {/* ALLOCATE / EDIT MODAL */}
      {modalMode !== null && mounted && createPortal(
        <ModalPortal>
      <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto overscroll-contain bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-zinc-900 p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-black uppercase text-brand-purple tracking-tight mb-6">
              {modalMode === "add" ? "Allocate Banner Stand" : "Edit Allocated Stand Details"}
            </h2>

            <form onSubmit={handleFormSubmit} className="space-y-5 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-1.5">
                    Exhibitor / Contact Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter full name"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-zinc-600 focus:border-brand-pink focus:outline-none font-medium"
                  />
                  {formErrors.name && (
                    <p className="text-xs text-red-400 font-bold mt-1.5">{formErrors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-1.5">
                    Exhibitor / Customer Account *
                  </label>
                  <select
                    required
                    value={exhibitorUserId}
                    onChange={(e) => setExhibitorUserId(e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-zinc-800 px-4 py-3 text-white focus:border-brand-pink focus:outline-none font-medium"
                  >
                    <option value="">Select Customer</option>
                    {exhibitorList.map((e) => (
                      <option key={e.userId} value={String(e.userId)}>
                        {e.name} {e.business ? `(${e.business})` : ""}
                      </option>
                    ))}
                  </select>
                  {formErrors.exhibitor_user_id && (
                    <p className="text-xs text-red-400 font-bold mt-1.5">{formErrors.exhibitor_user_id}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-1.5">
                    Sponsor's Business Listing
                  </label>
                  <select
                    value={listingId}
                    onChange={(e) => setListingId(e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-zinc-800 px-4 py-3 text-white focus:border-brand-pink focus:outline-none font-medium"
                  >
                    <option value="">No Listing Linked</option>
                    {userListings.map((l) => (
                      <option key={l.id} value={String(l.id)}>
                        {l.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-1.5">
                    Linkedin Profile
                  </label>
                  <input
                    type="url"
                    value={linkedinProfile}
                    onChange={(e) => setLinkedinProfile(e.target.value)}
                    placeholder="https://linkedin.com/in/username"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-zinc-600 focus:border-brand-pink focus:outline-none font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-1.5">
                    Allocation Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-brand-pink focus:outline-none font-medium"
                  />
                  {formErrors.date && (
                    <p className="text-xs text-red-400 font-bold mt-1.5">{formErrors.date}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-1.5">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-zinc-800 px-4 py-3 text-white focus:border-brand-pink focus:outline-none font-medium"
                  >
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="reject">Reject</option>
                  </select>
                </div>

                <div className="md:col-span-2 border-t border-white/5 pt-4 my-2">
                  <h4 className="text-xs font-black uppercase tracking-widest text-brand-pink mb-4">Financials & Amounts</h4>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-1.5">
                    Stand Price (£)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={standPrice}
                    onChange={(e) => setStandPrice(Number(e.target.value) || 0)}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-zinc-600 focus:border-brand-pink focus:outline-none font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-1.5">
                    Discount Amount (£)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={discount}
                    onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-zinc-600 focus:border-brand-pink focus:outline-none font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-1.5">
                    Charitable Donation (£)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={charitableAmount}
                    onChange={(e) => setCharitableAmount(Number(e.target.value) || 0)}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-zinc-600 focus:border-brand-pink focus:outline-none font-medium"
                  />
                </div>

                <div className="flex items-center gap-2 h-full pt-6">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={exchangeServices}
                      onChange={(e) => setExchangeServices(e.target.checked)}
                      className="rounded border-zinc-700 bg-zinc-800 text-brand-pink focus:ring-brand-pink h-5 w-5"
                    />
                    <span className="text-xs font-black uppercase tracking-wider text-zinc-400">
                      Enable Services Exchange
                    </span>
                  </label>
                </div>

                {exchangeServices && (
                  <div className="md:col-span-2">
                    <label className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-1.5">
                      Exchange Amount (£)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={exchangeAmount}
                      onChange={(e) => setExchangeAmount(Number(e.target.value) || 0)}
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-zinc-600 focus:border-brand-pink focus:outline-none font-medium"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 border-t border-white/5 pt-6 mt-6">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="rounded-full bg-white/5 border border-white/10 px-6 py-2.5 text-xs font-black uppercase tracking-widest text-zinc-400 hover:bg-white/10 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-brand-gradient rounded-full px-6 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-xl transition disabled:opacity-50"
                >
                  {loading ? "Saving..." : modalMode === "add" ? "Allocate Stand" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
    </ModalPortal>,
        document.body
      )}

      {/* ADJUST / OVERRIDE AMOUNT MODAL */}
      {amountModalOpen && activeRecord && mounted && createPortal(
        <ModalPortal>
      <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto overscroll-contain bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-zinc-900 p-8 shadow-2xl">
            <h2 className="text-xl font-black uppercase text-brand-purple tracking-tight mb-2">
              Adjust Amount
            </h2>
            <p className="text-xs text-zinc-500 mb-6 font-medium">
              Sponsor: <span className="font-bold text-zinc-300">{activeRecord.name}</span>
            </p>

            <form onSubmit={handleAmountSubmit} className="space-y-4 text-sm font-medium">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-1.5">
                  Stand Price (£)
                </label>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={overridePrice}
                  onChange={(e) => setOverridePrice(Number(e.target.value) || 0)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-brand-pink focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-1.5">
                  Discount (£)
                </label>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={overrideDiscount}
                  onChange={(e) => setOverrideDiscount(Number(e.target.value) || 0)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-brand-pink focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-1.5">
                  Charitable Amount (£)
                </label>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={overrideCharitable}
                  onChange={(e) => setOverrideCharitable(Number(e.target.value) || 0)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-brand-pink focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-1.5">
                  Exchange Amount (£)
                </label>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={overrideExchange}
                  onChange={(e) => setOverrideExchange(Number(e.target.value) || 0)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-brand-pink focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-white/5 pt-6 mt-6">
                <button
                  type="button"
                  onClick={() => setAmountModalOpen(false)}
                  className="rounded-full bg-white/5 border border-white/10 px-6 py-2.5 text-xs font-black uppercase tracking-widest text-zinc-400 hover:bg-white/10 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-brand-gradient rounded-full px-6 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-xl transition disabled:opacity-50"
                >
                  {loading ? "Updating..." : "Update Amount"}
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
