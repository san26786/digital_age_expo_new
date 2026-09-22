"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Blocks,
  Bold,
  CodeXml,
  Italic,
  Link2,
  List,
  ListOrdered,
  Plus,
  Save,
  Send,
  Strikethrough,
  Trash2,
  Underline,
} from "lucide-react";
import {
  EMAIL_VARIABLES,
  interpolateSample,
  previewDocument,
  renderBlocks,
  SIGNATURE_PREVIEW,
  wrapEmail,
  type EmailBlock,
  type EmailBlockType,
} from "@/lib/email/emailBlocks";
import { EMAIL_TEMPLATE_TOPICS, normaliseTemplateId } from "@/lib/email/templateTopics";

/**
 * ===========================================================================
 *  THE TEMPLATE BUILDER
 * ===========================================================================
 *
 *  Blocks on the left, the email on the right, and the right-hand side is rendered by the SAME
 *  function that produces what gets stored - see src/lib/email/emailBlocks.ts. A preview drawn by
 *  its own code path is a preview that can lie, and the one thing nobody can check afterwards is
 *  what an email looked like when it left.
 *
 *  ---------------------------------------------------------------------------
 *  DESIGN AND CODE ARE TWO VIEWS OF ONE FIELD, AND CODE IS NOT A POWER-USER TOY
 *  ---------------------------------------------------------------------------
 *
 *  `body_html` is a single HTML column holding 246 legacy templates written long before this
 *  screen existed. Nothing can reliably parse that markup back into blocks, so any builder that
 *  only offered blocks would be unable to open most of the table. Code view is what makes this
 *  screen able to touch an existing template at all; Design view is what makes a new one quick.
 *
 *  Whichever view is active when Save is pressed is the one that is stored - stated on screen,
 *  because silently preferring one would throw away work either way round.
 */

const FIELD =
  "w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-brand-pink/50 focus:outline-none focus:ring-1 focus:ring-brand-pink/40";
const LABEL = "mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/55";
const ICON_BTN =
  "inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/10 text-white/65 transition-colors hover:border-brand-pink/40 hover:text-brand-pink disabled:opacity-30";
const CHIP =
  "rounded-full border border-white/15 px-2.5 py-1 text-xs text-white/75 transition-colors hover:border-brand-pink/50 hover:text-brand-pink";

let keySeed = 0;
const nextKey = () => `b${++keySeed}`;

const STARTING_BLOCKS: EmailBlock[] = [
  { key: nextKey(), type: "heading", text: "Hello {{first_name}},", align: "left" },
  { key: nextKey(), type: "text", text: "Write your message here...", align: "left" },
  { key: nextKey(), type: "button", text: "Call to action", url: "{{site_url}}", align: "left" },
];

const ADDABLE: { type: EmailBlockType; label: string }[] = [
  { type: "heading", label: "Heading" },
  { type: "text", label: "Text" },
  { type: "button", label: "Button" },
  { type: "image", label: "Image" },
  { type: "divider", label: "Divider" },
  { type: "spacer", label: "Spacer" },
];

/**
 * ---------------------------------------------------------------------------
 *  ONE BUILDER, TWO JOBS
 * ---------------------------------------------------------------------------
 *
 *  Creating and editing were two different screens: this one, and a stack of plain inputs. Which
 *  meant a template made with blocks and a live preview could only be changed afterwards in a
 *  textarea — the worse tool for the harder job, since editing is what anyone does far more often.
 *
 *  What the two modes differ on, and why:
 *
 *    id            editable on create, read-only on edit. It is the primary key, it is in the
 *                  URL, and it is what the mail logs record; changing it would orphan both.
 *    starting view Design with starter blocks on create, Code with the stored HTML on edit —
 *                  nothing can parse 246 legacy bodies back into blocks, and pretending otherwise
 *                  is how somebody's template silently becomes "Hello {{first_name}}".
 *    start from…   create only. On an existing template it would be a button that replaces the
 *                  thing you opened to edit.
 */
