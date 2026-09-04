import React, { useRef, useState, useEffect } from 'react';
import { useLegoDesignerStore } from '@/store/lego-designer-store';
import { useResumeStore } from '@/store/resume-store';
import { buildLegoSchemaFromResume, fillAiDataIntoExistingSchema } from '@/lib/lego-adapter';
import { printLegoCanvas } from './utils/printLego';
import { SaveTemplateDialog } from './SaveTemplateDialog';
import { ImportResumeDialog } from './ImportResumeDialog';
import { PhotoManagerDialog } from './PhotoManagerDialog';
import { applyThemeColorToSchema, THEME_COLOR_PRESETS, hslToHex, hexToHsl } from '@/lib/theme-utils';
import type { TemplateId } from '@/types/resume';
import {
  ZoomIn,
  ZoomOut,
  Undo2,
  Redo2,
  Printer,
  Sparkles,
  FileText,
  Maximize2,
  Minimize2,
  Upload,
  Download,
  ChevronDown,
  Save,
  FolderOpen,
  RotateCcw,
  BookmarkPlus,
  Paintbrush,
  FileUp,
  Camera,
  Palette,
  Check,
  MoreHorizontal
} from 'lucide-react';

interface ToolbarProps {
  isFullScreen: boolean;
  onToggleFullScreen: () => void;
  standalone?: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = ({ isFullScreen, onToggleFullScreen, standalone }) => {
  const {
    scale,
    setScale,
    undo,
    redo,
    undoStack,
    redoStack,
    setSchema,
    resetSchema,
    schema,
    selectedWidgetId,
    isFormatPainterActive,
    toggleFormatPainter
  } = useLegoDesignerStore();
  const { userInput, analysisResult, templateOptions, setTemplateOptions, customTemplateHTML, setSelectedTemplate } = useResumeStore();

  const handleClearCanvas = () => {
    if (confirm('确定要重置并清空当前画布吗？所有已添加的积木物料将被清除。')) {
      resetSchema();
    }
  };
  const jsonFileInputRef = useRef<HTMLInputElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const themeDropdownRef = useRef<HTMLDivElement | null>(null);
  const moreDropdownRef = useRef<HTMLDivElement | null>(null);

  const [showTplMenu, setShowTplMenu] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [importResumeDialogOpen, setImportResumeDialogOpen] = useState(false);
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false);

