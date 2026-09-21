import { createHash, timingSafeEqual } from "node:crypto";
import { RequestValidationError } from "@/lib/ai/request-validation";

function accessTokens(): string[] {
  try {
    const value: unknown = JSON.parse(process.env.SERVER_LLM_ACCESS_TOKENS || "[]");
    return Array.isArray(value) && value.length <= 100 && value.every(token => typeof token === "string" && token.length >= 32 && token.length <= 256)
      ? value : [];
  } catch { return []; }
}

export function serverAccessConfigured(): boolean {
  // Local counters cannot provide a shared budget across replicas. Fail closed.
  return process.env.SERVER_LLM_DEPLOYMENT === "single-instance" && accessTokens().length > 0;
}

export function authorizeServerLLM(request: Request): string {
  if (!serverAccessConfigured()) throw new RequestValidationError("服务端共享模型未配置访问控制，请使用个人 API Key", 403);
  const supplied = request.headers.get("x-server-access-token") || "";
  if (supplied.length > 256) throw new RequestValidationError("服务访问口令无效", 403);
  const digest = createHash("sha256").update(supplied).digest();
  const valid = accessTokens().some(token => timingSafeEqual(digest, createHash("sha256").update(token).digest()));
  if (!valid) throw new RequestValidationError("请在 AI 配置中填写管理员提供的服务访问口令", 403);
  return digest.toString("hex");
}

/**
 * Safely verifies if the supplied token matches any configured server access token.
 * Returns the hex digest of the authenticated token, or null if invalid, tampered, or unconfigured.
 */
export function verifyServerAccessToken(supplied: string | null | undefined): string | null {
  if (!supplied || typeof supplied !== "string" || supplied.length < 32 || supplied.length > 256 || !serverAccessConfigured()) {
    return null;
  }
  const digest = createHash("sha256").update(supplied).digest();
  const valid = accessTokens().some(token => timingSafeEqual(digest, createHash("sha256").update(token).digest()));
  return valid ? digest.toString("hex") : null;
}

const usage = new Map<string, { day: number; calls: number; active: number }>();
let globalActive = 0;
let globalDay = -1;
let globalCalls = 0;
function limit(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 && value <= 10000 ? value : fallback;
}

/** Counts actual upstream calls, including retries, and limits concurrent spending. */
export function reserveServerCall(principal?: string): () => void {
  if (!principal) return () => {};
  const day = Math.floor(Date.now() / 86_400_000);
  if (globalDay !== day) { globalDay = day; globalCalls = 0; }
  const current = usage.get(principal) ?? { day, calls: 0, active: 0 };
  if (current.day !== day) { current.day = day; current.calls = 0; }
  if (current.calls >= limit("SERVER_LLM_USER_DAILY_CALLS", 40) || globalCalls >= limit("SERVER_LLM_TOTAL_DAILY_CALLS", 200) || current.active >= 2 || globalActive >= 4) {
    throw new RequestValidationError("共享模型调用预算或并发上限已达到，请稍后重试或使用个人 Key", 429);
  }
  current.calls++; current.active++; globalCalls++; globalActive++;
  usage.set(principal, current);
  let released = false;
  return () => { if (!released) { released = true; current.active--; globalActive--; } };
}
