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

/**
 * Accurately calculate required width for a skill pill / tag badge
 * based on CJK fullwidth characters, Latin characters, symbols, and pill border radius padding.
 */
export function calculateTagWidth(text: string, fontSizePx: number = 11.5): number {
  if (!text) return 72;
  const clean = text.replace(/<[^>]+>/g, '').trim();
  if (!clean) return 72;

  let estimatedTextWidth = 0;
  for (let i = 0; i < clean.length; i++) {
    const code = clean.charCodeAt(i);
    // CJK characters, fullwidth punctuation (e.g. （ ） ， 。 、), emojis
    if (code > 0x2e80 || (code >= 0xff00 && code <= 0xffef)) {
      estimatedTextWidth += fontSizePx * 1.08;
    } else if (code >= 65 && code <= 90) {
      // Uppercase Latin (e.g. SQL, ERP, PRD, MES)
      estimatedTextWidth += fontSizePx * 0.75;
    } else if (clean[i] === ' ' || clean[i] === '/' || clean[i] === '-' || clean[i] === '|') {
      estimatedTextWidth += fontSizePx * 0.45;
    } else {
      // Lowercase Latin, digits, ASCII punctuation
      estimatedTextWidth += fontSizePx * 0.62;
    }
  }

  // Capsule round corner padding (at least 14px each side = 28px) + border (2px)
  const horizontalPadding = Math.max(28, Math.ceil(fontSizePx * 2.4));
  const totalWidth = Math.ceil(estimatedTextWidth + horizontalPadding);
  return Math.max(72, Math.min(740, totalWidth));
}

export const A4_PAGE_HEIGHT = 1160;
export const PAGE_SAFE_TOP_MARGIN = 35;
export const PAGE_SAFE_BOTTOM_MARGIN = 35;

/**
 * 智能分页防截断：计算组件安全的 Y 轴起始位置。
 * 若当前组件若放入当前页将导致底部穿透或严重逼近 A4 切割线 (k * 1160px)，
 * 则将组件整体推进至下一页的起始安全边距位置。
 */
export function getSafePageBreakTop(
  currentTop: number,
  itemHeight: number,
  pageHeight: number = A4_PAGE_HEIGHT,
  topMargin: number = PAGE_SAFE_TOP_MARGIN,
  bottomMargin: number = PAGE_SAFE_BOTTOM_MARGIN
): number {
  const pageIndex = Math.floor(currentTop / pageHeight);
  const pageBoundary = (pageIndex + 1) * pageHeight;
  const pageCutoff = pageBoundary - bottomMargin;

  if (currentTop + itemHeight > pageCutoff) {
    return pageBoundary + topMargin;
  }
  return currentTop;
}

/**
 * 智能节标题防孤行计算：
 * 保证节标题后必须能完整容纳至少一条经历卡片 (minFirstItemHeight)，
 * 若容纳不下，则节标题整体下推至下一页顶部，杜绝孤行标题。
 */
export function getSafeSectionTitleTop(
  currentTop: number,
  titleHeight: number = 30,
  minFirstItemHeight: number = 100,
  pageHeight: number = A4_PAGE_HEIGHT,
  topMargin: number = PAGE_SAFE_TOP_MARGIN,
  bottomMargin: number = PAGE_SAFE_BOTTOM_MARGIN
): number {
  const pageIndex = Math.floor(currentTop / pageHeight);
  const pageBoundary = (pageIndex + 1) * pageHeight;
  const pageCutoff = pageBoundary - bottomMargin;

  if (currentTop + titleHeight + minFirstItemHeight > pageCutoff) {
    return pageBoundary + topMargin;
  }
  return currentTop;
}

/**
 * 针对整个积木画布执行全局“一键智能分页防截断重排”
 * 核心设计准则：
 * 1. 结构化成组防截断：保持微部件（如单行内多个技能胶囊、卡片容器内的文字元素等）原有的横向与内部相对坐标，杜绝一维序列下推导致布局打乱或阶梯状倾斜。
 * 2. 严禁标题孤行（Keep With Next）：节标题必须与该板块的首条内容卡片捆绑检验；若“标题 + 间距 + 首条内容”在当前页容纳不下，则标题整体移至下一页起始安全区，坚决杜绝“标题在上一页末尾、内容在下一页开头”的倒挂孤行。
 * 3. 级联顺流推移（Cascade Shift）：未穿透切割线的内容完全保留原设计位置与呼吸感间隙；一旦前置组件因分页跨线而向下平移，后续所有板块严格同幅顺移。
 * 4. 规范画布高度：画布总高严格收敛为 A4 整页倍数（totalPages * 1160px），不产生多余无意义空白页。
 */
