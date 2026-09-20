"use client";

import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { useIsStorageVolatile } from "@/lib/safe-storage";
import dynamic from "next/dynamic";
import { TopNav } from "./top-nav";
import { StepSidebar } from "./step-sidebar";

import { InputStep } from "@/components/steps/input-step";
import { StepErrorBoundary } from "@/components/shared/step-error-boundary";
import { useResumeStore } from "@/store/resume-store";

const JDAnalysisStep = dynamic(() => import("@/components/steps/jd-analysis-step").then((module) => module.JDAnalysisStep));
const DiagnosisStep = dynamic(() => import("@/components/steps/diagnosis-step").then((module) => module.DiagnosisStep));
const MatchStep = dynamic(() => import("@/components/steps/match-step").then((module) => module.MatchStep));
const FollowUpStep = dynamic(() => import("@/components/steps/follow-up-step").then((module) => module.FollowUpStep));
const OptimizeStep = dynamic(() => import("@/components/steps/optimize-step").then((module) => module.OptimizeStep));
const InterviewStep = dynamic(() => import("@/components/steps/interview-step").then((module) => module.InterviewStep));
const ExportStep = dynamic(() => import("@/components/steps/export-step").then((module) => module.ExportStep));

export function AppShell() {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [storageWarningDismissed, setStorageWarningDismissed] = useState(false);
  const currentStep = useResumeStore((state) => state.currentStep);
  const isVolatile = useIsStorageVolatile();

  const renderStep = () => {
    switch (currentStep) {
      case "input":
        return <InputStep />;
      case "jd-analysis":
        return <JDAnalysisStep />;

      case "diagnosis":
        return <DiagnosisStep />;
      case "match":
        return <MatchStep />;
      case "follow-up":
        return <FollowUpStep />;
      case "optimize":
        return <OptimizeStep />;
      case "interview":
        return <InterviewStep />;
      case "export":
        return <ExportStep />;
      default:
        return <InputStep />;
    }
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-neutral-50 text-neutral-900">
      <TopNav onMenuClick={() => setMobileDrawerOpen(true)} />
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden w-64 shrink-0 md:block border-r border-neutral-200 bg-neutral-50">
          <StepSidebar />
        </div>

        {/* Mobile Drawer */}
        {mobileDrawerOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            <div className="fixed inset-0 bg-black/50" onClick={() => setMobileDrawerOpen(false)} />
            <div className="relative z-10 w-72 bg-white">
              <StepSidebar
                isMobileDrawer
                onClose={() => setMobileDrawerOpen(false)}
                onStepClick={() => setMobileDrawerOpen(false)}
              />
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-white p-4 md:p-6">
          <div className="mx-auto max-w-5xl">
            {isVolatile && !storageWarningDismissed && (
              <div className="mb-4 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800 shadow-2xs">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                  <span>
                    <strong>浏览器本地存储受限</strong>：当前简历修改仅保存在本次会话中，刷新或关闭标签页后可能丢失，请及时复制或导出。
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setStorageWarningDismissed(true)}
                  className="ml-3 rounded p-1 hover:bg-amber-100 text-amber-600 cursor-pointer"
                  title="关闭提示"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            <StepErrorBoundary stepId={currentStep}>
              {renderStep()}
            </StepErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
}
