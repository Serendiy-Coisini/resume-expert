import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json({
    success: true,
    message: "配置已在客户端本地生效",
  });
}
