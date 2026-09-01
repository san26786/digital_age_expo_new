/**
 * ---------------------------------------------------------------------------
 * Members-side design tokens.
 * ---------------------------------------------------------------------------
 *
 * Every class string here is lifted verbatim from `/members/manage_awards_partner`
 * (src/app/members/(event)/manage_awards_partner/page.tsx and
 * src/components/dashboard/EventPartnersManager.tsx), which is the agreed visual
 * reference for the whole Members area.
 *
 * WHY A MODULE AND NOT A TAILWIND @apply CLASS: these tokens have to be
 * composable — a table cell needs the base cell padding plus a per-column
 * alignment, a button needs the base plus a width. Exporting strings lets a
 * caller write `${TABLE_CELL} text-right` without inventing a new CSS class for
 * every combination, and it keeps the values greppable so the next person can
 * see which screens actually use a token before changing it.
 *
 * RULE: nothing in this file may encode behaviour. It is class names only, so
 * importing it can never change what a page does — only how it looks.
 */

/* ----------------------------------------------------------------- page shell */

/** Outermost wrapper of every Members page. */
export const PAGE_SHELL = "section-transition space-y-8 animate-fade-in text-white";

/** Breadcrumb strip above the page card. */
export const BREADCRUMB_NAV =
  "mb-6 flex flex-wrap items-center gap-2 text-xs font-semibold text-zinc-400";
export const BREADCRUMB_LINK = "hover:text-brand-pink transition-colors";
export const BREADCRUMB_SEPARATOR = "h-3 w-3 text-zinc-600";
export const BREADCRUMB_CURRENT = "text-brand-pink font-bold";

/* ------------------------------------------------------------------- surfaces */

/** The main content card a page's body sits in. */
export const PANEL = "glass-panel rounded-2xl p-8 shadow-2xl border border-white/10 space-y-6";
/** Same surface without the inner padding — for panels that wrap a full-bleed table. */
export const PANEL_FLUSH = "glass-panel rounded-2xl overflow-hidden border border-white/10 shadow-2xl";
/** Toolbar strip: search on the left, actions on the right. */
export const PANEL_TOOLBAR =
  "glass-panel rounded-2xl p-6 border border-white/10 shadow-2xl flex flex-col lg:flex-row items-center justify-between gap-4";

/* --------------------------------------------------------------- page heading */

export const PAGE_HEADER_ROW =
  "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-6";
/** The gradient square that carries the page's icon. */
export const PAGE_HEADER_ICON =
  "flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-purple to-brand-pink shadow-lg shadow-brand-pink/20";
export const PAGE_TITLE =
  "text-2xl sm:text-3xl font-black uppercase tracking-tight text-white flex items-center gap-2";
export const PAGE_SUBTITLE = "text-xs font-medium text-zinc-400 mt-1";
/** The pill at the right-hand end of the header row. */
export const PAGE_HEADER_PILL =
  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30";

/* ----------------------------------------------------------------- stat cards */

export const STAT_CARD =
  "glass-panel rounded-2xl p-5 border text-left transition-all hover:scale-[1.02] cursor-pointer";
export const STAT_CARD_IDLE = "border-white/10";
export const STAT_CARD_ACTIVE = "border-brand-pink ring-2 ring-brand-pink/40";
export const STAT_LABEL_ROW =
  "flex items-center justify-between text-zinc-400 text-xs font-bold uppercase tracking-wider mb-2";
export const STAT_ICON = "h-8 w-8 rounded-xl flex items-center justify-center";
export const STAT_VALUE = "text-3xl font-black text-white";
export const STAT_CAPTION = "text-[11px] font-medium mt-1";

/* -------------------------------------------------------------------- buttons */

/** The one filled call-to-action per toolbar. */
export const BTN_PRIMARY =
  "btn-sophisticated rounded-xl px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-lg flex items-center gap-2";
/** Everything else in a toolbar. */
export const BTN_SECONDARY =
  "rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-zinc-300 hover:bg-white/10 hover:text-white transition flex items-center gap-2";
export const BTN_DANGER =
  "rounded-xl border border-rose-500/30 bg-rose-500/20 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-rose-300 hover:bg-rose-500 hover:text-white transition flex items-center gap-2";

