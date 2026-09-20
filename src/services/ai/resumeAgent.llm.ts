import { z } from "zod";
import { chatCompletionJSON, LLMError } from "@/lib/ai/client";
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
type OptimizeResumeResult = Pick<AnalysisResult, "optimizedItems" | "finalResume" | "englishResume">;
type InterviewResult = Pick<AnalysisResult, "interviewPrep">;

function shouldRetryStage(error: unknown, signal?: AbortSignal): boolean {
  if (signal?.aborted) return false;
  return !(error instanceof LLMError && (error.status === 401 || error.status === 403 || error.status === 429));
}

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
  config?: AIConfig,
  signal?: AbortSignal
): Promise<AnalysisResult> {
  // Stage 1: JD analysis with one retry; propagate failures.
  onStageUpdate?.({ stage: "jd-analysis", status: "start" });
  let jdData: JDAnalysisResult["jdAnalysis"];
  try {
    const jd = await chatCompletionJSON<JDAnalysisResult>(
      {
        system: RESUME_AGENT_SYSTEM_PROMPT,
        user: buildAnalyzeCorePrompt(input),
        maxTokens: 3000,
        schema: jdAnalysisResponseSchema,
        signal,
      },
      config
    );
    jdData = jd.jdAnalysis;
  } catch (err) {
    if (!shouldRetryStage(err, signal)) throw err;
    console.warn("[runLLMResumeAnalysisStream] Stage 1 (jd-analysis) failed, retrying...", err);
    try {
      const jd = await chatCompletionJSON<JDAnalysisResult>(
        {
          system: RESUME_AGENT_SYSTEM_PROMPT,
          user: buildAnalyzeCorePrompt(input),
          maxTokens: 3000,
          schema: jdAnalysisResponseSchema,
          signal,
        },
        config
      );
      jdData = jd.jdAnalysis;
    } catch (retryErr) {
      console.warn("[runLLMResumeAnalysisStream] JD analysis failed:", retryErr);
      throw retryErr;
    }
  }

  onStageUpdate?.({
    stage: "jd-analysis",
    status: "complete",
    data: { jdAnalysis: jdData },
  });

  // Stage 2: Diagnosis and match with one retry; propagate failures.
  onStageUpdate?.({ stage: "diagnosis", status: "start" });
  let diagnosisMatchData: DiagnosisMatchResult;
  try {
    diagnosisMatchData = await chatCompletionJSON<DiagnosisMatchResult>(
      {
        system: RESUME_AGENT_SYSTEM_PROMPT,
        user: buildAnalyzeDiagnosisPrompt(input),
        maxTokens: 4000,
        schema: diagnosisMatchResponseSchema,
        signal,
      },
      config
    );
  } catch (err) {
    if (!shouldRetryStage(err, signal)) throw err;
    console.warn("[runLLMResumeAnalysisStream] Stage 2 (diagnosis) failed, retrying...", err);
    try {
      diagnosisMatchData = await chatCompletionJSON<DiagnosisMatchResult>(
        {
          system: RESUME_AGENT_SYSTEM_PROMPT,
          user: buildAnalyzeDiagnosisPrompt(input),
          maxTokens: 4000,
          schema: diagnosisMatchResponseSchema,
          signal,
        },
        config
      );
    } catch (retryErr) {
      console.warn("[runLLMResumeAnalysisStream] Diagnosis failed:", retryErr);
      throw retryErr;
    }
  }

  const normalizedFollowUpQuestions = normalizeFollowUpQuestions(diagnosisMatchData.followUpQuestions);

  onStageUpdate?.({
    stage: "diagnosis",
    status: "complete",
    data: {
      diagnosis: diagnosisMatchData.diagnosis,
      matchItems: diagnosisMatchData.matchItems,
      followUpQuestions: normalizedFollowUpQuestions,
    },
  });

  const coreSummary = buildCoreSummary(diagnosisMatchData);

  // Publish each successful parallel stage even if the other stage fails.
  onStageUpdate?.({ stage: "optimize", status: "start" });
  const optimizeTask = (async (): Promise<OptimizeResumeResult> => {
    try {
      return await chatCompletionJSON<OptimizeResumeResult>(
        {
          system: RESUME_AGENT_SYSTEM_PROMPT,
          user: buildAnalyzeOutputPrompt(input, optimizeStyle, coreSummary),
          maxTokens: 4500,
          schema: optimizeResumeResponseSchema,
          signal,
        },
        config
      );
    } catch (err) {
      if (!shouldRetryStage(err, signal)) throw err;
      console.warn("[runLLMResumeAnalysisStream] Stage 3 (optimize) failed, retrying...", err);
      try {
        return await chatCompletionJSON<OptimizeResumeResult>(
          {
            system: RESUME_AGENT_SYSTEM_PROMPT,
            user: buildAnalyzeOutputPrompt(input, optimizeStyle, coreSummary),
            maxTokens: 4500,
            schema: optimizeResumeResponseSchema,
            signal,
          },
          config
        );
      } catch (retryErr) {
        console.warn("[runLLMResumeAnalysisStream] Optimization failed:", retryErr);
        throw retryErr;
      }
    }
  })();

  onStageUpdate?.({ stage: "interview", status: "start" });
  const interviewTask = (async (): Promise<InterviewResult> => {
    try {
      return await chatCompletionJSON<InterviewResult>(
        {
          system: RESUME_AGENT_SYSTEM_PROMPT,
          user: buildAnalyzeInterviewPrompt(input, coreSummary),
          maxTokens: 3500,
          schema: interviewResponseSchema,
          signal,
        },
        config
      );
    } catch (err) {
      if (!shouldRetryStage(err, signal)) throw err;
      console.warn("[runLLMResumeAnalysisStream] Stage 4 (interview) failed, retrying...", err);
      try {
        return await chatCompletionJSON<InterviewResult>(
          {
            system: RESUME_AGENT_SYSTEM_PROMPT,
            user: buildAnalyzeInterviewPrompt(input, coreSummary),
            maxTokens: 3500,
            schema: interviewResponseSchema,
            signal,
          },
          config
        );
      } catch (retryErr) {
        console.warn("[runLLMResumeAnalysisStream] Interview preparation failed:", retryErr);
        throw retryErr;
      }
    }
  })();

  const [optimizeSettled, interviewSettled] = await Promise.allSettled([
    optimizeTask.then((optimizeResume) => {
      onStageUpdate?.({
        stage: "optimize",
        status: "complete",
        data: {
          optimizedItems: optimizeResume.optimizedItems,
          finalResume: optimizeResume.finalResume,
          ...(optimizeResume.englishResume ? { englishResume: optimizeResume.englishResume } : {}),
        },
      });
      return optimizeResume;
    }),
    interviewTask.then((interview) => {
      onStageUpdate?.({
        stage: "interview",
        status: "complete",
        data: {
          interviewPrep: interview.interviewPrep,
        },
      });
      return interview;
    }),
  ]);

  if (optimizeSettled.status === "rejected") throw optimizeSettled.reason;
  if (interviewSettled.status === "rejected") throw interviewSettled.reason;
  const optimizeResume = optimizeSettled.value;
  const interview = interviewSettled.value;

  const raw: AnalysisResult = {
    jdAnalysis: jdData,
    diagnosis: diagnosisMatchData.diagnosis,
    matchItems: diagnosisMatchData.matchItems,
    followUpQuestions: normalizedFollowUpQuestions,
    optimizedItems: optimizeResume.optimizedItems,
    finalResume: optimizeResume.finalResume,
    englishResume: optimizeResume.englishResume,
    interviewPrep: interview.interviewPrep,
  };

  return normalizeAnalysisResult(raw, input);
}

