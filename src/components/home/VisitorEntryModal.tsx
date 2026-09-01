"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import { X, LogIn, CheckCircle2, Ticket } from "lucide-react";

import { ModalPortal } from "@/components/ui/ModalPortal";
/**
 * "Visitor Login" entry point — surfaced when the homepage is opened with
 * `?view=virtual-event` (the nav menu's Visitor Login links, see menu.ts ids 24 & 82).
 * Visitors are guest RSVP rows (find_events_rsvp), not password accounts, so this does a
 * passwordless email lookup against the current event's RSVP list rather than a next-auth
 * credentials sign-in (that flow is for Speaker/Exhibitor accounts at /members/index).
 */
export function VisitorEntryModal() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "checking" | "found" | "not-found" | "error">("idle");
  const [visitorName, setVisitorName] = useState<string | null>(null);

  function close() {
    router.replace("/", { scroll: false });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("checking");
    try {
      const { data } = await axios.post("/api/visitor-lookup", { email });
      if (data.found) {
        setVisitorName(data.name || null);
        setStatus("found");
      } else {
        setStatus("not-found");
      }
    } catch {
      setStatus("error");
    }
  }

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto overscroll-contain bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-white/15 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-5 relative">
        <button
          type="button"
          onClick={close}
          className="absolute top-4 right-4 text-slate-400 hover:text-white"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 rounded-full bg-fuchsia-500/20 px-3 py-1 text-xs font-bold uppercase tracking-widest text-fuchsia-300">
            <LogIn className="w-3.5 h-3.5" /> Visitor Login
          </div>
          <h2 className="text-xl sm:text-2xl font-black uppercase text-white">Enter the Virtual Show</h2>
          <p className="text-xs text-slate-400">
            Enter the email address you used to claim your free ticket to access the virtual event.
          </p>
        </div>

        {status === "found" ? (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/40 p-5 text-center space-y-3">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <p className="text-sm font-bold text-white">
              Welcome back{visitorName ? `, ${visitorName}` : ""}!
            </p>
            <p className="text-xs text-emerald-200">You&apos;re registered for this event. Head to the show floor below.</p>
            <Link
              href="/glimpse-of-the-show"
              className="inline-block mt-2 rounded-full bg-emerald-600 px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-emerald-500"
            >
              Enter the Show
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full rounded-xl border border-white/20 bg-slate-950 px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-fuchsia-500 focus:outline-none"
            />

            {status === "not-found" && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-950/30 p-3 text-xs text-amber-200 space-y-2">
                <p>We couldn&apos;t find a ticket registered to that email.</p>
                <Link href="/free-ticket" className="inline-flex items-center gap-1.5 font-bold text-amber-300 hover:underline">
                  <Ticket className="w-3.5 h-3.5" /> Claim a free ticket
                </Link>
              </div>
            )}

            {status === "error" && (
              <p className="text-xs text-rose-400">Something went wrong. Please try again.</p>
            )}

            <button
              type="submit"
              disabled={status === "checking"}
              className="btn-brand-gradient w-full rounded-xl py-3 text-xs font-black uppercase tracking-wider text-white shadow-lg transition disabled:opacity-50"
            >
              {status === "checking" ? "Checking..." : "Continue"}
            </button>

            <p className="text-center text-[11px] text-slate-500">
              Speaker or Exhibitor?{" "}
              <Link href="/members/index" className="text-fuchsia-400 hover:underline">
                Log in here
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
    </ModalPortal>
  );
}
