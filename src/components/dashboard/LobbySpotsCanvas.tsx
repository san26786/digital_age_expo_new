"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios, { isAxiosError } from "axios";
import { Target, Video, Link2, Users, Pencil, Trash2, X, Check } from "lucide-react";
import { eventLobbySpotSchema, LOBBY_SPOT_TYPES, type EventLobbySpotInput } from "@/lib/validations/eventLobbySpot";
import type { LobbySpotRow } from "@/lib/services/eventLobbySpots";

import { ModalPortal } from "@/components/ui/ModalPortal";
const FIELD_CLASS =
  "w-full rounded-md border border-indigo-950/20 bg-white px-3.5 py-2.5 text-sm text-indigo-950 placeholder:text-indigo-950/40 focus:border-fuchsia-500 focus:outline-none";

// Files under /public are served from the site root, so a file at
// "public/images/event_47.mp4" on disk is reachable in the browser at "/images/event_47.mp4".
const DEFAULT_BACKGROUND_VIDEO = "/images/event_47.mp4";

const TYPE_META: Record<(typeof LOBBY_SPOT_TYPES)[number], { icon: typeof Target; label: string; dot: string }> = {
  info: { icon: Target, label: "Info Spot", dot: "bg-purple-800" },
  video: { icon: Video, label: "Video Panel", dot: "bg-rose-600" },
  link: { icon: Link2, label: "Link", dot: "bg-amber-500" },
  networking: { icon: Users, label: "Networking", dot: "bg-emerald-600" },
};

interface LobbySpotsCanvasProps {
  spots: LobbySpotRow[];
  /**
   * Public path to the background video, e.g. "/images/event_47.mp4".
   * Optional — falls back to DEFAULT_BACKGROUND_VIDEO if not provided.
   */
  backgroundVideo?: string | null;
  childId?: number;
}

type SpotFormValues = EventLobbySpotInput & { id?: number };

/**
 * Normalizes a possibly-Windows-style or public-prefixed path into a
 * browser-safe root-relative URL.
 * "\public\images\event_47.mp4" -> "/images/event_47.mp4"
 * "public/images/event_47.mp4"  -> "/images/event_47.mp4"
 * "/images/event_47.mp4"        -> "/images/event_47.mp4" (unchanged)
 */
