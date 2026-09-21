/**
 * Lightweight in-memory sliding window rate limiter.
 * Limits requests per client IP to prevent denial of service and API quota exhaustion.
 */

import { isIP } from "node:net";
import { verifyServerAccessToken } from "@/lib/ai/server-access";

interface RateLimitOptions {
  /** Maximum allowed requests within the time window */
  maxRequests?: number;
  /** Window duration in milliseconds (default: 60,000ms = 1 minute) */
  windowMs?: number;
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetInSeconds: number;
}

// In-memory sliding window storage: key (ip) -> timestamp array
const ipRequestsMap = new Map<string, number[]>();

// Auto-cleanup stale entries every 5 minutes to prevent memory leak
if (typeof setInterval !== "undefined") {
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, timestamps] of ipRequestsMap.entries()) {
      const recent = timestamps.filter((t) => now - t < 300_000);
      if (recent.length === 0) {
        ipRequestsMap.delete(key);
      } else {
        ipRequestsMap.set(key, recent);
      }
    }
  }, 300_000);

  // Allow Node.js process to exit cleanly if unref is supported
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }
}

/**
 * Extracts client IP from standard proxy headers or falls back to loopback.
 */
export function getClientIp(req: Request): string {
  const token = req.headers.get("x-server-access-token");
  const authenticatedPrincipal = verifyServerAccessToken(token);
  if (authenticatedPrincipal) return `credential:${authenticatedPrincipal}`;
  if (process.env.TRUST_PROXY_HEADERS !== "true") return "untrusted-client";
  const xForwardedFor = req.headers.get("x-forwarded-for");
  if (xForwardedFor) {
    const clientIp = xForwardedFor.split(",")[0]?.trim();
    if (clientIp && isIP(clientIp)) return clientIp;
  }
  const xRealIp = req.headers.get("x-real-ip");
  if (xRealIp?.trim() && isIP(xRealIp.trim())) return xRealIp.trim();

  const cfConnectingIp = req.headers.get("cf-connecting-ip");
  if (cfConnectingIp?.trim() && isIP(cfConnectingIp.trim())) return cfConnectingIp.trim();

  return "127.0.0.1";
}

export function rateLimitResponse(req: Request, options: RateLimitOptions = {}): Response | null {
  const result = checkRateLimit(req, options);
  if (result.success) return null;
  return new Response(JSON.stringify({ error: `请求过于频繁，请等待 ${result.resetInSeconds} 秒后再试` }), {
    status: 429,
    headers: {
      "Content-Type": "application/json",
      "Retry-After": String(result.resetInSeconds),
      "X-RateLimit-Limit": String(result.limit),
      "X-RateLimit-Remaining": String(result.remaining),
    },
  });
}

/**
 * Checks if the incoming request is within the rate limit.
 */
export function checkRateLimit(
  req: Request,
  options: RateLimitOptions = {}
): RateLimitResult {
  const { maxRequests = 15, windowMs = 60_000 } = options;
  const ip = getClientIp(req);
  const key = `${new URL(req.url).pathname}:${ip}`;
  const now = Date.now();
  const windowStart = now - windowMs;
  const aggregateKey = `aggregate:${new URL(req.url).pathname}`;
  const aggregate = (ipRequestsMap.get(aggregateKey) ?? []).filter(t => t > now - 60_000);
  if (aggregate.length >= 100 || (!ipRequestsMap.has(key) && ipRequestsMap.size >= 10_000)) {
    return { success: false, limit: 100, remaining: 0, resetInSeconds: 60 };
  }

  const timestamps = ipRequestsMap.get(key) || [];
  // Filter only timestamps in the current window
  const validTimestamps = timestamps.filter((t) => t > windowStart);

  if (validTimestamps.length >= maxRequests) {
    const oldest = validTimestamps[0];
    const resetInSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    return {
      success: false,
      limit: maxRequests,
      remaining: 0,
      resetInSeconds,
    };
  }

  validTimestamps.push(now);
  aggregate.push(now);
  ipRequestsMap.set(aggregateKey, aggregate);
  ipRequestsMap.set(key, validTimestamps);

  const remaining = Math.max(0, maxRequests - validTimestamps.length);
  const resetInSeconds = Math.ceil(windowMs / 1000);

  return {
    success: true,
    limit: maxRequests,
    remaining,
    resetInSeconds,
  };
}