/** Square icon button used inside a table row's Manage column. */
export const BTN_ICON =
  "flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 border border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white transition";
export const BTN_ICON_DANGER =
  "flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:bg-rose-500 hover:text-white transition";
export const BTN_ICON_POSITIVE =
  "flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500 hover:text-white transition";
export const BTN_ICON_WARN =
  "flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-300 hover:bg-amber-500 hover:text-white transition";

/* --------------------------------------------------------------------- inputs */

/** Search box that sits behind an absolutely-positioned icon (hence the pl-10). */
export const INPUT_SEARCH =
  "w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-brand-pink focus:outline-none transition";
export const INPUT_SEARCH_ICON = "absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400";

/** Form control inside a modal or a settings panel. */
export const INPUT_FIELD =
  "w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-xs text-white focus:border-brand-pink focus:outline-none";
export const FORM_LABEL =
  "block text-xs font-bold uppercase tracking-wider text-fuchsia-300 mb-1.5";
export const FORM_HINT = "mt-1 text-[11px] font-medium text-zinc-500";
export const FORM_ERROR = "mt-1 text-[11px] font-bold text-rose-400";
export const CHECKBOX = "h-4 w-4 rounded border-white/10 bg-white/5 text-brand-pink focus:ring-brand-pink";
export const CHECKBOX_LABEL =
  "flex items-center gap-3 cursor-pointer text-xs font-semibold text-zinc-300 hover:text-white select-none";

/* --------------------------------------------------------------------- tables */

export const TABLE_WRAPPER = PANEL_FLUSH;
export const TABLE_SCROLL = "overflow-x-auto";
export const TABLE = "w-full text-left text-xs text-zinc-200";
/** The gradient header bar is the strongest signature of the reference design. */
export const TABLE_HEAD_ROW =
  "border-b border-white/10 bg-gradient-to-r from-brand-purple to-brand-pink text-white";
export const TABLE_TH = "px-6 py-4 font-black uppercase tracking-wider";
export const TABLE_BODY = "divide-y divide-white/5";
export const TABLE_ROW = "hover:bg-white/5 transition-colors";
export const TABLE_CELL = "px-6 py-4";
export const TABLE_EMPTY = "px-6 py-12 text-center text-zinc-400 italic font-medium";

/* --------------------------------------------------------------------- badges */

export const BADGE = "inline-block rounded px-2.5 py-1 text-[10px] font-black uppercase tracking-wider shadow-sm";
export const BADGE_SUCCESS = `${BADGE} bg-emerald-500 text-white`;
export const BADGE_WARN = `${BADGE} bg-amber-500 text-white`;
export const BADGE_DANGER = `${BADGE} bg-rose-500 text-white`;
export const BADGE_NEUTRAL = `${BADGE} bg-white/10 text-zinc-300`;
export const BADGE_INFO = `${BADGE} bg-brand-purple text-white`;

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
  "fixed inset-0 z-50 grid place-items-center overflow-y-auto overscroll-contain bg-black/80 backdrop-blur-sm p-4 animate-fade-in";
export const MODAL_PANEL =
  "glass-panel w-full max-w-lg rounded-3xl border border-white/20 p-6 shadow-2xl space-y-6";
export const MODAL_PANEL_WIDE =
  "glass-panel w-full max-w-3xl rounded-3xl border border-white/20 p-6 shadow-2xl space-y-6";
export const MODAL_HEADER = "flex items-center justify-between border-b border-white/10 pb-4";
export const MODAL_HEADER_ICON =
  "flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-purple to-brand-pink";
export const MODAL_TITLE = "text-lg font-black uppercase tracking-tight text-white";
export const MODAL_SUBTITLE = "text-xs text-zinc-400";
export const MODAL_CLOSE =
  "flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white transition";
export const MODAL_FOOTER = "flex justify-end gap-3 pt-4 border-t border-white/10";

/* ------------------------------------------------------------------- messages */

export const ALERT_ERROR =
  "rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs font-bold text-rose-300";
export const ALERT_SUCCESS =
  "rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs font-bold text-emerald-300";
export const ALERT_WARN =
  "rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs font-bold text-amber-300";
