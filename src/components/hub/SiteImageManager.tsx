"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ExternalLink,
  FileCode2,
  ImageIcon,
  Layers,
  Loader2,
  Upload,
} from "lucide-react";
import type { ImageSlot } from "@/lib/images/registry";

/**
 * ===========================================================================
 *  MANAGE IMAGES & BANNERS
 * ===========================================================================
 *
 *  Every image the public site shows, grouped Page → Section, with a preview.
 *
 *  ---------------------------------------------------------------------------
 *   WHAT THIS SCREEN WILL AND WILL NOT DO
 *  ---------------------------------------------------------------------------
 *
 *  Opening it changes nothing. Editing a field changes nothing. A picture moves
 *  only when an admin presses Save on that one card, and then only that card's
 *  image moves — there is no "save all", and each card owns its own request.
 *
 *  Three kinds of card, and the difference is stated on the card rather than
 *  hidden behind a disabled control:
 *
 *    editable     the value lives in a database row this screen can update.
 *    collection   many images, one per record (every speaker's portrait); they
 *                 belong to those records, so the card says where to edit them.
 *    in code      a literal in a component. Shown with the file and line so it
 *                 can be found, and not pretended to be editable.
 *
 *  Alt text and image title save for EVERY card, including the read-only ones —
 *  they go into their own new settings rows. No public page renders them yet,
 *  and the screen says so rather than implying an effect it does not have.
 */

export interface ResolvedSlotDto {
  slot: ImageSlot;
  currentUrl: string | null;
  storedValue: string | null;
  editable: boolean;
  rowId: number | null;
  altText: string;
  imageTitle: string;
  count?: number;
  usingDefault: boolean;
}

type Draft = { imageUrl: string; altText: string; imageTitle: string };
type CardState = { saving: boolean; uploading: boolean; message: string | null; tone: "ok" | "warn" };

const CARD = "rounded-2xl border border-white/10 bg-white/5 p-5";
const LABEL = "mb-1.5 block text-[11px] font-black uppercase tracking-[0.15em] text-white/50";
const FIELD =
  "w-full rounded-xl border border-white/10 bg-black/30 px-3.5 py-2.5 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-brand-pink/60";

