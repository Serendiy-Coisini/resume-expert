"use client";

import { ChevronLeft, ChevronRight, Printer } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  EmptyState,
  ListSection,
  ScoreRing,
} from "@/components/shared/ui-helpers";
import { useResumeStore } from "@/store/resume-store";
import { exportFullAnalysisAsPDF } from "@/lib/export-analysis-pdf";

export function DiagnosisStep() {
  const { userInput, analysisResult, setCurrentStep } = useResumeStore(useShallow((state) => ({ userInput: state.userInput, analysisResult: state.analysisResult, setCurrentStep: state.setCurrentStep })));

  if (!analysisResult || !analysisResult.diagnosis) {
    return (
      <EmptyState
        message="请先完成输入材料并开始分析"
        actionLabel="返回输入材料"
        onAction={() => setCurrentStep("input")}
      />
    );
  }

  const { diagnosis } = analysisResult;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-neutral-900">简历诊断</h2>
          <p className="mt-1 text-sm text-neutral-500">
            基于 JD 要求评估当前简历的匹配度与主要问题
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => exportFullAnalysisAsPDF(userInput, analysisResult)}
          className="text-xs text-indigo-700 border-indigo-200 bg-indigo-50/60 hover:bg-indigo-100 font-medium"
        >
          <Printer className="h-3.5 w-3.5 mr-1 text-indigo-600" />
          导出全景综合报告 PDF
        </Button>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-[160px_1fr]">
        <Card className="flex items-center justify-center py-6">
          <ScoreRing score={diagnosis.overallScore} />
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">维度评分</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {diagnosis.dimensionScores.map((d) => (
              <div key={d.dimension}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-medium">{d.dimension}</span>
                  <span className="tabular-nums text-neutral-500">{d.score}</span>
                </div>
                <Progress value={d.score} className="mb-1" />
                <p className="text-xs text-neutral-500">{d.comment}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">主要问题</CardTitle>
          </CardHeader>
          <CardContent>
            <ListSection title="" items={diagnosis.mainIssues} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">优先修改建议</CardTitle>
          </CardHeader>
          <CardContent>
            <ListSection title="" items={diagnosis.prioritySuggestions} />
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" size="sm" onClick={() => setCurrentStep("jd-analysis")}>
          <ChevronLeft className="h-4 w-4" />
          上一步：JD 解析
        </Button>
        <Button variant="outline" size="sm" onClick={() => setCurrentStep("match")}>
          下一步：匹配分析
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
