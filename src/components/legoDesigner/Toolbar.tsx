import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useLegoDesignerStore } from '@/store/lego-designer-store';
import { useResumeStore } from '@/store/resume-store';
import { buildLegoSchemaFromResume, fillAiDataIntoExistingSchema, reflowCanvasWidgetsForPagination } from '@/lib/lego-adapter';
import { printLegoCanvas } from './utils/printLego';
import { SaveTemplateDialog } from './SaveTemplateDialog';
import { ImportResumeDialog } from './ImportResumeDialog';
import { PhotoManagerDialog } from './PhotoManagerDialog';
import { saveLegoDraft, loadLegoDraft } from '@/lib/lego-draft';
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
  MoreHorizontal,
  ChevronRight
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
    pushHistoryState,
    setSchema,
    resetSchema,
    schema,
    selectedWidgetId,
    isFormatPainterActive,
    toggleFormatPainter
  } = useLegoDesignerStore();
  const { userInput, analysisResult, partialAnalysisResult, templateOptions, setTemplateOptions, customTemplateHTML, setSelectedTemplate } = useResumeStore();
  const effectiveAnalysisResult = analysisResult || partialAnalysisResult;

  const handleClearCanvas = () => {
    if (confirm('确定要清空画布上的所有内容吗？\n\n温馨提示：清空后已添加的所有积木模块将被移除。若有重要排版，建议先点击【暂时保存】备份草稿。')) {
      resetSchema();
      setSavedToast('🧹 已重置为空白画布');
      setTimeout(() => setSavedToast(null), 2500);
    }
  };
  const jsonFileInputRef = useRef<HTMLInputElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const themeDropdownRef = useRef<HTMLDivElement | null>(null);
  const moreDropdownRef = useRef<HTMLDivElement | null>(null);

  const [showTplMenu, setShowTplMenu] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showPrintTipModal, setShowPrintTipModal] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [importResumeDialogOpen, setImportResumeDialogOpen] = useState(false);
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false);
  const [savedToast, setSavedToast] = useState<React.ReactNode | null>(null);
  const [draftHintToast, setDraftHintToast] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [draftTime, setDraftTime] = useState<string | null>(null);

  useEffect(() => {
    const { savedTime } = loadLegoDraft();
    if (savedTime) setDraftTime(savedTime);
  }, []);

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
  const lastPreviewThemeColorRef = useRef(currentThemeColor);
  const themeStartSchemaRef = useRef<typeof schema | null>(null);

  useEffect(() => {
    setLocalThemeColor(currentThemeColor);
    lastPreviewThemeColorRef.current = currentThemeColor;
  }, [currentThemeColor]);

  // High-performance real-time theme color update (throttled via RAF, saveHistory=false during drag)
  const handlePreviewThemeColor = (color: string) => {
    if (!themeStartSchemaRef.current) themeStartSchemaRef.current = schema;
    setLocalThemeColor(color);
    lastPreviewThemeColorRef.current = color;
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
    const finalColor = color || lastPreviewThemeColorRef.current;
    setLocalThemeColor(finalColor);
    lastPreviewThemeColorRef.current = finalColor;
    const initialSchema = themeStartSchemaRef.current || schema;
    const updated = applyThemeColorToSchema(initialSchema, finalColor);
    setSchema(initialSchema, false);
    setSchema(updated, true);
    themeStartSchemaRef.current = null;
    setTemplateOptions({ themeColor: finalColor });
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
    if (confirm('确定要同步最新的 AI 润色结果吗？\n\n系统将保留您当前的积木排版结构，仅用 AI 最新分析结果替换各模块文本内容。')) {
      const filledSchema = fillAiDataIntoExistingSchema(schema, userInput, analysisResult);
      setSchema(filledSchema, true);
      setSavedToast('✨ 已成功同步最新 AI 润色内容');
      setTimeout(() => setSavedToast(null), 3000);
    }
  };

  const handleImportTemplate = (tplId: string) => {
    setShowTplMenu(false);

    if (tplId === 'blank') {
      if (confirm('确定要重置为空白画布重新设计吗？\n\n清空后所有已添加的积木组件将被移除。建议先保存当前草稿备份。')) {
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

    if (confirm(`确定切换为【${name}】排版风格吗？\n\n系统将自动保留您的简历文本内容并应用新模板排版。当前画布上未保存的自定义微调将被替换。`)) {
      setSelectedTemplate(targetTemplateId);
      const freshSchema = buildLegoSchemaFromResume(
        userInput,
        effectiveAnalysisResult,
        targetTemplateId,
        templateOptions,
        customTemplateHTML
      );
      setSchema(freshSchema, true);
    }
  };

  const handleSmartPaginationReflow = () => {
    pushHistoryState();
    const reflowed = reflowCanvasWidgetsForPagination(schema);
    setSchema(reflowed, false);
    setSavedToast(
      <div className="flex items-center gap-2 flex-wrap">
        <span>✨ 已执行智能分页防截断排版！</span>
        <span className="text-amber-300 font-bold bg-amber-950/70 px-1.5 py-0.5 rounded border border-amber-700/60 shadow-xs">
          跨页卡片已整体避让至下一页
        </span>
      </div>
    );
    setTimeout(() => setSavedToast(null), 3500);
  };

  const handleSaveDraft = useCallback(() => {
    const result = saveLegoDraft(schema);
    if (result.success && result.savedTime) {
      const nowStr = result.savedTime;
      setDraftTime(nowStr);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
      setDraftHintToast(null);
      setSavedToast(
        <div className="flex items-center gap-1.5 flex-wrap">
          <span>草稿已保存到本地 ({nowStr})，如需恢复请点击</span>
          <span className="text-amber-300 font-bold bg-amber-950/70 px-1.5 py-0.5 rounded border border-amber-700/60 shadow-xs">
            【更多 → 恢复上次草稿】
          </span>
          <span>载入</span>
        </div>
      );
      setTimeout(() => setSavedToast(null), 4500);
    } else {
      alert('草稿保存失败：浏览器本地存储空间不足，建议您通过“保存为模板”进行备份。');
    }
  }, [schema]);

  const handleLoadDraft = () => {
    const { schema: parsed, savedTime, exists, corrupted } = loadLegoDraft();
    if (!parsed) {
      if (corrupted) {
        alert('草稿读取失败：数据格式不兼容或已受损，请重试或重新保存');
      } else if (!exists) {
        alert('未找到本地草稿记录。您可以在编辑过程中随时点击【暂时保存】记录进度哦~');
      } else {
        alert('草稿读取失败：未找到有效草稿内容');
      }
      return;
    }
    const timeInfo = savedTime ? `（保存于 ${savedTime}）` : '';
    if (confirm(`确定要载入上次保存的草稿${timeInfo}吗？\n\n温馨提示：载入后将覆盖当前画布上未保存的修改，请确认是否继续。`)) {
      setSchema(parsed, true);
      setDraftHintToast(null);
      setSavedToast('✨ 已成功恢复草稿，您可以继续编辑啦！');
      setTimeout(() => setSavedToast(null), 3000);
    }
  };

  useEffect(() => {
    const handleSaveKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveDraft();
      }
    };
    window.addEventListener('keydown', handleSaveKey);
    return () => window.removeEventListener('keydown', handleSaveKey);
  }, [handleSaveDraft]);

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && typeof parsed === 'object') {
          const filledSchema = fillAiDataIntoExistingSchema(parsed, userInput, analysisResult);
          setSchema(filledSchema, true);
          alert('🎉 简历排版导入成功！已自动为您载入版式并智能填入简历内容。');
        } else {
          alert('文件格式不正确，请确认选择的是本系统导出的简历排版 JSON 文件。');
        }
      } catch {
        alert('文件读取失败：无法解析该文件，请确保文件是合法的 JSON 格式。');
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
    <div className="h-12 bg-slate-900 border-b border-slate-800 text-slate-100 px-2 sm:px-3 flex items-center gap-1.5 select-none shrink-0 shadow-md w-full relative z-30">
      {savedToast && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-[1000] bg-slate-900/95 backdrop-blur-md text-emerald-300 border border-emerald-500/60 px-4 py-2.5 rounded-2xl shadow-2xl text-xs font-semibold flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2 duration-200 max-w-xl">
          <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <Check className="w-3.5 h-3.5" />
          </div>
          <div className="leading-snug">{savedToast}</div>
        </div>
      )}

      {draftHintToast && !savedToast && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-[1000] bg-slate-900/95 backdrop-blur-md text-amber-200 border border-amber-500/60 px-4 py-2 rounded-2xl shadow-2xl text-xs font-semibold flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <FolderOpen className="w-3.5 h-3.5" />
          </div>
          <span>检测到您上次保存的草稿 ({draftHintToast})，是否恢复？</span>
          <button
            type="button"
            onClick={() => {
              setDraftHintToast(null);
              handleLoadDraft();
            }}
            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold text-[11px] shadow-sm transition-all cursor-pointer"
          >
            立即恢复
          </button>
          <button
            type="button"
            onClick={() => setDraftHintToast(null)}
            className="text-slate-400 hover:text-slate-200 text-xs px-1 cursor-pointer"
            title="暂不恢复"
          >
            ✕
          </button>
        </div>
      )}
      {/* Left Title & Brand */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-md shadow-blue-600/30 shrink-0">
          <FileText className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xs sm:text-sm font-bold tracking-tight text-white flex items-center gap-1.5 whitespace-nowrap">
            {standalone ? '简历制作器' : '积木排版器'}
          </h1>
          <p className="text-[10px] text-slate-400 hidden 2xl:block truncate max-w-[180px]">
            百变排版 · 自由重组 · 高清 PDF
          </p>
        </div>
      </div>

      {/* Center Tools */}
      <div className="flex items-center gap-0.5 sm:gap-1 bg-slate-800/80 p-0.5 sm:p-1 rounded-lg border border-slate-700/60 shrink-0">
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

        <button
          className="px-1.5 py-1 text-[10px] sm:text-[11px] font-medium text-slate-300 hover:bg-slate-700 rounded transition-colors hidden 2xl:block cursor-pointer whitespace-nowrap"
          onClick={handleFitPage}
          title="自动适应当前窗口高度显示完整单页"
        >
          适应整页
        </button>
        <button
          className="px-1.5 py-1 text-[10px] sm:text-[11px] font-medium text-slate-300 hover:bg-slate-700 rounded transition-colors hidden 2xl:block cursor-pointer whitespace-nowrap"
          onClick={handleFitWidth}
          title="自动测量中央画布视口宽度并大幅度充盈铺满"
        >
          适应页宽
        </button>
      </div>

      {/* Middle Tools: Design & Content Operations */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        <button
          className="px-2 sm:px-2.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-md shadow-blue-600/30 transition-all cursor-pointer whitespace-nowrap shrink-0"
          onClick={() => setImportResumeDialogOpen(true)}
          title="导入初始简历数据 / 选用行业模板并快速重填"
        >
          <FileUp className="w-3.5 h-3.5" />
          <span className="hidden xl:inline">导入简历</span>
          <span className="xl:hidden">导入</span>
        </button>

        <input
          ref={jsonFileInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={handleImportJSON}
        />
        <div className="relative shrink-0" ref={dropdownRef}>
          <button
            className="px-2 sm:px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap"
            onClick={() => setShowTplMenu(!showTplMenu)}
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden xl:inline">排版模板</span>
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

        {/* 智能分页防截断按钮 */}
        <button
          type="button"
          onClick={handleSmartPaginationReflow}
          className="px-2 sm:px-2.5 py-1.5 bg-gradient-to-r from-amber-600/90 to-orange-600/90 hover:from-amber-500 hover:to-orange-500 text-white border border-amber-500/60 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-md shadow-amber-600/20 transition-all cursor-pointer whitespace-nowrap shrink-0 active:scale-95"
          title="智能分页防截断：自动检测并下移跨越 A4 切割线的经历卡片，杜绝文字腰斩切半"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-200" />
          <span className="hidden xl:inline">智能分页防截断</span>
          <span className="xl:hidden">防截断</span>
        </button>

        {/* 1. Theme Color Palette Dropdown */}
        <div className="relative shrink-0" ref={themeDropdownRef}>
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
                    onPointerUp={() => handleCommitThemeColor(lastPreviewThemeColorRef.current, false)}
                    onMouseUp={() => handleCommitThemeColor(lastPreviewThemeColorRef.current, false)}
                    onTouchEnd={() => handleCommitThemeColor(lastPreviewThemeColorRef.current, false)}
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
          className={`px-2 sm:px-2.5 py-1.5 border rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
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
      </div>

      {/* Pinned Right Utility Group - ALWAYS VISIBLE, NEVER CUT OFF */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 ml-auto pl-1">
        {/* Fullscreen Toggle Button - Only shown when in fullscreen (to exit) or when in standalone mode */}
        {(isFullScreen || standalone) && (
          <button
            type="button"
            className={`px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 shadow-md active:scale-95 ${
              isFullScreen
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30 ring-2 ring-indigo-400'
                : 'bg-indigo-950/80 hover:bg-indigo-600 hover:text-white text-indigo-200 border border-indigo-700/60 shadow-indigo-950/40'
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
        )}

        {/* 暂时保存 (Save Draft) - Prominent, distinct & clear */}
        <button
          type="button"
          onClick={handleSaveDraft}
          className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 shadow-md active:scale-95 border ${
            justSaved
              ? 'bg-emerald-500 text-white border-emerald-400 shadow-emerald-500/30'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500/80 shadow-emerald-600/30 hover:shadow-emerald-500/40'
          }`}
          title="保存当前草稿 (Ctrl+S)：重新进入积木排版器后，可点击【更多 → 恢复上次草稿】找回"
        >
          {justSaved ? (
            <>
              <Check className="w-3.5 h-3.5 text-white animate-in zoom-in-50 duration-150" />
              <span>已保存</span>
            </>
          ) : (
            <>
              <Save className="w-3.5 h-3.5 text-white" />
              <span className="hidden sm:inline">暂时保存</span>
              <span className="sm:hidden">保存</span>
            </>
          )}
        </button>

        {/* 5. More Actions Dropdown */}
        <div className="relative shrink-0" ref={moreDropdownRef}>
          <button
            type="button"
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap border ${
              showMoreMenu
                ? 'bg-slate-700 text-white border-blue-500 ring-2 ring-blue-500/30'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border-slate-700 hover:border-slate-600'
            }`}
            onClick={() => {
              if (!showMoreMenu) {
                const { savedTime } = loadLegoDraft();
                setDraftTime(savedTime);
              }
              setShowMoreMenu(!showMoreMenu);
            }}
            title="更多排版辅助功能：草稿恢复、模板收藏、AI重填与数据管理"
          >
            <MoreHorizontal className="w-4 h-4 text-slate-300" />
            <span className="hidden sm:inline">更多</span>
            <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${showMoreMenu ? 'rotate-180' : ''}`} />
          </button>

          {showMoreMenu && (
            <div className="absolute right-0 top-full mt-1.5 w-72 sm:w-80 bg-slate-900/95 backdrop-blur-md border border-slate-700/90 rounded-2xl shadow-2xl p-2.5 z-[999] animate-in fade-in slide-in-from-top-2 duration-150 space-y-1.5 text-xs">
              {/* Header */}
              <div className="px-2.5 py-1.5 flex items-center justify-between border-b border-slate-800 mb-1">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-xs font-bold text-slate-200">排版与草稿工具箱</span>
                </div>
                <span className="text-[10px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-full border border-slate-700/60 font-medium">
                  快捷操作
                </span>
              </div>

              {/* 1. 暂时保存草稿 */}
              <button
                type="button"
                onClick={() => {
                  setShowMoreMenu(false);
                  handleSaveDraft();
                }}
                className="w-full p-2 rounded-xl text-left flex items-center gap-3 transition-all duration-150 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/40 hover:border-emerald-500/50 hover:shadow-md cursor-pointer group active:scale-[0.99]"
              >
                <div className="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-emerald-500/25 transition-all shadow-xs">
                  <Save className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-100 group-hover:text-emerald-300 transition-colors">暂时保存草稿</span>
                    <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono">
                      Ctrl+S
                    </kbd>
                  </div>
                  <p className="text-[11px] text-slate-400 group-hover:text-slate-300 transition-colors mt-0.5 line-clamp-1">
                    备份当前进度，重新进入后请点击下方【恢复上次草稿】载入
                  </p>
                </div>
              </button>

              {/* 2. 恢复上次草稿 */}
              <button
                type="button"
                onClick={() => {
                  setShowMoreMenu(false);
                  handleLoadDraft();
                }}
                className="w-full p-2 rounded-xl text-left flex items-center gap-3 transition-all duration-150 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/40 hover:border-amber-500/50 hover:shadow-md cursor-pointer group active:scale-[0.99]"
              >
                <div className="w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-amber-500/25 transition-all shadow-xs">
                  <FolderOpen className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-100 group-hover:text-amber-300 transition-colors">恢复上次草稿</span>
                    {draftTime ? (
                      <span className="text-[9px] text-amber-400 bg-amber-950/60 border border-amber-800/50 px-1.5 py-0.5 rounded font-mono">
                        {draftTime}
                      </span>
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 group-hover:translate-x-0.5 transition-all" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 group-hover:text-slate-300 transition-colors mt-0.5 line-clamp-1">
                    {draftTime ? `载入 ${draftTime} 保存的历史草稿` : '找回此前保存的排版草稿，继续编辑'}
                  </p>
                </div>
              </button>

              {/* 3. 智能分页防截断排版 */}
              <button
                type="button"
                onClick={() => {
                  setShowMoreMenu(false);
                  handleSmartPaginationReflow();
                }}
                className="w-full p-2 rounded-xl text-left flex items-center gap-3 transition-all duration-150 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/40 hover:border-amber-500/50 hover:shadow-md cursor-pointer group active:scale-[0.99]"
              >
                <div className="w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-amber-500/25 transition-all shadow-xs">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-100 group-hover:text-amber-300 transition-colors">智能分页防截断排版</span>
                    <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded font-medium">
                      防腰斩
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 group-hover:text-slate-300 transition-colors mt-0.5 line-clamp-1">
                    自动检测并下移跨越 A4 切割线的卡片，杜绝文字切半
                  </p>
                </div>
              </button>

              {/* 4. 同步最新 AI 润色数据 */}
              {!standalone && (
                <button
                  type="button"
                  onClick={() => {
                    setShowMoreMenu(false);
                    handleReloadAiData();
                  }}
                  className="w-full p-2 rounded-xl text-left flex items-center gap-3 transition-all duration-150 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/40 hover:border-indigo-500/50 hover:shadow-md cursor-pointer group active:scale-[0.99]"
                >
                  <div className="w-9 h-9 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-indigo-500/25 transition-all shadow-xs">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-100 group-hover:text-indigo-300 transition-colors">同步最新 AI 润色</span>
                      <span className="text-[9px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.5 rounded font-medium">
                        智能同步
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 group-hover:text-slate-300 transition-colors mt-0.5 line-clamp-1">
                      保留当前排版结构，仅用 AI 最新成果更新文本
                    </p>
                  </div>
                </button>
              )}

              {/* 4. 存为自定义模板 */}
              <button
                type="button"
                onClick={() => {
                  setShowMoreMenu(false);
                  setSaveDialogOpen(true);
                }}
                className="w-full p-2 rounded-xl text-left flex items-center gap-3 transition-all duration-150 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/40 hover:border-blue-500/50 hover:shadow-md cursor-pointer group active:scale-[0.99]"
              >
                <div className="w-9 h-9 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-blue-500/25 transition-all shadow-xs">
                  <BookmarkPlus className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-100 group-hover:text-blue-300 transition-colors">保存为自定义模板</span>
                    <span className="text-[9px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-1.5 py-0.5 rounded font-medium">
                      收藏
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 group-hover:text-slate-300 transition-colors mt-0.5 line-clamp-1">
                    将当前满意的版式结构收藏起来，以便随时复用
                  </p>
                </div>
              </button>

              {/* 5. 导入排版备份文件 */}
              <button
                type="button"
                onClick={() => {
                  setShowMoreMenu(false);
                  jsonFileInputRef.current?.click();
                }}
                className="w-full p-2 rounded-xl text-left flex items-center gap-3 transition-all duration-150 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/40 hover:border-sky-500/50 hover:shadow-md cursor-pointer group active:scale-[0.99]"
              >
                <div className="w-9 h-9 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-400 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-sky-500/25 transition-all shadow-xs">
                  <Upload className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-100 group-hover:text-sky-300 transition-colors">导入排版备份文件</span>
                    <span className="text-[9px] bg-sky-500/20 text-sky-300 border border-sky-500/30 px-1.5 py-0.5 rounded font-mono">
                      .json
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 group-hover:text-slate-300 transition-colors mt-0.5 line-clamp-1">
                    从本地载入此前导出的简历排版配置文件
                  </p>
                </div>
              </button>

              <div className="border-t border-slate-800/80 my-1 mx-1" />

              {/* 6. 清空画布重置 */}
              <button
                type="button"
                onClick={() => {
                  setShowMoreMenu(false);
                  handleClearCanvas();
                }}
                className="w-full p-2 rounded-xl text-left flex items-center gap-3 transition-all duration-150 bg-rose-950/20 hover:bg-rose-950/50 border border-rose-900/40 hover:border-rose-700/70 hover:shadow-md cursor-pointer group active:scale-[0.99]"
              >
                <div className="w-9 h-9 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-rose-500/25 transition-all shadow-xs">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-rose-200 group-hover:text-rose-100 transition-colors">清空当前画布</span>
                    <span className="text-[9px] bg-rose-500/20 text-rose-300 border border-rose-500/30 px-1.5 py-0.5 rounded font-medium">
                      重置
                    </span>
                  </div>
                  <p className="text-[11px] text-rose-400/80 group-hover:text-rose-300 transition-colors mt-0.5 line-clamp-1">
                    清空当前画面的所有积木，重新开始设计
                  </p>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* 5. Export PDF Button */}
        <button
          type="button"
          className="px-2.5 sm:px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-blue-600/30 transition-all whitespace-nowrap shrink-0 cursor-pointer"
          onClick={() => setShowPrintTipModal(true)}
          title="导出矢量 PDF"
        >
          <Printer className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">导出 PDF</span>
          <span className="sm:hidden">导出</span>
        </button>
      </div>

      <SaveTemplateDialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)} />
      <ImportResumeDialog open={importResumeDialogOpen} onClose={() => setImportResumeDialogOpen(false)} />
      <PhotoManagerDialog open={photoDialogOpen} onClose={() => setPhotoDialogOpen(false)} />

      {/* 打印机设置引导弹窗 */}
      {showPrintTipModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700 w-[440px] max-w-[92vw] rounded-2xl shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">打印预览设置关键提示</h3>
                <p className="text-xs text-slate-400">避免复制出空格与乱码的关键步骤</p>
              </div>
            </div>

            <div className="bg-slate-800/80 rounded-xl p-3.5 border border-slate-700/60 space-y-2.5 text-xs">
              <div className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold shrink-0">✓ 推荐做法：</span>
                <span className="text-slate-200">
                  在弹出的打印窗口中，将【打印机 / 目标】下拉框选择为 <strong className="text-blue-400 underline underline-offset-2">『另存为 PDF』</strong>（Save as PDF）。
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-rose-400 font-bold shrink-0">✕ 避免使用：</span>
                <span className="text-slate-400">
                  请<strong>不要</strong>选择系统虚拟驱动 <strong className="text-rose-300">『Microsoft Print to PDF』</strong>。因为 Windows 系统的该驱动会将中文字符强行拆开加空格，并损坏破折号等符号！
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowPrintTipModal(false)}
                className="px-3.5 py-2 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowPrintTipModal(false);
                  printLegoCanvas();
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
              >
                我知道了，打开打印
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
