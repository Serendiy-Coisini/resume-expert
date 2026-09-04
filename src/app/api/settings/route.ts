import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

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
  try {
    const envPath = path.join(process.cwd(), ".env.local");

    try {
      let content = await fs.readFile(envPath, "utf-8");
      const keysToRemove = [
        "LLM_API_KEY",
        "LLM_BASE_URL",
        "LLM_MODEL",
        "LLM_PROVIDER",
        "LLM_PROVIDER_ID"
      ];

      for (const key of keysToRemove) {
        const regex = new RegExp(`^${key}=.*$\\n?`, "m");
        content = content.replace(regex, "");
      }

      await fs.writeFile(envPath, content.trim() + "\n", "utf-8");
    } catch {
      // file doesn't exist
    }

    delete process.env.LLM_API_KEY;
    delete process.env.LLM_BASE_URL;
    delete process.env.LLM_MODEL;
    delete process.env.LLM_PROVIDER;
    delete process.env.LLM_PROVIDER_ID;

    return NextResponse.json({
      success: true,
      message: "AI 配置已成功重置",
    });
  } catch (error) {
    console.error("Reset settings error:", error);
    return NextResponse.json({ success: false, error: "重置失败" }, { status: 500 });
  }
}
