import { prisma } from "@/lib/prisma";
import type { EventMemberContext } from "@/lib/services/eventAccess";
import type {
  EventRegistrationFieldInput,
  RegistrationFieldFlag,
} from "@/lib/validations/eventRegistrationField";

/**
 * ---------------------------------------------------------------------------
 * find_event_registration_fields — port of legacy members/manage_registration.php
 * ---------------------------------------------------------------------------
 *
 * Deliberately written against $queryRaw / $executeRaw rather than a Prisma
 * model: `find_event_registration_fields` is NOT in prisma/schema.prisma, and
 * hand-authoring a model for a table whose real column types can't be inspected
 * from here would risk a schema that disagrees with the live database. Raw SQL
 * talks to the table exactly as the PHP did, needs no migration, and keeps
 * working whether or not the model is introspected later.
 *
 * Every value is passed as a tagged-template parameter, so nothing here is
 * string-concatenated into SQL. The one thing that cannot be parameterised — a
 * column name, for the toggle switches — is handled by branching to three fixed
 * statements instead (see setRegistrationFieldFlag).
 */

export interface RegistrationFieldRow {
  id: number;
  eventId: number;
  fieldName: string;
  fieldVariable: string;
  fieldType: string;
  isActive: boolean;
  isRequired: boolean;
  login: boolean;
  /** Custom fields are organiser-created: only these can be edited or deleted. */
  isCustom: boolean;
  options: string[];
}

/** Legacy columns are tinyint/int, so accept 1/"1"/true alike. */
function toBool(value: unknown): boolean {
  return value === true || value === 1 || value === "1";
}

function parseOptions(raw: unknown): string[] {
  if (!raw || typeof raw !== "string") return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((o) => String(o)).filter((o) => o.trim() !== "");
  } catch {
    return [];
  }
}

function toRow(record: any): RegistrationFieldRow {
  return {
    id: Number(record.id),
    eventId: Number(record.event_id),
    fieldName: record.field_name ?? "",
    fieldVariable: record.field_variable ?? "",
    fieldType: record.field_type ?? "text",
    isActive: toBool(record.is_active),
    isRequired: toBool(record.is_required),
    login: toBool(record.login),
    isCustom: toBool(record.is_custom),
    options: parseOptions(record.options),
  };
}

async function selectForEvent(eventId: number): Promise<any[]> {
  return prisma.$queryRaw<any[]>`
    SELECT id, event_id, field_name, field_variable, field_type,
           is_active, is_required, login, is_custom, options
      FROM find_event_registration_fields
     WHERE event_id = ${eventId}
     ORDER BY id ASC
  `;
}

/**
 * Lists the event's fields, seeding them on first visit.
 *
 * Mirrors the PHP: when an event has no rows yet, copy the template set held
 * against `event_id = 0 AND is_default = 1`. `is_custom` is deliberately NOT
 * copied, so seeded rows stay marked built-in — which is what protects them
 * from deletion. It no longer disables their switches; see the note in
 * components/dashboard/RegistrationFieldsManager.
 *
 * ONE DELIBERATE DIVERGENCE: the legacy INSERT..SELECT column list was
 *   (event_id, field_name, field_type, field_variable, is_active, is_required)
 * — it omitted `login`, so every seeded row got login = 0 regardless of the
 * template. On the live site Password is configured with "Validate on Login"
 * ON, and that setting was silently dropped for each new event. `login` is
 * carried through here so the seeded set actually matches the template.
 */
export async function listRegistrationFields(
  context: EventMemberContext,
): Promise<RegistrationFieldRow[]> {
  const eventId = context.eventId;

  let records = await selectForEvent(eventId);

  if (records.length === 0) {
    await prisma.$executeRaw`
      INSERT INTO find_event_registration_fields
        (event_id, field_name, field_type, field_variable, is_active, is_required, login, options)
      SELECT ${eventId}, field_name, field_type, field_variable, is_active, is_required, login, options
        FROM find_event_registration_fields
       WHERE event_id = 0 AND is_default = 1
       ORDER BY id ASC
    `;
    records = await selectForEvent(eventId);
  }

  return records.map(toRow);
}

export async function createRegistrationField(
  context: EventMemberContext,
  input: EventRegistrationFieldInput,
): Promise<void> {
  // is_custom = 1: organiser-created, therefore editable and deletable — same
  // flag the PHP set on insert.
  await prisma.$executeRaw`
    INSERT INTO find_event_registration_fields
      (event_id, field_name, field_type, field_variable, is_active, is_required, login, options, is_custom)
    VALUES (
      ${context.eventId},
      ${input.field_name},
      ${input.field_type},
      ${input.field_variable},
      ${input.is_active ? 1 : 0},
      ${input.is_required ? 1 : 0},
      ${input.login ? 1 : 0},
      ${JSON.stringify(input.options)},
      1
    )
  `;
}

/**
 * Scoped by `event_id` as well as `id` so one organiser can never edit another
 * event's row by guessing an id — the legacy UPDATE was keyed on id alone.
 */
export async function updateRegistrationField(
  context: EventMemberContext,
  id: number,
  input: EventRegistrationFieldInput,
): Promise<number> {
  return prisma.$executeRaw`
    UPDATE find_event_registration_fields
       SET field_name = ${input.field_name},
           field_type = ${input.field_type},
           field_variable = ${input.field_variable},
           is_active = ${input.is_active ? 1 : 0},
           is_required = ${input.is_required ? 1 : 0},
           login = ${input.login ? 1 : 0},
           options = ${JSON.stringify(input.options)}
     WHERE id = ${id} AND event_id = ${context.eventId}
  `;
}

/**
 * Deletes a field. Guarded on `is_custom = 1` because the built-in fields are
 * what the public registration form is built from — the legacy screen only
 * rendered the trash icon for custom rows, but its delete URL would happily
 * remove a default one if called directly.
 */
export async function deleteRegistrationField(
  context: EventMemberContext,
  id: number,
): Promise<number> {
  return prisma.$executeRaw`
    DELETE FROM find_event_registration_fields
     WHERE id = ${id} AND event_id = ${context.eventId} AND is_custom = 1
  `;
}

/**
 * Flips one of the three grid switches.
 *
 * A column name cannot be a bound parameter, so rather than interpolating the
 * caller's string into SQL this branches to three fixed statements. `flag` is
 * already constrained by registrationFieldToggleSchema; this makes injection
 * structurally impossible regardless.
 */
export async function setRegistrationFieldFlag(
  context: EventMemberContext,
  id: number,
  flag: RegistrationFieldFlag,
  value: boolean,
): Promise<number> {
  const numeric = value ? 1 : 0;

  switch (flag) {
    case "is_active":
      return prisma.$executeRaw`
        UPDATE find_event_registration_fields SET is_active = ${numeric}
         WHERE id = ${id} AND event_id = ${context.eventId}
      `;
    case "is_required":
      return prisma.$executeRaw`
        UPDATE find_event_registration_fields SET is_required = ${numeric}
         WHERE id = ${id} AND event_id = ${context.eventId}
      `;
    case "login":
      return prisma.$executeRaw`
        UPDATE find_event_registration_fields SET login = ${numeric}
         WHERE id = ${id} AND event_id = ${context.eventId}
      `;
  }
}
