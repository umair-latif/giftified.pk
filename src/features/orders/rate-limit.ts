/**
 * Fixed-window counter per key (e.g. client IP).
 *
 * MVP: kept IN MEMORY, per server instance. On a single Node server that is
 * exactly "10 tries per hour"; on serverless/multiple instances each instance
 * counts separately, so the real limit is higher. Move it to a shared store
 * (Redis/KV/the Phase B database) before scaling out. It also resets on deploy.
 */
export interface RateLimiter {
  /** True when `key` has used up its tries in the current window. */
  isLimited(key: string): boolean;
  /** Counts one try for `key`. */
  hit(key: string): void;
  /** Tries left in the current window (for tests and logs). */
  remaining(key: string): number;
}

export interface RateLimitOptions {
  limit: number;
  windowMs: number;
  /** Upper bound on tracked keys so the map can't grow without limit. */
  maxKeys?: number;
  now?: () => number;
}

export function createRateLimiter({
  limit,
  windowMs,
  maxKeys = 10_000,
  now = Date.now,
}: RateLimitOptions): RateLimiter {
  const buckets = new Map<string, { count: number; resetAt: number }>();

  const live = (key: string) => {
    const b = buckets.get(key);
    if (b && b.resetAt <= now()) {
      buckets.delete(key);
      return undefined;
    }
    return b;
  };

  const prune = () => {
    const t = now();
    for (const [k, b] of buckets) if (b.resetAt <= t) buckets.delete(k);
    // Still full: drop the oldest entries (Map keeps insertion order).
    while (buckets.size >= maxKeys) {
      const oldest = buckets.keys().next();
      if (oldest.done) break;
      buckets.delete(oldest.value);
    }
  };

  return {
    isLimited: (key) => (live(key)?.count ?? 0) >= limit,
    remaining: (key) => Math.max(0, limit - (live(key)?.count ?? 0)),
    hit(key) {
      const b = live(key);
      if (b) {
        b.count += 1;
        return;
      }
      if (buckets.size >= maxKeys) prune();
      buckets.set(key, { count: 1, resetAt: now() + windowMs });
    },
  };
}
