"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";

import { ModalPortal } from "@/components/ui/ModalPortal";

/**
 * ---------------------------------------------------------------------------
 * The lobby's embedded-content modal — "Show Guide" / Event Guide.
 * ---------------------------------------------------------------------------
 *
 * Ports the legacy's modal for an asset flagged `is_iframe`:
 *
 *   <div class="modal-dialog modal-dialog-centered modal-lg">
 *     <div class="modal-header"><h5 class="modal-title">Event Guide</h5> ... </div>
 *     <div class="modal-body">
 *       <iframe style="width:100%;height:80vh;" src="https://www.canva.com/design/.../view?embed">
 *     <div class="modal-footer"><button ...>Close</button>
 *
 * The 80vh height and the centred large dialog are kept, because the embed is a portrait document
 * and anything shorter turns the guide into a letterbox the visitor has to scroll inside twice.
 *
 * Closes on the X, on the footer Close, on a click outside, and on Escape (ModalPortal binds that
 * centrally, with the background scroll lock).
 */
export function GuideModal({
  title,
  url,
  onClose,
}: {
  title: string;
  url: string;
  onClose: () => void;
}) {
  const [loaded, setLoaded] = useState(false);

  return (
    <ModalPortal onClose={onClose}>
      {/* Backdrop. The handler is here rather than on a shared parent so a click INSIDE the
          dialog cannot bubble out and close it. */}
      <div
        className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-[2px] animate-fade-in"
        onClick={onClose}
        aria-hidden
      />

      <div className="pointer-events-none fixed inset-0 z-[61] flex items-center justify-center p-3 sm:p-6">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className="pointer-events-auto flex max-h-full w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl animate-fade-in"
        >
          {/* ------------------------------------------------------- header */}
          <div className="flex items-center justify-between gap-3 border-b border-black/10 px-5 py-3.5">
            {/* Explicit dark hex, not a zinc utility: globals.css redefines the zinc scale for a
                dark UI, so text-zinc-700 and friends are translucent white and vanish on white. */}
            <h5 className="truncate text-base font-bold text-[#18181b]">{title}</h5>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[#52525b] transition hover:bg-black/5 hover:text-[#18181b]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* ------------------------------------------------------- body */}
          <div className="relative min-h-0 flex-1 bg-[#f4f4f5]">
            {!loaded && (
              <div className="absolute inset-0 grid place-items-center">
                <span className="flex items-center gap-2 text-sm font-semibold text-[#52525b]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading the guide…
                </span>
              </div>
            )}
            <iframe
              src={url}
              title={title}
              onLoad={() => setLoaded(true)}
              className="block h-[80vh] max-h-full w-full border-0"
              /*
               * Kept from the legacy embed. `allowFullScreen` plus these features are what let a
               * Canva deck present properly; without them the guide opens but its controls are
               * inert. No `sandbox`: the embed is first-party content the organiser configured,
               * and sandboxing it breaks Canva's own scripts.
               */
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>

          {/* ------------------------------------------------------- footer */}
          <div className="flex justify-end border-t border-black/10 px-5 py-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md bg-[#52525b] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#3f3f46]"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
