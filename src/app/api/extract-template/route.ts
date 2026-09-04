import { NextResponse } from "next/server";
import { getAIConfig } from "@/lib/ai/config";
import { LLMError } from "@/lib/ai/client";
import { extractTemplateServer } from "@/services/ai/resumeAgent.server";

export async function POST(request: Request) {
  try {
    const { content } = (await request.json()) as { content?: string };

    if (!content?.trim()) {
      return NextResponse.json({ error: "缺少必要参考内容" }, { status: 400 });
    }

    const config = getAIConfig(request);
    const { html, mode } = await extractTemplateServer(content, config);
    return NextResponse.json({ html, mode });
  } catch (error) {
    const message =
      error instanceof LLMError ? error.message : "识别并生成简历模板失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
