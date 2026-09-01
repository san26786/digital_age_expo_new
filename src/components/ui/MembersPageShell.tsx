import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import { Home, ChevronRight, LayoutGrid } from "lucide-react";
import {
  PAGE_SHELL,
  PANEL,
  BREADCRUMB_NAV,
  BREADCRUMB_LINK,
  BREADCRUMB_SEPARATOR,
  BREADCRUMB_CURRENT,
  PAGE_HEADER_ROW,
  PAGE_HEADER_ICON,
  PAGE_HEADER_PILL,
  PAGE_TITLE,
  PAGE_SUBTITLE,
} from "@/components/ui/membersTheme";

/**
 * ---------------------------------------------------------------------------
 * The Members page frame.
 * ---------------------------------------------------------------------------
 *
 * Structure copied from `/members/manage_awards_partner`, the agreed reference:
 * breadcrumb, then a glass panel whose first row is a gradient icon tile, the
 * page title, a one-line description and a status pill.
 *
 * Every Members page renders through this so the frame exists in ONE place. The
 * pages that used to hand-roll a header each drifted a little — five different
 * h1 sizes, three different eyebrow treatments — and that drift is exactly what
 * this component removes. It is presentational only: it takes strings and
 * children and renders markup, so adopting it cannot change what a page does.
 */

export interface MembersPageShellProps {
  /** Page title. Also the last breadcrumb segment unless `breadcrumb` overrides it. */
  title: string;
  /** One sentence under the title saying what the page is for. */
  description?: ReactNode;
  /**
   * Lucide icon for the gradient tile. Defaults to a neutral grid so a page that
   * has not chosen one still renders the reference layout rather than a hole.
   */
  icon?: ComponentType<{ className?: string }>;
  /** Text of the pill at the right of the header row. Omit to hide the pill. */
  pill?: string;
  /** Optional icon inside the pill. */
  pillIcon?: ComponentType<{ className?: string }>;
  /** Appended to the title as "(Event #1474)" when supplied. */
  eventId?: number;
  /** Overrides the trailing breadcrumb label when it should differ from the title. */
  breadcrumbLabel?: string;
  /**
   * Extra controls rendered at the right of the header row, before the pill —
   * for the handful of pages whose primary action belongs in the header rather
   * than in a toolbar.
   */
  actions?: ReactNode;
  /**
   * Page body. Rendered inside the glass panel by default; set `bare` when the
   * page supplies its own panels and wants them directly on the background.
   */
  children: ReactNode;
  /** Render children outside the panel, keeping only the breadcrumb and header. */
  bare?: boolean;
}

export function MembersBreadcrumb({
  label,
  eventId,
}: {
  label: string;
  eventId?: number;
}) {
  return (
    <nav className={BREADCRUMB_NAV} aria-label="Breadcrumb">
      <Link href="/" className={`flex items-center gap-1 ${BREADCRUMB_LINK}`}>
        <Home className="h-3.5 w-3.5" />
        Home
      </Link>
      <ChevronRight className={BREADCRUMB_SEPARATOR} />
      <Link href="/members/user_event_summary" className={BREADCRUMB_LINK}>
        My Account
      </Link>
      <ChevronRight className={BREADCRUMB_SEPARATOR} />
      <span className={BREADCRUMB_CURRENT}>{label}</span>
      {eventId ? <span className="text-zinc-500"> (Event #{eventId})</span> : null}
    </nav>
  );
}

export function MembersPageHeader({
  title,
  description,
  icon: Icon = LayoutGrid,
  pill,
  pillIcon: PillIcon,
  actions,
}: Omit<MembersPageShellProps, "children" | "bare" | "breadcrumbLabel" | "eventId">) {
  return (
    <div className={PAGE_HEADER_ROW}>
      <div className="flex items-center gap-4">
        <div className={PAGE_HEADER_ICON}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className={PAGE_TITLE}>{title}</h1>
          {description ? <p className={PAGE_SUBTITLE}>{description}</p> : null}
        </div>
      </div>

      {(actions || pill) && (
        <div className="flex flex-wrap items-center gap-3">
          {actions}
          {pill ? (
            <span className={PAGE_HEADER_PILL}>
              {PillIcon ? <PillIcon className="h-3 w-3" /> : null}
              {pill}
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}

export function MembersPageShell({
  title,
  description,
  icon,
  pill,
  pillIcon,
  eventId,
  breadcrumbLabel,
  actions,
  children,
  bare = false,
}: MembersPageShellProps) {
  const header = (
    <MembersPageHeader
      title={title}
      description={description}
      icon={icon}
      pill={pill}
      pillIcon={pillIcon}
      actions={actions}
    />
  );

  return (
    <div className={PAGE_SHELL}>
      <MembersBreadcrumb label={breadcrumbLabel ?? title} eventId={eventId} />

      {bare ? (
        <>
          {/* `bare` keeps the header on the same glass surface as the reference, but lets the
              page lay its own panels out on the background instead of nesting them. */}
          <div className="glass-panel rounded-2xl p-8 shadow-2xl border border-white/10">{header}</div>
          {children}
        </>
      ) : (
        <div className={PANEL}>
          {header}
          {children}
        </div>
      )}
    </div>
  );
}
