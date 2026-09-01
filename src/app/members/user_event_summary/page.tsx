import { optionalNumericParam } from "@/lib/searchParams";
import Link from "next/link";
import { getServerSession } from "next-auth";
import {
  Users,
  Bell,
  CalendarClock,
  Store,
  Info,
  FileText,
  HelpCircle,
  Building2,
  Award,
  Mic,
  UserCheck,
  CheckSquare,
  Ticket,
  BarChart3,
  Calendar,
  Phone,
  MapPin,
  User,
  Edit,
  Lock,
  Unlock,
  CheckCircle2,
  PlusCircle,
  Star,
  Megaphone,
  Mail,
  FileCheck,
} from "lucide-react";
import { authOptions } from "@/lib/auth/options";
import { getDomain } from "@/lib/services/domain";
import { getEventMemberContext, roleLabel } from "@/lib/services/eventAccess";
import { getEventSummaryData } from "@/lib/services/eventSummary";
import EventAdminNavbar from "@/components/EventAdminNavbar";
import { DEFAULT_EVENT_ID } from "@/lib/site-config";

export const metadata = { title: "Event Summary" };

interface ActionMenuItem {
  href: string;
  label: string;
  icon: typeof Users;
  bgColor: string;
  roles?: string[];
}

const ACTION_MENUS: ActionMenuItem[] = [
  { href: "/members/event_member", label: "Team Members", icon: Users, bgColor: "var(--color-indigo-700)" },
  { href: "/members/manage_stand_assets", label: "My Stand Assets", icon: Store, bgColor: "var(--color-sky-600)" },
  { href: "/members/view_exhibitor", label: "Exhibitors", icon: Building2, bgColor: "var(--color-blue-700)", roles: ["organiser"] },
  { href: "/members/manage_speakers", label: "Speakers", icon: Mic, bgColor: "var(--color-emerald-600)", roles: ["organiser"] },
  { href: "/members/event_schedule_meeting", label: "Meetings", icon: CalendarClock, bgColor: "var(--color-violet-600)" },
  { href: "/members/event_checklist", label: "Checklist", icon: CheckSquare, bgColor: "var(--color-orange-600)" },
  { href: "/members/event_faq", label: "FAQs", icon: HelpCircle, bgColor: "var(--color-teal-600)" },
  { href: "/members/event_about_us", label: "About Show", icon: Info, bgColor: "var(--color-pink-600)", roles: ["organiser"] },
  { href: "/members/event_notifications", label: "Notifications", icon: Bell, bgColor: "var(--color-indigo-600)" },
  { href: "/members/view_sponsor", label: "Sponsors", icon: Award, bgColor: "var(--color-amber-600)", roles: ["organiser"] },
  { href: "/members/event_ticket_buyers", label: "Ticket Buyers", icon: Ticket, bgColor: "var(--color-rose-600)", roles: ["organiser"] },
  { href: "/members/reports", label: "Reports", icon: BarChart3, bgColor: "var(--color-gray-700)", roles: ["organiser"] },
  { href: "/members/view_visitor", label: "Visitors", icon: UserCheck, bgColor: "var(--color-teal-700)", roles: ["organiser"] },
  { href: "/members/event_show_info", label: "Show Info", icon: FileText, bgColor: "var(--color-yellow-800)" },
  { href: "/members/event_marketing_tools", label: "Marketing Tools", icon: Megaphone, bgColor: "var(--color-pink-500)" },
  { href: "/members/event_mail_logs", label: "Email Logs", icon: Mail, bgColor: "var(--color-blue-600)", roles: ["organiser"] },
  { href: "/members/event_letter_logs", label: "Letter Logs", icon: FileCheck, bgColor: "var(--color-emerald-600)", roles: ["organiser"] },
];

