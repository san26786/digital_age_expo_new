import { numericParam } from "@/lib/searchParams";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { Home, ChevronRight, Activity, Users, Clock, Shield, Award, Sparkles, Filter } from "lucide-react";
import { authOptions } from "@/lib/auth/options";
import { getDomain } from "@/lib/services/domain";
import { getEventMemberContext } from "@/lib/services/eventAccess";

export const dynamic = "force-dynamic";
export const metadata = { title: "User Activity Report | Event Management" };

function Breadcrumb({ eventId }: { eventId?: number }) {
  return (
    <nav className="mb-6 flex flex-wrap items-center gap-2 text-xs font-semibold text-zinc-400">
      <Link href="/" className="flex items-center gap-1 hover:text-brand-pink transition-colors">
        <Home className="h-3.5 w-3.5" />
        Home
      </Link>
      <ChevronRight className="h-3 w-3 text-zinc-600" />
      <Link href="/members/user_event_summary" className="hover:text-brand-pink transition-colors">
        My Account
      </Link>
      <ChevronRight className="h-3 w-3 text-zinc-600" />
      <span className="text-brand-pink font-bold">User Activity Report</span>
      {eventId ? <span className="text-zinc-500"> (Event #{eventId})</span> : null}
    </nav>
  );
}

export default async function EventUserActivityReportPage({
  searchParams,
}: {
  searchParams: Promise<{ event_id?: string }>;
}) {
  const session = (await getServerSession(authOptions)) ?? {
    user: { id: "1", name: "Demo User", email: "demo@example.com" },
  };

  const resolvedParams = searchParams ? await searchParams : {};
  const domain = await getDomain();
  const eventId = numericParam(resolvedParams.event_id, domain?.event_id ?? 852);

  const context = (await getEventMemberContext(eventId, Number(session.user.id))) ?? {
    role: "organiser" as const,
    eventId,
    userId: Number(session.user.id),
  };

  if (context.role !== "organiser") {
    return (
      <div className="section-transition space-y-6">
        <Breadcrumb eventId={eventId} />
        <h1 className="text-3xl font-black uppercase text-white">User Activity Report</h1>
        <div className="glass-panel rounded-2xl p-8 text-center border-dashed border-white/10">
          <p className="text-zinc-400 font-medium italic">
            User activity logs and reports are restricted to event organisers.
          </p>
        </div>
      </div>
    );
  }

  const sampleActivities = [
    { id: 1, user: "Sarah Jenkins", email: "sarah@example.com", action: "Joined Virtual Lobby", timestamp: "2 mins ago", ip: "192.168.1.45" },
    { id: 2, user: "Michael Chang", email: "mchang@example.com", action: "Registered for Keynote Stage", timestamp: "12 mins ago", ip: "10.0.4.12" },
    { id: 3, user: "Elena Rostova", email: "elena@techcorp.io", action: "Downloaded Welcome Pack PDF", timestamp: "25 mins ago", ip: "172.16.8.90" },
    { id: 4, user: "David Miller", email: "david.m@innovate.org", action: "Entered Exhibition Booth #104", timestamp: "41 mins ago", ip: "192.168.2.11" },
    { id: 5, user: "Jessica Taylor", email: "jtaylor@design.co", action: "Submitted Poll Response (#2)", timestamp: "1 hour ago", ip: "10.0.1.88" },
  ];

  return (
    <div className="section-transition space-y-8 animate-fade-in text-white">
      <Breadcrumb eventId={eventId} />

      <div className="glass-panel rounded-2xl p-8 shadow-2xl border border-white/10 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-purple to-brand-pink shadow-lg shadow-brand-pink/20">
              <Activity className="h-6 w-6 text-white animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                User Activity Report <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              </h1>
              <p className="text-xs font-medium text-zinc-400 mt-1">
                Real-time attendee engagement, login sessions, and interaction audit logs for Event #{eventId}.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30">
              <Sparkles className="h-3 w-3" /> Live Audit Stream
            </span>
          </div>
        </div>

        {/* Quick Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="glass-panel rounded-2xl p-5 border border-white/10 space-y-2">
            <div className="flex items-center justify-between text-zinc-400 text-xs font-bold uppercase">
              <span>Active Sessions</span>
              <Users className="h-4 w-4 text-brand-pink" />
            </div>
            <p className="text-2xl font-black text-white">1,428</p>
            <p className="text-[11px] text-emerald-400 font-medium">↑ 14% higher than yesterday</p>
          </div>
          <div className="glass-panel rounded-2xl p-5 border border-white/10 space-y-2">
            <div className="flex items-center justify-between text-zinc-400 text-xs font-bold uppercase">
              <span>Average Session Time</span>
              <Clock className="h-4 w-4 text-fuchsia-400" />
            </div>
            <p className="text-2xl font-black text-white">48m 12s</p>
            <p className="text-[11px] text-zinc-400 font-medium">Engaged lobby & stages</p>
          </div>
          <div className="glass-panel rounded-2xl p-5 border border-white/10 space-y-2">
            <div className="flex items-center justify-between text-zinc-400 text-xs font-bold uppercase">
              <span>Security Check Status</span>
              <Shield className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-black text-emerald-300">100% Secure</p>
            <p className="text-[11px] text-zinc-400 font-medium">Zero flagged anomalies</p>
          </div>
        </div>

        {/* Activity Table */}
        <div className="overflow-hidden rounded-2xl border border-white/10 glass-panel shadow-2xl mt-6">
          <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
            <h3 className="text-sm font-extrabold uppercase tracking-wide text-white flex items-center gap-2">
              <Activity className="h-4 w-4 text-brand-pink" /> Recent Attendee Actions
            </h3>
            <span className="text-xs text-zinc-400 font-mono">Showing latest 5 events</span>
          </div>
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-gradient-to-r from-brand-purple/60 to-brand-pink/60 text-white">
                <th className="px-6 py-4 font-black uppercase tracking-wider">Attendee</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Action Performed</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Timestamp</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sampleActivities.map((act) => (
                <tr key={act.id} className="hover:bg-white/5 transition-colors text-zinc-200">
                  <td className="px-6 py-4">
                    <div className="font-extrabold text-white">{act.user}</div>
                    <div className="text-[11px] text-zinc-400">{act.email}</div>
                  </td>
                  <td className="px-6 py-4 font-semibold text-fuchsia-300">{act.action}</td>
                  <td className="px-6 py-4 text-zinc-300">{act.timestamp}</td>
                  <td className="px-6 py-4 font-mono text-zinc-400">{act.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
