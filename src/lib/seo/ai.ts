import {
  SEO_FIELD_KEYS,
  SEO_LIMITS,
  buildSeoFallback,
  coerceSeoFields,
  formatDateRange,
  plainText,
  type SeoFields,
  type SeoSource,
} from "./generate";

/**
 * ===========================================================================
 *  MODEL-WRITTEN SEO COPY
 * ===========================================================================
 *
 *  Server-only. Called from the /api/seo/generate route; never imported into a
 *  client component, because it reads the API key.
 *
 *  NO NEW DEPENDENCY. This speaks to the Messages API over plain `fetch` rather
 *  than pulling in an SDK. The project's node_modules is a Windows build and
 *  adding a package means every contributor reinstalls to use one screen's
 *  button; the request here is a POST with three headers, which is not worth
 *  that. If the SDK is wanted later, this file is the only thing that changes.
 *
 *  IT NEVER THROWS AT THE CALLER. Every failure — no key, a network problem, a
 *  refused model, a response that is not the JSON that was asked for — returns
 *  the deterministic copy from ./generate with a `reason` explaining what went
 *  wrong. The button's job is to fill the form; a missing key should degrade
 *  the wording, not break the feature.
 */

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

/**
 * The model id, overridable without a code change.
 *
 * Model names change faster than this file will be edited, and a wrong one is
 * rejected with a clear message from the API, which `reason` passes straight
 * through to the screen. So if the button reports an unknown model, set
 * SEO_AI_MODEL in .env to a current id rather than editing this line.
 */
const MODEL = process.env.SEO_AI_MODEL || "claude-sonnet-4-5";

/** Long enough for eight short strings and the JSON around them, short enough to stay cheap. */
const MAX_TOKENS = 1024;

/** A single click should not be able to hang a form for a minute. */
const TIMEOUT_MS = Number(process.env.SEO_AI_TIMEOUT_MS || 20_000);

export type SeoGenerationSource = "ai" | "fallback";

export interface SeoGenerationResult {
  fields: SeoFields;
  source: SeoGenerationSource;
  /** Present when `source` is "fallback": why the model was not used, in words a human can act on. */
  reason?: string;
}

const SYSTEM_PROMPT = [
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

function buildUserPrompt(source: SeoSource): string {
  const dateRange = formatDateRange(source.dateStart, source.dateEnd);

  const facts = [
    ["Site name", plainText(source.siteName)],
    ["Brand", plainText(source.brand)],
    ["Website address", plainText(source.link)],
    ["Event title", plainText(source.eventTitle)],
    ["Event description", plainText(source.eventDescription)],
    ["Location / format", plainText(source.location)],
    ["Dates", dateRange],
    ["Title the admin has already typed", plainText(source.currentTitle)],
    ["Description the admin has already typed", plainText(source.currentDescription)],
  ].filter(([, value]) => Boolean(value));

  const budgets = SEO_FIELD_KEYS.filter((key) => key !== "canonicalUrl")
    .map((key) => `  "${key}": string, max ${SEO_LIMITS[key]} characters`)
    .join("\n");

  return [
    "Here is what is known about the site. Treat anything the admin has already typed as the",
    "strongest signal about what this page is for, and build the rest around it.",
    "",
    ...facts.map(([label, value]) => `${label}: ${value}`),
    "",
    "Return exactly this JSON shape:",
    "{",
    budgets,
    "}",
  ].join("\n");
}

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

export async function generateSeoFields(source: SeoSource): Promise<SeoGenerationResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();

  if (!apiKey) {
    return {
      fields: buildSeoFallback(source),
      source: "fallback",
      reason:
        "No ANTHROPIC_API_KEY is set, so these were written from your site and event details rather than by the model.",
    };
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
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: buildUserPrompt(source) }],
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
      return {
        fields: buildSeoFallback(source),
        source: "fallback",
        reason: `The model could not be reached (${message}). These were written from your site details instead.`,
      };
    }

    const payload = (await response.json()) as { content?: Array<{ type?: string; text?: string }> };
    const text = (payload.content ?? [])
      .filter((block) => block?.type === "text" && typeof block.text === "string")
      .map((block) => block.text as string)
      .join("\n");

    const parsed = text ? parseJsonObject(text) : null;
    if (!parsed) {
      return {
        fields: buildSeoFallback(source),
        source: "fallback",
        reason: "The model's reply was not readable as JSON. These were written from your site details instead.",
      };
    }

    // coerceSeoFields clamps every value and fills anything missing, so a partial answer still
    // produces a complete, valid set rather than blank boxes.
    return { fields: coerceSeoFields(parsed, source), source: "ai" };
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    console.error("[seo] Anthropic request threw:", error);
    return {
      fields: buildSeoFallback(source),
      source: "fallback",
      reason: aborted
        ? "The model took too long to answer. These were written from your site details instead."
        : "The model could not be reached. These were written from your site details instead.",
    };
  } finally {
    clearTimeout(timer);
  }
}
