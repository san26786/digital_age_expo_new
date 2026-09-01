"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Search, X, ShieldAlert, BadgeCheck, CheckCircle2, User, Phone, Mail, Award, Landmark, Eye, Pencil, Plus, Store } from "lucide-react";
import { TablePagination } from "@/components/dashboard/TablePagination";

import { ModalPortal } from "@/components/ui/ModalPortal";
interface ExhibitorDetail {
  id: number;
  companyName: string;
  standNumber: string;
  zone: string;
  repName: string;
  repEmail: string;
  repPhone: string;
  electricalRequirements: string;
  furnitureRequirements: string;
  invoiceStatus: "Paid" | "Pending" | "Overdue";
  artworkReviewed: boolean;
}

const INITIAL_EXHIBITORS: ExhibitorDetail[] = [
  {
    id: 1,
    companyName: "Alpha Robotics Corp",
    standNumber: "A12",
    zone: "Zone A (Robotics)",
    repName: "Marcus Vance",
    repEmail: "m.vance@alpharobotics.com",
    repPhone: "+1 (555) 392-1049",
    electricalRequirements: "3-Phase 32A power supply + 4 dual sockets",
    furnitureRequirements: "2 bar stools, 1 glass high-table, 1 literature rack",
    invoiceStatus: "Paid",
    artworkReviewed: true
  },
  {
    id: 2,
    companyName: "Zenith Software Solutions",
    standNumber: "B04",
    zone: "Zone B (Software)",
    repName: "Sarah Connor",
    repEmail: "sconnor@zenithsoft.io",
    repPhone: "+44 20 7946 0192",
    electricalRequirements: "Standard 13A single phase + 2 dual sockets",
    furnitureRequirements: "1 modular display desk, 2 meeting chairs",
    invoiceStatus: "Paid",
    artworkReviewed: true
  },
  {
    id: 3,
    companyName: "EcoTech Innovations",
    standNumber: "C19",
    zone: "Zone C (Cleantech)",
    repName: "Julian Rivers",
    repEmail: "rivers@ecotech.co.nz",
    repPhone: "+64 9 307 1234",
    electricalRequirements: "2kW electrical connection + 3 dual sockets",
    furnitureRequirements: "3 premium white leather chairs, 1 round table",
    invoiceStatus: "Pending",
    artworkReviewed: false
  },
  {
    id: 4,
    companyName: "NextGen Biotech",
    standNumber: "A15",
    zone: "Zone A (Robotics)",
    repName: "Dr. Elena Rostova",
    repEmail: "e.rostova@nextgenbiotech.org",
    repPhone: "+49 89 2019340",
    electricalRequirements: "4kW single-phase supply with surge protector",
    furnitureRequirements: "1 lockable counter, 2 display plinths",
    invoiceStatus: "Overdue",
    artworkReviewed: true
  }
];

const ZONES = ["All", "Zone A (Robotics)", "Zone B (Software)", "Zone C (Cleantech)"];

const INVOICE_CLASSES: Record<string, string> = {
  Paid: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full text-xs font-bold",
  Pending: "bg-amber-500/15 text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-full text-xs font-bold",
  Overdue: "bg-red-500/15 text-red-400 border border-red-500/20 px-2.5 py-1 rounded-full text-xs font-bold",
};

const FIELD_CLASS =
  "w-full rounded-xl border border-white/15 bg-zinc-950/85 px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-brand-pink focus:ring-1 focus:ring-brand-pink/30 focus:outline-none transition";

