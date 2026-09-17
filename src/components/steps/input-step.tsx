"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileUp,
  ImageIcon,
  Loader2,
  RotateCcw,
  Settings,
  ShieldCheck,
  Sparkles,
  User,
  Wand2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SectionTitle } from "@/components/shared/ui-helpers";
import { runResumeAnalysisStream } from "@/services/ai/resumeAgent";
import { useResumeStore } from "@/store/resume-store";
import { getAIHeaders } from "@/store/ai-config-store";
import { renderPdfPagesToImages } from "@/lib/pdf-to-images";
import type { CompanyType, JobStage } from "@/types/resume";
import { COMPANY_TYPE_OPTIONS, getCompanyTypeOption } from "@/lib/company-config";
import { JOB_STAGE_OPTIONS, getJobStageOption } from "@/lib/job-stage-config";
import {
  detectIndustrySmart,
  ALL_INDUSTRY_GROUPS,
  POPULAR_INDUSTRIES,
} from "@/lib/industry-detector";

const STAGE_STEPS = [
  { id: "jd-analysis", name: "JD 拆解", label: "正在拆解岗位 JD 核心要求", startPct: 15, endPct: 35 },
  { id: "diagnosis", name: "匹配诊断", label: "正在深度诊断与计算匹配打分", startPct: 40, endPct: 65 },
  { id: "optimize", name: "简历改写", label: "正在定制优化简历 Bullet Points", startPct: 70, endPct: 82 },
  { id: "interview", name: "面试预测", label: "正在预测高频面试考点与回答", startPct: 85, endPct: 95 },
];

