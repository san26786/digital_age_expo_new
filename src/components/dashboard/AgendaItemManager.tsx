"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios, { isAxiosError } from "axios";
import {
  Plus,
  Search,
  X,
  Pencil,
  Trash2,
  Download,
  CalendarClock,
  Clock,
  Mic2,
  Video,
  Settings2,
  Layers,
  CircleDot,
} from "lucide-react";
import {
  eventLobbyAgendaItemSchema,
  AGENDA_ITEM_STATUSES,
  AGENDA_VIDEO_TYPES,
  type EventLobbyAgendaItemInput,
} from "@/lib/validations/eventLobbyAgendaItem";
import {
  eventLobbyAgendaTrackSchema,
  AGENDA_TRACK_STATUSES,
  normaliseAgendaTrackStatus,
  normaliseAgendaTrackType,
  type EventLobbyAgendaTrackInput,
} from "@/lib/validations/eventLobbyAgendaTrack";
import type { AgendaItemRow, AgendaTrackRow, AssignableSpeakerOption } from "@/lib/services/eventLobbyAgendaItems";

import { ModalPortal } from "@/components/ui/ModalPortal";
const FIELD_CLASS =
  "w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-purple focus:outline-none focus:ring-1 focus:ring-brand-purple";
const LABEL_CLASS = "mb-1 block text-sm font-semibold text-slate-800";

function extractErrorMessage(err: unknown, fallback: string): string {
  if (!isAxiosError(err)) return fallback;
  const apiError = err.response?.data?.error;
  if (typeof apiError === "string") return apiError;
  if (apiError && typeof apiError === "object") {
    const firstField = Object.values(apiError as Record<string, string[] | undefined>).find(
      (messages) => Array.isArray(messages) && messages.length > 0
    );
    if (firstField?.[0]) return firstField[0];
  }
  return fallback;
}

function formatTime(time: string): string {
  const [hStr, m] = time.split(":");
  const h = Number(hStr);
  const period = h >= 12 ? "PM" : "AM";
  const displayHour = h % 12 === 0 ? 12 : h % 12;
  return `${displayHour}:${m} ${period}`;
}

function formatDateHeading(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

/* ----------------------------- Track management ---------------------------- */

function TrackFormModal({
  defaultValues,
  onClose,
  onSaved,
}: {
  defaultValues?: Partial<EventLobbyAgendaTrackInput> & { id?: number };
  onClose: () => void;
  onSaved: () => void;
}) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isEdit = typeof defaultValues?.id === "number";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EventLobbyAgendaTrackInput>({
    resolver: zodResolver(eventLobbyAgendaTrackSchema) as any,
    defaultValues: {
      title: defaultValues?.title ?? "",
      description: defaultValues?.description ?? "",
      agenda_type: defaultValues?.agenda_type ?? "",
      status: defaultValues?.status ?? "active",
    },
  });

  async function onSubmit(data: EventLobbyAgendaTrackInput) {
    setErrorMessage(null);
    try {
      if (isEdit) {
        await axios.patch(`/api/members/lobby-agenda-tracks/${defaultValues!.id}`, data);
      } else {
        await axios.post("/api/members/lobby-agenda-tracks", data);
      }
      onSaved();
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, "Could not save this track."));
    }
  }

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[60] grid place-items-center overflow-y-auto overscroll-contain bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <h3 className="text-base font-bold text-slate-900">{isEdit ? "Edit Track" : "New Session Track"}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-4 grid gap-3.5">
          <div>
            <label className={LABEL_CLASS}>Track / Hall Name *</label>
            <input {...register("title")} placeholder="e.g. Main Stage" className={FIELD_CLASS} />
            {errors.title && <p className="mt-1 text-xs font-medium text-red-600">{errors.title.message}</p>}
          </div>
          <div>
            <label className={LABEL_CLASS}>Description</label>
            <textarea {...register("description")} rows={2} className={FIELD_CLASS} />
          </div>
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className={LABEL_CLASS}>Type</label>
              <input {...register("agenda_type")} placeholder="e.g. Keynote" className={FIELD_CLASS} />
            </div>
            <div>
              <label className={LABEL_CLASS}>Status</label>
              <select {...register("status")} className={FIELD_CLASS}>
                {AGENDA_TRACK_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s === "active" ? "Active" : "Inactive"}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {errorMessage && (
            <div className="rounded-lg bg-red-50 p-3 text-xs font-semibold text-red-700 border border-red-200">
              {errorMessage}
            </div>
          )}

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-brand-purple px-5 py-2 text-sm font-bold text-white shadow-md hover:bg-brand-purple-hover disabled:opacity-60"
            >
              {isSubmitting ? "Saving..." : isEdit ? "Save Changes" : "Create Track"}
            </button>
          </div>
        </form>
      </div>
    </div>
    </ModalPortal>
  );
}

