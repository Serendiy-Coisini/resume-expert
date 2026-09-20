import { NextResponse } from "next/server";
import { rateLimitResponse } from "@/lib/rate-limit";
import { readLimitedFormData } from "@/lib/limited-body";
import { parseDocumentJob } from "@/lib/document-parser.server";
import { RequestValidationError } from "@/lib/ai/request-validation";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    const limited = rateLimitResponse(request, { maxRequests: 10 });
    if (limited) return limited;
    const form = await readLimitedFormData(request);
    const file = form.get("file");
    if (!(file instanceof File)) throw new RequestValidationError("未接收到有效文件");
    if (file.size > 15 * 1024 * 1024) throw new RequestValidationError("文件大小超过 15MB", 413);
    const name = file.type === "application/pdf" ? "resume.pdf" : file.name.toLowerCase();
    const text = await parseDocumentJob({ kind: "document", name, buffer: Buffer.from(await file.arrayBuffer()) }, request.signal);
    if (name.endsWith(".pdf") && text.replace(/\s/g, "").length < 20) return NextResponse.json({ text: "", isScannedPdf: true });
    if (!text.trim()) throw new RequestValidationError("未提取到有效文字，请检查文件或直接粘贴文本");
    return NextResponse.json({ text });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "文件解析失败" }, {
      status: error instanceof RequestValidationError ? error.status : 500,
    });
  }
}
