import { GraduationCap, Mic, Star, Users, type LucideIcon } from "lucide-react";

interface Props {
  /** Live row counts for this event. */
  counts?: { visitors: number; exhibitors: number; speakers: number; workshops: number };
  /** find_language_phrases overrides (counter_visitors, ...). Used only where a count is 0. */
  visitors: string;
  exhibitors: string;
  speakers: string;
  workshops: string;
}

/**
 * What each tile shows, in priority order:
 *
 *   1. the live count, whenever there is one — this is the whole point of the band, and it is the
 *      only value that stays true without someone remembering to edit it;
 *   2. the organiser's configured phrase, when the count is 0 — a brand-new event legitimately has
 *      no exhibitors or tickets yet, and "0 Exhibitors" on the homepage is worse than the target
 *      figure the organiser typed in;
 *   3. the original static default, if neither exists.
 *
 * Counts are rendered exactly, locale-grouped ("25,000"), with no invented "+" — the old strings
 * carried one because they were aspirational; a real number should not pretend to be a floor.
 */
function tileValue(count: number | undefined, phrase: string, fallback: string): string {
  if (typeof count === "number" && count > 0) return count.toLocaleString("en-GB");
  return phrase || fallback;
}

/**
 * Labels and fallbacks are deliberately unchanged. The reference shows "Attendees" and
 * "Countries"; these read "Visitors" and "Workshops & Masterclass" because that is what this
 * event actually counts, and renaming a tile would misdescribe the number under it.
 *
 * `icon` and `accent` are the only additions and both are presentational. The icon is chosen to
 * describe THIS tile's label rather than to copy the reference's: the reference's globe belongs
 * to a "Countries" tile that does not exist here, so the workshops tile gets a graduation cap
 * instead. An icon that contradicts its label is worse than one that differs from the mockup.
 */
const ITEMS = (p: Props): { label: string; value: string; icon: LucideIcon; accent: string }[] => [
  { label: "Visitors", value: tileValue(p.counts?.visitors, p.visitors, "25000+"), icon: Users, accent: "#8B3DFF" },
  { label: "Exhibitors", value: tileValue(p.counts?.exhibitors, p.exhibitors, "1000+"), icon: Star, accent: "#F020A8" },
  { label: "Speakers", value: tileValue(p.counts?.speakers, p.speakers, "100+"), icon: Mic, accent: "#FF2BAF" },
  { label: "Workshops & Masterclass", value: tileValue(p.counts?.workshops, p.workshops, "50+"), icon: GraduationCap, accent: "#246BFD" },
];

export function DataCounters(props: Props) {
  return (
    <section className="relative overflow-hidden border-y border-white/[0.06] bg-[#0B0C20] px-4 py-10 text-white sm:px-6 sm:py-14">
      {/* Decorative field — all non-interactive. */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_15%_0%,rgba(108,43,255,0.18),transparent_55%),radial-gradient(ellipse_at_85%_100%,rgba(240,32,168,0.14),transparent_55%)]" />

      <div className="relative z-10 mx-auto grid max-w-6xl grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4 lg:gap-6">
        {ITEMS(props).map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="group relative flex w-full max-w-full flex-col items-center justify-center overflow-hidden rounded-[1.25rem] border border-white/[0.09] bg-[#10112A]/85 px-3 py-6 text-center backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-white/20 sm:px-5 sm:py-8"
            >
              {/* Accent glow behind the icon, brightening on hover. */}
              <div
                className="pointer-events-none absolute -top-10 left-1/2 h-24 w-24 -translate-x-1/2 rounded-full opacity-40 blur-3xl transition-opacity duration-300 group-hover:opacity-80"
                style={{ backgroundColor: item.accent }}
              />

              <Icon
                aria-hidden="true"
                strokeWidth={2.25}
                className="relative mb-3 h-7 w-7 transition-transform duration-300 group-hover:scale-110 sm:h-8 sm:w-8"
                style={{ color: item.accent, filter: `drop-shadow(0 0 10px ${item.accent}80)` }}
              />

              <div className="relative w-full max-w-full whitespace-nowrap px-1 text-2xl font-black tabular-nums tracking-tight text-white sm:text-3xl lg:text-[2.35rem]">
                {item.value}
              </div>

              <p className="relative mt-1.5 max-w-full break-words px-1 text-center text-xs font-medium text-[#A5A6C5] sm:text-sm">
                {item.label}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
