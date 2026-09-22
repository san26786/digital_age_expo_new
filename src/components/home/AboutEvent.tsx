import Link from "next/link";
import { getBrand } from "@/lib/brand";
import { assetUrl } from "@/lib/assets";
import { formatDayRange, formatMonthDayYear } from "@/lib/format";
import { AboutEventDescription } from "@/components/home/AboutEventDescription";

/** Local stage photograph used when the event has configured no image of its own. */
const ABOUT_FALLBACK_IMAGE = "/images/about_event.jpg";

interface Props {
  sectionTitle?: string | null;
  sectionDescription?: string | null;
  additionalInfo?: string | null;
  backgroundImage?: string | null;
  dateStart?: Date | null;
  dateEnd?: Date | null;
}

/**
 * UI-ONLY REDESIGN. Every prop, fallback, route and helper is exactly as it was. Three things
 * about the rearrangement are worth stating, because each one looks like a content decision and
 * is in fact forced by what the data does and does not contain.
 *
 * 1. THE IMAGE MOVED FROM BACKGROUND TO FOREGROUND. `backgroundImage` used to be the section's
 *    own `background-image`, dimmed to ~80% so white text could sit on top of it. The reference
 *    puts the picture in a framed device on the left with the copy beside it, so it is now an
 *    `<img>` in its own column. Same value, same fallback, same `assetUrl()` resolution — it is
 *    simply no longer being dimmed into illegibility to serve as a backdrop.
 *
 * 2. THE EYEBROW IS CONDITIONAL. The reference has both a small "ABOUT THE EVENT" label AND a
 *    separate headline. There is only one title field here, and its own fallback is the string
 *    "About The Event" — so rendering a static eyebrow above it would print the same words twice
 *    on any event that has not set `section_title`. The eyebrow therefore appears only when a
 *    real title exists to sit under it.
 *
 * 3. THE THREE FEATURE TILES ARE *WHERE* AND *WHEN*. The reference's "Global Networking / Expert
 *    Insights / Innovation Showcase" are marketing copy with nothing behind them in this schema;
 *    inventing them would put three permanent lies on the homepage. The same visual pattern —
 *    icon badge, bold title, supporting line — is used instead for the two facts this section
 *    genuinely holds, which is what the old layout showed in that slot too.
 *
 * 4. SCROLL ANIMATION IS NOT THIS FILE'S JOB. It used to be: an inline <style> plus an inline
 *    <script> lived here, because this is an async Server Component and cannot hold
 *    useEffect. React never executes a <script> rendered by a component, so it warned on
 *    every render and did nothing at all on client-side navigation. Both blocks are gone.
 *    The elements below just carry `data-reveal`; the CSS is in globals.css and the observer
 *    is <ScrollReveal /> in the root layout, which covers every page rather than this one.
 */
