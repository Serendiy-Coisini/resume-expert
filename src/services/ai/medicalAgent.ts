import type { MedicalAnalysisResult, MedicalUserInput } from "@/types/medical";
import { getAIHeaders } from "@/store/ai-config-store";

export async function runMedicalAnalysis(
  input: MedicalUserInput,
  signal?: AbortSignal,
  allowDemoMode?: boolean
): Promise<{ result: MedicalAnalysisResult; mode: "llm" | "mock"; warning?: string }> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let effectiveSignal = signal;

  if (!effectiveSignal) {
    if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
      try {
        effectiveSignal = AbortSignal.timeout(120_000);
      } catch {
        const controller = new AbortController();
        timeoutId = setTimeout(() => controller.abort(), 120_000);
        effectiveSignal = controller.signal;
      }
    } else if (typeof AbortController !== "undefined") {
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), 120_000);
      effectiveSignal = controller.signal;
    }
  }

  const aiHeaders = getAIHeaders();

  try {
    const response = await fetch("/api/medical/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...aiHeaders,
      },
      body: JSON.stringify({ input, allowDemoMode }),
      signal: effectiveSignal,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "医学生保研诊断优化请求失败");
    }

    return data;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}
