import Link from "next/link";
import { CountdownTimer } from "@/components/home/CountdownTimer";
import { Hero3DBackground } from "@/components/home/Hero3DBackground";
import { formatDateLocation } from "@/lib/format";
import { staticAssetUrl } from "@/lib/assets";

interface Props {
  title: string;
  label: string | null;
  dateStart: Date;
  dateEnd: Date | null;
  venue: string | null;
}

/** The event banner this section has always used. Unchanged — only how it is framed changed. */
const HERO_IMAGE = staticAssetUrl(
  "https://digitalageexpo.com/files/listing_pages/818073-dae_index_top_banner.jpg"
);

/**
 * UI-ONLY REDESIGN. Props, link targets, the date helper and the child components are exactly as
 * they were.
 *
 * ---------------------------------------------------------------------------
 *  WHY THE PHOTO IS A POSITIONED PANEL AND NOT THE SECTION'S OWN BACKGROUND
 * ---------------------------------------------------------------------------
 *
 *  The reference puts the photograph on the right and holds the left side dark enough to read
 *  long copy over. A single full-bleed `background-image` on the section cannot do that: dimming
 *  it enough for the text kills the picture, and leaving it bright enough to see makes the
 *  headline fight the crowd behind it. So the image is its own layer, inset to the right on
 *  desktop, with a horizontal gradient dissolving its left edge into the page. The text column
 *  then sits over flat colour, not over photograph.
 *
 *  On mobile there is no room for two columns, so the layer spans the full width and a much
 *  heavier vertical scrim carries the contrast instead — same picture, different dimming, rather
 *  than a second cropped asset to keep in step.
 *
 *  Every scrim is built from `--color-surface-1-rgb`, not a literal, so the CP's Theme screen
 *  still owns the ground tone. The new palette appears only in the additive decoration: glows,
 *  the solid accent on `label`, the bottom wave and the hairline. Text is never given a
 *  clipped gradient fill — it costs legibility at every size for a decorative effect.
 */
