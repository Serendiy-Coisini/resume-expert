import type { ReactNode } from "react";

export type TemplateId = import("@/lib/resume-templates").TemplateId;

export type StepId =
  | "input"
  | "jd-analysis"
  | "diagnosis"
  | "match"
  | "follow-up"
  | "optimize"
  | "final-resume"
  | "interview"
  | "export";

export type StepStatus = "pending" | "active" | "completed" | "disabled";

export type EvidenceStrength = "strong" | "medium" | "weak" | "none";

export type JobStage =
  | "在校实习 (日常实习/暑期实习 · 在校生)"
  | "应届校招 (应届生/秋招/春招 · 0-1年经验)"
  | "社招-初级 (1-3年工作经验 · 基础骨干)"
  | "社招-中级 (3-5年工作经验 · 核心骨干)"
  | "社招-高级/专家 (5-10年+经验 · 团队Lead/专家)"
  | "跨界/转型 (零相关经验/转行突破)"
  | "校招"
  | "社招-初级"
  | "社招-中级"
  | "社招-高级"
  | "转行"
  | (string & {});

export type CompanyType =
  | "头部大厂 (10000人以上 · 已上市)"
  | "大型企业 (1000-9999人 · 已上市/成熟期)"
  | "中型企业 (100-499人 · C/D轮/拟上市)"
  | "成长型公司 (20-99人 · A/B轮)"
  | "初创团队 (0-20人 · 未融资/天使轮)"
  | "外企/跨国公司 (1000-9999人 · 外资/已上市)"
  | "国企/事业单位 (10000人以上 · 国有体制)"
  | "大厂"
  | "中型公司"
  | "创业公司"
  | "外企"
  | "国企"
  | (string & {});

export interface UserInput {
  targetRole: string;
  industry: string;
  companyType: CompanyType;
  jobStage: JobStage;
  highlightSkills: string;
  jobDescription: string;
  originalResume: string;
  additionalInfo: string;
  avatarUrl?: string;
  rawFileName?: string;
  rawFileType?: string;
  rawFileDataUrl?: string;
}

export interface CoreCompetency {
  name: string;
  importance: "high" | "medium" | "low";
  description: string;
}

export interface JDAnalysis {
  responsibilities: string[];
  hardRequirements: string[];
  implicitRequirements: string[];
  keywords: string[];
  idealCandidate: string;
  coreCompetencies: CoreCompetency[];
}

export interface DimensionScore {
  dimension: string;
  score: number;
  comment: string;
}

export interface ResumeDiagnosis {
  overallScore: number;
  dimensionScores: DimensionScore[];
  mainIssues: string[];
  prioritySuggestions: string[];
}

export interface MatchItem {
  jdRequirement: string;
  resumeEvidence: string;
  evidenceStrength: EvidenceStrength;
  needsSupplement: boolean;
  optimizationSuggestion: string;
}

export interface FollowUpQuestion {
  id: string;
  question: string;
  purpose: string;
  userAnswer: string;
  generatedBullet: string;
  presetBullet?: string;
}

export type OptimizeStyle =
  | "concise"
  | "data-driven"
  | "leadership"
  | "reduce-exaggeration"
  | "jd-matched"
  | "ai-product"
  | "tob-saas";

export interface OptimizedItem {
  id: string;
  section: string;
  before: string;
  after: string;
  reason: string;
  riskWarning: string;
}

export interface WorkExperience {
  company: string;
  role: string;
  period: string;
  bullets: string[];
}

export interface ProjectExperience {
  name: string;
  role: string;
  period: string;
  bullets: string[];
}

export interface FinalResume {
  personalInfo: {
    name: string;
    email: string;
    phone: string;
    location: string;
    avatarUrl?: string;
  };
  jobIntent: string;
  summary: string;
  coreSkills: string[];
  workExperience: WorkExperience[];
  projectExperience: ProjectExperience[];
  skillsAndTools: string[];
  education: {
    school: string;
    degree: string;
    period: string;
  };
}

export type Resume = FinalResume;

export interface InterviewQuestion {
  question: string;
  suggestedAnswer: string;
  evidenceNeeded: string[];
}

export interface InterviewPrep {
  likelyQuestions: InterviewQuestion[];
  evidenceToPrepare: string[];
  possibleExaggerations: string[];
  dataToSupplement: string[];
  selfIntroduction: string;
}

export interface AnalysisResult {
  jdAnalysis: JDAnalysis;
  diagnosis: ResumeDiagnosis;
  matchItems: MatchItem[];
  followUpQuestions: FollowUpQuestion[];
  optimizedItems: OptimizedItem[];
  finalResume: FinalResume;
  englishResume?: FinalResume;
  interviewPrep: InterviewPrep;
}

export interface StepConfig {
  id: StepId;
  label: string;
  icon?: ReactNode;
}
