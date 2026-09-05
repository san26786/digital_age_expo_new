"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  FileText,
  Search,
  Filter,
  Download,
  Mail,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Megaphone,
  Plus,
  Send,
  Check,
  X,
} from "lucide-react";
import type { EventInvoiceItem } from "@/lib/services/eventInvoices";

import { ModalPortal } from "@/components/ui/ModalPortal";
import { TablePagination } from "@/components/dashboard/TablePagination";
interface EventInvoicesManagerProps {
  eventId: number;
  invoices: EventInvoiceItem[];
  isFranchise: boolean;
}

/** Matches the row count the other admin tables page at. */
const PAGE_SIZE = 20;

export function EventInvoicesManager({ eventId, invoices, isFranchise }: EventInvoicesManagerProps) {
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [orderTypeFilter, setOrderTypeFilter] = useState("");
  const [selectedInvoices, setSelectedInvoices] = useState<number[]>([]);
  const [page, setPage] = useState(1);

  // Modals state
  const [activeModal, setActiveModal] = useState<"product" | "listing" | "feed" | "custom" | null>(null);
  const [activeItem, setActiveItem] = useState<EventInvoiceItem | null>(null);

  const filteredInvoices = useMemo(() => invoices.filter((inv) => {
    const matchKeyword =
      !keyword ||
      inv.name.toLowerCase().includes(keyword.toLowerCase()) ||
      inv.businessName?.toLowerCase().includes(keyword.toLowerCase()) ||
      inv.orderNumber?.toLowerCase().includes(keyword.toLowerCase()) ||
      inv.type.toLowerCase().includes(keyword.toLowerCase());

    const matchStatus = !statusFilter || inv.status.toLowerCase() === statusFilter.toLowerCase();
    const matchType = !orderTypeFilter || inv.type.toLowerCase().includes(orderTypeFilter.toLowerCase());

    return matchKeyword && matchStatus && matchType;
  }), [invoices, keyword, statusFilter, orderTypeFilter]);

  /*
   * Back to page 1 whenever the filters change.
   *
   * Without this, narrowing a 90-row list while sitting on page 5 leaves you on a page that no
   * longer exists and the table renders empty — which reads as "the filter found nothing".
   */
  useEffect(() => {
    setPage(1);
  }, [keyword, statusFilter, orderTypeFilter]);

  const pagedInvoices = useMemo(
    () => filteredInvoices.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filteredInvoices, page]
  );

  /*
   * Select-all covers THIS PAGE, not the whole filtered set.
   *
   * Before pagination the two were the same thing. Now they are not, and a checkbox that
   * silently selects 90 invoices when 20 are on screen is how someone bulk-mails the wrong
   * people. The header box reflects the visible rows for the same reason.
   */
  const pageIds = pagedInvoices.map((i) => i.id);
  const allOnPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedInvoices.includes(id));

  const toggleSelectAll = () => {
    if (allOnPageSelected) {
      setSelectedInvoices((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedInvoices((prev) => [...new Set([...prev, ...pageIds])]);
    }
  };

  const toggleSelect = (id: number) => {
    if (selectedInvoices.includes(id)) {
      setSelectedInvoices(selectedInvoices.filter((i) => i !== id));
    } else {
      setSelectedInvoices([...selectedInvoices, id]);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-white">
      {/* Search & Filter Toolbar */}
      <div className="glass-panel rounded-2xl p-6 border border-white/10 shadow-2xl space-y-4">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto flex-1">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Search invoices by keyword, name, order #..."
                className="w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-brand-pink focus:outline-none transition"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-xs text-white focus:border-brand-pink focus:outline-none transition"
            >
              <option value="" className="bg-zinc-900 text-white">All Statuses</option>
              <option value="paid" className="bg-zinc-900 text-white">Paid</option>
              <option value="unpaid" className="bg-zinc-900 text-white">Unpaid</option>
            </select>

            <select
              value={orderTypeFilter}
              onChange={(e) => setOrderTypeFilter(e.target.value)}
              className="rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-xs text-white focus:border-brand-pink focus:outline-none transition"
            >
              <option value="" className="bg-zinc-900 text-white">All Order Types</option>
              <option value="advertise" className="bg-zinc-900 text-white">Advertise</option>
              <option value="trade_show" className="bg-zinc-900 text-white">Trade Show</option>
              <option value="speed_networking" className="bg-zinc-900 text-white">Speed Networking</option>
              <option value="magazine_advert" className="bg-zinc-900 text-white">Magazine Advert</option>
              <option value="event_ticket" className="bg-zinc-900 text-white">Event Ticket</option>
            </select>
          </div>

          <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
            <a
              href={`/members/event_invoices?event_id=${eventId}&action=unpaid_invoices`}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-zinc-300 hover:bg-white/10 hover:text-white transition flex items-center gap-2"
            >
              <Download className="h-3.5 w-3.5" /> Export Unpaid Invoices
            </a>
          </div>
        </div>

        {/* Batch Action Bar if selected */}
        {selectedInvoices.length > 0 && (
          <div className="flex items-center justify-between rounded-xl bg-fuchsia-950/40 border border-fuchsia-500/30 px-4 py-3 animate-fade-in">
            <span className="text-xs font-extrabold text-fuchsia-200">
              {selectedInvoices.length} invoice(s) selected
            </span>
            <button
              type="button"
              className="btn-sophisticated rounded-xl px-4 py-1.5 text-xs font-black uppercase tracking-wider text-white shadow-lg"
              onClick={() => alert(`Marked ${selectedInvoices.length} invoices as paid!`)}
            >
              Mark Selected as Paid
            </button>
          </div>
        )}
      </div>

      {/* Invoices Table */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-200">
            <thead>
              <tr className="border-b border-white/10 bg-gradient-to-r from-brand-purple to-brand-pink text-white">
                <th className="px-6 py-4 font-black uppercase tracking-wider text-center w-12">
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    onChange={toggleSelectAll}
                    className="rounded border-white/20 bg-black/40 text-brand-pink focus:ring-0 cursor-pointer"
                  />
                </th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Order #</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Name</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Mobile</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Business Name</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Amount</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Payable</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider text-center">PS</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider text-center">Status</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider text-center">Used</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider text-right">Manage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-6 py-12 text-center text-zinc-400 italic font-medium">
                    No invoices found matching your criteria for Event #{eventId}.
                  </td>
                </tr>
              ) : (
                pagedInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-4 text-center">
                      <input
                        type="checkbox"
                        checked={selectedInvoices.includes(inv.id)}
                        onChange={() => toggleSelect(inv.id)}
                        className="rounded border-white/20 bg-black/40 text-brand-pink focus:ring-0 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-4 font-mono font-bold text-fuchsia-300">{inv.orderNumber}</td>
                    <td className="px-4 py-4 font-bold text-white">{inv.name}</td>
                    <td className="px-4 py-4 font-mono text-zinc-400">{inv.phone || "—"}</td>
                    <td className="px-4 py-4 font-semibold text-zinc-300">{inv.businessName || "—"}</td>
                    <td className="px-4 py-4 font-medium text-fuchsia-200 capitalize">{inv.type.replace(/_/g, " ")}</td>
                    <td className="px-4 py-4 font-mono font-bold text-white">£{inv.amount.toFixed(2)}</td>
                    <td className="px-4 py-4 font-mono font-bold text-emerald-400">£{inv.totalPayable.toFixed(2)}</td>
                    <td className="px-4 py-4 text-center">
                      {inv.paymentSubmitted ? (
                        <span className="inline-block rounded px-2 py-0.5 text-[10px] font-black uppercase bg-emerald-500 text-white shadow-sm">
                          Yes
                        </span>
                      ) : (
                        <span className="inline-block rounded px-2 py-0.5 text-[10px] font-black uppercase bg-rose-500 text-white shadow-sm">
                          No
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 font-mono text-zinc-400">
                      {inv.date ? new Date(inv.date).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-4 text-center">
                      {inv.status.toLowerCase() === "paid" ? (
                        <span className="inline-block rounded px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-white shadow-sm label-success">
                          Paid
                        </span>
                      ) : (
                        <span className="inline-block rounded px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-amber-500 text-white shadow-sm">
                          Unpaid
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center font-bold text-zinc-300">{inv.used ? "Yes" : "No"}</td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          title="Promote Now"
                          onClick={() => {
                            setActiveItem(inv);
                            setActiveModal("product");
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-fuchsia-500/25 border border-fuchsia-500/40 text-fuchsia-300 hover:bg-fuchsia-500 hover:text-white transition"
                        >
                          <Megaphone className="h-3.5 w-3.5" />
                        </button>
                        <a
                          href={`/members/event_invoices?event_id=${eventId}&action=view_invoice&type=${inv.type}&id=${inv.id}`}
                          target="_blank"
                          rel="noreferrer"
                          title="View Invoice"
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 border border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white transition"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </a>
                        <a
                          href={`/members/event_invoices?event_id=${eventId}&action=mail_invoice&type=${inv.type}&id=${inv.id}`}
                          title="Mail Invoice"
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 border border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white transition"
                        >
                          <Mail className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <TablePagination
          currentPage={page}
          totalItems={filteredInvoices.length}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          className="px-6 pb-6"
        />
      </div>

      {/* Newsletter Modals */}
      {activeModal && activeItem && (
        <ModalPortal>
      <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto overscroll-contain bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="glass-panel w-full max-w-lg rounded-3xl border border-white/20 p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-purple to-brand-pink">
                  <Megaphone className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase tracking-tight text-white">Add to Newsletter</h3>
                  <p className="text-xs text-zinc-400">Promote order #{activeItem.orderNumber} for {activeItem.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-fuchsia-300 mb-2">Select Promotion Item / Product</label>
                <select className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-xs text-white focus:border-brand-pink focus:outline-none">
                  <option value="1">Featured Product / Service #{activeItem.id}</option>
                  <option value="2">Exhibitor Spotlight Banner</option>
                  <option value="3">Special Event Pass Voucher</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-zinc-300 hover:bg-white/10 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    alert("Promotion block added to newsletter successfully!");
                    setActiveModal(null);
                  }}
                  className="btn-sophisticated rounded-xl px-6 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-lg"
                >
                  Submit Promotion
                </button>
              </div>
            </div>
          </div>
        </div>
    </ModalPortal>
      )}
    </div>
  );
}
