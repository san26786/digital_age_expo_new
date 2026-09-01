"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import axios, { isAxiosError } from "axios";
import {
  AlertTriangle,
  Ban,
  Check,
  ExternalLink,
  ImagePlus,
  Pencil,
  Plus,
  Rss,
  Trash2,
  X,
} from "lucide-react";
import { assetUrl } from "@/lib/assets";
import type { NewsFeedRow } from "@/lib/services/eventNewsFeed";

import { ModalPortal } from "@/components/ui/ModalPortal";
/**
 * Port of legacy members/news_feed.tpl + blocks/news_feed_form.tpl.
 *
 * The legacy screen was Bootstrap: a `btn-primary pull-right` "Add Event News
 * Feed" link above a white TableList of ID / Title / Description / URL / Active
 * / Issue Date / Expiry Date / Manage. That structure is kept, but rendered on
 * this site's dark theme (zinc-950 surfaces, zinc body text, brand-pink
 * accents) to match the other members pages — which was the ask.
 *
 * The legacy `?action=add|edit|delete|active|inactive` query-string round-trips
 * are replaced by a modal plus the /api/members/news-feed routes.
 *
 * Image handling mirrors news_feed.php exactly: the row is saved first, then
 * the file is copied to /files/feeds/<id>.<ext>, because the legacy filename is
 * keyed by the row's own id.
 */

interface Props {
  eventId: number;
  items: NewsFeedRow[];
}

type FormState = {
  id: number | null;
  title: string;
  description: string;
  url: string;
  limit: string;
  active: boolean;
  issue_date: string;
  expiry_date: string;
};

const EMPTY_FORM: FormState = {
  id: null,
  title: "",
  description: "",
  url: "",
  limit: "5",
  active: true,
  issue_date: "",
  expiry_date: "",
};

/** `datetime-local` needs `YYYY-MM-DDTHH:mm` in LOCAL time, not an ISO UTC string. */
function toDateTimeLocal(value: Date | string | null): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDate(value: Date | string | null): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

