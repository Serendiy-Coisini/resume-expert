"use client";

import { ChevronLeft, ChevronRight, Printer } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
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
import { EmptyState, EvidenceBadge } from "@/components/shared/ui-helpers";
import { useResumeStore } from "@/store/resume-store";
import { exportFullAnalysisAsPDF } from "@/lib/export-analysis-pdf";

export function MatchStep() {
  const { userInput, analysisResult, setCurrentStep } = useResumeStore(useShallow((state) => ({ userInput: state.userInput, analysisResult: state.analysisResult, setCurrentStep: state.setCurrentStep })));

  if (!analysisResult || !analysisResult.matchItems) {
    return (
      <EmptyState
        message="请先完成输入材料并开始分析"
        actionLabel="返回输入材料"
        onAction={() => setCurrentStep("input")}
      />
    );
  }

  const { matchItems } = analysisResult;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-neutral-900">匹配分析</h2>
          <p className="mt-1 text-sm text-neutral-500">
            逐条对比 JD 要求与简历证据，识别缺口与优化方向
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

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">JD 要求 vs 简历证据</CardTitle>
        </CardHeader>
        <CardContent className="p-0 pb-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[140px]">JD 要求</TableHead>
                <TableHead className="min-w-[180px]">简历证据</TableHead>
                <TableHead className="w-[70px]">证据强度</TableHead>
                <TableHead className="w-[80px]">是否补充</TableHead>
                <TableHead className="min-w-[160px]">优化建议</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matchItems.map((item, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{item.jdRequirement}</TableCell>
                  <TableCell className="text-neutral-600">{item.resumeEvidence}</TableCell>
                  <TableCell>
                    <EvidenceBadge strength={item.evidenceStrength} />
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.needsSupplement ? "warning" : "success"}>
                      {item.needsSupplement ? "需补充" : "已覆盖"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-neutral-600">{item.optimizationSuggestion}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" size="sm" onClick={() => setCurrentStep("diagnosis")}>
          <ChevronLeft className="h-4 w-4" />
          上一步：简历诊断
        </Button>
        <Button variant="outline" size="sm" onClick={() => setCurrentStep("follow-up")}>
          下一步：经历追问
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
