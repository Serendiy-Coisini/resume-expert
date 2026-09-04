import { getAIConfig } from "@/lib/ai/config";
import { LLMError } from "@/lib/ai/client";
import type { AnalyzeRequestBody } from "@/lib/ai/types";
import { runMockResumeAnalysisStream } from "@/services/ai/resumeAgent.mock";
import { runLLMResumeAnalysisStream } from "@/services/ai/resumeAgent.llm";
import type { AnalysisResult } from "@/types/resume";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AnalyzeRequestBody;
    const { input, optimizeStyle = "ai-product" } = body;

    if (!input?.targetRole?.trim() || !input?.jobDescription?.trim() || !input?.originalResume?.trim()) {
      return new Response(
        JSON.stringify({ error: "请填写目标岗位、JD 和原始简历" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const config = getAIConfig(request);
    const mode = config.mode;
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (event: string, data: unknown) => {
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
            finalResult = await runLLMResumeAnalysisStream(input, optimizeStyle, onStageUpdate, config);
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
          controller.close();
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
    const message = error instanceof Error ? error.message : "请求失败";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
