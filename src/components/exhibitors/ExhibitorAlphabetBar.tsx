import Link from "next/link";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const DIGIT_BUCKET = "0-9";

/**
 * The A-Z filter above the exhibitor directory: All, 0-9, then every letter.
 *
 * Plain links rather than client-side state, so a filtered view is server-rendered, shareable
 * and bookmarkable — the same reasoning the Pagination component is built on, and the two have
 * to agree because they share the query string.
 *
 * A letter nobody's name starts with is rendered as a dimmed, unclickable chip rather than
 * dropped. Its absence carries information — "no exhibitors under X" — and a bar whose buttons
 * move around as the roster changes is harder to use than one that always looks the same.
 */
export function ExhibitorAlphabetBar({
  available,
  active,
  buildHref,
}: {
  /** Buckets that actually have exhibitors behind them, from getEventExhibitorsPaged(). */
  available: string[];
  /** The bucket currently filtered to, or "" for All. */
  active: string;
  buildHref: (letter: string) => string;
}) {
  const has = new Set(available);

  const chip = (label: string, isActive: boolean, enabled: boolean, href: string) => {
    const base =
      "flex h-9 min-w-9 items-center justify-center rounded-lg px-3 text-xs font-black uppercase tracking-wide transition";

    if (!enabled) {
      return (
        <span
          key={label}
          aria-disabled
          title={`No exhibitors under ${label}`}
          className={`${base} cursor-not-allowed border border-white/5 text-zinc-700`}
        >
          {label}
        </span>
      );
    }

    return (
      <Link
        key={label}
        href={href}
        aria-current={isActive ? "true" : undefined}
        className={`${base} border ${
          isActive
            ? "border-brand-pink bg-brand-pink text-white shadow-lg"
            : "border-white/10 bg-white/5 text-zinc-300 hover:border-brand-pink hover:text-brand-pink"
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <nav
      aria-label="Filter exhibitors by first letter"
      className="mt-10 flex flex-wrap items-center justify-center gap-1.5"
    >
      {chip("All", active === "", true, buildHref(""))}
      {chip(DIGIT_BUCKET, active === DIGIT_BUCKET, has.has(DIGIT_BUCKET), buildHref(DIGIT_BUCKET))}
      {LETTERS.map((letter) =>
        chip(letter, active === letter, has.has(letter), buildHref(letter))
      )}
    </nav>
  );
}
