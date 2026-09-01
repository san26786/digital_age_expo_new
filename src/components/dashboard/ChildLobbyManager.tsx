"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios, { isAxiosError } from "axios";
import {
  Plus,
  Search,
  X,
  Eye,
  Pencil,
  Trash2,
  Download,
  Upload,
  Layers,
  Image as ImageIcon,
  Copy,
  CircleDot,
  HelpCircle,
} from "lucide-react";
import {
  eventLobbyChildSchema,
  CHILD_LOBBY_STATUSES,
  CHILD_LOBBY_LAYOUT_TYPES,
  type EventLobbyChildInput,
} from "@/lib/validations/eventLobbyChild";
import type { ChildLobbyRow } from "@/lib/services/eventLobbyChild";
import { TablePagination } from "@/components/dashboard/TablePagination";
import { assetUrl } from "@/lib/assets";

import { ModalPortal } from "@/components/ui/ModalPortal";
const PAGE_SIZE = 15;

const FIELD_CLASS =
  "w-full rounded-xl border border-white/15 bg-black/50 px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-brand-pink focus:outline-none focus:ring-2 focus:ring-brand-pink/30 transition-all";

function layoutTypeLabel(value: string) {
  return CHILD_LOBBY_LAYOUT_TYPES.find((t) => t.value === value)?.label ?? value;
}

interface FormDefaults extends Partial<EventLobbyChildInput> {
  id?: number;
}

interface ChildLobbyManagerProps {
  childLobbies: ChildLobbyRow[];
  eventId: number | string;
  parentLobbyId: number;
}

