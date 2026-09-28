import type { IHJSchema, IWidget } from '@/types/lego';
import { calculateA4PageHeight } from '@/lib/lego-adapter';
import { MAX_LEGO_PRINT_PAGES } from '@/lib/lego-limits';

const TEXT_LAYOUT_KEY = '__legoTextLayout';
const BACKGROUND_LAYOUT_KEY = '__legoBackgroundLayout';
const CANVAS_BASE_HEIGHT_KEY = '__legoCanvasBaseHeight';

interface TextLayoutInfo { baseHeight: number; pageShift: number }
interface BackgroundLayoutInfo { baseHeight: number; textIds: string[] }

const isBackground = (widget: IWidget) =>
  widget.componentName === 'hj-rectangle' || widget.componentName === 'hj-bg';

const overlapsHorizontally = (a: IWidget, b: IWidget) =>
  a.css.left < b.css.left + b.css.width && b.css.left < a.css.left + a.css.width;

function textLayoutInfo(widget: IWidget): TextLayoutInfo | null {
  const value = widget.customProps?.[TEXT_LAYOUT_KEY];
  if (!value || typeof value !== 'object') return null;
  const info = value as Partial<TextLayoutInfo>;
  return typeof info.baseHeight === 'number' && Number.isFinite(info.baseHeight) &&
    typeof info.pageShift === 'number' && Number.isFinite(info.pageShift)
    ? { baseHeight: info.baseHeight, pageShift: info.pageShift }
    : null;
}

function backgroundLayoutInfo(widget: IWidget): BackgroundLayoutInfo | null {
  const value = widget.customProps?.[BACKGROUND_LAYOUT_KEY];
  if (!value || typeof value !== 'object') return null;
  const info = value as Partial<BackgroundLayoutInfo>;
  return typeof info.baseHeight === 'number' && Number.isFinite(info.baseHeight) && Array.isArray(info.textIds)
    ? { baseHeight: info.baseHeight, textIds: info.textIds.filter((id): id is string => typeof id === 'string') }
    : null;
}

function pageShiftForText(top: number, height: number, pageHeight: number, topInset: number, bottomInset: number): number {
  if (height > pageHeight - topInset - bottomInset) return 0;
  const boundary = (Math.floor(top / pageHeight) + 1) * pageHeight;
  return top + height > boundary - bottomInset ? boundary + topInset - top : 0;
}

