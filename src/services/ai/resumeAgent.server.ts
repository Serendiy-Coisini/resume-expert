import { getAIConfig, type AIConfig } from "@/lib/ai/config";
import type { AIMode } from "@/lib/ai/types";
import {
  runMockFollowUpBullet,
  runMockRegenerateOptimizedItems,
  runMockResumeAnalysis,
  runMockReoptimizeWithBullets,
  runMockExtractTemplate,
} from "@/services/ai/resumeAgent.mock";
import {
  runLLMFollowUpBullet,
  runLLMRegenerateOptimizedItems,
  runLLMReoptimizeWithBullets,
  runLLMResumeAnalysisStream,
  runLLMExtractTemplate,
} from "@/services/ai/resumeAgent.llm";
import type { FollowUpBulletEntry } from "@/lib/ai/prompts";
import type { AnalysisResult, OptimizeStyle, UserInput } from "@/types/resume";

function currentMode(config?: AIConfig): AIMode {
  return config?.mode ?? getAIConfig().mode;
}

export async function analyzeResumeServer(
  input: UserInput,
  optimizeStyle: OptimizeStyle = "ai-product",
  config?: AIConfig,
  signal?: AbortSignal
): Promise<{ result: AnalysisResult; mode: AIMode }> {
  const mode = currentMode(config);

  if (mode === "llm") {
    const result = await runLLMResumeAnalysisStream(input, optimizeStyle, undefined, config, signal);
    return { result, mode };
  }

  const result = await runMockResumeAnalysis(input, optimizeStyle);
  return { result, mode };
}

export async function regenerateOptimizedItemsServer(
  input: UserInput,
  style: OptimizeStyle,
  config?: AIConfig,
  signal?: AbortSignal
): Promise<{
  optimizedItems: AnalysisResult["optimizedItems"];
  finalResume?: AnalysisResult["finalResume"];
  mode: AIMode;
}> {
  const mode = currentMode(config);

  if (mode === "llm") {
    const { optimizedItems } = await runLLMRegenerateOptimizedItems(input, style, config, signal);
    return { optimizedItems, mode };
  }

  const { optimizedItems, finalResume } = await runMockRegenerateOptimizedItems(input, style);
  return { optimizedItems, finalResume, mode };
}

export async function generateFollowUpBulletServer(
  input: UserInput,
  question: string,
  purpose: string,
  userAnswer: string,
  config?: AIConfig,
  signal?: AbortSignal
): Promise<{ bullet: string; mode: AIMode }> {
  const mode = currentMode(config);

  if (mode === "llm") {
    const bullet = await runLLMFollowUpBullet(input, question, purpose, userAnswer, config, signal);
    return { bullet, mode };
  }

  const bullet = await runMockFollowUpBullet(purpose, userAnswer);
  return { bullet, mode };
}

export async function reoptimizeWithBulletsServer(
  input: UserInput,
  style: OptimizeStyle,
  bullets: FollowUpBulletEntry[],
  config?: AIConfig,
  signal?: AbortSignal
): Promise<{ optimizedItems: AnalysisResult["optimizedItems"]; finalResume: AnalysisResult["finalResume"]; mode: AIMode }> {
  const mode = currentMode(config);

  if (mode === "llm") {
    const { optimizedItems, finalResume } = await runLLMReoptimizeWithBullets(input, style, bullets, config, signal);
    return { optimizedItems, finalResume, mode };
  }

  const { optimizedItems, finalResume } = await runMockReoptimizeWithBullets(input, style, bullets);
  return { optimizedItems, finalResume, mode };
}

export async function extractTemplateServer(rawContent: string, config?: AIConfig, signal?: AbortSignal): Promise<{ html: string; mode: AIMode }> {
  const mode = currentMode(config);

  if (mode === "llm") {
    const html = await runLLMExtractTemplate(rawContent, config, signal);
    return { html, mode };
  }

  const html = await runMockExtractTemplate(rawContent);
  return { html, mode };
}