function toPublicPath(path?: string | null): string | undefined {
  if (!path) return undefined;
  return (
    "/" +
    path
      .replace(/\\/g, "/")          // backslashes -> forward slashes
      .replace(/^\/?public\//i, "") // strip a leading "public/" segment
      .replace(/^\/+/, "")          // strip any remaining leading slashes
  );
}

function SpotFormModal({
  defaultValues,
  onClose,
  onSaved,
  onDeleted,
}: {
  defaultValues: SpotFormValues;
  onClose: () => void;
  onSaved: (values: EventLobbySpotInput & { id?: number }) => void;
  onDeleted?: () => void;
}) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isEdit = typeof defaultValues.id === "number";

  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<EventLobbySpotInput>({
    resolver: zodResolver(eventLobbySpotSchema) as any,
    defaultValues: {
      title: defaultValues.title ?? "",
      spot_type: defaultValues.spot_type,
      redirection_path: defaultValues.redirection_path ?? "",
      x: defaultValues.x,
      y: defaultValues.y,
    },
  });

  async function onSubmit(data: EventLobbySpotInput) {
    setErrorMessage(null);
    try {
      onSaved({ ...data, id: defaultValues.id });
      onClose();
    } catch (err) {
      setErrorMessage(
        isAxiosError(err) && typeof err.response?.data?.error === "string"
          ? err.response.data.error
          : "Could not save this spot."
      );
    }
  }

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto overscroll-contain bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="w-full max-w-md rounded-md bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <h3 className="text-lg font-black uppercase text-purple-900">{isEdit ? "Edit Spot" : "Add Spot"}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-5 grid gap-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Title</label>
            <input {...register("title")} className={FIELD_CLASS} placeholder="Shown as a tooltip" />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Spot Type</label>
            <select {...register("spot_type")} className={FIELD_CLASS}>
              {LOBBY_SPOT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {TYPE_META[t].label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Link URL</label>
            <input {...register("redirection_path")} className={FIELD_CLASS} placeholder="https://... (optional)" />
          </div>

          <input type="hidden" {...register("x")} />
          <input type="hidden" {...register("y")} />

          {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}

          <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-4">
            {isEdit && onDeleted ? (
              <button
                type="button"
                onClick={() => {
                  onDeleted();
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 rounded-sm border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" /> Delete
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-3">
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
                {isSubmitting ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
    </ModalPortal>
  );
}

export function LobbySpotsCanvas({
  spots,
  backgroundVideo,
  childId,
}: LobbySpotsCanvasProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [localSpots, setLocalSpots] = useState(spots);
  const [addType, setAddType] = useState<(typeof LOBBY_SPOT_TYPES)[number] | null>(null);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [modalSpot, setModalSpot] = useState<SpotFormValues | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Use the provided backgroundVideo if given, otherwise fall back to the default file.
  const requestedSrc = toPublicPath(backgroundVideo) ?? DEFAULT_BACKGROUND_VIDEO;

  /**
   * Last-resort guard: if the requested clip cannot be loaded (wrong folder,
   * not yet migrated, unsupported codec), swap to the bundled clip rather than
   * leaving an empty black box with the spot markers floating on nothing.
   */
  const [srcFailed, setSrcFailed] = useState(false);
  const videoSrc = srcFailed ? DEFAULT_BACKGROUND_VIDEO : requestedSrc;

  useEffect(() => setLocalSpots(spots), [spots]);
  useEffect(() => setSrcFailed(false), [requestedSrc]);

  function relativePosition(clientX: number, clientY: number) {
    const rect = containerRef.current!.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100));
    return { x, y };
  }

  function handleBackgroundClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!addType || !containerRef.current) return;
    if ((e.target as HTMLElement).closest("[data-spot-marker]")) return;
    const { x, y } = relativePosition(e.clientX, e.clientY);
    setModalSpot({ title: "", spot_type: addType, redirection_path: "", x, y });
    setAddType(null);
  }

  function startDrag(id: number, e: React.MouseEvent) {
    e.stopPropagation();
    setDraggingId(id);
  }

  function openEditModal(spot: LobbySpotRow) {
    setModalSpot({
      id: spot.id,
      title: spot.title,
      spot_type: (spot.spotType as (typeof LOBBY_SPOT_TYPES)[number]) ?? "info",
      redirection_path: spot.redirectionPath ?? "",
      x: spot.x,
      y: spot.y,
    });
  }

  useEffect(() => {
    if (draggingId === null) return;

    function onMove(e: MouseEvent) {
      if (!containerRef.current) return;
      const { x, y } = relativePosition(e.clientX, e.clientY);
      setLocalSpots((prev) => prev.map((s) => (s.id === draggingId ? { ...s, x, y } : s)));
    }

    async function onUp() {
      const spot = localSpots.find((s) => s.id === draggingId);
      setDraggingId(null);
      if (!spot) return;
      try {
        await axios.patch(`/api/members/lobby-spots/${spot.id}`, { x: spot.x, y: spot.y });
      } catch {
        setErrorMessage("Could not save the new spot position.");
        router.refresh();
      }
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp, { once: true });
    return () => window.removeEventListener("mousemove", onMove);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draggingId]);

  async function handleModalSaved(data: EventLobbySpotInput & { id?: number }) {
    setErrorMessage(null);
    try {
      if (data.id) {
        await axios.patch(`/api/members/lobby-spots/${data.id}`, data);
      } else {
        await axios.post("/api/members/lobby-spots", { ...data, child_id: childId });
      }
      router.refresh();
    } catch {
      setErrorMessage("Could not save this spot. Please try again.");
    }
  }

  async function handleDelete(id: number) {
    setErrorMessage(null);
    try {
      await axios.delete(`/api/members/lobby-spots/${id}`);
      setLocalSpots((prev) => prev.filter((s) => s.id !== id));
      router.refresh();
    } catch {
      setErrorMessage("Could not remove this spot.");
    }
  }

  return (
    <div>
      {errorMessage && <p className="mb-3 text-sm text-red-600">{errorMessage}</p>}

      <p className="mb-3 text-sm text-slate-500">
        {addType
          ? `Click anywhere on the video below to place a "${TYPE_META[addType].label}" spot.`
          : "Pick a spot type from the toolbar below, then click the video to place it. Drag existing spots to reposition, click a spot to edit it."}
      </p>

      <div
        ref={containerRef}
        onClick={handleBackgroundClick}
        className={`relative w-full overflow-hidden border border-slate-200 ${addType ? "cursor-crosshair" : ""}`}
      >
        <video
          key={videoSrc}
          src={videoSrc}
          onError={() => {
            if (videoSrc !== DEFAULT_BACKGROUND_VIDEO) setSrcFailed(true);
            else console.error(`[LobbySpotsCanvas] background video failed to load: ${videoSrc}`);
          }}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          className="block min-h-[280px] w-full select-none object-cover"
        />

        {localSpots.map((spot) => {
          const type = (spot.spotType as (typeof LOBBY_SPOT_TYPES)[number]) ?? "info";
          const meta = TYPE_META[type] ?? TYPE_META.info;
          const isVideo = type === "video";

          return (
            <div
              key={spot.id}
              data-spot-marker
              onMouseDown={(e) => startDrag(spot.id, e)}
              style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 cursor-move"
            >
              <div className="relative">
                {isVideo ? (
                  <div
                    className="flex h-16 w-24 items-center justify-center rounded-sm border-2 border-dashed border-white/80 bg-white/10 shadow-md sm:h-20 sm:w-28"
                    title={spot.title || meta.label}
                  >
                    <span className={`h-4 w-4 rounded-full border-2 border-white shadow ${meta.dot}`} />
                  </div>
                ) : (
                  <span
                    className={`block h-4 w-4 rounded-full border-2 border-white shadow ${meta.dot}`}
                    title={spot.title || meta.label}
                  />
                )}

                <div className="absolute left-full top-0 ml-1 flex flex-col gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditModal(spot);
                    }}
                    className="flex h-5 w-5 items-center justify-center rounded-sm border border-slate-100 bg-white text-rose-700 shadow hover:bg-rose-50"
                    title="Confirm / Edit"
                  >
                    <Check className="h-3 w-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditModal(spot);
                    }}
                    className="flex h-5 w-5 items-center justify-center rounded-sm border border-slate-100 bg-white text-rose-700 shadow hover:bg-rose-50"
                    title="Edit"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm("Remove this spot?")) handleDelete(spot.id);
                    }}
                    className="flex h-5 w-5 items-center justify-center rounded-sm border border-slate-100 bg-white text-rose-700 shadow hover:bg-rose-50"
                    title="Delete"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex justify-center gap-3">
        {LOBBY_SPOT_TYPES.map((type) => {
          const meta = TYPE_META[type];
          const Icon = meta.icon;
          const active = addType === type;
          return (
            <button
              key={type}
              type="button"
              title={meta.label}
              onClick={() => setAddType((prev) => (prev === type ? null : type))}
              className={`flex h-11 w-11 items-center justify-center rounded-full text-white shadow transition ${
                active ? "bg-emerald-600" : "bg-purple-800 hover:bg-purple-900"
              }`}
            >
              <Icon className="h-4 w-4" />
            </button>
          );
        })}
      </div>

      {modalSpot && (
        <SpotFormModal
          defaultValues={modalSpot}
          onClose={() => setModalSpot(null)}
          onSaved={handleModalSaved}
          onDeleted={modalSpot.id ? () => handleDelete(modalSpot.id!) : undefined}
        />
      )}
    </div>
  );
}