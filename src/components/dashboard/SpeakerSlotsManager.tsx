"use client";

import { useMemo, useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios, { isAxiosError } from "axios";
import {
  Calendar,
  Clock,
  MapPin,
  X,
  UserPlus,
  UserMinus,
  Search,
  Mic,
  CheckCircle2,
  Clock3,
  Layers,
  Pencil,
} from "lucide-react";
import { assignSpeakerSlotSchema, type AssignSpeakerSlotInput } from "@/lib/validations/eventSpeakerSlot";
import type { SpeakerSlotRow, AssignableSpeaker } from "@/lib/services/eventSpeakerSlots";
import { TablePagination } from "@/components/dashboard/TablePagination";

import { ModalPortal } from "@/components/ui/ModalPortal";
const PAGE_SIZE = 20;

const FIELD_CLASS =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-brand-pink focus:outline-none transition-colors backdrop-blur-md";

const DATE_FORMAT = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" });

function AssignModal({
  slot,
  speakers,
  onClose,
  onSaved,
}: {
  slot: SpeakerSlotRow;
  speakers: AssignableSpeaker[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isUpdate = Boolean(slot.speakerId);

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AssignSpeakerSlotInput>({
    resolver: zodResolver(assignSpeakerSlotSchema) as any,
    defaultValues: {
      speaker_id: slot.speakerId ?? "",
      title: slot.title ?? "",
      topic_description: slot.topicDescription ?? "",
    },
  });

  const selectedSpeakerId = watch("speaker_id");

  function handleSpeakerChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = Number(e.target.value);
    setValue("speaker_id", val);
    const speaker = speakers.find((s) => s.id === val);
    if (speaker?.topicDescription && !getValues("topic_description")) {
      setValue("topic_description", speaker.topicDescription);
    }
  }

  async function onSubmit(data: AssignSpeakerSlotInput) {
    setErrorMessage(null);
    try {
      await axios.patch(`/api/members/speaker-slots/${slot.id}`, data);
      onSaved();
    } catch (err) {
      setErrorMessage(
        isAxiosError(err) && typeof err.response?.data?.error === "string"
          ? err.response.data.error
          : "Could not save slot details. Please try again."
      );
    }
  }

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto overscroll-contain bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="w-full max-w-lg rounded-3xl bg-zinc-950 border border-white/10 p-8 shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div className="space-y-1">
            <h3 className="text-xl font-black uppercase tracking-widest text-white">
              {isUpdate ? "Update Session Details" : "Allocate Session"}
            </h3>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">
              {slot.roomName ? `${slot.roomName} • ${slot.durationTime}` : slot.durationTime}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full h-10 w-10 flex items-center justify-center bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
              Select Speaker*
            </label>
            <select
              value={selectedSpeakerId ?? ""}
              onChange={handleSpeakerChange}
              className={FIELD_CLASS}
            >
              <option value="" className="bg-zinc-900 text-zinc-400">
                -- Choose Active Speaker --
              </option>
              {speakers.map((s) => (
                <option key={s.id} value={s.id} className="bg-zinc-900 text-white">
                  {s.name} ({s.status})
                </option>
              ))}
            </select>
            {speakers.length === 0 && (
              <p className="text-xs font-medium text-amber-400/80">
                No active speakers found. Please register speakers in Manage Speakers first.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
              Session Topic / Title*
            </label>
            <input
              {...register("title")}
              className={FIELD_CLASS}
              placeholder="e.g. AI Innovations in Modern Enterprise"
            />
            {errors.title && <p className="text-xs font-bold text-red-500">{String(errors.title.message)}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
              Topic Description
            </label>
            <textarea
              {...register("topic_description")}
              rows={4}
              className={FIELD_CLASS}
              placeholder="Summary of presentation, key takeaways..."
            />
          </div>

          {errorMessage && (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold">
              {errorMessage}
            </div>
          )}

          <div className="flex justify-end gap-3 border-t border-white/5 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/10 bg-white/5 px-6 py-2.5 text-xs font-black uppercase tracking-widest text-zinc-300 transition hover:bg-white/10 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-full bg-brand-pink px-8 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-brand-pink/20 transition hover:scale-[1.02] active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : isUpdate ? "Update Session" : "Assign Speaker"}
            </button>
          </div>
        </form>
      </div>
    </div>
    </ModalPortal>
  );
}

export function SpeakerSlotsManager({
  initialSlots,
  initialSpeakers,
}: {
  initialSlots: SpeakerSlotRow[];
  initialSpeakers: AssignableSpeaker[];
}) {
  const [slots, setSlots] = useState<SpeakerSlotRow[]>(initialSlots);
  const [speakers, setSpeakers] = useState<AssignableSpeaker[]>(initialSpeakers);
  const [assignSlot, setAssignSlot] = useState<SpeakerSlotRow | null>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters
  const [roomTypeFilter, setRoomTypeFilter] = useState<string>("");
  const [roomNameFilter, setRoomNameFilter] = useState<string>("");
  const [availabilityFilter, setAvailabilityFilter] = useState<string>("");
  const [keyword, setKeyword] = useState<string>("");
  const [page, setPage] = useState(1);

  async function refreshData() {
    try {
      const res = await axios.get<{ slots: SpeakerSlotRow[]; speakers: AssignableSpeaker[] }>(
        "/api/members/speaker-slots"
      );
      setSlots(res.data.slots);
      setSpeakers(res.data.speakers);
    } catch {
      setErrorMessage("Could not refresh speaker slots.");
    }
  }

  // Derived unique lists for dropdown filters
  const roomTypes = useMemo(() => {
    return [...new Set(slots.map((s) => s.roomType).filter((v): v is string => !!v))].sort();
  }, [slots]);

  const roomNames = useMemo(() => {
    return [...new Set(slots.map((s) => s.roomName).filter((v): v is string => !!v))].sort();
  }, [slots]);

  // Filtered rows
  const filteredSlots = useMemo(() => {
    return slots.filter((slot) => {
      if (roomTypeFilter && slot.roomType !== roomTypeFilter) return false;
      if (roomNameFilter && slot.roomName !== roomNameFilter) return false;
      if (availabilityFilter && slot.available !== availabilityFilter) return false;

      if (keyword.trim()) {
        const q = keyword.trim().toLowerCase();
        const matches = [
          slot.speakerName,
          slot.title,
          slot.roomName,
          slot.roomType,
          slot.topicDescription,
        ]
          .filter(Boolean)
          .some((f) => f!.toLowerCase().includes(q));

        if (!matches) return false;
      }

      return true;
    });
  }, [slots, roomTypeFilter, roomNameFilter, availabilityFilter, keyword]);

  useEffect(() => {
    setPage(1);
  }, [roomTypeFilter, roomNameFilter, availabilityFilter, keyword]);

  const paged = useMemo(
    () => filteredSlots.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filteredSlots, page]
  );

  const stats = useMemo(() => {
    const total = slots.length;
    const allocated = slots.filter((s) => s.speakerId).length;
    const unallocated = total - allocated;
    return { total, allocated, unallocated };
  }, [slots]);

  async function handleRemove(id: number) {
    if (!window.confirm("Are you sure you want to remove the speaker assignment from this slot?")) return;
    setPendingId(id);
    setErrorMessage(null);
    try {
      await axios.delete(`/api/members/speaker-slots/${id}`);
      await refreshData();
    } catch {
      setErrorMessage("Could not remove speaker slot assignment.");
    } finally {
      setPendingId(null);
    }
  }

  function handleSaved() {
    setAssignSlot(null);
    refreshData();
  }

  return (
    <div className="space-y-8">
      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-3xl bg-gradient-to-br from-brand-pink/20 to-brand-pink/5 p-6 border border-brand-pink/20 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink">Total Slots</span>
            <Layers className="h-5 w-5 text-brand-pink" />
          </div>
          <div className="mt-2 text-3xl font-black text-white">{stats.total}</div>
        </div>

        <div className="rounded-3xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 p-6 border border-emerald-500/20 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Allocated</span>
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          </div>
          <div className="mt-2 text-3xl font-black text-white">{stats.allocated}</div>
        </div>

        <div className="rounded-3xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 p-6 border border-amber-500/20 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">Unallocated</span>
            <Clock3 className="h-5 w-5 text-amber-400" />
          </div>
          <div className="mt-2 text-3xl font-black text-white">{stats.unallocated}</div>
        </div>
      </div>

      <div className="glass-panel rounded-3xl p-8 border-white/10 shadow-2xl backdrop-blur-md space-y-6">
        {/* Filters Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
              Room Type
            </label>
            <select
              value={roomTypeFilter}
              onChange={(e) => setRoomTypeFilter(e.target.value)}
              className={FIELD_CLASS}
            >
              <option value="" className="bg-zinc-900 text-zinc-400">
                All Room Types
              </option>
              {roomTypes.map((rt) => (
                <option key={rt} value={rt} className="bg-zinc-900 text-white">
                  {rt}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
              Venue
            </label>
            <select
              value={roomNameFilter}
              onChange={(e) => setRoomNameFilter(e.target.value)}
              className={FIELD_CLASS}
            >
              <option value="" className="bg-zinc-900 text-zinc-400">
                All Venues
              </option>
              {roomNames.map((rn) => (
                <option key={rn} value={rn} className="bg-zinc-900 text-white">
                  {rn}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
              Slots Available
            </label>
            <select
              value={availabilityFilter}
              onChange={(e) => setAvailabilityFilter(e.target.value)}
              className={FIELD_CLASS}
            >
              <option value="" className="bg-zinc-900 text-zinc-400">
                All Slots
              </option>
              <option value="Allocated" className="bg-zinc-900 text-white">
                Allocated
              </option>
              <option value="Unallocated" className="bg-zinc-900 text-white">
                Unallocated
              </option>
            </select>
          </div>
        </div>

        {/* Search Input Bar */}
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 shadow-xl backdrop-blur-md">
          <Search className="h-5 w-5 shrink-0 text-brand-pink" />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Search slots by speaker name, topic, or venue..."
            className="w-full bg-transparent text-sm text-white placeholder:text-zinc-600 focus:outline-none font-medium"
          />
          {(keyword || roomTypeFilter || roomNameFilter || availabilityFilter) && (
            <button
              onClick={() => {
                setKeyword("");
                setRoomTypeFilter("");
                setRoomNameFilter("");
                setAvailabilityFilter("");
              }}
              className="text-xs text-zinc-500 hover:text-white transition flex items-center gap-1"
            >
              <X className="h-4 w-4" /> Reset
            </button>
          )}
        </div>

        {errorMessage && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold">
            {errorMessage}
          </div>
        )}

        {/* Slots Table */}
        <div className="overflow-x-auto rounded-2xl border border-white/5">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-gradient-to-r from-brand-purple to-brand-pink text-white">
                <th className="px-6 py-4 font-black uppercase tracking-wider">Id</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Date & Duration</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Room Type</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Venue</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Speaker Name</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Topic</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider text-center">Manage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredSlots.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-zinc-500 italic">
                    {slots.length === 0
                      ? "No agenda sessions found for this event."
                      : "No slots match your selected filters."}
                  </td>
                </tr>
              ) : (
                paged.map((slot) => (
                  <tr key={slot.id} className="group hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-5 font-mono text-xs text-zinc-500">#{slot.id}</td>
                    <td className="px-4 py-5">
                      <div className="flex items-center gap-1.5 font-bold text-white">
                        <Calendar className="h-3.5 w-3.5 text-brand-pink shrink-0" />
                        {slot.sessionDate ? DATE_FORMAT.format(new Date(slot.sessionDate)) : "—"}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 mt-1 font-medium">
                        <Clock className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                        {slot.durationTime}
                      </div>
                    </td>
                    <td className="px-4 py-5">
                      {slot.roomType ? (
                        <span className="inline-flex rounded-full bg-brand-purple/10 border border-brand-purple/20 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-brand-purple">
                          {slot.roomType}
                        </span>
                      ) : (
                        <span className="text-zinc-600 italic text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-5 font-bold text-zinc-200">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-brand-pink shrink-0" />
                        {slot.roomName || "—"}
                      </div>
                    </td>
                    <td className="px-4 py-5 font-bold text-white">
                      {slot.speakerName ? (
                        <div>
                          <div className="flex items-center gap-2">
                            <Mic className="h-3.5 w-3.5 text-emerald-400" />
                            <span>{slot.speakerName}</span>
                          </div>
                          {slot.speakerStatus && (
                            <div className="text-[10px] font-normal text-zinc-500 mt-0.5">
                              Status: {slot.speakerStatus}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-zinc-600 italic text-xs font-normal">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-5">
                      <div className="font-bold text-zinc-300 max-w-xs line-clamp-2">
                        {slot.title || "—"}
                      </div>
                    </td>
                    <td className="px-4 py-5">
                      {slot.available === "Allocated" ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-400 shadow-lg">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Allocated
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-amber-400 shadow-lg">
                          <Clock3 className="h-3.5 w-3.5" /> Unallocated
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-5">
                      <div className="flex items-center justify-center gap-2">
                        {!slot.speakerId ? (
                          <button
                            onClick={() => setAssignSlot(slot)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-pink/10 border border-brand-pink/20 px-3.5 py-2 text-xs font-black uppercase tracking-wider text-brand-pink hover:bg-brand-pink hover:text-white transition-all shadow-lg cursor-pointer"
                          >
                            <UserPlus className="h-3.5 w-3.5" /> Assign Slot
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => setAssignSlot(slot)}
                              className="h-8 w-8 inline-flex items-center justify-center rounded-lg bg-white/5 text-zinc-400 hover:bg-brand-purple hover:text-white transition-all shadow-xl cursor-pointer"
                              title="Update Details"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              disabled={pendingId === slot.id}
                              onClick={() => handleRemove(slot.id)}
                              className="h-8 w-8 inline-flex items-center justify-center rounded-lg bg-white/5 text-zinc-400 hover:bg-red-500 hover:text-white transition-all shadow-xl disabled:opacity-20 cursor-pointer"
                              title="Remove Slot Assignment"
                            >
                              <UserMinus className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <TablePagination currentPage={page} totalItems={filteredSlots.length} pageSize={PAGE_SIZE} onPageChange={setPage} />

        <div className="flex items-center justify-between border-t border-white/5 pt-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">
          <span>
            Showing {filteredSlots.length} of {slots.length} total slots
          </span>
        </div>
      </div>

      {assignSlot && (
        <AssignModal
          slot={assignSlot}
          speakers={speakers}
          onClose={() => setAssignSlot(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
