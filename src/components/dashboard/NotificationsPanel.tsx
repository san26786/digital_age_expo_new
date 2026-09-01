"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios, { isAxiosError } from "axios";
import { Send, RotateCcw, Trash2, Search } from "lucide-react";
import { eventNotificationSchema, type EventNotificationInput } from "@/lib/validations/eventNotification";
import type { EventNotificationRow, NotificationLinkOption } from "@/lib/services/eventNotifications";
import { TablePagination } from "@/components/dashboard/TablePagination";

const PAGE_SIZE = 20;

const FIELD_CLASS =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-brand-pink focus:outline-none transition-colors backdrop-blur-md";

const DATE_FORMAT = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

interface Props {
  notifications: EventNotificationRow[];
  canManage: boolean;
  linkOptions: { lobbies: NotificationLinkOption[]; exhibitors: NotificationLinkOption[] };
}

export function NotificationsPanel({ notifications, canManage, linkOptions }: Props) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EventNotificationInput>({
    resolver: zodResolver(eventNotificationSchema) as any,
    defaultValues: { title: "", message: "", layout: null, exhibitor: null },
  });

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return notifications;
    return notifications.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.message.toLowerCase().includes(q) ||
        (n.lobbyTitle && n.lobbyTitle.toLowerCase().includes(q)) ||
        (n.exhibitorName && n.exhibitorName.toLowerCase().includes(q))
    );
  }, [notifications, keyword]);

  useEffect(() => {
    setPage(1);
  }, [keyword]);

  const paged = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  );

  async function onSubmit(data: EventNotificationInput) {
    setErrorMessage(null);
    try {
      await axios.post("/api/members/notifications", data);
      reset({ title: "", message: "", layout: null, exhibitor: null });
      router.refresh();
    } catch (err) {
      setErrorMessage(
        isAxiosError(err) && typeof err.response?.data?.error === "string"
          ? err.response.data.error
          : "Could not send this notification. Please try again."
      );
    }
  }

  async function resend(id: number) {
    setPendingId(id);
    setErrorMessage(null);
    try {
      await axios.post(`/api/members/notifications/${id}/resend`);
      router.refresh();
    } catch {
      setErrorMessage("Could not resend this notification.");
    } finally {
      setPendingId(null);
    }
  }

  async function remove(id: number) {
    if (!window.confirm("Delete this notification?")) return;
    setPendingId(id);
    setErrorMessage(null);
    try {
      await axios.delete(`/api/members/notifications/${id}`);
      router.refresh();
    } catch {
      setErrorMessage("Could not delete this notification.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.2fr_2fr]">
      {canManage && (
        <div className="h-fit glass-panel rounded-3xl p-8 sticky top-8">
          <h3 className="text-lg font-black uppercase tracking-widest text-white mb-8 border-b border-white/5 pb-4">Broadcast Notification</h3>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Subject / Title*</label>
              <input {...register("title")} className={FIELD_CLASS} placeholder="What is this about?" />
              {errors.title && <p className="mt-1 text-xs font-bold text-red-500">{errors.title.message}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Content / Message*</label>
              <textarea {...register("message")} rows={4} className={FIELD_CLASS} placeholder="Type your message here..." />
              {errors.message && <p className="mt-1 text-xs font-bold text-red-500">{errors.message.message}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Direct Link: Lobby</label>
              <select {...register("layout")} className={FIELD_CLASS} defaultValue="">
                <option value="" className="bg-zinc-950">None (General Notification)</option>
                {linkOptions.lobbies.map((lobby) => (
                  <option key={lobby.id} value={lobby.id} className="bg-zinc-950">
                    {lobby.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Direct Link: Exhibitor Stand</label>
              <select {...register("exhibitor")} className={FIELD_CLASS} defaultValue="">
                <option value="" className="bg-zinc-950">None</option>
                {linkOptions.exhibitors.map((ex) => (
                  <option key={ex.id} value={ex.id} className="bg-zinc-950">
                    {ex.label}
                  </option>
                ))}
              </select>
            </div>
            {errorMessage && <p className="text-sm font-bold text-red-500">{errorMessage}</p>}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full inline-flex items-center justify-center gap-3 rounded-full bg-brand-pink px-8 py-4 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-brand-pink/20 transition hover:scale-[1.02] active:scale-95 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                {isSubmitting ? "Broadcasting..." : "Broadcast to Everyone"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className={canManage ? "space-y-6" : "lg:col-span-2 space-y-6"}>
        {!canManage && errorMessage && <p className="mb-3 text-sm font-bold text-red-500">{errorMessage}</p>}

        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 shadow-xl backdrop-blur-md">
          <Search className="h-5 w-5 shrink-0 text-brand-pink" />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Search by title, message, lobby or exhibitor…"
            className="w-full bg-transparent text-sm text-white placeholder:text-zinc-600 focus:outline-none font-medium"
          />
        </div>

        <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-md">
          {filtered.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-zinc-500 font-medium italic">
                {notifications.length === 0 ? "No notifications have been sent yet." : "No notifications match your search."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-gradient-to-r from-brand-purple to-brand-pink text-white">
                    <th className="px-6 py-4 font-black uppercase tracking-wider">Title</th>
                    <th className="px-6 py-4 font-black uppercase tracking-wider">Message</th>
                    <th className="px-6 py-4 font-black uppercase tracking-wider">Destination</th>
                    <th className="px-6 py-4 font-black uppercase tracking-wider">Timestamp</th>
                    {canManage && <th className="px-6 py-4 font-black uppercase tracking-wider">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {paged.map((n) => (
                    <tr key={n.id} className="align-top hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-5 font-bold text-zinc-200">{n.title}</td>
                      <td className="px-6 py-5 text-zinc-400 max-w-xs">{n.message}</td>
                      <td className="px-6 py-5 text-[10px] font-black uppercase tracking-widest">
                        {n.lobbyTitle && <div className="text-brand-purple">Lobby: {n.lobbyTitle}</div>}
                        {n.exhibitorName && <div className="text-brand-pink">Stand: {n.exhibitorName}</div>}
                        {!n.lobbyTitle && !n.exhibitorName && <span className="text-zinc-700">General</span>}
                      </td>
                      <td className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500 whitespace-nowrap">
                        {DATE_FORMAT.format(new Date(n.createdOn))}
                      </td>
                      {canManage && (
                        <td className="px-6 py-5">
                          <div className="flex flex-wrap gap-2">
                            <button
                              disabled={pendingId === n.id}
                              onClick={() => resend(n.id)}
                              className="h-8 w-8 inline-flex items-center justify-center rounded-lg bg-brand-purple/10 text-brand-purple hover:bg-brand-purple hover:text-white transition-all disabled:opacity-20"
                              title="Resend Notification"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </button>
                            <button
                              disabled={pendingId === n.id}
                              onClick={() => remove(n.id)}
                              className="h-8 w-8 inline-flex items-center justify-center rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all disabled:opacity-20"
                              title="Delete Notification"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <TablePagination currentPage={page} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
        </div>
      </div>
    </div>
  );
}
