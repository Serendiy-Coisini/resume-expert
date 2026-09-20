import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type {
  AnalysisResult,
  OptimizeStyle,
  StepId,
  StepStatus,
  UserInput,
} from "@/types/resume";
import type { AIMode } from "@/lib/ai/types";
import { DEFAULT_CUSTOM_TEMPLATE_HTML } from "@/lib/resume-templates";
import { useHistoryStore, type HistorySession } from "@/store/history-store";
import { safeBrowserStorage } from "@/lib/safe-storage";

function createSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function revokeBlobUrl(url?: string) {
  if (typeof URL !== "undefined" && url?.startsWith("blob:")) URL.revokeObjectURL(url);
}

const STEPS: StepId[] = [
  "input",
  "jd-analysis",
  "diagnosis",
  "match",
  "follow-up",
  "optimize",
  "interview",
  "export",
];

export interface AnalysisStageInfo {
  stageId: string;
  label: string;
  currentStepNumber: number;
  totalSteps: number;
  progressPercent: number;
  completedStages: string[];
}

interface ResumeStore {
  userInput: UserInput;
  currentStep: StepId;
  isAnalyzing: boolean;
  analysisStage: AnalysisStageInfo | null;
  enablePIIMasking: boolean;
  analysisResult: AnalysisResult | null;
  partialAnalysisResult: Partial<AnalysisResult> | null;
  analysisError: string | null;
  aiMode: AIMode | null;
  optimizeStyle: OptimizeStyle;
  selectedTemplate: import("@/types/resume").TemplateId;
  templateOptions: import("@/lib/resume-templates").TemplateOptions;
  showPageBreakGuide: boolean;
  customTemplateHTML: string;
  copied: boolean;
  maxReachedStepIndex: number;
  sessionId: string;
  inputRevision: number;

  setUserInput: (input: Partial<UserInput>) => void;
  setEnablePIIMasking: (enabled: boolean) => void;
  setAnalysisStage: (stage: AnalysisStageInfo | null) => void;
  updatePartialAnalysisResult: (partial: Partial<AnalysisResult>) => void;
  setTemplateOptions: (options: Partial<import("@/lib/resume-templates").TemplateOptions>) => void;
  setShowPageBreakGuide: (show: boolean) => void;
  loadExampleData: () => void;
  setCurrentStep: (step: StepId) => void;
  setAnalyzing: (analyzing: boolean) => void;
  setAnalysisResult: (result: AnalysisResult) => void;
  patchAnalysisResult: (patch: Partial<AnalysisResult>, expectedSessionId?: string) => void;
  setAnalysisError: (error: string | null) => void;
  setAiMode: (mode: AIMode | null) => void;
  setOptimizeStyle: (style: OptimizeStyle) => void;
  setSelectedTemplate: (template: import("@/types/resume").TemplateId) => void;
  setCustomTemplateHTML: (html: string) => void;
  updateFollowUpAnswer: (id: string, answer: string) => void;
  setFollowUpBullet: (id: string, bullet: string) => void;
  getStepStatus: (stepId: StepId) => StepStatus;
  setCopied: (copied: boolean) => void;
  archiveCurrentSession: () => void;
  restoreFromHistory: (session: HistorySession) => void;
  reset: () => void;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
}

const defaultUserInput: UserInput = {
  targetRole: "",
  industry: "",
  companyType: "中型企业 (100-499人 · C/D轮/拟上市)",
  jobStage: "社招-中级 (3-5年工作经验 · 核心骨干)",
  highlightSkills: "",
  jobDescription: "",
  originalResume: "",
  additionalInfo: "",
};

type ArchivableState = Pick<
  ResumeStore,
  "sessionId" | "userInput" | "analysisResult" | "currentStep" | "maxReachedStepIndex" | "optimizeStyle"
>;

