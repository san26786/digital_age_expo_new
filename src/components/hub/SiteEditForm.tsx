"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, Check, Loader2, Upload } from "lucide-react";
import type { SiteSettings } from "@/lib/services/hubSiteSettings";
import { paletteFromPixels, type LogoPalette } from "@/lib/hub/logoPalette";

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

/**
 * ---------------------------------------------------------------------------
 *  SEVEN COLOURS, FOUR OF WHICH ARE OPTIONAL
 * ---------------------------------------------------------------------------
 *
 *  The first three are the ones that decide the site. The four below them refine surfaces the
 *  ramp would otherwise derive, and every one of them falls back to that derived value when left
 *  empty — so "just pick a background" still gives a coherent site, and nobody has to fill in
 *  seven fields to change one thing.
 *
 *  `derived: true` is what the form uses to say so on screen. A blank field that silently means
 *  "computed from the background" reads as a field somebody forgot to fill in, which is how you
 *  end up with seven hand-picked colours that fight each other.
 */
const COLOURS: {
  field: keyof SiteSettings;
  label: string;
  hint: string;
  fallback: string;
  derived?: boolean;
}[] = [
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
    label: "Page background",
    hint: "Behind everything, and the base every surface below is mixed from. Dark values suit this design.",
    fallback: "#05030A",
  },
  {
    field: "surfaceAltColour",
    label: "Alternate section",
    hint: "The banded sections that alternate down the page.",
    fallback: "#0C0618",
    derived: true,
  },
  {
    field: "cardColour",
    label: "Cards & panels",
    hint: "Boxes sitting on the page — stat tiles, FAQ rows, form panels.",
    fallback: "#0A0514",
    derived: true,
  },
  /*
   * The two text colours sit directly after the background, because that is what they have to be
   * readable against and the editor reads top to bottom.
   */
  {
    field: "textColour",
    label: "Text",
    hint: "Headings and body copy. Empty means white, which suits a dark page.",
    fallback: "#FFFFFF",
    derived: true,
  },
  {
    field: "accentTextColour",
    label: "Accent text",
    hint: "Links, eyebrow labels and the highlighted words in headings. Empty derives from the primary, lightened until it is readable on the page background.",
    fallback: "#C71585",
    derived: true,
  },
  {
    field: "navbarColour",
    label: "Navbar",
    hint: "The sticky header. Kept at 90% so the blur behind it still shows.",
    fallback: "#0A0514",
    derived: true,
  },
  {
    field: "footerColour",
    label: "Footer",
    hint: "The foot of every page.",
    fallback: "#03010A",
    derived: true,
  },
];

/**
 * ---------------------------------------------------------------------------
 *  TABS, AND WHY THEY ARE LOCAL STATE RATHER THAN ROUTES
 * ---------------------------------------------------------------------------
 *
 *  The CP's settings are a tab per route — /cp/settings/general, /cp/settings/theme and so on.
 *  That is the obvious thing to copy and it would be the wrong choice here, for one measured
 *  reason: on this machine a cold route compile runs 30 seconds and has been observed at several
 *  minutes, so a route per tab turns "look at the colours" into a wait. Local state switches
 *  instantly and compiles once.
 *
 *  It also makes ONE save correct. All seven tabs are one form over one state object, so a person
 *  who edits the name on Identity and a colour on Theme presses Save once and gets both. Routed
 *  tabs would mean seven forms and seven saves, and the failure there is silent — you change two
 *  things, save, and only the tab you were standing on is kept.
 */