function ManageTracksModal({
  tracks,
  onClose,
  onChanged,
}: {
  tracks: AgendaTrackRow[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [formTrack, setFormTrack] = useState<AgendaTrackRow | "new" | null>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function remove(id: number) {
    if (!window.confirm("Remove this track? Sessions must be moved or deleted first.")) return;
    setPendingId(id);
    setErrorMessage(null);
    try {
      await axios.delete(`/api/members/lobby-agenda-tracks/${id}`);
      onChanged();
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, "Could not remove this track."));
    } finally {
      setPendingId(null);
    }
  }

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto overscroll-contain bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-purple/10 text-brand-purple">
              <Layers className="h-4.5 w-4.5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Manage Session Tracks</h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="h-4 w-4" />
          </button>
        </div>

        {errorMessage && (
          <div className="mt-3 rounded-lg bg-red-50 p-3 text-xs font-semibold text-red-700 border border-red-200">
            {errorMessage}
          </div>
        )}

        <div className="mt-4 grid gap-2">
          {tracks.length === 0 && <p className="text-sm text-slate-500">No tracks yet — add the first one below.</p>}
          {tracks.map((t) => (
            <div key={t.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-3.5 py-2.5">
              <div>
                <div className="text-sm font-semibold text-slate-900">{t.title}</div>
                <div className="text-xs text-slate-500">{t.status === "active" ? "Active" : "Inactive"}</div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setFormTrack(t)}
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-purple-50 hover:text-brand-purple"
                  title="Edit track"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => remove(t.id)}
                  disabled={pendingId === t.id}
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                  title="Delete track"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => setFormTrack("new")}
          className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-brand-purple px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-brand-purple-hover"
        >
          <Plus className="h-4 w-4" />
          Add Track
        </button>
      </div>

      {formTrack && (
        <TrackFormModal
          defaultValues={
            formTrack === "new"
              ? undefined
              : {
                  // Mapped field by field: AgendaTrackRow is camelCase, the form input is
                  // snake_case, so spreading the row quietly dropped agenda_type and left the
                  // status union unsatisfied.
                  id: formTrack.id,
                  title: formTrack.title,
                  description: formTrack.description,
                  agenda_type: normaliseAgendaTrackType(formTrack.agendaType),
                  status: normaliseAgendaTrackStatus(formTrack.status),
                }
          }
          onClose={() => setFormTrack(null)}
          onSaved={() => {
            setFormTrack(null);
            onChanged();
          }}
        />
      )}
    </div>
    </ModalPortal>
  );
}

/* ----------------------------- Session management ---------------------------- */

interface SessionFormDefaults extends Partial<EventLobbyAgendaItemInput> {
  id?: number;
}

