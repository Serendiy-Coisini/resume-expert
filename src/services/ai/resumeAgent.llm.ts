import { z } from "zod";
import { chatCompletionJSON } from "@/lib/ai/client";
import type { AIConfig } from "@/lib/ai/config";
import {
  RESUME_AGENT_SYSTEM_PROMPT,
  buildAnalyzeCorePrompt,
  buildAnalyzeDiagnosisPrompt,
  buildAnalyzeInterviewPrompt,
  buildAnalyzeOutputPrompt,
  buildExtractTemplatePrompt,
  buildFollowUpBulletPrompt,
  buildOptimizeUserPrompt,
  buildReoptimizeWithBulletsPrompt,
  normalizeAnalysisResult,
  normalizeFollowUpQuestions,
  normalizeOptimizedItems,
} from "@/lib/ai/prompts";
import type { FollowUpBulletEntry } from "@/lib/ai/prompts";
import {
  bulletResponseSchema,
  diagnosisMatchResponseSchema,
  interviewResponseSchema,
  jdAnalysisResponseSchema,
  optimizedItemsResponseSchema,
  optimizeResumeResponseSchema,
} from "@/lib/ai/schemas";
import type { AnalysisResult, OptimizeStyle, UserInput } from "@/types/resume";

type JDAnalysisResult = Pick<AnalysisResult, "jdAnalysis">;
type DiagnosisMatchResult = Pick<
  AnalysisResult,
  "diagnosis" | "matchItems" | "followUpQuestions"
>;
type OptimizeResumeResult = Pick<AnalysisResult, "optimizedItems" | "finalResume">;
type InterviewResult = Pick<AnalysisResult, "interviewPrep">;

function buildCoreSummary(parts: DiagnosisMatchResult): string {
  return [
    `匹配度：${parts.diagnosis.overallScore}/100`,
    `主要问题：${parts.diagnosis.mainIssues.slice(0, 3).join("；") || "无"}`,
    `优先建议：${parts.diagnosis.prioritySuggestions.slice(0, 3).join("；") || "无"}`,
    `关键缺口：${parts.matchItems
      .filter((item) => item.needsSupplement)
      .slice(0, 4)
      .map((item) => item.jdRequirement)
      .join("；") || "无"}`,
  ].join("\n");
}

export async function runLLMResumeAnalysis(
  input: UserInput,
  optimizeStyle: OptimizeStyle = "ai-product",
  config?: AIConfig
): Promise<AnalysisResult> {
  return runLLMResumeAnalysisStream(input, optimizeStyle, undefined, config);
}

export type StageName = "jd-analysis" | "diagnosis" | "optimize" | "interview";

export interface StageUpdatePayload {
  stage: StageName;
  status: "start" | "complete";
  data?: Partial<AnalysisResult>;
}

