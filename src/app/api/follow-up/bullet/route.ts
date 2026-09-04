import { NextResponse } from "next/server";
import { getAIConfig } from "@/lib/ai/config";
import { LLMError } from "@/lib/ai/client";
import type { FollowUpBulletRequestBody } from "@/lib/ai/types";
import { generateFollowUpBulletServer } from "@/services/ai/resumeAgent.server";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as FollowUpBulletRequestBody;
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
      config
    );
    return NextResponse.json({ bullet, mode });
  } catch (error) {
    const message = error instanceof LLMError ? error.message : "Bullet 生成失败，请稍后重试";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
