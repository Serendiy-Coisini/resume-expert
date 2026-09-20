import { NextResponse } from "next/server";
import { getAIConfig } from "@/lib/ai/config";
import { LLMError } from "@/lib/ai/client";
import { checkRateLimit } from "@/lib/rate-limit";
import { optimizeRequestSchema, parseJSONBody, RequestValidationError } from "@/lib/ai/request-validation";
import { regenerateOptimizedItemsServer } from "@/services/ai/resumeAgent.server";

export async function POST(request: Request) {
  try {
    const rateLimit = checkRateLimit(request, { maxRequests: 15, windowMs: 60_000 });
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: `请求过于频繁，请等待 ${rateLimit.resetInSeconds} 秒后再试` },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.resetInSeconds),
            "X-RateLimit-Limit": String(rateLimit.limit),
            "X-RateLimit-Remaining": String(rateLimit.remaining),
          },
        }
      );
    }

    const body = await parseJSONBody(request, optimizeRequestSchema);
    const { input, style } = body;

    if (!input?.originalResume?.trim() || !style) {
      return NextResponse.json({ error: "缺少必要参数" }, { status: 400 });
    }

    const config = getAIConfig(request);
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(75_000)]);
    const { optimizedItems, finalResume, mode } = await regenerateOptimizedItemsServer(input, style, config, signal);
    return NextResponse.json({ optimizedItems, finalResume, mode });
  } catch (error) {
    if (error instanceof RequestValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof LLMError ? error.message : "优化生成失败，请稍后重试";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
