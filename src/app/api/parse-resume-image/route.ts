import { NextResponse } from "next/server";
import { rateLimitResponse } from "@/lib/rate-limit";
import { readLimitedBody, readLimitedFormData } from "@/lib/limited-body";
import { recognizeImages } from "@/lib/image-parser.server";
import { RequestValidationError } from "@/lib/ai/request-validation";
import { z } from "zod";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    const limited = rateLimitResponse(request, { maxRequests: 8 });
    if (limited) return limited;
    let images: string[];
    if (request.headers.get("content-type")?.includes("application/json")) {
      const raw = await readLimitedBody(request, 21 * 1024 * 1024);
      let body: unknown;
      try { body = JSON.parse(new TextDecoder().decode(raw)); } catch { throw new RequestValidationError("图片请求 JSON 无效"); }
      const result = z.object({ images: z.array(z.string()).min(1).max(4).optional(), image: z.string().optional() }).safeParse(body);
      if (!result.success) throw new RequestValidationError("图片请求格式无效");
      images = result.data.images ?? (result.data.image ? [result.data.image] : []);
    } else {
      const form = await readLimitedFormData(request);
      const files = form.getAll("file");
      if (files.length > 4 || files.some(file => !(file instanceof File))) throw new RequestValidationError("图片文件格式无效");
      images = await Promise.all((files as File[]).map(async file => 'data:' + file.type + ';base64,' + Buffer.from(await file.arrayBuffer()).toString('base64')));
      const image = form.get("image");
      if (typeof image === "string") images.push(image);
    }
    return NextResponse.json(await recognizeImages(images, request));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "图片识别失败" }, { status: error instanceof RequestValidationError ? error.status : 500 });
  }
}
