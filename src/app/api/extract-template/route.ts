import { NextResponse } from "next/server";
import { getAIConfig } from "@/lib/ai/config";
import { aiErrorResponse } from "@/lib/ai/error-response";
import { extractTemplateServer } from "@/services/ai/resumeAgent.server";
import { extractTemplateRequestSchema, parseJSONBody } from "@/lib/ai/request-validation";
import { rateLimitResponse } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const limited = rateLimitResponse(request, { maxRequests: 8, windowMs: 60_000 });
    if (limited) return limited;
    const { content } = await parseJSONBody(request, extractTemplateRequestSchema);

    if (!content?.trim()) {
      return NextResponse.json({ error: "缺少必要参考内容" }, { status: 400 });
    }

    const config = getAIConfig(request);
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(60_000)]);
    const { html, mode } = await extractTemplateServer(content, config, signal);
    return NextResponse.json({ html, mode });
  } catch (error) {
    return aiErrorResponse(error, "识别并生成简历模板失败");
  }
}
