export interface SupabaseEnv {
  url: string;
  anonKey: string;
}

/**
 * Public Supabase settings (safe for the browser: the anon/publishable key
 * only grants what Row Level Security allows). Returns null when unset so
 * the app can show a setup message instead of crashing.
 *
 * Each variable is referenced literally so Next.js can inline it into the
 * client bundle.
 */
export function getSupabaseEnv(): SupabaseEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) return null;
  return { url, anonKey };
}
