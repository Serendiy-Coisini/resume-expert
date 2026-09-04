"use client";

import { useRef } from "react";
import { Check, Eye, SlidersHorizontal, Trash2, Upload, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useResumeStore } from "@/store/resume-store";
import type { TemplateOptions } from "@/lib/resume-templates";

const COLOR_PRESETS = [
  { name: "藏蓝大厂", color: "#1e3a8a" },
  { name: "极客宝蓝", color: "#2563eb" },
  { name: "翡翠竹绿", color: "#059669" },
  { name: "优雅玄黑", color: "#0f172a" },
  { name: "雅致深紫", color: "#6b21a8" },
  { name: "朱砂深红", color: "#991b1b" },
];

export function TemplateCustomizer() {
  const {
    userInput,
    setUserInput,
    analysisResult,
    setAnalysisResult,
    templateOptions,
    setTemplateOptions,
    showPageBreakGuide,
    setShowPageBreakGuide,
  } = useResumeStore();

  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const currentOptions: TemplateOptions = templateOptions || {
    themeColor: "#1e3a8a",
    avatarShape: "rectangle",
  };

  const updateOption = <K extends keyof TemplateOptions>(key: K, value: TemplateOptions[K]) => {
    setTemplateOptions({
      ...currentOptions,
      [key]: value,
    });
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        setUserInput({ avatarUrl: base64 });
        if (analysisResult?.finalResume) {
          setAnalysisResult({
            ...analysisResult,
            finalResume: {
              ...analysisResult.finalResume,
              personalInfo: {
                ...(analysisResult.finalResume.personalInfo || { name: "", email: "", phone: "", location: "" }),
                avatarUrl: base64,
              },
            },
            ...(analysisResult.englishResume
              ? {
                  englishResume: {
                    ...analysisResult.englishResume,
                    personalInfo: {
                      ...(analysisResult.englishResume.personalInfo || { name: "", email: "", phone: "", location: "" }),
                      avatarUrl: base64,
                    },
                  },
                }
              : {}),
          });
        }
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleRemoveAvatar = () => {
    setUserInput({ avatarUrl: "" });
    if (analysisResult?.finalResume) {
      setAnalysisResult({
        ...analysisResult,
        finalResume: {
          ...analysisResult.finalResume,
          personalInfo: {
            ...(analysisResult.finalResume.personalInfo || { name: "", email: "", phone: "", location: "" }),
            avatarUrl: "",
          },
        },
        ...(analysisResult.englishResume
          ? {
              englishResume: {
                ...analysisResult.englishResume,
                personalInfo: {
                  ...(analysisResult.englishResume.personalInfo || { name: "", email: "", phone: "", location: "" }),
                  avatarUrl: "",
                },
              },
            }
          : {}),
      });
    }
    if (avatarInputRef.current) {
      avatarInputRef.current.value = "";
    }
  };

  const avatarUrl = userInput.avatarUrl || analysisResult?.finalResume?.personalInfo?.avatarUrl || "";

  return (
    <Card className="mb-6 border-blue-100 bg-gradient-to-r from-blue-50/50 via-indigo-50/30 to-white shadow-xs">
      <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-xs font-bold text-blue-950 flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-blue-600" />
          可视化排版微调控制面板
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={showPageBreakGuide ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={() => setShowPageBreakGuide(!showPageBreakGuide)}
          >
            <Eye className="h-3.5 w-3.5" />
            {showPageBreakGuide ? "已开启 A4 分页辅助线" : "显示 A4 分页辅助线"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-1 space-y-3.5">
        {/* Row 1: Theme Color & Page Guides */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <label className="text-[11px] font-semibold text-neutral-600 shrink-0">🎨 主题配色：</label>
            <div className="flex flex-wrap gap-2.5 items-center">
              {COLOR_PRESETS.map((preset) => {
                const isSelected = (currentOptions.themeColor || "#1e3a8a") === preset.color;
                return (
                  <button
                    key={preset.color}
                    type="button"
                    title={preset.name}
                    onClick={() => updateOption("themeColor", preset.color)}
                    className={`relative shrink-0 rounded-full border border-black/10 transition-all flex items-center justify-center ${
                      isSelected ? "ring-2 ring-blue-500 ring-offset-1 scale-110" : "hover:scale-105"
                    }`}
                    style={{ backgroundColor: preset.color, width: "24px", height: "24px" }}
                  >
                    {isSelected && <Check className="h-3.5 w-3.5 text-white stroke-[3]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Photo Shape Selector */}
          <div className="flex items-center gap-2">
            <label className="text-[11px] font-semibold text-neutral-600 shrink-0">📷 照片框形状：</label>
            <div className="flex items-center gap-1.5 bg-white p-0.5 rounded-lg border border-neutral-200 shadow-2xs">
              <button
                type="button"
                onClick={() => updateOption("avatarShape", "rectangle")}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                  (currentOptions.avatarShape || "rectangle") === "rectangle"
                    ? "bg-blue-600 text-white font-bold shadow-2xs"
                    : "text-neutral-600 hover:bg-neutral-100"
                }`}
              >
                🖼️ 1寸/2寸 矩形相片 (推荐)
              </button>
              <button
                type="button"
                onClick={() => updateOption("avatarShape", "circle")}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                  currentOptions.avatarShape === "circle"
                    ? "bg-blue-600 text-white font-bold shadow-2xs"
                    : "text-neutral-600 hover:bg-neutral-100"
                }`}
              >
                ⭕ 圆形相框
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: Direct Photo Upload/Replace Control in Customizer */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-blue-100/70">
          <div className="flex items-center gap-3">
            <label className="text-[11px] font-semibold text-neutral-600 shrink-0">👤 简历照片：</label>
            <div className="flex items-center gap-3">
              <div
                className={`relative flex items-center justify-center border border-slate-300 bg-white overflow-hidden shadow-2xs ${
                  currentOptions.avatarShape === "circle" ? "w-8 h-8 rounded-full" : "w-7 h-9 rounded"
                }`}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="头像" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-4 h-4 text-slate-300" />
                )}
              </div>
              <span className="text-[11px] text-slate-500">
                {avatarUrl ? "已配置照片 (将在模板与导出文件中生效)" : "暂未上传个人照片"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*,.png,.jpg,.jpeg,.webp,.jfif,.bmp"
              className="hidden"
              onChange={handleAvatarUpload}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1 bg-white hover:bg-slate-50 text-blue-700 border-blue-200 shadow-2xs font-semibold"
              onClick={() => avatarInputRef.current?.click()}
            >
              <Upload className="h-3 w-3" />
              {avatarUrl ? "更换照片" : "上传照片"}
            </Button>
            {avatarUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                onClick={handleRemoveAvatar}
              >
                <Trash2 className="h-3 w-3" />
                删除照片
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
