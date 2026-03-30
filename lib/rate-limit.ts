// ============================================================================
// In-memory rate limiter — per-IP, sliding window
// ============================================================================

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// Global map — survives within a single serverless instance lifetime
const store = new Map<string, RateLimitEntry>();

// Periodically clean up old entries (every 10 minutes)
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, val] of store.entries()) {
      if (now > val.resetAt) store.delete(key);
    }
  }, 10 * 60 * 1000);
}

/**
 * Check and increment rate limit for a key (usually an IP address).
 * Returns true if the request is allowed, false if limit exceeded.
 *
 * @param key - identifier (IP, phone, etc.)
 * @param limit - max requests per window (default 10)
 * @param windowMs - window size in ms (default 1 hour)
 */
export function checkRateLimit(
  key: string,
  limit = 10,
  windowMs = 60 * 60 * 1000
): boolean {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) return false;

  entry.count++;
  return true;
}

/**
 * Get remaining requests for a key (for headers).
 */
export function getRateLimitInfo(
  key: string,
  limit = 10
): { remaining: number; resetAt: number } {
  const entry = store.get(key);
  if (!entry || Date.now() > entry.resetAt) {
    return { remaining: limit, resetAt: Date.now() + 60 * 60 * 1000 };
  }
  return { remaining: Math.max(0, limit - entry.count), resetAt: entry.resetAt };
}

/** Extract client IP from Next.js request headers */
export function getClientIP(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}
