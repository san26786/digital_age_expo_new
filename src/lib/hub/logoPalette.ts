/**
 * ===========================================================================
 *  A THEME, READ OUT OF A LOGO
 * ===========================================================================
 *
 *  Upload a logo and the three colours that drive the site are filled in from it. The point is
 *  not cleverness — it is that the alternative is asking somebody to eyedropper their own brand
 *  colour out of a PNG and type six hex digits, which is a job nobody enjoys and most people get
 *  slightly wrong.
 *
 *  Every function here is pure and DOM-free. The canvas work — turning a File into pixels — stays
 *  in the component; this module takes the RGBA bytes and gives back hex. That split is what makes
 *  the interesting half testable without a browser, and the interesting half is all of it.
 *
 *  ---------------------------------------------------------------------------
 *  WHAT IT IGNORES, AND WHY THAT IS MOST OF THE WORK
 *  ---------------------------------------------------------------------------
 *
 *  A logo is mostly not its brand colour. It is transparent padding, white knockout, black text
 *  and anti-aliased edges that are neither one thing nor the other. Counting raw pixel frequency
 *  picks the background every time. So transparent, near-white, near-black and unsaturated pixels
 *  are all dropped before anything is counted, and what remains is bucketed by HUE rather than by
 *  exact value — two neighbouring pixels of a gradient or a JPEG artefact are the same brand
 *  colour and must not compete with each other for the top spot.
 */

export interface LogoPalette {
  primary: string;
  secondary: string;
  background: string;
  /** Small label and link text: the brand hue as an off-white, not the brand colour itself. */
  accentText: string;
  /** True when the logo had no usable colour and these are a neutral fallback rather than its own. */
  monochrome: boolean;
}

/* ------------------------------------------------------------------ colour maths */

export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;
  return [h, s, l];
}

export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const channel = (t: number) => {
    let v = t;
    if (v < 0) v += 1;
    if (v > 1) v -= 1;
    if (v < 1 / 6) return p + (q - p) * 6 * v;
    if (v < 1 / 2) return q;
    if (v < 2 / 3) return p + (q - p) * (2 / 3 - v) * 6;
    return p;
  };
  return [
    Math.round(channel(h + 1 / 3) * 255),
    Math.round(channel(h) * 255),
    Math.round(channel(h - 1 / 3) * 255),
  ];
}

