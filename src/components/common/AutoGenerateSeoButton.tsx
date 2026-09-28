"use client";

import { useState } from "react";
import { Check, Loader2, Sparkles, Undo2 } from "lucide-react";
import type { SeoFields, SeoSource } from "@/lib/seo/generate";

/**
 * ===========================================================================
 *  "AUTO GENERATE SEO" — shared by the Hub site editor and the CP settings tab
 * ===========================================================================
 *
 *  Both screens edit the same eight fields and store them under different
 *  names, so this component takes two callbacks rather than touching a form
 *  itself: `collect` hands it the facts currently on screen, `apply` puts the
 *  answer back wherever that screen keeps its values.
 *
 *  IT FILLS THE FORM; IT DOES NOT SAVE. Nothing reaches the database until the
 *  admin presses that screen's own Save. That is what makes overwriting eight
 *  fields on one click acceptable, and it is why the request asked for the
 *  values to be reviewable.
 *
 *  AND IT IS UNDOABLE. The previous values are kept and offered back until the
 *  next generation — the same bargain the logo-palette extraction on the Hub
 *  form makes, for the same reason: replacing work somebody may have typed by
 *  hand is only reasonable when putting it back is one click.
 */

export interface AutoGenerateSeoButtonProps {
  /** The facts to generate from, read at click time so unsaved edits are included. */
  collect: () => Omit<SeoSource, "dateStart" | "dateEnd"> & {
    siteId?: number;
    dateStart?: string | null;
    dateEnd?: string | null;
  };
  /** Writes a generated set into the screen's fields. Called for the undo too. */
  apply: (fields: SeoFields) => void;
  /** The values to offer back as "undo" — read at click time, before `apply` runs. */
  snapshot: () => SeoFields;
  className?: string;
}

export function AutoGenerateSeoButton({ collect, apply, snapshot, className }: AutoGenerateSeoButtonProps) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [tone, setTone] = useState<"ok" | "warn">("ok");
  const [undo, setUndo] = useState<SeoFields | null>(null);

  async function generate() {
    setBusy(true);
    setNote(null);

    // Taken BEFORE the request so a slow answer cannot race an edit made while waiting.
    const previous = snapshot();

    try {
      const response = await fetch("/api/seo/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(collect()),
      });

      const payload = (await response.json().catch(() => null)) as
        | { fields?: SeoFields; source?: "ai" | "fallback"; reason?: string; error?: string }
        | null;

      if (!response.ok || !payload?.fields) {
        setTone("warn");
        setNote(payload?.error || "The fields could not be generated. Nothing has been changed.");
        return;
      }

      apply(payload.fields);
      setUndo(previous);
      setTone(payload.source === "ai" ? "ok" : "warn");
      setNote(
        payload.source === "ai"
          ? "Generated below. Read them over and edit anything you want — nothing is saved until you press Save."
          : payload.reason || "Generated from your site details. Read them over before saving."
      );
    } catch {
      setTone("warn");
      setNote("The fields could not be generated — check your connection. Nothing has been changed.");
    } finally {
      setBusy(false);
    }
  }

  function revert() {
    if (!undo) return;
    apply(undo);
    setUndo(null);
    setTone("ok");
    setNote("Put back to what was there before.");
  }

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={generate}
          disabled={busy}
          title="Writes all eight fields from this site's name, address, event and whatever you have already typed. Nothing is saved until you press Save."
          className="inline-flex items-center gap-2 rounded-full border border-brand-pink/40 bg-brand-pink/10 px-5 py-2.5 text-[11px] font-black uppercase tracking-widest text-white transition hover:bg-brand-pink/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {busy ? "Generating…" : "Auto Generate SEO"}
        </button>

        {undo && !busy && (
          <button
            type="button"
            onClick={revert}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-white/60 transition hover:text-white"
          >
            <Undo2 className="h-3.5 w-3.5" />
            Undo
          </button>
        )}
      </div>

      {note && (
        <p
          aria-live="polite"
          className={`mt-3 flex items-start gap-2 text-[11px] leading-relaxed ${
            tone === "ok" ? "text-emerald-300/90" : "text-amber-200/90"
          }`}
        >
          {tone === "ok" && <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
          <span>{note}</span>
        </p>
      )}
    </div>
  );
}
