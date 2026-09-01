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
  Crown,
  Download,
  Upload,
  CheckCircle2,
  Clock3,
  XCircle,
  DollarSign,
  Mic,
  Layers,
  ShoppingBag,
} from "lucide-react";
import {
  eventSpeakerSchema,
  changeAmountSchema,
  SPEAKER_STATUSES,
  type EventSpeakerInput,
  type ChangeAmountInput,
} from "@/lib/validations/eventSpeaker";
import type { SpeakerRow, SpeakerStats } from "@/lib/services/eventSpeakers";
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

interface FormDefaults extends Partial<EventSpeakerInput> {
  id?: number;
}

function SpeakerFormModal({
  defaultValues,
  onClose,
  onSaved,
}: {
  defaultValues?: FormDefaults;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"general" | "topic" | "social" | "financials" | "categories">("general");
  const isEdit = typeof defaultValues?.id === "number";
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EventSpeakerInput>({
    resolver: zodResolver(eventSpeakerSchema) as any,
    defaultValues: {
      name: defaultValues?.name ?? "",
      email: defaultValues?.email ?? "",
      phone: defaultValues?.phone ?? "",
      work_phone: defaultValues?.work_phone ?? "",
      position: defaultValues?.position ?? "",
      business: defaultValues?.business ?? "",
      exhibitor_user_id: defaultValues?.exhibitor_user_id ?? "",
      title: defaultValues?.title ?? "",
      topic_description: defaultValues?.topic_description ?? "",
      description: defaultValues?.description ?? "",
      speaker_hall: defaultValues?.speaker_hall ?? "",
      speaker_type_price: defaultValues?.speaker_type_price ?? 0,
      linkedin_user_profile: defaultValues?.linkedin_user_profile ?? "",
      facebook_url: defaultValues?.facebook_url ?? "",
      twitter_url: defaultValues?.twitter_url ?? "",
      instagram_url: defaultValues?.instagram_url ?? "",
      whatsapp_no: defaultValues?.whatsapp_no ?? "",
      zoom_url: defaultValues?.zoom_url ?? "",
      calendy_url: defaultValues?.calendy_url ?? "",
      youtube_url: defaultValues?.youtube_url ?? "",
      past_event_youtube_urls: defaultValues?.past_event_youtube_urls ?? "",
      video_type: defaultValues?.video_type ?? "",
      meeting_id: defaultValues?.meeting_id ?? "",
      meeting_password: defaultValues?.meeting_password ?? "",
      video_link: defaultValues?.video_link ?? "",
      exchange_services: defaultValues?.exchange_services ?? false,
      exchange_amount: defaultValues?.exchange_amount ?? 0,
      discount: defaultValues?.discount ?? 0,
      charitable_amount: defaultValues?.charitable_amount ?? 0,
      key_note_flag: defaultValues?.key_note_flag ?? false,
      is_business_speaker: defaultValues?.is_business_speaker ?? true,
      is_masterclass_speaker: defaultValues?.is_masterclass_speaker ?? false,
      is_keynote_speaker: defaultValues?.is_keynote_speaker ?? false,
      is_webinar_speaker: defaultValues?.is_webinar_speaker ?? false,
      is_seminar_speaker: defaultValues?.is_seminar_speaker ?? true,
      is_live_workshop_speaker: defaultValues?.is_live_workshop_speaker ?? false,
      is_vip_session_speaker: defaultValues?.is_vip_session_speaker ?? false,
      excluded_from_advertise: defaultValues?.excluded_from_advertise ?? false,
      hide_home: defaultValues?.hide_home ?? false,
      speaker_group: defaultValues?.speaker_group ?? "",
      speaker_keyword: defaultValues?.speaker_keyword ?? "",
      why_exhibit: defaultValues?.why_exhibit ?? "",
      referral_code: defaultValues?.referral_code ?? "",
      status: defaultValues?.status ?? "pending",
    },
  });

  async function onSubmit(data: EventSpeakerInput) {
    setErrorMessage(null);
    try {
      if (isEdit) {
        await axios.patch(`/api/members/speakers/${defaultValues!.id}`, data);
      } else {
        await axios.post("/api/members/speakers", data);
      }
      onSaved();
    } catch (err) {
      setErrorMessage(
        isAxiosError(err) && typeof err.response?.data?.error === "string"
          ? err.response.data.error
          : "Could not save this speaker. Please check the form and try again."
      );
    }
  }

  if (!mounted) return null;

  return createPortal(
    <ModalPortal>
      <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto overscroll-contain bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-zinc-950 border border-white/10 p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="space-y-1">
            <h3 className="text-xl font-black uppercase tracking-widest text-white">
              {isEdit ? "Edit Speaker Details" : "Allocate New Speaker"}
            </h3>
            <p className="text-xs font-semibold text-zinc-500">
              Configure speaker credentials, session topics, category flags, and financials.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full h-10 w-10 flex items-center justify-center bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-3">
          {[
            { id: "general", label: "General Info" },
            { id: "topic", label: "Topic & Session" },
            { id: "social", label: "Social & Links" },
            { id: "financials", label: "Financials" },
            { id: "categories", label: "Categories & Flags" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`rounded-xl px-4 py-2 text-xs font-black uppercase tracking-wider transition-all ${
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
          {/* GENERAL INFO TAB */}
          {activeTab === "general" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                    Full Name*
                  </label>
                  <input {...register("name")} className={FIELD_CLASS} placeholder="e.g. Dr. Sarah Jenkins" />
                  {errors.name && <p className="mt-1 text-xs font-bold text-red-500">{errors.name.message}</p>}
                </div>

                <div>
                  <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                    Email Address
                  </label>
                  <input {...register("email")} type="email" className={FIELD_CLASS} placeholder="sarah@company.com" />
                  {errors.email && <p className="mt-1 text-xs font-bold text-red-500">{errors.email.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                    Phone Number
                  </label>
                  <input {...register("phone")} className={FIELD_CLASS} placeholder="+44 20 1234 5678" />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                    Mobile / Work Phone
                  </label>
                  <input {...register("work_phone")} className={FIELD_CLASS} placeholder="+44 7700 900000" />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                    Position / Job Title
                  </label>
                  <input {...register("position")} className={FIELD_CLASS} placeholder="Chief Technology Officer" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                    Business / Organization
                  </label>
                  <input {...register("business")} className={FIELD_CLASS} placeholder="Tech Global Solutions Ltd" />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                    Status
                  </label>
                  <select {...register("status")} className={FIELD_CLASS}>
                    {SPEAKER_STATUSES.map((s) => (
                      <option key={s} value={s} className="bg-zinc-900 text-white">
                        {s.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TOPIC & SESSION TAB */}
          {activeTab === "topic" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div>
                <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                  Presentation Topic / Title*
                </label>
                <input {...register("title")} className={FIELD_CLASS} placeholder="The Future of Enterprise AI" />
                {errors.title && <p className="mt-1 text-xs font-bold text-red-500">{errors.title.message}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                    Speaker Hall / Venue Room
                  </label>
                  <input {...register("speaker_hall")} className={FIELD_CLASS} placeholder="Main Auditorium Hall A" />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                    Speaker Slot Price (£)
                  </label>
                  <input {...register("speaker_type_price")} type="number" step="0.01" className={FIELD_CLASS} placeholder="0.00" />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                  Topic Description
                </label>
                <textarea
                  {...register("topic_description")}
                  rows={3}
                  className={FIELD_CLASS}
                  placeholder="Summary of presentation topics and audience takeaways..."
                />
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                  Speaker Profile Description
                </label>
                <textarea
                  {...register("description")}
                  rows={3}
                  className={FIELD_CLASS}
                  placeholder="Biography and career background..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-white/10 pt-4">
                <div>
                  <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                    Video Platform Type
                  </label>
                  <select {...register("video_type")} className={FIELD_CLASS}>
                    <option value="" className="bg-zinc-900 text-zinc-400">Select Platform</option>
                    <option value="youtube" className="bg-zinc-900 text-white">YouTube Live</option>
                    <option value="vimeo" className="bg-zinc-900 text-white">Vimeo Stream</option>
                    <option value="zoom" className="bg-zinc-900 text-white">Zoom Meeting/Webinar</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                    Zoom Meeting ID
                  </label>
                  <input {...register("meeting_id")} className={FIELD_CLASS} placeholder="842 1092 3912" />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                    Meeting Password
                  </label>
                  <input {...register("meeting_password")} className={FIELD_CLASS} placeholder="Passcode123" />
                </div>
              </div>
            </div>
          )}

          {/* SOCIAL & LINKS TAB */}
          {activeTab === "social" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                    LinkedIn Profile URL
                  </label>
                  <input {...register("linkedin_user_profile")} className={FIELD_CLASS} placeholder="https://linkedin.com/in/username" />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                    Facebook Profile URL
                  </label>
                  <input {...register("facebook_url")} className={FIELD_CLASS} placeholder="https://facebook.com/username" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                    Twitter / X Profile
                  </label>
                  <input {...register("twitter_url")} className={FIELD_CLASS} placeholder="https://x.com/username" />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                    Instagram Handle/URL
                  </label>
                  <input {...register("instagram_url")} className={FIELD_CLASS} placeholder="https://instagram.com/username" />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                    WhatsApp Number
                  </label>
                  <input {...register("whatsapp_no")} className={FIELD_CLASS} placeholder="+447700900000" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-white/10 pt-4">
                <div>
                  <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                    Calendly Meeting Link
                  </label>
                  <input {...register("calendy_url")} className={FIELD_CLASS} placeholder="https://calendly.com/username" />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                    YouTube Reel / Channel Link
                  </label>
                  <input {...register("youtube_url")} className={FIELD_CLASS} placeholder="https://youtube.com/watch?v=..." />
                </div>
              </div>
            </div>
          )}

          {/* FINANCIALS TAB */}
          {activeTab === "financials" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-4">
                <label className={CHECKBOX_LABEL_CLASS}>
                  <input type="checkbox" {...register("exchange_services")} className="h-4 w-4 rounded accent-brand-pink" />
                  <span>Exchange Services Agreement</span>
                </label>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div>
                    <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                      Exchange Amount (£)
                    </label>
                    <input {...register("exchange_amount")} type="number" step="0.01" className={FIELD_CLASS} placeholder="0.00" />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                      Discount Granted (£)
                    </label>
                    <input {...register("discount")} type="number" step="0.01" className={FIELD_CLASS} placeholder="0.00" />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                      Charitable Contribution (£)
                    </label>
                    <input {...register("charitable_amount")} type="number" step="0.01" className={FIELD_CLASS} placeholder="0.00" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CATEGORIES & FLAGS TAB */}
          {activeTab === "categories" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className={CHECKBOX_LABEL_CLASS}>
                  <input type="checkbox" {...register("key_note_flag")} className="h-4 w-4 rounded accent-brand-pink" />
                  <span>Keynote Speaker Designation</span>
                </label>
                <label className={CHECKBOX_LABEL_CLASS}>
                  <input type="checkbox" {...register("is_business_speaker")} className="h-4 w-4 rounded accent-brand-pink" />
                  <span>Business Speaker</span>
                </label>
                <label className={CHECKBOX_LABEL_CLASS}>
                  <input type="checkbox" {...register("is_masterclass_speaker")} className="h-4 w-4 rounded accent-brand-pink" />
                  <span>Masterclass Speaker</span>
                </label>
                <label className={CHECKBOX_LABEL_CLASS}>
                  <input type="checkbox" {...register("is_keynote_speaker")} className="h-4 w-4 rounded accent-brand-pink" />
                  <span>Keynote Forum Speaker</span>
                </label>
                <label className={CHECKBOX_LABEL_CLASS}>
                  <input type="checkbox" {...register("is_webinar_speaker")} className="h-4 w-4 rounded accent-brand-pink" />
                  <span>Webinar Speaker</span>
                </label>
                <label className={CHECKBOX_LABEL_CLASS}>
                  <input type="checkbox" {...register("is_seminar_speaker")} className="h-4 w-4 rounded accent-brand-pink" />
                  <span>Seminar Speaker</span>
                </label>
                <label className={CHECKBOX_LABEL_CLASS}>
                  <input type="checkbox" {...register("is_live_workshop_speaker")} className="h-4 w-4 rounded accent-brand-pink" />
                  <span>Workshop Speaker</span>
                </label>
                <label className={CHECKBOX_LABEL_CLASS}>
                  <input type="checkbox" {...register("is_vip_session_speaker")} className="h-4 w-4 rounded accent-brand-pink" />
                  <span>VIP Session Speaker</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-white/10 pt-4">
                <label className={CHECKBOX_LABEL_CLASS}>
                  <input type="checkbox" {...register("excluded_from_advertise")} className="h-4 w-4 rounded accent-brand-pink" />
                  <span>Exclude from Advertise Magazine</span>
                </label>
                <label className={CHECKBOX_LABEL_CLASS}>
                  <input type="checkbox" {...register("hide_home")} className="h-4 w-4 rounded accent-brand-pink" />
                  <span>Hide from Home Page Highlights</span>
                </label>
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
              className="rounded-full border border-white/10 bg-white/5 px-6 py-2.5 text-xs font-black uppercase tracking-widest text-zinc-300 transition hover:bg-white/10 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-full bg-brand-pink px-8 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-brand-pink/20 transition hover:scale-[1.02] active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : isEdit ? "Save Changes" : "Allocate Speaker"}
            </button>
          </div>
        </form>
      </div>
    </div>
    </ModalPortal>,
    document.body
  );
}

function ChangeAmountModal({
  speaker,
  onClose,
  onSaved,
}: {
  speaker: SpeakerRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ChangeAmountInput>({
    resolver: zodResolver(changeAmountSchema) as any,
    defaultValues: {
      speaker_id: speaker.id,
      discount: speaker.discount ?? 0,
      charitable_amount: speaker.charitableAmount ?? 0,
      exchange_amount: speaker.exchangeAmount ?? 0,
    },
  });

  const discount = watch("discount") || 0;
  const charitable = watch("charitable_amount") || 0;
  const exchange = watch("exchange_amount") || 0;

  const basePrice = speaker.speakerTypePrice || speaker.speakerPrice || 0;
  const newAmount = Math.max(0, basePrice - discount - charitable - exchange);

  async function onSubmit(data: ChangeAmountInput) {
    setErrorMessage(null);
    try {
      await axios.patch(`/api/members/speakers/${speaker.id}`, {
        action: "change_amount",
        ...data,
      });
      onSaved();
    } catch {
      setErrorMessage("Could not update sponsorship amount. Please try again.");
    }
  }

  if (!mounted) return null;

  return createPortal(
    <ModalPortal>
      <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto overscroll-contain bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="w-full max-w-md rounded-3xl bg-zinc-950 border border-white/10 p-8 shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="space-y-1">
            <h3 className="text-xl font-black uppercase tracking-widest text-white">Change Amount</h3>
            <p className="text-xs font-bold text-zinc-400">
              {speaker.name} {speaker.business ? `(${speaker.business})` : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full h-10 w-10 flex items-center justify-center bg-white/5 text-zinc-400 hover:text-white transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
              Current Base Amount (£)
            </label>
            <input
              readOnly
              value={basePrice.toFixed(2)}
              className="w-full rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-sm font-black text-zinc-400 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
              Discount Amount (£)
            </label>
            <input {...register("discount", { valueAsNumber: true })} type="number" step="0.01" className={FIELD_CLASS} />
            {errors.discount && <p className="text-xs font-bold text-red-500 mt-1">{errors.discount.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
              Charitable Contribution (£)
            </label>
            <input {...register("charitable_amount", { valueAsNumber: true })} type="number" step="0.01" className={FIELD_CLASS} />
            {errors.charitable_amount && <p className="text-xs font-bold text-red-500 mt-1">{errors.charitable_amount.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
              Exchange Amount (£)
            </label>
            <input {...register("exchange_amount", { valueAsNumber: true })} type="number" step="0.01" className={FIELD_CLASS} />
            {errors.exchange_amount && <p className="text-xs font-bold text-red-500 mt-1">{errors.exchange_amount.message}</p>}
          </div>

          <div className="p-4 rounded-2xl bg-brand-pink/10 border border-brand-pink/20">
            <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink block">New Payable Amount</span>
            <span className="text-2xl font-black text-white">£{newAmount.toFixed(2)}</span>
          </div>

          {errorMessage && (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold">
              {errorMessage}
            </div>
          )}

          <div className="flex justify-end gap-3 border-t border-white/10 pt-6">
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
              {isSubmitting ? "Updating..." : "Update Amount"}
            </button>
          </div>
        </form>
      </div>
    </div>
    </ModalPortal>,
    document.body
  );
}

function ImportCSVModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [csvText, setCsvText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  async function handleImport() {
    if (!csvText.trim()) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const lines = csvText.trim().split("\n");
      const rows = lines.map((line) => {
        const parts = line.split(",").map((p) => p.trim());
        return {
          firstName: parts[0] || "",
          lastName: parts[1] || "",
          position: parts[2] || "",
          business: parts[3] || "",
          email: parts[4] || "",
          phone: parts[5] || "",
          workPhone: parts[6] || "",
        };
      });

      await axios.post("/api/members/speakers/import", { rows });
      onSaved();
    } catch {
      setErrorMessage("Could not import speakers CSV. Please verify column formatting.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!mounted) return null;

  return createPortal(
    <ModalPortal>
      <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto overscroll-contain bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="w-full max-w-xl rounded-3xl bg-zinc-950 border border-white/10 p-8 shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="space-y-1">
            <h3 className="text-xl font-black uppercase tracking-widest text-white">Import Speakers (CSV)</h3>
            <p className="text-xs font-bold text-zinc-400">
              Format: First Name, Last Name, Position, Business, Email, Phone, Mobile
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full h-10 w-10 flex items-center justify-center bg-white/5 text-zinc-400 hover:text-white transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            rows={8}
            placeholder={`Sarah, Jenkins, Chief Officer, Tech Global, sarah@techglobal.com, +4420123456, +44770090000\nJohn, Smith, Vice President, Acma Ltd, john@acme.org, +4420999999, +44770099999`}
            className={FIELD_CLASS}
          />

          {errorMessage && (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold">
              {errorMessage}
            </div>
          )}

          <div className="flex justify-end gap-3 border-t border-white/10 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/10 bg-white/5 px-6 py-2.5 text-xs font-black uppercase tracking-widest text-zinc-300 transition hover:bg-white/10 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={isSubmitting || !csvText.trim()}
              className="rounded-full bg-brand-pink px-8 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-brand-pink/20 transition hover:scale-[1.02] active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? "Importing..." : "Import CSV"}
            </button>
          </div>
        </div>
      </div>
    </div>
    </ModalPortal>,
    document.body
  );
}

export function SpeakersManager({
  initialSpeakers,
  initialStats,
}: {
  initialSpeakers: SpeakerRow[];
  initialStats: SpeakerStats;
}) {
  const [speakers, setSpeakers] = useState<SpeakerRow[]>(initialSpeakers);
  const [stats, setStats] = useState<SpeakerStats>(initialStats);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [keyword, setKeyword] = useState<string>("");

  const [modalSpeaker, setModalSpeaker] = useState<SpeakerRow | "new" | null>(null);
  const [changeAmountSpeaker, setChangeAmountSpeaker] = useState<SpeakerRow | null>(null);
  const [showImportCsv, setShowImportCsv] = useState<boolean>(false);

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkAction, setBulkAction] = useState<string>("");
  const [pendingAction, setPendingAction] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  async function refreshData() {
    try {
      const filterParam = statusFilter !== "all" ? `?filter=${statusFilter}` : "";
      const res = await axios.get<{ speakers: SpeakerRow[]; stats: SpeakerStats }>(
        `/api/members/speakers${filterParam}`
      );
      setSpeakers(res.data.speakers);
      setStats(res.data.stats);
    } catch {
      setErrorMessage("Could not refresh speakers list.");
    }
  }

  const filteredSpeakers = useMemo(() => {
    return speakers.filter((s) => {
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (keyword.trim()) {
        const q = keyword.trim().toLowerCase();
        const matches = [s.name, s.email, s.business, s.title, s.speakerHall, s.position]
          .filter(Boolean)
          .some((f) => f!.toLowerCase().includes(q));
        if (!matches) return false;
      }
      return true;
    });
  }, [speakers, statusFilter, keyword]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, keyword]);

  const paged = useMemo(
    () => filteredSpeakers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filteredSpeakers, page]
  );

  function handleSelectAll(e: React.ChangeEvent<HTMLInputElement>) {
    const pageIds = paged.map((s) => s.id);
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
      await axios.patch("/api/members/speakers", {
        ids: selectedIds,
        action: bulkAction,
      });
      setSuccessMessage(`Action '${bulkAction}' applied successfully to ${selectedIds.length} speaker(s).`);
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
    if (!window.confirm("Are you sure you want to delete this speaker?")) return;
    setErrorMessage(null);
    try {
      await axios.delete(`/api/members/speakers/${id}`);
      await refreshData();
    } catch {
      setErrorMessage("Could not delete speaker.");
    }
  }

  return (
    <div className="space-y-8">
      {/* 1. TOP FILTER BUTTONS BAR (Olive / Green / Red / Total count badges matching PHP) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Active Speaker</span>
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
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">Pending Speaker</span>
            <Clock3 className="h-5 w-5 text-amber-400" />
          </div>
          <div className="mt-2 text-3xl font-black text-white">{stats.pending}</div>
        </button>

        <button
          onClick={() => {
            setStatusFilter("reject");
            refreshData();
          }}
          className={`rounded-2xl p-5 text-left border transition-all duration-300 shadow-xl cursor-pointer ${
            statusFilter === "reject"
              ? "bg-red-600/30 border-red-500 text-white ring-2 ring-red-500/50"
              : "bg-red-950/20 border-red-500/20 text-red-400 hover:bg-red-900/30"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-red-400">Rejected Speaker</span>
            <XCircle className="h-5 w-5 text-red-400" />
          </div>
          <div className="mt-2 text-3xl font-black text-white">{stats.reject}</div>
        </button>

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
            <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink">Total Speaker</span>
            <Layers className="h-5 w-5 text-brand-pink" />
          </div>
          <div className="mt-2 text-3xl font-black text-white">{stats.total}</div>
        </button>
      </div>

      {/* 2. FAST ACTION CONTROLS BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-6 glass-panel rounded-3xl border-white/10 shadow-2xl backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setModalSpeaker("new")}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-pink px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-brand-pink/20 transition hover:scale-105 cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Add Speaker
          </button>

          <a
            href="/advertise?action=add&type=speaker_slot"
            className="inline-flex items-center gap-2 rounded-xl bg-white/10 border border-white/10 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white hover:bg-white/20 transition shadow-lg"
          >
            <ShoppingBag className="h-4 w-4 text-brand-pink" /> Purchase Speaker Slots
          </a>

          <button
            onClick={() => setShowImportCsv(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-zinc-300 hover:text-white hover:bg-white/10 transition"
          >
            <Upload className="h-4 w-4" /> Import CSV
          </button>

          <button
            onClick={() => {
              setSuccessMessage("Consent form pdf download initiated.");
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-zinc-300 hover:text-white hover:bg-white/10 transition"
          >
            <Download className="h-4 w-4" /> Consent Form
          </button>
        </div>

        {/* Bulk Action Controls */}
        <div className="flex items-center gap-2">
          <select
            value={bulkAction}
            onChange={(e) => setBulkAction(e.target.value)}
            className="rounded-xl border border-white/10 bg-zinc-900 px-4 py-2.5 text-xs font-bold text-white focus:outline-none"
          >
            <option value="">Bulk Actions ({selectedIds.length} selected)</option>
            <option value="approve">Approve Speakers</option>
            <option value="disapprove">Disapprove Speakers</option>
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
      </div>

      {/* Messages */}
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
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 shadow-xl backdrop-blur-md">
          <Search className="h-5 w-5 shrink-0 text-brand-pink" />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Search speaker by name, email, business, topic or hall..."
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
                <th className="px-6 py-4 font-black uppercase tracking-wider w-10">
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={paged.length > 0 && paged.every((s) => selectedIds.includes(s.id))}
                    className="h-4 w-4 rounded accent-brand-pink cursor-pointer"
                  />
                </th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Speaker / Business</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Contact Details</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Topic / Hall</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Account</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Price</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider text-center">Manage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredSpeakers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-zinc-500 italic font-medium">
                    {speakers.length === 0
                      ? "No speakers found for this event."
                      : "No speakers match your filter/search criteria."}
                  </td>
                </tr>
              ) : (
                paged.map((speaker) => {
                  const isChecked = selectedIds.includes(speaker.id);
                  const totalPrice = Math.max(
                    0,
                    (speaker.speakerTypePrice || speaker.speakerPrice) -
                      speaker.discount -
                      speaker.charitableAmount -
                      speaker.exchangeAmount
                  );

                  return (
                    <tr key={speaker.id} className="group hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleSelectRow(speaker.id)}
                          className="h-4 w-4 rounded accent-brand-pink cursor-pointer"
                        />
                      </td>

                      <td className="px-4 py-5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{speaker.name}</span>
                          {speaker.keyNoteFlag && (
                            <span title="Keynote Speaker">
                              <Crown className="h-4 w-4 text-amber-400 shrink-0" />
                            </span>
                          )}
                        </div>
                        {speaker.business && (
                          <div className="text-xs text-zinc-400 font-medium mt-0.5">{speaker.business}</div>
                        )}
                      </td>

                      <td className="px-4 py-5">
                        <div className="text-xs text-zinc-300 font-medium">{speaker.email || "—"}</div>
                        <div className="text-[11px] text-zinc-500">{speaker.phone || speaker.workPhone || "—"}</div>
                      </td>

                      <td className="px-4 py-5">
                        <div className="font-bold text-zinc-200 max-w-xs line-clamp-1">{speaker.title || "—"}</div>
                        {speaker.speakerHall && (
                          <div className="text-[11px] text-brand-pink font-semibold mt-0.5">
                            Hall: {speaker.speakerHall}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
                            STATUS_BADGE[speaker.status] || "bg-white/5 text-zinc-400 border border-white/10"
                          }`}
                        >
                          {speaker.status}
                        </span>
                      </td>

                      <td className="px-4 py-5">
                        <span className="text-xs font-semibold text-zinc-400">
                          {speaker.joiningStatus || "Pending"}
                        </span>
                      </td>

                      <td className="px-4 py-5 font-mono text-xs font-bold text-white">
                        £{totalPrice.toFixed(2)}
                      </td>

                      <td className="px-4 py-5">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setModalSpeaker(speaker)}
                            className="h-8 w-8 inline-flex items-center justify-center rounded-lg bg-white/5 text-zinc-400 hover:bg-brand-pink hover:text-white transition-all cursor-pointer"
                            title="Edit Speaker Details"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>

                          <button
                            onClick={() => setChangeAmountSpeaker(speaker)}
                            className="h-8 w-8 inline-flex items-center justify-center rounded-lg bg-white/5 text-zinc-400 hover:bg-emerald-500 hover:text-white transition-all cursor-pointer"
                            title="Change Amount / Discounts"
                          >
                            <DollarSign className="h-4 w-4" />
                          </button>

                          <a
                            href={`/members/manage_speaker_slots`}
                            className="h-8 w-8 inline-flex items-center justify-center rounded-lg bg-white/5 text-zinc-400 hover:bg-brand-purple hover:text-white transition-all cursor-pointer"
                            title="Allocate Session Slots"
                          >
                            <Mic className="h-4 w-4" />
                          </a>

                          <button
                            onClick={() => handleDeleteSingle(speaker.id)}
                            className="h-8 w-8 inline-flex items-center justify-center rounded-lg bg-white/5 text-zinc-400 hover:bg-red-500 hover:text-white transition-all cursor-pointer"
                            title="Delete Speaker"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <TablePagination currentPage={page} totalItems={filteredSpeakers.length} pageSize={PAGE_SIZE} onPageChange={setPage} />

        <div className="flex items-center justify-between border-t border-white/5 pt-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">
          <span>Showing {filteredSpeakers.length} of {speakers.length} speakers</span>
        </div>
      </div>

      {/* Modals */}
      {modalSpeaker && (
        <SpeakerFormModal
          defaultValues={
            modalSpeaker === "new"
              ? undefined
              : {
                  id: modalSpeaker.id,
                  name: modalSpeaker.name,
                  email: modalSpeaker.email ?? "",
                  phone: modalSpeaker.phone ?? "",
                  work_phone: modalSpeaker.workPhone ?? "",
                  position: modalSpeaker.position ?? "",
                  business: modalSpeaker.business ?? "",
                  exhibitor_user_id: modalSpeaker.exhibitorUserId ?? "",
                  title: modalSpeaker.title ?? "",
                  topic_description: modalSpeaker.topicDescription ?? "",
                  description: modalSpeaker.description ?? "",
                  speaker_hall: modalSpeaker.speakerHall ?? "",
                  speaker_type_price: modalSpeaker.speakerTypePrice,
                  linkedin_user_profile: modalSpeaker.linkedinUserProfile ?? "",
                  facebook_url: modalSpeaker.facebookUrl ?? "",
                  twitter_url: modalSpeaker.twitterUrl ?? "",
                  instagram_url: modalSpeaker.instagramUrl ?? "",
                  whatsapp_no: modalSpeaker.whatsappNo ?? "",
                  zoom_url: modalSpeaker.zoomUrl ?? "",
                  calendy_url: modalSpeaker.calendyUrl ?? "",
                  youtube_url: modalSpeaker.youtubeUrl ?? "",
                  past_event_youtube_urls: modalSpeaker.pastEventYoutubeUrls ?? "",
                  video_type: modalSpeaker.videoType ?? "",
                  meeting_id: modalSpeaker.meetingId ?? "",
                  meeting_password: modalSpeaker.meetingPassword ?? "",
                  video_link: modalSpeaker.videoLink ?? "",
                  exchange_services: modalSpeaker.exchangeServices,
                  exchange_amount: modalSpeaker.exchangeAmount,
                  discount: modalSpeaker.discount,
                  charitable_amount: modalSpeaker.charitableAmount,
                  key_note_flag: modalSpeaker.keyNoteFlag,
                  is_business_speaker: modalSpeaker.isBusinessSpeaker,
                  is_masterclass_speaker: modalSpeaker.isMasterclassSpeaker,
                  is_keynote_speaker: modalSpeaker.isKeynoteSpeaker,
                  is_webinar_speaker: modalSpeaker.isWebinarSpeaker,
                  is_seminar_speaker: modalSpeaker.isSeminarSpeaker,
                  is_live_workshop_speaker: modalSpeaker.isLiveWorkshopSpeaker,
                  is_vip_session_speaker: modalSpeaker.isVipSessionSpeaker,
                  excluded_from_advertise: modalSpeaker.excludedFromAdvertise,
                  hide_home: modalSpeaker.hideHome,
                  speaker_group: modalSpeaker.speakerGroup ?? "",
                  speaker_keyword: modalSpeaker.speakerKeyword ?? "",
                  why_exhibit: modalSpeaker.whyExhibit ?? "",
                  referral_code: modalSpeaker.referralCode ?? "",
                  status: (modalSpeaker.status as (typeof SPEAKER_STATUSES)[number]) ?? "pending",
                }
          }
          onClose={() => setModalSpeaker(null)}
          onSaved={() => {
            setModalSpeaker(null);
            refreshData();
          }}
        />
      )}

      {changeAmountSpeaker && (
        <ChangeAmountModal
          speaker={changeAmountSpeaker}
          onClose={() => setChangeAmountSpeaker(null)}
          onSaved={() => {
            setChangeAmountSpeaker(null);
            refreshData();
          }}
        />
      )}

      {showImportCsv && (
        <ImportCSVModal
          onClose={() => setShowImportCsv(false)}
          onSaved={() => {
            setShowImportCsv(false);
            refreshData();
          }}
        />
      )}
    </div>
  );
}