export default async function UserEventSummaryPage({
  searchParams,
}: {
  searchParams?: Promise<{ event_id?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : {};
  const queryEventId = optionalNumericParam(resolvedParams.event_id);

  const session = await getServerSession(authOptions);
  // Default to demo Organiser/Exhibitor account (-30) if no active session cookie in iframe
  const userId = session?.user?.id ? Number(session.user.id) : -30;

  const domain = await getDomain();
  const eventId = queryEventId || domain?.event_id || DEFAULT_EVENT_ID;

  const context = (await getEventMemberContext(eventId, userId)) ?? {
    role: "organiser",
    eventId,
    userId,
  };

  const summary = await getEventSummaryData(context, eventId);
  const { event, stats, todoList } = summary;

  const filteredMenus = ACTION_MENUS.filter(
    (m) => !m.roles || m.roles.includes(context.role)
  );

  const progressBgClass =
    todoList.completedPercentage < 35
      ? "bg-red-500"
      : todoList.completedPercentage < 60
      ? "bg-amber-500"
      : "bg-emerald-500";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 min-h-screen bg-zinc-950 text-white">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-8">
        <div className="space-y-1">
          <p className="text-xs font-black uppercase tracking-widest text-brand-pink">Event Member Area</p>
          <div className="flex flex-wrap items-center gap-4">
            <h2 className="text-2xl font-black uppercase text-white tracking-tight">
              Signed in as <span className="text-brand-purple">{roleLabel(context.role)}</span> 
              <span className="text-zinc-400 text-sm ml-2 normal-case font-medium">({session?.user?.name || session?.user?.email || "Oliver Organiser"})</span>
            </h2>
            <Link
              href="/members/index?callbackUrl=/members/user_event_summary"
              className="rounded-full bg-white/5 border border-white/10 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-300 hover:bg-white/10 hover:text-white transition-all shadow-xl"
            >
              Switch Role / Login
            </Link>
          </div>
        </div>
      </div>

      <div className="glass-panel rounded-2xl p-6 shadow-2xl mb-10">
        <EventAdminNavbar eventId={eventId} />
      </div>

      {/* Main Two-Column Layout */}
      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-12">
        {/* Left Column */}
        <div className="space-y-10 lg:col-span-6">
          {/* Card 1: Event Details */}
          <div className="glass-panel rounded-3xl shadow-2xl overflow-hidden border-white/10">
            <div className="border-b border-white/10 bg-white/5 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-black uppercase tracking-[0.2em] text-zinc-200 text-xs">
                Event Details
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                {context.role === "organiser" && (
                  <>
                    <Link
                      href={`/members/event_details?event_id=${eventId}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-300 hover:bg-white/10 hover:text-white transition shadow-lg"
                    >
                      <Edit className="h-3 w-3" /> Edit
                    </Link>
                  </>
                )}
                <Link
                  href="#"
                  className="btn-brand-gradient inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-[10px] font-black uppercase tracking-widest text-white shadow-2xl transition"
                >
                  <Star className="h-3 w-3 text-amber-300 fill-amber-300" /> Profile Event
                </Link>
              </div>
            </div>

            <div className="p-6">
              <table className="w-full text-left text-sm text-zinc-300">
                <tbody className="divide-y divide-white/5">
                  <tr>
                    <td className="py-4 font-bold text-zinc-500 w-1/3 uppercase tracking-wider text-[10px]">Title:</td>
                    <td className="py-4 font-black text-white text-base tracking-tight">{event.title}</td>
                  </tr>
                  <tr>
                    <td className="py-4 font-bold text-zinc-500 uppercase tracking-wider text-[10px]">Status:</td>
                    <td className="py-4">
                      <span className="inline-flex items-center rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-400 shadow-lg">
                        {event.status}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-4 font-bold text-zinc-500 uppercase tracking-wider text-[10px]">From:</td>
                    <td className="py-4 font-medium text-zinc-200">{event.dateStart}</td>
                  </tr>
                  <tr>
                    <td className="py-4 font-bold text-zinc-500 uppercase tracking-wider text-[10px]">To:</td>
                    <td className="py-4 font-medium text-zinc-200">{event.dateEnd}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Card 2: Welcome Panel */}
          <div className="glass-panel rounded-3xl shadow-2xl overflow-hidden border-white/10">
            <div className="border-b border-white/10 bg-white/5 px-6 py-4 flex items-center justify-between">
              <h3 className="font-black uppercase tracking-[0.2em] text-zinc-200 text-xs">
                Welcome to {event.title}
              </h3>
              {context.role === "organiser" && (
                <Link
                  href={`/members/event_details?event_id=${eventId}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-300 hover:bg-white/10 hover:text-white transition shadow-lg"
                >
                  <Edit className="h-3 w-3" /> Edit
                </Link>
              )}
            </div>

            <div className="p-6 space-y-6">
              <p className="text-sm leading-relaxed text-zinc-400 font-medium">
                {event.descriptionShort}
              </p>

              <div className="pt-6 border-t border-white/5">
                <table className="w-full text-left text-sm text-zinc-300">
                  <tbody className="divide-y divide-white/5">
                    <tr>
                      <td className="py-3 font-bold text-zinc-500 w-1/3 uppercase tracking-wider text-[10px]">Contact Name:</td>
                      <td className="py-3 font-semibold text-zinc-100">{event.contactName}</td>
                    </tr>
                    <tr>
                      <td className="py-3 font-bold text-zinc-500 uppercase tracking-wider text-[10px]">Phone:</td>
                      <td className="py-3 font-semibold text-zinc-100">{event.phone}</td>
                    </tr>
                    <tr>
                      <td className="py-3 font-bold text-zinc-500 uppercase tracking-wider text-[10px]">Venue:</td>
                      <td className="py-3 font-semibold text-zinc-100">{event.venue}</td>
                    </tr>
                    <tr>
                      <td className="py-3 font-bold text-zinc-500 uppercase tracking-wider text-[10px]">Location:</td>
                      <td className="py-3 font-semibold text-zinc-100">{event.location}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Card 3: Event Todo List Details */}
          <div className="glass-panel rounded-3xl shadow-2xl overflow-hidden border-white/10">
            <div className="border-b border-white/10 bg-white/5 px-6 py-4">
              <h3 className="font-black uppercase tracking-[0.2em] text-zinc-200 text-xs">
                Event Todo List Details
              </h3>
            </div>

            <div className="p-6 space-y-8">
              {/* Progress bar */}
              <div>
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 mb-3">
                  <span>Profile Progress</span>
                  <span className="text-brand-pink">{todoList.completedPercentage}% Complete</span>
                </div>
                <div className="h-5 w-full rounded-full bg-white/5 overflow-hidden p-1 shadow-inner border border-white/5">
                  <div
                    className={`h-full rounded-full ${progressBgClass} transition-all duration-1000 shadow-lg`}
                    style={{ width: `${todoList.completedPercentage}%` }}
                  />
                </div>
              </div>

              {/* Pending Steps summary */}
              {todoList.pending.length > 0 && (
                <div className="rounded-2xl bg-amber-500/5 p-5 border border-amber-500/20 shadow-xl">
                  <span className="font-black text-amber-400 uppercase tracking-widest text-[10px] block mb-3">
                    Steps Pending ({todoList.pending.length}):
                  </span>
                  <div className="flex flex-wrap gap-2 text-amber-200">
                    {todoList.pending.map((item) => (
                      <span key={item.key} className="rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider">
                        {item.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Pending Tasks List */}
              {todoList.pending.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase text-brand-pink tracking-[0.2em] px-1">
                    Pending Todo List Tasks
                  </h4>
                  <ul className="divide-y divide-white/5 rounded-2xl border border-white/10 overflow-hidden bg-white/5 shadow-2xl">
                    {todoList.pending.map((task) => (
                      <li key={task.key} className="flex items-center justify-between p-4 text-xs group hover:bg-white/[0.02] transition-all">
                        <span className="font-bold text-zinc-200 tracking-wide">Enter {task.label}</span>
                        <Link
                          href={`/members/event_todo_list?event_id=${eventId}&task_type=${task.key}`}
                          className="inline-flex items-center gap-1.5 rounded-full bg-brand-purple px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-white shadow-xl hover:scale-105 transition"
                        >
                          <PlusCircle className="h-3.5 w-3.5" /> Add
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Completed Tasks List */}
              {todoList.completed.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase text-emerald-400 tracking-[0.2em] px-1">
                    Completed Todo List Tasks
                  </h4>
                  <ul className="divide-y divide-white/5 rounded-2xl border border-white/10 overflow-hidden bg-white/5 shadow-2xl">
                    {todoList.completed.map((task) => (
                      <li key={task.key} className="flex items-center justify-between p-4 text-xs group hover:bg-white/[0.02] transition-all">
                        <span className="font-bold text-zinc-400 tracking-wide line-through decoration-emerald-500/50">Verify {task.label}</span>
                        <Link
                          href={`/members/event_todo_list?event_id=${eventId}&task_type=${task.key}`}
                          className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-400 shadow-lg"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Verified
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Action Menu Grid */}
        <div className="lg:col-span-6">
          <div className="sticky top-10 glass-panel rounded-3xl p-8 shadow-2xl border-white/10 space-y-8">
            <h3 className="font-black uppercase tracking-[0.3em] text-brand-pink text-[10px] pb-4 border-b border-white/10 text-center">
              Management Portal
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {filteredMenus.map((menu) => {
                const Icon = menu.icon;
                return (
                  <Link
                    key={menu.href}
                    href={`${menu.href}?event_id=${eventId}`}
                    className="group relative flex flex-col items-center justify-center rounded-2xl p-5 text-white text-center shadow-xl transition-all duration-500 overflow-hidden min-h-[140px] aspect-square border border-white/5 bg-zinc-900/40 hover:scale-105 hover:bg-zinc-800/60 hover:border-white/20"
                  >
                    <div 
                      className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity" 
                      style={{ backgroundColor: menu.bgColor }}
                    />
                    <Icon className="h-10 w-10 mb-4 stroke-[1.5] transition-transform duration-500 group-hover:scale-110 group-hover:text-brand-pink" />
                    <span className="text-[10px] font-black uppercase tracking-widest leading-tight">
                      {menu.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
