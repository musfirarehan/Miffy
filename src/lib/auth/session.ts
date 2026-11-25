import "server-only";

import type { User } from "@supabase/supabase-js";

import { ApiError } from "@/lib/api/http";
import {
  createSupabaseServerClient,
  type SupabaseServerClient,
} from "@/lib/supabase/server";

export interface AuthContext {
  supabase: SupabaseServerClient;
  user: User;
}

/**
 * Resolves the signed-in user from the session cookie, verified with the
 * Supabase auth server (not merely decoded). The user id is NEVER taken from
 * the request body or URL.
 *
 * Optional defence in depth: set ALLOWED_USER_EMAIL to lock the app to one
 * address even if sign-ups were ever re-enabled in the Supabase dashboard.
 */
export async function requireUser(): Promise<AuthContext> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new ApiError(401, "unauthorized", "Please sign in.");
  }
  const allowed = process.env.ALLOWED_USER_EMAIL?.trim().toLowerCase();
  if (allowed && data.user.email?.toLowerCase() !== allowed) {
    throw new ApiError(403, "forbidden", "This account isn’t allowed here.");
  }
  return { supabase, user: data.user };
}