export async function AboutEvent({
  sectionTitle,
  sectionDescription,
  additionalInfo,
  backgroundImage,
  dateStart,
  dateEnd,
}: Props) {
  /*
   * The DYNAMIC value still wins. This only changes what is shown when the event has no image of
   * its own configured, and the old fallback was a remote legacy banner that is byte-for-byte the
   * same file the hero uses — so About and the hero rendered the identical washed-out crowd shot
   * one after the other. A local stage photograph gives the section its own picture without
   * touching `opportunity_images`, which the CP still controls.
   */
  const bgImage = assetUrl(backgroundImage) || ABOUT_FALLBACK_IMAGE;

  const title = sectionTitle || "About The Event";
  const defaultDesc =
    "For over 3 years our events have connected thousands of savvy business owners and budding entrepreneurs, sharing a wealth of knowledge, skills and advice in the United Kingdom and British Isles. B2B Growth Hub Limited holds a portfolio of some of the biggest events in Isle of Man and some counties of the United Kingdom. We are business connectors and act as a catalyst within the industry. Our ambition is to bring UK and British Isles businesses back on track after the covid pandemic, therefore B2B Growth Hub is bringing this virtual exhibition to provide an opportunity for businesses to increase their visibility, generate new leads and connect with like-minded business owners. Being held on a virtual platform, our shows couldn’t be better connected to all the businesses in the UK and British Isles. We are thankful to our technology partner Visualytes Limited to offer us a powerful virtual exhibition platform powered by Tillu.";

  const desc = sectionDescription || defaultDesc;
  /*
   * The site's own address, not a hardcoded one.
   *
   * This line is the "WHERE" of the About block, and it was the literal string
   * "digitalageexpo.com" — so every site served by this deployment told visitors to go to
   * Digital Age Expo. `additionalInfo` still wins when the event has its own text; this is only
   * what shows when it does not, which for a newly created site is always.
   */
  const brand = await getBrand();
  const whereText = additionalInfo || `${brand.host}\nPowered by TILLU-Virtual Exhibition`;

  /** Only shown when a real title exists — see note 2 above. */
  const showEyebrow = Boolean(sectionTitle);

  return (
    <section
      id="about-event-section"
      className="relative overflow-hidden bg-[var(--c-bg-1)] px-5 py-16 text-white sm:px-6 sm:py-24"
    >
      {/* Decorative field. All non-interactive. */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_10%_15%,rgba(108,43,255,0.20),transparent_55%),radial-gradient(ellipse_at_90%_85%,rgba(36,107,253,0.16),transparent_55%)]" />
      <div className="pointer-events-none absolute -left-32 top-1/4 h-[26rem] w-[26rem] rounded-full bg-[var(--c-accent-pink)]/12 blur-[130px]" />

      <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
        {/* ---------------- Left: framed visual ---------------- */}
        <div data-reveal="left" className="relative">
          {/* Outer bloom */}
          <div className="pointer-events-none absolute -inset-6 rounded-[2.5rem] bg-gradient-to-br from-[var(--c-accent-pink)]/35 via-[var(--c-accent-violet)]/25 to-[var(--c-accent-cyan)]/30 blur-3xl" />

          {/* Device frame: gradient hairline border achieved with a padded gradient wrapper. */}
          <div className="relative rounded-[1.75rem] bg-gradient-to-br from-[var(--c-accent-pink)] via-[var(--c-accent-violet-soft)] to-[var(--c-accent-cyan)] p-[2px] shadow-[0_30px_90px_-25px_rgba(0,0,0,0.9)]">
            <div className="overflow-hidden rounded-[1.65rem] bg-[var(--c-bg-0)] p-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- remote/legacy asset host,
                  resolved through assetUrl(); next/image would need per-host config for every
                  legacy domain this map can return. */}
              <img
                src={bgImage}
                alt={title}
                className="aspect-[3/2] h-full w-full rounded-[1.35rem] object-cover transition-transform duration-700 ease-out hover:scale-105"
                loading="lazy"
              />
            </div>
          </div>

          {/* Accent bars echoing the reference's glowing edges. Decorative only. */}
          <div className="pointer-events-none absolute -left-2 top-12 bottom-12 w-1 rounded-full bg-gradient-to-b from-transparent via-[var(--c-accent-pink)] to-transparent blur-[2px]" />
          <div className="pointer-events-none absolute -right-2 top-20 bottom-20 w-1 rounded-full bg-gradient-to-b from-transparent via-[var(--c-accent-cyan)] to-transparent blur-[2px]" />
        </div>

        {/* ---------------- Right: copy ---------------- */}
        <div data-reveal="right" style={{ transitionDelay: "100ms" }}>
          {showEyebrow && (
            <span className="text-[11px] font-black uppercase tracking-[0.3em] text-[var(--c-accent-pink)] sm:text-xs">
              About The Event
            </span>
          )}

          <h2
            className={`text-2xl font-black uppercase leading-[1.12] tracking-tight text-white sm:text-4xl lg:text-[2.6rem] ${
              showEyebrow ? "mt-3" : ""
            }`}
          >
            {title}
          </h2>

          {/*
            Clamped to a teaser that expands in place — see AboutEventDescription. The
            description now comes from Event Details and is the organiser's full write-up, which
            printed in full pushed the WHERE/WHEN tiles and the whole page below them off screen.
          */}
          <AboutEventDescription html={desc} />

          {/* -------- Fact tiles: the reference's highlight row, carrying real values -------- */}
          <div className="mt-8 grid gap-3 sm:grid-cols-2 sm:gap-4">
            <div data-reveal style={{ transitionDelay: "150ms" }}>
              <div className="h-full rounded-2xl border border-white/[0.09] bg-[var(--c-bg-2)]/80 p-5 backdrop-blur-sm transition-colors duration-300 hover:border-[var(--c-accent-pink)]/40">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--c-accent-pink)]/35 bg-[var(--c-accent-pink)]/10">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                    <defs>
                      <linearGradient id="dae-about-where" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#F020A8" />
                        <stop offset="100%" stopColor="#8B3DFF" />
                      </linearGradient>
                    </defs>
                    <path
                      fill="url(#dae-about-where)"
                      d="M12 2.2a7.3 7.3 0 0 0-7.3 7.3c0 5.3 6.5 11.7 6.78 11.98a.75.75 0 0 0 1.04 0c.28-.28 6.78-6.68 6.78-11.98A7.3 7.3 0 0 0 12 2.2zm0 10.05a2.75 2.75 0 1 1 0-5.5 2.75 2.75 0 0 1 0 5.5z"
                    />
                  </svg>
                </span>
                <h4 className="mt-3 text-sm font-black uppercase tracking-wider text-white">Where</h4>
                <p className="mt-1.5 whitespace-pre-line text-sm leading-snug text-[var(--c-text-muted)]">{whereText}</p>
              </div>
            </div>

            <div data-reveal style={{ transitionDelay: "250ms" }}>
              <div className="h-full rounded-2xl border border-white/[0.09] bg-[var(--c-bg-2)]/80 p-5 backdrop-blur-sm transition-colors duration-300 hover:border-[var(--c-accent-cyan)]/40">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--c-accent-cyan)]/35 bg-[var(--c-accent-cyan)]/10">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                    <defs>
                      <linearGradient id="dae-about-when" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#8B3DFF" />
                        <stop offset="100%" stopColor="#00C8FF" />
                      </linearGradient>
                    </defs>
                    <path
                      fill="url(#dae-about-when)"
                      d="M7.75 2a1 1 0 0 1 1 1v1h6.5V3a1 1 0 1 1 2 0v1h.5A2.25 2.25 0 0 1 20 6.25v12.5A2.25 2.25 0 0 1 17.75 21H6.25A2.25 2.25 0 0 1 4 18.75V6.25A2.25 2.25 0 0 1 6.25 4h.5V3a1 1 0 0 1 1-1zM6 9.5v9.25c0 .14.11.25.25.25h11.5c.14 0 .25-.11.25-.25V9.5H6z"
                    />
                  </svg>
                </span>
                <h4 className="mt-3 text-sm font-black uppercase tracking-wider text-white">When</h4>
                {dateStart ? (
                  <>
                    <p className="mt-1.5 text-sm font-medium text-white">{formatDayRange(dateStart, dateEnd)}</p>
                    <p className="text-sm text-[var(--c-text-muted)]">{formatMonthDayYear(dateStart, dateEnd)}</p>
                  </>
                ) : (
                  <>
                    <p className="mt-1.5 text-sm font-medium text-white">Wednesday to Friday</p>
                    <p className="text-sm text-[var(--c-text-muted)]">Aug 26 to Aug 28, 2026</p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Route and label unchanged. */}
          <div className="mt-8">
            <Link
              href="/view_speaker"
              className="btn-brand-gradient group inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-xs font-bold uppercase tracking-wider text-white shadow-[0_10px_34px_-8px_rgba(240,32,168,0.6)] transition-all duration-300 hover:scale-105 active:scale-95"
            >
              View All Speakers
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
          </div>
        </div>
      </div>

    </section>
  );
}