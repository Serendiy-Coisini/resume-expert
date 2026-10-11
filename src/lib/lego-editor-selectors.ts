import type { IHJSchema, IWidget } from '@/types/lego';

export function shouldInitializeCanvas(schema: IHJSchema, sourceKey: string | null): boolean {
  return sourceKey === null && schema.componentsTree.length === 1 && schema.componentsTree[0].children.length === 0;
}

export function getNextWidgetY(schema: IHJSchema, pageIndex: number): number {
  const children = schema.componentsTree[pageIndex]?.children ?? [];
  if (children.length === 0) return 40;
  return Math.max(40, ...children.map((widget) =>
    (Number(widget.css.top) || 0) + (Number(widget.css.height) || 40))) + 24;
}

export function isAvatarWidget(widget: IWidget): boolean {
  return widget.componentName.startsWith('hj-avatar') || widget.id.includes('avatar') ||
    (widget.title || '').includes('头像') || (widget.title || '').includes('照片');
}

export function findAvatarLocation(schema: IHJSchema): { pageIndex: number; widgetIndex: number } | null {
  for (let pageIndex = 0; pageIndex < schema.componentsTree.length; pageIndex++) {
    const widgetIndex = schema.componentsTree[pageIndex].children.findIndex(isAvatarWidget);
    if (widgetIndex >= 0) return { pageIndex, widgetIndex };
  }
  return null;
}
