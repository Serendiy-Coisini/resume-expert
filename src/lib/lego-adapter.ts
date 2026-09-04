import type { AnalysisResult, UserInput, TemplateId } from '@/types/resume';
import type { TemplateOptions } from '@/lib/resume-templates';
import { DEFAULT_TEMPLATE_OPTIONS } from '@/lib/resume-templates';
import type { IHJSchema, IWidget } from '@/types/lego';

function resolveEffectiveTemplateId(
  templateId: TemplateId,
  customTemplateHTML?: string
): TemplateId {
  if (templateId === ('classic' as TemplateId)) return 'classic-minimal';
  if (templateId !== 'custom') return templateId;
  if (!customTemplateHTML) return 'modern-sidebar';

  const htmlLower = customTemplateHTML.toLowerCase();
  if (
    htmlLower.includes('layout-minimal') ||
    htmlLower.includes('minimal') ||
    htmlLower.includes('fresh')
  ) {
    return 'minimal';
  }
  if (
    htmlLower.includes('layout-single-column') ||
    htmlLower.includes('header-center') ||
    htmlLower.includes('single-column')
  ) {
    return 'classic-minimal';
  }
  if (
    htmlLower.includes('layout-corporate-banner') ||
    htmlLower.includes('corporate-banner') ||
    htmlLower.includes('top-banner')
  ) {
    return 'corporate-banner';
  }
  if (
    htmlLower.includes('layout-timeline-tech') ||
    htmlLower.includes('timeline-container') ||
    htmlLower.includes('timeline')
  ) {
    return 'timeline-tech';
  }
  if (
    htmlLower.includes('layout-grid-cards') ||
    htmlLower.includes('grid-cards')
  ) {
    return 'grid-cards';
  }
  if (
    htmlLower.includes('layout-modern-sidebar') ||
    htmlLower.includes('sidebar')
  ) {
    return 'modern-sidebar';
  }

  return 'classic-minimal';
}

/**
 * Accurately calculate required height for an experience/project card
 * based on card width, header info, and total bullet text line wrapping.
 */
function calculateCardHeight(
  companyOrName: string,
  role: string,
  period: string,
  bullets: string[],
  cardWidthPx: number = 500,
  fontSizePx: number = 12.5,
  lineHeightPx: number = 20
): number {
  const hasHeader = Boolean((companyOrName || role || period).trim());
  const headerHeight = hasHeader ? 32 : 0;

  // Usable text width inside card padding (~16px horizontal padding)
  const usableWidth = Math.max(200, cardWidthPx - 24);

  // Character width estimation:
  // 1 Chinese character ≈ 0.95 * fontSizePx
  // 1 English/punctuation character ≈ 0.55 * fontSizePx
  // Mixed average: ~0.92 * fontSizePx
  const charWidthPx = fontSizePx * 0.92;
  const charsPerLine = Math.max(15, Math.floor(usableWidth / charWidthPx));

  let totalLines = 0;
  bullets.forEach((b) => {
    const text = b.trim();
    if (!text) return;
    const len = text.length;
    const linesForBullet = Math.max(1, Math.ceil(len / charsPerLine));
    totalLines += linesForBullet;
  });

  if (bullets.length === 0) {
    totalLines = 1;
  }

  const contentHeight = totalLines * lineHeightPx;
  const paddingMargin = 22; // top & bottom padding + gap

  const computedHeight = headerHeight + contentHeight + paddingMargin;
  return Math.max(85, Math.ceil(computedHeight));
}

/**
 * Accurately calculate required height for summary text block
 */
function calculateSummaryHeight(
  summaryText: string,
  cardWidthPx: number = 760,
  fontSizePx: number = 12.5,
  lineHeightPx: number = 20
): number {
  const usableWidth = Math.max(180, cardWidthPx - 24);
  const charWidthPx = fontSizePx * 0.92;
  const charsPerLine = Math.max(15, Math.floor(usableWidth / charWidthPx));
  const paras = (summaryText || "").split(/\r?\n/).map((p) => p.trim()).filter(Boolean);

  let totalLines = 0;
  paras.forEach((p) => {
    totalLines += Math.max(1, Math.ceil(p.length / charsPerLine));
  });
  if (totalLines === 0) totalLines = 1;

  return Math.max(35, Math.ceil(totalLines * lineHeightPx + 14));
}

