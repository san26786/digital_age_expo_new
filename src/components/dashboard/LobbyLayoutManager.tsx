"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios, { isAxiosError } from "axios";
import {
  Plus,
  Upload,
  Search,
  X,
  Eye,
  Maximize,
  Minimize,
  Columns3,
  Download,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  SquarePen,
} from "lucide-react";
import { eventLobbySchema, LOBBY_STATUSES, type EventLobbyInput } from "@/lib/validations/eventLobby";
import type { LobbyRow } from "@/lib/services/eventLobby";
import { TablePagination } from "@/components/dashboard/TablePagination";

import { ModalPortal } from "@/components/ui/ModalPortal";
const PAGE_SIZE = 20;

const FIELD_CLASS =
  "w-full rounded-md border border-indigo-950/20 bg-white px-3.5 py-2.5 text-sm text-indigo-950 placeholder:text-indigo-950/40 focus:border-fuchsia-500 focus:outline-none";

type SortKey = "title" | "status";
type SortDir = "asc" | "desc";
type ColumnKey = "title" | "status" | "manage";

const COLUMN_LABELS: Record<ColumnKey, string> = {
  title: "Title",
  status: "Status",
  manage: "Manage",
};

interface FormDefaults extends Partial<EventLobbyInput> {
  id?: number;
}

