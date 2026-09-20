import { getAIConfig } from "@/lib/ai/config";
import { LLMError } from "@/lib/ai/client";
import { checkRateLimit } from "@/lib/rate-limit";
import { analyzeRequestSchema, parseJSONBody, RequestValidationError } from "@/lib/ai/request-validation";
import { runMockResumeAnalysisStream } from "@/services/ai/resumeAgent.mock";
import { runLLMResumeAnalysisStream } from "@/services/ai/resumeAgent.llm";
import type { AnalysisResult } from "@/types/resume";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const rateLimit = checkRateLimit(request, { maxRequests: 15, windowMs: 60_000 });
    if (!rateLimit.success) {
      return new Response(
        JSON.stringify({ error: `请求过于频繁，请等待 ${rateLimit.resetInSeconds} 秒后再试` }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(rateLimit.resetInSeconds),
            "X-RateLimit-Limit": String(rateLimit.limit),
            "X-RateLimit-Remaining": String(rateLimit.remaining),
          },
        }
      );
    }

    const body = await parseJSONBody(request, analyzeRequestSchema);
    const { input, optimizeStyle = "ai-product" } = body;

    if (!input?.targetRole?.trim() || !input?.jobDescription?.trim() || !input?.originalResume?.trim()) {
      return new Response(
        JSON.stringify({ error: "请填写目标岗位、JD 和原始简历" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const config = getAIConfig(request);
    const mode = config.mode;
    const analysisSignal = AbortSignal.any([request.signal, AbortSignal.timeout(90_000)]);
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        let closed = false;
        const close = () => {
          if (!closed) {
            closed = true;
            controller.close();
          }
        };
        request.signal.addEventListener("abort", close, { once: true });
        const sendEvent = (event: string, data: unknown) => {
          if (closed || request.signal.aborted) return;
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        };

        try {
          const onStageUpdate = (payload: {
            stage: string;
            status: "start" | "complete";
            data?: Partial<AnalysisResult>;
          }) => {
            sendEvent("stage", payload);
          };

          let finalResult: AnalysisResult;

          if (mode === "llm") {
            finalResult = await runLLMResumeAnalysisStream(input, optimizeStyle, onStageUpdate, config, analysisSignal);
          } else {
            finalResult = await runMockResumeAnalysisStream(input, optimizeStyle, onStageUpdate);
          }

          sendEvent("complete", { result: finalResult, mode });
        } catch (error) {
          const message =
            error instanceof LLMError
              ? error.message
              : error instanceof Error
                ? error.message
                : "分析失败，请稍后重试";
          sendEvent("error", { error: message });
        } finally {
          close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    const status = error instanceof RequestValidationError ? error.status : 500;
    const message = error instanceof Error ? error.message : "请求失败";
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }
}
