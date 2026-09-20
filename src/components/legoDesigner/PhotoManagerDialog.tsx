import { useInputTask } from "@/lib/use-input-task";
import React, { useState, useRef, useEffect } from 'react';
import { useLegoDesignerStore } from '@/store/lego-designer-store';
import { useResumeStore } from '@/store/resume-store';
import type { IWidget } from '@/types/lego';
import {
  User,
  Upload,
  Trash2,
  Check,
  Sparkles,
  Link,
  Maximize2,
  Circle,
  Square,
  Shield,
  Layers
} from 'lucide-react';

interface PhotoManagerDialogProps {
  open: boolean;
  onClose: () => void;
}

type AvatarShape = 'circle' | 'rounded' | 'square' | 'hexagon' | 'flower';
type AvatarSizePreset = '1inch' | '2inch' | 'square' | 'compact';
type AvatarPosition = 'top-right' | 'top-left' | 'sidebar';

export const PhotoManagerDialog: React.FC<PhotoManagerDialogProps> = ({ open, onClose }) => {
  const { schema, setSchema, setSelectedWidgetId } = useLegoDesignerStore();
  const { userInput, setUserInput, templateOptions } = useResumeStore();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Find existing avatar on canvas if any
  const existingAvatar = schema.componentsTree[0]?.children.find(
    (w) => w.componentName.startsWith('hj-avatar') || w.id.includes('avatar') || (w.title || '').includes('头像') || (w.title || '').includes('照片')
  );

  const initialAvatarSrc =
    (existingAvatar?.dataSource?.avatarSrc as string) ||
    (existingAvatar?.dataSource?.src as string) ||
    userInput.avatarUrl ||
    '';

  const [avatarSrc, setAvatarSrc] = useState<string>(initialAvatarSrc);
  const startAvatarUpload = useInputTask(open, avatarSrc);
  const [urlInput, setUrlInput] = useState<string>('');
  const [shape, setShape] = useState<AvatarShape>('rounded');
  const [sizePreset, setSizePreset] = useState<AvatarSizePreset>('1inch');
  const [customWidth, setCustomWidth] = useState<number>(85);
  const [customHeight, setCustomHeight] = useState<number>(115);
  const [position, setPosition] = useState<AvatarPosition>('top-right');
  const [positionChangedByUser, setPositionChangedByUser] = useState(false);
  const [borderWidth, setBorderWidth] = useState<number>(1);
  const [borderColor, setBorderColor] = useState<string>('#cbd5e1');
  const [hasShadow, setHasShadow] = useState<boolean>(true);

  // Sync state when opened
  useEffect(() => {
    if (open) {
      setPositionChangedByUser(false);
      const currentAvatar = schema.componentsTree[0]?.children.find(
        (w) => w.componentName.startsWith('hj-avatar') || w.id.includes('avatar') || (w.title || '').includes('头像') || (w.title || '').includes('照片')
      );

      const src =
        (currentAvatar?.dataSource?.avatarSrc as string) ||
        (currentAvatar?.dataSource?.src as string) ||
        userInput.avatarUrl ||
        '';

      setAvatarSrc(src);

      if (currentAvatar) {
        const w = Number(currentAvatar.css.width) || 85;
        const h = Number(currentAvatar.css.height) || 115;
        setCustomWidth(w);
        setCustomHeight(h);
        setBorderWidth(Number(currentAvatar.css.borderWidth) || 1);
        setBorderColor((currentAvatar.css.borderColor as string) || '#cbd5e1');

        if (currentAvatar.componentName === 'hj-avatar-3') setShape('hexagon');
        else if (currentAvatar.componentName === 'hj-avatar-4') setShape('flower');
        else if (Number(currentAvatar.css.borderRadius) >= 40) setShape('circle');
        else if (Number(currentAvatar.css.borderRadius) === 0 || Number(currentAvatar.css.borderRadius) <= 2) setShape('square');
        else setShape('rounded');

        if (w === 85 && h === 115) setSizePreset('1inch');
        else if (w === 100 && h === 140) setSizePreset('2inch');
        else if (w === 90 && h === 90) setSizePreset('square');
        else if (w === 75 && h === 75) setSizePreset('compact');

        // Detect current position of the existing avatar
        const currentLeft = Number(currentAvatar.css.left) || 0;
        const hasSidebar = schema.componentsTree[0]?.children.some(
          (w) => (w.id || '').includes('sidebar') || (w.title || '').includes('边栏')
        );
        if (hasSidebar && currentLeft < 260) {
          setPosition('sidebar');
        } else if (currentLeft > 400) {
          setPosition('top-right');
        } else {
          setPosition('top-left');
        }
      } else {
        // Detect sidebar layout
        const hasSidebar = schema.componentsTree[0]?.children.some((w) => (w.id || '').includes('sidebar'));
        if (hasSidebar) {
          setPosition('sidebar');
          setShape('rounded');
        } else {
          setPosition('top-right');
        }
      }
    }
  }, [open, schema, userInput.avatarUrl]);

  if (!open) return null;

  // Handle local file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('请选择有效的图片文件 (PNG, JPG, JPEG, WebP)');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      alert('图片大小不能超过 8MB');
      return;
    }

    const task = startAvatarUpload();
    const reader = new FileReader();
    task.signal.addEventListener("abort", () => reader.abort(), { once: true });
    reader.onloadend = () => task.finish();
    reader.onload = (event) => {
      if (!task.isCurrent()) return;
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setAvatarSrc(dataUrl);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Handle Size Preset Select
  const handleSelectSizePreset = (preset: AvatarSizePreset) => {
    setSizePreset(preset);
    if (preset === '1inch') {
      setCustomWidth(85);
      setCustomHeight(115);
    } else if (preset === '2inch') {
      setCustomWidth(100);
      setCustomHeight(140);
    } else if (preset === 'square') {
      setCustomWidth(90);
      setCustomHeight(90);
    } else if (preset === 'compact') {
      setCustomWidth(75);
      setCustomHeight(75);
    }
  };

  // Compute componentName and borderRadius from shape
  const getComponentStyles = () => {
    let componentName = 'hj-avatar-1';
    let borderRadius: number | string = 6;

    if (shape === 'circle') {
      componentName = 'hj-avatar-2';
      borderRadius = 50;
    } else if (shape === 'square') {
      componentName = 'hj-avatar-1';
      borderRadius = 2;
    } else if (shape === 'rounded') {
      componentName = 'hj-avatar-1';
      borderRadius = 8;
    } else if (shape === 'hexagon') {
      componentName = 'hj-avatar-3';
      borderRadius = 0;
    } else if (shape === 'flower') {
      componentName = 'hj-avatar-4';
      borderRadius = 0;
    }

    return { componentName, borderRadius };
  };

  // Apply avatar to canvas
  const handleApplyToCanvas = () => {
    if (!avatarSrc) {
      alert('请先上传本地照片或粘贴图片链接');
      return;
    }

    const { componentName, borderRadius } = getComponentStyles();
    const newSchema = JSON.parse(JSON.stringify(schema));
    const page = newSchema.componentsTree[0];
    const themeColor = (newSchema.css as Record<string, unknown>)?.themeColor as string || templateOptions.themeColor || '#1e3a8a';
    const pageWidth = Number(newSchema.css?.width) || 820;

    // Detect sidebar container if present
    const sidebarBg = page.children.find(
      (w: IWidget) => (w.id || '').includes('sidebar-bg') || (w.title || '').includes('边栏')
    );

    // Calculate target position based on recommended placement
    let newLeft = 670;
    let newTop = 30;

    if (position === 'sidebar') {
      if (sidebarBg) {
        const sbLeft = Number(sidebarBg.css.left) || 20;
        const sbWidth = Number(sidebarBg.css.width) || 250;
        newLeft = Math.round(sbLeft + (sbWidth - customWidth) / 2);
        newTop = 40;
      } else {
        newLeft = 97;
        newTop = 40;
      }
    } else if (position === 'top-left') {
      newLeft = 40;
      newTop = 35;
    } else {
      // top-right
      newLeft = pageWidth - 40 - customWidth;
      newTop = 30;
    }

    // Find existing avatar
    const existingIndex = page.children.findIndex(
      (w: IWidget) => w.componentName.startsWith('hj-avatar') || w.id.includes('avatar') || (w.title || '').includes('头像') || (w.title || '').includes('照片')
    );

    let targetId = '';

    if (existingIndex >= 0) {
      // Update existing avatar widget
      const target = page.children[existingIndex];
      target.componentName = componentName;
      if (positionChangedByUser) {
        target.css.left = newLeft;
        target.css.top = newTop;
      }
      target.css.width = customWidth;
      target.css.height = customHeight;
      target.css.borderRadius = borderRadius;
      target.css.borderWidth = borderWidth;
      target.css.borderColor = borderColor === 'theme' ? themeColor : borderColor;
      target.css.boxShadow = hasShadow ? '0 4px 12px rgba(0,0,0,0.1)' : undefined;
      target.dataSource = {
        ...target.dataSource,
        avatarSrc
      };
      targetId = target.id;
    } else {
      // Create new avatar widget
      const newAvatarWidget: IWidget = {
        id: `widget-avatar-${Date.now()}`,
        componentName,
        title: '个人头像照片',
        css: {
          left: newLeft,
          top: newTop,
          width: customWidth,
          height: customHeight,
          zIndex: 4,
          backgroundColor: '#e2e8f0',
          borderWidth,
          borderColor: borderColor === 'theme' ? themeColor : borderColor,
          borderStyle: 'solid',
          borderRadius,
          boxShadow: hasShadow ? '0 4px 12px rgba(0,0,0,0.1)' : undefined
        },
        dataSource: {
          avatarSrc
        }
      };
      page.children.push(newAvatarWidget);
      targetId = newAvatarWidget.id;
    }

    // Layout adjustments for header/sidebar widgets if position was changed or new avatar
    if (positionChangedByUser || existingIndex < 0) {
      if (position === 'top-right') {
        page.children.forEach((w: IWidget) => {
          if (w.id === targetId || (w.id || '').includes('bg') || (w.title || '').includes('背景')) return;
          const wTop = Number(w.css.top) || 0;
          const wLeft = Number(w.css.left) || 0;
          const wWidth = Number(w.css.width) || 760;

          if (wTop < 140) {
            // If was previously shifted to right by top-left avatar, restore to left: 40
            if (wLeft >= 130 && wLeft <= 200) {
              w.css.left = 40;
            }
            if (Number(w.css.left) < 100 && Number(w.css.left) + wWidth > newLeft - 15) {
              w.css.width = Math.max(200, newLeft - Number(w.css.left) - 15);
            }
          }
        });
      } else if (position === 'top-left') {
        page.children.forEach((w: IWidget) => {
          if (w.id === targetId || (w.id || '').includes('bg') || (w.title || '').includes('背景')) return;
          const wTop = Number(w.css.top) || 0;
          const wLeft = Number(w.css.left) || 0;

          if (wTop < 140 && wLeft < newLeft + customWidth + 10) {
            const shiftTo = newLeft + customWidth + 20;
            w.css.left = shiftTo;
            w.css.width = Math.max(200, pageWidth - 40 - shiftTo);
          }
        });
      } else if (position === 'sidebar') {
        // In sidebar layout, align sidebar name/intent widgets below avatar
        page.children.forEach((w: IWidget) => {
          if (w.id === targetId) return;
          const wId = (w.id || '').toLowerCase();
          if (wId === 'widget-name-sidebar') {
            w.css.top = newTop + customHeight + 15;
          } else if (wId === 'widget-intent-sidebar') {
            w.css.top = newTop + customHeight + 55;
          }
        });
      }
    }

    setSchema(newSchema, true);
    setSelectedWidgetId(targetId);

    // Sync to store
    setUserInput({ avatarUrl: avatarSrc });
    alert('🎉 照片已成功置入/更新到积木画布！');
    onClose();
  };

  // Remove avatar from canvas
  const handleRemoveFromCanvas = () => {
    if (confirm('确定要从当前画布上移除个人头像照片吗？')) {
      const newSchema = JSON.parse(JSON.stringify(schema));
      const page = newSchema.componentsTree[0];
      page.children = page.children.filter(
        (w: IWidget) => !(w.componentName.startsWith('hj-avatar') || w.id.includes('avatar') || (w.title || '').includes('头像') || (w.title || '').includes('照片'))
      );
      setSchema(newSchema, true);
      setAvatarSrc('');
      setUserInput({ avatarUrl: '' });
      setSelectedWidgetId(null);
      alert('已从画布移除照片');
      onClose();
    }
  };

  const clipPathMap: Record<AvatarShape, string | undefined> = {
    circle: undefined,
    rounded: undefined,
    square: undefined,
    hexagon: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
    flower: 'polygon(50% 0%, 80% 10%, 100% 35%, 100% 70%, 80% 90%, 50% 100%, 20% 90%, 0% 70%, 0% 35%, 20% 10%)'
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-slate-100">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                📷 证件照 / 个人形象照管理
              </h3>
              <p className="text-[11px] text-slate-400">
                支持上传高清免冠证件照、职业形象照，自由设定形状、规格与边框
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer text-sm"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
            
            {/* Left Column: Live Preview (4 cols) */}
            <div className="md:col-span-5 flex flex-col items-center justify-center bg-slate-950/80 border border-slate-800 rounded-xl p-5 space-y-3">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                实时效果预览
              </span>

              {/* Avatar Preview Box */}
              <div
                style={{
                  width: `${customWidth}px`,
                  height: `${customHeight}px`,
                  borderRadius: shape === 'circle' ? '50%' : shape === 'square' ? '2px' : shape === 'rounded' ? '8px' : '0px',
                  clipPath: clipPathMap[shape],
                  border: borderWidth > 0 ? `${borderWidth}px solid ${borderColor === 'theme' ? '#2563eb' : borderColor}` : 'none',
                  boxShadow: hasShadow ? '0 8px 20px rgba(0,0,0,0.3)' : 'none',
                  backgroundColor: '#1e293b'
                }}
                className="overflow-hidden flex items-center justify-center transition-all duration-200 relative group"
              >
                {avatarSrc ? (
                  <img
                    src={avatarSrc}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 p-2 text-center select-none bg-slate-800">
                    <User className="w-10 h-10 text-slate-600 mb-1" />
                    <span className="text-[10px] text-slate-400">暂未上传照片</span>
                  </div>
                )}
              </div>

              <div className="text-center space-y-1">
                <span className="text-xs font-semibold text-slate-200 block">
                  {customWidth} × {customHeight} px
                </span>
                <span className="text-[10px] text-slate-400 block">
                  {shape === 'circle' ? '🟡 圆形头像' : shape === 'square' ? '⬛ 方形证件照' : shape === 'rounded' ? '🔲 圆角矩形' : '🔷 异形几何'}
                </span>
              </div>

              {avatarSrc && (
                <button
                  type="button"
                  onClick={() => setAvatarSrc('')}
                  className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors cursor-pointer pt-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> 清空当前预览图
                </button>
              )}
            </div>

            {/* Right Column: Controls & Upload (7 cols) */}
            <div className="md:col-span-7 space-y-4">
              
              {/* 1. Upload Source */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5 text-blue-400" /> 选择照片来源
                </label>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  className="hidden"
                  onChange={handleFileUpload}
                />

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/20 transition-all cursor-pointer"
                  >
                    <Upload className="w-4 h-4" /> 上传本地高清照片
                  </button>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <div className="relative flex-1">
                    <Link className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="或在此粘贴在线图片 URL..."
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={!urlInput.trim()}
                    onClick={() => {
                      if (urlInput.trim()) {
                        setAvatarSrc(urlInput.trim());
                        setUrlInput('');
                      }
                    }}
                    className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-xs font-semibold text-white rounded-lg transition-colors cursor-pointer"
                  >
                    使用链接
                  </button>
                </div>
              </div>

              {/* 2. Shape Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-400" /> 头像外观形状
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                  {[
                    { id: 'rounded', name: '圆角矩形', icon: Square },
                    { id: 'circle', name: '正圆形', icon: Circle },
                    { id: 'square', name: '直角方框', icon: Square },
                    { id: 'hexagon', name: '六边形', icon: Shield },
                    { id: 'flower', name: '花企形', icon: Sparkles },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setShape(item.id as AvatarShape)}
                      className={`p-2 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                        shape === item.id
                          ? 'bg-blue-950/60 border-blue-500 text-blue-300 ring-1 ring-blue-500'
                          : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <item.icon className="w-4 h-4" />
                      <span className="text-[10px] font-medium">{item.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Size & Presets */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Maximize2 className="w-3.5 h-3.5 text-emerald-400" /> 照片尺寸规格
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {[
                    { id: '1inch', name: '标准 1 寸', w: 85, h: 115 },
                    { id: '2inch', name: '标准 2 寸', w: 100, h: 140 },
                    { id: 'square', name: '方形 90px', w: 90, h: 90 },
                    { id: 'compact', name: '紧凑 75px', w: 75, h: 75 },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectSizePreset(p.id as AvatarSizePreset)}
                      className={`p-2 rounded-lg border text-center transition-all cursor-pointer ${
                        sizePreset === p.id && customWidth === p.w && customHeight === p.h
                          ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500'
                          : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span className="text-[11px] font-bold block">{p.name}</span>
                      <span className="text-[9px] text-slate-400">{p.w}×{p.h} px</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Placement & Border */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    置入位置推荐
                  </label>
                  <select
                    value={position}
                    onChange={(e) => {
                      setPosition(e.target.value as AvatarPosition);
                      setPositionChangedByUser(true);
                    }}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="top-right">右上角 (单栏常用)</option>
                    <option value="sidebar">左侧边栏 (双栏常用)</option>
                    <option value="top-left">左上角</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    边框样式
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      value={borderWidth}
                      onChange={(e) => setBorderWidth(Number(e.target.value))}
                      className="w-1/2 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                    >
                      <option value="0">无边框</option>
                      <option value="1">细边框 1px</option>
                      <option value="2">中边框 2px</option>
                      <option value="3">粗边框 3px</option>
                    </select>
                    <select
                      value={borderColor}
                      onChange={(e) => setBorderColor(e.target.value)}
                      className="w-1/2 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                    >
                      <option value="#cbd5e1">浅灰色</option>
                      <option value="#ffffff">纯白色</option>
                      <option value="theme">主题色</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Shadow toggle */}
              <div className="pt-1 flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasShadow}
                    onChange={(e) => setHasShadow(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-0 cursor-pointer"
                  />
                  <span>启用柔和立体微阴影</span>
                </label>
                <span className="text-[10px] text-slate-400">更显立体通透</span>
              </div>

            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-900/95 flex items-center justify-between shrink-0">
          <div>
            {existingAvatar && (
              <button
                type="button"
                onClick={handleRemoveFromCanvas}
                className="px-3 py-1.5 text-xs text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 rounded-lg border border-rose-800/40 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> 从画布移除照片
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              取消
            </button>
            <button
              type="button"
              disabled={!avatarSrc}
              onClick={handleApplyToCanvas}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              {existingAvatar ? '更新画布照片' : '置入到积木画布'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
