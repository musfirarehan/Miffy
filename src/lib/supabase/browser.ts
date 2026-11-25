import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseEnv } from "./config";

/** Browser-side client; only used for signing in and out. */
export function createSupabaseBrowserClient() {
  const env = getSupabaseEnv();
  if (!env) return null;
  return createBrowserClient(env.url, env.anonKey);
}
