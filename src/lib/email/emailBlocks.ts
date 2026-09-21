import { EMAIL_INK, EMAIL_ACCENT, EMAIL_WHITE, EMAIL_MUTED_TEXT } from "@/lib/theme/emailColors";

/**
 * ===========================================================================
 *  BLOCKS -> EMAIL HTML
 * ===========================================================================
 *
 *  Pure functions, no imports beyond four colour constants, because the SAME code has to run in
 *  two places: in the browser to draw the live preview as somebody types, and on the server to
 *  produce the `body_html` that gets stored and sent. If those two ever diverge, the preview
 *  becomes a lie, which is worse than having no preview at all.
 *
 *  ---------------------------------------------------------------------------
 *  WHY THE OUTPUT LOOKS LIKE 2005
 *  ---------------------------------------------------------------------------
 *
 *  Inline styles on every element, no <style> block, no flexbox, no custom properties. Not
 *  carelessness - Gmail strips <style> from forwarded mail, Outlook renders with Word's engine,
 *  and CSS custom properties resolve nowhere outside a browser (which is the whole reason
 *  src/lib/theme/emailColors.ts duplicates the palette as literals). Anything cleverer than this
 *  looks correct in the preview iframe and arrives broken.
 *
 *  ---------------------------------------------------------------------------
 *  EVERY PIECE OF TYPED TEXT IS ESCAPED BEFORE ANY MARKUP IS ADDED
 *  ---------------------------------------------------------------------------
 *
 *  This builder's output is stored, then interpolated, then emailed. A `<script>` typed into a
 *  heading would be inert in most mail clients and very much not inert in the preview iframe or
 *  anywhere the body is later displayed as HTML. So escapeHtml runs FIRST, on the raw text, and
 *  the small markdown-ish formatting layer only ever inserts tags of its own afterwards.
 */

export type EmailBlockType = "heading" | "text" | "button" | "image" | "divider" | "spacer";

export interface EmailBlock {
  /** Local-only identity for React keys and reordering; never stored. */
  key: string;
  type: EmailBlockType;
  /** heading/text: the copy. button: the label. image: the alt text. */
  text?: string;
  /** button: the destination. image: the src. */
  url?: string;
  align?: "left" | "center";
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * A URL safe to put in href/src.
 *
 * Only http(s), mailto and a bare {{variable}} are allowed through. `javascript:` and `data:`
 * URLs in a link are the one thing a person can type here that turns a stored template into an
 * attack on whoever opens it, and no legitimate email button needs either.
 */
export function safeUrl(value: string): string {
  const url = value.trim();
  if (!url) return "#";
  if (/^\{\{\s*[a-zA-Z0-9_]+\s*\}\}$/.test(url)) return url;
  if (/^(https?:\/\/|mailto:|\/)/i.test(url)) return escapeHtml(url);
  return "#";
}

/**
 * The small formatting layer the toolbar buttons write:
 *
 *      **bold**  *italic*  __underline__  ~~strike~~  [label](https://…)
 *
 * Deliberately tiny. A full markdown parser would accept things this renderer cannot express in
 * email-safe HTML, and a rich-text contenteditable would produce whatever markup the browser felt
 * like - which is how you end up mailing <div style="caret-color:...">.
 */
export function inlineMarkdown(raw: string): string {
  let html = escapeHtml(raw);

  html = html.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_match, label: string, href: string) => {
    const unescaped = href.replace(/&amp;/g, "&");
    return `<a href="${safeUrl(unescaped)}" style="color:${EMAIL_ACCENT};text-decoration:underline">${label}</a>`;
  });

  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
  html = html.replace(/__([^_]+)__/g, "<u>$1</u>");
  html = html.replace(/~~([^~]+)~~/g, "<s>$1</s>");

  return html;
}

/** Lines beginning "- " become a bullet list; lines beginning "1." a numbered one. */
function paragraphs(raw: string, align: "left" | "center"): string {
  const lines = raw.split(/\r?\n/);
  const out: string[] = [];
  let list: { tag: "ul" | "ol"; items: string[] } | null = null;

  const flush = () => {
    if (!list) return;
    const items = list.items.map((item) => `<li style="margin:0 0 6px">${item}</li>`).join("");
    out.push(
      `<${list.tag} style="margin:0 0 14px;padding-left:22px;font-size:15px;line-height:1.6;color:#444;text-align:${align}">${items}</${list.tag}>`
    );
    list = null;
  };

  for (const line of lines) {
    const bullet = line.match(/^\s*-\s+(.*)$/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);

    if (bullet) {
      if (list?.tag !== "ul") flush();
      list ??= { tag: "ul", items: [] };
      list.items.push(inlineMarkdown(bullet[1]));
      continue;
    }
    if (numbered) {
      if (list?.tag !== "ol") flush();
      list ??= { tag: "ol", items: [] };
      list.items.push(inlineMarkdown(numbered[1]));
      continue;
    }

    flush();
    if (!line.trim()) continue;
    out.push(
      `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#444;text-align:${align}">${inlineMarkdown(line)}</p>`
    );
  }

  flush();
  return out.join("\n");
}