  const currentThemeColor = (schema?.css as Record<string, unknown>)?.themeColor as string || templateOptions.themeColor || '#1e3a8a';
  const hasAvatarOnCanvas = schema?.componentsTree?.[0]?.children?.some(
    (w) => w.componentName.startsWith('hj-avatar') || w.id.includes('avatar') || (w.title || '').includes('头像') || (w.title || '').includes('照片')
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowTplMenu(false);
      }
      if (themeDropdownRef.current && !themeDropdownRef.current.contains(event.target as Node)) {
        setShowThemeMenu(false);
      }
      if (moreDropdownRef.current && !moreDropdownRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const rafThemeRef = useRef<number | null>(null);
  const [localThemeColor, setLocalThemeColor] = useState(currentThemeColor);

  useEffect(() => {
    setLocalThemeColor(currentThemeColor);
  }, [currentThemeColor]);

  // High-performance real-time theme color update (throttled via RAF, saveHistory=false during drag)
  const handlePreviewThemeColor = (color: string) => {
    setLocalThemeColor(color);
    if (rafThemeRef.current) {
      cancelAnimationFrame(rafThemeRef.current);
    }
    rafThemeRef.current = requestAnimationFrame(() => {
      const updated = applyThemeColorToSchema(schema, color);
      setSchema(updated, false);
    });
  };

  // Final commit (saveHistory=true, saves 1 clean undo history entry)
  const handleCommitThemeColor = (color: string, shouldClose: boolean = false) => {
    if (rafThemeRef.current) {
      cancelAnimationFrame(rafThemeRef.current);
      rafThemeRef.current = null;
    }
    setLocalThemeColor(color);
    const updated = applyThemeColorToSchema(schema, color);
    setSchema(updated, true);
    setTemplateOptions({ themeColor: color });
    if (shouldClose) {
      setShowThemeMenu(false);
    }
  };

  const localHsl = hexToHsl(localThemeColor);

  const handleHuePreview = (hue: number) => {
    const newHex = hslToHex(hue, localHsl.s > 40 ? localHsl.s : 85, localHsl.l >= 20 && localHsl.l <= 60 ? localHsl.l : 38);
    handlePreviewThemeColor(newHex);
  };

  const handleToneSelect = (l: number, s: number = 85) => {
    const newHex = hslToHex(localHsl.h, s, l);
    handleCommitThemeColor(newHex, false);
  };

  const handleReloadAiData = () => {
    if (confirm('确定要用最新 AI 润色数据重新装填当前积木画布的文本内容吗？')) {
      const filledSchema = fillAiDataIntoExistingSchema(schema, userInput, analysisResult);
      setSchema(filledSchema, true);
    }
  };

  const handleImportTemplate = (tplId: string) => {
    setShowTplMenu(false);

    if (tplId === 'blank') {
      if (confirm('确定要清空画布重构为空白画布吗？所有已添加的积木物料将被清除。')) {
        resetSchema();
      }
      return;
    }

    const tplNames: Record<string, string> = {
      'classic-minimal': '经典极简单栏',
      'classic': '经典极简单栏',
      'modern-sidebar': '现代深色双栏',
      'modern': '现代深色双栏',
      'corporate-banner': '商务 Header 沉稳范',
      'timeline-tech': '时间轴极客型',
      'grid-cards': '微阴影卡片流',
      'minimal': '🌿 简约清新风格',
      'github-tech': 'Github 极客代码',
      'custom': '✨ AI 动态识别自定义模板'
    };

    const targetTemplateId = (tplId === 'classic' ? 'classic-minimal' : tplId === 'modern' ? 'modern-sidebar' : tplId) as TemplateId;
    const name = tplNames[tplId] || tplId;

    if (confirm(`确定要将【${name}】排版转换并装填优化后的简历数据到积木画布吗？`)) {
      setSelectedTemplate(targetTemplateId);
      const freshSchema = buildLegoSchemaFromResume(
        userInput,
        analysisResult,
        targetTemplateId,
        templateOptions,
        customTemplateHTML
      );
      setSchema(freshSchema, true);
    }
  };

  const handleSaveDraft = () => {
    localStorage.setItem('legoDesignerDraft', JSON.stringify(schema));
    alert('草稿已成功保存到浏览器本地');
  };

  const handleLoadDraft = () => {
    const saved = localStorage.getItem('legoDesignerDraft');
    if (!saved) {
      alert('未找到本地草稿记录');
      return;
    }
    try {
      const parsed = JSON.parse(saved);
      if (confirm('确定要恢复上次保存的本地草稿吗？当前未保存的修改将被覆盖。')) {
        setSchema(parsed, true);
      }
    } catch {
      alert('草稿解析失败，数据可能受损');
    }
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && typeof parsed === 'object') {
          const filledSchema = fillAiDataIntoExistingSchema(parsed, userInput, analysisResult);
          setSelectedTemplate('custom' as TemplateId);
          setSchema(filledSchema, true);
          alert('🎉 积木 JSON 模板导入成功！已自动将优化后的简历文本替换填充至该模板。');
        } else {
          alert('无效的积木配置文件');
        }
      } catch {
        alert('解析 JSON 失败，请检查文件格式');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleFitWidth = () => {
    const pageEl = document.getElementById('lego-canvas-page');
    const container = pageEl?.parentElement?.parentElement || pageEl?.parentElement;
    if (container && container.clientWidth) {
      const availableWidth = container.clientWidth;
      const computedScale = Number(((availableWidth - 50) / 820).toFixed(2));
      const finalScale = Math.min(1.5, Math.max(0.75, computedScale));
      setScale(finalScale);
    } else {
      setScale(1.15);
    }
  };

  const handleFitPage = () => {
    const pageEl = document.getElementById('lego-canvas-page');
    const container = pageEl?.parentElement?.parentElement || pageEl?.parentElement;
    if (container && container.clientHeight) {
      const availableHeight = container.clientHeight;
      const computedScale = Number(((availableHeight - 60) / 1160).toFixed(2));
      const finalScale = Math.min(1.2, Math.max(0.45, computedScale));
      setScale(finalScale);
    } else {
      setScale(0.65);
    }
  };

  return (
    <div className="h-12 bg-slate-900 border-b border-slate-800 text-slate-100 px-2 sm:px-3 flex items-center justify-between select-none shrink-0 shadow-md w-full relative z-30">
      {/* Left Title & Brand */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-md shadow-blue-600/30 shrink-0">
          <FileText className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xs sm:text-sm font-bold tracking-tight text-white flex items-center gap-1.5 whitespace-nowrap">
            {standalone ? '简历制作器' : '积木排版器'}
          </h1>
          <p className="text-[10px] text-slate-400 hidden xl:block truncate max-w-[200px]">
            百变排版 · 自由重组 · 高清 PDF
          </p>
        </div>
      </div>

      {/* Center Tools */}
      <div className="flex items-center gap-0.5 sm:gap-1 bg-slate-800/80 p-0.5 sm:p-1 rounded-lg border border-slate-700/60 shrink-0 mx-1">
        <button
          className="p-1 sm:p-1.5 rounded hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent text-slate-300 transition-colors cursor-pointer"
          disabled={undoStack.length === 0}
          onClick={undo}
          title="撤销 (Ctrl+Z)"
        >
          <Undo2 className="w-3.5 h-3.5" />
        </button>
        <button
          className="p-1 sm:p-1.5 rounded hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent text-slate-300 transition-colors cursor-pointer"
          disabled={redoStack.length === 0}
          onClick={redo}
          title="重做 (Ctrl+Y)"
        >
          <Redo2 className="w-3.5 h-3.5" />
        </button>

        <button
          className={`p-1 sm:p-1.5 rounded transition-all cursor-pointer flex items-center gap-1 ${
            isFormatPainterActive
              ? 'bg-amber-500 text-white font-bold ring-2 ring-amber-400 shadow-md shadow-amber-500/30'
              : 'hover:bg-slate-700 text-slate-300'
          }`}
          onClick={() => toggleFormatPainter()}
          disabled={!selectedWidgetId && !isFormatPainterActive}
          title={
            isFormatPainterActive
              ? '格式刷已激活！点击画布上任意目标组件应用复制的样式'
              : selectedWidgetId
              ? '格式刷：提取当前选中组件样式并刷给其他组件'
              : '格式刷（请先在画布上选择一个源组件）'
          }
        >
          <Paintbrush className="w-3.5 h-3.5" />
          {isFormatPainterActive && <span className="text-[10px] hidden sm:inline">刷样式中</span>}
        </button>

        <div className="h-3.5 w-px bg-slate-700 mx-0.5 sm:mx-1" />

        <button
          className="p-1 sm:p-1.5 rounded hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
          onClick={() => setScale((s) => Math.max(0.3, Number((s - 0.05).toFixed(2))))}
          title="缩小画布"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <span className="text-[10px] sm:text-[11px] font-mono w-8 sm:w-10 text-center text-slate-300 select-none">
          {Math.round(scale * 100)}%
        </span>
        <button
          className="p-1 sm:p-1.5 rounded hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
          onClick={() => setScale((s) => Math.min(1.5, Number((s + 0.05).toFixed(2))))}
          title="放大画布"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>

        <div className="h-3.5 w-px bg-slate-700 mx-0.5 hidden xl:block" />

        <button
          className="px-1.5 py-1 text-[10px] sm:text-[11px] font-medium text-slate-300 hover:bg-slate-700 rounded transition-colors hidden xl:block cursor-pointer whitespace-nowrap"
          onClick={handleFitPage}
          title="自动适应当前窗口高度显示完整单页"
        >
          适应整页
        </button>
        <button
          className="px-1.5 py-1 text-[10px] sm:text-[11px] font-medium text-slate-300 hover:bg-slate-700 rounded transition-colors hidden xl:block cursor-pointer whitespace-nowrap"
          onClick={handleFitWidth}
          title="自动测量中央画布视口宽度并大幅度充盈铺满"
        >
          适应页宽
        </button>
      </div>

      {/* Right Action Bar */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        <button
          className="px-2 sm:px-2.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-md shadow-blue-600/30 transition-all cursor-pointer whitespace-nowrap"
          onClick={() => setImportResumeDialogOpen(true)}
          title="导入初始简历数据 / 选用行业模板并快速重填"
        >
          <FileUp className="w-3.5 h-3.5" />
          <span className="hidden xl:inline">导入初始简历</span>
          <span className="xl:hidden">导入简历</span>
        </button>

        <input
          ref={jsonFileInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={handleImportJSON}
        />
        <div className="relative" ref={dropdownRef}>
          <button
            className="px-2 sm:px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap"
            onClick={() => setShowTplMenu(!showTplMenu)}
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden xl:inline">切换排版模板</span>
            <span className="xl:hidden">模板</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showTplMenu ? 'rotate-180' : ''}`} />
          </button>

          {showTplMenu && (
            <div className="absolute right-0 top-full mt-1.5 w-60 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl py-2 z-[999] animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 mb-1">
                选择要导入装填的模板
              </div>
              <button
                onClick={() => handleImportTemplate('classic')}
                className="w-full px-3 py-2 text-left hover:bg-slate-800 text-xs text-slate-200 flex items-center justify-between transition-colors cursor-pointer"
              >
                <span>📝 经典单栏模板</span>
                <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded">大厂</span>
              </button>

              <button
                onClick={() => handleImportTemplate('modern-sidebar')}
                className="w-full px-3 py-2 text-left hover:bg-slate-800 text-xs text-slate-200 flex items-center justify-between transition-colors cursor-pointer"
              >
                <span>🖼️ 现代深色双栏</span>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded">双栏</span>
              </button>

              <button
                onClick={() => handleImportTemplate('corporate-banner')}
                className="w-full px-3 py-2 text-left hover:bg-slate-800 text-xs text-slate-200 flex items-center justify-between transition-colors cursor-pointer"
              >
                <span>🏢 商务 Header 沉稳范</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">Banner</span>
              </button>

              <button
                onClick={() => handleImportTemplate('timeline-tech')}
                className="w-full px-3 py-2 text-left hover:bg-slate-800 text-xs text-slate-200 flex items-center justify-between transition-colors cursor-pointer"
              >
                <span>⏱️ 时间轴极客型</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded">时间轴</span>
              </button>

              <button
                onClick={() => handleImportTemplate('grid-cards')}
                className="w-full px-3 py-2 text-left hover:bg-slate-800 text-xs text-slate-200 flex items-center justify-between transition-colors cursor-pointer"
              >
                <span>🎴 微阴影卡片流</span>
                <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded">卡片</span>
              </button>

              <button
                onClick={() => handleImportTemplate('minimal')}
                className="w-full px-3 py-2 text-left hover:bg-slate-800 text-xs text-slate-200 flex items-center justify-between transition-colors cursor-pointer"
              >
                <span>🌿 简约清新风格</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded">清新</span>
              </button>

              <button
                onClick={() => handleImportTemplate('blank')}
                className="w-full px-3 py-2 text-left hover:bg-slate-800 text-xs text-slate-200 flex items-center justify-between transition-colors cursor-pointer border-t border-slate-800 mt-1 pt-1.5"
              >
                <span>✨ 重构为空白画布</span>
                <span className="text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded">重置</span>
              </button>
            </div>
          )}
        </div>

        {/* 1. Theme Color Palette Dropdown */}
        <div className="relative" ref={themeDropdownRef}>
          <button
            className="px-2 sm:px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
            onClick={() => setShowThemeMenu(!showThemeMenu)}
            title="更换积木简历全局主题配色"
          >
            <span
              className="w-3.5 h-3.5 rounded-full border border-white/40 shadow-sm shrink-0"
              style={{ backgroundColor: currentThemeColor }}
            />
            <span className="hidden xl:inline">主题配色</span>
            <span className="xl:hidden">配色</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showThemeMenu ? 'rotate-180' : ''}`} />
          </button>

          {showThemeMenu && (
            <div className="absolute right-0 top-full mt-1.5 w-72 sm:w-80 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-3.5 z-[999] animate-in fade-in slide-in-from-top-2 duration-150 space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Palette className="w-4 h-4 text-blue-400" /> 选择简历主题配色
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-blue-400 font-mono font-bold bg-blue-950/60 border border-blue-800/40 px-2 py-0.5 rounded-md">
                    {localThemeColor}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCommitThemeColor(localThemeColor, true)}
                    className="w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer text-xs"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* 1. Presets Grid */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  职场推荐配色
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {THEME_COLOR_PRESETS.map((p) => {
                    const isSelected = localThemeColor.toLowerCase() === p.color.toLowerCase();
                    return (
                      <button
                        key={p.color}
                        type="button"
                        onClick={() => handleCommitThemeColor(p.color, false)}
                        className={`px-2 py-1.5 rounded-lg border text-left flex items-center gap-2 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-950/70 border-blue-500 text-white ring-1 ring-blue-500 shadow-sm shadow-blue-900/50'
                            : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                        }`}
                      >
                        <span
                          className="w-3.5 h-3.5 rounded-full shrink-0 border border-white/20 shadow-sm"
                          style={{ backgroundColor: p.color }}
                        />
                        <span className="text-[11px] font-medium truncate flex-1">{p.name}</span>
                        {isSelected && <Check className="w-3 h-3 text-blue-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Interactive Rainbow Hue Slider */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    🌈 自由色相滑块（拖动实时调色）
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">{localHsl.h}°</span>
                </div>

                <div className="relative flex items-center">
                  <input
                    type="range"
                    min="0"
                    max="360"
                    step="1"
                    value={localHsl.h}
                    onChange={(e) => handleHuePreview(Number(e.target.value))}
                    onPointerUp={() => handleCommitThemeColor(localThemeColor, false)}
                    onMouseUp={() => handleCommitThemeColor(localThemeColor, false)}
                    onTouchEnd={() => handleCommitThemeColor(localThemeColor, false)}
                    className="w-full h-3 rounded-lg appearance-none cursor-pointer accent-white"
                    style={{
                      background: 'linear-gradient(to right, #ef4444 0%, #f59e0b 17%, #eab308 33%, #10b981 50%, #06b6d4 67%, #3b82f6 83%, #ec4899 92%, #ef4444 100%)'
                    }}
                  />
                </div>

                {/* Quick Tones under current hue */}
                <div className="grid grid-cols-4 gap-1 pt-1">
                  {[
                    { label: '深色', l: 30, s: 85 },
                    { label: '主色', l: 45, s: 85 },
                    { label: '明亮', l: 58, s: 80 },
                    { label: '浅亮', l: 72, s: 75 }
                  ].map((tone) => {
                    const toneHex = hslToHex(localHsl.h, tone.s, tone.l);
                    return (
                      <button
                        key={tone.label}
                        type="button"
                        onClick={() => handleToneSelect(tone.l, tone.s)}
                        className="py-1 px-1.5 rounded bg-slate-800 border border-slate-700 hover:border-slate-500 text-[10px] text-slate-300 flex items-center justify-center gap-1 transition-all cursor-pointer"
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0 border border-white/20"
                          style={{ backgroundColor: toneHex }}
                        />
                        <span>{tone.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Precise Color Picker & HEX Input */}
              <div className="border-t border-slate-800 pt-2.5 flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-400">精准自定义：</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={localThemeColor.startsWith('#') && localThemeColor.length === 7 ? localThemeColor : '#1e3a8a'}
                    onChange={(e) => handlePreviewThemeColor(e.target.value)}
                    onBlur={() => handleCommitThemeColor(localThemeColor, false)}
                    className="w-7 h-7 rounded border border-slate-700 bg-slate-800 cursor-pointer p-0.5"
                    title="点击打开系统调色盘"
                  />
                  <input
                    type="text"
                    value={localThemeColor}
                    onChange={(e) => {
                      const val = e.target.value.trim();
                      setLocalThemeColor(val);
                      if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                        handlePreviewThemeColor(val);
                      }
                    }}
                    onBlur={() => {
                      if (/^#[0-9A-Fa-f]{6}$/.test(localThemeColor)) {
                        handleCommitThemeColor(localThemeColor, false);
                      }
                    }}
                    placeholder="#1e3a8a"
                    className="w-24 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-[11px] text-slate-200 font-mono focus:outline-none focus:border-blue-500 text-center"
                  />
                </div>
              </div>

              {/* Footer Confirm */}
              <div className="pt-1 border-t border-slate-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleCommitThemeColor(localThemeColor, true)}
                  className="w-full py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-blue-600/20 cursor-pointer flex items-center justify-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" /> 完成并应用
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 2. Photo / Avatar Button */}
        <button
          className={`px-2 sm:px-2.5 py-1.5 border rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
            hasAvatarOnCanvas
              ? 'bg-blue-950/50 hover:bg-blue-900/60 text-blue-300 border-blue-700/60 shadow-sm shadow-blue-950/40'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
          }`}
          onClick={() => setPhotoDialogOpen(true)}
          title="添加或更换个人形象照 / 证件照"
        >
          <Camera className={`w-3.5 h-3.5 ${hasAvatarOnCanvas ? 'text-emerald-400' : 'text-blue-400'}`} />
          <span className="hidden xl:inline">{hasAvatarOnCanvas ? '更换照片' : '添加照片'}</span>
          <span className="xl:hidden">照片</span>
          {hasAvatarOnCanvas && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="画布已包含照片" />}
        </button>

        {/* 3. Fullscreen Toggle Button - Always Visible & Highlighted */}
        <button
          type="button"
          className={`px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 shadow-xs ${
            isFullScreen
              ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30 ring-1 ring-indigo-400'
              : 'bg-indigo-950/60 hover:bg-indigo-600 hover:text-white text-indigo-300 border border-indigo-700/60'
          }`}
          onClick={onToggleFullScreen}
          title={isFullScreen ? '退出全屏编辑 (ESC)' : '进入全屏沉浸式自由排版微调'}
        >
          {isFullScreen ? (
            <>
              <Minimize2 className="w-3.5 h-3.5" />
              <span>退出全屏</span>
            </>
          ) : (
            <>
              <Maximize2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>全屏编辑</span>
            </>
          )}
        </button>

        {/* 4. More Actions Dropdown (Containing Reload AI, Save Template, Import JSON, Clear, Drafts) */}
        <div className="relative" ref={moreDropdownRef}>
          <button
            type="button"
            className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap"
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            title="更多画布与排版操作"
          >
            <MoreHorizontal className="w-3.5 h-3.5 text-slate-300" />
            <span className="hidden sm:inline">更多</span>
          </button>

          {showMoreMenu && (
            <div className="absolute right-0 top-full mt-1.5 w-56 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl py-1.5 z-[999] animate-in fade-in slide-in-from-top-2 duration-150 space-y-0.5 text-xs">
              <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 mb-1">
                更多积木排版功能
              </div>

              {!standalone ? (
                <button
                  type="button"
                  onClick={() => {
                    setShowMoreMenu(false);
                    handleReloadAiData();
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-slate-800 text-slate-200 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <div className="font-semibold text-slate-100">重填 AI 润色数据</div>
                    <div className="text-[10px] text-slate-400">用最新 AI 分析结果装填画布</div>
                  </div>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMoreMenu(false);
                      handleSaveDraft();
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-slate-800 text-slate-200 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Save className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <div className="font-semibold text-slate-100">保存本地草稿</div>
                      <div className="text-[10px] text-slate-400">保存到浏览器本地缓存</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMoreMenu(false);
                      handleLoadDraft();
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-slate-800 text-slate-200 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <FolderOpen className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <div className="font-semibold text-slate-100">恢复上次草稿</div>
                      <div className="text-[10px] text-slate-400">载入历史保存的草稿</div>
                    </div>
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => {
                  setShowMoreMenu(false);
                  setSaveDialogOpen(true);
                }}
                className="w-full px-3 py-2 text-left hover:bg-slate-800 text-slate-200 flex items-center gap-2 transition-colors cursor-pointer"
              >
                <BookmarkPlus className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <div className="font-semibold text-slate-100">存为自定义模板</div>
                  <div className="text-[10px] text-slate-400">保存当前结构以便随时复用</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowMoreMenu(false);
                  jsonFileInputRef.current?.click();
                }}
                className="w-full px-3 py-2 text-left hover:bg-slate-800 text-slate-200 flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Upload className="w-4 h-4 text-blue-400 shrink-0" />
                <div>
                  <div className="font-semibold text-slate-100">导入积木 JSON 配置</div>
                  <div className="text-[10px] text-slate-400">载入已导出的 schema 文件</div>
                </div>
              </button>

              <div className="border-t border-slate-800 my-1" />

              <button
                type="button"
                onClick={() => {
                  setShowMoreMenu(false);
                  handleClearCanvas();
                }}
                className="w-full px-3 py-2 text-left hover:bg-rose-950/50 text-rose-300 flex items-center gap-2 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 text-rose-400 shrink-0" />
                <div>
                  <div className="font-semibold text-rose-200">清空画布重置</div>
                  <div className="text-[10px] text-rose-400/80">移除当前所有积木组件</div>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* 5. Export PDF Button */}
        <button
          className="px-2.5 sm:px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-lg shadow-blue-600/30 transition-all whitespace-nowrap shrink-0 cursor-pointer"
          onClick={printLegoCanvas}
        >
          <Printer className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">导出 PDF</span>
          <span className="sm:hidden">导出</span>
        </button>
      </div>

      <SaveTemplateDialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)} />
      <ImportResumeDialog open={importResumeDialogOpen} onClose={() => setImportResumeDialogOpen(false)} />
      <PhotoManagerDialog open={photoDialogOpen} onClose={() => setPhotoDialogOpen(false)} />
    </div>
  );
};
