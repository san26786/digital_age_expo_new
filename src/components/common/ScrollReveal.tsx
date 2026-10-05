'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * ===========================================================================
 *  SCROLL REVEAL — one observer for the whole site
 * ===========================================================================
 *
 *  Mounted once in the root layout. Elements fade and slide into place as they enter the
 *  viewport and return to their hidden state when they leave, so the animation replays scrolling
 *  up as well as down.
 *
 *  There are two ways an element gets animated:
 *
 *    1. EXPLICITLY — it carries `data-reveal` (optionally "left" | "right" | "scale") in the
 *       markup. Works on any page, and is what you want for a specific, tuned effect.
 *
 *    2. AUTOMATICALLY — every outermost <section> inside <main> is tagged on mount. This is what
 *       gives ~40 pages the effect without touching ~40 files.
 *
 *  ---------------------------------------------------------------------------
 *  WHY THE HOME PAGE IS EXCLUDED FROM AUTO-TAGGING
 *  ---------------------------------------------------------------------------
 *
 *  Seven home components already run their OWN IntersectionObserver and animate their internal
 *  cards and headings. Auto-tagging the whole <section> on top of that would animate the same
 *  content twice — the section fading in while its children are separately sliding in, at two
 *  unrelated thresholds. Home therefore only honours explicit `data-reveal` attributes, which is
 *  the coordinated version. Remove the `isHome` check once the two systems are merged into one.
 *
 *  ---------------------------------------------------------------------------
 *  WHY THIS IS A COMPONENT AND NOT AN INLINE <script>
 *  ---------------------------------------------------------------------------
 *
 *  It began as `<script dangerouslySetInnerHTML>` inside AboutEvent, a Server Component. React
 *  does not execute script tags rendered by components — it warns and moves on. It appeared to
 *  work only because the tag sat in the server-rendered HTML, so the browser parser ran it on a
 *  cold load; a client-side navigation ran nothing, and with `opacity: 0` as the resting state
 *  that means invisible content.
 *
 *  Every failure path here therefore ends in "reveal everything": reduced motion, a browser with
 *  no IntersectionObserver, or any thrown error. A decorative effect must never be the reason a
 *  page renders blank.
 *
 *  ---------------------------------------------------------------------------
 *  OPTING OUT: data-no-reveal
 *  ---------------------------------------------------------------------------
 *
 *  A page can put `data-no-reveal` on any wrapper and nothing inside it will be auto-tagged.
 *
 *  This exists because auto-tagging MUTATES DOM THAT REACT OWNS — it adds `data-reveal` and
 *  `is-revealed` to server-rendered elements. This component is mounted in the root layout, so
 *  its effect can run before a page whose content sits inside its own <Suspense> boundary has
 *  hydrated. React then hydrates that subtree, finds attributes in the DOM that it never
 *  rendered, and logs a hydration mismatch. The member sign-in page hit exactly this: it wraps
 *  its content in <Suspense> because it reads useSearchParams, so it hydrates after the layout.
 *
 *  The opt-out is an attribute in the page's own JSX rather than a route list here, so it is
 *  server-rendered on both sides of hydration and cannot itself cause a mismatch — and a page
 *  declares its own behaviour instead of this file having to know every route.
 *
 *  It is also the right call on its own terms for a page like sign-in: a single-viewport form has
 *  nothing to reveal on scroll, and fading the nav, the form and the footer in is an effect with
 *  no purpose that briefly hides the one control the visitor came for.
 */
export function ScrollReveal() {
  const pathname = usePathname();

  useEffect(() => {
    const SELECTOR = '[data-reveal]';
    const VISIBLE = 'is-revealed';

    const revealAll = () => {
      document.querySelectorAll(SELECTOR).forEach((el) => el.classList.add(VISIBLE));
    };

    try {
      const prefersReduced =
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (prefersReduced || !('IntersectionObserver' in window)) {
        revealAll();
        return;
      }

      /*
       * Auto-tagging. Only the OUTERMOST sections are taken: a page with a <section> nested
       * inside another would otherwise animate the child while its parent is still animating,
       * which reads as a stutter rather than two effects.
       */
      const autoTag = () => {
        const main = document.querySelector('main');
        if (!main || pathname === '/') return;

        /*
         * Descend through single-element wrappers first. Plenty of pages render one big
         * <div> inside <main> and put everything in it; without this the fallback below
         * would tag that single wrapper and fade the ENTIRE page in as one slab, which is
         * worse than no animation at all.
         */
        let scope: Element = main;
        while (scope.children.length === 1 && scope.children[0] instanceof HTMLElement) {
          scope = scope.children[0];
        }

        // The page asked not to be touched. Checked after the descent so the attribute can sit on
        // the page's own root wrapper rather than having to be hoisted into the layout.
        if (scope.closest('[data-no-reveal]')) return;

        const sections = Array.from(scope.querySelectorAll('section'));
        const outermost = sections.filter(
          (el) => !sections.some((other) => other !== el && other.contains(el))
        );

        // Some pages wrap their content in plain divs rather than sections.
        const targets = outermost.length > 0 ? outermost : Array.from(scope.children);

        targets.forEach((el) => {
          if (!(el instanceof HTMLElement)) return;
          if (el.hasAttribute('data-reveal')) return;
          // A single opted-out branch inside a page that is otherwise animated.
          if (el.closest('[data-no-reveal]')) return;

          /*
           * A section that already contains hand-placed `data-reveal` elements is left alone.
           * Without this the two mechanisms stack: the whole section fades in as one block while
           * the cards inside it are independently sliding up, at two unrelated thresholds, and
           * the staggered effect is lost inside the blanket one. Tagging anything inside a
           * section is therefore an opt-out from auto-tagging it.
           */
          if (el.querySelector('[data-reveal]')) return;

          el.setAttribute('data-reveal', '');

          /*
           * Anything already on screen when we tag it is marked visible in the same frame.
           * Without this, above-the-fold content would render, flash to opacity 0 the moment the
           * attribute lands, and fade back in — a flicker on every page load.
           */
          const rect = el.getBoundingClientRect();
          if (rect.top < window.innerHeight && rect.bottom > 0) {
            el.classList.add(VISIBLE);
          }
        });
      };

      autoTag();

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            entry.target.classList.toggle(VISIBLE, entry.isIntersecting);
          });
        },
        // The small negative bottom margin makes an element commit to being "in" slightly after
        // it first touches the viewport edge, so items do not flicker when the user rests exactly
        // on the boundary.
        { threshold: 0.08, rootMargin: '0px 0px -5% 0px' }
      );

      const seen = new WeakSet<Element>();
      const scan = () => {
        document.querySelectorAll(SELECTOR).forEach((el) => {
          if (seen.has(el)) return;
          seen.add(el);
          observer.observe(el);
        });
      };

      scan();

      // Carousels, accordions and late-loading content add nodes after mount.
      const mutationObserver = new MutationObserver(() => {
        autoTag();
        scan();
      });
      mutationObserver.observe(document.body, { childList: true, subtree: true });

      return () => {
        mutationObserver.disconnect();
        observer.disconnect();
      };
    } catch {
      revealAll();
      return;
    }
  }, [pathname]);

  return null;
}
