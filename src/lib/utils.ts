import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { renderTemplateHTML, getPageMarginValues, type TemplateId } from "./resume-templates";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function dataUrlToBlobUrl(dataUrl: string): string {
  if (!dataUrl) return "";
  if (dataUrl.startsWith("blob:")) return dataUrl;
  try {
    const parts = dataUrl.split(",");
    if (parts.length < 2) return dataUrl;
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : "application/pdf";
    const bstr = atob(parts[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    const blob = new Blob([u8arr], { type: mime });
    return URL.createObjectURL(blob);
  } catch (e) {
    console.error("dataUrlToBlobUrl error:", e);
    return dataUrl;
  }
}

export function formatResumeAsText(resume: import("@/types/resume").FinalResume): string {
  if (!resume) return "";
  const p = resume.personalInfo || { name: "求职者", email: "", phone: "", location: "" };
  const lines: string[] = [];

  lines.push(p.name || "");
  lines.push(
    `${p.email || ""} | ${p.phone || ""} | ${p.location || ""}`
  );
  lines.push("");
  lines.push(`求职意向：${resume.jobIntent || ""}`);
  lines.push("");
  lines.push("职业摘要");
  lines.push(resume.summary || "");
  lines.push("");
  lines.push("核心能力");
  (resume.coreSkills || []).forEach((s) => lines.push(`• ${s}`));
  lines.push("");
  lines.push("工作经历");
  (resume.workExperience || []).forEach((w) => {
    lines.push(`${w.company || ""} | ${w.role || ""} | ${w.period || ""}`);
    (w.bullets || []).forEach((b) => lines.push(`  • ${b}`));
    lines.push("");
  });
  lines.push("项目经历");
  (resume.projectExperience || []).forEach((proj) => {
    lines.push(`${proj.name || ""} | ${proj.role || ""} | ${proj.period || ""}`);
    (proj.bullets || []).forEach((b) => lines.push(`  • ${b}`));
    lines.push("");
  });
  lines.push("技能工具");
  lines.push((resume.skillsAndTools || []).join(" · "));
  lines.push("");
  lines.push("教育背景");
  lines.push(`${resume.education?.school || ""} | ${resume.education?.degree || ""} | ${resume.education?.period || ""}`);

  return lines.join("\n");
}

export async function exportResumeAsWord(
  resume: import("@/types/resume").FinalResume,
  _templateId?: TemplateId,
  _customTemplateHTML?: string,
  options?: import("./resume-templates").TemplateOptions
) {
  try {
    const { generateResumeDocx } = await import("@/lib/docx-exporter");
    const blob = await generateResumeDocx(resume, {
      themeColor: options?.themeColor,
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const name = resume?.personalInfo?.name || "个人简历";
    a.download = `${name}_精美简历.docx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error("Failed to export docx:", err);
    alert("导出 Word 失败，请重试");
  }
}

export function exportResumeAsPDF(
  resume: import("@/types/resume").FinalResume,
  templateId: TemplateId = "modern-sidebar",
  customTemplateHTML?: string,
  options?: import("./resume-templates").TemplateOptions
) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  const name = resume?.personalInfo?.name || "个人简历";
  const docTitle = `${name}_个人简历`;
  const htmlContent = renderTemplateHTML(resume, templateId, customTemplateHTML, options);
  const { marginVal } = getPageMarginValues(options?.pageMargin);

  const printStyle = `
    <style>
      @page {
        size: A4 portrait;
        margin: ${marginVal} !important;
      }
      @media print {
        *, *::before, *::after {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        html, body {
          width: 100% !important;
          height: auto !important;
          min-height: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: visible !important;
          background: #ffffff !important;
        }
        .container, .layout-container {
          display: table !important;
          width: 100% !important;
          height: auto !important;
          min-height: 100% !important;
          overflow: visible !important;
        }
        .sidebar {
          display: table-cell !important;
          background-color: #f8fafc !important;
          border-right: 1px solid #e2e8f0 !important;
          height: auto !important;
          overflow: visible !important;
        }
        .main, .main-content {
          display: table-cell !important;
          height: auto !important;
          overflow: visible !important;
        }
        /* 智能防截断核心规则 */
        .sec-title, .main-title, .sidebar-title, .sidebar-sec-title, .main-sec-title,
        .item-head, .item-header, h1, h2, h3, h4, h5, h6 {
          break-after: avoid !important;
          page-break-after: avoid !important;
          break-inside: avoid !important;
          page-break-inside: avoid !important;
        }
        .work-item, .project-item, .tl-item, .card-box, .sidebar-section {
          break-inside: avoid !important;
          page-break-inside: avoid !important;
          -webkit-column-break-inside: avoid !important;
        }
        li, p, .contact-item, .info-item, .skill-pill, .badge, .pill, .tag, .code-tag {
          break-inside: avoid !important;
          page-break-inside: avoid !important;
          orphans: 2 !important;
          widows: 2 !important;
        }
        img, .avatar-wrapper, .terminal-header, .banner {
          break-inside: avoid !important;
          page-break-inside: avoid !important;
        }
        .screen-only, .a4-page-guide, .page-break-guide {
          display: none !important;
        }
        body > *:last-child,
        div:last-child,
        p:last-child,
        .card-box:last-child {
          margin-bottom: 0 !important;
          padding-bottom: 0 !important;
        }
      }
    </style>
  `;

  const printScript = `
    <script>
      document.title = "${docTitle}";
      window.addEventListener('load', function() {
        var imgs = document.getElementsByTagName('img');
        var promises = [];
        for (var i = 0; i < imgs.length; i++) {
          if (!imgs[i].complete) {
            promises.push(new Promise(function(resolve) {
              imgs[i].onload = resolve;
              imgs[i].onerror = resolve;
            }));
          }
        }
        Promise.all(promises).then(function() {
          setTimeout(function() {
            window.print();
          }, 350);
        });
      });
    </script>
  `;

  const contentWithPrint = htmlContent
    .replace("<title>", `<title>${docTitle}</title><style>`)
    .replace("</head>", `${printStyle}</head>`)
    .replace("</body>", `${printScript}</body>`);

  printWindow.document.write(contentWithPrint);
  printWindow.document.title = docTitle;
  printWindow.document.close();
}
