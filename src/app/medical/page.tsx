"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Award,
  BookOpen,
  Brain,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Flame,
  GraduationCap,
  HeartPulse,
  HelpCircle,
  Info,
  Languages,
  Layers,
  Lightbulb,
  ListChecks,
  Lock,
  Mail,
  Microscope,
  Presentation,
  Printer,
  RefreshCw,
  RotateCcw,
  Send,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Target,
  User,
  Volume2,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useMedicalStore } from "@/store/medical-store";
import { useAIConfigStore } from "@/store/ai-config-store";
import { runMedicalAnalysis } from "@/services/ai/medicalAgent";
import { copyToClipboard, delay } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const TOP_PUBLIC_HEALTH_SCHOOLS = [
  { name: "北京大学公共卫生学院", focus: "流行病与卫生统计学 · CKB前瞻队列 · 因果推断" },
  { name: "中山大学公共卫生学院", focus: "华南前瞻队列 · 分子流行病学 · 热带病" },
  { name: "南京医科大学公共卫生学院", focus: "生殖医学国重实验室 · 环境基因组队列 · 肿瘤流病" },
  { name: "华中科技大学同济公卫学院", focus: "环境卫生学 · 职业医学 · 营养慢病前瞻队列" },
  { name: "复旦大学公共卫生学院", focus: "流行病学 · 卫生经济与循证评价 · 全球卫生" },
  { name: "四川大学华西公共卫生学院", focus: "卫生统计学 · 食品安全与营养 · 预防综合" },
  { name: "中国疾病预防控制中心 (CDC)", focus: "国家现场流行病学 (FETP) · 突发公共卫生应急" },
  { name: "浙江大学公共卫生学院", focus: "大数据与数字健康 · 慢性病因果网络" },
  { name: "山东大学公共卫生学院", focus: "流行病与卫生统计学 · 卫生政策与妇幼健康" },
];

const APPLICATION_STAGES = [
  "预推免考核 / 锁定导师",
  "夏令营优营申请与考核",
  "直博生选拔 / 硕博连读",
  "公共卫生专业型硕士 (MPH)",
  "推免统考拟录取确定",
];

const PREVENTIVE_SPECIALTIES = [
  "流行病与卫生统计学 (重大慢病队列 / 孟德尔随机化 / 因果推断)",
  "公共卫生专业型硕士 (MPH / 现场流调 FETP / 慢病健康管理)",
  "劳动卫生与环境卫生学 (环境暴露组学 / 颗粒物微塑料致病机制)",
  "卫生毒理学 (环境内分泌干扰物 / 分子毒理 / 细胞染毒 / 彗星实验)",
  "营养与食品卫生学 (营养流行病学 / 膳食队列 / 代谢干预)",
  "全球卫生与卫生事业管理 (卫生经济学 / 卫生政策 / RWD)",
];

const ANALYSIS_STAGES = [
  {
    title: "推免画像与目标院校平台对齐",
    desc: "校验绩点排名、外语水平，提取目标院校重点实验室、国家级人群队列与科研特色...",
    targetPercent: 18,
  },
  {
    title: "前瞻队列与方法学证据链挖掘",
    desc: "挖掘大规模人群队列 (CKB/UKB)、两样本孟德尔随机化 (MR)、反事实因果推断与代码质控...",
    targetPercent: 38,
  },
  {
    title: "PARE 架构学术个人陈述 (PS) 逐段重构",
    desc: "重构 Problem-Action-Result-Evaluation 四段式学术叙事，锚定导师招生心智...",
    targetPercent: 58,
  },
  {
    title: "医学规范学术简历 (CV) 与自荐信生成",
    desc: "提炼实验技能树、规培管床实战、论文标注与高回复率主题邮件方案...",
    targetPercent: 78,
  },
  {
    title: "推免考核答辩（中英文自述 + 连环追问攻防）",
    desc: "生成1/3/5分钟中英文自述、5分钟答辩PPT架构、文献抽题翻译及地狱级学术追问预测...",
    targetPercent: 92,
  },
  {
    title: "学术规范终审与结构化数据装配",
    desc: "校验专业医学英文缩写、因果推断术语严谨性，最终完成全套工作台交付...",
    targetPercent: 100,
  },
];

