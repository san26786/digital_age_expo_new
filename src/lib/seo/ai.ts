import {
  SEO_FIELD_KEYS,
  SEO_LIMITS,
  buildSeoFallback,
  clamp,
  coerceSeoFields,
  formatDateRange,
  plainText,
  type SeoFields,
  type SeoSource,
} from "./generate";

/**
 * ===========================================================================
 *  MODEL-WRITTEN COPY
 * ===========================================================================
 *
 *  Server-only. Called from the /api/seo/generate route and from the Hub's
 *  new-site bootstrap; never imported into a client component, because it reads
 *  the API key.
 *
 *  NO NEW DEPENDENCY. This speaks to the Messages API over plain `fetch` rather
 *  than pulling in an SDK. The project's node_modules is a Windows build and
 *  adding a package means every contributor reinstalls to use one screen's
 *  button; the request here is a POST with three headers, which is not worth
 *  that. If the SDK is wanted later, this file is the only thing that changes.
 *
 *  NOTHING HERE THROWS AT THE CALLER. Every failure — no key, a network problem,
 *  a refused model, a response that is not the JSON that was asked for — comes
 *  back as a result that says what went wrong. The two generators differ in what
 *  they do about it, and the difference is deliberate:
 *
 *    SEO fields    fall back to deterministic copy. Empty meta tags are worse
 *                  than plain ones, and the fallback is genuinely serviceable.
 *    Event copy    falls back to CHANGING NOTHING. A site's About paragraph is
 *                  prose somebody wrote; replacing it with a generated template
 *                  when the model is unreachable would be a downgrade applied
 *                  silently, which is the one outcome worth avoiding.
 */

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

/**
 * The model id, overridable without a code change.
 *
 * Model names change faster than this file will be edited, and a wrong one is rejected with a
 * clear message from the API, which `reason` passes straight through to the screen. So if a
 * generator reports an unknown model, set SEO_AI_MODEL in .env to a current id rather than
 * editing this line.
 */
const MODEL = process.env.SEO_AI_MODEL || "claude-sonnet-4-5";

/** A single click should not be able to hang a form for a minute. */
const TIMEOUT_MS = Number(process.env.SEO_AI_TIMEOUT_MS || 20_000);

type AnthropicJson =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; reason: string };

/** Pulls the JSON object out of a reply that may still have arrived wrapped in something. */
function parseJsonObject(text: string): Record<string, unknown> | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = (fenced ? fenced[1] : text).trim();
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end <= start) return null;

  try {
    const parsed = JSON.parse(body.slice(start, end + 1));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/**
 * One request, one JSON object back.
 *
 * Shared by both generators so there is a single place that knows the endpoint, the key, the
 * timeout and how an API error is turned into a sentence a person can act on.
 */
async function callAnthropicJson(system: string, user: string, maxTokens: number): Promise<AnthropicJson> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, reason: "No ANTHROPIC_API_KEY is set." };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(ANTHROPIC_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });

    if (!response.ok) {
      // The API's own message is the useful part — an unknown model, an expired key and a rate
      // limit all look identical from the outside otherwise. Surfaced, never logged with the key.
      const detail = await response.text().catch(() => "");
      let message = `${response.status} ${response.statusText}`;
      try {
        const parsed = JSON.parse(detail);
        if (parsed?.error?.message) message = String(parsed.error.message);
      } catch {
        /* a non-JSON error body: the status line is what there is */
      }
      console.error(`[seo] Anthropic request failed: ${message}`);
      return { ok: false, reason: `The model could not be reached (${message}).` };
    }

    const payload = (await response.json()) as { content?: Array<{ type?: string; text?: string }> };
    const text = (payload.content ?? [])
      .filter((block) => block?.type === "text" && typeof block.text === "string")
      .map((block) => block.text as string)
      .join("\n");

    const parsed = text ? parseJsonObject(text) : null;
    if (!parsed) return { ok: false, reason: "The model's reply was not readable as JSON." };

    return { ok: true, data: parsed };
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    console.error("[seo] Anthropic request threw:", error);
    return {
      ok: false,
      reason: aborted ? "The model took too long to answer." : "The model could not be reached.",
    };
  } finally {
    clearTimeout(timer);
  }
}

/* ==========================================================================
 *  1. SEARCH AND SOCIAL METADATA
 * ========================================================================== */

export type SeoGenerationSource = "ai" | "fallback";

export interface SeoGenerationResult {
  fields: SeoFields;
  source: SeoGenerationSource;
  /** Present when `source` is "fallback": why the model was not used, in words a human can act on. */
  reason?: string;
}

const SEO_SYSTEM_PROMPT = [
  "You write search and social metadata for event and exhibition websites.",
  "",
  "Rules:",
  "- Reply with a single JSON object and nothing else. No prose, no markdown, no code fence.",
  "- Every value is plain text. No HTML, no quotes around the whole value, no emoji.",
  "- Respect the character budget given for each field. Shorter is fine; over is not.",
  "- Write the three channels differently. The meta description is for someone scanning search",
  "  results and should carry the searchable terms. The Open Graph description is for someone",
  "  scrolling Facebook or LinkedIn and should give them a reason to click. The X/Twitter",
  "  description is the shortest and sharpest of the three. Never repeat one verbatim in another.",
  "- Use only facts given in the input. Do not invent dates, venues, prices, speaker names,",
  "  attendance figures or awards. If a detail is absent, write around it.",
  "- British English.",
  "- metaKeywords is a comma-separated list, most specific first, no repetition.",
].join("\n");

