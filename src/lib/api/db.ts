import "server-only";

import type { PostgrestError } from "@supabase/supabase-js";

import { ApiError } from "./http";

/**
 * Converts a database error into an ApiError. Only the Postgres error code
 * is logged: messages can embed user content.
 */
export function dbError(error: PostgrestError, what: string): ApiError {
  console.error(`[db] ${what} failed (${error.code || "unknown"})`);
  return new ApiError(500, "database_error", "Couldn’t reach your saved data. Try again.");
}

export const toMillis = (iso: string): number => new Date(iso).getTime();