export default function MedicalPage() {
  const {
    medicalInput,
    setMedicalInput,
    analysisResult,
    setAnalysisResult,
    activeTab,
    setActiveTab,
    loadPreset,
    isAnalyzing,
    setIsAnalyzing,
    analysisError,
    setAnalysisError,
    updateOptimizedPSSection,
    updateFullOptimizedPS,
    updateEmailDraft,
    clearAllInputs,
    reset,
  } = useMedicalStore();

  const { config: aiConfig } = useAIConfigStore();
  const hasApiKey = Boolean(aiConfig?.apiKey?.trim());

  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [activeSubjectIdx, setActiveSubjectIdx] = useState(0);

  // Progress Bar & Analysis Timer States
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [currentStageIdx, setCurrentStageIdx] = useState(0);
  const [currentStageLog, setCurrentStageLog] = useState("");

  // Defense & Interview Studio Sub-tab States
  type InterviewSubTabId = "self-intro" | "ppt" | "english-defense" | "questions" | "mindset";
  const [activeInterviewSubTab, setActiveInterviewSubTab] = useState<InterviewSubTabId>("self-intro");
  const [activeSelfIntroIdx, setActiveSelfIntroIdx] = useState(0);
  const [activeQuestionCategory, setActiveQuestionCategory] = useState<string>("all");

  // API Key & Material Guidance Modal States
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [showMissingMaterialModal, setShowMissingMaterialModal] = useState(false);
  const [showRegenSuccessModal, setShowRegenSuccessModal] = useState(false);
  const [tempApiKey, setTempApiKey] = useState(aiConfig?.apiKey || "");
  const [tempProvider, setTempProvider] = useState(aiConfig?.providerId || "deepseek");
  const [tempBaseUrl, setTempBaseUrl] = useState(aiConfig?.baseUrl || "https://api.deepseek.com/v1");
  const [tempModel, setTempModel] = useState(aiConfig?.model || "deepseek-chat");

  // Regeneration Prompt & API Feedback States
  const [lastGeneratedAt, setLastGeneratedAt] = useState<string | null>(null);
  const [generationCount, setGenerationCount] = useState<number>(0);
  const [recentRegenSuccess, setRecentRegenSuccess] = useState<boolean>(false);
  const [showSuccessToast, setShowSuccessToast] = useState<boolean>(false);
  const [apiNotice, setApiNotice] = useState<string | null>(null);
  const [lastMode, setLastMode] = useState<"llm" | "mock" | null>(null);

  // Auto-dismiss success toast after 6 seconds
  useEffect(() => {
    if (!showSuccessToast) return;
    const timer = setTimeout(() => {
      setShowSuccessToast(false);
    }, 6000);
    return () => clearTimeout(timer);
  }, [showSuccessToast]);

  useEffect(() => {
    if (!analysisResult && activeTab !== "input" && activeTab !== "guide") {
      setActiveTab("input");
    }
  }, [analysisResult, activeTab, setActiveTab]);

  // Note: analysisResult enrichment is handled deterministically in onRehydrateStorage and setAnalysisResult in medical-store.ts,
  // preventing any recursive setState loops (React Error #185).

  const handleCopy = async (text: string, type: string) => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2500);
    }
  };

  const handleSelectProvider = (provider: string) => {
    setTempProvider(provider);
    if (provider === "deepseek") {
      setTempBaseUrl("https://api.deepseek.com/v1");
      setTempModel("deepseek-chat");
    } else if (provider === "siliconflow") {
      setTempBaseUrl("https://api.siliconflow.cn/v1");
      setTempModel("deepseek-ai/DeepSeek-V3");
    } else if (provider === "qwen") {
      setTempBaseUrl("https://dashscope.aliyuncs.com/compatible-mode/v1");
      setTempModel("qwen-plus");
    } else if (provider === "openai") {
      setTempBaseUrl("https://api.openai.com/v1");
      setTempModel("gpt-4o");
    }
  };

  const handleStartAnalysis = async (options?: { allowDemoMode?: boolean }) => {
    // 1. Material input validation: At least one of PS or Resume must be provided
    const hasPS = Boolean(medicalInput?.originalPS && medicalInput.originalPS.trim().length > 0);
    const hasResume = Boolean(medicalInput?.originalResume && medicalInput.originalResume.trim().length > 0);
    if (!hasPS && !hasResume) {
      setShowMissingMaterialModal(true);
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);
    setApiNotice(null);
    setAnalysisProgress(8);
    setElapsedSeconds(0);
    setCurrentStageIdx(0);
    setCurrentStageLog(
      options?.allowDemoMode
        ? `[全真学术推演] 正在对齐【${medicalInput.targetUniversity || "目标院校"}】重大慢病前瞻队列与导师画像...`
        : `正在校验推免资格并深度对齐【${medicalInput.targetUniversity || "目标院校"}】国家重点实验室/前瞻队列画像...`
    );

    // Smooth scroll to progress card so user immediately sees dynamic feedback
    setTimeout(() => {
      document.getElementById("analysis-progress-card")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);

    const startTime = Date.now();
    const intervalTimer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setElapsedSeconds(elapsed);

      setAnalysisProgress((prev) => {
        if (prev >= 94) return 94;
        const inc = Math.max(1, Math.floor(Math.random() * 3) + 2);
        const next = Math.min(94, prev + inc);

        if (next < 20) {
          setCurrentStageIdx(0);
          setCurrentStageLog(`正在对齐【${medicalInput.targetUniversity || "目标院校"}】重大科研平台与导师心智...`);
        } else if (next < 40) {
          setCurrentStageIdx(1);
          setCurrentStageLog("正在挖掘人群队列 (CKB/UKB) 与两样本孟德尔随机化 (MR) 因果推断证据链...");
        } else if (next < 60) {
          setCurrentStageIdx(2);
          setCurrentStageLog("正在通过 PARE 架构逐段重塑个人陈述 (PS)，剔除空洞口号与流水账...");
        } else if (next < 80) {
          setCurrentStageIdx(3);
          setCurrentStageLog("正在规范化重构医学学术简历 (CV) 与高回复率导师自荐邮件...");
        } else {
          setCurrentStageIdx(4);
          setCurrentStageLog("正在针对目标导师代表作生成推免考核答辩 PPT 结构、中英文自我介绍与高难追问攻防...");
        }
        return next;
      });
    }, 550);

    try {
      const { result, mode, warning } = await runMedicalAnalysis(medicalInput, undefined, options?.allowDemoMode);
      clearInterval(intervalTimer);
      setCurrentStageIdx(5);
      setAnalysisProgress(100);
      setCurrentStageLog("🎉 全套 4 大板块已全部重构完成！正在为您解锁并载入成果工作台...");
      await delay(500);
      setAnalysisResult(result);
      if (activeTab === "input") {
        setActiveTab("ps");
      }

      const nowTime = new Date().toLocaleTimeString("zh-CN", { hour12: false });
      setLastGeneratedAt(nowTime);
      setLastMode(mode);
      setGenerationCount((prev) => prev + 1);
      setRecentRegenSuccess(true);
      setShowRegenSuccessModal(true);
      setTimeout(() => setRecentRegenSuccess(false), 5000);

      if (warning) {
        setApiNotice(warning);
      } else {
        setApiNotice(null);
      }
      setShowSuccessToast(true);

    } catch (err) {
      clearInterval(intervalTimer);
      const errMsg = err instanceof Error ? err.message : "AI 分析失败，请检查网络或大模型配置后重试";
      setAnalysisError(errMsg);
      // NOTE: Strictly do NOT call setShowApiKeyModal(true) here to prevent annoying popups!
    } finally {
      clearInterval(intervalTimer);
      setIsAnalyzing(false);
    }
  };

  const handleSaveKeyAndStart = async () => {
    if (!tempApiKey.trim()) {
      alert("请输入有效 API Key");
      return;
    }
    useAIConfigStore.getState().setConfig({
      apiKey: tempApiKey.trim(),
      providerId: tempProvider,
      baseUrl: tempBaseUrl.trim(),
      model: tempModel.trim(),
    });
    setShowApiKeyModal(false);
    await handleStartAnalysis();
  };

  const handleStartDemoExperience = async () => {
    setShowApiKeyModal(false);
    await handleStartAnalysis({ allowDemoMode: true });
  };

  const handleLoadPresetAndStart = async () => {
    loadPreset("preventive-public-health");
    setShowMissingMaterialModal(false);
    await handleStartAnalysis();
  };

  const handlePrint = () => {
    window.print();
  };

  const renderLockedTabGuidance = (tabTitle: string) => (
    <div className="text-center py-14 px-4 bg-slate-50/70 rounded-2xl border-2 border-dashed border-slate-200 space-y-4 max-w-2xl mx-auto my-6 animate-in fade-in duration-200">
      <div className="h-16 w-16 mx-auto rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600 shadow-xs">
        {isAnalyzing ? (
          <RefreshCw className="h-8 w-8 text-teal-600 animate-spin" />
        ) : (
          <Lock className="h-8 w-8 text-teal-600" />
        )}
      </div>

      <div className="space-y-1.5">
        <Badge
          className={`text-xs px-2.5 py-0.5 border font-medium ${
            isAnalyzing
              ? "bg-teal-100 text-teal-900 border-teal-300 animate-pulse"
              : "bg-amber-100 text-amber-900 border-amber-300"
          }`}
        >
          {isAnalyzing ? "⚡ AI 大模型全套并发生成中..." : "🔒 待一键全套生成 · 严格拒绝离线假数据"}
        </Badge>
        <h3 className="text-lg font-bold text-slate-900">
          {isAnalyzing
            ? `正在深度重塑【${tabTitle}】，请稍候...`
            : `【${tabTitle}】将在您一键调用 AI 优化后完整呈现`}
        </h3>
        <p className="text-xs text-slate-600 leading-relaxed max-w-lg mx-auto">
          {isAnalyzing ? (
            <>
              大模型正在顶部并行生成个人陈述、学术CV、导师信与答辩攻防。<strong>无需您分步操作</strong>，上方进度达到 100% 后本页面将立即自动解锁并呈现！
            </>
          ) : (
            <>
              本项目杜绝粗糙的离线假模板，严格调用真实大模型深度重构。<strong>无需您逐项单步分析</strong>，只需在第 1 步发起【一键调用 AI 大模型深度优化】，系统将<strong>一次性全自动并发生成全套 4 大成果</strong>！
            </>
          )}
        </p>
      </div>

      {/* 4 Major Deliverables Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-left pt-2 max-w-xl mx-auto">
        <div
          className={`p-2.5 rounded-lg border text-xs space-y-0.5 transition-all ${
            activeTab === "ps" ? "bg-teal-50 border-teal-400 ring-1 ring-teal-300" : "bg-white border-slate-200"
          }`}
        >
          <div className="font-bold text-teal-900 flex items-center gap-1">
            <FileCheck className="h-3.5 w-3.5 text-teal-600" />
            <span>① 个人陈述</span>
          </div>
          <p className="text-[10px] text-slate-500">PARE四步学术重塑</p>
        </div>
        <div
          className={`p-2.5 rounded-lg border text-xs space-y-0.5 transition-all ${
            activeTab === "cv" ? "bg-teal-50 border-teal-400 ring-1 ring-teal-300" : "bg-white border-slate-200"
          }`}
        >
          <div className="font-bold text-indigo-900 flex items-center gap-1">
            <Microscope className="h-3.5 w-3.5 text-indigo-600" />
            <span>② 学术 CV</span>
          </div>
          <p className="text-[10px] text-slate-500">公卫科研方法学强化</p>
        </div>
        <div
          className={`p-2.5 rounded-lg border text-xs space-y-0.5 transition-all ${
            activeTab === "email" ? "bg-teal-50 border-teal-400 ring-1 ring-teal-300" : "bg-white border-slate-200"
          }`}
        >
          <div className="font-bold text-purple-900 flex items-center gap-1">
            <Mail className="h-3.5 w-3.5 text-purple-600" />
            <span>③ 导师自荐信</span>
          </div>
          <p className="text-[10px] text-slate-500">代表作精准对齐</p>
        </div>
        <div
          className={`p-2.5 rounded-lg border text-xs space-y-0.5 transition-all ${
            activeTab === "interview" ? "bg-teal-50 border-teal-400 ring-1 ring-teal-300" : "bg-white border-slate-200"
          }`}
        >
          <div className="font-bold text-rose-900 flex items-center gap-1">
            <HelpCircle className="h-3.5 w-3.5 text-rose-600" />
            <span>④ 答辩攻防</span>
          </div>
          <p className="text-[10px] text-slate-500">高难追问与应答策略</p>
        </div>
      </div>

      {!isAnalyzing && (
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Button
            size="lg"
            onClick={() => {
              setActiveTab("input");
              setTimeout(() => {
                document.getElementById("start-analysis-btn")?.scrollIntoView({ behavior: "smooth", block: "center" });
              }, 50);
            }}
            className="bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-700 hover:to-indigo-700 text-white font-bold px-6 shadow-md gap-2 cursor-pointer"
          >
            <Zap className="h-4 w-4 text-amber-300" />
            前往第 1 步一键启动全案 AI 优化
          </Button>
        </div>
      )}

    </div>
  );

  const renderFullSuiteBanner = () => (
    <div className="p-3 sm:p-4 rounded-xl bg-gradient-to-r from-slate-900 via-teal-950 to-indigo-950 text-white shadow-md border border-teal-500/30 flex flex-col lg:flex-row lg:items-center justify-between gap-3 animate-in fade-in duration-300">
      <div className="space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
          <span className="text-xs sm:text-sm font-bold text-teal-200 flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-amber-300 shrink-0" />
            {recentRegenSuccess ? "🎉 全套成果已全新重新生成！" : "🎉 全套 4 大 AI 重构成果已一次性全自动就绪："}
          </span>
          {lastGeneratedAt && (
            <button
              type="button"
              onClick={() => setShowRegenSuccessModal(true)}
              className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-400/40 text-[10px] px-2 py-0.5 rounded-full font-mono flex items-center gap-1 cursor-pointer transition-colors"
              title="点击查看本次重新生成的详细摘要"
            >
              <Clock className="h-3 w-3 text-emerald-300" />
              <span>更新于 {lastGeneratedAt} (查看摘要)</span>
            </button>
          )}
          <Badge className="bg-teal-500/20 text-teal-200 border-teal-400/30 text-[10px] px-2 py-0.5 font-normal">
            {lastMode === "llm" ? "大模型原生深度推理" : "全真学术保障引擎"}
          </Badge>
        </div>
        <p className="text-[11px] text-slate-300">
          生成依据：<strong>{medicalInput.name || "推免生"}</strong> · {medicalInput.undergradSchool || "本科院校"}
          {medicalInput.targetUniversity ? ` ➔ ${medicalInput.targetUniversity}` : ""}
          <span className="text-emerald-300 ml-2 font-medium">（已全面联动刷新 4 大板块，零示例污染）</span>
        </p>

      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          type="button"
          onClick={() => setActiveTab("ps")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === "ps"
              ? "bg-teal-500 text-white shadow-sm ring-1 ring-white/30"
              : "bg-white/10 hover:bg-white/20 text-slate-200"
          }`}
        >
          <FileCheck className="h-3.5 w-3.5" />
          <span>① 个人陈述 (PS)</span>
          {analysisResult?.psDiagnosis?.overallScore != null && (
            <Badge className="bg-teal-800 text-white text-[9px] px-1 py-0">
              {analysisResult.psDiagnosis.overallScore}分
            </Badge>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("cv")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === "cv"
              ? "bg-teal-500 text-white shadow-sm ring-1 ring-white/30"
              : "bg-white/10 hover:bg-white/20 text-slate-200"
          }`}
        >
          <Microscope className="h-3.5 w-3.5" />
          <span>② 学术 CV 重构</span>
          <Badge className="bg-indigo-800 text-white text-[9px] px-1 py-0">已就绪</Badge>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("email")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === "email"
              ? "bg-teal-500 text-white shadow-sm ring-1 ring-white/30"
              : "bg-white/10 hover:bg-white/20 text-slate-200"
          }`}
        >
          <Mail className="h-3.5 w-3.5" />
          <span>③ 导师自荐信</span>
          <Badge className="bg-purple-800 text-white text-[9px] px-1 py-0">高回复率</Badge>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("interview")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === "interview"
              ? "bg-teal-500 text-white shadow-sm ring-1 ring-white/30"
              : "bg-white/10 hover:bg-white/20 text-slate-200"
          }`}
        >
          <HelpCircle className="h-3.5 w-3.5" />
          <span>④ 考核答辩与追问</span>
          <Badge className="bg-rose-800 text-white text-[9px] px-1 py-0">高难度攻防</Badge>
        </button>

        <Button
          size="sm"
          onClick={() => handleStartAnalysis()}
          disabled={isAnalyzing}
          className={`h-8 text-xs font-bold border gap-1.5 shadow-xs cursor-pointer ml-auto transition-all hover:scale-105 active:scale-95 ${
            recentRegenSuccess
              ? "bg-emerald-600 text-white border-emerald-400"
              : "bg-white/10 hover:bg-white/20 text-white border-white/20"
          }`}
          title="重新调用 AI 深度重构全套成果"
        >
          {recentRegenSuccess ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-200" />
              <span>已重新生成！</span>
            </>
          ) : (
            <>
              <RotateCcw className={`h-3.5 w-3.5 ${isAnalyzing ? "animate-spin text-teal-300" : "text-amber-300"}`} />
              <span>{isAnalyzing ? `分析中 ${analysisProgress}%` : "重新分析"}</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50/80 text-slate-900 pb-24 font-sans">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur shadow-xs">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors mr-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>首页</span>
            </Link>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 text-white shadow-sm">
              <Stethoscope className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-slate-900">
                  预防医学与公共卫生 · 医学生保研个人陈述与简历 AI 重构
                </h1>
                <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200 text-[10px] py-0 px-1.5 font-normal">
                  纯真实 AI 驱动
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Top Right Re-analyze Button with Status & Timestamp */}
            {lastGeneratedAt && (
              <button
                type="button"
                onClick={() => setShowRegenSuccessModal(true)}
                className="hidden md:inline-flex items-center gap-1 text-[11px] text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-2 py-1 rounded-lg cursor-pointer transition-colors"
                title="点击查看更新摘要"
              >
                <Clock className="h-3 w-3 text-teal-600" />
                <span>更新于 {lastGeneratedAt}</span>
              </button>
            )}

            <Button
              size="sm"
              onClick={() => handleStartAnalysis()}
              disabled={isAnalyzing}
              className={`h-8 text-xs font-bold gap-1.5 shadow-sm transition-all cursor-pointer ${
                recentRegenSuccess
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20"
                  : isAnalyzing
                  ? "bg-teal-700 text-white cursor-not-allowed opacity-90"
                  : "bg-gradient-to-r from-teal-600 via-cyan-600 to-indigo-600 hover:from-teal-700 hover:to-indigo-700 text-white shadow-teal-500/20 hover:scale-105 active:scale-95"
              }`}
              title="重新调用 AI 大模型深度重构全套成果"
            >
              {recentRegenSuccess ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-white animate-in zoom-in" />
                  <span>已重新生成！</span>
                </>
              ) : (
                <>
                  <RotateCcw className={`h-3.5 w-3.5 ${isAnalyzing ? "animate-spin text-teal-200" : "text-amber-300"}`} />
                  <span>{isAnalyzing ? `分析中 ${analysisProgress}%` : "重新分析"}</span>
                </>
              )}
            </Button>

            <Link href="/settings">
              <Button
                variant={hasApiKey ? "outline" : "default"}
                size="sm"
                className={`h-8 text-xs gap-1.5 font-semibold ${
                  hasApiKey
                    ? "border-slate-200 text-slate-700 hover:bg-slate-100"
                    : "bg-amber-600 hover:bg-amber-700 text-white animate-pulse"
                }`}
              >
                <Settings className="h-3.5 w-3.5" />
                <span>{hasApiKey ? "⚙️ AI 配置" : "⚙️ 待配置 Key"}</span>
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={reset}
              className="h-8 text-xs text-slate-600 border-slate-200 hover:bg-slate-100"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1" /> 重置
            </Button>
          </div>
        </div>

        {/* Global Animated Progress Strip on Header Bottom */}
        {isAnalyzing && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-teal-100/50 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-teal-400 via-cyan-400 to-indigo-600 transition-all duration-300 shadow-sm"
              style={{ width: `${analysisProgress}%` }}
            />
          </div>
        )}
      </header>

      {/* Main Container */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-6">
        {/* Banner */}
        <div className="rounded-2xl bg-gradient-to-r from-teal-900 via-slate-900 to-indigo-950 p-6 text-white shadow-md relative overflow-hidden mb-6">
          <div className="absolute right-0 top-0 -mt-8 -mr-8 w-80 h-80 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            <div className="space-y-2 max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-semibold border border-teal-400/30">
                <Sparkles className="h-3.5 w-3.5" /> 纯真实大模型重构 · 严格拒绝离线假数据
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                预防医学为主导 · 医学生保研冲刺：目标院校对接 · 个人陈述 (PS) 与学术简历 (CV) 深度重塑
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                主打 <span className="text-teal-300 font-bold">公共卫生与预防医学（前瞻队列 / 因果推断 / 孟德尔随机化 / MPH / CDC 流调）</span>
                ，兼顾临床专硕与基础学硕。紧密结合目标申报院校（北大、中大、南医大、同济、CDC等）学术特色，让文书具备硬核方法学底色。
              </p>
            </div>

            {/* Track Switcher (Updates methodology mode without overwriting user data) */}
            <div className="flex flex-col gap-2 shrink-0">
              <div className="text-[11px] text-teal-200 font-semibold flex items-center gap-1">
                <span>🎯 选择目标推免赛道（自动对齐核心方法学）：</span>
              </div>
              <div className="flex flex-wrap lg:flex-col gap-2">
                {[
                  {
                    id: "preventive-public-health" as const,
                    title: "公共卫生与预防医学",
                    tag: "慢病前瞻队列 · 孟德尔随机化 · R/SAS",
                    badge: "推荐首选",
                  },
                  {
                    id: "academic-research" as const,
                    title: "基础医学与学术科研",
                    tag: "分子机制 · 细胞类器官 · 通路验证",
                    badge: "学术科研",
                  },
                  {
                    id: "clinical-professional" as const,
                    title: "临床医学专硕 / 学硕",
                    tag: "三甲规培管床 · 临床回顾队列 · 循证实践",
                    badge: "临床专硕",
                  },
                ].map((item) => {
                  const isSelected = (medicalInput.track || "preventive-public-health") === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setMedicalInput({ track: item.id })}
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer ${
                        isSelected
                          ? "bg-teal-500/30 border-teal-400 text-white ring-2 ring-teal-400/40 shadow-sm"
                          : "bg-white/10 hover:bg-white/20 border-white/10 text-slate-200"
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-bold">
                          <Sparkles className={`h-3.5 w-3.5 ${isSelected ? "text-teal-300" : "text-slate-300"}`} />
                          <span>{item.title}</span>
                          {item.badge && (
                            <span className="text-[10px] bg-teal-400/30 text-teal-200 px-1 py-0.2 rounded font-normal">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-300/80 block mt-0.5">{item.tag}</span>
                      </div>
                      {isSelected && <CheckCircle2 className="h-4 w-4 text-teal-300 shrink-0 ml-2" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* API Key Missing Warning Banner */}
        {!hasApiKey && (
          <div className="mb-6 p-4 rounded-xl border border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <span className="font-bold text-sm block text-amber-900">
                  ⚠️ 严格拒绝离线假数据：系统检测到您当前尚未配置 AI API Key
                </span>
                <p className="text-amber-800 leading-relaxed">
                  为了保证保研文书的真实说服力与学术针对性，本项目已彻底禁用离线假模板。调用前请在设置面板中填入您的大模型
                  API Key（支持 DeepSeek、硅基流动、Kimi、OpenAI 等任意兼容接口，费用极低甚至有免费额度）。
                </p>
              </div>
            </div>
            <Link href="/settings" className="shrink-0">
              <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white font-bold h-9 px-4 gap-1.5 shadow-sm">
                <Settings className="h-4 w-4" /> 立即配置 API Key
              </Button>
            </Link>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-white rounded-t-xl px-2 pt-2 gap-1 overflow-x-auto shadow-xs">
          {/* Tab 1: Always Available */}
          <button
            type="button"
            onClick={() => setActiveTab("input")}
            className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold rounded-t-lg transition-all border-b-2 whitespace-nowrap cursor-pointer ${
              activeTab === "input"
                ? "border-teal-600 bg-teal-50/50 text-teal-700"
                : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <FileText className={`h-4 w-4 ${activeTab === "input" ? "text-teal-600" : "text-slate-400"}`} />
            <span>1. 目标院校与背景材料录入</span>
            {analysisResult ? (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-slate-100 text-slate-600">
                可修改重调
              </Badge>
            ) : (
              <Badge className="text-[10px] px-1.5 py-0 bg-teal-600 text-white">当前材料准备</Badge>
            )}
          </button>

          {/* Subsequent Tabs: Only revealed after analysis completes! */}
          {analysisResult ? (
            <>
              <button
                type="button"
                onClick={() => setActiveTab("ps")}
                className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold rounded-t-lg transition-all border-b-2 whitespace-nowrap cursor-pointer ${
                  activeTab === "ps"
                    ? "border-teal-600 bg-teal-50/50 text-teal-700"
                    : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <FileCheck className={`h-4 w-4 ${activeTab === "ps" ? "text-teal-600" : "text-slate-400"}`} />
                <span>2. 个人陈述 (PS) 深度优化</span>
                {analysisResult.psDiagnosis?.overallScore != null && (
                  <Badge className="text-[10px] px-1.5 py-0 bg-teal-600 text-white">
                    {analysisResult.psDiagnosis.overallScore}分
                  </Badge>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("cv")}
                className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold rounded-t-lg transition-all border-b-2 whitespace-nowrap cursor-pointer ${
                  activeTab === "cv"
                    ? "border-teal-600 bg-teal-50/50 text-teal-700"
                    : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <Microscope className={`h-4 w-4 ${activeTab === "cv" ? "text-teal-600" : "text-slate-400"}`} />
                <span>3. 学术简历 (Medical CV) 重构</span>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-indigo-100 text-indigo-700">
                  ✓ 已重构
                </Badge>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("email")}
                className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold rounded-t-lg transition-all border-b-2 whitespace-nowrap cursor-pointer ${
                  activeTab === "email"
                    ? "border-teal-600 bg-teal-50/50 text-teal-700"
                    : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <Mail className={`h-4 w-4 ${activeTab === "email" ? "text-teal-600" : "text-slate-400"}`} />
                <span>4. 目标院校导师自荐信</span>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-purple-100 text-purple-700">
                  ✓ 高回复率
                </Badge>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("interview")}
                className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold rounded-t-lg transition-all border-b-2 whitespace-nowrap cursor-pointer ${
                  activeTab === "interview"
                    ? "border-teal-600 bg-teal-50/50 text-teal-700"
                    : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <HelpCircle className={`h-4 w-4 ${activeTab === "interview" ? "text-teal-600" : "text-slate-400"}`} />
                <span>5. 考核答辩与追问攻防</span>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-rose-100 text-rose-700">
                  ✓ 题库就绪
                </Badge>
              </button>
            </>
          ) : (
            /* Before Analysis: Clearly show that subsequent deliverables are locked and will be generated in one click */
            <div className="flex items-center gap-2 px-3 py-2 my-auto rounded-lg bg-slate-100/90 border border-dashed border-slate-300 text-slate-500 text-xs select-none">
              <Lock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className="font-semibold text-slate-700">
                后续成果（待一键 AI 分析完成后自动解锁呈现）：
              </span>
              <span className="text-[11px] text-slate-500 hidden md:inline">
                个人陈述深度优化 · 学术简历重构 · 导师自荐信 · 考核答辩与追问攻防
              </span>
              <Badge variant="outline" className="text-[10px] border-teal-300 text-teal-700 bg-teal-50/60 font-medium ml-1">
                拒绝单步分析 · 一键全套生成
              </Badge>
            </div>
          )}

          {/* Tab 6: Guide Knowledge Hub */}
          <button
            type="button"
            onClick={() => setActiveTab("guide")}
            className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold rounded-t-lg transition-all border-b-2 whitespace-nowrap cursor-pointer ml-auto ${
              activeTab === "guide"
                ? "border-teal-600 bg-teal-50/50 text-teal-700"
                : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <BookOpen className={`h-4 w-4 ${activeTab === "guide" ? "text-teal-600" : "text-slate-400"}`} />
            <span>目标院校学科特色智库</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="bg-white rounded-b-xl border border-t-0 border-slate-200 p-4 sm:p-6 shadow-xs min-h-[600px]">
          {/* Non-blocking API Notice Banner (displayed if LLM fallback or warning occurred) */}
          {apiNotice && (
            <div className="mb-6 p-4 rounded-xl bg-amber-50/90 border-2 border-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900 shadow-xs animate-in fade-in duration-200">
              <div className="flex items-start sm:items-center gap-2.5">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
                <div>
                  <span className="font-bold text-amber-950 block sm:inline mr-1.5">AI 运行提示：</span>
                  <span className="text-amber-800 leading-relaxed font-medium">{apiNotice}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowApiKeyModal(true)}
                  className="h-7 text-xs border-amber-400 bg-white text-amber-900 hover:bg-amber-100 font-semibold cursor-pointer"
                >
                  <Settings className="h-3.5 w-3.5 mr-1 text-amber-700" />
                  配置/更换 Key
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setApiNotice(null)}
                  className="h-7 text-xs text-amber-700 hover:bg-amber-100 cursor-pointer"
                >
                  关闭
                </Button>
              </div>
            </div>
          )}

          {/* Global High-Visibility Progress Bar when isAnalyzing */}
          {isAnalyzing && (
            <div
              id="analysis-progress-card"
              className="mb-6 p-5 sm:p-6 rounded-2xl border-2 border-teal-500 bg-gradient-to-br from-slate-950 via-teal-950 to-indigo-950 text-white shadow-2xl space-y-4 ring-4 ring-teal-500/20 animate-in fade-in zoom-in-95 duration-300"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-teal-500/30 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="relative flex h-3.5 w-3.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-teal-500"></span>
                  </div>
                  <span className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                    <Sparkles className="h-4.5 w-4.5 text-teal-400 animate-pulse" />
                    <span>真实 AI 大模型深度推理中：一次性全自动并发生成全套 4 大板块成果</span>
                  </span>
                  <Badge className="bg-teal-500/20 text-teal-300 border border-teal-400/40 font-mono text-xs">
                    {analysisProgress}%
                  </Badge>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-teal-400" />
                    已耗时：<strong className="text-white font-mono text-sm">{elapsedSeconds}</strong> 秒
                  </span>
                  <span className="text-slate-500">|</span>
                  <span className="text-[11px] text-teal-200 bg-teal-500/20 px-2 py-0.5 rounded border border-teal-500/30">
                    预计 15~35 秒 · 严格拒绝离线假数据
                  </span>
                </div>
              </div>

              {/* Progress Bar with Glowing Shimmer */}
              <div className="space-y-2">
                <div className="h-4 w-full bg-slate-900/90 rounded-full overflow-hidden p-0.5 border border-teal-500/40 shadow-inner">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-teal-400 via-cyan-400 to-indigo-500 transition-all duration-500 relative overflow-hidden shadow-sm"
                    style={{ width: `${analysisProgress}%` }}
                  >
                    <div className="absolute inset-0 bg-white/30 animate-pulse" />
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-teal-200 font-medium">
                    <span className="inline-block h-2 w-2 rounded-full bg-teal-400 animate-ping" />
                    <span>当前医学思考：{currentStageLog}</span>
                  </span>
                  <span className="text-slate-400 font-mono text-xs">{analysisProgress} / 100%</span>
                </div>
              </div>

              {/* 6 Stages Timeline Tracker */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1">
                {ANALYSIS_STAGES.map((stg, sIdx) => {
                  const isDone = analysisProgress >= stg.targetPercent;
                  const isCurrent = currentStageIdx === sIdx && !isDone;
                  return (
                    <div
                      key={sIdx}
                      className={`p-2.5 rounded-xl border text-[11px] transition-all ${
                        isDone
                          ? "bg-teal-500/20 border-teal-400/60 text-teal-200"
                          : isCurrent
                          ? "bg-indigo-500/30 border-indigo-400 text-white shadow-lg ring-1 ring-indigo-400 animate-pulse"
                          : "bg-white/5 border-white/10 text-slate-400"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold mb-1">
                        {isDone ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-teal-400 shrink-0" />
                        ) : isCurrent ? (
                          <RefreshCw className="h-3.5 w-3.5 text-cyan-300 animate-spin shrink-0" />
                        ) : (
                          <span className="h-3.5 w-3.5 rounded-full border border-slate-600 text-[9px] flex items-center justify-center text-slate-400 shrink-0">
                            {sIdx + 1}
                          </span>
                        )}
                        <span className="truncate">{stg.title.split("（")[0]}</span>
                      </div>
                      <p className="text-[10px] leading-tight line-clamp-2 opacity-80">{stg.desc}</p>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-teal-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-[11px] text-teal-300/90">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                  <strong>一键全套并发生成进行中</strong>：个人陈述 + 学术CV + 导师信 + 答辩攻防题库全部一次性搞定，无需您单步分次操作！
                </span>
                <span className="text-slate-400">分析完成后将自动解锁并载入全部板块</span>
              </div>
            </div>
          )}
          {/* TAB 1: Input */}
          {activeTab === "input" && (
            <div className="space-y-6">
              {/* Form Actions Header: Clear Inputs & Input Guarantees */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-teal-600" />
                    <span className="text-xs sm:text-sm font-bold text-slate-900">
                      录入您的真实保研申请材料（100% 基于您的输入深度重构）
                    </span>
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[10px] py-0 px-1.5">
                      零示例污染保障
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    系统将严格依据您填写的真实经历生成全套 4 大成果。如需从纯净空白开始，可随时一键清空。
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (confirm("确定要一键清空所有已录入的信息与历史分析结果吗？")) {
                        clearAllInputs();
                      }
                    }}
                    className="h-8 text-xs text-rose-700 hover:text-rose-800 border-rose-200 hover:bg-rose-50 gap-1.5 cursor-pointer font-medium"
                    title="清空所有输入框与缓存结果，从纯净空白表单开始"
                  >
                    <RotateCcw className="h-3.5 w-3.5 text-rose-600" />
                    <span>一键清空所有输入</span>
                  </Button>
                </div>
              </div>

              {/* TOP: Track & Specialty Selection */}
              <div className="space-y-3 p-4 rounded-xl bg-slate-50/80 border border-slate-200">

                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <GraduationCap className="h-4 w-4 text-teal-600" />
                    <span>选择拟攻读专业大类（系统主推预防医学与公共卫生）</span>
                  </Label>
                  <span className="text-[11px] text-teal-700 font-medium">不同方向触发差异化 AI 提示词与重构逻辑</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setMedicalInput({ track: "preventive-public-health" })}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      medicalInput.track === "preventive-public-health"
                        ? "border-teal-600 bg-teal-50 text-teal-950 shadow-xs ring-1 ring-teal-500"
                        : "border-slate-200 hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-teal-900">
                        <Activity className="h-4 w-4 text-teal-600" />
                        <span>公共卫生与预防医学 (主推)</span>
                      </div>
                      <Badge className="bg-teal-600 text-white text-[10px] px-1 py-0">核心专区</Badge>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1.5 leading-normal">
                      重大慢病前瞻队列 · 孟德尔随机化 (MR) · 因果推断 · R/SAS 队列清洗 · CDC 现场流调
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMedicalInput({ track: "clinical-professional" })}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      medicalInput.track === "clinical-professional"
                        ? "border-emerald-600 bg-emerald-50 text-emerald-950 shadow-xs ring-1 ring-emerald-500"
                        : "border-slate-200 hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-900">
                      <HeartPulse className="h-4 w-4 text-emerald-600" />
                      <span>临床医学专硕</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1.5 leading-normal">
                      四证合一 · 住院医规培 · 三甲管床胜任力 · 穿刺操作 · 临床回顾性队列
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMedicalInput({ track: "academic-research" })}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      medicalInput.track === "academic-research"
                        ? "border-cyan-600 bg-cyan-50 text-cyan-950 shadow-xs ring-1 ring-cyan-500"
                        : "border-slate-200 hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs text-cyan-900">
                      <Microscope className="h-4 w-4 text-cyan-600" />
                      <span>科研学硕 / 直博</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1.5 leading-normal">
                      国家重点实验室 · 分子与细胞机制 · 实验动物造模 · 单细胞多组学生信
                    </p>
                  </button>
                </div>

                {/* Sub-specialties */}
                {medicalInput.track === "preventive-public-health" && (
                  <div className="pt-2 border-t border-slate-200/80 space-y-1.5">
                    <span className="text-[11px] font-semibold text-slate-700 block">
                      📌 预防医学细分专业方向（点击快速指定）：
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {PREVENTIVE_SPECIALTIES.map((spec, sIdx) => (
                        <button
                          key={sIdx}
                          type="button"
                          onClick={() => setMedicalInput({ preventiveSubSpecialty: spec })}
                          className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all ${
                            medicalInput.preventiveSubSpecialty === spec
                              ? "bg-teal-600 text-white border-teal-600 font-semibold shadow-xs"
                              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {spec.split(" (")[0]}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* TARGET UNIVERSITY & INSTITUTION (FEATURE HIGHLIGHT) */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50/40 via-slate-50/60 to-teal-50/40 border border-slate-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-200/80 pb-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-indigo-600" />
                    <h3 className="text-sm font-bold text-slate-900">目标申报院校与考核阶段（高匹配度对齐核心）</h3>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    系统将提取目标院校的国家重点学科、特色队列平台与导师招募偏好深度融入文书
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-800">目标院校 / 培养单位</Label>
                    <Input
                      value={medicalInput.targetUniversity}
                      onChange={(e) => setMedicalInput({ targetUniversity: e.target.value })}
                      placeholder="例如：北京大学公共卫生学院 / 中山大学公共卫生学院"
                      className="bg-white font-medium"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-800">申请考核阶段 / 项目类型</Label>
                    <Input
                      value={medicalInput.applicationStage}
                      onChange={(e) => setMedicalInput({ applicationStage: e.target.value })}
                      placeholder="例如：预推免考核 / 锁定导师"
                      className="bg-white"
                    />
                  </div>
                </div>

                {/* Target University Quick Chips */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-semibold text-slate-600 block">
                    🏛️ 顶尖公卫高校快速选填（点击自动带入目标院校与学科平台）：
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {TOP_PUBLIC_HEALTH_SCHOOLS.map((sch, schIdx) => (
                      <button
                        key={schIdx}
                        type="button"
                        onClick={() =>
                          setMedicalInput({
                            targetUniversity: sch.name,
                            targetHospital: sch.name,
                          })
                        }
                        className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all ${
                          medicalInput.targetUniversity === sch.name
                            ? "bg-indigo-600 text-white border-indigo-600 font-semibold shadow-xs"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                        }`}
                        title={sch.focus}
                      >
                        {sch.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Application Stage Quick Chips */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] text-slate-500 font-medium">考核阶段：</span>
                  {APPLICATION_STAGES.map((stg, stgIdx) => (
                    <button
                      key={stgIdx}
                      type="button"
                      onClick={() => setMedicalInput({ applicationStage: stg })}
                      className={`text-[10px] px-2 py-0.5 rounded border transition-all ${
                        medicalInput.applicationStage === stg
                          ? "bg-slate-800 text-white border-slate-800 font-medium"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {stg}
                    </button>
                  ))}
                </div>
              </div>

              {/* Real-time Inline Error Alert above Top Action Bar */}
              {analysisError && !isAnalyzing && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-rose-900 font-medium animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                    <span>{analysisError}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowApiKeyModal(true)}
                      className="h-7 text-xs border-rose-300 bg-white text-rose-800 hover:bg-rose-100"
                    >
                      <Settings className="h-3.5 w-3.5 mr-1 text-rose-600" />
                      配置 Key / 极速体验
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setAnalysisError(null)}
                      className="h-7 text-xs text-rose-600 hover:bg-rose-100"
                    >
                      关闭
                    </Button>
                  </div>
                </div>
              )}

              {/* TOP ACTION BAR: One-Click Full Suite Optimization (No Step-by-Step) */}
              <div className="p-4 sm:p-5 rounded-2xl border-2 border-teal-500/40 bg-gradient-to-r from-teal-500/10 via-indigo-500/10 to-teal-500/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-amber-500 shrink-0" />
                    <span className="font-bold text-slate-900 text-sm">
                      ⚡ 一键全套重构行动栏（杜绝繁琐单步分析）
                    </span>
                    <Badge className="bg-teal-600 text-white text-[10px]">4大板块一次性全自动生成</Badge>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    点击右侧按钮，真实 AI 大模型将<strong>一次性并发生成全套成果</strong>：个人陈述 (PS) 深度优化 + 学术简历 (CV) 重构 + 导师自荐信 + 考核答辩追问攻防，无需您一步步分别点击！
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0 w-full md:w-auto">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowApiKeyModal(true)}
                    className={`h-11 px-3 text-xs border transition-all shrink-0 cursor-pointer ${
                      hasApiKey
                        ? "border-slate-300 bg-white/80 hover:bg-white text-slate-700 font-medium"
                        : "border-amber-300 bg-amber-50/90 hover:bg-amber-100 text-amber-900 font-semibold"
                    }`}
                    title={hasApiKey ? "查看或修改大模型配置" : "未配置 API Key，点击配置或直接体验"}
                  >
                    <Settings className="h-4 w-4 mr-1.5 text-slate-600" />
                    <span>{hasApiKey ? "AI 配置" : "配置 Key/体验"}</span>
                  </Button>

                  <Button
                    size="lg"
                    disabled={isAnalyzing}
                    onClick={() => handleStartAnalysis()}
                    className="flex-1 md:flex-initial bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-700 hover:to-indigo-700 text-white font-bold px-6 shadow-md transition-all hover:scale-102 cursor-pointer h-11"
                  >
                    {isAnalyzing ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        全套并发重构中...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4 mr-2 text-amber-300" />
                        🚀 立即调用 AI 大模型深度优化
                      </>
                    )}
                  </Button>
                </div>

                {/* Inline Progress Bar inside Top Action Bar */}
                {isAnalyzing && (
                  <div className="w-full pt-3 border-t border-teal-500/20 space-y-2 animate-in fade-in">
                    <div className="flex items-center justify-between text-xs font-bold text-teal-950">
                      <span className="flex items-center gap-1.5 text-teal-800">
                        <RefreshCw className="h-3.5 w-3.5 animate-spin text-teal-600" />
                        <span>AI 大模型正在全套并发深度重构中：{currentStageLog}</span>
                      </span>
                      <span className="font-mono text-teal-700 font-bold">{analysisProgress}% ({elapsedSeconds}s)</span>
                    </div>
                    <div className="h-2.5 w-full bg-slate-200/80 rounded-full overflow-hidden p-0.5 border border-teal-300">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-teal-500 via-cyan-400 to-indigo-600 transition-all duration-300 relative overflow-hidden"
                        style={{ width: `${analysisProgress}%` }}
                      >
                        <div className="absolute inset-0 bg-white/30 animate-pulse" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Grid: Applicant Info & Mentor Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left: Applicant */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                    <User className="h-4 w-4 text-teal-600" />
                    <span>申请人基本情况与推免硬实力</span>
                  </h3>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">姓名</Label>
                      <Input
                        value={medicalInput.name}
                        onChange={(e) => setMedicalInput({ name: e.target.value })}
                        placeholder="例如：周思敏"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">本科院校</Label>
                      <Input
                        value={medicalInput.undergradSchool}
                        onChange={(e) => setMedicalInput({ undergradSchool: e.target.value })}
                        placeholder="例如：中山大学公共卫生学院"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">本科推免专业</Label>
                      <Input
                        value={medicalInput.major}
                        onChange={(e) => setMedicalInput({ major: e.target.value })}
                        placeholder="例如：预防医学（五年制）"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">推免学分排名 / GPA</Label>
                      <Input
                        value={medicalInput.gpaRank}
                        onChange={(e) => setMedicalInput({ gpaRank: e.target.value })}
                        placeholder="例如：GPA 3.90，推免排名 2/98"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">专业外语水平 (六级/托福/雅思)</Label>
                    <Input
                      value={medicalInput.englishLevel}
                      onChange={(e) => setMedicalInput({ englishLevel: e.target.value })}
                      placeholder="例如：CET-6 635分，熟练研读 The Lancet, JAMA 顶刊论著"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">联系电话</Label>
                      <Input
                        value={medicalInput.phone || ""}
                        onChange={(e) => setMedicalInput({ phone: e.target.value })}
                        placeholder="例如：137-0200-6689"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">电子邮箱 (建议使用教育邮箱/专业邮箱)</Label>
                      <Input
                        value={medicalInput.email || ""}
                        onChange={(e) => setMedicalInput({ email: e.target.value })}
                        placeholder="例如：zhousimin_sph@163.com"
                      />
                    </div>
                  </div>
                </div>

                {/* Right: Mentor & Department */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                    <Target className="h-4 w-4 text-teal-600" />
                    <span>意向目标科室/导师与课题方向</span>
                  </h3>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">意向导师姓名与头衔</Label>
                      <Input
                        value={medicalInput.mentorName}
                        onChange={(e) => setMedicalInput({ mentorName: e.target.value })}
                        placeholder="例如：高建华 教授 / 博导（国家杰青）"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">申报学系 / 研究所 / 实验室</Label>
                      <Input
                        value={medicalInput.targetDepartment}
                        onChange={(e) => setMedicalInput({ targetDepartment: e.target.value })}
                        placeholder="例如：流行病与卫生统计学系 / 慢病队列实验室"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">导师核心研究方向 (如前瞻队列、因果推断、环境暴露等)</Label>
                    <Input
                      value={medicalInput.mentorResearchDirection}
                      onChange={(e) => setMedicalInput({ mentorResearchDirection: e.target.value })}
                      placeholder="例如：重大慢性病前瞻人群队列、孟德尔随机化因果推断与代谢组学"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">导师近期发表代表作 / 重大课题（击中导师心智）</Label>
                    <Textarea
                      rows={2}
                      value={medicalInput.mentorKeyPaper}
                      onChange={(e) => setMedicalInput({ mentorKeyPaper: e.target.value })}
                      placeholder="例如：2025年发表在 The Lancet Public Health 关于心血管代谢多病共存生命周期轨迹的50万队列研究"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">补充说明（如想突出的代码技能、CDC实习或生信）</Label>
                    <Input
                      value={medicalInput.additionalNotes}
                      onChange={(e) => setMedicalInput({ additionalNotes: e.target.value })}
                      placeholder="例如：希望突出 R 语言清洗万级队列数据与两样本孟德尔随机化 (MR) 经验"
                    />
                  </div>
                </div>
              </div>

              {/* Raw Materials Input */}
              <div id="raw-materials-section" className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <FileText className="h-4 w-4 text-teal-600" />
                      <span>原始个人陈述 (PS) 初稿</span>
                    </Label>
                    <span className="text-[11px] text-slate-400">{(medicalInput.originalPS || "").length} 字</span>
                  </div>
                  <Textarea
                    rows={8}
                    value={medicalInput.originalPS || ""}
                    onChange={(e) => setMedicalInput({ originalPS: e.target.value })}
                    placeholder="粘贴您现有的个人陈述初稿。AI 将根据目标院校与导师方向，使用 PARE 架构进行逐段深度改写..."
                    className="font-mono text-xs leading-relaxed"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Microscope className="h-4 w-4 text-teal-600" />
                      <span>原始个人简历 (CV) 履历文本</span>
                    </Label>
                    <span className="text-[11px] text-slate-400">{(medicalInput.originalResume || "").length} 字</span>
                  </div>
                  <Textarea
                    rows={8}
                    value={medicalInput.originalResume || ""}
                    onChange={(e) => setMedicalInput({ originalResume: e.target.value })}
                    placeholder="粘贴您的原始履历文本（含科研、大创、CDC实习、学生工作等）。AI 将自动清洗冗余琐事并结构化重构..."
                    className="font-mono text-xs leading-relaxed"
                  />
                </div>
              </div>

              {/* Error Message with Quick Action Buttons */}
              {analysisError && (
                <div
                  id="analysis-error-banner"
                  className="p-4 rounded-xl bg-rose-50 border-2 border-rose-300 text-rose-900 text-xs leading-relaxed shadow-sm space-y-3 animate-in fade-in duration-200"
                >
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="h-5 w-5 shrink-0 text-rose-600 mt-0.5" />
                    <div className="space-y-1">
                      <span className="font-bold text-sm text-rose-900 block">提示与诊断反馈：</span>
                      <p className="text-rose-800 leading-relaxed font-medium">{analysisError}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-rose-200/80">
                    <Link href="/settings">
                      <Button size="sm" className="h-7 text-xs bg-rose-700 hover:bg-rose-800 text-white gap-1.5">
                        <Settings className="h-3.5 w-3.5" />
                        ⚙️ 立即前往配置 API Key
                      </Button>
                    </Link>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setAnalysisError(null)}
                      className="h-7 text-xs text-rose-700 hover:bg-rose-100/60 ml-auto"
                    >
                      关闭提示
                    </Button>
                  </div>
                </div>
              )}

              {/* Real-time Inline Error Alert above Action Button */}
              {analysisError && !isAnalyzing && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-rose-900 font-medium animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                    <span>{analysisError}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowApiKeyModal(true)}
                      className="h-7 text-xs border-rose-300 bg-white text-rose-800 hover:bg-rose-100"
                    >
                      <Settings className="h-3.5 w-3.5 mr-1 text-rose-600" />
                      配置 Key / 极速体验
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setAnalysisError(null)}
                      className="h-7 text-xs text-rose-600 hover:bg-rose-100"
                    >
                      关闭
                    </Button>
                  </div>
                </div>
              )}

              {/* Action Button Container */}
              <div id="start-analysis-btn" className="p-4 sm:p-5 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-4 pt-3">
                <div className="space-y-1 text-center sm:text-left">
                  <div className="flex items-center gap-2 text-xs text-slate-500 justify-center sm:justify-start">
                    <ShieldCheck className="h-4 w-4 text-teal-600" />
                    <span>
                      当前 AI 引擎：
                      <span className="font-semibold text-slate-700 ml-1">
                        {hasApiKey ? `${aiConfig?.providerId || "自定义"} (${aiConfig?.model || "deepseek-chat"})` : "未配置 (严禁离线假数据)"}
                      </span>
                    </span>
                  </div>
                  <p className="text-[11px] text-teal-700 font-medium">
                    ⚡ 一次点击全自动生成全套 4 大板块（PS + CV + 导师信 + 答辩攻防），无需单步分次操作
                  </p>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowApiKeyModal(true)}
                    className={`h-12 px-3 text-xs border transition-all shrink-0 cursor-pointer ${
                      hasApiKey
                        ? "border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium"
                        : "border-amber-300 bg-amber-50/90 hover:bg-amber-100 text-amber-900 font-semibold"
                    }`}
                    title={hasApiKey ? "查看或修改大模型配置" : "未配置 API Key，点击配置或直接体验"}
                  >
                    <Settings className="h-4 w-4 mr-1.5 text-slate-600" />
                    <span>{hasApiKey ? "AI 配置" : "配置 Key/体验"}</span>
                  </Button>

                  <Button
                    size="lg"
                    disabled={isAnalyzing}
                    onClick={() => handleStartAnalysis()}
                    className="flex-1 sm:flex-initial bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-700 hover:to-indigo-700 text-white font-bold px-8 shadow-md transition-all hover:scale-102 cursor-pointer h-12"
                  >
                    {isAnalyzing ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        真实 AI 大模型深度重构全案中...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4 mr-2 text-amber-300" />
                        🚀 立即调用 AI 大模型深度优化（全套4大成果一次生成）
                      </>
                    )}
                  </Button>
                </div>

                {/* Inline Progress Bar inside Bottom Action Card */}
                {isAnalyzing && (
                  <div className="w-full pt-4 border-t border-teal-500/30 space-y-2.5 animate-in fade-in">
                    <div className="flex items-center justify-between text-xs font-bold text-teal-950">
                      <span className="flex items-center gap-1.5 text-teal-800">
                        <RefreshCw className="h-4 w-4 animate-spin text-teal-600" />
                        <span>真实 AI 大模型并发深度重构中：一次性全自动生成全套 4 大成果</span>
                      </span>
                      <span className="font-mono text-teal-700 font-bold text-sm">{analysisProgress}% ({elapsedSeconds}s)</span>
                    </div>
                    <div className="h-3 w-full bg-slate-200/80 rounded-full overflow-hidden p-0.5 border border-teal-300 shadow-inner">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-teal-500 via-cyan-400 to-indigo-600 transition-all duration-300 relative overflow-hidden"
                        style={{ width: `${analysisProgress}%` }}
                      >
                        <div className="absolute inset-0 bg-white/30 animate-pulse" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-600">
                      <span className="truncate pr-2">当前医学思考：{currentStageLog}</span>
                      <span className="shrink-0 text-teal-700 font-mono font-medium">预计 15~35 秒 · 严格拒绝离线假数据</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: PS Studio */}
          {activeTab === "ps" && (
            <div className="space-y-6">
              {!analysisResult || !analysisResult.psDiagnosis ? (
                renderLockedTabGuidance("个人陈述 (PS) 深度优化")
              ) : (
                <>
                  {renderFullSuiteBanner()}
                  {/* Target University Banner */}
                  {medicalInput.targetUniversity && (
                    <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-100 flex items-center justify-between text-xs text-indigo-900">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-indigo-600" />
                        <span>
                          对齐目标申报院校：<strong>{medicalInput.targetUniversity}</strong>
                          {medicalInput.targetDepartment ? ` · ${medicalInput.targetDepartment}` : ""}
                        </span>
                      </div>
                      <Badge variant="outline" className="bg-white border-indigo-200 text-indigo-800 text-[10px]">
                        {medicalInput.applicationStage || "推免审核"}
                      </Badge>
                    </div>
                  )}

                  {/* Score & Dimensions */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Overall Score */}
                    <Card className="border-teal-100 bg-gradient-to-br from-teal-50/60 to-white shadow-xs">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          个人陈述 (PS) 综合评分
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-baseline gap-2">
                          <span className="text-4xl font-black text-teal-700">
                            {analysisResult.psDiagnosis?.overallScore ?? 0}
                          </span>
                          <span className="text-xs text-slate-500">/ 100 分 (初稿诊断)</span>
                        </div>
                        <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                          当前文书存在本科生常见的问题：过于抒情、缺乏真实临床观察或严密科学假说。重构后学术硬度提升 85%。
                        </p>
                      </CardContent>
                    </Card>

                    {/* Dimension Scores */}
                    <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {(analysisResult.psDiagnosis?.dimensionScores || []).map((dim, idx) => (
                        <div key={idx} className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-1">
                          <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                            <span>{dim.dimension}</span>
                            <span className="text-teal-700">{dim.score} 分</span>
                          </div>
                          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-teal-600 h-full rounded-full"
                              style={{ width: `${dim.score}%` }}
                            />
                          </div>
                          <p className="text-[11px] text-slate-500 line-clamp-2 leading-normal">{dim.comment}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Issues & Strengths */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/40 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-rose-800">
                        <AlertTriangle className="h-4 w-4 text-rose-600" />
                        <span>需规避的典型学术盲区</span>
                      </div>
                      <ul className="text-xs text-rose-700/90 space-y-1 list-disc list-inside">
                        {(analysisResult.psDiagnosis?.mainIssues || []).map((issue, idx) => (
                          <li key={idx}>{issue}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <span>文书保留的原始核心优势</span>
                      </div>
                      <ul className="text-xs text-emerald-700/90 space-y-1 list-disc list-inside">
                        {(analysisResult.psDiagnosis?.strengths || []).map((s, idx) => (
                          <li key={idx}>{s}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-4 rounded-xl border border-teal-200 bg-teal-50/40 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-teal-800">
                        <Lightbulb className="h-4 w-4 text-teal-600" />
                        <span>AI 专家深度修改建议</span>
                      </div>
                      <ul className="text-xs text-teal-700/90 space-y-1 list-disc list-inside">
                        {(analysisResult.psDiagnosis?.prioritySuggestions || []).map((s, idx) => (
                          <li key={idx}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Section-by-Section Before / After */}
                  <div className="space-y-4 pt-4">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                          <Layers className="h-4 w-4 text-teal-600" />
                          <span>PARE 架构 · 个人陈述逐段对比重构</span>
                        </h3>
                        <p className="text-xs text-slate-500">
                          Problem (问题意识) → Action (求证行动) → Result (数据产出) → Evaluation (批判性反思)
                        </p>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopy(analysisResult.psDiagnosis?.fullOptimizedPS || "", "ps-full")}
                        className="h-8 text-xs gap-1 text-teal-700 border-teal-200 hover:bg-teal-50"
                      >
                        {copiedType === "ps-full" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        <span>复制重构全文</span>
                      </Button>
                    </div>

                    <div className="space-y-6">
                      {(analysisResult.psDiagnosis?.sections || []).map((sec, idx) => (
                        <div key={idx} className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
                          <div className="bg-slate-50/80 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-800">{sec.sectionTitle}</span>
                            <Badge variant="outline" className="text-[10px] bg-white border-slate-200 text-slate-600">
                              第 {idx + 1} 部分
                            </Badge>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200">
                            {/* Before */}
                            <div className="p-4 bg-slate-50/30 space-y-2">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                原始草稿 (Before)
                              </span>
                              <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                                {sec.originalText}
                              </p>
                            </div>

                            {/* After */}
                            <div className="p-4 bg-teal-50/20 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700 flex items-center gap-1">
                                  <Sparkles className="h-3 w-3" /> AI 深度学术重构 (After)
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleCopy(sec.optimizedText, `sec-${idx}`)}
                                  className="h-6 text-[11px] px-1.5 text-teal-700 hover:bg-teal-100/50"
                                >
                                  {copiedType === `sec-${idx}` ? "已复制" : "复制段落"}
                                </Button>
                              </div>
                              <Textarea
                                rows={6}
                                value={sec.optimizedText}
                                onChange={(e) => updateOptimizedPSSection(idx, e.target.value)}
                                className="text-xs leading-relaxed text-slate-800 bg-white/80 border-teal-200/60 font-sans"
                              />

                              <div className="pt-2 border-t border-teal-100/80 space-y-1">
                                <div className="text-[11px] text-teal-800">
                                  <span className="font-semibold">💡 修改依据：</span>
                                  {sec.reason}
                                </div>
                                <div className="text-[11px] text-cyan-800">
                                  <span className="font-semibold">🎯 导师心智关注点：</span>
                                  {sec.mentorFocusPoint}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Full Read View */}
                  <div className="pt-6 border-t border-slate-200">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <FileCheck className="h-4 w-4 text-teal-600" />
                        <span>优化后完整个人陈述 (全文连贯预览)</span>
                      </h3>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handlePrint}
                          className="h-8 text-xs gap-1 text-slate-700 border-slate-200"
                        >
                          <Printer className="h-3.5 w-3.5" /> 打印 / 保存为 PDF
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleCopy(analysisResult.psDiagnosis?.fullOptimizedPS || "", "ps-full-2")}
                          className="h-8 text-xs gap-1 bg-teal-600 hover:bg-teal-700 text-white"
                        >
                          {copiedType === "ps-full-2" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                          复制全文
                        </Button>
                      </div>
                    </div>

                    <Textarea
                      rows={14}
                      value={analysisResult.psDiagnosis?.fullOptimizedPS || ""}
                      onChange={(e) => updateFullOptimizedPS(e.target.value)}
                      className="text-xs leading-relaxed font-serif p-4 bg-slate-50/50 border-slate-200 text-slate-800"
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 3: Medical CV */}
          {activeTab === "cv" && (
            <div className="space-y-6">
              {!analysisResult || !analysisResult.cvOptimization ? (
                renderLockedTabGuidance("学术简历 (Medical CV) 重构")
              ) : (
                <>
                  {renderFullSuiteBanner()}
                  {/* CV Optimization Highlights */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-teal-600" />
                      <span>学术简历改写对照清单 (清洗边缘琐事 · 强化专业画像)</span>
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(analysisResult.cvOptimization?.optimizedItems || []).map((item) => (
                        <div key={item.id} className="p-4 rounded-xl border border-slate-200 bg-white space-y-2 shadow-xs">
                          <div className="flex items-center justify-between text-xs font-bold text-slate-800 border-b border-slate-100 pb-1.5">
                            <span>{item.section}</span>
                            <span className="text-[11px] text-teal-700 font-normal">标准规范对齐</span>
                          </div>

                          <div className="space-y-1.5 text-xs">
                            <div className="p-2 rounded bg-slate-50 text-slate-600 border border-slate-100">
                              <span className="text-[10px] text-slate-400 block font-semibold">修改前：</span>
                              {item.before}
                            </div>
                            <div className="p-2 rounded bg-teal-50/50 text-teal-950 border border-teal-100">
                              <span className="text-[10px] text-teal-700 block font-semibold">重构后：</span>
                              {item.after}
                            </div>
                          </div>

                          <p className="text-[11px] text-slate-500">
                            <span className="font-semibold text-slate-700">理由：</span>
                            {item.reason}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Clean Medical Resume Template Live Preview */}
                  <div className="pt-6 border-t border-slate-200">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                          <FileSpreadsheet className="h-4 w-4 text-teal-600" />
                          <span>重构后的规范化医学学术个人简历 (PDF 标准排版版式)</span>
                        </h3>
                        <p className="text-xs text-slate-500">符合国家医学重点实验室、公卫重点学科与顶尖教学医院导师审阅规范</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handlePrint}
                          className="h-8 text-xs gap-1 text-slate-700 border-slate-200"
                        >
                          <Printer className="h-3.5 w-3.5" /> 打印简历
                        </Button>
                        <Button
                          size="sm"
                          onClick={() =>
                            handleCopy(
                              JSON.stringify(analysisResult.cvOptimization?.finalMedicalResume || {}, null, 2),
                              "cv-json"
                            )
                          }
                          className="h-8 text-xs gap-1 bg-teal-600 hover:bg-teal-700 text-white"
                        >
                          {copiedType === "cv-json" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                          复制结构化数据
                        </Button>
                      </div>
                    </div>

                    {/* Styled Resume Paper */}
                    <div className="mx-auto max-w-4xl p-8 rounded-xl border border-slate-200 bg-white shadow-md font-sans text-slate-900 space-y-6">
                      {/* Resume Header */}
                      <div className="border-b-2 border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                        <div>
                          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                            {analysisResult.cvOptimization?.finalMedicalResume?.personalInfo?.name || medicalInput.name || "推免生"}
                          </h2>
                          <p className="text-xs text-teal-800 font-bold mt-1">
                            {analysisResult.cvOptimization?.finalMedicalResume?.personalInfo?.targetTrack || "医学科研 / 推免深造"}
                          </p>
                          {medicalInput.targetUniversity && (
                            <p className="text-xs text-indigo-700 font-semibold mt-0.5">
                              目标院校：{medicalInput.targetUniversity}
                              {medicalInput.applicationStage ? ` · ${medicalInput.applicationStage}` : ""}
                            </p>
                          )}
                          {Boolean(analysisResult.cvOptimization?.finalMedicalResume?.personalInfo?.targetIntent) && (
                            <p className="text-xs text-slate-600 mt-0.5">
                              {analysisResult.cvOptimization!.finalMedicalResume!.personalInfo!.targetIntent}
                            </p>
                          )}
                        </div>

                        <div className="text-xs text-slate-600 space-y-0.5 sm:text-right">
                          {(analysisResult.cvOptimization?.finalMedicalResume?.personalInfo?.undergradSchool ||
                            medicalInput.undergradSchool ||
                            analysisResult.cvOptimization?.finalMedicalResume?.personalInfo?.major ||
                            medicalInput.major) && (
                            <p>
                              {[
                                analysisResult.cvOptimization?.finalMedicalResume?.personalInfo?.undergradSchool ||
                                  medicalInput.undergradSchool,
                                analysisResult.cvOptimization?.finalMedicalResume?.personalInfo?.major ||
                                  medicalInput.major,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          )}
                          {(analysisResult.cvOptimization?.finalMedicalResume?.personalInfo?.gpaRank ||
                            medicalInput.gpaRank) && (
                            <p className="font-semibold text-slate-800">
                              {analysisResult.cvOptimization?.finalMedicalResume?.personalInfo?.gpaRank ||
                                medicalInput.gpaRank}
                            </p>
                          )}
                          {(analysisResult.cvOptimization?.finalMedicalResume?.personalInfo?.englishLevel ||
                            medicalInput.englishLevel) && (
                            <p>
                              {analysisResult.cvOptimization?.finalMedicalResume?.personalInfo?.englishLevel ||
                                medicalInput.englishLevel}
                            </p>
                          )}
                          {(analysisResult.cvOptimization?.finalMedicalResume?.personalInfo?.phone ||
                            medicalInput.phone ||
                            analysisResult.cvOptimization?.finalMedicalResume?.personalInfo?.email ||
                            medicalInput.email) && (
                            <p>
                              {[
                                (analysisResult.cvOptimization?.finalMedicalResume?.personalInfo?.phone ||
                                  medicalInput.phone) &&
                                  `电话：${
                                    analysisResult.cvOptimization?.finalMedicalResume?.personalInfo?.phone ||
                                    medicalInput.phone
                                  }`,
                                (analysisResult.cvOptimization?.finalMedicalResume?.personalInfo?.email ||
                                  medicalInput.email) &&
                                  `邮箱：${
                                    analysisResult.cvOptimization?.finalMedicalResume?.personalInfo?.email ||
                                    medicalInput.email
                                  }`,
                              ]
                                .filter(Boolean)
                                .join(" | ")}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Academic Summary */}
                      <div className="space-y-1.5">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-teal-800 border-b border-teal-200 pb-1">
                          学术与专业自述 (Summary)
                        </h4>
                        <p className="text-xs text-slate-700 leading-relaxed">
                          {analysisResult.cvOptimization?.finalMedicalResume?.academicSummary || "暂无学术自述"}
                        </p>
                      </div>

                      {/* Lab & Clinical Skills */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-teal-800 border-b border-teal-200 pb-1">
                          核心实验、统计计算与专科操作技能 (Skills)
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          {(analysisResult.cvOptimization?.finalMedicalResume?.labSkills || []).map((skillGroup, idx) => (
                            <div key={idx} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                              <span className="font-bold text-slate-800 block text-[11px] mb-1">
                                {skillGroup.category}
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {(skillGroup.items || []).map((item, itemIdx) => (
                                  <span
                                    key={itemIdx}
                                    className="px-1.5 py-0.5 rounded bg-white text-slate-700 border border-slate-200 text-[10px]"
                                  >
                                    {item}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Research Projects */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-teal-800 border-b border-teal-200 pb-1">
                          科研训练与前瞻队列/重点攻坚经历 (Research Experience)
                        </h4>
                        {(analysisResult.cvOptimization?.finalMedicalResume?.researchProjects || []).map((proj, idx) => (
                          <div key={idx} className="space-y-1">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs">
                              <span className="font-bold text-slate-900">{proj.title}</span>
                              <span className="text-slate-500">{proj.period}</span>
                            </div>
                            <div className="text-[11px] text-teal-700 font-semibold">{proj.role}</div>
                            <ul className="text-xs text-slate-700 space-y-1 list-disc list-inside">
                              {(proj.bullets || []).map((b, bIdx) => (
                                <li key={bIdx}>{b}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>

                      {/* Publications */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-teal-800 border-b border-teal-200 pb-1">
                          学术产出与学术论文 (Publications & Manuscripts)
                        </h4>
                        {(analysisResult.cvOptimization?.finalMedicalResume?.publications || []).map((pub, idx) => (
                          <div key={idx} className="p-2.5 rounded-lg bg-teal-50/30 border border-teal-100 space-y-0.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-slate-900">{pub.title}</span>
                              <Badge variant="outline" className="text-[10px] bg-white text-teal-700 border-teal-200">
                                {pub.status}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-slate-600">
                              <span className="font-medium text-slate-800">{pub.authors}</span> · {pub.journal} (
                              {pub.impactFactor})
                            </p>
                            <p className="text-[11px] text-slate-500 italic">{pub.summary}</p>
                          </div>
                        ))}
                      </div>

                      {/* Clinical / Public Health Field Experiences */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-teal-800 border-b border-teal-200 pb-1">
                          现场疾控 / 临床实习轮转实践 (Field & Clinical Rotations)
                        </h4>
                        {(analysisResult.cvOptimization?.finalMedicalResume?.clinicalExperiences || []).map((clin, idx) => (
                          <div key={idx} className="space-y-1">
                            <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                              <span>
                                {clin.hospital} · {clin.department}
                              </span>
                              <span className="text-slate-500 font-normal">{clin.period}</span>
                            </div>
                            <ul className="text-xs text-slate-700 space-y-1 list-disc list-inside">
                              {(clin.bullets || []).map((b, bIdx) => (
                                <li key={bIdx}>{b}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>

                      {/* Honors & Scholarships */}
                      <div className="space-y-1.5">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-teal-800 border-b border-teal-200 pb-1">
                          奖励荣誉与外语素养 (Honors & Languages)
                        </h4>
                        <div className="flex flex-wrap gap-2 text-xs text-slate-700">
                          {(analysisResult.cvOptimization?.finalMedicalResume?.honorsAndScholarships || []).map((h, idx) => (
                            <span key={idx} className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded border border-slate-200">
                              <Award className="h-3.5 w-3.5 text-amber-500" />
                              <span>{h}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 4: Cover Letter (Email) */}
          {activeTab === "email" && (
            <div className="space-y-6">
              {!analysisResult || !analysisResult.mentorEmail ? (
                renderLockedTabGuidance("目标院校导师自荐信 (Cover Letter)")
              ) : (
                <>
                  {renderFullSuiteBanner()}
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <Send className="h-4 w-4 text-teal-600" />
                        <span>联系意向导师自荐邮件 (深度对接目标院校与课题组)</span>
                      </h3>
                      <p className="text-xs text-slate-500">
                        结合目标申报院校【{medicalInput.targetUniversity || "目标院校"}】学科特色、导师近期发表顶刊与您推免位次量身打造
                      </p>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => handleCopy(analysisResult.mentorEmail?.bodyText || "", "email-copy")}
                      className="h-8 text-xs gap-1 bg-teal-600 hover:bg-teal-700 text-white"
                    >
                      {copiedType === "email-copy" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      一键复制邮件全文
                    </Button>
                  </div>

                  {/* Subject Options */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-800">
                      推荐邮件主题格式（点击选择并快速复制）：
                    </Label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {(analysisResult.mentorEmail?.subjectOptions || []).map((subj, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setActiveSubjectIdx(idx);
                            handleCopy(subj.subject, `subj-${idx}`);
                          }}
                          className={`p-3 rounded-xl border text-left transition-all relative ${
                            activeSubjectIdx === idx
                              ? "border-teal-600 bg-teal-50 text-teal-900 shadow-xs ring-1 ring-teal-500"
                              : "border-slate-200 hover:bg-slate-50 text-slate-700"
                          }`}
                        >
                          <span className="text-[10px] font-bold text-teal-700 block mb-1">
                            {subj.style}
                          </span>
                          <p className="text-xs font-medium leading-normal">{subj.subject}</p>
                          <span className="text-[10px] text-slate-400 mt-2 block">
                            {copiedType === `subj-${idx}` ? "✓ 已复制主题" : "点击复制主题"}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Email Body */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-800">邮件正文（可直接微调）：</Label>
                    <Textarea
                      rows={16}
                      value={analysisResult.mentorEmail?.bodyText || ""}
                      onChange={(e) => updateEmailDraft(e.target.value)}
                      className="text-xs leading-relaxed font-sans p-4 bg-slate-50/50 border-slate-200 text-slate-800"
                    />
                  </div>

                  {/* Checklist & Tips */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div className="p-4 rounded-xl border border-teal-200 bg-teal-50/40 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-teal-800">
                        <FileCheck className="h-4 w-4 text-teal-600" />
                        <span>邮件必备规范附件清单 (核对指引)</span>
                      </div>
                      <ul className="text-xs text-teal-900/90 space-y-1.5">
                        {(analysisResult.mentorEmail?.attachmentChecklist || []).map((item, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-teal-600 font-bold">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800">
                        <Clock className="h-4 w-4 text-amber-600" />
                        <span>联系导师避坑与跟进策略 (Strategy)</span>
                      </div>
                      <ul className="text-xs text-amber-900/90 space-y-1.5">
                        {(analysisResult.mentorEmail?.strategyTips || []).map((tip, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-amber-600 font-bold">•</span>
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 5: Interview Prep */}
          {activeTab === "interview" && (
            <div className="space-y-6">
              {!analysisResult || !analysisResult.labInterviewPrep ? (
                renderLockedTabGuidance("考核答辩与自我介绍 · 追问攻防")
              ) : (
                <>
                  {renderFullSuiteBanner()}
                  {/* Tab 5 Top Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <Presentation className="h-4.5 w-4.5 text-teal-600" />
                        <span>推免考核答辩与进组面试工作台 (Defense & Interview Studio)</span>
                        <Badge className="bg-teal-600 text-white text-[10px] px-1.5 py-0">高难度全案</Badge>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        基于【{medicalInput.targetUniversity || "目标院校"}】国家级平台与意向导师课题，全真模拟答辩现场与压力追问
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handlePrint}
                        className="text-xs h-8 gap-1.5 border-slate-200 hover:bg-slate-50 text-slate-700"
                      >
                        <Printer className="h-3.5 w-3.5" />
                        打印/导出答辩材料
                      </Button>
                    </div>
                  </div>

                  {/* Sub-Tabs Navigation */}
                  <div className="flex border-b border-slate-200 bg-slate-50/80 rounded-lg p-1 gap-1 overflow-x-auto">
                    {[
                      { id: "self-intro" as const, label: "🎙️ 中英文自我介绍", count: `${(analysisResult.labInterviewPrep?.selfIntroductions?.length || 0) + (analysisResult.labInterviewPrep?.englishSelfIntro ? 1 : 0)} 套` },
                      { id: "ppt" as const, label: "📊 5分钟答辩 PPT 架构", count: `${analysisResult.labInterviewPrep?.defenseSlideFramework?.length || 0} 张` },
                      { id: "english-defense" as const, label: "📖 专业英语文献抽题口译", count: analysisResult.labInterviewPrep?.englishLiteratureDefense ? "精选抽测" : null },
                      { id: "questions" as const, label: "🔥 高难考官追问攻防", count: `${analysisResult.labInterviewPrep?.questions?.length || 0} 题` },
                      { id: "mindset" as const, label: "🧠 考核心智与避坑清单", count: `${analysisResult.labInterviewPrep?.mentorMindsetAnalysis?.length || 0} 条` },
                    ].map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => setActiveInterviewSubTab(st.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
                          activeInterviewSubTab === st.id
                            ? "bg-white text-teal-800 shadow-xs border border-slate-200"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                        }`}
                      >
                        <span>{st.label}</span>
                        {st.count && (
                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-normal ${
                            activeInterviewSubTab === st.id ? "bg-teal-50 text-teal-700" : "bg-slate-200 text-slate-600"
                          }`}>
                            {st.count}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* SUB-TAB 1: Self-Introductions */}
                  {activeInterviewSubTab === "self-intro" && (
                    <div className="space-y-4">
                      {/* Version selector buttons */}
                      <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-teal-50/40 border border-teal-200">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-teal-900 flex items-center gap-1">
                            <Volume2 className="h-3.5 w-3.5 text-teal-600" /> 选择答辩版本：
                          </span>
                          {(analysisResult.labInterviewPrep?.selfIntroductions || []).map((si, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setActiveSelfIntroIdx(idx)}
                              className={`text-xs px-3 py-1 rounded-lg border font-medium transition-all ${
                                activeSelfIntroIdx === idx
                                  ? "bg-teal-600 text-white border-teal-600 shadow-xs"
                                  : "bg-white text-slate-700 border-slate-200 hover:bg-teal-50/50"
                              }`}
                            >
                              {si.title} ({si.duration})
                            </button>
                          ))}
                          {analysisResult.labInterviewPrep?.englishSelfIntro && (
                            <button
                              type="button"
                              onClick={() => setActiveSelfIntroIdx(999)}
                              className={`text-xs px-3 py-1 rounded-lg border font-medium transition-all flex items-center gap-1 ${
                                activeSelfIntroIdx === 999
                                  ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                                  : "bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50"
                              }`}
                            >
                              <Languages className="h-3.5 w-3.5" />
                              专业英语自我介绍 (Oral English)
                            </button>
                          )}
                        </div>

                        <div className="text-[11px] text-teal-800 font-medium">
                          {activeSelfIntroIdx === 999
                            ? "附中英对照与高频医学学术词汇解析"
                            : "针对不同面试考场节奏量身定制，拒绝流水账"}
                        </div>
                      </div>

                      {/* Display Chinese Version */}
                      {activeSelfIntroIdx !== 999 && analysisResult.labInterviewPrep?.selfIntroductions?.[activeSelfIntroIdx] && (() => {
                        const currentIntro = analysisResult.labInterviewPrep.selfIntroductions[activeSelfIntroIdx];
                        return (
                          <div className="p-5 rounded-xl border border-slate-200 bg-white space-y-4 shadow-xs">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <h4 className="text-sm font-bold text-slate-900">{currentIntro?.title}</h4>
                                  <Badge className="bg-teal-50 text-teal-800 border border-teal-200 text-[10px]">
                                    时长：{currentIntro?.duration}
                                  </Badge>
                                </div>
                                <p className="text-xs text-slate-500">适用考场：{currentIntro?.targetAudience}</p>
                              </div>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCopy(currentIntro?.speechText || "", `intro-${activeSelfIntroIdx}`)}
                                className="text-xs h-8 gap-1 border-teal-200 text-teal-700 hover:bg-teal-50"
                              >
                                {copiedType === `intro-${activeSelfIntroIdx}` ? (
                                  <>
                                    <Check className="h-3.5 w-3.5 text-emerald-600" /> 已复制全文
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-3.5 w-3.5" /> 复制本篇讲稿
                                  </>
                                )}
                              </Button>
                            </div>

                            {/* Speech text box */}
                            <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 font-serif text-slate-800 text-xs sm:text-sm leading-relaxed whitespace-pre-line select-text">
                              {currentIntro?.speechText}
                            </div>

                            {/* Breakdown and highlights */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                              <div className="p-3 rounded-lg bg-teal-50/30 border border-teal-100 space-y-1.5">
                                <span className="text-[11px] font-bold text-teal-800 flex items-center gap-1">
                                  <Lightbulb className="h-3.5 w-3.5 text-teal-600" />
                                  导师心智抓手与分段时长拆解：
                                </span>
                                <ul className="space-y-1 text-xs text-slate-600">
                                  {(currentIntro?.breakdownTips || []).map((tip, tIdx) => (
                                    <li key={tIdx} className="flex items-start gap-1.5">
                                      <span className="text-teal-600 font-bold shrink-0">▸</span>
                                      <span>{tip}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              <div className="p-3 rounded-lg bg-indigo-50/30 border border-indigo-100 space-y-1.5">
                                <span className="text-[11px] font-bold text-indigo-800 flex items-center gap-1">
                                  <Award className="h-3.5 w-3.5 text-indigo-600" />
                                  核心高光词条武器库 (考官记忆锚点)：
                                </span>
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                  {(currentIntro?.keyHighlights || []).map((hl, hIdx) => (
                                    <span
                                      key={hIdx}
                                      className="text-[11px] px-2 py-0.5 rounded-md bg-white border border-indigo-200 text-indigo-800 font-medium shadow-2xs"
                                    >
                                      ✓ {hl}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Display English Version */}
                      {activeSelfIntroIdx === 999 && analysisResult.labInterviewPrep?.englishSelfIntro && (() => {
                        const enIntro = analysisResult.labInterviewPrep.englishSelfIntro;
                        return (
                          <div className="p-5 rounded-xl border border-indigo-200 bg-white space-y-5 shadow-xs">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-100 pb-3">
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <h4 className="text-sm font-bold text-indigo-950 flex items-center gap-1.5">
                                    <Languages className="h-4 w-4 text-indigo-600" />
                                    专业英语口语自我介绍 (Oral English Self-Introduction)
                                  </h4>
                                  <Badge className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px]">
                                    建议时长：{enIntro?.duration}
                                  </Badge>
                                </div>
                                <p className="text-xs text-slate-500">
                                  针对医学院校夏令营与预推免专业英语口语必考环节，高水平学术词汇精修
                                </p>
                              </div>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCopy(enIntro?.englishText || "", "english-intro")}
                                className="text-xs h-8 gap-1 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                              >
                                {copiedType === "english-intro" ? (
                                  <>
                                    <Check className="h-3.5 w-3.5 text-emerald-600" /> 已复制英文
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-3.5 w-3.5" /> 复制全英文自述
                                  </>
                                )}
                              </Button>
                            </div>

                            {/* Side-by-side English vs Chinese */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                              <div className="p-4 rounded-xl bg-slate-900 text-slate-100 space-y-2 shadow-inner font-sans text-xs sm:text-sm leading-relaxed">
                                <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider block">
                                  🇬🇧 English Speech Script
                                </span>
                                <p className="whitespace-pre-line select-text text-slate-200">{enIntro?.englishText}</p>
                              </div>

                              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 font-serif text-slate-800 text-xs sm:text-sm leading-relaxed">
                                <span className="text-[11px] font-bold text-teal-800 uppercase tracking-wider block">
                                  🇨🇳 完整中文对照翻译
                                </span>
                                <p className="whitespace-pre-line select-text text-slate-700">{enIntro?.chineseTranslation}</p>
                              </div>
                            </div>

                            {/* Vocabulary & Delivery Tips */}
                            <div className="space-y-3 pt-1">
                              <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                <BookOpen className="h-3.5 w-3.5 text-indigo-600" />
                                核心专科高频学术生词与发音解析 (考前必过)：
                              </h5>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                {(enIntro?.phoneticsAndKeyTerms || []).map((v, vIdx) => (
                                  <div key={vIdx} className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/50 space-y-1">
                                    <span className="text-xs font-bold text-indigo-900 block font-mono">{v.term}</span>
                                    <p className="text-[11px] text-slate-600 leading-normal">{v.explanation}</p>
                                  </div>
                                ))}
                              </div>

                              <div className="p-3 rounded-lg bg-indigo-50/50 border border-indigo-200 text-xs text-indigo-950 space-y-1">
                                <span className="font-bold flex items-center gap-1">
                                  <Info className="h-3.5 w-3.5 text-indigo-600" />
                                  口语答辩演练秘籍：
                                </span>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px] text-indigo-900">
                                  {(enIntro?.deliveryTips || []).map((dt, dIdx) => (
                                    <div key={dIdx} className="p-1.5 rounded bg-white border border-indigo-100">
                                      • {dt}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* SUB-TAB 2: Defense Slide Framework (PPT) */}
                  {activeInterviewSubTab === "ppt" && (
                    <div className="space-y-4">
                      <div className="p-3.5 rounded-xl bg-indigo-50/40 border border-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="space-y-0.5">
                          <h4 className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                            <Presentation className="h-4 w-4 text-indigo-600" />
                            5分钟推免答辩 PPT 幻灯片精益架构 (Slide 1 ~ 5 精准拆解)
                          </h4>
                          <p className="text-[11px] text-slate-500">
                            顶级医学院评审专家组通常只给 3~5 分钟汇报时间，按黄金时间线规划幻灯片与台词，严禁信息过载
                          </p>
                        </div>
                        <Badge className="bg-indigo-600 text-white text-[10px] shrink-0">共 5 页精益幻灯片</Badge>
                      </div>

                      <div className="grid grid-cols-1 gap-4">
                        {(analysisResult.labInterviewPrep?.defenseSlideFramework || []).map((slide) => (
                          <div
                            key={slide.slideNumber}
                            className="p-4 rounded-xl border border-slate-200 bg-white space-y-3 shadow-xs transition-all hover:border-indigo-300"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                              <div className="flex items-center gap-2">
                                <span className="h-6 w-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                                  {slide.slideNumber}
                                </span>
                                <h5 className="text-xs sm:text-sm font-bold text-slate-900">{slide.title}</h5>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-700 font-mono">
                                  建议时长：{slide.timeAllocation}
                                </Badge>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleCopy(slide.speakingScript, `slide-${slide.slideNumber}`)}
                                  className="h-7 text-[11px] text-indigo-600 hover:bg-indigo-50 px-2"
                                >
                                  {copiedType === `slide-${slide.slideNumber}` ? "已复制台词" : "复制本页讲稿"}
                                </Button>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                                <span className="text-[11px] font-bold text-slate-700 block">🎯 幻灯片核心内容焦点：</span>
                                <p className="text-slate-600 leading-relaxed text-[11px]">{slide.contentFocus}</p>
                              </div>

                              <div className="md:col-span-2 p-3 rounded-lg bg-indigo-50/20 border border-indigo-100 space-y-1">
                                <span className="text-[11px] font-bold text-indigo-800 block">🎙️ 逐字演讲脚本 (Speaking Script)：</span>
                                <p className="text-slate-800 leading-relaxed text-xs font-serif">{slide.speakingScript}</p>
                              </div>
                            </div>

                            <div className="p-2.5 rounded-lg bg-amber-50/40 border border-amber-200/60 text-[11px] text-amber-900 flex items-start gap-1.5">
                              <Lightbulb className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                              <div>
                                <strong className="font-semibold">视觉设计与图表避坑建议：</strong>
                                {slide.visualAdvice}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* SUB-TAB 3: English Literature Defense */}
                  {activeInterviewSubTab === "english-defense" && (
                    <div className="space-y-4">
                      {analysisResult.labInterviewPrep?.englishLiteratureDefense ? (() => {
                        const lit = analysisResult.labInterviewPrep.englishLiteratureDefense;
                        return (
                          <div className="p-5 rounded-xl border border-slate-200 bg-white space-y-5 shadow-xs">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <Badge className="bg-teal-600 text-white text-[10px]">前沿文献抽测</Badge>
                                  <span className="text-xs font-bold text-slate-500">{lit.journalAndYear}</span>
                                </div>
                                <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">{lit.articleTitle}</h4>
                              </div>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCopy(lit.abstractSnippet, "lit-abstract")}
                                className="text-xs h-8 gap-1 shrink-0 text-slate-700"
                              >
                                {copiedType === "lit-abstract" ? "已复制原文" : "复制英文摘要"}
                              </Button>
                            </div>

                            {/* Side-by-side Abstract */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                              <div className="p-4 rounded-xl bg-slate-900 text-slate-100 space-y-2 font-mono text-xs leading-relaxed">
                                <span className="text-[11px] font-bold text-teal-300 uppercase tracking-wider block">
                                  📄 English Abstract (抽签朗读段落)
                                </span>
                                <p className="whitespace-pre-line select-text text-slate-200 font-sans">{lit.abstractSnippet}</p>
                              </div>

                              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 font-serif text-slate-800 text-xs sm:text-sm leading-relaxed">
                                <span className="text-[11px] font-bold text-teal-800 uppercase tracking-wider block">
                                  🇨🇳 即兴翻译参考答案 (权威译文)
                                </span>
                                <p className="whitespace-pre-line select-text text-slate-700">{lit.chineseTranslation}</p>
                              </div>
                            </div>

                            {/* Common Questions & Translation Strategy */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                              <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/30 space-y-2">
                                <span className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                                  <AlertCircle className="h-3.5 w-3.5 text-rose-600" />
                                  朗读翻译后，考官最可能连环追问该论文的缺陷：
                                </span>
                                <ul className="space-y-1.5 text-xs text-rose-950">
                                  {(lit?.commonQuestions || []).map((cq, qIdx) => (
                                    <li key={qIdx} className="p-2 rounded bg-white border border-rose-100 shadow-2xs">
                                      {cq}
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              <div className="p-3.5 rounded-xl border border-teal-200 bg-teal-50/30 space-y-2">
                                <span className="text-xs font-bold text-teal-900 flex items-center gap-1.5">
                                  <Lightbulb className="h-3.5 w-3.5 text-teal-600" />
                                  长难句拆解与口译评分踩分点：
                                </span>
                                <p className="text-xs text-teal-950 leading-relaxed bg-white p-3 rounded-lg border border-teal-100">
                                  {lit.translationStrategy}
                                </p>
                              </div>
                            </div>

                            {/* Glossary */}
                            <div className="space-y-2 pt-1">
                              <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                <BookOpen className="h-3.5 w-3.5 text-teal-600" />
                                文献专科术语对照表：
                              </h5>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                                {(lit?.keyGlossary || []).map((g, gIdx) => (
                                  <div key={gIdx} className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                                    <span className="font-bold text-slate-900 block font-mono text-[11px]">{g.term}</span>
                                    <span className="text-[11px] text-teal-700">{g.translation}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })() : (
                        <div className="text-center py-10 text-slate-400 text-xs">
                          暂无当前预置的英文文献抽测数据，请点击重新分析触发。
                        </div>
                      )}
                    </div>
                  )}

                  {/* SUB-TAB 4: Hardcore Follow-up Questions */}
                  {activeInterviewSubTab === "questions" && (
                    <div className="space-y-4">
                      {/* Filter Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                            <Flame className="h-3.5 w-3.5 text-rose-500" /> 考点分类筛选：
                          </span>
                          {["all", "因果推断与混杂偏倚", "孟德尔随机化假设与多效性", "队列随访与竞争风险模型", "突发公共卫生现场流调决策", "前沿文献与导师代表作批判性反思", "专硕规培与时间分配", "实验原理与排查"].map((cat) => {
                            const questionsList = analysisResult.labInterviewPrep?.questions || [];
                            const count = cat === "all"
                              ? questionsList.length
                              : questionsList.filter((q) => q.category === cat).length;
                            if (cat !== "all" && count === 0) return null;
                            return (
                              <button
                                key={cat}
                                type="button"
                                onClick={() => setActiveQuestionCategory(cat)}
                                className={`text-[11px] px-2.5 py-1 rounded-md border font-medium transition-all ${
                                  activeQuestionCategory === cat
                                    ? "bg-slate-800 text-white border-slate-800"
                                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                                }`}
                              >
                                {cat === "all" ? "全部高难题型" : cat} ({count})
                              </button>
                            );
                          })}
                        </div>
                        <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-[10px]">
                          拒绝浅显问答 · 锁定方法学盲区
                        </Badge>
                      </div>

                      {/* Questions List */}
                      <div className="space-y-4">
                        {(analysisResult.labInterviewPrep?.questions || [])
                          .filter((q) => activeQuestionCategory === "all" || q.category === activeQuestionCategory)
                          .map((q, idx) => (
                            <div
                              key={idx}
                              className="p-5 rounded-xl border border-slate-200 bg-white space-y-4 shadow-xs transition-all hover:border-slate-300"
                            >
                              {/* Header */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                                <div className="flex items-center gap-2">
                                  <span className="h-6 w-6 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
                                    Q{idx + 1}
                                  </span>
                                  <Badge variant="outline" className="text-[11px] bg-slate-50 text-slate-800 border-slate-300 font-semibold">
                                    {q.category}
                                  </Badge>
                                  {q.difficulty && (
                                    <Badge
                                      className={`text-[10px] px-2 py-0.2 font-bold ${
                                        q.difficulty.includes("地狱")
                                          ? "bg-rose-600 text-white"
                                          : q.difficulty.includes("陷阱")
                                          ? "bg-amber-600 text-white"
                                          : "bg-indigo-600 text-white"
                                      }`}
                                    >
                                      {q.difficulty}
                                    </Badge>
                                  )}
                                </div>
                                <span className="text-[11px] text-slate-400 font-mono">考点深度：专业级追问</span>
                              </div>

                              {/* Question title */}
                              <div>
                                <h4 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                                  {q.question}
                                </h4>
                              </div>

                              {/* Core Intent */}
                              <div className="p-3 rounded-lg bg-teal-50/40 border border-teal-100 text-xs text-teal-950 flex items-start gap-2">
                                <Target className="h-4 w-4 text-teal-600 shrink-0 mt-0.5" />
                                <div>
                                  <strong className="font-bold text-teal-900 mr-1">考官隐藏心机与真实考核意图：</strong>
                                  {q.coreIntent}
                                </div>
                              </div>

                              {/* Bad vs Good Answer */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                                {q.badAnswer && (
                                  <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/30 space-y-1.5">
                                    <span className="text-xs font-bold text-rose-800 flex items-center gap-1.5">
                                      <ShieldAlert className="h-4 w-4 text-rose-600" />
                                      ❌ 典型踩雷扣分回答 (直接淘汰风险)：
                                    </span>
                                    <p className="text-xs text-rose-950 leading-relaxed font-sans">{q.badAnswer}</p>
                                  </div>
                                )}

                                <div className={`p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/30 space-y-1.5 ${!q.badAnswer ? "md:col-span-2" : ""}`}>
                                  <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                    ✅ 满分学术应答示范 (A-Grade Model Response)：
                                  </span>
                                  <p className="text-xs text-slate-900 leading-relaxed font-serif whitespace-pre-line">{q.recommendedAnswer}</p>
                                </div>
                              </div>

                              {/* Evidence Points & Academic Weapons */}
                              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="text-[11px] font-bold text-slate-500">证据支点：</span>
                                  {(q.evidencePoints || []).map((ev, evIdx) => (
                                    <span
                                      key={evIdx}
                                      className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200"
                                    >
                                      ✓ {ev}
                                    </span>
                                  ))}
                                </div>

                                {q.academicWeapons && (q.academicWeapons || []).length > 0 && (
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="text-[11px] font-bold text-indigo-700">理论武器库：</span>
                                    {(q.academicWeapons || []).map((wp, wpIdx) => (
                                      <Badge
                                        key={wpIdx}
                                        variant="outline"
                                        className="text-[10px] bg-indigo-50 text-indigo-800 border-indigo-200 font-mono"
                                      >
                                        🛡️ {wp}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* SUB-TAB 5: Mindset & Checklist */}
                  {activeInterviewSubTab === "mindset" && (
                    <div className="space-y-5">
                      {/* Mentor Mindset */}
                      <div className="p-4 rounded-xl border border-teal-200 bg-teal-50/40 space-y-3">
                        <div className="flex items-center justify-between border-b border-teal-100 pb-2">
                          <span className="text-xs font-bold text-teal-900 flex items-center gap-1.5">
                            <Brain className="h-4 w-4 text-teal-600" />
                            目标院校公卫/医学院博导评审心智深度剖析 (考前必读)
                          </span>
                          <span className="text-[10px] text-teal-700">洞察考官评分权重</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-teal-950">
                          {(analysisResult.labInterviewPrep?.mentorMindsetAnalysis || []).map((item, idx) => (
                            <div key={idx} className="p-3 rounded-lg bg-white border border-teal-100 shadow-2xs leading-relaxed">
                              {item}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Defense Checklist */}
                      {analysisResult.labInterviewPrep?.defenseChecklist && (
                        <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3 shadow-xs">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 border-b border-slate-100 pb-2">
                            <ListChecks className="h-4 w-4 text-indigo-600" />
                            <span>推免面试考前 24 小时冲刺检查清单 (Checklist)</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700">
                            {(analysisResult.labInterviewPrep?.defenseChecklist || []).map((chk, cIdx) => (
                              <div key={cIdx} className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                                <span className="h-4 w-4 rounded-full bg-teal-600 text-white text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                                  ✓
                                </span>
                                <span className="leading-snug">{chk}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* TAB 6: Knowledge Hub */}
          {activeTab === "guide" && (
            <div className="space-y-6">
              <div className="space-y-1 border-b border-slate-200 pb-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-teal-600" />
                  <span>目标院校学科特色 · 预防医学核心避坑智库</span>
                </h3>
                <p className="text-xs text-slate-500">
                  全国顶尖公共卫生学院学科优势分布、导师审阅偏好与全流程推免策略
                </p>
              </div>

              {/* Target Universities Public Health Highlights */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-indigo-600" />
                  <span>全国公卫一流学科（A类及优势院校）招生与科研特色一览</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  {TOP_PUBLIC_HEALTH_SCHOOLS.map((sch, sIdx) => (
                    <div key={sIdx} className="p-3 rounded-xl border border-slate-200 bg-white space-y-1 shadow-2xs">
                      <span className="font-bold text-slate-900 block">{sch.name}</span>
                      <p className="text-[11px] text-teal-700 font-medium">特色：{sch.focus}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Track Comparison */}
                <Card className="border-slate-200 shadow-xs">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-teal-600" />
                      <span>三大培养方向差异化定位策略 (预防公卫 vs 临床专硕 vs 学硕直博)</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs text-slate-700 leading-relaxed">
                    <div className="p-3 rounded-lg bg-teal-50/50 border border-teal-100 space-y-1">
                      <span className="font-bold text-teal-900 block">
                        公共卫生与预防医学（流病统/前瞻队列/MPH/毒理）的核心重点：
                      </span>
                      <p>
                        突出群体健康思维与流行病学因果推断方法（反事实因果推断、孟德尔随机化、因果中介分析）。熟练掌握 R
                        语言或 SAS 自动化清洗数十万人前瞻性大型队列（如 CKB、UK Biobank、CHARLS）；现场方面突出 CDC
                        暴发疫情流调三间分布与偏倚控制；毒理方向突出细胞染毒及氧化应激 DNA 损伤机制。
                      </p>
                    </div>

                    <div className="p-3 rounded-lg bg-emerald-50/50 border border-emerald-100 space-y-1">
                      <span className="font-bold text-emerald-900 block">临床医学专硕（四证合一）的核心重点：</span>
                      <p>
                        毕业需拿到《执业医师资格证》、《规培结业证》、《硕士毕业证》、《硕士学位证》。导师最看重管床能力与临床抗压能力。科研建议主攻临床回顾性数据挖掘、多中心队列随访与
                        Meta 分析，切勿好高骛远选择需要泡在实验室两三年的纯基础机制课题。
                      </p>
                    </div>

                    <div className="p-3 rounded-lg bg-cyan-50/50 border border-cyan-100 space-y-1">
                      <span className="font-bold text-cyan-900 block">科研学术型硕士 / 直博生的核心重点：</span>
                      <p>
                        主要在实验室开展分子生物学、类器官、动物模型与多组学生信挖掘。导师考察重点为文献批判思维、实验原理排查能力与长周期探索耐力。在个人陈述中，务必针对导师代表作提出具有创新性的机制假设。
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Email Dos & Don'ts */}
                <Card className="border-slate-200 shadow-xs">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <Mail className="h-4 w-4 text-teal-600" />
                      <span>联系导师（邮件自荐）的三大纪律与八项注意</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs text-slate-700 leading-relaxed">
                    <div className="p-2.5 rounded bg-rose-50 border border-rose-100 text-rose-800">
                      <span className="font-bold">❌ 绝对禁忌：</span>
                      严禁同一时间群发给同一家单位同一学系/教研室的两位教授！大主任和教授经常共同开会交流，撞车会导致学术诚信受损。
                    </div>
                    <div className="p-2.5 rounded bg-emerald-50 border border-emerald-100 text-emerald-800">
                      <span className="font-bold">✓ 黄金法则：</span>
                      每次精读导师 1-2 篇高分代表作（如 The Lancet/BMJ/Cancer Cell 论著），在自荐信中提出 1 个具体的科学思考或队列假说，表明自己是有备而来。
                    </div>
                    <div className="p-2.5 rounded bg-slate-50 border border-slate-100 text-slate-700">
                      <span className="font-bold">⏳ 跟进礼仪：</span>
                      教授教学与科研评审极为繁重，若 5-7 个工作日未回复，可发一封诚恳简短的 Follow-up
                      跟进邮件，若仍未回复，体面转向联系下一位心仪导师。
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Standard Vocabulary for Medical CV */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3 shadow-xs">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  医学生简历标准技术名词规范表 (规范用词避免被质疑)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div className="p-2.5 rounded bg-slate-50 border border-slate-100 space-y-1">
                    <span className="font-semibold text-slate-700 block text-[11px]">流行病与公卫队列规范词</span>
                    <p className="text-[11px] text-slate-500">
                      两样本孟德尔随机化 (Two-sample MR)、多因素 Cox 比例风险回归、Fine-Gray 竞争风险模型、前瞻性队列自动化清洗、EpiData 双录入、流行曲线 (Epi Curve)
                    </p>
                  </div>

                  <div className="p-2.5 rounded bg-slate-50 border border-slate-100 space-y-1">
                    <span className="font-semibold text-slate-700 block text-[11px]">分子与细胞实验规范词</span>
                    <p className="text-[11px] text-slate-500">
                      RT-qPCR、Western Blot (BCA定量)、免疫共沉淀 (Co-IP)、慢病毒转染稳转株构建、流式细胞术 (FACS
                      多色染色)、Transwell 迁移侵袭、原代细胞分离培养
                    </p>
                  </div>

                  <div className="p-2.5 rounded bg-slate-50 border border-slate-100 space-y-1">
                    <span className="font-semibold text-slate-700 block text-[11px]">生信与单细胞规范词</span>
                    <p className="text-[11px] text-slate-500">
                      R 语言 (Seurat单细胞分析/limma差异分析/clusterProfiler)、TCGA/GEO多组学挖掘、GraphPad Prism 9、ImageJ 灰度定量
                    </p>
                  </div>

                  <div className="p-2.5 rounded bg-slate-50 border border-slate-100 space-y-1">
                    <span className="font-semibold text-slate-700 block text-[11px]">临床与专科胜任力规范词</span>
                    <p className="text-[11px] text-slate-500">
                      规范化住院大病历书写（甲级率）、12导联床旁心电图危急值判读、四大穿刺术（胸穿/腹穿/腰穿/骨穿）、动静脉采血、急诊
                      PCI 绿色通道快速术前准备
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Live Progress Dock - Guaranteed visible anywhere on screen */}
      {isAnalyzing && (
        <div className="fixed bottom-5 right-4 sm:right-6 z-50 max-w-md w-[calc(100vw-2rem)] sm:w-[400px] p-4 rounded-2xl bg-slate-950/95 text-white shadow-2xl border-2 border-teal-400/80 ring-4 ring-teal-500/20 backdrop-blur-md animate-in slide-in-from-bottom-5 duration-300 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-teal-500" />
              </div>
              <span className="text-xs font-black text-white flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-teal-400 animate-pulse" />
                <span>真实 AI 大模型全案并发重构中</span>
              </span>
            </div>
            <Badge className="bg-teal-500/30 text-teal-300 border border-teal-400/50 font-mono text-xs font-bold px-2 py-0.5">
              {analysisProgress}%
            </Badge>
          </div>

          {/* Glowing Animated Progress Bar */}
          <div className="space-y-1.5">
            <div className="h-3 w-full bg-slate-900 rounded-full overflow-hidden p-0.5 border border-teal-500/40 shadow-inner">
              <div
                className="h-full rounded-full bg-gradient-to-r from-teal-400 via-cyan-400 to-indigo-500 transition-all duration-300 relative overflow-hidden"
                style={{ width: `${analysisProgress}%` }}
              >
                <div className="absolute inset-0 bg-white/30 animate-pulse" />
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-teal-200 line-clamp-1 pr-2">
                {currentStageLog || "正在深度重构文书与答辩方案..."}
              </span>
              <span className="text-slate-400 font-mono shrink-0">
                已耗时 {elapsedSeconds}s
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[11px]">
            <span className="text-slate-400">⚡ 4大成果一次并发生成</span>
            <button
              type="button"
              onClick={() => {
                document.getElementById("analysis-progress-card")?.scrollIntoView({ behavior: "smooth", block: "center" });
              }}
              className="text-teal-300 hover:text-teal-100 font-medium underline underline-offset-2 flex items-center gap-1 cursor-pointer transition-colors"
            >
              查看完整步骤 <ArrowLeft className="h-3 w-3 rotate-90" />
            </button>
          </div>
        </div>
      )}

      {/* Floating Success Toast when Regeneration or Generation completes */}
      {showSuccessToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-300 max-w-sm">
          <div className="bg-slate-950/95 text-white border-2 border-emerald-500 shadow-2xl rounded-2xl p-4 flex items-start gap-3 backdrop-blur-md">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0 text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs sm:text-sm text-white">
                  {generationCount > 1 ? "全套成果已重新生成！" : "全套成果已生成完毕！"}
                </span>
                {lastGeneratedAt && (
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] px-1.5 py-0 font-mono">
                    {lastGeneratedAt}
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                个人陈述 (PS)、学术简历 (CV)、导师自荐信与考核答辩 PPT 均已全面基于最新输入重新计算完成。
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowSuccessToast(false)}
              className="text-slate-400 hover:text-white p-1 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* 1. Missing Material Guidance Modal */}
      <Dialog open={showMissingMaterialModal} onOpenChange={setShowMissingMaterialModal}>
        <DialogContent className="max-w-md p-6 bg-white rounded-2xl border border-slate-200 shadow-2xl">
          <DialogHeader className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
                <FileText className="h-5 w-5" />
              </div>
              <DialogTitle className="text-base font-bold text-slate-900">
                📋 请先补充推免基础材料
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-600 leading-relaxed text-left">
              医学生保研 AI 深度重构需要基于您的<strong>个人陈述 (PS)</strong> 或 <strong>学术简历 (CV)</strong> 原稿，以提取临床经历、科研项目与因果推断背景。
            </DialogDescription>
          </DialogHeader>

          <div className="p-3.5 rounded-xl bg-teal-50/70 border border-teal-200/80 space-y-2 text-xs">
            <div className="font-semibold text-teal-900 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-teal-600" />
              <span>推荐操作：一键载入【预防医学】全套优秀样板</span>
            </div>
            <p className="text-teal-800 leading-relaxed text-[11px]">
              系统已内置符合北大/中大/南医大标准的预防医学推免优秀原稿（含 CKB 队列、两样本孟德尔随机化、FETP 现场调研等），载入后即可直接体验 4 大成果深度重构！
            </p>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <Button
              onClick={handleLoadPresetAndStart}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold h-10 shadow-sm"
            >
              <Sparkles className="h-4 w-4 mr-1.5 text-teal-200" />
              一键载入优秀示范原稿并开始
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowMissingMaterialModal(false);
                setTimeout(() => {
                  document.getElementById("raw-materials-section")?.scrollIntoView({ behavior: "smooth", block: "center" });
                }, 100);
              }}
              className="w-full text-xs text-slate-600 border-slate-200 hover:bg-slate-50"
            >
              手动输入原稿内容
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 2. API Key Configuration & Quick Experience Modal */}
      <Dialog open={showApiKeyModal} onOpenChange={setShowApiKeyModal}>
        <DialogContent className="max-w-lg p-6 bg-white rounded-2xl border border-slate-200 shadow-2xl">
          <DialogHeader className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700">
                  <Brain className="h-5 w-5" />
                </div>
                <DialogTitle className="text-base font-bold text-slate-900">
                  配置 AI 大模型 API Key / 极速体验
                </DialogTitle>
              </div>
            </div>
            <DialogDescription className="text-xs text-slate-600 leading-relaxed text-left">
              本系统采用<strong>真实大语言模型</strong>并发重构医学保研全套成果（严格拒绝离线假数据）。请输入您的 API Key 或直接开启全真学术极速体验模式。
            </DialogDescription>
          </DialogHeader>

          {/* Quick Experience Card (For immediate zero-barrier testing) */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-teal-500/10 via-indigo-500/10 to-teal-500/10 border border-teal-300 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-teal-950 flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-amber-500 fill-amber-400" />
                暂无 API Key？一键全真学术模式极速体验
              </span>
              <Badge className="bg-teal-600 text-white text-[10px]">推荐测试</Badge>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              无需任何配置，立即启动全真医学推免重构引擎，完整展示 4 大核心板块、进度条全流程与答辩攻防推演成果。
            </p>
            <Button
              onClick={handleStartDemoExperience}
              className="w-full bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-700 hover:to-indigo-700 text-white font-bold h-9 text-xs shadow-sm cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5 mr-1.5 text-teal-200" />
              ✨ 立即开始全真学术模式极速体验
            </Button>
          </div>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink mx-3 text-[11px] text-slate-400 font-medium">或输入您的真实大模型 Key</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          {/* Provider Selector */}
          <div className="space-y-3 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">选择服务商 / 大模型</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {[
                  { id: "deepseek", name: "DeepSeek (推荐)", model: "deepseek-chat" },
                  { id: "siliconflow", name: "硅基流动", model: "DeepSeek-V3" },
                  { id: "qwen", name: "通义千问", model: "qwen-plus" },
                  { id: "openai", name: "OpenAI", model: "gpt-4o" },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectProvider(p.id)}
                    className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-all text-center cursor-pointer ${
                      tempProvider === p.id
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            {/* API Key Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-slate-700">
                  {tempProvider.toUpperCase()} API Key
                </Label>
                <span className="text-[10px] text-slate-400">仅保存在浏览器本地，安全隐私</span>
              </div>
              <Input
                type="password"
                placeholder={
                  tempProvider === "deepseek"
                    ? "sk-..."
                    : tempProvider === "siliconflow"
                    ? "sk-..."
                    : "请输入 API Key"
                }
                value={tempApiKey}
                onChange={(e) => setTempApiKey(e.target.value)}
                className="font-mono text-xs h-9 bg-slate-50/50"
              />
            </div>

            {/* Base URL & Model */}
            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <div className="space-y-1">
                <Label className="text-[11px] text-slate-500">接口 Base URL</Label>
                <Input
                  value={tempBaseUrl}
                  onChange={(e) => setTempBaseUrl(e.target.value)}
                  className="font-mono text-[11px] h-8 bg-slate-50"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-slate-500">模型名称</Label>
                <Input
                  value={tempModel}
                  onChange={(e) => setTempModel(e.target.value)}
                  className="font-mono text-[11px] h-8 bg-slate-50"
                />
              </div>
            </div>

            <Button
              onClick={handleSaveKeyAndStart}
              disabled={!tempApiKey.trim()}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold h-10 mt-2 text-xs cursor-pointer"
            >
              <Zap className="h-4 w-4 mr-1.5 text-amber-300" />
              保存配置并立即调用真实 AI 重构
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Centered Re-analysis Success Modal */}
      <Dialog open={showRegenSuccessModal} onOpenChange={setShowRegenSuccessModal}>
        <DialogContent className="sm:max-w-lg bg-white border-slate-200 shadow-2xl p-6 text-slate-900 animate-in zoom-in-95 duration-200">
          <DialogHeader className="space-y-2 text-center pb-2 border-b border-slate-100">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-xs">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <DialogTitle className="text-xl font-bold text-slate-900">
              🎉 重新分析已全部完成！
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              完成时间：<strong className="text-emerald-700">{lastGeneratedAt || "刚刚"}</strong> · 第 {generationCount} 次深度重塑
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800">生成依据</span>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[10px]">
                  100% 依据您录入的真实信息
                </Badge>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                申请人：<strong>{medicalInput.name || "推免申请人"}</strong> · 本科：<strong>{medicalInput.undergradSchool || "未填写"}</strong> · 目标：<strong>{medicalInput.targetUniversity || medicalInput.mentorName || "目标院校/导师"}</strong>
              </p>
            </div>

            <div className="space-y-2">
              <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                全套 4 大板块已同步更新：
              </div>
              <div className="grid grid-cols-1 gap-2">
                <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-teal-50/70 border border-teal-200 text-teal-950">
                  <FileCheck className="h-4 w-4 text-teal-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-teal-900">① 个人陈述 (PS) · PARE 逐段深度重塑</div>
                    <p className="text-[11px] text-teal-700">已结合您的核心课题与实践经历，完成 4 阶段方法学质控重构。</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-indigo-50/70 border border-indigo-200 text-indigo-950">
                  <Microscope className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-indigo-900">② 学术简历 (CV) · 真实技能与方法学强化</div>
                    <p className="text-[11px] text-indigo-700">已按医学规范量化科研质控、一线轮转与专业工具链标注。</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-purple-50/70 border border-purple-200 text-purple-950">
                  <Mail className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-purple-900">③ 导师自荐信 · 高回复率邮件方案</div>
                    <p className="text-[11px] text-purple-700">已对齐目标导师与课题组方向，更新定制化邮件主题、正文与附件清单。</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-rose-50/70 border border-rose-200 text-rose-950">
                  <HelpCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-rose-900">④ 考核答辩与追问 · 1/3/5分自述与高难攻防</div>
                    <p className="text-[11px] text-rose-700">已生成全套中英文自我介绍、5页答辩PPT框架及地狱级学术追问与应答武器。</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
              <Button
                onClick={() => {
                  setShowRegenSuccessModal(false);
                  if (activeTab === "input") {
                    setActiveTab("ps");
                  }
                }}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 text-xs shadow-md cursor-pointer gap-1.5"
              >
                <Check className="h-4 w-4" />
                <span>立即查看最新重构成果</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Floating Centered Analysis Loading Overlay */}
      {isAnalyzing && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-teal-100 space-y-4 text-center">
            <div className="h-16 w-16 mx-auto rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600 shadow-xs">
              <RefreshCw className="h-8 w-8 text-teal-600 animate-spin" />
            </div>
            <div className="space-y-1">
              <Badge className="bg-teal-100 text-teal-900 border-teal-300 text-xs px-2.5 py-0.5 font-medium animate-pulse">
                ⚡ 正在重新分析全套 4 大板块 ({analysisProgress}%)
              </Badge>
              <h3 className="text-base font-bold text-slate-900">
                正在深度重构您的专属医学保研材料
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed min-h-[36px]">
                {currentStageLog}
              </p>
            </div>

            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-teal-500 via-indigo-500 to-teal-500 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${analysisProgress}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
              <span>耗时：{elapsedSeconds} 秒</span>
              <span>阶段：{currentStageIdx + 1} / 6</span>
              <span>100% 依据您的真实输入</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

