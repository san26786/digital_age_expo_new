"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios, { isAxiosError } from "axios";
import { AlertTriangle, Eye, Pencil, Plus, Trash2, X } from "lucide-react";
import { BLOG_STATUSES } from "@/lib/validations/userBlog";
import type { BlogPostRow } from "@/lib/services/userBlog";

import { ModalPortal } from "@/components/ui/ModalPortal";
/**
 * Port of legacy members/user_blog.tpl + blocks/user_blog_list.tpl.
 *
 * Keeps the legacy screen's shape — an "Add" action above a list of Title /
 * Date / Status / Manage(Edit, View, Delete) — but rendered on the site's dark
 * theme instead of the Bootstrap `btn-primary` / white-table markup, which was
 * the actual ask.
 *
 * Not carried across (deliberately): the section repeater and category picker.
 * `find_blog_section` and `find_blog_categories` are not in prisma/schema.prisma,
 * and src/lib/services/userBlog.ts already models a post without them — adding
 * them would mean inventing tables rather than porting a screen.
 */

interface Props {
  eventId: number;
  posts: BlogPostRow[];
}

type FormState = {
  id: number | null;
  title: string;
  content_short: string;
  content: string;
  status: (typeof BLOG_STATUSES)[number];
  date_publish: string;
};

const EMPTY_FORM: FormState = {
  id: null,
  title: "",
  content_short: "",
  content: "",
  status: "active",
  date_publish: "",
};

const STATUS_STYLES: Record<string, string> = {
  active: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  pending: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  suspended: "border-red-500/30 bg-red-500/10 text-red-300",
};