export function fillAiDataIntoExistingSchema(
  currentSchema: IHJSchema,
  userInput: UserInput,
  analysisResult?: AnalysisResult | null
): IHJSchema {
  if (!currentSchema || !currentSchema.componentsTree || currentSchema.componentsTree.length === 0) {
    return buildLegoSchemaFromResume(userInput, analysisResult);
  }

  const finalResume = analysisResult?.finalResume;
  const name = finalResume?.personalInfo?.name || '求职者';
  const jobIntent = finalResume?.jobIntent || userInput.targetRole || '软件工程师';
  const email = finalResume?.personalInfo?.email || 'user@example.com';
  const phone = finalResume?.personalInfo?.phone || '138-0000-0000';
  const location = finalResume?.personalInfo?.location || '北京';

  const summary =
    finalResume?.summary ||
    userInput.additionalInfo ||
    '具备扎实的专业基础与丰富的项目实践经验，善于解决复杂工程难题，注重团队协同与效率产出。';

  const workList = finalResume?.workExperience && finalResume.workExperience.length > 0
    ? finalResume.workExperience
    : [
        {
          company: '科技创新有限公司',
          role: jobIntent,
          period: '2022.03 - 至今',
          bullets: [
            '主导核心模块架构重构，提升业务处理吞吐量超过 35%。',
            '跨团队协同推进项目落地，保障上线按时交付率达到 98%。'
          ]
        }
      ];

  const projectList = finalResume?.projectExperience && finalResume.projectExperience.length > 0
    ? finalResume.projectExperience
    : [
        {
          name: '高并发业务中台升级',
          role: '核心研发工程师',
          period: '2023.01 - 2023.08',
          bullets: [
            '设计实现分布缓存方案，压测 QPS 提升至 10,000+。',
            '编写自动化测试套件，降低测试缺陷遗留率 40%。'
          ]
        }
      ];

  const skills = (finalResume?.coreSkills && finalResume.coreSkills.length > 0)
    ? finalResume.coreSkills
    : (finalResume?.skillsAndTools && finalResume.skillsAndTools.length > 0)
    ? finalResume.skillsAndTools
    : userInput.highlightSkills
    ? userInput.highlightSkills.split(/[,，\n]/).filter(Boolean)
    : ['JavaScript / TypeScript', 'React / Next.js', 'Node.js', 'Tailwind CSS', 'Git'];

  const edu = finalResume?.education || {
    school: '清华大学',
    degree: '本科',
    period: '2023.09 - 2027.06'
  };

  const avatarUrl = finalResume?.personalInfo?.avatarUrl || userInput.avatarUrl || '';

  const newSchema = JSON.parse(JSON.stringify(currentSchema)) as IHJSchema;
  const page = newSchema.componentsTree[0];
  if (!page || !page.children) return newSchema;

  const usedWidgetIds = new Set<string>();
  const markUsed = (w: IWidget) => { usedWidgetIds.add(w.id); };
  const isUnused = (w: IWidget) => !usedWidgetIds.has(w.id);

  // 1. Avatar Widget
  page.children.filter(isUnused).forEach((widget) => {
    const title = (widget.title || '').toLowerCase();
    const id = (widget.id || '').toLowerCase();
    const compName = (widget.componentName || '').toLowerCase();
    if (compName.includes('avatar') || title.includes('头像') || id.includes('avatar')) {
      widget.dataSource.avatarSrc = avatarUrl || '';
      markUsed(widget);
    }
  });

  // 2. Name Widget
  page.children.filter(isUnused).forEach((widget) => {
    const title = (widget.title || '').toLowerCase();
    const id = (widget.id || '').toLowerCase();
    const currentText = typeof widget.dataSource?.text === 'string' ? widget.dataSource.text : '';

    if (title.includes('姓名') || id.includes('name')) {
      if (title.includes('意向') || currentText.includes('·') || currentText.includes('设计师') || currentText.includes('工程师')) {
        widget.dataSource.text = `${name} · ${jobIntent}`;
      } else {
        widget.dataSource.text = name;
      }
      markUsed(widget);
    }
  });

  // 3. Job Intent Widget
  page.children.filter(isUnused).forEach((widget) => {
    const title = (widget.title || '').toLowerCase();
    const id = (widget.id || '').toLowerCase();
    const currentText = typeof widget.dataSource?.text === 'string' ? widget.dataSource.text : '';

    if (title.includes('意向') || id.includes('intent')) {
      if (currentText.startsWith('🎯') || currentText.includes('🎯')) {
        widget.dataSource.text = `🎯 意向：${jobIntent}`;
      } else if (currentText.startsWith('意向') || currentText.startsWith('求职意向')) {
        widget.dataSource.text = `求职意向：${jobIntent}`;
      } else {
        widget.dataSource.text = jobIntent;
      }
      markUsed(widget);
    }
  });

  // 4. Contact / Basic Info Widget
  page.children.filter(isUnused).forEach((widget) => {
    const title = (widget.title || '').toLowerCase();
    const id = (widget.id || '').toLowerCase();
    const currentText = typeof widget.dataSource?.text === 'string' ? widget.dataSource.text : '';

    if (title.includes('联系') || title.includes('基本信息') || id.includes('contact')) {
      if (currentText.includes('🏫') || currentText.includes('📞') || currentText.includes('✉️')) {
        widget.dataSource.text = `🏫 院校：${edu.school}\n📞 电话：${phone}\n✉️ 邮箱：${email}\n📍 城市：${location}`;
      } else if (currentText.includes('cat profile.json')) {
        widget.dataSource.text = `$ cat profile.json | grep --intent="${jobIntent}"`;
      } else if (currentText.includes('\n')) {
        widget.dataSource.text = `✉️ ${email}\n📱 ${phone}\n📍 ${location}`;
      } else {
        widget.dataSource.text = `${email}  |  ${phone}  |  ${location}`;
      }
      markUsed(widget);
    }
  });

  // 5. Summary / Profile Widget
  page.children.filter(isUnused).forEach((widget) => {
    const title = (widget.title || '').toLowerCase();
    const id = (widget.id || '').toLowerCase();
    const currentText = typeof widget.dataSource?.text === 'string' ? widget.dataSource.text : '';

    if (
      (title.includes('自我评价') ||
      title.includes('个人优势') ||
      title.includes('职业摘要') ||
      title.includes('summary') ||
      title.includes('profile') ||
      id.includes('summary') ||
      id.includes('profile')) &&
      !title.includes('标题') &&
      !title.includes('线') &&
      !id.includes('line')
    ) {
      const cardWidth = widget.css.width || 740;
      const fontSz = widget.css.fontSize || 12.5;
      const sumH = calculateSummaryHeight(summary, cardWidth, fontSz, 20);
      widget.css.height = Math.min(220, Math.max(35, sumH));
      widget.dataSource.text = currentText.includes('【自我评价】') ? `【自我评价】\n${summary}` : summary;
      markUsed(widget);
    }
  });

  // 6. Work Experience Widgets
  const workCandidates = page.children.filter(isUnused).filter((widget) => {
    const title = (widget.title || '').toLowerCase();
    const id = (widget.id || '').toLowerCase();
    const compName = (widget.componentName || '').toLowerCase();

    return (
      !title.includes('标题') &&
      !title.includes('线') &&
      !title.includes('项目') &&
      !title.includes('教育') &&
      !id.includes('line') &&
      !id.includes('title') &&
      (compName.includes('exper') || id.includes('work') || title.includes('经历卡片') || title.includes('工作'))
    );
  });

  workCandidates.forEach((widget, idx) => {
    if (idx < workList.length) {
      const w = workList[idx];
      const formattedBullets = w.bullets.map((b) => (b.trim().startsWith('•') || b.trim().startsWith('1.') || b.trim().startsWith('2.')) ? b : `• ${b}`).join('\n');
      const cardWidth = widget.css.width || 740;
      const fontSz = widget.css.fontSize || 12.5;
      const cardH = calculateCardHeight(w.company, w.role, w.period, w.bullets, cardWidth, fontSz, 20);

      widget.css.height = Math.max(65, cardH);
      widget.dataSource.companyName = w.company;
      widget.dataSource.jobTitle = w.role;
      widget.dataSource.workTime = w.period;
      widget.dataSource.workContent = formattedBullets;
      widget.dataSource.text = `${w.company} · ${w.role}\n${formattedBullets}`;
      markUsed(widget);
    }
  });

  if (workList.length > workCandidates.length && workCandidates.length > 0) {
    const templateWidget = workCandidates[workCandidates.length - 1];
    const insertIdx = page.children.indexOf(templateWidget);

    for (let idx = workCandidates.length; idx < workList.length; idx++) {
      const w = workList[idx];
      const formattedBullets = w.bullets.map((b) => (b.trim().startsWith('•') || b.trim().startsWith('1.') || b.trim().startsWith('2.')) ? b : `• ${b}`).join('\n');
      const cardWidth = templateWidget.css.width || 740;
      const fontSz = templateWidget.css.fontSize || 12.5;
      const cardH = calculateCardHeight(w.company, w.role, w.period, w.bullets, cardWidth, fontSz, 20);

      const extraWidget: IWidget = JSON.parse(JSON.stringify(templateWidget));
      extraWidget.id = `widget-work-extra-${idx}-${Date.now()}`;
      extraWidget.title = `工作 ${idx + 1}`;
      extraWidget.css.top = (Number(templateWidget.css.top) || 0) + (idx - workCandidates.length + 1) * 0.1;
      extraWidget.css.height = Math.max(65, cardH);
      extraWidget.dataSource.companyName = w.company;
      extraWidget.dataSource.jobTitle = w.role;
      extraWidget.dataSource.workTime = w.period;
      extraWidget.dataSource.workContent = formattedBullets;
      extraWidget.dataSource.text = `${w.company} · ${w.role}\n${formattedBullets}`;

      page.children.splice(insertIdx + 1 + (idx - workCandidates.length), 0, extraWidget);
      markUsed(extraWidget);
    }
  }

  // 7. Project Experience Widgets
  const projectCandidates = page.children.filter(isUnused).filter((widget) => {
    const title = (widget.title || '').toLowerCase();
    const id = (widget.id || '').toLowerCase();
    const compName = (widget.componentName || '').toLowerCase();

    return (
      !title.includes('标题') &&
      !title.includes('线') &&
      !id.includes('line') &&
      !id.includes('title') &&
      (compName.includes('exper') || id.includes('project') || title.includes('项目卡片') || title.includes('项目 1') || title.includes('项目 2'))
    );
  });

  projectCandidates.forEach((widget, idx) => {
    if (idx < projectList.length) {
      const p = projectList[idx];
      const formattedBullets = p.bullets.map((b) => (b.trim().startsWith('•') || b.trim().startsWith('1.') || b.trim().startsWith('2.')) ? b : `• ${b}`).join('\n');
      const cardWidth = widget.css.width || 740;
      const fontSz = widget.css.fontSize || 12.5;
      const cardH = calculateCardHeight(p.name, p.role, p.period, p.bullets, cardWidth, fontSz, 20);

      widget.css.height = Math.max(65, cardH);
      widget.dataSource.companyName = p.name;
      widget.dataSource.jobTitle = p.role;
      widget.dataSource.workTime = p.period;
      widget.dataSource.workContent = formattedBullets;
      widget.dataSource.text = `${p.name} · ${p.role}\n${formattedBullets}`;
      markUsed(widget);
    }
  });

  if (projectList.length > projectCandidates.length && projectCandidates.length > 0) {
    const templateWidget = projectCandidates[projectCandidates.length - 1];
    const insertIdx = page.children.indexOf(templateWidget);

    for (let idx = projectCandidates.length; idx < projectList.length; idx++) {
      const p = projectList[idx];
      const formattedBullets = p.bullets.map((b) => (b.trim().startsWith('•') || b.trim().startsWith('1.') || b.trim().startsWith('2.')) ? b : `• ${b}`).join('\n');
      const cardWidth = templateWidget.css.width || 740;
      const fontSz = templateWidget.css.fontSize || 12.5;
      const cardH = calculateCardHeight(p.name, p.role, p.period, p.bullets, cardWidth, fontSz, 20);

      const extraWidget: IWidget = JSON.parse(JSON.stringify(templateWidget));
      extraWidget.id = `widget-project-extra-${idx}-${Date.now()}`;
      extraWidget.title = `项目 ${idx + 1}`;
      extraWidget.css.top = (Number(templateWidget.css.top) || 0) + (idx - projectCandidates.length + 1) * 0.1;
      extraWidget.css.height = Math.max(65, cardH);
      extraWidget.dataSource.companyName = p.name;
      extraWidget.dataSource.jobTitle = p.role;
      extraWidget.dataSource.workTime = p.period;
      extraWidget.dataSource.workContent = formattedBullets;
      extraWidget.dataSource.text = `${p.name} · ${p.role}\n${formattedBullets}`;

      page.children.splice(insertIdx + 1 + (idx - projectCandidates.length), 0, extraWidget);
      markUsed(extraWidget);
    }
  }

  // 8. Education Widget
  page.children.filter(isUnused).forEach((widget) => {
    const title = (widget.title || '').toLowerCase();
    const id = (widget.id || '').toLowerCase();
    const compName = (widget.componentName || '').toLowerCase();

    if ((title.includes('教育') || id.includes('edu')) && !title.includes('标题')) {
      if (compName.includes('exper')) {
        widget.dataSource.companyName = edu.school;
        widget.dataSource.jobTitle = `${edu.degree} · ${edu.period}`;
        widget.dataSource.workTime = edu.period;
        widget.dataSource.workContent = `专业课程与研究成果`;
      } else {
        widget.dataSource.text = `${edu.school}  ·  ${edu.degree}  (${edu.period})`;
      }
      markUsed(widget);
    }
  });

  // 9. Skills & Tools Widget
  const skillWidgets = page.children.filter(isUnused).filter((widget) => {
    const title = (widget.title || '').toLowerCase();
    const id = (widget.id || '').toLowerCase();
    return (title.includes('技能') || title.includes('工具') || id.includes('skill')) && !title.includes('标题') && !title.includes('分割线');
  });

  if (skillWidgets.length === 1) {
    const widget = skillWidgets[0];
    const currentText = typeof widget.dataSource?.text === 'string' ? widget.dataSource.text : '';
    const formattedSkills = currentText.includes('•')
      ? skills.map((s) => `• ${s}`).join('\n')
      : skills.join('  ·  ');

    widget.dataSource.text = formattedSkills;
    const fontSz = widget.css.fontSize || 12;
    const wWidth = widget.css.width || 740;
    const calcH = calculateSummaryHeight(formattedSkills, wWidth, fontSz, 20);
    widget.css.height = Math.max(26, calcH);
    markUsed(widget);
  } else if (skillWidgets.length > 1) {
    skillWidgets.forEach((widget, sIdx) => {
      const sk = skills[sIdx] || skills[sIdx % skills.length] || '';
      widget.dataSource.text = sk;
      if (widget.css.width && widget.css.width < 350) {
        widget.css.width = Math.max(65, Math.min(260, Math.ceil(sk.length * 11 + 22)));
        widget.css.height = 24;
      }
      markUsed(widget);
    });
  }

  // Clean remaining unused text placeholders containing sample names to prevent ghost text
  page.children.filter(isUnused).forEach((widget) => {
    const currentText = typeof widget.dataSource?.text === 'string' ? widget.dataSource.text : '';
    if (currentText) {
      let updatedText = currentText;
      if (updatedText.includes('陈晨')) updatedText = updatedText.replace(/陈晨/g, name);
      if (updatedText.includes('张伟')) updatedText = updatedText.replace(/张伟/g, name);
      if (updatedText.includes('chenchen@design.com')) updatedText = updatedText.replace(/chenchen@design.com/g, email);
      if (updatedText.includes('137-0000-1111')) updatedText = updatedText.replace(/137-0000-1111/g, phone);

      if (updatedText !== currentText) {
        widget.dataSource.text = updatedText;
        markUsed(widget);
      }
    }
  });

  // Clamp right edge boundary for all widgets so no element spills past 780px
  page.children.forEach((widget) => {
    const wLeft = Number(widget.css.left) || 30;
    const wWidth = Number(widget.css.width) || 200;
    if (wLeft + wWidth > 780) {
      widget.css.width = Math.max(80, 780 - wLeft);
    }
  });

  // =========================================================================
  // SMART 2D BOUNDING-BOX COLLISION & FLOW CASCADE (Prevent Overlapping Elements)
  // =========================================================================
  const isBackgroundWidget = (w: IWidget) => {
    const id = (w.id || '').toLowerCase();
    const title = (w.title || '').toLowerCase();
    const zIndex = Number(w.css.zIndex) || 1;
    const h = Number(w.css.height) || 0;

    return (
      id.includes('sidebar-bg') ||
      id.includes('banner-bg') ||
      id.includes('card-bg') ||
      title.includes('背景框') ||
      title.includes('底色框') ||
      (zIndex <= 1 && h >= 300)
    );
  };

  // Sort foreground widgets topologically by original top, then left
  const foregroundWidgets = page.children
    .filter((w) => !isBackgroundWidget(w))
    .sort((a, b) => {
      const topA = Number(a.css.top) || 0;
      const topB = Number(b.css.top) || 0;
      if (Math.abs(topA - topB) > 4) return topA - topB;
      return (Number(a.css.left) || 0) - (Number(b.css.left) || 0);
    });

  let maxCanvasBottom = 1160;

  for (let i = 0; i < foregroundWidgets.length; i++) {
    const curr = foregroundWidgets[i];
    const currLeft = Number(curr.css.left) || 0;
    const currWidth = Number(curr.css.width) || 200;
    let currTop = Number(curr.css.top) || 0;

    for (let j = 0; j < i; j++) {
      const prev = foregroundWidgets[j];
      const prevLeft = Number(prev.css.left) || 0;
      const prevWidth = Number(prev.css.width) || 200;
      const prevTop = Number(prev.css.top) || 0;
      const prevHeight = Number(prev.css.height) || 30;
      const prevBottom = prevTop + prevHeight;

      // Check horizontal overlap with 4px tolerance
      const hasHorizontalOverlap = Math.max(currLeft, prevLeft) < Math.min(currLeft + currWidth, prevLeft + prevWidth) - 4;

      if (hasHorizontalOverlap) {
        const minGap = 8;
        if (prevBottom + minGap > currTop) {
          currTop = Math.ceil(prevBottom + minGap);
        }
      }
    }

    curr.css.top = currTop;

    const currBottom = currTop + (Number(curr.css.height) || 30);
    if (currBottom > maxCanvasBottom) {
      maxCanvasBottom = currBottom;
    }
  }

  // Dynamically expand background containers to fit all enclosed widgets
  page.children.filter(isBackgroundWidget).forEach((bg) => {
    const bgLeft = Number(bg.css.left) || 0;
    const bgWidth = Number(bg.css.width) || 200;
    let maxChildBottom = (Number(bg.css.top) || 0) + 100;

    foregroundWidgets.forEach((w) => {
      const wLeft = Number(w.css.left) || 0;
      const wWidth = Number(w.css.width) || 50;
      const wBottom = (Number(w.css.top) || 0) + (Number(w.css.height) || 30);

      // If widget falls within the horizontal corridor of the background container
      if (wLeft >= bgLeft - 10 && wLeft + wWidth <= bgLeft + bgWidth + 10) {
        if (wBottom + 25 > maxChildBottom) {
          maxChildBottom = wBottom + 25;
        }
      }
    });

    bg.css.height = Math.max(Number(bg.css.height) || 100, Math.ceil(maxChildBottom - (Number(bg.css.top) || 0)));
  });

  newSchema.css.height = Math.max(1160, Math.ceil(maxCanvasBottom + 50));

  return newSchema;
}

