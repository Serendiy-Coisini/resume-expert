"use client";

import { useEffect, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState, SectionTitle } from "@/components/shared/ui-helpers";
import { useResumeStore } from "@/store/resume-store";
import { regenerateOptimizedItems, STYLE_LABELS } from "@/services/ai/resumeAgent";

import type { OptimizeStyle } from "@/types/resume";
import { cn } from "@/lib/utils";

const STYLE_OPTIONS: { value: OptimizeStyle; label: string; desc: string }[] = [
  { value: "concise", label: "标准精炼", desc: "STAR 法则，结构表达精炼" },
  { value: "data-driven", label: "突出数据量化", desc: "强化指标、转化率与成果数据" },
  { value: "leadership", label: "强化主导力", desc: "突显主导、架构与核心贡献" },
  { value: "reduce-exaggeration", label: "务实保真", desc: "去除夸大表达，防面试追问失误" },
  { value: "jd-matched", label: "深度贴合 JD", desc: "高度嵌入目标岗位核心关键词" },
];

export function OptimizeStep() {
  const {
    analysisResult,
    userInput,
    optimizeStyle,
    setOptimizeStyle,
    patchAnalysisResult,
    setCurrentStep,
    sessionId,
  } = useResumeStore(useShallow((state) => ({ analysisResult: state.analysisResult, userInput: state.userInput, optimizeStyle: state.optimizeStyle, setOptimizeStyle: state.setOptimizeStyle, patchAnalysisResult: state.patchAnalysisResult, setCurrentStep: state.setCurrentStep, sessionId: state.sessionId })));
  const taskRef = useRef<AbortController | null>(null);
  useEffect(() => () => taskRef.current?.abort(), []);
  const [regenerating, setRegenerating] = useState(false);
  const [optimizeError, setOptimizeError] = useState<string | null>(null);

  if (!analysisResult || !analysisResult.optimizedItems) {
    return (
      <EmptyState
        message="请先完成输入材料并开始分析"
        actionLabel="返回输入材料"
        onAction={() => setCurrentStep("input")}
      />
    );
  }

  const handleStyleChange = async (style: OptimizeStyle) => {
    const revision = useResumeStore.getState().resultRevision;
    taskRef.current?.abort();
    const task = new AbortController();
    taskRef.current = task;
    const startedSessionId = sessionId;
    setRegenerating(true);
    setOptimizeError(null);
    try {
      const additionalInfo = [userInput.additionalInfo, ...analysisResult.followUpQuestions.filter(q => q.userAnswer.trim()).map(q => `${q.purpose}：${q.userAnswer}`)].join("\n");
      if (additionalInfo.length > 10_000) throw new Error("补充信息合计超过 10000 字，请精简后再切换风格，以免遗漏已确认的事实。");
      const { optimizedItems: items, finalResume: newFinalResume } = await regenerateOptimizedItems({ ...userInput, additionalInfo }, style, task.signal);
      const currentResult = useResumeStore.getState().analysisResult;
      if (useResumeStore.getState().sessionId !== startedSessionId || !currentResult) return;
      const committed = patchAnalysisResult({
        optimizedItems: items,
        finalResume: { ...newFinalResume, personalInfo: { ...newFinalResume.personalInfo, avatarUrl: currentResult.finalResume.personalInfo.avatarUrl } },
        englishResume: undefined,
      }, startedSessionId, revision);
      if (committed) setOptimizeStyle(style);
      else setOptimizeError("简历已发生变化，请重新选择风格。");
    } catch (error) {
      if (task.signal.aborted) return;
      setOptimizeError(error instanceof Error ? error.message : "优化生成失败");
    } finally {
      setRegenerating(false);
    }
  };

  const { optimizedItems } = analysisResult;

  return (
    <div>
      <SectionTitle
        title="简历优化"
        description="对照展示修改前/后的表达，附修改理由与风险提示"
      />

      <div className="mb-6 rounded-xl border border-neutral-200/80 bg-neutral-50/60 p-3.5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-neutral-800 flex items-center gap-1.5">
            <span>选择定制改写风格</span>
            <span className="text-[11px] font-normal text-neutral-500">（点击实时重构 Bullet Points）</span>
          </span>
          {regenerating && (
            <span className="flex items-center gap-1 text-xs text-blue-600 font-medium animate-pulse">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              正在按新风格改写简历中...
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
          {STYLE_OPTIONS.map((opt) => {
            const isSelected = optimizeStyle === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                disabled={regenerating}
                onClick={() => handleStyleChange(opt.value)}
                className={cn(
                  "flex flex-col items-start justify-center rounded-lg p-2.5 text-left transition-all cursor-pointer border",
                  isSelected
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm ring-2 ring-blue-500/20"
                    : "bg-white text-neutral-700 border-neutral-200 hover:border-neutral-300 hover:bg-neutral-100/60",
                  regenerating && "opacity-60 cursor-not-allowed"
                )}
              >
                <span className="text-xs font-semibold">{opt.label}</span>
                <span
                  className={cn(
                    "text-[10px] mt-0.5 line-clamp-1",
                    isSelected ? "text-blue-100" : "text-neutral-400"
                  )}
                >
                  {opt.desc}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {optimizeError && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {optimizeError}
        </div>
      )}

      {/* Mobile Card List View (hidden on sm+) */}
      <div className="block sm:hidden space-y-3 mb-6">
        {optimizedItems.map((item) => (
          <Card key={item.id} className="p-3.5 space-y-2.5">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
              <span className="text-xs font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200/60">
                {item.section}
              </span>
              <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60">
                {item.riskWarning || "防追问提示"}
              </span>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="p-2 rounded bg-neutral-50 border border-neutral-200/60">
                <span className="text-[10px] font-bold text-neutral-400 block mb-0.5">修改前：</span>
                <span className="text-neutral-600 line-through decoration-neutral-400/70">{item.before}</span>
              </div>
              <div className="p-2 rounded bg-emerald-50/70 border border-emerald-200/70">
                <span className="text-[10px] font-bold text-emerald-700 block mb-0.5">修改后：</span>
                <span className="text-emerald-950 font-medium">{item.after}</span>
              </div>
            </div>
            <div className="text-[11px] text-neutral-500 pt-1 border-t border-neutral-100">
              <span className="font-medium text-neutral-700">修改理由：</span>
              {item.reason}
            </div>
          </Card>
        ))}
      </div>

      {/* Desktop Table View (hidden on mobile) */}
      <Card className="hidden sm:block mb-6 overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">
            修改对照表
            <Badge variant="secondary" className="ml-2 font-normal">
              {STYLE_LABELS[optimizeStyle]}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 pb-2 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">模块</TableHead>
                <TableHead className="min-w-[180px]">修改前</TableHead>
                <TableHead className="min-w-[180px]">修改后</TableHead>
                <TableHead className="min-w-[120px]">修改理由</TableHead>
                <TableHead className="min-w-[120px]">风险提示</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {optimizedItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.section}</TableCell>
                  <TableCell className="text-neutral-500">{item.before}</TableCell>
                  <TableCell className="text-neutral-900">{item.after}</TableCell>
                  <TableCell className="text-neutral-600">{item.reason}</TableCell>
                  <TableCell>
                    <span className="text-amber-700">{item.riskWarning}</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" size="sm" onClick={() => setCurrentStep("follow-up")}>
          <ChevronLeft className="h-4 w-4" />
          上一步：经历追问
        </Button>
        <Button variant="outline" size="sm" onClick={() => setCurrentStep("interview")}>
          下一步：面试准备
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
