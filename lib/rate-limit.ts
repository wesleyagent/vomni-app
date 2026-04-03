// ============================================================================
// Rate limiter — Upstash Redis (distributed) with in-memory fallback
// ============================================================================

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// ── Redis-backed rate limiter ───────────────────────────────────────────────

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

let redis: Redis | null = null;
if (redisUrl && redisToken) {
  redis = new Redis({ url: redisUrl, token: redisToken });
} else {
  console.warn("[rate-limit] UPSTASH_REDIS_REST_URL not set — using in-memory fallback (not distributed)");
}

// Pre-built limiters for common use cases
const limiters = redis ? {
  booking: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, "1 h"), prefix: "rl:booking" }),
  bookingPhone: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(3, "1 h"), prefix: "rl:booking-phone" }),
  chat: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(20, "1 h"), prefix: "rl:chat" }),
  adminLogin: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, "15 m"), prefix: "rl:admin-login" }),
  crmNudge: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, "1 h"), prefix: "rl:crm-nudge" }),
} : null;

// ── In-memory fallback ─────────────────────────────────────────────────────

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, val] of store.entries()) {
      if (now > val.resetAt) store.delete(key);
    }
  }, 10 * 60 * 1000);
}

function checkInMemory(key: string, limit: number, windowMs: number): boolean {
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

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Check and increment rate limit for a key.
 * Returns true if the request is allowed, false if limit exceeded.
 *
 * Uses Upstash Redis if configured, otherwise falls back to in-memory.
 */
export function checkRateLimit(
  key: string,
  limit = 10,
  windowMs = 60 * 60 * 1000
): boolean {
  // Always use in-memory for the generic function (sync API)
  return checkInMemory(key, limit, windowMs);
}

/**
 * Async rate limit check using Upstash Redis (preferred).
 * Falls back to in-memory if Redis is not configured.
 */
export async function checkRateLimitAsync(
  key: string,
  limiterName: keyof NonNullable<typeof limiters>
): Promise<{ allowed: boolean; remaining: number }> {
  if (limiters && limiters[limiterName]) {
    const result = await limiters[limiterName].limit(key);
    return { allowed: result.success, remaining: result.remaining };
  }

  // Fallback — map limiter names to defaults
  const defaults: Record<string, { limit: number; windowMs: number }> = {
    booking: { limit: 5, windowMs: 3600000 },
    bookingPhone: { limit: 3, windowMs: 3600000 },
    chat: { limit: 20, windowMs: 3600000 },
    adminLogin: { limit: 5, windowMs: 900000 },
    crmNudge: { limit: 10, windowMs: 3600000 },
  };

  const d = defaults[limiterName] ?? { limit: 10, windowMs: 3600000 };
  const allowed = checkInMemory(key, d.limit, d.windowMs);
  return { allowed, remaining: allowed ? d.limit - 1 : 0 };
}

/**
 * Get remaining requests for a key (for headers). In-memory only.
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