function ChildLobbySubNavigation({
  childId,
  eventId,
  activeTab = "child",
}: {
  childId?: number;
  eventId: number | string;
  activeTab?: string;
}) {
  if (!childId) return null;

  const tabs = [
    {
      key: "details",
      label: "Lobby Details",
      href: `/members/event_lobby_layout_manager?action=edit&id=${childId}&event_id=${eventId}`,
    },
    {
      key: "child",
      label: "Child Lobby",
      href: `/members/event_lobby_layout_child?layout_id=${childId}&event_id=${eventId}`,
    },
    {
      key: "spots",
      label: "Spots",
      href: `/members/event_lobby_spots?layout_id=${childId}&event_id=${eventId}`,
    },
    {
      key: "assets",
      label: "Assets",
      href: `/members/event_lobby_layout_type_assets?layout_id=${childId}&event_id=${eventId}`,
    },
  ];

  return (
    <div className="mb-6 overflow-x-auto pb-2 border-b border-white/10">
      <div className="flex items-center gap-2 min-w-max">
        {tabs.map((tab) => {
          const isActive = tab.key === activeTab;
          return (
            <Link
              key={tab.key}
              href={tab.href}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 ${
                isActive
                  ? "bg-gradient-to-r from-brand-purple to-brand-pink text-white shadow-lg shadow-brand-pink/20 border border-white/20"
                  : "bg-black/40 text-zinc-400 hover:text-white hover:bg-white/10 border border-white/5"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function ChildLobbyFormModal({
  defaultValues,
  eventId,
  onClose,
  onSaved,
}: {
  defaultValues?: FormDefaults;
  eventId: number | string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>(defaultValues?.image ?? "");
  const [helpPreviewUrl, setHelpPreviewUrl] = useState<string>(defaultValues?.help_image ?? "");

  const imageFileInputRef = useRef<HTMLInputElement>(null);
  const helpFileInputRef = useRef<HTMLInputElement>(null);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isEdit = typeof defaultValues?.id === "number";

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EventLobbyChildInput>({
    resolver: zodResolver(eventLobbyChildSchema) as any,
    defaultValues: {
      title: defaultValues?.title ?? "",
      layout_type: defaultValues?.layout_type ?? "",
      image: defaultValues?.image ?? "",
      help_image: defaultValues?.help_image ?? "",
      description: defaultValues?.description ?? "",
      sequence: defaultValues?.sequence ?? undefined,
      status: defaultValues?.status ?? "enabled",
    },
  });

  const description = watch("description") ?? "";

  function handleFileRead(file: File, isHelp: boolean) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (isHelp) {
        setHelpPreviewUrl(result);
        setValue("help_image", result);
      } else {
        setImagePreviewUrl(result);
        setValue("image", result);
      }
    };
    reader.readAsDataURL(file);
  }

  async function onSubmit(data: EventLobbyChildInput) {
    setErrorMessage(null);
    try {
      if (isEdit) {
        await axios.patch(`/api/members/lobby-child/${defaultValues!.id}`, data);
      } else {
        await axios.post("/api/members/lobby-child", { ...data, event_id: Number(eventId) });
      }
      onSaved();
    } catch (err) {
      setErrorMessage(
        isAxiosError(err) && typeof err.response?.data?.error === "string"
          ? err.response.data.error
          : "Could not save this child lobby. Please check the fields and try again."
      );
    }
  }

  if (!mounted) return null;

  return createPortal(
    <ModalPortal>
      <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto overscroll-contain bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="relative my-8 w-full max-w-3xl rounded-3xl border border-white/15 bg-zinc-900 p-6 sm:p-8 shadow-2xl text-white">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-purple to-brand-pink">
              <Layers className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-black uppercase tracking-tight text-white">
                {isEdit ? "Edit Child Lobby Details" : "Add Child Lobby Details"}
              </h3>
              <p className="text-xs font-semibold text-zinc-400">Event #{eventId}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {isEdit && defaultValues?.id && (
          <div className="mt-4">
            <ChildLobbySubNavigation childId={defaultValues.id} eventId={eventId} activeTab="child" />
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-extrabold uppercase tracking-wider text-zinc-300">
                Child Lobby Title *
              </label>
              <input
                {...register("title")}
                className={FIELD_CLASS}
                placeholder="e.g. VIP Lounge Zone"
              />
              {errors.title && <p className="mt-1 text-xs text-rose-400">{errors.title.message}</p>}
            </div>

            <div>
              <label className="mb-2 block text-xs font-extrabold uppercase tracking-wider text-zinc-300">
                Layout Type *
              </label>
              <select {...register("layout_type")} className={FIELD_CLASS}>
                {CHILD_LOBBY_LAYOUT_TYPES.map((t) => (
                  <option key={t.value} value={t.value} className="bg-zinc-900 text-white">
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-extrabold uppercase tracking-wider text-zinc-300">
                Zone Image / Asset
              </label>
              <div
                onClick={() => imageFileInputRef.current?.click()}
                className="group relative flex h-36 w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-white/15 bg-black/40 p-4 transition hover:border-brand-pink hover:bg-black/60"
              >
                <input
                  ref={imageFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileRead(file, false);
                  }}
                />
                {imagePreviewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imagePreviewUrl}
                    alt="Zone preview"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-center text-zinc-400 group-hover:text-white">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-pink/20 text-brand-pink">
                      <Plus className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider">
                      Upload Zone Image
                    </span>
                  </div>
                )}
              </div>
              <input
                {...register("image")}
                type="text"
                placeholder="Or paste Image URL"
                className={`${FIELD_CLASS} mt-2 text-xs`}
                onChange={(e) => setImagePreviewUrl(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-extrabold uppercase tracking-wider text-zinc-300">
                Help Image Asset
              </label>
              <div
                onClick={() => helpFileInputRef.current?.click()}
                className="group relative flex h-36 w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-white/15 bg-black/40 p-4 transition hover:border-brand-pink hover:bg-black/60"
              >
                <input
                  ref={helpFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileRead(file, true);
                  }}
                />
                {helpPreviewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={helpPreviewUrl}
                    alt="Help preview"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-center text-zinc-400 group-hover:text-white">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-purple/30 text-fuchsia-400">
                      <Plus className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider">
                      Upload Help Image
                    </span>
                  </div>
                )}
              </div>
              <input
                {...register("help_image")}
                type="text"
                placeholder="Or paste Help Image URL"
                className={`${FIELD_CLASS} mt-2 text-xs`}
                onChange={(e) => setHelpPreviewUrl(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-purple-950/30 p-3 border border-brand-purple/30 text-xs text-zinc-300">
            <HelpCircle className="h-4 w-4 shrink-0 text-brand-pink" />
            <span>
              <strong>Recommended resolution:</strong> 1600px x 920px for optimal crispness on high-res displays.
            </span>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-extrabold uppercase tracking-wider text-zinc-300">
                Description
              </label>
              <span className="text-[10px] text-zinc-500">{description.length}/300</span>
            </div>
            <textarea
              {...register("description")}
              rows={3}
              maxLength={300}
              className={FIELD_CLASS}
              placeholder="Enter a brief overview of this child lobby zone..."
            />
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-extrabold uppercase tracking-wider text-zinc-300">
                Sequence Order
              </label>
              <input
                {...register("sequence")}
                type="number"
                className={FIELD_CLASS}
                placeholder="1"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-extrabold uppercase tracking-wider text-zinc-300">
                Status
              </label>
              <select {...register("status")} className={FIELD_CLASS}>
                {CHILD_LOBBY_STATUSES.map((s) => (
                  <option key={s} value={s} className="bg-zinc-900 text-white">
                    {s === "enabled" ? "Enabled" : "Disabled"}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {errorMessage && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-950/40 p-3 text-xs font-semibold text-rose-300">
              {errorMessage}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/10 bg-white/5 px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-zinc-300 hover:bg-white/10 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-sophisticated rounded-xl px-8 py-2.5 text-xs font-extrabold uppercase tracking-wider text-white transition disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : isEdit ? "Update Child Lobby" : "Save Child Lobby"}
            </button>
          </div>
        </form>
      </div>
    </div>
    </ModalPortal>,
    document.body
  );
}

export function ChildLobbyManager({
  childLobbies,
  eventId,
  parentLobbyId,
}: ChildLobbyManagerProps) {
  const router = useRouter();
  const [modalRow, setModalRow] = useState<ChildLobbyRow | "new" | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);

  const filtered = searchQueryFilter(childLobbies, keyword);

  useEffect(() => {
    setPage(1);
  }, [keyword]);

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleSaved() {
    setModalRow(null);
    router.refresh();
  }

  async function remove(id: number) {
    if (!window.confirm("Delete this child lobby? This action cannot be undone.")) return;
    setPendingId(id);
    setErrorMessage(null);
    try {
      await axios.delete(`/api/members/lobby-child/${id}`);
      router.refresh();
    } catch {
      setErrorMessage("Could not remove this child lobby. Please try again.");
    } finally {
      setPendingId(null);
    }
  }

  async function copy(id: number) {
    setPendingId(id);
    setErrorMessage(null);
    try {
      await axios.post(`/api/members/lobby-child/${id}/copy`);
      router.refresh();
    } catch {
      setErrorMessage("Could not copy this child lobby.");
    } finally {
      setPendingId(null);
    }
  }

  function exportCsv() {
    const header = "ID,Title,LayoutType,Status\n";
    const rows = filtered
      .map(
        (r) =>
          `${r.id},"${(r.title || "").replace(/"/g, '""')}",${r.layoutType},${r.status}`
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `event-${eventId}-child-lobbies.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* Top Header Actions Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-purple to-brand-pink shadow-lg shadow-brand-pink/20">
            <Layers className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight text-white">
              Child Lobby Zones
            </h2>
            <p className="text-xs font-medium text-zinc-400">
              Manage virtual rooms, expo halls, and auditoriums for Event #{eventId}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setModalRow("new")}
            className="btn-sophisticated flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-xs font-extrabold uppercase tracking-wider text-white transition-all shadow-lg"
          >
            <Plus className="h-4 w-4" />
            Add Child Lobby
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-950/40 p-4 text-xs font-semibold text-rose-300">
          {errorMessage}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="glass-panel rounded-2xl p-4 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <button
          type="button"
          onClick={exportCsv}
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-wider text-zinc-300 hover:bg-white/10 hover:text-white transition w-full sm:w-auto justify-center"
        >
          <Download className="h-4 w-4 text-brand-pink" />
          Export CSV
        </button>

        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            type="text"
            placeholder="Search child lobbies..."
            className="w-full rounded-xl border border-white/15 bg-black/50 py-2 pl-10 pr-4 text-xs text-white placeholder:text-zinc-500 focus:border-brand-pink focus:outline-none focus:ring-2 focus:ring-brand-pink/30"
          />
        </div>
      </div>

      {/* Main Dark Data Table */}
      <div className="overflow-hidden rounded-2xl border border-white/10 glass-panel shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-gradient-to-r from-brand-purple to-brand-pink text-white">
                <th className="px-6 py-4 font-black uppercase tracking-wider text-center">ID</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Zone Title</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Layout Type</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider text-center">Status</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider text-center">Actions / Manage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-zinc-400 italic font-medium">
                    {childLobbies.length === 0
                      ? "No child lobby zones configured yet for this parent lobby."
                      : "No matching child lobbies found."}
                  </td>
                </tr>
              ) : (
                paged.map((row) => (
                  <tr
                    key={row.id}
                    className="group hover:bg-white/5 transition-colors text-zinc-200"
                  >
                    <td className="px-6 py-4 text-center font-mono font-bold text-brand-pink">
                      #{row.id}
                    </td>
                    <td className="px-6 py-4 font-bold text-white flex items-center gap-3">
                      {row.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={assetUrl(row.image)}
                          alt={row.title}
                          className="h-9 w-14 rounded-lg border border-white/10 object-cover"
                        />
                      ) : (
                        <div className="flex h-9 w-14 items-center justify-center rounded-lg bg-white/5 border border-white/10">
                          <ImageIcon className="h-4 w-4 text-zinc-500" />
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-extrabold text-white">{row.title}</div>
                        {row.description && (
                          <div className="text-[11px] text-zinc-400 line-clamp-1 max-w-xs font-normal">
                            {row.description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-zinc-300">
                      <span className="inline-flex items-center gap-1.5 rounded-xl bg-purple-950/40 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-fuchsia-300 border border-brand-purple/40">
                        {layoutTypeLabel(row.layoutType)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${
                          row.status === "enabled"
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            row.status === "enabled" ? "bg-emerald-400" : "bg-rose-400"
                          }`}
                        />
                        {row.status === "enabled" ? "Enabled" : "Disabled"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          title="Edit Child Lobby"
                          onClick={() => setModalRow(row)}
                          className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-300 hover:border-brand-pink hover:bg-brand-pink hover:text-white transition shadow-sm"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <Link
                          href={`/members/event_lobby_spots?child_id=${row.id}&event_id=${eventId}`}
                          title="Manage Spots"
                          className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-300 hover:border-brand-purple hover:bg-brand-purple hover:text-white transition shadow-sm"
                        >
                          <CircleDot className="h-3.5 w-3.5" />
                        </Link>
                        {(row.layoutType === "exhibition" || row.layoutType === "auditorium") && (
                          <button
                            title="Copy Child Lobby"
                            disabled={pendingId === row.id}
                            onClick={() => copy(row.id)}
                            className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-300 hover:border-fuchsia-600 hover:bg-fuchsia-600 hover:text-white transition shadow-sm disabled:opacity-50"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          title="Delete Child Lobby"
                          disabled={pendingId === row.id}
                          onClick={() => remove(row.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 hover:bg-rose-600 hover:text-white transition shadow-sm disabled:opacity-50"
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

        {/* Footer info & Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/10 px-6 py-4 bg-black/20 text-xs text-zinc-400">
          <div>
            Showing <strong className="text-white">{filtered.length ? (page - 1) * PAGE_SIZE + 1 : 0}</strong> to{" "}
            <strong className="text-white">{Math.min(page * PAGE_SIZE, filtered.length)}</strong> of{" "}
            <strong className="text-white">{childLobbies.length}</strong> child lobbies
          </div>

          <TablePagination
            currentPage={page}
            totalItems={filtered.length}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
        </div>
      </div>

      {modalRow && (
        <ChildLobbyFormModal
          defaultValues={
            modalRow === "new"
              ? undefined
              : {
                  id: modalRow.id,
                  title: modalRow.title,
                  layout_type: modalRow.layoutType as EventLobbyChildInput["layout_type"],
                  image: modalRow.image ?? "",
                  help_image: modalRow.helpImage ?? "",
                  description: modalRow.description ?? "",
                  sequence: modalRow.sequence ?? undefined,
                  status: (modalRow.status as (typeof CHILD_LOBBY_STATUSES)[number]) ?? "enabled",
                }
          }
          eventId={eventId}
          onClose={() => setModalRow(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}

function searchQueryFilter(lobbies: ChildLobbyRow[], keyword: string) {
  const q = keyword.trim().toLowerCase();
  if (!q) return lobbies;
  return lobbies.filter(
    (l) =>
      l.title.toLowerCase().includes(q) ||
      l.layoutType.toLowerCase().includes(q) ||
      l.status.toLowerCase().includes(q) ||
      l.id.toString().includes(q)
  );
}
