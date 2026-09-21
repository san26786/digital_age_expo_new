"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios, { isAxiosError } from "axios";
import { CheckCircle2, AlertCircle, Building2, User, Mail, Globe, Sparkles } from "lucide-react";
import {
  exhibitorRegistrationSchema,
  type ExhibitorRegistrationInput,
} from "@/lib/validations/exhibitorRegistration";

const INPUT_CLASS =
  "w-full rounded-xl border border-white/15 bg-slate-900/90 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-fuchsia-500 focus:outline-none focus:ring-1 focus:ring-fuchsia-500 transition-all";

const LABEL_CLASS = "mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-300";

const ZONE_OPTIONS = [
  "Select Exhibition Zone",
  "Business Growth Zone 1",
  "Marketing Zone 1",
  "Marketing Zone 2",
  "Web and Technology Zone 1",
  "Business Services Zone 1",
  "Business Services Zone 2",
  "Business Services Zone 3",
  "Business Services Zone 4",
  "Business Services Zone 5",
  "Business Services Zone 6",
  "Business Support Zone 1",
  "Business Support Zone 2",
  "Finance & Accounting Zone 1",
  "Business Support Zone 3",
  "Franchisee Zone 1",
  "Retail Product Zone 1",
  "Micro Business - Zone 1",
  "Micro Business - Zone 2",
  "Micro Business - Zone 3",
  "Micro Business - Zone 4",
  "Micro Business - Zone 5",
  "Micro Business - Zone 6",
  "Micro Business - Zone 7",
  "Micro Business - Zone 8",
  "Micro Business - Zone 9",
  "Micro Business - Zone 10",
  "Micro Business - Zone 11",
  "Micro Business - Zone 12",
  "Franchisee Zone 2",
  "Charity & CIC Zone 1",
];

const REFERRAL_OPTIONS = [
  { value: "FRGSE", label: "Google or Search Engine" },
  { value: "FRFB", label: "Facebook" },
  { value: "FRYT", label: "Youtube" },
  { value: "FRTW", label: "Twitter" },
  { value: "FRIG", label: "Instagram" },
  { value: "FROSM", label: "Other social media" },
  { value: "FREM", label: "Email" },
  { value: "FRRD", label: "Radio" },
  { value: "FRTV", label: "TV" },
  { value: "FRNS", label: "Newspaper" },
  { value: "FRWOM", label: "Word of mouth" },
  { value: "FROT", label: "Other" },
];

