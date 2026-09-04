import { NextResponse } from "next/server";
import { getAIConfig } from "@/lib/ai/config";
import { LLMError } from "@/lib/ai/client";
import type { ApplyFollowUpRequestBody } from "@/lib/ai/types";
import { reoptimizeWithBulletsServer } from "@/services/ai/resumeAgent.server";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ApplyFollowUpRequestBody;
    const { input, style, bullets } = body;

    if (!input?.originalResume?.trim() || !style || !bullets?.length) {
      return NextResponse.json({ error: "缺少必要参数" }, { status: 400 });
    }

    const config = getAIConfig(request);
    const { optimizedItems, finalResume, mode } = await reoptimizeWithBulletsServer(
      input,
      style,
      bullets,
      config
    );
    return NextResponse.json({ optimizedItems, finalResume, mode });
  } catch (error) {
    const message =
      error instanceof LLMError ? error.message : "应用追问结果失败，请稍后重试";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
