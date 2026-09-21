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
  ArrowRight,
} from "lucide-react";
import { authOptions } from "@/lib/auth/options";
import { getDomain } from "@/lib/services/domain";
import { getEventMemberContext, roleLabel } from "@/lib/services/eventAccess";
import { getEventSummaryData } from "@/lib/services/eventSummary";
import EventAdminNavbar from "@/components/EventAdminNavbar";
import { getHubAccess, getSitesHubAccess } from "@/lib/hub/access";
import { DEFAULT_EVENT_ID } from "@/lib/site-config";
import { getEventById } from "@/lib/services/events";
import { staticAssetUrl } from "@/lib/assets";

/** The event banner, reused as the members hero backdrop. Same asset the public site uses. */
const HERO_IMAGE = staticAssetUrl(
  "https://digitalageexpo.com/files/listing_pages/818073-dae_index_top_banner.jpg"
);

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
  // Same reason as (event)/layout.tsx — lets the navbar link "View My Booth" straight to the
  // public lobby instead of the members-side redirect page.
  const navEvent = await getEventById(eventId);
  // Two questions, not one: getHubAccess says whether this person may use the Hub's screens at
  // all (Email Templates, on every site); getSitesHubAccess adds "and is this the parent site",
  // which is what site management needs. Both run here rather than in the client navbar, which
  // could only work either out from data already shipped to the browser.
  const [hubAccess, sitesAccess] = await Promise.all([getHubAccess(), getSitesHubAccess()]);

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
      {/*
        Hero. The photograph is a positioned layer with a horizontal scrim rather than the
        panel's own background-image: dimming a full-bleed image enough to read a name and a
        paragraph over it flattens the picture, while leaving it bright enough to see puts the
        copy on top of a crowd. Two layers, two jobs. The scrim is built from
        --color-surface-1-rgb so the CP Theme screen still owns the ground tone.
      */}
      <div data-reveal className="relative mb-8 overflow-hidden rounded-3xl border border-white/10 shadow-[0_24px_60px_-28px_rgba(0,0,0,0.95)]">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('${HERO_IMAGE}')` }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgb(var(--color-surface-1-rgb)) 0%, rgb(var(--color-surface-1-rgb) / 0.94) 42%, rgb(var(--color-surface-1-rgb) / 0.55) 100%)",
          }}
        />
        <div className="pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-brand-purple/25 blur-[110px]" />

        <div className="relative z-10 flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-purple to-brand-pink shadow-lg shadow-brand-pink/25 ring-1 ring-white/15">
              <User className="h-7 w-7 text-white" />
            </span>

            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-pink">
                Event Member Area
              </p>
              <h2 className="mt-1 text-xl font-black uppercase tracking-tight text-white sm:text-2xl">
                Signed in as {roleLabel(context.role)}
              </h2>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-white">
                  {session?.user?.name || session?.user?.email || "Oliver Organiser"}
                </span>
                <span className="inline-flex items-center rounded-full border border-brand-pink/30 bg-brand-pink/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-brand-pink">
                  {roleLabel(context.role)}
                </span>
              </div>
              <p className="mt-2 max-w-md text-xs leading-relaxed text-zinc-300 sm:text-[13px]">
                Manage your event, connect with attendees, and make {event.title} a success.
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-start gap-3 lg:items-end">
            <Link
              href="/members/index?callbackUrl=/members/user_event_summary"
              className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-200 shadow-lg transition-all hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
            >
              Switch Role / Login
            </Link>
          </div>
        </div>
      </div>

      {/* The navbar now carries its own card frame, so the wrapper no longer adds a second
          padded, bordered glass panel around it — that nesting was the boxy triple border. */}
      <div className="mb-10">
        <EventAdminNavbar
          eventId={eventId}
          eventSlug={navEvent?.friendly_url}
          canAccessHub={hubAccess.ok}
          canManageSites={sitesAccess.ok}
        />
      </div>

      {/* Main Two-Column Layout */}
      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-12">
        {/* Left Column */}
        <div className="space-y-10 lg:col-span-6">
          {/* Card 1: Event Details */}
          <div data-reveal className="glass-panel rounded-3xl shadow-2xl overflow-hidden border-white/10">
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

            {/*
              Mockup layout: thumbnail left, identity right. The previous label/value table gave
              the event title the same visual weight as the word "TITLE:" beside it, so nothing on
              the card read as the subject. The event banner is reused as the thumbnail because the
              summary query returns no image field and adding one would be a backend change.
              The second badge is the real location, not a hardcoded "Virtual Event" string.
            */}
            <div className="p-6">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                <div className="relative h-28 w-full shrink-0 overflow-hidden rounded-2xl ring-1 ring-white/10 sm:h-24 sm:w-36">
                  <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url('${HERO_IMAGE}')` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                </div>

                <div className="min-w-0 flex-1">
                  <h4 className="text-lg font-black leading-tight tracking-tight text-white sm:text-xl">
                    {event.title}
                  </h4>
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-400">
                      <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                      {event.status}
                    </span>
                    {event.location && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[10px] font-black uppercase tracking-widest text-zinc-300">
                        <MapPin className="h-3 w-3" aria-hidden="true" />
                        {event.location}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-3 border-t border-white/[0.07] pt-6 sm:grid-cols-2">
                {[
                  { label: "From", value: event.dateStart },
                  { label: "To", value: event.dateEnd },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.03] px-4 py-3"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-purple/15 ring-1 ring-brand-purple/25">
                      <Calendar className="h-4 w-4 text-brand-pink" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[10px] font-black uppercase tracking-widest text-zinc-500">
                        {row.label}
                      </span>
                      <span className="block truncate text-sm font-semibold text-white">
                        {row.value || "\u2014"}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Card 2: Welcome Panel */}
          <div data-reveal className="glass-panel rounded-3xl shadow-2xl overflow-hidden border-white/10">
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

              {/*
                Same change as the Event Details card: the label column was wider than most of
                the values it labelled, so "CONTACT NAME:" out-weighed the name itself. Icon +
                caption + value keeps the meaning and gives the value the emphasis.
              */}
              <div className="grid grid-cols-1 gap-3 border-t border-white/5 pt-6 sm:grid-cols-2">
                {[
                  { label: "Contact Name", value: event.contactName, Icon: User },
                  { label: "Phone", value: event.phone, Icon: Phone },
                  { label: "Venue", value: event.venue, Icon: Building2 },
                  { label: "Location", value: event.location, Icon: MapPin },
                ].map(({ label, value, Icon }) => (
                  <div
                    key={label}
                    className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.03] px-4 py-3"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] ring-1 ring-white/10">
                      <Icon className="h-4 w-4 text-zinc-300" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[10px] font-black uppercase tracking-widest text-zinc-500">
                        {label}
                      </span>
                      <span className="block truncate text-sm font-semibold text-white">
                        {value || "\u2014"}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Card 3: Event Todo List Details */}
          <div data-reveal className="glass-panel rounded-3xl shadow-2xl overflow-hidden border-white/10">
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
                    data-reveal
                    style={{ backgroundColor: menu.bgColor }}
                    className="group relative flex min-h-[132px] flex-col items-center justify-center overflow-hidden rounded-2xl p-5 text-center text-white shadow-lg ring-1 ring-white/10 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_44px_-16px_rgba(0,0,0,0.95)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                  >
                    {/*
                      Each tile already carried its own `bgColor`, but it was painted at
                      opacity-10 over bg-zinc-900/40 — which is why sixteen differently-coloured
                      tiles all rendered as the same dark square. The colour is the fill now; this
                      overlay only adds depth, and its dark bottom-right also lifts white-on-
                      mid-tone contrast exactly where the label sits.
                    */}
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-black/40" />

                    <Icon className="relative mb-3 h-9 w-9 stroke-[1.5] transition-transform duration-300 group-hover:scale-110" />
                    <span className="relative text-[10px] font-black uppercase leading-tight tracking-widest">
                      {menu.label}
                    </span>
                    <ArrowRight
                      className="pointer-events-none absolute bottom-3 right-3 h-3.5 w-3.5 opacity-60 transition-transform duration-300 group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
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