export function reflowCanvasWidgetsForPagination(schema: IHJSchema): IHJSchema {
  if (!schema || !schema.componentsTree || schema.componentsTree.length === 0) {
    return schema;
  }

  const cloned: IHJSchema = JSON.parse(JSON.stringify(schema));
  const page = cloned.componentsTree[0];
  if (!page || !page.children || page.children.length === 0) {
    return cloned;
  }

  const widgets = page.children;

  const isTwoColumn = widgets.some(
    (w) =>
      (w.id || '').includes('sidebar-bg') ||
      (w.title || '').includes('侧边栏') ||
      ((Number(w.css.left) || 0) < 260 && (Number(w.css.height) || 0) > 600)
  );

  const sidebarBg = widgets.find(
    (w) => (w.id || '').includes('sidebar-bg') || (w.title || '').includes('侧边栏')
  );

  // 通用流式结构化防截断与防孤行级联计算器
  const reflowFlowWidgets = (flowWidgets: IWidget[]) => {
    if (flowWidgets.length === 0) return;

    // 记录原始 top 坐标，确保平移计算绝对幂等无累积误差
    const origTops = new Map<string, number>();
    flowWidgets.forEach((w) => {
      origTops.set(w.id, Number(w.css.top) || 0);
    });

    const isSectionTitle = (w: IWidget): boolean => {
      const id = (w.id || '').toLowerCase();
      const title = (w.title || '').toLowerCase();
      const text = typeof w.dataSource?.text === 'string' ? w.dataSource.text : '';
      const comp = (w.componentName || '').toLowerCase();

      if (id.includes('sidebar') || id.includes('banner') || id.includes('canvas')) return false;
      if (comp === 'hj-circle') return false;
      if (comp === 'hj-[#exper-1]') return false;
      if ((Number(w.css.height) || 0) > 65) return false;

      // 排除横向细分割线（属于伴随部件而非主标题文本）
      if (comp === 'hj-rectangle' && (Number(w.css.height) || 0) <= 4 && (Number(w.css.width) || 0) >= 260) {
        return false;
      }

      if (id.includes('sec-title') || id.includes('sec_title') || id.includes('-sec-')) return true;
      if (
        id.endsWith('-title') &&
        (id.includes('corp-') || id.includes('work') || id.includes('proj') || id.includes('edu') || id.includes('skill') || id.includes('summary'))
      ) {
        return true;
      }
      if (title.includes('板块标题') || title.includes('模块标题')) return true;
      if (comp === 'hj-text-8') return true;

      const hasTitleKeyword = title.includes('标题') || id.includes('title');
      const hasSectionKeyword =
        title.includes('经历') ||
        title.includes('技能') ||
        title.includes('能力') ||
        title.includes('教育') ||
        title.includes('摘要') ||
        title.includes('评价') ||
        title.includes('优势') ||
        title.includes('项目') ||
        title.includes('工作') ||
        title.includes('背景') ||
        text.includes('经历') ||
        text.includes('技能') ||
        text.includes('教育') ||
        text.includes('摘要') ||
        text.includes('项目') ||
        text.includes('工作') ||
        text.includes('能力');

      return hasTitleKeyword && hasSectionKeyword;
    };

    interface LayoutUnit {
      id: string;
      members: IWidget[];
      origTop: number;
      height: number;
      isTitle: boolean;
    }

    const handledIds = new Set<string>();
    const allUnits: LayoutUnit[] = [];

    // 1. 抽取节标题及其紧邻的下划线/分割线
    const rawTitles = flowWidgets.filter((w) => isSectionTitle(w));
    rawTitles.sort((a, b) => (origTops.get(a.id) || 0) - (origTops.get(b.id) || 0));

    rawTitles.forEach((tw) => {
      const tTop = origTops.get(tw.id) || 0;
      const tH = Number(tw.css.height) || 28;
      handledIds.add(tw.id);

      // 寻找相伴的下划线 / 分割线 (例如 widget-sec-line-*)
      const accompanyingLines = flowWidgets.filter((lw) => {
        if (handledIds.has(lw.id)) return false;
        const lTop = origTops.get(lw.id) || 0;
        const lH = Number(lw.css.height) || 0;
        const isLine =
          (lw.id || '').includes('sec-line') ||
          (lw.id || '').includes('line-') ||
          (lw.title || '').includes('分割线') ||
          (lH <= 4 && (Number(lw.css.width) || 0) >= 260);
        return isLine && Math.abs(lTop - (tTop + tH)) <= 15;
      });

      accompanyingLines.forEach((lw) => handledIds.add(lw.id));

      const members = [tw, ...accompanyingLines];
      const maxMemberBottom = Math.max(...members.map((m) => (origTops.get(m.id) || 0) + (Number(m.css.height) || 0)));
      allUnits.push({
        id: tw.id,
        members,
        origTop: tTop,
        height: Math.max(tH, maxMemberBottom - tTop),
        isTitle: true
      });
    });

    // 2. 抽取大卡片背景容器 (如 grid-cards 的 widget-grid-*-bg-*)
    const containerBgs = flowWidgets.filter(
      (w) =>
        !handledIds.has(w.id) &&
        w.componentName === 'hj-rectangle' &&
        (Number(w.css.width) || 0) >= 480 &&
        (Number(w.css.height) || 0) >= 40
    );

    containerBgs.forEach((bg) => {
      const bgTop = origTops.get(bg.id) || 0;
      const bgH = Number(bg.css.height) || 60;
      const insideWidgets = flowWidgets.filter((w) => {
        if (w.id === bg.id || handledIds.has(w.id)) return false;
        const wTop = origTops.get(w.id) || 0;
        return wTop >= bgTop - 2 && wTop < bgTop + bgH;
      });

      handledIds.add(bg.id);
      insideWidgets.forEach((w) => handledIds.add(w.id));

      allUnits.push({
        id: bg.id,
        members: [bg, ...insideWidgets],
        origTop: bgTop,
        height: bgH,
        isTitle: false
      });
    });

    // 3. 抽取技能微标签组合（极为重要：技能标签整块绑定，禁止阶梯状逐一下推！）
    const skillWidgets = flowWidgets.filter(
      (w) =>
        !handledIds.has(w.id) &&
        ((w.id || '').includes('skill') || (w.title || '').includes('技能标签') || (w.title || '').includes('技能'))
    );

    if (skillWidgets.length > 0) {
      skillWidgets.forEach((sw) => handledIds.add(sw.id));
      const minSkillTop = Math.min(...skillWidgets.map((sw) => origTops.get(sw.id) || 0));
      const maxSkillBot = Math.max(...skillWidgets.map((sw) => (origTops.get(sw.id) || 0) + (Number(sw.css.height) || 0)));
      allUnits.push({
        id: 'skills-composite-block',
        members: skillWidgets,
        origTop: minSkillTop,
        height: Math.max(30, maxSkillBot - minSkillTop),
        isTitle: false
      });
    }

    // 4. 抽取经历/项目卡片（含时间轴节点 dot）
    flowWidgets.forEach((w) => {
      if (handledIds.has(w.id)) return;
      if ((w.id || '').includes('line-work') || (w.id || '').includes('line-proj') || (w.title || '').includes('时间轴线')) {
        // 时间轴竖线排版后单独做端点延伸计算，不作为驱动块
        return;
      }

      const wTop = origTops.get(w.id) || 0;
      const wH = Number(w.css.height) || 30;

      // 检测是否有伴随的时间轴圆点 (widget-tl-dot-*)
      const dotW = flowWidgets.find(
        (dot) => !handledIds.has(dot.id) && (dot.id || '').includes('dot') && Math.abs((origTops.get(dot.id) || 0) - wTop) < 18
      );

      const members = [w];
      if (dotW) {
        members.push(dotW);
        handledIds.add(dotW.id);
      }

      handledIds.add(w.id);
      allUnits.push({
        id: w.id,
        members,
        origTop: wTop,
        height: wH,
        isTitle: false
      });
    });

    // 5. 按照初始 top 排序所有单元
    allUnits.sort((a, b) => a.origTop - b.origTop);

    // 6. 构造“板块 (Section) -> 内容单元 (Items)”树形结构，建立标题对首项的前瞻保护
    interface SectionGroup {
      titleUnit?: LayoutUnit;
      items: LayoutUnit[];
      origTop: number;
    }

    const titleUnits = allUnits.filter((u) => u.isTitle);
    const sections: SectionGroup[] = [];

    if (titleUnits.length === 0) {
      sections.push({
        titleUnit: undefined,
        items: allUnits,
        origTop: allUnits.length > 0 ? allUnits[0].origTop : 0
      });
    } else {
      // 头部未归入标题的单元（如顶部的自我评价）
      const preItems = allUnits.filter((u) => !u.isTitle && u.origTop < titleUnits[0].origTop);
      if (preItems.length > 0) {
        sections.push({
          titleUnit: undefined,
          items: preItems,
          origTop: preItems[0].origTop
        });
      }

      for (let i = 0; i < titleUnits.length; i++) {
        const curTitle = titleUnits[i];
        const nextTitle = titleUnits[i + 1];
        const sectionItems = allUnits.filter(
          (u) => !u.isTitle && u.origTop >= curTitle.origTop && (!nextTitle || u.origTop < nextTitle.origTop)
        );
        sections.push({
          titleUnit: curTitle,
          items: sectionItems,
          origTop: curTitle.origTop
        });
      }
    }

    // 7. 执行全局级联下推与防孤行校验
    let currentShift = 0;

    sections.forEach((sec) => {
      // (1) 校验节标题及其首项 (Keep With Next 防孤行)
      if (sec.titleUnit) {
        const curTitleTop = sec.titleUnit.origTop + currentShift;
        const titleH = sec.titleUnit.height;
        const pageIndex = Math.floor(curTitleTop / A4_PAGE_HEIGHT);
        const pageCutoff = (pageIndex + 1) * A4_PAGE_HEIGHT - PAGE_SAFE_BOTTOM_MARGIN;

        // 前瞻检测：标题后必须能完整容纳首条内容单元
        let minRequiredH = titleH;
        if (sec.items.length > 0) {
          const firstItem = sec.items[0];
          const gapToFirst = Math.max(6, firstItem.origTop - (sec.titleUnit.origTop + titleH));
          minRequiredH = titleH + gapToFirst + firstItem.height;
        }

        if (curTitleTop + minRequiredH > pageCutoff) {
          // 当前页不足以展示“标题 + 首项”，标题整体避让推移至下一页起始安全区
          const nextPageSafeTop = (pageIndex + 1) * A4_PAGE_HEIGHT + PAGE_SAFE_TOP_MARGIN;
          const addedShift = nextPageSafeTop - curTitleTop;
          currentShift += addedShift;
        }

        // 应用位移至标题及其伴随线
        sec.titleUnit.members.forEach((m) => {
          m.css.top = (origTops.get(m.id) ?? Number(m.css.top) ?? 0) + currentShift;
        });
      }

      // (2) 逐项校验本板块内部的内容单元
      sec.items.forEach((item) => {
        const curItemTop = item.origTop + currentShift;
        const itemH = item.height;
        const pageIndex = Math.floor(curItemTop / A4_PAGE_HEIGHT);
        const pageCutoff = (pageIndex + 1) * A4_PAGE_HEIGHT - PAGE_SAFE_BOTTOM_MARGIN;

        const maxPageUsableH = A4_PAGE_HEIGHT - PAGE_SAFE_TOP_MARGIN - PAGE_SAFE_BOTTOM_MARGIN;

        if (itemH > maxPageUsableH) {
          // 超长巨型单组件：仅当其起始点不在页面顶部安全区附近时推进至新页面开头
          const offsetInPage = curItemTop % A4_PAGE_HEIGHT;
          if (offsetInPage > PAGE_SAFE_TOP_MARGIN + 20) {
            const nextPageSafeTop = (pageIndex + 1) * A4_PAGE_HEIGHT + PAGE_SAFE_TOP_MARGIN;
            const addedShift = nextPageSafeTop - curItemTop;
            currentShift += addedShift;
          }
        } else if (curItemTop + itemH > pageCutoff) {
          // 单元穿透 A4 切割线，整体推移至下一页起始安全区
          const nextPageSafeTop = (pageIndex + 1) * A4_PAGE_HEIGHT + PAGE_SAFE_TOP_MARGIN;
          const addedShift = nextPageSafeTop - curItemTop;
          currentShift += addedShift;
        }

        // 应用位移至单元内所有成员（如技能胶囊矩阵、卡片背景及内部文字），保证相对布局绝对不变
        item.members.forEach((m) => {
          m.css.top = (origTops.get(m.id) ?? Number(m.css.top) ?? 0) + currentShift;
        });
      });
    });

    // 8. 重新连接与延伸时间轴竖线
    ['work', 'proj'].forEach((prefix) => {
      const lineW = page.children.find(
        (w) => (w.id || '').includes(`line-${prefix}`) || (w.id || '').includes(`line_${prefix}`)
      );
      const sectionCards = page.children.filter(
        (w) => (w.id || '').includes(`-${prefix}-`) || (w.id || '').includes(`_${prefix}_`)
      );
      if (lineW && sectionCards.length > 0) {
        const minTop = Math.min(...sectionCards.map((c) => Number(c.css.top) || 9999));
        const maxBot = Math.max(...sectionCards.map((c) => (Number(c.css.top) || 0) + (Number(c.css.height) || 0)));
        lineW.css.top = minTop + 4;
        lineW.css.height = Math.max(30, maxBot - minTop - 10);
      }
    });
  };

  if (isTwoColumn) {
    // 双栏布局：右栏内容（left >= 270）顺流结构化重排
    const rightWidgets = widgets.filter((w) => (Number(w.css.left) || 0) >= 270 && w !== sidebarBg);
    reflowFlowWidgets(rightWidgets);

    const contentWidgets = widgets.filter(
      (w) => w !== sidebarBg && !((w.id || '').includes('sidebar-bg') || (w.title || '').includes('侧边栏背景'))
    );
    const maxBottom = Math.max(0, ...contentWidgets.map((w) => (Number(w.css.top) || 0) + (Number(w.css.height) || 0)));
    const totalPages = Math.max(1, Math.ceil(maxBottom / A4_PAGE_HEIGHT));
    const finalHeight = totalPages * A4_PAGE_HEIGHT;

    cloned.css.height = finalHeight;
    if (sidebarBg) {
      sidebarBg.css.top = 20;
      sidebarBg.css.height = finalHeight - 40;
    }
  } else {
    // 单栏流式布局：Header 区域保持不变，Body 区域按结构化板块与内容块顺流避让
    const bannerBgs = widgets.filter((w) => {
      const id = (w.id || '').toLowerCase();
      const title = (w.title || '').toLowerCase();
      return id.includes('banner-bg') || id.includes('header-bg') || title.includes('banner') || title.includes('顶部背景');
    });
    bannerBgs.forEach((bg) => {
      const currentH = Number(bg.css.height) || 125;
      bg.css.height = Math.min(160, Math.max(110, currentH));
    });

    const headerWidgets = widgets.filter((w) => (Number(w.css.top) || 0) < 175);
    const bodyWidgets = widgets.filter((w) => !headerWidgets.includes(w) && !bannerBgs.includes(w));

    reflowFlowWidgets(bodyWidgets);

    const contentWidgets = widgets.filter((w) => {
      const id = (w.id || '').toLowerCase();
      const title = (w.title || '').toLowerCase();
      if (id.includes('sidebar-bg') || title.includes('侧边栏背景') || title.includes('背景框')) return false;
      if (id.includes('canvas-bg') || title.includes('画布背景')) return false;
      if ((Number(w.css.height) || 0) > 800 && (w.componentName === 'hj-rectangle' || w.componentName === 'hj-bg')) return false;
      return true;
    });
    const maxBottom = Math.max(0, ...contentWidgets.map((w) => (Number(w.css.top) || 0) + (Number(w.css.height) || 0)));
    const totalPages = Math.max(1, Math.ceil(maxBottom / A4_PAGE_HEIGHT));
    cloned.css.height = totalPages * A4_PAGE_HEIGHT;
  }

  return cloned;
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
    if (compName.includes('avatar') || title.includes('头像') || id.includes('avatar') || title.includes('照片')) {
      widget.dataSource.avatarSrc = avatarUrl || '';
      markUsed(widget);
    }
  });

  // 2. Composite Intent + Contact Widgets (e.g. '意向与联系方式' in corporate-banner)
  // Must match BEFORE individual intent/contact widgets to prevent wiping out contact details!
  page.children.filter(isUnused).forEach((widget) => {
    const title = (widget.title || '').toLowerCase();
    const id = (widget.id || '').toLowerCase();
    const currentText = typeof widget.dataSource?.text === 'string' ? widget.dataSource.text : '';

    if (
      (title.includes('意向') && title.includes('联系')) ||
      id.includes('intent-contact') ||
      id.includes('contact-intent') ||
      (currentText.includes('求职意向') && (currentText.includes('@') || currentText.includes('13') || currentText.includes('|')))
    ) {
      widget.dataSource.text = `求职意向：${jobIntent}\n${email}  |  ${phone}  |  ${location}`;
      markUsed(widget);
    }
  });

  // 3. Name Widget
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

  // 4. Dedicated Job Intent Widget (does NOT include contact)
  page.children.filter(isUnused).forEach((widget) => {
    const title = (widget.title || '').toLowerCase();
    const id = (widget.id || '').toLowerCase();
    const currentText = typeof widget.dataSource?.text === 'string' ? widget.dataSource.text : '';

    if ((title.includes('意向') || id.includes('intent')) && !title.includes('联系') && !id.includes('contact')) {
      if (currentText.startsWith('🎯') || currentText.includes('🎯')) {
        widget.dataSource.text = `🎯 意向：${jobIntent}`;
      } else if (currentText.startsWith('意向') || currentText.startsWith('求职意向') || currentText.startsWith('意向岗位')) {
        widget.dataSource.text = `求职意向：${jobIntent}`;
      } else {
        widget.dataSource.text = jobIntent;
      }
      markUsed(widget);
    }
  });

  // 5. Contact / Basic Info Widget
  page.children.filter(isUnused).forEach((widget) => {
    const title = (widget.title || '').toLowerCase();
    const id = (widget.id || '').toLowerCase();
    const currentText = typeof widget.dataSource?.text === 'string' ? widget.dataSource.text : '';

    if (title.includes('联系') || title.includes('基本信息') || id.includes('contact')) {
      if (currentText.includes('🏫') || currentText.includes('📞') || currentText.includes('✉️')) {
        widget.dataSource.text = `🏫 院校：${edu.school}\n📞 电话：${phone}\n✉️ 邮箱：${email}\n📍 城市：${location}`;
      } else if (currentText.includes('cat profile.json')) {
        widget.dataSource.text = `$ cat profile.json | grep --intent="${jobIntent}"\n${email} | ${phone} | ${location}`;
      } else if (currentText.includes('\n')) {
        widget.dataSource.text = `✉️ ${email}\n📱 ${phone}\n📍 ${location}`;
      } else {
        widget.dataSource.text = `${email}  |  ${phone}  |  ${location}`;
      }
      markUsed(widget);
    }
  });

  // 6. Summary / Profile Widget
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
      widget.css.height = Math.min(240, Math.max(35, sumH));
      widget.dataSource.text = currentText.includes('【自我评价】') ? `【自我评价】\n${summary}` : summary;
      markUsed(widget);
    }
  });

  // 7. Work Experience Widgets
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

  // Remove excess work candidate widgets if incoming has fewer
  if (workCandidates.length > workList.length) {
    const excessIds = new Set(workCandidates.slice(workList.length).map((w) => w.id));
    page.children = page.children.filter((w) => !excessIds.has(w.id));
  } else if (workList.length > workCandidates.length && workCandidates.length > 0) {
    const templateWidget = workCandidates[workCandidates.length - 1];
    const insertIdx = page.children.indexOf(templateWidget);

    let lastTop = Number(templateWidget.css.top) || 0;
    let lastHeight = Number(templateWidget.css.height) || 100;

    for (let idx = workCandidates.length; idx < workList.length; idx++) {
      const w = workList[idx];
      const formattedBullets = w.bullets.map((b) => (b.trim().startsWith('•') || b.trim().startsWith('1.') || b.trim().startsWith('2.')) ? b : `• ${b}`).join('\n');
      const cardWidth = templateWidget.css.width || 740;
      const fontSz = templateWidget.css.fontSize || 12.5;
      const cardH = calculateCardHeight(w.company, w.role, w.period, w.bullets, cardWidth, fontSz, 20);

      const extraWidget: IWidget = JSON.parse(JSON.stringify(templateWidget));
      extraWidget.id = `widget-work-extra-${idx}-${Date.now()}`;
      extraWidget.title = `工作 ${idx + 1}`;
      extraWidget.css.top = lastTop + lastHeight + 12;
      extraWidget.css.height = Math.max(65, cardH);
      extraWidget.dataSource.companyName = w.company;
      extraWidget.dataSource.jobTitle = w.role;
      extraWidget.dataSource.workTime = w.period;
      extraWidget.dataSource.workContent = formattedBullets;
      extraWidget.dataSource.text = `${w.company} · ${w.role}\n${formattedBullets}`;

      page.children.splice(insertIdx + 1 + (idx - workCandidates.length), 0, extraWidget);
      markUsed(extraWidget);

      lastTop = extraWidget.css.top;
      lastHeight = extraWidget.css.height;
    }
  }

  // 8. Project Experience Widgets
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

  // Remove excess project candidate widgets if incoming has fewer
  if (projectCandidates.length > projectList.length) {
    const excessIds = new Set(projectCandidates.slice(projectList.length).map((w) => w.id));
    page.children = page.children.filter((w) => !excessIds.has(w.id));
  } else if (projectList.length > projectCandidates.length && projectCandidates.length > 0) {
    const templateWidget = projectCandidates[projectCandidates.length - 1];
    const insertIdx = page.children.indexOf(templateWidget);

    let lastTop = Number(templateWidget.css.top) || 0;
    let lastHeight = Number(templateWidget.css.height) || 100;

    for (let idx = projectCandidates.length; idx < projectList.length; idx++) {
      const p = projectList[idx];
      const formattedBullets = p.bullets.map((b) => (b.trim().startsWith('•') || b.trim().startsWith('1.') || b.trim().startsWith('2.')) ? b : `• ${b}`).join('\n');
      const cardWidth = templateWidget.css.width || 740;
      const fontSz = templateWidget.css.fontSize || 12.5;
      const cardH = calculateCardHeight(p.name, p.role, p.period, p.bullets, cardWidth, fontSz, 20);

      const extraWidget: IWidget = JSON.parse(JSON.stringify(templateWidget));
      extraWidget.id = `widget-project-extra-${idx}-${Date.now()}`;
      extraWidget.title = `项目 ${idx + 1}`;
      extraWidget.css.top = lastTop + lastHeight + 12;
      extraWidget.css.height = Math.max(65, cardH);
      extraWidget.dataSource.companyName = p.name;
      extraWidget.dataSource.jobTitle = p.role;
      extraWidget.dataSource.workTime = p.period;
      extraWidget.dataSource.workContent = formattedBullets;
      extraWidget.dataSource.text = `${p.name} · ${p.role}\n${formattedBullets}`;

      page.children.splice(insertIdx + 1 + (idx - projectCandidates.length), 0, extraWidget);
      markUsed(extraWidget);

      lastTop = extraWidget.css.top;
      lastHeight = extraWidget.css.height;
    }
  }

  // 9. Education Widget
  page.children.filter(isUnused).forEach((widget) => {
    const title = (widget.title || '').toLowerCase();
    const id = (widget.id || '').toLowerCase();
    const compName = (widget.componentName || '').toLowerCase();

    if ((title.includes('教育') || id.includes('edu')) && !title.includes('标题')) {
      if (compName.includes('exper')) {
        widget.dataSource.companyName = edu.school;
        widget.dataSource.jobTitle = `${edu.degree} · ${edu.period}`;
        widget.dataSource.workTime = edu.period;
        widget.dataSource.workContent = `主修专业与核心课程成果`;
        widget.dataSource.text = `${edu.school} · ${edu.degree}\n${edu.period}`;
      } else {
        widget.dataSource.text = `${edu.school}  ·  ${edu.degree}  (${edu.period})`;
      }
      markUsed(widget);
    }
  });

  // 10. Skills & Tools Widget with Auto-Flow Tag Grid
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
    const sortedSkillWidgets = [...skillWidgets].sort((a, b) => {
      const topDiff = (Number(a.css.top) || 0) - (Number(b.css.top) || 0);
      if (Math.abs(topDiff) > 8) return topDiff;
      return (Number(a.css.left) || 0) - (Number(b.css.left) || 0);
    });

    const startLeft = Math.min(...sortedSkillWidgets.map((w) => Number(w.css.left) || 30));
    const startTop = Math.min(...sortedSkillWidgets.map((w) => Number(w.css.top) || 200));
    const isSidebar = startLeft < 250 && sortedSkillWidgets.every((w) => (Number(w.css.left) || 0) < 260);
    const maxRight = isSidebar ? 250 : 770;
    const tagGap = 8;
    const rowStep = 34;

    let curLeft = startLeft;
    let curTop = startTop;

    skills.forEach((sk, sIdx) => {
      const fontSize = sortedSkillWidgets[0]?.css.fontSize || 11.5;
      const tagW = calculateTagWidth(sk, fontSize);

      if (curLeft > startLeft && curLeft + tagW > maxRight) {
        curLeft = startLeft;
        curTop += rowStep;
      }

      if (sIdx < sortedSkillWidgets.length) {
        const w = sortedSkillWidgets[sIdx];
        w.dataSource.text = sk;
        w.css.left = curLeft;
        w.css.top = curTop;
        w.css.width = tagW;
        w.css.height = 26;
        markUsed(w);
      } else {
        const tmpl = sortedSkillWidgets[0];
        const newPill: IWidget = JSON.parse(JSON.stringify(tmpl));
        newPill.id = `widget-skill-extra-${sIdx}-${Date.now()}`;
        newPill.title = `技能标签 ${sIdx + 1}`;
        newPill.dataSource.text = sk;
        newPill.css.left = curLeft;
        newPill.css.top = curTop;
        newPill.css.width = tagW;
        newPill.css.height = 26;
        page.children.push(newPill);
        markUsed(newPill);
      }

      curLeft += tagW + tagGap;
    });

    if (skills.length < sortedSkillWidgets.length) {
      const excessIds = new Set(sortedSkillWidgets.slice(skills.length).map((w) => w.id));
      page.children = page.children.filter((w) => !excessIds.has(w.id));
    }
  }

  // Clean remaining unused text placeholders containing sample names to prevent ghost text
  page.children.filter(isUnused).forEach((widget) => {
    const currentText = typeof widget.dataSource?.text === 'string' ? widget.dataSource.text : '';
    if (currentText) {
      let updatedText = currentText;
      if (updatedText.includes('陈晨')) updatedText = updatedText.replace(/陈晨/g, name);
      if (updatedText.includes('张伟')) updatedText = updatedText.replace(/张伟/g, name);
      if (updatedText.includes('张明')) updatedText = updatedText.replace(/张明/g, name);
      if (updatedText.includes('chenchen@design.com')) updatedText = updatedText.replace(/chenchen@design.com/g, email);
      if (updatedText.includes('137-0000-1111')) updatedText = updatedText.replace(/137-0000-1111/g, phone);

      if (updatedText !== currentText) {
        widget.dataSource.text = updatedText;
        markUsed(widget);
      }
    }
  });

  // Clamp right edge boundary for all widgets so no element spills past 785px
  page.children.forEach((widget) => {
    const wLeft = Number(widget.css.left) || 30;
    const wWidth = Number(widget.css.width) || 200;
    if (wLeft + wWidth > 785 && wLeft < 785) {
      widget.css.width = Math.max(80, 785 - wLeft);
    }
  });

  // =========================================================================
  // INTELLIGENT SECTION-SEQUENCED VERTICAL FLOW (No Collisions, No Stretching)
  // =========================================================================
  const isTwoColumn = page.children.some(
    (w) =>
      (w.id || '').includes('sidebar-bg') ||
      (w.title || '').includes('侧边栏') ||
      ((Number(w.css.left) || 0) < 260 && (Number(w.css.height) || 0) > 600)
  );

  let finalCanvasBottom = 1160;

  if (isTwoColumn) {
    // Two-column layout (modern-sidebar): Left column < 275, Right column >= 275
    const rightWidgets = page.children.filter((w) => (Number(w.css.left) || 0) >= 270);
    const sidebarBg = page.children.find(
      (w) => (w.id || '').includes('sidebar-bg') || (w.title || '').includes('侧边栏')
    );

    // Group right column elements
    const workTitle = rightWidgets.find(
      (w) => (w.title || '').includes('工作') && (w.title || '').includes('标题')
    );
    const workCards = rightWidgets.filter((w) =>
      workCandidates.some((c) => c.id === w.id)
    );
    const projTitle = rightWidgets.find(
      (w) => (w.title || '').includes('项目') && (w.title || '').includes('标题')
    );
    const projCards = rightWidgets.filter((w) =>
      projectCandidates.some((c) => c.id === w.id)
    );
    const skillsTitle = rightWidgets.find(
      (w) => (w.title || '').includes('技能') && (w.title || '').includes('标题')
    );
    const skillsContent = rightWidgets.find((w) =>
      skillWidgets.some((s) => s.id === w.id)
    );
    const eduTitle = rightWidgets.find(
      (w) => (w.title || '').includes('教育') && (w.title || '').includes('标题')
    );
    const eduContent = rightWidgets.find(
      (w) => (w.title || '').includes('教育') && !(w.title || '').includes('标题')
    );

    let curRightY = 40;
    if (workTitle) {
      const firstWorkH = workCards.length > 0 ? (Number(workCards[0].css.height) || 90) : 90;
      curRightY = getSafeSectionTitleTop(curRightY, Number(workTitle.css.height) || 30, firstWorkH + 8);
      workTitle.css.top = curRightY;
      curRightY += (Number(workTitle.css.height) || 30) + 8;
    }
    workCards.forEach((c) => {
      const cardH = Number(c.css.height) || 85;
      curRightY = getSafePageBreakTop(curRightY, cardH);
      c.css.top = curRightY;
      curRightY += cardH + 14;
    });
    curRightY += 8;

    if (projTitle) {
      const firstProjH = projCards.length > 0 ? (Number(projCards[0].css.height) || 90) : 90;
      curRightY = getSafeSectionTitleTop(curRightY, Number(projTitle.css.height) || 30, firstProjH + 8);
      projTitle.css.top = curRightY;
      curRightY += (Number(projTitle.css.height) || 30) + 8;
    }
    projCards.forEach((c) => {
      const cardH = Number(c.css.height) || 85;
      curRightY = getSafePageBreakTop(curRightY, cardH);
      c.css.top = curRightY;
      curRightY += cardH + 14;
    });
    curRightY += 8;

    if (skillsTitle) {
      curRightY = getSafeSectionTitleTop(curRightY, Number(skillsTitle.css.height) || 30, 50);
      skillsTitle.css.top = curRightY;
      curRightY += (Number(skillsTitle.css.height) || 30) + 8;
    }
    if (skillsContent) {
      const skillsH = Number(skillsContent.css.height) || 50;
      curRightY = getSafePageBreakTop(curRightY, skillsH);
      skillsContent.css.top = curRightY;
      curRightY += skillsH + 14;
    }
    curRightY += 8;

    if (eduTitle) {
      curRightY = getSafeSectionTitleTop(curRightY, Number(eduTitle.css.height) || 30, 45);
      eduTitle.css.top = curRightY;
      curRightY += (Number(eduTitle.css.height) || 30) + 8;
    }
    if (eduContent) {
      const eduH = Number(eduContent.css.height) || 45;
      curRightY = getSafePageBreakTop(curRightY, eduH);
      eduContent.css.top = curRightY;
      curRightY += eduH + 14;
    }

    const totalPages = Math.max(1, Math.ceil(curRightY / A4_PAGE_HEIGHT));
    finalCanvasBottom = totalPages * A4_PAGE_HEIGHT;
    if (sidebarBg) {
      sidebarBg.css.top = 20;
      sidebarBg.css.height = finalCanvasBottom - 40;
    }
  } else {
    // Single-column layout (corporate-banner, classic-minimal, timeline-tech, minimal, github-tech, grid-cards)
    // 1. Header Banner background MUST retain its designed height (NEVER expand to page bottom!)
    const bannerBgs = page.children.filter((w) => {
      const id = (w.id || '').toLowerCase();
      const title = (w.title || '').toLowerCase();
      return id.includes('banner-bg') || id.includes('header-bg') || title.includes('banner') || title.includes('顶部背景');
    });
    bannerBgs.forEach((bg) => {
      const currentH = Number(bg.css.height) || 125;
      bg.css.height = Math.min(160, Math.max(110, currentH));
    });

    const headerWidgets = page.children.filter((w) => (Number(w.css.top) || 0) < 175);
    const headerBottom = Math.max(150, ...headerWidgets.map((w) => (Number(w.css.top) || 0) + (Number(w.css.height) || 0)));

    // 2. Identify and sequence body sections
    const summaryWidgets = page.children.filter((w) => {
      const id = (w.id || '').toLowerCase();
      const title = (w.title || '').toLowerCase();
      const t = Number(w.css.top) || 0;
      return t >= 120 && (id.includes('sum') || id.includes('profile') || title.includes('摘要') || title.includes('优势') || title.includes('评价'));
    });

    const skillsSectionWidgets = page.children.filter((w) => {
      const id = (w.id || '').toLowerCase();
      const title = (w.title || '').toLowerCase();
      const t = Number(w.css.top) || 0;
      return t >= 120 && (id.includes('skill') || title.includes('技能') || title.includes('工具')) && !title.includes('分割线');
    });

    const workSectionWidgets = page.children.filter((w) => {
      const id = (w.id || '').toLowerCase();
      const title = (w.title || '').toLowerCase();
      const t = Number(w.css.top) || 0;
      return (
        t >= 120 &&
        !id.includes('proj') &&
        !id.includes('edu') &&
        !title.includes('项目') &&
        !title.includes('教育') &&
        (id.includes('work') || title.includes('工作') || title.includes('经历') || id.includes('tl-dot-work') || id.includes('line-work'))
      );
    });

    const projectSectionWidgets = page.children.filter((w) => {
      const id = (w.id || '').toLowerCase();
      const title = (w.title || '').toLowerCase();
      const t = Number(w.css.top) || 0;
      return (
        t >= 120 &&
        (id.includes('proj') || title.includes('项目') || id.includes('tl-dot-proj') || id.includes('line-proj'))
      );
    });

    const eduSectionWidgets = page.children.filter((w) => {
      const id = (w.id || '').toLowerCase();
      const title = (w.title || '').toLowerCase();
      const t = Number(w.css.top) || 0;
      return t >= 120 && (id.includes('edu') || title.includes('教育'));
    });

    // Detect section order based on initial minTop
    type SectionType = 'summary' | 'skills' | 'work' | 'project' | 'education';
    const sections: { type: SectionType; minTop: number }[] = [
      { type: 'summary' as SectionType, minTop: summaryWidgets.length > 0 ? Math.min(...summaryWidgets.map((w) => Number(w.css.top) || 999)) : 999 },
      { type: 'skills' as SectionType, minTop: skillsSectionWidgets.length > 0 ? Math.min(...skillsSectionWidgets.map((w) => Number(w.css.top) || 999)) : 999 },
      { type: 'work' as SectionType, minTop: workSectionWidgets.length > 0 ? Math.min(...workSectionWidgets.map((w) => Number(w.css.top) || 999)) : 999 },
      { type: 'project' as SectionType, minTop: projectSectionWidgets.length > 0 ? Math.min(...projectSectionWidgets.map((w) => Number(w.css.top) || 999)) : 999 },
      { type: 'education' as SectionType, minTop: eduSectionWidgets.length > 0 ? Math.min(...eduSectionWidgets.map((w) => Number(w.css.top) || 999)) : 999 },
    ].filter((s) => s.minTop < 999).sort((a, b) => a.minTop - b.minTop);

    let flowY = headerBottom + 16;

    sections.forEach(({ type }) => {
      if (type === 'summary' && summaryWidgets.length > 0) {
        const titleW = summaryWidgets.find((w) => (w.title || '').includes('标题') || (w.id || '').includes('title'));
        const contentW = summaryWidgets.find((w) => w !== titleW);
        if (titleW) {
          flowY = getSafeSectionTitleTop(flowY, Number(titleW.css.height) || 28, 50);
          titleW.css.top = flowY;
          flowY += (Number(titleW.css.height) || 28) + 6;
        }
        if (contentW) {
          const cH = Number(contentW.css.height) || 50;
          flowY = getSafePageBreakTop(flowY, cH);
          contentW.css.top = flowY;
          flowY += cH + 18;
        }
      } else if (type === 'skills' && skillsSectionWidgets.length > 0) {
        const titleW = skillsSectionWidgets.find((w) => (w.title || '').includes('标题') || (w.id || '').includes('title'));
        const nonTitle = skillsSectionWidgets.filter((w) => w !== titleW);
        if (titleW) {
          flowY = getSafeSectionTitleTop(flowY, Number(titleW.css.height) || 28, 40);
          titleW.css.top = flowY;
          flowY += (Number(titleW.css.height) || 28) + 8;
        }
        if (nonTitle.length === 1) {
          const sH = Number(nonTitle[0].css.height) || 40;
          flowY = getSafePageBreakTop(flowY, sH);
          nonTitle[0].css.top = flowY;
          flowY += sH + 18;
        } else if (nonTitle.length > 1) {
          // Flow tag pills smoothly
          const startLeft = Math.min(...nonTitle.map((w) => Number(w.css.left) || 30));
          let pillX = startLeft;
          flowY = getSafePageBreakTop(flowY, 28);
          let pillY = flowY;
          nonTitle.forEach((pill) => {
            const w = Number(pill.css.width) || 80;
            if (pillX > startLeft && pillX + w > 770) {
              pillX = startLeft;
              pillY += 34;
              pillY = getSafePageBreakTop(pillY, 28);
            }
            pill.css.left = pillX;
            pill.css.top = pillY;
            pillX += w + 8;
          });
          flowY = pillY + 34 + 16;
        }
      } else if (type === 'work' && workSectionWidgets.length > 0) {
        const titleW = workSectionWidgets.find((w) => (w.title || '').includes('标题') || (w.id || '').includes('title'));
        const cards = workSectionWidgets.filter((w) => workCandidates.some((c) => c.id === w.id));
        const lineW = workSectionWidgets.find((w) => (w.id || '').includes('line-work'));
        const dots = workSectionWidgets.filter((w) => (w.id || '').includes('dot-work'));

        if (titleW) {
          const firstWorkH = cards.length > 0 ? (Number(cards[0].css.height) || 90) : 90;
          flowY = getSafeSectionTitleTop(flowY, Number(titleW.css.height) || 28, firstWorkH + 8);
          titleW.css.top = flowY;
          flowY += (Number(titleW.css.height) || 28) + 8;
        }
        const workLineStart = flowY + 4;
        cards.forEach((card, idx) => {
          const cardH = Number(card.css.height) || 80;
          flowY = getSafePageBreakTop(flowY, cardH);
          card.css.top = flowY;
          const dot = dots[idx];
          if (dot) dot.css.top = flowY + 6;
          flowY += cardH + 12;
        });
        if (lineW) {
          lineW.css.top = workLineStart;
          lineW.css.height = Math.max(30, flowY - workLineStart - 10);
        }
        flowY += 8;
      } else if (type === 'project' && projectSectionWidgets.length > 0) {
        const titleW = projectSectionWidgets.find((w) => (w.title || '').includes('标题') || (w.id || '').includes('title'));
        const cards = projectSectionWidgets.filter((w) => projectCandidates.some((c) => c.id === w.id));
        const lineW = projectSectionWidgets.find((w) => (w.id || '').includes('line-proj'));
        const dots = projectSectionWidgets.filter((w) => (w.id || '').includes('dot-proj'));

        if (titleW) {
          const firstProjH = cards.length > 0 ? (Number(cards[0].css.height) || 90) : 90;
          flowY = getSafeSectionTitleTop(flowY, Number(titleW.css.height) || 28, firstProjH + 8);
          titleW.css.top = flowY;
          flowY += (Number(titleW.css.height) || 28) + 8;
        }
        const projLineStart = flowY + 4;
        cards.forEach((card, idx) => {
          const cardH = Number(card.css.height) || 80;
          flowY = getSafePageBreakTop(flowY, cardH);
          card.css.top = flowY;
          const dot = dots[idx];
          if (dot) dot.css.top = flowY + 6;
          flowY += cardH + 12;
        });
        if (lineW) {
          lineW.css.top = projLineStart;
          lineW.css.height = Math.max(30, flowY - projLineStart - 10);
        }
        flowY += 8;
      } else if (type === 'education' && eduSectionWidgets.length > 0) {
        const titleW = eduSectionWidgets.find((w) => (w.title || '').includes('标题') || (w.id || '').includes('title'));
        const contentW = eduSectionWidgets.find((w) => w !== titleW);
        if (titleW) {
          flowY = getSafeSectionTitleTop(flowY, Number(titleW.css.height) || 28, 40);
          titleW.css.top = flowY;
          flowY += (Number(titleW.css.height) || 28) + 6;
        }
        if (contentW) {
          const eduH = Number(contentW.css.height) || 40;
          flowY = getSafePageBreakTop(flowY, eduH);
          contentW.css.top = flowY;
          flowY += eduH + 18;
        }
      }
    });

    const totalPages = Math.max(1, Math.ceil(flowY / A4_PAGE_HEIGHT));
    finalCanvasBottom = totalPages * A4_PAGE_HEIGHT;
  }

  newSchema.css.height = finalCanvasBottom;

  return reflowCanvasWidgetsForPagination(newSchema);
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
    rightTop = getSafeSectionTitleTop(rightTop, 30, 45);
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
    const firstWorkH = workList.length > 0 ? calculateCardHeight(workList[0].company, workList[0].role, workList[0].period, workList[0].bullets, 500, 12.5, 20) : 100;
    rightTop = getSafeSectionTitleTop(rightTop, 30, firstWorkH + 10);
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
      rightTop = getSafePageBreakTop(rightTop, cardHeight);
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

    rightTop += 6;

    // Project Experience Header & Cards
    const firstProjH = projectList.length > 0 ? calculateCardHeight(projectList[0].name, projectList[0].role, projectList[0].period, projectList[0].bullets, 500, 12.5, 20) : 100;
    rightTop = getSafeSectionTitleTop(rightTop, 30, firstProjH + 10);
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
      rightTop = getSafePageBreakTop(rightTop, cardHeight);
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

    rightTop += 6;

    // Skills
    rightTop = getSafeSectionTitleTop(rightTop, 30, 60);
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

    rightTop += 34;
    rightTop = getSafePageBreakTop(rightTop, 70);
    children.push({
      id: 'widget-skills-content-main',
      componentName: 'hj-text-1',
      title: '技能工具清单',
      css: {
        left: 290,
        top: rightTop,
        width: 500,
        height: 70,
        zIndex: 2,
        fontColor: '#334155',
        fontSize: 12.5,
        lineHeight: 1.6
      },
      dataSource: { text: skills.join('  ·  ') }
    });

    rightTop += 84;

    const totalPages = Math.max(1, Math.ceil(rightTop / A4_PAGE_HEIGHT));
    currentTop = totalPages * A4_PAGE_HEIGHT;

    const sidebarBg = children.find((c) => c.id === 'widget-sidebar-bg');
    if (sidebarBg) {
      sidebarBg.css.height = currentTop - 40;
    }

    const schemaResult: IHJSchema = {
      id: `lego-resume-sidebar-${Date.now()}`,
      version: '1.0.0',
      componentsTree: [{ id: 'page-1', componentName: 'page', commentType: 'page', children }],
      css: { width: 820, height: currentTop, background: '#ffffff', opacity: 1, fontFamily: 'Inter, sans-serif', themeColor },
      config: { title: `${name} 的【1.3 双栏侧边栏】积木简历` }
    };
    return reflowCanvasWidgetsForPagination(schemaResult);
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
        fontColor: '#f1f5f9',
        fontSize: 13,
        lineHeight: 1.6
      },
      dataSource: { text: `求职意向：${jobIntent}\n${email}  |  ${phone}  |  ${location}` }
    });

    let topPos = 190;

    // 1. Summary
    const sumH = calculateSummaryHeight(summary, 760, 13, 21);
    topPos = getSafeSectionTitleTop(topPos, 30, Math.min(sumH, 80));
    children.push({
      id: 'widget-corp-summary-title',
      componentName: 'hj-text-1',
      title: '职业摘要标题',
      css: { left: 30, top: topPos, width: 760, height: 30, zIndex: 2, fontColor: themeColor, fontSize: 16, fontWeight: 'bold' },
      dataSource: { text: '📌 职业摘要' }
    });
    topPos += 32;

    children.push({
      id: 'widget-corp-summary-content',
      componentName: 'hj-text-1',
      title: '职业摘要内容',
      css: { left: 30, top: topPos, width: 760, height: sumH, zIndex: 2, fontColor: '#334155', fontSize: 13, lineHeight: 1.6 },
      dataSource: { text: summary }
    });
    topPos += sumH + 20;

    // 2. Core Skills
    topPos = getSafeSectionTitleTop(topPos, 30, 40);
    children.push({
      id: 'widget-corp-skills-title',
      componentName: 'hj-text-1',
      title: '核心能力标题',
      css: { left: 30, top: topPos, width: 760, height: 30, zIndex: 2, fontColor: themeColor, fontSize: 16, fontWeight: 'bold' },
      dataSource: { text: '⚡ 核心能力与技能工具' }
    });
    topPos += 34;

    let skillX = 30;
    topPos = getSafePageBreakTop(topPos, 26);
    let skillY = topPos;
    skills.forEach((sk, sIdx) => {
      const tagW = calculateTagWidth(sk, 11.5);
      if (skillX > 30 && skillX + tagW > 770) {
        skillX = 30;
        skillY += 34;
        skillY = getSafePageBreakTop(skillY, 26);
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
    const firstWorkH = workList.length > 0 ? calculateCardHeight(workList[0].company, workList[0].role, workList[0].period, workList[0].bullets, 760, 12.5, 20) : 100;
    topPos = getSafeSectionTitleTop(topPos, 30, firstWorkH + 10);
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
      topPos = getSafePageBreakTop(topPos, cardHeight);
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
    topPos += 6;

    // 4. Project Experience
    const firstProjH = projectList.length > 0 ? calculateCardHeight(projectList[0].name, projectList[0].role, projectList[0].period, projectList[0].bullets, 760, 12.5, 20) : 100;
    topPos = getSafeSectionTitleTop(topPos, 30, firstProjH + 10);
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
      topPos = getSafePageBreakTop(topPos, cardHeight);
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
    topPos += 6;

    // 5. Education
    topPos = getSafeSectionTitleTop(topPos, 30, 40);
    children.push({
      id: 'widget-corp-edu-title',
      componentName: 'hj-text-1',
      title: '教育背景标题',
      css: { left: 30, top: topPos, width: 760, height: 30, zIndex: 2, fontColor: themeColor, fontSize: 16, fontWeight: 'bold' },
      dataSource: { text: '🎓 教育背景' }
    });
    topPos += 34;

    topPos = getSafePageBreakTop(topPos, 30);
    children.push({
      id: 'widget-corp-edu-content',
      componentName: 'hj-text-1',
      title: '教育背景内容',
      css: { left: 30, top: topPos, width: 760, height: 30, zIndex: 2, fontColor: '#334155', fontSize: 13 },
      dataSource: { text: `${edu.school}  ·  ${edu.degree}  ·  ${edu.period}` }
    });
    topPos += 45;

    const totalPages = Math.max(1, Math.ceil(topPos / A4_PAGE_HEIGHT));
    const finalHeight = totalPages * A4_PAGE_HEIGHT;

    const schemaResult: IHJSchema = {
      id: `lego-resume-corporate-${Date.now()}`,
      version: '1.0.0',
      componentsTree: [{ id: 'page-1', componentName: 'page', commentType: 'page', children }],
      css: {
        width: 820,
        height: finalHeight,
        background: '#ffffff',
        opacity: 1,
        fontFamily: 'Inter, sans-serif',
        themeColor
      },
      config: {
        title: `${name} 的【商务 Header 沉稳范】积木简历`
      }
    };
    return reflowCanvasWidgetsForPagination(schemaResult);
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
    const addTimelineSectionTitle = (titleText: string, idPrefix: string, minFollowH: number = 70) => {
      topPos = getSafeSectionTitleTop(topPos, 24, minFollowH);
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
    const sumH = calculateSummaryHeight(summary, 760, 12.5, 20);
    addTimelineSectionTitle('// 01. 职业摘要', 'summary', Math.min(sumH, 70));
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
    addTimelineSectionTitle('// 02. 核心能力与技能工具', 'coreskills', 40);
    let skillX = 30;
    topPos = getSafePageBreakTop(topPos, 26);
    let skillY = topPos;
    skills.forEach((sk, sIdx) => {
      const tagW = calculateTagWidth(sk, 11.5);
      if (skillX + tagW > 780) {
        skillX = 30;
        skillY += 32;
        skillY = getSafePageBreakTop(skillY, 26);
      }
      children.push({
        id: `widget-skill-tl-${sIdx}`,
        componentName: 'hj-rectangle',
        title: `技能 ${sIdx + 1}`,
        css: {
          left: skillX,
          top: skillY,
          width: tagW,
          height: 26,
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
    topPos = skillY + 40;

    // 3. Work Experience (With Timeline Line & Dots)
    const firstWorkH = workList.length > 0 ? calculateCardHeight(workList[0].company, workList[0].role, workList[0].period, workList[0].bullets, 722, 12.5, 20) : 100;
    addTimelineSectionTitle('// 03. 工作经历', 'work', firstWorkH + 10);
    const workLineTop = topPos + 4;
    let workCurrentY = topPos;

    workList.forEach((w, idx) => {
      const formattedBullets = w.bullets.map((b) => (b.trim().startsWith('•') ? b : `• ${b}`)).join('\n');
      const cardHeight = calculateCardHeight(w.company, w.role, w.period, w.bullets, 722, 12.5, 20);
      workCurrentY = getSafePageBreakTop(workCurrentY, cardHeight);

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
    const firstProjH = projectList.length > 0 ? calculateCardHeight(projectList[0].name, projectList[0].role, projectList[0].period, projectList[0].bullets, 722, 12.5, 20) : 100;
    addTimelineSectionTitle('// 04. 项目经历', 'project', firstProjH + 10);
    const projLineTop = topPos + 4;
    let projCurrentY = topPos;

    projectList.forEach((p, idx) => {
      const formattedBullets = p.bullets.map((b) => (b.trim().startsWith('•') ? b : `• ${b}`)).join('\n');
      const cardHeight = calculateCardHeight(p.name, p.role, p.period, p.bullets, 722, 12.5, 20);
      projCurrentY = getSafePageBreakTop(projCurrentY, cardHeight);

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
    addTimelineSectionTitle('// 05. 教育背景', 'education', 40);
    topPos = getSafePageBreakTop(topPos, 30);
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

    const totalPages = Math.max(1, Math.ceil(topPos / A4_PAGE_HEIGHT));
    const finalHeight = totalPages * A4_PAGE_HEIGHT;

    const schemaResult: IHJSchema = {
      id: `lego-resume-timeline-${Date.now()}`,
      version: '1.0.0',
      componentsTree: [{ id: 'page-1', componentName: 'page', commentType: 'page', children }],
      css: {
        width: 820,
        height: finalHeight,
        background: '#ffffff',
        opacity: 1,
        fontFamily: 'Inter, sans-serif',
        themeColor
      },
      config: {
        title: `${name} 的【时间轴极客型】积木简历`
      }
    };
    return reflowCanvasWidgetsForPagination(schemaResult);
  }

  // -------------------------------------------------------------
  // -------------------------------------------------------------
  // LAYOUT 4: Grid Cards (微阴影卡片流 / 现代卡片风格)
  // -------------------------------------------------------------
  if (effectiveTemplateId === 'grid-cards') {
    let cardTop = 25;

    // Header Card
    children.push({
      id: 'widget-grid-header-bg',
      componentName: 'hj-rectangle',
      title: '顶部卡片',
      css: {
        left: 25,
        top: cardTop,
        width: 770,
        height: 125,
        zIndex: 1,
        backgroundColor: '#f8fafc',
        borderColor: '#e2e8f0',
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
          top: cardTop + 16,
          width: avatarWidth,
          height: avatarHeight,
          zIndex: 2,
          borderRadius: avatarRadius
        },
        dataSource: { avatarSrc: avatarUrl }
      });
    }

    const gridHeaderWidth = hasAvatar ? 600 : 720;

    children.push({
      id: 'widget-grid-name',
      componentName: 'hj-text-1',
      title: '姓名',
      css: {
        left: 45,
        top: cardTop + 18,
        width: gridHeaderWidth,
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
      title: '联系方式与求职意向',
      css: {
        left: 45,
        top: cardTop + 60,
        width: gridHeaderWidth,
        height: 48,
        zIndex: 2,
        fontColor: '#475569',
        fontSize: 12.5,
        lineHeight: 1.6
      },
      dataSource: { text: `🎯 求职意向：${jobIntent}\n📫 邮箱：${email}  |  📱 电话：${phone}  |  📍 城市：${location}` }
    });

    cardTop += 140;

    // Summary Card
    const sumH = calculateSummaryHeight(summary, 730, 13, 21);
    const sumCardH = sumH + 50;
    cardTop = getSafePageBreakTop(cardTop, sumCardH);
    children.push({
      id: 'widget-grid-summary-bg',
      componentName: 'hj-rectangle',
      title: '个人总结卡片',
      css: {
        left: 25,
        top: cardTop,
        width: 770,
        height: sumCardH,
        zIndex: 1,
        backgroundColor: '#ffffff',
        borderColor: '#e2e8f0',
        borderStyle: 'solid',
        borderWidth: 1,
        borderRadius: 8
      },
      dataSource: {}
    });

    children.push({
      id: 'widget-grid-summary-title',
      componentName: 'hj-text-1',
      title: '职业总结标题',
      css: {
        left: 45,
        top: cardTop + 14,
        width: 730,
        height: 24,
        zIndex: 2,
        fontColor: themeColor,
        fontSize: 15,
        fontWeight: 'bold'
      },
      dataSource: { text: '💡 职业优势与个人总结' }
    });

    children.push({
      id: 'widget-grid-summary-content',
      componentName: 'hj-text-1',
      title: '职业总结内容',
      css: {
        left: 45,
        top: cardTop + 42,
        width: 730,
        height: sumH,
        zIndex: 2,
        fontColor: '#334155',
        fontSize: 13,
        lineHeight: 1.6
      },
      dataSource: { text: summary }
    });

    cardTop += sumCardH + 15;

    // Skills Card
    let skillRowX = 45;
    let skillRowY = cardTop + 46;
    const skillPills: IWidget[] = [];
    skills.forEach((sk, sIdx) => {
      const tagW = calculateTagWidth(sk, 11.5);
      if (skillRowX > 45 && skillRowX + tagW > 765) {
        skillRowX = 45;
        skillRowY += 34;
      }
      skillPills.push({
        id: `widget-grid-skill-${sIdx}`,
        componentName: 'hj-rectangle',
        title: `技能标签 ${sIdx + 1}`,
        css: {
          left: skillRowX,
          top: skillRowY,
          width: tagW,
          height: 26,
          zIndex: 2,
          backgroundColor: '#eff6ff',
          borderColor: '#bfdbfe',
          borderWidth: 1,
          borderStyle: 'solid',
          borderRadius: 13,
          fontColor: themeColor,
          fontSize: 11.5,
          fontWeight: '500',
          textAlign: 'center'
        },
        dataSource: { text: sk }
      });
      skillRowX += tagW + 8;
    });

    const skillsCardHeight = (skillRowY - cardTop) + 38;
    cardTop = getSafePageBreakTop(cardTop, skillsCardHeight);

    // Adjust skill pills top based on safe cardTop
    const skillTopOffset = cardTop + 46 - (skillPills[0] ? Number(skillPills[0].css.top) : cardTop + 46);
    if (skillTopOffset !== 0) {
      skillPills.forEach((p) => {
        p.css.top = (Number(p.css.top) || 0) + skillTopOffset;
      });
    }

    children.push({
      id: 'widget-grid-skills-bg',
      componentName: 'hj-rectangle',
      title: '核心技能卡片背景',
      css: {
        left: 25,
        top: cardTop,
        width: 770,
        height: skillsCardHeight,
        zIndex: 1,
        backgroundColor: '#ffffff',
        borderColor: '#e2e8f0',
        borderStyle: 'solid',
        borderWidth: 1,
        borderRadius: 8
      },
      dataSource: {}
    });

    children.push({
      id: 'widget-grid-skills-title',
      componentName: 'hj-text-1',
      title: '核心技能标题',
      css: {
        left: 45,
        top: cardTop + 14,
        width: 730,
        height: 24,
        zIndex: 2,
        fontColor: themeColor,
        fontSize: 15,
        fontWeight: 'bold'
      },
      dataSource: { text: '⚡ 核心专业技能' }
    });

    children.push(...skillPills);
    cardTop += skillsCardHeight + 18;

    // Work Experience
    const firstWorkH = workList.length > 0 ? calculateCardHeight(workList[0].company, workList[0].role, workList[0].period, workList[0].bullets, 770, 12.5, 20) : 100;
    cardTop = getSafeSectionTitleTop(cardTop, 26, firstWorkH + 10);
    children.push({
      id: 'widget-grid-work-sec-title',
      componentName: 'hj-text-1',
      title: '工作经历板块标题',
      css: {
        left: 25,
        top: cardTop,
        width: 770,
        height: 26,
        zIndex: 2,
        fontColor: themeColor,
        fontSize: 16,
        fontWeight: 'bold'
      },
      dataSource: { text: '💼 工作经历' }
    });
    cardTop += 32;

    workList.forEach((w, wIdx) => {
      const formattedBullets = w.bullets.map((b) => `• ${b}`).join('\n');
      const cardH = calculateCardHeight(w.company, w.role, w.period, w.bullets, 770, 12.5, 20);
      cardTop = getSafePageBreakTop(cardTop, cardH);

      children.push({
        id: `widget-grid-work-bg-${wIdx}`,
        componentName: 'hj-rectangle',
        title: `工作卡片背景 ${wIdx + 1}`,
        css: {
          left: 25,
          top: cardTop,
          width: 770,
          height: cardH,
          zIndex: 1,
          backgroundColor: '#ffffff',
          borderColor: '#e2e8f0',
          borderStyle: 'solid',
          borderWidth: 1,
          borderRadius: 8
        },
        dataSource: {}
      });

      children.push({
        id: `widget-grid-work-header-${wIdx}`,
        componentName: 'hj-text-1',
        title: `工作信息头部 ${wIdx + 1}`,
        css: {
          left: 45,
          top: cardTop + 12,
          width: 730,
          height: 24,
          zIndex: 2,
          fontColor: '#0f172a',
          fontSize: 14,
          fontWeight: 'bold'
        },
        dataSource: { text: `${w.company}  ·  ${w.role}  (${w.period})` }
      });

      children.push({
        id: `widget-grid-work-content-${wIdx}`,
        componentName: 'hj-text-1',
        title: `工作要点内容 ${wIdx + 1}`,
        css: {
          left: 45,
          top: cardTop + 40,
          width: 730,
          height: Math.max(30, cardH - 52),
          zIndex: 2,
          fontColor: '#334155',
          fontSize: 12.5,
          lineHeight: 1.6
        },
        dataSource: {
          companyName: w.company,
          jobTitle: w.role,
          workTime: w.period,
          workContent: formattedBullets,
          text: formattedBullets
        }
      });

      cardTop += cardH + 12;
    });

    cardTop += 6;

    // Project Experience
    if (projectList.length > 0) {
      const firstProjH = projectList.length > 0 ? calculateCardHeight(projectList[0].name, projectList[0].role, projectList[0].period, projectList[0].bullets, 770, 12.5, 20) : 100;
      cardTop = getSafeSectionTitleTop(cardTop, 26, firstProjH + 10);
      children.push({
        id: 'widget-grid-proj-sec-title',
        componentName: 'hj-text-1',
        title: '项目经历板块标题',
        css: {
          left: 25,
          top: cardTop,
          width: 770,
          height: 26,
          zIndex: 2,
          fontColor: themeColor,
          fontSize: 16,
          fontWeight: 'bold'
        },
        dataSource: { text: '🚀 重点项目经历' }
      });
      cardTop += 32;

      projectList.forEach((p, pIdx) => {
        const formattedBullets = p.bullets.map((b) => `• ${b}`).join('\n');
        const cardH = calculateCardHeight(p.name, p.role, p.period, p.bullets, 770, 12.5, 20);
        cardTop = getSafePageBreakTop(cardTop, cardH);

        children.push({
          id: `widget-grid-proj-bg-${pIdx}`,
          componentName: 'hj-rectangle',
          title: `项目卡片背景 ${pIdx + 1}`,
          css: {
            left: 25,
            top: cardTop,
            width: 770,
            height: cardH,
            zIndex: 1,
            backgroundColor: '#ffffff',
            borderColor: '#e2e8f0',
            borderStyle: 'solid',
            borderWidth: 1,
            borderRadius: 8
          },
          dataSource: {}
        });

        children.push({
          id: `widget-grid-proj-header-${pIdx}`,
          componentName: 'hj-text-1',
          title: `项目信息头部 ${pIdx + 1}`,
          css: {
            left: 45,
            top: cardTop + 12,
            width: 730,
            height: 24,
            zIndex: 2,
            fontColor: '#0f172a',
            fontSize: 14,
            fontWeight: 'bold'
          },
          dataSource: { text: `${p.name}  ·  ${p.role}  (${p.period})` }
        });

        children.push({
          id: `widget-grid-proj-content-${pIdx}`,
          componentName: 'hj-text-1',
          title: `项目要点内容 ${pIdx + 1}`,
          css: {
            left: 45,
            top: cardTop + 40,
            width: 730,
            height: Math.max(30, cardH - 52),
            zIndex: 2,
            fontColor: '#334155',
            fontSize: 12.5,
            lineHeight: 1.6
          },
          dataSource: {
            companyName: p.name,
            jobTitle: p.role,
            workTime: p.period,
            workContent: formattedBullets,
            text: formattedBullets
          }
        });

        cardTop += cardH + 12;
      });
      cardTop += 6;
    }

    // Education Card
    const eduCardH = 74;
    cardTop = getSafePageBreakTop(cardTop, eduCardH);
    children.push({
      id: 'widget-grid-edu-bg',
      componentName: 'hj-rectangle',
      title: '教育背景卡片',
      css: {
        left: 25,
        top: cardTop,
        width: 770,
        height: eduCardH,
        zIndex: 1,
        backgroundColor: '#ffffff',
        borderColor: '#e2e8f0',
        borderStyle: 'solid',
        borderWidth: 1,
        borderRadius: 8
      },
      dataSource: {}
    });

    children.push({
      id: 'widget-grid-edu-title',
      componentName: 'hj-text-1',
      title: '教育背景标题',
      css: {
        left: 45,
        top: cardTop + 12,
        width: 730,
        height: 22,
        zIndex: 2,
        fontColor: themeColor,
        fontSize: 14,
        fontWeight: 'bold'
      },
      dataSource: { text: '🎓 教育背景' }
    });

    children.push({
      id: 'widget-grid-edu-content',
      componentName: 'hj-text-1',
      title: '教育背景内容',
      css: {
        left: 45,
        top: cardTop + 38,
        width: 730,
        height: 26,
        zIndex: 2,
        fontColor: '#334155',
        fontSize: 13
      },
      dataSource: { text: `${edu.school}  ·  ${edu.degree}  (${edu.period})` }
    });

    cardTop += eduCardH + 30;

    const totalPages = Math.max(1, Math.ceil(cardTop / A4_PAGE_HEIGHT));
    const finalHeight = totalPages * A4_PAGE_HEIGHT;

    const schemaResult: IHJSchema = {
      id: `lego-resume-grid-cards-${Date.now()}`,
      version: '1.0.0',
      componentsTree: [{ id: 'page-1', componentName: 'page', commentType: 'page', children }],
      css: {
        width: 820,
        height: finalHeight,
        background: '#f8fafc',
        opacity: 1,
        fontFamily: 'Inter, sans-serif',
        themeColor
      },
      config: {
        title: `${name} 的【微阴影卡片流】积木简历`
      }
    };
    return reflowCanvasWidgetsForPagination(schemaResult);
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
    const addMinimalSectionTitle = (titleText: string, idPrefix: string, minFollowH: number = 70) => {
      topPos = getSafeSectionTitleTop(topPos, 32, minFollowH);
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
    const summaryH = calculateSummaryHeight(summary, 740, 13, 20);
    addMinimalSectionTitle('个人优势 & 核心能力 PROFILE', 'profile', Math.min(summaryH, 70));
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
    const firstWorkH = workList.length > 0 ? calculateCardHeight(workList[0].company, workList[0].role, workList[0].period, workList[0].bullets, 740, 13, 20) : 100;
    addMinimalSectionTitle('工作经历 WORK EXPERIENCE', 'work', firstWorkH + 10);
    workList.forEach((w, idx) => {
      const formattedBullets = w.bullets.map((b) => (b.trim().startsWith('•') || b.trim().startsWith('1.') || b.trim().startsWith('2.')) ? b : `• ${b}`).join('\n');
      const cardHeight = calculateCardHeight(w.company, w.role, w.period, w.bullets, 740, 13, 20);
      topPos = getSafePageBreakTop(topPos, cardHeight);
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
    const firstProjH = projectList.length > 0 ? calculateCardHeight(projectList[0].name, projectList[0].role, projectList[0].period, projectList[0].bullets, 740, 13, 20) : 100;
    addMinimalSectionTitle('项目经验 PROJECT EXPERIENCE', 'project', firstProjH + 10);
    projectList.forEach((p, idx) => {
      const formattedBullets = p.bullets.map((b) => (b.trim().startsWith('•') || b.trim().startsWith('1.') || b.trim().startsWith('2.')) ? b : `• ${b}`).join('\n');
      const cardHeight = calculateCardHeight(p.name, p.role, p.period, p.bullets, 740, 13, 20);
      topPos = getSafePageBreakTop(topPos, cardHeight);
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
    addMinimalSectionTitle('教育背景 EDUCATION', 'education', 40);
    topPos = getSafePageBreakTop(topPos, 60);
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
    addMinimalSectionTitle('技能软件 & 工具 SKILLS & TOOLS', 'skills', 40);
    topPos = getSafePageBreakTop(topPos, 50);
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

    const totalPages = Math.max(1, Math.ceil(topPos / A4_PAGE_HEIGHT));
    const finalHeight = totalPages * A4_PAGE_HEIGHT;

    const schemaResult: IHJSchema = {
      id: `lego-resume-minimal-${Date.now()}`,
      version: '1.0.0',
      componentsTree: [{ id: 'page-1', componentName: 'page', commentType: 'page', children }],
      css: {
        width: 820,
        height: finalHeight,
        background: '#ffffff',
        opacity: 1,
        fontFamily: 'Inter, sans-serif',
        themeColor: '#059669'
      },
      config: {
        title: `${name} 的【简约清新风格】积木简历`
      }
    };
    return reflowCanvasWidgetsForPagination(schemaResult);
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
    const addClassicSectionTitle = (titleText: string, idPrefix: string, minFollowH: number = 70) => {
      topPos = getSafeSectionTitleTop(topPos, 24, minFollowH);
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
    const sumH = calculateSummaryHeight(summary, 760, 12.5, 20);
    addClassicSectionTitle('职业摘要', 'summary', Math.min(sumH, 70));
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
    addClassicSectionTitle('核心能力与专业技能', 'coreskills', 40);
    let skillX = 30;
    topPos = getSafePageBreakTop(topPos, 26);
    let skillY = topPos;
    skills.forEach((sk, sIdx) => {
      const tagW = calculateTagWidth(sk, 11.5);
      if (skillX + tagW > 780) {
        skillX = 30;
        skillY += 32;
        skillY = getSafePageBreakTop(skillY, 26);
      }
      children.push({
        id: `widget-skill-pill-${sIdx}`,
        componentName: 'hj-rectangle',
        title: `技能 ${sIdx + 1}`,
        css: {
          left: skillX,
          top: skillY,
          width: tagW,
          height: 26,
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
    topPos = skillY + 40;

    // 3. Work Experience
    const firstWorkH = workList.length > 0 ? calculateCardHeight(workList[0].company, workList[0].role, workList[0].period, workList[0].bullets, 760, 12.5, 20) : 100;
    addClassicSectionTitle('工作经历', 'work', firstWorkH + 10);
    workList.forEach((w, idx) => {
      const formattedBullets = w.bullets.map((b) => (b.trim().startsWith('•') ? b : `• ${b}`)).join('\n');
      const cardHeight = calculateCardHeight(w.company, w.role, w.period, w.bullets, 760, 12.5, 20);
      topPos = getSafePageBreakTop(topPos, cardHeight);
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
    const firstProjH = projectList.length > 0 ? calculateCardHeight(projectList[0].name, projectList[0].role, projectList[0].period, projectList[0].bullets, 760, 12.5, 20) : 100;
    addClassicSectionTitle('项目经历', 'project', firstProjH + 10);
    projectList.forEach((p, idx) => {
      const formattedBullets = p.bullets.map((b) => (b.trim().startsWith('•') ? b : `• ${b}`)).join('\n');
      const cardHeight = calculateCardHeight(p.name, p.role, p.period, p.bullets, 760, 12.5, 20);
      topPos = getSafePageBreakTop(topPos, cardHeight);
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
    addClassicSectionTitle('教育背景', 'education', 40);
    topPos = getSafePageBreakTop(topPos, 30);
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

    const totalPages = Math.max(1, Math.ceil(topPos / A4_PAGE_HEIGHT));
    const finalHeight = totalPages * A4_PAGE_HEIGHT;

    const schemaResult: IHJSchema = {
      id: `lego-resume-classic-${Date.now()}`,
      version: '1.0.0',
      componentsTree: [{ id: 'page-1', componentName: 'page', commentType: 'page', children }],
      css: {
        width: 820,
        height: finalHeight,
        background: '#ffffff',
        opacity: 1,
        fontFamily: 'Inter, sans-serif',
        themeColor
      },
      config: {
        title: `${name} 的【经典极简单栏】积木简历`
      }
    };
    return reflowCanvasWidgetsForPagination(schemaResult);
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
  topPos = getSafeSectionTitleTop(topPos, 30, 40);
  children.push({
    id: 'widget-skills-title',
    componentName: 'hj-text-1',
    title: '技能工具标题',
    css: { left: 30, top: topPos, width: 760, height: 30, zIndex: 2, fontColor: themeColor, fontSize: 16, fontWeight: 'bold' },
    dataSource: { text: '⚡ 核心能力与技能工具' }
  });
  topPos += 34;

  let skillLeft = 30;
  topPos = getSafePageBreakTop(topPos, 26);
  let skillTop = topPos;
  skills.forEach((sk, sIdx) => {
    const tagWidth = calculateTagWidth(sk, 11.5);
    if (skillLeft > 30 && skillLeft + tagWidth > 770) {
      skillLeft = 30;
      skillTop += 34;
      skillTop = getSafePageBreakTop(skillTop, 26);
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
  const firstWorkH = workList.length > 0 ? calculateCardHeight(workList[0].company, workList[0].role, workList[0].period, workList[0].bullets, 760, 12.5, 20) : 100;
  topPos = getSafeSectionTitleTop(topPos, 30, firstWorkH + 10);
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
    topPos = getSafePageBreakTop(topPos, cardHeight);
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
  topPos += 6;

  // 4. Project Experience
  const firstProjH = projectList.length > 0 ? calculateCardHeight(projectList[0].name, projectList[0].role, projectList[0].period, projectList[0].bullets, 760, 12.5, 20) : 100;
  topPos = getSafeSectionTitleTop(topPos, 30, firstProjH + 10);
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
    topPos = getSafePageBreakTop(topPos, cardHeight);
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
  topPos += 6;

  // 5. Education
  topPos = getSafeSectionTitleTop(topPos, 30, 40);
  children.push({
    id: 'widget-edu-title',
    componentName: 'hj-text-1',
    title: '教育背景标题',
    css: { left: 30, top: topPos, width: 760, height: 30, zIndex: 2, fontColor: themeColor, fontSize: 16, fontWeight: 'bold' },
    dataSource: { text: '🎓 教育背景' }
  });
  topPos += 34;

  topPos = getSafePageBreakTop(topPos, 30);
  children.push({
    id: 'widget-edu-content',
    componentName: 'hj-text-1',
    title: '教育背景内容',
    css: { left: 30, top: topPos, width: 760, height: 30, zIndex: 2, fontColor: '#334155', fontSize: 13 },
    dataSource: { text: `${edu.school}  ·  ${edu.degree}  ·  ${edu.period}` }
  });
  topPos += 45;

  const totalPages = Math.max(1, Math.ceil(topPos / A4_PAGE_HEIGHT));
  const finalHeight = totalPages * A4_PAGE_HEIGHT;

  const schemaResult: IHJSchema = {
    id: `lego-resume-${templateId}-${Date.now()}`,
    version: '1.0.0',
    componentsTree: [{ id: 'page-1', componentName: 'page', commentType: 'page', children }],
    css: {
      width: 820,
      height: finalHeight,
      background: '#ffffff',
      opacity: 1,
      fontFamily: 'Inter, sans-serif',
      themeColor
    },
    config: {
      title: `${name} 的【${templateId}】积木简历`
    }
  };
  return reflowCanvasWidgetsForPagination(schemaResult);
}