/** Reconcile intrinsic text height with canvas geometry, including shrinking previous automatic expansion. */
export function applyMeasuredTextHeights(schema: IHJSchema, measuredHeights: Record<string, number>): IHJSchema {
  const pageHeight = calculateA4PageHeight(schema.css.width);
  const topInset = Math.min(80, Math.max(20, schema.css.pagePadding?.top ?? 40));
  const bottomInset = Math.min(80, Math.max(20, schema.css.pagePadding?.bottom ?? 40));
  const measurements = Object.entries(measuredHeights).filter(([, height]) => Number.isFinite(height) && height > 0);
  const hasManagedLayout = Boolean(schema.meta?.[CANVAS_BASE_HEIGHT_KEY]) || schema.componentsTree.some((page) =>
    page.autoLayoutBaseHeight !== undefined || page.children.some((widget) => backgroundLayoutInfo(widget)));
  const hasTextChange = schema.componentsTree.some((page) => page.children.some((widget) => {
    const measurement = measuredHeights[widget.id];
    if (!Number.isFinite(measurement) || measurement <= 0) return false;
    const info = textLayoutInfo(widget);
    const desired = Math.max(info?.baseHeight ?? widget.css.height, Math.ceil(measurement));
    const shift = pageShiftForText(widget.css.top - (info?.pageShift ?? 0), desired, pageHeight, topInset, bottomInset);
    return Math.abs(desired - widget.css.height) > 1 || shift !== (info?.pageShift ?? 0);
  }));
  if (!hasTextChange && !hasManagedLayout) return schema;

  const copy = structuredClone(schema);
  let changed = false;
  for (const page of copy.componentsTree) {
    const candidates = measurements
      .map(([id, height]) => ({ widget: page.children.find((item) => item.id === id), height: Math.ceil(height) }))
      .filter((item): item is { widget: IWidget; height: number } => Boolean(item.widget))
      .sort((a, b) => a.widget.css.top - b.widget.css.top);

    for (const { widget, height } of candidates) {
      if (height > 20_000) throw new Error('文本块过长，请拆分内容或增大文本框宽度');
      const previous = textLayoutInfo(widget);
      const baseHeight = previous?.baseHeight ?? widget.css.height;
      const desiredHeight = Math.max(baseHeight, height);
      const oldTop = widget.css.top;
      const oldBottom = oldTop + widget.css.height;
      const flowTop = oldTop - (previous?.pageShift ?? 0);
      const pageShift = pageShiftForText(flowTop, desiredHeight, pageHeight, topInset, bottomInset);
      const nextTop = flowTop + pageShift;
      if (Math.abs(desiredHeight - widget.css.height) <= 1 && nextTop === oldTop) continue;

      widget.css.top = nextTop;
      widget.css.height = desiredHeight;
      const customProps = { ...widget.customProps };
      if (desiredHeight > baseHeight || pageShift > 0) {
        customProps[TEXT_LAYOUT_KEY] = { baseHeight, pageShift } satisfies TextLayoutInfo;
      } else {
        delete customProps[TEXT_LAYOUT_KEY];
      }
      widget.customProps = customProps;
      changed = true;
      const delta = nextTop + desiredHeight - oldBottom;

      for (const other of page.children) {
        if (other === widget || !overlapsHorizontally(widget, other)) continue;
        const otherBottom = other.css.top + other.css.height;
        if (isBackground(other) && other.css.top <= oldTop && otherBottom >= oldBottom - 2) {
          const info = backgroundLayoutInfo(other) ?? { baseHeight: other.css.height, textIds: [] };
          if (!info.textIds.includes(widget.id)) info.textIds.push(widget.id);
          other.customProps = { ...other.customProps, [BACKGROUND_LAYOUT_KEY]: info };
        } else if (!isBackground(other) && other.css.top >= oldBottom - 1) {
          other.css.top = Math.max(0, other.css.top + delta);
        }
      }
    }

    for (const background of page.children.filter(isBackground)) {
      const info = backgroundLayoutInfo(background);
      if (!info) continue;
      const managed = page.children.filter((widget) => info.textIds.includes(widget.id));
      const requiredHeight = managed.length > 0
        ? Math.max(...managed.map((widget) => widget.css.top + widget.css.height + 8 - background.css.top))
        : 0;
      const desiredHeight = Math.max(info.baseHeight, requiredHeight);
      if (background.css.height !== desiredHeight) {
        background.css.height = desiredHeight;
        changed = true;
      }
      if (desiredHeight === info.baseHeight) {
        const props = { ...background.customProps };
        delete props[BACKGROUND_LAYOUT_KEY];
        background.customProps = props;
        changed = true;
      }
    }
  }

  const priorCanvasBase = copy.meta?.[CANVAS_BASE_HEIGHT_KEY];
  const legacyBaseHeight = typeof priorCanvasBase === 'number' && Number.isFinite(priorCanvasBase)
    ? priorCanvasBase : copy.css.height;
  let neededLegacyHeight = 0;
  for (const page of copy.componentsTree) {
    const maxContentBottom = Math.max(0, ...page.children.filter((widget) => !isBackground(widget))
      .map((widget) => widget.css.top + widget.css.height));
    if (page.height !== undefined) {
      const baseHeight = page.autoLayoutBaseHeight ?? page.height;
      const desired = maxContentBottom <= baseHeight ? baseHeight
        : Math.max(baseHeight, Math.ceil((maxContentBottom + 40) / pageHeight) * pageHeight);
      if (page.height !== desired) { page.height = desired; changed = true; }
      if (desired === baseHeight && page.autoLayoutBaseHeight !== undefined) changed = true;
      page.autoLayoutBaseHeight = desired > baseHeight ? baseHeight : undefined;
    } else {
      neededLegacyHeight = Math.max(neededLegacyHeight, maxContentBottom <= legacyBaseHeight
        ? legacyBaseHeight : Math.ceil((maxContentBottom + 40) / pageHeight) * pageHeight);
    }
  }
  if (neededLegacyHeight > 0) {
    const baseHeight = legacyBaseHeight;
    const desired = Math.max(baseHeight, neededLegacyHeight);
    if (copy.css.height !== desired) { copy.css.height = desired; changed = true; }
    const meta = { ...copy.meta };
    if (desired > baseHeight) meta[CANVAS_BASE_HEIGHT_KEY] = baseHeight;
    else {
      if (CANVAS_BASE_HEIGHT_KEY in meta) changed = true;
      delete meta[CANVAS_BASE_HEIGHT_KEY];
    }
    copy.meta = meta;
  }

  if (!changed) return schema;
  const totalPages = copy.componentsTree.reduce((count, page) =>
    count + Math.ceil((page.height || copy.css.height) / pageHeight), 0);
  if (totalPages > MAX_LEGO_PRINT_PAGES) {
    throw new Error(`文本超出画布容量（最多 ${MAX_LEGO_PRINT_PAGES} 页），请缩短内容或增大文本框宽度`);
  }
  return copy;
}