export function SiteImageManager({
  siteId,
  siteName,
  initialSlots,
}: {
  siteId: number;
  siteName: string;
  initialSlots: ResolvedSlotDto[];
}) {
  const [slots, setSlots] = useState(initialSlots);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [cards, setCards] = useState<Record<string, CardState>>({});
  const [filter, setFilter] = useState<"all" | "editable" | "code">("all");

  const groups = useMemo(() => {
    const visible = slots.filter((entry) => {
      if (filter === "editable") return entry.editable;
      if (filter === "code") return entry.slot.source.kind === "code";
      return true;
    });

    const out: { page: string; entries: ResolvedSlotDto[] }[] = [];
    for (const entry of visible) {
      const existing = out.find((group) => group.page === entry.slot.page);
      if (existing) existing.entries.push(entry);
      else out.push({ page: entry.slot.page, entries: [entry] });
    }
    return out;
  }, [slots, filter]);

  /** The draft for a card, defaulting to what is stored — so an untouched field saves unchanged. */
  const draftFor = (entry: ResolvedSlotDto): Draft =>
    drafts[entry.slot.id] ?? {
      imageUrl: entry.storedValue ?? "",
      altText: entry.altText,
      imageTitle: entry.imageTitle,
    };

  const setDraft = (entry: ResolvedSlotDto, patch: Partial<Draft>) =>
    setDrafts((current) => ({ ...current, [entry.slot.id]: { ...draftFor(entry), ...patch } }));

  const setCard = (slotId: string, patch: Partial<CardState>) =>
    setCards((current) => ({
      ...current,
      [slotId]: { saving: false, uploading: false, message: null, tone: "ok", ...current[slotId], ...patch },
    }));

  async function upload(entry: ResolvedSlotDto, file: File) {
    setCard(entry.slot.id, { uploading: true, message: null });
    const body = new FormData();
    body.append("file", file);
    body.append("slotId", entry.slot.id);

    try {
      const response = await fetch(`/api/hub/sites/${siteId}/images/upload`, { method: "POST", body });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.url) {
        setCard(entry.slot.id, { uploading: false, tone: "warn", message: payload?.error || "Upload failed." });
        return;
      }
      // Into the DRAFT, not the database. The admin still has to press Save — which is what keeps
      // "nothing changes unless you choose to change it" true even after picking a file.
      setDraft(entry, { imageUrl: payload.url });
      setCard(entry.slot.id, {
        uploading: false,
        tone: "ok",
        message: "Uploaded. Press Save to put it on the site.",
      });
    } catch {
      setCard(entry.slot.id, { uploading: false, tone: "warn", message: "Upload failed — check your connection." });
    }
  }

  async function save(entry: ResolvedSlotDto) {
    const draft = draftFor(entry);
    setCard(entry.slot.id, { saving: true, message: null });

    const body: Record<string, string> = {
      slotId: entry.slot.id,
      altText: draft.altText,
      imageTitle: draft.imageTitle,
    };
    // Sent only for a slot this screen may change, and only when it actually differs — an
    // unchanged field should not produce a write at all.
    if (entry.editable && draft.imageUrl !== (entry.storedValue ?? "")) {
      body.imageUrl = draft.imageUrl;
    }

    try {
      const response = await fetch(`/api/hub/sites/${siteId}/images`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setCard(entry.slot.id, { saving: false, tone: "warn", message: payload?.error || "Could not save." });
        return;
      }
      if (payload?.slots) setSlots(payload.slots);
      setDrafts((current) => {
        const next = { ...current };
        delete next[entry.slot.id];
        return next;
      });
      setCard(entry.slot.id, { saving: false, tone: "ok", message: "Saved." });
    } catch {
      setCard(entry.slot.id, { saving: false, tone: "warn", message: "Could not save — check your connection." });
    }
  }

  const editableCount = slots.filter((entry) => entry.editable).length;
  const codeCount = slots.filter((entry) => entry.slot.source.kind === "code").length;

  return (
    <div>
      <Link
        href="/hub/sites"
        className="mb-6 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white/50 transition hover:text-white"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All sites
      </Link>

      <h2 className="text-2xl font-bold text-white">Images &amp; banners</h2>
      <p className="mt-1 text-sm text-white/60">
        {siteName} · site #{siteId}
      </p>

      <div className="mt-6 flex items-start gap-3 rounded-2xl border border-sky-400/25 bg-sky-400/10 p-4">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" />
        <p className="text-[12px] leading-relaxed text-sky-100/90">
          Nothing here changes until you press <strong>Save</strong> on a card, and saving a card
          changes only that one image. Uploading a file does not put it on the site on its own.
          Alt text and image title are stored for later — no page displays them yet.
        </p>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {([
          ["all", `Everything (${slots.length})`],
          ["editable", `Editable here (${editableCount})`],
          ["code", `Set in code (${codeCount})`],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-widest transition ${
              filter === key
                ? "bg-gradient-to-r from-brand-purple to-brand-pink text-white"
                : "border border-white/10 text-white/50 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {groups.map((group) => (
        <section key={group.page} className="mt-10">
          <h3 className="mb-4 text-xs font-black uppercase tracking-[0.2em] text-brand-pink">
            {group.page}
          </h3>

          <div className="grid gap-5 lg:grid-cols-2">
            {group.entries.map((entry) => {
              const draft = draftFor(entry);
              const card = cards[entry.slot.id];
              const busy = Boolean(card?.saving || card?.uploading);
              const source = entry.slot.source;

              /*
               * The RESOLVED url, not the stored value.
               *
               * `draft.imageUrl` starts as the raw database value — a bare legacy filename, or the
               * remote literal for a code slot — which is exactly what does not render: pointing a
               * preview at it asks the browser for the dead legacy host. So the resolved url wins
               * until the admin actually edits the field, at which point what they typed (or the
               * path an upload just returned) is what should be shown.
               */
              const edited = draft.imageUrl !== (entry.storedValue ?? "");
              const preview = edited ? draft.imageUrl : entry.currentUrl;

              return (
                <div key={entry.slot.id} className={CARD}>
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-white">{entry.slot.section}</p>
                      <p className="mt-0.5 text-xs text-white/50">{entry.slot.label}</p>
                    </div>
                    <SourceBadge kind={source.kind} />
                  </div>

                  <div className="mb-4 overflow-hidden rounded-xl border border-white/10 bg-black/40">
                    {source.kind === "code" && source.multiple ? (
                      <div className="flex h-36 flex-col items-center justify-center gap-1.5 px-4 text-center text-white/40">
                        <Layers className="h-5 w-5" />
                        <span className="text-xs font-bold">
                          {source.literal.split(",").length} images in this block
                        </span>
                      </div>
                    ) : source.kind === "collection" ? (
                      <div className="flex h-36 flex-col items-center justify-center gap-1.5 text-white/40">
                        <Layers className="h-5 w-5" />
                        <span className="text-xs font-bold">
                          {entry.count === undefined ? "Several images" : `${entry.count} image${entry.count === 1 ? "" : "s"}`}
                        </span>
                      </div>
                    ) : preview ? (
                      /* eslint-disable-next-line @next/next/no-img-element -- previews point at
                         arbitrary legacy asset paths; next/image would need per-host config for
                         every domain the asset map can return. */
                      <img
                        src={preview}
                        alt=""
                        className="h-36 w-full bg-black/40 object-contain"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-36 flex-col items-center justify-center gap-1.5 text-white/30">
                        <ImageIcon className="h-5 w-5" />
                        <span className="text-xs font-bold">No image set</span>
                      </div>
                    )}
                  </div>

                  {entry.usingDefault && !edited && (
                    <p className="mb-3 text-[11px] font-bold leading-relaxed text-sky-300/80">
                      Nothing is stored for this slot — the site is showing its built-in default.
                      Uploading here replaces it.
                    </p>
                  )}

                  {entry.slot.hint && (
                    <p className="mb-4 text-[11px] leading-relaxed text-white/40">{entry.slot.hint}</p>
                  )}

                  {source.kind === "code" && (
                    <p className="mb-4 flex items-start gap-2 rounded-xl border border-white/10 bg-black/20 p-3 text-[11px] leading-relaxed text-white/45">
                      <FileCode2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>
                        Written into <code className="text-white/70">{source.file}</code> at line{" "}
                        {source.line}. Changing it means editing that file.
                      </span>
                    </p>
                  )}

                  {source.kind === "collection" && (
                    <p className="mb-4 rounded-xl border border-white/10 bg-black/20 p-3 text-[11px] leading-relaxed text-white/45">
                      Each image belongs to its own record. Edit them in {source.managedAt}.
                    </p>
                  )}

                  {entry.editable && (
                    <div className="mb-4 space-y-3">
                      <div>
                        <label className={LABEL} htmlFor={`url-${entry.slot.id}`}>
                          Image URL
                        </label>
                        <input
                          id={`url-${entry.slot.id}`}
                          className={FIELD}
                          value={draft.imageUrl}
                          placeholder="/files/site-images/…"
                          onChange={(event) => setDraft(entry, { imageUrl: event.target.value })}
                          autoComplete="off"
                        />
                      </div>

                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-[11px] font-black uppercase tracking-widest text-white/70 transition hover:text-white">
                        {card?.uploading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Upload className="h-3.5 w-3.5" />
                        )}
                        {card?.uploading ? "Uploading…" : "Upload a new image"}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={busy}
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            // Cleared so picking the same file twice still fires a change.
                            event.target.value = "";
                            if (file) void upload(entry, file);
                          }}
                        />
                      </label>
                    </div>
                  )}

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className={LABEL} htmlFor={`alt-${entry.slot.id}`}>
                        Alt text
                      </label>
                      <input
                        id={`alt-${entry.slot.id}`}
                        className={FIELD}
                        value={draft.altText}
                        placeholder="Describe the image"
                        onChange={(event) => setDraft(entry, { altText: event.target.value })}
                        autoComplete="off"
                      />
                    </div>
                    <div>
                      <label className={LABEL} htmlFor={`title-${entry.slot.id}`}>
                        Image title
                      </label>
                      <input
                        id={`title-${entry.slot.id}`}
                        className={FIELD}
                        value={draft.imageTitle}
                        placeholder="Optional"
                        onChange={(event) => setDraft(entry, { imageTitle: event.target.value })}
                        autoComplete="off"
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => void save(entry)}
                      disabled={busy}
                      className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-purple to-brand-pink px-6 py-2.5 text-[11px] font-black uppercase tracking-widest text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {card?.saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      {card?.saving ? "Saving…" : "Save"}
                    </button>

                    <a
                      href={entry.slot.route}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-white/40 transition hover:text-white"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      View page
                    </a>

                    {card?.message && (
                      <span
                        className={`inline-flex items-center gap-1.5 text-[11px] font-bold ${
                          card.tone === "ok" ? "text-emerald-300" : "text-amber-200"
                        }`}
                      >
                        {card.tone === "ok" && <Check className="h-3.5 w-3.5" />}
                        {card.message}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function SourceBadge({ kind }: { kind: ImageSlot["source"]["kind"] }) {
  const style = "shrink-0 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.15em]";
  if (kind === "code") return <span className={`${style} bg-white/10 text-white/50`}>Set in code</span>;
  if (kind === "collection") return <span className={`${style} bg-white/10 text-white/50`}>Many images</span>;
  return <span className={`${style} bg-emerald-400/15 text-emerald-300`}>Editable</span>;
}