export interface TemplateBuilderValues {
  id: string;
  title: string;
  subject: string;
  bodyHtml: string;
  topicKey: string;
  fromName: string;
  fromAddress: string;
  replyName: string;
  replyAddress: string;
  recipients: string;
  disable: boolean;
  moderate: boolean;
}

export function TemplateBuilder({
  builderMode = "create",
  basePath,
  apiBase,
  createAction,
  duplicateAction,
  startFrom,
  site,
  error,
  values,
}: {
  builderMode?: "create" | "edit";
  basePath: string;
  /** Where to GET one template's stored HTML, and POST a test send. */
  apiBase: string;
  /** Create or update — whichever this screen is for. Already bound and already gated. */
  createAction: (formData: FormData) => Promise<void>;
  /** Edit only. */
  duplicateAction?: (formData: FormData) => Promise<void>;
  startFrom: { id: string; title: string }[];
  site: { name: string; url: string };
  error?: string;
  values?: Partial<TemplateBuilderValues>;
}) {
  const editing = builderMode === "edit";

  const [name, setName] = useState(values?.title ?? "");
  const [id, setId] = useState(values?.id ?? "");
  const [idTouched, setIdTouched] = useState(Boolean(values?.id));
  const [topic, setTopic] = useState(values?.topicKey ?? "");
  const [subject, setSubject] = useState(values?.subject ?? "");

  /*
   * Edit opens in Code with the stored body and NO blocks — not the starter three. Starting an
   * edit with blocks loaded would mean one click on Design, one on Save, and the template is
   * replaced by a greeting nobody typed.
   */
  const [mode, setMode] = useState<"design" | "code">(editing ? "code" : "design");
  const [blocks, setBlocks] = useState<EmailBlock[]>(editing ? [] : STARTING_BLOCKS);
  const [code, setCode] = useState(values?.bodyHtml ?? "");

  const [fromName, setFromName] = useState(values?.fromName ?? "");
  const [fromAddress, setFromAddress] = useState(values?.fromAddress ?? "");
  const [replyName, setReplyName] = useState(values?.replyName ?? "");
  const [replyAddress, setReplyAddress] = useState(values?.replyAddress ?? "");
  const [recipients, setRecipients] = useState(values?.recipients ?? "");
  const [disabled, setDisabled] = useState(Boolean(values?.disable));
  const [moderate, setModerate] = useState(Boolean(values?.moderate));

  const [copyFrom, setCopyFrom] = useState("");
  const [copying, setCopying] = useState(false);

  const [testTo, setTestTo] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  /*
   * "Inserts into the last field you clicked" needs to know which field that was AND where the
   * caret sat in it, so the elements are kept by name rather than reached for by DOM query.
   */
  const fields = useRef(new Map<string, HTMLInputElement | HTMLTextAreaElement>());
  const [lastField, setLastField] = useState<string>("subject");

  const register = (fieldId: string) => ({
    ref: (element: HTMLInputElement | HTMLTextAreaElement | null) => {
      if (element) fields.current.set(fieldId, element);
      else fields.current.delete(fieldId);
    },
    onFocus: () => setLastField(fieldId),
  });

  /** The body exactly as it will be stored — and, one line below, exactly as it is previewed. */
  const designHtml = useMemo(() => wrapEmail(renderBlocks(blocks), site), [blocks, site]);
  const bodyHtml = mode === "code" ? code : designHtml;

  /*
   * Design view, editing, and no blocks: the body that would be submitted is an empty shell, so
   * saving here replaces the template with nothing. Blocked rather than warned about, because the
   * warning would be one line above a button that still works.
   */
  const wouldWipeBody = editing && mode === "design" && blocks.length === 0;

  /*
   * {{signature}} is swapped for a visible stand-in HERE rather than in interpolateSample, because
   * the real substitution happens on the server from this site's Send Queue settings and the
   * browser has no business guessing at it. Showing a raw "{{signature}}" in the preview would
   * read as a mistake in the template.
   */
  const previewHtml = useMemo(
    () =>
      previewDocument(
        interpolateSample(bodyHtml).replace(/\{\{\s*signature\s*\}\}/g, SIGNATURE_PREVIEW)
      ),
    [bodyHtml]
  );

  /* ------------------------------------------------------------------ blocks */

  const updateBlock = (key: string, patch: Partial<EmailBlock>) =>
    setBlocks((current) => current.map((block) => (block.key === key ? { ...block, ...patch } : block)));

  const move = (index: number, by: number) =>
    setBlocks((current) => {
      const target = index + by;
      if (target < 0 || target >= current.length) return current;
      const copy = [...current];
      [copy[index], copy[target]] = [copy[target], copy[index]];
      return copy;
    });

  const add = (type: EmailBlockType) =>
    setBlocks((current) => [
      ...current,
      {
        key: nextKey(),
        type,
        text: type === "button" ? "Call to action" : "",
        url: type === "button" ? "{{site_url}}" : "",
        align: "left",
      },
    ]);

  /* -------------------------------------------------------- text insertions */

  const writeInto = (fieldId: string, transform: (value: string, start: number, end: number) => [string, number]) => {
    const element = fields.current.get(fieldId);
    if (!element) return;

    const start = element.selectionStart ?? element.value.length;
    const end = element.selectionEnd ?? start;
    const [next, caret] = transform(element.value, start, end);

    if (fieldId === "subject") setSubject(next);
    else updateBlock(fieldId.replace(/^block:/, ""), { text: next });

    requestAnimationFrame(() => {
      element.focus();
      element.setSelectionRange(caret, caret);
    });
  };

  const insertVariable = (token: string) =>
    writeInto(lastField, (value, start, end) => {
      const snippet = `{{${token}}}`;
      return [value.slice(0, start) + snippet + value.slice(end), start + snippet.length];
    });

  const wrapSelection = (fieldId: string, before: string, after: string) =>
    writeInto(fieldId, (value, start, end) => {
      const selected = value.slice(start, end) || "text";
      return [
        value.slice(0, start) + before + selected + after + value.slice(end),
        start + before.length + selected.length + after.length,
      ];
    });

  const prefixLine = (fieldId: string, marker: string) =>
    writeInto(fieldId, (value, start) => {
      const lineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
      return [value.slice(0, lineStart) + marker + value.slice(lineStart), start + marker.length];
    });

  /* ----------------------------------------------------------- start from... */

  const loadExisting = async (templateId: string) => {
    setCopyFrom(templateId);
    if (!templateId) return;

    setCopying(true);
    try {
      const response = await fetch(`${apiBase}/${encodeURIComponent(templateId)}`);
      if (!response.ok) throw new Error(String(response.status));
      const data = (await response.json()) as { subject?: string; body_html?: string };

      if (data.subject) setSubject(data.subject);
      /*
       * Straight into Code view, and that is not a shortcut. An existing template's HTML was
       * written by hand or by the legacy CP; dropping it into the block model would mean guessing
       * at markup this builder never produced, and quietly losing whatever it guessed wrong.
       */
      setCode(data.body_html ?? "");
      setMode("code");
    } catch {
      setCode("");
      setTestResult("Could not load that template — it may have been deleted.");
    } finally {
      setCopying(false);
    }
  };

  /* ------------------------------------------------------------- test sending */

  const sendTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const response = await fetch(`${apiBase}/test-send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: testTo, subject, html: bodyHtml }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };
      setTestResult(data.ok ? `Sent to ${testTo}.` : data.error ?? "The test could not be sent.");
    } catch {
      setTestResult("The test could not be sent.");
    } finally {
      setTesting(false);
    }
  };

  /* -------------------------------------------------------------------- view */

  return (
    <>
      <form action={createAction} className="space-y-5">
      {/* What the server action reads. The visible controls above are the editing surface. */}
      <input type="hidden" name="body_html" value={bodyHtml} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={basePath}
          className="inline-flex items-center gap-1.5 text-sm text-white/55 transition-colors hover:text-brand-pink"
        >
          <ArrowLeft className="h-4 w-4" /> All templates
        </Link>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-full border border-white/10 bg-white/[0.03] p-1">
            <button
              type="button"
              onClick={() => setMode("design")}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                mode === "design"
                  ? "bg-gradient-to-r from-brand-purple to-brand-pink text-white"
                  : "text-white/70 hover:text-white"
              }`}
            >
              <Blocks className="h-3.5 w-3.5" /> Design
            </button>
            <button
              type="button"
              onClick={() => {
                if (mode === "design") setCode(designHtml);
                setMode("code");
              }}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                mode === "code"
                  ? "bg-gradient-to-r from-brand-purple to-brand-pink text-white"
                  : "text-white/70 hover:text-white"
              }`}
            >
              <CodeXml className="h-3.5 w-3.5" /> Code
            </button>
          </div>

          <button
            type="submit"
            disabled={wouldWipeBody}
            title={
              wouldWipeBody
                ? "Add a block, or switch to Code to keep this template's existing HTML"
                : undefined
            }
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-purple to-brand-pink px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:opacity-90 disabled:opacity-40"
          >
            <Save className="h-4 w-4" /> Save
          </button>
        </div>
      </div>

      {error && (
        <p className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>
      )}

      {!editing && (
      <label className="block rounded-2xl border border-white/10 bg-white/[0.02] p-4">
        <span className={LABEL}>Start from an existing template (optional)</span>
        <select
          value={copyFrom}
          disabled={copying}
          onChange={(event) => void loadExisting(event.target.value)}
          className={`${FIELD} [&_option]:bg-zinc-900`}
        >
          <option value="">Blank template</option>
          {startFrom.map((option) => (
            <option key={option.id} value={option.id}>
              {option.title}
            </option>
          ))}
        </select>
        <span className="mt-1.5 block text-xs text-white/45">
          Copies that template&apos;s subject and body in for you to edit, and opens Code view —
          existing bodies are hand-written HTML this builder cannot take apart into blocks. The
          original is left untouched. This is a copy, not a link to it.
        </span>
      </label>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        {/* ------------------------------------------------------------ left */}
        <div className="space-y-4 rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
          <label className="block">
            <span className={LABEL}>Template name</span>
            <input
              name="title"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                if (!idTouched) setId(normaliseTemplateId(event.target.value));
              }}
              placeholder="Exhibitor welcome pack"
              className={FIELD}
            />
          </label>

          <label className="block">
            <span className={LABEL}>Template id</span>
            <input
              name="id"
              required
              readOnly={editing}
              value={id}
              onChange={(event) => {
                setIdTouched(true);
                setId(event.target.value);
              }}
              placeholder="exhibitor_welcome_pack"
              className={`${FIELD} font-mono text-xs ${editing ? "cursor-not-allowed opacity-60" : ""}`}
            />
            <span className="mt-1.5 block text-xs text-white/45">
              {editing
                ? "The primary key — it is in this page's URL and in every mail log row, so it cannot be changed. Use Duplicate below to make a copy under a new id."
                : "Filled in from the name as you type. It is the key the mail logs record and cannot be changed afterwards."}
            </span>
          </label>

          <label className="block">
            <span className={LABEL}>Used for</span>
            <select
              name="topic"
              required
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              className={`${FIELD} [&_option]:bg-zinc-900`}
            >
              <option value="" disabled>
                Choose who this email goes to…
              </option>
              {EMAIL_TEMPLATE_TOPICS.map((entry) => (
                <option key={entry.key} value={entry.key}>
                  {entry.label}
                </option>
              ))}
            </select>
            <span className="mt-1.5 block text-xs text-white/45">
              Decides which group it appears under here, and which send-mail dropdown offers it.
            </span>
          </label>

          <label className="block">
            <span className={LABEL}>Subject</span>
            <input
              name="subject"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Your stand at {{site_name}}"
              className={FIELD}
              {...register("subject")}
            />
          </label>

          {/*
            * Folded away by default, and that is the point: four sender fields and two flags above
            * the subject line would bury the thing people came to change. They are here at all
            * because the columns exist and the old edit form exposed them — dropping them would
            * have made this builder a downgrade for anyone who had set them.
            */}
          <details className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
            <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-white/55">
              Sending details
            </summary>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className={LABEL}>From name</span>
                <input name="from_name" value={fromName} onChange={(e) => setFromName(e.target.value)} className={FIELD} />
              </label>
              <label className="block">
                <span className={LABEL}>From address</span>
                <input name="from_address" value={fromAddress} onChange={(e) => setFromAddress(e.target.value)} className={FIELD} />
              </label>
              <label className="block">
                <span className={LABEL}>Reply-to name</span>
                <input name="reply_name" value={replyName} onChange={(e) => setReplyName(e.target.value)} className={FIELD} />
              </label>
              <label className="block">
                <span className={LABEL}>Reply-to address</span>
                <input name="reply_address" value={replyAddress} onChange={(e) => setReplyAddress(e.target.value)} className={FIELD} />
              </label>

              <label className="block sm:col-span-2">
                <span className={LABEL}>Recipients</span>
                <input
                  name="recipients"
                  value={recipients}
                  onChange={(e) => setRecipients(e.target.value)}
                  placeholder="admin@yourdomain.com"
                  className={FIELD}
                />
                <span className="mt-1.5 block text-xs text-white/45">
                  Fixed addresses for admin-style notifications. The registration and send-mail
                  flows always address the person who triggered them, so this is ignored there.
                </span>
              </label>

              <label className="flex items-center gap-2 text-sm text-white/75 sm:col-span-2">
                <input
                  type="checkbox"
                  name="disable"
                  checked={disabled}
                  onChange={(e) => setDisabled(e.target.checked)}
                  className="h-4 w-4 accent-[var(--color-brand-pink)]"
                />
                Disabled — this template never sends
              </label>
              <label className="flex items-center gap-2 text-sm text-white/75 sm:col-span-2">
                <input
                  type="checkbox"
                  name="moderate"
                  checked={moderate}
                  onChange={(e) => setModerate(e.target.checked)}
                  className="h-4 w-4 accent-[var(--color-brand-pink)]"
                />
                Requires moderation before sending
              </label>
            </div>
          </details>

          <div>
            <span className={LABEL}>Insert variable</span>
            <div className="flex flex-wrap gap-1.5">
              {EMAIL_VARIABLES.map((variable) => (
                <button
                  key={variable.token}
                  type="button"
                  title={`Insert {{${variable.token}}} — filled by: ${variable.filledBy}`}
                  onClick={() => insertVariable(variable.token)}
                  className={CHIP}
                >
                  {variable.label}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[0.7rem] text-white/40">
              Inserts into the last field you clicked. A variable nothing fills is left in the email
              as literal text, so hover a chip to see which sends supply it.
            </p>
            <p className="mt-1 text-[0.7rem] text-white/40">
              Formatting: <code className="text-white/60">**bold**</code>,{" "}
              <code className="text-white/60">*italic*</code>,{" "}
              <code className="text-white/60">__underline__</code>,{" "}
              <code className="text-white/60">~~strike~~</code>,{" "}
              <code className="text-white/60">[label](https://…)</code>. A line starting{" "}
              <code className="text-white/60">-</code> or <code className="text-white/60">1.</code>{" "}
              becomes a list.
            </p>
          </div>

          {mode === "design" ? (
            <div className="space-y-3">
              <span className={LABEL}>Blocks</span>

              {wouldWipeBody && (
                <p className="rounded-xl border border-amber-400/25 bg-amber-400/10 px-3 py-2.5 text-xs leading-relaxed text-amber-100/90">
                  This template&apos;s HTML was not built here, so there are no blocks to show it.
                  Add blocks to <strong>replace</strong> the existing body, or switch back to Code
                  to edit what is already there. Save is off until you do one or the other.
                </p>
              )}

              {blocks.map((block, index) => (
                <div key={block.key} className="rounded-2xl border border-white/10 bg-white/[0.02] p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-brand-pink">
                      {block.type}
                    </span>
                    <div className="flex items-center gap-1">
                      <button type="button" title="Move up" disabled={index === 0} onClick={() => move(index, -1)} className={ICON_BTN}>
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        title="Move down"
                        disabled={index === blocks.length - 1}
                        onClick={() => move(index, 1)}
                        className={ICON_BTN}
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        title="Delete block"
                        onClick={() => setBlocks((current) => current.filter((entry) => entry.key !== block.key))}
                        className={`${ICON_BTN} text-red-300 hover:bg-red-500/10`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {(block.type === "heading" || block.type === "text") && (
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-1">
                        <button type="button" title="Bold" onClick={() => wrapSelection(`block:${block.key}`, "**", "**")} className={ICON_BTN}>
                          <Bold className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" title="Italic" onClick={() => wrapSelection(`block:${block.key}`, "*", "*")} className={ICON_BTN}>
                          <Italic className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" title="Underline" onClick={() => wrapSelection(`block:${block.key}`, "__", "__")} className={ICON_BTN}>
                          <Underline className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" title="Strikethrough" onClick={() => wrapSelection(`block:${block.key}`, "~~", "~~")} className={ICON_BTN}>
                          <Strikethrough className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" title="Link" onClick={() => wrapSelection(`block:${block.key}`, "[", "](https://)")} className={ICON_BTN}>
                          <Link2 className="h-3.5 w-3.5" />
                        </button>

                        {block.type === "text" && (
                          <>
                            <span className="mx-0.5 h-4 w-px bg-white/10" />
                            <button type="button" title="Bullet list" onClick={() => prefixLine(`block:${block.key}`, "- ")} className={ICON_BTN}>
                              <List className="h-3.5 w-3.5" />
                            </button>
                            <button type="button" title="Numbered list" onClick={() => prefixLine(`block:${block.key}`, "1. ")} className={ICON_BTN}>
                              <ListOrdered className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>

                      <textarea
                        rows={block.type === "heading" ? 2 : 4}
                        value={block.text ?? ""}
                        onChange={(event) => updateBlock(block.key, { text: event.target.value })}
                        className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-brand-pink/50 focus:outline-none"
                        {...register(`block:${block.key}`)}
                      />
                    </div>
                  )}

                  {block.type === "button" && (
                    <div className="space-y-2">
                      <input
                        value={block.text ?? ""}
                        onChange={(event) => updateBlock(block.key, { text: event.target.value })}
                        placeholder="Button label"
                        className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-brand-pink/50 focus:outline-none"
                        {...register(`block:${block.key}`)}
                      />
                      <input
                        value={block.url ?? ""}
                        onChange={(event) => updateBlock(block.key, { url: event.target.value })}
                        placeholder="Link URL"
                        className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-brand-pink/50 focus:outline-none"
                      />
                    </div>
                  )}

                  {block.type === "image" && (
                    <div className="space-y-2">
                      <input
                        value={block.url ?? ""}
                        onChange={(event) => updateBlock(block.key, { url: event.target.value })}
                        placeholder="https://…/banner.png"
                        className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-brand-pink/50 focus:outline-none"
                      />
                      <input
                        value={block.text ?? ""}
                        onChange={(event) => updateBlock(block.key, { text: event.target.value })}
                        placeholder="Alt text, for clients that block images"
                        className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-brand-pink/50 focus:outline-none"
                      />
                    </div>
                  )}

                  {block.type !== "divider" && block.type !== "spacer" && (
                    <select
                      value={block.align ?? "left"}
                      onChange={(event) => updateBlock(block.key, { align: event.target.value as "left" | "center" })}
                      className="mt-2 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1.5 text-xs text-white focus:border-brand-pink/50 focus:outline-none [&_option]:bg-zinc-900"
                    >
                      <option value="left">Align left</option>
                      <option value="center">Align center</option>
                    </select>
                  )}
                </div>
              ))}

              <div className="flex flex-wrap gap-1.5 pt-1">
                {ADDABLE.map((entry) => (
                  <button
                    key={entry.type}
                    type="button"
                    onClick={() => add(entry.type)}
                    className="inline-flex items-center gap-1 rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-white/75 transition-colors hover:border-brand-pink/50 hover:text-brand-pink"
                  >
                    <Plus className="h-3.5 w-3.5" /> {entry.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <span className={LABEL}>Body HTML</span>
              <textarea
                rows={22}
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="<div>…</div>"
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 font-mono text-xs leading-relaxed text-white focus:border-brand-pink/50 focus:outline-none"
              />
              <p className="text-[0.7rem] text-white/40">
                Saved exactly as written. Switching back to Design discards it in favour of the
                blocks — whichever view is open when you press Save is the one that is stored.
              </p>
            </div>
          )}
        </div>

        {/* ----------------------------------------------------------- right */}
        <div className="space-y-3 rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-white/55">Live preview</span>
            <p className="mt-1 text-sm text-white/80">
              <span className="text-white/45">Subject:</span> {interpolateSample(subject) || "—"}
            </p>
          </div>

          {/*
            * sandbox="" - no scripts, no forms, no navigation, no same-origin. The body being
            * previewed is text somebody typed into a box, and it is about to be shown as HTML.
            */}
          <iframe
            title="Template preview"
            sandbox=""
            srcDoc={previewHtml}
            className="h-[560px] w-full rounded-xl border border-white/10 bg-white"
          />

          <div className="border-t border-white/10 pt-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-white/55">
              Send yourself a test
            </span>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <input
                type="email"
                value={testTo}
                onChange={(event) => setTestTo(event.target.value)}
                placeholder="you@example.com"
                className={`${FIELD} min-w-[200px] flex-1`}
              />
              <button
                type="button"
                disabled={!testTo || testing}
                onClick={() => void sendTest()}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:border-brand-pink/40 disabled:opacity-50"
              >
                <Send className="h-4 w-4 text-brand-pink" />
                {testing ? "Sending…" : "Send test"}
              </button>
            </div>
            <p className="mt-1.5 text-[0.7rem] text-white/40">
              Sends exactly what you see above, with sample values filled in, from this site&apos;s
              own mailbox. It does not save — this tests what is on screen.
            </p>
            {testResult && <p className="mt-2 text-xs text-white/70">{testResult}</p>}
          </div>
        </div>
      </div>
    </form>

      {editing && duplicateAction && (
        /*
         * Its own <form>, outside the one above — a nested form is invalid HTML and browsers
         * resolve it by dropping one of them, usually the inner. Duplicating also must not carry
         * the unsaved edits from the builder: it copies what is STORED, which is why it sits
         * apart and says so.
         */
        <form
          action={duplicateAction}
          className="mt-6 flex flex-wrap gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4"
        >
          <div className="min-w-[220px] flex-1">
            <span className={LABEL}>Duplicate as</span>
            <input name="newId" placeholder="new_template_id" required className={`${FIELD} font-mono text-xs`} />
          </div>
          <button
            type="submit"
            className="self-end whitespace-nowrap rounded-full border border-white/15 px-6 py-2.5 text-xs font-black uppercase tracking-wider text-white/80 transition hover:border-brand-pink/50 hover:text-white"
          >
            Duplicate
          </button>
          <p className="w-full text-xs text-white/45">
            Copies the template as it is <strong className="text-white/70">saved</strong>, not as it
            is on screen. Save first if you want your current changes carried over.
          </p>
        </form>
      )}
    </>
  );
}
