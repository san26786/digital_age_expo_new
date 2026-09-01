"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios, { isAxiosError } from "axios";
import { X, Copy, ImagePlus } from "lucide-react";
import { eventCopySchema, type EventCopyInput } from "@/lib/validations/eventCopy";
import { slugify } from "@/lib/slug";
import type { EventDetails } from "@/lib/services/eventDetails";

import { ModalPortal } from "@/components/ui/ModalPortal";
const FIELD_CLASS =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-brand-pink focus:outline-none transition-colors backdrop-blur-md";

const LABEL_CLASS = "text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500";

interface Props {
  open: boolean;
  eventId: number | string;
  onClose: () => void;
}

/**
 * Mirrors members/user_events.php's "Event Copy" modal — duplicates the current event (title,
 * friendly URL, image, and a fresh start/end date) into a brand new event. Prefills from the
 * current event's own details, same as the legacy form.
 */
export function CopyEventModal({ open, eventId, onClose }: Props) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successEvent, setSuccessEvent] = useState<{ id: number; title: string } | null>(null);
  const [loadingDefaults, setLoadingDefaults] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [friendlyUrlTouched, setFriendlyUrlTouched] = useState(false);

  // The navbar this modal is triggered from sits inside ancestors with a `backdrop-filter`
  // (.glass-panel) and a CSS `animation` (.section-transition) — both create a new containing
  // block for `position: fixed`, which pins the overlay inside that ancestor's box instead of
  // the viewport (it renders far down the page, off-screen, requiring a scroll to find it).
  // Portaling straight to document.body sidesteps that entirely. `document` isn't available
  // during SSR, so only portal once mounted client-side.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { isSubmitting },
  } = useForm<EventCopyInput>({
    resolver: zodResolver(eventCopySchema) as any,
    defaultValues: { title: "", friendly_url: "", date_start: "", date_end: "" },
  });

  const title = watch("title");

  // Auto-fill the friendly URL from the title, same as the legacy `onblur` ajax "rewrite" call —
  // only until the admin edits the friendly URL field themselves.
  useEffect(() => {
    if (!friendlyUrlTouched) {
      setValue("friendly_url", slugify(title || ""));
    }
  }, [title, friendlyUrlTouched, setValue]);

  // Prefill from the current event's own details whenever the modal opens.
  useEffect(() => {
    if (!open) return;
    setErrorMessage(null);
    setSuccessEvent(null);
    setImageFile(null);
    setImagePreview(null);
    setFriendlyUrlTouched(false);
    setLoadingDefaults(true);

    axios
      .get<{ details: EventDetails | null }>(`/api/members/event-details?event_id=${eventId}`)
      .then(({ data }) => {
        const details = data.details;
        reset({
          title: details?.title ?? "",
          friendly_url: details?.friendly_url ?? "",
          date_start: details?.date_start ?? "",
          date_end: details?.date_end ?? "",
        });
      })
      .catch(() => {
        // Leave the form blank — the admin can still fill it in by hand.
        reset({ title: "", friendly_url: "", date_start: "", date_end: "" });
      })
      .finally(() => setLoadingDefaults(false));
  }, [open, eventId, reset]);

  if (!open || !mounted) return null;

  function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function onSubmit(data: EventCopyInput) {
    setErrorMessage(null);
    try {
      const form = new FormData();
      form.append("title", data.title);
      form.append("friendly_url", data.friendly_url);
      form.append("date_start", data.date_start);
      form.append("date_end", data.date_end);
      if (imageFile) form.append("image", imageFile);

      const { data: result } = await axios.post(
        `/api/members/event-details/copy?event_id=${eventId}`,
        form,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      setSuccessEvent({ id: result.event.id, title: result.event.title });
    } catch (err) {
      setErrorMessage(
        isAxiosError(err) && err.response?.data?.error
          ? typeof err.response.data.error === "string"
            ? err.response.data.error
            : "Please fix the highlighted fields and try again."
          : "Could not copy this event. Please try again."
      );
    }
  }

  function handleClose() {
    setSuccessEvent(null);
    setErrorMessage(null);
    onClose();
  }

  return createPortal(
    <ModalPortal>
      <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto overscroll-contain bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-zinc-950 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <h3 className="flex items-center gap-2 text-lg font-black uppercase tracking-wider text-white">
            <Copy className="h-5 w-5 text-brand-pink" />
            Event Copy
          </h3>
          <button onClick={handleClose} className="text-zinc-400 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {successEvent ? (
          <div className="mt-6 space-y-6 text-center">
            <p className="text-sm text-zinc-300">
              <span className="font-bold text-white">{successEvent.title}</span> was created as a new event
              (Event ID <span className="font-mono text-brand-pink">{successEvent.id}</span>), linked back to this
              one as its previous edition.
            </p>
            <p className="text-xs text-zinc-500 italic">
              This app manages one event per domain, so switching to the new event isn&apos;t available from this
              screen yet — it now exists in the database and can be managed once it&apos;s wired to a domain.
            </p>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-full bg-brand-pink px-10 py-3.5 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-brand-pink/20 transition hover:scale-[1.02] active:scale-95"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-5">
            <div className="space-y-2">
              <label className={LABEL_CLASS}>Event Title</label>
              <input
                {...register("title")}
                disabled={loadingDefaults}
                className={FIELD_CLASS}
                placeholder="Event Title"
              />
            </div>

            <div className="space-y-2">
              <label className={LABEL_CLASS}>Friendly Url</label>
              <input
                {...register("friendly_url", {
                  onChange: () => setFriendlyUrlTouched(true),
                })}
                disabled={loadingDefaults}
                className={FIELD_CLASS}
                placeholder="digital-age-expo"
              />
            </div>

            <div className="space-y-2">
              <label className={LABEL_CLASS}>Image</label>
              <div className="flex items-center gap-4">
                {imagePreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imagePreview} alt="" className="h-14 w-14 rounded-xl border border-white/10 object-cover" />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/5 text-zinc-600">
                    <ImagePlus className="h-5 w-5" />
                  </div>
                )}
                <label className="cursor-pointer rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-zinc-300 hover:bg-white/10 hover:text-white transition-colors">
                  Browse
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    className="hidden"
                    onChange={onPickImage}
                  />
                </label>
                <span className="text-[10px] text-zinc-500">Optional — keeps the original image otherwise.</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className={LABEL_CLASS}>Start Date</label>
                <input type="date" {...register("date_start")} disabled={loadingDefaults} className={FIELD_CLASS} />
              </div>
              <div className="space-y-2">
                <label className={LABEL_CLASS}>End Date</label>
                <input type="date" {...register("date_end")} disabled={loadingDefaults} className={FIELD_CLASS} />
              </div>
            </div>

            {errorMessage && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold">
                {errorMessage}
              </div>
            )}

            <div className="flex justify-end gap-4 border-t border-white/5 pt-6">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-full border border-white/10 bg-white/5 px-8 py-3.5 text-xs font-black uppercase tracking-widest text-zinc-300 transition hover:bg-white/10 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || loadingDefaults}
                className="rounded-full bg-brand-pink px-10 py-3.5 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-brand-pink/20 transition hover:scale-[1.02] active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? "Copying..." : "Submit"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
    </ModalPortal>,
    document.body
  );
}
