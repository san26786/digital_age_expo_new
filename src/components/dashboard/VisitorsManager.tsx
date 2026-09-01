"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios, { isAxiosError } from "axios";
import {
  Plus, Pencil, Trash2, Search, X, ChevronLeft, ChevronRight, Filter,
  Download, Upload, FileSpreadsheet, Mail, Loader2, CheckCircle2, AlertTriangle,
} from "lucide-react";
import {
  eventVisitorSchema,
  VISITOR_STATUSES,
  VISITOR_BULK_STATUS_ACTIONS,
  type EventVisitorInput,
} from "@/lib/validations/eventVisitor";
import type { VisitorRow, VisitorsPage, VisitorStats } from "@/lib/services/eventVisitors";

import { ModalPortal } from "@/components/ui/ModalPortal";
import { readCsv, columnIndex, downloadCsv } from "@/lib/csv";
const FIELD_CLASS =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-brand-pink focus:outline-none transition-colors backdrop-blur-md";

const CHECKBOX_LABEL_CLASS =
  "flex items-center gap-3 cursor-pointer text-xs font-semibold text-zinc-300 hover:text-white select-none";

const STATUS_BADGE: Record<string, string> = {
  Registered: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  "Checked In": "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  Invited: "bg-sky-500/10 text-sky-400 border border-sky-500/20",
  Pending: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  Excluded: "bg-red-500/10 text-red-400 border border-red-500/20",
  Excluded_Email: "bg-red-500/10 text-red-400 border border-red-500/20",
  Excluded_Mobile: "bg-red-500/10 text-red-400 border border-red-500/20",
  "Not Interested": "bg-purple-500/10 text-purple-400 border border-purple-500/20",
  "Unable to attend": "bg-orange-500/10 text-orange-400 border border-orange-500/20",
  "Call Back": "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
  "No Answer": "bg-red-500/10 text-red-300 border border-red-500/20",
  "Invalid Number": "bg-pink-500/10 text-pink-400 border border-pink-500/20",
  "Voice Mail": "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20",
  "Meeting Scheduled": "bg-brand-purple/10 text-brand-purple border border-brand-purple/20",
};

const BULK_ACTION_LABEL: Record<string, string> = {
  Pending: "Pending",
  Invited: "Invited",
  Registered: "Registered",
  "Checked In": "In",
  "Not Interested": "No",
  "Unable to attend": "Unable",
  "Call Back": "Call",
  "No Answer": "None",
  "Invalid Number": "Invalid",
  "Voice Mail": "VM",
  "Meeting Scheduled": "Meeting",
  Excluded: "Exclude",
  Excluded_Email: "Ex-Mail",
  Excluded_Mobile: "Ex-Mob",
};

interface BadgeDef {
  label: string;
  key: keyof VisitorStats;
  typeFilter?: string;
  color: string;
}

const BADGES: BadgeDef[] = [
  { label: "Guest", key: "guest", typeFilter: "Pending", color: "from-amber-500/20 to-amber-500/5 text-amber-400 border-amber-500/20" },
  { label: "Invited", key: "invited", typeFilter: "Invited", color: "from-sky-500/20 to-sky-500/5 text-sky-400 border-sky-500/20" },
  { label: "Registered", key: "registered", typeFilter: "Registered", color: "from-emerald-500/20 to-emerald-500/5 text-emerald-400 border-emerald-500/20" },
  { label: "Checked IN", key: "checkedIn", typeFilter: "Checked In", color: "from-brand-pink/20 to-brand-pink/5 text-brand-pink border-brand-pink/20" },
  { label: "Excluded", key: "excluded", typeFilter: "Excluded", color: "from-red-500/20 to-red-500/5 text-red-400 border-red-500/20" },
  { label: "With Mobile", key: "withMobile", typeFilter: "with_mobile", color: "from-blue-500/20 to-blue-500/5 text-blue-400 border-blue-500/20" },
  { label: "No Mobile", key: "withoutMobile", typeFilter: "without_mobile", color: "from-zinc-500/20 to-zinc-500/5 text-zinc-400 border-zinc-500/20" },
  { label: "Not Interested", key: "notInterested", typeFilter: "Not Interested", color: "from-purple-500/20 to-purple-500/5 text-purple-400 border-purple-500/20" },
  { label: "Unable Attend", key: "unableToAttend", typeFilter: "Unable to attend", color: "from-orange-500/20 to-orange-500/5 text-orange-400 border-orange-500/20" },
  { label: "Call Back", key: "callBack", typeFilter: "Call Back", color: "from-yellow-500/20 to-yellow-500/5 text-yellow-400 border-yellow-500/20" },
  { label: "No Answer", key: "noAnswer", typeFilter: "No Answer", color: "from-red-500/20 to-red-500/5 text-red-300 border-red-500/20" },
  { label: "Scheduled", key: "meetingScheduled", typeFilter: "Meeting Scheduled", color: "from-brand-purple/20 to-brand-purple/5 text-brand-purple border-brand-purple/20" },
  { label: "Total", key: "total", typeFilter: undefined, color: "from-white/10 to-white/5 text-white border-white/20" },
];

interface FormDefaults extends Partial<EventVisitorInput> {
  id?: number;
}

