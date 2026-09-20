"use client";

import { useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { ChevronLeft, ChevronRight, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResumeTemplateView } from "@/components/shared/resume-template-view";
import { TemplateSelector } from "@/components/shared/template-selector";
import { EmptyState, SectionTitle } from "@/components/shared/ui-helpers";
import { useResumeStore } from "@/store/resume-store";
import { isForeignCompany } from "@/lib/company-config";
import { getOrBuildEnglishResume } from "@/lib/english-resume-builder";

export function FinalResumeStep() {
  const { userInput, analysisResult, selectedTemplate, setCurrentStep } = useResumeStore(useShallow((state) => ({ userInput: state.userInput, analysisResult: state.analysisResult, selectedTemplate: state.selectedTemplate, setCurrentStep: state.setCurrentStep })));
  const [activeLang, setActiveLang] = useState<"zh" | "en">("zh");

  if (!analysisResult || !analysisResult.finalResume) {
    return (
      <EmptyState
        message="请先完成输入材料并开始分析"
        actionLabel="返回输入材料"
        onAction={() => setCurrentStep("input")}
      />
    );
  }

  const hasEnglish = Boolean(analysisResult.englishResume);
  const isForeign = isForeignCompany(userInput.companyType);
  const currentResume = activeLang === "en"
    ? (analysisResult.englishResume || getOrBuildEnglishResume(analysisResult.finalResume, userInput))
    : analysisResult.finalResume;

  return (
    <div>
      <SectionTitle
        title="最终简历"
        description="选择偏好的简历模板与排版风格，预览最终优化好的专属简历"
      />

      {/* Language Switcher Bar */}
      {(hasEnglish || isForeign) && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
            <button
              type="button"
              onClick={() => setActiveLang("zh")}
              className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeLang === "zh"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              🇨🇳 中文版简历
            </button>
            <button
              type="button"
              onClick={() => setActiveLang("en")}
              className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeLang === "en"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-blue-700 hover:bg-blue-50"
              }`}
            >
              🇺🇸 English Resume (全英文版)
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-blue-800 bg-blue-100/80 px-3 py-1.5 rounded-lg border border-blue-200/80">
            <Globe className="h-4 w-4 text-blue-600 shrink-0" />
            <span>外企投递专属：已为您自动同步生成规范化全英文版简历 (English Resume)</span>
          </div>
        </div>
      )}

      {/* Template Selection Cards */}
      <TemplateSelector />

      {/* Dynamic Template Preview View */}
      <div className="mb-6">
        <ResumeTemplateView resume={currentResume} templateId={selectedTemplate} />
      </div>

      <div className="flex justify-between">
        <Button variant="outline" size="sm" onClick={() => setCurrentStep("optimize")}>
          <ChevronLeft className="h-4 w-4" />
          上一步：简历优化
        </Button>
        <Button variant="outline" size="sm" onClick={() => setCurrentStep("interview")}>
          下一步：面试准备
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