export function hslToHex(h: number, s: number, l: number): string {
  const [r, g, b] = hslToRgb(h, clamp01(s), clamp01(l));
  return "#" + [r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("");
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** WCAG relative luminance. */
function luminance(r: number, g: number, b: number): number {
  const f = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/** Contrast ratio of a colour against white — the text colour every button here uses. */
export function contrastWithWhite(h: number, s: number, l: number): number {
  const [r, g, b] = hslToRgb(h, clamp01(s), clamp01(l));
  const lum = luminance(r, g, b);
  return 1.05 / (lum + 0.05);
}

/**
 * Darken until white text on it is readable.
 *
 * ---------------------------------------------------------------------------
 *  THE STEP THAT STOPS A YELLOW BRAND PRODUCING AN UNREADABLE BUTTON
 * ---------------------------------------------------------------------------
 *
 *  Primary is a button background with white text on it. Taken raw, a yellow, lime or cyan logo
 *  gives a colour with a contrast ratio near 1.1 — white text on it is genuinely invisible, and
 *  the theme editor would have produced a site that cannot be read while looking like it worked.
 *
 *  Hue and saturation are preserved and only lightness moves, so the colour stays recognisably the
 *  brand's. The floor matters as much as the target: a hue that cannot reach 4.5 without turning
 *  into mud stops at 0.24 lightness rather than marching to black. Better a slightly weak contrast
 *  in a colour somebody recognises than a perfect ratio in a colour they will not accept.
 */
export function darkenForWhiteText(h: number, s: number, l: number, target = 4.5): [number, number, number] {
  let lightness = l;
  while (contrastWithWhite(h, s, lightness) < target && lightness > 0.24) {
    lightness -= 0.02;
  }
  return [h, s, Math.max(0.24, lightness)];
}

/* ------------------------------------------------------------------ extraction */

const HUE_BUCKETS = 24;

interface Bucket {
  weight: number;
  hueSin: number;
  hueCos: number;
  sat: number;
  light: number;
}

/**
 * The palette for one logo, from its raw RGBA bytes.
 *
 * `stride` samples every Nth pixel — a 64x64 thumbnail is already plenty to find a dominant hue,
 * and this runs on the main thread while somebody waits.
 */
export function paletteFromPixels(data: Uint8ClampedArray, stride = 1): LogoPalette {
  const buckets = new Map<number, Bucket>();
  let chromatic = 0;

  for (let i = 0; i < data.length; i += 4 * stride) {
    const alpha = data[i + 3];
    if (alpha < 128) continue; // transparent padding

    const [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2]);

    // The knockout, the drop shadow and the anti-aliased edge all live at these extremes.
    if (l > 0.92 || l < 0.06) continue;
    if (s < 0.15) continue;

    chromatic += 1;

    const key = Math.floor(h * HUE_BUCKETS) % HUE_BUCKETS;
    const bucket = buckets.get(key) ?? { weight: 0, hueSin: 0, hueCos: 0, sat: 0, light: 0 };

    /*
     * Hue is an angle, so it is averaged as one — summing the raw 0..1 values would put the mean
     * of two reds either side of the wrap point (0.01 and 0.99) at cyan.
     */
    const angle = h * 2 * Math.PI;
    bucket.weight += 1;
    bucket.hueSin += Math.sin(angle);
    bucket.hueCos += Math.cos(angle);
    bucket.sat += s;
    bucket.light += l;
    buckets.set(key, bucket);
  }

  /*
   * A logo with no colour in it at all — white-on-transparent, or pure black line art. There is
   * nothing to read, and inventing a palette from anti-aliasing noise would be worse than saying
   * so. The caller shows the fallback rather than silently repainting the site.
   */
  if (chromatic < 12 || buckets.size === 0) {
    return {
      primary: "#C71585",
      secondary: "#4B0082",
      background: "#05030A",
      accentText: "#EDE7EA",
      monochrome: true,
    };
  }

  const resolved = [...buckets.entries()]
    .map(([key, b]) => {
      const hue = (Math.atan2(b.hueSin / b.weight, b.hueCos / b.weight) / (2 * Math.PI) + 1) % 1;
      return {
        key,
        hue,
        sat: b.sat / b.weight,
        light: b.light / b.weight,
        weight: b.weight,
        // Common AND saturated. Frequency alone picks a muddy fill over the actual brand mark;
        // saturation alone picks one stray magenta pixel in a photo.
        score: b.weight * (0.4 + b.sat),
      };
    })
    .sort((a, b) => b.score - a.score);

  const top = resolved[0];

  // Lift a washed-out sample into something that works as a brand colour, then make it readable.
  const [ph, ps, pl] = darkenForWhiteText(
    top.hue,
    Math.max(top.sat, 0.55),
    Math.min(Math.max(top.light, 0.42), 0.62)
  );

  /*
   * Secondary wants to be a DIFFERENT colour, not a neighbour: at least 40 degrees away, or it
   * reads as a printing error rather than a second brand colour. A single-colour logo has no
   * second hue to find, so one is built a short way around the wheel and darker — the relationship
   * the stock palette already has between its pink and its purple.
   */
  const apart = (a: number, b: number) => {
    const d = Math.abs(a - b) % 1;
    return Math.min(d, 1 - d);
  };

  const partner = resolved.slice(1).find((entry) => apart(entry.hue, top.hue) > 40 / 360);

  const [sh, ss, sl] = partner
    ? [partner.hue, Math.max(partner.sat, 0.5), Math.min(Math.max(partner.light, 0.26), 0.42)]
    : [(top.hue - 0.09 + 1) % 1, Math.min(ps + 0.1, 0.95), Math.max(pl - 0.26, 0.16)];

  /*
   * The page background carries the primary's HUE at almost no lightness. This design is dark-only
   * — the editor says as much — and a background that is merely dark grey next to a coloured brand
   * reads as unfinished, where the same near-black tinted toward the brand hue reads as deliberate.
   * The other four surfaces are left for the editor to derive from this one.
   */
  const background = hslToHex(ph, Math.min(ps, 0.45), 0.045);

  /*
   * ---------------------------------------------------------------------------
   *  THE BRAND COLOUR GOES ON BUTTONS; SMALL TEXT GETS AN OFF-WHITE OF THE SAME HUE
   * ---------------------------------------------------------------------------
   *
   *  A saturated brand colour is a fine button and a poor label. Set at 11px, uppercase and
   *  letter-spaced — which is what the accent is actually used for: times, stage names, eyebrows,
   *  "explore full schedule" — a strong hue vibrates against near-black, and a red one reads as an
   *  error state. A whole schedule section of it looks like a warning screen rather than a brand.
   *
   *  So the accent keeps the brand HUE and gives up nearly all of its saturation: the same colour,
   *  as an off-white. It still ties to the brand — put it beside a neutral grey and the warmth is
   *  visible — but it reads as text first. The brand colour itself stays where it means something,
   *  on the buttons and borders, so it lands on "click me" rather than on every label.
   *
   *  Anyone who wants a coloured accent sets one; this is the default, not a rule.
   */
  const accentText = hslToHex(ph, 0.14, 0.91);

  return {
    primary: hslToHex(ph, ps, pl),
    secondary: hslToHex(sh, ss, sl),
    background,
    accentText,
    monochrome: false,
  };
}