function VisitorFormModal({
  defaultValues,
  onClose,
  onSaved,
}: {
  defaultValues?: FormDefaults;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"general" | "survey" | "dietary">("general");
  const isEdit = typeof defaultValues?.id === "number";

  // This modal is triggered from inside ancestors that have a CSS `animation`
  // (.section-transition on the members layout) and a `backdrop-filter` (.glass-panel) — both
  // create a new containing block for `position: fixed`, which pins the overlay inside that
  // ancestor's box instead of the viewport (it renders far down the page, requiring a scroll to
  // find it, instead of centering on screen). Portaling straight to document.body sidesteps that
  // entirely — same fix already used by CopyEventModal.tsx for the identical symptom. `document`
  // isn't available during SSR, so only portal once mounted client-side.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EventVisitorInput>({
    resolver: zodResolver(eventVisitorSchema) as any,
    defaultValues: {
      first_name: defaultValues?.first_name ?? "",
      last_name: defaultValues?.last_name ?? "",
      email: defaultValues?.email ?? "",
      phone: defaultValues?.phone ?? "",
      workphone: defaultValues?.workphone ?? "",
      gender: defaultValues?.gender ?? "",
      business: defaultValues?.business ?? "",
      position: defaultValues?.position ?? "",
      linkedin_user_profile: defaultValues?.linkedin_user_profile ?? "",
      referral_code: defaultValues?.referral_code ?? "",
      referral_mstr_id: defaultValues?.referral_mstr_id ?? "",
      visitor_referrer_from: defaultValues?.visitor_referrer_from ?? "",
      visitor_why_exhibit: defaultValues?.visitor_why_exhibit ?? "",
      visitor_is_webinars: defaultValues?.visitor_is_webinars ?? false,
      visitor_is_workshops: defaultValues?.visitor_is_workshops ?? false,
      visitor_is_e_magazine: defaultValues?.visitor_is_e_magazine ?? false,
      visitor_is_newsletter: defaultValues?.visitor_is_newsletter ?? false,
      excluded_from_advertise: defaultValues?.excluded_from_advertise ?? false,
      award_guest: defaultValues?.award_guest ?? false,
      allergy_from_nuts: defaultValues?.allergy_from_nuts ?? false,
      allergey_from_shell_fish: defaultValues?.allergey_from_shell_fish ?? false,
      allergey_from_dairy_products: defaultValues?.allergey_from_dairy_products ?? false,
      vegetarian: defaultValues?.vegetarian ?? false,
      vegan: defaultValues?.vegan ?? false,
      dietary_requirement: defaultValues?.dietary_requirement ?? "",
      any_other_food_allergy: defaultValues?.any_other_food_allergy ?? "",
      batch_number: defaultValues?.batch_number ?? "",
      source: defaultValues?.source ?? "",
      status: defaultValues?.status ?? "Pending",
    },
  });

  const isAwardGuest = watch("award_guest");

  async function onSubmit(data: EventVisitorInput) {
    setErrorMessage(null);
    try {
      if (isEdit) {
        await axios.patch(`/api/members/visitors/${defaultValues!.id}`, data);
      } else {
        await axios.post("/api/members/visitors", data);
      }
      onSaved();
    } catch (err) {
      setErrorMessage(
        isAxiosError(err) && typeof err.response?.data?.error === "string"
          ? err.response.data.error
          : "Could not save this visitor. Please check the form and try again."
      );
    }
  }

  if (!mounted) return null;

  return createPortal(
    <ModalPortal>
      <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto overscroll-contain bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-zinc-950 border border-white/10 p-8 shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div className="space-y-1">
            <h3 className="text-xl font-black uppercase tracking-widest text-white">{isEdit ? "Edit Visitor" : "Add Visitor"}</h3>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Attendee Profile & Event RSVP Data</p>
          </div>
          <button onClick={onClose} className="rounded-full h-10 w-10 flex items-center justify-center bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition-all">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Form Navigation Tabs */}
        <div className="flex border-b border-white/10 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("general")}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
              activeTab === "general" ? "border-brand-pink text-brand-pink" : "border-transparent text-zinc-400 hover:text-white"
            }`}
          >
            Contact & Role
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("survey")}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
              activeTab === "survey" ? "border-brand-pink text-brand-pink" : "border-transparent text-zinc-400 hover:text-white"
            }`}
          >
            Referral & Preferences
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("dietary")}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
              activeTab === "dietary" ? "border-brand-pink text-brand-pink" : "border-transparent text-zinc-400 hover:text-white"
            }`}
          >
            Award & Dietary
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {activeTab === "general" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">First Name*</label>
                  <input {...register("first_name")} className={FIELD_CLASS} />
                  {errors.first_name && <p className="mt-1 text-xs font-bold text-red-500">{errors.first_name.message}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Last Name*</label>
                  <input {...register("last_name")} className={FIELD_CLASS} />
                  {errors.last_name && <p className="mt-1 text-xs font-bold text-red-500">{errors.last_name.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Email Address*</label>
                  <input {...register("email")} type="email" className={FIELD_CLASS} />
                  {errors.email && <p className="mt-1 text-xs font-bold text-red-500">{errors.email.message}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Gender</label>
                  <select {...register("gender")} className={FIELD_CLASS}>
                    <option value="" className="bg-zinc-900">Select Gender</option>
                    <option value="Male" className="bg-zinc-900">Male</option>
                    <option value="Female" className="bg-zinc-900">Female</option>
                    <option value="Other" className="bg-zinc-900">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Mobile Phone</label>
                  <input {...register("phone")} className={FIELD_CLASS} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Work Phone</label>
                  <input {...register("workphone")} className={FIELD_CLASS} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Business / Company</label>
                  <input {...register("business")} className={FIELD_CLASS} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Position / Job Title</label>
                  <input {...register("position")} className={FIELD_CLASS} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">LinkedIn Profile</label>
                  <input {...register("linkedin_user_profile")} className={FIELD_CLASS} placeholder="https://..." />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Event Status</label>
                  <select {...register("status")} className={FIELD_CLASS}>
                    {VISITOR_STATUSES.map((s) => (
                      <option key={s} value={s} className="bg-zinc-900">
                        {s.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === "survey" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Referral Code</label>
                  <input {...register("referral_code")} className={FIELD_CLASS} placeholder="Partner code" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Referrer Type</label>
                  <input {...register("referral_mstr_id")} className={FIELD_CLASS} placeholder="e.g. Email, Social, Partner" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Referrer Origin</label>
                  <input {...register("visitor_referrer_from")} className={FIELD_CLASS} placeholder="Where did you hear about the show?" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Exhibiting Interest</label>
                  <input {...register("visitor_why_exhibit")} className={FIELD_CLASS} placeholder="Interested in booth or stand?" />
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-pink">Event Subscriptions & Preferences</p>
                <div className="grid grid-cols-2 gap-3">
                  <label className={CHECKBOX_LABEL_CLASS}>
                    <input type="checkbox" {...register("visitor_is_webinars")} className="h-4 w-4 rounded border-white/10 bg-white/5 text-brand-pink focus:ring-brand-pink" />
                    Webinars & Seminars
                  </label>
                  <label className={CHECKBOX_LABEL_CLASS}>
                    <input type="checkbox" {...register("visitor_is_workshops")} className="h-4 w-4 rounded border-white/10 bg-white/5 text-brand-pink focus:ring-brand-pink" />
                    Workshops
                  </label>
                  <label className={CHECKBOX_LABEL_CLASS}>
                    <input type="checkbox" {...register("visitor_is_e_magazine")} className="h-4 w-4 rounded border-white/10 bg-white/5 text-brand-pink focus:ring-brand-pink" />
                    E-Magazine
                  </label>
                  <label className={CHECKBOX_LABEL_CLASS}>
                    <input type="checkbox" {...register("visitor_is_newsletter")} className="h-4 w-4 rounded border-white/10 bg-white/5 text-brand-pink focus:ring-brand-pink" />
                    Newsletter
                  </label>
                  <label className={CHECKBOX_LABEL_CLASS}>
                    <input type="checkbox" {...register("excluded_from_advertise")} className="h-4 w-4 rounded border-white/10 bg-white/5 text-brand-pink focus:ring-brand-pink" />
                    Exclude from Advertise Magazine
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === "dietary" && (
            <div className="space-y-4">
              <label className={CHECKBOX_LABEL_CLASS}>
                <input type="checkbox" {...register("award_guest")} className="h-5 w-5 rounded border-white/10 bg-white/5 text-brand-pink focus:ring-brand-pink" />
                <span className="text-sm font-bold text-white">Attending as Award Guest / Gala Dinner</span>
              </label>

              {isAwardGuest && (
                <div className="space-y-4 border-t border-white/10 pt-4 animate-in fade-in duration-200">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-pink">Dietary Restrictions & Allergies</p>
                  <div className="grid grid-cols-2 gap-3">
                    <label className={CHECKBOX_LABEL_CLASS}>
                      <input type="checkbox" {...register("vegetarian")} className="h-4 w-4 rounded border-white/10 bg-white/5 text-brand-pink focus:ring-brand-pink" />
                      Vegetarian
                    </label>
                    <label className={CHECKBOX_LABEL_CLASS}>
                      <input type="checkbox" {...register("vegan")} className="h-4 w-4 rounded border-white/10 bg-white/5 text-brand-pink focus:ring-brand-pink" />
                      Vegan
                    </label>
                    <label className={CHECKBOX_LABEL_CLASS}>
                      <input type="checkbox" {...register("allergy_from_nuts")} className="h-4 w-4 rounded border-white/10 bg-white/5 text-brand-pink focus:ring-brand-pink" />
                      Nut Allergy
                    </label>
                    <label className={CHECKBOX_LABEL_CLASS}>
                      <input type="checkbox" {...register("allergey_from_shell_fish")} className="h-4 w-4 rounded border-white/10 bg-white/5 text-brand-pink focus:ring-brand-pink" />
                      Shellfish Allergy
                    </label>
                    <label className={CHECKBOX_LABEL_CLASS}>
                      <input type="checkbox" {...register("allergey_from_dairy_products")} className="h-4 w-4 rounded border-white/10 bg-white/5 text-brand-pink focus:ring-brand-pink" />
                      Dairy Products Allergy
                    </label>
                  </div>

                  <div className="space-y-2 pt-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Specific Dietary Requirements</label>
                    <textarea {...register("dietary_requirement")} rows={2} className={FIELD_CLASS} placeholder="Details on food preferences or restrictions..." />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Other Food Allergies</label>
                    <textarea {...register("any_other_food_allergy")} rows={2} className={FIELD_CLASS} placeholder="Other allergies..." />
                  </div>
                </div>
              )}
            </div>
          )}

          {errorMessage && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold">
              {errorMessage}
            </div>
          )}

          <div className="flex justify-end gap-4 border-t border-white/5 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/10 bg-white/5 px-8 py-3 text-xs font-black uppercase tracking-widest text-zinc-300 transition hover:bg-white/10 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-full bg-brand-pink px-10 py-3 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-brand-pink/20 transition hover:scale-[1.02] active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? "Processing..." : isEdit ? "Save Changes" : "Register Visitor"}
            </button>
          </div>
        </form>
      </div>
    </div>
    </ModalPortal>,
    document.body
  );
}

function pageNumbers(current: number, totalPages: number): (number | "…")[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const pages = new Set<number>([1, 2, totalPages - 1, totalPages, current - 1, current, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const result: (number | "…")[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) result.push("…");
    result.push(p);
    prev = p;
  }
  return result;
}

/* ----------------------------- CSV import modal ---------------------------- */

interface ParsedVisitorCsv {
  rows: Record<string, string>[];
  delimiterLabel: string;
  ignoredColumns: string[];
  error?: string;
}

/**
 * Maps a CSV onto visitor rows by HEADER NAME, so column order does not matter and the page's
 * own export re-imports unchanged. Either "First Name"+"Last Name" or a single "Name" works.
 *
 * Derived columns are accepted in the header and ignored: Location, Country and Franchise are
 * resolved from linked records rather than stored as free text on the visitor, and Joining
 * Status is set by the RSVP flow.
 */
function mapVisitorCsv(text: string): ParsedVisitorCsv {
  const { header, rows: table, delimiterLabel } = readCsv(text);
  if (header.length === 0) {
    return { rows: [], delimiterLabel, ignoredColumns: [], error: "That file is empty." };
  }

  const iFirst = columnIndex(header, "first name", "first_name", "firstname");
  const iLast = columnIndex(header, "last name", "last_name", "lastname", "surname");
  const iName = columnIndex(header, "name", "full name");
  const iEmail = columnIndex(header, "email", "email address", "e-mail");
  const iPhone = columnIndex(header, "phone", "mobile", "telephone");
  const iWork = columnIndex(header, "work phone", "workphone", "work_phone");
  const iBusiness = columnIndex(header, "business", "company", "company name");
  const iPosition = columnIndex(header, "position", "job title", "role");
  const iGender = columnIndex(header, "gender");
  const iLinked = columnIndex(header, "linkedin", "linkedin_user_profile", "linkedin profile");
  const iReferral = columnIndex(header, "referral code", "referral_code");
  const iBatch = columnIndex(header, "batch number", "batch_number");
  const iSource = columnIndex(header, "source");
  const iStatus = columnIndex(header, "status");
  const iWebinars = columnIndex(header, "webinars", "visitor_is_webinars");
  const iWorkshops = columnIndex(header, "workshops", "visitor_is_workshops");
  const iMagazine = columnIndex(header, "e-magazine", "emagazine", "visitor_is_e_magazine");
  const iNewsletter = columnIndex(header, "newsletter", "visitor_is_newsletter");

  if (iEmail === -1 || (iFirst === -1 && iName === -1)) {
    return {
      rows: [],
      delimiterLabel,
      ignoredColumns: [],
      error:
        `Needs an "Email" column plus either "First Name" or "Name". Read the file as ` +
        `${delimiterLabel}; columns came out as: ` +
        `${header.map((h) => h || "(blank)").join(" | ") || "(empty)"}`,
    };
  }

  const ignoredColumns = header.filter((h) =>
    ["id", "location", "country", "franchise", "joining status", "created"].includes(h),
  );
  const cell = (r: string[], i: number) => (i === -1 ? "" : (r[i] ?? "").trim());

  const rows = table
    .map((r) => ({
      first_name: cell(r, iFirst),
      last_name: cell(r, iLast),
      name: cell(r, iName),
      email: cell(r, iEmail),
      phone: cell(r, iPhone),
      workphone: cell(r, iWork),
      business: cell(r, iBusiness),
      position: cell(r, iPosition),
      gender: cell(r, iGender),
      linkedin_user_profile: cell(r, iLinked),
      referral_code: cell(r, iReferral),
      batch_number: cell(r, iBatch),
      source: cell(r, iSource),
      status: cell(r, iStatus),
      visitor_is_webinars: cell(r, iWebinars),
      visitor_is_workshops: cell(r, iWorkshops),
      visitor_is_e_magazine: cell(r, iMagazine),
      visitor_is_newsletter: cell(r, iNewsletter),
    }))
    .filter((r) => r.email !== "" || r.first_name !== "" || r.name !== "");

  if (rows.length === 0) {
    return {
      rows: [],
      delimiterLabel,
      ignoredColumns,
      error: "That file has a header but no usable data rows.",
    };
  }
  return { rows, delimiterLabel, ignoredColumns };
}

interface VisitorImportSummary {
  created: number;
  skipped: number;
  skippedEmails: string[];
  invalid: { row: number; name: string; reason: string }[];
}

function ImportVisitorsModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const [fileName, setFileName] = useState("");
  const [parsed, setParsed] = useState<ParsedVisitorCsv | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<VisitorImportSummary | null>(null);

  async function pickFile(file: File | undefined) {
    if (!file) return;
    setError("");
    setSummary(null);
    setFileName(file.name);
    const result = mapVisitorCsv(await file.text());
    setParsed(result);
    if (result.error) setError(result.error);
  }

  async function runImport() {
    if (!parsed?.rows.length) return;
    setBusy(true);
    setError("");
    try {
      const { data } = await axios.post("/api/members/visitors/import", { rows: parsed.rows });
      setSummary(data as VisitorImportSummary);
      onImported();
    } catch (err) {
      setError(
        isAxiosError(err) && typeof err.response?.data?.error === "string"
          ? err.response.data.error
          : "Could not import this file.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModalPortal onClose={onClose}>
      <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto overscroll-contain bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
        <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-zinc-950 p-6 shadow-2xl">
          <div className="flex items-start justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-pink/15 text-brand-pink">
                <FileSpreadsheet className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-white">Import Visitors from CSV</h3>
                <p className="text-xs text-zinc-400">
                  Same columns as Export CSV. Existing emails are skipped, never overwritten.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-4 pt-5">
            {error && (
              <p className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-300">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </p>
            )}

            {summary ? (
              <div className="space-y-3">
                <p className="flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-300">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    Imported <strong>{summary.created}</strong>{" "}
                    {summary.created === 1 ? "visitor" : "visitors"}.
                    {summary.skipped > 0 && <> {summary.skipped} already existed and were left alone.</>}
                  </span>
                </p>

                {summary.invalid.length > 0 && (
                  <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
                    <p className="mb-1 font-bold uppercase tracking-wider">
                      {summary.invalid.length} row(s) rejected
                    </p>
                    <ul className="space-y-0.5">
                      {summary.invalid.slice(0, 6).map((row) => (
                        <li key={row.row}>
                          Row {row.row}: {row.name} — {row.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {summary.skippedEmails.length > 0 && (
                  <details className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-zinc-400">
                    <summary className="cursor-pointer font-semibold text-zinc-300">
                      {summary.skippedEmails.length} skipped as duplicates
                    </summary>
                    <p className="mt-2 leading-relaxed">{summary.skippedEmails.join(", ")}</p>
                  </details>
                )}
              </div>
            ) : (
              <>
                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-8 text-center transition hover:border-brand-pink/40 hover:bg-white/[0.04]">
                  <Upload className="h-6 w-6 text-zinc-500" />
                  <span className="text-sm font-semibold text-zinc-200">
                    {fileName || "Choose a CSV file"}
                  </span>
                  <span className="text-[11px] text-zinc-500">
                    Needs Email plus First/Last Name (or Name). Comma or tab separated.
                  </span>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(e) => pickFile(e.target.files?.[0])}
                  />
                </label>

                {parsed && !parsed.error && (
                  <div className="space-y-3">
                    <p className="text-sm text-zinc-300">
                      <strong className="text-white">{parsed.rows.length}</strong> row
                      {parsed.rows.length === 1 ? "" : "s"} ready to import{" "}
                      <span className="text-zinc-500">({parsed.delimiterLabel})</span>.
                    </p>
                    <p className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-[11px] leading-relaxed text-zinc-400">
                      Rows are created through the same code path as Add Visitor, so a large file
                      takes a few moments. Anything without a Source is tagged
                      <span className="font-semibold text-zinc-300"> csv_import</span>.
                    </p>

                    <div className="max-h-48 overflow-y-auto rounded-xl border border-white/10">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-white/10 bg-gradient-to-r from-brand-purple to-brand-pink text-white">
                            <th className="px-6 py-4 font-black uppercase tracking-wider">Name</th>
                            <th className="px-6 py-4 font-black uppercase tracking-wider">Email</th>
                            <th className="px-6 py-4 font-black uppercase tracking-wider">Business</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {parsed.rows.slice(0, 50).map((row, i) => (
                            <tr key={`${row.email}-${i}`} className="bg-zinc-900/30">
                              <td className="px-3 py-1.5 text-zinc-200">
                                {`${row.first_name} ${row.last_name}`.trim() || row.name || "—"}
                              </td>
                              <td className="px-3 py-1.5 text-zinc-500">{row.email || "—"}</td>
                              <td className="px-3 py-1.5 text-zinc-500">{row.business || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {parsed.rows.length > 50 && (
                      <p className="text-[11px] text-zinc-500">
                        Showing the first 50 — all {parsed.rows.length} will be imported.
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="mt-6 flex justify-end gap-2 border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-zinc-300 transition hover:bg-white/10 hover:text-white"
            >
              {summary ? "Done" : "Cancel"}
            </button>
            {!summary && (
              <button
                type="button"
                onClick={runImport}
                disabled={busy || !parsed?.rows.length}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-pink px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white transition hover:opacity-90 disabled:opacity-40"
              >
                {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {busy ? "Importing..." : `Import ${parsed?.rows.length ?? 0}`}
              </button>
            )}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

export function VisitorsManager({ initialPage, initialStats }: { initialPage: VisitorsPage; initialStats: VisitorStats }) {
  const [rows, setRows] = useState<VisitorRow[]>(initialPage.rows);
  const [total, setTotal] = useState(initialPage.total);
  const [page, setPage] = useState(initialPage.page);
  const [pageSize] = useState(initialPage.pageSize);
  const [stats, setStats] = useState<VisitorStats>(initialStats);
  const [activeFilter, setActiveFilter] = useState<string | undefined>(undefined);
  const [keyword, setKeyword] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [modalVisitor, setModalVisitor] = useState<VisitorRow | "new" | null>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [bulkPending, setBulkPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [templates, setTemplates] = useState<{ id: string; label: string }[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [actionValue, setActionValue] = useState("");
  const [mailPending, setMailPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  async function fetchPage(nextPage: number, search: string, filterType?: string) {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await axios.get<VisitorsPage>("/api/members/visitors", {
        params: { page: nextPage, search: search || undefined, type: filterType || undefined },
      });
      setRows(res.data.rows);
      setTotal(res.data.total);
      setPage(res.data.page);
      setSelected(new Set());
    } catch {
      setErrorMessage("Could not load visitors. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function refreshStats() {
    try {
      const res = await axios.get<{ stats: VisitorStats }>("/api/members/visitors/stats");
      setStats(res.data.stats);
    } catch { }
  }

  useEffect(() => {
    const t = setTimeout(() => setSearchTerm(keyword), 400);
    return () => clearTimeout(t);
  }, [keyword]);

  const isFirstRun = useRef(true);
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    fetchPage(1, searchTerm, activeFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, activeFilter]);

  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)));
  }
  function toggleOne(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleBadgeClick(typeFilter?: string) {
    if (activeFilter === typeFilter) {
      setActiveFilter(undefined);
    } else {
      setActiveFilter(typeFilter);
    }
  }

  // Loaded once: the template list is small, shared platform data, and does not change while
  // the organiser is working on this page.
  useEffect(() => {
    let cancelled = false;
    axios
      .get("/api/members/visitors/email-templates")
      .then(({ data }) => {
        if (!cancelled) setTemplates(data.templates ?? []);
      })
      .catch(() => {
        /* the dropdown simply stays empty and disabled */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Exports what the importer reads back, so a file can round-trip.
   *
   * NOTE: this exports the CURRENT PAGE, not the whole list — the table is server-paginated
   * (VISITORS_PAGE_SIZE) and `rows` only ever holds one page. Exporting silently partial data
   * without saying so would be worse than the limitation itself, so the button label and the
   * hint below it both say which.
   */
  function exportCsv(onlySelected: boolean) {
    const source = onlySelected ? rows.filter((r) => selected.has(r.id)) : rows;
    downloadCsv(
      "event-visitors.csv",
      [
        "First Name", "Last Name", "Email", "Phone", "Work Phone", "Business", "Position",
        "Gender", "LinkedIn", "Referral Code", "Batch Number", "Source", "Status",
        "Webinars", "Workshops", "E-Magazine", "Newsletter", "Location", "Country",
      ],
      source.map((r) => [
        r.firstName,
        r.lastName,
        r.email,
        r.phone ?? "",
        r.workphone ?? "",
        r.business ?? "",
        r.position ?? "",
        r.gender ?? "",
        r.linkedinUserProfile ?? "",
        r.referralCode ?? "",
        r.batchNumber ?? "",
        r.source ?? "",
        r.status,
        r.visitorIsWebinars ? "Yes" : "No",
        r.visitorIsWorkshops ? "Yes" : "No",
        r.visitorIsEMagazine ? "Yes" : "No",
        r.visitorIsNewsletter ? "Yes" : "No",
        r.locationName ?? "",
        r.countryName ?? "",
      ]),
    );
  }

  async function sendMail() {
    if (!templateId || selected.size === 0) return;
    setMailPending(true);
    setErrorMessage(null);
    setNotice(null);
    try {
      const { data } = await axios.post("/api/members/visitors/send-mail", {
        ids: [...selected],
        templateId,
      });
      // Reported honestly: "smtp_not_configured" is indistinguishable from success unless the
      // failure count and reason are surfaced.
      if (data.sent > 0 && data.failed === 0) {
        setNotice(`Sent to ${data.sent} visitor${data.sent === 1 ? "" : "s"}.`);
      } else if (data.sent > 0) {
        setNotice(`Sent to ${data.sent}; ${data.failed} failed (${data.reason ?? "unknown"}).`);
      } else {
        setErrorMessage(`Nothing was sent — ${data.reason ?? "unknown reason"}.`);
      }
    } catch (err) {
      setErrorMessage(
        isAxiosError(err) && typeof err.response?.data?.error === "string"
          ? err.response.data.error
          : "Could not send this mail.",
      );
    } finally {
      setMailPending(false);
    }
  }

  /**
   * The "Select an Action" dropdown.
   *
   * Limited to what this app can actually carry out: the fourteen status changes (which the
   * service already handles, including copying the three Excluded_* variants into
   * find_event_excluded), an export, and bulk delete. The legacy list also offers "Add To
   * Exhibitor", "Add To Speaker", visitor-pass downloads and previous-event imports; those need
   * service code that does not exist here yet, and a menu entry that silently does nothing is
   * worse than one that is absent.
   */
  async function runAction() {
    if (!actionValue) return;
    if (actionValue === "export_selected") {
      exportCsv(true);
      return;
    }
    if (selected.size === 0) return;
    if (actionValue === "bulk_delete") {
      await bulkDelete();
      return;
    }

    setBulkPending(true);
    setErrorMessage(null);
    setNotice(null);
    try {
      await axios.post("/api/members/visitors/bulk-status", {
        ids: [...selected],
        status: actionValue,
      });
      setNotice(`Updated ${selected.size} visitor${selected.size === 1 ? "" : "s"}.`);
      await Promise.all([fetchPage(page, searchTerm, activeFilter), refreshStats()]);
    } catch {
      setErrorMessage("Could not apply that action.");
    } finally {
      setBulkPending(false);
    }
  }

  async function bulkDelete() {
    if (selected.size === 0) return;
    if (!window.confirm(`Delete ${selected.size} selected visitor${selected.size === 1 ? "" : "s"}? This cannot be undone.`)) return;
    setBulkPending(true);
    setErrorMessage(null);
    try {
      await axios.post("/api/members/visitors/bulk-delete", { ids: [...selected] });
      await Promise.all([fetchPage(page, searchTerm, activeFilter), refreshStats()]);
    } catch {
      setErrorMessage("Could not delete the selected visitors. Please try again.");
    } finally {
      setBulkPending(false);
    }
  }

  async function remove(id: number) {
    if (!window.confirm("Remove this visitor? This cannot be undone.")) return;
    setPendingId(id);
    setErrorMessage(null);
    try {
      await axios.delete(`/api/members/visitors/${id}`);
      await Promise.all([fetchPage(page, searchTerm, activeFilter), refreshStats()]);
    } catch {
      setErrorMessage("Could not remove this visitor. Please try again.");
    } finally {
      setPendingId(null);
    }
  }

  function handleSaved() {
    setModalVisitor(null);
    fetchPage(page, searchTerm, activeFilter);
    refreshStats();
  }

  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);
  const pages = useMemo(() => pageNumbers(page, totalPages), [page, totalPages]);

  return (
    <div className="space-y-8">
      {/* Filterable Stats Dashboard Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {BADGES.map((b) => {
          const isActive = activeFilter === b.typeFilter;
          return (
            <button
              key={b.label}
              onClick={() => handleBadgeClick(b.typeFilter)}
              className={`rounded-2xl bg-gradient-to-br p-4 border text-left transition-all cursor-pointer hover:scale-105 active:scale-95 ${b.color} ${
                isActive ? "ring-2 ring-brand-pink scale-105 shadow-lg" : "opacity-90"
              }`}
            >
              <div className="text-[9px] font-black uppercase tracking-widest opacity-80 mb-1">{b.label}</div>
              <div className="text-2xl font-black">{stats[b.key]}</div>
            </button>
          );
        })}
      </div>

      <div className="glass-panel rounded-3xl p-8 border-white/10 shadow-2xl backdrop-blur-md space-y-6">
        {/* Quick Status Filter Chips — click any chip to filter the table below to that status
            (no row selection needed, same activeFilter mechanism as the stat badges above).
            Bulk Delete stays a true bulk action: it only activates once you tick row checkboxes. */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            {VISITOR_BULK_STATUS_ACTIONS.map((status) => {
              const isActive = activeFilter === status;
              return (
                <button
                  key={status}
                  onClick={() => handleBadgeClick(status)}
                  className={`rounded-full border px-3.5 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                    isActive
                      ? "bg-violet-500 border-violet-400 text-white shadow-lg shadow-violet-500/30"
                      : "bg-violet-500/15 border-violet-400/40 text-violet-200 hover:bg-violet-500 hover:text-white hover:border-violet-400"
                  }`}
                >
                  {BULK_ACTION_LABEL[status] ?? status}
                </button>
              );
            })}
            <button
              disabled={selected.size === 0 || bulkPending}
              onClick={bulkDelete}
              className="rounded-full bg-rose-500/15 border border-rose-400/40 px-3.5 py-1.5 text-[10px] font-black uppercase tracking-widest text-rose-300 hover:bg-rose-600 hover:text-white hover:border-rose-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-rose-500/15 disabled:hover:text-rose-300 cursor-pointer"
              title={selected.size === 0 ? "Tick one or more visitors below to enable bulk delete" : undefined}
            >
              Bulk Delete
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => exportCsv(false)}
              disabled={rows.length === 0}
              title="Exports the visitors currently shown on this page"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-zinc-300 transition hover:bg-white/10 hover:text-white disabled:opacity-40 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              Export Page
            </button>
            <button
              onClick={() => setImportOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-zinc-300 transition hover:bg-white/10 hover:text-white cursor-pointer"
            >
              <Upload className="h-3.5 w-3.5" />
              Import CSV
            </button>
            <button
              onClick={() => setModalVisitor("new")}
              className="inline-flex items-center gap-2 rounded-full bg-brand-pink px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-white shadow-xl shadow-brand-pink/20 transition hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Add Visitor
            </button>
          </div>
        </div>

        {/* ============================================================
            Email template + Action bar — the two dropdowns from
            members/view_visitor_list.tpl, which pairs each select with its
            own submit button rather than one shared "go".
        ============================================================ */}
        <div className="grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 lg:grid-cols-2">
          <div className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="visitor-mail-template">
              Select an email template
            </label>
            <select
              id="visitor-mail-template"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              disabled={templates.length === 0}
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-xs font-semibold text-white focus:border-brand-pink focus:outline-none focus:ring-1 focus:ring-brand-pink disabled:opacity-40"
            >
              <option value="">
                {templates.length === 0 ? "No email templates available" : "Select an Email Template"}
              </option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={sendMail}
              disabled={!templateId || selected.size === 0 || mailPending}
              title={selected.size === 0 ? "Tick one or more visitors below first" : undefined}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-brand-purple px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white transition hover:opacity-90 disabled:opacity-40 cursor-pointer"
            >
              {mailPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
              Send Mail
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="visitor-action">
              Select an action
            </label>
            <select
              id="visitor-action"
              value={actionValue}
              onChange={(e) => setActionValue(e.target.value)}
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-xs font-semibold text-white focus:border-brand-pink focus:outline-none focus:ring-1 focus:ring-brand-pink"
            >
              <option value="">Select an Action</option>
              <optgroup label="Export">
                <option value="export_selected">Export Selected to CSV</option>
              </optgroup>
              <optgroup label="Set status">
                {VISITOR_BULK_STATUS_ACTIONS.map((status) => (
                  <option key={status} value={status}>
                    {BULK_ACTION_LABEL[status] ?? status}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Danger">
                <option value="bulk_delete">Delete Selected</option>
              </optgroup>
            </select>
            <button
              type="button"
              onClick={runAction}
              disabled={
                !actionValue ||
                bulkPending ||
                (actionValue !== "export_selected" && selected.size === 0)
              }
              title={selected.size === 0 ? "Tick one or more visitors below first" : undefined}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-brand-purple px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white transition hover:opacity-90 disabled:opacity-40 cursor-pointer"
            >
              {bulkPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Submit
            </button>
          </div>

          <p className="text-[11px] font-medium text-zinc-500 lg:col-span-2">
            {selected.size === 0
              ? "Tick rows in the table below to choose who these apply to."
              : `${selected.size} visitor${selected.size === 1 ? "" : "s"} selected.`}{" "}
            Export covers this page only — the list is paginated on the server.
          </p>
        </div>

        {notice && (
          <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-300">
            {notice}
          </p>
        )}

        {/* Filter Indicator & Search Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-3 flex-1 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 shadow-xl backdrop-blur-md">
            <Search className="h-5 w-5 shrink-0 text-brand-pink" />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Search attendees by name, email or company..."
              className="w-full bg-transparent text-sm text-white placeholder:text-zinc-600 focus:outline-none font-medium"
            />
          </div>

          {activeFilter && (
            <div className="flex items-center gap-2 rounded-2xl border border-brand-pink/30 bg-brand-pink/10 px-4 py-2 text-xs font-bold text-brand-pink">
              <Filter className="h-4 w-4" />
              <span>Filtered by: {activeFilter}</span>
              <button onClick={() => setActiveFilter(undefined)} className="hover:text-white ml-2">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {errorMessage && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold">
            {errorMessage}
          </div>
        )}

        <div className="overflow-x-auto rounded-2xl border border-white/5">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-gradient-to-r from-brand-purple to-brand-pink text-white">
                <th className="px-6 py-4 font-black uppercase tracking-wider">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} className="h-4 w-4 rounded border-white/10 bg-white/5 text-brand-pink focus:ring-brand-pink" />
                </th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Full Name</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Contact Info</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Business & Position</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Gender</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Event Status</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Account</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Batch</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider text-center">Manage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {!loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-zinc-500 italic">
                    {total === 0 ? "No visitors registered yet." : "No results match your filter or search."}
                  </td>
                </tr>
              ) : (
                rows.map((visitor) => (
                  <tr key={visitor.id} className={`group hover:bg-white/[0.02] transition-colors ${selected.has(visitor.id) ? 'bg-white/[0.03]' : ''}`}>
                    <td className="px-4 py-5">
                      <input type="checkbox" checked={selected.has(visitor.id)} onChange={() => toggleOne(visitor.id)} className="h-4 w-4 rounded border-white/10 bg-white/5 text-brand-pink focus:ring-brand-pink" />
                    </td>
                    <td className="px-4 py-5 font-bold text-zinc-200">
                      <div>{visitor.fullName}</div>
                      {visitor.awardGuest && (
                        <span className="inline-block mt-1 text-[9px] font-black uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                          Award Guest
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-5">
                      <div className="text-[11px] font-medium text-zinc-300">{visitor.email}</div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">Mob: {visitor.phone || "—"}</div>
                      {visitor.workphone && <div className="text-[10px] text-zinc-500">Work: {visitor.workphone}</div>}
                    </td>
                    <td className="px-4 py-5">
                      <div className="font-bold text-zinc-300">{visitor.business || "—"}</div>
                      {visitor.position && <div className="text-[10px] text-zinc-500">{visitor.position}</div>}
                    </td>
                    <td className="px-4 py-5 text-zinc-400 text-xs">{visitor.gender || "—"}</td>
                    <td className="px-4 py-5">
                      <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest shadow-lg ${STATUS_BADGE[visitor.status] || "bg-white/5 text-zinc-500 border border-white/10"}`}>
                        {visitor.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500">{visitor.joiningStatus || "—"}</td>
                    <td className="px-4 py-5 text-xs text-zinc-400 font-mono">{visitor.batchNumber || (visitor.importBatchNumber ? `#${visitor.importBatchNumber}` : "—")}</td>
                    <td className="px-4 py-5">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setModalVisitor(visitor)}
                          className="h-8 w-8 inline-flex items-center justify-center rounded-lg bg-white/5 text-zinc-400 hover:bg-brand-purple hover:text-white transition-all shadow-xl cursor-pointer"
                          title="Edit Visitor Details"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          disabled={pendingId === visitor.id}
                          onClick={() => remove(visitor.id)}
                          className="h-8 w-8 inline-flex items-center justify-center rounded-lg bg-white/5 text-zinc-400 hover:bg-red-500 hover:text-white transition-all shadow-xl disabled:opacity-20 cursor-pointer"
                          title="Delete Visitor"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-white/5">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
            Showing {rangeStart} to {rangeEnd} of {total} records
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1 || loading}
              onClick={() => fetchPage(page - 1, searchTerm, activeFilter)}
              className="h-10 w-10 flex items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-20 cursor-pointer"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              {pages.map((p, i) =>
                p === "…" ? (
                  <span key={`ellipsis-${i}`} className="text-zinc-600 px-2 font-bold">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => fetchPage(p, searchTerm, activeFilter)}
                    disabled={loading}
                    className={`h-10 min-w-[2.5rem] rounded-full px-3 text-xs font-black transition-all cursor-pointer ${
                      p === page ? "bg-brand-pink text-white shadow-xl shadow-brand-pink/20" : "text-zinc-500 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
            </div>
            <button
              disabled={page >= totalPages || loading}
              onClick={() => fetchPage(page + 1, searchTerm, activeFilter)}
              className="h-10 w-10 flex items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-20 cursor-pointer"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {modalVisitor && (
        <VisitorFormModal
          defaultValues={
            modalVisitor === "new"
              ? undefined
              : {
                  id: modalVisitor.id,
                  first_name: modalVisitor.firstName,
                  last_name: modalVisitor.lastName,
                  email: modalVisitor.email,
                  phone: modalVisitor.phone ?? "",
                  workphone: modalVisitor.workphone ?? "",
                  gender: modalVisitor.gender ?? "",
                  business: modalVisitor.business ?? "",
                  position: modalVisitor.position ?? "",
                  linkedin_user_profile: modalVisitor.linkedinUserProfile ?? "",
                  referral_code: modalVisitor.referralCode ?? "",
                  referral_mstr_id: modalVisitor.referralMstrId ?? "",
                  visitor_referrer_from: modalVisitor.visitorReferrerFrom ?? "",
                  visitor_why_exhibit: modalVisitor.visitorWhyExhibit ?? "",
                  visitor_is_webinars: modalVisitor.visitorIsWebinars,
                  visitor_is_workshops: modalVisitor.visitorIsWorkshops,
                  visitor_is_e_magazine: modalVisitor.visitorIsEMagazine,
                  visitor_is_newsletter: modalVisitor.visitorIsNewsletter,
                  excluded_from_advertise: modalVisitor.excludedFromAdvertise,
                  award_guest: modalVisitor.awardGuest,
                  allergy_from_nuts: modalVisitor.allergyFromNuts,
                  allergey_from_shell_fish: modalVisitor.allergeyFromShellFish,
                  allergey_from_dairy_products: modalVisitor.allergeyFromDairyProducts,
                  vegetarian: modalVisitor.vegetarian,
                  vegan: modalVisitor.vegan,
                  dietary_requirement: modalVisitor.dietaryRequirement ?? "",
                  any_other_food_allergy: modalVisitor.anyOtherFoodAllergy ?? "",
                  batch_number: modalVisitor.batchNumber ?? "",
                  source: modalVisitor.source ?? "",
                  status: (modalVisitor.status as (typeof VISITOR_STATUSES)[number]) ?? "Pending",
                }
          }
          onClose={() => setModalVisitor(null)}
          onSaved={handleSaved}
        />
      )}
      {importOpen && (
        <ImportVisitorsModal
          onClose={() => setImportOpen(false)}
          onImported={() => {
            fetchPage(page, searchTerm, activeFilter);
            refreshStats();
          }}
        />
      )}

    </div>
  );
}
