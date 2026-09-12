/**
 * Typography field catalog — find_settings, grouptitle="typography". Genuinely new: this
 * project's fonts are currently hardcoded CSS custom properties in src/app/globals.css
 * (--font-sans: "Plus Jakarta Sans"..., --font-display: "Outfit"...), not driven by next/font
 * or any DB-backed config. These settings don't replace that file — Phase 2 is what would make
 * the public layout read these values and override those CSS variables at runtime; for now this
 * page just gives the CP a place to record the intended values.
 */

/**
 * The font list offered in each family dropdown.
 *
 * Typing a family name by hand is a silent failure mode: a typo, or a font nobody has
 * installed, produces no error anywhere — the browser just falls back and the site quietly
 * renders in something else. The first group is what globals.css already references (so those
 * are guaranteed to resolve today); the web-safe group needs no download at all; the Google
 * group are common families that would need loading in the public layout when Phase 2 wires
 * this up. A value saved earlier that isn't in any group is still offered — see page.tsx.
 */
export const TYPOGRAPHY_FONT_GROUPS = [
  {
    label: "Used by this site",
    fonts: ["Plus Jakarta Sans", "Inter", "Outfit", "Space Grotesk", "JetBrains Mono"],
  },
  {
    label: "Web-safe (no loading required)",
    fonts: [
      "system-ui",
      "Arial",
      "Helvetica",
      "Verdana",
      "Tahoma",
      "Trebuchet MS",
      "Georgia",
      "Times New Roman",
      "Courier New",
    ],
  },
  {
    label: "Google Fonts",
    fonts: [
      "Roboto",
      "Open Sans",
      "Lato",
      "Montserrat",
      "Poppins",
      "Nunito",
      "Raleway",
      "Work Sans",
      "Source Sans 3",
      "DM Sans",
      "Manrope",
      "Rubik",
      "Karla",
      "Oswald",
      "Merriweather",
      "Playfair Display",
      "Lora",
    ],
  },
] as const;

/** Every family name the dropdowns offer, flattened — used to spot a stored custom value. */
export const TYPOGRAPHY_KNOWN_FONTS: readonly string[] = TYPOGRAPHY_FONT_GROUPS.flatMap(
  (group) => group.fonts as readonly string[]
);

export const TYPOGRAPHY_FONT_FIELDS = [
  {
    varname: "cp_typography_primary_font",
    label: "Primary Font",
    defaultValue: "Plus Jakarta Sans",
    hint: "Main interface font (globals.css --font-sans).",
  },
  {
    varname: "cp_typography_secondary_font",
    label: "Secondary Font",
    defaultValue: "Inter",
    hint: "Fallback/support font used alongside the primary.",
  },
  {
    varname: "cp_typography_heading_font",
    label: "Heading Font",
    defaultValue: "Outfit",
    hint: "Display font for h1–h6 (globals.css --font-display).",
  },
  {
    varname: "cp_typography_body_font",
    label: "Body Font",
    defaultValue: "Plus Jakarta Sans",
    hint: "Running text: paragraphs, lists, tables.",
  },
] as const;

/**
 * Numeric fields get a real stepper (min/max/step on <input type="number">) rather than a free
 * text box, so the arrow keys and spinner work and the browser itself rejects a value outside
 * the range before the Server Action ever sees it. The bounds are deliberately conservative —
 * a 4px base size or a 3× heading scale is a broken site, not a preference.
 */
export const TYPOGRAPHY_NUMBER_FIELDS = [
  {
    varname: "cp_typography_base_font_size",
    label: "Base Font Size (px)",
    defaultValue: "16",
    min: 10,
    max: 32,
    step: 1,
    unit: "px",
    hint: "Root size everything else is sized from. 16 matches browser default.",
  },
  {
    varname: "cp_typography_heading_scale",
    label: "Heading Scale",
    defaultValue: "1.25",
    min: 1,
    max: 2,
    step: 0.05,
    unit: "×",
    hint: "Each heading level is this many times larger than the one below it.",
  },
] as const;

/** Combined catalog — what seeds find_settings, feeds "Restore Defaults", and is read back by actions.ts. */
export const TYPOGRAPHY_SETTINGS_FIELDS = [
  ...TYPOGRAPHY_FONT_FIELDS.map((field) => ({
    varname: field.varname,
    label: field.label,
    defaultValue: field.defaultValue as string,
  })),
  ...TYPOGRAPHY_NUMBER_FIELDS.map((field) => ({
    varname: field.varname,
    label: field.label,
    defaultValue: field.defaultValue as string,
  })),
];