export async function runLLMResumeAnalysisStream(
  input: UserInput,
  optimizeStyle: OptimizeStyle = "ai-product",
  onStageUpdate?: (payload: StageUpdatePayload) => void,
  config?: AIConfig
): Promise<AnalysisResult> {
  onStageUpdate?.({ stage: "jd-analysis", status: "start" });
  const jd = await chatCompletionJSON<JDAnalysisResult>({
    system: RESUME_AGENT_SYSTEM_PROMPT,
    user: buildAnalyzeCorePrompt(input),
    maxTokens: 3000,
    schema: jdAnalysisResponseSchema,
  }, config);
  onStageUpdate?.({
    stage: "jd-analysis",
    status: "complete",
    data: { jdAnalysis: jd.jdAnalysis },
  });

  onStageUpdate?.({ stage: "diagnosis", status: "start" });
  const diagnosisMatch = await chatCompletionJSON<DiagnosisMatchResult>({
    system: RESUME_AGENT_SYSTEM_PROMPT,
    user: buildAnalyzeDiagnosisPrompt(input),
    maxTokens: 4000,
    schema: diagnosisMatchResponseSchema,
  }, config);

  const normalizedFollowUpQuestions = normalizeFollowUpQuestions(diagnosisMatch.followUpQuestions);

  onStageUpdate?.({
    stage: "diagnosis",
    status: "complete",
    data: {
      diagnosis: diagnosisMatch.diagnosis,
      matchItems: diagnosisMatch.matchItems,
      followUpQuestions: normalizedFollowUpQuestions,
    },
  });

  const coreSummary = buildCoreSummary(diagnosisMatch);

  onStageUpdate?.({ stage: "optimize", status: "start" });
  const optimizeResumePromise = chatCompletionJSON<OptimizeResumeResult>({
    system: RESUME_AGENT_SYSTEM_PROMPT,
    user: buildAnalyzeOutputPrompt(input, optimizeStyle, coreSummary),
    maxTokens: 4500,
    schema: optimizeResumeResponseSchema,
  }, config);

  onStageUpdate?.({ stage: "interview", status: "start" });
  const interviewPromise = chatCompletionJSON<InterviewResult>({
    system: RESUME_AGENT_SYSTEM_PROMPT,
    user: buildAnalyzeInterviewPrompt(input, coreSummary),
    maxTokens: 3500,
    schema: interviewResponseSchema,
  }, config);

  const [optimizeResume, interview] = await Promise.all([optimizeResumePromise, interviewPromise]);

  onStageUpdate?.({
    stage: "optimize",
    status: "complete",
    data: {
      optimizedItems: optimizeResume.optimizedItems,
      finalResume: optimizeResume.finalResume,
    },
  });

  onStageUpdate?.({
    stage: "interview",
    status: "complete",
    data: {
      interviewPrep: interview.interviewPrep,
    },
  });

  const raw: AnalysisResult = {
    jdAnalysis: jd.jdAnalysis,
    diagnosis: diagnosisMatch.diagnosis,
    matchItems: diagnosisMatch.matchItems,
    followUpQuestions: normalizedFollowUpQuestions,
    optimizedItems: optimizeResume.optimizedItems,
    finalResume: optimizeResume.finalResume,
    interviewPrep: interview.interviewPrep,
  };

  return normalizeAnalysisResult(raw, input);
}


export async function runLLMRegenerateOptimizedItems(
  input: UserInput,
  style: OptimizeStyle,
  config?: AIConfig
): Promise<{ optimizedItems: AnalysisResult["optimizedItems"] }> {
  const raw = await chatCompletionJSON<{ optimizedItems: AnalysisResult["optimizedItems"] }>({
    system: RESUME_AGENT_SYSTEM_PROMPT,
    user: buildOptimizeUserPrompt(input, style),
    temperature: 0.5,
    maxTokens: 4000,
    schema: optimizedItemsResponseSchema,
  }, config);

  return { optimizedItems: normalizeOptimizedItems(raw.optimizedItems) };
}

export async function runLLMFollowUpBullet(
  input: UserInput,
  question: string,
  purpose: string,
  userAnswer: string,
  config?: AIConfig
): Promise<string> {
  const raw = await chatCompletionJSON<{ bullet: string }>({
    system: RESUME_AGENT_SYSTEM_PROMPT,
    user: buildFollowUpBulletPrompt(input, question, purpose, userAnswer),
    temperature: 0.3,
    maxTokens: 500,
    schema: bulletResponseSchema,
  }, config);

  return raw.bullet?.trim() ?? "";
}

/**
 * Re-generate optimizedItems + finalResume incorporating follow-up bullets.
 */
export async function runLLMReoptimizeWithBullets(
  input: UserInput,
  style: OptimizeStyle,
  bullets: FollowUpBulletEntry[],
  config?: AIConfig
): Promise<Pick<AnalysisResult, "optimizedItems" | "finalResume">> {
  const raw = await chatCompletionJSON<OptimizeResumeResult>({
    system: RESUME_AGENT_SYSTEM_PROMPT,
    user: buildReoptimizeWithBulletsPrompt(input, style, bullets),
    maxTokens: 5000,
    schema: optimizeResumeResponseSchema,
  }, config);

  return {
    optimizedItems: normalizeOptimizedItems(raw.optimizedItems),
    finalResume: raw.finalResume,
  };
}

export async function runLLMExtractTemplate(rawContent: string, config?: AIConfig): Promise<string> {
  const raw = await chatCompletionJSON<{ html: string }>({
    system: RESUME_AGENT_SYSTEM_PROMPT,
    user: buildExtractTemplatePrompt(rawContent),
    temperature: 0.4,
    maxTokens: 4000,
    schema: z.object({ html: z.string() }),
  }, config);

  return raw.html?.trim() ?? "";
}
