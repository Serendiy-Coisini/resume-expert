import { create } from 'zustand';
import type { IHJSchema, IWidget, IWidgetCss, IWidgetDataSource } from '@/types/lego';
import { normalizeLegoSchema } from '@/lib/schema-normalizer';
import { getResumeSourceKey } from '@/store/resume-store';

const TEMPLATES_STORAGE_KEY = 'LEGO_MY_TEMPLATES';

export interface SavedTemplate {
  id: string;
  _id?: string;
  name: string;
  title?: string;
  category: string;
  description: string;
  cover: string;
  previewUrl?: string;
  createTime: string;
  schema: IHJSchema;
  template_json?: IHJSchema;
  isCustom?: boolean;
}

const DEFAULT_PAGE_WIDTH = 820;
const DEFAULT_PAGE_HEIGHT = 1160;

export const DEFAULT_LEGO_SCHEMA: IHJSchema = {
  id: 'lego-default',
  version: '1.0.0',
  componentsTree: [
    {
      id: 'page-1',
      componentName: 'page',
      commentType: 'page',
      children: []
    }
  ],
  css: {
    width: DEFAULT_PAGE_WIDTH,
    height: DEFAULT_PAGE_HEIGHT,
    background: '#ffffff',
    opacity: 1,
    pagePadding: { top: 30, right: 30, bottom: 30, left: 30 }
  },
  config: {
    title: '我的积木简历'
  }
};

const MAX_HISTORY_LIMIT = 30;

function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(obj);
    } catch {
      // fallback
    }
  }
  return JSON.parse(JSON.stringify(obj));
}

