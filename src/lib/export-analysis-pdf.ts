import type { AnalysisResult, JDAnalysis, InterviewPrep, UserInput } from "@/types/resume";
import { sanitizePrintHTML } from "@/lib/safe-html";

function buildCommonHeader(title: string, subtitle: string, userInput?: UserInput): string {
  const role = userInput?.targetRole || "目标岗位";
  const industry = userInput?.industry || "通用行业";
  const stage = userInput?.jobStage || "";
  const companyType = userInput?.companyType || "";
  const dateStr = new Date().toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `
    <header class="doc-header">
      <div class="header-main">
        <div class="brand">
          <span class="brand-badge">AI Resume Expert</span>
          <span class="date-badge">${dateStr}</span>
        </div>
        <h1 class="doc-title">${title}</h1>
        <p class="doc-subtitle">${subtitle}</p>
      </div>
      <div class="meta-grid">
        <div class="meta-item">
          <span class="meta-label">目标岗位</span>
          <span class="meta-val">${role}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">目标行业</span>
          <span class="meta-val">${industry}</span>
        </div>
        ${
          stage
            ? `<div class="meta-item">
          <span class="meta-label">求职阶段</span>
          <span class="meta-val">${stage}</span>
        </div>`
            : ""
        }
        ${
          companyType
            ? `<div class="meta-item">
          <span class="meta-label">企业类型</span>
          <span class="meta-val">${companyType}</span>
        </div>`
            : ""
        }
      </div>
    </header>
  `;
}

