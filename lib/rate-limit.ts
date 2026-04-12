// ============================================================================
// Rate limiter — Supabase-backed (global, distributed).
// Uses the `check_rate_limit` RPC (030_rate_limits.sql migration) for atomic
// fixed-window counting across all serverless instances.
// Falls back to in-memory in development when supabaseAdmin is unavailable.
// ============================================================================

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { supabaseAdmin } from "@/lib/supabase-admin";

const isDev = process.env.NODE_ENV === "development";

// ── Redis-backed rate limiter ───────────────────────────────────────────────

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

let redis: Redis | null = null;
if (redisUrl && redisToken) {
  redis = new Redis({ url: redisUrl, token: redisToken });
} else if (isDev) {
  console.warn("[rate-limit] UPSTASH_REDIS_REST_URL not set — using in-memory fallback (development only)");
} else {
  console.error("[rate-limit] UPSTASH_REDIS_REST_URL not set — rate-limited endpoints will hard-fail in production");
}

// Pre-built limiters for common use cases
const limiters = redis ? {
  booking: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, "1 h"), prefix: "rl:booking" }),
  bookingPhone: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(3, "1 h"), prefix: "rl:booking-phone" }),
  chat: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(20, "1 h"), prefix: "rl:chat" }),
  adminLogin: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, "15 m"), prefix: "rl:admin-login" }),
  crmNudge: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, "1 h"), prefix: "rl:crm-nudge" }),
} : null;

// ── In-memory store (development only) ────────────────────────────────────

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

if (isDev && typeof setInterval !== "undefined") {
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
 * Synchronous rate limit check.
 * In production without Redis: always returns false (deny).
 * In development without Redis: uses in-memory fallback.
 */
export function checkRateLimit(
  key: string,
  limit = 10,
  windowMs = 60 * 60 * 1000
): boolean {
  if (!isDev && !redis) return false;
  return checkInMemory(key, limit, windowMs);
}

/**
 * Async rate limit check using Upstash Redis.
 * If Redis throws or is unreachable: returns { allowed: false } — callers must 429.
 * If Redis not configured in production: returns { allowed: false }.
 * If Redis not configured in development: uses in-memory fallback.
 */
export async function checkRateLimitAsync(
  key: string,
  limiterName: keyof NonNullable<typeof limiters>
): Promise<{ allowed: boolean; remaining: number }> {
  if (limiters && limiters[limiterName]) {
    try {
      const result = await limiters[limiterName].limit(key);
      return { allowed: result.success, remaining: result.remaining };
    } catch (err) {
      console.error("[rate-limit] Upstash error — hard-failing request:", err);
      return { allowed: false, remaining: 0 };
    }
  }

  // No Redis configured
  if (!isDev) return { allowed: false, remaining: 0 };

  // Development only — in-memory fallback
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

/**
 * Global rate limit check backed by Supabase (works across all serverless instances).
 * Uses the `check_rate_limit` RPC for atomic fixed-window counting.
 * Falls back to in-memory in development if the RPC call fails.
 *
 * Returns true if the request is allowed, false if it should be denied (429).
 */
export async function checkRateLimitGlobal(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin.rpc("check_rate_limit", {
      p_key: key,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
    if (error) throw error;
    // Only deny when the RPC explicitly returns false (limit exceeded).
    // Any other value (null, undefined, truthy-string from PostgREST) → fail-open
    // so a Supabase glitch never blocks real bookings.
    if (data === false) return false;
    if (data !== true) {
      console.warn("[rate-limit] Unexpected RPC response (failing open):", JSON.stringify(data));
    }
    return true;
  } catch (err) {
    console.error("[rate-limit] Supabase RPC error — failing open:", err);
    // In production, fail-open (allow) so transient DB issues never block real bookings.
    if (!isDev) return true;
    return checkInMemory(key, limit, windowSeconds * 1000);
  }
}

/** Extract client IP from Next.js request headers */
export function getClientIP(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}
