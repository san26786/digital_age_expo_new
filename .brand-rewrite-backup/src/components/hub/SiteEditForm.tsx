"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, Check, Loader2, Upload } from "lucide-react";
import type { SiteSettings } from "@/lib/services/hubSiteSettings";

/**
 * ===========================================================================
 *  EDITING A SITE'S LOOK AND DETAILS
 * ===========================================================================
 *
 *  One form over three storage shapes — find_domains columns, find_settings 'branding' rows and
 *  find_settings 'theme' rows. Which is which is hubSiteSettings.ts's problem; nothing here knows
 *  or should.
 *
 *  ---------------------------------------------------------------------------
 *  EMPTY MEANS "USE THE BUNDLED DEFAULT", AND THE FORM SAYS SO RATHER THAN IMPLYING IT
 *  ---------------------------------------------------------------------------
 *
 *  Every image slot and every colour falls back when unset: no logo saved means the shipped file,
 *  no colour saved means the stock palette. An empty input in a form normally reads as "this is
 *  blank on the site", which here would be wrong and would have someone uploading a logo the site
 *  was already showing. So each slot previews what the site ACTUALLY renders today — resolved
 *  server-side, defaults included — and labels it as inherited when nothing is saved.
 */

type Slot = "favicon" | "primary_logo" | "secondary_logo" | "mobile_logo" | "footer_logo" | "login_logo";

const LOGO_SLOTS: { slot: Slot; field: keyof SiteSettings; label: string; hint: string }[] = [
  {
    slot: "primary_logo",
    field: "primaryLogo",
    label: "Website logo",
    hint: "The header, on desktop. Wide marks work best.",
  },
  {
    slot: "footer_logo",
    field: "footerLogo",
    label: "Footer logo",
    hint: "Shown at the foot of every page.",
  },
  {
    slot: "mobile_logo",
    field: "mobileLogo",
    label: "Mobile logo",
    hint: "The narrow header and the mobile drawer. A square or stacked mark suits this.",
  },
  {
    slot: "secondary_logo",
    field: "secondaryLogo",
    label: "Secondary logo",
    hint: "Used where the primary would be too wide.",
  },
  {
    slot: "login_logo",
    field: "loginLogo",
    label: "Login logo",
    hint: "The sign-in screens.",
  },
];

const COLOURS: { field: keyof SiteSettings; label: string; hint: string; fallback: string }[] = [
  {
    field: "primaryColour",
    label: "Primary",
    hint: "Buttons, links, highlights and the accent on headings.",
    fallback: "#C71585",
  },
  {
    field: "secondaryColour",
    label: "Secondary",
    hint: "The deeper half of every gradient, and the page glow.",
    fallback: "#4B0082",
  },
  {
    field: "backgroundColour",
    label: "Background",
    hint: "The page behind everything. Dark values suit this design.",
    fallback: "#05030A",
  },
];