function factLines(source: SeoSource): string[] {
  const dateRange = formatDateRange(source.dateStart, source.dateEnd);
  return [
    ["Site name", plainText(source.siteName)],
    ["Brand", plainText(source.brand)],
    ["Website address", plainText(source.link)],
    ["Event title", plainText(source.eventTitle)],
    ["Event description", plainText(source.eventDescription)],
    ["Location / format", plainText(source.location)],
    ["Dates", dateRange],
    ["Title the admin has already typed", plainText(source.currentTitle)],
    ["Description the admin has already typed", plainText(source.currentDescription)],
  ]
    .filter(([, value]) => Boolean(value))
    .map(([label, value]) => `${label}: ${value}`);
}

function buildSeoPrompt(source: SeoSource): string {
  const budgets = SEO_FIELD_KEYS.filter((key) => key !== "canonicalUrl")
    .map((key) => `  "${key}": string, max ${SEO_LIMITS[key]} characters`)
    .join("\n");

  return [
    "Here is what is known about the site. Treat anything the admin has already typed as the",
    "strongest signal about what this page is for, and build the rest around it.",
    "",
    ...factLines(source),
    "",
    "Return exactly this JSON shape:",
    "{",
    budgets,
    "}",
  ].join("\n");
}

export async function generateSeoFields(source: SeoSource): Promise<SeoGenerationResult> {
  const result = await callAnthropicJson(SEO_SYSTEM_PROMPT, buildSeoPrompt(source), 1024);

  if (!result.ok) {
    return {
      fields: buildSeoFallback(source),
      source: "fallback",
      reason: `${result.reason} These were written from your site and event details instead.`,
    };
  }

  // coerceSeoFields clamps every value and fills anything missing, so a partial answer still
  // produces a complete, valid set rather than blank boxes.
  return { fields: coerceSeoFields(result.data, source), source: "ai" };
}

/* ==========================================================================
 *  2. THE EVENT'S OWN DESCRIPTION
 * ========================================================================== */

/** find_events.description_short is a single line; the long one is what the About section renders. */
export const EVENT_DESCRIPTION_SHORT_MAX = 255;
export const EVENT_DESCRIPTION_MAX = 4000;

export interface EventCopyResult {
  description: string;
  descriptionShort: string;
  source: "ai";
}

export type EventCopyOutcome = EventCopyResult | { source: "skipped"; reason: string };

const EVENT_COPY_SYSTEM_PROMPT = [
  "You write the 'About the event' copy for a business exhibition or expo website.",
  "",
  "Rules:",
  "- Reply with a single JSON object and nothing else. No prose, no markdown, no code fence.",
  '- "description": two or three short paragraphs of plain text, separated by a blank line.',
  "  Paragraph one says what the event is and who it is for. Paragraph two says what a visitor",
  "  or exhibitor actually does there. A third is optional and only if you have something to say.",
  '- "descriptionShort": one sentence, at most 200 characters, usable on its own as a summary.',
  "- Plain text only. No HTML, no markdown, no headings, no bullet points, no emoji.",
  "- Use only facts given in the input. Do NOT invent dates, venues, prices, speaker names,",
  "  attendance figures, exhibitor counts, awards or years. Write around anything you were not",
  "  given rather than guessing at it.",
  "- Use the event's own name as given. Do not shorten it, expand it or correct it.",
  "- British English. Plain, concrete, no marketing superlatives ('world-class', 'unparalleled').",
].join("\n");

/**
 * Write the event's description from its title and whatever else is known.
 *
 * RETURNS "skipped" RATHER THAN A TEMPLATE when the model is unavailable. See the note at the
 * top of this file: the caller is expected to leave the existing description alone in that case.
 */
export async function generateEventCopy(source: SeoSource): Promise<EventCopyOutcome> {
  const prompt = [
    "Write the About copy for this event.",
    "",
    ...factLines(source),
    "",
    "Return exactly this JSON shape:",
    "{",
    '  "description": string, two or three paragraphs separated by a blank line',
    `  "descriptionShort": string, one sentence, max 200 characters`,
    "}",
  ].join("\n");

  const result = await callAnthropicJson(EVENT_COPY_SYSTEM_PROMPT, prompt, 2048);
  if (!result.ok) return { source: "skipped", reason: result.reason };

  const rawDescription = typeof result.data.description === "string" ? result.data.description : "";
  const rawShort = typeof result.data.descriptionShort === "string" ? result.data.descriptionShort : "";

  /*
   * Paragraph breaks survive; everything else is normalised.
   *
   * plainText() collapses ALL whitespace including newlines, which is right for a meta tag and
   * wrong here — the About section splits this value on blank lines to render real paragraphs.
   * So the blank lines are protected, each paragraph is cleaned on its own, and the result is
   * rejoined. HTML is stripped the same way, because a model that returns <p> tags would
   * otherwise have them rendered as literal text.
   */
  const paragraphs = rawDescription
    .split(/\r?\n\s*\r?\n/)
    .map((paragraph) => plainText(paragraph))
    .filter(Boolean);

  if (paragraphs.length === 0) {
    return { source: "skipped", reason: "The model returned an empty description." };
  }

  const description = paragraphs.join("\n\n").slice(0, EVENT_DESCRIPTION_MAX);
  const descriptionShort = clamp(rawShort || paragraphs[0], EVENT_DESCRIPTION_SHORT_MAX);

  return { description, descriptionShort, source: "ai" };
}
