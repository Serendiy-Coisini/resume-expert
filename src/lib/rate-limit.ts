/**
 * Lightweight in-memory sliding window rate limiter.
 * Limits requests per client IP to prevent denial of service and API quota exhaustion.
 */

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
  const xForwardedFor = req.headers.get("x-forwarded-for");
  if (xForwardedFor) {
    const clientIp = xForwardedFor.split(",")[0]?.trim();
    if (clientIp) return clientIp;
  }
  const xRealIp = req.headers.get("x-real-ip");
  if (xRealIp?.trim()) return xRealIp.trim();

  const cfConnectingIp = req.headers.get("cf-connecting-ip");
  if (cfConnectingIp?.trim()) return cfConnectingIp.trim();

  return "127.0.0.1";
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
  const now = Date.now();
  const windowStart = now - windowMs;

  const timestamps = ipRequestsMap.get(ip) || [];
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
  ipRequestsMap.set(ip, validTimestamps);

  const remaining = Math.max(0, maxRequests - validTimestamps.length);
  const resetInSeconds = Math.ceil(windowMs / 1000);

  return {
    success: true,
    limit: maxRequests,
    remaining,
    resetInSeconds,
  };
}
