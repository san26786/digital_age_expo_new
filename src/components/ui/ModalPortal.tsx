"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Renders a modal into <body> instead of leaving it where it sits in the tree.
 *
 * WHY THIS IS NECESSARY
 *
 * `position: fixed` is resolved against the viewport ONLY while no ancestor establishes a
 * containing block. An ancestor does establish one as soon as it has a `transform`, `filter`,
 * `backdrop-filter`, `perspective`, `contain: paint` or `will-change` on any of those — and this
 * app has three such ancestors wrapping essentially every members page:
 *
 *   src/app/members/(event)/layout.tsx
 *     line 28  <div class="... section-transition">      -> animation: slide-up ... forwards
 *     line 52  <div class="mt-8 animate-slide-up">       -> animation: slide-up ... forwards
 *   globals.css
 *     .glass-panel                                        -> backdrop-filter: blur(20px)
 *
 * `slide-up` finishes on `transform: translateY(0)`, and `forwards` keeps it applied. A transform
 * of translateY(0) is still a transform — only `none` avoids the containing block — so those
 * wrappers behave exactly like a transformed ancestor forever after the animation ends.
 *
 * The consequence: an overlay written as `fixed inset-0 flex items-center justify-center` sizes
 * itself to that WRAPPER, which is as tall as the whole scrolling page, and then dutifully
 * centres the dialog in it. On a long page the dialog lands far below the fold — which is what
 * "Add New Event Industry" was doing, sitting at the bottom of the page rather than the screen.
 * The centring classes were never wrong; the containing block was.
 *
 * Portalling to <body> escapes all of it, and keeps escaping it if someone adds another
 * transformed wrapper later. It also puts every modal in the same stacking context, so z-index
 * between modals finally means what it says.
 *
 * Also handled here, once, rather than in fifty components:
 *   - the background page is locked from scrolling while a modal is open (ref-counted, so
 *     stacked modals do not unlock the page when only the inner one closes)
 *   - Escape closes, when the caller passes onClose
 */

/** Ref count, so a modal opened on top of a modal doesn't unlock the page early. */
let openModalCount = 0;

export function ModalPortal({
  children,
  onClose,
  lockScroll = true,
}: {
  children: ReactNode;
  /** When provided, Escape closes the modal. */
  onClose?: () => void;
  lockScroll?: boolean;
}) {
  // createPortal needs a real document, which does not exist during the server render. Mounting
  // on the client first keeps this usable from Server-Component pages without hydration errors.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!lockScroll) return;
    openModalCount += 1;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      openModalCount -= 1;
      if (openModalCount <= 0) {
        openModalCount = 0;
        document.body.style.overflow = previous;
      }
    };
  }, [lockScroll]);

  useEffect(() => {
    if (!onClose) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  if (!mounted) return null;
  return createPortal(children, document.body);
}

/**
 * The one overlay class every modal should use, so positioning and scroll behaviour are identical
 * everywhere.
 *
 * `items-center` centres a short dialog; `overflow-y-auto` plus `py-*` means a dialog TALLER than
 * the viewport scrolls instead of having its top and bottom cut off — the failure mode of a plain
 * centred flex item. Callers keep their own background tint/blur by appending to this.
 */
export const MODAL_OVERLAY_CLASS =
  "fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain p-4 sm:p-6";
