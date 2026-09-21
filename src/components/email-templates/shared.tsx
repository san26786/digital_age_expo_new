import Link from "next/link";
import { AlertTriangle, Mail, Plus, Search, X } from "lucide-react";
import { Pagination } from "@/app/cp/_components/Pagination";
import {
  EMAIL_TEMPLATE_TOPICS,
  topicForTemplate,
  templateTitle,
  type EmailTemplateScope,
} from "@/lib/email/templateTopics";

/**
 * ===========================================================================
 *  ONE EMAIL-TEMPLATE UI, TWO DOORS INTO IT
 * ===========================================================================
 *
 *  The Email Template Builder was reachable only through /cp, behind a CP login. Putting a
 *  second copy of it in the organiser area would have meant two implementations of the same
 *  screen drifting apart the first time either was touched — exactly the outcome Angad ruled
 *  out: "i don't want duplicate or same functionality in CP".
 *
 *  So the screens live here, know nothing about who is allowed to see them, and take everything
 *  that differs as props:
 *
 *      basePath          /cp/email-templates or /hub/email-templates — every link is built from
 *                        it, so neither copy can send anyone into the other's login.
 *      canEdit           the caller's own permission answer. The CP asks its RBAC, the Hub asks
 *                        getHubAccess; neither question belongs in a view.
 *      update/duplicate  the caller's server actions, already bound and already gated. The
 *                        permission check happens inside those actions, on the server, where it
 *                        cannot be skipped by posting the form from somewhere else.
 *
 *  The CP page and the Hub page are now both about twenty lines, and there is one place to fix a
 *  field, a label or a layout.
 */

/**
 * The columns these screens actually read. Structural, not Prisma's generated type, so a caller
 * can hand over a full row without this module importing the client.
 */
export interface EmailTemplateRow {
  id: string;
  /** Read only to work out which topic a row belongs to, and what to call it. */
  type?: string | null;
  process_name?: string | null;
  action_btn_name?: string | null;
  subject: string | null;
  disable: number;
  moderate: number;
  recipients: string | null;
  from_name: string | null;
  from_address: string | null;
  reply_name: string | null;
  reply_address: string | null;
  body_html: string | null;
}

/**
 * ---------------------------------------------------------------------------
 *  THE WARNING IS NOT DECORATION
 * ---------------------------------------------------------------------------
 *
 *  `find_email_templates` has no DOMAIN column — checked against prisma/schema.prisma, where the
 *  primary key is the template id alone and no query in emailTemplatesRepository.ts filters by
 *  site. Every site on this platform therefore sends mail from the SAME rows.
 *
 *  That is survivable while one person runs every site and fatal to trust the moment it is not:
 *  an organiser editing "ticket_confirmation" for their own expo would silently change the
 *  confirmation email every other expo sends, and nothing on screen would have suggested it.
 *  Until the table grows a per-site dimension, the screen says so out loud.
 */
export function PlatformWideNotice() {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-amber-400/25 bg-amber-400/10 px-4 py-3">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
      <p className="text-xs leading-relaxed text-amber-100/90">
        <span className="font-bold">These templates are shared by every site on this platform.</span>{" "}
        The table they live in has no per-site column, so editing one here changes the mail that
        every site sends, not just this one.
      </p>
    </div>
  );
}