/** `datetime-local` needs `YYYY-MM-DDTHH:mm` in LOCAL time, not an ISO UTC string. */
function toDateTimeLocal(value: Date | string | null): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDate(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function UserBlogManager({ eventId, posts }: Props) {
  const router = useRouter();
  const [rows, setRows] = useState(posts);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => setRows(posts), [posts]);

  function openAdd() {
    setForm(EMPTY_FORM);
    setError(null);
    setModalOpen(true);
  }

  function openEdit(post: BlogPostRow) {
    setForm({
      id: post.id,
      title: post.title,
      content_short: post.contentShort ?? "",
      content: post.content,
      status: (BLOG_STATUSES as readonly string[]).includes(post.status)
        ? (post.status as (typeof BLOG_STATUSES)[number])
        : "active",
      date_publish: toDateTimeLocal(post.datePublish),
    });
    setError(null);
    setModalOpen(true);
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (form.id) {
        await axios.put(`/api/members/user-blog/${form.id}?event_id=${eventId}`, form);
        setNotice("Post updated.");
      } else {
        await axios.post(`/api/members/user-blog?event_id=${eventId}`, form);
        setNotice("Post added.");
      }
      setModalOpen(false);
      router.refresh();
    } catch (err) {
      const data = isAxiosError(err) ? err.response?.data?.error : null;
      setError(
        typeof data === "string"
          ? data
          : data && typeof data === "object"
            ? Object.values(data as Record<string, string[]>).flat().join(" ")
            : "Could not save this post.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function removePost(post: BlogPostRow) {
    if (!window.confirm(`Delete "${post.title}"? This cannot be undone.`)) return;
    setError(null);
    try {
      await axios.delete(`/api/members/user-blog/${post.id}?event_id=${eventId}`);
      setRows((current) => current.filter((r) => r.id !== post.id));
      setNotice("Post deleted.");
      router.refresh();
    } catch (err) {
      setError(
        isAxiosError(err) && typeof err.response?.data?.error === "string"
          ? err.response.data.error
          : "Could not delete this post.",
      );
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
          <Plus className="h-4 w-4" /> Add Post
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

      {/* Column headings — Title / Date / Status / Manage, as the legacy TableList */}
      <div className="hidden grid-cols-[1fr_11rem_8rem_7rem] items-center gap-4 border-b border-white/10 px-4 pb-3 text-[10px] font-black uppercase tracking-widest text-brand-pink md:grid">
        <span>Title</span>
        <span>Date</span>
        <span>Status</span>
        <span className="text-right">Manage</span>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/15 p-10 text-center text-sm text-zinc-400">
          No blog posts for this event yet. Use <span className="font-bold text-white">Add Post</span> to
          write the first one.
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((post) => (
            <li
              key={post.id}
              className="grid grid-cols-1 items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 transition hover:border-white/20 md:grid-cols-[1fr_11rem_8rem_7rem]"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-white">{post.title}</p>
                {post.contentShort && (
                  <p className="truncate text-[11px] text-zinc-500">{post.contentShort}</p>
                )}
              </div>

              <p className="text-xs text-zinc-400">
                <span className="font-bold uppercase text-zinc-500 md:hidden">Date: </span>
                {formatDate(post.date)}
              </p>

              <p>
                <span
                  className={`inline-block rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                    STATUS_STYLES[post.status] ?? "border-white/15 bg-white/5 text-zinc-300"
                  }`}
                >
                  {post.status}
                </span>
              </p>

              <div className="flex items-center gap-1 md:justify-end">
                <button
                  type="button"
                  onClick={() => openEdit(post)}
                  aria-label={`Edit ${post.title}`}
                  className="rounded-lg p-2 text-zinc-400 transition hover:bg-white/10 hover:text-white"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <a
                  href={`/article/${post.friendlyUrl}`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`View ${post.title}`}
                  className="rounded-lg p-2 text-zinc-400 transition hover:bg-white/10 hover:text-white"
                >
                  <Eye className="h-4 w-4" />
                </a>
                <button
                  type="button"
                  onClick={() => removePost(post)}
                  aria-label={`Delete ${post.title}`}
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
                {form.id ? "Edit Post" : "Add Post"}
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
                <label htmlFor="blog_title" className="mb-1.5 block text-xs font-bold text-zinc-300">
                  Title
                </label>
                <input
                  id="blog_title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full rounded-xl border px-3.5 py-2.5 text-sm"
                  placeholder="Post title"
                  required
                />
                <p className="mt-1 text-[11px] text-zinc-500">
                  The URL slug is generated from the title automatically.
                </p>
              </div>

              <div>
                <label htmlFor="blog_short" className="mb-1.5 block text-xs font-bold text-zinc-300">
                  Short Description
                </label>
                <textarea
                  id="blog_short"
                  rows={3}
                  value={form.content_short}
                  onChange={(e) => setForm({ ...form, content_short: e.target.value })}
                  className="w-full resize-none rounded-xl border px-3.5 py-2.5 text-sm"
                  placeholder="Shown in listings and used as the meta description."
                />
              </div>

              <div>
                <label htmlFor="blog_content" className="mb-1.5 block text-xs font-bold text-zinc-300">
                  Content
                </label>
                <textarea
                  id="blog_content"
                  rows={10}
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  className="w-full resize-y rounded-xl border px-3.5 py-2.5 text-sm"
                  placeholder="Full post content. Basic HTML is allowed."
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="blog_status" className="mb-1.5 block text-xs font-bold text-zinc-300">
                    Status
                  </label>
                  <select
                    id="blog_status"
                    value={form.status}
                    onChange={(e) =>
                      setForm({ ...form, status: e.target.value as (typeof BLOG_STATUSES)[number] })
                    }
                    className="w-full rounded-xl border px-3.5 py-2.5 text-sm"
                  >
                    {BLOG_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="blog_publish" className="mb-1.5 block text-xs font-bold text-zinc-300">
                    Publish Date
                  </label>
                  <input
                    id="blog_publish"
                    type="datetime-local"
                    value={form.date_publish}
                    onChange={(e) => setForm({ ...form, date_publish: e.target.value })}
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
