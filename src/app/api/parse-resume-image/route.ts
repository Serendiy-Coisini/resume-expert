import { NextResponse } from "next/server";
import { safeAIFetch } from "@/lib/ai/safe-fetch";
import path from "path";
import { getAIConfig } from "@/lib/ai/config";
import { createWorker } from "tesseract.js";
import { rateLimitResponse } from "@/lib/rate-limit";

const MAX_IMAGES = 4;
const MAX_TOTAL_IMAGE_BYTES = 15 * 1024 * 1024;
const OCR_ITEM_TIMEOUT_MS = 25_000;
const MAX_IMAGE_PIXELS = 25_000_000;
const MAX_CONCURRENT_OCR = 2;
let activeOCRWorkers = 0;
const ocrWaiters: Array<() => void> = [];

async function acquireOCRSlot(): Promise<() => void> {
  if (activeOCRWorkers >= MAX_CONCURRENT_OCR) {
    await new Promise<void>((resolve) => ocrWaiters.push(resolve));
  }
  activeOCRWorkers++;
  return () => {
    activeOCRWorkers--;
    ocrWaiters.shift()?.();
  };
}

function readImageDimensions(buffer: Buffer): { width: number; height: number } | null {
  if (buffer.length >= 24 && buffer.subarray(1, 4).toString() === "PNG") {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }
  if (buffer.length >= 4 && buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < buffer.length) {
      if (buffer[offset] !== 0xff) { offset++; continue; }
      const marker = buffer[offset + 1];
      const length = buffer.readUInt16BE(offset + 2);
      if (length < 2) break;
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
      }
      offset += 2 + length;
    }
  }
  return null;
}

export const maxDuration = 60;

/**
 * Clean OCR text by fixing common OCR artifacts:
 * - excessive spaces between Chinese characters
 * - weird line breaks inside sentences
 */
function cleanOcrText(raw: string): string {
  let text = raw.replace(/\r\n/g, "\n");
  // Remove space between two Chinese characters
  text = text.replace(/([\u4e00-\u9fa5])\s+([\u4e00-\u9fa5])/g, "$1$2");
  text = text.replace(/([\u4e00-\u9fa5])\s+([\u4e00-\u9fa5])/g, "$1$2");
  // Collapse 3+ newlines to 2
  text = text.replace(/\n{3,}/g, "\n\n");
  return text.trim();
}

/**
 * Recognize image buffer using local Tesseract OCR with chi_sim
 */
async function runLocalOCR(imageBuffers: Buffer[]): Promise<string> {
  const releaseSlot = await acquireOCRSlot();
  let worker: Awaited<ReturnType<typeof createWorker>> | null = null;
  try {
    worker = await createWorker("chi_sim", 1, {
      langPath: path.resolve(process.cwd()),
      cachePath: path.resolve(process.cwd()),
      gzip: false,
    });
    const extractedParts: string[] = [];
    for (const buf of imageBuffers) {
      const result = await Promise.race([
        worker.recognize(buf),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("OCR 识别超时")), OCR_ITEM_TIMEOUT_MS)),
      ]);
      if (result.data?.text) {
        extractedParts.push(result.data.text);
      }
    }
    return cleanOcrText(extractedParts.join("\n\n"));
  } finally {
    await worker?.terminate().catch(() => {});
    releaseSlot();
  }
}

