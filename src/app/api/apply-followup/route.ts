import { NextResponse } from "next/server";
import { getAIConfig } from "@/lib/ai/config";
import { aiErrorResponse } from "@/lib/ai/error-response";
import { applyFollowUpRequestSchema, parseJSONBody } from "@/lib/ai/request-validation";
import { rateLimitResponse } from "@/lib/rate-limit";
import { reoptimizeWithBulletsServer } from "@/services/ai/resumeAgent.server";

export async function POST(request: Request) {
  try {
    const limited = rateLimitResponse(request, { maxRequests: 10, windowMs: 60_000 });
    if (limited) return limited;
    const body = await parseJSONBody(request, applyFollowUpRequestSchema);
    const { input, style, bullets } = body;

    if (!input?.originalResume?.trim() || !style || !bullets?.length) {
      return NextResponse.json({ error: "缺少必要参数" }, { status: 400 });
    }

    const config = getAIConfig(request);
    const { optimizedItems, finalResume, mode } = await reoptimizeWithBulletsServer(
      input,
      style,
      bullets,
      config,
      AbortSignal.any([request.signal, AbortSignal.timeout(75_000)])
    );
    return NextResponse.json({ optimizedItems, finalResume, mode });
  } catch (error) {
    return aiErrorResponse(error, "应用追问结果失败，请稍后重试");
  }
}