function SessionFormModal({
  defaultValues,
  tracks,
  speakers,
  onClose,
  onSaved,
  onNeedTrack,
}: {
  defaultValues?: SessionFormDefaults;
  tracks: AgendaTrackRow[];
  speakers: AssignableSpeakerOption[];
  onClose: () => void;
  onSaved: () => void;
  onNeedTrack: () => void;
}) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isEdit = typeof defaultValues?.id === "number";

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EventLobbyAgendaItemInput>({
    resolver: zodResolver(eventLobbyAgendaItemSchema) as any,
    defaultValues: {
      agenda_id: defaultValues?.agenda_id ?? tracks[0]?.id ?? 0,
      title: defaultValues?.title ?? "",
      description: defaultValues?.description ?? "",
      session_date: defaultValues?.session_date ?? new Date().toISOString().slice(0, 10),
      start_time: defaultValues?.start_time ?? "09:00",
      end_time: defaultValues?.end_time ?? "10:00",
      speaker_id: defaultValues?.speaker_id ?? null,
      speaker_name: defaultValues?.speaker_name ?? "",
      video_type: defaultValues?.video_type ?? "",
      meeting_id: defaultValues?.meeting_id ?? "",
      meeting_password: defaultValues?.meeting_password ?? "",
      video_link: defaultValues?.video_link ?? "",
      status: defaultValues?.status ?? "active",
      tentative_schedule: defaultValues?.tentative_schedule ?? false,
    },
  });

  const description = watch("description") ?? "";
  const videoType = watch("video_type");

  async function onSubmit(data: EventLobbyAgendaItemInput) {
    setErrorMessage(null);
    try {
      if (isEdit) {
        await axios.patch(`/api/members/lobby-agenda-items/${defaultValues!.id}`, data);
      } else {
        await axios.post("/api/members/lobby-agenda-items", data);
      }
      onSaved();
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, "Could not save this session. Please check the form and try again."));
    }
  }

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto overscroll-contain bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-purple/10 text-brand-purple">
              <CalendarClock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">{isEdit ? "Edit Session" : "Add Session"}</h3>
              <p className="text-xs text-slate-500">Schedule a talk, workshop or session for the event agenda.</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-5 grid gap-4">
          <div>
            <label className={LABEL_CLASS}>Session Title *</label>
            <input {...register("title")} placeholder="e.g. Opening Keynote" className={FIELD_CLASS} />
            {errors.title && <p className="mt-1 text-xs font-medium text-red-600">{errors.title.message}</p>}
          </div>

          <div className="grid gap-3.5 sm:grid-cols-2">
            <div>
              <label className={LABEL_CLASS}>Track / Hall *</label>
              {tracks.length === 0 ? (
                <button
                  type="button"
                  onClick={onNeedTrack}
                  className="w-full rounded-lg border border-dashed border-brand-purple/40 px-3.5 py-2.5 text-sm font-semibold text-brand-purple hover:bg-purple-50"
                >
                  + Create a track first
                </button>
              ) : (
                <select {...register("agenda_id")} className={FIELD_CLASS}>
                  {tracks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              )}
              {errors.agenda_id && <p className="mt-1 text-xs font-medium text-red-600">{errors.agenda_id.message}</p>}
            </div>
            <div>
              <label className={LABEL_CLASS}>Status</label>
              <select {...register("status")} className={FIELD_CLASS}>
                {AGENDA_ITEM_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s === "active" ? "Active" : "Inactive"}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-3.5 sm:grid-cols-3">
            <div>
              <label className={LABEL_CLASS}>Session Date *</label>
              <input type="date" {...register("session_date")} className={FIELD_CLASS} />
              {errors.session_date && <p className="mt-1 text-xs font-medium text-red-600">{errors.session_date.message}</p>}
            </div>
            <div>
              <label className={LABEL_CLASS}>Start Time *</label>
              <input type="time" {...register("start_time")} className={FIELD_CLASS} />
            </div>
            <div>
              <label className={LABEL_CLASS}>End Time *</label>
              <input type="time" {...register("end_time")} className={FIELD_CLASS} />
              {errors.end_time && <p className="mt-1 text-xs font-medium text-red-600">{errors.end_time.message}</p>}
            </div>
          </div>

          <div>
            <label className={LABEL_CLASS}>Description</label>
            <textarea {...register("description")} rows={3} maxLength={500} className={FIELD_CLASS} />
            <p className="mt-1 text-right text-xs text-slate-400">{description.length}/500</p>
          </div>

          <div className="grid gap-3.5 sm:grid-cols-2">
            <div>
              <label className={LABEL_CLASS}>Speaker</label>
              <select {...register("speaker_id")} className={FIELD_CLASS}>
                <option value="">— No speaker assigned —</option>
                {speakers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL_CLASS}>Speaker Name (display)</label>
              <input {...register("speaker_name")} placeholder="Shown if no profile is linked" className={FIELD_CLASS} />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <label className={LABEL_CLASS}>Video / Streaming</label>
            <div className="grid gap-3.5 sm:grid-cols-3">
              <select {...register("video_type")} className={FIELD_CLASS}>
                {AGENDA_VIDEO_TYPES.map((v) => (
                  <option key={v} value={v}>
                    {v === "" ? "None" : v[0].toUpperCase() + v.slice(1)}
                  </option>
                ))}
              </select>
              {videoType && videoType !== "" && (
                <>
                  <input {...register("meeting_id")} placeholder="Meeting ID" className={FIELD_CLASS} />
                  <input {...register("meeting_password")} placeholder="Password" className={FIELD_CLASS} />
                </>
              )}
            </div>
            {videoType && videoType !== "" && (
              <input {...register("video_link")} placeholder="https://..." className={`${FIELD_CLASS} mt-3.5`} />
            )}
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" {...register("tentative_schedule")} className="h-3.5 w-3.5 rounded border-slate-300" />
            Mark as tentative (subject to change)
          </label>

          {errorMessage && (
            <div className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700 border border-red-200">
              {errorMessage}
            </div>
          )}

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || tracks.length === 0}
              className="rounded-xl bg-brand-purple px-5 py-2 text-sm font-bold text-white shadow-md hover:bg-brand-purple-hover disabled:opacity-60"
            >
              {isSubmitting ? "Saving..." : isEdit ? "Save Changes" : "Add Session"}
            </button>
          </div>
        </form>
      </div>
    </div>
    </ModalPortal>
  );
}

