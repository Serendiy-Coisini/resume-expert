import { NextResponse } from "next/server";
import mammoth from "mammoth";
import { getAIConfig } from "@/lib/ai/config";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse/lib/pdf-parse.js");

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "未接收到上传的 JD 图片或文件" }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();
    const isImage = file.type.startsWith("image/") || /\.(png|jpe?g|webp|bmp|gif)$/i.test(fileName);

    // Limit file size to 15MB
    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json({ error: "图片文件大小超过上限（最大支持 15MB）" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (isImage) {
      const config = getAIConfig(request);
      const mimeType = file.type || (fileName.endsWith(".png") ? "image/png" : "image/jpeg");
      const base64DataUrl = `data:${mimeType};base64,${buffer.toString("base64")}`;

      if (config.mode === "llm" && config.apiKey) {
        const visionModelToUse = config.visionModel || config.model;
        let lastErrorMsg = "";

        try {
          const response = await fetch(`${config.baseUrl}/chat/completions`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${config.apiKey}`,
            },
            body: JSON.stringify({
              model: visionModelToUse,
              temperature: 0.2,
              max_tokens: 3000,
              messages: [
                {
                  role: "system",
                  content:
                    "你是一个专业的高精度 OCR 岗位描述（JD）识别专家。请从用户提供的招聘岗位截图或图片中，精准识别并提取出完整的岗位 JD 招聘文字内容（包含岗位职责、任职要求、加分项等）。直接输出清晰整理后的纯文本内容，不要包含任何 markdown 代码块标识、说明或问候语。",
                },
                {
                  role: "user",
                  content: [
                    { type: "text", text: "请从以下岗位 JD 截图/图片中识别提取全部招聘文字内容：" },
                    { type: "image_url", image_url: { url: base64DataUrl } },
                  ],
                },
              ],
            }),
          });

          if (response.ok) {
            const data = await response.json();
            const rawContent = data.choices?.[0]?.message?.content ?? "";
            const cleanContent = rawContent
              .replace(/```[a-z]*\n?/gi, "")
              .replace(/```/g, "")
              .trim();

            const isRefusal = /(请提供|未检测到|未能识别|无法识别|没有看到|请上传图片|无法查看|我是语言模型|纯文本模型)/i.test(cleanContent);

            if (cleanContent && !isRefusal) {
              return NextResponse.json({
                text: cleanContent,
                isImage: true,
                fileName: file.name,
                dataUrl: base64DataUrl,
              });
            } else if (isRefusal) {
              lastErrorMsg = `当前配置的 AI 模型 (${visionModelToUse}) 属于纯文本 LLM，无法分析截图中图像；`;
            }
          } else {
            const errDetail = await response.text().catch(() => "");
            lastErrorMsg = `视觉模型接口返回异常 (${response.status}): ${errDetail.slice(0, 150)}`;
          }
        } catch (visionErr) {
          console.error("Vision recognition exception:", visionErr);
          lastErrorMsg = visionErr instanceof Error ? visionErr.message : String(visionErr);
        }

        return NextResponse.json(
          {
            error: lastErrorMsg
              ? `AI 视觉识别受限: ${lastErrorMsg}\n💡 建议：请全选复制截图中的岗位文字直接粘贴，或上传 Word/PDF 文档，或配置支持视觉能力的 API 模型（如 qwen-vl-max / SenseChat-5-Vision / gpt-4o-mini）。`
              : "AI 视觉模型未能从图片中提取出有效文本，请全选复制截图文字并直接粘贴。",
          },
          { status: 400 }
        );
      }

      // Mock Mode Fallback for local dev/testing
      return NextResponse.json({
        text: `【AI 视觉识别提取岗位 JD】\n岗位名称：高级研发工程师 / 核心产品经理\n\n岗位职责：\n1. 负责核心产品与业务模块的前后端研发，推进项目高效交付；\n2. 参与系统架构重构与高并发高可用技术方案设计；\n3. 跨部门协同，与产品、设计团队配合提升用户体验与业务指标。\n\n任职要求：\n1. 本科及以上学历，计算机或相关专业优先；\n2. 具备扎实的基础知识与工程实践经验，熟悉主流技术栈；\n3. 具备优秀的逻辑思维能力、沟通协同能力与抗压突破能力。`,
        isImage: true,
        fileName: file.name,
        dataUrl: base64DataUrl,
      });
    }

    // Document parsing for PDF/Word/TXT
    let text = "";
    if (fileName.endsWith(".docx")) {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value || "";
    } else if (fileName.endsWith(".doc")) {
      const result = await mammoth.extractRawText({ buffer }).catch(() => ({ value: "" }));
      text = result.value || buffer.toString("binary").replace(/[^\x20-\x7E\u4E00-\u9FA5\n]/g, " ").trim();
    } else if (fileName.endsWith(".txt")) {
      text = buffer.toString("utf-8");
    } else if (fileName.endsWith(".pdf") || file.type === "application/pdf") {
      const pdfData = await pdfParse(buffer).catch(() => null);
      text = pdfData?.text?.trim() || "";
    }

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: "未能从上传的 JD 文件中提取到有效文字，请直接粘贴文本" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      text: text.trim(),
      isImage: false,
      fileName: file.name,
    });
  } catch (error) {
    console.error("Parse JD image route error:", error);
    const detail = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `识别 JD 图片/文件异常: ${detail}` }, { status: 500 });
  }
}
