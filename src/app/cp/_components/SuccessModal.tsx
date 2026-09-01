"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

import { ModalPortal } from "@/components/ui/ModalPortal";
/**
 * Shared "action succeeded" popup for CP create/update flows — e.g. Add User redirects to
 * /cp/users?created=1 after saving, and this renders the confirmation over that list page.
 * `cleanUrl` is where the "created=1"-style flag gets stripped to: closing the modal (by
 * button, backdrop click, or the auto-close timer) replaces the URL so refreshing or
 * navigating back doesn't re-trigger the same popup.
 */
export function SuccessModal({
  message,
  cleanUrl,
  autoCloseMs = 4000,
}: {
  message: string;
  cleanUrl: string;
  autoCloseMs?: number;
}) {
  const [open, setOpen] = useState(true);
  const router = useRouter();

  function close() {
    setOpen(false);
    router.replace(cleanUrl, { scroll: false });
  }

  useEffect(() => {
    const timer = setTimeout(close, autoCloseMs);
    return () => clearTimeout(timer);
    // Only ever meant to run once, on mount — re-running per render would reset the timer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!open) return null;

  return (
    <ModalPortal>
      <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto overscroll-contain bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={close}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-zinc-900 p-6 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <p className="mt-4 text-sm font-bold text-white">{message}</p>
        <button
          type="button"
          onClick={close}
          className="mt-5 rounded-full bg-brand-pink px-6 py-2 text-xs font-black uppercase tracking-widest text-white transition hover:scale-[1.02] active:scale-95"
        >
          Close
        </button>
      </div>
    </div>
    </ModalPortal>
  );
}
