"use client";

import { useEffect, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { Check, ChevronLeft, ChevronRight, Loader2, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, SectionTitle } from "@/components/shared/ui-helpers";
import { applyFollowUpBullets, generateFollowUpBullet } from "@/services/ai/resumeAgent";
import { useResumeStore } from "@/store/resume-store";

export function FollowUpStep() {
  const {
    analysisResult,
    partialAnalysisResult,
    userInput,
    optimizeStyle,
    updateFollowUpAnswer,
    setFollowUpBullet,
    patchAnalysisResult,
    setCurrentStep,
    sessionId,
  } = useResumeStore(
    useShallow((state) => ({
      analysisResult: state.analysisResult,
      partialAnalysisResult: state.partialAnalysisResult,
      userInput: state.userInput,
      optimizeStyle: state.optimizeStyle,
      updateFollowUpAnswer: state.updateFollowUpAnswer,
      setFollowUpBullet: state.setFollowUpBullet,
      patchAnalysisResult: state.patchAnalysisResult,
      setCurrentStep: state.setCurrentStep,
      sessionId: state.sessionId,
    }))
  );

  const effectiveResult = analysisResult || partialAnalysisResult;
  const tasks = useRef(new Set<AbortController>());
  useEffect(() => { const active = tasks.current; return () => active.forEach(task => task.abort()); }, []);
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customGeneratedIds, setCustomGeneratedIds] = useState<Set<string>>(new Set());

  if (!effectiveResult || !effectiveResult.followUpQuestions) {
    return (
      <EmptyState
        message="请先完成输入材料并开始分析"
        actionLabel="返回输入材料"
        onAction={() => setCurrentStep("input")}
      />
    );
  }

  const { followUpQuestions } = effectiveResult;

  const generatedBullets = followUpQuestions
    .filter((q) => q.userAnswer.trim() && q.generatedBullet.trim())
    .map((q) => ({ purpose: q.purpose, bullet: q.generatedBullet }));

  const handleGenerateBullet = async (id: string) => {
    const question = followUpQuestions.find((q) => q.id === id);
    if (!question || !(question.userAnswer || "").trim()) return;

    const startedSessionId = sessionId;
    const task = new AbortController();
    tasks.current.add(task);
    const startedAnswer = question.userAnswer;
    setLoadingIds((current) => new Set(current).add(id));
    setError(null);
    setApplied(false);
    try {
      const bullet = await generateFollowUpBullet(
        userInput,
        question.question,
        question.purpose,
        question.userAnswer, task.signal
      );
      const current = useResumeStore.getState();
      const currentQuestion = (current.analysisResult || current.partialAnalysisResult)?.followUpQuestions?.find((item) => item.id === id);
      if (current.sessionId === startedSessionId && currentQuestion?.userAnswer === startedAnswer) {
        setFollowUpBullet(id, bullet);
        setCustomGeneratedIds((prev) => new Set(prev).add(id));
      }
    } catch (err) {
      if (task.signal.aborted) return;
      setError(err instanceof Error ? err.message : "Bullet 生成失败");
    } finally {
      tasks.current.delete(task);
      setLoadingIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }
  };

  const handleApplyBullets = async () => {
    if (!generatedBullets.length) return;
    const revision = useResumeStore.getState().resultRevision;
    setApplying(true);
    const startedSessionId = sessionId;
    const task = new AbortController();
    tasks.current.add(task);
    setError(null);
    try {
      const { optimizedItems, finalResume } = await applyFollowUpBullets(
        userInput,
        optimizeStyle,
        generatedBullets, task.signal
      );
      const committed = patchAnalysisResult({
        optimizedItems,
        finalResume: { ...finalResume, personalInfo: { ...finalResume.personalInfo, avatarUrl: userInput.avatarUrl } },
        englishResume: undefined,
      }, startedSessionId, revision);
      if (committed) setApplied(true);
      else setError("回答或简历已变化，本次旧结果未应用，请重试。");
    } catch (err) {
      if (task.signal.aborted) return;
      setError(err instanceof Error ? err.message : "应用追问结果失败");
    } finally {
      tasks.current.delete(task);
      setApplying(false);
    }
  };

  return (
    <div>
      <SectionTitle
        title="经历追问"
        description="针对简历与目标 JD 的硬性缺口进行定向挖掘。您可以补充真实经历细节重新生成专属 Bullet，也可直接采纳参考范例。"
      />

      {/* Concept Clarification Banner */}
      <div className="mb-6 rounded-xl border border-blue-200/80 bg-gradient-to-r from-blue-50/90 via-indigo-50/40 to-purple-50/50 p-4 text-xs space-y-1.5 shadow-2xs">
        <div className="flex items-center gap-2 font-bold text-blue-950 text-sm">
          <Sparkles className="h-4 w-4 text-amber-500 shrink-0" />
          <span>什么是“经历追问”？它有什么作用？</span>
        </div>
        <p className="text-neutral-600 leading-relaxed">
          AI 诊断发现您的简历在强匹配目标岗位时缺少部分核心证据（如大模型落地、数据量化或高并发经验）。追问旨在协助您补全这些关键细节。
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-[11px] font-medium">
          <span className="text-blue-700 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            未填写回答时：下方展示大模型拟定的 **【💡 AI 预设参考 Bullet】**
          </span>
          <span className="text-emerald-700 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            在“你的回答”框填入细节并点击生成：获得 **【✨ 专属定制 Bullet】**
          </span>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mb-6 space-y-5">
        {followUpQuestions.map((q, index) => {
          const isCustom = customGeneratedIds.has(q.id);
          const activeBullet = q.generatedBullet || q.presetBullet || "";

          return (
            <Card key={q.id} className="overflow-hidden border-neutral-200/80 shadow-2xs">
              <CardHeader className="pb-3 bg-neutral-50/50 border-b border-neutral-100">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-xs font-semibold text-neutral-500">
                        追问 {index + 1}
                      </span>
                      <Badge variant="outline" className="font-medium bg-white text-blue-700 border-blue-200">
                        {q.purpose}
                      </Badge>
                    </div>
                    <CardTitle className="text-sm font-semibold leading-snug text-neutral-900">
                      {q.question}
                    </CardTitle>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`answer-${q.id}`} className="text-xs font-semibold text-neutral-700">
                      你的回答（填写您的真实业务细节、数据或做法）
                    </Label>
                    {activeBullet && (
                      <button
                        type="button"
                        onClick={() => updateFollowUpAnswer(q.id, activeBullet)}
                        className="text-[11px] text-blue-600 hover:text-blue-700 font-medium hover:underline flex items-center gap-1"
                      >
                        <Wand2 className="h-3 w-3" />
                        填入参考范例以作修改
                      </button>
                    )}
                  </div>
                  <Textarea
                    id={`answer-${q.id}`}
                    className="min-h-[85px] text-sm focus-visible:ring-blue-500"
                    placeholder="填写您的真实经历、数据与做法..."
                    value={q.userAnswer}
                    onChange={(e) => { setApplied(false); updateFollowUpAnswer(q.id, e.target.value); }}
                  />
                </div>

                <div className="flex items-center justify-between gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    disabled={!q.userAnswer.trim() || loadingIds.has(q.id)}
                    onClick={() => handleGenerateBullet(q.id)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs"
                  >
                    {loadingIds.has(q.id) ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        正在根据您的回答定制生成...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5 text-amber-300 mr-1" />
                        根据我的回答生成专属 Bullet
                      </>
                    )}
                  </Button>
                </div>

                {/* Bullet Display Card with clear visual distinction */}
                {activeBullet && (
                  <div
                    className={`rounded-lg p-3.5 transition-all ${
                      isCustom
                        ? "border border-emerald-300 bg-gradient-to-r from-emerald-50 via-teal-50/40 to-white shadow-2xs"
                        : "border border-blue-200/90 bg-gradient-to-r from-blue-50/70 via-indigo-50/30 to-white"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            isCustom
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                              : "bg-blue-100 text-blue-800 border border-blue-200"
                          }`}
                        >
                          {isCustom ? "✨ 专属定制 Bullet" : "💡 AI 预设参考 Bullet（范例）"}
                        </span>
                        <span className="text-[11px] text-neutral-400">
                          {isCustom ? "已基于您的回答精炼合成" : "系统根据目标 JD 拟定的标准写作规范"}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm leading-relaxed font-medium text-neutral-800">
                      {activeBullet}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Apply bullets to resume */}
      {generatedBullets.length > 0 && (
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50/50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-blue-900">
                已可应用 {generatedBullets.length} 条 bullet 补强履历
              </p>
              <p className="text-xs text-blue-700">
                仅会应用您填写真实回答后生成的专属 Bullet
              </p>
            </div>
            <Button
              size="sm"
              disabled={applying}
              onClick={handleApplyBullets}
              className={applied ? "bg-emerald-600 hover:bg-emerald-700" : ""}
            >
              {applying ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  应用中...
                </>
              ) : applied ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  已应用到简历
                </>
              ) : (
                <>
                  <Wand2 className="h-3.5 w-3.5" />
                  应用到简历
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      <div className="flex justify-between">
        <Button variant="outline" size="sm" onClick={() => setCurrentStep("match")}>
          <ChevronLeft className="h-4 w-4" />
          上一步：匹配分析
        </Button>
        <Button variant="outline" size="sm" onClick={() => setCurrentStep("optimize")}>
          下一步：简历优化
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