export function renderBlocks(blocks: EmailBlock[]): string {
  return blocks
    .map((block) => {
      const align = block.align ?? "left";
      const text = block.text ?? "";

      switch (block.type) {
        case "heading":
          return `<h1 style="margin:0 0 14px;font-size:22px;color:${EMAIL_INK};text-align:${align}">${inlineMarkdown(text)}</h1>`;

        case "text":
          return paragraphs(text, align);

        case "button":
          return (
            `<div style="text-align:${align};margin:24px 0">` +
            `<a href="${safeUrl(block.url ?? "")}" style="display:inline-block;background:${EMAIL_ACCENT};color:${EMAIL_WHITE};text-decoration:none;font-weight:bold;font-size:14px;padding:12px 26px;border-radius:999px">${escapeHtml(text || "Call to action")}</a>` +
            `</div>`
          );

        case "image":
          if (!block.url?.trim()) return "";
          return `<div style="text-align:${align};margin:18px 0"><img src="${safeUrl(block.url)}" alt="${escapeHtml(text)}" style="max-width:100%;height:auto;border:0" /></div>`;

        case "divider":
          return `<hr style="border:0;border-top:1px solid #e5e5e5;margin:24px 0" />`;

        case "spacer":
          return `<div style="height:24px;line-height:24px">&nbsp;</div>`;

        default:
          return "";
      }
    })
    .filter(Boolean)
    .join("\n");
}

/**
 * The branded shell around the blocks.
 *
 * Site name and URL are passed in rather than read from anywhere, because this module runs in the
 * browser too and because the whole point of the multi-site work is that "which site is this"
 * is a question with more than one answer.
 */
export function wrapEmail(inner: string, site: { name: string; url: string }): string {
  const name = escapeHtml(site.name);
  const url = safeUrl(site.url);

  return (
    `<div style="max-width:600px;margin:0 auto;padding:32px 16px">\n` +
    `  <div style="text-align:center;padding-bottom:20px"><span style="font-size:20px;font-weight:bold;letter-spacing:2px;color:${EMAIL_ACCENT}">${name}</span></div>\n` +
    `  <div style="background:${EMAIL_WHITE};border-radius:16px;padding:32px;color:${EMAIL_INK}">\n` +
    inner +
    `\n  </div>\n` +
    `  <p style="text-align:center;margin:18px 0 0;font-size:11px;color:${EMAIL_MUTED_TEXT}">&copy; ${new Date().getFullYear()} ${name} &middot; <a href="${url}" style="color:${EMAIL_MUTED_TEXT}">${escapeHtml(site.url)}</a></p>\n` +
    `</div>`
  );
}

/** The preview document: the stored body, on the page background, with nothing executable in it. */
export function previewDocument(bodyHtml: string): string {
  return (
    `<!doctype html><html><body style="margin:0;background:#0b0b12;font-family:Arial,Helvetica,sans-serif">` +
    bodyHtml +
    `</body></html>`
  );
}

/**
 * What the variables actually are.
 *
 * Taken from the call sites, not from the reference design: /api/register passes the first group,
 * the visitor / exhibitor / sponsor send-mail routes pass the second. A placeholder with no
 * matching variable is left in the text as-is by sendTemplatedEmail's interpolate(), so offering
 * a chip for something nothing fills would put a literal "{{company}}" in a real person's inbox.
 */
export const EMAIL_VARIABLES: { token: string; label: string; filledBy: string }[] = [
  { token: "first_name", label: "First name", filledBy: "Account registration, exhibitor application, visitor and exhibitor sends" },
  { token: "last_name", label: "Last name", filledBy: "Account registration, exhibitor application, visitor and exhibitor sends" },
  { token: "email", label: "Email", filledBy: "Everywhere" },
  { token: "name", label: "Full name", filledBy: "Exhibitor application, and visitor / exhibitor / sponsor sends" },
  { token: "business", label: "Company", filledBy: "Exhibitor application, and visitor / exhibitor / sponsor sends" },
  { token: "position", label: "Job title", filledBy: "Exhibitor application only" },
  { token: "login", label: "Username", filledBy: "Account registration only" },
  { token: "site_name", label: "Site name", filledBy: "Account registration and exhibitor application" },
  { token: "site_url", label: "Site URL", filledBy: "Account registration and exhibitor application" },
  { token: "signature", label: "Email signature", filledBy: "This site's Send Queue settings" },
];

/**
 * Sample values, for the preview and the test send.
 *
 * `signature` is deliberately absent. It is substituted later, by applySignature(), from the
 * sending site's settings — and interpolateSample() runs FIRST in the test-send route, so a sample
 * value here would consume the placeholder before the real signature ever reached it.
 */
export const SAMPLE_VARIABLES: Record<string, string> = {
  first_name: "Alex",
  last_name: "Morgan",
  name: "Alex Morgan",
  email: "alex@example.com",
  business: "Northwind Ltd",
  position: "Marketing Director",
  login: "alex.morgan",
  site_name: "Digital Age Expo",
  site_url: "https://digitalageexpo.com",
};

/** Stands in for the signature on screen only; the real one is resolved on the server at send time. */
export const SIGNATURE_PREVIEW =
  '<p style="color:#71717a;font-size:12px;font-style:italic">— this site\'s email signature appears here —</p>';

/** The same substitution sendTemplatedEmail performs, so the preview shows what would be sent. */
export function interpolateSample(text: string, variables: Record<string, string> = SAMPLE_VARIABLES): string {
  return text.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(variables, key) ? variables[key] : match
  );
}
