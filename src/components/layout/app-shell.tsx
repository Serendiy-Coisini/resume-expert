"use client";

import { useState } from "react";
import { TopNav } from "./top-nav";
import { StepSidebar } from "./step-sidebar";

import { InputStep } from "@/components/steps/input-step";
import { JDAnalysisStep } from "@/components/steps/jd-analysis-step";

import { DiagnosisStep } from "@/components/steps/diagnosis-step";
import { MatchStep } from "@/components/steps/match-step";
import { FollowUpStep } from "@/components/steps/follow-up-step";
import { OptimizeStep } from "@/components/steps/optimize-step";
import { InterviewStep } from "@/components/steps/interview-step";
import { ExportStep } from "@/components/steps/export-step";
import { StepErrorBoundary } from "@/components/shared/step-error-boundary";
import { useResumeStore } from "@/store/resume-store";

export function AppShell() {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const { currentStep } = useResumeStore();

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
            <StepErrorBoundary stepId={currentStep}>
              {renderStep()}
            </StepErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
}
