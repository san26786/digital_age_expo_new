import { getDomain } from "@/lib/services/domain";
import { createOutageCollector } from "@/lib/db-errors";
import { DatabaseOutageNotice } from "@/components/common/DatabaseOutageNotice";
import {
  getMagazinePublicationById,
  getLatestMagazinePublication,
} from "@/lib/services/magazine";
import {
  ArrowDownToLine,
  ArrowUpRight,
  BookOpen,
  Download,
  Eye,
  FileText,
  Sparkles,
} from "lucide-react";

export const metadata = {
  title: "Exhibitor Guide & Event Magazine | Digital Age Expo",
  description:
    "Read and download the official Digital Age Expo show guide, magazine edition, and exhibitor catalog.",
};

interface Props {
  searchParams: Promise<{ id?: string }>;
}

export default async function MagazinePage({ searchParams }: Props) {
  const { id } = await searchParams;
  const domain = await getDomain();

  const requestedId = id ? Number(id) : NaN;

  // Guarded so a database refusing service (plan quota, asleep, pool exhausted) degrades
  // instead of 500-ing this route — see src/lib/db-errors.ts. Keep the collector object intact:
  // `current` is a getter, so destructuring would snapshot the still-null value.
  const collector = createOutageCollector();
  const guard = collector.guard;

  const publication = Number.isFinite(requestedId)
    ? await guard(() => getMagazinePublicationById(requestedId), null)
    : domain.event_id
      ? await guard(() => getLatestMagazinePublication(domain.event_id), null)
      : null;

  // No issue found *because* the database refused the query — say that instead of rendering the
  // page with dead download buttons.
  if (!publication && collector.current) {
    return <DatabaseOutageNotice outage={collector.current} />;
  }

  const readOnlineHref =
    publication?.issueLink || publication?.pdfUrl || undefined;

  const downloadHref = publication?.pdfUrl || undefined;

  return (
    <main className="min-h-screen overflow-hidden bg-[#050509] text-white">
      {/* =========================================================
          HERO
      ========================================================= */}
      <section className="relative overflow-hidden border-b border-white/10">
        {/* Background effects */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(124,58,237,0.22),transparent_35%),radial-gradient(circle_at_80%_20%,rgba(236,72,153,0.16),transparent_35%),linear-gradient(to_bottom,#09091a,#050509)]" />

        <div className="absolute -left-32 top-10 h-72 w-72 rounded-full bg-purple-600/10 blur-3xl" />
        <div className="absolute -right-32 bottom-0 h-72 w-72 rounded-full bg-pink-600/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-6 py-20 sm:px-8 lg:px-12 lg:py-24">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-purple-400/20 bg-purple-500/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-purple-300">
              <BookOpen className="h-4 w-4" />
              Official Digital Publication
            </div>

            <h1 className="text-4xl font-black uppercase tracking-tight sm:text-5xl lg:text-6xl">
              Show Guide{" "}
              <span className="bg-gradient-to-r from-purple-400 via-fuchsia-400 to-pink-500 bg-clip-text text-transparent">
                & Magazine
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-sm leading-7 text-zinc-400 sm:text-base">
              Explore the official Digital Age Expo publication featuring
              exhibitors, speakers, event schedules, industry insights, and
              everything you need to make the most of the event.
            </p>

            <div className="mx-auto mt-8 flex flex-wrap items-center justify-center gap-3 text-xs text-zinc-500">
              <span className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2">
                Exhibitor Directory
              </span>

              <span className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2">
                Speaker Features
              </span>

              <span className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2">
                Event Schedule
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          MAIN MAGAZINE SECTION
      ========================================================= */}
      <section className="relative px-6 py-16 sm:px-8 lg:px-12 lg:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035] shadow-2xl shadow-purple-950/20 backdrop-blur-xl">
            {/* Card glow */}
            <div className="pointer-events-none absolute -left-32 -top-32 h-72 w-72 rounded-full bg-purple-600/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-32 -right-32 h-72 w-72 rounded-full bg-pink-600/10 blur-3xl" />

            <div className="relative grid items-center gap-12 p-6 sm:p-8 lg:grid-cols-12 lg:p-12">
              {/* =====================================================
                  MAGAZINE COVER
              ===================================================== */}
              <div className="lg:col-span-5">
                <div className="group relative mx-auto max-w-md">
                  {/* Glow */}
                  <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-purple-600/20 via-fuchsia-500/10 to-pink-600/20 opacity-60 blur-2xl transition duration-500 group-hover:opacity-100" />

                  <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-br from-[#15152c] via-[#11111d] to-[#08080d] shadow-2xl">
                    {publication?.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={publication.thumbnailUrl}
                        alt="Digital Age Expo Magazine cover"
                        className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="relative flex h-full flex-col justify-between overflow-hidden p-7 sm:p-9">
                        {/* Cover background */}
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.35),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(236,72,153,0.25),transparent_40%),linear-gradient(145deg,#161633,#09090f)]" />

                        {/* Decorative circles */}
                        <div className="absolute -right-20 top-20 h-52 w-52 rounded-full border border-purple-400/10" />
                        <div className="absolute -right-10 top-30 h-32 w-32 rounded-full border border-pink-400/10" />

                        <div className="relative">
                          <div className="flex items-center justify-between">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/10">
                              <BookOpen className="h-5 w-5 text-purple-300" />
                            </div>

                            <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-zinc-300">
                              Edition 2026
                            </span>
                          </div>

                          <div className="mt-12">
                            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-pink-400">
                              Official Publication
                            </p>

                            <h2 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">
                              Digital Age
                              <span className="block bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                                Expo
                              </span>
                            </h2>

                            <div className="mt-5 h-px w-20 bg-gradient-to-r from-purple-500 to-pink-500" />

                            <p className="mt-5 max-w-xs text-xs leading-6 text-zinc-400">
                              The official show guide featuring exhibitors,
                              speakers, schedules, insights and event
                              highlights.
                            </p>
                          </div>
                        </div>

                        <div className="relative">
                          <div className="flex items-end justify-between">
                            <div>
                              <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                                Digital Age Publishing
                              </p>
                            </div>

                            <Sparkles className="h-6 w-6 text-purple-400/70" />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Cover overlay */}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/50 to-transparent" />
                  </div>
                </div>
              </div>

              {/* =====================================================
                  CONTENT
              ===================================================== */}
              <div className="lg:col-span-7">
                <div className="max-w-2xl">
                  <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-pink-500/20 bg-pink-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-pink-300">
                    <FileText className="h-3.5 w-3.5" />
                    Digital Edition
                  </div>

                  <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                    Your complete{" "}
                    <span className="bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                      event guide
                    </span>
                  </h2>

                  <p className="mt-5 text-sm leading-7 text-zinc-400 sm:text-base">
                    Get a complete overview of Digital Age Expo. Discover
                    exhibitors, connect with speakers, explore the programme,
                    and find the information you need before and during the
                    event.
                  </p>

                  {/* Features */}
                  <div className="mt-8 grid gap-3 sm:grid-cols-2">
                    {[
                      "Full Exhibitor Directory & Stand Map",
                      "Exclusive Keynote Speaker Features",
                      "Sector Spotlights: AI, Fintech & Growth Marketing",
                      "Full Seminar & Workshop Schedules",
                    ].map((feature) => (
                      <div
                        key={feature}
                        className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 transition duration-300 hover:border-purple-500/30 hover:bg-purple-500/[0.05]"
                      >
                        <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                          <Sparkles className="h-3.5 w-3.5 text-pink-400" />
                        </div>

                        <span className="text-xs font-medium leading-5 text-zinc-300">
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* No publication */}
                  {!publication && (
                    <div className="mt-7 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                      <p className="text-sm text-zinc-400">
                        No published show guide is available yet. Check back
                        closer to the event for the digital edition.
                      </p>
                    </div>
                  )}

                  {/* Buttons */}
                  <div className="mt-8 flex flex-wrap gap-3">
                    <a
                      href={readOnlineHref || "#"}
                      target={readOnlineHref ? "_blank" : undefined}
                      rel={
                        readOnlineHref ? "noopener noreferrer" : undefined
                      }
                      aria-disabled={!readOnlineHref}
                      className={`group inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-xs font-black uppercase tracking-wider transition duration-300 ${
                        readOnlineHref
                          ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-900/20 hover:-translate-y-0.5 hover:from-purple-500 hover:to-pink-500"
                          : "pointer-events-none cursor-not-allowed bg-zinc-800 text-zinc-600"
                      }`}
                    >
                      <Eye className="h-4 w-4" />
                      Read Online
                      {readOnlineHref && (
                        <ArrowUpRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      )}
                    </a>

                    <a
                      href={downloadHref || "#"}
                      download={!!downloadHref}
                      aria-disabled={!downloadHref}
                      className={`inline-flex items-center justify-center gap-2 rounded-xl border px-6 py-3.5 text-xs font-black uppercase tracking-wider transition duration-300 ${
                        downloadHref
                          ? "border-white/15 bg-white/[0.05] text-white hover:-translate-y-0.5 hover:border-purple-500/40 hover:bg-purple-500/10"
                          : "pointer-events-none cursor-not-allowed border-white/5 bg-zinc-900 text-zinc-600"
                      }`}
                    >
                      <Download className="h-4 w-4" />
                      Download PDF
                    </a>
                  </div>

                  {/* Status */}
                  {publication && (
                    <div className="mt-6 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.7)]" />
                      Latest publication available
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          BOTTOM CTA
      ========================================================= */}
      <section className="px-6 pb-20 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <div className="relative overflow-hidden rounded-2xl border border-purple-500/20 bg-gradient-to-r from-purple-950/40 via-[#11111e] to-pink-950/30 px-6 py-8 sm:px-10">
            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-purple-500/10 blur-3xl" />

            <div className="relative flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-purple-400">
                  Digital Age Expo
                </p>

                <h3 className="mt-2 text-xl font-bold text-white">
                  Stay connected with the latest event updates.
                </h3>

                <p className="mt-1 text-sm text-zinc-500">
                  Explore the website for more event information.
                </p>
              </div>

              <a
                href="/"
                className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-xs font-bold uppercase tracking-wider text-white transition hover:border-pink-500/30 hover:bg-pink-500/10"
              >
                Explore Expo
                <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}