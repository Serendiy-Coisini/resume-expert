import { NextResponse } from "next/server";
import { getAIConfig } from "@/lib/ai/config";
import { aiErrorResponse } from "@/lib/ai/error-response";
import { rateLimitResponse } from "@/lib/rate-limit";
import { optimizeRequestSchema, parseJSONBody } from "@/lib/ai/request-validation";
import { regenerateOptimizedItemsServer } from "@/services/ai/resumeAgent.server";

export async function POST(request: Request) {
  try {
    const limited = rateLimitResponse(request, { maxRequests: 15, windowMs: 60_000 });
    if (limited) return limited;

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
    return aiErrorResponse(error, "优化生成失败，请稍后重试");
  }
}
