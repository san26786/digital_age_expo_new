"use client";

import { useState } from "react";
import { ChevronDown, HelpCircle, Plus, Sparkles } from "lucide-react";
import { staticAssetUrl } from "@/lib/assets";

/**
 * CLIENT COMPONENT — the interactive half of /frequently-asked-questions.
 *
 * Split out of page.tsx because that file exports `metadata` and awaits Prisma
 * queries, neither of which is legal in a module marked "use client". This file
 * holds only what genuinely needs the browser: the expand/collapse state.
 */

export interface FAQQuestion {
  uniqueId: string | number;
  groupTitle?: string;
  question?: string;
  title?: string;
  answer?: string;
  content?: string;
}

export function FaqPageContent({
  domainName,
  allQuestions,
}: {
  domainName: string;
  allQuestions: FAQQuestion[];
}) {
  const [showAll, setShowAll] = useState(false);
  const [openQuestion, setOpenQuestion] =
    useState<string | number | null>(null);

  const INITIAL_COUNT = 10;

  const visibleQuestions = showAll
    ? allQuestions
    : allQuestions.slice(0, INITIAL_COUNT);

  const hasMore = allQuestions.length > INITIAL_COUNT;

  const remainingQuestions =
    allQuestions.length - INITIAL_COUNT;

  return (
    <main className="min-h-screen overflow-hidden bg-[#050509] text-white">

      {/* =========================================================
          HERO SECTION
      ========================================================= */}
      <section className="relative overflow-hidden border-b border-white/10">

        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('${staticAssetUrl(
              "https://digitalageexpo.com/files/listing_pages/817601-exibitor.png"
            )}')`,
          }}
        />

        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-[#050509]/80" />

        {/* Purple Glow */}
        <div className="absolute -left-40 top-10 h-80 w-80 rounded-full bg-purple-600/20 blur-3xl" />

        {/* Pink Glow */}
        <div className="absolute -right-40 bottom-0 h-80 w-80 rounded-full bg-pink-600/20 blur-3xl" />

        <div className="relative mx-auto flex min-h-[450px] max-w-7xl items-center justify-center px-6 py-20 sm:px-8 lg:px-12">

          <div className="w-full max-w-4xl text-center">

            {/* Badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-purple-400/20 bg-purple-500/10 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.22em] text-purple-300 backdrop-blur-md">
              <HelpCircle className="h-4 w-4" />
              Digital Age Expo Help Centre
            </div>

            {/* Heading */}
            <h1 className="text-4xl font-black uppercase tracking-tight sm:text-5xl lg:text-6xl">
              Frequently Asked{" "}
              <span className="bg-gradient-to-r from-purple-400 via-fuchsia-400 to-pink-500 bg-clip-text text-transparent">
                Questions
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-sm leading-7 text-zinc-300 sm:text-base">
              Find answers to common questions about exhibiting,
              sponsoring, speaking and attending Digital Age Expo.
            </p>

            {/* Event Information */}
            <div className="mx-auto mt-8 max-w-3xl rounded-2xl border border-white/10 bg-black/50 p-5 shadow-2xl backdrop-blur-xl">

              <div className="flex items-center justify-center gap-2">
                <Sparkles className="h-4 w-4 text-pink-400" />

                <p className="text-sm font-black uppercase tracking-wide text-white sm:text-base">
                  Digital Age Expo
                </p>

                <Sparkles className="h-4 w-4 text-purple-400" />
              </div>

              <div className="mx-auto mt-3 h-px max-w-md bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />

              <p className="mt-3 text-xs font-bold uppercase tracking-wider text-zinc-300 sm:text-sm">
                26th – 28th August 2026
              </p>

              <p className="mt-1 text-xs text-zinc-500">
                Online Virtual Event
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* =========================================================
          FAQ SECTION
      ========================================================= */}
      <section className="relative px-6 py-16 sm:px-8 lg:px-12 lg:py-20">

        {/* Background Glow */}
        <div className="pointer-events-none absolute left-0 top-20 h-80 w-80 rounded-full bg-purple-600/10 blur-3xl" />

        <div className="pointer-events-none absolute bottom-20 right-0 h-80 w-80 rounded-full bg-pink-600/10 blur-3xl" />

        <div className="relative mx-auto max-w-6xl">

          {/* Main Card */}
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035] shadow-2xl shadow-purple-950/20 backdrop-blur-xl">

            {/* =====================================================
                HEADER
            ===================================================== */}
            <div className="border-b border-white/10 bg-gradient-to-r from-purple-950/30 via-transparent to-pink-950/20 px-6 py-8 sm:px-10 sm:py-10">

              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

                <div>

                  <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-pink-500/20 bg-pink-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-pink-300">
                    <HelpCircle className="h-3.5 w-3.5" />
                    Help Centre
                  </div>

                  <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                    Frequently Asked Questions
                  </h2>

                  <p className="mt-2 text-sm text-zinc-400">
                    Everything you need to know about{" "}
                    <span className="font-semibold text-purple-300">
                      {domainName}
                    </span>
                    .
                  </p>

                </div>

                {/* Total Question Count */}
                <div className="shrink-0 rounded-2xl border border-white/10 bg-black/30 px-6 py-4 text-center">

                  <div className="text-2xl font-black text-white">
                    {allQuestions.length}
                  </div>

                  <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-500">
                    Questions
                  </div>

                </div>

              </div>
            </div>

            {/* =====================================================
                QUESTIONS
            ===================================================== */}
            <div className="p-5 sm:p-8 lg:p-10">

              {allQuestions.length === 0 ? (

                /* Empty State */
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-14 text-center">

                  <HelpCircle className="mx-auto h-12 w-12 text-zinc-600" />

                  <h3 className="mt-5 text-lg font-bold text-zinc-300">
                    No Questions Available
                  </h3>

                  <p className="mx-auto mt-2 max-w-md text-sm text-zinc-500">
                    Frequently asked questions will appear here once
                    they are added.
                  </p>

                </div>

              ) : (

                <>
                  {/* Question List */}
                  <div className="mx-auto max-w-4xl space-y-3">

                    {visibleQuestions.map((item, index) => {

                      const isOpen =
                        openQuestion === item.uniqueId;

                      const question =
                        item.question ||
                        item.title ||
                        "Frequently Asked Question";

                      const answer =
                        item.answer ||
                        item.content ||
                        "";

                      return (
                        <div
                          key={item.uniqueId}
                          className={`overflow-hidden rounded-2xl border transition-all duration-300 ${
                            isOpen
                              ? "border-purple-500/40 bg-purple-500/[0.06] shadow-lg shadow-purple-950/20"
                              : "border-white/10 bg-white/[0.025] hover:border-purple-500/20 hover:bg-white/[0.04]"
                          }`}
                        >

                          {/* =================================================
                              QUESTION BUTTON
                          ================================================= */}
                          <button
                            type="button"
                            onClick={() =>
                              setOpenQuestion(
                                isOpen
                                  ? null
                                  : item.uniqueId
                              )
                            }
                            aria-expanded={isOpen}
                            className="flex w-full items-center gap-4 px-5 py-5 text-left sm:px-6"
                          >

                            {/* Number */}
                            <span
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[10px] font-black transition-all ${
                                isOpen
                                  ? "bg-gradient-to-br from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-900/30"
                                  : "border border-white/10 bg-white/5 text-zinc-500"
                              }`}
                            >
                              {String(index + 1).padStart(2, "0")}
                            </span>

                            {/* Question */}
                            <span
                              className={`flex-1 text-sm font-bold leading-6 transition sm:text-[15px] ${
                                isOpen
                                  ? "text-white"
                                  : "text-zinc-300"
                              }`}
                            >
                              {question}
                            </span>

                            {/* Arrow */}
                            <span
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-all duration-300 ${
                                isOpen
                                  ? "rotate-180 border-purple-500/30 bg-purple-500/10 text-purple-400"
                                  : "border-white/10 bg-white/[0.03] text-zinc-500"
                              }`}
                            >
                              <ChevronDown className="h-4 w-4" />
                            </span>

                          </button>

                          {/* =================================================
                              ANSWER
                          ================================================= */}
                          <div
                            className={`grid transition-all duration-300 ${
                              isOpen
                                ? "grid-rows-[1fr]"
                                : "grid-rows-[0fr]"
                            }`}
                          >
                            <div className="overflow-hidden">

                              <div className="border-t border-white/10 px-5 pb-6 pt-5 sm:px-6">

                                <div
                                  className="
                                    max-w-none
                                    text-sm
                                    leading-7
                                    text-zinc-400

                                    [&_p]:mb-3
                                    [&_p:last-child]:mb-0

                                    [&_a]:font-semibold
                                    [&_a]:text-purple-400
                                    [&_a]:underline-offset-4

                                    [&_strong]:font-bold
                                    [&_strong]:text-white

                                    [&_ul]:my-3
                                    [&_ul]:list-disc
                                    [&_ul]:pl-5

                                    [&_ol]:my-3
                                    [&_ol]:list-decimal
                                    [&_ol]:pl-5

                                    [&_li]:mb-1
                                  "
                                  dangerouslySetInnerHTML={{
                                    __html: answer,
                                  }}
                                />

                              </div>

                            </div>
                          </div>

                        </div>
                      );
                    })}

                  </div>

                  {/* =====================================================
                      SHOW MORE BUTTON
                  ===================================================== */}
                  {hasMore && (
                    <div className="mt-9 flex justify-center">

                      <button
                        type="button"
                        onClick={() =>
                          setShowAll((previous) => !previous)
                        }
                        className="group inline-flex items-center gap-2 rounded-xl border border-purple-500/30 bg-purple-500/10 px-6 py-3.5 text-xs font-black uppercase tracking-wider text-purple-300 shadow-lg shadow-purple-950/10 transition-all duration-300 hover:-translate-y-0.5 hover:border-pink-500/40 hover:bg-gradient-to-r hover:from-purple-600/20 hover:to-pink-600/20 hover:text-white"
                      >

                        {showAll ? (
                          <>
                            <ChevronDown className="h-4 w-4 rotate-180" />

                            Show Less
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />

                            Show More Questions

                            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] text-zinc-400">
                              +{remainingQuestions}
                            </span>
                          </>
                        )}

                      </button>

                    </div>
                  )}

                </>
              )}

            </div>
          </div>

          {/* Bottom information */}
          {allQuestions.length > 0 && (
            <div className="mt-6 text-center">

              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
                Showing{" "}
                {showAll
                  ? allQuestions.length
                  : Math.min(
                      INITIAL_COUNT,
                      allQuestions.length
                    )}{" "}
                of {allQuestions.length} questions
              </p>

            </div>
          )}

        </div>
      </section>

    </main>
  );
}