export function EventNewsFeedManager({ eventId, items }: Props) {
  const router = useRouter();
  const [rows, setRows] = useState(items);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => setRows(items), [items]);

  // Revoke the last object URL when the component goes away.
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  function setPreview(next: string | null) {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setImagePreview(next);
  }

  function openAdd() {
    setForm(EMPTY_FORM);
    setImageFile(null);
    setPreview(null);
    setError(null);
    setModalOpen(true);
  }

  function openEdit(item: NewsFeedRow) {
    setForm({
      id: item.id,
      title: item.title,
      description: item.description ?? "",
      url: item.url ?? "",
      limit: String(item.limit ?? 5),
      active: item.active,
      issue_date: toDateTimeLocal(item.issueDate),
      expiry_date: toDateTimeLocal(item.expiryDate),
    });
    setImageFile(null);
    setPreview(item.image ? (assetUrl(item.image) ?? null) : null);
    setError(null);
    setModalOpen(true);
  }

  function onPickImage(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setImageFile(file);
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);
      objectUrlRef.current = objectUrl;
    }
  }

  async function uploadImage(id: number) {
    if (!imageFile) return;
    const data = new FormData();
    data.append("file", imageFile);
    data.append("id", String(id));
    await axios.post(`/api/members/news-feed/upload?event_id=${eventId}`, data);
  }

  function readError(err: unknown, fallback: string): string {
    const data = isAxiosError(err) ? err.response?.data?.error : null;
    if (typeof data === "string") return data;
    if (data && typeof data === "object") {
      return Object.values(data as Record<string, string[]>).flat().join(" ") || fallback;
    }
    return fallback;
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = { ...form, limit: Number(form.limit) || 0 };

    try {
      if (form.id) {
        await axios.put(`/api/members/news-feed/${form.id}?event_id=${eventId}`, payload);
        await uploadImage(form.id);
        setNotice("Event news feed updated.");
      } else {
        // Save first — the upload route names the file after the new row's id.
        const res = await axios.post(`/api/members/news-feed?event_id=${eventId}`, payload);
        const newId = Number(res.data?.id);
        if (newId) await uploadImage(newId);
        setNotice("Event news feed inserted.");
      }
      setModalOpen(false);
      setImageFile(null);
      setPreview(null);
      router.refresh();
    } catch (err) {
      setError(readError(err, "Could not save this news feed."));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(item: NewsFeedRow) {
    const next = !item.active;
    setError(null);
    // Optimistic — rolled back below if the request fails.
    setRows((current) => current.map((r) => (r.id === item.id ? { ...r, active: next } : r)));
    try {
      await axios.patch(`/api/members/news-feed/${item.id}?event_id=${eventId}`, { active: next });
      setNotice(next ? "Event news feed activated." : "Event news feed deactivated.");
      router.refresh();
    } catch (err) {
      setRows((current) => current.map((r) => (r.id === item.id ? { ...r, active: item.active } : r)));
      setError(readError(err, "Could not change the feed status."));
    }
  }

  async function removeItem(item: NewsFeedRow) {
    if (!window.confirm(`Delete "${item.title}"? This cannot be undone.`)) return;
    setError(null);
    try {
      await axios.delete(`/api/members/news-feed/${item.id}?event_id=${eventId}`);
      setRows((current) => current.filter((r) => r.id !== item.id));
      setNotice("Event news feed deleted.");
      router.refresh();
    } catch (err) {
      setError(readError(err, "Could not delete this news feed."));
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={openAdd}
          className="btn-brand-gradient inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-black uppercase tracking-wider"
        >
          <Plus className="h-4 w-4" /> Add Event News Feed
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs font-bold text-red-300"
        >
          <AlertTriangle className="mt-px h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {notice && !error && (
        <div
          role="status"
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs font-bold text-emerald-300"
        >
          {notice}
        </div>
      )}

      {/* Column headings — the legacy TableList, minus the raw ID column. */}
      <div className="hidden grid-cols-[1fr_14rem_10rem_6rem_7rem] items-center gap-4 border-b border-white/10 px-4 pb-3 text-[10px] font-black uppercase tracking-widest text-brand-pink lg:grid">
        <span>Title &amp; Description</span>
        <span>URL</span>
        <span>Issue / Expiry</span>
        <span>Active</span>
        <span className="text-right">Manage</span>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/15 p-10 text-center text-sm text-zinc-400">
          No news feeds for this event yet. Use{" "}
          <span className="font-bold text-white">Add Event News Feed</span> to create the first one.
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((item) => (
            <li
              key={item.id}
              className="grid grid-cols-1 items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 transition hover:border-white/20 lg:grid-cols-[1fr_14rem_10rem_6rem_7rem]"
            >
              <div className="flex min-w-0 items-center gap-3">
                {item.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={assetUrl(item.image)}
                    alt=""
                    className="h-11 w-11 shrink-0 rounded-lg border border-white/10 object-cover"
                  />
                ) : (
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-zinc-600">
                    <Rss className="h-4 w-4" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-white">
                    {item.title}
                    <span className="ml-1 text-[10px] font-medium text-zinc-600">#{item.id}</span>
                  </p>
                  {item.description && (
                    <p className="truncate text-[11px] text-zinc-500">{item.description}</p>
                  )}
                </div>
              </div>

              <p className="min-w-0 text-xs">
                {item.url ? (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex max-w-full items-center gap-1 truncate text-brand-pink transition hover:underline"
                  >
                    <ExternalLink className="h-3 w-3 shrink-0" />
                    <span className="truncate">{item.url}</span>
                  </a>
                ) : (
                  <span className="text-zinc-600">—</span>
                )}
              </p>

              <p className="text-[11px] leading-relaxed text-zinc-400">
                <span className="font-bold uppercase text-zinc-500 lg:hidden">Dates: </span>
                {formatDate(item.issueDate)}
                <span className="text-zinc-600"> → </span>
                {formatDate(item.expiryDate)}
              </p>

              <p>
                <span
                  className={`inline-block rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                    item.active
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                      : "border-white/15 bg-white/5 text-zinc-400"
                  }`}
                >
                  {item.active ? "Yes" : "No"}
                </span>
              </p>

              <div className="flex items-center gap-1 lg:justify-end">
                <button
                  type="button"
                  onClick={() => openEdit(item)}
                  aria-label={`Edit ${item.title}`}
                  title="Edit"
                  className="rounded-lg p-2 text-zinc-400 transition hover:bg-white/10 hover:text-white"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => toggleActive(item)}
                  aria-label={item.active ? `Make ${item.title} inactive` : `Make ${item.title} active`}
                  title={item.active ? "Make Inactive" : "Make Active"}
                  className={`rounded-lg p-2 transition hover:bg-white/10 ${
                    item.active ? "text-amber-400 hover:text-amber-300" : "text-emerald-400 hover:text-emerald-300"
                  }`}
                >
                  {item.active ? <Ban className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => removeItem(item)}
                  aria-label={`Delete ${item.title}`}
                  title="Delete"
                  className="rounded-lg p-2 text-red-400 transition hover:bg-red-500/10 hover:text-red-300"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {modalOpen && (
        <ModalPortal>
      <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto overscroll-contain bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="glass-panel max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl p-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-lg font-black uppercase text-white">
                {form.id ? "Edit Event News Feed" : "Add Event News Feed"}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-zinc-400 transition hover:text-white"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={submitForm} className="mt-5 space-y-4">
              <div>
                <label htmlFor="feed_title" className="mb-1.5 block text-xs font-bold text-zinc-300">
                  Title
                </label>
                <input
                  id="feed_title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full rounded-xl border px-3.5 py-2.5 text-sm"
                  placeholder="New York Times News"
                  required
                />
                <p className="mt-1 text-[11px] text-zinc-500">
                  Title of the feed. (Example: New York Times News)
                </p>
              </div>

              <div>
                <label htmlFor="feed_description" className="mb-1.5 block text-xs font-bold text-zinc-300">
                  Description
                </label>
                <textarea
                  id="feed_description"
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full resize-y rounded-xl border px-3.5 py-2.5 text-sm"
                  placeholder="Top financial news from the world leading news source."
                  required
                />
                <p className="mt-1 text-[11px] text-zinc-500">Text describing the feed.</p>
              </div>

              <div>
                <label htmlFor="feed_url" className="mb-1.5 block text-xs font-bold text-zinc-300">
                  URL
                </label>
                <input
                  id="feed_url"
                  type="url"
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  className="w-full rounded-xl border px-3.5 py-2.5 text-sm"
                  placeholder="https://example.com/rss.xml"
                />
                <p className="mt-1 text-[11px] text-zinc-500">
                  Feed URL that will be read from. This must be a valid RSS or ATOM feed.
                </p>
              </div>

              <div>
                <span className="mb-1.5 block text-xs font-bold text-zinc-300">Image</span>
                <div className="flex items-center gap-4">
                  <label className="group relative cursor-pointer">
                    {imagePreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={imagePreview}
                        alt=""
                        className="h-24 w-24 rounded-2xl border border-white/10 object-cover shadow-2xl transition group-hover:opacity-50"
                      />
                    ) : (
                      <div className="flex h-24 w-24 items-center justify-center rounded-2xl border border-dashed border-white/20 bg-white/5 text-zinc-500 transition group-hover:text-white">
                        <ImagePlus className="h-8 w-8" />
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      className="hidden"
                      onChange={onPickImage}
                    />
                  </label>
                  <p className="text-[11px] text-zinc-500">
                    JPG, PNG, GIF or WEBP, up to 5MB.
                    {!form.id && " The image uploads right after the feed is saved."}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="feed_limit" className="mb-1.5 block text-xs font-bold text-zinc-300">
                    Limit
                  </label>
                  <input
                    id="feed_limit"
                    type="number"
                    min={0}
                    max={100}
                    value={form.limit}
                    onChange={(e) => setForm({ ...form, limit: e.target.value })}
                    className="w-full rounded-xl border px-3.5 py-2.5 text-sm"
                  />
                  <p className="mt-1 text-[11px] text-zinc-500">How many items to show from the feed.</p>
                </div>

                <div className="flex items-end">
                  <label className="flex cursor-pointer items-center gap-3 pb-2.5">
                    <input
                      type="checkbox"
                      checked={form.active}
                      onChange={(e) => setForm({ ...form, active: e.target.checked })}
                      className="h-4 w-4 accent-[var(--brand-pink,#ec4899)]"
                    />
                    <span className="text-xs font-bold text-zinc-300">
                      Active
                      <span className="block text-[11px] font-medium text-zinc-500">
                        If disabled the feed is not displayed.
                      </span>
                    </span>
                  </label>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="feed_issue" className="mb-1.5 block text-xs font-bold text-zinc-300">
                    Issue Date
                  </label>
                  <input
                    id="feed_issue"
                    type="datetime-local"
                    value={form.issue_date}
                    onChange={(e) => setForm({ ...form, issue_date: e.target.value })}
                    className="w-full rounded-xl border px-3.5 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="feed_expiry" className="mb-1.5 block text-xs font-bold text-zinc-300">
                    Expire Date
                  </label>
                  <input
                    id="feed_expiry"
                    type="datetime-local"
                    value={form.expiry_date}
                    onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
                    className="w-full rounded-xl border px-3.5 py-2.5 text-sm"
                  />
                </div>
              </div>

              {error && <p className="text-xs font-semibold text-red-400">{error}</p>}

              <div className="flex justify-end gap-3 border-t border-white/10 pt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-white/15 px-5 py-2.5 text-xs font-bold uppercase text-white transition hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-brand-gradient rounded-xl px-6 py-2.5 text-xs font-black uppercase tracking-wider disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Submit"}
                </button>
              </div>
            </form>
          </div>
        </div>
    </ModalPortal>
      )}
    </div>
  );
}
