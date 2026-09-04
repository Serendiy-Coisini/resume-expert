import type { FinalResume } from "@/types/resume";

export type TemplateId =
  | "modern-sidebar"
  | "timeline-tech"
  | "corporate-banner"
  | "grid-cards"
  | "classic-minimal"
  | "github-tech"
  | "minimal"
  | "custom";

export interface TemplateConfig {
  id: TemplateId;
  name: string;
  description: string;
  tag: string;
  color: string;
}

export interface TemplateOptions {
  themeColor?: string;
  avatarShape?: "rectangle" | "circle";
}

export const DEFAULT_TEMPLATE_OPTIONS: TemplateOptions = {
  themeColor: "#1e3a8a",
  avatarShape: "rectangle",
};

export const TEMPLATES: TemplateConfig[] = [
  {
    id: "minimal",
    name: "简约清新风格",
    description: "薄荷绿主题调，极大留白，布局清新优雅，适合设计师与产品/运营岗位",
    tag: "清新优雅",
    color: "#059669",
  },
  {
    id: "modern-sidebar",
    name: "现代双栏卡片",
    description: "左侧深色侧边栏展示个人信息/技能/照片，右侧主区域展示履历",
    tag: "双栏高颜值",
    color: "#0f172a",
  },
  {
    id: "timeline-tech",
    name: "时间轴极客",
    description: "带有贯穿工作/项目经历的视觉时间轴点与线条，突出履历脉络",
    tag: "时间轴风格",
    color: "#2563eb",
  },
  {
    id: "corporate-banner",
    name: "商务 Header",
    description: "深色顶部 Banner + 白色内容卡片，商务大气沉稳范",
    tag: "商务名企",
    color: "#1e1b4b",
  },
  {
    id: "grid-cards",
    name: "微阴影卡片流",
    description: "现代卡片切块分割，内容区块感极强",
    tag: "卡片切块",
    color: "#059669",
  },
  {
    id: "classic-minimal",
    name: "经典极简单栏",
    description: "HR极力推荐的清爽单栏样式，信息密度适中，适合大厂社招",
    tag: "大厂推荐",
    color: "#1e3a8a",
  },
  {
    id: "github-tech",
    name: "Github 极客代码",
    description: "专为工程师与 AI 产品经理设计，深色标头、终端提示符与现代技术标签",
    tag: "极客程序员",
    color: "#0f172a",
  },
];

/**
 * Replaces placeholders in custom HTML templates.
 * Supports both English placeholders {{name}} and Chinese placeholders {{姓名}}.
 */
