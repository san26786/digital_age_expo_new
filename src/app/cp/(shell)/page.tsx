import {
  Award,
  Building2,
  CalendarDays,
  Eye,
  FileText,
  Mail,
  Mic2,
  Receipt,
  Send,
  ShoppingCart,
  Users,
} from "lucide-react";
import { requireCpSession } from "@/lib/cp/rbac";
import { getDashboardData, type DashboardMetric } from "@/lib/cp/dashboard/dashboardRepository";
import { StatTile } from "@/components/cp/dashboard/StatTile";
import { DonutChart, type DonutSlice } from "@/components/cp/dashboard/DonutChart";
import { colorForLabel, OTHER_SLICE_COLOR } from "@/components/cp/dashboard/statusColors";

export const dynamic = "force-dynamic";

// Legacy free-text status columns (find_events_rsvp.status, find_orders.status, ...) can carry
// years of one-off junk values alongside the handful of statuses that actually matter day to
// day — a "main points" chart should surface Registered/Pending/Active/... clearly, not a
// 20-row legend of one-off strings squeezed off the card. Per the dataviz skill's categorical
// series-count ladder (soft cap at 5-6), the top 5 slices by count are shown as-is and
// everything past that is rolled into a single "Other" bucket instead of a generated hue.
const MAX_VISIBLE_SLICES = 5;

/** Drops zero-count slices, sorts largest-first, and folds any long tail beyond
 * MAX_VISIBLE_SLICES into one "Other" slice so every donut stays readable regardless of how
 * many distinct raw values the underlying column actually has. */
function toSlices(metric: DashboardMetric | null): DonutSlice[] {
  if (!metric) return [];
  const sorted = metric.breakdown
    .filter((b) => b.value > 0)
    .sort((a, b) => b.value - a.value);

  if (sorted.length <= MAX_VISIBLE_SLICES) {
    return sorted.map((b) => ({ ...b, color: colorForLabel(b.label) }));
  }

  const shown = sorted.slice(0, MAX_VISIBLE_SLICES).map((b) => ({ ...b, color: colorForLabel(b.label) }));
  const rest = sorted.slice(MAX_VISIBLE_SLICES);
  const otherValue = rest.reduce((sum, b) => sum + b.value, 0);

  return [...shown, { label: `Other (${rest.length})`, value: otherValue, color: OTHER_SLICE_COLOR }];
}

/**
 * `?denied=<slug>` is what requireCpPermission() attaches when it turns an admin away from a
 * module they lack the grant for. Nothing used to read it, so the redirect looked like the
 * sidebar link had simply thrown you back here for no reason — this renders the reason.
 */
