"use client";

import { useEffect, useMemo, useState, useRef, ChangeEvent } from "react";
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
  Video as VideoIcon,
  Sparkles,
  HelpCircle,
} from "lucide-react";
import { eventLobbySchema, LOBBY_STATUSES, type EventLobbyInput } from "@/lib/validations/eventLobby";
import type { LobbyRow, LobbyTemplateOption } from "@/lib/services/eventLobby";
import { TablePagination } from "@/components/dashboard/TablePagination";
import { assetUrl } from "@/lib/assets";

import { ModalPortal } from "@/components/ui/ModalPortal";
const PAGE_SIZE = 15;

const FIELD_CLASS =
  "w-full rounded-xl border border-white/15 bg-black/50 px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-brand-pink focus:outline-none focus:ring-2 focus:ring-brand-pink/30 transition-all";

interface FormDefaults extends Partial<EventLobbyInput> {
  id?: number;
}

interface LobbyManagerProps {
  lobbies: LobbyRow[];
  eventId: number | string;
  initialAction?: string;
  initialLobbyId?: number;
}

function LobbySubNavigation({
  lobbyId,
  eventId,
  activeTab = "details",
}: {
  lobbyId?: number;
  eventId: number | string;
  activeTab?: string;
}) {
  if (!lobbyId) return null;

  const tabs = [
    {
      key: "details",
      label: "Lobby Details",
      href: `/members/event_lobby_layout_manager?action=edit&id=${lobbyId}&event_id=${eventId}`,
    },
    {
      key: "child",
      label: "Child Lobby",
      href: `/members/event_lobby_layout_child?layout_id=${lobbyId}&event_id=${eventId}`,
    },
    {
      key: "spots",
      label: "Spots",
      href: `/members/event_lobby_spots?layout_id=${lobbyId}&event_id=${eventId}`,
    },
    {
      key: "assets",
      label: "Assets",
      href: `/members/event_lobby_layout_type_assets?layout_id=${lobbyId}&event_id=${eventId}`,
    },
    {
      key: "guides",
      label: "Guides",
      href: `/members/event_lobby_guides?layout_id=${lobbyId}&event_id=${eventId}`,
    },
    {
      key: "polling",
      label: "Polling",
      href: `/members/event_lobby_polling?layout_id=${lobbyId}&event_id=${eventId}`,
    },
    {
      key: "networking",
      label: "Networking Rooms",
      href: `/members/event_networking_room?layout_id=${lobbyId}&event_id=${eventId}`,
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

function LobbyFormModal({
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
  const [splashPreviewUrl, setSplashPreviewUrl] = useState<string>(defaultValues?.splash_image ?? "");
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>(defaultValues?.image ?? "");
  const [isVideo, setIsVideo] = useState<boolean>(
    Boolean(defaultValues?.image?.match(/\.(mp4|webm|ogg)$/i))
  );

  const splashFileInputRef = useRef<HTMLInputElement>(null);
  const imageFileInputRef = useRef<HTMLInputElement>(null);

  const isEdit = typeof defaultValues?.id === "number";

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EventLobbyInput>({
    resolver: zodResolver(eventLobbySchema) as any,
    defaultValues: {
      title: defaultValues?.title ?? "",
      splash_image: defaultValues?.splash_image ?? "",
      image: defaultValues?.image ?? "",
      video_path: defaultValues?.video_path ?? "",
      play_lobby_video: defaultValues?.play_lobby_video ?? false,
      description: defaultValues?.description ?? "",
      agenda_welcome_message: defaultValues?.agenda_welcome_message ?? "",
      status: defaultValues?.status ?? "enabled",
      chat_script: defaultValues?.chat_script ?? "",
      spot_color: defaultValues?.spot_color ?? "var(--color-brand-pink)",
      spot_size: defaultValues?.spot_size ?? 5,
    },
  });

  const description = watch("description") ?? "";
  const agendaMessage = watch("agenda_welcome_message") ?? "";

  function handleFileRead(file: File, isSplash: boolean) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (isSplash) {
        setSplashPreviewUrl(result);
        setValue("splash_image", result);
      } else {
        setImagePreviewUrl(result);
        setValue("image", result);
        setIsVideo(file.type.startsWith("video/"));
      }
    };
    reader.readAsDataURL(file);
  }

  async function onSubmit(data: EventLobbyInput) {
    setErrorMessage(null);
    try {
      if (isEdit) {
        await axios.patch(`/api/members/lobby/${defaultValues!.id}`, data);
      } else {
        await axios.post("/api/members/lobby", { ...data, event_id: Number(eventId) });
      }
      onSaved();
    } catch (err) {
      setErrorMessage(
        isAxiosError(err) && typeof err.response?.data?.error === "string"
          ? err.response.data.error
          : "Could not save this lobby layout. Please check the fields and try again."
      );
    }
  }

  return (
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
                {isEdit ? "Edit Lobby Details" : "Add Lobby Details"}
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
            <LobbySubNavigation lobbyId={defaultValues.id} eventId={eventId} activeTab="details" />
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-6">
          <div>
            <label className="mb-2 block text-xs font-extrabold uppercase tracking-wider text-zinc-300">
              Lobby Title *
            </label>
            <input
              {...register("title")}
              className={FIELD_CLASS}
              placeholder="e.g. Main Exhibition Hall Lobby"
            />
            {errors.title && <p className="mt-1 text-xs text-rose-400">{errors.title.message}</p>}
          </div>

          {/* Dual File Upload Dropzone (Splash & Lobby Background/Video) */}
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-extrabold uppercase tracking-wider text-zinc-300">
                Splash Screen Image
              </label>
              <div
                onClick={() => splashFileInputRef.current?.click()}
                className="group relative flex h-36 w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-white/15 bg-black/40 p-4 transition hover:border-brand-pink hover:bg-black/60"
              >
                <input
                  ref={splashFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileRead(file, true);
                  }}
                />
                {splashPreviewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={splashPreviewUrl}
                    alt="Splash preview"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-center text-zinc-400 group-hover:text-white">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-pink/20 text-brand-pink">
                      <Plus className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider">
                      Upload Splash Image
                    </span>
                  </div>
                )}
              </div>
              <input
                {...register("splash_image")}
                type="text"
                placeholder="Or paste Splash Image URL"
                className={`${FIELD_CLASS} mt-2 text-xs`}
                onChange={(e) => setSplashPreviewUrl(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-extrabold uppercase tracking-wider text-zinc-300">
                Lobby Background / Video Asset
              </label>
              <div
                onClick={() => imageFileInputRef.current?.click()}
                className="group relative flex h-36 w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-white/15 bg-black/40 p-4 transition hover:border-brand-pink hover:bg-black/60"
              >
                <input
                  ref={imageFileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileRead(file, false);
                  }}
                />
                {imagePreviewUrl ? (
                  isVideo ? (
                    <video
                      src={imagePreviewUrl}
                      className="absolute inset-0 h-full w-full object-cover"
                      controls
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imagePreviewUrl}
                      alt="Lobby preview"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  )
                ) : (
                  <div className="flex flex-col items-center gap-2 text-center text-zinc-400 group-hover:text-white">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-purple/30 text-fuchsia-400">
                      <Plus className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider">
                      Upload Asset File
                    </span>
                  </div>
                )}
              </div>
              <input
                {...register("image")}
                type="text"
                placeholder="Or paste Image URL"
                className={`${FIELD_CLASS} mt-2 text-xs`}
                onChange={(e) => {
                  setImagePreviewUrl(e.target.value);
                  setIsVideo(Boolean(e.target.value.match(/\.(mp4|webm|ogg)$/i)));
                }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-purple-950/30 p-3 border border-brand-purple/30 text-xs text-zinc-300">
            <HelpCircle className="h-4 w-4 shrink-0 text-brand-pink" />
            <span>
              <strong>Recommended resolution:</strong> 1600px x 920px for optimal crispness on high-res displays.
            </span>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-extrabold uppercase tracking-wider text-zinc-300">
                Lobby Video URL
              </label>
              <input
                {...register("video_path")}
                className={FIELD_CLASS}
                placeholder="https://..."
              />
              <label className="mt-2.5 flex items-center gap-2 text-xs font-semibold text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  {...register("play_lobby_video")}
                  className="h-4 w-4 rounded border-white/20 bg-black/50 text-brand-pink focus:ring-brand-pink"
                />
                Autoplay Lobby Video
              </label>
            </div>

            <div>
              <label className="mb-2 block text-xs font-extrabold uppercase tracking-wider text-zinc-300">
                Lobby Status
              </label>
              <select {...register("status")} className={FIELD_CLASS}>
                {LOBBY_STATUSES.map((s) => (
                  <option key={s} value={s} className="bg-zinc-900 text-white">
                    {s === "enabled" ? "Enabled" : "Disabled"}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-extrabold uppercase tracking-wider text-zinc-300">
                Spot Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  {...register("spot_color")}
                  type="color"
                  className="h-11 w-16 cursor-pointer rounded-xl border border-white/15 bg-black/50 p-1"
                />
                <input
                  {...register("spot_color")}
                  type="text"
                  className={FIELD_CLASS}
                  placeholder="#C71585"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-extrabold uppercase tracking-wider text-zinc-300">
                Spot Size (px)
              </label>
              <input
                {...register("spot_size")}
                type="number"
                min={1}
                max={100}
                className={FIELD_CLASS}
              />
            </div>
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
              placeholder="Enter a brief overview of this lobby section..."
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-extrabold uppercase tracking-wider text-zinc-300">
                Agenda Welcome Message
              </label>
              <span className="text-[10px] text-zinc-500">{agendaMessage.length}/300</span>
            </div>
            <textarea
              {...register("agenda_welcome_message")}
              rows={3}
              maxLength={300}
              className={FIELD_CLASS}
              placeholder="Welcome note for attendees visiting the agenda tab..."
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-extrabold uppercase tracking-wider text-zinc-300">
              Live Chat Embed Script
            </label>
            <textarea
              {...register("chat_script")}
              rows={2}
              className={`${FIELD_CLASS} font-mono text-xs`}
              placeholder="<script>...</script>"
            />
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
              {isSubmitting ? "Saving..." : isEdit ? "Update Lobby" : "Save Lobby"}
            </button>
          </div>
        </form>
      </div>
    </div>
    </ModalPortal>
  );
}

function ImportLobbyModal({
  eventId,
  onClose,
  onImported,
}: {
  eventId: number | string;
  onClose: () => void;
  onImported: () => void;
}) {
  const [templates, setTemplates] = useState<LobbyTemplateOption[] | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    axios
      .get<{ templates: LobbyTemplateOption[] }>("/api/members/lobby/templates")
      .then((res) => setTemplates(res.data.templates))
      .catch(() => setErrorMessage("Could not load lobby templates."));
  }, []);

  async function handleImport() {
    if (!selected) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      await axios.post("/api/members/lobby/import", {
        template_id: selected,
        event_id: Number(eventId),
      });
      onImported();
    } catch (err) {
      setErrorMessage(
        isAxiosError(err) && typeof err.response?.data?.error === "string"
          ? err.response.data.error
          : "Could not import this template."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto overscroll-contain bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="relative my-8 w-full max-w-lg rounded-3xl border border-white/15 bg-zinc-900 p-6 sm:p-8 shadow-2xl text-white">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-purple to-brand-pink">
              <Upload className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-xl font-black uppercase tracking-tight text-white">
              Import Shared Lobby
            </h3>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6">
          {templates === null ? (
            <p className="text-xs text-zinc-400">Loading available templates...</p>
          ) : templates.length === 0 ? (
            <p className="text-xs text-zinc-400">No shared lobby templates are available right now.</p>
          ) : (
            <div className="grid gap-3">
              {templates.map((t) => {
                const isChecked = selected === t.id;
                return (
                  <label
                    key={t.id}
                    className={`flex cursor-pointer items-center gap-4 rounded-2xl border p-3.5 transition-all ${
                      isChecked
                        ? "border-brand-pink bg-brand-pink/15 shadow-lg shadow-brand-pink/10"
                        : "border-white/10 bg-black/30 hover:bg-white/5"
                    }`}
                  >
                    <input
                      type="radio"
                      name="template"
                      checked={isChecked}
                      onChange={() => setSelected(t.id)}
                      className="h-4 w-4 text-brand-pink focus:ring-brand-pink"
                    />
                    {t.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={assetUrl(t.image)}
                        alt={t.title}
                        className="h-12 w-16 rounded-xl border border-white/10 object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-16 items-center justify-center rounded-xl bg-white/5 border border-white/10">
                        <ImageIcon className="h-5 w-5 text-zinc-500" />
                      </div>
                    )}
                    <div>
                      <div className="text-sm font-bold text-white">{t.title}</div>
                      <div className="text-[10px] font-black uppercase text-brand-pink">
                        {t.layoutType || "Standard Layout"}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
          {errorMessage && (
            <p className="mt-3 text-xs font-semibold text-rose-400">{errorMessage}</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-white/10 mt-6 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/5 px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-zinc-300 hover:bg-white/10 hover:text-white transition"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!selected || loading}
            onClick={handleImport}
            className="btn-sophisticated rounded-xl px-8 py-2.5 text-xs font-extrabold uppercase tracking-wider text-white transition disabled:opacity-50"
          >
            {loading ? "Importing..." : "Import Template"}
          </button>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
}

export function LobbyManager({
  lobbies,
  eventId,
  initialAction,
  initialLobbyId,
}: LobbyManagerProps) {
  const router = useRouter();
  const [modalRow, setModalRow] = useState<LobbyRow | "new" | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);

  // Auto-open modal if searchParams specify initial edit action
  useEffect(() => {
    if (initialAction === "edit" && initialLobbyId) {
      const found = lobbies.find((l) => l.id === initialLobbyId);
      if (found) {
        setModalRow(found);
      }
    } else if (initialAction === "add" || initialAction === "new") {
      setModalRow("new");
    } else if (initialAction === "import") {
      setImportOpen(true);
    }
  }, [initialAction, initialLobbyId, lobbies]);

  const filtered = searchQueryFilter(lobbies, keyword);

  useEffect(() => {
    setPage(1);
  }, [keyword]);

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleSaved() {
    setModalRow(null);
    router.refresh();
  }

  function handleImported() {
    setImportOpen(false);
    router.refresh();
  }

  async function remove(id: number) {
    if (!window.confirm("Delete this lobby details? This action cannot be undone.")) return;
    setPendingId(id);
    setErrorMessage(null);
    try {
      await axios.delete(`/api/members/lobby/${id}`);
      router.refresh();
    } catch {
      setErrorMessage("Could not remove this lobby. Please try again.");
    } finally {
      setPendingId(null);
    }
  }

  function exportCsv() {
    const header = "ID,Title,Status,CreatedOn\n";
    const rows = filtered
      .map(
        (l) =>
          `${l.id},"${(l.title || "").replace(/"/g, '""')}",${l.status},"${new Date(
            l.createdOn
          ).toLocaleDateString()}"`
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `event-${eventId}-lobbies.csv`;
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
              Event Lobby Layouts
            </h2>
            <p className="text-xs font-medium text-zinc-400">
              Manage main virtual halls, child zones, and spot links for Event #{eventId}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setImportOpen(true)}
            className="flex items-center justify-center gap-2 rounded-xl border border-brand-pink/40 bg-brand-purple/30 px-5 py-2.5 text-xs font-extrabold uppercase tracking-wider text-white hover:bg-brand-purple/60 hover:border-brand-pink transition-all shadow-md"
          >
            <Upload className="h-4 w-4 text-brand-pink" />
            Import Lobby
          </button>

          <button
            onClick={() => setModalRow("new")}
            className="btn-sophisticated flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-xs font-extrabold uppercase tracking-wider text-white transition-all shadow-lg"
          >
            <Plus className="h-4 w-4" />
            Add Lobby
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
            placeholder="Search lobby titles..."
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
                <th className="px-6 py-4 font-black uppercase tracking-wider">Lobby Title</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider text-center">Status</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider text-center">Actions / Manage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-zinc-400 italic font-medium">
                    {lobbies.length === 0
                      ? "No lobby layout details configured yet for this event."
                      : "No matching lobbies found."}
                  </td>
                </tr>
              ) : (
                paged.map((lobby) => (
                  <tr
                    key={lobby.id}
                    className="group hover:bg-white/5 transition-colors text-zinc-200"
                  >
                    <td className="px-6 py-4 text-center font-mono font-bold text-brand-pink">
                      #{lobby.id}
                    </td>
                    <td className="px-6 py-4 font-bold text-white flex items-center gap-3">
                      {lobby.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={assetUrl(lobby.image)}
                          alt={lobby.title}
                          className="h-9 w-14 rounded-lg border border-white/10 object-cover"
                        />
                      ) : (
                        <div className="flex h-9 w-14 items-center justify-center rounded-lg bg-white/5 border border-white/10">
                          <ImageIcon className="h-4 w-4 text-zinc-500" />
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-extrabold text-white">{lobby.title}</div>
                        {lobby.description && (
                          <div className="text-[11px] text-zinc-400 line-clamp-1 max-w-xs font-normal">
                            {lobby.description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${
                          lobby.status === "enabled"
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            lobby.status === "enabled" ? "bg-emerald-400" : "bg-rose-400"
                          }`}
                        />
                        {lobby.status === "enabled" ? "Enabled" : "Disabled"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          title="Edit Lobby Details & Sub-Pages"
                          onClick={() => setModalRow(lobby)}
                          className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-300 hover:border-brand-pink hover:bg-brand-pink hover:text-white transition shadow-sm"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <Link
                          href={`/members/event_lobby_layout_manager?action=view_lobby&event_id=${eventId}`}
                          title="Preview Lobby"
                          target="_blank"
                          className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-300 hover:border-brand-purple hover:bg-brand-purple hover:text-white transition shadow-sm"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Link>
                        <button
                          title="Delete Lobby"
                          disabled={pendingId === lobby.id}
                          onClick={() => remove(lobby.id)}
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
            <strong className="text-white">{lobbies.length}</strong> lobbies
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
        <LobbyFormModal
          defaultValues={
            modalRow === "new"
              ? undefined
              : {
                  id: modalRow.id,
                  title: modalRow.title,
                  splash_image: modalRow.splashImage ?? "",
                  image: modalRow.image ?? "",
                  video_path: modalRow.videoPath ?? "",
                  play_lobby_video: modalRow.playLobbyVideo,
                  description: modalRow.description ?? "",
                  agenda_welcome_message: modalRow.agendaWelcomeMessage ?? "",
                  status: (modalRow.status as (typeof LOBBY_STATUSES)[number]) ?? "enabled",
                  chat_script: modalRow.chatScript ?? "",
                  spot_color: modalRow.spotColor ?? "var(--color-brand-pink)",
                  spot_size: modalRow.spotSize,
                }
          }
          eventId={eventId}
          onClose={() => setModalRow(null)}
          onSaved={handleSaved}
        />
      )}

      {importOpen && (
        <ImportLobbyModal
          eventId={eventId}
          onClose={() => setImportOpen(false)}
          onImported={handleImported}
        />
      )}
    </div>
  );
}

function searchQueryFilter(lobbies: LobbyRow[], keyword: string) {
  const q = keyword.trim().toLowerCase();
  if (!q) return lobbies;
  return lobbies.filter(
    (l) =>
      l.title.toLowerCase().includes(q) ||
      l.status.toLowerCase().includes(q) ||
      l.id.toString().includes(q)
  );
}
