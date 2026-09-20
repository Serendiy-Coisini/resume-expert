import type {
  AnalyzeResponseBody,
  ApplyFollowUpResponseBody,
  FollowUpBulletResponseBody,
  OptimizeResponseBody,
} from "@/lib/ai/types";
import type { AnalysisResult, OptimizeStyle, UserInput } from "@/types/resume";
import { anonymizePayload, restoreAnalysisResult } from "@/lib/privacy/pii";
import { useResumeStore } from "@/store/resume-store";
import { getAIHeaders, getUserAIConfig, useAIConfigStore } from "@/store/ai-config-store";

export { STYLE_LABELS } from "@/lib/ai/types";

class ResumeAgentClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ResumeAgentClientError";
  }
}

async function postJSON<T>(url: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const effectiveSignal = signal ?? AbortSignal.timeout(60_000);
  const aiHeaders = getAIHeaders();
  const { value: safeBody, piiMap } = anonymizePayload(body, useResumeStore.getState().enablePIIMasking);

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...aiHeaders,
      },
      body: JSON.stringify(safeBody),
      signal: effectiveSignal,
    });
  } catch (error) {
    // User cancelled via AbortController — re-throw as-is so the caller
    // can distinguish cancellation from real errors
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    // Timeout from AbortSignal.timeout()
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new ResumeAgentClientError("请求超时（60 秒），请缩短 JD / 简历内容后重试");
    }
    throw new ResumeAgentClientError("网络请求失败，请检查网络连接");
  }

  const data = (await response.json().catch(() => ({}))) as T & { error?: string };

  if (!response.ok) {
    throw new ResumeAgentClientError(data.error || `请求失败 (${response.status})`);
  }

  return restoreAnalysisResult(data, piiMap);
}

export async function fetchAIStatus() {
  if (useAIConfigStore.getState().forceMock) return { mode: "mock" as const };
  const userConfig = getUserAIConfig();
  if (userConfig?.apiKey) {
    return {
      mode: "llm" as const,
      model: userConfig.model || "deepseek-chat",
      provider: userConfig.providerId || "custom",
    };
  }

  const response = await fetch("/api/ai/status", { cache: "no-store" });
  if (!response.ok) {
    return { mode: "mock" as const };
  }
  return response.json() as Promise<{
    mode: "mock" | "llm";
    model?: string;
    provider?: string;
    reason?: "missing_api_key" | "forced" | "server_key_disabled";
  }>;
}

export interface AnalysisStreamCallbacks {
  enablePIIMasking?: boolean;
  onStageChange?: (stage: string, status: "start" | "complete") => void;
  onPartialResult?: (partialResult: Partial<AnalysisResult>) => void;
}

export async function runResumeAnalysis(
  input: UserInput,
  optimizeStyle: OptimizeStyle = "ai-product",
  signal?: AbortSignal
): Promise<AnalysisResult> {
  const data = await postJSON<AnalyzeResponseBody>("/api/analyze", { input, optimizeStyle }, signal);
  return data.result;
}

export async function runResumeAnalysisStream(
  input: UserInput,
  optimizeStyle: OptimizeStyle = "ai-product",
  callbacks: AnalysisStreamCallbacks = {},
  signal?: AbortSignal
): Promise<AnalysisResult> {
  const { enablePIIMasking = true, onStageChange, onPartialResult } = callbacks;

  const { value: inputToSend, piiMap } = anonymizePayload(input, enablePIIMasking);

  const effectiveSignal = signal ?? AbortSignal.timeout(90_000);
  const aiHeaders = getAIHeaders();

  let response: Response;
  try {
    response = await fetch("/api/analyze/stream", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...aiHeaders,
      },
      body: JSON.stringify({ input: inputToSend, optimizeStyle }),
      signal: effectiveSignal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new ResumeAgentClientError("请求超时（90 秒），请缩短 JD / 简历内容后重试");
    }
    throw new ResumeAgentClientError("网络请求失败，请检查网络连接");
  }

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    throw new ResumeAgentClientError(data.error || `请求失败 (${response.status})`);
  }

  if (!response.body) {
    throw new ResumeAgentClientError("服务器未返回流数据");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let finalResult: AnalysisResult | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.trim()) continue;
      const eventMatch = line.match(/^event:\s*(.+)$/m);
      const dataMatch = line.match(/^data:\s*(.+)$/m);

      const eventName = eventMatch ? eventMatch[1].trim() : "message";
      const dataStr = dataMatch ? dataMatch[1].trim() : "";
      if (!dataStr) continue;

      try {
        const payload = JSON.parse(dataStr);

        if (eventName === "stage") {
          onStageChange?.(payload.stage, payload.status);
          if (payload.data) {
            const restoredPartial = restoreAnalysisResult(payload.data, piiMap);
            onPartialResult?.(restoredPartial);
          }
        } else if (eventName === "complete") {
          const restoredFinal = restoreAnalysisResult(payload.result, piiMap);
          finalResult = restoredFinal;
        } else if (eventName === "error") {
          throw new ResumeAgentClientError(payload.error || "分析中断");
        }
      } catch (e) {
        if (e instanceof ResumeAgentClientError) throw e;
      }
    }
  }

  if (!finalResult) {
    throw new ResumeAgentClientError("未收到完整分析结果");
  }

  if (finalResult.finalResume?.personalInfo) finalResult.finalResume.personalInfo.avatarUrl = input.avatarUrl;
  if (finalResult.englishResume?.personalInfo) finalResult.englishResume.personalInfo.avatarUrl = input.avatarUrl;
  return finalResult;
}


export async function regenerateOptimizedItems(
  input: UserInput,
  style: OptimizeStyle
): Promise<{
  optimizedItems: AnalysisResult["optimizedItems"];
  finalResume?: AnalysisResult["finalResume"];
}> {
  const data = await postJSON<OptimizeResponseBody>("/api/optimize", { input, style });
  return { optimizedItems: data.optimizedItems, finalResume: data.finalResume };
}

export async function generateFollowUpBullet(
  input: UserInput,
  question: string,
  purpose: string,
  userAnswer: string
): Promise<string> {
  const data = await postJSON<FollowUpBulletResponseBody>("/api/follow-up/bullet", {
    input,
    question,
    purpose,
    userAnswer,
  });
  return data.bullet;
}

/**
 * Apply follow-up generated bullets to regenerate optimizedItems + finalResume.
 */
export async function applyFollowUpBullets(
  input: UserInput,
  style: OptimizeStyle,
  bullets: { purpose: string; bullet: string }[]
): Promise<Pick<AnalysisResult, "optimizedItems" | "finalResume">> {
  const data = await postJSON<ApplyFollowUpResponseBody>("/api/apply-followup", {
    input,
    style,
    bullets,
  });
  return {
    optimizedItems: data.optimizedItems,
    finalResume: data.finalResume,
  };
}

export async function extractResumeTemplate(content: string): Promise<string> {
  const data = await postJSON<{ html: string }>("/api/extract-template", { content });
  return data.html;
}
