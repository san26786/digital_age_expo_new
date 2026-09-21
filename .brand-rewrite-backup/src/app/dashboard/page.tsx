import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/lib/auth/options";
import { getMemberProfile, getUpcomingMeetingsCount } from "@/lib/services/member";
import { Store, Presentation, Award, FileText, Sparkles, Shield, MapPin, Calendar, ExternalLink } from "lucide-react";

export const metadata = {
  title: "My Dashboard | Digital Age Expo",
};

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const userId = Number(session!.user.id);

  const [profile, upcomingMeetingsCount] = await Promise.all([
    getMemberProfile(userId),
    getUpcomingMeetingsCount(userId),
  ]);

  const isExhibitor = userId === -10;
  const isSpeaker = userId === -20;

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-indigo-950/5 pb-4">
        <div>
          <h1 className="text-2xl font-black uppercase text-indigo-950 tracking-tight sm:text-3xl">My Dashboard</h1>
          <p className="text-sm text-indigo-950/60">
            Welcome back to your event portal. Manage your sessions, schedule, and assets here.
          </p>
        </div>
        {(isExhibitor || isSpeaker) && (
          <span className="inline-flex self-start items-center gap-1.5 rounded-full bg-fuchsia-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-fuchsia-700 ring-1 ring-fuchsia-600/10">
            <Sparkles className="w-3.5 h-3.5 text-fuchsia-600" />
            Demo Mode Access
          </span>
        )}
      </div>

      {/* Primary Role-Based Portal Sections */}
      {isExhibitor && (
        <section className="rounded-2xl border border-fuchsia-600/25 bg-gradient-to-br from-fuchsia-50/40 via-white to-transparent p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="rounded-xl bg-fuchsia-600 p-2.5 text-white shadow-sm">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold font-mono text-fuchsia-600 uppercase tracking-widest block">
                    Exhibitor Portal
                  </span>
                  <h2 className="text-xl font-extrabold text-indigo-950 uppercase tracking-tight">
                    Manage Your Exhibition Stand
                  </h2>
                </div>
              </div>

              <p className="text-sm text-indigo-950/70 leading-relaxed max-w-2xl">
                You are registered as an official exhibitor for <span className="font-semibold text-indigo-950">Digital Age Expo 2026</span>. Access your allocated stand info, branding guidelines, and artwork submission portals below.
              </p>

              <div className="grid gap-4 sm:grid-cols-2 pt-2">
                <div className="rounded-xl border border-indigo-950/5 bg-white p-4">
                  <span className="text-xs font-semibold uppercase tracking-wider text-indigo-950/40">Allocated Space</span>
                  <p className="mt-1 font-bold text-indigo-950 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-fuchsia-500" />
                    Stand A12 (Tech Zone)
                  </p>
                </div>
                <div className="rounded-xl border border-indigo-950/5 bg-white p-4">
                  <span className="text-xs font-semibold uppercase tracking-wider text-indigo-950/40">Exhibiting Company</span>
                  <p className="mt-1 font-bold text-indigo-950">InnovateTech Exhibitions</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 w-full md:w-auto shrink-0 md:pt-2">
              <Link
                href="/Standartworktemplates"
                className="flex items-center justify-center gap-2 rounded-xl bg-indigo-950 hover:bg-indigo-900 text-white font-extrabold text-xs uppercase tracking-wider py-3 px-5 transition shadow-sm text-center"
              >
                <FileText className="w-4 h-4" />
                Stand Artwork Templates
              </Link>
              <Link
                href="/exhibitor-information"
                className="flex items-center justify-center gap-2 rounded-xl border border-indigo-950/15 bg-white hover:bg-slate-50 text-indigo-950 font-extrabold text-xs uppercase tracking-wider py-3 px-5 transition text-center"
              >
                Exhibitor Information Form
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {isSpeaker && (
        <section className="rounded-2xl border border-pink-500/25 bg-gradient-to-br from-pink-50/40 via-white to-transparent p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="rounded-xl bg-pink-500 p-2.5 text-white shadow-sm">
                  <Presentation className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold font-mono text-pink-500 uppercase tracking-widest block">
                    Speaker Portal
                  </span>
                  <h2 className="text-xl font-extrabold text-indigo-950 uppercase tracking-tight">
                    Keynote Speaker Console
                  </h2>
                </div>
              </div>

              <p className="text-sm text-indigo-950/70 leading-relaxed max-w-2xl">
                Your speaking session has been approved. Please verify your profile info, session details, and complete the mandatory questionnaires before the deadlines.
              </p>

              <div className="grid gap-4 sm:grid-cols-2 pt-2">
                <div className="rounded-xl border border-indigo-950/5 bg-white p-4">
                  <span className="text-xs font-semibold uppercase tracking-wider text-indigo-950/40">Approved Session</span>
                  <p className="mt-1 font-bold text-indigo-950 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-pink-500" />
                    The Next Decade of Agentic AI
                  </p>
                </div>
                <div className="rounded-xl border border-indigo-950/5 bg-white p-4">
                  <span className="text-xs font-semibold uppercase tracking-wider text-indigo-950/40">Venue & Time</span>
                  <p className="mt-1 font-bold text-indigo-950 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-pink-500" />
                    Keynote Lounge (Day 2, 11:30 AM)
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 w-full md:w-auto shrink-0 md:pt-2">
              <Link
                href="/speaker-questionaire"
                className="flex items-center justify-center gap-2 rounded-xl bg-indigo-950 hover:bg-indigo-900 text-white font-extrabold text-xs uppercase tracking-wider py-3 px-5 transition shadow-sm text-center"
              >
                <FileText className="w-4 h-4" />
                Speaker Questionnaire
              </Link>
              <Link
                href="/speakers"
                className="flex items-center justify-center gap-2 rounded-xl border border-indigo-950/15 bg-white hover:bg-slate-50 text-indigo-950 font-extrabold text-xs uppercase tracking-wider py-3 px-5 transition text-center"
              >
                View Speakers Directory
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Account Info Cards */}
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-2xl border border-indigo-950/10 bg-white p-6 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between border-b border-indigo-950/5 pb-3">
            <p className="text-xs font-black uppercase tracking-wider text-indigo-950/40">My Account Profile</p>
            <Shield className="w-4 h-4 text-indigo-950/40" />
          </div>
          <div className="mt-4 space-y-1">
            <p className="text-lg font-black text-indigo-950">
              {profile?.user_first_name} {profile?.user_last_name}
            </p>
            <p className="text-sm text-indigo-950/60 font-medium">{profile?.user_email}</p>
            {profile?.user_organization && (
              <p className="text-xs text-indigo-950/50 pt-1 font-semibold">{profile.user_organization}</p>
            )}
          </div>
          <Link
            href="/dashboard/security"
            className="mt-5 inline-block text-xs font-bold uppercase tracking-wider text-fuchsia-600 hover:text-fuchsia-500 transition-colors"
          >
            Edit security details &rarr;
          </Link>
        </div>

        <div className="rounded-2xl border border-indigo-950/10 bg-white p-6 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between border-b border-indigo-950/5 pb-3">
            <p className="text-xs font-black uppercase tracking-wider text-indigo-950/40">My Event Meetings</p>
            <Calendar className="w-4 h-4 text-indigo-950/40" />
          </div>
          <div className="mt-4">
            <p className="text-sm font-medium text-indigo-950/60">Confirmed Upcoming Meetings</p>
            <p className="mt-1 text-4xl font-black text-indigo-950">{upcomingMeetingsCount}</p>
          </div>
          <Link
            href="/dashboard/schedule"
            className="mt-5 inline-block text-xs font-bold uppercase tracking-wider text-fuchsia-600 hover:text-fuchsia-500 transition-colors"
          >
            View schedule calendar &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}