// Load templates from localStorage on init
const loadTemplatesFromStorage = (): SavedTemplate[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(TEMPLATES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => ({
          id: item.id || item._id || `tpl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          _id: item._id || item.id,
          name: item.name || item.title || '自定义模板',
          title: item.title || item.name || '自定义模板',
          category: item.category || '个人自定义',
          description: item.description || '',
          cover: item.cover || item.previewUrl || '',
          previewUrl: item.previewUrl || item.cover || '',
          createTime: item.createTime || new Date().toLocaleDateString('zh-CN'),
          schema: item.schema || item.template_json || deepClone(DEFAULT_LEGO_SCHEMA),
          template_json: item.template_json || item.schema || deepClone(DEFAULT_LEGO_SCHEMA),
          isCustom: true
        }));
      }
    }
  } catch (err) {
    console.warn('读取本地模板缓存失败：', err);
  }
  return [];
};

const saveTemplatesToStorage = (templates: SavedTemplate[]) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
  } catch (err) {
    console.warn('localStorage 空间受限，尝试压缩模板封面缩略图...', err);
    try {
      // Fallback 1: Keep covers only for the 2 most recent templates to save quota
      const lightweight = templates.map((t, idx) => ({
        ...t,
        cover: idx < 2 ? t.cover : '',
        previewUrl: idx < 2 ? (t.previewUrl || t.cover) : ''
      }));
      localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(lightweight));
    } catch {
      try {
        // Fallback 2: Strip covers without discarding any templates
        const stripped = templates.map((t) => ({
          ...t,
          cover: '',
          previewUrl: ''
        }));
        localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(stripped));
      } catch (finalErr) {
        console.error('无法持久化模板至 localStorage：', finalErr);
        throw new Error('模板未能保存到浏览器，请释放存储空间或导出 JSON 备份。');
      }
    }
  }
};

interface LegoDesignerState {
  sourceKey: string | null;
  schema: IHJSchema;
  selectedWidgetId: string | null;
  selectedWidgetIds: string[];
  copiedStyle: Partial<IWidgetCss> | null;
  isFormatPainterActive: boolean;
  pageActiveIndex: number;
  scale: number;
  undoStack: IHJSchema[];
  redoStack: IHJSchema[];
  savedTemplates: SavedTemplate[];

  // Actions
  pushHistoryState: () => void;
  setSchema: (schema: IHJSchema | Record<string, unknown> | unknown, saveHistory?: boolean) => void;
  setSelectedWidgetId: (id: string | null) => void;
  setSelectedWidgetIds: (ids: string[]) => void;
  toggleWidgetSelection: (id: string, isMulti?: boolean) => void;
  setPageActiveIndex: (index: number) => void;
  setScale: (scale: number | ((prev: number) => number)) => void;

  // Format painter actions
  copyWidgetStyle: (widgetId?: string) => void;
  applyCopiedStyle: (targetWidgetId: string) => void;
  toggleFormatPainter: (active?: boolean) => void;

  // Batch widget actions
  batchMoveWidgets: (widgetIds: string[], deltaX: number, deltaY: number, initialPositions: Record<string, { left: number; top: number }>, saveHistory?: boolean) => void;
  batchDeleteWidgets: (widgetIds?: string[], saveHistory?: boolean) => void;
  alignWidgets: (type: 'left' | 'centerX' | 'right' | 'top' | 'centerY' | 'bottom' | 'distributeH' | 'distributeV', widgetIds?: string[], saveHistory?: boolean) => void;

  updateWidgetCss: (widgetId: string, cssUpdate: Partial<IWidgetCss>, saveHistory?: boolean) => void;
  batchUpdateWidgetCss: (widgetIds: string[], cssUpdate: Partial<IWidgetCss>, saveHistory?: boolean) => void;
  updatePagePadding: (paddingUpdate: Partial<{ top: number; right: number; bottom: number; left: number }>, saveHistory?: boolean) => void;
  updateWidgetDataSource: (widgetId: string, dataUpdate: Partial<IWidgetDataSource>, saveHistory?: boolean) => void;
  
  addWidget: (widget: IWidget, pageIndex?: number, saveHistory?: boolean) => void;
  addWidgets: (widgets: IWidget[], pageIndex?: number, saveHistory?: boolean) => void;
  deleteWidget: (widgetId: string, saveHistory?: boolean) => void;
  duplicateWidget: (widgetId: string, saveHistory?: boolean) => void;
  moveWidgetLayer: (widgetId: string, direction: 'up' | 'down' | 'top' | 'bottom', saveHistory?: boolean) => void;
  
  addPage: () => void;
  deletePage: (pageIndex: number) => void;

  undo: () => void;
  redo: () => void;
  resetSchema: (newSchema?: IHJSchema | Record<string, unknown> | unknown, saveHistory?: boolean) => void;
  getSelectedWidget: () => IWidget | null;

  // Template management
  loadSavedTemplates: () => void;
  saveAsTemplate: (name: string, category: string, description: string, cover: string) => void;
  deleteSavedTemplate: (id: string) => void;
  loadSavedTemplate: (id: string) => void;
  updateTemplateCover: (id: string, cover: string) => void;
}

export const useLegoDesignerStore = create<LegoDesignerState>((set, get) => {
  const saveStateToHistory = (currentSchema: IHJSchema) => {
    const { undoStack } = get();
    const cloned = deepClone(currentSchema);
    const newUndo = [...undoStack, cloned];
    if (newUndo.length > MAX_HISTORY_LIMIT) {
      newUndo.shift();
    }
    return { undoStack: newUndo, redoStack: [] };
  };

  return {
    sourceKey: null,
    schema: deepClone(DEFAULT_LEGO_SCHEMA),
    selectedWidgetId: null,
    selectedWidgetIds: [],
    copiedStyle: null,
    isFormatPainterActive: false,
    pageActiveIndex: 0,
    scale: 0.62,
    undoStack: [],
    redoStack: [],
    savedTemplates: loadTemplatesFromStorage(),

    pushHistoryState: () => {
      const { schema } = get();
      const historyUpdate = saveStateToHistory(schema);
      set(historyUpdate);
    },

    setSchema: (newSchema, saveHistory = true) => {
      const normalized = normalizeLegoSchema(newSchema);
      set((state) => {
        const historyUpdate = state.sourceKey !== getResumeSourceKey() ? { undoStack: [], redoStack: [] } : saveHistory ? saveStateToHistory(state.schema) : {};
        return {
          schema: normalized,
          pageActiveIndex: 0,
          sourceKey: getResumeSourceKey(),
          selectedWidgetId: null,
          selectedWidgetIds: [],
          ...historyUpdate
        };
      });
    },

    setSelectedWidgetId: (id) =>
      set({
        selectedWidgetId: id,
        selectedWidgetIds: id ? [id] : []
      }),

    setSelectedWidgetIds: (ids) =>
      set({
        selectedWidgetIds: ids,
        selectedWidgetId: ids.length > 0 ? ids[ids.length - 1] : null
      }),

    toggleWidgetSelection: (id, isMulti = false) => {
      const { selectedWidgetIds } = get();
      if (!isMulti) {
        set({
          selectedWidgetId: id,
          selectedWidgetIds: [id]
        });
        return;
      }
      const exists = selectedWidgetIds.includes(id);
      const newIds = exists ? selectedWidgetIds.filter((item) => item !== id) : [...selectedWidgetIds, id];
      set({
        selectedWidgetIds: newIds,
        selectedWidgetId: newIds.length > 0 ? newIds[newIds.length - 1] : null
      });
    },

    // Format Painter Actions
    copyWidgetStyle: (targetId) => {
      const { selectedWidgetId, schema } = get();
      const idToCopy = targetId || selectedWidgetId;
      if (!idToCopy) return;

      let foundWidget: IWidget | null = null;
      for (const page of schema.componentsTree) {
        if (!page.children) continue;
        const found = page.children.find((w) => w.id === idToCopy);
        if (found) {
          foundWidget = found;
          break;
        }
      }

      if (foundWidget && foundWidget.css) {
        const c = foundWidget.css;
        const isTextOrExper =
          foundWidget.componentName.includes('text') ||
          foundWidget.componentName.includes('exper') ||
          foundWidget.componentName === 'hj-li' ||
          foundWidget.componentName.includes('date');

        const styleToCopy: Partial<IWidgetCss> = {
          fontColor: c.fontColor || '#334155',
          fontFamily: c.fontFamily || 'Inter, sans-serif',
          fontSize: c.fontSize || (isTextOrExper ? 13 : 14),
          fontWeight: c.fontWeight || 'normal',
          letterSpace: c.letterSpace || 0,
          lineHeight: c.lineHeight || 1.6,
          textAlign: c.textAlign || 'left',
          backgroundColor: c.backgroundColor || 'transparent',
          borderColor: c.borderColor || 'transparent',
          borderStyle: c.borderStyle || 'none',
          borderWidth: c.borderWidth !== undefined ? c.borderWidth : 0,
          borderRadius: c.borderRadius !== undefined ? c.borderRadius : 0,
          rotate: c.rotate || 0
        };

        if (c.borderLeftColor) styleToCopy.borderLeftColor = c.borderLeftColor;
        if (c.borderLeftStyle) styleToCopy.borderLeftStyle = c.borderLeftStyle;
        if (c.borderLeftWidth !== undefined) styleToCopy.borderLeftWidth = c.borderLeftWidth;
        if (c.paddingLeft !== undefined) styleToCopy.paddingLeft = c.paddingLeft;
        if (c.opacity !== undefined) styleToCopy.opacity = c.opacity;

        set({ copiedStyle: styleToCopy, isFormatPainterActive: true });
      }
    },

    applyCopiedStyle: (targetWidgetId) => {
      const { copiedStyle, schema, selectedWidgetIds } = get();
      if (!copiedStyle || !targetWidgetId) return;

      const targets =
        selectedWidgetIds.includes(targetWidgetId) && selectedWidgetIds.length > 1
          ? selectedWidgetIds
          : [targetWidgetId];

      const historyUpdate = saveStateToHistory(schema);
      const newSchema = deepClone(schema);

      const cleanHtml = (val: unknown): unknown => {
        if (typeof val === 'string') {
          return val
            .replace(/\s*style=(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
            .replace(/\s*(?:color|size|face)=(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
            .replace(/\[color=(.*?)\](.*?)\[\/color\]/gi, '$2')
            .replace(/\[size=(.*?)\](.*?)\[\/size\]/gi, '$2')
            .replace(/\[bg=(.*?)\](.*?)\[\/bg\]/gi, '$2');
        }
        if (Array.isArray(val)) {
          return val.map((item) => cleanHtml(item));
        }
        return val;
      };

      for (const page of newSchema.componentsTree) {
        if (!page.children) continue;
        for (const widget of page.children) {
          if (targets.includes(widget.id)) {
            // Apply copied CSS
            widget.css = {
              ...widget.css,
              ...copiedStyle
            };

            // Strip inline HTML style overrides so widget.css takes full effect
            if (widget.dataSource) {
              if (typeof widget.dataSource.text === 'string') {
                widget.dataSource.text = cleanHtml(widget.dataSource.text) as string;
              }
              if (typeof widget.dataSource.workContent === 'string') {
                widget.dataSource.workContent = cleanHtml(widget.dataSource.workContent) as string;
              }
              if (typeof widget.dataSource.companyName === 'string') {
                widget.dataSource.companyName = cleanHtml(widget.dataSource.companyName) as string;
              }
              if (Array.isArray(widget.dataSource.list)) {
                widget.dataSource.list = cleanHtml(widget.dataSource.list) as string[];
              }
            }
          }
        }
      }

      set({
        schema: newSchema,
        selectedWidgetId: targetWidgetId,
        selectedWidgetIds: [targetWidgetId],
        isFormatPainterActive: false,
        ...historyUpdate
      });
    },

    toggleFormatPainter: (active) => {
      const { isFormatPainterActive, copyWidgetStyle } = get();
      const nextActive = active !== undefined ? active : !isFormatPainterActive;
      if (nextActive) {
        copyWidgetStyle();
      } else {
        set({ isFormatPainterActive: false });
      }
    },

    // Batch operations
    batchMoveWidgets: (widgetIds, deltaX, deltaY, initialPositions, saveHistory = true) => {
      const { schema } = get();
      const historyUpdate = saveHistory ? saveStateToHistory(schema) : {};
      const targets = new Set(widgetIds);
      const newSchema = {
        ...schema,
        componentsTree: schema.componentsTree.map((page) => ({
          ...page,
          children: page.children?.map((widget) => {
            const initPos = initialPositions[widget.id];
            if (!targets.has(widget.id) || !initPos) return widget;
            return {
              ...widget,
              css: {
                ...widget.css,
                left: Math.max(0, Math.round(initPos.left + deltaX)),
                top: Math.max(0, Math.round(initPos.top + deltaY)),
              },
            };
          }),
        })),
      };

      set({ schema: newSchema, ...historyUpdate });
    },

    batchDeleteWidgets: (widgetIdsArg, saveHistory = true) => {
      const { schema, selectedWidgetIds } = get();
      const targets = widgetIdsArg || selectedWidgetIds;
      if (!targets || targets.length === 0) return;

      const historyUpdate = saveHistory ? saveStateToHistory(schema) : {};
      const newSchema = deepClone(schema);

      for (const page of newSchema.componentsTree) {
        if (!page.children) continue;
        page.children = page.children.filter((item) => !targets.includes(item.id));
      }

      set({
        schema: newSchema,
        selectedWidgetId: null,
        selectedWidgetIds: [],
        ...historyUpdate
      });
    },

    alignWidgets: (type, targetIdsArg, saveHistory = true) => {
      const { schema, selectedWidgetIds, selectedWidgetId } = get();
      const targets = targetIdsArg || (selectedWidgetIds.length > 0 ? selectedWidgetIds : selectedWidgetId ? [selectedWidgetId] : []);
      if (targets.length === 0) return;

      const historyUpdate = saveHistory ? saveStateToHistory(schema) : {};
      const newSchema = deepClone(schema);

      const pageWidth = newSchema.css?.width || 820;
      const pageHeight = newSchema.css?.height || 1160;

      // Find all target widgets
      const targetWidgets: IWidget[] = [];
      for (const page of newSchema.componentsTree) {
        if (!page.children) continue;
        for (const w of page.children) {
          if (targets.includes(w.id)) {
            targetWidgets.push(w);
          }
        }
      }

      if (targetWidgets.length === 0) return;

      if (targetWidgets.length === 1) {
        // Align single widget relative to Canvas page
        const w = targetWidgets[0];
        if (type === 'left') w.css.left = 0;
        if (type === 'centerX') w.css.left = Math.max(0, Math.round((pageWidth - w.css.width) / 2));
        if (type === 'right') w.css.left = Math.max(0, pageWidth - w.css.width);
        if (type === 'top') w.css.top = 0;
        if (type === 'centerY') w.css.top = Math.max(0, Math.round((pageHeight - w.css.height) / 2));
        if (type === 'bottom') w.css.top = Math.max(0, pageHeight - w.css.height);
      } else {
        // Multi-widget alignment relative to selection bounding box
        const minLeft = Math.min(...targetWidgets.map((w) => w.css.left));
        const maxRight = Math.max(...targetWidgets.map((w) => w.css.left + w.css.width));
        const minTop = Math.min(...targetWidgets.map((w) => w.css.top));
        const maxBottom = Math.max(...targetWidgets.map((w) => w.css.top + w.css.height));

        const boundingWidth = maxRight - minLeft;
        const boundingHeight = maxBottom - minTop;
        const centerX = minLeft + boundingWidth / 2;
        const centerY = minTop + boundingHeight / 2;

        if (type === 'left') {
          targetWidgets.forEach((w) => (w.css.left = minLeft));
        } else if (type === 'centerX') {
          targetWidgets.forEach((w) => (w.css.left = Math.round(centerX - w.css.width / 2)));
        } else if (type === 'right') {
          targetWidgets.forEach((w) => (w.css.left = Math.round(maxRight - w.css.width)));
        } else if (type === 'top') {
          targetWidgets.forEach((w) => (w.css.top = minTop));
        } else if (type === 'centerY') {
          targetWidgets.forEach((w) => (w.css.top = Math.round(centerY - w.css.height / 2)));
        } else if (type === 'bottom') {
          targetWidgets.forEach((w) => (w.css.top = Math.round(maxBottom - w.css.height)));
        } else if (type === 'distributeH' && targetWidgets.length >= 3) {
          const sorted = [...targetWidgets].sort((a, b) => a.css.left - b.css.left);
          const totalWidth = sorted.reduce((sum, w) => sum + w.css.width, 0);
          const gap = (maxRight - minLeft - totalWidth) / (sorted.length - 1);
          let currentX = minLeft;
          sorted.forEach((w) => {
            w.css.left = Math.round(currentX);
            currentX += w.css.width + gap;
          });
        } else if (type === 'distributeV' && targetWidgets.length >= 3) {
          const sorted = [...targetWidgets].sort((a, b) => a.css.top - b.css.top);
          const totalHeight = sorted.reduce((sum, w) => sum + w.css.height, 0);
          const gap = (maxBottom - minTop - totalHeight) / (sorted.length - 1);
          let currentY = minTop;
          sorted.forEach((w) => {
            w.css.top = Math.round(currentY);
            currentY += w.css.height + gap;
          });
        }
      }

      set({ schema: newSchema, ...historyUpdate });
    },

    setPageActiveIndex: (index) => set({ pageActiveIndex: index }),

    setScale: (scaleArg) =>
      set((state) => ({
        scale: typeof scaleArg === 'function' ? scaleArg(state.scale) : scaleArg
      })),

    updateWidgetCss: (widgetId, cssUpdate, saveHistory = true) => {
      const { schema } = get();
      const historyUpdate = saveHistory ? saveStateToHistory(schema) : {};
      const newSchema = {
        ...schema,
        componentsTree: schema.componentsTree.map((page) => {
          if (!page.children?.some((item) => item.id === widgetId)) return page;
          return {
            ...page,
            children: page.children.map((widget) =>
              widget.id === widgetId
                ? { ...widget, css: { ...widget.css, ...cssUpdate } }
                : widget
            ),
          };
        }),
      };

      set({ schema: newSchema, ...historyUpdate });
    },

    batchUpdateWidgetCss: (widgetIds, cssUpdate, saveHistory = true) => {
      if (!widgetIds || widgetIds.length === 0) return;
      const { schema } = get();
      const historyUpdate = saveHistory ? saveStateToHistory(schema) : {};
      const newSchema = deepClone(schema);

      for (const page of newSchema.componentsTree) {
        if (!page.children) continue;
        for (const widget of page.children) {
          if (widgetIds.includes(widget.id)) {
            widget.css = { ...widget.css, ...cssUpdate };
          }
        }
      }

      set({ schema: newSchema, ...historyUpdate });
    },

    updatePagePadding: (paddingUpdate, saveHistory = true) => {
      const { schema } = get();
      const historyUpdate = saveHistory ? saveStateToHistory(schema) : {};
      const newSchema = deepClone(schema);

      const oldPadding = newSchema.css.pagePadding || { top: 0, right: 0, bottom: 0, left: 0 };
      const newPadding = {
        top: Math.max(0, paddingUpdate.top !== undefined ? paddingUpdate.top : oldPadding.top),
        right: Math.max(0, paddingUpdate.right !== undefined ? paddingUpdate.right : oldPadding.right),
        bottom: Math.max(0, paddingUpdate.bottom !== undefined ? paddingUpdate.bottom : oldPadding.bottom),
        left: Math.max(0, paddingUpdate.left !== undefined ? paddingUpdate.left : oldPadding.left)
      };
      newSchema.css.pagePadding = newPadding;

      const pageWidth = newSchema.css.width || 820;

      // Target usable width and left offset
      const targetLeft = newPadding.left;
      const targetRight = Math.max(targetLeft + 50, pageWidth - newPadding.right);
      const targetW = targetRight - targetLeft;

      for (const page of newSchema.componentsTree) {
        if (!page.children || page.children.length === 0) continue;

        // 1. Measure the current actual bounding box of content on this page
        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;

        for (const widget of page.children) {
          const wLeft = Number(widget.css.left) || 0;
          const wWidth = Number(widget.css.width) || 40;
          const wTop = Number(widget.css.top) || 0;

          if (wLeft < minX) minX = wLeft;
          if (wLeft + wWidth > maxX) maxX = wLeft + wWidth;
          if (wTop < minY) minY = wTop;
        }

        if (!isFinite(minX) || !isFinite(maxX) || maxX <= minX) {
          minX = oldPadding.left || 0;
          maxX = pageWidth - (oldPadding.right || 0);
        }

        const currentW = Math.max(1, maxX - minX);

        // 2. Vertical shift: align top-most element with newPadding.top
        const deltaY = isFinite(minY) ? (newPadding.top - minY) : (newPadding.top - oldPadding.top);

        // 3. Proportionally remap all widgets
        for (const widget of page.children) {
          const origLeft = Number(widget.css.left) || 0;
          const origWidth = Number(widget.css.width) || 40;
          const origHeight = Number(widget.css.height) || 40;
          const origTop = Number(widget.css.top) || 0;

          // Relative position & width in old bounding box (0 ~ 1)
          const relX = (origLeft - minX) / currentW;
          const relW = origWidth / currentW;

          // Shift top
          widget.css.top = Math.max(0, Math.round(origTop + deltaY));

          // 1. Thin vertical decorative/timeline lines (width <= 8px with larger height)
          const isThinVerticalLine = origWidth <= 8 && origHeight > 15;

          // 2. Small dots, bullets, icons, avatars, QR codes
          const isSmallDotOrBadge = origWidth <= 24;
          const isAvatarOrSquare =
            widget.componentName.startsWith('hj-avatar') ||
            widget.componentName === 'hj-icon' ||
            widget.componentName === 'hj-circle' ||
            widget.componentName === 'hj-other-2' ||
            (Math.abs(origWidth - origHeight) <= 4 && origWidth < 120);

          if (isThinVerticalLine || isSmallDotOrBadge || isAvatarOrSquare) {
            // Keep exact pixel width & height, position its center proportionally
            const relCenterX = (origLeft + origWidth / 2 - minX) / currentW;
            const newCenterX = targetLeft + relCenterX * targetW;
            widget.css.left = Math.round(newCenterX - origWidth / 2);
            widget.css.width = origWidth;
          } else {
            // General text, section dividers, cards, backgrounds
            const newLeft = Math.round(targetLeft + relX * targetW);
            const newWidth = Math.max(1, Math.round(relW * targetW));
            widget.css.left = newLeft;
            widget.css.width = Math.min(newWidth, targetRight - newLeft);
          }
        }

        // 4. Update canvas height if bottom elements expand
        const maxBottom = Math.max(...page.children.map((w) => (Number(w.css.top) || 0) + (Number(w.css.height) || 40))) + newPadding.bottom;
        if (maxBottom > (newSchema.css.height || 1160)) {
          newSchema.css.height = maxBottom;
        }
      }

      set({ schema: newSchema, ...historyUpdate });
    },

    updateWidgetDataSource: (widgetId, dataUpdate, saveHistory = true) => {
      const { schema } = get();
      const historyUpdate = saveHistory ? saveStateToHistory(schema) : {};
      const newSchema = deepClone(schema);

      for (const page of newSchema.componentsTree) {
        const widget = page.children?.find((item) => item.id === widgetId);
        if (widget) {
          widget.dataSource = { ...widget.dataSource, ...dataUpdate };
          break;
        }
      }

      set({ schema: newSchema, ...historyUpdate });
    },

    addWidgets: (widgets, pageIndexArg, saveHistory = true) => {
      if (!widgets || widgets.length === 0) return;
      const { schema, pageActiveIndex } = get();
      const historyUpdate = saveHistory ? saveStateToHistory(schema) : {};
      const newSchema = deepClone(schema);
      const targetPageIndex = pageIndexArg ?? (pageActiveIndex >= 0 ? pageActiveIndex : 0);

      if (!newSchema.componentsTree[targetPageIndex]) {
        newSchema.componentsTree[targetPageIndex] = {
          id: `page-${Date.now()}`,
          componentName: 'page',
          commentType: 'page',
          children: []
        };
      }

      if (!newSchema.componentsTree[targetPageIndex].children) {
        newSchema.componentsTree[targetPageIndex].children = [];
      }

      let lastId = '';
      let maxBottom = Number(newSchema.css.height) || 1160;

      widgets.forEach((widget, index) => {
        const newWidget = deepClone(widget);
        if (!newWidget.id) {
          newWidget.id = `widget-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 7)}`;
        }
        lastId = newWidget.id;

        const widgetBottom = (Number(newWidget.css.top) || 0) + (Number(newWidget.css.height) || 40);
        if (widgetBottom + 60 > maxBottom) {
          maxBottom = widgetBottom + 60;
        }

        newSchema.componentsTree[targetPageIndex].children.push(newWidget);
      });

      newSchema.css.height = maxBottom;

      set({
        schema: newSchema,
        selectedWidgetId: lastId,
        ...historyUpdate
      });
    },

    addWidget: (widget, pageIndexArg, saveHistory = true) => {
      const { addWidgets } = get();
      addWidgets([widget], pageIndexArg, saveHistory);
    },

    deleteWidget: (widgetId, saveHistory = true) => {
      const { schema, selectedWidgetId } = get();
      const historyUpdate = saveHistory ? saveStateToHistory(schema) : {};
      const newSchema = deepClone(schema);

      for (const page of newSchema.componentsTree) {
        if (!page.children) continue;
        const index = page.children.findIndex((item) => item.id === widgetId);
        if (index !== -1) {
          page.children.splice(index, 1);
          break;
        }
      }

      set({
        schema: newSchema,
        selectedWidgetId: selectedWidgetId === widgetId ? null : selectedWidgetId,
        ...historyUpdate
      });
    },

    duplicateWidget: (widgetId, saveHistory = true) => {
      const { schema } = get();
      const newSchema = deepClone(schema);
      let targetWidget: IWidget | null = null;
      let targetPageIndex = 0;

      for (let pIdx = 0; pIdx < newSchema.componentsTree.length; pIdx++) {
        if (!newSchema.componentsTree[pIdx]?.children) continue;
        const found = newSchema.componentsTree[pIdx].children.find((item) => item.id === widgetId);
        if (found) {
          targetWidget = found;
          targetPageIndex = pIdx;
          break;
        }
      }

      if (!targetWidget) return;

      const historyUpdate = saveHistory ? saveStateToHistory(schema) : {};
      const duplicated: IWidget = deepClone(targetWidget);
      duplicated.id = `widget-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      duplicated.css.left = (duplicated.css.left || 0) + 20;
      duplicated.css.top = (duplicated.css.top || 0) + 20;

      newSchema.componentsTree[targetPageIndex].children.push(duplicated);

      set({
        schema: newSchema,
        selectedWidgetId: duplicated.id,
        ...historyUpdate
      });
    },

    moveWidgetLayer: (widgetId, direction, saveHistory = true) => {
      const { schema } = get();
      const newSchema = deepClone(schema);

      for (const page of newSchema.componentsTree) {
        const list = page.children;
        if (!list) continue;
        const idx = list.findIndex((item) => item.id === widgetId);
        if (idx === -1) continue;

        const historyUpdate = saveHistory ? saveStateToHistory(schema) : {};

        if (direction === 'up' && idx < list.length - 1) {
          const temp = list[idx];
          list[idx] = list[idx + 1];
          list[idx + 1] = temp;
        } else if (direction === 'down' && idx > 0) {
          const temp = list[idx];
          list[idx] = list[idx - 1];
          list[idx - 1] = temp;
        } else if (direction === 'top') {
          const [moved] = list.splice(idx, 1);
          list.push(moved);
        } else if (direction === 'bottom') {
          const [moved] = list.splice(idx, 1);
          list.unshift(moved);
        }

        // Adjust zIndexes
        list.forEach((item, index) => {
          if (item.css) {
            item.css.zIndex = index + 1;
          }
        });

        set({ schema: newSchema, ...historyUpdate });
        break;
      }
    },

    addPage: () => {
      const { schema } = get();
      const historyUpdate = saveStateToHistory(schema);
      const newSchema = deepClone(schema);

      newSchema.componentsTree.push({
        id: `page-${Date.now()}`,
        componentName: 'page',
        commentType: 'page',
        children: []
      });

      set({
        schema: newSchema,
        pageActiveIndex: newSchema.componentsTree.length - 1,
        ...historyUpdate
      });
    },

    deletePage: (pageIndex) => {
      const { schema, pageActiveIndex } = get();
      if (schema.componentsTree.length <= 1) return; // Keep at least 1 page

      const historyUpdate = saveStateToHistory(schema);
      const newSchema = deepClone(schema);
      newSchema.componentsTree.splice(pageIndex, 1);

      set({
        schema: newSchema,
        pageActiveIndex: Math.min(pageActiveIndex, newSchema.componentsTree.length - 1),
        ...historyUpdate
      });
    },

    undo: () => {
      const { undoStack, redoStack, schema } = get();
      if (undoStack.length === 0) return;

      const previousSchema = undoStack[undoStack.length - 1];
      const newUndo = undoStack.slice(0, undoStack.length - 1);
      const newRedo = [deepClone(schema), ...redoStack];

      set({
        schema: deepClone(previousSchema),
        undoStack: newUndo,
        redoStack: newRedo,
        selectedWidgetId: null
      });
    },

    redo: () => {
      const { undoStack, redoStack, schema } = get();
      if (redoStack.length === 0) return;

      const nextSchema = redoStack[0];
      const newRedo = redoStack.slice(1);
      const newUndo = [...undoStack, deepClone(schema)];

      set({
        schema: deepClone(nextSchema),
        undoStack: newUndo,
        redoStack: newRedo,
        selectedWidgetId: null
      });
    },

    resetSchema: (newSchema, saveHistory = true) => {
      const { schema } = get();
      const historyUpdate = get().sourceKey !== getResumeSourceKey() ? { undoStack: [], redoStack: [] } : saveHistory ? saveStateToHistory(schema) : {};
      set({
        schema: normalizeLegoSchema(newSchema || DEFAULT_LEGO_SCHEMA),
        sourceKey: getResumeSourceKey(),
        selectedWidgetIds: [],
        selectedWidgetId: null,
        pageActiveIndex: 0,
        ...historyUpdate
      });
    },

    getSelectedWidget: () => {
      const { schema, selectedWidgetId } = get();
      if (!selectedWidgetId || !schema?.componentsTree) return null;

      for (const page of schema.componentsTree) {
        if (!page?.children) continue;
        const found = page.children.find((item) => item?.id === selectedWidgetId);
        if (found) return found;
      }
      return null;
    },

    // Template management actions
    loadSavedTemplates: () => {
      set({ savedTemplates: loadTemplatesFromStorage() });
    },

    saveAsTemplate: (name, category, description, cover) => {
      const { schema, savedTemplates } = get();
      const clonedSchema = deepClone(schema);
      const newTemplate: SavedTemplate = {
        id: `tpl-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        _id: `tpl-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: name || '自定义模板',
        title: name || '自定义模板',
        category: category || '个人自定义',
        description: description || '',
        cover: cover || '',
        previewUrl: cover || '',
        createTime: new Date().toLocaleString('zh-CN', { hour12: false }),
        schema: clonedSchema,
        template_json: clonedSchema,
        isCustom: true
      };
      const updated = [newTemplate, ...savedTemplates.filter(t => t.id !== newTemplate.id && t._id !== newTemplate.id)];
      saveTemplatesToStorage(updated);
      set({ savedTemplates: updated });
    },

    deleteSavedTemplate: (id) => {
      const { savedTemplates } = get();
      const updated = savedTemplates.filter(t => t.id !== id && t._id !== id);
      saveTemplatesToStorage(updated);
      set({ savedTemplates: updated });
    },

    loadSavedTemplate: (id) => {
      const { savedTemplates, schema } = get();
      const tpl = savedTemplates.find(t => t.id === id || t._id === id);
      if (!tpl) return;
      const targetSchema = tpl.schema || tpl.template_json;
      if (!targetSchema) return;
      const historyUpdate = get().sourceKey !== getResumeSourceKey() ? { undoStack: [], redoStack: [] } : saveStateToHistory(schema);
      set({
        schema: deepClone(normalizeLegoSchema(targetSchema)),
        sourceKey: getResumeSourceKey(),
        selectedWidgetId: null,
        selectedWidgetIds: [],
        pageActiveIndex: 0,
        ...historyUpdate
      });
    },

    updateTemplateCover: (id, cover) => {
      const { savedTemplates } = get();
      const updated = savedTemplates.map(t =>
        (t.id === id || t._id === id) ? { ...t, cover, previewUrl: cover } : t
      );
      saveTemplatesToStorage(updated);
      set({ savedTemplates: updated });
    }
  };
});