export function HeroSection({ title, label, dateStart, dateEnd, venue }: Props) {
  return (
    <section className="relative isolate overflow-hidden bg-[var(--color-surface-1)]">
      {/* ---------------- Photograph ---------------- */}
      <div className="absolute inset-y-0 right-0 w-full lg:w-[66%]">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('${HERO_IMAGE}')` }}
        />

        {/* Left-edge dissolve. Opaque at the left so the copy never sits on the crowd, clear at
            the right so the picture survives. Only meaningful once the panel is inset (lg+). */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(to right, rgb(var(--color-surface-1-rgb)) 0%, rgb(var(--color-surface-1-rgb) / 0.92) 22%, rgb(var(--color-surface-1-rgb) / 0.45) 55%, rgb(var(--color-surface-1-rgb) / 0.15) 100%)`,
          }}
        />

        {/* Mobile/tablet scrim: without a left column to hide behind, the text needs the whole
            frame knocked back. Removed at lg, where the horizontal dissolve takes over. */}
        <div
          className="absolute inset-0 lg:hidden"
          style={{
            backgroundImage: `linear-gradient(to bottom, rgb(var(--color-surface-1-rgb) / 0.86) 0%, rgb(var(--color-surface-1-rgb) / 0.80) 55%, rgb(var(--color-surface-1-rgb) / 0.95) 100%)`,
          }}
        />

        {/* Blend the panel into the section's top and bottom edges. */}
        <div
          className="absolute inset-x-0 top-0 h-24"
          style={{
            backgroundImage: `linear-gradient(to bottom, rgb(var(--color-surface-1-rgb) / 0.85), transparent)`,
          }}
        />
        <div
          className="absolute inset-x-0 bottom-0 h-40"
          style={{
            backgroundImage: `linear-gradient(to top, rgb(var(--color-surface-1-rgb)), transparent)`,
          }}
        />
      </div>

      {/* ---------------- Ambient colour ---------------- */}
      <div className="pointer-events-none absolute -left-40 top-1/4 h-[30rem] w-[30rem] rounded-full bg-[#6C2BFF]/22 blur-[130px]" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-[24rem] w-[24rem] rounded-full bg-[#F020A8]/18 blur-[120px]" />

      <Hero3DBackground />

      {/* ---------------- Content ---------------- */}
      <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-10 px-5 py-16 sm:px-6 sm:py-20 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)] lg:py-28">
        <div className="text-center lg:text-left">
          <span className="text-[11px] font-black uppercase tracking-[0.3em] text-[#F020A8] sm:text-xs">
            The Future Is Digital
          </span>

          <h1 className="mt-4 text-[1.9rem] font-black uppercase leading-[1.06] tracking-tight text-white sm:text-5xl lg:text-[3.4rem]">
            {title}
          </h1>

          {label && (
            <h2 className="mt-2 text-xl font-black uppercase leading-tight tracking-tight text-white sm:text-3xl lg:text-[2.6rem]">
              {label}
            </h2>
          )}

          <p className="mt-4 text-base font-medium text-[#EDEDF8] sm:text-lg lg:text-xl">
            Connect <span className="mx-1 text-[#F020A8]">•</span> Learn{" "}
            <span className="mx-1 text-[#F020A8]">•</span> Grow
          </p>

          <p className="mt-3 text-sm text-[#A5A6C5] sm:text-base">
            {formatDateLocation(dateStart, dateEnd, venue)}
          </p>

          <div className="mt-9">
            <CountdownTimer targetDate={dateStart.toISOString()} />
          </div>

          {/* Routes and labels unchanged. */}
          <div className="mt-9 flex flex-wrap justify-center gap-3 lg:justify-start">
            <Link
              href="/free-ticket"
              className="btn-brand-gradient group inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-bold text-white shadow-[0_10px_34px_-8px_rgba(240,32,168,0.6)] transition-all duration-300 hover:scale-105 active:scale-95"
            >
              Get Free Tickets Now!
              <svg
                viewBox="0 0 20 20"
                fill="none"
                aria-hidden="true"
                className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
              >
                <path
                  d="M4 10h11M11 6l4 4-4 4"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
            <Link
              href="/enter-the-show"
              className="btn-outline-animated rounded-full border border-[#8B3DFF]/50 bg-white/[0.04] px-7 py-3.5 text-sm font-bold text-white backdrop-blur-md transition-all duration-300 hover:scale-105 hover:border-[#8B3DFF] hover:bg-white/[0.1] active:scale-95"
            >
              Enter The Show
            </Link>
            <Link
              href="/exhibitor-registration"
              className="btn-outline-animated rounded-full border border-white/20 bg-white/[0.04] px-7 py-3.5 text-sm font-bold text-white backdrop-blur-md transition-all duration-300 hover:scale-105 hover:border-[#00C8FF]/70 hover:bg-white/[0.1] active:scale-95"
            >
              Book Your Stand
            </Link>
          </div>
        </div>

        {/* Desktop spacer: reserves the right half of the grid for the photo panel behind it, so
            the copy column never runs under the picture. Nothing renders here. */}
        <div className="hidden lg:block" aria-hidden="true" />
      </div>

      {/* ---------------- Bottom wave ----------------
          The reference's magenta swoosh. Decorative only, and non-interactive. */}
      <svg
        className="pointer-events-none absolute inset-x-0 bottom-0 h-20 w-full sm:h-28"
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="dae-hero-wave-a" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#6C2BFF" stopOpacity="0.85" />
            <stop offset="55%" stopColor="#F020A8" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#00C8FF" stopOpacity="0.5" />
          </linearGradient>
          <linearGradient id="dae-hero-wave-b" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#FF2BAF" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#8B3DFF" stopOpacity="0.3" />
          </linearGradient>
        </defs>
        <path d="M0 96C240 40 420 118 720 78s520-86 720-30v72H0z" fill="url(#dae-hero-wave-b)" />
        <path d="M0 112C260 62 470 124 760 92s540-64 680-18v46H0z" fill="url(#dae-hero-wave-a)" />
      </svg>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#8B3DFF]/60 to-transparent" />
    </section>
  );
}
