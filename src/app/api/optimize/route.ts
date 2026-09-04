import { NextResponse } from "next/server";
import { getAIConfig } from "@/lib/ai/config";
import { LLMError } from "@/lib/ai/client";
import type { OptimizeRequestBody } from "@/lib/ai/types";
import { regenerateOptimizedItemsServer } from "@/services/ai/resumeAgent.server";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as OptimizeRequestBody;
    const { input, style } = body;

    if (!input?.originalResume?.trim() || !style) {
      return NextResponse.json({ error: "缺少必要参数" }, { status: 400 });
    }

    const config = getAIConfig(request);
    const { optimizedItems, finalResume, mode } = await regenerateOptimizedItemsServer(input, style, config);
    return NextResponse.json({ optimizedItems, finalResume, mode });
  } catch (error) {
    const message = error instanceof LLMError ? error.message : "优化生成失败，请稍后重试";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
