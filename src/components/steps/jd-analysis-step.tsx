"use client";

import { Building2, ChevronLeft, ChevronRight, Download, Printer, Sparkles } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  EmptyState,
  ImportanceBadge,
  KeywordTags,
  ListSection,
} from "@/components/shared/ui-helpers";
import { useResumeStore } from "@/store/resume-store";
import { exportJDAnalysisAsPDF, exportFullAnalysisAsPDF } from "@/lib/export-analysis-pdf";
import { getCompanyTypeOption } from "@/lib/company-config";
import { getJobStageOption } from "@/lib/job-stage-config";

export function JDAnalysisStep() {
  const { userInput, analysisResult, setCurrentStep } = useResumeStore(useShallow((state) => ({ userInput: state.userInput, analysisResult: state.analysisResult, setCurrentStep: state.setCurrentStep })));

  if (!analysisResult || !analysisResult.jdAnalysis) {
    return (
      <EmptyState
        message="请先完成输入材料并开始分析"
        actionLabel="返回输入材料"
        onAction={() => setCurrentStep("input")}
      />
    );
  }

  const { jdAnalysis } = analysisResult;
  const companyOpt = getCompanyTypeOption(userInput.companyType);
  const stageOpt = getJobStageOption(userInput.jobStage);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-neutral-900">JD 解析</h2>
          <p className="mt-1 text-sm text-neutral-500">
            从目标岗位描述中提取职责、要求、关键词与理想候选人画像
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportJDAnalysisAsPDF(userInput, jdAnalysis)}
            className="text-xs text-blue-700 border-blue-200 bg-blue-50/60 hover:bg-blue-100"
          >
            <Download className="h-3.5 w-3.5 mr-1 text-blue-600" />
            导出 JD 解析 PDF
          </Button>
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
      </div>

      {/* Target company & job stage context banner */}
      <div className="mb-6 rounded-lg border border-blue-100 bg-blue-50/40 p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-blue-100 text-blue-700 rounded-md shrink-0">
            <Building2 className="h-4 w-4" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 font-medium text-neutral-900">
              <span>目标企业：{companyOpt.label}</span>
              <span className="bg-blue-100 text-blue-800 text-[11px] px-2 py-0.5 rounded font-semibold">
                规模: {companyOpt.scale}
              </span>
              <span className="bg-indigo-100 text-indigo-800 text-[11px] px-2 py-0.5 rounded font-semibold">
                阶段: {companyOpt.stage}
              </span>
              <span className="bg-purple-100 text-purple-800 text-[11px] px-2 py-0.5 rounded font-semibold">
                求职阶段: {stageOpt.label} ({stageOpt.experience})
              </span>
            </div>
            <p className="text-neutral-500 mt-0.5">{companyOpt.aiFocus} | {stageOpt.aiFocus}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-blue-700 bg-white/80 px-2.5 py-1 rounded border border-blue-200/80 font-medium text-[11px]">
          <Sparkles className="h-3 w-3 text-blue-600" />
          AI 双维度解析已生效
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">岗位职责</CardTitle>
          </CardHeader>
          <CardContent>
            <ListSection title="" items={jdAnalysis.responsibilities} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">硬性要求</CardTitle>
          </CardHeader>
          <CardContent>
            <ListSection title="" items={jdAnalysis.hardRequirements} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">隐性要求</CardTitle>
          </CardHeader>
          <CardContent>
            <ListSection title="" items={jdAnalysis.implicitRequirements} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">关键词</CardTitle>
          </CardHeader>
          <CardContent>
            <KeywordTags keywords={jdAnalysis.keywords} />
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">理想候选人画像</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-neutral-600">{jdAnalysis.idealCandidate}</p>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">核心能力表</CardTitle>
        </CardHeader>
        <CardContent className="p-0 pb-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[140px]">能力</TableHead>
                <TableHead className="w-[60px]">重要性</TableHead>
                <TableHead>说明</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jdAnalysis.coreCompetencies.map((c) => (
                <TableRow key={c.name}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>
                    <ImportanceBadge importance={c.importance} />
                  </TableCell>
                  <TableCell className="text-neutral-600">{c.description}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" size="sm" onClick={() => setCurrentStep("input")}>
          <ChevronLeft className="h-4 w-4" />
          上一步：输入材料
        </Button>
        <Button variant="outline" size="sm" onClick={() => setCurrentStep("diagnosis")}>
          下一步：简历诊断
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
