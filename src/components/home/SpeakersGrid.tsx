'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { assetUrl } from '@/lib/assets';
import { speakerSlug } from '@/lib/slug';

interface Speaker {
  id: number;
  name: string;
  position: string | null;
  business: string | null;
  profile_pic: string | null;
}

interface Props {
  speakers: Speaker[];
  eyebrow?: string;
  speakerTypeTitle?: string;
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Portrait with graceful fallback: a missing `profile_pic`, a blank one, AND an image that fails
 * to load all land on the speaker's initials.
 *
 * ---------------------------------------------------------------------------
 *  THIS COMPONENT PREVIOUSLY SHOWED INITIALS FOR EVERYONE
 * ---------------------------------------------------------------------------
 *
 *  It already computed `src`, `showImage` and an `errored` flag — and then rendered the initials
 *  block unconditionally, with no <img> anywhere in the returned JSX. Every value feeding the
 *  image path was dead code, so a speaker with a perfectly good photo still got their initials,
 *  and `setErrored` was never called by anything.
 *
 *  The photo is rendered now, and the fallback keeps all three of its triggers: no src, empty
 *  src, or a load failure (which is the one that needs `onError`, since a broken URL resolves
 *  fine at render time and only fails later in the browser).
 */
function SpeakerPortrait({ speaker }: { speaker: Speaker }) {
  const [errored, setErrored] = useState(false);

  const hasSrc = Boolean(speaker.profile_pic && speaker.profile_pic.trim());
  const src = hasSrc ? assetUrl(speaker.profile_pic) : null;
  const showImage = Boolean(src) && !errored;

  return (
    <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-[#14152F]">
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- legacy asset hosts resolved
        // through assetUrl(); next/image would need each one configured in next.config.
        <img
          src={src as string}
          alt={speaker.name}
          loading="lazy"
          onError={() => setErrored(true)}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_50%_35%,rgba(108,43,255,0.35),transparent_70%)]">
          <span className="text-4xl font-black tracking-wide text-[#EDEDF8] sm:text-5xl">
            {getInitials(speaker.name)}
          </span>
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#08091A]/70 via-transparent to-transparent" />
    </div>
  );
}

export function SpeakersGrid({ speakers, eyebrow, speakerTypeTitle = 'Event' }: Props) {
  const displayEyebrow = eyebrow || 'Your story. Your vision. Our stage.';

  const trackRef = useRef<HTMLDivElement | null>(null);
  const [page, setPage] = useState(0);
  const [pageCount, setPageCount] = useState(1);

  /*
   * Dots count PAGES, not speakers. One dot per card looks right for the five in the mockup and
   * absurd for an event with fifty — a page is simply one viewport-width of the track, so the
   * indicator stays readable at any list length.
   */
  const recalculate = useCallback(() => {
    const el = trackRef.current;
    if (!el || el.clientWidth === 0) return;
    setPageCount(Math.max(1, Math.ceil(el.scrollWidth / el.clientWidth)));
    setPage(Math.round(el.scrollLeft / el.clientWidth));
  }, []);

  useEffect(() => {
    recalculate();
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener('scroll', recalculate, { passive: true });
    window.addEventListener('resize', recalculate);
    return () => {
      el.removeEventListener('scroll', recalculate);
      window.removeEventListener('resize', recalculate);
    };
  }, [recalculate, speakers.length]);

  const scrollByPage = (direction: -1 | 1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.9, behavior: 'smooth' });
  };

  return (
    <section className="relative overflow-hidden bg-[#0B0C20] px-5 py-16 text-white sm:px-6 sm:py-20">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(108,43,255,0.18),transparent_60%)]" />

      <div className="relative z-10 mx-auto max-w-7xl">
        <div className="text-center">
          <h2 className="text-2xl font-black uppercase tracking-tight text-white sm:text-4xl">
            {speakerTypeTitle} Speakers
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-[#A5A6C5] sm:text-base">{displayEyebrow}</p>
        </div>

        {speakers.length > 0 ? (
          <div className="relative mt-10">
            {/* Arrows. Hidden below sm, where the track is swiped instead. */}
            <button
              type="button"
              onClick={() => scrollByPage(-1)}
              aria-label="Previous speakers"
              className="absolute -left-2 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[#00C8FF]/40 bg-[#10112A]/90 text-white backdrop-blur transition-all duration-300 hover:border-[#00C8FF] hover:shadow-[0_0_20px_-4px_#00C8FF] sm:flex lg:-left-5"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => scrollByPage(1)}
              aria-label="Next speakers"
              className="absolute -right-2 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[#F020A8]/40 bg-[#10112A]/90 text-white backdrop-blur transition-all duration-300 hover:border-[#F020A8] hover:shadow-[0_0_20px_-4px_#F020A8] sm:flex lg:-right-5"
            >
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>

            <div
              ref={trackRef}
              className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2 [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-5 [&::-webkit-scrollbar]:hidden"
            >
              {speakers.map((speaker) => (
                <Link
                  href={`/speaker/${speakerSlug(speaker.name, speaker.id)}`}
                  key={speaker.id}
                  id={`featured-speaker-${speaker.id}`}
                  className="group w-[13rem] shrink-0 snap-start rounded-2xl border border-white/[0.09] bg-[#10112A]/80 p-3 text-center backdrop-blur-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-[#8B3DFF]/60 hover:shadow-[0_20px_50px_-18px_rgba(108,43,255,0.8)] sm:w-[14.5rem]"
                >
                  <SpeakerPortrait speaker={speaker} />

                  <div className="px-1 pb-1 pt-3.5">
                    <h4 className="line-clamp-1 text-sm font-bold text-white transition-colors group-hover:text-[#F020A8] sm:text-base">
                      {speaker.name}
                    </h4>
                    <p className="mt-1 line-clamp-2 text-xs leading-snug text-[#A5A6C5]">
                      {speaker.position}
                      {speaker.position && speaker.business ? ', ' : ''}
                      {speaker.business}
                    </p>
                  </div>
                </Link>
              ))}
            </div>

            {pageCount > 1 && (
              <div className="mt-6 flex items-center justify-center gap-2">
                {Array.from({ length: pageCount }).map((_, i) => (
                  <span
                    key={i}
                    aria-hidden="true"
                    className={`h-2 rounded-full transition-all duration-300 ${
                      i === page ? 'w-6 bg-gradient-to-r from-[#F020A8] to-[#8B3DFF]' : 'w-2 bg-white/20'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="mt-10 rounded-2xl border border-dashed border-white/10 bg-[#10112A]/50 p-12 text-center">
            <p className="font-medium text-[#A5A6C5]">
              Be the first one to register for {speakerTypeTitle} Speaker
            </p>
          </div>
        )}

        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link
            href="/view_speaker"
            className="btn-brand-gradient group inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-sm font-bold text-white shadow-[0_10px_34px_-8px_rgba(240,32,168,0.6)] transition-all duration-300 hover:scale-105 active:scale-95"
          >
            View All Speakers
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
          </Link>
          <Link
            href="/speaker_registration"
            className="btn-outline-animated rounded-full border border-white/20 bg-white/[0.04] px-8 py-3.5 text-sm font-bold text-white backdrop-blur-md transition-all duration-300 hover:scale-105 hover:border-[#8B3DFF] hover:bg-white/[0.1] active:scale-95"
          >
            Enroll as {speakerTypeTitle} Speaker
          </Link>
        </div>
      </div>
    </section>
  );
}
