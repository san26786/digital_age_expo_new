"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios, { isAxiosError } from "axios";
import { Plus, Search, X, Pencil, Trash2, Download, ImagePlus } from "lucide-react";
import {
  leadershipBoardSchema,
  LEADERSHIP_BOARD_TYPES,
  LEADERSHIP_BOARD_TYPE_LABELS,
  type LeadershipBoardInput,
} from "@/lib/validations/leadershipBoard";
import type { LeadershipBoardRow } from "@/lib/services/leadershipBoard";
import { TablePagination } from "@/components/dashboard/TablePagination";
import { assetUrl } from "@/lib/assets";

import { ModalPortal } from "@/components/ui/ModalPortal";
const PAGE_SIZE = 20;

const FIELD_CLASS =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-brand-pink focus:outline-none transition-colors backdrop-blur-md";

function extractErrorMessage(err: unknown): string {
  if (!isAxiosError(err)) return "Could not save this entry. Please check the form and try again.";
  const apiError = err.response?.data?.error;
  if (typeof apiError === "string") return apiError;
  return "Could not save this entry. Please check the form and try again.";
}

function toDateInputValue(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

interface FormDefaults extends Partial<LeadershipBoardInput> {
  id?: number;
  image?: string | null;
}

function LeadershipBoardFormModal({
  defaultValues,
  onClose,
  onSaved,
}: {
  defaultValues?: FormDefaults;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(defaultValues?.image ?? null);
  const isEdit = typeof defaultValues?.id === "number";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LeadershipBoardInput>({
    resolver: zodResolver(leadershipBoardSchema) as any,
    defaultValues: {
      title: defaultValues?.title ?? "",
      description: defaultValues?.description ?? "",
      first_name: defaultValues?.first_name ?? "",
      last_name: defaultValues?.last_name ?? "",
      business: defaultValues?.business ?? "",
      position: defaultValues?.position ?? "",
      type: defaultValues?.type ?? "leadership_board",
      issue_date: defaultValues?.issue_date ?? "",
      expiry_date: defaultValues?.expiry_date ?? "",
    },
  });

  function onPickImage(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setImageFile(file);
    if (file) setImagePreview(URL.createObjectURL(file));
  }

  async function uploadImage(id: number) {
    if (!imageFile) return;
    const formData = new FormData();
    formData.append("file", imageFile);
    formData.append("id", String(id));
    await axios.post("/api/members/leadership-board/upload", formData);
  }

  async function onSubmit(data: LeadershipBoardInput) {
    setErrorMessage(null);
    try {
      let id = defaultValues?.id;
      if (isEdit && id) {
        await axios.patch(`/api/members/leadership-board/${id}`, data);
      } else {
        const res = await axios.post("/api/members/leadership-board", data);
        id = res.data.id;
      }
      if (id && imageFile) {
        await uploadImage(id);
      }
      onSaved();
    } catch (err) {
      setErrorMessage(extractErrorMessage(err));
    }
  }

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto overscroll-contain bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-zinc-900 border border-white/10 p-8 shadow-2xl space-y-8">
        <div className="flex items-center justify-between border-b border-white/5 pb-6">
          <div className="space-y-1">
            <h3 className="text-xl font-black uppercase tracking-widest text-white">
              {isEdit ? "Edit Leader" : "Add New Leader"}
            </h3>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Leadership Board Entry</p>
          </div>
          <button onClick={onClose} className="rounded-full h-10 w-10 flex items-center justify-center bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition-all">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">First Name</label>
              <input {...register("first_name")} className={FIELD_CLASS} placeholder="e.g. John" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Last Name</label>
              <input {...register("last_name")} className={FIELD_CLASS} placeholder="e.g. Doe" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Professional Title*</label>
            <input {...register("title")} className={FIELD_CLASS} placeholder="e.g. CEO & Founder" />
            {errors.title && <p className="mt-1 text-xs font-bold text-red-500">{errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Biography / Description*</label>
            <textarea {...register("description")} rows={4} className={FIELD_CLASS} placeholder="A brief professional overview..." />
            {errors.description && <p className="mt-1 text-xs font-bold text-red-500">{errors.description.message}</p>}
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Business / Company</label>
              <input {...register("business")} className={FIELD_CLASS} placeholder="Company Name" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Specific Position</label>
              <input {...register("position")} className={FIELD_CLASS} placeholder="Job Role" />
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Category</label>
              <select {...register("type")} className={FIELD_CLASS}>
                {LEADERSHIP_BOARD_TYPES.map((t) => (
                  <option key={t} value={t} className="bg-zinc-900">
                    {LEADERSHIP_BOARD_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Issue Date</label>
              <input type="date" {...register("issue_date")} className={FIELD_CLASS} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Expiry Date</label>
              <input type="date" {...register("expiry_date")} className={FIELD_CLASS} />
            </div>
          </div>

          <div className="space-y-4 pt-4">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Profile Portrait</label>
            <div className="flex items-center gap-6">
              <div className="relative group">
                {imagePreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imagePreview} alt="" className="h-24 w-24 rounded-2xl border border-white/10 object-cover shadow-2xl transition group-hover:opacity-50" />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/5 text-zinc-600 transition group-hover:bg-white/10">
                    <ImagePlus className="h-8 w-8" />
                  </div>
                )}
                <label className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <Plus className="h-6 w-6 text-white" />
                  <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={onPickImage} />
                </label>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-zinc-300">Photo Upload</p>
                <p className="text-[10px] text-zinc-500">JPG, PNG or WEBP. Max 2MB.</p>
              </div>
            </div>
          </div>

          {errorMessage && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold">
              {errorMessage}
            </div>
          )}

          <div className="flex justify-end gap-4 border-t border-white/5 pt-8">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/10 bg-white/5 px-8 py-3.5 text-xs font-black uppercase tracking-widest text-zinc-300 transition hover:bg-white/10 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-full bg-brand-pink px-10 py-3.5 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-brand-pink/20 transition hover:scale-[1.02] active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? "Processing..." : isEdit ? "Save Profile" : "Add to Board"}
            </button>
          </div>
        </form>
      </div>
    </div>
    </ModalPortal>
  );
}

export function LeadershipBoardManager({ entries }: { entries: LeadershipBoardRow[] }) {
  const router = useRouter();
  const [modalRow, setModalRow] = useState<LeadershipBoardRow | "new" | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [bulkPending, setBulkPending] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      (e) =>
        e.firstName.toLowerCase().includes(q) ||
        e.lastName.toLowerCase().includes(q) ||
        e.title.toLowerCase().includes(q) ||
        e.typeLabel.toLowerCase().includes(q)
    );
  }, [entries, keyword]);

  useEffect(() => {
    setPage(1);
  }, [keyword]);

  const paged = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  );

  const allSelected = paged.length > 0 && paged.every((e) => selected.has(e.id));

  function toggleAll() {
    const pageIds = paged.map((e) => e.id);
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }

  function toggleOne(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSaved() {
    setModalRow(null);
    router.refresh();
  }

  async function remove(id: number) {
    if (!window.confirm("Delete this entry? This cannot be undone.")) return;
    setPendingId(id);
    setErrorMessage(null);
    try {
      await axios.delete(`/api/members/leadership-board/${id}`);
      router.refresh();
    } catch {
      setErrorMessage("Could not delete this entry. Please try again.");
    } finally {
      setPendingId(null);
    }
  }

  async function bulkDelete() {
    if (selected.size === 0) return;
    if (!window.confirm(`Delete ${selected.size} selected entr${selected.size === 1 ? "y" : "ies"}? This cannot be undone.`)) return;
    setBulkPending(true);
    setErrorMessage(null);
    try {
      await axios.post("/api/members/leadership-board/bulk-delete", { ids: [...selected] });
      setSelected(new Set());
      router.refresh();
    } catch {
      setErrorMessage("Could not delete the selected entries. Please try again.");
    } finally {
      setBulkPending(false);
    }
  }

  function exportCsv() {
    const header = "ID,First Name,Last Name,Title,Type,Expiry Date,Issue Date\n";
    const rows = filtered
      .map(
        (e) =>
          `${e.id},"${e.firstName.replace(/"/g, '""')}","${e.lastName.replace(/"/g, '""')}","${e.title.replace(/"/g, '""')}","${e.typeLabel}","${e.expiryDate ?? ""}","${e.issueDate ?? ""}"`
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "leadership-board.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold animate-in fade-in">
          {errorMessage}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={bulkDelete}
            disabled={selected.size === 0 || bulkPending}
            className="inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-red-500/20 hover:border-red-500/40 hover:text-red-400 disabled:opacity-30"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {bulkPending ? "Processing..." : `Delete ${selected.size || ""}`}
          </button>
        </div>
        <button
          onClick={() => setModalRow("new")}
          className="inline-flex items-center gap-2 rounded-full bg-brand-pink px-8 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-xl shadow-brand-pink/20 transition hover:scale-105 active:scale-95"
        >
          <Plus className="h-4 w-4" />
          Add Entry
        </button>
      </div>

      <div className="glass-panel rounded-3xl overflow-hidden border-white/10 shadow-2xl backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 bg-white/5 p-4 sm:p-6">
          <button
            type="button"
            onClick={exportCsv}
            className="flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:bg-white/10 hover:text-white transition-all w-full sm:w-auto"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-pink" />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              type="text"
              placeholder="Filter leaders by name or title..."
              className="w-full rounded-full border border-white/10 bg-zinc-950/50 py-2.5 pl-11 pr-5 text-sm font-medium text-white focus:border-brand-pink focus:outline-none focus:ring-1 focus:ring-brand-pink/50 transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-gradient-to-r from-brand-purple to-brand-pink text-white">
                <th className="px-6 py-4 font-black uppercase tracking-wider text-center">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="rounded border-white/20 bg-zinc-900 text-brand-pink focus:ring-brand-pink"
                  />
                </th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Full Name</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Title / Role</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Category</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider text-center">Term Dates</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-zinc-400 italic font-medium">
                    <p className="text-zinc-500 font-medium italic">
                      {entries.length === 0 ? "No leaders have been featured yet." : "No results match your search."}
                    </p>
                  </td>
                </tr>
              ) : (
                paged.map((entry) => (
                  <tr
                    key={entry.id}
                    className="group hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-6 py-5 text-center">
                      <input
                        type="checkbox"
                        checked={selected.has(entry.id)}
                        onChange={() => toggleOne(entry.id)}
                        className="rounded border-white/20 bg-zinc-900 text-brand-pink focus:ring-brand-pink"
                      />
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 shrink-0 rounded-full bg-white/5 border border-white/10 overflow-hidden">
                          {entry.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={assetUrl(entry.image)} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center font-black text-[10px] text-brand-purple">
                              {entry.firstName?.[0]}{entry.lastName?.[0]}
                            </div>
                          )}
                        </div>
                        <div className="font-bold text-zinc-200">
                          {entry.firstName} {entry.lastName}
                          <div className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mt-0.5">#{entry.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="font-bold text-zinc-300">{entry.title}</div>
                      {entry.business && <div className="text-[10px] font-black uppercase tracking-widest text-brand-purple mt-0.5">{entry.business}</div>}
                    </td>
                    <td className="px-6 py-5">
                      <span className="inline-flex rounded-full bg-brand-pink/10 border border-brand-pink/20 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-brand-pink shadow-lg">
                        {entry.typeLabel}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center text-[10px] font-black uppercase tracking-widest text-zinc-500 space-y-1">
                      {entry.issueDate && <div>Start: {new Date(entry.issueDate).toLocaleDateString()}</div>}
                      {entry.expiryDate && <div>End: {new Date(entry.expiryDate).toLocaleDateString()}</div>}
                      {!entry.issueDate && !entry.expiryDate && "—"}
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center justify-center gap-3">
                        <button
                          title="Edit Profile"
                          onClick={() => setModalRow(entry)}
                          className="h-8 w-8 inline-flex items-center justify-center rounded-lg bg-white/5 text-zinc-400 hover:bg-brand-purple hover:text-white transition-all shadow-xl"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          title="Delete Profile"
                          disabled={pendingId === entry.id}
                          onClick={() => remove(entry.id)}
                          className="h-8 w-8 inline-flex items-center justify-center rounded-lg bg-white/5 text-zinc-400 hover:bg-red-500 hover:text-white transition-all shadow-xl disabled:opacity-20"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
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
          totalItems={filtered.length}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          className="px-6 pb-6"
        />
      </div>

      {modalRow && (
        <LeadershipBoardFormModal
          defaultValues={
            modalRow === "new"
              ? undefined
              : {
                  id: modalRow.id,
                  title: modalRow.title,
                  description: modalRow.description,
                  first_name: modalRow.firstName,
                  last_name: modalRow.lastName,
                  business: modalRow.business,
                  position: modalRow.position,
                  type: modalRow.type,
                  issue_date: toDateInputValue(modalRow.issueDate),
                  expiry_date: toDateInputValue(modalRow.expiryDate),
                  image: modalRow.image,
                }
          }
          onClose={() => setModalRow(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
