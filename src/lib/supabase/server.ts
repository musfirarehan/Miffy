import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { ApiError } from "@/lib/api/http";

import { getSupabaseEnv } from "./config";

/**
 * Server-side Supabase client acting AS the signed-in user (anon key plus
 * the user's session cookie). Because it never uses a service-role key,
 * Row Level Security is always enforced by the database.
 */
export async function createSupabaseServerClient() {
  const env = getSupabaseEnv();
  if (!env) {
    throw new ApiError(
      503,
      "not_configured",
      "Supabase isn’t configured. Add the Supabase URL and anon key to the server environment.",
    );
  }
  const store = await cookies();
  return createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) {
            store.set(name, value, options);
          }
        } catch {
          // Called from a context where cookies are read-only; the proxy
          // refreshes the session cookie on page requests instead.
        }
      },
    },
  });
}

export type SupabaseServerClient = Awaited<
  ReturnType<typeof createSupabaseServerClient>
>;