export async function runLLMRegenerateOptimizedItems(
  input: UserInput,
  style: OptimizeStyle,
  config?: AIConfig,
  signal?: AbortSignal
): Promise<{ optimizedItems: AnalysisResult["optimizedItems"] }> {
  try {
    const raw = await chatCompletionJSON<{ optimizedItems: AnalysisResult["optimizedItems"] }>(
      {
        system: RESUME_AGENT_SYSTEM_PROMPT,
        user: buildOptimizeUserPrompt(input, style),
        temperature: 0.5,
        maxTokens: 4000,
        schema: optimizedItemsResponseSchema,
        signal,
      },
      config
    );
    return { optimizedItems: normalizeOptimizedItems(raw.optimizedItems) };
  } catch (err) {
    console.warn("[runLLMRegenerateOptimizedItems] LLM call failed:", err);
    throw err;
  }
}

export async function runLLMFollowUpBullet(
  input: UserInput,
  question: string,
  purpose: string,
  userAnswer: string,
  config?: AIConfig,
  signal?: AbortSignal
): Promise<string> {
  const raw = await chatCompletionJSON<{ bullet: string }>({
    system: RESUME_AGENT_SYSTEM_PROMPT,
    user: buildFollowUpBulletPrompt(input, question, purpose, userAnswer),
    temperature: 0.3,
    maxTokens: 500,
    schema: bulletResponseSchema,
    signal,
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
  config?: AIConfig,
  signal?: AbortSignal
): Promise<Pick<AnalysisResult, "optimizedItems" | "finalResume">> {
  const raw = await chatCompletionJSON<OptimizeResumeResult>({
    system: RESUME_AGENT_SYSTEM_PROMPT,
    user: buildReoptimizeWithBulletsPrompt(input, style, bullets),
    maxTokens: 5000,
    schema: optimizeResumeResponseSchema,
    signal,
  }, config);

  return {
    optimizedItems: normalizeOptimizedItems(raw.optimizedItems),
    finalResume: raw.finalResume,
  };
}

export async function runLLMExtractTemplate(rawContent: string, config?: AIConfig, signal?: AbortSignal): Promise<string> {
  const raw = await chatCompletionJSON<{ html: string }>({
    system: RESUME_AGENT_SYSTEM_PROMPT,
    user: buildExtractTemplatePrompt(rawContent),
    temperature: 0.4,
    maxTokens: 4000,
    schema: z.object({ html: z.string() }),
    signal,
  }, config);

  return raw.html?.trim() ?? "";
}