export default async function CpDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string | string[] }>;
}) {
  const [session, data, params] = await Promise.all([
    requireCpSession(),
    getDashboardData(),
    searchParams,
  ]);
  const denied = Array.isArray(params.denied) ? params.denied[0] : params.denied;

  const stats: { label: string; value: number | string; icon: typeof Users; accent: string }[] = [
    { label: "Registered Users", value: data.users?.total ?? "—", icon: Users, accent: "var(--color-chart-series-1)" },
    { label: "Events", value: data.events?.total ?? "—", icon: CalendarDays, accent: "var(--color-chart-series-7)" },
    { label: "Email Templates", value: data.emailTemplates?.total ?? "—", icon: Mail, accent: "var(--color-chart-series-3)" },
    { label: "Exhibitors", value: data.exhibitors?.total ?? "—", icon: Building2, accent: "var(--color-chart-series-2)" },
    { label: "Speakers", value: data.speakers?.total ?? "—", icon: Mic2, accent: "var(--color-chart-series-5)" },
    { label: "Visitors", value: data.visitors?.total ?? "—", icon: Eye, accent: "var(--color-chart-series-1)" },
    { label: "Orders", value: data.orders?.total ?? "—", icon: ShoppingCart, accent: "var(--color-chart-series-4)" },
    { label: "Invoices", value: data.invoices?.total ?? "—", icon: Receipt, accent: "var(--color-chart-good)" },
    { label: "Email Log", value: data.emailLogsTotal ?? "—", icon: Send, accent: "var(--color-chart-series-3)" },
    { label: "Letter Log", value: data.letterLogsTotal ?? "—", icon: FileText, accent: "var(--color-chart-series-7)" },
    { label: "Sponsors", value: data.sponsors?.total ?? "—", icon: Award, accent: "var(--color-chart-series-8)" },
  ];

  // A genuine part-to-whole composition (unlike, say, "exhibitors vs orders", these four really
  // are parts of one meaningful whole: everyone taking part in the event) — computed from the
  // same totals above rather than a fresh query.
  const participantsMix: DonutSlice[] = (
    [
      { label: "Exhibitors", value: data.exhibitors?.total ?? 0 },
      { label: "Speakers", value: data.speakers?.total ?? 0 },
      { label: "Sponsors", value: data.sponsors?.total ?? 0 },
      { label: "Visitors", value: data.visitors?.total ?? 0 },
    ] satisfies { label: string; value: number }[]
  )
    .filter((s) => s.value > 0)
    .map((s) => ({ ...s, color: colorForLabel(s.label) }));
  const participantsTotal = participantsMix.reduce((sum, s) => sum + s.value, 0);

  const donuts: { key: string; title: string; subtitle: string; metric: DashboardMetric | null }[] = [
    { key: "users", title: "Users by Status", subtitle: "find_users.user_status", metric: data.users },
    { key: "events", title: "Events by Status", subtitle: "find_events.status", metric: data.events },
    { key: "exhibitors", title: "Exhibitors by Status", subtitle: "find_event_exhibitor.status", metric: data.exhibitors },
    { key: "speakers", title: "Speakers by Status", subtitle: "find_speakers.status", metric: data.speakers },
    { key: "sponsors", title: "Sponsors by Status", subtitle: "find_event_sponsorer.status", metric: data.sponsors },
    { key: "visitors", title: "Visitors (RSVPs) by Status", subtitle: "find_events_rsvp.status", metric: data.visitors },
    { key: "orders", title: "Orders by Status", subtitle: "find_orders.status", metric: data.orders },
    { key: "invoices", title: "Invoices by Status", subtitle: "find_invoices.status", metric: data.invoices },
    { key: "emailTemplates", title: "Email Templates", subtitle: "Enabled vs disabled", metric: data.emailTemplates },
  ];

  return (
    <div className="space-y-8">
      {denied && (
        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 text-xs leading-relaxed text-amber-300">
          <span className="font-bold">You were sent back here</span> because your role
          (&quot;{session.groupName}&quot;) doesn&apos;t include{" "}
          <code className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-[11px]">{denied}</code>.
          An administrator can grant it under Roles &amp; Permissions.
        </div>
      )}
      <div>
        <h1 className="text-xl font-black uppercase tracking-wider text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Welcome back, {session.name}. You&apos;re signed in as {session.groupName}. Every figure below is
          read live from the database.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {stats.map((s) => (
          <StatTile key={s.label} icon={s.icon} label={s.label} value={s.value} accent={s.accent} />
        ))}
      </div>

      <div>
        <h2 className="text-sm font-black uppercase tracking-wider text-zinc-300">Composition &amp; Status Breakdown</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Each chart is a live part-to-whole split fetched from the database — a card reading &quot;No data
          yet&quot; means that table has no rows yet, not a failed query.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <DonutChart
            title="Event Participants Mix"
            subtitle="Exhibitors + speakers + sponsors + visitors"
            total={participantsTotal}
            slices={participantsMix}
          />
          {donuts.map((d) => (
            <DonutChart
              key={d.key}
              title={d.title}
              subtitle={d.metric ? d.subtitle : "Unavailable — check schema"}
              total={d.metric?.total ?? 0}
              slices={toSlices(d.metric)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
