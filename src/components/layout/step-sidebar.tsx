"use client";

import { useShallow } from "zustand/react/shallow";

import {
  Brain,
  CheckCircle2,
  ChevronRight,
  Download,
  FileSearch,
  FileText,
  GitCompare,
  Layers,
  Lock,
  MessageSquare,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useResumeStore } from "@/store/resume-store";
import type { StepId } from "@/types/resume";

const STEPS: { id: StepId; label: string; desc: string; icon: React.ElementType }[] = [
  { id: "input", label: "输入材料", desc: "填写 JD 与简历", icon: FileText },
  { id: "jd-analysis", label: "JD 解析", desc: "拆解岗位要求", icon: FileSearch },
  { id: "diagnosis", label: "简历诊断", desc: "评分与匹配度", icon: Target },
  { id: "match", label: "匹配分析", desc: "逐项差距对比", icon: GitCompare },
  { id: "follow-up", label: "经历追问", desc: "挖掘项目亮点", icon: MessageSquare },
  { id: "optimize", label: "简历优化", desc: "Bullet 点重写", icon: Sparkles },
  { id: "interview", label: "面试准备", desc: "高频问答预测", icon: Brain },
  { id: "export", label: "最终简历", desc: "预览与导出", icon: Download },
];

export function StepSidebar({
  onStepClick,
  isMobileDrawer,
  onClose,
}: {
  onStepClick?: () => void;
  isMobileDrawer?: boolean;
  onClose?: () => void;
}) {
  const { currentStep, setCurrentStep, getStepStatus, analysisResult } = useResumeStore(useShallow((state) => ({ currentStep: state.currentStep, setCurrentStep: state.setCurrentStep, getStepStatus: state.getStepStatus, analysisResult: state.analysisResult, maxReachedStepIndex: state.maxReachedStepIndex, isAnalyzing: state.isAnalyzing })));

  const completedCount = STEPS.filter((step) => {
    const status = getStepStatus(step.id);
    return status === "completed" || status === "active";
  }).length;

  const progressPercent = Math.round((completedCount / STEPS.length) * 100);

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-neutral-200/80 bg-gradient-to-b from-neutral-50/60 via-white to-white",
        isMobileDrawer ? "w-full" : "w-60 shrink-0"
      )}
    >
      {/* Header with overall process progress */}
      <div className="border-b border-neutral-200/70 p-4 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-neutral-800">
            <Layers className="h-3.5 w-3.5 text-blue-600" />
            <span>分析流程</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-blue-700 bg-blue-50 border border-blue-200/60 px-2 py-0.5 rounded-full">
              {completedCount}/{STEPS.length}
            </span>
            {isMobileDrawer && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
                aria-label="关闭侧边栏"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        <Progress value={progressPercent} className="h-1.5 bg-neutral-100" />
      </div>

      {/* Navigation step list - Sequential unlocking enforced */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {STEPS.map((step, index) => {
          const status = getStepStatus(step.id);
          const Icon = step.icon;
          const isActive = step.id === currentStep;
          const isCompleted = status === "completed";
          const isDisabled = status === "disabled";

          return (
            <button
              key={step.id}
              type="button"
              disabled={isDisabled}
              onClick={() => {
                if (!isDisabled) {
                  setCurrentStep(step.id);
                  onStepClick?.();
                }
              }}
              className={cn(
                "group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs transition-all duration-150",
                isActive
                  ? "bg-gradient-to-r from-blue-50/90 to-indigo-50/40 text-blue-950 font-semibold border-l-3 border-blue-600 shadow-2xs cursor-pointer"
                  : isCompleted
                  ? "text-neutral-700 hover:bg-neutral-100/70 hover:text-neutral-900 font-medium cursor-pointer"
                  : isDisabled
                  ? "opacity-45 text-neutral-400 cursor-not-allowed bg-neutral-50/30"
                  : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-800 font-medium cursor-pointer"
              )}
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                {isCompleted ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                ) : isDisabled ? (
                  <Lock className="h-3.5 w-3.5 text-neutral-300 shrink-0" />
                ) : (
                  <Icon
                    className={cn(
                      "h-4 w-4 transition-colors",
                      isActive ? "text-blue-600" : "text-neutral-400 group-hover:text-neutral-600"
                    )}
                  />
                )}
              </span>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="truncate text-xs">{step.label}</span>
                </div>
                <p
                  className={cn(
                    "text-[10px] truncate transition-colors",
                    isActive
                      ? "text-blue-600/80"
                      : isDisabled
                      ? "text-neutral-300"
                      : "text-neutral-400"
                  )}
                >
                  {step.desc}
                </p>
              </div>

              <span
                className={cn(
                  "text-[10px] tabular-nums font-mono px-1.5 py-0.5 rounded",
                  isActive
                    ? "bg-blue-100 text-blue-700 font-bold"
                    : isDisabled
                    ? "text-neutral-300"
                    : "text-neutral-400"
                )}
              >
                0{index + 1}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Overall Score Card at bottom */}
      {analysisResult?.diagnosis?.overallScore != null && (
        <div className="border-t border-neutral-200/80 p-3.5 bg-gradient-to-br from-neutral-50 to-blue-50/30">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-medium text-neutral-500">匹配综合得分</span>
            <button
              type="button"
              onClick={() => {
                setCurrentStep("export");
                onStepClick?.();
              }}
              className="text-[11px] font-medium text-blue-600 hover:text-blue-700 flex items-center gap-0.5 hover:underline cursor-pointer"
            >
              查看全貌 <ChevronRight className="h-3 w-3" />
            </button>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold tabular-nums text-blue-950 font-mono">
              {analysisResult.diagnosis.overallScore}
            </span>
            <span className="text-xs text-neutral-400 font-normal">/ 100 分</span>
          </div>
        </div>
      )}
    </aside>
  );
}