const TABS = [
  { key: "identity", label: "Identity" },
  { key: "contact", label: "Contact" },
  { key: "social", label: "Social" },
  /*
   * Logos before colours, deliberately. A logo is the thing that decides what the colours have to
   * live with — upload it first and the palette is a response to it; pick the palette first and
   * the logo arrives afterwards to clash with a choice already made.
   */
  { key: "logos", label: "Logos & favicon" },
  { key: "theme", label: "Theme colours" },
  { key: "meta", label: "Meta / SEO" },
  /*
   * Shown only where an import panel is actually supplied — the Hub's own edit screen. The
   * self-serve settings screen on a created site leaves it out: copying a whole event's speakers
   * and exhibitors in is a platform operation, not a "change my colours" one.
   */
  { key: "import", label: "Import content" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function SiteEditForm({
  site,
  isCurrent,
  importPanel,
}: {
  site: SiteSettings;
  isCurrent: boolean;
  importPanel?: React.ReactNode;
}) {
  const tabs = importPanel ? TABS : TABS.filter((entry) => entry.key !== "import");

  const [tab, setTab] = useState<TabKey>("identity");
  const router = useRouter();
  const [form, setForm] = useState<SiteSettings>(site);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState<Slot | null>(null);
  const [previews, setPreviews] = useState<Partial<Record<Slot, string>>>({});

  const set = <K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  /*
   * ===========================================================================
   *  COLOURS FROM THE LOGO
   * ===========================================================================
   *
   *  Uploading the website logo fills in primary, secondary and page background from the image.
   *  The extraction itself is in @/lib/hub/logoPalette — pure, DOM-free and tested. What lives
   *  here is the browser half: turn the File into pixels.
   *
   *  IT READS THE FILE, NOT THE UPLOADED URL. The File is already in memory the moment somebody
   *  picks it, so there is no second round trip, no cache-buster to worry about, and no question
   *  about whether reading the canvas back taints it.
   *
   *  IT IS UNDOABLE, which is what makes doing it automatically acceptable. Overwriting three
   *  colours somebody may have chosen by hand is only reasonable if putting them back is one
   *  click, so the previous values are kept and the banner offers them until the next upload.
   */
  const [paletteNote, setPaletteNote] = useState<string | null>(null);
  const [paletteUndo, setPaletteUndo] = useState<Pick<
    SiteSettings,
    "primaryColour" | "secondaryColour" | "backgroundColour"
  > | null>(null);

  async function pixelsFrom(source: Blob): Promise<Uint8ClampedArray | null> {
    try {
      const bitmap = await createImageBitmap(source);
      const size = 64;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;

      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) return null;

      // Squashed into a square on purpose: aspect ratio is irrelevant when all that is wanted is
      // which colours are present and in what proportion.
      context.drawImage(bitmap, 0, 0, size, size);
      bitmap.close?.();

      return context.getImageData(0, 0, size, size).data;
    } catch {
      // An SVG that createImageBitmap will not decode, a corrupt file, a browser without it.
      // Nothing is changed and nothing is claimed.
      return null;
    }
  }

  function applyPalette(palette: LogoPalette) {
    if (palette.monochrome) {
      setPaletteNote(
        "That logo has no colour to read — it is black, white or transparent only. The theme colours are unchanged."
      );
      return;
    }

    setPaletteUndo({
      primaryColour: form.primaryColour,
      secondaryColour: form.secondaryColour,
      backgroundColour: form.backgroundColour,
    });

    setForm((current) => ({
      ...current,
      primaryColour: palette.primary,
      secondaryColour: palette.secondary,
      backgroundColour: palette.background,
      /*
       * The other four are CLEARED rather than set. Blank means "derive from the background",
       * which is the ramp in siteTheme.ts — so the alternating sections, cards, navbar and footer
       * all follow the new background automatically and stay in proportion with it. Writing four
       * more literals here would pin them and break that the next time the background changes.
       */
      surfaceAltColour: "",
      cardColour: "",
      navbarColour: "",
      footerColour: "",
      // Heading and body text stay white — blank means white, and white is right on a dark page.
      textColour: "",
      /*
       * Accent text is SET rather than left to derive. Deriving lifts the brand colour until it is
       * legible, which clears the contrast bar and still leaves a saturated hue doing the work of
       * a label. The off-white carrying the brand's hue is the better default for small text; the
       * field is right there for anyone who wants the colour back.
       */
      accentTextColour: palette.accentText,
    }));

    setPaletteNote(null);
  }

  async function matchColoursTo(source: Blob) {
    const pixels = await pixelsFrom(source);
    if (!pixels) {
      setPaletteNote("That image could not be read for colours. The theme colours are unchanged.");
      return;
    }
    applyPalette(paletteFromPixels(pixels));
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

      /*
       * Only the WEBSITE logo drives the palette. A favicon is 32px and usually a cropped detail,
       * a footer logo is often a mono knockout, and taking the theme from either would be reading
       * the wrong image. The others upload and change nothing.
       */
      if (slot === "primary_logo") await matchColoursTo(file);
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
          link: form.link,
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
          surfaceAltColour: form.surfaceAltColour,
          cardColour: form.cardColour,
          navbarColour: form.navbarColour,
          footerColour: form.footerColour,
          metaTitle: form.metaTitle,
          metaDescription: form.metaDescription,
          metaKeywords: form.metaKeywords,
          canonicalUrl: form.canonicalUrl,
          ogTitle: form.ogTitle,
          ogDescription: form.ogDescription,
          ogImage: form.ogImage,
          twitterTitle: form.twitterTitle,
          twitterDescription: form.twitterDescription,
          twitterImage: form.twitterImage,
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

  const area = (key: keyof SiteSettings, title: string, hint?: string, max?: number) => {
    const value = String(form[key] ?? "");
    return (
      <div>
        <label className={label} htmlFor={`f-${String(key)}`}>
          {title}
          {max ? (
            <span className={value.length > max ? "text-amber-300" : "text-white/30"}>
              {" "}
              {value.length}/{max}
            </span>
          ) : null}
        </label>
        <textarea
          id={`f-${String(key)}`}
          className={`${field} min-h-[80px]`}
          value={value}
          onChange={(event) => set(key, event.target.value as never)}
        />
        {hint && <p className="mt-1.5 text-[11px] leading-relaxed text-white/40">{hint}</p>}
      </div>
    );
  };

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

      {/* The tab bar. Pills, matching the CP's settings nav, so the two read as one product. */}
      <nav className="mt-7 flex flex-wrap gap-2 border-b border-white/10 pb-4">
        {tabs.map((entry) => (
          <button
            key={entry.key}
            type="button"
            onClick={() => setTab(entry.key)}
            className={`rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-wider transition ${
              tab === entry.key
                ? "bg-gradient-to-r from-brand-purple to-brand-pink text-white shadow-lg"
                : "text-white/50 hover:bg-white/5 hover:text-white"
            }`}
          >
            {entry.label}
          </button>
        ))}
      </nav>

      {/* ------------------------------------------------------------------ IDENTITY */}
      <section className={section} hidden={tab !== "identity"}>
        <h3 className={heading}>Identity</h3>
        <div className="grid gap-5 sm:grid-cols-2">
          {text("name", "Site name")}
          {text("brand", "Brand")}
        </div>

        <div className="mt-5">
          {text("link", "Website address", "b2bgrowthexpo.com")}
          <p className="mt-1.5 text-[11px] leading-relaxed text-white/40">
            Without <code>https://</code> or <code>www.</code> — both are stripped on save, so the
            stored value is what an incoming request is matched against.
          </p>

          {/*
            * A warning rather than a confirmation dialog. This is the one field on the page whose
            * effect is not visual: it decides which requests reach this site at all. Someone who
            * changes it without meaning to would see nothing wrong on screen and find out from
            * DNS — so the consequence is stated next to the box, where it is read before the
            * change rather than after.
            */}
          {form.link.trim().toLowerCase() !== site.link.trim().toLowerCase() && (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
              <p className="text-[11px] leading-relaxed text-amber-100/90">
                You are changing this site&apos;s address from{" "}
                <span className="font-bold">{site.link || "(none)"}</span> to{" "}
                <span className="font-bold">{form.link || "(blank)"}</span>. Requests for the old
                address will no longer reach it, and whatever DNS points there needs updating to
                match. Saving refuses an address another site already uses.
              </p>
            </div>
          )}
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
      <section className={section} hidden={tab !== "contact"}>
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
      <section className={section} hidden={tab !== "social"}>
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
      <section className={section} hidden={tab !== "theme"}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className={heading}>Theme colours</h3>

          {/*
            * Re-runs the extraction against the logo already stored, for the case the colours were
            * edited by hand afterwards and somebody wants to start from the logo again. Hidden
            * when there is no logo, rather than shown disabled: there is nothing to explain.
            */}
          {form.primaryLogo && (
            <button
              type="button"
              onClick={async () => {
                try {
                  const response = await fetch(form.primaryLogo);
                  await matchColoursTo(await response.blob());
                } catch {
                  setPaletteNote("That logo could not be loaded. The theme colours are unchanged.");
                }
              }}
              className="rounded-full border border-white/15 px-4 py-2 text-[11px] font-black uppercase tracking-wider text-white/70 transition hover:border-brand-pink/50 hover:text-white"
            >
              Match colours to logo
            </button>
          )}
        </div>

        {paletteUndo && (
          <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-brand-pink/25 bg-brand-pink/[0.07] px-4 py-3">
            <p className="text-xs leading-relaxed text-white/75">
              Primary, secondary and the page background were read from your logo. The four derived
              surfaces were cleared so they follow the new background.
            </p>
            <button
              type="button"
              onClick={() => {
                setForm((current) => ({ ...current, ...paletteUndo }));
                setPaletteUndo(null);
              }}
              className="ml-auto rounded-full border border-white/20 px-4 py-1.5 text-[11px] font-black uppercase tracking-wider text-white/80 transition hover:border-white/50 hover:text-white"
            >
              Undo
            </button>
          </div>
        )}

        {paletteNote && (
          <p className="mb-5 rounded-xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-xs leading-relaxed text-amber-100/90">
            {paletteNote}
          </p>
        )}

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
                  {!value &&
                    (colour.derived
                      ? " Empty — derived from the page background."
                      : " Currently inherited from the stock palette.")}
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
            {/*
              * A FLAT PRIMARY, NOT A GRADIENT.
              *
              * This was a secondary -> primary gradient, which is a poor way to show somebody the
              * colour they just picked: half the pill is the other colour, the two blend in the
              * middle, and the one thing the swatch is meant to answer — "what does my primary
              * actually look like as a button?" — is the thing it hides.
              */}
            <span
              className="rounded-full px-5 py-2.5 text-xs font-black uppercase tracking-widest text-white"
              style={{ backgroundColor: form.primaryColour || COLOURS[0].fallback }}
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
          Leave the last four empty and they are derived from the page background, which is
          usually what you want. The CP&apos;s Theme page offers nine colours, but only its first
          three are read by anything — the other six were saved and never applied.
        </p>
      </section>

      {/* ------------------------------------------------------------------ IMAGES */}
      <section className={section} hidden={tab !== "logos"}>
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

      {/* ------------------------------------------------------------------ META / SEO */}
      <section className={section} hidden={tab !== "meta"}>
        <h3 className={heading}>Meta / SEO</h3>

        <div className="grid gap-5 sm:grid-cols-2">
          {text("metaTitle", "Meta title", site.name)}
          {text("metaKeywords", "Meta keywords", "business expo, b2b networking, …")}
        </div>

        <div className="mt-5 grid gap-5">
          {area(
            "metaDescription",
            "Meta description",
            "What search engines show under the title. Aim for under 160 characters.",
            160
          )}
          {text("canonicalUrl", "Canonical URL", `https://${site.link || "example.com"}`)}
        </div>

        <h4 className="mb-4 mt-8 text-[11px] font-black uppercase tracking-[0.2em] text-white/40">
          Share cards
        </h4>
        <div className="grid gap-5 sm:grid-cols-2">
          {text("ogTitle", "Open Graph title", "Falls back to the meta title")}
          {text("twitterTitle", "X / Twitter title", "Falls back to the Open Graph title")}
          {area("ogDescription", "Open Graph description", "Facebook and LinkedIn. 1200×630 image.", 160)}
          {area("twitterDescription", "X / Twitter description", "1200×675 image.", 160)}
          {text("ogImage", "Open Graph image URL", "/files/settings/site-1/og.png")}
          {text("twitterImage", "X / Twitter image URL", "/files/settings/site-1/twitter.png")}
        </div>

        <p className="mt-6 text-[11px] leading-relaxed text-white/40">
          Every field is optional. Left empty, the page keeps the title and description it derives
          from the site name, and the share cards fall back to the meta values — so a blank tab
          changes nothing rather than emptying your search listing.
        </p>
      </section>

      {/* ------------------------------------------------------------------ IMPORT */}
      {/*
        * The import panel is a tab rather than a block below the form because it is the one thing
        * here that writes thousands of rows. Sitting under the colour pickers it read as another
        * field; as its own tab it is somewhere you go deliberately.
        */}
      {importPanel && <div hidden={tab !== "import"}>{importPanel}</div>}

      {/* ------------------------------------------------------------------ SAVE */}
      <section className={section} hidden={tab === "import"}>
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
          One Save covers every tab — edit the name here and a colour on Theme, press Save once,
          and both are kept.
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