function LobbyFormModal({
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
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EventLobbyInput>({
    resolver: zodResolver(eventLobbySchema) as any,
    defaultValues: {
      title: defaultValues?.title ?? "",
      image: defaultValues?.image ?? "",
      video_path: defaultValues?.video_path ?? "",
      play_lobby_video: defaultValues?.play_lobby_video ?? false,
      description: defaultValues?.description ?? "",
      agenda_welcome_message: defaultValues?.agenda_welcome_message ?? "",
      status: defaultValues?.status ?? "enabled",
      chat_script: defaultValues?.chat_script ?? "",
      spot_color: defaultValues?.spot_color ?? "var(--color-white)",
      spot_size: defaultValues?.spot_size ?? 5,
    },
  });

  const description = watch("description") ?? "";
  const agendaMessage = watch("agenda_welcome_message") ?? "";
  const imagePreview = watch("image");

  async function onSubmit(data: EventLobbyInput) {
    setErrorMessage(null);
    try {
      if (isEdit) {
        await axios.patch(`/api/members/lobby/${defaultValues!.id}`, data);
      } else {
        await axios.post("/api/members/lobby", data);
      }
      onSaved();
    } catch (err) {
      setErrorMessage(
        isAxiosError(err) && typeof err.response?.data?.error === "string"
          ? err.response.data.error
          : "Could not save this lobby. Please check the form and try again."
      );
    }
  }

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto overscroll-contain bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-md bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <h3 className="text-lg font-black uppercase text-purple-900">{isEdit ? "Edit Lobby Details" : "Add Lobby Details"}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-5 grid gap-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Title*</label>
            <input {...register("title")} className={FIELD_CLASS} />
            {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Splash / Logo Image URL</label>
              <input {...register("image")} className={FIELD_CLASS} placeholder="https://..." />
              <p className="mt-1 text-xs text-slate-400">Recommended: image resolution 1600px x 920px.</p>
              {imagePreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imagePreview} alt="Splash preview" className="mt-2 h-20 w-32 rounded-md border border-slate-200 object-cover" />
              ) : null}
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Lobby Video URL</label>
              <input {...register("video_path")} className={FIELD_CLASS} placeholder="https://..." />
              <label className="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <input type="checkbox" {...register("play_lobby_video")} className="h-4 w-4 rounded border-slate-300" />
                Play lobby video
              </label>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Description</label>
            <textarea {...register("description")} rows={3} maxLength={300} className={FIELD_CLASS} />
            <p className="mt-1 text-right text-xs text-slate-400">{description.length}/300</p>
            {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Agenda Welcome Message</label>
            <textarea {...register("agenda_welcome_message")} rows={3} maxLength={300} className={FIELD_CLASS} />
            <p className="mt-1 text-right text-xs text-slate-400">{agendaMessage.length}/300</p>
            {errors.agenda_welcome_message && <p className="mt-1 text-xs text-red-600">{errors.agenda_welcome_message.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Chat Script</label>
            <textarea {...register("chat_script")} rows={3} className={FIELD_CLASS} />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Spot Color</label>
              <input {...register("spot_color")} type="color" className="h-10 w-full rounded-md border border-slate-300 bg-white px-1 py-1" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Spot Size</label>
              <input {...register("spot_size")} type="number" min={1} max={100} className={FIELD_CLASS} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Status</label>
              <select {...register("status")} className={FIELD_CLASS}>
                {LOBBY_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s === "enabled" ? "Enabled" : "Disabled"}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}

          <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-sm border border-slate-300 px-5 py-2.5 text-sm font-semibold uppercase text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-sm bg-purple-800 px-6 py-2.5 text-sm font-bold uppercase text-white transition hover:bg-purple-900 disabled:opacity-60"
            >
              {isSubmitting ? "Saving..." : isEdit ? "Save Changes" : "Add Lobby"}
            </button>
          </div>
        </form>
      </div>
    </div>
    </ModalPortal>
  );
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ChevronsUpDown className="h-3 w-3 opacity-60" />;
  return dir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />;
}

export function LobbyLayoutManager({ lobbies }: { lobbies: LobbyRow[] }) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [modalLobby, setModalLobby] = useState<LobbyRow | "new" | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("title");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "enabled" | "disabled">("all");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Record<ColumnKey, boolean>>({
    title: true,
    status: true,
    manage: true,
  });
  const [isImporting, setIsImporting] = useState(false);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    let rows = lobbies;
    if (statusFilter !== "all") rows = rows.filter((l) => l.status === statusFilter);
    if (q) rows = rows.filter((l) => [l.title, l.status].filter(Boolean).some((field) => field!.toLowerCase().includes(q)));

    const sorted = [...rows].sort((a, b) => {
      const av = (a[sortKey] ?? "").toString().toLowerCase();
      const bv = (b[sortKey] ?? "").toString().toLowerCase();
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [lobbies, keyword, statusFilter, sortKey, sortDir]);

  useEffect(() => {
    setPage(1);
  }, [keyword, statusFilter, sortKey, sortDir]);

  const paged = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  );

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function toggleSelected(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    const pageIds = paged.map((l) => l.id);
    setSelected((prev) => {
      const allPageSelected = pageIds.length > 0 && pageIds.every((id) => prev.has(id));
      const next = new Set(prev);
      if (allPageSelected) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }

  function handleSaved() {
    setModalLobby(null);
    router.refresh();
  }

  async function toggleFullscreen() {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  }

  function exportCsv() {
    const header = "ID,Title,Status\n";
    const rows = filtered.map((l) => `${l.id},"${l.title.replace(/"/g, '""')}",${l.status}`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "lobby-details.csv";
    a.click();
    URL.revokeObjectURL(url);
    setExportOpen(false);
  }

  // Simplified stand-in for the legacy multi-asset lobby import (which also copied spots,
  // assets and agenda from a master template) — here it just seeds a new enabled lobby row
  // so organisers have a starting point to edit.
  async function importLobby() {
    setIsImporting(true);
    setErrorMessage(null);
    try {
      await axios.post("/api/members/lobby", {
        title: "Imported Lobby",
        status: "enabled",
        play_lobby_video: false,
        spot_color: "var(--color-white)",
        spot_size: 5,
      });
      router.refresh();
    } catch {
      setErrorMessage("Could not import a lobby. Please try again.");
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <div ref={containerRef} className="bg-white">
      {errorMessage && <p className="mb-3 text-sm text-red-600">{errorMessage}</p>}

      {/* Action buttons */}
      <div className="flex flex-wrap justify-end gap-2">
        <button
          onClick={() => setModalLobby("new")}
          className="inline-flex items-center gap-1.5 rounded-sm bg-purple-800 px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-white transition hover:bg-purple-900"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Lobby
        </button>
        <button
          onClick={importLobby}
          disabled={isImporting}
          className="inline-flex items-center gap-1.5 rounded-sm bg-purple-800 px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-white transition hover:bg-purple-900 disabled:opacity-60"
        >
          <Upload className="h-3.5 w-3.5" />
          {isImporting ? "Importing..." : "Import Lobby"}
        </button>
      </div>

      {/* Toolbar */}
      <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
        <div className="flex items-center gap-2 rounded-sm border border-slate-300 bg-white px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Search"
            className="w-40 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none sm:w-56"
          />
        </div>

        <button
          type="button"
          title="Toggle filters"
          onClick={() => setShowFilters((v) => !v)}
          className={`rounded-sm border px-2.5 py-2 ${showFilters ? "border-purple-800 bg-purple-800 text-white" : "border-slate-300 text-slate-600 hover:bg-slate-50"}`}
        >
          <Eye className="h-4 w-4" />
        </button>

        <button
          type="button"
          title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          onClick={toggleFullscreen}
          className="rounded-sm border border-slate-300 px-2.5 py-2 text-slate-600 hover:bg-slate-50"
        >
          {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
        </button>

        <div className="relative">
          <button
            type="button"
            title="Columns"
            onClick={() => {
              setColumnsOpen((v) => !v);
              setExportOpen(false);
            }}
            className="rounded-sm border border-slate-300 px-2.5 py-2 text-slate-600 hover:bg-slate-50"
          >
            <Columns3 className="h-4 w-4" />
          </button>
          {columnsOpen && (
            <div className="absolute right-0 z-10 mt-1 w-40 rounded-sm border border-slate-200 bg-white p-2 shadow-lg">
              {(Object.keys(COLUMN_LABELS) as ColumnKey[]).map((col) => (
                <label key={col} className="flex items-center gap-2 px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={visibleColumns[col]}
                    onChange={() => setVisibleColumns((prev) => ({ ...prev, [col]: !prev[col] }))}
                    className="h-3.5 w-3.5 rounded border-slate-300"
                  />
                  {COLUMN_LABELS[col]}
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            title="Export"
            onClick={() => {
              setExportOpen((v) => !v);
              setColumnsOpen(false);
            }}
            className="rounded-sm border border-slate-300 px-2.5 py-2 text-slate-600 hover:bg-slate-50"
          >
            <Download className="h-4 w-4" />
          </button>
          {exportOpen && (
            <div className="absolute right-0 z-10 mt-1 w-36 rounded-sm border border-slate-200 bg-white p-1 shadow-lg">
              <button onClick={exportCsv} className="block w-full rounded-sm px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50">
                Export CSV
              </button>
            </div>
          )}
        </div>
      </div>

      {showFilters && (
        <div className="mt-3 flex items-center gap-2 rounded-sm border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
          <span className="font-semibold text-slate-600">Status:</span>
          {(["all", "enabled", "disabled"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${
                statusFilter === s ? "bg-purple-800 text-white" : "bg-white text-slate-600 border border-slate-300"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="mt-4 overflow-x-auto border border-slate-200">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-gradient-to-r from-brand-purple to-brand-pink text-white">
              <th className="px-6 py-4 font-black uppercase tracking-wider w-10">
                <input
                  type="checkbox"
                  checked={paged.length > 0 && paged.every((l) => selected.has(l.id))}
                  onChange={toggleSelectAll}
                  className="h-3.5 w-3.5 rounded border-white/40"
                />
              </th>
              {visibleColumns.title && (
                <th className="px-6 py-4 font-black uppercase tracking-wider">
                  <button onClick={() => toggleSort("title")} className="inline-flex items-center gap-1 font-bold uppercase tracking-wide">
                    Title <SortIcon active={sortKey === "title"} dir={sortDir} />
                  </button>
                </th>
              )}
              {visibleColumns.status && (
                <th className="px-6 py-4 font-black uppercase tracking-wider">
                  <button onClick={() => toggleSort("status")} className="inline-flex items-center gap-1 font-bold uppercase tracking-wide">
                    Status <SortIcon active={sortKey === "status"} dir={sortDir} />
                  </button>
                </th>
              )}
              {visibleColumns.manage && (
                <th className="px-6 py-4 font-black uppercase tracking-wider">
                  <span className="inline-flex items-center gap-1 font-bold uppercase tracking-wide">
                    Manage <ChevronsUpDown className="h-3 w-3 opacity-60" />
                  </span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={1 + Object.values(visibleColumns).filter(Boolean).length}
                  className="px-4 py-10 text-center text-slate-400"
                >
                  {lobbies.length === 0 ? "No lobby details have been added for this event yet." : "No lobbies match your search."}
                </td>
              </tr>
            )}
            {paged.map((lobby, i) => (
              <tr key={lobby.id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(lobby.id)}
                    onChange={() => toggleSelected(lobby.id)}
                    className="h-3.5 w-3.5 rounded border-slate-300"
                  />
                </td>
                {visibleColumns.title && <td className="px-4 py-3 text-slate-700">{lobby.title}</td>}
                {visibleColumns.status && (
                  <td className="px-4 py-3 text-slate-700">{lobby.status === "enabled" ? "Enabled" : "Disabled"}</td>
                )}
                {visibleColumns.manage && (
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <button
                        title="Edit Lobby"
                        onClick={() => setModalLobby(lobby)}
                        className="text-purple-800 hover:text-purple-950"
                      >
                        <SquarePen className="h-4 w-4" />
                      </button>
                      <button
                        title="Public lobby preview isn't available yet"
                        disabled
                        className="cursor-not-allowed text-slate-300"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TablePagination currentPage={page} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} />

      <div className="mt-2 text-xs text-slate-400">
        {filtered.length} of {lobbies.length} record{lobbies.length === 1 ? "" : "s"}
        {selected.size > 0 ? ` · ${selected.size} selected` : ""}
      </div>

      {modalLobby && (
        <LobbyFormModal
          defaultValues={
            modalLobby === "new"
              ? undefined
              : {
                  id: modalLobby.id,
                  title: modalLobby.title,
                  image: modalLobby.image ?? "",
                  video_path: modalLobby.videoPath ?? "",
                  play_lobby_video: modalLobby.playLobbyVideo,
                  description: modalLobby.description ?? "",
                  agenda_welcome_message: modalLobby.agendaWelcomeMessage ?? "",
                  status: (modalLobby.status as (typeof LOBBY_STATUSES)[number]) ?? "enabled",
                  chat_script: modalLobby.chatScript ?? "",
                  spot_color: modalLobby.spotColor ?? "var(--color-white)",
                  spot_size: modalLobby.spotSize,
                }
          }
          onClose={() => setModalLobby(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