export function EmailTemplateTable({
  templates,
  total,
  currentPage,
  totalPages,
  basePath,
  scope,
  hidden,
  query,
  hiddenMatches,
}: {
  templates: EmailTemplateRow[];
  total: number;
  currentPage: number;
  totalPages: number;
  basePath: string;
  scope: EmailTemplateScope;
  hidden: number;
  query: string;
  /** Matches this search found outside the expo scope, so a dead end can offer a way on. */
  hiddenMatches: number;
}) {
  /*
   * Grouped by topic, within the page.
   *
   * Not across the whole table: that would mean fetching every row to sort them and paginating in
   * memory, and the pagination is what keeps a 246-row legacy table from becoming a wall. Each
   * heading carries its own count so a group reads as "seven of these on this page" rather than
   * as a promise that the topic is complete.
   */
  const groups = [
    ...EMAIL_TEMPLATE_TOPICS.map((topic) => ({
      key: topic.key,
      label: topic.label,
      rows: templates.filter((row) => topicForTemplate(row)?.key === topic.key),
    })),
    {
      key: "other",
      label: "Other platform templates",
      rows: templates.filter((row) => topicForTemplate(row) === null),
    },
  ].filter((group) => group.rows.length > 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-brand-pink">Organiser</p>
          <h1 className="mt-2 text-3xl font-bold text-white">Email Templates</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
            {query
              ? `${total} template${total === 1 ? "" : "s"} matching “${query}”${scope === "expo" ? ", among the ones this expo sends" : ""}.`
              : scope === "expo"
                ? `The ${total} template${total === 1 ? "" : "s"} this expo sends — visitors, exhibitors, speakers, sponsors, registration and the event itself. Open one to edit its subject, sender and HTML body.`
                : `Every one of the ${total} row${total === 1 ? "" : "s"} in the templates table, including flows this app does not use.`}
          </p>
        </div>

        <Link
          href={`${basePath}/new`}
          className="inline-flex shrink-0 items-center gap-2 rounded-full bg-gradient-to-r from-brand-purple to-brand-pink px-6 py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg transition hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          New template
        </Link>
      </div>

      {/*
        * A GET FORM, NOT A CLIENT COMPONENT.
        *
        * The query lives in the URL, which is what makes a search shareable, bookmarkable, and
        * survivable across a browser back button — and it keeps the filtering in SQL, where the
        * pagination and the counts can stay honest. A client-side filter over the current page
        * would search twenty of 246 rows and confidently report nothing found.
        *
        * `page` is deliberately absent: a new search starts at page one, because landing on
        * page 4 of a result set with two pages shows an empty screen.
        */}
      <form method="get" action={basePath} className="flex flex-wrap items-center gap-2">
        {scope === "all" && <input type="hidden" name="all" value="1" />}

        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Search by name, id or subject…"
            aria-label="Search templates"
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-2.5 pl-10 pr-3 text-sm text-white placeholder:text-white/35 focus:border-brand-pink/50 focus:outline-none focus:ring-1 focus:ring-brand-pink/40"
          />
        </div>

        <button
          type="submit"
          className="rounded-full border border-white/15 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white/80 transition hover:border-brand-pink/50 hover:text-white"
        >
          Search
        </button>

        {query && (
          <Link
            href={scope === "all" ? `${basePath}?all=1` : basePath}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-white/50 transition hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </Link>
        )}
      </form>

      <PlatformWideNotice />

      {/*
        * The escape hatch, and why it is not optional.
        *
        * This screen is the only way to edit these rows. A filter with no way past it turns
        * "not shown" into "cannot be fixed" the first time something is categorised oddly in a
        * legacy table nobody wrote the categories for. It stays small and out of the way.
        */}
      {scope === "expo" && !query && hidden > 0 && (
        <p className="text-xs text-zinc-600">
          {hidden} platform template{hidden === 1 ? " is" : "s are"} hidden because{" "}
          {hidden === 1 ? "it belongs" : "they belong"} to flows this expo does not use.{" "}
          <Link href={`${basePath}?all=1`} className="font-bold text-zinc-400 underline hover:text-white">
            Show everything
          </Link>
        </p>
      )}

      {scope === "all" && (
        <p className="text-xs text-zinc-600">
          Showing every row in the table.{" "}
          <Link href={basePath} className="font-bold text-zinc-400 underline hover:text-white">
            Show only this expo&apos;s templates
          </Link>
        </p>
      )}

      {groups.length === 0 ? (
        <div className="rounded-2xl border border-white/10 px-4 py-12 text-center text-sm text-zinc-500">
          {query ? (
            <>
              <p>
                Nothing matching <span className="font-bold text-white">{query}</span>
                {scope === "expo" ? " among this expo's templates" : ""}.
              </p>
              {/*
                * The one case worth spelling out: the template exists, the scope filter is what is
                * hiding it. Saying only "nothing found" would be true and would send somebody
                * looking for a template that is right there.
                */}
              {hiddenMatches > 0 && (
                <p className="mt-2 text-zinc-500">
                  {hiddenMatches} platform template{hiddenMatches === 1 ? "" : "s"} elsewhere in the
                  table match{hiddenMatches === 1 ? "es" : ""} it.{" "}
                  <Link
                    href={`${basePath}?all=1&q=${encodeURIComponent(query)}`}
                    className="font-bold text-zinc-300 underline hover:text-white"
                  >
                    Search everything
                  </Link>
                </p>
              )}
            </>
          ) : (
            <p>No templates on this page.</p>
          )}
        </div>
      ) : (
        <div className="space-y-10">
          {groups.map((group) => (
            <section key={group.key}>
              <div className="mb-4 flex items-baseline gap-2 border-b border-white/5 pb-3">
                <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">
                  {group.label}
                </h2>
                <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-bold text-zinc-500">
                  {group.rows.length}
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {group.rows.map((template) => (
                  <TemplateCard key={template.id} template={template} basePath={basePath} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        basePath={basePath}
        query={{ ...(scope === "all" ? { all: "1" } : {}), ...(query ? { q: query } : {}) }}
      />
    </div>
  );
}

/**
 * ---------------------------------------------------------------------------
 *  ONE TEMPLATE
 * ---------------------------------------------------------------------------
 *
 *  THE WHOLE CARD IS THE LINK, which the site cards on /hub/sites deliberately are not. The
 *  difference is that those carry four destinations - the site, the editor, the address field,
 *  Delete - and nesting those inside one anchor is invalid markup that traps keyboard users. This
 *  card has exactly one destination, so making the whole thing the target is both valid and the
 *  larger hit area.
 *
 *  The subject line does the job the reference design gives to a description. It is the closest
 *  thing this table has to "what this email says", and it is the field most often being checked.
 *  When it is unset the card says so plainly rather than sitting empty, because an unset subject
 *  on a live template is a defect worth noticing from the grid.
 */
function TemplateCard({ template, basePath }: { template: EmailTemplateRow; basePath: string }) {
  const title = templateTitle(template);
  const disabled = !!template.disable;

  return (
    <Link
      href={`${basePath}/${template.id}`}
      className="group flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:-translate-y-0.5 hover:border-brand-pink/40 hover:bg-white/[0.06]"
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition ${
            disabled
              ? "bg-white/5 text-zinc-600"
              : "bg-brand-pink/10 text-brand-pink group-hover:bg-brand-pink/20"
          }`}
        >
          <Mail className="h-[18px] w-[18px]" />
        </span>

        <span
          className={
            disabled
              ? "rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-zinc-600"
              : "rounded-full border border-emerald-400/30 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-300"
          }
        >
          {disabled ? "Disabled" : "Active"}
        </span>
      </div>

      <h3 className="mt-4 text-base font-bold leading-snug text-white transition group-hover:text-brand-pink">
        {title}
      </h3>

      <p className="mt-1.5 break-all font-mono text-[10px] leading-relaxed text-zinc-600">
        {template.id}
      </p>

      <p className="mt-3 text-sm leading-relaxed text-zinc-400">
        {template.subject || <span className="text-zinc-600 italic">No subject set</span>}
      </p>

      <span className="mt-auto pt-5 text-[11px] font-black uppercase tracking-wider text-zinc-600 transition group-hover:text-brand-pink">
        Edit template &rarr;
      </span>
    </Link>
  );
}
