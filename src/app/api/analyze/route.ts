import { NextResponse } from "next/server";
import { getAIConfig } from "@/lib/ai/config";
import { LLMError } from "@/lib/ai/client";
import { checkRateLimit } from "@/lib/rate-limit";
import type { AnalyzeRequestBody } from "@/lib/ai/types";
import { analyzeResumeServer } from "@/services/ai/resumeAgent.server";

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

    const body = (await request.json()) as AnalyzeRequestBody;
    const { input, optimizeStyle = "ai-product" } = body;

    if (!input?.targetRole?.trim() || !input?.jobDescription?.trim() || !input?.originalResume?.trim()) {
      return NextResponse.json({ error: "请填写目标岗位、JD 和原始简历" }, { status: 400 });
    }

    const config = getAIConfig(request);
    const { result, mode } = await analyzeResumeServer(input, optimizeStyle, config);
    return NextResponse.json({ result, mode });
  } catch (error) {
    const message =
      error instanceof LLMError
        ? error.message
        : error instanceof Error
          ? error.message
          : "分析失败，请稍后重试";
    console.error("[analyze]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
