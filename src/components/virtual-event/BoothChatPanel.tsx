"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, X, Send } from "lucide-react";

interface ChatLine {
  id: number;
  from: "visitor" | "stand";
  text: string;
  at: string;
}

/**
 * The booth chat panel, docked bottom-left exactly where the legacy stand puts it.
 *
 * ONE-WAY, AND IT SAYS SO. This schema has no chat table and no socket server, so nothing here
 * can receive a reply in real time. Rather than animate a fake "typing…" and drop the message on
 * the floor, each send is POSTed to /api/virtual-event/booth-message, which files it in the
 * enquiry inbox the exhibitor already reads, and the panel opens by telling the visitor that the
 * stand will reply by email. A chat box that silently discards what people type is worse than no
 * chat box at all.
 *
 * Replace the POST with a real transport later and the panel needs no other change: the thread,
 * the optimistic echo and the failure state are all already here.
 */
export function BoothChatPanel({
  exhibitorId,
  business,
  onClose,
}: {
  exhibitorId: number;
  business: string;
  onClose: () => void;
}) {
  const [minimised, setMinimised] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lines, setLines] = useState<ChatLine[]>([
    {
      id: 0,
      from: "stand",
      text: `Hi — this is ${business}. Leave a message and the team will reply to you by email.`,
      at: "",
    },
  ]);

  const threadRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Newest message in view, and the caret in the box, the moment the panel opens.
  useEffect(() => {
    if (!minimised) inputRef.current?.focus();
  }, [minimised]);

  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines, minimised]);

  // Escape closes, as it does on every other overlay in the booth.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const now = () =>
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  async function send() {
    const text = draft.trim();
    if (!text || sending) return;

    setSending(true);
    setError(null);

    // Echoed straight away: waiting on the round trip before showing what you just typed reads
    // as the box having swallowed it.
    const optimistic: ChatLine = { id: Date.now(), from: "visitor", text, at: now() };
    setLines((prev) => [...prev, optimistic]);
    setDraft("");

    try {
      const response = await fetch("/api/virtual-event/booth-message", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ exhibitorId, message: text }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error || "That did not send.");
      }

      setLines((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          from: "stand",
          text: "Sent — the stand has your message and your contact details.",
          at: now(),
        },
      ]);
    } catch (e) {
      // The message stays in the thread but the draft comes back, so nothing typed is lost.
      setError(e instanceof Error ? e.message : "That did not send.");
      setLines((prev) => prev.filter((line) => line.id !== optimistic.id));
      setDraft(text);
    } finally {
      setSending(false);
    }
  }

  return (
    /*
      * EXPLICIT COLOURS THROUGHOUT, and a `booth-chat` hook for globals.css.
      *
      * Two traps in this project, both of which made the text invisible here at first:
      *
      *   1. globals.css `@theme` INVERTS the zinc scale for the dark UI — `--color-zinc-700` is
      *      rgba(255,255,255,0.12), white at 12%, not dark grey. So `text-zinc-700` on a white
      *      bubble paints white on white. Only zinc-950/900 are dark and zinc-200/100 light;
      *      everything between is translucent white. Hex values sidestep the whole question.
      *   2. globals.css forces every <textarea> to a dark background and white text with
      *      `!important`, which no utility class can outrank — hence the scoped rule in that
      *      file keyed off this class.
      */
    <div className="booth-chat pointer-events-auto fixed bottom-0 left-0 z-40 w-[min(92vw,360px)] overflow-hidden rounded-t-lg border border-[#d4d4d8] bg-white text-[#18181b] shadow-2xl sm:left-4">
      {/* Header */}
      <div className="flex items-center gap-2 bg-[#1f6fd0] px-3 py-2.5 text-white">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-400" aria-hidden />
        <p className="flex-1 truncate text-sm font-semibold" title={business}>
          {business}
        </p>
        <button
          type="button"
          onClick={() => setMinimised((v) => !v)}
          aria-label={minimised ? "Expand chat" : "Minimise chat"}
          className="rounded p-1 transition hover:bg-white/20"
        >
          {minimised ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close chat"
          className="rounded p-1 transition hover:bg-white/20"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {!minimised && (
        <>
          <div ref={threadRef} className="h-64 space-y-2 overflow-y-auto bg-[#f4f4f5] px-3 py-3">
            {lines.map((line) => (
              <div
                key={line.id}
                className={`flex ${line.from === "visitor" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-[13px] leading-snug shadow-sm ${
                    line.from === "visitor"
                      ? "bg-[#1f6fd0] text-white"
                      : "border border-[#e4e4e7] bg-white text-[#18181b]"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{line.text}</p>
                  {line.at && (
                    <p
                      className={`mt-1 text-[10px] ${
                        line.from === "visitor" ? "text-white/75" : "text-[#71717a]"
                      }`}
                    >
                      {line.at}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {error && (
            <p role="alert" className="border-t border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-xs text-[#b91c1c]">
              {error}
            </p>
          )}

          <div className="flex items-end gap-2 border-t border-[#e4e4e7] bg-white p-2">
            <textarea
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                // Enter sends, Shift+Enter makes a new line — what every chat box does.
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              rows={1}
              maxLength={1000}
              placeholder="Type here..."
              aria-label={`Message ${business}`}
              className="max-h-24 min-h-[38px] flex-1 resize-y rounded-md border px-3 py-2 text-sm outline-none"
            />
            <button
              type="button"
              onClick={() => void send()}
              disabled={sending || draft.trim() === ""}
              aria-label="Send message"
              className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-md bg-[#1f6fd0] text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
