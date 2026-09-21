/**
 * ---------------------------------------------------------------------------
 * Members-side design tokens.
 * ---------------------------------------------------------------------------
 *
 * Every export here is a class string. Pages compose them — `${TABLE_CELL} text-right` —
 * so the NAMES are the contract and may not change; the values are free to be retuned.
 *
 * RULE: nothing in this file may encode behaviour. It is class names only, so
 * importing it can never change what a page does — only how it looks.
 *
 * ---------------------------------------------------------------------------
 * WHAT THE REVAMP CHANGED, AND WHY
 * ---------------------------------------------------------------------------
 *
 * 1. FOCUS RINGS EXIST NOW. Not one interactive token previously carried a focus style —
 *    buttons, inputs and checkboxes changed only their border colour, which a keyboard user
 *    cannot see and a screen-reader user is not told about. Every interactive token now has
 *    `focus-visible:ring-2`. `focus-visible` rather than `focus` so a mouse click does not
 *    leave a ring behind.
 *
 * 2. MUTED TEXT GOT LIGHTER. `text-zinc-500` on these surfaces lands near 4:1 — under the 4.5:1
 *    minimum for body text. Secondary copy is zinc-400 and tertiary zinc-500 only where the text
 *    is decorative rather than informative.
 *
 * 3. THE TABLE HEADER IS NO LONGER A SATURATED GRADIENT BAR. A purple-to-pink fill behind every
 *    column header competed with the data beneath it, and small uppercase white text on the pink
 *    end of that ramp does not clear 4.5:1. It is now a dark bar with a brand underline: the
 *    header still reads as branded, the contrast is comfortable, and the eye goes to the rows.
 *
 * 4. BADGES ARE TINTED, NOT SOLID. Six solid fills in one table is the "overly colourful" the
 *    brief warns against. Tint plus a matching border reads as the same family as the panels
 *    and keeps status legible.
 *
 * 5. ONE RADIUS AND SHADOW SCALE. Panels rounded-2xl, controls rounded-xl, pills rounded-full.
 *    Shadows only where an element genuinely floats (panels, modals, primary actions).
 */

/* ----------------------------------------------------------------- page shell */

/** Outermost wrapper of every Members page. */
export const PAGE_SHELL = "section-transition space-y-6 animate-fade-in text-white sm:space-y-8";

/** Breadcrumb strip above the page card. */
export const BREADCRUMB_NAV =
  "mb-5 flex flex-wrap items-center gap-2 text-xs font-semibold text-zinc-400";
export const BREADCRUMB_LINK =
  "rounded transition-colors hover:text-brand-pink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink/60";
export const BREADCRUMB_SEPARATOR = "h-3 w-3 text-zinc-600";
export const BREADCRUMB_CURRENT = "font-bold text-brand-pink";

/* ------------------------------------------------------------------- surfaces */

/** The main content card a page's body sits in. */
export const PANEL =
  "glass-panel space-y-6 rounded-2xl border border-white/10 p-6 shadow-[0_18px_50px_-24px_rgba(0,0,0,0.9)] sm:p-8";
/** Same surface without the inner padding — for panels that wrap a full-bleed table. */
export const PANEL_FLUSH =
  "glass-panel overflow-hidden rounded-2xl border border-white/10 shadow-[0_18px_50px_-24px_rgba(0,0,0,0.9)]";
/** Toolbar strip: search on the left, actions on the right. */
export const PANEL_TOOLBAR =
  "glass-panel flex flex-col items-stretch justify-between gap-3 rounded-2xl border border-white/10 p-4 shadow-[0_18px_50px_-24px_rgba(0,0,0,0.9)] sm:p-5 lg:flex-row lg:items-center lg:gap-4";

/* --------------------------------------------------------------- page heading */

export const PAGE_HEADER_ROW =
  "flex flex-col items-start justify-between gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-center sm:pb-6";
