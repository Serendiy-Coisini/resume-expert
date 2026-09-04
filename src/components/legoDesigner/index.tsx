import React, { useEffect, useState, useRef } from 'react';
import { Toolbar } from './Toolbar';
import { LeftComList } from './LeftComList';
import { LegoCanvas } from './LegoCanvas';
import { RightSetter } from './RightSetter';
import { useLegoDesignerStore } from '@/store/lego-designer-store';
import { useResumeStore } from '@/store/resume-store';
import { buildLegoSchemaFromResume } from '@/lib/lego-adapter';
import { Layout, PlusCircle, Settings } from 'lucide-react';

export interface LegoDesignerProps {
  standalone?: boolean;
}

export const LegoDesigner: React.FC<LegoDesignerProps> = ({ standalone }) => {
  const { schema, setSchema, setScale } = useLegoDesignerStore();
  const { userInput, analysisResult, selectedTemplate, templateOptions, customTemplateHTML } = useResumeStore();

  const [isFullScreen, setIsFullScreen] = useState(false);
  const [leftWidth, setLeftWidth] = useState(260);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightWidth, setRightWidth] = useState(260);
  const [rightCollapsed, setRightCollapsed] = useState(false);

  // Mobile active tab view: 'canvas' | 'components' | 'settings'
  const [mobileTab, setMobileTab] = useState<'canvas' | 'components' | 'settings'>('canvas');

  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!standalone) {
      // Auto populate Lego Canvas with AI-optimized resume data when template or analysisResult changes
      const initialSchema = buildLegoSchemaFromResume(userInput, analysisResult, selectedTemplate, templateOptions, customTemplateHTML);
      setSchema(initialSchema, false);
    } else {
      // In standalone mode, if canvas has no widgets, populate with default template built schema
      const currentChildren = schema.componentsTree?.[0]?.children || [];
      if (currentChildren.length === 0) {
        const initialSchema = buildLegoSchemaFromResume(userInput, analysisResult, selectedTemplate, templateOptions, customTemplateHTML);
        setSchema(initialSchema, false);
      }
    }

    // Compute optimal fit scale on mount & window resize
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
  }, [userInput, analysisResult, selectedTemplate, templateOptions, customTemplateHTML, setSchema, setScale, standalone]);

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
        setIsFullScreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullScreen]);

  const containerClasses = standalone
    ? 'w-full h-full bg-slate-100 flex flex-col overflow-hidden select-none'
    : (isFullScreen
      ? 'fixed inset-0 z-[1000] w-screen h-screen bg-slate-900 flex flex-col overflow-hidden select-none'
      : 'w-full h-[720px] max-h-[85vh] bg-slate-100 flex flex-col rounded-xl overflow-hidden shadow-2xl border border-slate-300 select-none');

  return (
    <div ref={containerRef} className={containerClasses}>
      <Toolbar
        isFullScreen={isFullScreen}
        onToggleFullScreen={() => setIsFullScreen(!isFullScreen)}
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
          <LegoCanvas />
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
    </div>
  );
};
