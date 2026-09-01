"use client";

import { useState, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  Table as TableIcon,
  Hourglass,
  RefreshCw,
  Plus,
  Trash2,
  Edit,
  Lock,
  X,
  Save,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Layers,
  CalendarCheck,
} from "lucide-react";
import type {
  EventScheduleData,
  EventPhaseItem,
  EventScheduleItem,
} from "@/lib/services/eventSchedule";

import { ModalPortal } from "@/components/ui/ModalPortal";
interface Props {
  initialData: EventScheduleData;
  eventId: number;
}

export function EventScheduleManager({ initialData, eventId }: Props) {
  const [data, setData] = useState<EventScheduleData>(initialData);
  const [viewMode, setViewMode] = useState<"calendar" | "tabular">("calendar");
  const [currentDate, setCurrentDate] = useState(() => {
    if (initialData.event.dateStart) {
      return new Date(initialData.event.dateStart);
    }
    return new Date();
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Selected phase for quick allocation
  const [selectedPhase, setSelectedPhase] = useState<EventPhaseItem | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EventScheduleItem | null>(null);
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    code: "",
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
    color: "var(--color-violet-500)",
  });

  const showFeedback = (text: string, type: "success" | "error" = "success") => {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg(null), 4500);
  };

  const refreshData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/members/event-schedule?event_id=${eventId}`);
      if (res.ok) {
        const refreshed = await res.json();
        setData(refreshed);
      }
    } catch (e) {
      console.error("Failed to refresh schedule:", e);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto Schedule
  const handleAutoSchedule = async () => {
    if (data.event.lockSchedule) {
      showFeedback("Event schedule is locked. Cannot auto schedule.", "error");
      return;
    }
    if (!confirm("Run Auto Schedule? This will automatically map event phases to your event date range.")) return;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/members/event-schedule/auto-schedule?event_id=${eventId}`, {
        method: "POST",
      });
      const result = await res.json();
      if (res.ok) {
        showFeedback(`Event automatically scheduled! Generated ${result.insertedCount || 0} phase tasks.`);
        await refreshData();
      } else {
        showFeedback(result.error || "Auto schedule failed.", "error");
      }
    } catch (err: any) {
      showFeedback(err.message || "Failed to execute auto schedule.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Reset Schedule
  const handleResetSchedule = async () => {
    if (data.event.lockSchedule) {
      showFeedback("Event schedule is locked. Cannot reset schedule.", "error");
      return;
    }
    if (!confirm("Are you sure you want to reset the event schedule? This will clear all generated schedule items.")) return;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/members/event-schedule/reset-schedule?event_id=${eventId}`, {
        method: "POST",
      });
      const result = await res.json();
      if (res.ok) {
        showFeedback("Event schedule has been reset.");
        await refreshData();
      } else {
        showFeedback(result.error || "Reset schedule failed.", "error");
      }
    } catch (err: any) {
      showFeedback(err.message || "Failed to reset schedule.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Open Modal for Create or Edit
  const handleOpenModal = (item?: EventScheduleItem, defaultDate?: string, defaultPhase?: EventPhaseItem) => {
    if (data.event.lockSchedule) {
      showFeedback("Event schedule is locked.", "error");
      return;
    }

    if (item) {
      setEditingItem(item);
      setFormData({
        id: item.id.toString(),
        name: item.name,
        code: item.code,
        startDate: item.startDate.slice(0, 10),
        endDate: item.endDate.slice(0, 10),
        color: item.color,
      });
    } else {
      setEditingItem(null);
      const chosenPhase = defaultPhase || selectedPhase || data.phases[0];
      const targetDate = defaultDate || new Date().toISOString().slice(0, 10);
      setFormData({
        id: "",
        name: chosenPhase?.name || "New Schedule Task",
        code: chosenPhase?.code || "task_phase",
        startDate: targetDate,
        endDate: targetDate,
        color: chosenPhase?.color || "var(--color-violet-500)",
      });
    }
    setIsModalOpen(true);
  };

  // Save Schedule Item
  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (data.event.lockSchedule) {
      showFeedback("Event schedule is locked.", "error");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/members/event-schedule?event_id=${eventId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        showFeedback(editingItem ? "Schedule updated successfully!" : "Schedule task created!");
        setIsModalOpen(false);
        await refreshData();
      } else {
        const err = await res.json();
        showFeedback(err.error || "Failed to save schedule", "error");
      }
    } catch (e: any) {
      showFeedback(e.message || "Operation error", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Delete Schedule Item
  const handleDeleteSchedule = async (id: number) => {
    if (data.event.lockSchedule) {
      showFeedback("Event schedule is locked.", "error");
      return;
    }
    if (!confirm("Are you sure you want to delete this schedule item?")) return;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/members/event-schedule?id=${id}&event_id=${eventId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        showFeedback("Schedule item deleted.");
        await refreshData();
      } else {
        const err = await res.json();
        showFeedback(err.error || "Delete failed", "error");
      }
    } catch (e: any) {
      showFeedback(e.message || "Delete error", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Calendar Helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = useMemo(() => {
    return new Date(year, month + 1, 0).getDate();
  }, [year, month]);

  const firstDayOfWeek = useMemo(() => {
    return new Date(year, month, 1).getDay();
  }, [year, month]);

  const monthName = currentDate.toLocaleString("default", { month: "long" });

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  // Map schedules by YYYY-MM-DD
  const schedulesByDate = useMemo(() => {
    const map = new Map<string, EventScheduleItem[]>();
    data.schedules.forEach((item) => {
      const startStr = item.startDate.slice(0, 10);
      const endStr = item.endDate.slice(0, 10);

      const d = new Date(startStr);
      const last = new Date(endStr);

      while (d <= last) {
        const k = d.toISOString().slice(0, 10);
        if (!map.has(k)) map.set(k, []);
        map.get(k)!.push(item);
        d.setDate(d.getDate() + 1);
      }
    });
    return map;
  }, [data.schedules]);

  const filteredSchedules = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return data.schedules;
    return data.schedules.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        s.startDate.includes(q)
    );
  }, [data.schedules, searchQuery]);

  return (
    <div className="space-y-8">
      {/* Feedback Banner */}
      {statusMsg && (
        <div
          className={`flex items-center justify-between gap-3 rounded-2xl p-4 border shadow-xl transition-all ${
            statusMsg.type === "success"
              ? "bg-emerald-950/80 border-emerald-500/30 text-emerald-200"
              : "bg-rose-950/80 border-rose-500/30 text-rose-200"
          }`}
        >
          <div className="flex items-center gap-3">
            {statusMsg.type === "success" ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
            )}
            <span className="text-sm font-semibold">{statusMsg.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMsg(null)}
            className="text-zinc-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Locked Event Warning Notice */}
      {data.event.lockSchedule && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-950/50 p-4 text-amber-200 flex items-center gap-3 shadow-lg">
          <Lock className="h-5 w-5 text-amber-400 shrink-0" />
          <p className="text-sm font-semibold">
            Event is locked. Schedule cannot be altered and used for auto schedule, reset schedule, or any other date updates.
          </p>
        </div>
      )}

      {/* Control Bar: Auto Schedule, Reset Schedule, View Toggles */}
      <div className="rounded-2xl border border-white/10 bg-zinc-900/90 p-5 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleAutoSchedule}
              disabled={isLoading || data.event.lockSchedule}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-purple to-brand-pink px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-lg hover:brightness-110 transition disabled:opacity-50"
              title="Auto Schedule"
            >
              <Hourglass className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Auto Schedule
            </button>

            <button
              type="button"
              onClick={handleResetSchedule}
              disabled={isLoading || data.event.lockSchedule}
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-zinc-200 hover:bg-zinc-700 hover:text-white transition disabled:opacity-50"
              title="Reset Schedule"
            >
              <RefreshCw className="h-4 w-4 text-rose-400" />
              Reset Schedule
            </button>

            <button
              type="button"
              onClick={() => handleOpenModal()}
              disabled={isLoading || data.event.lockSchedule}
              className="inline-flex items-center gap-2 rounded-xl bg-white text-zinc-950 px-4 py-2.5 text-xs font-black uppercase tracking-wider shadow-lg hover:bg-zinc-200 transition disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Add Task
            </button>
          </div>

          <div className="flex items-center gap-2 bg-zinc-950/80 p-1.5 rounded-xl border border-zinc-800">
            <button
              type="button"
              onClick={() => setViewMode("calendar")}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
                viewMode === "calendar"
                  ? "bg-brand-purple text-white shadow-md"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <CalendarIcon className="h-4 w-4" />
              Calendar View
            </button>
            <button
              type="button"
              onClick={() => setViewMode("tabular")}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
                viewMode === "tabular"
                  ? "bg-brand-purple text-white shadow-md"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <TableIcon className="h-4 w-4" />
              Tabular Schedule
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      {viewMode === "calendar" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Draggable/Selectable Event Phases */}
          <div className="lg:col-span-4 rounded-3xl border border-white/10 bg-zinc-900/90 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-brand-pink" />
                <h3 className="text-sm font-black uppercase tracking-wider text-white">
                  Event Phases
                </h3>
              </div>
              <span className="text-xs text-zinc-400 font-medium">Select to assign</span>
            </div>

            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
              {data.phases.map((phase) => {
                const isSelected = selectedPhase?.code === phase.code;
                return (
                  <div
                    key={phase.code || phase.id}
                    onClick={() => setSelectedPhase(isSelected ? null : phase)}
                    className={`group cursor-pointer rounded-2xl p-3.5 border transition-all flex items-center justify-between ${
                      isSelected
                        ? "border-brand-pink bg-brand-pink/10 shadow-lg scale-[1.02]"
                        : "border-white/10 bg-zinc-950/60 hover:bg-white/5 hover:border-zinc-700"
                    }`}
                    style={{ borderLeftColor: phase.color, borderLeftWidth: "6px" }}
                  >
                    <div className="space-y-0.5">
                      <p className="text-sm font-bold text-white group-hover:text-brand-pink transition">
                        {phase.name}
                      </p>
                      <p className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                        {phase.code}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full shrink-0 shadow-sm"
                        style={{ backgroundColor: phase.color }}
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenModal(undefined, undefined, phase);
                        }}
                        className="p-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 transition"
                        title="Add Task for this Phase"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedPhase && (
              <div className="p-3 rounded-xl bg-brand-purple/20 border border-brand-purple/30 text-xs text-brand-purple text-center">
                Click any day in the calendar below to assign <strong>{selectedPhase.name}</strong>.
              </div>
            )}
          </div>

          {/* Right Column: FullCalendar-Style Interactive Grid */}
          <div className="lg:col-span-8 rounded-3xl border border-white/10 bg-zinc-900/90 p-6 shadow-2xl space-y-6">
            {/* Calendar Month Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <CalendarCheck className="h-6 w-6 text-brand-pink" />
                <h3 className="text-xl font-black uppercase text-white">
                  {monthName} {year}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={prevMonth}
                  className="p-2 rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 transition"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentDate(new Date())}
                  className="px-3 py-1.5 rounded-xl border border-zinc-700 bg-zinc-800 text-xs font-bold text-zinc-200 hover:text-white hover:bg-zinc-700 transition"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={nextMonth}
                  className="p-2 rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 transition"
                >
                  ChevronRight
                </button>
              </div>
            </div>

            {/* Calendar Days Grid */}
            <div className="grid grid-cols-7 gap-2">
              {/* Day Headers */}
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName) => (
                <div
                  key={dayName}
                  className="text-center text-[11px] font-black uppercase tracking-wider text-zinc-400 py-1"
                >
                  {dayName}
                </div>
              ))}

              {/* Blank leading slots */}
              {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
                <div
                  key={`blank-${idx}`}
                  className="min-h-[90px] rounded-2xl bg-zinc-950/20 border border-white/[0.02]"
                />
              ))}

              {/* Days of Month */}
              {Array.from({ length: daysInMonth }).map((_, idx) => {
                const dayNum = idx + 1;
                const dayDate = new Date(year, month, dayNum);
                const dateKey = dayDate.toISOString().slice(0, 10);
                const items = schedulesByDate.get(dateKey) || [];

                const isToday =
                  new Date().toISOString().slice(0, 10) === dateKey;

                return (
                  <div
                    key={dateKey}
                    onClick={() => {
                      if (!data.event.lockSchedule) {
                        handleOpenModal(undefined, dateKey);
                      }
                    }}
                    className={`min-h-[95px] p-2 rounded-2xl border transition-all flex flex-col justify-between cursor-pointer group ${
                      isToday
                        ? "border-brand-pink/50 bg-brand-pink/5 shadow-inner"
                        : "border-white/5 bg-zinc-950/80 hover:bg-white/[0.04] hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-black ${
                          isToday
                            ? "h-6 w-6 rounded-full bg-brand-pink text-white flex items-center justify-center"
                            : "text-zinc-400 group-hover:text-white"
                        }`}
                      >
                        {dayNum}
                      </span>
                      {items.length > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300">
                          {items.length}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 mt-1">
                      {items.slice(0, 2).map((item) => (
                        <div
                          key={item.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenModal(item);
                          }}
                          className="px-2 py-1 rounded-lg text-[10px] font-bold text-white truncate shadow-sm hover:brightness-125 transition"
                          style={{ backgroundColor: item.color || "var(--color-violet-500)" }}
                          title={`${item.name} (${item.code})`}
                        >
                          {item.name}
                        </div>
                      ))}
                      {items.length > 2 && (
                        <span className="text-[9px] font-semibold text-zinc-400 block px-1">
                          +{items.length - 2} more
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* Tabular View */
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/90 shadow-2xl backdrop-blur-md space-y-4 p-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-white">
              Event Schedule Tasks ({filteredSchedules.length})
            </h3>
            <input
              type="text"
              placeholder="Search schedule tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-xs font-medium text-white placeholder-zinc-500 focus:border-brand-pink focus:outline-none"
            />
          </div>

          {filteredSchedules.length === 0 ? (
            <div className="py-12 text-center text-zinc-400 text-sm font-medium">
              No event schedule tasks found. Click &quot;Auto Schedule&quot; or &quot;Add Task&quot; to populate schedule.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-zinc-300">
                <thead>
                  <tr className="border-b border-white/10 bg-gradient-to-r from-brand-purple to-brand-pink text-white">
                    <th className="px-6 py-4 font-black uppercase tracking-wider w-12 text-center">ID</th>
                    <th className="px-6 py-4 font-black uppercase tracking-wider">Schedule Task</th>
                    <th className="px-6 py-4 font-black uppercase tracking-wider">Code</th>
                    <th className="px-6 py-4 font-black uppercase tracking-wider">Start Date</th>
                    <th className="px-6 py-4 font-black uppercase tracking-wider">End Date</th>
                    <th className="px-6 py-4 font-black uppercase tracking-wider text-center">Phase Color</th>
                    <th className="px-6 py-4 font-black uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredSchedules.map((item) => (
                    <tr key={item.id} className="hover:bg-white/[0.03] transition-colors">
                      <td className="px-4 py-4 text-center text-zinc-500 font-mono text-xs">{item.id}</td>
                      <td className="px-6 py-4 font-bold text-white text-sm">{item.name}</td>
                      <td className="px-6 py-4 font-mono text-xs text-brand-pink">{item.code}</td>
                      <td className="px-6 py-4 text-xs text-zinc-300">{item.startDate.slice(0, 10)}</td>
                      <td className="px-6 py-4 text-xs text-zinc-300">{item.endDate.slice(0, 10)}</td>
                      <td className="px-4 py-4 text-center">
                        <span
                          className="inline-block h-4 w-8 rounded-full border border-white/20 shadow-sm"
                          style={{ backgroundColor: item.color }}
                        />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenModal(item)}
                            disabled={data.event.lockSchedule}
                            className="p-2 rounded-xl border border-purple-500/30 bg-purple-950/40 text-purple-300 hover:bg-purple-900/60 transition disabled:opacity-40"
                            title="Edit Schedule Task"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSchedule(item.id)}
                            disabled={data.event.lockSchedule}
                            className="p-2 rounded-xl border border-rose-500/30 bg-rose-950/40 text-rose-300 hover:bg-rose-900/60 transition disabled:opacity-40"
                            title="Delete Schedule Task"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Task Modal */}
      {isModalOpen && (
        <ModalPortal>
      <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto overscroll-contain bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-zinc-900 p-6 space-y-6 shadow-2xl text-white">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-xs font-black uppercase tracking-widest text-brand-pink">
                  {editingItem ? "Edit Event Schedule Task" : "New Schedule Task"}
                </span>
                <h2 className="text-xl font-black">
                  {editingItem ? `Task #${editingItem.id}` : "Configure Event Phase Task"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-zinc-400 hover:bg-zinc-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSchedule} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-zinc-300">Schedule Task Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Nomination Phase"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm font-medium text-white focus:border-brand-pink focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-zinc-300">Phase Code *</label>
                <select
                  value={formData.code}
                  onChange={(e) => {
                    const matchedPhase = data.phases.find((p) => p.code === e.target.value);
                    setFormData({
                      ...formData,
                      code: e.target.value,
                      color: matchedPhase?.color || formData.color,
                      name: matchedPhase?.name || formData.name,
                    });
                  }}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm font-medium text-white focus:border-brand-pink focus:outline-none"
                >
                  {data.phases.map((p) => (
                    <option key={p.code || p.id} value={p.code}>
                      {p.name} ({p.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-zinc-300">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm font-medium text-white focus:border-brand-pink focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-zinc-300">End Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm font-medium text-white focus:border-brand-pink focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-zinc-300">Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="h-10 w-20 rounded-xl border border-zinc-700 bg-zinc-950 p-1 cursor-pointer"
                  />
                  <span className="text-xs font-mono text-zinc-400">{formData.color}</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-zinc-800 text-sm font-bold text-white hover:bg-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand-purple to-brand-pink text-sm font-black uppercase text-white hover:brightness-110 shadow-lg disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  Save Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
    </ModalPortal>
      )}
    </div>
  );
}