export function InputStep() {
  const {
    userInput,
    setUserInput,
    loadExampleData,
    analysisResult,
    setAnalysisResult,
    setAnalyzing,
    setAnalysisError,
    setAiMode,
    isAnalyzing,
    analysisError,
    setCurrentStep,
    enablePIIMasking,
    setEnablePIIMasking,
    analysisStage,
    setAnalysisStage,
    updatePartialAnalysisResult,
  } = useResumeStore();

  const abortControllerRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const jdFileInputRef = useRef<HTMLInputElement | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const dragCounter = useRef(0);
  const jdDragCounter = useRef(0);

  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [uploadingJd, setUploadingJd] = useState(false);
  const [jdErrorMsg, setJdErrorMsg] = useState<string | null>(null);
  const [jdSuccessMsg, setJdSuccessMsg] = useState<string | null>(null);
  const [jdImagePreview, setJdImagePreview] = useState<string | null>(null);
  const [isDraggingJd, setIsDraggingJd] = useState(false);

  const [showAllIndustries, setShowAllIndustries] = useState(false);
  const [detectedToast, setDetectedToast] = useState<string | null>(null);

  const triggerSmartDetection = (targetRole: string, jobDescription: string) => {
    const detected = detectIndustrySmart(targetRole, jobDescription);
    setUserInput({ industry: detected });
    setDetectedToast(`✨ 已为您准确识别行业：${detected}`);
    setTimeout(() => setDetectedToast(null), 4000);
  };

  const processJdFile = async (file: File) => {
    setUploadingJd(true);
    setJdErrorMsg(null);
    setJdSuccessMsg(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/parse-jd-image", {
        method: "POST",
        headers: getAIHeaders(),
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "识别 JD 图片/文件失败");
      }

      if (data.text) {
        setUserInput({ jobDescription: data.text });

        const detectedIndustry = detectIndustrySmart(userInput.targetRole, data.text);
        if (detectedIndustry && detectedIndustry !== userInput.industry) {
          setUserInput({ industry: detectedIndustry });
          setDetectedToast(`✨ 已智能提取并精准适配目标行业：${detectedIndustry}`);
          setTimeout(() => setDetectedToast(null), 4000);
        }

        if (data.isImage && data.dataUrl) {
          setJdImagePreview(data.dataUrl);
          setJdSuccessMsg(`🎉 成功通过 AI 视觉识别为您提炼截图中 ${data.text.length} 字岗位要求！`);
        } else {
          setJdSuccessMsg(`🎉 成功解析并提取 JD 岗位要求 (${data.text.length} 字)！`);
        }
      }
    } catch (err) {
      setJdErrorMsg(err instanceof Error ? err.message : "识别 JD 图片/文件失败，请重试或直接粘贴文本");
    } finally {
      setUploadingJd(false);
      if (jdFileInputRef.current) {
        jdFileInputRef.current.value = "";
      }
    }
  };

  const handleJdFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processJdFile(file);
    }
  };

  const handleJdDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    jdDragCounter.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDraggingJd(true);
    }
  };

  const handleJdDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleJdDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    jdDragCounter.current -= 1;
    if (jdDragCounter.current === 0) {
      setIsDraggingJd(false);
    }
  };

  const handleJdDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingJd(false);
    jdDragCounter.current = 0;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processJdFile(file);
    }
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        setUserInput({ avatarUrl: base64 });
        if (analysisResult?.finalResume) {
          setAnalysisResult({
            ...analysisResult,
            finalResume: {
              ...analysisResult.finalResume,
              personalInfo: {
                ...(analysisResult.finalResume.personalInfo || { name: "", email: "", phone: "", location: "" }),
                avatarUrl: base64,
              },
            },
            ...(analysisResult.englishResume
              ? {
                  englishResume: {
                    ...analysisResult.englishResume,
                    personalInfo: {
                      ...(analysisResult.englishResume.personalInfo || { name: "", email: "", phone: "", location: "" }),
                      avatarUrl: base64,
                    },
                  },
                }
              : {}),
          });
        }
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleRemoveAvatar = () => {
    setUserInput({ avatarUrl: "" });
    if (analysisResult?.finalResume) {
      setAnalysisResult({
        ...analysisResult,
        finalResume: {
          ...analysisResult.finalResume,
          personalInfo: {
            ...(analysisResult.finalResume.personalInfo || { name: "", email: "", phone: "", location: "" }),
            avatarUrl: "",
          },
        },
        ...(analysisResult.englishResume
          ? {
              englishResume: {
                ...analysisResult.englishResume,
                personalInfo: {
                  ...(analysisResult.englishResume.personalInfo || { name: "", email: "", phone: "", location: "" }),
                  avatarUrl: "",
                },
              },
            }
          : {}),
      });
    }
    if (avatarInputRef.current) {
      avatarInputRef.current.value = "";
    }
  };

  const processResumeFile = async (file: File) => {
    const fileName = file.name.toLowerCase();
    const isImage = file.type.startsWith("image/") || /\.(png|jpe?g|webp|bmp)$/i.test(fileName);
    const isPdf = file.type === "application/pdf" || fileName.endsWith(".pdf");
    const isWord = fileName.endsWith(".docx") || fileName.endsWith(".doc");
    const isTxt = fileName.endsWith(".txt");

    if (!isPdf && !isWord && !isTxt && !isImage) {
      setPdfError("仅支持上传 PDF (.pdf)、Word (.docx / .doc)、图片 (.png / .jpg) 或纯文本 (.txt) 格式文件");
      return;
    }

    setUploadingPdf(true);
    setPdfError(null);

    try {
      // Create memory-efficient blob URL to avoid Base64 memory bloat and localStorage QuotaExceededError
      const blobUrl = URL.createObjectURL(file);
      setUserInput({
        rawFileName: file.name,
        rawFileType: isPdf ? "pdf" : isWord ? "word" : isImage ? "image" : "txt",
        rawFileDataUrl: blobUrl,
      });

      let extractedText = "";

      if (isImage) {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const res = await fetch("/api/parse-resume-image", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getAIHeaders(),
          },
          body: JSON.stringify({ images: [dataUrl] }),
        });

        const data = await res.json();
        if (!res.ok || data.error) {
          throw new Error(data.error || "未能从简历图片中识别提取文字");
        }
        extractedText = data.text || "";
      } else if (isPdf) {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/parse-pdf", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();

        if (res.ok && data.text && data.text.trim().length >= 20) {
          extractedText = data.text;
        } else if (data.isScannedPdf || !data.text || data.text.trim().length < 20) {
          // Vector/Scanned PDF fallback -> render pages to images and run Vision/OCR
          const pageImages = await renderPdfPagesToImages(file, 4);
          if (!pageImages || pageImages.length === 0) {
            throw new Error("未能从 PDF 中提取出有效页面图像");
          }

          const visionRes = await fetch("/api/parse-resume-image", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...getAIHeaders(),
            },
            body: JSON.stringify({ images: pageImages }),
          });

          const visionData = await visionRes.json();
          if (!visionRes.ok || visionData.error) {
            throw new Error(visionData.error || "矢量/扫描版 PDF 提炼失败");
          }
          extractedText = visionData.text || "";
        } else {
          throw new Error(data.error || "解析文件失败");
        }
      } else {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/parse-pdf", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "解析文件失败");
        }
        extractedText = data.text || "";
      }

      if (!extractedText.trim()) {
        throw new Error("未能从文件中提取出有效文本，请确认文件内容或直接粘贴");
      }

      setUserInput({ originalResume: extractedText });
    } catch (err) {
      setPdfError(err instanceof Error ? err.message : "解析文件失败，请直接粘贴文本");
    } finally {
      setUploadingPdf(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processResumeFile(file);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processResumeFile(file);
    }
  };

  const handleAnalyze = async () => {
    if (!userInput.targetRole || !userInput.jobDescription || !userInput.originalResume) {
      return;
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setAnalyzing(true);
    setAnalysisError(null);

    const completedStagesList: string[] = [];

    setAnalysisStage({
      stageId: "jd-analysis",
      label: "正在发起 AI 大模型分析...",
      currentStepNumber: 1,
      totalSteps: 4,
      progressPercent: 8,
      completedStages: [],
    });

    try {
      const result = await runResumeAnalysisStream(
        userInput,
        "ai-product",
        {
          enablePIIMasking,
          onStageChange: (stageId, status) => {
            const stepIdx = STAGE_STEPS.findIndex((s) => s.id === stageId);
            const stepInfo = STAGE_STEPS[stepIdx];

            if (status === "start") {
              setAnalysisStage({
                stageId,
                label: stepInfo ? `${stepInfo.label}...` : "正在分析中...",
                currentStepNumber: stepIdx >= 0 ? stepIdx + 1 : 1,
                totalSteps: 4,
                progressPercent: stepInfo ? stepInfo.startPct : 50,
                completedStages: [...completedStagesList],
              });
            } else if (status === "complete") {
              if (!completedStagesList.includes(stageId)) {
                completedStagesList.push(stageId);
              }
              setAnalysisStage({
                stageId,
                label: stepInfo ? `${stepInfo.name} 完成` : "阶段完成",
                currentStepNumber: stepIdx >= 0 ? stepIdx + 1 : 1,
                totalSteps: 4,
                progressPercent: stepInfo ? stepInfo.endPct : 70,
                completedStages: [...completedStagesList],
              });
            }
          },
          onPartialResult: (partial) => {
            updatePartialAnalysisResult(partial);
          },
        },
        controller.signal
      );

      setAnalysisResult(result);
      setAnalysisStage({
        stageId: "complete",
        label: "🎉 分析完成！正在为您生成分析报告...",
        currentStepNumber: 4,
        totalSteps: 4,
        progressPercent: 100,
        completedStages: STAGE_STEPS.map((s) => s.id),
      });

      await new Promise((resolve) => setTimeout(resolve, 600));
      setCurrentStep("jd-analysis");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setAnalysisError(error instanceof Error ? error.message : "分析失败，请稍后重试");
    } finally {
      abortControllerRef.current = null;
      setAnalyzing(false);
      setAnalysisStage(null);
    }
  };

  const handleCancel = () => {
    abortControllerRef.current?.abort();
  };

  const canAnalyze =
    Boolean(userInput?.targetRole?.trim()) &&
    Boolean(userInput?.jobDescription?.trim()) &&
    Boolean(userInput?.originalResume?.trim());


  return (
    <div>
      <SectionTitle
        title="输入材料"
        description="填写目标岗位信息与原始简历，Agent 将基于 JD 进行定制分析与优化"
      />

      {/* PII Privacy Protection Switch Banner */}
      <div className="mb-4 flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-900 shadow-sm">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
          <div>
            <span className="font-semibold text-emerald-950">AI 敏感隐私脱敏保护</span>
            <span className="ml-2 text-emerald-700">
              开启后，手机号、电子邮箱、姓名等个人隐私将在发送给 AI 前自动加密脱敏，分析完成后自动原位解密还原。
            </span>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer ml-3 shrink-0">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={enablePIIMasking}
            onChange={(e) => setEnablePIIMasking(e.target.checked)}
          />
          <div className="w-9 h-5 bg-neutral-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
        </label>
      </div>

      {analysisError && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50/95 p-4 text-sm text-red-900 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-2 flex-1">
              <div className="font-bold text-red-950 text-base">
                {analysisError.includes("429") || analysisError.includes("quota") || analysisError.includes("额度")
                  ? "⚠️ 大模型 API Key 额度已用尽 (HTTP 429)"
                  : "❌ AI 分析请求失败"}
              </div>
              <p className="text-xs text-red-800 leading-relaxed font-mono bg-white/80 p-2.5 rounded-lg border border-red-200/80">
                {analysisError}
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Link href="/settings">
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs gap-1.5 h-8">
                    <Settings className="h-3.5 w-3.5" />
                    ⚙️ 前往 AI 配置更换 Key
                  </Button>
                </Link>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    try {
                      await fetch("/api/settings", { method: "DELETE" });
                      setAiMode("mock");
                      setAnalysisError(null);
                    } catch {
                      // ignore
                    }
                  }}
                  className="bg-white hover:bg-neutral-50 text-neutral-800 font-semibold text-xs border-neutral-300 gap-1.5 h-8 shadow-2xs"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-blue-600" />
                  🔄 一键切回 Mock 免费演示模式
                </Button>
                {analysisResult?.jdAnalysis && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setAnalysisError(null);
                      setCurrentStep("jd-analysis");
                    }}
                    className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold text-xs gap-1.5 h-8 shadow-2xs"
                  >
                    📑 查看已完成的阶段分析 (前序 Token 成果已保留)
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">目标岗位信息</CardTitle>
            <CardDescription>帮助 Agent 理解你的求职方向</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="targetRole">目标岗位</Label>
              <Input
                id="targetRole"
                placeholder="如：AI 产品经理"
                value={userInput.targetRole}
                onChange={(e) => setUserInput({ targetRole: e.target.value })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2 md:col-span-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="industry" className="flex items-center gap-1.5">
                  <span>行业</span>
                  <span className="text-[11px] font-normal text-neutral-400">（可选）</span>
                </Label>
                <button
                  type="button"
                  onClick={() => triggerSmartDetection(userInput.targetRole, userInput.jobDescription)}
                  className="text-[11px] text-blue-600 hover:text-blue-700 font-medium flex items-center gap-0.5 hover:underline"
                >
                  <Sparkles className="h-3 w-3" />
                  智能识别
                </button>
              </div>
              <Input
                id="industry"
                placeholder="如：企业服务 / SaaS（可选择或直接输入）"
                value={userInput.industry}
                onChange={(e) => setUserInput({ industry: e.target.value })}
              />

              {/* Smart detection toast hint */}
              {detectedToast && (
                <div className="text-[11px] text-blue-700 font-medium bg-blue-50 border border-blue-200/80 rounded-md px-2.5 py-1 animate-in fade-in slide-in-from-top-1 duration-200 flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-blue-600 shrink-0" />
                  <span>{detectedToast}</span>
                </div>
              )}

              {/* Popular tags preview */}
              <div className="space-y-2 pt-1">
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <div className="flex flex-wrap gap-1.5">
                    {POPULAR_INDUSTRIES.map((ind) => (
                      <button
                        key={ind}
                        type="button"
                        onClick={() => setUserInput({ industry: ind })}
                        className={`rounded-full px-2.5 py-0.5 text-[11px] transition-all ${
                          userInput.industry === ind
                            ? "bg-blue-600 text-white font-medium shadow-2xs"
                            : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200/80"
                        }`}
                      >
                        {ind}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAllIndustries(!showAllIndustries)}
                    className="text-[11px] font-medium text-blue-600 hover:text-blue-700 flex items-center gap-0.5 shrink-0 hover:underline ml-auto"
                  >
                    {showAllIndustries ? (
                      <>
                        收起分类 <ChevronUp className="h-3 w-3" />
                      </>
                    ) : (
                      <>
                        更多行业 (25+) <ChevronDown className="h-3 w-3" />
                      </>
                    )}
                  </button>
                </div>

                {/* Expanded Full Categorized Industry Panel */}
                {showAllIndustries && (
                  <div className="mt-2.5 rounded-lg border border-neutral-200/90 bg-neutral-50/70 p-3 space-y-3 animate-in fade-in duration-200">
                    {ALL_INDUSTRY_GROUPS.map((group) => (
                      <div key={group.category} className="space-y-1.5">
                        <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block">
                          {group.category}
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {group.items.map((item) => (
                            <button
                              key={item}
                              type="button"
                              onClick={() => setUserInput({ industry: item })}
                              className={`rounded-md px-2 py-0.5 text-[11px] transition-all ${
                                userInput.industry === item
                                  ? "bg-blue-600 text-white font-medium shadow-2xs"
                                  : "bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-100/80"
                              }`}
                            >
                              {item}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <div className="flex items-center justify-between">
                <Label>目标公司规模与类型（模仿 BOSS 直聘）</Label>
                <span className="text-xs text-neutral-400">选择目标企业规模以激活 AI 针对性模型调优</span>
              </div>
              <Select
                value={userInput.companyType}
                onValueChange={(v) => setUserInput({ companyType: v as CompanyType })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMPANY_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex items-center justify-between gap-2 w-full py-0.5">
                        <span className="font-medium text-neutral-900">{opt.label}</span>
                        <span className="text-xs text-neutral-500 font-mono">
                          ({opt.scale} · {opt.stage})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {(() => {
                const opt = getCompanyTypeOption(userInput.companyType);
                return (
                  <div className="mt-2 rounded-lg border border-blue-100 bg-blue-50/60 p-3 text-xs text-blue-950 flex flex-col gap-1.5 transition-all shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-1.5 font-medium">
                      <span className="flex items-center gap-1.5 text-blue-700">
                        <Sparkles className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                        AI 调优策略：针对【{opt.label}】进行定制分析
                      </span>
                      <div className="flex items-center gap-1.5 text-[11px] shrink-0">
                        <span className="bg-blue-100/90 px-2 py-0.5 rounded text-blue-800 font-semibold border border-blue-200">
                          规模: {opt.scale}
                        </span>
                        <span className="bg-indigo-100/90 px-2 py-0.5 rounded text-indigo-800 font-semibold border border-indigo-200">
                          阶段: {opt.stage}
                        </span>
                      </div>
                    </div>
                    <p className="text-neutral-600 leading-relaxed text-[12px]">
                      {opt.aiFocus}
                    </p>
                  </div>
                );
              })()}
            </div>
            <div className="space-y-2 sm:col-span-2">
              <div className="flex items-center justify-between">
                <Label>求职阶段与经验定位（含实习/校招/社招/转型）</Label>
                <span className="text-xs text-neutral-400">选择当前求职阶段以匹配正确的考核预期</span>
              </div>
              <Select
                value={userInput.jobStage}
                onValueChange={(v) => setUserInput({ jobStage: v as JobStage })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {JOB_STAGE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex items-center justify-between gap-2 w-full py-0.5">
                        <span className="font-medium text-neutral-900">{opt.label}</span>
                        <span className="text-xs text-neutral-500 font-mono">
                          ({opt.experience})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {(() => {
                const opt = getJobStageOption(userInput.jobStage);
                return (
                  <div className="mt-2 rounded-lg border border-purple-100 bg-purple-50/60 p-3 text-xs text-purple-950 flex flex-col gap-1.5 transition-all shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-1.5 font-medium">
                      <span className="flex items-center gap-1.5 text-purple-700">
                        <Sparkles className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                        AI 阶段侧重：针对【{opt.label}】量身评测
                      </span>
                      <div className="flex items-center gap-1.5 text-[11px] shrink-0">
                        <span className="bg-purple-100/90 px-2 py-0.5 rounded text-purple-800 font-semibold border border-purple-200">
                          人群: {opt.targetAudience}
                        </span>
                      </div>
                    </div>
                    <p className="text-neutral-600 leading-relaxed text-[12px]">
                      {opt.aiFocus}
                    </p>
                  </div>
                );
              })()}
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="highlightSkills">希望突出的能力</Label>
              <Input
                id="highlightSkills"
                placeholder="如：AI 产品规划、数据驱动、ToB 需求分析"
                value={userInput.highlightSkills}
                onChange={(e) => setUserInput({ highlightSkills: e.target.value })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>个人证件照 / 头像（可选）</Label>
              <div className="flex items-center gap-4">
                <div className="relative flex h-20 w-16 items-center justify-center rounded-md border border-dashed border-neutral-300 bg-neutral-50 overflow-hidden">
                  {userInput.avatarUrl ? (
                    <img
                      src={userInput.avatarUrl}
                      alt="证件照"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User className="h-6 w-6 text-neutral-400" />
                  )}
                </div>
                <div className="space-y-1.5">
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*,.png,.jpg,.jpeg,.webp,.jfif,.bmp"
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => avatarInputRef.current?.click()}
                    >
                      <Camera className="h-3.5 w-3.5" />
                      {userInput.avatarUrl ? "更换照片" : "上传证件照"}
                    </Button>
                    {userInput.avatarUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={handleRemoveAvatar}
                      >
                        删除照片
                      </Button>
                    )}
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    支持上传寸照/形象照，将自动呈现并应用于双栏及自定义简历模板中
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          onDragEnter={handleJdDragEnter}
          onDragOver={handleJdDragOver}
          onDragLeave={handleJdDragLeave}
          onDrop={handleJdDrop}
          className={`relative overflow-hidden transition-all ${
            isDraggingJd
              ? "border-2 border-dashed border-purple-500 bg-purple-50/80 shadow-md"
              : ""
          }`}
        >
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0 flex-wrap gap-2">
            <div>
              <CardTitle className="text-sm flex items-center gap-2">
                <span>目标 JD</span>
                <span className="text-[10px] font-normal text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                  ✨ 支持图片/截图 AI 识别 & 文本粘贴
                </span>
              </CardTitle>
              <CardDescription>
                支持粘贴文字或直接上传岗位截图/图片，Agent 将视觉识别并解析岗位要求
              </CardDescription>
            </div>
            <div>
              <input
                ref={jdFileInputRef}
                type="file"
                accept="image/*,.png,.jpg,.jpeg,.webp,.pdf,.docx,.doc,.txt"
                className="hidden"
                onChange={handleJdFileUpload}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploadingJd}
                onClick={() => jdFileInputRef.current?.click()}
                className="bg-purple-50/60 hover:bg-purple-100/80 border-purple-200 text-purple-700 hover:text-purple-900 text-xs gap-1.5 shadow-2xs"
              >
                {uploadingJd ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-600" />
                    AI 识别截图/图片中...
                  </>
                ) : (
                  <>
                    <ImageIcon className="h-3.5 w-3.5 text-purple-600" />
                    上传 JD 截图 / 图片
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {jdSuccessMsg && (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs text-emerald-800 flex items-center justify-between shadow-2xs animate-in fade-in duration-200">
                <span className="flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  {jdSuccessMsg}
                </span>
                <button
                  type="button"
                  onClick={() => setJdSuccessMsg(null)}
                  className="text-emerald-600 hover:text-emerald-900 text-xs font-bold"
                >
                  ✕
                </button>
              </div>
            )}
            {jdErrorMsg && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-700 flex items-center justify-between shadow-2xs">
                <span>❌ <strong>识别失败：</strong>{jdErrorMsg}</span>
                <button
                  type="button"
                  onClick={() => setJdErrorMsg(null)}
                  className="text-red-500 hover:text-red-800 text-xs font-bold ml-2"
                >
                  ✕
                </button>
              </div>
            )}

            <div className="relative">
              <Textarea
                className="min-h-[200px] font-mono text-xs leading-relaxed"
                placeholder="粘贴岗位 JD 描述，或直接拖拽/点击右上角“上传 JD 截图 / 图片”自动识别岗位要求..."
                value={userInput.jobDescription}
                onChange={(e) => setUserInput({ jobDescription: e.target.value })}
              />
              {jdImagePreview && (
                <div className="absolute right-3 bottom-3 border border-purple-200 rounded-lg bg-white/95 p-1.5 shadow-md flex items-center gap-2 max-w-[220px]">
                  <img
                    src={jdImagePreview}
                    alt="JD Screenshot Preview"
                    className="h-10 w-10 object-cover rounded border border-purple-100 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10.5px] font-bold text-purple-950 truncate">已导入 JD 截图</p>
                    <p className="text-[9.5px] text-purple-600 truncate">AI 视觉识别解析成功</p>
                  </div>
                  <button
                    type="button"
                    title="移除图片预览"
                    onClick={() => setJdImagePreview(null)}
                    className="text-neutral-400 hover:text-neutral-600 p-0.5 shrink-0"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative overflow-hidden transition-all ${
            isDragging
              ? "border-2 border-dashed border-blue-500 bg-blue-50/80 shadow-md"
              : ""
          }`}
        >
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-sm">原始简历</CardTitle>
              <CardDescription>
                支持拖拽 PDF / Word (.docx / .doc) / 截图图片到框内直接上传，或点击按钮解析全文本
              </CardDescription>
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.doc,.txt,.png,.jpg,.jpeg,.webp,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,text/plain,image/*"
                className="hidden"
                onChange={handlePdfUpload}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploadingPdf}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploadingPdf ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    解析提炼中...
                  </>
                ) : (
                  <>
                    <FileUp className="h-3.5 w-3.5" />
                    上传 PDF / Word / 图片简历
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="relative space-y-2">
            {isDragging && (
              <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center rounded-lg bg-blue-500/15 backdrop-blur-[2px]">
                <div className="flex items-center gap-2.5 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg animate-bounce">
                  <FileUp className="h-4 w-4" />
                  松开鼠标，自动解析 PDF / Word / 图片简历
                </div>
              </div>
            )}
            {pdfError && (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                {pdfError}
              </div>
            )}
            <Textarea
              className="min-h-[240px] font-mono text-xs leading-relaxed"
              placeholder="可以直接拖拽 PDF 或 Word 文件到这里，或直接粘贴简历文本内容..."
              value={userInput.originalResume}
              onChange={(e) => setUserInput({ originalResume: e.target.value })}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">补充信息（可选）</CardTitle>
            <CardDescription>项目细节、转型动机、特殊说明等</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              className="min-h-[100px] text-sm"
              placeholder="补充 Agent 需要了解的信息..."
              value={userInput.additionalInfo}
              onChange={(e) => setUserInput({ additionalInfo: e.target.value })}
            />
          </CardContent>
        </Card>
      </div>

      {/* Static Bottom Action Bar & Progress Section */}
      <div className="mt-6 rounded-xl border border-blue-200/80 bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-purple-50/70 p-5 shadow-md space-y-4 transition-all">
        {/* If analyzing: display high-end integrated progress bar & stage indicators */}
        {isAnalyzing && analysisStage ? (
          <div className="space-y-3.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 font-semibold text-blue-950">
                {analysisStage.progressPercent < 100 ? (
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600 shrink-0" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                )}
                <span>{analysisStage.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-blue-700 bg-blue-100/90 border border-blue-200 px-2 py-0.5 rounded-md">
                  {analysisStage.progressPercent}%
                </span>
                <Button variant="outline" size="sm" onClick={handleCancel} className="h-7 text-xs bg-white/80">
                  <X className="h-3.5 w-3.5 mr-1" />
                  取消分析
                </Button>
              </div>
            </div>

            <Progress
              value={analysisStage.progressPercent}
              className="h-2.5 bg-blue-100/80 shadow-inner"
              indicatorClassName="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 shadow-md transition-all duration-500"
            />

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              {STAGE_STEPS.map((step, idx) => {
                const isCompleted = analysisStage.completedStages.includes(step.id);
                const isActive = analysisStage.stageId === step.id && !isCompleted;

                return (
                  <div
                    key={step.id}
                    className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 px-2 text-[11px] font-medium transition-all ${
                      isCompleted
                        ? "bg-emerald-50/90 text-emerald-800 border border-emerald-200/80 shadow-2xs"
                        : isActive
                        ? "bg-white text-blue-900 border border-blue-400 font-semibold shadow-xs ring-2 ring-blue-400/20"
                        : "bg-white/40 text-neutral-400 border border-neutral-200/40"
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                    ) : isActive ? (
                      <Loader2 className="h-3 w-3 animate-spin text-blue-600 shrink-0" />
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-neutral-300 shrink-0" />
                    )}
                    <span className="truncate">
                      {idx + 1}. {step.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs">
              {!canAnalyze ? (
                <span className="flex items-center gap-1.5 text-amber-700 bg-amber-50 border border-amber-200/70 px-3 py-1.5 rounded-lg font-medium">
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                  请填写目标岗位、目标 JD 及原始简历以开始分析
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-emerald-800 bg-emerald-50 border border-emerald-200/70 px-3 py-1.5 rounded-lg font-medium">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  材料已完整就绪，随时可发起 AI 智能解析
                </span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto justify-end">
              <Button variant="outline" size="default" onClick={loadExampleData} disabled={isAnalyzing} className="w-full sm:w-auto justify-center">
                <Wand2 className="h-4 w-4 text-neutral-600" />
                使用示例数据
              </Button>
              <Button
                size="default"
                onClick={handleAnalyze}
                disabled={!canAnalyze || isAnalyzing}
                className="w-full sm:w-auto justify-center bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold shadow-md shadow-blue-500/20 px-6 py-2.5 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    AI 分析中...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 text-amber-300 animate-pulse" />
                    开始 AI 匹配分析
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