export async function POST(request: Request) {
  try {
    const limited = rateLimitResponse(request, { maxRequests: 8, windowMs: 60_000 });
    if (limited) return limited;
    const declaredLength = Number(request.headers.get("content-length") || 0);
    if (declaredLength > MAX_TOTAL_IMAGE_BYTES * 1.4) {
      return NextResponse.json({ error: "图像请求大小超过上限" }, { status: 413 });
    }
    const contentType = request.headers.get("content-type") || "";
    const images: string[] = [];

    if (contentType.includes("application/json")) {
      const rawBody = await request.text();
      if (new TextEncoder().encode(rawBody).byteLength > MAX_TOTAL_IMAGE_BYTES * 1.4) {
        return NextResponse.json({ error: "图像请求大小超过上限" }, { status: 413 });
      }
      const body = JSON.parse(rawBody) as { images?: unknown; image?: unknown };
      if (Array.isArray(body.images)) {
        images.push(...body.images.filter((img: unknown): img is string => typeof img === "string" && img.length > 0));
      } else if (typeof body.image === "string" && body.image.length > 0) {
        images.push(body.image);
      }
    } else {
      const formData = await request.formData();
      const files = formData.getAll("file") as File[];
      if (files.length > MAX_IMAGES || files.reduce((total, file) => total + file.size, 0) > MAX_TOTAL_IMAGE_BYTES) {
        return NextResponse.json({ error: "图片数量或累计大小超过上限" }, { status: 400 });
      }
      for (const file of files) {
        if (file && file.size > 0 && file.type.startsWith("image/")) {
          const buf = Buffer.from(await file.arrayBuffer());
          const mime = file.type || "image/png";
          images.push(`data:${mime};base64,${buf.toString("base64")}`);
        }
      }
      const rawImage = formData.get("image");
      if (typeof rawImage === "string" && rawImage.length > 0) {
        images.push(rawImage);
      }
    }

    if (images.length === 0) {
      return NextResponse.json({ error: "未接收到有效的简历图像数据" }, { status: 400 });
    }
    if (images.length > MAX_IMAGES) {
      return NextResponse.json({ error: `一次最多识别 ${MAX_IMAGES} 张图片` }, { status: 400 });
    }

    const config = getAIConfig(request);

    // Convert data URLs to buffers for potential OCR fallback
    const imageBuffers: Buffer[] = [];
    for (const imgUrl of images) {
      const match = imgUrl.match(/^data:image\/(?:png|jpe?g|webp|bmp|gif);base64,([A-Za-z0-9+/=]+)$/i);
      if (match) {
        imageBuffers.push(Buffer.from(match[1], "base64"));
      }
    }
    const totalImageBytes = imageBuffers.reduce((total, buffer) => total + buffer.byteLength, 0);
    if (imageBuffers.length !== images.length || totalImageBytes > MAX_TOTAL_IMAGE_BYTES) {
      return NextResponse.json({ error: "图片格式无效或累计大小超过 15MB" }, { status: 400 });
    }
    if (imageBuffers.some((buffer) => {
      const dimensions = readImageDimensions(buffer);
      return dimensions && dimensions.width * dimensions.height > MAX_IMAGE_PIXELS;
    })) {
      return NextResponse.json({ error: "图片像素过大，单张最多支持 2500 万像素" }, { status: 400 });
    }

    // 1. Try AI Vision if configured and model might support vision
    const isExplicitTextOnlyModel = /deepseek-chat|deepseek-coder|text-|babbage|davinci/i.test(
      config.visionModel || config.model
    );

    if (request.headers.get("x-pii-mask") === "off" && config.mode === "llm" && config.apiKey && !isExplicitTextOnlyModel) {
      const visionModelToUse = config.visionModel || config.model;
      try {
        const userContent: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
          {
            type: "text",
            text: "你是一个专业的高精度简历 OCR 提取专家。请从用户提供的简历图片中，完整、精准地提取出求职者的全部文字内容，包括但不限于：姓名、求职意向、联系方式（电话、邮箱、城市）、教育背景、职业摘要/个人总结、核心技能、工作经历（公司、职位、时间、具体工作内容及业绩数据）、项目经历、荣誉证书等。\n\n请注意：保留原始排版层次，不要遗漏任何工作细节和量化指标。直接输出清晰整理后的纯文本内容，不要包含任何 markdown 代码块标识、说明或问候语。",
          },
        ];

        for (const imgUrl of images) {
          userContent.push({
            type: "image_url",
            image_url: { url: imgUrl },
          });
        }

        const response = await safeAIFetch(`${config.baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${config.apiKey}`,
          },
          body: JSON.stringify({
            model: visionModelToUse,
            temperature: 0.2,
            max_tokens: 4000,
            messages: [
              {
                role: "system",
                content:
                  "你是一个专业的高精度简历 OCR 提取工具。请逐字逐句完整提取简历图片中的所有文字，保持段落结构。只输出提取出的简历文本本身，不要附加任何前后缀、问候或分析。",
              },
              {
                role: "user",
                content: userContent,
              },
            ],
          }),
          signal: AbortSignal.any([request.signal, AbortSignal.timeout(45_000)]),
        });

        if (response.ok) {
          const data = await response.json();
          const rawContent = data.choices?.[0]?.message?.content ?? "";
          const cleanContent = rawContent
            .replace(/```[a-z]*\n?/gi, "")
            .replace(/```/g, "")
            .trim();

          const isRefusal =
            /(请提供|未检测到|未能识别|无法识别|没有看到|请上传图片|无法查看|我是语言模型|纯文本模型|text-only|cannot view image)/i.test(
              cleanContent
            );

          if (cleanContent.length > 30 && !isRefusal) {
            return NextResponse.json({
              text: cleanContent,
              method: "ai-vision",
              pageCount: images.length,
            });
          }
        }
      } catch (visionErr) {
        console.warn("[parse-resume-image] AI Vision recognition error, falling back to local OCR:", visionErr);
      }
    }

    // 2. Fallback to high-performance local Tesseract OCR
    if (imageBuffers.length > 0) {
      try {
        const ocrText = await runLocalOCR(imageBuffers);
        if (ocrText.length > 15) {
          return NextResponse.json({
            text: ocrText,
            method: "ocr",
            pageCount: imageBuffers.length,
          });
        }
      } catch (ocrErr) {
        console.error("[parse-resume-image] Local OCR error:", ocrErr);
      }
    }

    return NextResponse.json(
      {
        error: "未能从简历图片中提取到有效文本，请确认图片清晰无遮挡，或直接复制粘贴文本",
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("[parse-resume-image] Unexpected route error:", error);
    const detail = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `简历图片识别服务异常: ${detail}` }, { status: 500 });
  }
}
