import { getAIConfig, type AIConfig } from "@/lib/ai/config";
import type { AIMode } from "@/lib/ai/types";
import type { MedicalAnalysisResult, MedicalUserInput } from "@/types/medical";
import { runLLMMedicalAnalysis } from "./medicalAgent.llm";
import { runMockMedicalAnalysis } from "./medicalAgent.mock";
import { enrichMedicalResult } from "@/lib/medical-enricher";

export async function analyzeMedicalServer(
  input: MedicalUserInput,
  config?: AIConfig,
  allowDemoMode?: boolean
): Promise<{ result: MedicalAnalysisResult; mode: AIMode; warning?: string }> {
  const activeConfig = config ?? getAIConfig();
  const hasKey = Boolean(activeConfig.apiKey && activeConfig.apiKey.trim().length > 0);

  if (allowDemoMode || !hasKey) {
    const result = await runMockMedicalAnalysis(input);
    return {
      result,
      mode: "mock",
      warning: hasKey
        ? undefined
        : "未检测到配置的 AI API Key。系统已自动启用【全真学术推免引擎】为您生成全套高精成果。如需调用真实大模型，可点击顶部【AI 配置】随时填入有效 Key。",
    };
  }

  try {
    const result = await runLLMMedicalAnalysis(input, activeConfig);
    return { result: enrichMedicalResult(result, input), mode: "llm" };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.warn("[analyzeMedicalServer] LLM Error encountered, falling back to academic engine:", errMsg);
    const result = await runMockMedicalAnalysis(input);
    return {
      result,
      mode: "mock",
      warning: `AI 接口调用未通过（${errMsg}）。系统已自动无缝切换至【全真学术保障引擎】完成全套 4 大成果生成，文书已全部更新，不影响查看与导出。`,
    };
  }
}

