import { z } from "zod";

/**
 * Mirrors find_event_lobby_agenda — one "Lobby Agenda" row, which the legacy UI calls a hall or
 * track (Ted Talk Hall, Seminar Hall 2, Keynote Forum 1 ...). Sessions in
 * find_event_lobby_agenda_items hang off it.
 *
 * Field set follows the Add/Edit form in members/event_lobby_agenda_items.php. Only `title` is
 * required, because the same endpoint also backs the lightweight inline "quick add a track"
 * flow inside the schedule builder, which supplies nothing else.
 *
 * Statuses: the legacy form offers Active/Pending. "inactive" is accepted too — earlier revisions
 * of this app wrote it, and rejecting a value already sitting in the table would make those rows
 * uneditable.
 */
export const AGENDA_TRACK_STATUSES = ["active", "pending", "inactive"] as const;

/** The legacy Agenda Type dropdown: a PDF upload, or a table of sessions built on this page. */
export const AGENDA_TRACK_TYPES = ["table", "pdf"] as const;

const optionalText = z
  .string()
  .trim()
  .max(255)
  .optional()
  .or(z.literal(""));

/** Accepts "" / null / a numeric string, because HTML selects always post strings. */
const optionalId = z
  .union([z.number(), z.string(), z.null()])
  .optional()
  .transform((value) => {
    if (value === null || value === undefined || value === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  });

export const eventLobbyAgendaTrackSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(255),
  description: optionalText,
  /** find_event_lobby_agenda.agenda_type. Blank is tolerated for rows migrated without one. */
  agenda_type: z.enum(AGENDA_TRACK_TYPES).optional().or(z.literal("")),
  /** common_type TST master — the session length this hall's slots are generated at. */
  session_mst: optionalText,
  /** common_type TST master — gap between consecutive sessions. */
  buffer_time_mst: optionalText,
  /** common_type AGTYPE master — Keynote / Seminar / Workshop and friends. */
  agenda_hall_type: optionalText,
  /** find_event_lobby_layout_manager or find_event_lobby_child_layout_manager id. */
  event_layout_id: optionalId,
  timezone: optionalText,
  status: z.enum(AGENDA_TRACK_STATUSES).default("active"),
});

export type EventLobbyAgendaTrackInput = z.infer<typeof eventLobbyAgendaTrackSchema>;

export type AgendaTrackStatus = (typeof AGENDA_TRACK_STATUSES)[number];
export type AgendaTrackType = (typeof AGENDA_TRACK_TYPES)[number];

/**
 * find_event_lobby_agenda.status/agenda_type are plain VarChars, so anything could be in them.
 * These narrow a stored value to the union the form works with, falling back rather than
 * throwing — a row holding an unexpected value must still open in the editor so it can be fixed.
 */
export function normaliseAgendaTrackStatus(value: string | null | undefined): AgendaTrackStatus {
  return (AGENDA_TRACK_STATUSES as readonly string[]).includes(value ?? "")
    ? (value as AgendaTrackStatus)
    : "active";
}

export function normaliseAgendaTrackType(value: string | null | undefined): AgendaTrackType | "" {
  return (AGENDA_TRACK_TYPES as readonly string[]).includes(value ?? "") ? (value as AgendaTrackType) : "";
}
