import { NextResponse } from "next/server";
import { getAIConfig } from "@/lib/ai/config";
import { LLMError } from "@/lib/ai/client";
import type { MedicalUserInput } from "@/types/medical";
import { analyzeMedicalServer } from "@/services/ai/medicalAgent.server";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { input: MedicalUserInput; allowDemoMode?: boolean };
    const { input, allowDemoMode } = body;

    if (!input) {
      return NextResponse.json({ error: "请提供医学生保研申请材料" }, { status: 400 });
    }

    const config = getAIConfig(request);
    const { result, mode, warning } = await analyzeMedicalServer(input, config, allowDemoMode);
    return NextResponse.json({ result, mode, warning });
  } catch (error) {
    const message =
      error instanceof LLMError
        ? error.message
        : error instanceof Error
          ? error.message
          : "分析失败，请稍后重试";
    console.error("[medical-analyze]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
