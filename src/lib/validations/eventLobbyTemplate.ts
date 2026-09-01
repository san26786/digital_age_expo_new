import { z } from "zod";

/**
 * Mirrors find_event_lobby_templates — the shared library of lobby layouts an organiser can
 * import into their event (Auditorium Template 1, Exhibition Hall Template 1 (22 Stands),
 * Premium Template ...).
 *
 * Options are taken verbatim from the Layout Type and Status selects in
 * members/event_lobby_templates.php.
 */
export const LOBBY_TEMPLATE_LAYOUT_TYPES = [
  "networking",
  "exhibition",
  "exhibition_stand",
  "auditorium",
  "photobooth",
] as const;

export const LOBBY_TEMPLATE_STATUSES = ["enabled", "disabled"] as const;

export type LobbyTemplateLayoutType = (typeof LOBBY_TEMPLATE_LAYOUT_TYPES)[number];
export type LobbyTemplateStatus = (typeof LOBBY_TEMPLATE_STATUSES)[number];

/** Display names for the list and the select; "" is the legacy "None" option. */
export const LOBBY_TEMPLATE_LAYOUT_LABELS: Record<string, string> = {
  "": "None",
  networking: "Networking",
  exhibition: "Exhibition",
  exhibition_stand: "Exhibition Stand",
  auditorium: "Auditorium",
  photobooth: "Photo Booth",
};

export const eventLobbyTemplateSchema = z.object({
  // The legacy `addValidator('title', new Validate_NonEmpty())` was commented out, which is how
  // the library ends up with untitled rows that render as a blank cell. Required here.
  title: z.string().trim().min(1, "Title is required").max(255),
  description: z.string().trim().max(5000).optional().or(z.literal("")),
  // layout_type is NOT NULL in the schema, but "" is a legitimate value ("None" in the select),
  // so it is stored as an empty string rather than null.
  layout_type: z.enum(LOBBY_TEMPLATE_LAYOUT_TYPES).optional().or(z.literal("")),
  status: z.enum(LOBBY_TEMPLATE_STATUSES).default("enabled"),
});

export type EventLobbyTemplateInput = z.infer<typeof eventLobbyTemplateSchema>;

/** find_event_template_color_options — colourways offered for an exhibition-stand template. */
export const lobbyTemplateColorSchema = z.object({
  color: z.string().trim().min(1, "Colour is required").max(50),
});

export type LobbyTemplateColorInput = z.infer<typeof lobbyTemplateColorSchema>;

/** Normalises a stored layout_type to one the select can show. */
export function normaliseLayoutType(value: string | null | undefined): LobbyTemplateLayoutType | "" {
  return (LOBBY_TEMPLATE_LAYOUT_TYPES as readonly string[]).includes(value ?? "")
    ? (value as LobbyTemplateLayoutType)
    : "";
}

export function normaliseTemplateStatus(value: string | null | undefined): LobbyTemplateStatus {
  return value === "disabled" ? "disabled" : "enabled";
}
