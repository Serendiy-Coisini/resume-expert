import React, { useState, useRef, useEffect } from 'react';
import { useLegoDesignerStore } from '@/store/lego-designer-store';
import { useShallow } from 'zustand/react/shallow';
import { WidgetRenderer } from './widgets/WidgetRenderer';
import type { IWidget, IHJSchema } from '@/types/lego';
import { Layers, Copy, Trash2, ArrowUp, ArrowDown, Maximize, Maximize2, Minimize2, Sparkles } from 'lucide-react';
import { calculateTagWidth, reflowCanvasWidgetsForPagination, calculateA4PageHeight } from '@/lib/lego-adapter';

const SNAP_THRESHOLD = 5; // Pixels distance for magnetic snapping

const isTextWidget = (componentName: string) =>
  componentName.startsWith('hj-text') ||
  componentName === 'hj-[#exper-1]' ||
  componentName === 'hj-li' ||
  componentName.startsWith('hj-date');

export interface LegoCanvasProps {
  isFullScreen?: boolean;
  onToggleFullScreen?: () => void;
}

export const LegoCanvas: React.FC<LegoCanvasProps> = ({ isFullScreen, onToggleFullScreen }) => {
  const {
    schema,
    selectedWidgetIds,
    scale,
    isFormatPainterActive,
    setSelectedWidgetId,
    setSelectedWidgetIds,
    toggleWidgetSelection,
    applyCopiedStyle,
    updateWidgetCss,
    batchMoveWidgets,
    batchDeleteWidgets,
    deleteWidget,
    duplicateWidget,
    moveWidgetLayer,
    pushHistoryState,
    commitHistorySnapshot,
    undo,
    redo,
    alignWidgets,
    setSchema
  } = useLegoDesignerStore(useShallow((state) => ({
    schema: state.schema,
    selectedWidgetIds: state.selectedWidgetIds,
    scale: state.scale,
    isFormatPainterActive: state.isFormatPainterActive,
    setSelectedWidgetId: state.setSelectedWidgetId,
    setSelectedWidgetIds: state.setSelectedWidgetIds,
    toggleWidgetSelection: state.toggleWidgetSelection,
    applyCopiedStyle: state.applyCopiedStyle,
    updateWidgetCss: state.updateWidgetCss,
    batchMoveWidgets: state.batchMoveWidgets,
    batchDeleteWidgets: state.batchDeleteWidgets,
    deleteWidget: state.deleteWidget,
    duplicateWidget: state.duplicateWidget,
    moveWidgetLayer: state.moveWidgetLayer,
    pushHistoryState: state.pushHistoryState,
    commitHistorySnapshot: state.commitHistorySnapshot,
    undo: state.undo,
    redo: state.redo,
    alignWidgets: state.alignWidgets,
    setSchema: state.setSchema,
  })));

  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    widgetId: string;
  } | null>(null);

  // Dragging single or multiple widgets
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    isResizing: boolean;
    resizeHandle?: string;
    startX: number;
    startY: number;
    initialLeft: number;
    initialTop: number;
    initialWidth: number;
    initialHeight: number;
    widgetId: string;
    initialPositions: Record<string, { left: number; top: number }>;
    hasMoved: boolean;
    snapshotBeforeDrag: IHJSchema;
  } | null>(null);

  // Rubberband / Box selection state (scoped to specific page)
  const [selectionBox, setSelectionBox] = useState<{
    isSelecting: boolean;
    pageIndex: number;
    pageId: string;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);

  // Active alignment guide lines for magnetic snapping
  const [guides, setGuides] = useState<{ vertical: number[]; horizontal: number[] }>({
    vertical: [],
    horizontal: []
  });

  const canvasRef = useRef<HTMLDivElement>(null);

  // Close context menu & clear selection on canvas background click
  const handleCanvasClick = () => {
    if (contextMenu) setContextMenu(null);
  };

  const handlePagePointerDown = (e: React.PointerEvent, pageIndex: number, pageId: string) => {
    if (contextMenu) setContextMenu(null);

    const target = e.target as HTMLElement;
    const isPageBg = target.classList.contains('canvas-page-bg') || target.id.startsWith('lego-canvas-page');
    if (isPageBg) {
      if (!e.shiftKey) {
        setSelectedWidgetIds([]);
      }

      const pageEl = document.getElementById(`lego-canvas-page-${pageId}`) || (e.currentTarget as HTMLElement);
      if (pageEl) {
        const rect = pageEl.getBoundingClientRect();
        const startX = (e.clientX - rect.left) / scale;
        const startY = (e.clientY - rect.top) / scale;

        setSelectionBox({
          isSelecting: true,
          pageIndex,
          pageId,
          startX,
          startY,
          currentX: startX,
          currentY: startY
        });
      }
    }
  };

  // Start dragging a widget with pointer capture and deferred history
  const handleWidgetPointerDown = (e: React.PointerEvent, widget: IWidget) => {
    e.stopPropagation();

    // Format painter mode
    if (isFormatPainterActive) {
      applyCopiedStyle(widget.id);
      return;
    }

    if (e.button === 2) {
      // Right click
      if (!selectedWidgetIds.includes(widget.id)) {
        setSelectedWidgetId(widget.id);
      }
      return;
    }

    const isShift = e.shiftKey;
    if (isShift) {
      toggleWidgetSelection(widget.id, true);
    } else {
      if (!selectedWidgetIds.includes(widget.id)) {
        setSelectedWidgetId(widget.id);
      }
    }

    try {
      (e.currentTarget as HTMLElement)?.setPointerCapture?.(e.pointerId);
    } catch {
      // Ignore
    }

    // Store initial positions of all selected widgets for batch moving
    const activeIds = isShift
      ? (selectedWidgetIds.includes(widget.id) ? selectedWidgetIds : [...selectedWidgetIds, widget.id])
      : (selectedWidgetIds.includes(widget.id) ? selectedWidgetIds : [widget.id]);

    const initialPositions: Record<string, { left: number; top: number }> = {};
    for (const page of schema.componentsTree || []) {
      for (const w of page.children || []) {
        if (activeIds.includes(w.id)) {
          initialPositions[w.id] = { left: w.css.left, top: w.css.top };
        }
      }
    }

    setDragState({
      isDragging: true,
      isResizing: false,
      startX: e.clientX,
      startY: e.clientY,
      initialLeft: widget.css.left,
      initialTop: widget.css.top,
      initialWidth: widget.css.width,
      initialHeight: widget.css.height,
      widgetId: widget.id,
      initialPositions,
      hasMoved: false,
      snapshotBeforeDrag: JSON.parse(JSON.stringify(schema))
    });
  };

  // Start resizing a widget with pointer capture and deferred history
  const handleResizePointerDown = (e: React.PointerEvent, widget: IWidget, handle: string) => {
    e.stopPropagation();
    setSelectedWidgetId(widget.id);

    try {
      (e.currentTarget as HTMLElement)?.setPointerCapture?.(e.pointerId);
    } catch {
      // Ignore
    }

    setDragState({
      isDragging: false,
      isResizing: true,
      resizeHandle: handle,
      startX: e.clientX,
      startY: e.clientY,
      initialLeft: widget.css.left,
      initialTop: widget.css.top,
      initialWidth: widget.css.width,
      initialHeight: widget.css.height,
      widgetId: widget.id,
      initialPositions: { [widget.id]: { left: widget.css.left, top: widget.css.top } },
      hasMoved: false,
      snapshotBeforeDrag: JSON.parse(JSON.stringify(schema))
    });
  };

  // Drag & Resize & Rubberband Selection Pointer Move
  const handlePointerMove = (e: React.PointerEvent) => {
    // 1. Rubberband Selection
    if (selectionBox?.isSelecting) {
      const pageEl = document.getElementById(`lego-canvas-page-${selectionBox.pageId}`);
      if (pageEl) {
        const rect = pageEl.getBoundingClientRect();
        const currentX = (e.clientX - rect.left) / scale;
        const currentY = (e.clientY - rect.top) / scale;

        setSelectionBox((prev) => (prev ? { ...prev, currentX, currentY } : null));

        const boxLeft = Math.min(selectionBox.startX, currentX);
        const boxTop = Math.min(selectionBox.startY, currentY);
        const boxRight = Math.max(selectionBox.startX, currentX);
        const boxBottom = Math.max(selectionBox.startY, currentY);

        const targetPage = schema.componentsTree?.[selectionBox.pageIndex];
        const intersectedIds: string[] = [];
        for (const w of targetPage?.children || []) {
          const wLeft = Number(w.css.left) || 0;
          const wTop = Number(w.css.top) || 0;
          const wRight = wLeft + (Number(w.css.width) || 0);
          const wBottom = wTop + (Number(w.css.height) || 0);

          if (wLeft < boxRight && wRight > boxLeft && wTop < boxBottom && wBottom > boxTop) {
            intersectedIds.push(w.id);
          }
        }
        setSelectedWidgetIds(intersectedIds);
      }
      return;
    }

    // 2. Dragging & Resizing
    if (!dragState) return;

    const rawDeltaX = (e.clientX - dragState.startX) / scale;
    const rawDeltaY = (e.clientY - dragState.startY) / scale;

    if (!dragState.hasMoved && (Math.abs(rawDeltaX) > 1.5 || Math.abs(rawDeltaY) > 1.5)) {
      dragState.hasMoved = true;
    }

    const targetPage = schema.componentsTree?.find((p) =>
      p.children?.some((w) => w.id === dragState.widgetId)
    );
    const pageWidgets: IWidget[] = targetPage?.children || [];

    const activeIds = selectedWidgetIds.includes(dragState.widgetId) ? selectedWidgetIds : [dragState.widgetId];
    const unselectedWidgets = pageWidgets.filter((w) => !activeIds.includes(w.id));

    // Alignment snapping targets
    const vTargets: number[] = [0, (schema.css?.width || 820) / 2, schema.css?.width || 820];
    const hTargets: number[] = [0, (schema.css?.height || 1160) / 2, schema.css?.height || 1160];

    unselectedWidgets.forEach((w) => {
      vTargets.push(w.css.left, w.css.left + w.css.width / 2, w.css.left + w.css.width);
      hTargets.push(w.css.top, w.css.top + w.css.height / 2, w.css.top + w.css.height);
    });

    if (dragState.isDragging) {
      let targetLeft = dragState.initialLeft + rawDeltaX;
      let targetTop = dragState.initialTop + rawDeltaY;

      const activeGuidesV: number[] = [];
      const activeGuidesH: number[] = [];

      // Calculate Snap X
      const primaryWidth = dragState.initialWidth;
      const xPoints = [
        { val: targetLeft, offset: 0 },
        { val: targetLeft + primaryWidth / 2, offset: primaryWidth / 2 },
        { val: targetLeft + primaryWidth, offset: primaryWidth }
      ];

      for (const pt of xPoints) {
        for (const targetX of vTargets) {
          if (Math.abs(pt.val - targetX) <= SNAP_THRESHOLD) {
            targetLeft = targetX - pt.offset;
            activeGuidesV.push(targetX);
            break;
          }
        }
        if (activeGuidesV.length > 0) break;
      }

      // Calculate Snap Y
      const primaryHeight = dragState.initialHeight;
      const yPoints = [
        { val: targetTop, offset: 0 },
        { val: targetTop + primaryHeight / 2, offset: primaryHeight / 2 },
        { val: targetTop + primaryHeight, offset: primaryHeight }
      ];

      for (const pt of yPoints) {
        for (const targetY of hTargets) {
          if (Math.abs(pt.val - targetY) <= SNAP_THRESHOLD) {
            targetTop = targetY - pt.offset;
            activeGuidesH.push(targetY);
            break;
          }
        }
        if (activeGuidesH.length > 0) break;
      }

      setGuides({ vertical: activeGuidesV, horizontal: activeGuidesH });

      const finalDeltaX = targetLeft - dragState.initialLeft;
      const finalDeltaY = targetTop - dragState.initialTop;

      if (activeIds.length > 1) {
        batchMoveWidgets(activeIds, finalDeltaX, finalDeltaY, dragState.initialPositions, false);
      } else {
        updateWidgetCss(
          dragState.widgetId,
          {
            left: Math.max(0, Math.round(targetLeft)),
            top: Math.max(0, Math.round(targetTop))
          },
          false
        );
      }
    } else if (dragState.isResizing && dragState.resizeHandle) {
      const handle = dragState.resizeHandle;
      let newWidth = dragState.initialWidth;
      let newHeight = dragState.initialHeight;
      let newLeft = dragState.initialLeft;
      let newTop = dragState.initialTop;

      if (handle.includes('r')) newWidth = Math.max(20, Math.round(dragState.initialWidth + rawDeltaX));
      if (handle.includes('b')) newHeight = Math.max(20, Math.round(dragState.initialHeight + rawDeltaY));
      if (handle.includes('l')) {
        const possibleWidth = Math.max(20, Math.round(dragState.initialWidth - rawDeltaX));
        newLeft = dragState.initialLeft + (dragState.initialWidth - possibleWidth);
        newWidth = possibleWidth;
      }
      if (handle.includes('t')) {
        const possibleHeight = Math.max(20, Math.round(dragState.initialHeight - rawDeltaY));
        newTop = dragState.initialTop + (dragState.initialHeight - possibleHeight);
        newHeight = possibleHeight;
      }

      updateWidgetCss(
        dragState.widgetId,
        {
          left: newLeft,
          top: newTop,
          width: newWidth,
          height: newHeight
        },
        false
      );
    }
  };

  const handlePointerUp = (e?: React.PointerEvent) => {
    if (e) {
      try {
        (e.target as HTMLElement)?.releasePointerCapture?.(e.pointerId);
      } catch {
        // Ignore
      }
    }
    if (dragState) {
      if (dragState.hasMoved) {
        commitHistorySnapshot(dragState.snapshotBeforeDrag);
      }
      setDragState(null);
    }
    if (selectionBox) setSelectionBox(null);
    setGuides({ vertical: [], horizontal: [] });
  };

  // Right-click Context Menu
  const handleContextMenu = (e: React.MouseEvent, widgetId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedWidgetIds.includes(widgetId)) {
      setSelectedWidgetId(widgetId);
    }
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      widgetId
    });
  };

  // Keybindings for Delete & Undo/Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isEditingText =
        activeEl?.tagName === 'INPUT' ||
        activeEl?.tagName === 'TEXTAREA' ||
        activeEl?.getAttribute('contenteditable') === 'true';

      if (isEditingText) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedWidgetIds.length > 0) {
          batchDeleteWidgets(selectedWidgetIds);
        }
      } else if (
        ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key) ||
        ['Numpad4', 'Numpad6', 'Numpad8', 'Numpad2'].includes(e.code)
      ) {
        if (selectedWidgetIds.length > 0) {
          e.preventDefault();
          const step = e.shiftKey ? 10 : 1;
          let deltaX = 0;
          let deltaY = 0;
          if (e.key === 'ArrowLeft' || e.code === 'Numpad4') deltaX = -step;
          if (e.key === 'ArrowRight' || e.code === 'Numpad6') deltaX = step;
          if (e.key === 'ArrowUp' || e.code === 'Numpad8') deltaY = -step;
          if (e.key === 'ArrowDown' || e.code === 'Numpad2') deltaY = step;

          const initialPositions: Record<string, { left: number; top: number }> = {};
          for (const page of schema.componentsTree || []) {
            for (const w of page.children || []) {
              if (selectedWidgetIds.includes(w.id)) {
                initialPositions[w.id] = { left: w.css.left, top: w.css.top };
              }
            }
          }
          batchMoveWidgets(selectedWidgetIds, deltaX, deltaY, initialPositions, true);
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) redo();
        else undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedWidgetIds, batchDeleteWidgets, batchMoveWidgets, schema, undo, redo]);

  const canvasWidth = schema.css?.width || 820;
  const pageHeight = calculateA4PageHeight(canvasWidth);
  const canvasHeight = schema.css?.height || pageHeight;
  const pageBreakCount = Math.floor((canvasHeight - 20) / pageHeight);
  const pageBreaks: number[] = [];
  for (let i = 1; i <= pageBreakCount; i++) {
    pageBreaks.push(i * pageHeight);
  }

  return (
    <div
      ref={canvasRef}
      className={`relative flex-1 bg-slate-200/70 overflow-auto flex flex-col items-center py-8 select-none ${
        isFormatPainterActive ? 'cursor-crosshair' : ''
      }`}
      onClick={handleCanvasClick}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div
        className="transition-transform origin-top duration-75 flex flex-col gap-8 items-center"
        style={{ transform: `scale(${scale})` }}
      >
        {(schema?.componentsTree || []).map((page, pageIndex) => {
          const pageId = page.id || `page-${pageIndex + 1}`;
          const pagePadding = schema.css?.pagePadding || { top: 0, right: 0, bottom: 0, left: 0 };
          const hasPadding = pagePadding.top > 0 || pagePadding.right > 0 || pagePadding.bottom > 0 || pagePadding.left > 0;

          // Calculate Rubberband Selection Box DOM coordinates for this specific page
          let selectionBoxStyle: React.CSSProperties | null = null;
          if (selectionBox?.isSelecting && selectionBox.pageId === pageId) {
            const boxLeft = Math.min(selectionBox.startX, selectionBox.currentX);
            const boxTop = Math.min(selectionBox.startY, selectionBox.currentY);
            const boxWidth = Math.abs(selectionBox.currentX - selectionBox.startX);
            const boxHeight = Math.abs(selectionBox.currentY - selectionBox.startY);

            selectionBoxStyle = {
              left: `${boxLeft}px`,
              top: `${boxTop}px`,
              width: `${boxWidth}px`,
              height: `${boxHeight}px`
            };
          }

          return (
          <div
            key={pageId}
            id={`lego-canvas-page-${pageId}`}
            className="canvas-page-bg relative bg-white shadow-2xl rounded-sm border border-slate-300 overflow-hidden"
            style={{
              width: `${schema.css?.width || 820}px`,
              height: `${canvasHeight}px`
            }}
            data-page-padding={JSON.stringify(pagePadding)}
            onPointerDown={(e) => handlePagePointerDown(e, pageIndex, pageId)}
          >
            {/* Page Padding / Margin Safe Zone Guides */}
            {hasPadding && (
              <div
                data-canvas-ui="true"
                className="absolute pointer-events-none z-30"
                style={{
                  top: `${pagePadding.top}px`,
                  left: `${pagePadding.left}px`,
                  right: `${pagePadding.right}px`,
                  bottom: `${pagePadding.bottom}px`,
                  border: '1px dashed rgba(99, 102, 241, 0.35)',
                }}
              />
            )}
            {/* Rubberband Selection Box */}
            {selectionBoxStyle && (
              <div
                data-canvas-ui="true"
                className="absolute border-2 border-blue-500 bg-blue-500/10 z-50 pointer-events-none rounded-xs"
                style={selectionBoxStyle}
              />
            )}

            {/* Alignment Magnetic Dashed Guidelines */}
            {guides.vertical.map((x, idx) => (
              <div
                key={`v-guide-${idx}`}
                data-canvas-ui="true"
                className="absolute top-0 bottom-0 border-l border-dashed border-rose-500 z-[100] pointer-events-none"
                style={{ left: `${x}px` }}
              />
            ))}
            {guides.horizontal.map((y, idx) => (
              <div
                key={`h-guide-${idx}`}
                data-canvas-ui="true"
                className="absolute left-0 right-0 border-t border-dashed border-rose-500 z-[100] pointer-events-none"
                style={{ top: `${y}px` }}
              />
            ))}

            {/* A4 Page Break Indicators */}
            {pageBreaks.map((yPos, index) => (
              <div
                key={`page-break-${yPos}`}
                data-canvas-ui="true"
                data-page-break-indicator="true"
                className="page-break-indicator-ui absolute left-0 right-0 z-40 pointer-events-none flex items-center justify-center"
                style={{ top: `${yPos}px` }}
              >
                <div className="w-full border-b-2 border-dashed border-amber-500/80 opacity-75 shadow-xs" />
                <span className="absolute bg-amber-600 text-white text-[10px] font-bold px-3 py-0.5 rounded-full shadow-md tracking-wider flex items-center gap-1.5 -translate-y-1/2">
                  <span>📄</span> A4 第 {index + 1} 页结束 / 第 {index + 2} 页开始
                </span>
              </div>
            ))}

            {/* Render Widgets */}
            {(page.children || []).map((widget) => {
              const isSelected = selectedWidgetIds.includes(widget.id);

              return (
                <div
                  key={widget.id}
                  className={`absolute group cursor-move ${
                    isSelected
                      ? 'ring-2 ring-blue-500 ring-offset-0 z-50'
                      : 'hover:ring-1 hover:ring-blue-300'
                  }`}
                  style={{
                    position: 'absolute',
                    left: `${widget.css.left}px`,
                    top: `${widget.css.top}px`,
                    width: `${widget.css.width}px`,
                    ...(isTextWidget(widget.componentName)
                      ? { minHeight: `${widget.css.height}px` }
                      : { height: `${widget.css.height}px` }),
                    transform: widget.css.rotate ? `rotate(${widget.css.rotate}deg)` : undefined,
                    zIndex: widget.css.zIndex || 1
                  }}
                  data-widget-id={widget.id}
                  onPointerDown={(e) => handleWidgetPointerDown(e, widget)}
                  onContextMenu={(e) => handleContextMenu(e, widget.id)}
                >
                  <WidgetRenderer widget={widget} />

                  {/* 8 Resize Handles */}
                  {isSelected && (
                    <>
                      {['tl', 'tr', 'bl', 'br', 't', 'b', 'l', 'r'].map((handle) => {
                        let posClass = '';
                        if (handle === 'tl') posClass = '-top-1.5 -left-1.5 cursor-nwse-resize';
                        if (handle === 'tr') posClass = '-top-1.5 -right-1.5 cursor-nesw-resize';
                        if (handle === 'bl') posClass = '-bottom-1.5 -left-1.5 cursor-nesw-resize';
                        if (handle === 'br') posClass = '-bottom-1.5 -right-1.5 cursor-nwse-resize';
                        if (handle === 't') posClass = '-top-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize';
                        if (handle === 'b') posClass = '-bottom-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize';
                        if (handle === 'l') posClass = 'top-1/2 -left-1.5 -translate-y-1/2 cursor-ew-resize';
                        if (handle === 'r') posClass = 'top-1/2 -right-1.5 -translate-y-1/2 cursor-ew-resize';

                        return (
                          <div
                            key={handle}
                            className={`absolute w-3 h-3 bg-white border-2 border-blue-600 rounded-full z-50 ${posClass}`}
                            onPointerDown={(e) => handleResizePointerDown(e, widget, handle)}
                          />
                        );
                      })}
                    </>
                  )}
                </div>
              );
            })}
          </div>
          );
        })}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-white shadow-xl rounded-lg border border-slate-200 py-1 z-[999] text-sm w-44 text-slate-700"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="w-full px-3 py-1.5 text-left hover:bg-slate-100 flex items-center gap-2"
            onClick={() => {
              moveWidgetLayer(contextMenu.widgetId, 'up');
              setContextMenu(null);
            }}
          >
            <ArrowUp className="w-4 h-4 text-slate-500" /> 向上一层
          </button>
          <button
            className="w-full px-3 py-1.5 text-left hover:bg-slate-100 flex items-center gap-2"
            onClick={() => {
              moveWidgetLayer(contextMenu.widgetId, 'down');
              setContextMenu(null);
            }}
          >
            <ArrowDown className="w-4 h-4 text-slate-500" /> 向下一层
          </button>
          <button
            className="w-full px-3 py-1.5 text-left hover:bg-slate-100 flex items-center gap-2"
            onClick={() => {
              moveWidgetLayer(contextMenu.widgetId, 'top');
              setContextMenu(null);
            }}
          >
            <Layers className="w-4 h-4 text-blue-500" /> 置于顶层
          </button>
          <div className="my-1 border-t border-slate-100" />
          <button
            className="w-full px-3 py-1.5 text-left hover:bg-slate-100 flex items-center gap-2"
            onClick={() => {
              duplicateWidget(contextMenu.widgetId);
              setContextMenu(null);
            }}
          >
            <Copy className="w-4 h-4 text-emerald-500" /> 复制组件
          </button>
          <div className="my-1 border-t border-slate-100" />
          <div className="px-3 py-0.5 text-[10px] font-bold text-slate-400">一键对齐:</div>
          <div className="grid grid-cols-3 gap-1 px-2 pb-1 text-[10px]">
            <button
              className="py-1 bg-slate-50 hover:bg-blue-50 hover:text-blue-600 rounded text-center border border-slate-200"
              onClick={() => {
                alignWidgets('left');
                setContextMenu(null);
              }}
              title="左对齐"
            >
              ├ 左
            </button>
            <button
              className="py-1 bg-slate-50 hover:bg-blue-50 hover:text-blue-600 rounded text-center border border-slate-200"
              onClick={() => {
                alignWidgets('centerX');
                setContextMenu(null);
              }}
              title="水平居中"
            >
              ┼ 居中
            </button>
            <button
              className="py-1 bg-slate-50 hover:bg-blue-50 hover:text-blue-600 rounded text-center border border-slate-200"
              onClick={() => {
                alignWidgets('right');
                setContextMenu(null);
              }}
              title="右对齐"
            >
              ┤ 右
            </button>
          </div>
          <div className="my-1 border-t border-slate-100" />
          <button
            className="w-full px-3 py-1.5 text-left hover:bg-slate-100 flex items-center gap-2"
            onClick={() => {
              const widgetEl = document.querySelector(`[data-widget-id="${contextMenu.widgetId}"]`);
              if (widgetEl) {
                const contentEl = widgetEl.firstElementChild as HTMLElement;
                if (contentEl) {
                  const actualHeight = Math.max(20, contentEl.scrollHeight + 4);
                  updateWidgetCss(contextMenu.widgetId, { height: actualHeight });
                }
              }
              setContextMenu(null);
            }}
          >
            <Maximize className="w-4 h-4 text-indigo-500" /> 自适应高度
          </button>
          <button
            className="w-full px-3 py-1.5 text-left hover:bg-slate-100 flex items-center gap-2"
            onClick={() => {
              const ids = selectedWidgetIds.includes(contextMenu.widgetId)
                ? selectedWidgetIds
                : [contextMenu.widgetId];
              ids.forEach((id) => {
                for (const page of schema.componentsTree || []) {
                  const w = page.children?.find((c) => c.id === id);
                  if (w) {
                    const raw = (w.dataSource?.text || w.dataSource?.workContent || '') as string;
                    if (raw) {
                      const clean = raw.replace(/<[^>]+>/g, '').trim();
                      const fontSz = Number(w.css?.fontSize) || 11.5;
                      updateWidgetCss(id, { width: calculateTagWidth(clean, fontSz) });
                    }
                  }
                }
              });
              setContextMenu(null);
            }}
          >
            <Sparkles className="w-4 h-4 text-blue-500" /> 自适应文字宽度
          </button>
          <button
            className="w-full px-3 py-1.5 text-left hover:bg-amber-50 text-amber-700 flex items-center gap-2 font-medium"
            onClick={() => {
              pushHistoryState();
              const reflowed = reflowCanvasWidgetsForPagination(schema);
              setSchema(reflowed, false);
              setContextMenu(null);
            }}
          >
            <Sparkles className="w-4 h-4 text-amber-600" /> 智能分页防截断
          </button>
          {onToggleFullScreen && (
            <button
              className="w-full px-3 py-1.5 text-left hover:bg-indigo-50 text-indigo-700 flex items-center gap-2 font-medium"
              onClick={() => {
                onToggleFullScreen();
                setContextMenu(null);
              }}
            >
              {isFullScreen ? <Minimize2 className="w-4 h-4 text-indigo-600" /> : <Maximize2 className="w-4 h-4 text-indigo-600" />}
              <span>{isFullScreen ? '退出全屏模式 (ESC)' : '进入全屏排版微调'}</span>
            </button>
          )}
          <button
            className="w-full px-3 py-1.5 text-left hover:bg-rose-50 text-rose-600 flex items-center gap-2"
            onClick={() => {
              if (selectedWidgetIds.length > 1) {
                batchDeleteWidgets(selectedWidgetIds);
              } else {
                deleteWidget(contextMenu.widgetId);
              }
              setContextMenu(null);
            }}
          >
            <Trash2 className="w-4 h-4" /> 删除组件 {selectedWidgetIds.length > 1 ? `(${selectedWidgetIds.length})` : ''}
          </button>
        </div>
      )}
    </div>
  );
};
