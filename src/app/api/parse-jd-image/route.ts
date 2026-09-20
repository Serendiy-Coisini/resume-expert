import { NextResponse } from "next/server";
import { rateLimitResponse } from "@/lib/rate-limit";
import { readLimitedFormData } from "@/lib/limited-body";
import { recognizeImages } from "@/lib/image-parser.server";
import { parseDocumentJob } from "@/lib/document-parser.server";
import { RequestValidationError } from "@/lib/ai/request-validation";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    const limited = rateLimitResponse(request, { maxRequests: 8 });
    if (limited) return limited;
    const form = await readLimitedFormData(request);
    const file = form.get("file");
    if (!(file instanceof File)) throw new RequestValidationError("未接收到有效文件");
    if (file.size > 15 * 1024 * 1024) throw new RequestValidationError("文件大小超过 15MB", 413);
    const buffer = Buffer.from(await file.arrayBuffer());
    const name = file.name.toLowerCase();
    if (file.type.startsWith("image/") || /\.(png|jpe?g|webp|bmp|gif)$/.test(name)) {
      const ext = name.split('.').pop();
      const mime = file.type.startsWith('image/') ? file.type : 'image/' + (ext === 'jpg' ? 'jpeg' : ext);
      const result = await recognizeImages(['data:' + mime + ';base64,' + buffer.toString('base64')], request);
      return NextResponse.json({ ...result, isImage: false, fileName: file.name });
    }
    const text = await parseDocumentJob({ kind: "document", name: file.type === "application/pdf" ? "jd.pdf" : name, buffer }, request.signal);
    if (!text.trim()) throw new RequestValidationError("未提取到有效 JD 文字，请粘贴文本");
    return NextResponse.json({ text, isImage: false, fileName: file.name });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "JD 识别失败" }, { status: error instanceof RequestValidationError ? error.status : 500 });
  }
}
