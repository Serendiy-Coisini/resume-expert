'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useLegoDesignerStore } from '@/store/lego-designer-store';
import { X, Save, Tag, FileText, Loader2 } from 'lucide-react';

interface SaveTemplateDialogProps {
  open: boolean;
  onClose: () => void;
}

export const SaveTemplateDialog: React.FC<SaveTemplateDialogProps> = ({ open, onClose }) => {
  const schemaTitle = useLegoDesignerStore((s) => s.schema.config?.title);
  const saveAsTemplate = useLegoDesignerStore((s) => s.saveAsTemplate);
  const savedTemplates = useLegoDesignerStore((s) => s.savedTemplates);

  const [name, setName] = useState('');
  const [category, setCategory] = useState('个人自定义');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [customCategory, setCustomCategory] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  // Gather existing categories from saved templates
  const existingCategories = useMemo(() => {
    const cats = new Set<string>(['个人自定义']);
    savedTemplates.forEach(t => {
      if (t.category) cats.add(t.category);
    });
    return Array.from(cats);
  }, [savedTemplates]);

  useEffect(() => {
    if (open) {
      setName(schemaTitle || '我的自定义模板');
      setCategory('个人自定义');
      setDescription('');
      setCustomCategory('');
      setShowCustomInput(false);
    }
  }, [open, schemaTitle]);

  if (!open) return null;

  const captureCanvasCover = async (): Promise<string> => {
    try {
      const canvasEl = (document.getElementById('lego-canvas-page') ||
        document.querySelector('.canvas-page-bg') ||
        document.querySelector('[data-page-padding]')) as HTMLElement;
      if (!canvasEl) return '';

      const { default: html2canvas } = await import('html2canvas');
      const canvasPromise = html2canvas(canvasEl, {
        scale: 0.25,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        ignoreElements: (element) => {
          return (
            element.getAttribute('data-canvas-ui') === 'true' ||
            element.classList.contains('page-break-indicator-ui')
          );
        },
        width: canvasEl.scrollWidth || 820,
        height: Math.min(canvasEl.scrollHeight || 1160, 1160),
      });

      const timeoutPromise = new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), 2500)
      );

      const canvas = await Promise.race([canvasPromise, timeoutPromise]);
      if (!canvas) return '';

      return canvas.toDataURL('image/jpeg', 0.5);
    } catch (err) {
      console.warn('生成封面缩略图失败，将使用默认封面：', err);
      return '';
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert('请输入模板名称');
      return;
    }
    setSaving(true);
    try {
      const cover = await captureCanvasCover();
      const finalCategory = showCustomInput && customCategory.trim()
        ? customCategory.trim()
        : category;
      saveAsTemplate(name.trim(), finalCategory, description.trim(), cover);
      alert('🎉 模板保存成功！可在左侧【模板】标签中随时查看与载入。');
      onClose();
    } catch (err) {
      console.error('保存模板失败：', err);
      alert(err instanceof Error ? `保存模板失败：${err.message}` : '保存模板失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-[460px] max-w-[95vw] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-600/30">
              <Save className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">保存为模板</h2>
              <p className="text-[10px] text-slate-500">将当前画布保存为可复用模板</p>
            </div>
          </div>
          <button
            className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Template Name */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-500" />
              模板名称 <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={30}
              placeholder="请输入模板名称"
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-all"
            />
            <div className="text-right text-[10px] text-slate-400 mt-1">{name.length}/30</div>
          </div>

          {/* Category */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1.5">
              <Tag className="w-3.5 h-3.5 text-emerald-500" />
              模板分类
            </label>
            {!showCustomInput ? (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {existingCategories.map(cat => (
                    <button
                      key={cat}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        category === cat
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                      onClick={() => setCategory(cat)}
                    >
                      {cat}
                    </button>
                  ))}
                  <button
                    className="px-3 py-1.5 rounded-full text-xs font-medium bg-dashed border border-dashed border-slate-400 text-slate-500 hover:bg-slate-100 transition-all"
                    onClick={() => setShowCustomInput(true)}
                  >
                    + 自定义分类
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customCategory}
                  onChange={e => setCustomCategory(e.target.value)}
                  maxLength={20}
                  placeholder="输入自定义分类名称"
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-all"
                  autoFocus
                />
                <button
                  className="px-3 py-2 text-xs text-slate-500 hover:text-slate-700 bg-slate-100 rounded-xl"
                  onClick={() => {
                    setShowCustomInput(false);
                    setCustomCategory('');
                  }}
                >
                  取消
                </button>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1.5">
              <FileText className="w-3.5 h-3.5 text-amber-500" />
              模板描述 <span className="text-slate-400 font-normal">(选填)</span>
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              maxLength={200}
              placeholder="请输入模板简要说明或适用岗位"
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-all resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
          <button
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-all"
            onClick={onClose}
            disabled={saving}
          >
            取消
          </button>
          <button
            className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-md shadow-blue-600/30 transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleSave}
            disabled={saving || !name.trim()}
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                保存中...
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                确认保存
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
