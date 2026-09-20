/**
 * Zod schemas for validating LLM response JSON.
 *
 * Optional details receive render-safe defaults. Each stage also performs
 * a content-integrity check so malformed output cannot masquerade as success.
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Atomic helpers
// ---------------------------------------------------------------------------

/** Score clamped to [0, 100]. */
const scoreSchema = z.coerce
  .number()
  .transform((v) => Math.max(0, Math.min(100, Math.round(v))))
  .catch(0);

const importanceSchema = z.enum(["high", "medium", "low"]).catch("medium");

const evidenceStrengthSchema = z
  .enum(["strong", "medium", "weak", "none"])
  .catch("none");

// ---------------------------------------------------------------------------
// Component schemas
// ---------------------------------------------------------------------------

const coreCompetencySchema = z.object({
  name: z.string().catch(""),
  importance: importanceSchema,
  description: z.string().catch(""),
});

const jdAnalysisObjectSchema = z.object({
  responsibilities: z.array(z.string().catch("")).catch([]),
  hardRequirements: z.array(z.string().catch("")).catch([]),
  implicitRequirements: z.array(z.string().catch("")).catch([]),
  keywords: z.array(z.string().catch("")).catch([]),
  idealCandidate: z.string().catch(""),
  coreCompetencies: z.array(coreCompetencySchema).catch([]),
});

const dimensionScoreSchema = z.object({
  dimension: z.string().catch(""),
  score: scoreSchema,
  comment: z.string().catch(""),
});

const diagnosisObjectSchema = z.object({
  overallScore: scoreSchema,
  dimensionScores: z.array(dimensionScoreSchema).catch([]),
  mainIssues: z.array(z.string().catch("")).catch([]),
  prioritySuggestions: z.array(z.string().catch("")).catch([]),
});

const matchItemSchema = z.object({
  jdRequirement: z.string().catch(""),
  resumeEvidence: z.string().catch(""),
  evidenceStrength: evidenceStrengthSchema,
  needsSupplement: z.boolean().catch(false),
  optimizationSuggestion: z.string().catch(""),
});

const followUpQuestionSchema = z.object({
  id: z.string().catch(""),
  question: z.string().catch(""),
  purpose: z.string().catch(""),
  userAnswer: z.string().catch(""),
  generatedBullet: z.string().catch(""),
  presetBullet: z.string().optional().catch(""),
});

const optimizedItemSchema = z.object({
  id: z.string().catch(""),
  section: z.string().catch(""),
  before: z.string().catch(""),
  after: z.string().catch(""),
  reason: z.string().catch(""),
  riskWarning: z.string().catch(""),
});

const workExperienceSchema = z.object({
  company: z.string().catch(""),
  role: z.string().catch(""),
  period: z.string().catch(""),
  bullets: z.array(z.string().catch("")).catch([]),
});

const projectExperienceSchema = z.object({
  name: z.string().catch(""),
  role: z.string().catch(""),
  period: z.string().catch(""),
  bullets: z.array(z.string().catch("")).catch([]),
});

const educationSchema = z.object({
  school: z.string().catch(""),
  degree: z.string().catch(""),
  period: z.string().catch(""),
});

const personalInfoSchema = z.object({
  name: z.string().catch(""),
  email: z.string().catch(""),
  phone: z.string().catch(""),
  location: z.string().catch(""),
});

const finalResumeObjectSchema = z.object({
  personalInfo: personalInfoSchema.catch({ name: "", email: "", phone: "", location: "" }),
  jobIntent: z.string().catch(""),
  summary: z.string().catch(""),
  coreSkills: z.array(z.string().catch("")).catch([]),
  workExperience: z.array(workExperienceSchema).catch([]),
  projectExperience: z.array(projectExperienceSchema).catch([]),
  skillsAndTools: z.array(z.string().catch("")).catch([]),
  education: educationSchema.catch({ school: "", degree: "", period: "" }),
});

const interviewQuestionSchema = z.object({
  question: z.string().catch(""),
  suggestedAnswer: z.string().catch(""),
  evidenceNeeded: z.array(z.string().catch("")).catch([]),
});

const interviewPrepObjectSchema = z.object({
  likelyQuestions: z.array(interviewQuestionSchema).catch([]),
  evidenceToPrepare: z.array(z.string().catch("")).catch([]),
  possibleExaggerations: z.array(z.string().catch("")).catch([]),
  dataToSupplement: z.array(z.string().catch("")).catch([]),
  selfIntroduction: z.string().catch(""),
});

// ---------------------------------------------------------------------------
// Response schemas — one per LLM call
// ---------------------------------------------------------------------------

/** Step 1: JD analysis. */
export const jdAnalysisResponseSchema = z
  .object({
    jdAnalysis: jdAnalysisObjectSchema,
  })
  .passthrough()
  .refine(({ jdAnalysis }) =>
    jdAnalysis.responsibilities.length > 0 ||
    jdAnalysis.hardRequirements.length > 0 ||
    jdAnalysis.keywords.length > 0 ||
    jdAnalysis.idealCandidate.trim().length > 0,
  { message: "JD 解析结果缺少有效内容" });

/** Step 2: Diagnosis + match + follow-up questions. */
export const diagnosisMatchResponseSchema = z
  .object({
    diagnosis: diagnosisObjectSchema,
    matchItems: z.array(matchItemSchema).catch([]),
    followUpQuestions: z.array(followUpQuestionSchema).catch([]),
  })
  .passthrough()
  .refine(({ diagnosis, matchItems }) =>
    diagnosis.dimensionScores.length > 0 ||
    diagnosis.mainIssues.length > 0 ||
    diagnosis.prioritySuggestions.length > 0 ||
    matchItems.length > 0,
  { message: "诊断结果缺少有效内容" });

/** Step 3: Optimized items + final resume. */
export const optimizeResumeResponseSchema = z
  .object({
    optimizedItems: z.array(optimizedItemSchema).catch([]),
    finalResume: finalResumeObjectSchema,
    englishResume: finalResumeObjectSchema.optional(),
  })
  .passthrough()
  .refine(({ optimizedItems, finalResume }) =>
    optimizedItems.length > 0 && (
      finalResume.summary.trim().length > 0 ||
      finalResume.workExperience.length > 0 ||
      finalResume.projectExperience.length > 0
    ),
  { message: "简历优化结果不完整" });

/** Step 4: Interview preparation. */
export const interviewResponseSchema = z
  .object({
    interviewPrep: interviewPrepObjectSchema,
  })
  .passthrough()
  .refine(({ interviewPrep }) =>
    interviewPrep.likelyQuestions.length > 0 ||
    interviewPrep.evidenceToPrepare.length > 0 ||
    interviewPrep.selfIntroduction.trim().length > 0,
  { message: "面试准备结果缺少有效内容" });

/** Re-optimize (style change). */
export const optimizedItemsResponseSchema = z
  .object({
    optimizedItems: z.array(optimizedItemSchema).catch([]),
  })
  .passthrough()
  .refine(({ optimizedItems }) => optimizedItems.length > 0, { message: "改写结果为空" });

/** Single bullet generation. */
export const bulletResponseSchema = z
  .object({
    bullet: z.string().catch(""),
  })
  .passthrough()
  .refine(({ bullet }) => bullet.trim().length > 0, { message: "Bullet 结果为空" });
