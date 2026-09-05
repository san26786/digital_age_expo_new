"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios, { isAxiosError } from "axios";
import { Target, Video, Link2, Users, Pencil, Trash2, X, Check, ImagePlus } from "lucide-react";
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

/**
 * Default footprint for a hand-placed browse area, in percent of the artwork.
 *
 * Sized to roughly match the hall screens in the legacy auditorium data (35.7% x 35.1%), so a
 * fresh panel lands close to the right size and usually needs nudging rather than rebuilding.
 */
const DEFAULT_PANEL_WIDTH = 35;
const DEFAULT_PANEL_HEIGHT = 35;

interface LobbySpotsCanvasProps {
  spots: LobbySpotRow[];
  /**
   * Public path to the background video, e.g. "/images/event_47.mp4".
   * Optional — falls back to DEFAULT_BACKGROUND_VIDEO if not provided.
   */
  backgroundVideo?: string | null;
  /**
   * Public path to a background STILL, e.g. "/images/external/lobby/child/event_1470.png".
   *
   * A child zone's artwork is usually a PNG, not a clip — the auditorium this page is reached
   * from is `files/lobby/child/event_1470.png`. The legacy template branches on exactly this
   * (`strpos($image, ".mp4")` picks <video>, everything else falls through to <img class="img-fluid">),
   * and without the image branch a PNG-backed zone silently rendered the default clip: the right
   * spots floating over the wrong room. When set, this wins over backgroundVideo.
   */
  backgroundImage?: string | null;
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
      width: defaultValues.width,
      height: defaultValues.height,
    },
  });

  async function onSubmit(data: EventLobbySpotInput) {
    setErrorMessage(null);
    try {
      /*
       * width/height are re-attached from defaultValues rather than read out of `data`: the form
       * has no inputs for them, and relying on react-hook-form to echo unregistered defaults back
       * through handleSubmit is exactly the kind of assumption that silently turns a browse area
       * into a point marker on save.
       */
      onSaved({
        ...data,
        width: defaultValues.width,
        height: defaultValues.height,
        id: defaultValues.id,
      });
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
  backgroundImage,
  childId,
}: LobbySpotsCanvasProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [localSpots, setLocalSpots] = useState(spots);
  const [addType, setAddType] = useState<(typeof LOBBY_SPOT_TYPES)[number] | null>(null);
  /**
   * Placing a BROWSE AREA rather than a point spot.
   *
   * Kept separate from addType because it is not another spot type — it is the same spot with a
   * size, and size is what turns a marker into an uploadable panel.
   */
  const [addingPanel, setAddingPanel] = useState(false);
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

  const imageSrc = toPublicPath(backgroundImage);
  const [imageFailed, setImageFailed] = useState(false);

  const [uploadingSpotId, setUploadingSpotId] = useState<number | null>(null);

  /**
   * Put artwork on a panel spot.
   *
   * The new URL is written straight into local state rather than triggering a refetch: the
   * response already carries it (with a cache-busting suffix, because the filename is derived
   * from the spot id and so never changes), and reloading the whole canvas would throw away any
   * unsaved drag positions.
   */
  async function uploadSpotImage(spotId: number, file: File) {
    setUploadingSpotId(spotId);
    setErrorMessage(null);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("id", String(spotId));

      const res = await fetch("/api/members/lobby-spots/upload", { method: "POST", body });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setErrorMessage(data?.error ?? "Could not upload that image.");
        return;
      }
      setLocalSpots((prev) =>
        prev.map((s) => (s.id === spotId ? { ...s, imageUrl: data?.url ?? null } : s))
      );
    } catch {
      setErrorMessage("Could not upload that image.");
    } finally {
      setUploadingSpotId(null);
    }
  }

  async function clearSpotImage(spotId: number) {
    setErrorMessage(null);
    try {
      const body = new FormData();
      body.append("id", String(spotId));
      body.append("remove", "1");

      const res = await fetch("/api/members/lobby-spots/upload", { method: "POST", body });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setErrorMessage(data?.error ?? "Could not remove that image.");
        return;
      }
      setLocalSpots((prev) => prev.map((s) => (s.id === spotId ? { ...s, imageUrl: null } : s)));
    } catch {
      setErrorMessage("Could not remove that image.");
    }
  }

  useEffect(() => setLocalSpots(spots), [spots]);
  useEffect(() => setSrcFailed(false), [requestedSrc]);

  function relativePosition(clientX: number, clientY: number) {
    const rect = containerRef.current!.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100));
    return { x, y };
  }

  function handleBackgroundClick(e: React.MouseEvent<HTMLDivElement>) {
    if (addingPanel && containerRef.current) {
      if ((e.target as HTMLElement).closest("[data-spot-marker]")) return;
      const { x, y } = relativePosition(e.clientX, e.clientY);
      /*
       * The click is the panel's CENTRE, but x/y are stored as its top-left, so half the default
       * size comes back off. Clamped so a click near an edge still lands a fully visible panel
       * instead of one hanging off the artwork.
       */
      const width = DEFAULT_PANEL_WIDTH;
      const height = DEFAULT_PANEL_HEIGHT;
      const left = Math.min(Math.max(x - width / 2, 0), 100 - width);
      const top = Math.min(Math.max(y - height / 2, 0), 100 - height);
      setModalSpot({
        title: "",
        spot_type: "info",
        redirection_path: "",
        x: left,
        y: top,
        width,
        height,
      });
      setAddingPanel(false);
      return;
    }

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
      // Carried through so opening and saving a browse area does not demote it to a marker.
      width: spot.width ?? undefined,
      height: spot.height ?? undefined,
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
        {addingPanel
          ? "Click the middle of the screen you want to cover — it becomes a browse area you can upload artwork into, then drag or resize."
          : addType
            ? `Click anywhere on the background below to place a "${TYPE_META[addType].label}" spot.`
            : "Pick a spot type from the toolbar below, then click the background to place it. Drag existing spots to reposition, click a spot to edit it."}
      </p>

      <div
        ref={containerRef}
        onClick={handleBackgroundClick}
        className={`relative w-full overflow-hidden border border-slate-200 ${
          addType || addingPanel ? "cursor-crosshair" : ""
        }`}
      >
        {imageSrc && !imageFailed ? (
          /*
           * NATURAL ASPECT RATIO, deliberately: `h-auto`, never object-cover.
           *
           * Every spot is positioned in PERCENTAGES of this box. Cropping or letterboxing the
           * artwork moves the picture underneath those percentages while leaving them where they
           * are, so each marker drifts off the thing it labels — the same trap as the stand
           * template slots. Letting the image set the box's height keeps the two in lockstep at
           * any width, exactly like the legacy `img-fluid` (width:100%; height:auto).
           */
          <img
            key={imageSrc}
            src={imageSrc}
            alt=""
            onError={() => setImageFailed(true)}
            className="block w-full select-none"
          />
        ) : imageSrc && imageFailed ? (
          /*
           * The artwork is configured but not on disk — public/images/external/** only exists
           * once `npm run images:download` has mirrored it. Say so, rather than falling back to
           * the default clip: an unrelated room under the correct spots reads as "the spots are
           * wrong" and sends you looking in the wrong place.
           */
          <div className="flex min-h-[280px] w-full flex-col items-center justify-center gap-2 bg-zinc-900 px-6 text-center">
            <p className="text-sm font-semibold text-zinc-300">Zone artwork not downloaded yet</p>
            <p className="max-w-md text-xs text-zinc-500">
              This zone is configured with <code className="text-zinc-400">{imageSrc.split("/").pop()}</code>,
              which isn&apos;t in <code className="text-zinc-400">public/images/external/</code> yet.
              Run <code className="text-zinc-400">npm run images:download</code> to mirror it. Spots
              below still save normally.
            </p>
          </div>
        ) : (
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
        )}

        {localSpots.map((spot) => {
          const type = (spot.spotType as (typeof LOBBY_SPOT_TYPES)[number]) ?? "info";
          const meta = TYPE_META[type] ?? TYPE_META.info;
          const isVideo = type === "video";

          /*
           * A spot with a width and height is a PANEL — one of the screens on the zone artwork,
           * like the two hall displays in the auditorium — and is drawn at its real size so it
           * covers the thing it represents. Everything else stays a point marker.
           *
           * The two differ in how they anchor, which is easy to get wrong: a marker is centred on
           * its coordinate (-translate-x-1/2), whereas a panel's x/y is its TOP-LEFT corner, the
           * same convention the legacy builder writes. Centring a panel would offset it by half
           * its own size.
           */
          const panel =
            spot.width !== null && spot.height !== null
              ? { width: spot.width, height: spot.height }
              : null;

          if (panel) {
            const uploading = uploadingSpotId === spot.id;
            return (
              <div
                key={spot.id}
                data-spot-marker
                onMouseDown={(e) => startDrag(spot.id, e)}
                style={{
                  // Exactly the four values the legacy block carries, in the same units:
                  //   style="width: 35.7292%; height: 35.1389%; left: 51.4844%; top: 2.31337%;
                  //          transform: rotate(0rad)"
                  // Percentages resolve against the artwork's own box, so the panel keeps
                  // covering the same part of the picture at any window width.
                  left: `${spot.x}%`,
                  top: `${spot.y}%`,
                  width: `${panel.width}%`,
                  height: `${panel.height}%`,
                  transform: spot.angle ? `rotate(${spot.angle}rad)` : undefined,
                }}
                className="group absolute cursor-move border-2 border-dashed border-white/70 bg-black/20"
              >
                {spot.imageUrl && (
                  <img
                    src={spot.imageUrl}
                    alt=""
                    className="pointer-events-none absolute inset-0 h-full w-full object-fill"
                  />
                )}

                {/*
                  * Always visible, not hover-only. A hover-reveal control on a panel that is
                  * itself only an outline is effectively invisible — there is nothing to suggest
                  * hovering. The scrim stays light until hover so it does not bury artwork that
                  * has already been uploaded.
                  */}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-2 text-center">
                  <div
                    className={`absolute inset-0 transition ${
                      spot.imageUrl ? "bg-black/0 group-hover:bg-black/55" : "bg-black/35 group-hover:bg-black/55"
                    }`}
                  />
                  <span
                    className={`relative text-[11px] font-bold uppercase tracking-wide text-white transition ${
                      spot.imageUrl ? "opacity-0 group-hover:opacity-100" : "opacity-100"
                    }`}
                  >
                    {spot.title || meta.label}
                  </span>
                  <label
                    className={`relative cursor-pointer rounded-md bg-white px-3 py-1 text-[11px] font-bold text-zinc-900 shadow transition hover:bg-zinc-100 ${
                      spot.imageUrl ? "opacity-0 group-hover:opacity-100" : "opacity-100"
                    }`}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {uploading ? "Uploading…" : spot.imageUrl ? "Replace" : "Browse"}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/gif,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        // Reset the input so re-picking the SAME file fires change again.
                        e.target.value = "";
                        if (file) void uploadSpotImage(spot.id, file);
                      }}
                    />
                  </label>
                  {spot.imageUrl && (
                    <button
                      type="button"
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        void clearSpotImage(spot.id);
                      }}
                      className="relative text-[10px] font-semibold text-white/80 underline hover:text-white"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            );
          }

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

      {/*
        * Says plainly what came back from the database. "4 spots, 0 browse areas" is the
        * difference between "the feature is broken" and "these rows have no size", which is not
        * otherwise visible from the picture.
        */}
      <p className="mt-3 text-center text-xs text-slate-500">
        {localSpots.length} spot{localSpots.length === 1 ? "" : "s"} on this zone
        {" · "}
        {localSpots.filter((s) => s.width !== null && s.height !== null).length} browse area
        {localSpots.filter((s) => s.width !== null && s.height !== null).length === 1 ? "" : "s"}
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          title="Add a browse area"
          onClick={() => {
            setAddingPanel((prev) => !prev);
            setAddType(null);
          }}
          className={`flex h-11 items-center gap-2 rounded-full px-4 text-xs font-bold uppercase tracking-wide text-white shadow transition ${
            addingPanel ? "bg-emerald-600" : "bg-purple-800 hover:bg-purple-900"
          }`}
        >
          <ImagePlus className="h-4 w-4" />
          Browse Area
        </button>

        {LOBBY_SPOT_TYPES.map((type) => {
          const meta = TYPE_META[type];
          const Icon = meta.icon;
          const active = addType === type;
          return (
            <button
              key={type}
              type="button"
              title={meta.label}
              onClick={() => {
                setAddType((prev) => (prev === type ? null : type));
                setAddingPanel(false);
              }}
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