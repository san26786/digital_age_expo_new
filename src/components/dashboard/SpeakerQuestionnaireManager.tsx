"use client";

import { useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios, { isAxiosError } from "axios";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  X,
  Eye,
  CheckCircle2,
  Clock3,
  Mic,
  Layers,
  Sparkles,
} from "lucide-react";
import {
  eventSpeakerQuestionnaireSchema,
  QUESTIONNAIRE_STATUSES,
  type EventSpeakerQuestionnaireInput,
} from "@/lib/validations/eventSpeakerQuestionnaire";
import type { QuestionnaireRow, QuestionnaireStats } from "@/lib/services/eventSpeakerQuestionnaire";
import { TablePagination } from "@/components/dashboard/TablePagination";

import { ModalPortal } from "@/components/ui/ModalPortal";
const PAGE_SIZE = 20;

const FIELD_CLASS =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-brand-pink focus:outline-none transition-colors backdrop-blur-md";

const CHECKBOX_LABEL_CLASS =
  "flex items-center gap-3 cursor-pointer text-xs font-semibold text-zinc-300 hover:text-white select-none";

const STATUS_BADGE: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  pending: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  reject: "bg-red-500/10 text-red-400 border border-red-500/20",
};

const TALK_DURATIONS = [
  { value: "30mins", label: "30 Mins" },
  { value: "1hour", label: "1 Hour" },
  { value: "2hour", label: "2 Hours" },
  { value: "3hour", label: "3 Hours" },
  { value: "4hour", label: "4 Hours" },
];

interface FormDefaults extends Partial<EventSpeakerQuestionnaireInput> {
  id?: number;
}

