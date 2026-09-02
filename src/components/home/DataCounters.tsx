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

const ITEMS = (p: Props) => [
  { label: "Visitors", value: tileValue(p.counts?.visitors, p.visitors, "25000+") },
  { label: "Exhibitors", value: tileValue(p.counts?.exhibitors, p.exhibitors, "1000+") },
  { label: "Speakers", value: tileValue(p.counts?.speakers, p.speakers, "100+") },
  { label: "Workshops & Masterclass", value: tileValue(p.counts?.workshops, p.workshops, "50+") },
];

export function DataCounters(props: Props) {
  return (
    <section className="relative overflow-hidden bg-slate-950 px-6 py-16 text-white border-y border-white/10">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-purple-950/40 via-fuchsia-950/20 to-indigo-950/40" />
      <div className="relative z-10 mx-auto grid max-w-6xl grid-cols-2 gap-8 text-center sm:grid-cols-4">
        {ITEMS(props).map((item) => (
          <div
            key={item.label}
            className="flex w-full max-w-full overflow-hidden flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6 backdrop-blur-sm transition-transform duration-300 hover:scale-105"
          >
            <div className="w-full max-w-full whitespace-nowrap text-xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-300 via-pink-200 to-rose-300 drop-shadow px-1">
              {item.value}
            </div>
            <p className="mt-2 text-xs sm:text-sm font-semibold uppercase tracking-wider text-slate-300 text-center max-w-full break-words px-1">
              {item.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

