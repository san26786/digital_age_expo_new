"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

/**
 * The event description: a clamped teaser that expands in place.
 *
 * WHY IT IS CLAMPED
 * -----------------
 * This section used to show a short marketing blurb from the sponsorship-opportunity table. It
 * now shows `find_events.description` — the organiser's full write-up, which on this event runs
 * to nearly 2,000 characters. Printed in full it fills about twenty lines and pushes the
 * WHERE/WHEN tiles and everything under them off the screen.
 *
 * Expanding IN PLACE rather than in a dialog: the text is the page's own content, not a detour
 * from it. A dialog covers the section the reader is already looking at, has to be dismissed to
 * get back, and on a phone becomes a full-screen takeover for what is simply a longer paragraph.
 *
 * The teaser is a plain cut, with NO gradient fade over the last lines. A fade has to be painted
 * in the section's own background colour to look like a fade rather than a grey panel, and this
 * section sits on a themed gradient — so the overlay read as a dark rectangle laid across the
 * copy, dimming perfectly good text. The button says there is more; the text does not need to
 * go faint to say it too.
 *
 * WHY THE BUTTON IS CONDITIONAL, AND WHY THE CLAMP COMES FIRST
 * -----------------------------------------------------------
 * `fits` decides whether a toggle is needed at all, and it starts as null — meaning "not yet
 * measured", with the clamp ON. That order is the whole trick: an UNCLAMPED element always
 * reports `scrollHeight === clientHeight`, so measuring before clamping can only ever conclude
 * that nothing overflows, and the button would never appear. Clamp first, then ask.
 *
 * It is measured on mount and on resize because the clamp is a height and how much text fits
 * inside it depends on the viewport — so an event with three sentences never gets a "Read more"
 * that reveals those same three sentences.
 */
export function AboutEventDescription({ html }: { html: string }) {
  const [expanded, setExpanded] = useState(false);
  const [fits, setFits] = useState<boolean | null>(null);
  /*
   * The content's natural height, in px, captured WHILE clamped — `scrollHeight` reports the
   * full height of the content regardless of the max-height cutting it off, which is exactly
   * what is needed to animate to it.
   */
  const [fullHeight, setFullHeight] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const collapsed = !expanded && fits !== true;
  const showToggle = fits === false;

  /*
   * `find_events.description` is PLAIN TEXT on this site - paragraphs separated by blank lines,
   * exactly as typed into the Full Description box in Event Details. It was being handed to
   * dangerouslySetInnerHTML, and HTML collapses runs of whitespace: every blank line became a
   * single space and the whole write-up rendered as one unbroken wall, while the textarea it
   * came from showed neat paragraphs.
   *
   * Older events may still hold real markup in this column, so the shape is detected rather than
   * assumed. Plain text is split on blank lines into real <p> elements - which also means it no
   * longer goes through dangerouslySetInnerHTML at all, so an apostrophe or an ampersand in an
   * organiser's copy is escaped by React instead of being interpreted.
   */
  const isHtml = /<[a-z][a-z0-9]*(\s[^>]*)?>/i.test(html);
  const paragraphs = isHtml
    ? []
    : html
        .split(/\r?\n\s*\r?\n/)
        .map((block) => block.trim())
        .filter(Boolean);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const measure = () => {
      // Only meaningful while clamped; once expanded or un-clamped it always "fits".
      if (el.dataset.clamped !== "true") return;
      setFits(el.scrollHeight - el.clientHeight <= 8);
      setFullHeight(el.scrollHeight);
    };

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [html]);

  return (
    <>
      <div
        ref={ref}
        id="about-event-description"
        data-clamped={collapsed ? "true" : "false"}
        className={`mt-5 overflow-hidden text-sm leading-relaxed text-[var(--c-text-muted)] transition-[max-height] duration-500 ease-in-out sm:text-base [&_a]:text-white [&_a]:underline [&_p]:mb-3 [&_p:last-child]:mb-0 ${
          collapsed ? "max-h-[11.5rem] sm:max-h-[13rem]" : ""
        }`}
        /*
         * Expanding animates to the MEASURED height, not to an arbitrarily large one. A
         * max-height transition interpolates linearly between its two values, so animating
         * 184px -> a blanket 6400px would reach the text's real height inside the first few
         * percent of the run: the content appears to snap, then the element spends the rest of
         * the half-second growing invisible empty space. Animating to the actual height makes
         * the motion match what the reader sees.
         *
         * `none` until measured, so an expand triggered before the first measurement still
         * opens rather than staying stuck at the clamp.
         */
        style={collapsed ? undefined : { maxHeight: fullHeight ? `${fullHeight}px` : "none" }}
        {...(isHtml ? { dangerouslySetInnerHTML: { __html: html } } : {})}
      >
        {/*
          `whitespace-pre-line` inside each paragraph so a SINGLE newline - a list of bullet
          lines, an address - still breaks, while the blank lines between blocks are what create
          the paragraph spacing.
        */}
        {!isHtml &&
          paragraphs.map((block, i) => (
            <p key={i} className="mb-4 whitespace-pre-line last:mb-0">
              {block}
            </p>
          ))}
      </div>

      {showToggle && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-controls="about-event-description"
          className="group mt-4 inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-[var(--c-accent-pink)] transition-colors duration-200 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--c-accent-pink)]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
        >
          {expanded ? "Show Less" : "Read More"}
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </button>
      )}
    </>
  );
}
