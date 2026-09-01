"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Award,
  Search,
  Filter,
  Plus,
  Download,
  Users,
  CheckCircle2,
  Clock,
  Shield,
  Eye,
  Edit,
  Trash2,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  X,
  Mail,
  RefreshCw,
} from "lucide-react";
import type { EventPartnerItem } from "@/lib/services/eventPartners";

import { ModalPortal } from "@/components/ui/ModalPortal";
interface EventPartnersManagerProps {
  eventId: number;
  initialPartners: EventPartnerItem[];
  counts: { total: number; registered: number; joined: number; pending: number };
  isOrganiser: boolean;
  isFranchise: boolean;
}

export function EventPartnersManager({
  eventId,
  initialPartners,
  counts,
  isOrganiser,
  isFranchise,
}: EventPartnersManagerProps) {
  const [partners, setPartners] = useState<EventPartnerItem[]>(initialPartners);
  const [keyword, setKeyword] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<EventPartnerItem | null>(null);

  // Modal is portaled to document.body, so it must wait for client mount
  // before rendering (document isn't available during SSR).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [business, setBusiness] = useState("");
  const [position, setPosition] = useState("");

  const filteredPartners = partners.filter((p) => {
    const matchKeyword =
      !keyword ||
      p.name?.toLowerCase().includes(keyword.toLowerCase()) ||
      p.business?.toLowerCase().includes(keyword.toLowerCase()) ||
      p.email?.toLowerCase().includes(keyword.toLowerCase()) ||
      p.phone?.toLowerCase().includes(keyword.toLowerCase());

    const matchFilter =
      filterType === "all" ||
      (filterType === "registered" && p.isEnable === 1) ||
      (filterType === "joined" && p.joiningStatus === "Joined") ||
      (filterType === "pending" && p.joiningStatus === "Pending");

    return matchKeyword && matchFilter;
  });

  const handleOpenAdd = () => {
    setEditingPartner(null);
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setBusiness("");
    setPosition("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: EventPartnerItem) => {
    setEditingPartner(p);
    setFirstName(p.firstName || "");
    setLastName(p.lastName || "");
    setEmail(p.email || "");
    setPhone(p.phone || "");
    setBusiness(p.business || "");
    setPosition(p.position || "");
    setIsModalOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this partner?")) {
      setPartners(partners.filter((p) => p.id !== id));
    }
  };

  const handleToggleApprove = (id: number) => {
    setPartners(
      partners.map((p) =>
        p.id === id ? { ...p, isEnable: p.isEnable === 1 ? 0 : 1 } : p
      )
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fullName = `${firstName} ${lastName}`.trim();
    if (editingPartner) {
      setPartners(
        partners.map((p) =>
          p.id === editingPartner.id
            ? {
                ...p,
                firstName,
                lastName,
                name: fullName,
                email,
                phone,
                business,
                position,
              }
            : p
        )
      );
      alert("Partner updated successfully!");
    } else {
      const newPartner: EventPartnerItem = {
        id: Date.now(),
        eventId,
        name: fullName,
        firstName,
        lastName,
        email,
        phone,
        business,
        position,
        status: "active",
        joiningStatus: "Pending",
        isEnable: 1,
        partnerLogo: null,
        date: new Date(),
      };
      setPartners([newPartner, ...partners]);
      alert("Awards partner added successfully!");
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-8 animate-fade-in text-white">
      {/* Stat Cards / Filter Navigation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => setFilterType("registered")}
          className={`glass-panel rounded-2xl p-5 border text-left transition-all hover:scale-[1.02] cursor-pointer ${
            filterType === "registered" ? "border-fuchsia-500 bg-fuchsia-950/30 shadow-lg shadow-fuchsia-500/20" : "border-white/10"
          }`}
        >
          <div className="flex items-center justify-between text-zinc-400 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Register Partner</span>
            <div className="h-8 w-8 rounded-xl bg-olive-500/20 flex items-center justify-center text-emerald-400 bg-emerald-500/10">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-white">{counts.registered}</p>
          <p className="text-[11px] text-emerald-400 font-medium mt-1">Active registered entries</p>
        </button>

        <button
          type="button"
          onClick={() => setFilterType("all")}
          className={`glass-panel rounded-2xl p-5 border text-left transition-all hover:scale-[1.02] cursor-pointer ${
            filterType === "all" ? "border-fuchsia-500 bg-fuchsia-950/30 shadow-lg shadow-fuchsia-500/20" : "border-white/10"
          }`}
        >
          <div className="flex items-center justify-between text-zinc-400 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Total Partner</span>
            <div className="h-8 w-8 rounded-xl bg-green-500/10 flex items-center justify-center text-green-400">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-white">{counts.total}</p>
          <p className="text-[11px] text-green-400 font-medium mt-1">All event partners</p>
        </button>

        <button
          type="button"
          onClick={() => setFilterType("joined")}
          className={`glass-panel rounded-2xl p-5 border text-left transition-all hover:scale-[1.02] cursor-pointer ${
            filterType === "joined" ? "border-fuchsia-500 bg-fuchsia-950/30 shadow-lg shadow-fuchsia-500/20" : "border-white/10"
          }`}
        >
          <div className="flex items-center justify-between text-zinc-400 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Register Accounts</span>
            <div className="h-8 w-8 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
              <Shield className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-white">{counts.joined}</p>
          <p className="text-[11px] text-purple-400 font-medium mt-1">Joined user accounts</p>
        </button>

        <button
          type="button"
          onClick={() => setFilterType("pending")}
          className={`glass-panel rounded-2xl p-5 border text-left transition-all hover:scale-[1.02] cursor-pointer ${
            filterType === "pending" ? "border-fuchsia-500 bg-fuchsia-950/30 shadow-lg shadow-fuchsia-500/20" : "border-white/10"
          }`}
        >
          <div className="flex items-center justify-between text-zinc-400 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Pending Accounts</span>
            <div className="h-8 w-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-white">{counts.pending}</p>
          <p className="text-[11px] text-amber-400 font-medium mt-1">Awaiting verification</p>
        </button>
      </div>

      {/* Toolbar & Search */}
      <div className="glass-panel rounded-2xl p-6 border border-white/10 shadow-2xl flex flex-col lg:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full lg:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Search partners by name, business, email..."
            className="w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-brand-pink focus:outline-none transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
          {isFranchise && (
            <button
              type="button"
              onClick={() => alert("Franchise register users imported successfully!")}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-zinc-300 hover:bg-white/10 hover:text-white transition flex items-center gap-2"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Import Franchise Users
            </button>
          )}
          <button
            type="button"
            onClick={() => alert("Partner export CSV downloaded successfully!")}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-zinc-300 hover:bg-white/10 hover:text-white transition flex items-center gap-2"
          >
            <Download className="h-3.5 w-3.5" /> Export
          </button>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="btn-sophisticated rounded-xl px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-lg flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> Add Partner
          </button>
        </div>
      </div>

      {/* Partners Table */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-200">
            <thead>
              <tr className="border-b border-white/10 bg-gradient-to-r from-brand-purple to-brand-pink text-white">
                <th className="px-6 py-4 font-black uppercase tracking-wider">Name</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Phone</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Business</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Position</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider text-center">Joining Status</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider text-right">Manages</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredPartners.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-zinc-400 italic font-medium">
                    No awards partners found for Event #{eventId}.
                  </td>
                </tr>
              ) : (
                filteredPartners.map((partner) => (
                  <tr key={partner.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 font-bold text-white flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-brand-purple to-brand-pink flex items-center justify-center text-white font-bold text-xs">
                        {partner.name ? partner.name.charAt(0).toUpperCase() : "P"}
                      </div>
                      <div>
                        <div>{partner.name || "Unnamed Partner"}</div>
                        <div className="text-[11px] text-zinc-400 font-normal">{partner.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-zinc-400">{partner.phone || "—"}</td>
                    <td className="px-6 py-4 font-semibold text-fuchsia-200">{partner.business || "—"}</td>
                    <td className="px-6 py-4 text-zinc-300">{partner.position || "—"}</td>
                    <td className="px-6 py-4 text-center">
                      {partner.joiningStatus === "Joined" ? (
                        <span className="inline-block rounded px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-white shadow-sm">
                          Joined
                        </span>
                      ) : (
                        <span className="inline-block rounded px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-amber-500 text-white shadow-sm">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(partner)}
                          title="Edit Partner"
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 border border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white transition"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleApprove(partner.id)}
                          title={partner.isEnable === 1 ? "Disapprove" : "Approve"}
                          className={`flex h-8 w-8 items-center justify-center rounded-lg border transition ${
                            partner.isEnable === 1
                              ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500 hover:text-white"
                              : "bg-amber-500/20 border-amber-500/30 text-amber-300 hover:bg-amber-500 hover:text-white"
                          }`}
                        >
                          {partner.isEnable === 1 ? <ThumbsDown className="h-3.5 w-3.5" /> : <ThumbsUp className="h-3.5 w-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(partner.id)}
                          title="Delete Partner"
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
      {isModalOpen &&
        mounted &&
        createPortal(
          <ModalPortal>
      <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto overscroll-contain bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
            <div className="glass-panel w-full max-w-lg rounded-3xl border border-white/20 p-6 shadow-2xl space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-purple to-brand-pink">
                    <Award className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black uppercase tracking-tight text-white">
                      {editingPartner ? "Edit Awards Partner" : "Add New Awards Partner"}
                    </h3>
                    <p className="text-xs text-zinc-400">Manage partner profile & details for Event #{eventId}</p>
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-fuchsia-300 mb-1.5">First Name</label>
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="First name"
                      className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-xs text-white focus:border-brand-pink focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-fuchsia-300 mb-1.5">Last Name</label>
                    <input
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Last name"
                      className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-xs text-white focus:border-brand-pink focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-fuchsia-300 mb-1.5">Email</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@example.com"
                      className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-xs text-white focus:border-brand-pink focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-fuchsia-300 mb-1.5">Phone</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+44 20 7946 0921"
                      className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-xs text-white focus:border-brand-pink focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-fuchsia-300 mb-1.5">Business Name</label>
                    <input
                      type="text"
                      value={business}
                      onChange={(e) => setBusiness(e.target.value)}
                      placeholder="Company Ltd"
                      className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-xs text-white focus:border-brand-pink focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-fuchsia-300 mb-1.5">Position</label>
                    <input
                      type="text"
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                      placeholder="Director"
                      className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-xs text-white focus:border-brand-pink focus:outline-none"
                    />
                  </div>
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
                    {editingPartner ? "Save Changes" : "Create Partner"}
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