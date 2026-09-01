"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios, { isAxiosError } from "axios";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  X,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Mail,
  Phone,
  User,
  MessageSquare,
  CornerDownRight,
  Check,
} from "lucide-react";
import {
  eventLobbyVisitorEnquirySchema,
  type EventLobbyVisitorEnquiryInput,
} from "@/lib/validations/eventLobbyVisitorEnquiry";
import type { EnquiryRow } from "@/lib/services/eventLobbyVisitorEnquiry";

import { ModalPortal } from "@/components/ui/ModalPortal";
const FIELD_CLASS =
  "w-full rounded-md border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder:text-white/40 focus:border-indigo-500 focus:outline-none transition-all";

interface Props {
  initialEnquiries: EnquiryRow[];
  eventId: number;
}

export function LobbyVisitorEnquiriesManager({ initialEnquiries, eventId }: Props) {
  const router = useRouter();
  const [enquiries, setEnquiries] = useState<EnquiryRow[]>(initialEnquiries);
  const [modalEnquiry, setModalEnquiry] = useState<EnquiryRow | "new" | null>(null);
  const [replyEnquiry, setReplyEnquiry] = useState<EnquiryRow | null>(null);
  const [quickAnswer, setQuickAnswer] = useState("");
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "answered" | "unanswered">("all");

  // Filtered list
  const filtered = useMemo(() => {
    return enquiries.filter((e) => {
      const q = keyword.trim().toLowerCase();
      const matchesSearch = !q
        ? true
        : [e.name, e.email, e.mobile_no, e.question_description, e.answer]
            .filter(Boolean)
            .some((f) => f!.toLowerCase().includes(q));

      const isAnswered = e.answer && e.answer.trim().length > 0;
      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "answered"
          ? isAnswered
          : !isAnswered;

      return matchesSearch && matchesStatus;
    });
  }, [enquiries, keyword, statusFilter]);

  // Stats calculation
  const stats = useMemo(() => {
    const total = enquiries.length;
    const answered = enquiries.filter((e) => e.answer && e.answer.trim().length > 0).length;
    const unanswered = total - answered;
    return { total, answered, unanswered };
  }, [enquiries]);

  // Remove enquiry
  async function remove(id: number) {
    if (!window.confirm("Are you sure you want to delete this visitor enquiry? This cannot be undone.")) return;
    setPendingId(id);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await axios.delete(`/api/members/lobby-visitor-enquiries/${id}`);
      setSuccessMessage("Enquiry deleted successfully.");
      setEnquiries((prev) => prev.filter((item) => item.id !== id));
      router.refresh();
    } catch (err) {
      setErrorMessage("Could not delete this enquiry. Please try again.");
    } finally {
      setPendingId(null);
    }
  }

  // Quick reply submit
  async function handleQuickReplySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!replyEnquiry) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    const data: EventLobbyVisitorEnquiryInput = {
      name: replyEnquiry.name,
      email: replyEnquiry.email,
      mobile_no: replyEnquiry.mobile_no,
      question_description: replyEnquiry.question_description,
      answer: quickAnswer,
    };

    try {
      await axios.patch(`/api/members/lobby-visitor-enquiries/${replyEnquiry.id}`, data);
      setSuccessMessage("Reply submitted successfully.");
      setEnquiries((prev) =>
        prev.map((item) =>
          item.id === replyEnquiry.id ? { ...item, answer: quickAnswer } : item
        )
      );
      setReplyEnquiry(null);
      setQuickAnswer("");
      router.refresh();
    } catch {
      setErrorMessage("Failed to submit answer. Please try again.");
    }
  }

  return (
    <div className="space-y-6">
      {/* Dynamic Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-indigo-500/20 bg-indigo-950/25 p-5 text-center shadow-lg backdrop-blur-sm">
          <div className="text-3xl font-black text-indigo-400">{stats.total}</div>
          <div className="text-xs font-bold text-zinc-400 mt-1 uppercase tracking-wider">Total Enquiries</div>
        </div>

        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/25 p-5 text-center shadow-lg backdrop-blur-sm">
          <div className="text-3xl font-black text-emerald-400">{stats.answered}</div>
          <div className="text-xs font-bold text-zinc-400 mt-1 uppercase tracking-wider">Answered</div>
        </div>

        <div className="rounded-2xl border border-amber-500/20 bg-amber-950/25 p-5 text-center shadow-lg backdrop-blur-sm">
          <div className="text-3xl font-black text-amber-400">{stats.unanswered}</div>
          <div className="text-xs font-bold text-zinc-400 mt-1 uppercase tracking-wider">Awaiting Reply</div>
        </div>
      </div>

      {/* Primary Control Panel & Alerts */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-t border-white/5 pt-4">
        <div className="text-zinc-400 text-sm font-semibold">
          Showing {filtered.length} of {enquiries.length} enquiries
        </div>

        <button
          onClick={() => setModalEnquiry("new")}
          className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-500 shadow-md"
        >
          <Plus className="h-4 w-4" /> Add Lobby Enquiry
        </button>
      </div>

      {errorMessage && (
        <div className="rounded-lg border border-rose-500/10 bg-rose-500/5 p-4 text-sm text-rose-400 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {errorMessage}
        </div>
      )}
      {successMessage && (
        <div className="rounded-lg border border-emerald-500/10 bg-emerald-500/5 p-4 text-sm text-emerald-400 flex items-center gap-2">
          <CheckCircle className="h-4 w-4 shrink-0" />
          {successMessage}
        </div>
      )}

      {/* Filter Options */}
      <div className="rounded-xl border border-white/10 bg-zinc-950 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative col-span-1 sm:col-span-2">
            <span className="absolute left-3 top-2.5 text-zinc-400">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Search by name, email, mobile, or text..."
              className="w-full rounded-md border border-white/10 bg-white/5 pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-all"
            />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="all">ALL STATUSES</option>
              <option value="answered">ANSWERED ONLY</option>
              <option value="unanswered">AWAITING ANSWER</option>
            </select>
          </div>
        </div>
      </div>

      {/* Enquiries Grid (Bento style / clean custom layout) */}
      <div className="grid grid-cols-1 gap-4">
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-zinc-950 p-12 text-center text-zinc-500">
            <HelpCircle className="h-12 w-12 mx-auto text-zinc-600 mb-3" />
            {enquiries.length === 0
              ? "No visitor enquiries registered for this lobby."
              : "No visitor enquiries match your search filters."}
          </div>
        ) : (
          filtered.map((enquiry) => {
            const hasAnswer = enquiry.answer && enquiry.answer.trim().length > 0;

            return (
              <div
                key={enquiry.id}
                className={`rounded-2xl border transition duration-300 p-5 sm:p-6 bg-zinc-950/60 backdrop-blur-md ${
                  hasAnswer ? "border-emerald-500/25" : "border-amber-500/25"
                } hover:border-white/20`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  {/* Contact Info Header */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="p-1 rounded-full bg-white/5 text-zinc-300">
                        <User className="h-4 w-4" />
                      </span>
                      <h4 className="text-base font-black text-white">{enquiry.name}</h4>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-widest ${
                          hasAnswer
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        }`}
                      >
                        {hasAnswer ? "Answered" : "Awaiting Reply"}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400 font-semibold">
                      <a
                        href={`mailto:${enquiry.email}`}
                        className="flex items-center gap-1 hover:text-indigo-400 transition"
                      >
                        <Mail className="h-3.5 w-3.5" /> {enquiry.email}
                      </a>
                      {enquiry.mobile_no && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5" /> {enquiry.mobile_no}
                        </span>
                      )}
                      <span className="text-zinc-500 font-mono">
                        ID: #{enquiry.id} • {new Date(enquiry.created_on).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {!hasAnswer && (
                      <button
                        onClick={() => {
                          setReplyEnquiry(enquiry);
                          setQuickAnswer("");
                        }}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 px-3 py-1.5 text-xs font-bold text-emerald-400 transition"
                      >
                        <MessageSquare className="h-3.5 w-3.5" /> Reply
                      </button>
                    )}
                    <button
                      onClick={() => setModalEnquiry(enquiry)}
                      className="inline-flex items-center gap-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 text-xs font-bold text-zinc-300 transition"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </button>
                    <button
                      disabled={pendingId === enquiry.id}
                      onClick={() => remove(enquiry.id)}
                      className="inline-flex items-center gap-1 rounded-lg bg-rose-950/20 hover:bg-rose-950/40 border border-rose-900/30 px-3 py-1.5 text-xs font-bold text-rose-400 transition disabled:opacity-40"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Question & Answer Sections */}
                <div className="mt-4 space-y-3.5 border-t border-white/5 pt-4">
                  <div className="text-sm text-zinc-200">
                    <p className="font-bold text-xs uppercase tracking-widest text-zinc-400 mb-1">
                      Visitor Question:
                    </p>
                    <p className="bg-white/[0.02] border border-white/5 p-3 rounded-xl italic">
                      "{enquiry.question_description}"
                    </p>
                  </div>

                  {hasAnswer ? (
                    <div className="text-sm text-emerald-400 bg-emerald-500/[0.02] border border-emerald-500/10 rounded-xl p-3 flex gap-2">
                      <CornerDownRight className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-xs uppercase tracking-widest text-emerald-500 mb-1">
                          Our Response:
                        </p>
                        <p className="text-zinc-200 italic font-medium">"{enquiry.answer}"</p>
                      </div>
                    </div>
                  ) : replyEnquiry?.id === enquiry.id ? (
                    <form onSubmit={handleQuickReplySubmit} className="space-y-2 pt-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-emerald-400">
                        Quick Reply Form
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          required
                          value={quickAnswer}
                          onChange={(e) => setQuickAnswer(e.target.value)}
                          placeholder="Type your response..."
                          className="flex-1 rounded-md border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-all"
                        />
                        <button
                          type="submit"
                          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-500 flex items-center gap-1"
                        >
                          <Check className="h-4 w-4" /> Save Response
                        </button>
                        <button
                          type="button"
                          onClick={() => setReplyEnquiry(null)}
                          className="rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm text-zinc-300 hover:bg-white/10"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create / Edit Modal */}
      {modalEnquiry && (
        <EnquiryModal
          defaultValues={modalEnquiry === "new" ? undefined : modalEnquiry}
          onClose={() => setModalEnquiry(null)}
          onSaved={() => {
            setModalEnquiry(null);
            setSuccessMessage("Enquiry saved successfully.");
            // Reload/re-fetch updated values or router.refresh()
            router.refresh();
            // Since it's server component loading data, router.refresh() will update initialEnquiries.
            // Let's also close the modal.
            setTimeout(() => {
              window.location.reload();
            }, 500);
          }}
        />
      )}
    </div>
  );
}

function EnquiryModal({
  defaultValues,
  onClose,
  onSaved,
}: {
  defaultValues?: EnquiryRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isEdit = !!defaultValues;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EventLobbyVisitorEnquiryInput>({
    resolver: zodResolver(eventLobbyVisitorEnquirySchema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      email: defaultValues?.email ?? "",
      mobile_no: defaultValues?.mobile_no ?? "",
      question_description: defaultValues?.question_description ?? "",
      answer: defaultValues?.answer ?? "",
    },
  });

  async function onSubmit(data: EventLobbyVisitorEnquiryInput) {
    setErrorMessage(null);
    try {
      if (isEdit) {
        await axios.patch(`/api/members/lobby-visitor-enquiries/${defaultValues.id}`, data);
      } else {
        await axios.post("/api/members/lobby-visitor-enquiries", data);
      }
      onSaved();
    } catch (err) {
      setErrorMessage(
        isAxiosError(err) && typeof err.response?.data?.error === "string"
          ? err.response.data.error
          : "Could not save this enquiry. Please verify the form and try again."
      );
    }
  }

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto overscroll-contain bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-zinc-950 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <h3 className="text-xl font-black uppercase tracking-wider text-white">
            {isEdit ? "Edit Visitor Enquiry" : "Add Visitor Enquiry"}
          </h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-zinc-300">
              Visitor Name
            </label>
            <input
              {...register("name")}
              className={FIELD_CLASS}
              placeholder="e.g. Jane Smith"
            />
            {errors.name && <p className="mt-1 text-xs text-rose-400">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-zinc-300">
                Email Address
              </label>
              <input
                {...register("email")}
                type="email"
                className={FIELD_CLASS}
                placeholder="e.g. jane@company.com"
              />
              {errors.email && <p className="mt-1 text-xs text-rose-400">{errors.email.message}</p>}
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-zinc-300">
                Mobile Number
              </label>
              <input
                {...register("mobile_no")}
                className={FIELD_CLASS}
                placeholder="e.g. +44 7123 456789"
              />
              {errors.mobile_no && (
                <p className="mt-1 text-xs text-rose-400">{errors.mobile_no.message}</p>
              )}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-zinc-300">
              Question Description
            </label>
            <textarea
              {...register("question_description")}
              rows={4}
              className={FIELD_CLASS}
              placeholder="Type the visitor's question..."
            />
            {errors.question_description && (
              <p className="mt-1 text-xs text-rose-400">{errors.question_description.message}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-zinc-300">
              Answer / Response (Optional)
            </label>
            <textarea
              {...register("answer")}
              rows={2}
              className={FIELD_CLASS}
              placeholder="Type your reply here..."
            />
            {errors.answer && <p className="mt-1 text-xs text-rose-400">{errors.answer.message}</p>}
          </div>

          {errorMessage && (
            <div className="rounded-lg border border-rose-500/10 bg-rose-500/5 p-4 text-sm text-rose-400">
              {errorMessage}
            </div>
          )}

          <div className="flex justify-end gap-3 border-t border-white/10 pt-5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/10 px-5 py-2.5 text-sm font-semibold text-zinc-300 hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-full bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-500 disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : isEdit ? "Save Changes" : "Create Enquiry"}
            </button>
          </div>
        </form>
      </div>
    </div>
    </ModalPortal>
  );
}