export default function ViewExhibitorInformationPage() {
  const [exhibitors, setExhibitors] = useState<ExhibitorDetail[]>(INITIAL_EXHIBITORS);
  const [searchQuery, setSearchQuery] = useState("");
  const [zoneFilter, setZoneFilter] = useState("All");

  // Detail Modal & Edit Modal
  const [selectedExhibitor, setSelectedExhibitor] = useState<ExhibitorDetail | null>(null);
  const [editingExhibitor, setEditingExhibitor] = useState<ExhibitorDetail | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Overlays are portaled to document.body, so they must wait for client mount
  // before rendering (document isn't available during SSR).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Form states
  const [formCompany, setFormCompany] = useState("");
  const [formStand, setFormStand] = useState("");
  const [formZone, setFormZone] = useState("Zone A (Robotics)");
  const [formRepName, setFormRepName] = useState("");
  const [formRepEmail, setFormRepEmail] = useState("");
  const [formRepPhone, setFormRepPhone] = useState("");
  const [formElectrical, setFormElectrical] = useState("");
  const [formFurniture, setFormFurniture] = useState("");
  const [formInvoice, setFormInvoice] = useState<ExhibitorDetail["invoiceStatus"]>("Pending");
  const [formArtwork, setFormArtwork] = useState(false);

  const [toastMessage, setToastMessage] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 4000);
  };

  const openEditModal = (exhibitor: ExhibitorDetail) => {
    setEditingExhibitor(exhibitor);
    setFormCompany(exhibitor.companyName);
    setFormStand(exhibitor.standNumber);
    setFormZone(exhibitor.zone);
    setFormRepName(exhibitor.repName);
    setFormRepEmail(exhibitor.repEmail);
    setFormRepPhone(exhibitor.repPhone);
    setFormElectrical(exhibitor.electricalRequirements);
    setFormFurniture(exhibitor.furnitureRequirements);
    setFormInvoice(exhibitor.invoiceStatus);
    setFormArtwork(exhibitor.artworkReviewed);
    setModalOpen(true);
  };

  const openAddModal = () => {
    setEditingExhibitor(null);
    setFormCompany("");
    setFormStand("");
    setFormZone("Zone A (Robotics)");
    setFormRepName("");
    setFormRepEmail("");
    setFormRepPhone("");
    setFormElectrical("Standard 13A double socket");
    setFormFurniture("1 desk, 2 standard chairs");
    setFormInvoice("Pending");
    setFormArtwork(false);
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCompany.trim() || !formStand.trim()) return;

    if (editingExhibitor) {
      const updated = exhibitors.map(ex => ex.id === editingExhibitor.id ? {
        ...ex,
        companyName: formCompany.trim(),
        standNumber: formStand.trim().toUpperCase(),
        zone: formZone,
        repName: formRepName.trim(),
        repEmail: formRepEmail.trim(),
        repPhone: formRepPhone.trim(),
        electricalRequirements: formElectrical.trim(),
        furnitureRequirements: formFurniture.trim(),
        invoiceStatus: formInvoice,
        artworkReviewed: formArtwork
      } : ex);
      setExhibitors(updated);
      showToast("Exhibitor registration updated!");
      // If we are viewing the edited, update the view state
      if (selectedExhibitor?.id === editingExhibitor.id) {
        setSelectedExhibitor(updated.find(x => x.id === editingExhibitor.id) || null);
      }
    } else {
      const newItem: ExhibitorDetail = {
        id: Date.now(),
        companyName: formCompany.trim(),
        standNumber: formStand.trim().toUpperCase(),
        zone: formZone,
        repName: formRepName.trim(),
        repEmail: formRepEmail.trim(),
        repPhone: formRepPhone.trim(),
        electricalRequirements: formElectrical.trim(),
        furnitureRequirements: formFurniture.trim(),
        invoiceStatus: formInvoice,
        artworkReviewed: formArtwork
      };
      setExhibitors([newItem, ...exhibitors]);
      showToast("New exhibitor registered!");
    }
    setEditingExhibitor(null);
    setModalOpen(false);
  };

  const filtered = exhibitors.filter(ex => {
    const matchesSearch = ex.companyName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          ex.standNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          ex.repName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesZone = zoneFilter === "All" || ex.zone === zoneFilter;
    return matchesSearch && matchesZone;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-purple to-brand-pink shadow-lg shadow-brand-pink/20">
            <Store className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white flex items-center gap-2">Exhibitor Directory Information</h1>
            <p className="text-xs font-medium text-zinc-400 mt-1">Access comprehensive profile cards, stand specs, electrical requirements, and administrative checklist statuses for all exhibitors.</p>
          </div>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full btn-brand-gradient px-5 py-2.5 text-sm font-bold text-white transition self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          Add Exhibitor
        </button>
      </div>

      {/* Toast Feedback */}
      {toastMessage && (
        <div className="flex items-center gap-3 rounded-xl bg-emerald-500/15 border border-emerald-500/20 p-4 text-emerald-400 animate-fade-in">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Analytics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-white/5 bg-zinc-950/40 p-4">
          <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Total Companies</p>
          <p className="text-2xl font-black text-white mt-1">{exhibitors.length}</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-zinc-950/40 p-4 border-l-emerald-500/30">
          <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider text-emerald-400">Invoices Paid</p>
          <p className="text-2xl font-black text-emerald-400 mt-1">
            {exhibitors.filter(x => x.invoiceStatus === "Paid").length}
          </p>
        </div>
        <div className="rounded-xl border border-white/5 bg-zinc-950/40 p-4 border-l-amber-500/30">
          <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider text-amber-400">Graphics Approved</p>
          <p className="text-2xl font-black text-amber-400 mt-1">
            {exhibitors.filter(x => x.artworkReviewed).length}
          </p>
        </div>
        <div className="rounded-xl border border-white/5 bg-zinc-950/40 p-4 border-l-red-500/30">
          <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider text-red-400">Overdue Invoices</p>
          <p className="text-2xl font-black text-red-400 mt-1">
            {exhibitors.filter(x => x.invoiceStatus === "Overdue").length}
          </p>
        </div>
      </div>

      {/* Control bar */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
        {/* Search */}
        <div className="flex-1 flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-950/60 px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-zinc-500" />
          <input
            type="text"
            placeholder="Search exhibitors by company name, stand, or representative..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-white placeholder:text-zinc-500 focus:outline-none"
          />
        </div>

        {/* Zones Selector */}
        <div className="flex flex-wrap gap-1 bg-zinc-950/40 border border-white/10 p-1 rounded-xl">
          {ZONES.map((zone) => (
            <button
              key={zone}
              onClick={() => setZoneFilter(zone)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                zoneFilter === zone
                  ? "bg-brand-pink text-white"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              {zone}
            </button>
          ))}
        </div>
      </div>

      {/* Exhibitors Table */}
      <div className="overflow-x-auto rounded-xl border border-white/10 bg-zinc-950/40 backdrop-blur-md">
        <table className="w-full min-w-[800px] text-left text-sm text-zinc-300">
          <thead>
            <tr className="border-b border-white/10 bg-gradient-to-r from-brand-purple to-brand-pink text-white">
              <th className="px-6 py-4 font-black uppercase tracking-wider">Exhibitor Company</th>
              <th className="px-6 py-4 font-black uppercase tracking-wider">Stand & Location</th>
              <th className="px-6 py-4 font-black uppercase tracking-wider">Primary Representative</th>
              <th className="px-6 py-4 font-black uppercase tracking-wider">Invoice Status</th>
              <th className="px-6 py-4 font-black uppercase tracking-wider">Stand Graphics</th>
              <th className="px-6 py-4 font-black uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-zinc-500 font-medium">
                  No exhibitors matched your search.
                </td>
              </tr>
            )}
            {filtered.map((ex) => (
              <tr key={ex.id} className="hover:bg-white/5 border-b border-white/5 transition align-middle">
                <td className="px-5 py-4 font-black text-white text-sm">{ex.companyName}</td>
                <td className="px-5 py-4">
                  <div className="font-bold text-white text-sm">Stand {ex.standNumber}</div>
                  <div className="text-zinc-500 text-xs mt-0.5">{ex.zone}</div>
                </td>
                <td className="px-5 py-4">
                  <div className="text-zinc-200 font-medium text-sm">{ex.repName}</div>
                  <div className="text-zinc-500 text-xs mt-0.5">{ex.repEmail}</div>
                </td>
                <td className="px-5 py-4">
                  <span className={INVOICE_CLASSES[ex.invoiceStatus]}>{ex.invoiceStatus}</span>
                </td>
                <td className="px-5 py-4">
                  {ex.artworkReviewed ? (
                    <span className="inline-flex items-center gap-1 text-emerald-400 text-xs font-bold">
                      <BadgeCheck className="h-4 w-4" /> Approved
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-amber-400 text-xs font-bold">
                      <ShieldAlert className="h-4 w-4" /> Missing
                    </span>
                  )}
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedExhibitor(ex)}
                      className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-zinc-200 hover:bg-brand-pink hover:text-white hover:border-brand-pink transition"
                    >
                      <Eye className="h-3.5 w-3.5" /> Details
                    </button>
                    <button
                      onClick={() => openEditModal(ex)}
                      className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-zinc-200 hover:bg-white/10 hover:text-white transition"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TablePagination currentPage={page} totalItems={filtered.length} pageSize={pageSize} onPageChange={setPage} className="mt-4" />

      {/* Details View Drawer (right-aligned by design, not centered) */}
      {selectedExhibitor &&
        mounted &&
        createPortal(
          <ModalPortal>
      <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto overscroll-contain bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
            <div className="h-full w-full max-w-md bg-zinc-950 border-l border-white/10 p-6 shadow-2xl overflow-y-auto text-white flex flex-col justify-between">
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-brand-pink">Exhibitor Details</span>
                    <h3 className="text-xl font-black text-white">{selectedExhibitor.companyName}</h3>
                  </div>
                  <button onClick={() => setSelectedExhibitor(null)} className="text-zinc-400 hover:text-white transition">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Stand Allocation */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-zinc-400">Stand Allocation</h4>
                  <div className="rounded-xl border border-white/5 bg-white/5 p-4 grid grid-cols-2 gap-4">
                    <div>
                      <span className="block text-xs text-zinc-500">Stand Number</span>
                      <strong className="text-white text-base">{selectedExhibitor.standNumber}</strong>
                    </div>
                    <div>
                      <span className="block text-xs text-zinc-500">Hall Location</span>
                      <strong className="text-white text-sm">{selectedExhibitor.zone}</strong>
                    </div>
                  </div>
                </div>

                {/* Representative Information */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-zinc-400">Primary Contact</h4>
                  <div className="rounded-xl border border-white/5 bg-white/5 p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <User className="h-4 w-4 text-brand-pink" />
                      <div>
                        <span className="block text-[10px] text-zinc-500">Full Name</span>
                        <strong className="text-sm text-zinc-200">{selectedExhibitor.repName}</strong>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-brand-pink" />
                      <div>
                        <span className="block text-[10px] text-zinc-500">Email Address</span>
                        <a href={`mailto:${selectedExhibitor.repEmail}`} className="text-sm text-brand-purple hover:underline">
                          {selectedExhibitor.repEmail}
                        </a>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-brand-pink" />
                      <div>
                        <span className="block text-[10px] text-zinc-500">Phone Number</span>
                        <strong className="text-sm text-zinc-200">{selectedExhibitor.repPhone}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Technical / Operations requirements */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-zinc-400">Technical Specs</h4>
                  <div className="rounded-xl border border-white/5 bg-white/5 p-4 space-y-3 text-sm">
                    <div>
                      <span className="block text-xs text-zinc-500">Electrical Socket Requests</span>
                      <p className="text-zinc-200 mt-1 font-medium">{selectedExhibitor.electricalRequirements || "None requested"}</p>
                    </div>
                    <div>
                      <span className="block text-xs text-zinc-500">Stand Furniture Requests</span>
                      <p className="text-zinc-200 mt-1 font-medium">{selectedExhibitor.furnitureRequirements || "None requested"}</p>
                    </div>
                  </div>
                </div>

                {/* administrative statuses */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-zinc-400">Workflow Checklist</h4>
                  <div className="rounded-xl border border-white/5 bg-white/5 p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-zinc-400 flex items-center gap-1.5">
                        <Landmark className="h-3.5 w-3.5 text-zinc-500" /> Stand Fee Invoice
                      </span>
                      <span className={INVOICE_CLASSES[selectedExhibitor.invoiceStatus]}>
                        {selectedExhibitor.invoiceStatus}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-zinc-400 flex items-center gap-1.5">
                        <Award className="h-3.5 w-3.5 text-zinc-500" /> Graphics Submission
                      </span>
                      {selectedExhibitor.artworkReviewed ? (
                        <span className="text-emerald-400 text-xs font-bold flex items-center gap-1">
                          <BadgeCheck className="h-4 w-4" /> Approved
                        </span>
                      ) : (
                        <span className="text-amber-400 text-xs font-bold flex items-center gap-1">
                          <ShieldAlert className="h-4 w-4" /> Missing
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-6 border-t border-white/10 mt-6">
                <button
                  onClick={() => {
                    setSelectedExhibitor(null);
                    openEditModal(selectedExhibitor);
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full btn-brand-gradient py-3 text-sm font-bold text-white transition"
                >
                  <Pencil className="h-4 w-4" /> Edit Profile
                </button>
                <button
                  onClick={() => setSelectedExhibitor(null)}
                  className="flex-1 rounded-full border border-white/10 py-3 text-sm font-semibold text-zinc-300 hover:bg-white/5 transition"
                >
                  Close Drawer
                </button>
              </div>
            </div>
          </div>
    </ModalPortal>,
          document.body
        )}

      {/* Add / Edit Form Modal (centered) */}
      {modalOpen &&
        mounted &&
        createPortal(
          <ModalPortal>
      <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto overscroll-contain bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
            <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-zinc-950 border border-white/10 p-6 shadow-2xl text-white">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <h3 className="text-lg font-black uppercase tracking-wider brand-gradient-text">
                  {editingExhibitor ? "Edit Exhibitor Registration" : "Register Exhibitor"}
                </h3>
                <button onClick={() => { setEditingExhibitor(null); setModalOpen(false); }} className="text-zinc-400 hover:text-white transition">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSave} className="mt-5 grid gap-4">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-zinc-300">Company Name*</label>
                  <input
                    type="text"
                    required
                    value={formCompany}
                    onChange={(e) => setFormCompany(e.target.value)}
                    className={FIELD_CLASS}
                    placeholder="e.g. Zenith Software"
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
                      placeholder="e.g. B04"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-zinc-300">Zone</label>
                    <select
                      value={formZone}
                      onChange={(e) => setFormZone(e.target.value)}
                      className={FIELD_CLASS}
                    >
                      {ZONES.slice(1).map((z) => (
                        <option key={z} value={z} className="bg-zinc-950 text-white">
                          {z}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="border-t border-white/10 pt-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-zinc-400 mb-3">Primary Contact Representative</h4>
                  <div className="grid gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-zinc-300">Representative Name</label>
                      <input
                        type="text"
                        required
                        value={formRepName}
                        onChange={(e) => setFormRepName(e.target.value)}
                        className={FIELD_CLASS}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-zinc-300">Email Address</label>
                        <input
                          type="email"
                          required
                          value={formRepEmail}
                          onChange={(e) => setFormRepEmail(e.target.value)}
                          className={FIELD_CLASS}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-zinc-300">Phone Number</label>
                        <input
                          type="text"
                          required
                          value={formRepPhone}
                          onChange={(e) => setFormRepPhone(e.target.value)}
                          className={FIELD_CLASS}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-white/10 pt-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-zinc-400 mb-3">Stand Requirements</h4>
                  <div className="grid gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-zinc-300">Electrical Socket Specifications</label>
                      <input
                        type="text"
                        value={formElectrical}
                        onChange={(e) => setFormElectrical(e.target.value)}
                        className={FIELD_CLASS}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-zinc-300">Furniture Request Details</label>
                      <input
                        type="text"
                        value={formFurniture}
                        onChange={(e) => setFormFurniture(e.target.value)}
                        className={FIELD_CLASS}
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-white/10 pt-3 grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-zinc-300">Stand Invoice Status</label>
                    <select
                      value={formInvoice}
                      onChange={(e) => setFormInvoice(e.target.value as any)}
                      className={FIELD_CLASS}
                    >
                      <option value="Paid" className="bg-zinc-950 text-white">Paid</option>
                      <option value="Pending" className="bg-zinc-950 text-white">Pending</option>
                      <option value="Overdue" className="bg-zinc-950 text-white">Overdue</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-zinc-300">Graphics Submitted</label>
                    <select
                      value={formArtwork ? "true" : "false"}
                      onChange={(e) => setFormArtwork(e.target.value === "true")}
                      className={FIELD_CLASS}
                    >
                      <option value="true" className="bg-zinc-950 text-white">Yes, Reviewed & Approved</option>
                      <option value="false" className="bg-zinc-950 text-white">No, Outstanding</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-3 border-t border-white/10 pt-4 mt-2">
                  <button
                    type="button"
                    onClick={() => { setEditingExhibitor(null); setModalOpen(false); }}
                    className="rounded-full border border-white/10 px-5 py-2.5 text-sm font-semibold text-zinc-300 hover:bg-white/5 hover:text-white transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-full btn-brand-gradient px-6 py-2.5 text-sm font-bold text-white transition"
                  >
                    Save Profile
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