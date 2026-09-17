import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
} from "docx";
import type { FinalResume } from "@/types/resume";

interface DocxExportOptions {
  themeColor?: string;
}

/**
 * Creates a section heading paragraph with styled bottom border and primary accent color.
 */
function createSectionHeader(title: string, colorHex: string): Paragraph {
  // Convert #1e3a8a -> 1E3A8A for docx
  const cleanColor = colorHex.replace("#", "").toUpperCase();
  return new Paragraph({
    spacing: { before: 240, after: 120 },
    border: {
      bottom: {
        color: cleanColor,
        space: 4,
        style: BorderStyle.SINGLE,
        size: 12,
      },
    },
    children: [
      new TextRun({
        text: title,
        bold: true,
        size: 24, // 12pt
        color: cleanColor,
        font: "Microsoft YaHei",
      }),
    ],
  });
}

/**
 * Builds a professional OpenXML native (.docx) Document from a FinalResume object.
 */
export async function generateResumeDocx(
  resume: FinalResume,
  options: DocxExportOptions = {}
): Promise<Blob> {
  const themeColor = (options.themeColor || "#1e3a8a").replace("#", "").toUpperCase();
  const p = resume.personalInfo || { name: "求职者", email: "", phone: "", location: "" };

  const paragraphs: (Paragraph | Table)[] = [];

  // 1. Header Name
  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 100, after: 60 },
      children: [
        new TextRun({
          text: p.name || "个人简历",
          bold: true,
          size: 36, // 18pt
          color: themeColor,
          font: "Microsoft YaHei",
        }),
      ],
    })
  );

  // 2. Job Intent (if present)
  if (resume.jobIntent?.trim()) {
    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 60 },
        children: [
          new TextRun({
            text: `求职意向：${resume.jobIntent.trim()}`,
            bold: true,
            size: 22, // 11pt
            color: "475569",
            font: "Microsoft YaHei",
          }),
        ],
      })
    );
  }

  // 3. Contact Details
  const contactParts = [p.email, p.phone, p.location].filter(Boolean);
  if (contactParts.length > 0) {
    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 180 },
        children: [
          new TextRun({
            text: contactParts.join("  |  "),
            size: 20, // 10pt
            color: "64748B",
            font: "Microsoft YaHei",
          }),
        ],
      })
    );
  }

  // 4. Professional Summary
  if (resume.summary?.trim()) {
    paragraphs.push(createSectionHeader("▌ 职业摘要 PROFILE", themeColor));
    paragraphs.push(
      new Paragraph({
        spacing: { before: 60, after: 120 },
        children: [
          new TextRun({
            text: resume.summary.trim(),
            size: 21, // 10.5pt
            color: "334155",
            font: "Microsoft YaHei",
          }),
        ],
      })
    );
  }

  // 5. Core Skills
  if (resume.coreSkills && resume.coreSkills.length > 0) {
    paragraphs.push(createSectionHeader("▌ 核心能力 CORE COMPETENCIES", themeColor));
    paragraphs.push(
      new Paragraph({
        spacing: { before: 60, after: 120 },
        children: [
          new TextRun({
            text: resume.coreSkills.join("  ·  "),
            size: 21,
            color: "1E293B",
            bold: true,
            font: "Microsoft YaHei",
          }),
        ],
      })
    );
  }

  // 6. Work Experience
  if (resume.workExperience && resume.workExperience.length > 0) {
    paragraphs.push(createSectionHeader("▌ 工作经历 WORK EXPERIENCE", themeColor));

    for (const w of resume.workExperience) {
      // Header row: Company · Role (Left) & Period (Right)
      const workHeaderTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.NONE },
          bottom: { style: BorderStyle.NONE },
          left: { style: BorderStyle.NONE },
          right: { style: BorderStyle.NONE },
          insideHorizontal: { style: BorderStyle.NONE },
          insideVertical: { style: BorderStyle.NONE },
        },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 70, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: `${w.company || ""} · ${w.role || ""}`,
                        bold: true,
                        size: 22,
                        color: "0F172A",
                        font: "Microsoft YaHei",
                      }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 30, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [
                      new TextRun({
                        text: w.period || "",
                        size: 20,
                        color: "64748B",
                        font: "Microsoft YaHei",
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      });
      paragraphs.push(workHeaderTable);

      // Bullets
      if (w.bullets && w.bullets.length > 0) {
        for (const bullet of w.bullets) {
          paragraphs.push(
            new Paragraph({
              bullet: { level: 0 },
              spacing: { before: 40, after: 40 },
              children: [
                new TextRun({
                  text: bullet,
                  size: 21,
                  color: "334155",
                  font: "Microsoft YaHei",
                }),
              ],
            })
          );
        }
      }

      // Spacing between experience items
      paragraphs.push(new Paragraph({ spacing: { before: 60, after: 60 } }));
    }
  }

  // 7. Project Experience
  if (resume.projectExperience && resume.projectExperience.length > 0) {
    paragraphs.push(createSectionHeader("▌ 项目经历 PROJECT EXPERIENCE", themeColor));

    for (const pr of resume.projectExperience) {
      const projHeaderTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.NONE },
          bottom: { style: BorderStyle.NONE },
          left: { style: BorderStyle.NONE },
          right: { style: BorderStyle.NONE },
          insideHorizontal: { style: BorderStyle.NONE },
          insideVertical: { style: BorderStyle.NONE },
        },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 70, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: `${pr.name || ""} · ${pr.role || ""}`,
                        bold: true,
                        size: 22,
                        color: "0F172A",
                        font: "Microsoft YaHei",
                      }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 30, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [
                      new TextRun({
                        text: pr.period || "",
                        size: 20,
                        color: "64748B",
                        font: "Microsoft YaHei",
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      });
      paragraphs.push(projHeaderTable);

      if (pr.bullets && pr.bullets.length > 0) {
        for (const bullet of pr.bullets) {
          paragraphs.push(
            new Paragraph({
              bullet: { level: 0 },
              spacing: { before: 40, after: 40 },
              children: [
                new TextRun({
                  text: bullet,
                  size: 21,
                  color: "334155",
                  font: "Microsoft YaHei",
                }),
              ],
            })
          );
        }
      }

      paragraphs.push(new Paragraph({ spacing: { before: 60, after: 60 } }));
    }
  }

  // 8. Education
  if (resume.education && (resume.education.school || resume.education.degree)) {
    paragraphs.push(createSectionHeader("▌ 教育背景 EDUCATION", themeColor));
    const eduParts = [
      resume.education.school,
      resume.education.degree,
      resume.education.period,
    ].filter(Boolean);

    paragraphs.push(
      new Paragraph({
        spacing: { before: 60, after: 120 },
        children: [
          new TextRun({
            text: eduParts.join("  ·  "),
            size: 21,
            bold: true,
            color: "1E293B",
            font: "Microsoft YaHei",
          }),
        ],
      })
    );
  }

  // 9. Skills and Tools
  if (resume.skillsAndTools && resume.skillsAndTools.length > 0) {
    paragraphs.push(createSectionHeader("▌ 技能软件 & 工具 SKILLS & TOOLS", themeColor));
    paragraphs.push(
      new Paragraph({
        spacing: { before: 60, after: 120 },
        children: [
          new TextRun({
            text: resume.skillsAndTools.join("  ·  "),
            size: 21,
            color: "334155",
            font: "Microsoft YaHei",
          }),
        ],
      })
    );
  }

  // Create document
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720, // 0.5 inch / ~12.7mm
              bottom: 720,
              left: 720,
              right: 720,
            },
          },
        },
        children: paragraphs,
      },
    ],
  });

  return await Packer.toBlob(doc);
}
