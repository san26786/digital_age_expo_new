"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";

/**
 * Remove a site the Hub created.
 *
 * TYPE-TO-CONFIRM, NOT "ARE YOU SURE?".
 *
 * A confirm dialog on a destructive action is a reflex people learn to click through — by the
 * tenth time it is muscle memory, and muscle memory is precisely what you do not want standing
 * between someone and several thousand deleted rows. Typing the site's own name cannot be done
 * by reflex: it requires reading which site this is, which is the thing that actually goes wrong
 * (deleting the right row on the wrong site).
 *
 * `window.confirm` is also avoided for a mechanical reason — a native modal blocks the page and,
 * in an automated or embedded browser, can wedge the session entirely.
 */
export function DeleteSiteButton({ siteId, siteName }: { siteId: number; siteName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const matches = typed.trim().toLowerCase() === siteName.trim().toLowerCase();

  async function remove() {
    setBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/hub/sites/${siteId}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? `Delete failed (${response.status})`);

      setOpen(false);
      setTyped("");
      // The list is a server component, so re-render it from the server rather than patching
      // local state — otherwise the row disappears while the database still has it on a partial
      // failure, which is the wrong way round for a delete.
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The site could not be removed.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white/50 transition hover:border-red-400/50 hover:text-red-300"
      >
        <Trash2 className="h-3 w-3" />
        Delete
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-red-400/30 bg-red-400/10 p-3">
      <p className="text-[11px] leading-relaxed text-white/80">
        This removes the site and every row created with it. Type{" "}
        <span className="font-bold text-white">{siteName}</span> to confirm.
      </p>

      <input
        value={typed}
        onChange={(event) => setTyped(event.target.value)}
        className="mt-2 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white"
        placeholder={siteName}
        autoComplete="off"
      />

      {error && <p className="mt-2 text-[11px] text-amber-200">{error}</p>}

      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={remove}
          disabled={!matches || busy}
          className="inline-flex items-center gap-1.5 rounded-full bg-red-500 px-4 py-1.5 text-[11px] font-black uppercase tracking-wider text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy && <Loader2 className="h-3 w-3 animate-spin" />}
          {busy ? "Removing…" : "Delete"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setTyped("");
            setError(null);
          }}
          className="rounded-full border border-white/15 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white/60 transition hover:text-white"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