export function SiteEditForm({ site, isCurrent }: { site: SiteSettings; isCurrent: boolean }) {
  const router = useRouter();
  const [form, setForm] = useState<SiteSettings>(site);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState<Slot | null>(null);
  const [previews, setPreviews] = useState<Partial<Record<Slot, string>>>({});

  const set = <K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setSaved(false);
  };

  async function upload(slot: Slot, file: File) {
    setUploading(slot);
    setError(null);

    try {
      const body = new FormData();
      body.append("file", file);
      body.append("slot", slot);

      const response = await fetch(`/api/hub/sites/${site.id}/upload`, { method: "POST", body });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? `Upload failed (${response.status})`);

      // The stored value is the clean path; the preview carries the cache-buster so the browser
      // stops showing the image it had a moment ago for this same URL.
      const field = slot === "favicon" ? "favicon" : LOGO_SLOTS.find((entry) => entry.slot === slot)!.field;
      set(field as keyof SiteSettings, data.url as never);
      setPreviews((current) => ({ ...current, [slot]: data.preview }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The image could not be uploaded.");
    } finally {
      setUploading(null);
    }
  }

  async function save() {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/hub/sites/${site.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          brand: form.brand,
          email: form.email,
          phone: form.phone,
          address: form.address,
          favicon: form.favicon,
          facebook: form.facebook,
          instagram: form.instagram,
          youtube: form.youtube,
          twitter: form.twitter,
          linkedin: form.linkedin,
          primaryLogo: form.primaryLogo,
          secondaryLogo: form.secondaryLogo,
          mobileLogo: form.mobileLogo,
          footerLogo: form.footerLogo,
          loginLogo: form.loginLogo,
          primaryColour: form.primaryColour,
          secondaryColour: form.secondaryColour,
          backgroundColour: form.backgroundColour,
          active: form.active,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? `Save failed (${response.status})`);

      setSaved(true);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The changes could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  const field =
    "w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/30";
  const label = "mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-white/50";
  const section = "mt-6 rounded-3xl border border-white/10 bg-white/5 p-6";
  const heading = "mb-5 text-xs font-black uppercase tracking-[0.2em] text-brand-pink";

  const text = (key: keyof SiteSettings, title: string, placeholder = "") => (
    <div>
      <label className={label} htmlFor={`f-${String(key)}`}>
        {title}
      </label>
      <input
        id={`f-${String(key)}`}
        className={field}
        value={String(form[key] ?? "")}
        placeholder={placeholder}
        onChange={(event) => set(key, event.target.value as never)}
        autoComplete="off"
      />
    </div>
  );

  return (
    <div>
      <Link
        href="/hub/sites"
        className="mb-6 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white/50 transition hover:text-white"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All sites
      </Link>

      <h2 className="text-2xl font-bold text-white">{site.name || `Site #${site.id}`}</h2>
      <p className="mt-1 text-sm text-white/60">
        {site.link || "no host set"} · site #{site.id}
      </p>

      {isCurrent && (
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          <p className="text-xs leading-relaxed text-amber-100/90">
            <span className="font-bold">This is the site this deployment serves.</span> Anything
            saved here changes the live Digital Age Expo — its logos, its colours and its contact
            details — as soon as the cache clears, not just the Hub&apos;s view of it.
          </p>
        </div>
      )}

      {/* ------------------------------------------------------------------ IDENTITY */}
      <section className={section}>
        <h3 className={heading}>Identity</h3>
        <div className="grid gap-5 sm:grid-cols-2">
          {text("name", "Site name")}
          {text("brand", "Brand")}
        </div>

        <label className="mt-5 flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 accent-[#C71585]"
            checked={form.active}
            onChange={(event) => set("active", event.target.checked)}
          />
          <span>
            <span className="block text-sm font-bold text-white">Active</span>
            <span className="mt-0.5 block text-xs text-white/50">
              Inactive sites still exist and are still editable; this flag is what marks a site as
              ready. Host routing does not consult it yet, so on its own it makes nothing public.
            </span>
          </span>
        </label>
      </section>

      {/* ------------------------------------------------------------------ CONTACT */}
      <section className={section}>
        <h3 className={heading}>Contact</h3>
        <div className="grid gap-5 sm:grid-cols-2">
          {text("email", "Email", "hello@example.com")}
          {text("phone", "Phone", "01624 666105")}
        </div>
        <div className="mt-5">
          <label className={label} htmlFor="f-address">
            Address
          </label>
          <textarea
            id="f-address"
            className={`${field} min-h-[80px]`}
            value={form.address}
            onChange={(event) => set("address", event.target.value)}
          />
        </div>
      </section>

      {/* ------------------------------------------------------------------ SOCIAL */}
      <section className={section}>
        <h3 className={heading}>Social</h3>
        <div className="grid gap-5 sm:grid-cols-2">
          {text("facebook", "Facebook", "https://facebook.com/…")}
          {text("instagram", "Instagram", "https://instagram.com/…")}
          {text("linkedin", "LinkedIn", "https://linkedin.com/company/…")}
          {text("twitter", "X / Twitter", "https://x.com/…")}
          {text("youtube", "YouTube", "https://youtube.com/@…")}
        </div>
      </section>

      {/* ------------------------------------------------------------------ THEME */}
      <section className={section}>
        <h3 className={heading}>Theme colours</h3>

        <div className="grid gap-5 sm:grid-cols-3">
          {COLOURS.map((colour) => {
            const value = String(form[colour.field] ?? "");
            const effective = value || colour.fallback;

            return (
              <div key={String(colour.field)}>
                <label className={label}>{colour.label}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={effective}
                    onChange={(event) => set(colour.field, event.target.value as never)}
                    className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-white/15 bg-transparent p-1"
                    aria-label={`${colour.label} colour`}
                  />
                  <input
                    className={field}
                    value={value}
                    placeholder={colour.fallback}
                    onChange={(event) => set(colour.field, event.target.value as never)}
                    autoComplete="off"
                  />
                </div>
                <p className="mt-1.5 text-[11px] leading-relaxed text-white/40">
                  {colour.hint}
                  {!value && " Currently inherited from the stock palette."}
                </p>
              </div>
            );
          })}
        </div>

        {/*
          * A preview built from the same three variables the site is retinted with, so what is
          * shown here is the actual mechanism rather than an approximation of it.
          */}
        <div
          className="mt-6 overflow-hidden rounded-2xl border border-white/10 p-6"
          style={{ background: form.backgroundColour || COLOURS[2].fallback }}
        >
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Preview</p>
          <h4
            className="mt-2 text-xl font-black"
            style={{
              color: "#ffffff",
              textShadow: `0 0 28px ${form.primaryColour || COLOURS[0].fallback}55`,
            }}
          >
            {form.name || "Your site"}
          </h4>
          <div className="mt-4 flex flex-wrap gap-3">
            <span
              className="rounded-full px-5 py-2.5 text-xs font-black uppercase tracking-widest text-white"
              style={{
                backgroundImage: `linear-gradient(to right, ${
                  form.secondaryColour || COLOURS[1].fallback
                }, ${form.primaryColour || COLOURS[0].fallback})`,
              }}
            >
              Get free tickets
            </span>
            <span
              className="rounded-full border px-5 py-2.5 text-xs font-black uppercase tracking-widest"
              style={{
                borderColor: form.primaryColour || COLOURS[0].fallback,
                color: form.primaryColour || COLOURS[0].fallback,
              }}
            >
              Book your stand
            </span>
          </div>
        </div>

        <p className="mt-4 text-[11px] leading-relaxed text-white/40">
          These three are the ones the design system actually keys off. The CP&apos;s Theme page
          offers nine, but only these are read by anything — the other six were saved and never
          applied.
        </p>
      </section>

      {/* ------------------------------------------------------------------ IMAGES */}
      <section className={section}>
        <h3 className={heading}>Logos & favicon</h3>

        <div className="space-y-4">
          <ImageSlot
            slot="favicon"
            label="Favicon"
            hint="The browser-tab icon. A square .ico or .png."
            value={form.favicon}
            resolved={site.resolved.favicon}
            preview={previews.favicon}
            uploading={uploading === "favicon"}
            onUpload={upload}
            onClear={() => set("favicon", "")}
          />

          {LOGO_SLOTS.map((entry) => (
            <ImageSlot
              key={entry.slot}
              slot={entry.slot}
              label={entry.label}
              hint={entry.hint}
              value={String(form[entry.field] ?? "")}
              resolved={
                entry.field === "primaryLogo"
                  ? site.resolved.primaryLogo
                  : entry.field === "footerLogo"
                    ? site.resolved.footerLogo
                    : entry.field === "mobileLogo"
                      ? site.resolved.mobileLogo
                      : ""
              }
              preview={previews[entry.slot]}
              uploading={uploading === entry.slot}
              onUpload={upload}
              onClear={() => set(entry.field, "" as never)}
            />
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------------ SAVE */}
      <section className={section}>
        {error && (
          <p className="mb-4 flex items-start gap-2 text-xs text-amber-200">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-purple to-brand-pink px-7 py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? "Saving…" : "Save changes"}
          </button>

          {saved && (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-300">
              <Check className="h-4 w-4" />
              Saved
            </span>
          )}
        </div>

        <p className="mt-3 max-w-xl text-[11px] leading-relaxed text-white/40">
          The host is not editable here. It is what a request is matched against, so changing it
          renames the site&apos;s front door — that needs a uniqueness check and a decision about
          the old hostname, not a text box among the phone numbers.
        </p>
      </section>
    </div>
  );
}

/** One image slot: what the site shows now, what is saved, and a way to replace it. */
function ImageSlot({
  slot,
  label,
  hint,
  value,
  resolved,
  preview,
  uploading,
  onUpload,
  onClear,
}: {
  slot: Slot;
  label: string;
  hint: string;
  value: string;
  resolved: string;
  preview?: string;
  uploading: boolean;
  onUpload: (slot: Slot, file: File) => void;
  onClear: () => void;
}) {
  const shown = preview || value || resolved;
  const inherited = !value;

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      {/*
        * A checkerboard behind the image, because most of these are transparent PNGs. On a plain
        * dark panel a white logo is invisible and a dark logo looks like a missing file — both of
        * which read as "the upload failed".
        */}
      <div
        className="flex h-16 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10"
        style={{
          backgroundImage:
            "linear-gradient(45deg,#2a2a2a 25%,transparent 25%),linear-gradient(-45deg,#2a2a2a 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#2a2a2a 75%),linear-gradient(-45deg,transparent 75%,#2a2a2a 75%)",
          backgroundSize: "12px 12px",
          backgroundPosition: "0 0,0 6px,6px -6px,-6px 0",
          backgroundColor: "#1a1a1a",
        }}
      >
        {shown ? (
          // eslint-disable-next-line @next/next/no-img-element -- an arbitrary uploaded path,
          // previewed at a fixed box; next/image would want a configured loader for no gain here.
          <img src={shown} alt="" className="max-h-full max-w-full object-contain" />
        ) : (
          <span className="text-[10px] font-bold uppercase text-white/30">none</span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-white">{label}</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-white/40">{hint}</p>
        <p className="mt-1 truncate text-[11px] text-white/30">
          {inherited ? `Inherited: ${resolved || "nothing set"}` : value}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-white/15 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-white/70 transition hover:border-white/40 hover:text-white">
          {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
          {uploading ? "Uploading" : "Replace"}
          <input
            type="file"
            className="hidden"
            accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon,.ico"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onUpload(slot, file);
              // Cleared so choosing the SAME file again still fires onChange — otherwise a
              // re-upload after a failed attempt silently does nothing.
              event.target.value = "";
            }}
          />
        </label>

        {!inherited && (
          <button
            type="button"
            onClick={onClear}
            className="rounded-full border border-white/10 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-white/40 transition hover:text-white"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );
}
