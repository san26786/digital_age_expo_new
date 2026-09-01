"use client";

import { useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios, { isAxiosError } from "axios";
import { Plus, Pencil, Trash2, Search, X } from "lucide-react";
import { eventPromotionSchema, PROMOTION_STATUSES, type EventPromotionInput } from "@/lib/validations/eventPromotion";
import type { PromotionRow } from "@/lib/services/eventPromotions";
import { TablePagination } from "@/components/dashboard/TablePagination";

import { ModalPortal } from "@/components/ui/ModalPortal";
const PAGE_SIZE = 20;

const FIELD_CLASS =
  "w-full rounded-xl border border-white/15 bg-zinc-950/85 px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-brand-pink focus:ring-1 focus:ring-brand-pink/30 focus:outline-none transition";

const STATUS_BADGE: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full text-xs font-bold",
  pending: "bg-amber-500/15 text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-full text-xs font-bold",
  inactive: "bg-red-500/15 text-red-400 border border-red-500/20 px-2.5 py-1 rounded-full text-xs font-bold",
};

interface FormDefaults extends Partial<EventPromotionInput> {
  id?: number;
}

function PromotionFormModal({
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

  // Modal is portaled to document.body, so it must wait for client mount
  // before rendering (document isn't available during SSR).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EventPromotionInput>({
    resolver: zodResolver(eventPromotionSchema) as any,
    defaultValues: {
      title: defaultValues?.title ?? "",
      description: defaultValues?.description ?? "",
      first_name: defaultValues?.first_name ?? "",
      last_name: defaultValues?.last_name ?? "",
      business: defaultValues?.business ?? "",
      email: defaultValues?.email ?? "",
      phone: defaultValues?.phone ?? "",
      position: defaultValues?.position ?? "",
      advert_size: defaultValues?.advert_size ?? "",
      publication_category: defaultValues?.publication_category ?? "",
      image: defaultValues?.image ?? "",
      status: defaultValues?.status ?? "pending",
    },
  });

  async function onSubmit(data: EventPromotionInput) {
    setErrorMessage(null);
    try {
      if (isEdit) {
        await axios.patch(`/api/members/event-promotions/${defaultValues!.id}`, data);
      } else {
        await axios.post("/api/members/event-promotions", data);
      }
      onSaved();
    } catch (err) {
      setErrorMessage(
        isAxiosError(err) && typeof err.response?.data?.error === "string"
          ? err.response.data.error
          : "Could not save this promotion. Please check the form and try again."
      );
    }
  }

  if (!mounted) return null;

  return createPortal(
    <ModalPortal>
      <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto overscroll-contain bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-zinc-950 border border-white/10 p-6 shadow-2xl text-white">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <h3 className="text-lg font-black uppercase tracking-wider brand-gradient-text">
            {isEdit ? "Edit Promotion" : "Add Promotion"}
          </h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-5 grid gap-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-zinc-300">Title*</label>
            <input {...register("title")} className={FIELD_CLASS} />
            {errors.title && <p className="mt-1 text-xs text-red-400">{errors.title.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-zinc-300">Description</label>
            <textarea {...register("description")} rows={3} className={FIELD_CLASS} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-zinc-300">First Name</label>
              <input {...register("first_name")} className={FIELD_CLASS} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-zinc-300">Last Name</label>
              <input {...register("last_name")} className={FIELD_CLASS} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-zinc-300">Business</label>
              <input {...register("business")} className={FIELD_CLASS} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-zinc-300">Email</label>
              <input {...register("email")} type="email" className={FIELD_CLASS} />
              {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-zinc-300">Phone</label>
              <input {...register("phone")} className={FIELD_CLASS} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-zinc-300">Position</label>
              <input {...register("position")} className={FIELD_CLASS} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-zinc-300">Advert Size</label>
              <input {...register("advert_size")} className={FIELD_CLASS} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-zinc-300">Publication Category</label>
              <input {...register("publication_category")} className={FIELD_CLASS} />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-zinc-300">Sample / Image URL</label>
            <input {...register("image")} className={FIELD_CLASS} placeholder="https://..." />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-zinc-300">Status</label>
            <select {...register("status")} className={FIELD_CLASS}>
              {PROMOTION_STATUSES.map((s) => (
                <option key={s} value={s} className="bg-zinc-950 text-white">
                  {s[0].toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {errorMessage && <p className="text-sm text-red-400 font-medium">{errorMessage}</p>}

          <div className="flex justify-end gap-3 border-t border-white/10 pt-4 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/10 px-5 py-2.5 text-sm font-semibold text-zinc-300 hover:bg-white/5 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-full btn-brand-gradient px-6 py-2.5 text-sm font-bold text-white transition disabled:opacity-60"
            >
              {isSubmitting ? "Saving..." : isEdit ? "Save Changes" : "Add Promotion"}
            </button>
          </div>
        </form>
      </div>
    </div>
    </ModalPortal>,
    document.body
  );
}

export function EventPromotionsManager({ promotions }: { promotions: PromotionRow[] }) {
  const router = useRouter();
  const [modalPromotion, setModalPromotion] = useState<PromotionRow | "new" | null>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return promotions;
    return promotions.filter((p) =>
      [p.title, p.business, p.email, p.status].filter(Boolean).some((field) => field!.toLowerCase().includes(q))
    );
  }, [promotions, keyword]);

  useEffect(() => {
    setPage(1);
  }, [keyword]);

  const paged = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  );

  async function remove(id: number) {
    if (!window.confirm("Remove this promotion? This cannot be undone.")) return;
    setPendingId(id);
    setErrorMessage(null);
    try {
      await axios.delete(`/api/members/event-promotions/${id}`);
      router.refresh();
    } catch {
      setErrorMessage("Could not remove this promotion. Please try again.");
    } finally {
      setPendingId(null);
    }
  }

  function handleSaved() {
    setModalPromotion(null);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <p className="text-sm text-zinc-400 font-medium">Promotional offers and codes for this event.</p>
        <button
          onClick={() => setModalPromotion("new")}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full btn-brand-gradient px-5 py-2.5 text-sm font-bold text-white transition"
        >
          <Plus className="h-4 w-4" />
          Add Promotion
        </button>
      </div>

      {errorMessage && <p className="text-sm text-red-400 font-medium">{errorMessage}</p>}

      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-950/60 px-3 py-2">
        <Search className="h-4 w-4 shrink-0 text-zinc-500" />
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Search by title, business, email or status…"
          className="w-full bg-transparent text-sm text-white placeholder:text-zinc-500 focus:outline-none"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/10 bg-zinc-950/40 backdrop-blur-md">
        <table className="w-full min-w-[820px] text-left text-sm text-zinc-300">
          <thead>
            <tr className="border-b border-white/10 bg-gradient-to-r from-brand-purple to-brand-pink text-white">
              <th className="px-6 py-4 font-black uppercase tracking-wider">Title</th>
              <th className="px-6 py-4 font-black uppercase tracking-wider">Business</th>
              <th className="px-6 py-4 font-black uppercase tracking-wider">Contact</th>
              <th className="px-6 py-4 font-black uppercase tracking-wider">Category</th>
              <th className="px-6 py-4 font-black uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 font-black uppercase tracking-wider">Manage</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-zinc-500 font-medium">
                  {promotions.length === 0 ? "No promotions have been added for this event yet." : "No promotions match your search."}
                </td>
              </tr>
            )}
            {paged.map((promotion) => (
              <tr key={promotion.id} className="hover:bg-white/5 border-b border-white/5 transition align-middle">
                <td className="px-5 py-4 font-bold text-white">{promotion.title || "—"}</td>
                <td className="px-5 py-4 text-zinc-300 font-semibold">{promotion.business || "—"}</td>
                <td className="px-5 py-4 text-zinc-300">
                  <div className="text-white font-bold">{promotion.email || "—"}</div>
                  <div className="text-zinc-500 text-xs mt-0.5">{promotion.phone || ""}</div>
                </td>
                <td className="px-5 py-4 text-zinc-300">
                  <span className="rounded-full bg-brand-pink/10 px-2.5 py-1 text-xs font-bold text-brand-pink border border-brand-pink/20">
                    {promotion.publicationCategory || "General"}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <span className={promotion.status ? STATUS_BADGE[promotion.status] : "bg-white/5 text-zinc-400 border border-white/10 px-2.5 py-1 rounded-full text-xs font-bold"}>
                    {promotion.status ?? "—"}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setModalPromotion(promotion)}
                      className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-zinc-200 hover:bg-brand-pink hover:text-white hover:border-brand-pink transition"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </button>
                    <button
                      disabled={pendingId === promotion.id}
                      onClick={() => remove(promotion.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-400 hover:bg-red-500 hover:text-white transition disabled:opacity-50"
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

      <TablePagination currentPage={page} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} className="mt-4" />

      {modalPromotion && (
        <PromotionFormModal
          defaultValues={
            modalPromotion === "new"
              ? undefined
              : {
                  id: modalPromotion.id,
                  title: modalPromotion.title ?? "",
                  description: modalPromotion.description ?? "",
                  first_name: modalPromotion.firstName ?? "",
                  last_name: modalPromotion.lastName ?? "",
                  business: modalPromotion.business ?? "",
                  email: modalPromotion.email ?? "",
                  phone: modalPromotion.phone ?? "",
                  position: modalPromotion.position ?? "",
                  advert_size: modalPromotion.advertSize ?? "",
                  publication_category: modalPromotion.publicationCategory ?? "",
                  image: modalPromotion.image ?? "",
                  status: (modalPromotion.status as (typeof PROMOTION_STATUSES)[number]) ?? "pending",
                }
          }
          onClose={() => setModalPromotion(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}