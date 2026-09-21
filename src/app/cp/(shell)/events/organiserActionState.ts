/**
 * The shape and initial value of the organiser form's action state.
 *
 * Deliberately NOT in organiserActions.ts. That file carries "use server", and a "use server"
 * module may export async functions and nothing else — every export becomes a callable server
 * reference, so a plain object among them fails at module evaluation with
 * "A 'use server' file can only export async functions, found object." The interface alone would
 * have been fine (types are erased before Next ever sees them); EMPTY_ORGANISER_STATE is a real
 * runtime value and is what broke it.
 *
 * Kept beside the actions rather than inlined into the form so the action's return type and the
 * form's initial state cannot drift apart.
 */
export interface OrganiserActionState {
  error: string | null;
  success: string | null;
}

export const EMPTY_ORGANISER_STATE: OrganiserActionState = { error: null, success: null };
