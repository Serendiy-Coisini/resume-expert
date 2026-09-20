import { NextRequest, NextResponse } from "next/server";
import { safeAIFetch } from "@/lib/ai/safe-fetch";
import { parseJSONBody, RequestValidationError, settingsTestRequestSchema } from "@/lib/ai/request-validation";
import { rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const limited = rateLimitResponse(req, { maxRequests: 8, windowMs: 60_000 });
    if (limited) return limited;
    const { apiKey, baseUrl, model } = await parseJSONBody(req, settingsTestRequestSchema, 32 * 1024);

    if (!apiKey?.trim()) {
      return NextResponse.json({ success: false, error: "API Key 不能为空" });
    }

    const url = `${(baseUrl || "https://api.openai.com/v1").replace(/\/$/, "")}/chat/completions`;

    const response = await safeAIFetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify({
        model: model || "gpt-4o-mini",
        messages: [{ role: "user", content: "你好" }],
        max_tokens: 15,
      }),
      signal: AbortSignal.any([req.signal, AbortSignal.timeout(20_000)]),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      let errMsg = `HTTP ${response.status}`;
      try {
        const errData = JSON.parse(errText);
        errMsg = errData?.error?.message || errMsg;
      } catch {
        if (errText) errMsg = errText.slice(0, 200);
      }
      if (response.status === 429 || errText.includes("quota") || errText.includes("insufficient_quota")) {
        errMsg = "API Key 额度已用尽 (HTTP 429 Insufficient Quota)，请检查账户余额或使用其他 Key。";
      } else if (response.status === 401 || errText.includes("invalid_api_key")) {
        errMsg = "API Key 无效或未授权 (HTTP 401 Unauthorized)，请检查 Key 是否填写正确。";
      }
      return NextResponse.json({ success: false, error: `连接失败: ${errMsg}` });
    }

    const data = await response.json();
    const reply = (data as Record<string, Array<Record<string, Record<string, string>>>>)?.choices?.[0]?.message?.content || "";

    return NextResponse.json({
      success: true,
      message: `AI 响应正常！回复内容: "${reply.trim()}"`,
    });
  } catch (error) {
    if (error instanceof RequestValidationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    const errMsg = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ success: false, error: `连接失败: ${errMsg}` });
  }
}
