export interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

/**
 * Sliding-window limiter held in memory.
 *
 * Limitation: state is per server instance. On Vercel (serverless) each
 * instance has its own counters, so this is a best-effort guard against
 * runaway clients and accidental loops, not a hard guarantee. A shared
 * store (e.g. Supabase or Upstash) is the upgrade path once accounts exist.
 */
export function createRateLimiter({ limit, windowMs }: RateLimitOptions) {
  const hits = new Map<string, number[]>();
  let lastSweep = Date.now();

  return function check(key: string, now = Date.now()): RateLimitResult {
    if (now - lastSweep > windowMs) {
      for (const [k, stamps] of hits) {
        if (stamps.every((t) => now - t >= windowMs)) hits.delete(k);
      }
      lastSweep = now;
    }

    const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
    if (recent.length >= limit) {
      hits.set(key, recent);
      const retryMs = windowMs - (now - recent[0]);
      return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil(retryMs / 1000)) };
    }
    recent.push(now);
    hits.set(key, recent);
    return { allowed: true, retryAfterSeconds: 0 };
  };
}
