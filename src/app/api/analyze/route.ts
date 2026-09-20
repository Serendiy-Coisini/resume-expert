import { NextResponse } from "next/server";
import { getAIConfig } from "@/lib/ai/config";
import { aiErrorResponse } from "@/lib/ai/error-response";
import { rateLimitResponse } from "@/lib/rate-limit";
import { analyzeRequestSchema, parseJSONBody } from "@/lib/ai/request-validation";
import { analyzeResumeServer } from "@/services/ai/resumeAgent.server";

export async function POST(request: Request) {
  try {
    const limited = rateLimitResponse(request, { maxRequests: 15, windowMs: 60_000 });
    if (limited) return limited;

    const body = await parseJSONBody(request, analyzeRequestSchema);
    const { input, optimizeStyle = "ai-product" } = body;

    if (!input?.targetRole?.trim() || !input?.jobDescription?.trim() || !input?.originalResume?.trim()) {
      return NextResponse.json({ error: "请填写目标岗位、JD 和原始简历" }, { status: 400 });
    }

    const config = getAIConfig(request);
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(90_000)]);
    const { result, mode } = await analyzeResumeServer(input, optimizeStyle, config, signal);
    return NextResponse.json({ result, mode });
  } catch (error) {
    return aiErrorResponse(error, "分析失败，请稍后重试");
  }
}
