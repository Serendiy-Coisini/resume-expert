export type MedicalPostgradTrack =
  | "clinical-professional"
  | "academic-research"
  | "preventive-public-health";

export type MedicalGoalScene =
  | "contact-mentor"
  | "mentor-interview"
  | "scholarship-eval"
  | "research-proposal";

export interface MedicalUserInput {
  name: string;
  undergradSchool: string;
  major: string;
  gpaRank: string;
  englishLevel: string;
  phone?: string;
  email?: string;
  track: MedicalPostgradTrack;
  goalScene: MedicalGoalScene;
  targetUniversity: string;
  applicationStage: string;
  preventiveSubSpecialty?: string;
  mentorName: string;
  targetHospital: string;
  targetDepartment: string;
  mentorResearchDirection: string;
  mentorKeyPaper: string;
  originalPS: string;
  originalResume: string;
  additionalNotes: string;
}

export interface StructuredPSSection {
  sectionName: string;
  sectionTitle: string;
  originalText: string;
  optimizedText: string;
  reason: string;
  mentorFocusPoint: string;
}

export interface PSDimensionScore {
  dimension: string;
  score: number;
  comment: string;
}

export interface PSDiagnosis {
  overallScore: number;
  dimensionScores: PSDimensionScore[];
  mainIssues: string[];
  strengths: string[];
  prioritySuggestions: string[];
  sections: StructuredPSSection[];
  fullOptimizedPS: string;
}

export interface MedicalCVItem {
  id: string;
  section: string;
  before: string;
  after: string;
  reason: string;
  academicStandardTip: string;
}

export interface MedicalPublication {
  title: string;
  authors: string;
  journal: string;
  impactFactor: string;
  status: "已见刊 (Published)" | "已接收 (Accepted)" | "在审中 (Under Review)" | "在写/准备中 (In Prep)";
  summary: string;
}

export interface MedicalClinicalExperience {
  hospital: string;
  department: string;
  period: string;
  bullets: string[];
}

export interface MedicalSkillCategory {
  category: string;
  items: string[];
}

export interface MedicalResearchProject {
  title: string;
  role: string;
  period: string;
  mentor?: string;
  bullets: string[];
}

export interface MedicalFinalResume {
  personalInfo: {
    name: string;
    undergradSchool: string;
    major: string;
    gpaRank: string;
    englishLevel: string;
    phone: string;
    email: string;
    targetTrack: string;
    targetIntent: string;
    targetUniversity?: string;
  };
  academicSummary: string;
  labSkills: MedicalSkillCategory[];
  researchProjects: MedicalResearchProject[];
  publications: MedicalPublication[];
  clinicalExperiences: MedicalClinicalExperience[];
  honorsAndScholarships: string[];
}

export interface MentorEmailDraft {
  subjectOptions: { style: string; subject: string }[];
  salutation: string;
  bodyText: string;
  attachmentChecklist: string[];
  strategyTips: string[];
}

export interface SelfIntroVersion {
  title: string;
  duration: string;
  targetAudience: string;
  speechText: string;
  breakdownTips: string[];
  keyHighlights: string[];
}

export interface EnglishSelfIntro {
  duration: string;
  englishText: string;
  chineseTranslation: string;
  phoneticsAndKeyTerms: { term: string; explanation: string }[];
  deliveryTips: string[];
}

export interface DefenseSlideItem {
  slideNumber: number;
  title: string;
  timeAllocation: string;
  contentFocus: string;
  speakingScript: string;
  visualAdvice: string;
}

export interface EnglishLiteratureDefense {
  articleTitle: string;
  journalAndYear: string;
  abstractSnippet: string;
  chineseTranslation: string;
  commonQuestions: string[];
  keyGlossary: { term: string; translation: string }[];
  translationStrategy: string;
}

export interface EnhancedInterviewQuestion {
  category: string;
  difficulty?: "高难度 (Hard)" | "地狱级 (Hardcore)" | "考官陷阱 (Trap)" | "方法学重灾区 (Methodology)";
  question: string;
  coreIntent: string;
  badAnswer?: string;
  recommendedAnswer: string;
  evidencePoints: string[];
  academicWeapons?: string[];
}

export interface LabInterviewPrep {
  selfIntroductions?: SelfIntroVersion[];
  englishSelfIntro?: EnglishSelfIntro;
  defenseSlideFramework?: DefenseSlideItem[];
  englishLiteratureDefense?: EnglishLiteratureDefense;
  questions: EnhancedInterviewQuestion[];
  mentorMindsetAnalysis: string[];
  defenseChecklist?: string[];
}

export interface MedicalAnalysisResult {
  psDiagnosis: PSDiagnosis;
  cvOptimization: {
    optimizedItems: MedicalCVItem[];
    finalMedicalResume: MedicalFinalResume;
  };
  mentorEmail: MentorEmailDraft;
  labInterviewPrep: LabInterviewPrep;
}