export function compileCustomTemplate(
  htmlTemplate: string,
  rawResume: FinalResume,
  options: TemplateOptions = DEFAULT_TEMPLATE_OPTIONS
): string {
  const resume = {
    personalInfo: {
      name: rawResume?.personalInfo?.name || "求职者",
      email: rawResume?.personalInfo?.email || "",
      phone: rawResume?.personalInfo?.phone || "",
      location: rawResume?.personalInfo?.location || "",
      avatarUrl: rawResume?.personalInfo?.avatarUrl || "",
    },
    jobIntent: rawResume?.jobIntent || "",
    summary: rawResume?.summary || "",
    coreSkills: rawResume?.coreSkills || [],
    workExperience: rawResume?.workExperience || [],
    projectExperience: rawResume?.projectExperience || [],
    skillsAndTools: rawResume?.skillsAndTools || [],
    education: rawResume?.education || { school: "", degree: "", period: "" },
  };

  const p = resume.personalInfo;
  const avatarUrl = p.avatarUrl || "";

  const isCircle = options.avatarShape === "circle";
  const avatarStyle = isCircle
    ? "width: 85px; height: 85px; object-fit: cover; border-radius: 50%; border: 2px solid #cbd5e1; display: block; margin: 0 auto 10px auto; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"
    : "width: 95px; height: 120px; object-fit: cover; border-radius: 4px; border: 1px solid #cbd5e1; display: block; margin: 0 auto 10px auto; box-shadow: 0 2px 4px rgba(0,0,0,0.1);";

  const avatarHTML = avatarUrl
    ? `<img src="${avatarUrl}" style="${avatarStyle}" alt="${p.name || '照片'}" />`
    : "";

  const workExpHTML = (resume.workExperience || [])
    .map(
      (w) => `
      <div style="margin-bottom: 14px;">
        <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 13.5px; color: #1e293b;">
          <span>${w.company || ""} · ${w.role || ""}</span>
          <span style="color: #64748b; font-weight: normal; font-size: 12px;">${w.period || ""}</span>
        </div>
        <ul style="margin: 6px 0 10px 0; padding-left: 18px; color: #334155; font-size: 13px;">
          ${(w.bullets || []).map((b) => `<li style="margin-bottom: 4px; line-height: 1.6;">${b}</li>`).join("")}
        </ul>
      </div>
    `
    )
    .join("");

  const projExpHTML = (resume.projectExperience || [])
    .map(
      (proj) => `
      <div style="margin-bottom: 14px;">
        <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 13.5px; color: #1e293b;">
          <span>${proj.name || ""} · ${proj.role || ""}</span>
          <span style="color: #64748b; font-weight: normal; font-size: 12px;">${proj.period || ""}</span>
        </div>
        <ul style="margin: 6px 0 10px 0; padding-left: 18px; color: #334155; font-size: 13px;">
          ${(proj.bullets || []).map((b) => `<li style="margin-bottom: 4px; line-height: 1.6;">${b}</li>`).join("")}
        </ul>
      </div>
    `
    )
    .join("");

  const coreSkillsHTML = (resume.coreSkills || [])
    .map(
      (s) =>
        `<span style="display: inline-block; background: #eff6ff; color: #1d4ed8; padding: 3px 10px; border-radius: 4px; font-size: 12px; margin: 3px 6px 3px 0;">${s}</span>`
    )
    .join(" ");

  let tpl = (htmlTemplate || "")
    .replace(/```html\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  // Fallback: If template doesn't contain HTML tags, wrap it properly into readable HTML layout
  if (!tpl || (!tpl.includes("<html") && !tpl.includes("<div") && !tpl.includes("<body") && !tpl.includes("<p"))) {
    tpl = DEFAULT_CUSTOM_TEMPLATE_HTML;
  }

  const eduStr = `${resume.education?.school || ""} · ${resume.education?.degree || ""} (${resume.education?.period || ""})`;
  const skillStr = (resume.skillsAndTools || []).join(" · ");

  const replacements: Record<string, string> = {
    // Avatar / Photo
    "{{avatar}}": avatarHTML,
    "{{AVATAR}}": avatarHTML,
    "{{证件照}}": avatarHTML,
    "{{头像}}": avatarHTML,
    "{{照片}}": avatarHTML,
    "{{个人照片}}": avatarHTML,
    "{{头像URL}}": avatarUrl,

    // Personal Info
    "{{name}}": p.name || "",
    "{{NAME}}": p.name || "",
    "{{姓名}}": p.name || "",
    "{{email}}": p.email || "",
    "{{EMAIL}}": p.email || "",
    "{{邮箱}}": p.email || "",
    "{{phone}}": p.phone || "",
    "{{PHONE}}": p.phone || "",
    "{{电话}}": p.phone || "",
    "{{手机}}": p.phone || "",
    "{{location}}": p.location || "",
    "{{LOCATION}}": p.location || "",
    "{{城市}}": p.location || "",
    "{{地址}}": p.location || "",
    "{{jobIntent}}": resume.jobIntent || "",
    "{{JOB_INTENT}}": resume.jobIntent || "",
    "{{求职意向}}": resume.jobIntent || "",
    "{{意向}}": resume.jobIntent || "",
    "{{summary}}": resume.summary || "",
    "{{SUMMARY}}": resume.summary || "",
    "{{职业摘要}}": resume.summary || "",
    "{{自我评价}}": resume.summary || "",
    "{{个人简介}}": resume.summary || "",

    // Experience & Skills
    "{{coreSkills}}": coreSkillsHTML,
    "{{CORE_SKILLS}}": coreSkillsHTML,
    "{{核心能力}}": coreSkillsHTML,
    "{{workExperience}}": workExpHTML,
    "{{WORK_EXPERIENCE}}": workExpHTML,
    "{{工作经历}}": workExpHTML,
    "{{工作/校园经历}}": workExpHTML,
    "{{工作与校园经历}}": workExpHTML,
    "{{校园与工作经历}}": workExpHTML,
    "{{校园经历}}": workExpHTML,
    "{{projectExperience}}": projExpHTML,
    "{{PROJECT_EXPERIENCE}}": projExpHTML,
    "{{项目经历}}": projExpHTML,
    "{{skillsAndTools}}": skillStr,
    "{{SKILLS_AND_TOOLS}}": skillStr,
    "{{技能工具}}": skillStr,
    "{{所获荣誉与技能}}": skillStr,
    "{{所获荣誉及证书}}": skillStr,
    "{{所获荣誉}}": skillStr,

    // Education
    "{{school}}": resume.education?.school || "",
    "{{SCHOOL}}": resume.education?.school || "",
    "{{学校}}": resume.education?.school || "",
    "{{院校}}": resume.education?.school || "",
    "{{degree}}": resume.education?.degree || "",
    "{{DEGREE}}": resume.education?.degree || "",
    "{{学历}}": resume.education?.degree || "",
    "{{eduPeriod}}": resume.education?.period || "",
    "{{教育时间}}": resume.education?.period || "",
    "{{education}}": eduStr,
    "{{EDUCATION}}": eduStr,
    "{{教育背景}}": eduStr,
  };

  let compiled = tpl;
  Object.entries(replacements).forEach(([key, val]) => {
    compiled = compiled.replaceAll(key, val);
  });

  // Clean unreplaced birth placeholders
  compiled = compiled
    .replace(/<[^>]*>🎂\s*出生年月：\s*\{\{出生年月\}\}<\/[^>]*>/gi, "")
    .replace(/🎂\s*出生年月：\s*\{\{出生年月\}\}/gi, "")
    .replace(/\{\{出生年月\}\}/gi, "")
    .replace(/\{\{出生日期\}\}/gi, "");

  return compiled;
}

export function isEnglishResume(resume: Partial<FinalResume>): boolean {
  const text = `${resume?.summary || ""} ${resume?.jobIntent || ""} ${(resume?.coreSkills || []).join(" ")}`;
  if (!text.trim()) return false;
  const chineseChars = text.match(/[\u4e00-\u9fa5]/g) || [];
  return chineseChars.length < text.length * 0.15;
}

export function localizeTemplateSectionTitles(html: string): string {
  return html
    .replace(/职业摘要/g, "SUMMARY")
    .replace(/核心能力矩阵/g, "CORE SKILLS & COMPETENCIES")
    .replace(/核心能力与所获荣誉/g, "CORE SKILLS & HONORS")
    .replace(/核心能力/g, "CORE COMPETENCIES")
    .replace(/核心技能栈/g, "CORE SKILLS")
    .replace(/核心技能/g, "CORE SKILLS")
    .replace(/工作与校园经历/g, "WORK & CAMPUS EXPERIENCE")
    .replace(/工作经历/g, "WORK EXPERIENCE")
    .replace(/项目经历/g, "PROJECT EXPERIENCE")
    .replace(/技能工具/g, "SKILLS & TOOLS")
    .replace(/教育背景/g, "EDUCATION")
    .replace(/基本信息/g, "PERSONAL DETAILS")
    .replace(/自我评价/g, "SUMMARY");
}

/**
 * Renders HTML string for preview and PDF/Word export for chosen template ID.
 */
export function renderTemplateHTML(
  rawResume: FinalResume,
  templateId: TemplateId,
  customTemplateHTML?: string,
  options: TemplateOptions = DEFAULT_TEMPLATE_OPTIONS
): string {
  const html = renderTemplateHTMLInternal(rawResume, templateId, customTemplateHTML, options);
  return isEnglishResume(rawResume) ? localizeTemplateSectionTitles(html) : html;
}

function renderTemplateHTMLInternal(
  rawResume: FinalResume,
  templateId: TemplateId,
  customTemplateHTML?: string,
  options: TemplateOptions = DEFAULT_TEMPLATE_OPTIONS
): string {
  const resume = {
    personalInfo: {
      name: rawResume?.personalInfo?.name || "求职者",
      email: rawResume?.personalInfo?.email || "",
      phone: rawResume?.personalInfo?.phone || "",
      location: rawResume?.personalInfo?.location || "",
      avatarUrl: rawResume?.personalInfo?.avatarUrl || "",
    },
    jobIntent: rawResume?.jobIntent || "",
    summary: rawResume?.summary || "",
    coreSkills: rawResume?.coreSkills || [],
    workExperience: rawResume?.workExperience || [],
    projectExperience: rawResume?.projectExperience || [],
    skillsAndTools: rawResume?.skillsAndTools || [],
    education: rawResume?.education || { school: "", degree: "", period: "" },
  };

  const p = resume.personalInfo;
  const avatarUrl = p.avatarUrl || "";

  const themeVal = options.themeColor || "#1e3a8a";
  const fontVal = "13.5px";

  const lhVal = "1.56";
  const secMT = "18px";
  const secMB = "8px";
  const itemMB = "12px";
  const ulMB = "8px";
  const liMB = "4px";
  const marginVal = "4mm";

  const isCircle = options.avatarShape === "circle";
  const avatarStyle = isCircle
    ? "width:80px; height:80px; object-fit:cover; border-radius:50%; border:2px solid #fff; box-shadow:0 2px 4px rgba(0,0,0,0.1);"
    : "width:90px; height:115px; object-fit:cover; border-radius:4px; border:1px solid #cbd5e1; box-shadow:0 2px 4px rgba(0,0,0,0.1);";

  const avatarTag = avatarUrl
    ? `<img src="${avatarUrl}" style="${avatarStyle}" alt="${p.name}" />`
    : "";

  // Custom Uploaded Template
  if (templateId === "custom" && customTemplateHTML) {
    return compileCustomTemplate(customTemplateHTML, resume, options);
  }

  // 0. Minimal Fresh Green Template (简约清新风格)
  if (templateId === "minimal") {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${p.name} - 个人简历</title>
        <style>
          @page { size: A4; margin: ${marginVal}; }
          * { box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif; font-size: ${fontVal}; line-height: ${lhVal}; color: #374151; margin: 0; padding: 6px 16px; background: #fff; word-break: break-word; overflow-wrap: break-word; }
          .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #059669; padding-bottom: 8px; margin-bottom: 14px; }
          .name { font-size: 24px; font-weight: 700; color: #065f46; letter-spacing: 0.5px; }
          .intent { font-size: 13px; font-weight: 600; color: #059669; margin-top: 2px; }
          .contact { font-size: 12px; color: #4b5563; text-align: right; }
          .sec-title { font-size: 15px; font-weight: 700; color: #065f46; border-left: 3px solid #059669; padding-left: 10px; margin-top: ${secMT}; margin-bottom: ${secMB}; text-transform: uppercase; letter-spacing: 0.5px; }
          .item-head { display: flex; justify-content: space-between; font-weight: 700; font-size: 13px; color: #111827; margin-top: 6px; }
          .work-item, .project-item { margin-bottom: ${itemMB}; page-break-inside: avoid; break-inside: avoid; }
          ul { margin: 3px 0 ${ulMB} 0; padding-left: 18px; }
          li { margin-bottom: ${liMB}; color: #374151; line-height: ${lhVal}; }
          p { margin: 3px 0; line-height: ${lhVal}; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="name">${p.name}</div>
            <div class="intent">求职意向：${resume.jobIntent}</div>
          </div>
          <div class="contact">
            ${avatarTag ? `<div style="margin-bottom:4px;">${avatarTag}</div>` : ""}
            <div>${p.email} &nbsp;|&nbsp; ${p.phone} &nbsp;|&nbsp; ${p.location}</div>
          </div>
        </div>

        <div class="sec-title">▌ 个人优势 & 核心能力 PROFILE</div>
        <p>${resume.summary}</p>

        <div class="sec-title">▌ 工作经历 WORK EXPERIENCE</div>
        ${resume.workExperience
          .map(
            (w) => `
          <div class="work-item">
            <div class="item-head"><span>${w.company} · ${w.role}</span><span>${w.period}</span></div>
            <ul>${w.bullets.map((b) => `<li>${b}</li>`).join("")}</ul>
          </div>
        `
          )
          .join("")}

        <div class="sec-title">▌ 项目经验 PROJECT EXPERIENCE</div>
        ${resume.projectExperience
          .map(
            (pr) => `
          <div class="project-item">
            <div class="item-head"><span>${pr.name} · ${pr.role}</span><span>${pr.period}</span></div>
            <ul>${pr.bullets.map((b) => `<li>${b}</li>`).join("")}</ul>
          </div>
        `
          )
          .join("")}

        <div class="sec-title">▌ 教育背景 EDUCATION</div>
        <p>${resume.education.school} · ${resume.education.degree} · ${resume.education.period}</p>

        <div class="sec-title">▌ 技能软件 & 工具 SKILLS & TOOLS</div>
        <p>${resume.skillsAndTools.join(" · ")}</p>
      </body>
      </html>
    `;
  }

  // 1. Classic Minimal Single Column Template
  if (templateId === "classic-minimal") {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${p.name} - 个人简历</title>
        <style>
          @page { size: A4; margin: ${marginVal}; }
          * { box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif; font-size: ${fontVal}; line-height: ${lhVal}; color: #1e293b; margin: 0; padding: 6px 12px; background: #fff; word-break: break-word; overflow-wrap: break-word; }
          .header { text-align: center; border-bottom: 2px solid ${themeVal}; padding-bottom: 8px; margin-bottom: 12px; }
          .name { font-size: 22px; font-weight: 700; color: ${themeVal}; margin-bottom: 4px; letter-spacing: 0.5px; }
          .intent { font-size: 12.5px; font-weight: 600; color: #475569; margin-bottom: 4px; }
          .contact { font-size: 12px; color: #64748b; }
          .sec-title { font-size: 13.5px; font-weight: 700; color: ${themeVal}; border-bottom: 1px solid #cbd5e1; padding-bottom: 3px; margin-top: ${secMT}; margin-bottom: ${secMB}; text-transform: uppercase; letter-spacing: 0.5px; }
          .item-head { display: flex; justify-content: space-between; font-weight: 700; font-size: 13px; color: #0f172a; margin-top: 6px; }
          .skill-pill { display: inline-block; background: #f1f5f9; color: #1e293b; border: 1px solid #e2e8f0; padding: 2px 8px; border-radius: 4px; font-size: 11.5px; margin: 2px 4px 2px 0; }
          .work-item, .project-item { margin-bottom: ${itemMB}; page-break-inside: avoid; break-inside: avoid; }
          ul { margin: 3px 0 ${ulMB} 0; padding-left: 18px; }
          li { margin-bottom: ${liMB}; color: #334155; line-height: ${lhVal}; }
          p { margin: 3px 0; line-height: ${lhVal}; }
          .card-box { page-break-inside: avoid; break-inside: avoid; }
        </style>
      </head>
      <body>
        <div class="header">
          ${avatarTag ? `<div style="margin-bottom:6px;">${avatarTag}</div>` : ""}
          <div class="name">${p.name}</div>
          <div class="intent">求职意向：${resume.jobIntent}</div>
          <div class="contact">${p.email} &nbsp;|&nbsp; ${p.phone} &nbsp;|&nbsp; ${p.location}</div>
        </div>

        <div class="sec-title">职业摘要</div>
        <p>${resume.summary}</p>

        <div class="sec-title">核心能力</div>
        <div>${resume.coreSkills.map((s) => `<span class="skill-pill">${s}</span>`).join(" ")}</div>

        <div class="sec-title">工作经历</div>
        ${resume.workExperience
          .map(
            (w) => `
          <div class="work-item">
            <div class="item-head"><span>${w.company} · ${w.role}</span><span>${w.period}</span></div>
            <ul>${w.bullets.map((b) => `<li>${b}</li>`).join("")}</ul>
          </div>
        `
          )
          .join("")}

        <div class="sec-title">项目经历</div>
        ${resume.projectExperience
          .map(
            (pr) => `
          <div class="project-item">
            <div class="item-head"><span>${pr.name} · ${pr.role}</span><span>${pr.period}</span></div>
            <ul>${pr.bullets.map((b) => `<li>${b}</li>`).join("")}</ul>
          </div>
        `
          )
          .join("")}

        <div class="sec-title">技能工具</div>
        <p>${resume.skillsAndTools.join(" · ")}</p>

        <div class="sec-title">教育背景</div>
        <p>${resume.education.school} · ${resume.education.degree} · ${resume.education.period}</p>
      </body>
      </html>
    `;
  }

  // 2. Github Tech Template
  if (templateId === "github-tech") {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${p.name} - 个人简历</title>
        <style>
          @page { size: A4; margin: ${marginVal}; }
          * { box-sizing: border-box; }
          body { font-family: "Fira Code", Consolas, Monaco, -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif; font-size: ${fontVal}; line-height: ${lhVal}; color: #334155; margin: 0; padding: 6px 12px; background: #fff; word-break: break-word; overflow-wrap: break-word; }
          .terminal-header { background: #0f172a; color: #f8fafc; border-radius: 6px; padding: 12px 16px; margin-bottom: 12px; font-family: monospace; display: flex; justify-content: space-between; align-items: center; }
          .prompt { color: #38bdf8; font-weight: bold; }
          .name { font-size: 20px; font-weight: 700; color: #f8fafc; margin-bottom: 4px; }
          .contact { font-size: 11.5px; color: #94a3b8; }
          .sec-title { font-size: 13px; font-weight: 700; color: ${themeVal}; border-left: 3px solid ${themeVal}; padding-left: 8px; margin-top: ${secMT}; margin-bottom: ${secMB}; font-family: monospace; }
          .item-head { display: flex; justify-content: space-between; font-weight: 600; font-size: 13px; color: #0f172a; margin-top: 6px; }
          .code-tag { display: inline-block; background: #f1f5f9; color: #0284c7; border: 1px solid #bae6fd; font-family: monospace; padding: 2px 7px; border-radius: 4px; font-size: 11.5px; margin: 2px 4px 2px 0; }
          .work-item, .project-item { margin-bottom: ${itemMB}; page-break-inside: avoid; break-inside: avoid; }
          ul { margin: 3px 0 ${ulMB} 0; padding-left: 18px; }
          li { margin-bottom: ${liMB}; color: #334155; line-height: ${lhVal}; }
          p { margin: 3px 0; line-height: ${lhVal}; }
          .card-box { page-break-inside: avoid; break-inside: avoid; }
        </style>
      </head>
      <body>
        <div class="terminal-header">
          <div>
            <div class="name"><span class="prompt">&gt;</span> ${p.name}</div>
            <div class="contact">$ cat profile.json | grep --intent="${resume.jobIntent}"</div>
            <div class="contact" style="margin-top:4px;">${p.email} | ${p.phone} | ${p.location}</div>
          </div>
          ${avatarTag ? `<div>${avatarTag}</div>` : ""}
        </div>

        <div class="sec-title">// 01. 职业摘要</div>
        <p>${resume.summary}</p>

        <div class="sec-title">// 02. 核心技能栈</div>
        <div>${resume.coreSkills.map((s) => `<span class="code-tag">&lt;${s}/&gt;</span>`).join(" ")}</div>

        <div class="sec-title">// 03. 工作经历</div>
        ${resume.workExperience
          .map(
            (w) => `
          <div class="work-item">
            <div class="item-head"><span>${w.company} / ${w.role}</span><span style="font-family:monospace; font-size:12px; color:#64748b;">${w.period}</span></div>
            <ul>${w.bullets.map((b) => `<li>${b}</li>`).join("")}</ul>
          </div>
        `
          )
          .join("")}

        <div class="sec-title">// 04. 项目经历</div>
        ${resume.projectExperience
          .map(
            (pr) => `
          <div class="project-item">
            <div class="item-head"><span>${pr.name} / ${pr.role}</span><span style="font-family:monospace; font-size:12px; color:#64748b;">${pr.period}</span></div>
            <ul>${pr.bullets.map((b) => `<li>${b}</li>`).join("")}</ul>
          </div>
        `
          )
          .join("")}

        <div class="sec-title">// 05. 技能工具</div>
        <p>${resume.skillsAndTools.join(" · ")}</p>

        <div class="sec-title">// 06. 教育背景</div>
        <p>${resume.education.school} · ${resume.education.degree} (${resume.education.period})</p>
      </body>
      </html>
    `;
  }

  // 3. Timeline Tech Template
  if (templateId === "timeline-tech") {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${p.name} - 个人简历</title>
        <style>
          @page { size: A4; margin: ${marginVal}; }
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
            font-size: ${fontVal};
            line-height: ${lhVal};
            color: #334155;
            margin: 0;
            padding: 6px 12px;
            background: #fff;
            word-break: break-word;
            overflow-wrap: break-word;
          }
          .header {
            border-bottom: 2px solid ${themeVal};
            padding-bottom: 10px;
            margin-bottom: 14px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
          }
          .name { font-size: 22px; font-weight: 700; color: #0f172a; }
          .contact { font-size: 12px; color: #64748b; margin-top: 4px; }
          .sec-title {
            font-size: 13.5px;
            font-weight: 700;
            color: ${themeVal};
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-top: ${secMT};
            margin-bottom: ${secMB};
            display: flex;
            align-items: center;
          }
          .sec-title::after {
            content: "";
            flex: 1;
            margin-left: 12px;
            height: 1px;
            background-color: ${themeVal};
            opacity: 0.25;
          }
          .timeline {
            position: relative;
            margin-left: 10px;
            padding-left: 20px;
            border-left: 2px solid #e2e8f0;
          }
          .tl-item {
            position: relative;
            margin-bottom: ${itemMB};
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .tl-item::before {
            content: "";
            position: absolute;
            left: -25px;
            top: 5px;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background-color: ${themeVal};
            box-shadow: 0 0 0 3px #ffffff;
          }
          .item-head { display: flex; justify-content: space-between; font-weight: 600; font-size: 13.5px; color: #0f172a; }
          .tag {
            display: inline-block;
            background: #f1f5f9;
            color: ${themeVal};
            border: 1px solid #cbd5e1;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 11.5px;
            margin: 2px 4px 2px 0;
          }
          ul { margin: 3px 0 ${ulMB} 0; padding-left: 18px; }
          li { margin-bottom: ${liMB}; color: #334155; line-height: ${lhVal}; }
          p { margin: 3px 0; line-height: ${lhVal}; }
          .work-item, .project-item, .tl-item, .card-box { page-break-inside: avoid; break-inside: avoid; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="name">${p.name}</div>
            <div class="contact">${p.email} &nbsp;|&nbsp; ${p.phone} &nbsp;|&nbsp; ${p.location} &nbsp;|&nbsp; 意向：${resume.jobIntent}</div>
          </div>
          ${avatarTag ? `<div>${avatarTag}</div>` : ""}
        </div>

        <div class="sec-title">职业摘要</div>
        <p>${resume.summary}</p>

        <div class="sec-title">核心能力</div>
        <div>${resume.coreSkills.map((s) => `<span class="tag">${s}</span>`).join(" ")}</div>

        <div class="sec-title">工作经历</div>
        <div class="timeline">
          ${resume.workExperience
            .map(
              (w) => `
            <div class="tl-item">
              <div class="item-head"><span>${w.company} · ${w.role}</span><span>${w.period}</span></div>
              <ul>${w.bullets.map((b) => `<li>${b}</li>`).join("")}</ul>
            </div>
          `
            )
            .join("")}
        </div>

        <div class="sec-title">项目经历</div>
        <div class="timeline">
          ${resume.projectExperience
            .map(
              (pr) => `
            <div class="tl-item">
              <div class="item-head"><span>${pr.name} · ${pr.role}</span><span>${pr.period}</span></div>
              <ul>${pr.bullets.map((b) => `<li>${b}</li>`).join("")}</ul>
            </div>
          `
            )
            .join("")}
        </div>

        <div class="sec-title">技能工具</div>
        <p>${resume.skillsAndTools.join(" · ")}</p>

        <div class="sec-title">教育背景</div>
        <p>${resume.education.school} · ${resume.education.degree} · ${resume.education.period}</p>
      </body>
      </html>
    `;
  }

  // 4. Corporate Banner Template
  if (templateId === "corporate-banner") {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${p.name} - 简历</title>
        <style>
          @page { size: A4; margin: ${marginVal}; }
          * { box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif; font-size: ${fontVal}; line-height: ${lhVal}; color: #1e293b; margin: 0; padding: 0; background: #fff; word-break: break-word; overflow-wrap: break-word; }
          .banner { background: ${themeVal}; color: #fff; padding: 16px 20px; width: 100%; display: flex; justify-content: space-between; align-items: center; border-radius: 6px; }
          .name { font-size: 22px; font-weight: 700; margin-bottom: 4px; }
          .contact { font-size: 12px; color: #c7d2fe; }
          .content { padding: 10px 4px; }
          .sec-title { font-size: 13.5px; font-weight: 700; color: ${themeVal}; border-left: 4px solid ${themeVal}; padding-left: 8px; margin-top: ${secMT}; margin-bottom: ${secMB}; text-transform: uppercase; letter-spacing: 0.5px; }
          .item-head { display: flex; justify-content: space-between; font-weight: 600; font-size: 13.5px; margin-top: 6px; color: #0f172a; }
          .badge { display: inline-block; background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; padding: 2px 8px; border-radius: 4px; font-size: 11.5px; margin: 2px 4px 2px 0; }
          .work-item, .project-item { margin-bottom: ${itemMB}; page-break-inside: avoid; break-inside: avoid; }
          ul { margin: 3px 0 ${ulMB} 0; padding-left: 18px; }
          li { margin-bottom: ${liMB}; color: #334155; line-height: ${lhVal}; }
          p { margin: 3px 0; line-height: ${lhVal}; }
          .card-box { page-break-inside: avoid; break-inside: avoid; }
        </style>
      </head>
      <body>
        <div class="banner">
          <div>
            <div class="name">${p.name}</div>
            <div class="contact">${p.email} | ${p.phone} | ${p.location} | 求职意向：${resume.jobIntent}</div>
          </div>
          ${avatarTag ? `<div>${avatarTag}</div>` : ""}
        </div>

        <div class="content">
          <div class="sec-title">职业摘要</div>
          <p>${resume.summary}</p>

          <div class="sec-title">核心技能矩阵</div>
          <div>${resume.coreSkills.map((s) => `<span class="badge">${s}</span>`).join(" ")}</div>

          <div class="sec-title">工作经历</div>
          ${resume.workExperience
            .map(
              (w) => `
            <div class="work-item">
              <div class="item-head"><span>${w.company} · ${w.role}</span><span>${w.period}</span></div>
              <ul>${w.bullets.map((b) => `<li>${b}</li>`).join("")}</ul>
            </div>
          `
            )
            .join("")}

          <div class="sec-title">项目经历</div>
          ${resume.projectExperience
            .map(
              (pr) => `
            <div class="project-item">
              <div class="item-head"><span>${pr.name} · ${pr.role}</span><span>${pr.period}</span></div>
              <ul>${pr.bullets.map((b) => `<li>${b}</li>`).join("")}</ul>
            </div>
          `
            )
            .join("")}

          <div class="sec-title">技能工具</div>
          <p>${resume.skillsAndTools.join(" · ")}</p>

          <div class="sec-title">教育背景</div>
          <p>${resume.education.school} · ${resume.education.degree} · ${resume.education.period}</p>
        </div>
      </body>
      </html>
    `;
  }

  // 5. Grid Cards Template
  if (templateId === "grid-cards") {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${p.name} - 简历</title>
        <style>
          @page { size: A4; margin: ${marginVal}; }
          * { box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif; font-size: ${fontVal}; line-height: ${lhVal}; color: #334155; margin: 0; padding: 6px; background: #fff; word-break: break-word; overflow-wrap: break-word; }
          .card-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 14px; margin-bottom: ${itemMB}; page-break-inside: avoid; break-inside: avoid; }
          .card-box:last-child { margin-bottom: 0 !important; }
          .name { font-size: 20px; font-weight: 700; color: #0f172a; }
          .contact { font-size: 12px; color: #64748b; margin-top: 3px; }
          .sec-title { font-size: 13px; font-weight: 700; color: ${themeVal}; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
          .item-head { display: flex; justify-content: space-between; font-weight: 600; font-size: 13px; margin-top: 4px; color: #0f172a; }
          .pill { display: inline-block; background: #ecfdf5; color: ${themeVal}; border: 1px solid #a7f3d0; padding: 2px 8px; border-radius: 12px; font-size: 11.5px; margin: 2px 3px 2px 0; }
          .work-item, .project-item { margin-bottom: 6px; }
          ul { margin: 3px 0 ${ulMB} 0; padding-left: 18px; }
          li { margin-bottom: ${liMB}; color: #334155; line-height: ${lhVal}; }
          p { margin: 3px 0; line-height: ${lhVal}; }
        </style>
      </head>
      <body>
        <div class="card-box" style="background:#f0fdf4; border-color:#bbf7d0; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <div class="name" style="color:${themeVal};">${p.name}</div>
            <div class="contact" style="color:#047857;">${p.email} | ${p.phone} | ${p.location} | 意向：${resume.jobIntent}</div>
          </div>
          ${avatarTag ? `<div>${avatarTag}</div>` : ""}
        </div>

        <div class="card-box">
          <div class="sec-title">职业摘要</div>
          <p>${resume.summary}</p>
        </div>

        <div class="card-box">
          <div class="sec-title">核心技能</div>
          <div>${resume.coreSkills.map((s) => `<span class="pill">${s}</span>`).join(" ")}</div>
        </div>

        <div class="card-box">
          <div class="sec-title">工作经历</div>
          ${resume.workExperience
            .map(
              (w) => `
            <div class="work-item">
              <div class="item-head"><span>${w.company} · ${w.role}</span><span>${w.period}</span></div>
              <ul>${w.bullets.map((b) => `<li>${b}</li>`).join("")}</ul>
            </div>
          `
            )
            .join("")}
        </div>

        <div class="card-box">
          <div class="sec-title">项目经历</div>
          ${resume.projectExperience
            .map(
              (pr) => `
            <div class="project-item">
              <div class="item-head"><span>${pr.name} · ${pr.role}</span><span>${pr.period}</span></div>
              <ul>${pr.bullets.map((b) => `<li>${b}</li>`).join("")}</ul>
            </div>
          `
            )
            .join("")}
        </div>

        <div class="card-box">
          <div class="sec-title">技能工具 & 教育背景</div>
          <p><strong>技能：</strong>${resume.skillsAndTools.join(" · ")}</p>
          <p style="margin-top:4px;"><strong>教育：</strong>${resume.education.school} · ${resume.education.degree} (${resume.education.period})</p>
        </div>
      </body>
      </html>
    `;
  }

  // 6. Default Modern Sidebar Layout
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${p.name} - 简历</title>
      <style>
        @page { size: A4; margin: ${marginVal}; }
        * { box-sizing: border-box; }
        html, body { height: 100%; min-height: 100%; margin: 0; padding: 0; background: #fff; }
        body { font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif; font-size: ${fontVal}; line-height: ${lhVal}; color: #334155; word-break: break-word; overflow-wrap: break-word; }
        .container { display: table; width: 100%; height: 100%; min-height: 100%; table-layout: fixed; }
        .sidebar { display: table-cell; width: 30%; background: #f8fafc; border-right: 1px solid #e2e8f0; padding: 12px 10px; vertical-align: top; }
        .main { display: table-cell; width: 70%; padding: 12px 14px; vertical-align: top; }
        .name { font-size: 20px; font-weight: 700; color: #0f172a; margin: 0 0 3px 0; }
        .role { font-size: 11.5px; font-weight: 600; color: ${themeVal}; margin-bottom: 12px; text-transform: uppercase; }
        .sidebar-section { margin-bottom: 12px; page-break-inside: avoid; break-inside: avoid; }
        .sidebar-title { font-size: 11.5px; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid ${themeVal}; padding-bottom: 3px; margin-bottom: 6px; }
        .contact-item { font-size: 11.5px; color: #475569; margin-bottom: 5px; word-break: break-all; }
        .badge { display: inline-block; background: #e0e7ff; color: #3730a3; padding: 2px 7px; border-radius: 4px; font-size: 11px; margin: 2px 2px 2px 0; }
        .main-title { font-size: 13.5px; font-weight: 700; color: #0f172a; border-bottom: 2px solid ${themeVal}; padding-bottom: 3px; margin-top: ${secMT}; margin-bottom: ${secMB}; text-transform: uppercase; letter-spacing: 0.5px; }
        .main-title:first-child { margin-top: 0; }
        .item-header { display: flex; justify-content: space-between; font-weight: 600; font-size: 13px; margin-top: 6px; color: #0f172a; }
        .work-item, .project-item { margin-bottom: ${itemMB}; page-break-inside: avoid; break-inside: avoid; }
        ul { margin: 3px 0 ${ulMB} 0; padding-left: 16px; }
        li { margin-bottom: ${liMB}; color: #334155; line-height: ${lhVal}; }
        p { margin: 3px 0; line-height: ${lhVal}; }
        .card-box { page-break-inside: avoid; break-inside: avoid; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="sidebar">
          ${avatarTag ? `<div style="margin-bottom: 10px;">${avatarTag}</div>` : ""}
          <div class="name">${p.name}</div>
          <div class="role">${resume.jobIntent}</div>

          <div class="sidebar-section">
            <div class="sidebar-title">联系方式</div>
            <div class="contact-item">📧 ${p.email}</div>
            <div class="contact-item">📱 ${p.phone}</div>
            <div class="contact-item">📍 ${p.location}</div>
          </div>

          <div class="sidebar-section">
            <div class="sidebar-title">核心能力</div>
            ${resume.coreSkills.map((s) => `<span class="badge">${s}</span>`).join(" ")}
          </div>

          <div class="sidebar-section">
            <div class="sidebar-title">技能工具</div>
            <p style="font-size:11.5px; color:#475569; line-height:${lhVal};">${resume.skillsAndTools.join(" · ")}</p>
          </div>

          <div class="sidebar-section">
            <div class="sidebar-title">教育背景</div>
            <p style="font-size:11.5px; font-weight:600; margin-bottom:2px;">${resume.education.school}</p>
            <p style="font-size:11px; color:#64748b;">${resume.education.degree} (${resume.education.period})</p>
          </div>
        </div>

        <div class="main">
          <div class="main-title">职业摘要</div>
          <p>${resume.summary}</p>

          <div class="main-title">工作经历</div>
          ${resume.workExperience
            .map(
              (w) => `
            <div class="work-item">
              <div class="item-header"><span>${w.company} · ${w.role}</span><span>${w.period}</span></div>
              <ul>${w.bullets.map((b) => `<li>${b}</li>`).join("")}</ul>
            </div>
          `
            )
            .join("")}

          <div class="main-title">项目经历</div>
          ${resume.projectExperience
            .map(
              (pr) => `
            <div class="project-item">
              <div class="item-header"><span>${pr.name} · ${pr.role}</span><span>${pr.period}</span></div>
              <ul>${pr.bullets.map((b) => `<li>${b}</li>`).join("")}</ul>
            </div>
          `
            )
            .join("")}
        </div>
      </div>
    </body>
    </html>
  `;
}

export const DEFAULT_CUSTOM_TEMPLATE_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>{{姓名}} - 1.3 简历双栏自定义模板</title>
  <style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #1e293b;
      font-size: 13px;
      line-height: 1.6;
    }
    .layout-container {
      display: flex;
      min-height: 100vh;
      width: 100%;
    }
    .sidebar {
      width: 32%;
      background-color: #f1f5f9;
      padding: 32px 20px;
      border-right: 1px solid #e2e8f0;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .avatar-wrapper {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }
    .name-title {
      font-size: 24px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: 1px;
      margin: 10px 0 4px 0;
    }
    .sidebar-sec-title {
      font-size: 13.5px;
      font-weight: 700;
      color: #0f172a;
      border-bottom: 2px solid #334155;
      padding-bottom: 4px;
      margin-bottom: 10px;
    }
    .info-item {
      font-size: 12px;
      color: #475569;
      margin-bottom: 8px;
      line-height: 1.5;
    }
    .main-content {
      flex: 1;
      padding: 32px 32px;
      background: #ffffff;
    }
    .main-sec-title {
      font-size: 14.5px;
      font-weight: 800;
      color: #0f172a;
      border-bottom: 2px dashed #94a3b8;
      padding-bottom: 6px;
      margin-top: 20px;
      margin-bottom: 12px;
    }
    .main-sec-title:first-child {
      margin-top: 0;
    }
    ul { margin: 6px 0 12px 0; padding-left: 18px; }
    li { margin-bottom: 4px; color: #334155; }
  </style>
</head>
<body>
  <div class="layout-container">
    <!-- Left Sidebar (淡灰底色边栏) -->
    <div class="sidebar">
      <div class="avatar-wrapper">
        {{头像}}
        <div class="name-title">{{姓名}}</div>
      </div>

      <div>
        <div class="sidebar-sec-title">基本信息</div>
        <div class="info-item">🏫 院校：{{学校}}</div>
        <div class="info-item">📞 手机：{{电话}}</div>
        <div class="info-item">✉️ 邮箱：{{邮箱}}</div>
        <div class="info-item">📍 城市：{{城市}}</div>
        <div class="info-item">🎯 意向：{{求职意向}}</div>
      </div>

      <div>
        <div class="sidebar-sec-title">自我评价</div>
        <div style="font-size: 12px; color: #475569; line-height: 1.65;">
          {{职业摘要}}
        </div>
      </div>
    </div>

    <!-- Right Main Content (右侧主显示区) -->
    <div class="main-content">
      <div class="main-sec-title">教育背景</div>
      <div>{{教育背景}}</div>

      <div class="main-sec-title">工作与校园经历</div>
      <div>{{工作经历}}</div>

      <div class="main-sec-title">项目经历</div>
      <div>{{项目经历}}</div>

      <div class="main-sec-title">核心能力与所获荣誉</div>
      <div>{{核心能力}}</div>
      <p style="margin-top: 10px; font-size: 12.5px; color: #475569;">{{技能工具}}</p>
    </div>
  </div>
</body>
</html>`;
