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
  runLLMResumeAnalysis,
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
  config?: AIConfig
): Promise<{ result: AnalysisResult; mode: AIMode }> {
  const mode = currentMode(config);

  if (mode === "llm") {
    const result = await runLLMResumeAnalysis(input, optimizeStyle, config);
    return { result, mode };
  }

  const result = await runMockResumeAnalysis(input, optimizeStyle);
  return { result, mode };
}

export async function regenerateOptimizedItemsServer(
  input: UserInput,
  style: OptimizeStyle,
  config?: AIConfig
): Promise<{
  optimizedItems: AnalysisResult["optimizedItems"];
  finalResume?: AnalysisResult["finalResume"];
  mode: AIMode;
}> {
  const mode = currentMode(config);

  if (mode === "llm") {
    const { optimizedItems } = await runLLMRegenerateOptimizedItems(input, style, config);
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
  config?: AIConfig
): Promise<{ bullet: string; mode: AIMode }> {
  const mode = currentMode(config);

  if (mode === "llm") {
    const bullet = await runLLMFollowUpBullet(input, question, purpose, userAnswer, config);
    return { bullet, mode };
  }

  const bullet = await runMockFollowUpBullet(purpose, userAnswer);
  return { bullet, mode };
}

export async function reoptimizeWithBulletsServer(
  input: UserInput,
  style: OptimizeStyle,
  bullets: FollowUpBulletEntry[],
  config?: AIConfig
): Promise<{ optimizedItems: AnalysisResult["optimizedItems"]; finalResume: AnalysisResult["finalResume"]; mode: AIMode }> {
  const mode = currentMode(config);

  if (mode === "llm") {
    const { optimizedItems, finalResume } = await runLLMReoptimizeWithBullets(input, style, bullets, config);
    return { optimizedItems, finalResume, mode };
  }

  const { optimizedItems, finalResume } = await runMockReoptimizeWithBullets(input, style, bullets);
  return { optimizedItems, finalResume, mode };
}

export async function extractTemplateServer(rawContent: string, config?: AIConfig): Promise<{ html: string; mode: AIMode }> {
  const mode = currentMode(config);

  if (mode === "llm") {
    const html = await runLLMExtractTemplate(rawContent, config);
    return { html, mode };
  }

  const html = await runMockExtractTemplate(rawContent);
  return { html, mode };
}