function getCommonStyles(): string {
  return `
    <style>
      @page {
        size: A4 portrait;
        margin: 12mm 14mm 16mm 14mm;
      }
      * {
        box-sizing: border-box;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      html, body {
        width: 100%;
        height: auto !important;
        background-color: #ffffff;
        color: #1e293b;
        margin: 0;
        padding: 0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", "PingFang SC", "Microsoft YaHei", sans-serif;
        font-size: 13px;
        line-height: 1.6;
        overflow: visible !important;
      }
      body {
        padding-bottom: 10mm;
      }

      /* Header styling with print break avoidance */
      .doc-header {
        border-bottom: 2px solid #3b82f6;
        padding-bottom: 14px;
        margin-bottom: 20px;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      .header-main {
        margin-bottom: 12px;
      }
      .brand {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 6px;
      }
      .brand-badge {
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.5px;
        color: #2563eb;
        text-transform: uppercase;
        background: #eff6ff;
        padding: 3px 8px;
        border-radius: 4px;
        border: 1px solid #bfdbfe;
      }
      .date-badge {
        font-size: 11px;
        color: #64748b;
      }
      .doc-title {
        font-size: 22px;
        font-weight: 800;
        color: #0f172a;
        margin: 4px 0 2px 0;
        letter-spacing: -0.3px;
      }
      .doc-subtitle {
        font-size: 12px;
        color: #64748b;
        margin: 0;
      }
      .meta-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 8px;
        background: #f8fafc;
        padding: 8px 12px;
        border-radius: 6px;
        border: 1px solid #e2e8f0;
      }
      .meta-item {
        display: flex;
        flex-direction: column;
      }
      .meta-label {
        font-size: 10px;
        color: #64748b;
        font-weight: 500;
      }
      .meta-val {
        font-size: 12px;
        font-weight: 600;
        color: #1e293b;
      }

      /* Sections */
      .section-block {
        margin-bottom: 24px;
      }
      .section-title-wrap {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 12px;
        border-left: 4px solid #3b82f6;
        padding-left: 8px;
        page-break-after: avoid !important;
        break-after: avoid !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      .section-title {
        font-size: 15px;
        font-weight: 700;
        color: #0f172a;
        margin: 0;
      }

      /* Card Grids - Flexbox structure to ensure clean multi-column print pagination */
      .card-grid-2 {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: 12px;
        margin-bottom: 12px;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      .card-grid-2 > .card-box {
        width: calc(50% - 6px);
        margin-bottom: 0;
      }

      .card-grid-3 {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: 12px;
        margin-bottom: 12px;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      .card-grid-3 > .card-box {
        width: calc(33.333% - 8px);
        margin-bottom: 0;
      }

      /* Card Boxes - Atomic blocks that never cut in half across page boundaries */
      .card-box {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 12px 14px;
        margin-bottom: 12px;
        overflow: visible;
        word-break: break-word;
        overflow-wrap: break-word;
        box-sizing: border-box;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }

      .card-box-header {
        font-size: 13px;
        font-weight: 700;
        color: #1e293b;
        margin-bottom: 8px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        page-break-after: avoid !important;
        break-after: avoid !important;
      }

      /* Lists & Badges */
      ul.styled-list {
        margin: 0;
        padding-left: 18px;
      }
      ul.styled-list li {
        margin-bottom: 6px;
        color: #334155;
        line-height: 1.6;
        word-break: break-word;
        overflow-wrap: break-word;
      }
      .tag-cloud {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .tag-item {
        background: #f1f5f9;
        color: #334155;
        border: 1px solid #cbd5e1;
        border-radius: 4px;
        padding: 2px 8px;
        font-size: 11px;
        font-weight: 500;
      }
      .badge {
        display: inline-block;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 10px;
        font-weight: 600;
        text-align: center;
      }
      .badge-high { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }
      .badge-medium { background: #fef3c7; color: #92400e; border: 1px solid #fcd34d; }
      .badge-low { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; }
      .badge-strong { background: #dcfce7; color: #166534; border: 1px solid #86efac; }
      .badge-weak { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }
      .badge-none { background: #f1f5f9; color: #64748b; border: 1px solid #cbd5e1; }
      .badge-warn { background: #fef3c7; color: #b45309; border: 1px solid #fcd34d; }
      .badge-success { background: #dcfce7; color: #15803d; border: 1px solid #86efac; }

      /* Table Styles */
      table.data-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 6px;
        font-size: 12px;
      }
      table.data-table thead {
        display: table-header-group;
      }
      table.data-table th {
        background: #f8fafc;
        color: #475569;
        font-weight: 600;
        text-align: left;
        padding: 8px 10px;
        border-bottom: 2px solid #e2e8f0;
      }
      table.data-table td {
        padding: 8px 10px;
        border-bottom: 1px solid #e2e8f0;
        vertical-align: top;
        color: #334155;
        line-height: 1.5;
        word-break: break-word;
        overflow-wrap: break-word;
      }
      table.data-table tr {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      table.data-table tr:nth-child(even) td {
        background: #fafafa;
      }

      /* Score Ring / Banner */
      .score-banner {
        display: flex;
        align-items: center;
        gap: 20px;
        background: linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%);
        border: 1px solid #bfdbfe;
        border-radius: 8px;
        padding: 14px 18px;
        margin-bottom: 16px;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      .score-circle {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: #ffffff;
        border: 3px solid #3b82f6;
        border-radius: 50%;
        width: 70px;
        height: 70px;
        flex-shrink: 0;
        box-shadow: 0 2px 4px rgba(59, 130, 246, 0.15);
      }
      .score-num {
        font-size: 24px;
        font-weight: 800;
        color: #1d4ed8;
        line-height: 1;
      }
      .score-lbl {
        font-size: 9px;
        color: #64748b;
        margin-top: 2px;
      }
      .score-desc {
        flex: 1;
      }
      .score-desc h3 {
        margin: 0 0 4px 0;
        font-size: 14px;
        color: #1e3a8a;
      }
      .score-desc p {
        margin: 0;
        font-size: 11px;
        color: #475569;
        line-height: 1.5;
      }

      /* Progress Bar */
      .progress-bar-bg {
        background: #e2e8f0;
        border-radius: 4px;
        height: 6px;
        width: 100%;
        overflow: hidden;
        margin: 4px 0;
      }
      .progress-bar-fill {
        background: #3b82f6;
        height: 100%;
        border-radius: 4px;
      }

      /* Interview Q&A Cards */
      .qa-card {
        background: #ffffff;
        border: 1px solid #cbd5e1;
        border-left: 4px solid #3b82f6;
        border-radius: 6px;
        padding: 10px 14px;
        margin-bottom: 10px;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      .qa-q {
        font-weight: 700;
        font-size: 13px;
        color: #0f172a;
        margin-bottom: 6px;
      }
      .qa-a {
        color: #334155;
        font-size: 12px;
        background: #f8fafc;
        padding: 6px 10px;
        border-radius: 4px;
        margin-bottom: 6px;
        border: 1px solid #f1f5f9;
        line-height: 1.6;
        word-break: break-word;
      }
      .qa-evidence {
        font-size: 11px;
        color: #64748b;
      }

      .footer-note {
        margin-top: 24px;
        padding-top: 10px;
        border-top: 1px dashed #cbd5e1;
        text-align: center;
        font-size: 10px;
        color: #94a3b8;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }

      .pdf-fixed-footer {
        display: none;
      }

      @media print {
        @page {
          size: A4 portrait;
          margin: 12mm 14mm 16mm 14mm;
        }
        html, body {
          width: 100% !important;
          height: auto !important;
          overflow: visible !important;
        }
        .card-grid-2, .card-grid-3 {
          display: flex !important;
          flex-direction: row !important;
          flex-wrap: wrap !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
        .card-grid-2 > .card-box {
          width: calc(50% - 6px) !important;
        }
        .card-grid-3 > .card-box {
          width: calc(33.333% - 8px) !important;
        }
        .card-box, .qa-card, .score-banner, .doc-header {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
        .pdf-fixed-footer {
          display: flex !important;
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          height: 8mm;
          align-items: center;
          justify-content: center;
          gap: 12px;
          background: #ffffff;
          font-size: 10px;
          color: #94a3b8;
          border-top: 1px solid #e2e8f0;
          z-index: 9999;
        }
      }
    </style>
  `;
}

