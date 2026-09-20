import { NextResponse } from "next/server";
import { LLMError } from "@/lib/ai/errors";
import { RequestValidationError } from "@/lib/request-error";

/** Keep actionable HTTP errors distinct from unexpected internal failures. */
export function aiErrorResponse(error: unknown, fallbackMessage: string): Response {
  if (error instanceof RequestValidationError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name)) {
    return NextResponse.json({ error: "请求已取消或超时，请稍后重试" }, { status: 504 });
  }
  if (error instanceof LLMError) {
    const status = error.status && Number.isInteger(error.status) && error.status >= 400 && error.status <= 599
      ? error.status : 502;
    return NextResponse.json({ error: error.message }, { status });
  }
  return NextResponse.json({ error: fallbackMessage }, { status: 500 });
}
