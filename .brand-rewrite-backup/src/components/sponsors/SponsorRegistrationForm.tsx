"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios, { isAxiosError } from "axios";
import { CheckCircle2, AlertCircle, User, Mail, Globe, Award, Sparkles } from "lucide-react";
import {
  sponsorRegistrationSchema,
  type SponsorRegistrationInput,
} from "@/lib/validations/sponsorRegistration";

const INPUT_CLASS =
  "w-full rounded-xl border border-white/15 bg-slate-900/90 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-fuchsia-500 focus:outline-none focus:ring-1 focus:ring-fuchsia-500 transition-all";

const LABEL_CLASS = "mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-300";

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

export interface SponsorshipTierOption {
  id: number;
  title: string;
  price: number;
}

interface Props {
  tiers: SponsorshipTierOption[];
  defaultTierId?: string;
}

export function SponsorRegistrationForm({ tiers, defaultTierId }: Props) {
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SponsorRegistrationInput>({
    resolver: zodResolver(sponsorRegistrationSchema),
    defaultValues: {
      sponsorship_tier_id: defaultTierId ?? "",
      why_exhibit: "yes",
      confirm_consent: false,
      is_webinars: false,
      is_workshops: false,
      is_e_magazine: false,
      is_newsletter: false,
      is_business_presentation: false,
    },
  });

  async function onSubmit(data: SponsorRegistrationInput) {
    try {
      setStatus("idle");
      setErrorMessage(null);
      await axios.post("/api/sponsor-registration", data);
      setStatus("success");
      reset();
    } catch (err: unknown) {
      setStatus("error");
      if (isAxiosError(err) && err.response?.data?.error) {
        setErrorMessage(
          typeof err.response.data.error === "string"
            ? err.response.data.error
            : "Registration failed. Please check your inputs."
        );
      } else {
        setErrorMessage("Something went wrong with your registration. Please try again.");
      }
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-3xl border border-emerald-500/30 bg-emerald-950/40 p-8 sm:p-12 text-center text-emerald-200 backdrop-blur-md space-y-6">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h3 className="text-2xl font-black uppercase text-white">
          Sponsor Registration Submitted!
        </h3>
        <p className="text-sm sm:text-base max-w-lg mx-auto font-medium text-emerald-300">
          Thank you for registering your interest to sponsor Digital Age Expo 2026. Our partnership team will review your application and get in touch shortly.
        </p>
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setStatus("idle")}
            className="rounded-full border border-white/20 bg-slate-800/80 px-6 py-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-slate-700 transition"
          >
            Submit Another Application
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      id="sponsor-form"
      onSubmit={handleSubmit(onSubmit)}
      className="rounded-3xl border border-fuchsia-500/30 bg-slate-900/95 p-6 sm:p-10 shadow-2xl backdrop-blur-md space-y-10"
    >
      <div className="border-b border-white/10 pb-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-fuchsia-500/20 px-3 py-1 text-xs font-bold uppercase tracking-widest text-fuchsia-300 mb-2">
          <Award className="w-3.5 h-3.5" />
          <span>Partnership &amp; Sponsorship</span>
        </div>
        <h2 className="text-2xl sm:text-4xl font-black uppercase text-white tracking-tight">
          Sponsor Registration
        </h2>
        <p className="mt-1 text-sm text-fuchsia-300 font-semibold">
          Digital Age Expo 2026
        </p>
      </div>

      {/* Personal Details */}
      <div className="space-y-6">
        <h3 className="text-sm font-black uppercase tracking-wider text-fuchsia-400 flex items-center gap-2">
          <User className="w-4 h-4" /> Personal Details
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className={LABEL_CLASS}>First Name*</label>
            <input {...register("first_name")} className={INPUT_CLASS} placeholder="e.g. Michael" />
            {errors.first_name && (
              <p className="mt-1 text-xs text-rose-400 font-medium">{errors.first_name.message}</p>
            )}
          </div>
          <div>
            <label className={LABEL_CLASS}>Last Name*</label>
            <input {...register("last_name")} className={INPUT_CLASS} placeholder="e.g. Smith" />
            {errors.last_name && (
              <p className="mt-1 text-xs text-rose-400 font-medium">{errors.last_name.message}</p>
            )}
          </div>
          <div>
            <label className={LABEL_CLASS}>Job Title*</label>
            <input {...register("position")} className={INPUT_CLASS} placeholder="e.g. Marketing Director" />
            {errors.position && (
              <p className="mt-1 text-xs text-rose-400 font-medium">{errors.position.message}</p>
            )}
          </div>
          <div>
            <label className={LABEL_CLASS}>Company Name*</label>
            <input {...register("business")} className={INPUT_CLASS} placeholder="e.g. Nexus Media" />
            {errors.business && (
              <p className="mt-1 text-xs text-rose-400 font-medium">{errors.business.message}</p>
            )}
          </div>
          <div>
            <label className={LABEL_CLASS}>Phone Number*</label>
            <input {...register("phone")} className={INPUT_CLASS} placeholder="e.g. +44 20 7946 0912" />
            {errors.phone && (
              <p className="mt-1 text-xs text-rose-400 font-medium">{errors.phone.message}</p>
            )}
          </div>
          <div>
            <label className={LABEL_CLASS}>Mobile Number</label>
            <input {...register("work_phone")} className={INPUT_CLASS} placeholder="e.g. +44 7700 900456" />
          </div>
        </div>
      </div>

      {/* Email & LinkedIn */}
      <div className="space-y-6 pt-4 border-t border-white/10">
        <h3 className="text-sm font-black uppercase tracking-wider text-fuchsia-400 flex items-center gap-2">
          <Mail className="w-4 h-4" /> Email Address &amp; Profile
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className={LABEL_CLASS}>Email Address*</label>
            <input {...register("email")} type="email" className={INPUT_CLASS} placeholder="michael@company.com" />
            {errors.email && (
              <p className="mt-1 text-xs text-rose-400 font-medium">{errors.email.message}</p>
            )}
          </div>
          <div>
            <label className={LABEL_CLASS}>LinkedIn Profile</label>
            <input {...register("linkedin_user_profile")} className={INPUT_CLASS} placeholder="https://linkedin.com/in/michaelsmith" />
          </div>
        </div>
      </div>

      {/* Referrer */}
      <div className="space-y-6 pt-4 border-t border-white/10">
        <h3 className="text-sm font-black uppercase tracking-wider text-fuchsia-400 flex items-center gap-2">
          <Globe className="w-4 h-4" /> Referrer
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className={LABEL_CLASS}>Where did you hear about the show?</label>
            <select {...register("referral_source")} className={INPUT_CLASS}>
              {REFERRAL_OPTIONS.map((ref) => (
                <option key={ref.value} value={ref.value} className="bg-slate-900 text-white">
                  {ref.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL_CLASS}>Referral Code (If any)</label>
            <input {...register("referral_code")} className={INPUT_CLASS} placeholder="e.g. DAE-PARTNER" />
          </div>
        </div>
      </div>

      {/* Exhibiting Interest & Sponsorship Package */}
      <div className="space-y-6 pt-4 border-t border-white/10">
        <h3 className="text-sm font-black uppercase tracking-wider text-fuchsia-400">
          Exhibiting &amp; Packages
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className={LABEL_CLASS}>Exhibiting or Keynote Speech Interest*</label>
            <input {...register("why_exhibit")} className={INPUT_CLASS} placeholder="e.g. Diamond Sponsor & Exhibition Booth" />
          </div>

          {tiers.length > 0 && (
            <div>
              <label className={LABEL_CLASS}>Sponsorship Package</label>
              <select {...register("sponsorship_tier_id")} className={INPUT_CLASS}>
                <option value="">Select a sponsorship tier</option>
                {tiers.map((tier) => (
                  <option key={tier.id} value={tier.id} className="bg-slate-900 text-white">
                    {tier.title} &mdash; £{tier.price.toLocaleString()}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Digital Offerings */}
      <div className="space-y-4 pt-4 border-t border-white/10">
        <h3 className="text-sm font-black uppercase tracking-wider text-fuchsia-400">
          Digital Offerings
        </h3>
        <p className="text-xs text-slate-300 font-medium">
          Please tick any of the following free digital products you are interested in:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {[
            { id: "is_webinars", label: "Webinars & Seminars" },
            { id: "is_workshops", label: "Workshops" },
            { id: "is_e_magazine", label: "E-magazine" },
            { id: "is_newsletter", label: "Newsletter" },
            { id: "is_business_presentation", label: "Business Presentation" },
          ].map((item) => (
            <label key={item.id} className="flex items-center gap-3 cursor-pointer text-xs font-semibold text-slate-200 hover:text-white">
              <input
                type="checkbox"
                {...register(item.id as keyof SponsorRegistrationInput)}
                className="h-4 w-4 rounded accent-fuchsia-500"
              />
              <span>{item.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Terms & Submit */}
      <div className="space-y-6 pt-4 border-t border-white/10">
        <p className="text-xs text-slate-400 leading-relaxed font-medium">
          By clicking on Register button you submit the registration form for your interest in exhibiting at the Digital Age Expo and you consent to the event organisers sending you emails regarding this event.
        </p>

        <div>
          <label className="flex items-start gap-3 cursor-pointer text-xs font-bold text-white">
            <input
              type="checkbox"
              {...register("confirm_consent")}
              className="mt-0.5 h-4 w-4 rounded accent-fuchsia-500 shrink-0"
            />
            <span>
              Please tick here to indicate you have read and understood this*
            </span>
          </label>
          {errors.confirm_consent && (
            <p className="mt-1 text-xs text-rose-400 font-medium">{errors.confirm_consent.message}</p>
          )}
        </div>

        {status === "error" && (
          <div className="flex items-center gap-2 rounded-xl bg-rose-500/20 border border-rose-500/30 p-4 text-xs font-semibold text-rose-200">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
            <span>{errorMessage || "Something went wrong. Please try again."}</span>
          </div>
        )}

        <div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-brand-gradient w-full rounded-full py-4 text-sm font-extrabold uppercase tracking-wider text-white shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>
              {isSubmitting ? "Processing Registration..." : "Register As Sponsor"}
            </span>
          </button>
        </div>
      </div>
    </form>
  );
}