/** The gradient square that carries the page's icon. */
export const PAGE_HEADER_ICON =
  "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-purple to-brand-pink shadow-lg shadow-brand-pink/25 ring-1 ring-white/10";
export const PAGE_TITLE =
  "flex items-center gap-2 text-xl font-black uppercase tracking-tight text-white sm:text-2xl lg:text-3xl";
export const PAGE_SUBTITLE = "mt-1 text-xs font-medium leading-relaxed text-zinc-400 sm:text-[13px]";
/** The pill at the right-hand end of the header row. */
export const PAGE_HEADER_PILL =
  "inline-flex items-center gap-1.5 rounded-full border border-brand-pink/30 bg-brand-pink/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-brand-pink";

/* ----------------------------------------------------------------- stat cards */

export const STAT_CARD =
  "glass-panel cursor-pointer rounded-2xl border p-5 text-left transition-all duration-300 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink/60";
export const STAT_CARD_IDLE = "border-white/10 hover:border-white/20";
export const STAT_CARD_ACTIVE = "border-brand-pink/70 ring-2 ring-brand-pink/30";
export const STAT_LABEL_ROW =
  "mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-zinc-400";
export const STAT_ICON = "flex h-9 w-9 items-center justify-center rounded-xl";
export const STAT_VALUE = "text-2xl font-black tabular-nums tracking-tight text-white sm:text-3xl";
export const STAT_CAPTION = "mt-1 text-[11px] font-medium text-zinc-400";

/* -------------------------------------------------------------------- buttons */

/** The one filled call-to-action per toolbar. */
export const BTN_PRIMARY =
  "btn-sophisticated flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-lg transition-all duration-300 hover:scale-[1.02] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2 focus-visible:ring-offset-transparent disabled:pointer-events-none disabled:opacity-50";
/** Everything else in a toolbar. */
export const BTN_SECONDARY =
  "flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-zinc-300 transition-all duration-300 hover:border-white/20 hover:bg-white/10 hover:text-white active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 disabled:pointer-events-none disabled:opacity-50";
export const BTN_DANGER =
  "flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/15 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-rose-300 transition-all duration-300 hover:bg-rose-500 hover:text-white active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 disabled:pointer-events-none disabled:opacity-50";

/** Square icon button used inside a table row's Manage column. */
export const BTN_ICON =
  "flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-zinc-300 transition-all duration-200 hover:border-white/20 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40";
export const BTN_ICON_DANGER =
  "flex h-8 w-8 items-center justify-center rounded-lg border border-rose-500/30 bg-rose-500/15 text-rose-300 transition-all duration-200 hover:bg-rose-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400";
export const BTN_ICON_POSITIVE =
  "flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/15 text-emerald-300 transition-all duration-200 hover:bg-emerald-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400";
export const BTN_ICON_WARN =
  "flex h-8 w-8 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/15 text-amber-300 transition-all duration-200 hover:bg-amber-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400";

/* --------------------------------------------------------------------- inputs */

/** Search box that sits behind an absolutely-positioned icon (hence the pl-10). */
export const INPUT_SEARCH =
  "w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-xs text-white placeholder-zinc-400 transition-all duration-200 focus:border-brand-pink focus:bg-white/[0.07] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink/50";
export const INPUT_SEARCH_ICON = "pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400";

/** Form control inside a modal or a settings panel. */
export const INPUT_FIELD =
  "w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-xs text-white placeholder-zinc-500 transition-all duration-200 focus:border-brand-pink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink/50 disabled:cursor-not-allowed disabled:opacity-50";
export const FORM_LABEL =
  "mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-zinc-300";
export const FORM_HINT = "mt-1 text-[11px] font-medium text-zinc-400";
export const FORM_ERROR = "mt-1 text-[11px] font-bold text-rose-400";
export const CHECKBOX =
  "h-4 w-4 rounded border-white/20 bg-white/5 text-brand-pink transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink/60";
