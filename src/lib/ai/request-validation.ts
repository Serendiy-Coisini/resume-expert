import { z } from "zod";
import { readLimitedBody } from "@/lib/limited-body";

import { RequestValidationError } from "@/lib/request-error";
export { RequestValidationError } from "@/lib/request-error";

const shortText = z.string().trim().max(300);
const longText = z.string().max(50_000);

export const userInputSchema = z.object({
  targetRole: shortText,
  industry: shortText,
  companyType: shortText,
  jobStage: shortText,
  highlightSkills: z.string().max(5_000),
  jobDescription: longText,
  originalResume: longText,
  additionalInfo: z.string().max(10_000),
});

export const optimizeStyleSchema = z.enum([
  "concise", "data-driven", "leadership", "reduce-exaggeration",
  "jd-matched", "ai-product", "tob-saas",
]);

export const analyzeRequestSchema = z.object({
  input: userInputSchema,
  optimizeStyle: optimizeStyleSchema.optional().default("ai-product"),
});

export const optimizeRequestSchema = z.object({
  input: userInputSchema,
  style: optimizeStyleSchema,
});

export const followUpBulletRequestSchema = z.object({
  input: userInputSchema,
  question: z.string().trim().min(1).max(2_000),
  purpose: z.string().trim().max(2_000),
  userAnswer: z.string().trim().min(1).max(10_000),
});

export const applyFollowUpRequestSchema = z.object({
  input: userInputSchema,
  style: optimizeStyleSchema,
  bullets: z.array(z.object({
    purpose: z.string().trim().max(2_000),
    bullet: z.string().trim().min(1).max(5_000),
  })).min(1).max(20),
});

export const extractTemplateRequestSchema = z.object({
  content: z.string().trim().min(1).max(100_000),
});

export const settingsTestRequestSchema = z.object({
  apiKey: z.string().trim().min(1).max(512),
  baseUrl: z.string().trim().max(2_000).optional(),
  model: z.string().trim().max(200).optional(),
});

export async function parseJSONBody<T>(
  request: Request,
  schema: z.ZodType<T>,
  maxBytes = 512 * 1024
): Promise<T> {
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > maxBytes) throw new RequestValidationError("请求内容过大", 413);
  const raw = new TextDecoder().decode(await readLimitedBody(request, maxBytes));
  if (new TextEncoder().encode(raw).byteLength > maxBytes) {
    throw new RequestValidationError("请求内容过大", 413);
  }
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new RequestValidationError("请求 JSON 格式无效");
  }
  const result = schema.safeParse(value);
  if (!result.success) throw new RequestValidationError("请求参数格式或长度无效");
  return result.data;
}
