"use client";

import { useRef, useState } from "react";
import { LABEL_CLASS, HINT_CLASS } from "./styles";

/**
 * Upload / preview / replace / remove widget for a single image setting (Branding's logos +
 * favicon, SEO's Open Graph / Twitter card images). Uploads happen immediately on file select
 * via /api/cp/settings/upload — the resulting URL then just rides along as a normal hidden
 * form field named `name`, so the page's own Server Action doesn't need to know anything about
 * multipart uploads; it reads this the same way it reads any other text field.
 *
 * "Remove" clears the field locally (submitted as an empty string) rather than calling a
 * separate delete endpoint — the old file is simply orphaned on disk until the slot is next
 * overwritten, which mirrors how the legacy PHP admin's own file fields worked and avoids
 * adding a second code path just to unlink a file that costs nothing to leave in place.
 *
 * Known minor gap: because the hidden field's value changes via React state (not a native DOM
 * input event), SettingsForm's form-level "Unsaved changes" indicator doesn't light up purely
 * from an upload/remove here — the Save button itself is unaffected either way, this only means
 * the soft dirty-state badge can under-report after an image-only change.
 */
export function ImageUploadField({
  name,
  slot,
  label,
  initialUrl,
  hint,
  accept = "image/png,image/jpeg,image/webp,image/svg+xml",
}: {
  name: string;
  slot: string;
  label: string;
  initialUrl: string | null;
  hint?: string;
  /** Narrows the file picker for slots with a format rule — the favicon only takes .ico. */
  accept?: string;
}) {
  const [url, setUrl] = useState(initialUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("slot", slot);
      const res = await fetch("/api/cp/settings/upload", { method: "POST", body });
      const data: { success?: boolean; url?: string; error?: string } = await res.json();
      if (!res.ok || !data.success || !data.url) throw new Error(data.error ?? "Upload failed.");
      setUrl(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <label className={LABEL_CLASS}>{label}</label>
      {/* This hidden input is what actually travels with the surrounding <form> submit — the
          upload above only ever writes a file to disk and reports back a URL. */}
      <input type="hidden" name={name} value={url} />
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/5">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element -- CP preview thumbnail for an
            // arbitrary, admin-uploaded local/remote image; next/image's domain allowlist isn't
            // worth the config churn for a small internal preview box.
            <img src={url} alt={`${label} preview`} className="h-full w-full object-contain" />
          ) : (
            <span className="text-center text-[9px] leading-tight text-zinc-600">No image</span>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="rounded-full border border-white/10 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-300 transition hover:bg-white/5 disabled:opacity-50"
            >
              {uploading ? "Uploading…" : url ? "Replace" : "Upload"}
            </button>
            {url && (
              <button
                type="button"
                onClick={() => setUrl("")}
                disabled={uploading}
                className="rounded-full border border-white/10 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-rose-400 transition hover:bg-rose-500/10 disabled:opacity-50"
              >
                Remove
              </button>
            )}
          </div>
          {hint && <p className={HINT_CLASS}>{hint}</p>}
          {error && (
            <p role="alert" className="text-xs font-bold text-rose-400">
              {error}
            </p>
          )}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        aria-label={`Upload ${label}`}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
