import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Toolbar } from './Toolbar';
import { LeftComList } from './LeftComList';
import { LegoCanvas } from './LegoCanvas';
import { RightSetter } from './RightSetter';
import { useLegoDesignerStore } from '@/store/lego-designer-store';
import { getResumeSourceKey, useResumeStore } from '@/store/resume-store';
import { buildLegoSchemaFromResume } from '@/lib/lego-adapter';
import { Layout, PlusCircle, Settings } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';

export interface LegoDesignerProps {
  standalone?: boolean;
  isFullScreen?: boolean;
  onToggleFullScreen?: () => void;
}

export const LegoDesigner: React.FC<LegoDesignerProps> = ({
  standalone,
  isFullScreen: propIsFullScreen,
  onToggleFullScreen: propOnToggleFullScreen,
}) => {
  const { schema, setSchema, setScale, sourceKey } = useLegoDesignerStore(useShallow((state) => ({
    schema: state.schema, setSchema: state.setSchema, setScale: state.setScale, sourceKey: state.sourceKey,
  })));
  const { userInput, analysisResult, partialAnalysisResult, selectedTemplate, templateOptions, customTemplateHTML } = useResumeStore(useShallow((state) => ({
    userInput: state.userInput,
    analysisResult: state.analysisResult,
    partialAnalysisResult: state.partialAnalysisResult,
    selectedTemplate: state.selectedTemplate,
    templateOptions: state.templateOptions,
    customTemplateHTML: state.customTemplateHTML,
    sessionId: state.sessionId,
  })));
  const effectiveAnalysisResult = analysisResult || partialAnalysisResult;

  const [internalFullScreen, setInternalFullScreen] = useState(false);
  const isFullScreen = propIsFullScreen !== undefined ? propIsFullScreen : internalFullScreen;

  const toggleFullScreen = useCallback(() => {
    if (propOnToggleFullScreen) {
      propOnToggleFullScreen();
    } else {
      setInternalFullScreen((prev) => !prev);
    }
  }, [propOnToggleFullScreen]);

  const [leftWidth, setLeftWidth] = useState(260);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightWidth, setRightWidth] = useState(260);
  const [rightCollapsed, setRightCollapsed] = useState(false);

  // Mobile active tab view: 'canvas' | 'components' | 'settings'
  const [mobileTab, setMobileTab] = useState<'canvas' | 'components' | 'settings'>('canvas');

  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const lastTemplateRef = useRef<string | null>(null);
  const currentSourceKey = getResumeSourceKey();
  const staleCanvas = schema.componentsTree.some((page) => page.children?.length) && sourceKey !== currentSourceKey;

  // Initialize or re-template schema only when appropriate (first load, empty canvas, or explicit layout template change)
  useEffect(() => {
    if (staleCanvas) return;
    const currentChildren = schema.componentsTree?.[0]?.children || [];
    const isTemplateChanged = lastTemplateRef.current !== null && lastTemplateRef.current !== selectedTemplate;

    if (currentChildren.length === 0 || isTemplateChanged) {
      const initialSchema = buildLegoSchemaFromResume(
        userInput,
        effectiveAnalysisResult,
        selectedTemplate,
        templateOptions,
        customTemplateHTML
      );
      setSchema(initialSchema, false);
    }
    lastTemplateRef.current = selectedTemplate;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTemplate, setSchema]);

  // Compute optimal fit scale on mount & window resize
  useEffect(() => {
    const updateAutoFitScale = () => {
      if (containerRef.current) {
        const isMobile = window.innerWidth < 768;
        const availableHeight = containerRef.current.clientHeight - (isMobile ? 120 : 80);
        const availableWidth = containerRef.current.clientWidth - (isMobile ? 24 : 40);

        if (availableHeight > 200 && availableWidth > 200) {
          const fitScaleHeight = availableHeight / 1180;
          const fitScaleWidth = availableWidth / 840;
          const fitScale = Math.max(0.35, Math.min(1.0, Number((Math.min(fitScaleHeight, fitScaleWidth)).toFixed(2))));
          setScale(fitScale);
        }
      }
    };

    updateAutoFitScale();
    window.addEventListener('resize', updateAutoFitScale);
    const timer = setTimeout(updateAutoFitScale, 150);
    return () => {
      window.removeEventListener('resize', updateAutoFitScale);
      clearTimeout(timer);
    };
  }, [setScale]);

  // Handle Dragging Divider for Left Sidebar
  const handleLeftMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingLeft(true);
  };

  // Handle Dragging Divider for Right Sidebar
  const handleRightMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingRight(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingLeft && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const newWidth = Math.max(180, Math.min(450, e.clientX - rect.left));
        setLeftWidth(newWidth);
      } else if (isResizingRight && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const newWidth = Math.max(180, Math.min(450, rect.right - e.clientX));
        setRightWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizingLeft(false);
      setIsResizingRight(false);
    };

    if (isResizingLeft || isResizingRight) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingLeft, isResizingRight]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullScreen) {
        toggleFullScreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullScreen, toggleFullScreen]);

  const containerClasses = standalone
    ? 'w-full h-full bg-slate-100 flex flex-col overflow-hidden select-none'
    : (isFullScreen
      ? 'fixed inset-0 z-[1000] w-screen h-screen bg-slate-900 flex flex-col overflow-hidden select-none'
      : 'w-full h-[720px] max-h-[85vh] bg-slate-100 flex flex-col rounded-xl overflow-hidden shadow-2xl border border-slate-300 select-none');

  return (
    <div ref={containerRef} className={containerClasses}>
      {staleCanvas ? (
        <div className="flex flex-col items-center justify-center gap-4 p-8 h-full text-slate-800 bg-slate-50">
          <p className="font-semibold">当前简历已变化，原画布尚未同步。</p>
          <p className="text-sm">同步会替换原画布的手工排版；可以先下载备份。</p>
          <button className="rounded border px-4 py-2" onClick={() => {
            const url = URL.createObjectURL(new Blob([JSON.stringify(schema)], { type: 'application/json' }));
            const link = document.createElement('a'); link.href = url; link.download = '原画布备份.json'; link.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          }}>下载原画布备份</button>
          <button className="rounded bg-indigo-600 text-white px-4 py-2" onClick={() => {
            setSchema(buildLegoSchemaFromResume(userInput, effectiveAnalysisResult, selectedTemplate, templateOptions, customTemplateHTML), true);
          }}>同步当前简历</button>
        </div>
      ) : <>
      <Toolbar
        isFullScreen={isFullScreen}
        onToggleFullScreen={toggleFullScreen}
        standalone={standalone}
      />

      {/* Mobile view panel switcher (md:hidden) */}
      <div className="flex items-center justify-around bg-slate-800 border-b border-slate-700 px-2 py-1.5 text-xs md:hidden shrink-0">
        <button
          type="button"
          onClick={() => setMobileTab('canvas')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all ${
            mobileTab === 'canvas' ? 'bg-blue-600 text-white font-semibold shadow-xs' : 'text-slate-300 hover:bg-slate-700'
          }`}
        >
          <Layout className="h-3.5 w-3.5" />
          <span>画布预览</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('components')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all ${
            mobileTab === 'components' ? 'bg-blue-600 text-white font-semibold shadow-xs' : 'text-slate-300 hover:bg-slate-700'
          }`}
        >
          <PlusCircle className="h-3.5 w-3.5" />
          <span>模块组件</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('settings')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all ${
            mobileTab === 'settings' ? 'bg-blue-600 text-white font-semibold shadow-xs' : 'text-slate-300 hover:bg-slate-700'
          }`}
        >
          <Settings className="h-3.5 w-3.5" />
          <span>属性样式</span>
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar */}
        <div className={mobileTab === 'components' ? 'w-full h-full md:w-auto block' : 'hidden md:block'}>
          <LeftComList
            width={leftWidth}
            isCollapsed={leftCollapsed}
            onToggleCollapse={() => setLeftCollapsed(!leftCollapsed)}
          />
        </div>

        {/* Left Resizer Divider */}
        {!leftCollapsed && (
          <div
            className="hidden md:block w-1.5 hover:w-2 bg-slate-200 hover:bg-blue-500 cursor-col-resize transition-all shrink-0 z-10"
            onMouseDown={handleLeftMouseDown}
            title="按住拖拽调整左侧宽度"
          />
        )}

        {/* Main Canvas */}
        <div className={mobileTab === 'canvas' ? 'flex-1 h-full flex overflow-hidden' : 'hidden md:flex flex-1 overflow-hidden'}>
          <LegoCanvas
            isFullScreen={isFullScreen}
            onToggleFullScreen={toggleFullScreen}
          />
        </div>

        {/* Right Resizer Divider */}
        {!rightCollapsed && (
          <div
            className="hidden md:block w-1.5 hover:w-2 bg-slate-200 hover:bg-blue-500 cursor-col-resize transition-all shrink-0 z-10"
            onMouseDown={handleRightMouseDown}
            title="按住拖拽调整右侧宽度"
          />
        )}

        {/* Right Sidebar */}
        <div className={mobileTab === 'settings' ? 'w-full h-full md:w-auto block' : 'hidden md:block'}>
          <RightSetter
            width={rightWidth}
            isCollapsed={rightCollapsed}
            onToggleCollapse={() => setRightCollapsed(!rightCollapsed)}
          />
        </div>
      </div>
      </>}
    </div>
  );
};
