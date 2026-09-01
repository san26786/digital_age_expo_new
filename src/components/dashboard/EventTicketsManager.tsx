"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios, { isAxiosError } from "axios";
import { Plus, Pencil, Trash2, X, Star, Ban } from "lucide-react";
import { eventTicketSchema, type EventTicketInput } from "@/lib/validations/eventTicket";
import type { EventTicketRow } from "@/lib/services/eventTickets";
import { TablePagination } from "@/components/dashboard/TablePagination";

import { ModalPortal } from "@/components/ui/ModalPortal";
const PAGE_SIZE = 20;

const FIELD_CLASS =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-brand-pink focus:outline-none transition-all";

interface FormDefaults extends Partial<EventTicketInput> {
  id?: number;
}

function TicketFormModal({
  defaultValues,
  onClose,
  onSaved,
}: {
  defaultValues?: FormDefaults;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isEdit = typeof defaultValues?.id === "number";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EventTicketInput>({
    resolver: zodResolver(eventTicketSchema) as any,
    defaultValues: {
      name: defaultValues?.name ?? "",
      sub_title: defaultValues?.sub_title ?? "",
      description: defaultValues?.description ?? "",
      additional_info: defaultValues?.additional_info ?? "",
      amount: defaultValues?.amount ?? "",
      apply_early_bird: defaultValues?.apply_early_bird ?? false,
      early_bird_discount: defaultValues?.early_bird_discount ?? "",
      group_ticket_price: defaultValues?.group_ticket_price ?? "",
      max_attendees_allow: defaultValues?.max_attendees_allow ?? "",
      sequence: defaultValues?.sequence ?? "",
      active: defaultValues?.active ?? true,
      featured_ticket: defaultValues?.featured_ticket ?? false,
      sold_out_ticket: defaultValues?.sold_out_ticket ?? false,
    },
  });

  async function onSubmit(data: EventTicketInput) {
    setErrorMessage(null);
    try {
      if (isEdit) {
        await axios.patch(`/api/members/event-tickets/${defaultValues!.id}`, data);
      } else {
        await axios.post("/api/members/event-tickets", data);
      }
      onSaved();
    } catch (err) {
      setErrorMessage(
        isAxiosError(err) && typeof err.response?.data?.error === "string"
          ? err.response.data.error
          : "Could not save this ticket. Please check the form and try again."
      );
    }
  }

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto overscroll-contain bg-black/80 p-4 backdrop-blur-xl">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/10 bg-zinc-900 p-8 shadow-2xl animate-in fade-in zoom-in duration-300">
        <div className="flex items-center justify-between border-b border-white/10 pb-6 mb-6">
          <h3 className="text-xl font-black uppercase tracking-tight text-white">{isEdit ? "Edit Ticket" : "Add Ticket"}</h3>
          <button onClick={onClose} className="rounded-full bg-white/5 p-2 text-zinc-500 hover:text-white transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6">
          <div>
            <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-zinc-500">Ticket Title*</label>
            <input {...register("name")} className={FIELD_CLASS} placeholder="e.g. Standard Entry" />
            {errors.name && <p className="mt-1 text-xs font-bold text-red-400">{errors.name.message}</p>}
          </div>

          <div>
            <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-zinc-500">Subtitle</label>
            <input {...register("sub_title")} className={FIELD_CLASS} placeholder="e.g. Full event access" />
          </div>

          <div>
            <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-zinc-500">Description</label>
            <textarea {...register("description")} rows={3} className={`${FIELD_CLASS} resize-none`} />
          </div>

          <div>
            <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-zinc-500">Additional Information</label>
            <textarea {...register("additional_info")} rows={2} className={`${FIELD_CLASS} resize-none`} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-zinc-500">Regular Price (£)</label>
              <input {...register("amount")} className={FIELD_CLASS} placeholder="0.00" />
            </div>
            <div>
              <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-zinc-500">Group Price (£)</label>
              <input {...register("group_ticket_price")} className={FIELD_CLASS} placeholder="0.00" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-zinc-500">Early Bird (%)</label>
              <input {...register("early_bird_discount")} className={FIELD_CLASS} placeholder="0" />
            </div>
            <div>
              <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-zinc-500">Max in Group</label>
              <input {...register("max_attendees_allow")} className={FIELD_CLASS} placeholder="1" />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-zinc-500">Display Order (Sequence)</label>
            <input {...register("sequence")} className={FIELD_CLASS} placeholder="10" />
          </div>

          <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
            <label className="flex items-center gap-3 cursor-pointer group">
              <input type="checkbox" {...register("apply_early_bird")} className="h-5 w-5 rounded-lg border-white/10 bg-zinc-800 text-brand-pink focus:ring-brand-pink focus:ring-offset-0" />
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-300 group-hover:text-white transition">Early Bird</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer group">
              <input type="checkbox" {...register("active")} className="h-5 w-5 rounded-lg border-white/10 bg-zinc-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0" />
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-300 group-hover:text-white transition">Active</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer group">
              <input type="checkbox" {...register("featured_ticket")} className="h-5 w-5 rounded-lg border-white/10 bg-zinc-800 text-amber-500 focus:ring-amber-500 focus:ring-offset-0" />
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-300 group-hover:text-white transition">Featured</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer group">
              <input type="checkbox" {...register("sold_out_ticket")} className="h-5 w-5 rounded-lg border-white/10 bg-zinc-800 text-red-500 focus:ring-red-500 focus:ring-offset-0" />
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-300 group-hover:text-white transition">Sold Out</span>
            </label>
          </div>

          {errorMessage && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-xs font-bold text-red-400">
              {errorMessage}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-6 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/10 bg-white/5 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:bg-white/10 hover:text-white transition shadow-xl"
            >
              Discard
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-brand-gradient rounded-full px-8 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-2xl transition hover:scale-105 disabled:opacity-60"
            >
              {isSubmitting ? "Processing..." : isEdit ? "Save Ticket" : "Create Ticket"}
            </button>
          </div>
        </form>
      </div>
    </div>
    </ModalPortal>
  );
}

export function EventTicketsManager({ tickets }: { tickets: EventTicketRow[] }) {
  const router = useRouter();
  const [modalTicket, setModalTicket] = useState<EventTicketRow | "new" | null>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const paged = useMemo(
    () => tickets.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [tickets, page]
  );

  async function remove(id: number) {
    if (!window.confirm("Remove this ticket type? This cannot be undone.")) return;
    setPendingId(id);
    setErrorMessage(null);
    try {
      await axios.delete(`/api/members/event-tickets/${id}`);
      router.refresh();
    } catch {
      setErrorMessage("Could not remove this ticket. Please try again.");
    } finally {
      setPendingId(null);
    }
  }

  function handleSaved() {
    setModalTicket(null);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <p className="text-sm font-medium text-zinc-400 max-w-xl">Ticket types attendees can buy for this event.</p>
        <button
          onClick={() => setModalTicket("new")}
          className="btn-brand-gradient inline-flex shrink-0 items-center gap-2 rounded-full px-6 py-3 text-sm font-black uppercase tracking-widest text-white shadow-2xl transition hover:scale-105"
        >
          <Plus className="h-4 w-4" />
          Add Ticket
        </button>
      </div>

      {errorMessage && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-400 font-bold">
          {errorMessage}
        </div>
      )}

      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-gradient-to-r from-brand-purple to-brand-pink text-white">
                <th className="px-6 py-4 font-black uppercase tracking-wider">Ticket</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Price</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Early Bird</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider text-right">Manage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {tickets.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-zinc-500 italic font-medium">
                    No ticket types have been set up for this event yet.
                  </td>
                </tr>
              )}
              {paged.map((ticket) => (
                <tr key={ticket.id} className="align-top hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2 font-black text-white tracking-tight uppercase">
                      {ticket.name}
                      {ticket.featuredTicket && <Star className="h-4 w-4 text-amber-500 fill-amber-500/20" aria-label="Featured" />}
                      {ticket.soldOutTicket && <Ban className="h-4 w-4 text-red-500" aria-label="Sold out" />}
                    </div>
                    {ticket.subTitle && <div className="text-zinc-500 text-[10px] font-bold mt-1 uppercase tracking-wider">{ticket.subTitle}</div>}
                  </td>
                  <td className="px-6 py-5">
                    <div className="text-white font-black">£{ticket.amount ?? "0.00"}</div>
                    {ticket.groupTicketPrice && <div className="text-zinc-500 text-[10px] font-bold mt-1 uppercase tracking-wider">Group: £{ticket.groupTicketPrice}</div>}
                  </td>
                  <td className="px-6 py-5 text-zinc-400 font-bold tracking-widest">
                    {ticket.applyEarlyBird ? `${ticket.earlyBirdDiscount ?? 0}%` : "—"}
                  </td>
                  <td className="px-6 py-5">
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest border shadow-lg ${
                        ticket.active 
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                          : "bg-white/5 text-zinc-500 border-white/10"
                      }`}
                    >
                      {ticket.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setModalTicket(ticket)}
                        className="inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-300 hover:bg-white/10 hover:text-white transition shadow-xl"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </button>
                      <button
                        disabled={pendingId === ticket.id}
                        onClick={() => remove(ticket.id)}
                        className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 border border-red-500/20 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-red-400 hover:bg-red-500/20 transition shadow-xl disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <TablePagination currentPage={page} totalItems={tickets.length} pageSize={PAGE_SIZE} onPageChange={setPage} className="px-6 pb-6" />
      </div>

      {modalTicket && (
        <TicketFormModal
          defaultValues={
            modalTicket === "new"
              ? undefined
              : {
                  id: modalTicket.id,
                  name: modalTicket.name,
                  sub_title: modalTicket.subTitle,
                  description: modalTicket.description ?? "",
                  additional_info: modalTicket.additionalInfo ?? "",
                  amount: modalTicket.amount ?? "",
                  apply_early_bird: modalTicket.applyEarlyBird,
                  early_bird_discount: modalTicket.earlyBirdDiscount ?? "",
                  group_ticket_price: modalTicket.groupTicketPrice ?? "",
                  max_attendees_allow: modalTicket.maxAttendeesAllow ?? "",
                  sequence: modalTicket.sequence ?? "",
                  active: modalTicket.active,
                  featured_ticket: modalTicket.featuredTicket,
                  sold_out_ticket: modalTicket.soldOutTicket,
                }
          }
          onClose={() => setModalTicket(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