export function ExhibitorRegistrationForm() {
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ExhibitorRegistrationInput>({
    resolver: zodResolver(exhibitorRegistrationSchema),
    defaultValues: {
      confirm_consent: false,
      keynote_interest: "no",
      is_webinars: false,
      is_workshops: false,
      is_business_presentation: false,
      is_e_magazine: false,
      is_newsletter: false,
    },
  });

  async function onSubmit(data: ExhibitorRegistrationInput) {
    try {
      setStatus("idle");
      setErrorMessage(null);
      await axios.post("/api/exhibitor-registration", data);
      setStatus("success");
      reset();
    } catch (err) {
      setStatus("error");
      if (isAxiosError(err) && err.response?.status === 409) {
        setErrorMessage("You have already applied for this event with this email.");
      } else {
        setErrorMessage("Something went wrong with your registration. Please try again.");
      }
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-3xl border border-emerald-500/30 bg-emerald-950/40 p-8 sm:p-12 text-center text-emerald-200 backdrop-blur-md space-y-4">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h3 className="text-2xl font-black uppercase text-white">
          Application Submitted Successfully!
        </h3>
        <p className="text-sm sm:text-base max-w-lg mx-auto font-medium text-emerald-300">
          Thank you for registering your interest in exhibiting at Digital Age Expo 2026. Our exhibitor relations team will contact you shortly to finalize your stand placement and package details.
        </p>
        <div className="pt-4">
          <button
            type="button"
            onClick={() => setStatus("idle")}
            className="rounded-full bg-emerald-600 px-8 py-3 text-sm font-bold uppercase tracking-wider text-white shadow-lg transition hover:bg-emerald-500"
          >
            Submit Another Application
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="rounded-3xl border border-fuchsia-500/30 bg-slate-900/95 p-6 sm:p-10 shadow-2xl backdrop-blur-md space-y-10"
    >
      {/* Form Header */}
      <div className="border-b border-white/10 pb-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-fuchsia-500/20 px-3 py-1 text-xs font-bold uppercase tracking-widest text-fuchsia-300 mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Exhibitor Portal</span>
        </div>
        <h2 className="text-2xl sm:text-4xl font-black uppercase text-white tracking-tight">
          Exhibitor Registration
        </h2>
        <p className="mt-1 text-sm text-fuchsia-300 font-semibold">
          Digital Age Expo 2026
        </p>
      </div>

      {/* Section 1: Personal Details */}
      <div className="space-y-6">
        <h3 className="text-sm font-black uppercase tracking-wider text-fuchsia-400 flex items-center gap-2">
          <User className="w-4 h-4" /> Personal &amp; Business Details
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className={LABEL_CLASS}>First Name*</label>
            <input
              {...register("first_name")}
              className={INPUT_CLASS}
              placeholder="e.g. John"
            />
            {errors.first_name && (
              <p className="mt-1 text-xs text-rose-400 font-medium">{errors.first_name.message}</p>
            )}
          </div>

          <div>
            <label className={LABEL_CLASS}>Last Name*</label>
            <input
              {...register("last_name")}
              className={INPUT_CLASS}
              placeholder="e.g. Smith"
            />
            {errors.last_name && (
              <p className="mt-1 text-xs text-rose-400 font-medium">{errors.last_name.message}</p>
            )}
          </div>

          <div>
            <label className={LABEL_CLASS}>Position / Job Title*</label>
            <input
              {...register("position")}
              className={INPUT_CLASS}
              placeholder="e.g. Managing Director"
            />
            {errors.position && (
              <p className="mt-1 text-xs text-rose-400 font-medium">{errors.position.message}</p>
            )}
          </div>

          <div>
            <label className={LABEL_CLASS}>Business Name*</label>
            <input
              {...register("business")}
              className={INPUT_CLASS}
              placeholder="e.g. TechCorp Solutions Ltd"
            />
            {errors.business && (
              <p className="mt-1 text-xs text-rose-400 font-medium">{errors.business.message}</p>
            )}
          </div>

          <div>
            <label className={LABEL_CLASS}>Mobile Phone*</label>
            <input
              {...register("phone")}
              className={INPUT_CLASS}
              placeholder="e.g. +44 7700 900123"
            />
            {errors.phone && (
              <p className="mt-1 text-xs text-rose-400 font-medium">{errors.phone.message}</p>
            )}
          </div>

          <div>
            <label className={LABEL_CLASS}>Work Phone</label>
            <input
              {...register("work_phone")}
              className={INPUT_CLASS}
              placeholder="e.g. 02380 970305"
            />
          </div>
        </div>
      </div>

      {/* Section 2: Contact & Social */}
      <div className="space-y-6 pt-4 border-t border-white/10">
        <h3 className="text-sm font-black uppercase tracking-wider text-fuchsia-400 flex items-center gap-2">
          <Mail className="w-4 h-4" /> Email &amp; Online Profile
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className={LABEL_CLASS}>Email Address*</label>
            <input
              {...register("email")}
              type="email"
              className={INPUT_CLASS}
              placeholder="john@company.com"
            />
            {errors.email && (
              <p className="mt-1 text-xs text-rose-400 font-medium">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className={LABEL_CLASS}>LinkedIn Profile Link</label>
            <input
              {...register("linkedin_user_profile")}
              className={INPUT_CLASS}
              placeholder="https://linkedin.com/in/yourprofile"
            />
          </div>
        </div>
      </div>

      {/* Section 3: Exhibition Stand Zone */}
      <div className="space-y-6 pt-4 border-t border-white/10">
        <h3 className="text-sm font-black uppercase tracking-wider text-fuchsia-400 flex items-center gap-2">
          <Building2 className="w-4 h-4" /> Exhibition Zone Selection
        </h3>

        <div>
          <label className={LABEL_CLASS}>Preferred Exhibition Zone*</label>
          <select {...register("exhibition_zone")} className={INPUT_CLASS}>
            {ZONE_OPTIONS.map((zone, i) => (
              <option key={i} value={zone} className="bg-slate-900 text-white">
                {zone}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Section 4: Referral & Referral Code */}
      <div className="space-y-6 pt-4 border-t border-white/10">
        <h3 className="text-sm font-black uppercase tracking-wider text-fuchsia-400 flex items-center gap-2">
          <Globe className="w-4 h-4" /> How Did You Hear About Us?
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className={LABEL_CLASS}>Referral Source</label>
            <select {...register("referral_source")} className={INPUT_CLASS}>
              {REFERRAL_OPTIONS.map((ref) => (
                <option key={ref.value} value={ref.value} className="bg-slate-900 text-white">
                  {ref.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={LABEL_CLASS}>Partner Referral Code (If any)</label>
            <input
              {...register("referral_code")}
              className={INPUT_CLASS}
              placeholder="e.g. DAE-2026-VIP"
            />
          </div>
        </div>
      </div>

      {/* Section 5: Keynote Speech Interest */}
      <div className="space-y-4 pt-4 border-t border-white/10">
        <h3 className="text-sm font-black uppercase tracking-wider text-fuchsia-400">
          Keynote Speech &amp; Sponsorship Opportunities
        </h3>
        <p className="text-xs text-slate-300 font-medium">
          Would you be interested in keynote speech or sponsorship opportunities at the show?
        </p>

        <div className="flex items-center gap-6 pt-1">
          {["yes", "no", "maybe"].map((opt) => (
            <label key={opt} className="flex items-center gap-2 cursor-pointer text-sm font-bold uppercase text-white">
              <input
                type="radio"
                value={opt}
                {...register("keynote_interest")}
                className="h-4 w-4 accent-fuchsia-500"
              />
              <span>{opt}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Section 6: Digital Offerings Checkboxes */}
      <div className="space-y-4 pt-4 border-t border-white/10">
        <h3 className="text-sm font-black uppercase tracking-wider text-fuchsia-400">
          Free Digital Offerings
        </h3>
        <p className="text-xs text-slate-300 font-medium">
          Please check any of the following free digital marketing products you are interested in:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {[
            { id: "is_webinars", label: "Webinars & Seminars" },
            { id: "is_workshops", label: "Workshops" },
            { id: "is_business_presentation", label: "Business Presentation" },
            { id: "is_e_magazine", label: "E-magazine Feature" },
            { id: "is_newsletter", label: "Newsletter Feature" },
          ].map((item) => (
            <label key={item.id} className="flex items-center gap-3 cursor-pointer text-xs font-semibold text-slate-200 hover:text-white">
              <input
                type="checkbox"
                {...register(item.id as keyof ExhibitorRegistrationInput)}
                className="h-4 w-4 rounded accent-fuchsia-500"
              />
              <span>{item.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Section 7: Terms Consent & Submit */}
      <div className="space-y-6 pt-4 border-t border-white/10">
        <p className="text-xs text-slate-400 leading-relaxed font-medium">
          By clicking on Register button you submit the registration form for your interest in exhibiting at Digital Age Expo and consent to the event organisers sending you emails regarding this event.
        </p>

        <div>
          <label className="flex items-start gap-3 cursor-pointer text-xs font-bold text-white">
            <input
              type="checkbox"
              {...register("confirm_consent")}
              className="mt-0.5 h-4 w-4 rounded accent-fuchsia-500 shrink-0"
            />
            <span>
              Please tick here to indicate you have read and understood this consent requirement*
            </span>
          </label>
          {errors.confirm_consent && (
            <p className="mt-1 text-xs text-rose-400 font-medium">{errors.confirm_consent.message}</p>
          )}
        </div>

        {status === "error" && (
          <div className="flex items-center gap-2 rounded-xl bg-rose-500/20 border border-rose-500/30 p-4 text-xs font-semibold text-rose-200">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-brand-gradient w-full rounded-full py-4 text-sm font-extrabold uppercase tracking-wider text-white shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-95 disabled:opacity-50"
          >
            {isSubmitting
              ? "Processing Application..."
              : "Request to Become an Exhibitor and Buy Stand"}
          </button>
        </div>
      </div>
    </form>
  );
}

