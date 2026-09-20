import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const hasServerKey = Boolean(process.env.LLM_API_KEY?.trim());
    return NextResponse.json({
      success: true,
      hasServerConfig: hasServerKey,
    });
  } catch (error) {
    console.error("Get settings error:", error);
    return NextResponse.json({ success: false, error: "Failed to load settings status" }, { status: 500 });
  }
}

export async function DELETE() {
  return NextResponse.json(
    { success: false, error: "请在当前浏览器中重置个人配置" },
    { status: 405, headers: { Allow: "GET" } }
  );
}
