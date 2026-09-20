"use client";

import { useState } from "react";
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
  const currentStep = useResumeStore((state) => state.currentStep);

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
