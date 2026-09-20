import type { AIMode } from "@/lib/ai/types";
import { validateAndSanitizeBaseUrl } from "@/lib/ai/ssrf";
import { z } from "zod";

const browserConfigSchema = z.object({
  apiKey: z.string().trim().min(1).max(512),
  baseUrl: z.string().trim().max(2_000).optional(),
  model: z.string().trim().max(200).optional(),
  visionModel: z.string().trim().max(200).optional(),
  provider: z.string().trim().max(100).optional(),
  providerId: z.string().trim().max(100).optional(),
}).strict();

export interface AIConfig {
  mode: AIMode;
  apiKey: string;
  baseUrl: string;
  model: string;
  visionModel: string;
  provider: string;
}

export function getAIConfig(req?: Request): AIConfig {
  if (req?.headers.get("x-ai-mode") === "mock") {
    return { mode: "mock", apiKey: "", baseUrl: "", model: "", visionModel: "", provider: "mock" };
  }
  if (req) {
    const rawHeader = req.headers.get("x-llm-config");
    if (rawHeader && rawHeader.length <= 16_384) {
      let parsed: {
        apiKey?: string;
        baseUrl?: string;
        model?: string;
        visionModel?: string;
        provider?: string;
        providerId?: string;
      } | null = null;
      try {
        const candidate = JSON.parse(decodeURIComponent(rawHeader));
        const validated = browserConfigSchema.safeParse(candidate);
        parsed = validated.success ? validated.data : null;
      } catch (err) {
        console.warn("[getAIConfig] Failed to parse x-llm-config header:", err);
      }

      if (parsed && parsed.apiKey && typeof parsed.apiKey === "string" && parsed.apiKey.trim()) {
        const apiKey = parsed.apiKey.trim();
        const rawBaseUrl = parsed.baseUrl?.trim() || "https://api.openai.com/v1";
        // SSRF protection: throws if baseUrl is invalid or targets internal network
        const baseUrl = validateAndSanitizeBaseUrl(rawBaseUrl);
        const model = parsed.model?.trim() || "deepseek-chat";
        const visionModel = parsed.visionModel?.trim() || parsed.model?.trim() || model;
        const provider = parsed.provider?.trim() || parsed.providerId?.trim() || "openai-compatible";
        return {
          mode: "llm",
          apiKey,
          baseUrl,
          model,
          visionModel,
          provider,
        };
      }
    }
  }

  const apiKey = process.env.LLM_API_KEY?.trim() ?? "";
  const forceMock = process.env.USE_MOCK_AI === "true";
  const allowServerKey = process.env.ALLOW_SERVER_LLM_KEY === "true";
  const mode: AIMode = !forceMock && apiKey && allowServerKey ? "llm" : "mock";

  return {
    mode,
    apiKey,
    baseUrl: (process.env.LLM_BASE_URL?.trim() || "https://api.openai.com/v1").replace(/\/$/, ""),
    model: process.env.LLM_MODEL?.trim() || "gpt-4o-mini",
    visionModel: process.env.LLM_VISION_MODEL?.trim() || process.env.VISION_MODEL?.trim() || process.env.LLM_MODEL?.trim() || "gpt-4o-mini",
    provider: process.env.LLM_PROVIDER?.trim() || "openai-compatible",
  };
}

export function getPublicAIStatus() {
  const config = getAIConfig();
  const forceMock = process.env.USE_MOCK_AI === "true";
  const missingApiKey = !config.apiKey;
  const serverKeyDisabled = Boolean(config.apiKey) && process.env.ALLOW_SERVER_LLM_KEY !== "true";

  return {
    mode: config.mode,
    model: config.mode === "llm" ? config.model : undefined,
    provider: config.mode === "llm" ? config.provider : undefined,
    reason:
      config.mode === "mock"
        ? forceMock
          ? "forced"
          : missingApiKey
            ? "missing_api_key"
            : serverKeyDisabled
              ? "server_key_disabled"
            : undefined
        : undefined,
  };
}
