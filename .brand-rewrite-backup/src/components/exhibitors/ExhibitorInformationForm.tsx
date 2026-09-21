"use client";

import React, { useState } from "react";
import axios, { isAxiosError } from "axios";
import { Store, User, Globe, Video, FileText, CheckCircle2, AlertCircle, Sparkles, Upload } from "lucide-react";
import { staticAssetUrl } from "@/lib/assets";

const INPUT_CLASS =
  "w-full rounded-xl border border-white/15 bg-slate-900/90 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-fuchsia-500 focus:outline-none focus:ring-1 focus:ring-fuchsia-500 transition-all";

const LABEL_CLASS = "mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-300";

const EXHIBITION_ZONES = [
  { id: "2733", name: "Business Growth Zone 1" },
  { id: "2739", name: "Marketing Zone 1" },
  { id: "2740", name: "Marketing Zone 2" },
  { id: "2741", name: "Web and Technology Zone 1" },
  { id: "2742", name: "Business Services Zone 1" },
  { id: "2743", name: "Business Services Zone 2" },
  { id: "2744", name: "Business Services Zone 3" },
  { id: "2745", name: "Business Services Zone 4" },
  { id: "2746", name: "Business Services Zone 5" },
  { id: "2747", name: "Business Services Zone 6" },
  { id: "2748", name: "Business Support Zone 1" },
  { id: "2749", name: "Business Support Zone 2" },
  { id: "2750", name: "Finance & Accounting Zone 1" },
  { id: "2751", name: "Business Support Zone 3" },
  { id: "2752", name: "Franchisee Zone 1" },
  { id: "2753", name: "Retail Product Zone 1" },
  { id: "2756", name: "Micro Business - Zone 1" },
];

const STAND_OPTIONS = [
  { id: "2808", img: staticAssetUrl("https://digitalageexpo.com/files/lobby/child/event_327.jpg"), title: "Standard Booth A" },
  { id: "2757", img: staticAssetUrl("https://digitalageexpo.com/files/lobby/child/event_1495.png"), title: "Premium Booth B" },
  { id: "2735", img: staticAssetUrl("https://digitalageexpo.com/files/lobby/child/event_1473.png"), title: "Corner Showcase C" },
  { id: "2758", img: staticAssetUrl("https://digitalageexpo.com/files/lobby/child/event_1496.png"), title: "Executive Suite D" },
  { id: "2759", img: staticAssetUrl("https://digitalageexpo.com/files/lobby/child/event_1497.png"), title: "Virtual Kiosk E" },
  { id: "2760", img: staticAssetUrl("https://digitalageexpo.com/files/lobby/child/event_1498.png"), title: "Platinum Pavilion F" },
  { id: "2812", img: staticAssetUrl("https://digitalageexpo.com/files/lobby/child/event_708.png"), title: "Innovation Stand G" },
];

