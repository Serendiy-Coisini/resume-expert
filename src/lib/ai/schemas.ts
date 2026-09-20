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

/** Non-empty string array that trims entries and strips empty/whitespace/null elements. */
export const cleanStringArraySchema = z
  .array(z.unknown())
  .transform((items) =>
    items
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter((item) => item.length > 0)
  )
  .catch([]);

// ---------------------------------------------------------------------------
// Component schemas
// ---------------------------------------------------------------------------

const coreCompetencySchema = z.object({
  name: z.string().catch(""),
  importance: importanceSchema,
  description: z.string().catch(""),
});

export const jdAnalysisObjectSchema = z.object({
  responsibilities: cleanStringArraySchema,
  hardRequirements: cleanStringArraySchema,
  implicitRequirements: cleanStringArraySchema,
  keywords: cleanStringArraySchema,
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
  mainIssues: cleanStringArraySchema,
  prioritySuggestions: cleanStringArraySchema,
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

const rawOptimizedItemSchema = z.object({
  id: z.string().catch(""),
  section: z.string().catch(""),
  before: z.string().catch(""),
  after: z.string().catch(""),
  reason: z.string().catch(""),
  riskWarning: z.string().catch(""),
});

const optimizedItemSchema = rawOptimizedItemSchema.refine(
  (item) => item.after.trim().length > 0 || item.before.trim().length > 0,
  { message: "改写条目缺少有效内容" }
);

export const validOptimizedItemsSchema = z
  .array(z.unknown())
  .transform((items) =>
    items
      .map((item) => {
        const res = optimizedItemSchema.safeParse(item);
        return res.success ? res.data : null;
      })
      .filter((item): item is z.infer<typeof rawOptimizedItemSchema> => Boolean(item))
  )
  .catch([]);

export const workExperienceSchema = z.object({
  company: z.string().catch(""),
  role: z.string().catch(""),
  period: z.string().catch(""),
  bullets: cleanStringArraySchema,
});

export const projectExperienceSchema = z.object({
  name: z.string().catch(""),
  role: z.string().catch(""),
  period: z.string().catch(""),
  bullets: cleanStringArraySchema,
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
  coreSkills: cleanStringArraySchema,
  workExperience: z.array(workExperienceSchema).catch([]),
  projectExperience: z.array(projectExperienceSchema).catch([]),
  skillsAndTools: cleanStringArraySchema,
  education: educationSchema.catch({ school: "", degree: "", period: "" }),
});

const interviewQuestionSchema = z.object({
  question: z.string().catch(""),
  suggestedAnswer: z.string().catch(""),
  evidenceNeeded: cleanStringArraySchema,
});

const interviewPrepObjectSchema = z.object({
  likelyQuestions: z.array(interviewQuestionSchema).catch([]),
  evidenceToPrepare: cleanStringArraySchema,
  possibleExaggerations: cleanStringArraySchema,
  dataToSupplement: cleanStringArraySchema,
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
    optimizedItems: validOptimizedItemsSchema,
    finalResume: finalResumeObjectSchema,
    englishResume: finalResumeObjectSchema.optional(),
  })
  .passthrough()
  .refine(({ optimizedItems, finalResume }) =>
    optimizedItems.length > 0 && (
      finalResume.summary.trim().length > 0 ||
      finalResume.workExperience.some((w) => w.bullets.length > 0 || w.company.trim().length > 0) ||
      finalResume.projectExperience.some((p) => p.bullets.length > 0 || p.name.trim().length > 0)
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
    optimizedItems: validOptimizedItemsSchema,
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

// ---------------------------------------------------------------------------
// Strict Complete Analysis Result Schema
// ---------------------------------------------------------------------------

/**
 * Strict schema for FinalResume in complete results.
 * Shared between Chinese finalResume and optional englishResume.
 */
export const completeFinalResumeSchema = z.object({
  personalInfo: z.object({
    name: z.string(),
    email: z.string(),
    phone: z.string(),
    location: z.string(),
    avatarUrl: z.string().optional(),
  }),
  jobIntent: z.string(),
  summary: z.string(),
  coreSkills: z.array(z.string()),
  workExperience: z.array(
    z.object({
      company: z.string(),
      role: z.string(),
      period: z.string(),
      bullets: z.array(z.string()),
    })
  ),
  projectExperience: z.array(
    z.object({
      name: z.string(),
      role: z.string(),
      period: z.string(),
      bullets: z.array(z.string()),
    })
  ),
  skillsAndTools: z.array(z.string()),
  education: z.object({
    school: z.string(),
    degree: z.string(),
    period: z.string(),
  }),
});

/**
 * Strict schema for verifying a genuinely complete AnalysisResult.
 * Validates that all sections and nested structures required by UI step pages
 * (e.g. jdAnalysis.coreCompetencies, diagnosis.dimensionScores, interviewPrep.likelyQuestions,
 * finalResume.workExperience, etc.) are present and properly typed as arrays or objects.
 */
export const completeAnalysisResultSchema = z.object({
  jdAnalysis: z.object({
    responsibilities: z.array(z.string()),
    hardRequirements: z.array(z.string()),
    implicitRequirements: z.array(z.string()),
    keywords: z.array(z.string()),
    idealCandidate: z.string(),
    coreCompetencies: z.array(
      z.object({
        name: z.string(),
        importance: z.enum(["high", "medium", "low"]),
        description: z.string(),
      })
    ),
  }),
  diagnosis: z.object({
    overallScore: z.number(),
    dimensionScores: z.array(
      z.object({
        dimension: z.string(),
        score: z.number(),
        comment: z.string(),
      })
    ),
    mainIssues: z.array(z.string()),
    prioritySuggestions: z.array(z.string()),
  }),
  matchItems: z.array(
    z.object({
      jdRequirement: z.string(),
      resumeEvidence: z.string(),
      evidenceStrength: z.enum(["strong", "medium", "weak", "none"]),
      needsSupplement: z.boolean(),
      optimizationSuggestion: z.string(),
    })
  ),
  followUpQuestions: z.array(
    z.object({
      id: z.string(),
      question: z.string(),
      purpose: z.string(),
      userAnswer: z.string(),
      generatedBullet: z.string(),
      presetBullet: z.string().optional(),
    })
  ),
  optimizedItems: z.array(
    z.object({
      id: z.string(),
      section: z.string(),
      before: z.string(),
      after: z.string(),
      reason: z.string(),
      riskWarning: z.string(),
    })
  ),
  finalResume: completeFinalResumeSchema,
  englishResume: completeFinalResumeSchema.optional(),
  interviewPrep: z.object({
    likelyQuestions: z.array(
      z.object({
        question: z.string(),
        suggestedAnswer: z.string(),
        evidenceNeeded: z.array(z.string()),
      })
    ),
    evidenceToPrepare: z.array(z.string()),
    possibleExaggerations: z.array(z.string()),
    dataToSupplement: z.array(z.string()),
    selfIntroduction: z.string(),
  }),
});

