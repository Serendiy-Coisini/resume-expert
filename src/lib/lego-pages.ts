import type { IHJSchema, IWidget } from '@/types/lego';
import { calculateA4PageHeight } from '@/lib/lego-adapter';
import { MAX_LEGO_PRINT_PAGES, MAX_LEGO_SCHEMA_PAGES } from '@/lib/lego-limits';

export function canAppendBlankPage(schema: IHJSchema): boolean {
  const pageHeight = calculateA4PageHeight(schema.css.width);
  const currentSlices = schema.componentsTree.reduce((count, page) =>
    count + Math.ceil((page.height || schema.css.height) / pageHeight), 0);
  return schema.componentsTree.length < MAX_LEGO_SCHEMA_PAGES &&
    currentSlices + 1 <= MAX_LEGO_PRINT_PAGES;
}

export function appendBlankPage(schema: IHJSchema): IHJSchema {
  if (!canAppendBlankPage(schema)) {
    throw new Error(`页面数量已达到限制（最多 ${MAX_LEGO_SCHEMA_PAGES} 个画布页、${MAX_LEGO_PRINT_PAGES} 个打印页）`);
  }
  const ids = new Set(schema.componentsTree.map((page) => page.id));
  let serial = schema.componentsTree.length + 1;
  while (ids.has(`page-${serial}`)) serial++;
  return {
    ...schema,
    componentsTree: [...schema.componentsTree, {
      id: `page-${serial}`,
      componentName: 'page',
      commentType: 'page',
      height: calculateA4PageHeight(schema.css.width),
      children: [],
    }],
  };
}

export interface PageMovePosition {
  left: number;
  top: number;
}

/** Move a same-page selection to another canvas page; targetIndex may point to a new page. */
export function moveWidgetsToCanvasPage(
  schema: IHJSchema,
  widgetIds: string[],
  targetIndex: number,
  primaryId: string,
  targetPosition: PageMovePosition,
  initialPositions: Record<string, PageMovePosition>,
): IHJSchema {
  const sourceIndex = schema.componentsTree.findIndex((page) => page.children.some((widget) => widget.id === primaryId));
  if (sourceIndex < 0 || targetIndex === sourceIndex || targetIndex < 0 || targetIndex > schema.componentsTree.length) return schema;

  const source = schema.componentsTree[sourceIndex];
  const ids = new Set(widgetIds);
  const moving = source.children.filter((widget) => ids.has(widget.id));
  if (moving.length === 0 || !moving.some((widget) => widget.id === primaryId)) return schema;

  const withTarget = targetIndex === schema.componentsTree.length ? appendBlankPage(schema) : schema;
  const destination = withTarget.componentsTree[targetIndex];
  if (destination.children.length + moving.length > 500) {
    throw new Error('目标页组件数量不能超过 500 个');
  }

  const base = initialPositions[primaryId];
  if (!base) return schema;
  const moved: IWidget[] = moving.map((widget) => {
    const original = initialPositions[widget.id] || widget.css;
    const customProps = { ...widget.customProps };
    const priorTextLayout = customProps.__legoTextLayout;
    if (priorTextLayout && typeof priorTextLayout === 'object') {
      customProps.__legoTextLayout = { ...priorTextLayout, pageShift: 0 };
    }
    return {
      ...widget,
      customProps,
      css: {
        ...widget.css,
        left: Math.max(0, Math.round(targetPosition.left + original.left - base.left)),
        top: Math.max(0, Math.round(targetPosition.top + original.top - base.top)),
      },
    };
  });
  const targetHeight = destination.height || schema.css.height;
  const minTop = Math.min(...moved.map((widget) => widget.css.top));
  const maxBottom = Math.max(...moved.map((widget) => widget.css.top + widget.css.height));
  if (maxBottom > targetHeight) {
    const adjustment = Math.min(minTop, maxBottom - targetHeight);
    moved.forEach((widget) => { widget.css.top -= adjustment; });
  }
  const finalBottom = Math.max(...moved.map((widget) => widget.css.top + widget.css.height));
  const pageHeight = calculateA4PageHeight(schema.css.width);
  const destinationHeight = finalBottom > targetHeight
    ? Math.ceil((finalBottom + 40) / pageHeight) * pageHeight
    : targetHeight;
  const result: IHJSchema = {
    ...withTarget,
    componentsTree: withTarget.componentsTree.map((page, index) => index === sourceIndex
      ? { ...page, children: page.children.filter((widget) => !ids.has(widget.id)) }
      : index === targetIndex
        ? { ...page, height: destinationHeight, children: [...page.children, ...moved] }
        : page),
  };
  const totalSlices = result.componentsTree.reduce((count, page) =>
    count + Math.ceil((page.height || result.css.height) / pageHeight), 0);
  if (totalSlices > MAX_LEGO_PRINT_PAGES) {
    throw new Error(`移动后超过打印页数限制（最多 ${MAX_LEGO_PRINT_PAGES} 页）`);
  }
  return result;
}