export const CHECKBOX_LABEL =
  "flex cursor-pointer select-none items-center gap-3 text-xs font-semibold text-zinc-300 transition-colors hover:text-white";

/* --------------------------------------------------------------------- tables */

export const TABLE_WRAPPER = PANEL_FLUSH;
export const TABLE_SCROLL =
  "overflow-x-auto [scrollbar-color:rgba(255,255,255,0.25)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-track]:bg-transparent";
export const TABLE = "w-full text-left text-xs text-zinc-200";
/** Dark bar with a brand underline — see note 3 at the top of this file. */
export const TABLE_HEAD_ROW =
  "border-b-2 border-brand-pink/60 bg-white/[0.04] text-zinc-200";
export const TABLE_TH = "px-5 py-3.5 text-[11px] font-black uppercase tracking-wider sm:px-6";
export const TABLE_BODY = "divide-y divide-white/5";
export const TABLE_ROW = "transition-colors duration-200 hover:bg-white/[0.04]";
export const TABLE_CELL = "px-5 py-3.5 sm:px-6 sm:py-4";
export const TABLE_EMPTY = "px-6 py-12 text-center font-medium italic text-zinc-400";

/* --------------------------------------------------------------------- badges */

export const BADGE =
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider";
export const BADGE_SUCCESS = `${BADGE} border-emerald-500/30 bg-emerald-500/15 text-emerald-300`;
export const BADGE_WARN = `${BADGE} border-amber-500/30 bg-amber-500/15 text-amber-300`;
export const BADGE_DANGER = `${BADGE} border-rose-500/30 bg-rose-500/15 text-rose-300`;
export const BADGE_NEUTRAL = `${BADGE} border-white/15 bg-white/10 text-zinc-300`;
export const BADGE_INFO = `${BADGE} border-brand-purple/40 bg-brand-purple/20 text-violet-200`;

/* --------------------------------------------------------------------- modals */

/**
 * Overlay. `grid place-items-center` plus `overflow-y-auto` is what centres a
 * short modal while still letting a tall one scroll — flex + items-center clips
 * the top of anything taller than the viewport.
 *
 * This must be rendered inside <ModalPortal> (src/components/ui/ModalPortal.tsx):
 * the Members layout has ancestors with `animation` and `backdrop-filter`, and
 * both create a containing block for `position: fixed`, which would otherwise
 * pin the overlay inside that ancestor's box instead of the viewport.
 */
export const MODAL_OVERLAY =
  "fixed inset-0 z-50 grid place-items-center overflow-y-auto overscroll-contain bg-black/80 p-4 backdrop-blur-sm animate-fade-in";
export const MODAL_PANEL =
  "glass-panel w-full max-w-lg space-y-6 rounded-3xl border border-white/15 p-6 shadow-[0_28px_70px_-20px_rgba(0,0,0,0.95)]";
export const MODAL_PANEL_WIDE =
  "glass-panel w-full max-w-3xl space-y-6 rounded-3xl border border-white/15 p-6 shadow-[0_28px_70px_-20px_rgba(0,0,0,0.95)]";
export const MODAL_HEADER = "flex items-center justify-between border-b border-white/10 pb-4";
export const MODAL_HEADER_ICON =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-purple to-brand-pink ring-1 ring-white/10";
export const MODAL_TITLE = "text-lg font-black uppercase tracking-tight text-white";
export const MODAL_SUBTITLE = "text-xs text-zinc-400";
export const MODAL_CLOSE =
  "flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-zinc-400 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40";
export const MODAL_FOOTER = "flex justify-end gap-3 border-t border-white/10 pt-4";

/* ------------------------------------------------------------------- messages */

export const ALERT_ERROR =
  "rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs font-bold text-rose-300";
export const ALERT_SUCCESS =
  "rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs font-bold text-emerald-300";
export const ALERT_WARN =
  "rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs font-bold text-amber-300";
