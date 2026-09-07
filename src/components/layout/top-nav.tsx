"use client";

import { useEffect, useState } from "react";
import { FileText, Menu, RotateCcw, Settings } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fetchAIStatus } from "@/services/ai/resumeAgent";
import { HistoryDialog } from "@/components/layout/history-dialog";
import { useResumeStore } from "@/store/resume-store";
import { useAIConfigStore } from "@/store/ai-config-store";

export function TopNav({ onMenuClick }: { onMenuClick?: () => void }) {
  const { aiMode, setAiMode, analysisResult, reset } = useResumeStore();
  const { config: userAIConfig } = useAIConfigStore();
  const [mockReason, setMockReason] = useState<string | null>(null);

  useEffect(() => {
    if (userAIConfig?.apiKey?.trim()) {
      setAiMode("llm");
      setMockReason(null);
      return;
    }

    fetchAIStatus()
      .then((status) => {
        setAiMode(status.mode);
        if (status.reason === "missing_api_key") {
          setMockReason("未配置 API Key");
        } else if (status.reason === "forced") {
          setMockReason("已强制 Mock");
        } else {
          setMockReason(null);
        }
      })
      .catch(() => setAiMode("mock"));
  }, [setAiMode, userAIConfig]);

  const handleReset = () => {
    if (window.confirm("确定要重新开始吗？当前所有输入和分析结果将被清除。")) {
      reset();
    }
  };

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-neutral-200 bg-white px-3 sm:px-4">
      <div className="flex items-center gap-2 sm:gap-2.5">
        {onMenuClick && (
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200/80 bg-neutral-50 text-neutral-700 hover:bg-neutral-100 active:scale-95 transition-all md:hidden"
            onClick={onMenuClick}
            aria-label="打开菜单"
          >
            <Menu className="h-4 w-4 text-neutral-700" />
          </button>
        )}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md border border-neutral-200 bg-blue-50/50 text-blue-600">
            <FileText className="h-3.5 w-3.5" />
          </div>
          <h1 className="text-sm font-semibold tracking-tight text-neutral-900">简历专家</h1>
        </Link>
        {aiMode && (
          <Badge variant={aiMode === "llm" ? "success" : "secondary"} className="text-[10px] py-0 px-1.5 font-normal sm:hidden">
            {aiMode === "llm" ? "AI" : "Mock"}
          </Badge>
        )}

        <span className="hidden rounded-md border border-neutral-200 px-1.5 py-0.5 text-[10px] font-medium text-neutral-500 sm:inline">
          JD 定制简历优化 Agent
        </span>
        {aiMode && (
          <Badge variant={aiMode === "llm" ? "success" : "secondary"} className="hidden font-normal sm:inline-flex">
            {aiMode === "llm" ? (userAIConfig?.apiKey?.trim() ? "AI 模式 (本地Key)" : "AI 模式") : mockReason ? `Mock · ${mockReason}` : "Mock 模式"}
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Link href="/medical">
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 border-teal-200 bg-teal-50/50 hover:bg-teal-100/60 font-semibold text-teal-800">
            <span>🩺 医学生保研</span>
          </Button>
        </Link>

        <Link href="/settings">
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 border-neutral-200 hover:bg-neutral-50 font-semibold text-neutral-700">
            <Settings className="h-3.5 w-3.5 text-blue-600" />
            <span>⚙️ AI 配置</span>
          </Button>
        </Link>

        <HistoryDialog />

        {analysisResult && (
          <Button variant="ghost" size="sm" className="h-8 text-xs text-neutral-500 px-2" onClick={handleReset}>
            <RotateCcw className="h-3 w-3 sm:mr-1" />
            <span className="hidden sm:inline">重新开始</span>
          </Button>
        )}
      </div>
    </header>
  );
}
