import { NextResponse } from "next/server";
import { getAIConfig } from "@/lib/ai/config";
import { LLMError } from "@/lib/ai/client";
import { followUpBulletRequestSchema, parseJSONBody, RequestValidationError } from "@/lib/ai/request-validation";
import { rateLimitResponse } from "@/lib/rate-limit";
import { generateFollowUpBulletServer } from "@/services/ai/resumeAgent.server";

export async function POST(request: Request) {
  try {
    const limited = rateLimitResponse(request, { maxRequests: 20, windowMs: 60_000 });
    if (limited) return limited;
    const body = await parseJSONBody(request, followUpBulletRequestSchema);
    const { input, question, purpose, userAnswer } = body;

    if (!userAnswer?.trim()) {
      return NextResponse.json({ error: "请先填写回答" }, { status: 400 });
    }

    const config = getAIConfig(request);
    const { bullet, mode } = await generateFollowUpBulletServer(
      input,
      question,
      purpose,
      userAnswer,
      config,
      AbortSignal.any([request.signal, AbortSignal.timeout(45_000)])
    );
    return NextResponse.json({ bullet, mode });
  } catch (error) {
    if (error instanceof RequestValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof LLMError ? error.message : "Bullet 生成失败，请稍后重试";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