export function ExhibitorInformationForm() {
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedStand, setSelectedStand] = useState<string>("");
  const [graphicsServices, setGraphicsServices] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("idle");
    setErrorMessage(null);
    setIsSubmitting(true);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    try {
      await axios.post("/api/exhibitor-information", {
        ...data,
        package_id: selectedStand,
        graphics_services: graphicsServices,
      });
      setStatus("success");
      form.reset();
      setSelectedStand("");
    } catch (err: unknown) {
      setStatus("error");
      if (isAxiosError(err) && err.response?.data?.error) {
        setErrorMessage(
          typeof err.response.data.error === "string"
            ? err.response.data.error
            : "Submission failed. Please check required fields."
        );
      } else {
        setErrorMessage("Something went wrong. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-3xl border border-emerald-500/30 bg-emerald-950/40 p-8 sm:p-12 text-center text-emerald-200 backdrop-blur-md space-y-6">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h3 className="text-2xl font-black uppercase text-white">
          Exhibitor Information Submitted Successfully!
        </h3>
        <p className="text-sm sm:text-base max-w-lg mx-auto font-medium text-emerald-300">
          Thank you for providing your exhibitor details and booth assets for Digital Age Expo 2026. Our operations team will verify your setup.
        </p>
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setStatus("idle")}
            className="rounded-full border border-white/20 bg-slate-800/80 px-6 py-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-slate-700 transition"
          >
            Submit Another Update
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border border-fuchsia-500/30 bg-slate-900/95 p-6 sm:p-12 shadow-2xl backdrop-blur-md space-y-10 text-white"
    >
      <div className="border-b border-white/10 pb-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-fuchsia-500/20 px-3 py-1 text-xs font-bold uppercase tracking-widest text-fuchsia-300 mb-2">
          <Store className="w-3.5 h-3.5" />
          <span>Exhibitor Portal</span>
        </div>
        <h2 className="text-2xl sm:text-4xl font-black uppercase text-white tracking-tight">
          Exhibitor Information
        </h2>
        <p className="mt-1 text-sm text-fuchsia-300 font-semibold">
          Digital Age Expo 2026
        </p>
      </div>

      {/* Business & Personal Details */}
      <div className="space-y-6">
        <h3 className="text-sm font-black uppercase tracking-wider text-fuchsia-400 flex items-center gap-2">
          <User className="w-4 h-4" /> Company &amp; Contact Details
        </h3>

        <div>
          <label className={LABEL_CLASS}>Business Name*</label>
          <input name="business" required className={INPUT_CLASS} placeholder="e.g. Apex Global Solutions" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className={LABEL_CLASS}>First Name*</label>
            <input name="first_name" required className={INPUT_CLASS} placeholder="e.g. Sarah" />
          </div>
          <div>
            <label className={LABEL_CLASS}>Last Name*</label>
            <input name="last_name" required className={INPUT_CLASS} placeholder="e.g. Jenkins" />
          </div>
          <div>
            <label className={LABEL_CLASS}>Email*</label>
            <input name="email" type="email" required className={INPUT_CLASS} placeholder="sarah@company.com" />
          </div>
          <div>
            <label className={LABEL_CLASS}>Mobile Phone*</label>
            <input name="phone" required className={INPUT_CLASS} placeholder="e.g. +44 20 7946 0912" />
          </div>
        </div>

        <div>
          <label className={LABEL_CLASS}>About Us</label>
          <textarea
            name="about_us"
            rows={4}
            className={`${INPUT_CLASS} resize-none`}
            placeholder="Describe your company, products, and services for event attendees..."
          />
        </div>
      </div>

      {/* Social & Meeting Links */}
      <div className="space-y-6 pt-4 border-t border-white/10">
        <h3 className="text-sm font-black uppercase tracking-wider text-fuchsia-400 flex items-center gap-2">
          <Globe className="w-4 h-4" /> Social Channels &amp; Links
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className={LABEL_CLASS}>Website URL</label>
            <input name="website" className={INPUT_CLASS} placeholder="https://company.com" />
          </div>
          <div>
            <label className={LABEL_CLASS}>LinkedIn URL</label>
            <input name="linkedin" className={INPUT_CLASS} placeholder="https://linkedin.com/company/..." />
          </div>
          <div>
            <label className={LABEL_CLASS}>Facebook Link</label>
            <input name="facebook" className={INPUT_CLASS} placeholder="https://facebook.com/..." />
          </div>
          <div>
            <label className={LABEL_CLASS}>Instagram Handle / URL</label>
            <input name="instagram" className={INPUT_CLASS} placeholder="https://instagram.com/..." />
          </div>
          <div>
            <label className={LABEL_CLASS}>Twitter URL</label>
            <input name="twitter" className={INPUT_CLASS} placeholder="https://twitter.com/..." />
          </div>
          <div>
            <label className={LABEL_CLASS}>WhatsApp Number</label>
            <input name="whatsapp" className={INPUT_CLASS} placeholder="+44 7700 900000" />
          </div>
        </div>
      </div>

      {/* Interactive Meeting & Video Links */}
      <div className="space-y-6 pt-4 border-t border-white/10">
        <h3 className="text-sm font-black uppercase tracking-wider text-fuchsia-400 flex items-center gap-2">
          <Video className="w-4 h-4" /> Virtual Booth Integration URLs
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div>
            <label className={LABEL_CLASS}>Calendly URL for Meetings</label>
            <input name="calendy_url" className={INPUT_CLASS} placeholder="https://calendly.com/..." />
          </div>
          <div>
            <label className={LABEL_CLASS}>Zoom Meeting URL</label>
            <input name="zoom_meeting" className={INPUT_CLASS} placeholder="https://zoom.us/j/..." />
          </div>
          <div>
            <label className={LABEL_CLASS}>YouTube or Promo Video URL</label>
            <input name="youtube_url" className={INPUT_CLASS} placeholder="https://youtube.com/watch?v=..." />
          </div>
        </div>
      </div>

      {/* Exhibition Zone */}
      <div className="space-y-4 pt-4 border-t border-white/10">
        <h3 className="text-sm font-black uppercase tracking-wider text-fuchsia-400">
          Exhibition Zone*
        </h3>
        <div>
          <label className={LABEL_CLASS}>Select Exhibition Zone</label>
          <select name="exhibition_zone_id" required className={INPUT_CLASS}>
            <option value="" className="bg-slate-900 text-slate-400">
              Select Exhibition Zone
            </option>
            {EXHIBITION_ZONES.map((zone) => (
              <option key={zone.id} value={zone.id} className="bg-slate-900 text-white">
                {zone.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Choose Stand Size */}
      <div className="space-y-4 pt-4 border-t border-white/10">
        <h3 className="text-sm font-black uppercase tracking-wider text-fuchsia-400">
          Choose Your Stand Size*
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {STAND_OPTIONS.map((stand) => (
            <div
              key={stand.id}
              onClick={() => setSelectedStand(stand.id)}
              className={`cursor-pointer rounded-2xl border p-3 transition-all ${
                selectedStand === stand.id
                  ? "border-fuchsia-500 bg-fuchsia-500/10 ring-2 ring-fuchsia-500"
                  : "border-white/10 bg-slate-950/80 hover:border-white/30"
              }`}
            >
              <img
                src={stand.img}
                alt={stand.title}
                className="w-full h-32 object-cover rounded-xl border border-white/10 mb-2"
                referrerPolicy="no-referrer"
              />
              <div className="text-center text-xs font-bold uppercase tracking-wide text-white">
                {stand.title}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Asset Uploads & Graphic Design Service */}
      <div className="space-y-6 pt-4 border-t border-white/10">
        <h3 className="text-sm font-black uppercase tracking-wider text-fuchsia-400 flex items-center gap-2">
          <Upload className="w-4 h-4" /> Booth Assets &amp; Graphic Design
        </h3>

        <div className="space-y-4">
          <div>
            <label className={LABEL_CLASS}>High Resolution Company Logo (500 x 500 px, JPG/PNG)*</label>
            <input type="file" accept=".jpg,.jpeg,.png" className={`${INPUT_CLASS} file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-fuchsia-500/20 file:text-fuchsia-300 hover:file:bg-fuchsia-500/30 cursor-pointer`} />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <input
              type="checkbox"
              id="graphics_services"
              checked={graphicsServices}
              onChange={(e) => setGraphicsServices(e.target.checked)}
              className="w-4 h-4 rounded accent-fuchsia-500 cursor-pointer"
            />
            <label htmlFor="graphics_services" className="text-xs font-bold uppercase tracking-wider text-slate-200 cursor-pointer">
              Would you like to use our graphic designing service to create required images for £5 per artwork?
            </label>
          </div>

          {!graphicsServices && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className={LABEL_CLASS}>Stand Header Image (253px x 152px)</label>
                <input type="file" accept=".jpg,.jpeg,.png" className={`${INPUT_CLASS} file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-slate-800 file:text-slate-300`} />
              </div>
              <div>
                <label className={LABEL_CLASS}>Left Main Banner Image</label>
                <input type="file" accept=".jpg,.jpeg,.png" className={`${INPUT_CLASS} file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-slate-800 file:text-slate-300`} />
              </div>
              <div>
                <label className={LABEL_CLASS}>Right Main Banner Image</label>
                <input type="file" accept=".jpg,.jpeg,.png" className={`${INPUT_CLASS} file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-slate-800 file:text-slate-300`} />
              </div>
              <div>
                <label className={LABEL_CLASS}>Desk Image</label>
                <input type="file" accept=".jpg,.jpeg,.png" className={`${INPUT_CLASS} file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-slate-800 file:text-slate-300`} />
              </div>
              <div>
                <label className={LABEL_CLASS}>Laptop Stand Image</label>
                <input type="file" accept=".jpg,.jpeg,.png" className={`${INPUT_CLASS} file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-slate-800 file:text-slate-300`} />
              </div>
              <div>
                <label className={LABEL_CLASS}>Brochures (PDFs)</label>
                <input type="file" accept=".pdf" multiple className={`${INPUT_CLASS} file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-slate-800 file:text-slate-300`} />
              </div>
            </div>
          )}
        </div>
      </div>

      {status === "error" && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-500/20 border border-rose-500/30 p-4 text-xs font-semibold text-rose-200">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
          <span>{errorMessage || "Something went wrong. Please verify your inputs."}</span>
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
            {isSubmitting ? "Submitting Exhibitor Information..." : "Submit Exhibitor Information"}
          </span>
        </button>
      </div>
    </form>
  );
}