export function buildLegoSchemaFromResume(
  userInput: UserInput,
  analysisResult?: AnalysisResult | null,
  templateId: TemplateId = 'modern-sidebar',
  options: TemplateOptions = DEFAULT_TEMPLATE_OPTIONS,
  _customTemplateHTML?: string
): IHJSchema {
  const finalResume = analysisResult?.finalResume;

  const name = finalResume?.personalInfo?.name || '求职者';
  const jobIntent = finalResume?.jobIntent || userInput.targetRole || '软件工程师';
  const email = finalResume?.personalInfo?.email || 'user@example.com';
  const phone = finalResume?.personalInfo?.phone || '138-0000-0000';
  const location = finalResume?.personalInfo?.location || '北京';

  const summary =
    finalResume?.summary ||
    userInput.additionalInfo ||
    '具备扎实的专业基础与丰富的项目实践经验，善于解决复杂工程难题，注重团队协同与效率产出。';

  const workList = finalResume?.workExperience && finalResume.workExperience.length > 0
    ? finalResume.workExperience
    : [
        {
          company: '科技创新有限公司',
          role: jobIntent,
          period: '2022.03 - 至今',
          bullets: [
            '主导核心模块架构重构，提升业务处理吞吐量超过 35%。',
            '跨团队协同推进项目落地，保障上线按时交付率达到 98%。'
          ]
        }
      ];

  const projectList = finalResume?.projectExperience && finalResume.projectExperience.length > 0
    ? finalResume.projectExperience
    : [
        {
          name: '高并发业务中台升级',
          role: '核心研发工程师',
          period: '2023.01 - 2023.08',
          bullets: [
            '设计实现分布缓存方案，压测 QPS 提升至 10,000+。',
            '编写自动化测试套件，降低测试缺陷遗留率 40%。'
          ]
        }
      ];

  const skills = (finalResume?.coreSkills && finalResume.coreSkills.length > 0)
    ? finalResume.coreSkills
    : (finalResume?.skillsAndTools && finalResume.skillsAndTools.length > 0)
    ? finalResume.skillsAndTools
    : userInput.highlightSkills
    ? userInput.highlightSkills.split(/[,，\n]/).filter(Boolean)
    : ['JavaScript / TypeScript', 'React / Next.js', 'Node.js', 'Tailwind CSS', 'Git'];

  const edu = finalResume?.education || {
    school: '清华大学',
    degree: '本科',
    period: '2023.09 - 2027.06'
  };


  const avatarUrl = finalResume?.personalInfo?.avatarUrl || userInput.avatarUrl || '';
  const hasAvatar = Boolean(avatarUrl);

  const themeColor = options.themeColor || '#1e3a8a';
  const isCircleAvatar = options.avatarShape === 'circle';
  const avatarWidth = isCircleAvatar ? 85 : 95;
  const avatarHeight = isCircleAvatar ? 85 : 120;
  const avatarRadius = isCircleAvatar ? 50 : 4;

  const children: IWidget[] = [];
  let currentTop = 40;

  const effectiveTemplateId = resolveEffectiveTemplateId(templateId, _customTemplateHTML);

  // -------------------------------------------------------------
  // LAYOUT 1: Double Column Left Sidebar (1.3 简历 / 现代双栏型)
  // -------------------------------------------------------------
  if (effectiveTemplateId === 'modern-sidebar') {
    // Left Sidebar Background
    children.push({
      id: 'widget-sidebar-bg',
      componentName: 'hj-rectangle',
      title: '左侧边栏背景框',
      css: {
        left: 20,
        top: 20,
        width: 250,
        height: 1100,
        zIndex: 1,
        backgroundColor: '#f1f5f9',
        borderColor: '#cbd5e1',
        borderStyle: 'solid',
        borderWidth: 1,
        borderRadius: 8,
        padding: { top: 0, right: 0, bottom: 0, left: 0 }
      },
      dataSource: {}
    });

    if (hasAvatar) {
      children.push({
        id: 'widget-avatar-sidebar',
        componentName: 'hj-avatar-1',
        title: '个人头像照片',
        css: {
          left: isCircleAvatar ? 102 : 97,
          top: 40,
          width: avatarWidth,
          height: avatarHeight,
          zIndex: 2,
          backgroundColor: '#e2e8f0',
          borderWidth: 1,
          borderColor: '#cbd5e1',
          borderStyle: 'solid',
          borderRadius: avatarRadius
        },
        dataSource: { avatarSrc: avatarUrl }
      });
    }

    const nameTop = hasAvatar ? (isCircleAvatar ? 140 : 175) : 45;

    // Name
    children.push({
      id: 'widget-name-sidebar',
      componentName: 'hj-text-1',
      title: '姓名',
      css: {
        left: 30,
        top: nameTop,
        width: 230,
        height: 38,
        zIndex: 2,
        fontColor: '#0f172a',
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center'
      },
      dataSource: { text: name }
    });

    // Intent
    children.push({
      id: 'widget-intent-sidebar',
      componentName: 'hj-text-1',
      title: '求职意向',
      css: {
        left: 30,
        top: nameTop + 40,
        width: 230,
        height: 30,
        zIndex: 2,
        fontColor: themeColor,
        fontSize: 13,
        fontWeight: '600',
        textAlign: 'center'
      },
      dataSource: { text: `🎯 意向：${jobIntent}` }
    });

    // Contact Card
    children.push({
      id: 'widget-contact-bg-sidebar',
      componentName: 'hj-rectangle',
      title: '基本信息框',
      css: {
        left: 30,
        top: nameTop + 78,
        width: 230,
        height: 145,
        zIndex: 2,
        backgroundColor: '#ffffff',
        borderColor: '#cbd5e1',
        borderStyle: 'solid',
        borderWidth: 1,
        borderRadius: 6,
        padding: { top: 10, right: 12, bottom: 10, left: 12 }
      },
      dataSource: {}
    });

    children.push({
      id: 'widget-contact-sidebar-text',
      componentName: 'hj-text-1',
      title: '基本信息列表',
      css: {
        left: 42,
        top: nameTop + 88,
        width: 206,
        height: 125,
        zIndex: 3,
        fontColor: '#334155',
        fontSize: 12,
        lineHeight: 1.6
      },
      dataSource: {
        text: `🏫 院校：${edu.school}\n📞 电话：${phone}\n✉️ 邮箱：${email}\n📍 城市：${location}`
      }
    });

    const summaryH = Math.min(260, calculateSummaryHeight(summary, 206, 11.5, 18));

    // Summary Card
    children.push({
      id: 'widget-summary-sidebar-bg',
      componentName: 'hj-rectangle',
      title: '自我评价框',
      css: {
        left: 30,
        top: nameTop + 235,
        width: 230,
        height: summaryH + 20,
        zIndex: 2,
        backgroundColor: '#ffffff',
        borderColor: '#cbd5e1',
        borderStyle: 'solid',
        borderWidth: 1,
        borderRadius: 6,
        padding: { top: 10, right: 12, bottom: 10, left: 12 }
      },
      dataSource: {}
    });

    children.push({
      id: 'widget-summary-sidebar-text',
      componentName: 'hj-text-1',
      title: '自我评价内容',
      css: {
        left: 42,
        top: nameTop + 245,
        width: 206,
        height: summaryH,
        zIndex: 3,
        fontColor: '#475569',
        fontSize: 11.5,
        lineHeight: 1.65
      },
      dataSource: { text: `【自我评价】\n${summary}` }
    });

    // ---------------- Right Main Column ----------------
    let rightTop = 30;

    // Education Header & Card
    children.push({
      id: 'widget-edu-title-main',
      componentName: 'hj-text-1',
      title: '教育背景标题',
      css: {
        left: 290,
        top: rightTop,
        width: 500,
        height: 30,
        zIndex: 2,
        fontColor: themeColor,
        fontSize: 15,
        fontWeight: 'bold'
      },
      dataSource: { text: '| 教育背景' }
    });

    children.push({
      id: 'widget-edu-content-main',
      componentName: 'hj-text-1',
      title: '教育背景内容',
      css: {
        left: 290,
        top: rightTop + 32,
        width: 500,
        height: 40,
        zIndex: 2,
        fontColor: '#334155',
        fontSize: 13
      },
      dataSource: { text: `${edu.school} · ${edu.degree}  (${edu.period})` }
    });

    rightTop += 85;

    // Work Experience Header & Cards
    children.push({
      id: 'widget-work-title-main',
      componentName: 'hj-text-1',
      title: '工作经历标题',
      css: {
        left: 290,
        top: rightTop,
        width: 500,
        height: 30,
        zIndex: 2,
        fontColor: themeColor,
        fontSize: 15,
        fontWeight: 'bold'
      },
      dataSource: { text: '| 工作与校园经历' }
    });

    rightTop += 34;

    workList.forEach((w, idx) => {
      const formattedBullets = w.bullets.map((b) => (b.trim().startsWith('•') ? b : `• ${b}`)).join('\n');
      const cardHeight = calculateCardHeight(w.company, w.role, w.period, w.bullets, 500, 12.5, 20);
      children.push({
        id: `widget-work-card-${idx}`,
        componentName: 'hj-[#exper-1]',
        title: `经历卡片 ${idx + 1}`,
        css: {
          left: 290,
          top: rightTop,
          width: 500,
          height: cardHeight,
          zIndex: 2,
          backgroundColor: '#ffffff',
          borderColor: '#e2e8f0',
          borderWidth: 1,
          borderStyle: 'solid',
          borderRadius: 6
        },
        dataSource: {
          companyName: w.company,
          jobTitle: w.role,
          workTime: w.period,
          workContent: formattedBullets,
          text: `${w.company} · ${w.role}\n${formattedBullets}`
        }
      });
      rightTop += cardHeight + 14;
    });

    rightTop += 10;

    // Project Experience Header & Cards
    children.push({
      id: 'widget-project-title-main',
      componentName: 'hj-text-1',
      title: '项目经历标题',
      css: {
        left: 290,
        top: rightTop,
        width: 500,
        height: 30,
        zIndex: 2,
        fontColor: themeColor,
        fontSize: 15,
        fontWeight: 'bold'
      },
      dataSource: { text: '| 项目经历' }
    });

    rightTop += 34;

    projectList.forEach((p, idx) => {
      const formattedBullets = p.bullets.map((b) => (b.trim().startsWith('•') ? b : `• ${b}`)).join('\n');
      const cardHeight = calculateCardHeight(p.name, p.role, p.period, p.bullets, 500, 12.5, 20);
      children.push({
        id: `widget-project-card-${idx}`,
        componentName: 'hj-[#exper-1]',
        title: `项目卡片 ${idx + 1}`,
        css: {
          left: 290,
          top: rightTop,
          width: 500,
          height: cardHeight,
          zIndex: 2,
          backgroundColor: '#ffffff',
          borderColor: '#e2e8f0',
          borderWidth: 1,
          borderStyle: 'solid',
          borderRadius: 6
        },
        dataSource: {
          companyName: p.name,
          jobTitle: p.role,
          workTime: p.period,
          workContent: formattedBullets,
          text: `${p.name} · ${p.role}\n${formattedBullets}`
        }
      });
      rightTop += cardHeight + 14;
    });

    rightTop += 10;

    // Skills
    children.push({
      id: 'widget-skills-title-main',
      componentName: 'hj-text-1',
      title: '技能与荣誉标题',
      css: {
        left: 290,
        top: rightTop,
        width: 500,
        height: 30,
        zIndex: 2,
        fontColor: themeColor,
        fontSize: 15,
        fontWeight: 'bold'
      },
      dataSource: { text: '| 核心能力与技能工具' }
    });

    children.push({
      id: 'widget-skills-content-main',
      componentName: 'hj-text-1',
      title: '技能工具清单',
      css: {
        left: 290,
        top: rightTop + 34,
        width: 500,
        height: 70,
        zIndex: 2,
        fontColor: '#334155',
        fontSize: 12.5,
        lineHeight: 1.6
      },
      dataSource: { text: skills.join('  ·  ') }
    });

    currentTop = Math.max(1120, rightTop + 100);

    const sidebarBg = children.find((c) => c.id === 'widget-sidebar-bg');
    if (sidebarBg) {
      sidebarBg.css.height = Math.max(1100, currentTop - 40);
    }

    return {
      id: `lego-resume-sidebar-${Date.now()}`,
      version: '1.0.0',
      componentsTree: [{ id: 'page-1', componentName: 'page', commentType: 'page', children }],
      css: { width: 820, height: currentTop, background: '#ffffff', opacity: 1, fontFamily: 'Inter, sans-serif', themeColor },
      config: { title: `${name} 的【1.3 双栏侧边栏】积木简历` }
    };
  }

  // -------------------------------------------------------------
  // LAYOUT 2: Corporate Banner (商务 Header 沉稳范)
  // -------------------------------------------------------------
  if (effectiveTemplateId === 'corporate-banner') {
    // Dark Top Banner
    children.push({
      id: 'widget-banner-bg',
      componentName: 'hj-rectangle',
      title: '顶部商务 Banner 框',
      css: {
        left: 25,
        top: 25,
        width: 770,
        height: 145,
        zIndex: 1,
        backgroundColor: themeColor,
        borderColor: themeColor,
        borderStyle: 'solid',
        borderWidth: 1,
        borderRadius: 10,
        padding: { top: 0, right: 0, bottom: 0, left: 0 }
      },
      dataSource: {}
    });

    if (hasAvatar) {
      children.push({
        id: 'widget-banner-avatar',
        componentName: 'hj-avatar-1',
        title: '个人头像照片',
        css: {
          left: 660,
          top: 35,
          width: avatarWidth,
          height: avatarHeight,
          zIndex: 2,
          backgroundColor: '#e2e8f0',
          borderWidth: 2,
          borderColor: '#ffffff',
          borderStyle: 'solid',
          borderRadius: avatarRadius
        },
        dataSource: { avatarSrc: avatarUrl }
      });
    }

    const bannerTextWidth = hasAvatar ? 600 : 700;

    children.push({
      id: 'widget-banner-name',
      componentName: 'hj-text-1',
      title: '姓名',
      css: {
        left: 50,
        top: 45,
        width: bannerTextWidth,
        height: 38,
        zIndex: 2,
        fontColor: '#ffffff',
        fontSize: 26,
        fontWeight: 'bold'
      },
      dataSource: { text: name }
    });

    children.push({
      id: 'widget-banner-contact',
      componentName: 'hj-text-1',
      title: '意向与联系方式',
      css: {
        left: 50,
        top: 88,
        width: bannerTextWidth,
        height: 60,
        zIndex: 2,
        fontColor: '#bfdbfe',
        fontSize: 13,
        lineHeight: 1.6
      },
      dataSource: { text: `求职意向：${jobIntent}\n${email}  |  ${phone}  |  ${location}` }
    });

    let topPos = 190;

    // 1. Summary
    children.push({
      id: 'widget-corp-summary-title',
      componentName: 'hj-text-1',
      title: '职业摘要标题',
      css: { left: 30, top: topPos, width: 760, height: 30, zIndex: 2, fontColor: themeColor, fontSize: 16, fontWeight: 'bold' },
      dataSource: { text: '📌 职业摘要' }
    });
    topPos += 32;

    const sumH = calculateSummaryHeight(summary, 760, 13, 21);
    children.push({
      id: 'widget-corp-summary-content',
      componentName: 'hj-text-1',
      title: '职业摘要内容',
      css: { left: 30, top: topPos, width: 760, height: sumH, zIndex: 2, fontColor: '#334155', fontSize: 13, lineHeight: 1.6 },
      dataSource: { text: summary }
    });
    topPos += sumH + 20;

    // 2. Core Skills
    children.push({
      id: 'widget-corp-skills-title',
      componentName: 'hj-text-1',
      title: '核心能力标题',
      css: { left: 30, top: topPos, width: 760, height: 30, zIndex: 2, fontColor: themeColor, fontSize: 16, fontWeight: 'bold' },
      dataSource: { text: '⚡ 核心能力与技能工具' }
    });
    topPos += 34;

    let skillX = 30;
    let skillY = topPos;
    skills.forEach((sk, sIdx) => {
      const maxAllowedTagW = 720;
      const tagW = Math.min(maxAllowedTagW, Math.max(75, Math.ceil(sk.length * 9.5 + 20)));
      if (skillX > 30 && skillX + tagW > 770) {
        skillX = 30;
        skillY += 32;
      }
      children.push({
        id: `widget-corp-skill-${sIdx}`,
        componentName: 'hj-rectangle',
        title: `技能标签 ${sIdx + 1}`,
        css: {
          left: skillX,
          top: skillY,
          width: tagW,
          height: 26,
          zIndex: 2,
          backgroundColor: '#eff6ff',
          borderColor: '#bfdbfe',
          borderWidth: 1,
          borderStyle: 'solid',
          borderRadius: 14,
          fontColor: themeColor,
          fontSize: 11.5,
          fontWeight: '500',
          textAlign: 'center'
        },
        dataSource: { text: sk }
      });
      skillX += tagW + 8;
    });
    topPos = skillY + 42;

    // 3. Work Experience
    children.push({
      id: 'widget-corp-work-title',
      componentName: 'hj-text-1',
      title: '工作经历标题',
      css: { left: 30, top: topPos, width: 760, height: 30, zIndex: 2, fontColor: themeColor, fontSize: 16, fontWeight: 'bold' },
      dataSource: { text: '💼 工作与校园经历' }
    });
    topPos += 34;

    workList.forEach((w, idx) => {
      const formattedBullets = w.bullets.map((b) => (b.trim().startsWith('•') ? b : `• ${b}`)).join('\n');
      const cardHeight = calculateCardHeight(w.company, w.role, w.period, w.bullets, 760, 12.5, 20);
      children.push({
        id: `widget-corp-work-${idx}`,
        componentName: 'hj-[#exper-1]',
        title: `工作卡片 ${idx + 1}`,
        css: {
          left: 30,
          top: topPos,
          width: 760,
          height: cardHeight,
          zIndex: 2,
          backgroundColor: '#ffffff',
          borderColor: '#e2e8f0',
          borderWidth: 1,
          borderStyle: 'solid',
          borderRadius: 6
        },
        dataSource: {
          companyName: w.company,
          jobTitle: w.role,
          workTime: w.period,
          workContent: formattedBullets,
          text: `${w.company} · ${w.role}\n${formattedBullets}`
        }
      });
      topPos += cardHeight + 14;
    });
    topPos += 10;

    // 4. Project Experience
    children.push({
      id: 'widget-corp-proj-title',
      componentName: 'hj-text-1',
      title: '项目经历标题',
      css: { left: 30, top: topPos, width: 760, height: 30, zIndex: 2, fontColor: themeColor, fontSize: 16, fontWeight: 'bold' },
      dataSource: { text: '🚀 项目经历' }
    });
    topPos += 34;

    projectList.forEach((p, idx) => {
      const formattedBullets = p.bullets.map((b) => (b.trim().startsWith('•') ? b : `• ${b}`)).join('\n');
      const cardHeight = calculateCardHeight(p.name, p.role, p.period, p.bullets, 760, 12.5, 20);
      children.push({
        id: `widget-corp-proj-${idx}`,
        componentName: 'hj-[#exper-1]',
        title: `项目卡片 ${idx + 1}`,
        css: {
          left: 30,
          top: topPos,
          width: 760,
          height: cardHeight,
          zIndex: 2,
          backgroundColor: '#ffffff',
          borderColor: '#e2e8f0',
          borderWidth: 1,
          borderStyle: 'solid',
          borderRadius: 6
        },
        dataSource: {
          companyName: p.name,
          jobTitle: p.role,
          workTime: p.period,
          workContent: formattedBullets,
          text: `${p.name} · ${p.role}\n${formattedBullets}`
        }
      });
      topPos += cardHeight + 14;
    });
    topPos += 10;

    // 5. Education
    children.push({
      id: 'widget-corp-edu-title',
      componentName: 'hj-text-1',
      title: '教育背景标题',
      css: { left: 30, top: topPos, width: 760, height: 30, zIndex: 2, fontColor: themeColor, fontSize: 16, fontWeight: 'bold' },
      dataSource: { text: '🎓 教育背景' }
    });
    topPos += 34;

    children.push({
      id: 'widget-corp-edu-content',
      componentName: 'hj-text-1',
      title: '教育背景内容',
      css: { left: 30, top: topPos, width: 760, height: 30, zIndex: 2, fontColor: '#334155', fontSize: 13 },
      dataSource: { text: `${edu.school}  ·  ${edu.degree}  ·  ${edu.period}` }
    });
    topPos += 45;

    return {
      id: `lego-resume-corporate-${Date.now()}`,
      version: '1.0.0',
      componentsTree: [{ id: 'page-1', componentName: 'page', commentType: 'page', children }],
      css: {
        width: 820,
        height: Math.max(1160, topPos + 40),
        background: '#ffffff',
        opacity: 1,
        fontFamily: 'Inter, sans-serif',
        themeColor
      },
      config: {
        title: `${name} 的【商务 Header 沉稳范】积木简历`
      }
    };
  }

  // -------------------------------------------------------------
  // LAYOUT 3: Timeline Tech (时间轴极客型 100% 还原)
  // -------------------------------------------------------------
  if (effectiveTemplateId === 'timeline-tech') {
    let topPos = 25;

    // Top Header
    children.push({
      id: 'widget-timeline-name',
      componentName: 'hj-text-1',
      title: '姓名',
      css: {
        left: 30,
        top: topPos,
        width: 760,
        height: 32,
        zIndex: 2,
        fontColor: '#0f172a',
        fontSize: 22,
        fontWeight: 'bold',
        textAlign: 'left'
      },
      dataSource: { text: name }
    });
    topPos += 34;

    children.push({
      id: 'widget-timeline-contact',
      componentName: 'hj-text-1',
      title: '联系方式与意向',
      css: {
        left: 30,
        top: topPos,
        width: 760,
        height: 22,
        zIndex: 2,
        fontColor: '#64748b',
        fontSize: 12,
        textAlign: 'left'
      },
      dataSource: { text: `${email}  |  ${phone}  |  ${location}  |  求职意向：${jobIntent}` }
    });
    topPos += 26;

    // Header Bottom Accent Line
    children.push({
      id: 'widget-timeline-header-line',
      componentName: 'hj-rectangle',
      title: 'Header 下划线',
      css: {
        left: 30,
        top: topPos,
        width: 760,
        height: 2,
        zIndex: 2,
        backgroundColor: themeColor,
        borderWidth: 0
      },
      dataSource: {}
    });
    topPos += 18;

    // Helper for Section Titles
    const addTimelineSectionTitle = (titleText: string, idPrefix: string) => {
      children.push({
        id: `widget-tl-sec-title-${idPrefix}`,
        componentName: 'hj-text-1',
        title: `${titleText}标题`,
        css: {
          left: 30,
          top: topPos,
          width: 760,
          height: 24,
          zIndex: 2,
          fontColor: themeColor,
          fontSize: 13.5,
          fontWeight: 'bold',
          textAlign: 'left'
        },
        dataSource: { text: titleText }
      });
      topPos += 30;
    };

    // 1. Summary
    addTimelineSectionTitle('// 01. 职业摘要', 'summary');
    const sumH = calculateSummaryHeight(summary, 760, 12.5, 20);
    children.push({
      id: 'widget-summary-tl-content',
      componentName: 'hj-text-1',
      title: '职业摘要内容',
      css: {
        left: 30,
        top: topPos,
        width: 760,
        height: sumH,
        zIndex: 2,
        fontColor: '#334155',
        fontSize: 12.5,
        lineHeight: 1.6,
        textAlign: 'left'
      },
      dataSource: { text: summary }
    });
    topPos += sumH + 18;

    // 2. Core Skills
    addTimelineSectionTitle('// 02. 核心能力与技能工具', 'coreskills');
    let skillX = 30;
    let skillY = topPos;
    skills.forEach((sk, sIdx) => {
      const tagW = Math.max(65, Math.min(360, sk.length * 10 + 20));
      if (skillX + tagW > 780) {
        skillX = 30;
        skillY += 30;
      }
      children.push({
        id: `widget-skill-tl-${sIdx}`,
        componentName: 'hj-rectangle',
        title: `技能 ${sIdx + 1}`,
        css: {
          left: skillX,
          top: skillY,
          width: tagW,
          height: 24,
          zIndex: 2,
          backgroundColor: '#f1f5f9',
          borderColor: '#cbd5e1',
          borderWidth: 1,
          borderStyle: 'solid',
          borderRadius: 4,
          fontColor: themeColor,
          fontSize: 11.5,
          textAlign: 'center'
        },
        dataSource: { text: sk }
      });
      skillX += tagW + 8;
    });
    topPos = skillY + 38;

    // 3. Work Experience (With Timeline Line & Dots)
    addTimelineSectionTitle('// 03. 工作经历', 'work');
    const workLineTop = topPos + 4;
    let workCurrentY = topPos;

    workList.forEach((w, idx) => {
      const formattedBullets = w.bullets.map((b) => (b.trim().startsWith('•') ? b : `• ${b}`)).join('\n');
      const cardHeight = calculateCardHeight(w.company, w.role, w.period, w.bullets, 722, 12.5, 20);

      // Circle Node Dot
      children.push({
        id: `widget-tl-dot-work-${idx}`,
        componentName: 'hj-circle',
        title: '时间轴节点',
        css: {
          left: 44.5,
          top: workCurrentY + 6,
          width: 9,
          height: 9,
          zIndex: 3,
          backgroundColor: themeColor
        },
        dataSource: {}
      });

      // Work Card (Indented to left: 68 to NOT overlap with line!)
      children.push({
        id: `widget-work-tl-${idx}`,
        componentName: 'hj-[#exper-1]',
        title: `工作 ${idx + 1}`,
        css: {
          left: 68,
          top: workCurrentY,
          width: 722,
          height: cardHeight,
          zIndex: 2,
          backgroundColor: 'transparent',
          borderColor: 'transparent',
          borderWidth: 0,
          textAlign: 'left'
        },
        dataSource: {
          companyName: w.company,
          jobTitle: w.role,
          workTime: w.period,
          workContent: formattedBullets,
          text: `${w.company} · ${w.role}\n${formattedBullets}`
        }
      });
      workCurrentY += cardHeight + 10;
    });

    // Timeline Line for Work Section Only
    const workLineHeight = Math.max(40, workCurrentY - workLineTop - 10);
    children.push({
      id: 'widget-timeline-line-work',
      componentName: 'hj-rectangle',
      title: '工作经历时间轴线',
      css: {
        left: 48,
        top: workLineTop,
        width: 2,
        height: workLineHeight,
        zIndex: 1,
        backgroundColor: '#cbd5e1',
        borderWidth: 0
      },
      dataSource: {}
    });

    topPos = workCurrentY + 10;

    // 4. Project Experience (With Timeline Line & Dots)
    addTimelineSectionTitle('// 04. 项目经历', 'project');
    const projLineTop = topPos + 4;
    let projCurrentY = topPos;

    projectList.forEach((p, idx) => {
      const formattedBullets = p.bullets.map((b) => (b.trim().startsWith('•') ? b : `• ${b}`)).join('\n');
      const cardHeight = calculateCardHeight(p.name, p.role, p.period, p.bullets, 722, 12.5, 20);

      // Circle Node Dot
      children.push({
        id: `widget-tl-dot-proj-${idx}`,
        componentName: 'hj-circle',
        title: '时间轴节点',
        css: {
          left: 44.5,
          top: projCurrentY + 6,
          width: 9,
          height: 9,
          zIndex: 3,
          backgroundColor: themeColor
        },
        dataSource: {}
      });

      // Project Card (Indented to left: 68)
      children.push({
        id: `widget-project-tl-${idx}`,
        componentName: 'hj-[#exper-1]',
        title: `项目 ${idx + 1}`,
        css: {
          left: 68,
          top: projCurrentY,
          width: 722,
          height: cardHeight,
          zIndex: 2,
          backgroundColor: 'transparent',
          borderColor: 'transparent',
          borderWidth: 0,
          textAlign: 'left'
        },
        dataSource: {
          companyName: p.name,
          jobTitle: p.role,
          workTime: p.period,
          workContent: formattedBullets,
          text: `${p.name} · ${p.role}\n${formattedBullets}`
        }
      });
      projCurrentY += cardHeight + 10;
    });

    // Timeline Line for Project Section Only
    const projLineHeight = Math.max(40, projCurrentY - projLineTop - 10);
    children.push({
      id: 'widget-timeline-line-proj',
      componentName: 'hj-rectangle',
      title: '项目经历时间轴线',
      css: {
        left: 48,
        top: projLineTop,
        width: 2,
        height: projLineHeight,
        zIndex: 1,
        backgroundColor: '#cbd5e1',
        borderWidth: 0
      },
      dataSource: {}
    });

    topPos = projCurrentY + 10;

    // 5. Education
    addTimelineSectionTitle('// 05. 教育背景', 'education');
    children.push({
      id: 'widget-edu-tl-content',
      componentName: 'hj-text-1',
      title: '教育背景信息',
      css: {
        left: 30,
        top: topPos,
        width: 760,
        height: 30,
        zIndex: 2,
        fontColor: '#334155',
        fontSize: 12.5,
        textAlign: 'left'
      },
      dataSource: { text: `${edu.school}  ·  ${edu.degree}  ·  ${edu.period}` }
    });
    topPos += 45;

    return {
      id: `lego-resume-timeline-${Date.now()}`,
      version: '1.0.0',
      componentsTree: [{ id: 'page-1', componentName: 'page', commentType: 'page', children }],
      css: {
        width: 820,
        height: Math.max(1160, topPos + 40),
        background: '#ffffff',
        opacity: 1,
        fontFamily: 'Inter, sans-serif',
        themeColor
      },
      config: {
        title: `${name} 的【时间轴极客型】积木简历`
      }
    };
  }

  // -------------------------------------------------------------
  // LAYOUT 4: Grid Cards (微阴影卡片流)
  // -------------------------------------------------------------
  if (effectiveTemplateId === 'grid-cards') {
    // Header Card
    children.push({
      id: 'widget-grid-header-bg',
      componentName: 'hj-rectangle',
      title: '顶部卡片',
      css: {
        left: 25,
        top: 25,
        width: 770,
        height: 120,
        zIndex: 1,
        backgroundColor: '#f0fdf4',
        borderColor: '#bbf7d0',
        borderStyle: 'solid',
        borderWidth: 1,
        borderRadius: 10
      },
      dataSource: {}
    });

    if (hasAvatar) {
      children.push({
        id: 'widget-grid-avatar',
        componentName: 'hj-avatar-1',
        title: '个人头像照片',
        css: {
          left: 670,
          top: 35,
          width: avatarWidth,
          height: avatarHeight,
          zIndex: 2,
          borderRadius: avatarRadius
        },
        dataSource: { avatarSrc: avatarUrl }
      });
    }

    children.push({
      id: 'widget-grid-name',
      componentName: 'hj-text-1',
      title: '姓名',
      css: {
        left: 45,
        top: 40,
        width: 600,
        height: 36,
        zIndex: 2,
        fontColor: themeColor,
        fontSize: 24,
        fontWeight: 'bold'
      },
      dataSource: { text: name }
    });

    children.push({
      id: 'widget-grid-contact',
      componentName: 'hj-text-1',
      title: '联系方式',
      css: {
        left: 45,
        top: 80,
        width: 600,
        height: 40,
        zIndex: 2,
        fontColor: '#047857',
        fontSize: 12.5
      },
      dataSource: { text: `${email}  |  ${phone}  |  ${location}  |  意向：${jobIntent}` }
    });

    currentTop = 160;
  }

  // -------------------------------------------------------------
  // LAYOUT: Minimal Fresh Green (🌿 简约清新风格 100% 导入 AI 润色简历数据)
  // -------------------------------------------------------------
  if (effectiveTemplateId === 'minimal') {
    let topPos = 35;

    // Header Name & Title
    children.push({
      id: 'widget-name-minimal',
      componentName: 'hj-text-2',
      title: '姓名',
      css: {
        left: 40,
        top: topPos,
        width: 420,
        height: 40,
        zIndex: 2,
        fontColor: '#065f46',
        fontSize: 24,
        fontWeight: 'bold'
      },
      dataSource: { text: `${name} · ${jobIntent}` }
    });

    // Header Contact
    children.push({
      id: 'widget-contact-minimal',
      componentName: 'hj-text-3',
      title: '联系方式',
      css: {
        left: 460,
        top: topPos + 4,
        width: 320,
        height: 36,
        zIndex: 2,
        fontColor: '#4b5563',
        fontSize: 12,
        textAlign: 'right'
      },
      dataSource: { text: `${email} | ${phone} | ${location}` }
    });

    topPos += 48;

    // Mint Green Separator Line
    children.push({
      id: 'widget-divider-minimal',
      componentName: 'hj-other-1',
      title: '分隔线',
      css: {
        left: 40,
        top: topPos,
        width: 740,
        height: 2,
        zIndex: 1,
        backgroundColor: '#059669',
        borderWidth: 0
      },
      dataSource: {}
    });

    topPos += 18;

    // Helper for Section Header in Minimal Style
    const addMinimalSectionTitle = (titleText: string, idPrefix: string) => {
      children.push({
        id: `widget-sec-title-${idPrefix}`,
        componentName: 'hj-text-8',
        title: `${titleText}标题`,
        css: {
          left: 40,
          top: topPos,
          width: 740,
          height: 32,
          zIndex: 2,
          fontColor: '#065f46',
          fontSize: 15,
          fontWeight: 'bold',
          padding: { top: 0, right: 0, bottom: 0, left: 10 },
          borderLeftColor: '#059669',
          borderLeftWidth: 3,
          borderLeftStyle: 'solid'
        },
        dataSource: { text: `▌ ${titleText}` }
      });
      topPos += 38;
    };

    // 1. Profile / Summary
    addMinimalSectionTitle('个人优势 & 核心能力 PROFILE', 'profile');
    const summaryH = calculateSummaryHeight(summary, 740, 13, 20);
    children.push({
      id: 'widget-summary-minimal-content',
      componentName: 'hj-text-6',
      title: '个人优势内容',
      css: {
        left: 40,
        top: topPos,
        width: 740,
        height: summaryH,
        zIndex: 2,
        fontColor: '#374151',
        fontSize: 13,
        lineHeight: 1.7
      },
      dataSource: { text: summary }
    });
    topPos += summaryH + 20;

    // 2. Work Experience
    addMinimalSectionTitle('工作经历 WORK EXPERIENCE', 'work');
    workList.forEach((w, idx) => {
      const formattedBullets = w.bullets.map((b) => (b.trim().startsWith('•') || b.trim().startsWith('1.') || b.trim().startsWith('2.')) ? b : `• ${b}`).join('\n');
      const cardHeight = calculateCardHeight(w.company, w.role, w.period, w.bullets, 740, 13, 20);
      children.push({
        id: `widget-work-minimal-${idx}`,
        componentName: 'hj-[#exper-1]',
        title: `工作经历 ${idx + 1}`,
        css: {
          left: 40,
          top: topPos,
          width: 740,
          height: cardHeight,
          zIndex: 2,
          fontColor: '#374151',
          fontSize: 13,
          lineHeight: 1.6
        },
        dataSource: {
          companyName: w.company,
          jobTitle: w.role,
          workTime: w.period,
          workContent: formattedBullets,
          text: `${w.company} · ${w.role}\n${formattedBullets}`
        }
      });
      topPos += cardHeight + 14;
    });
    topPos += 8;

    // 3. Project Experience
    addMinimalSectionTitle('项目经验 PROJECT EXPERIENCE', 'project');
    projectList.forEach((p, idx) => {
      const formattedBullets = p.bullets.map((b) => (b.trim().startsWith('•') || b.trim().startsWith('1.') || b.trim().startsWith('2.')) ? b : `• ${b}`).join('\n');
      const cardHeight = calculateCardHeight(p.name, p.role, p.period, p.bullets, 740, 13, 20);
      children.push({
        id: `widget-project-minimal-${idx}`,
        componentName: 'hj-[#exper-1]',
        title: `项目经历 ${idx + 1}`,
        css: {
          left: 40,
          top: topPos,
          width: 740,
          height: cardHeight,
          zIndex: 2,
          fontColor: '#374151',
          fontSize: 13,
          lineHeight: 1.6
        },
        dataSource: {
          companyName: p.name,
          jobTitle: p.role,
          workTime: p.period,
          workContent: formattedBullets,
          text: `${p.name} · ${p.role}\n${formattedBullets}`
        }
      });
      topPos += cardHeight + 14;
    });
    topPos += 8;

    // 4. Education
    addMinimalSectionTitle('教育背景 EDUCATION', 'education');
    children.push({
      id: 'widget-edu-minimal-content',
      componentName: 'hj-[#exper-1]',
      title: '教育经历',
      css: {
        left: 40,
        top: topPos,
        width: 740,
        height: 60,
        zIndex: 2,
        fontColor: '#374151',
        fontSize: 13
      },
      dataSource: {
        companyName: edu.school,
        jobTitle: `${edu.degree} · ${edu.period}`,
        workTime: edu.period,
        workContent: `专业学习与研究成果`
      }
    });
    topPos += 75;

    // 5. Skills & Tools
    addMinimalSectionTitle('技能软件 & 工具 SKILLS & TOOLS', 'skills');
    children.push({
      id: 'widget-skills-minimal-content',
      componentName: 'hj-text-6',
      title: '技能详情',
      css: {
        left: 40,
        top: topPos,
        width: 740,
        height: 50,
        zIndex: 2,
        fontColor: '#374151',
        fontSize: 13,
        lineHeight: 1.8
      },
      dataSource: { text: skills.map(s => `• ${s}`).join('\n') }
    });
    topPos += 60;

    return {
      id: `lego-resume-minimal-${Date.now()}`,
      version: '1.0.0',
      componentsTree: [{ id: 'page-1', componentName: 'page', commentType: 'page', children }],
      css: {
        width: 820,
        height: Math.max(1160, topPos + 40),
        background: '#ffffff',
        opacity: 1,
        fontFamily: 'Inter, sans-serif',
        themeColor: '#059669'
      },
      config: {
        title: `${name} 的【简约清新风格】积木简历`
      }
    };
  }

  // -------------------------------------------------------------
  // LAYOUT: Classic Minimal (经典极简单栏 100% 保真还原)
  // -------------------------------------------------------------
  if (effectiveTemplateId === 'classic-minimal') {
    let topPos = 25;

    if (hasAvatar) {
      children.push({
        id: 'widget-avatar-classic',
        componentName: 'hj-avatar-1',
        title: '个人头像',
        css: {
          left: isCircleAvatar ? 367 : 362,
          top: topPos,
          width: isCircleAvatar ? 80 : 85,
          height: isCircleAvatar ? 80 : 105,
          zIndex: 2,
          borderRadius: avatarRadius
        },
        dataSource: { avatarSrc: avatarUrl }
      });
      topPos += isCircleAvatar ? 90 : 115;
    }

    // Centered Name
    children.push({
      id: 'widget-name-classic',
      componentName: 'hj-text-1',
      title: '姓名',
      css: {
        left: 30,
        top: topPos,
        width: 760,
        height: 32,
        zIndex: 2,
        fontColor: themeColor,
        fontSize: 22,
        fontWeight: 'bold',
        textAlign: 'center'
      },
      dataSource: { text: name }
    });
    topPos += 36;

    // Centered Job Intent
    children.push({
      id: 'widget-intent-classic',
      componentName: 'hj-text-1',
      title: '求职意向',
      css: {
        left: 30,
        top: topPos,
        width: 760,
        height: 22,
        zIndex: 2,
        fontColor: '#475569',
        fontSize: 12.5,
        fontWeight: '600',
        textAlign: 'center'
      },
      dataSource: { text: `求职意向：${jobIntent}` }
    });
    topPos += 24;

    // Centered Contact Line
    children.push({
      id: 'widget-contact-classic',
      componentName: 'hj-text-1',
      title: '联系方式',
      css: {
        left: 30,
        top: topPos,
        width: 760,
        height: 22,
        zIndex: 2,
        fontColor: '#64748b',
        fontSize: 12,
        textAlign: 'center'
      },
      dataSource: { text: `${email}  |  ${phone}  |  ${location}` }
    });
    topPos += 28;

    // Header Bottom Accent Line
    children.push({
      id: 'widget-header-border-classic',
      componentName: 'hj-rectangle',
      title: ' Header 底部下划线',
      css: {
        left: 30,
        top: topPos,
        width: 760,
        height: 2,
        zIndex: 2,
        backgroundColor: themeColor,
        borderColor: themeColor,
        borderWidth: 0
      },
      dataSource: {}
    });
    topPos += 16;

    // Helper for Section Titles in Classic Minimal
    const addClassicSectionTitle = (titleText: string, idPrefix: string) => {
      children.push({
        id: `widget-sec-title-${idPrefix}`,
        componentName: 'hj-text-1',
        title: `${titleText}标题`,
        css: {
          left: 30,
          top: topPos,
          width: 760,
          height: 24,
          zIndex: 2,
          fontColor: themeColor,
          fontSize: 13.5,
          fontWeight: 'bold',
          textAlign: 'left'
        },
        dataSource: { text: titleText }
      });
      children.push({
        id: `widget-sec-line-${idPrefix}`,
        componentName: 'hj-rectangle',
        title: `${titleText}分割线`,
        css: {
          left: 30,
          top: topPos + 24,
          width: 760,
          height: 1,
          zIndex: 2,
          backgroundColor: '#cbd5e1',
          borderWidth: 0
        },
        dataSource: {}
      });
      topPos += 32;
    };

    // 1. Summary
    addClassicSectionTitle('职业摘要', 'summary');
    const sumH = calculateSummaryHeight(summary, 760, 12.5, 20);
    children.push({
      id: 'widget-summary-classic-content',
      componentName: 'hj-text-1',
      title: '职业摘要内容',
      css: {
        left: 30,
        top: topPos,
        width: 760,
        height: sumH,
        zIndex: 2,
        fontColor: '#334155',
        fontSize: 12.5,
        lineHeight: 1.6,
        textAlign: 'left'
      },
      dataSource: { text: summary }
    });
    topPos += sumH + 18;

    // 2. Core Skills & Tools
    addClassicSectionTitle('核心能力与专业技能', 'coreskills');
    let skillX = 30;
    let skillY = topPos;
    skills.forEach((sk, sIdx) => {
      const tagW = Math.max(65, Math.min(360, sk.length * 10 + 20));
      if (skillX + tagW > 780) {
        skillX = 30;
        skillY += 30;
      }
      children.push({
        id: `widget-skill-pill-${sIdx}`,
        componentName: 'hj-rectangle',
        title: `技能 ${sIdx + 1}`,
        css: {
          left: skillX,
          top: skillY,
          width: tagW,
          height: 24,
          zIndex: 2,
          backgroundColor: '#f1f5f9',
          borderColor: '#e2e8f0',
          borderWidth: 1,
          borderStyle: 'solid',
          borderRadius: 4,
          fontColor: '#1e293b',
          fontSize: 11.5,
          textAlign: 'center'
        },
        dataSource: { text: sk }
      });
      skillX += tagW + 8;
    });
    topPos = skillY + 38;

    // 3. Work Experience
    addClassicSectionTitle('工作经历', 'work');
    workList.forEach((w, idx) => {
      const formattedBullets = w.bullets.map((b) => (b.trim().startsWith('•') ? b : `• ${b}`)).join('\n');
      const cardHeight = calculateCardHeight(w.company, w.role, w.period, w.bullets, 760, 12.5, 20);
      children.push({
        id: `widget-work-classic-${idx}`,
        componentName: 'hj-[#exper-1]',
        title: `工作 ${idx + 1}`,
        css: {
          left: 30,
          top: topPos,
          width: 760,
          height: cardHeight,
          zIndex: 2,
          backgroundColor: 'transparent',
          borderColor: 'transparent',
          borderWidth: 0,
          textAlign: 'left'
        },
        dataSource: {
          companyName: w.company,
          jobTitle: w.role,
          workTime: w.period,
          workContent: formattedBullets,
          text: `${w.company} · ${w.role}\n${formattedBullets}`
        }
      });
      topPos += cardHeight + 10;
    });

    topPos += 6;

    // 4. Project Experience
    addClassicSectionTitle('项目经历', 'project');
    projectList.forEach((p, idx) => {
      const formattedBullets = p.bullets.map((b) => (b.trim().startsWith('•') ? b : `• ${b}`)).join('\n');
      const cardHeight = calculateCardHeight(p.name, p.role, p.period, p.bullets, 760, 12.5, 20);
      children.push({
        id: `widget-project-classic-${idx}`,
        componentName: 'hj-[#exper-1]',
        title: `项目 ${idx + 1}`,
        css: {
          left: 30,
          top: topPos,
          width: 760,
          height: cardHeight,
          zIndex: 2,
          backgroundColor: 'transparent',
          borderColor: 'transparent',
          borderWidth: 0,
          textAlign: 'left'
        },
        dataSource: {
          companyName: p.name,
          jobTitle: p.role,
          workTime: p.period,
          workContent: formattedBullets,
          text: `${p.name} · ${p.role}\n${formattedBullets}`
        }
      });
      topPos += cardHeight + 10;
    });

    topPos += 6;

    // 5. Education
    addClassicSectionTitle('教育背景', 'education');
    children.push({
      id: 'widget-edu-classic-content',
      componentName: 'hj-text-1',
      title: '教育背景信息',
      css: {
        left: 30,
        top: topPos,
        width: 760,
        height: 30,
        zIndex: 2,
        fontColor: '#334155',
        fontSize: 12.5,
        textAlign: 'left'
      },
      dataSource: { text: `${edu.school}  ·  ${edu.degree}  ·  ${edu.period}` }
    });
    topPos += 45;

    return {
      id: `lego-resume-classic-${Date.now()}`,
      version: '1.0.0',
      componentsTree: [{ id: 'page-1', componentName: 'page', commentType: 'page', children }],
      css: {
        width: 820,
        height: Math.max(1160, topPos + 40),
        background: '#ffffff',
        opacity: 1,
        fontFamily: 'Inter, sans-serif',
        themeColor
      },
      config: {
        title: `${name} 的【经典极简单栏】积木简历`
      }
    };
  }

  // -------------------------------------------------------------
  // LAYOUT 4 / FALLBACK: Github Tech / Default Single Column
  // -------------------------------------------------------------
  let topPos = 25;

  children.push({
    id: `widget-header-bg`,
    componentName: 'hj-rectangle',
    title: '顶部背景框',
    css: {
      left: 30,
      top: topPos,
      width: 760,
      height: 125,
      zIndex: 1,
      backgroundColor: '#0f172a',
      borderColor: '#334155',
      borderStyle: 'solid',
      borderWidth: 1,
      borderRadius: 10
    },
    dataSource: {}
  });

  if (hasAvatar) {
    children.push({
      id: `widget-avatar-main`,
      componentName: 'hj-avatar-1',
      title: '个人头像',
      css: {
        left: 45,
        top: topPos + 12,
        width: avatarWidth,
        height: avatarHeight,
        zIndex: 2,
        backgroundColor: '#e2e8f0',
        borderWidth: 1,
        borderColor: '#cbd5e1',
        borderStyle: 'solid',
        borderRadius: avatarRadius
      },
      dataSource: { avatarSrc: avatarUrl }
    });
  }

  const textLeftOffset = hasAvatar ? (isCircleAvatar ? 150 : 155) : 50;

  children.push({
    id: `widget-name`,
    componentName: 'hj-text-1',
    title: '姓名',
    css: {
      left: textLeftOffset,
      top: topPos + 15,
      width: 260,
      height: 38,
      zIndex: 2,
      fontColor: '#f8fafc',
      fontSize: 26,
      fontWeight: 'bold'
    },
    dataSource: { text: name }
  });

  children.push({
    id: `widget-job-intent`,
    componentName: 'hj-text-1',
    title: '求职意向',
    css: {
      left: textLeftOffset,
      top: topPos + 55,
      width: hasAvatar ? 340 : 430,
      height: 55,
      zIndex: 2,
      fontColor: '#38bdf8',
      fontSize: 14,
      fontWeight: '600',
      lineHeight: 1.5
    },
    dataSource: { text: `意向岗位：${jobIntent}` }
  });

  children.push({
    id: `widget-contact`,
    componentName: 'hj-text-1',
    title: '联系方式',
    css: {
      left: 490,
      top: topPos + 18,
      width: 280,
      height: 90,
      zIndex: 2,
      fontColor: '#94a3b8',
      fontSize: 12.5,
      lineHeight: 1.6,
      textAlign: 'right'
    },
    dataSource: { text: `✉️ ${email}\n📱 ${phone}\n📍 ${location}` }
  });

  topPos += 145;

  // 1. Summary
  children.push({
    id: 'widget-summary-title',
    componentName: 'hj-text-1',
    title: '职业摘要标题',
    css: { left: 30, top: topPos, width: 760, height: 30, zIndex: 2, fontColor: themeColor, fontSize: 16, fontWeight: 'bold' },
    dataSource: { text: '📌 职业摘要' }
  });
  topPos += 32;

  const sumH = calculateSummaryHeight(summary, 760, 13, 21);
  children.push({
    id: 'widget-summary-content',
    componentName: 'hj-text-1',
    title: '职业摘要内容',
    css: { left: 30, top: topPos, width: 760, height: sumH, zIndex: 2, fontColor: '#334155', fontSize: 13, lineHeight: 1.6, textAlign: 'left' },
    dataSource: { text: summary }
  });
  topPos += sumH + 18;

  // 2. Core Skills
  children.push({
    id: 'widget-skills-title',
    componentName: 'hj-text-1',
    title: '技能工具标题',
    css: { left: 30, top: topPos, width: 760, height: 30, zIndex: 2, fontColor: themeColor, fontSize: 16, fontWeight: 'bold' },
    dataSource: { text: '⚡ 核心能力与技能工具' }
  });
  topPos += 34;

  let skillLeft = 30;
  let skillTop = topPos;
  skills.forEach((sk, sIdx) => {
    const maxAllowedTagW = 720;
    const tagWidth = Math.min(maxAllowedTagW, Math.max(75, Math.ceil(sk.length * 9.5 + 20)));
    if (skillLeft > 30 && skillLeft + tagWidth > 770) {
      skillLeft = 30;
      skillTop += 32;
    }
    children.push({
      id: `widget-skill-tag-${sIdx}`,
      componentName: 'hj-rectangle',
      title: `技能标签 ${sIdx + 1}`,
      css: {
        left: skillLeft,
        top: skillTop,
        width: tagWidth,
        height: 26,
        zIndex: 2,
        backgroundColor: '#f0fdf4',
        borderColor: '#bbf7d0',
        borderWidth: 1,
        borderStyle: 'solid',
        borderRadius: 14,
        fontColor: themeColor,
        fontSize: 11.5,
        fontWeight: '500',
        textAlign: 'center'
      },
      dataSource: { text: sk }
    });
    skillLeft += tagWidth + 8;
  });
  topPos = skillTop + 42;

  // 3. Work Experience
  children.push({
    id: 'widget-work-title',
    componentName: 'hj-text-1',
    title: '工作经历标题',
    css: { left: 30, top: topPos, width: 760, height: 30, zIndex: 2, fontColor: themeColor, fontSize: 16, fontWeight: 'bold' },
    dataSource: { text: '💼 工作与校园经历' }
  });
  topPos += 34;

  workList.forEach((w, idx) => {
    const formattedBullets = w.bullets.map((b) => (b.trim().startsWith('•') ? b : `• ${b}`)).join('\n');
    const cardHeight = calculateCardHeight(w.company, w.role, w.period, w.bullets, 760, 12.5, 20);
    children.push({
      id: `widget-work-${idx}`,
      componentName: 'hj-[#exper-1]',
      title: `工作卡片 ${idx + 1}`,
      css: {
        left: 30,
        top: topPos,
        width: 760,
        height: cardHeight,
        zIndex: 2,
        backgroundColor: 'transparent',
        borderColor: '#cbd5e1',
        borderWidth: 0,
        borderStyle: 'solid',
        borderRadius: 6,
        textAlign: 'left'
      },
      dataSource: {
        companyName: w.company,
        jobTitle: w.role,
        workTime: w.period,
        workContent: formattedBullets,
        text: `${w.company} · ${w.role}\n${formattedBullets}`
      }
    });
    topPos += cardHeight + 14;
  });
  topPos += 10;

  // 4. Project Experience
  children.push({
    id: 'widget-project-title',
    componentName: 'hj-text-1',
    title: '项目经历标题',
    css: { left: 30, top: topPos, width: 760, height: 30, zIndex: 2, fontColor: themeColor, fontSize: 16, fontWeight: 'bold' },
    dataSource: { text: '🚀 项目经历' }
  });
  topPos += 34;

  projectList.forEach((p, idx) => {
    const formattedBullets = p.bullets.map((b) => (b.trim().startsWith('•') ? b : `• ${b}`)).join('\n');
    const cardHeight = calculateCardHeight(p.name, p.role, p.period, p.bullets, 760, 12.5, 20);
    children.push({
      id: `widget-project-${idx}`,
      componentName: 'hj-[#exper-1]',
      title: `项目卡片 ${idx + 1}`,
      css: {
        left: 30,
        top: topPos,
        width: 760,
        height: cardHeight,
        zIndex: 2,
        backgroundColor: 'transparent',
        borderColor: '#cbd5e1',
        borderWidth: 0,
        borderStyle: 'solid',
        borderRadius: 6,
        textAlign: 'left'
      },
      dataSource: {
        companyName: p.name,
        jobTitle: p.role,
        workTime: p.period,
        workContent: formattedBullets,
        text: `${p.name} · ${p.role}\n${formattedBullets}`
      }
    });
    topPos += cardHeight + 14;
  });
  topPos += 10;

  // 5. Education
  children.push({
    id: 'widget-edu-title',
    componentName: 'hj-text-1',
    title: '教育背景标题',
    css: { left: 30, top: topPos, width: 760, height: 30, zIndex: 2, fontColor: themeColor, fontSize: 16, fontWeight: 'bold' },
    dataSource: { text: '🎓 教育背景' }
  });
  topPos += 34;

  children.push({
    id: 'widget-edu-content',
    componentName: 'hj-text-1',
    title: '教育背景内容',
    css: { left: 30, top: topPos, width: 760, height: 30, zIndex: 2, fontColor: '#334155', fontSize: 13 },
    dataSource: { text: `${edu.school}  ·  ${edu.degree}  ·  ${edu.period}` }
  });
  topPos += 45;

  return {
    id: `lego-resume-${templateId}-${Date.now()}`,
    version: '1.0.0',
    componentsTree: [{ id: 'page-1', componentName: 'page', commentType: 'page', children }],
    css: {
      width: 820,
      height: Math.max(1160, topPos + 40),
      background: '#ffffff',
      opacity: 1,
      fontFamily: 'Inter, sans-serif',
      themeColor
    },
    config: {
      title: `${name} 的【${templateId}】积木简历`
    }
  };
}
