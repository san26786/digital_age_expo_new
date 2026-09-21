"use server";

import { revalidatePath } from "next/cache";
import { CACHE_TAGS, revalidateContent } from "@/lib/cache";
import { requireCpPermission, CP_PERMISSIONS } from "@/lib/cp/rbac";
import {
  grantEventOrganiser,
  revokeEventOrganiser,
  findUserByIdentifier,
} from "@/lib/cp/events/organisersRepository";
import type { OrganiserActionState } from "./organiserActionState";

/**
 * Shared by BOTH places organisers can be managed — the event's own page (/cp/events/[id]) and
 * the user's page (/cp/users/[id]). One pair of actions rather than a pair per screen, because
 * the two screens differ only in which half of the (event, user) pair the admin already has:
 * duplicating the logic is how the two ends drift into disagreeing about what a grant means.
 *
 * GATED ON EVENTS_EDIT, not USERS_EDIT, on both screens. What is being changed is who runs an
 * event, so the permission that governs it is the event one wherever the form happens to live —
 * otherwise the Users page would be a way around the events permission.
 */

function revalidateOrganiser(eventId: number, userId: number | null): void {
  revalidatePath(`/cp/events/${eventId}`);
  revalidatePath("/cp/events");
  if (userId) revalidatePath(`/cp/users/${userId}`);
  // The member portal decides what to show from isEventOrganiser() on every request, but the
  // event itself is cached by tag — without this the newly-granted organiser can sign in and
  // still be served the previous render's navbar.
  revalidateContent(CACHE_TAGS.event);
}

/**
 * Grants organiser access. Both `eventId` and `user` come from the form, so the same action
 * serves the event screen (where the admin types who) and the user screen (where they pick
 * which event, and the user is a hidden field).
 */
export async function grantOrganiserAction(
  _prev: OrganiserActionState,
  formData: FormData
): Promise<OrganiserActionState> {
  await requireCpPermission(CP_PERMISSIONS.EVENTS_EDIT);

  const eventId = Number(formData.get("eventId"));
  if (!Number.isInteger(eventId) || eventId <= 0) {
    return { error: "Pick an event first.", success: null };
  }

  const identifier = String(formData.get("user") ?? "").trim();
  if (!identifier) {
    return { error: "Enter a username, email address, or user ID.", success: null };
  }

  const user = await findUserByIdentifier(identifier);
  if (!user) {
    return { error: `No user found matching "${identifier}".`, success: null };
  }

  const result = await grantEventOrganiser(eventId, user.id);
  if (!result.ok) {
    const message =
      result.error === "already-organiser"
        ? `${user.login} is already an organiser of this event.`
        : result.error === "no-such-event"
          ? "That event no longer exists."
          : "That user no longer exists.";
    return { error: message, success: null };
  }

  revalidateOrganiser(eventId, user.id);

  const name = `${user.user_first_name} ${user.user_last_name}`.trim() || user.login;
  return { error: null, success: `${name} is now an organiser of this event.` };
}

/**
 * Removes organiser access. Bound with both ids at the call site rather than read from the form,
 * because this renders as one button per row and there is nothing for the admin to type.
 */
export async function revokeOrganiserAction(eventId: number, userId: number): Promise<void> {
  await requireCpPermission(CP_PERMISSIONS.EVENTS_EDIT);
  await revokeEventOrganiser(eventId, userId);
  revalidateOrganiser(eventId, userId);
}