function QuestionnaireModal({
  defaultValues,
  eventId,
  isViewOnly = false,
  onClose,
  onSaved,
}: {
  defaultValues?: FormDefaults;
  eventId: number;
  isViewOnly?: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"profile" | "talk" | "workshop" | "categories">("profile");
  const isEdit = typeof defaultValues?.id === "number";

  // Modal is portaled to document.body, so it must wait for client mount
  // before rendering (document isn't available during SSR).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EventSpeakerQuestionnaireInput>({
    resolver: zodResolver(eventSpeakerQuestionnaireSchema) as any,
    defaultValues: {
      first_name: defaultValues?.first_name ?? "",
      last_name: defaultValues?.last_name ?? "",
      name: defaultValues?.name ?? "",
      email: defaultValues?.email ?? "",
      phone: defaultValues?.phone ?? "",
      work_phone: defaultValues?.work_phone ?? "",
      title: defaultValues?.title ?? "",
      description: defaultValues?.description ?? "",
      topic_description: defaultValues?.topic_description ?? "",
      talk_duration: defaultValues?.talk_duration ?? "30mins",
      preferred_date: defaultValues?.preferred_date ?? "",
      preferred_time: defaultValues?.preferred_time ?? "",
      conduct_workshop: defaultValues?.conduct_workshop ?? false,
      workshop_topic: defaultValues?.workshop_topic ?? "",
      workshop_duration: defaultValues?.workshop_duration ?? "1hour",
      workshop_preferred_date: defaultValues?.workshop_preferred_date ?? "",
      workshop_preferred_time: defaultValues?.workshop_preferred_time ?? "",
      workshop_description: defaultValues?.workshop_description ?? "",
      is_business_speaker: defaultValues?.is_business_speaker ?? true,
      is_keynote_speaker: defaultValues?.is_keynote_speaker ?? false,
      is_webinar_speaker: defaultValues?.is_webinar_speaker ?? false,
      is_seminar_speaker: defaultValues?.is_seminar_speaker ?? false,
      is_live_worksop_speaker: defaultValues?.is_live_worksop_speaker ?? false,
      is_vip_session_speaker: defaultValues?.is_vip_session_speaker ?? false,
      speaker_group: defaultValues?.speaker_group ?? "",
      speaker_keyword: defaultValues?.speaker_keyword ?? "",
      status: defaultValues?.status ?? "active",
    },
  });

  const conductWorkshop = watch("conduct_workshop");

  async function onSubmit(data: EventSpeakerQuestionnaireInput) {
    if (isViewOnly) {
      onClose();
      return;
    }
    setErrorMessage(null);

    // Auto-generate full name if missing
    if (!data.name && (data.first_name || data.last_name)) {
      data.name = `${data.first_name || ""} ${data.last_name || ""}`.trim();
    }

    try {
      if (isEdit) {
        await axios.patch(`/api/members/speaker-questionnaire/${defaultValues!.id}`, data);
      } else {
        await axios.post("/api/members/speaker-questionnaire", data);
      }
      onSaved();
    } catch (err) {
      setErrorMessage(
        isAxiosError(err) && typeof err.response?.data?.error === "string"
          ? err.response.data.error
          : "Could not save questionnaire. Please verify all required fields."
      );
    }
  }

  if (!mounted) return null;

  return createPortal(
    <ModalPortal>
      <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto overscroll-contain bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-zinc-950 border border-white/10 p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="space-y-1">
            <h3 className="text-xl font-black uppercase tracking-widest text-white">
              {isViewOnly
                ? "View Speaker Questionnaire"
                : isEdit
                ? "Edit Speaker Questionnaire"
                : "Submit Speaker Questionnaire"}
            </h3>
            <p className="text-xs font-semibold text-zinc-400">
              {isViewOnly
                ? "Review presentation topics, talk duration, and workshop requests."
                : "Provide presentation details, slot preferences, and workshop intentions."}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full h-10 w-10 flex items-center justify-center bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Tab Navigation */}
        <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-3">
          {[
            { id: "profile", label: "Profile Description" },
            { id: "talk", label: "Talk & Session Details" },
            { id: "workshop", label: "Workshop Request" },
            { id: "categories", label: "Categories & Keywords" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`rounded-xl px-4 py-2 text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === tab.id
                  ? "bg-brand-pink text-white shadow-lg shadow-brand-pink/20"
                  : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* PROFILE TAB */}
          {activeTab === "profile" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                    First Name
                  </label>
                  <input
                    {...register("first_name")}
                    disabled={isViewOnly}
                    className={FIELD_CLASS}
                    placeholder="e.g. Sarah"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                    Last Name
                  </label>
                  <input
                    {...register("last_name")}
                    disabled={isViewOnly}
                    className={FIELD_CLASS}
                    placeholder="e.g. Jenkins"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                  Full Name*
                </label>
                <input
                  {...register("name")}
                  disabled={isViewOnly}
                  className={FIELD_CLASS}
                  placeholder="Dr. Sarah Jenkins"
                />
                {errors.name && <p className="mt-1 text-xs font-bold text-red-500">{errors.name.message}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                    Email Address
                  </label>
                  <input
                    {...register("email")}
                    type="email"
                    disabled={isViewOnly}
                    className={FIELD_CLASS}
                    placeholder="sarah@speaker.com"
                  />
                  {errors.email && <p className="mt-1 text-xs font-bold text-red-500">{errors.email.message}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                    Phone Number
                  </label>
                  <input
                    {...register("phone")}
                    disabled={isViewOnly}
                    className={FIELD_CLASS}
                    placeholder="+44 20 1234 5678"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                    Work Phone
                  </label>
                  <input
                    {...register("work_phone")}
                    disabled={isViewOnly}
                    className={FIELD_CLASS}
                    placeholder="+44 7700 900000"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                  Profile Description / Speaker Bio
                </label>
                <textarea
                  {...register("description")}
                  rows={4}
                  disabled={isViewOnly}
                  className={FIELD_CLASS}
                  placeholder="Share a brief overview of your background, experience, and speaking expertise..."
                />
              </div>
            </div>
          )}

          {/* TALK & SESSION TAB */}
          {activeTab === "talk" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div>
                <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                  Topic Title / Presentation Title
                </label>
                <input
                  {...register("title")}
                  disabled={isViewOnly}
                  className={FIELD_CLASS}
                  placeholder="Keynote: Scaling AI in Enterprise Infrastructure"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                    Talk Duration
                  </label>
                  <select {...register("talk_duration")} disabled={isViewOnly} className={FIELD_CLASS}>
                    {TALK_DURATIONS.map((d) => (
                      <option key={d.value} value={d.value} className="bg-zinc-900 text-white">
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                    Preferred Date
                  </label>
                  <input
                    {...register("preferred_date")}
                    type="date"
                    disabled={isViewOnly}
                    className={FIELD_CLASS}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                    Preferred Time Slot
                  </label>
                  <input
                    {...register("preferred_time")}
                    type="time"
                    disabled={isViewOnly}
                    className={FIELD_CLASS}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                  Topic Abstract / Presentation Outline
                </label>
                <textarea
                  {...register("topic_description")}
                  rows={4}
                  disabled={isViewOnly}
                  className={FIELD_CLASS}
                  placeholder="Outline key learning points, targets, and session outcomes for attendees..."
                />
              </div>
            </div>
          )}

          {/* WORKSHOP TAB */}
          {activeTab === "workshop" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-4">
                <label className={CHECKBOX_LABEL_CLASS}>
                  <input
                    type="checkbox"
                    {...register("conduct_workshop")}
                    disabled={isViewOnly}
                    className="h-4 w-4 rounded accent-brand-pink"
                  />
                  <span className="text-sm font-bold text-white">
                    Would you like to conduct a workshop after your talk?
                  </span>
                </label>

                {conductWorkshop && (
                  <div className="space-y-4 pt-4 border-t border-white/10 animate-in fade-in duration-300">
                    <div>
                      <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                        Workshop Topic
                      </label>
                      <input
                        {...register("workshop_topic")}
                        disabled={isViewOnly}
                        className={FIELD_CLASS}
                        placeholder="Hands-on Workshop: Implementing Neural Models"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                          Workshop Duration
                        </label>
                        <select {...register("workshop_duration")} disabled={isViewOnly} className={FIELD_CLASS}>
                          {TALK_DURATIONS.map((d) => (
                            <option key={d.value} value={d.value} className="bg-zinc-900 text-white">
                              {d.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                          Workshop Preferred Date
                        </label>
                        <input
                          {...register("workshop_preferred_date")}
                          disabled={isViewOnly}
                          className={FIELD_CLASS}
                          placeholder="e.g. Day 2 / 15-10-2026"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                          Workshop Preferred Time
                        </label>
                        <input
                          {...register("workshop_preferred_time")}
                          disabled={isViewOnly}
                          className={FIELD_CLASS}
                          placeholder="e.g. Afternoon Session"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                        Workshop Requirements & Summary
                      </label>
                      <textarea
                        {...register("workshop_description")}
                        rows={3}
                        disabled={isViewOnly}
                        className={FIELD_CLASS}
                        placeholder="Detail equipment requirements, participant prep, and workshop agenda..."
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CATEGORIES & KEYWORDS TAB */}
          {activeTab === "categories" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className={CHECKBOX_LABEL_CLASS}>
                  <input
                    type="checkbox"
                    {...register("is_business_speaker")}
                    disabled={isViewOnly}
                    className="h-4 w-4 rounded accent-brand-pink"
                  />
                  <span>Business Speaker</span>
                </label>
                <label className={CHECKBOX_LABEL_CLASS}>
                  <input
                    type="checkbox"
                    {...register("is_keynote_speaker")}
                    disabled={isViewOnly}
                    className="h-4 w-4 rounded accent-brand-pink"
                  />
                  <span>Keynote Speaker</span>
                </label>
                <label className={CHECKBOX_LABEL_CLASS}>
                  <input
                    type="checkbox"
                    {...register("is_webinar_speaker")}
                    disabled={isViewOnly}
                    className="h-4 w-4 rounded accent-brand-pink"
                  />
                  <span>Webinar Speaker</span>
                </label>
                <label className={CHECKBOX_LABEL_CLASS}>
                  <input
                    type="checkbox"
                    {...register("is_seminar_speaker")}
                    disabled={isViewOnly}
                    className="h-4 w-4 rounded accent-brand-pink"
                  />
                  <span>Seminar Speaker</span>
                </label>
                <label className={CHECKBOX_LABEL_CLASS}>
                  <input
                    type="checkbox"
                    {...register("is_live_worksop_speaker")}
                    disabled={isViewOnly}
                    className="h-4 w-4 rounded accent-brand-pink"
                  />
                  <span>Live Workshop Speaker</span>
                </label>
                <label className={CHECKBOX_LABEL_CLASS}>
                  <input
                    type="checkbox"
                    {...register("is_vip_session_speaker")}
                    disabled={isViewOnly}
                    className="h-4 w-4 rounded accent-brand-pink"
                  />
                  <span>VIP Session Speaker</span>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-white/10 pt-4">
                <div>
                  <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                    Speaker Group / Hall Allocation
                  </label>
                  <input
                    {...register("speaker_group")}
                    disabled={isViewOnly}
                    className={FIELD_CLASS}
                    placeholder="Group A - Main Auditorium"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                    Speaker Keywords (Comma separated)
                  </label>
                  <input
                    {...register("speaker_keyword")}
                    disabled={isViewOnly}
                    className={FIELD_CLASS}
                    placeholder="AI, Cloud, FinTech, Automation"
                  />
                </div>
              </div>

              <div className="border-t border-white/10 pt-4">
                <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                  Questionnaire Status
                </label>
                <select {...register("status")} disabled={isViewOnly} className={FIELD_CLASS}>
                  {QUESTIONNAIRE_STATUSES.map((s) => (
                    <option key={s} value={s} className="bg-zinc-900 text-white">
                      {s.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold">
              {errorMessage}
            </div>
          )}

          <div className="flex items-center justify-between border-t border-white/10 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/10 bg-white/5 px-6 py-2.5 text-xs font-black uppercase tracking-widest text-zinc-300 transition hover:bg-white/10 hover:text-white cursor-pointer"
            >
              {isViewOnly ? "Close" : "Cancel"}
            </button>

            {!isViewOnly && (
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-full bg-brand-pink px-8 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-brand-pink/20 transition hover:scale-[1.02] active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? "Saving..." : isEdit ? "Save Questionnaire" : "Submit Questionnaire"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
    </ModalPortal>,
    document.body
  );
}

export function SpeakerQuestionnaireManager({
  eventId,
  initialQuestionnaires,
  initialStats,
  userRole,
}: {
  eventId: number;
  initialQuestionnaires: QuestionnaireRow[];
  initialStats: QuestionnaireStats;
  userRole: string;
}) {
  const [questionnaires, setQuestionnaires] = useState<QuestionnaireRow[]>(initialQuestionnaires);
  const [stats, setStats] = useState<QuestionnaireStats>(initialStats);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [keyword, setKeyword] = useState<string>("");

  const [modalItem, setModalItem] = useState<{ row: QuestionnaireRow | "new"; viewOnly?: boolean } | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkAction, setBulkAction] = useState<string>("");
  const [pendingAction, setPendingAction] = useState<boolean>(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const isOrganiser = userRole === "organiser";

  async function refreshData() {
    try {
      const filterParam = statusFilter !== "all" ? `?filter=${statusFilter}` : "";
      const res = await axios.get<{
        questionnaires: QuestionnaireRow[];
        stats: QuestionnaireStats;
      }>(`/api/members/speaker-questionnaire${filterParam}`);
      setQuestionnaires(res.data.questionnaires);
      setStats(res.data.stats);
    } catch {
      setErrorMessage("Could not refresh questionnaire responses.");
    }
  }

  const filteredItems = useMemo(() => {
    return questionnaires.filter((q) => {
      if (statusFilter !== "all" && q.status !== statusFilter) return false;
      if (keyword.trim()) {
        const k = keyword.trim().toLowerCase();
        const matches = [q.name, q.email, q.title, q.workshopTopic, q.speakerGroup]
          .filter(Boolean)
          .some((field) => field!.toLowerCase().includes(k));
        if (!matches) return false;
      }
      return true;
    });
  }, [questionnaires, statusFilter, keyword]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, keyword]);

  const paged = useMemo(
    () => filteredItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filteredItems, page]
  );

  function handleSelectAll(e: React.ChangeEvent<HTMLInputElement>) {
    const pageIds = paged.map((q) => q.id);
    if (e.target.checked) {
      setSelectedIds((prev) => [...new Set([...prev, ...pageIds])]);
    } else {
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    }
  }

  function handleSelectRow(id: number) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  }

  async function handleExecuteBulkAction() {
    if (!bulkAction || selectedIds.length === 0) return;
    setPendingAction(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await axios.patch("/api/members/speaker-questionnaire", {
        ids: selectedIds,
        action: bulkAction,
      });
      setSuccessMessage(`Action '${bulkAction}' successfully executed for ${selectedIds.length} submission(s).`);
      setSelectedIds([]);
      setBulkAction("");
      await refreshData();
    } catch {
      setErrorMessage("Could not execute bulk action. Please try again.");
    } finally {
      setPendingAction(false);
    }
  }

  async function handleDeleteSingle(id: number) {
    if (!window.confirm("Are you sure you want to delete this questionnaire submission?")) return;
    setErrorMessage(null);
    try {
      await axios.delete(`/api/members/speaker-questionnaire/${id}`);
      await refreshData();
    } catch {
      setErrorMessage("Could not delete record.");
    }
  }

  return (
    <div className="space-y-8">
      {/* 1. TOP STATS BADGES BAR */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <button
          onClick={() => {
            setStatusFilter("all");
            refreshData();
          }}
          className={`rounded-2xl p-5 text-left border transition-all duration-300 shadow-xl cursor-pointer ${
            statusFilter === "all"
              ? "bg-brand-pink/30 border-brand-pink text-white ring-2 ring-brand-pink/50"
              : "bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink">Total Submissions</span>
            <Layers className="h-5 w-5 text-brand-pink" />
          </div>
          <div className="mt-2 text-3xl font-black text-white">{stats.total}</div>
        </button>

        <div className="rounded-2xl p-5 border bg-purple-950/20 border-purple-500/20 text-purple-300 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-purple-400">Workshops Requested</span>
            <Sparkles className="h-5 w-5 text-purple-400" />
          </div>
          <div className="mt-2 text-3xl font-black text-white">{stats.workshopsRequested}</div>
        </div>

        <button
          onClick={() => {
            setStatusFilter("active");
            refreshData();
          }}
          className={`rounded-2xl p-5 text-left border transition-all duration-300 shadow-xl cursor-pointer ${
            statusFilter === "active"
              ? "bg-emerald-600/30 border-emerald-500 text-white ring-2 ring-emerald-500/50"
              : "bg-emerald-950/20 border-emerald-500/20 text-emerald-400 hover:bg-emerald-900/30"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Approved Active</span>
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          </div>
          <div className="mt-2 text-3xl font-black text-white">{stats.active}</div>
        </button>

        <button
          onClick={() => {
            setStatusFilter("pending");
            refreshData();
          }}
          className={`rounded-2xl p-5 text-left border transition-all duration-300 shadow-xl cursor-pointer ${
            statusFilter === "pending"
              ? "bg-amber-600/30 border-amber-500 text-white ring-2 ring-amber-500/50"
              : "bg-amber-950/20 border-amber-500/20 text-amber-400 hover:bg-amber-900/30"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">Pending Review</span>
            <Clock3 className="h-5 w-5 text-amber-400" />
          </div>
          <div className="mt-2 text-3xl font-black text-white">{stats.pending}</div>
        </button>
      </div>

      {/* 2. FAST ACTION CONTROLS BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-6 glass-panel rounded-3xl border-white/10 shadow-2xl backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setModalItem({ row: "new" })}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-pink px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-brand-pink/20 transition hover:scale-105 cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Submit Questionnaire
          </button>

          {isOrganiser && (
            <a
              href={`/members/manage_speakers?event_id=${eventId}`}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 border border-white/10 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white hover:bg-white/20 transition shadow-lg"
            >
              <Mic className="h-4 w-4 text-brand-pink" /> Allocate Speaker
            </a>
          )}
        </div>

        {/* Bulk Action Controls for Organisers */}
        {isOrganiser && (
          <div className="flex items-center gap-2">
            <select
              value={bulkAction}
              onChange={(e) => setBulkAction(e.target.value)}
              className="rounded-xl border border-white/10 bg-zinc-900 px-4 py-2.5 text-xs font-bold text-white focus:outline-none"
            >
              <option value="">Bulk Actions ({selectedIds.length} selected)</option>
              <option value="approve">Approve Submissions</option>
              <option value="pending">Mark as Pending</option>
              <option value="reject">Mark as Rejected</option>
              <option value="delete">Delete Selected</option>
            </select>

            <button
              disabled={!bulkAction || selectedIds.length === 0 || pendingAction}
              onClick={handleExecuteBulkAction}
              className="rounded-xl bg-brand-purple px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-lg transition hover:scale-105 disabled:opacity-30 cursor-pointer"
            >
              Apply
            </button>
          </div>
        )}
      </div>

      {/* Alert Messages */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold flex items-center justify-between">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)}><X className="h-4 w-4" /></button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center justify-between">
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)}><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* 3. ROSTER TABLE CONTAINER */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border-white/10 shadow-2xl backdrop-blur-md space-y-6">
        {/* Search Bar */}
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 shadow-xl backdrop-blur-md">
          <Search className="h-5 w-5 shrink-0 text-brand-pink" />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Search questionnaire by speaker name, topic, email or workshop topic..."
            className="w-full bg-transparent text-sm text-white placeholder:text-zinc-600 focus:outline-none font-medium"
          />
          {keyword && (
            <button onClick={() => setKeyword("")} className="text-xs text-zinc-500 hover:text-white transition">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-2xl border border-white/5">
          <table className="w-full min-w-[950px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-gradient-to-r from-brand-purple to-brand-pink text-white">
                {isOrganiser && (
                  <th className="px-6 py-4 font-black uppercase tracking-wider w-10">
                    <input
                      type="checkbox"
                      onChange={handleSelectAll}
                      checked={paged.length > 0 && paged.every((q) => selectedIds.includes(q.id))}
                      className="h-4 w-4 rounded accent-brand-pink cursor-pointer"
                    />
                  </th>
                )}
                <th className="px-6 py-4 font-black uppercase tracking-wider">Speaker Name</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Topic / Talk Title</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Slot / Preferred Date</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Workshop Request</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Categories</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider text-center">Manage Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={isOrganiser ? 8 : 7} className="px-4 py-12 text-center text-zinc-500 italic font-medium">
                    {questionnaires.length === 0
                      ? "No speaker questionnaires found."
                      : "No questionnaire submissions match your search filter."}
                  </td>
                </tr>
              ) : (
                paged.map((item) => {
                  const isChecked = selectedIds.includes(item.id);

                  return (
                    <tr key={item.id} className="group hover:bg-white/[0.02] transition-colors">
                      {isOrganiser && (
                        <td className="px-4 py-5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleSelectRow(item.id)}
                            className="h-4 w-4 rounded accent-brand-pink cursor-pointer"
                          />
                        </td>
                      )}

                      <td className="px-4 py-5">
                        <div className="font-bold text-white">{item.name}</div>
                        <div className="text-xs text-zinc-400 font-medium">{item.email || "—"}</div>
                      </td>

                      <td className="px-4 py-5">
                        <div className="font-bold text-zinc-200 max-w-xs line-clamp-1">{item.title || "—"}</div>
                        {item.talkDuration && (
                          <div className="text-[11px] text-zinc-500 font-semibold mt-0.5">
                            Duration: {item.talkDuration}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-5">
                        <div className="text-xs text-zinc-300 font-medium">
                          {item.preferredDate || item.date || "Not specified"}
                        </div>
                        {item.preferredTime && (
                          <div className="text-[11px] text-brand-pink font-semibold mt-0.5">
                            {item.preferredTime}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-5">
                        {item.conductWorkshop ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 border border-purple-500/20 px-2.5 py-0.5 text-[10px] font-black uppercase text-purple-300">
                              Workshop Requested
                            </span>
                            {item.workshopTopic && (
                              <div className="text-[11px] text-zinc-400 max-w-xs truncate">
                                {item.workshopTopic}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-zinc-600">No Workshop</span>
                        )}
                      </td>

                      <td className="px-4 py-5">
                        <div className="flex flex-wrap gap-1">
                          {item.isBusinessSpeaker && (
                            <span className="rounded bg-white/5 border border-white/10 px-2 py-0.5 text-[9px] font-bold text-zinc-400">
                              Business
                            </span>
                          )}
                          {item.isKeynoteSpeaker && (
                            <span className="rounded bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[9px] font-bold text-amber-400">
                              Keynote
                            </span>
                          )}
                          {item.isWebinarSpeaker && (
                            <span className="rounded bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 text-[9px] font-bold text-blue-400">
                              Webinar
                            </span>
                          )}
                          {item.isSeminarSpeaker && (
                            <span className="rounded bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[9px] font-bold text-emerald-400">
                              Seminar
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
                            STATUS_BADGE[item.status] || "bg-white/5 text-zinc-400 border border-white/10"
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>

                      <td className="px-4 py-5">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setModalItem({ row: item, viewOnly: true })}
                            className="h-8 w-8 inline-flex items-center justify-center rounded-lg bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
                            title="View Questionnaire"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          <button
                            onClick={() => setModalItem({ row: item })}
                            className="h-8 w-8 inline-flex items-center justify-center rounded-lg bg-white/5 text-zinc-400 hover:bg-brand-pink hover:text-white transition-all cursor-pointer"
                            title="Edit Questionnaire"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>

                          {isOrganiser && (
                            <button
                              onClick={() => handleDeleteSingle(item.id)}
                              className="h-8 w-8 inline-flex items-center justify-center rounded-lg bg-white/5 text-zinc-400 hover:bg-red-500 hover:text-white transition-all cursor-pointer"
                              title="Delete Questionnaire"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <TablePagination currentPage={page} totalItems={filteredItems.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
      </div>

      {/* Modal Container */}
      {modalItem && (
        <QuestionnaireModal
          defaultValues={
            modalItem.row === "new"
              ? undefined
              : {
                  id: modalItem.row.id,
                  first_name: modalItem.row.firstName || "",
                  last_name: modalItem.row.lastName || "",
                  name: modalItem.row.name,
                  email: modalItem.row.email || "",
                  phone: modalItem.row.phone || "",
                  work_phone: modalItem.row.workPhone || "",
                  title: modalItem.row.title || "",
                  description: modalItem.row.description || "",
                  topic_description: modalItem.row.topicDescription || "",
                  talk_duration: modalItem.row.talkDuration || "30mins",
                  preferred_date: modalItem.row.preferredDate || "",
                  preferred_time: modalItem.row.preferredTime || "",
                  conduct_workshop: modalItem.row.conductWorkshop,
                  workshop_topic: modalItem.row.workshopTopic || "",
                  workshop_duration: modalItem.row.workshopDuration || "1hour",
                  workshop_preferred_date: modalItem.row.workshopPreferredDate || "",
                  workshop_preferred_time: modalItem.row.workshopPreferredTime || "",
                  workshop_description: modalItem.row.workshopDescription || "",
                  is_business_speaker: modalItem.row.isBusinessSpeaker,
                  is_keynote_speaker: modalItem.row.isKeynoteSpeaker,
                  is_webinar_speaker: modalItem.row.isWebinarSpeaker,
                  is_seminar_speaker: modalItem.row.isSeminarSpeaker,
                  is_live_worksop_speaker: modalItem.row.isLiveWorkshopSpeaker,
                  is_vip_session_speaker: modalItem.row.isVipSessionSpeaker,
                  speaker_group: modalItem.row.speakerGroup || "",
                  speaker_keyword: modalItem.row.speakerKeyword || "",
                  status: (modalItem.row.status as any) || "active",
                }
          }
          eventId={eventId}
          isViewOnly={modalItem.viewOnly}
          onClose={() => setModalItem(null)}
          onSaved={async () => {
            setModalItem(null);
            setSuccessMessage("Questionnaire response saved successfully.");
            await refreshData();
          }}
        />
      )}
    </div>
  );
}