function archiveIfAvailable(state: ArchivableState) {
  const { analysisResult, userInput } = state;
  if (!analysisResult || !userInput.jobDescription.trim()) return;
  const safeUserInput = { ...userInput };
  delete safeUserInput.rawFileDataUrl;
  delete safeUserInput.avatarUrl;
  const safeAnalysisResult: AnalysisResult = JSON.parse(JSON.stringify(analysisResult));
  if (safeAnalysisResult.finalResume?.personalInfo) delete safeAnalysisResult.finalResume.personalInfo.avatarUrl;
  if (safeAnalysisResult.englishResume?.personalInfo) delete safeAnalysisResult.englishResume.personalInfo.avatarUrl;
  useHistoryStore.getState().saveSession({
    id: state.sessionId,
    createdAt: Date.now(),
    targetRole: userInput.targetRole,
    jdExcerpt: userInput.jobDescription.replace(/\s+/g, " ").trim().slice(0, 80),
    userInput: safeUserInput as typeof userInput,
    analysisResult: safeAnalysisResult,
    currentStep: state.currentStep,
    maxReachedStepIndex: state.maxReachedStepIndex,
    optimizeStyle: state.optimizeStyle,
  });
}

export const useResumeStore = create<ResumeStore>()(
  persist(
    (set, get) => ({
      userInput: defaultUserInput,
      currentStep: "input" as StepId,
      isAnalyzing: false,
      analysisStage: null,
      enablePIIMasking: true,
      analysisResult: null,
      partialAnalysisResult: null,
      analysisError: null,
      aiMode: null,
      optimizeStyle: "concise" as OptimizeStyle,
      selectedTemplate: "modern-sidebar" as import("@/types/resume").TemplateId,
      templateOptions: {
        themeColor: "#1e3a8a",
        avatarShape: "rectangle",
        enableSmartPagination: true,
        density: "normal",
        pageMargin: "normal",
      },
      showPageBreakGuide: false,
      customTemplateHTML: DEFAULT_CUSTOM_TEMPLATE_HTML,
      copied: false,
      maxReachedStepIndex: 0,
      sessionId: createSessionId(),
      inputRevision: 0,

      setUserInput: (input) =>
        set((state) => {
          if ("rawFileDataUrl" in input && input.rawFileDataUrl !== state.userInput.rawFileDataUrl) {
            revokeBlobUrl(state.userInput.rawFileDataUrl);
          }
          const analysisFields: Array<keyof UserInput> = [
            "targetRole", "industry", "companyType", "jobStage", "highlightSkills",
            "jobDescription", "originalResume", "additionalInfo",
          ];
          const materialChange = analysisFields.some(
            (key) => key in input && input[key] !== state.userInput[key]
          );
          if (materialChange && state.analysisResult) archiveIfAvailable(state);
          return {
            userInput: { ...state.userInput, ...input },
            ...(materialChange
              ? {
                  inputRevision: state.inputRevision + 1,
                  analysisResult: null,
                  partialAnalysisResult: null,
                  analysisError: null,
                  isAnalyzing: false,
                  analysisStage: null,
                  currentStep: "input" as StepId,
                  maxReachedStepIndex: 0,
                  sessionId: createSessionId(),
                }
              : {}),
          };
        }),

      setEnablePIIMasking: (enabled) => set({ enablePIIMasking: enabled }),

      setAnalysisStage: (stage) => set({ analysisStage: stage }),

      updatePartialAnalysisResult: (partial) =>
        set((state) => ({
          partialAnalysisResult: { ...(state.partialAnalysisResult ?? {}), ...partial },
        })),

      setTemplateOptions: (options) =>
        set((state) => ({ templateOptions: { ...state.templateOptions, ...options } })),

      setShowPageBreakGuide: (show) => set({ showPageBreakGuide: show }),

      loadExampleData: () => {
        revokeBlobUrl(get().userInput.rawFileDataUrl);
        set({
          userInput: {
            targetRole: "AI 产品经理",
            industry: "企业服务 / SaaS",
            companyType: "头部大厂 (10000人以上 · 已上市)",
            jobStage: "社招-中级 (3-5年工作经验 · 核心骨干)",
            highlightSkills: "AI 功能落地方案、提示词工程、数据驱动迭代",
            jobDescription: `岗位职责：
1. 负责核心 AI 功能（智能问答、文档理解、工作流自动化）的产品规划与设计；
2. 深入理解 B 端客户业务场景，将大模型能力转化为可落地的产品方案；
3. 与算法、工程团队紧密协作，推动 AI 功能从 POC 验证到规模化上线；
4. 建立 AI 产品效果评估体系，通过数据分析与用户反馈持续优化产品体验；
5. 跟踪 AI 行业前沿趋势，输出竞品分析与产品策略。

任职要求：
1. 3年以上 PM 经验，有 ToB SaaS 或企业服务产品背景；
2. 理解 LLM 能力边界与常见架构，有 AI 产品设计/落地经验者优先；
3. 具备优秀的需求分析、逻辑思维和跨部门沟通协作能力；
4. 熟练掌握数据分析方法，有良好的数据敏感度；
5. 本科及以上学历，计算机/信息管理相关专业优先。`,
            originalResume: `张明
手机：138-0013-8000 | 邮箱：zhangming_demo@example.com | 城市：北京
求职意向：AI 产品经理 / 大模型产品经理

职业摘要：
3年互联网产品经理经验，专注于 AI 智能体与 ToB SaaS 产品落地。熟练掌握大模型 Prompt 调优、工作流设计与 RAG 检索增强体系，具备从 0 到 1 打造 AI 产品的闭环经验。

核心能力：
• 大模型应用设计（Prompt 工程、Agent 工作流、RAG）
• 用户需求挖掘与场景落地
• 数据驱动迭代与 A/B 测试
• 跨团队沟通与敏捷项目管理

工作经历：
某知名科技公司 · AI 产品经理
2023.03 - 至今
• 主导 Enterprise AI 助手产品规划与落地，覆盖智能问答、文档分析与客服自动化三大场景；
• 优化 Prompt 架构与 RAG 检索链路，将知识库回答准确率提升 25%，响应时延降低 40%；
• 建立 AI 效果评测基准体系（Benchmarking），收集 1000+ 真实反馈轮次，推动产品月活跃用户突破 50 万。

某 SaaS 企业 · 产品经理
2021.07 - 2023.02
• 负责自动化流程建构器设计，服务超过 200 家中大型企事业单位；
• 梳理用户核心使用路径，优化交互细节，使用户首周留存率提升 18%。

项目经历：
AI 智能文档协同助手
2023.09 - 2024.01
• 针对多格式长文档（PDF/Word/PPT）分析痛点，策划并构建 AI 智能摘要与对话功能；
• 设计灵活的微调及评估标准，协助工程团队搭建模型评测流水线。

技能工具：
Axure · Figma · Python (数据分析) · SQL · Prompt Optimization · LangChain/LlamaIndex

教育背景：
北京科技大学 · 本科 · 计算机科学与技术 · 2017.09 - 2021.06`,
            additionalInfo: "希望突出在 AI 功能落地、架构设计和数据驱动优化方面的丰富经验与项目成果。",
          },
        });
      },

      setCurrentStep: (step) => {
        const idx = STEPS.indexOf(step);
        set((state) => ({
          currentStep: step,
          maxReachedStepIndex: idx >= 0 ? Math.max(state.maxReachedStepIndex, idx) : state.maxReachedStepIndex,
        }));
      },

      setAnalyzing: (analyzing) =>
        set((state) => {
          if (analyzing && state.currentStep === "input") {
            archiveIfAvailable(state);
            return {
              isAnalyzing: analyzing,
              maxReachedStepIndex: 0,
              analysisResult: null,
              partialAnalysisResult: null,
              sessionId: createSessionId(),
            };
          }
          return { isAnalyzing: analyzing };
        }),

      setAnalysisResult: (result) => set({ analysisResult: result, partialAnalysisResult: null, analysisError: null }),

      patchAnalysisResult: (patch, expectedSessionId) =>
        set((state) => {
          if (!state.analysisResult || (expectedSessionId && state.sessionId !== expectedSessionId)) return state;
          return { analysisResult: { ...state.analysisResult, ...patch } };
        }),

      setAnalysisError: (error) => set({ analysisError: error }),

      setAiMode: (mode) => set({ aiMode: mode }),

      setOptimizeStyle: (style) => set({ optimizeStyle: style }),

      setSelectedTemplate: (template) => set({ selectedTemplate: template }),

      setCustomTemplateHTML: (html) => set({ customTemplateHTML: html }),

      updateFollowUpAnswer: (id, answer) =>
        set((state) => {
          if (!state.analysisResult) return state;
          return {
            analysisResult: {
              ...state.analysisResult,
              followUpQuestions: state.analysisResult.followUpQuestions.map((q) =>
                q.id === id ? { ...q, userAnswer: answer, generatedBullet: "" } : q
              ),
            },
          };
        }),

      setFollowUpBullet: (id, bullet) =>
        set((state) => {
          if (!state.analysisResult) return state;
          return {
            analysisResult: {
              ...state.analysisResult,
              followUpQuestions: state.analysisResult.followUpQuestions.map((q) =>
                q.id === id ? { ...q, generatedBullet: bullet } : q
              ),
            },
          };
        }),

      getStepStatus: (stepId: StepId) => {
        const { currentStep, analysisResult, maxReachedStepIndex, isAnalyzing } = get();
        const stepIdx = STEPS.indexOf(stepId);

        if (stepId === currentStep) return "active";

        // While AI model is actively analyzing, lock all other steps
        if (isAnalyzing && stepId !== "input") {
          return "disabled";
        }

        if (!analysisResult && stepIdx > 0) {
          return "disabled";
        }

        // Sequential step locking: user cannot jump past maxReachedStepIndex + 1
        if (stepIdx > maxReachedStepIndex + 1) {
          return "disabled";
        }

        return stepIdx <= maxReachedStepIndex ? "completed" : "pending";
      },

      setCopied: (copied) => set({ copied }),

      archiveCurrentSession: () => archiveIfAvailable(get()),

      restoreFromHistory: (session) => {
        archiveIfAvailable(get());
        revokeBlobUrl(get().userInput.rawFileDataUrl);
        set({
          sessionId: session.id,
          inputRevision: get().inputRevision + 1,
          userInput: session.userInput,
          analysisResult: session.analysisResult,
          partialAnalysisResult: null,
          currentStep: session.currentStep,
          maxReachedStepIndex: session.maxReachedStepIndex,
          optimizeStyle: session.optimizeStyle,
          analysisError: null,
          isAnalyzing: false,
          analysisStage: null,
        });
      },

      reset: () => {
        archiveIfAvailable(get());
        revokeBlobUrl(get().userInput.rawFileDataUrl);
        set({
          userInput: defaultUserInput,
          currentStep: "input" as StepId,
          isAnalyzing: false,
          analysisStage: null,
          analysisResult: null,
          partialAnalysisResult: null,
          analysisError: null,
          optimizeStyle: "concise" as OptimizeStyle,
          selectedTemplate: "classic" as import("@/types/resume").TemplateId,
          customTemplateHTML: DEFAULT_CUSTOM_TEMPLATE_HTML,
          copied: false,
          maxReachedStepIndex: 0,
          sessionId: createSessionId(),
          inputRevision: get().inputRevision + 1,
        });
      },

      goToNextStep: () => {
        const { currentStep, maxReachedStepIndex } = get();
        const idx = STEPS.indexOf(currentStep);
        if (idx >= 0 && idx < STEPS.length - 1) {
          const nextStep = STEPS[idx + 1];
          const newMax = Math.max(maxReachedStepIndex, idx + 1);
          set({ currentStep: nextStep, maxReachedStepIndex: newMax });
        }
      },

      goToPreviousStep: () => {
        const { currentStep } = get();
        const idx = STEPS.indexOf(currentStep);
        if (idx > 0) {
          set({ currentStep: STEPS[idx - 1] });
        }
      },
    }),
    {
      name: "resume-expert-store",
      version: 1,
      storage: createJSONStorage(() => safeBrowserStorage),
      partialize: (state) => {
        const safeUserInput = { ...(state.userInput || {}) };
        delete safeUserInput.rawFileDataUrl;
        delete safeUserInput.avatarUrl;
        const safeAnalysisResult = state.analysisResult
          ? JSON.parse(JSON.stringify(state.analysisResult)) as AnalysisResult
          : null;
        if (safeAnalysisResult?.finalResume?.personalInfo) delete safeAnalysisResult.finalResume.personalInfo.avatarUrl;
        if (safeAnalysisResult?.englishResume?.personalInfo) delete safeAnalysisResult.englishResume.personalInfo.avatarUrl;
        return {
          userInput: safeUserInput as typeof state.userInput,
          currentStep: state.currentStep,
          analysisResult: safeAnalysisResult,
          optimizeStyle: state.optimizeStyle,
          maxReachedStepIndex: state.maxReachedStepIndex,
          sessionId: state.sessionId,
          inputRevision: state.inputRevision,
        };
      },
    }
  )
);