function openPrintWindow(htmlContent: string, documentTitle: string) {
  const script = `
    <script>
      window.addEventListener('load', function() {
        setTimeout(function() {
          window.print();
        }, 350);
      });
    </script>
  `;

  // Set the title as text before sanitization, never interpolate it into JavaScript.
  const escapedTitle = documentTitle.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
  const safeHtml = sanitizePrintHTML(htmlContent.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapedTitle}</title>`));
  const fullHtml = safeHtml.replace("</body>", `${script}</body>`);
  const blob = new Blob([fullHtml], { type: "text/html;charset=utf-8" });
  const blobUrl = URL.createObjectURL(blob);
  const printWindow = window.open(blobUrl, "_blank");
  if (!printWindow) return;

  setTimeout(() => {
    URL.revokeObjectURL(blobUrl);
  }, 120000);
}

/**
 * Render JD Analysis Section HTML
 */
export function renderJDAnalysisHTML(jdAnalysis: JDAnalysis): string {
  if (!jdAnalysis) return "";

  const respItems = (jdAnalysis.responsibilities || []).map((r) => `<li>${r}</li>`).join("");
  const hardItems = (jdAnalysis.hardRequirements || []).map((h) => `<li>${h}</li>`).join("");
  const implItems = (jdAnalysis.implicitRequirements || []).map((i) => `<li>${i}</li>`).join("");
  const kwTags = (jdAnalysis.keywords || []).map((k) => `<span class="tag-item">${k}</span>`).join("");

  const compRows = (jdAnalysis.coreCompetencies || []).map((c) => {
    const badgeClass =
      c.importance === "high" ? "badge-high" : c.importance === "medium" ? "badge-medium" : "badge-low";
    const importanceLabel = c.importance === "high" ? "高" : c.importance === "medium" ? "中" : "低";
    return `
      <tr>
        <td style="font-weight: 600; width: 130px;">${c.name}</td>
        <td style="width: 70px;"><span class="badge ${badgeClass}">${importanceLabel}</span></td>
        <td>${c.description}</td>
      </tr>
    `;
  }).join("");

  return `
    <div class="section-block">
      <div class="section-title-wrap">
        <h2 class="section-title">一、 JD 目标岗位深度解析</h2>
      </div>

      <div class="card-grid-2">
        <div class="card-box">
          <div class="card-box-header">📌 岗位职责</div>
          <ul class="styled-list">${respItems || "<li>无</li>"}</ul>
        </div>
        <div class="card-box">
          <div class="card-box-header">🔒 硬性要求</div>
          <ul class="styled-list">${hardItems || "<li>无</li>"}</ul>
        </div>
      </div>

      <div class="card-grid-2">
        <div class="card-box">
          <div class="card-box-header">💡 隐性要求</div>
          <ul class="styled-list">${implItems || "<li>无</li>"}</ul>
        </div>
        <div class="card-box">
          <div class="card-box-header">🏷️ 提取核心关键词</div>
          <div class="tag-cloud">${kwTags || "无关键词"}</div>
        </div>
      </div>

      <div class="card-box">
        <div class="card-box-header">👤 理想候选人画像</div>
        <p style="margin: 0; color: #334155; font-size: 12px; line-height: 1.6; word-break: break-word;">${jdAnalysis.idealCandidate || "暂无"}</p>
      </div>

      <div class="card-box">
        <div class="card-box-header">⚡ 核心能力矩阵表</div>
        <table class="data-table">
          <thead>
            <tr>
              <th>能力项</th>
              <th>重要程度</th>
              <th>评估维度与说明</th>
            </tr>
          </thead>
          <tbody>
            ${compRows || "<tr><td colspan='3'>无能力矩阵数据</td></tr>"}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

/**
 * Render Diagnosis & Match Section HTML
 */
export function renderDiagnosisAndMatchHTML(
  diagnosis: AnalysisResult["diagnosis"],
  matchItems: AnalysisResult["matchItems"],
  optimizedItems: AnalysisResult["optimizedItems"]
): string {
  if (!diagnosis) return "";

  const dimProgress = (diagnosis.dimensionScores || []).map((d) => `
    <div style="margin-bottom: 8px;">
      <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: 600; color: #334155;">
        <span>${d.dimension}</span>
        <span style="color: #2563eb;">${d.score} 分</span>
      </div>
      <div class="progress-bar-bg">
        <div class="progress-bar-fill" style="width: ${Math.min(100, Math.max(0, d.score))}%;"></div>
      </div>
      <p style="margin: 2px 0 0 0; font-size: 10px; color: #64748b;">${d.comment}</p>
    </div>
  `).join("");

  const mainIssueItems = (diagnosis.mainIssues || []).map((i) => `<li>${i}</li>`).join("");
  const prioItems = (diagnosis.prioritySuggestions || []).map((p) => `<li>${p}</li>`).join("");

  const matchRows = (matchItems || []).map((m) => {
    const strengthClass =
      m.evidenceStrength === "strong"
        ? "badge-strong"
        : m.evidenceStrength === "medium"
        ? "badge-warn"
        : m.evidenceStrength === "weak"
        ? "badge-weak"
        : "badge-none";
    const strengthLabel =
      m.evidenceStrength === "strong" ? "强" : m.evidenceStrength === "medium" ? "中" : m.evidenceStrength === "weak" ? "弱" : "无";

    const suppBadge = m.needsSupplement
      ? `<span class="badge badge-warn">需补充</span>`
      : `<span class="badge badge-success">已覆盖</span>`;

    return `
      <tr>
        <td style="font-weight: 600; width: 22%;">${m.jdRequirement}</td>
        <td style="width: 28%;">${m.resumeEvidence}</td>
        <td style="width: 10%; text-align: center;"><span class="badge ${strengthClass}">${strengthLabel}</span></td>
        <td style="width: 10%; text-align: center;">${suppBadge}</td>
        <td style="width: 30%;">${m.optimizationSuggestion}</td>
      </tr>
    `;
  }).join("");

  const optRows = (optimizedItems || []).map((o) => `
    <tr>
      <td style="font-weight: 600; width: 15%;">${o.section}</td>
      <td style="width: 32%; color: #dc2626; background: #fff5f5; font-size: 11px;">${o.before}</td>
      <td style="width: 32%; color: #166534; background: #f0fdf4; font-size: 11px; font-weight: 500;">${o.after}</td>
      <td style="width: 21%; font-size: 11px; color: #475569;">${o.reason}</td>
    </tr>
  `).join("");

  return `
    <div class="section-block">
      <div class="section-title-wrap">
        <h2 class="section-title">二、 简历诊断与人岗匹配对照</h2>
      </div>

      <div class="score-banner">
        <div class="score-circle">
          <span class="score-num">${diagnosis.overallScore}</span>
          <span class="score-lbl">综合得分</span>
        </div>
        <div class="score-desc">
          <h3>人岗匹配综合诊断评估</h3>
          <p>基于目标 JD 的硬性标准、隐性考核及核心能力矩阵，精准评估您的简历支撑强度与优化空间。</p>
        </div>
      </div>

      <div class="card-grid-2">
        <div class="card-box">
          <div class="card-box-header">📊 各维度评分与点评</div>
          ${dimProgress || "暂无"}
        </div>
        <div class="card-box">
          <div class="card-box-header">⚠️ 诊断发现的主要问题</div>
          <ul class="styled-list" style="margin-bottom: 10px;">${mainIssueItems || "<li>无明显缺陷</li>"}</ul>
          <div class="card-box-header" style="border-top: 1px solid #f1f5f9; padding-top: 8px;">🚀 优先修改建议</div>
          <ul class="styled-list">${prioItems || "<li>无</li>"}</ul>
        </div>
      </div>

      ${
        matchItems && matchItems.length > 0
          ? `
        <div class="card-box">
          <div class="card-box-header">⚖️ JD 要求 vs 简历证据 深度对照表</div>
          <table class="data-table">
            <thead>
              <tr>
                <th>JD 要求</th>
                <th>简历现有证据</th>
                <th>强度</th>
                <th>覆盖状态</th>
                <th>精准优化建议</th>
              </tr>
            </thead>
            <tbody>
              ${matchRows}
            </tbody>
          </table>
        </div>
      `
          : ""
      }

      ${
        optimizedItems && optimizedItems.length > 0
          ? `
        <div class="card-box">
          <div class="card-box-header">✨ 关键经历重构与精炼对照表</div>
          <table class="data-table">
            <thead>
              <tr>
                <th>模块</th>
                <th>修改前（原始表达）</th>
                <th>修改后（AI 重构成品）</th>
                <th>重构理由</th>
              </tr>
            </thead>
            <tbody>
              ${optRows}
            </tbody>
          </table>
        </div>
      `
          : ""
      }
    </div>
  `;
}

/**
 * Render Interview Preparation Section HTML
 */
export function renderInterviewPrepHTML(interviewPrep: InterviewPrep): string {
  if (!interviewPrep) return "";

  const qaCards = (interviewPrep.likelyQuestions || []).map((q, idx) => `
    <div class="qa-card">
      <div class="qa-q">Q${idx + 1}. ${q.question}</div>
      <div class="qa-a"><strong>💡 参考回答：</strong>${q.suggestedAnswer}</div>
      ${
        q.evidenceNeeded && q.evidenceNeeded.length > 0
          ? `<div class="qa-evidence"><strong>📄 支撑证据：</strong>${q.evidenceNeeded.join("；")}</div>`
          : ""
      }
    </div>
  `).join("");

  const evItems = (interviewPrep.evidenceToPrepare || []).map((e) => `<li>${e}</li>`).join("");
  const exItems = (interviewPrep.possibleExaggerations || []).map((ex) => `<li>${ex}</li>`).join("");
  const suppDataItems = (interviewPrep.dataToSupplement || []).map((d) => `<li>${d}</li>`).join("");

  return `
    <div class="section-block">
      <div class="section-title-wrap">
        <h2 class="section-title">三、 目标岗位面试准备与答辩指南</h2>
      </div>

      <div class="card-box" style="background: #faf5ff; border-color: #e9d5ff;">
        <div class="card-box-header" style="color: #6b21a8;">🎙️ 1-3 分钟定制自我介绍脚本</div>
        <p style="margin: 0; font-size: 12px; color: #4c1d95; line-height: 1.7; white-space: pre-wrap;">${interviewPrep.selfIntroduction || "暂无自我介绍脚本"}</p>
      </div>

      <div style="margin-bottom: 12px; page-break-inside: avoid; break-inside: avoid;">
        <div class="card-box-header" style="margin-bottom: 8px;">❓ 预测面试官高频追问（10 题）与实战参考回答</div>
        ${qaCards || "<p style='color: #64748b;'>暂无追问预测</p>"}
      </div>

      <div class="card-grid-3">
        <div class="card-box">
          <div class="card-box-header">📁 需携带/准备的背书证据</div>
          <ul class="styled-list">${evItems || "<li>无</li>"}</ul>
        </div>
        <div class="card-box">
          <div class="card-box-header">⚠️ 质疑/防压价应对点</div>
          <ul class="styled-list">${exItems || "<li>无</li>"}</ul>
        </div>
        <div class="card-box">
          <div class="card-box-header">📈 建议口头补充的量化数据</div>
          <ul class="styled-list">${suppDataItems || "<li>无</li>"}</ul>
        </div>
      </div>
    </div>
  `;
}

/**
 * 1. Export JD Analysis PDF only
 */
export function exportJDAnalysisAsPDF(userInput: UserInput, jdAnalysis: JDAnalysis) {
  if (!jdAnalysis) return;
  const roleName = userInput?.targetRole || "岗位描述";
  const docTitle = `${roleName}_JD深度解析报告`;

  const html = `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="utf-8" />
      <title>${docTitle}</title>
      ${getCommonStyles()}
    </head>
    <body>
      ${buildCommonHeader("JD 岗位深度解析报告", "从目标岗位描述中提取职责、要求、关键词与核心能力矩阵", userInput)}
      ${renderJDAnalysisHTML(jdAnalysis)}
      <div class="footer-note">本报告由 AI Resume Expert 智能解析导出 · 助力精准高效求职</div>
      <div class="pdf-fixed-footer">
        <span>AI Resume Expert · JD 岗位深度解析报告</span>
      </div>
    </body>
    </html>
  `;

  openPrintWindow(html, docTitle);
}

/**
 * 2. Export Interview Prep PDF only
 */
export function exportInterviewPrepAsPDF(userInput: UserInput, interviewPrep: InterviewPrep) {
  if (!interviewPrep) return;
  const roleName = userInput?.targetRole || "目标岗位";
  const docTitle = `${roleName}_面试准备与自我介绍指南`;

  const html = `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="utf-8" />
      <title>${docTitle}</title>
      ${getCommonStyles()}
    </head>
    <body>
      ${buildCommonHeader("目标岗位面试准备与答辩指南", "基于岗位要求与求职履历生成的自我介绍脚本、10大追问预测与实证背书", userInput)}
      ${renderInterviewPrepHTML(interviewPrep)}
      <div class="footer-note">本指南由 AI Resume Expert 智能生成导出 · 祝您面试顺利</div>
      <div class="pdf-fixed-footer">
        <span>AI Resume Expert · 目标岗位面试准备指南</span>
      </div>
    </body>
    </html>
  `;

  openPrintWindow(html, docTitle);
}

/**
 * 3. Export All-in-One Comprehensive Analysis Report PDF
 */
export function exportFullAnalysisAsPDF(userInput: UserInput, analysisResult: AnalysisResult) {
  if (!analysisResult) return;
  const roleName = userInput?.targetRole || "目标岗位";
  const docTitle = `${roleName}_AI岗位匹配、简历诊断与面试准备全景综合报告`;

  const html = `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="utf-8" />
      <title>${docTitle}</title>
      ${getCommonStyles()}
    </head>
    <body>
      ${buildCommonHeader("AI 岗位匹配、简历诊断与面试准备全景综合报告", "全方位岗位解析、简历匹配度诊断、修改建议与实战面试准备全集", userInput)}
      
      ${renderJDAnalysisHTML(analysisResult.jdAnalysis)}
      ${renderDiagnosisAndMatchHTML(analysisResult.diagnosis, analysisResult.matchItems, analysisResult.optimizedItems)}
      ${renderInterviewPrepHTML(analysisResult.interviewPrep)}

      <div class="footer-note">本全景综合报告由 AI Resume Expert 生成导出 · 祝您斩获心仪 Offer</div>
      <div class="pdf-fixed-footer">
        <span>AI Resume Expert · 全景岗位匹配与诊断综合报告</span>
      </div>
    </body>
    </html>
  `;

  openPrintWindow(html, docTitle);
}
