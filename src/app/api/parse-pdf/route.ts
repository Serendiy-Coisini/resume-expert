import { NextResponse } from "next/server";
import mammoth from "mammoth";

// Import core pdf-parse library directly to bypass pdf-parse index.js top-level readFileSync side effects
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse/lib/pdf-parse.js");

/**
 * Smart layout-aware PDF page renderer.
 * Sorts text items naturally by top-to-bottom line hierarchy and left-to-right columns,
 * preventing fragmenting text into isolated single-line chunks.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderPageSmart(pageData: any) {
  return pageData
    .getTextContent({ normalizeWhitespace: true })
    .then((textContent: { items: { str: string; transform: number[]; width?: number }[] }) => {
      const items = textContent.items;
      if (!items || items.length === 0) return "";

      // Sort items primarily by visual Y position (top to bottom), secondarily by X (left to right)
      // Note: PDF Y coordinates start from bottom (0) to top (height)
      items.sort((a, b) => {
        const yDiff = b.transform[5] - a.transform[5];
        if (Math.abs(yDiff) > 6) {
          return yDiff;
        }
        return a.transform[4] - b.transform[4];
      });

      let lastY: number | null = null;
      let lastX: number | null = null;
      let text = "";

      for (const item of items) {
        const str = item.str;
        if (!str) continue;

        const currentY = item.transform[5];
        const currentX = item.transform[4];

        if (lastY === null) {
          text += str;
        } else {
          const yDiff = Math.abs(lastY - currentY);
          if (yDiff > 6) {
            // Significant vertical gap -> new line
            text += "\n" + str;
          } else {
            // Same visual line -> check horizontal gap between elements/columns
            const xGap = currentX - (lastX ?? 0);
            if (xGap > 15) {
              text += "   " + str;
            } else if (xGap > 2) {
              text += " " + str;
            } else {
              text += str;
            }
          }
        }

        lastY = currentY;
        lastX = currentX + (item.width ?? str.length * 6);
      }

      return text;
    });
}

function extractTextFromBinaryDoc(buffer: Buffer): string {
  try {
    const utf16Text = buffer.toString("utf16le");
    const printableUtf16 = utf16Text.match(/[\u4E00-\u9FA5a-zA-Z0-9\s,.!?:;()\-–—"'\/\n\r\t]{4,}/g) || [];
    const joined = printableUtf16.join("\n").replace(/\n{3,}/g, "\n\n").trim();
    if (joined.length > 50) {
      return joined;
    }
  } catch {
    // Fallback
  }

  const latinStr = buffer.toString("binary");
  const printableMatches = latinStr.match(/[\x20-\x7E\u4E00-\u9FA5\u3000-\u303F\uFF00-\uFFEF\r\n\t]{4,}/g) || [];
  return printableMatches.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "未接收到上传的文件" }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();

    // Limit file size to 15MB
    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json({ error: "文件大小超过上限（最大支持 15MB）" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let text = "";

    if (fileName.endsWith(".docx")) {
      try {
        const result = await mammoth.extractRawText({ buffer });
        text = result.value || "";
      } catch (err) {
        console.error("Docx parsing error:", err);
        return NextResponse.json(
          { error: "解析 Word (.docx) 文件失败，请确认文件未损坏或直接粘贴文本" },
          { status: 400 }
        );
      }
    } else if (fileName.endsWith(".doc")) {
      try {
        const result = await mammoth.extractRawText({ buffer });
        text = result.value || "";
      } catch {
        text = extractTextFromBinaryDoc(buffer);
      }
      if (!text.trim()) {
        return NextResponse.json(
          { error: "解析旧版 Word (.doc) 文本失败，建议另存为 .docx 或 PDF 格式后上传" },
          { status: 400 }
        );
      }
    } else if (fileName.endsWith(".txt")) {
      text = buffer.toString("utf-8");
    } else if (fileName.endsWith(".pdf") || file.type === "application/pdf") {
      // Mute all internal PDF.js console.warn / stdout / stderr font warnings during parsing
      const originalWarn = console.warn;
      const originalLog = console.log;
      const originalStdoutWrite = process.stdout.write;
      const originalStderrWrite = process.stderr.write;

      let pdfData;
      try {
        console.warn = () => {};
        console.log = () => {};
        process.stdout.write = (() => true) as unknown as typeof process.stdout.write;
        process.stderr.write = (() => true) as unknown as typeof process.stderr.write;

        pdfData = await pdfParse(buffer, { pagerender: renderPageSmart });
      } finally {
        console.warn = originalWarn;
        console.log = originalLog;
        process.stdout.write = originalStdoutWrite;
        process.stderr.write = originalStderrWrite;
      }

      text = pdfData.text?.trim() || "";

      // Scanned/Vector PDF detection: if text < 20 chars
      const pureTextLength = text.replace(/\s+/g, "").length;
      if (pureTextLength < 20) {
        return NextResponse.json({
          text: "",
          isScannedPdf: true,
          message: "检测到该简历为纯图片扫描版或矢量排版 PDF，将自动启动高精视觉识别 / OCR 提取文本",
        });
      }
    } else {
      // Try mammoth docx auto fallback
      try {
        const result = await mammoth.extractRawText({ buffer });
        if (result.value && result.value.trim().length > 0) {
          text = result.value;
        }
      } catch {
        // ignore
      }
      if (!text) {
        return NextResponse.json(
          { error: "仅支持上传 PDF (.pdf)、Word (.docx/.doc) 或文本 (.txt) 格式文件" },
          { status: 400 }
        );
      }
    }

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: "未能从文件中提取到有效文本，请确认文件是否有文字内容或直接粘贴文本" },
        { status: 400 }
      );
    }

    return NextResponse.json({ text: text.trim() });
  } catch (error) {
    console.error("File parsing error:", error);
    const detail = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `文件解析异常: ${detail}` }, { status: 500 });
  }
}