/* ----------------------------- Main manager ---------------------------- */

export function AgendaItemManager({
  tracks,
  items,
  speakers,
}: {
  tracks: AgendaTrackRow[];
  items: AgendaItemRow[];
  speakers: AssignableSpeakerOption[];
}) {
  const router = useRouter();
  const [itemList, setItemList] = useState(items);
  const [trackFilter, setTrackFilter] = useState<number | "all">("all");
  const [keyword, setKeyword] = useState("");
  const [modalItem, setModalItem] = useState<AgendaItemRow | "new" | null>(null);
  const [tracksModalOpen, setTracksModalOpen] = useState(false);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => setItemList(items), [items]);

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return itemList.filter((i) => {
      if (trackFilter !== "all" && i.agendaId !== trackFilter) return false;
      if (!q) return true;
      return (
        i.title.toLowerCase().includes(q) ||
        i.agendaTitle.toLowerCase().includes(q) ||
        (i.speakerName ?? "").toLowerCase().includes(q)
      );
    });
  }, [itemList, trackFilter, keyword]);

  const grouped = useMemo(() => {
    const byDate = new Map<string, AgendaItemRow[]>();
    for (const item of filtered) {
      if (!byDate.has(item.sessionDate)) byDate.set(item.sessionDate, []);
      byDate.get(item.sessionDate)!.push(item);
    }
    return [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, sessions]) => ({
        date,
        sessions: sessions.sort((a, b) => a.startTime.localeCompare(b.startTime)),
      }));
  }, [filtered]);

  function handleSaved() {
    setModalItem(null);
    router.refresh();
  }

  async function remove(id: number) {
    if (!window.confirm("Remove this session? This cannot be undone.")) return;
    setPendingId(id);
    setErrorMessage(null);
    try {
      await axios.delete(`/api/members/lobby-agenda-items/${id}`);
      setItemList((prev) => prev.filter((i) => i.id !== id));
      router.refresh();
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, "Could not remove this session."));
    } finally {
      setPendingId(null);
    }
  }

  function exportCsv() {
    const header = "Date,Start,End,Title,Track,Speaker,Status\n";
    const rows = filtered
      .map(
        (i) =>
          `${i.sessionDate},${i.startTime},${i.endTime},"${i.title.replace(/"/g, '""')}","${i.agendaTitle}","${i.speakerName ?? ""}",${i.status}`
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "event-agenda.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      {errorMessage && (
        <div className="rounded-xl bg-red-50 p-3.5 text-sm font-medium text-red-700 border border-red-200">
          {errorMessage}
        </div>
      )}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setTrackFilter("all")}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
              trackFilter === "all" ? "bg-brand-purple text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All Tracks ({itemList.length})
          </button>
          {tracks.map((t) => (
            <button
              key={t.id}
              onClick={() => setTrackFilter(t.id)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                trackFilter === t.id ? "bg-brand-purple text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {t.title} ({itemList.filter((i) => i.agendaId === t.id).length})
            </button>
          ))}
          <button
            onClick={() => setTracksModalOpen(true)}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 px-3.5 py-1.5 text-xs font-semibold text-slate-500 hover:border-brand-purple hover:text-brand-purple"
          >
            <Settings2 className="h-3.5 w-3.5" />
            Manage Tracks
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-[200px] flex-1 sm:w-56 sm:flex-initial">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              type="text"
              placeholder="Search sessions..."
              autoComplete="off"
              className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-brand-purple focus:outline-none focus:ring-1 focus:ring-brand-purple"
            />
          </div>
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50"
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </button>
          <button
            onClick={() => setModalItem("new")}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-purple px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-brand-purple-hover"
          >
            <Plus className="h-4 w-4" />
            Add Session
          </button>
        </div>
      </div>

      {grouped.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 py-14 text-center text-slate-500">
          <CalendarClock className="mx-auto h-10 w-10 text-slate-400" />
          <p className="mt-2 text-sm font-semibold text-slate-700">No sessions scheduled yet</p>
          <p className="text-xs text-slate-500 mt-0.5">Add your first session to start building the agenda.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ date, sessions }) => (
            <div key={date}>
              <h4 className="mb-2.5 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-brand-purple">
                <CalendarClock className="h-4 w-4" />
                {formatDateHeading(date)}
              </h4>
              <div className="space-y-2.5">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className="group flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition hover:border-purple-300 hover:shadow-md sm:flex-row sm:items-center"
                  >
                    <div className="flex shrink-0 items-center gap-1.5 rounded-xl bg-purple-50 px-3 py-2 text-xs font-bold text-brand-purple sm:w-40">
                      <Clock className="h-3.5 w-3.5" />
                      {formatTime(session.startTime)} – {formatTime(session.endTime)}
                    </div>

                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h5 className="font-bold text-slate-900">{session.title}</h5>
                        {session.tentativeSchedule && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700">
                            Tentative
                          </span>
                        )}
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                            session.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          <CircleDot className="h-2.5 w-2.5" />
                          {session.status}
                        </span>
                      </div>
                      {session.description && (
                        <p className="mt-1 line-clamp-2 text-xs text-slate-500">{session.description}</p>
                      )}
                      <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1 font-semibold text-slate-600">
                          <Layers className="h-3 w-3" />
                          {session.agendaTitle}
                        </span>
                        {session.speakerName && (
                          <span className="inline-flex items-center gap-1">
                            <Mic2 className="h-3 w-3" />
                            {session.speakerName}
                          </span>
                        )}
                        {session.videoLink && (
                          <span className="inline-flex items-center gap-1">
                            <Video className="h-3 w-3" />
                            {session.videoType || "Video"}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1 self-end sm:self-center">
                      <button
                        onClick={() => setModalItem(session)}
                        className="rounded-lg p-2 text-slate-500 hover:bg-purple-50 hover:text-brand-purple"
                        title="Edit session"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => remove(session.id)}
                        disabled={pendingId === session.id}
                        className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                        title="Delete session"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {modalItem && (
        <SessionFormModal
          defaultValues={
            modalItem === "new"
              ? undefined
              : {
                  id: modalItem.id,
                  agenda_id: modalItem.agendaId,
                  title: modalItem.title,
                  description: modalItem.description,
                  session_date: modalItem.sessionDate,
                  start_time: modalItem.startTime,
                  end_time: modalItem.endTime,
                  speaker_id: modalItem.speakerId,
                  speaker_name: modalItem.speakerName ?? "",
                  video_type: (modalItem.videoType as any) ?? "",
                  meeting_id: modalItem.meetingId ?? "",
                  meeting_password: modalItem.meetingPassword ?? "",
                  video_link: modalItem.videoLink ?? "",
                  status: (modalItem.status as any) ?? "active",
                  tentative_schedule: modalItem.tentativeSchedule,
                }
          }
          tracks={tracks}
          speakers={speakers}
          onClose={() => setModalItem(null)}
          onSaved={handleSaved}
          onNeedTrack={() => {
            setModalItem(null);
            setTracksModalOpen(true);
          }}
        />
      )}

      {tracksModalOpen && (
        <ManageTracksModal
          tracks={tracks}
          onClose={() => setTracksModalOpen(false)}
          onChanged={() => {
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
