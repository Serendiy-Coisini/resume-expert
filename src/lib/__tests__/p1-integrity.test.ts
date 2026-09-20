import assert from "node:assert/strict";
import { test } from "node:test";
import { parseResumeFromText } from "@/lib/resume-parser";
import { getOrBuildEnglishResume, translateTextToEnglish } from "@/lib/english-resume-builder";
import { normalizeFollowUpQuestions, updateFinalResumeWithOptimizedItems } from "@/lib/ai/prompts";
import { analyzeRequestSchema, parseJSONBody, RequestValidationError } from "@/lib/ai/request-validation";
import { getAIConfig } from "@/lib/ai/config";
import type { FinalResume } from "@/types/resume";

const emptyResume = (): FinalResume => ({
  personalInfo: { name: "", email: "", phone: "", location: "" },
  jobIntent: "", summary: "", coreSkills: [], workExperience: [],
  projectExperience: [], skillsAndTools: [], education: { school: "", degree: "", period: "" },
});

test("resume parsing keeps missing facts empty", () => {
  const { finalResume } = parseResumeFromText("姓名：赵六\n自我评价：认真负责");
  assert.equal(finalResume.personalInfo.name, "赵六");
  assert.equal(finalResume.personalInfo.email, "");
  assert.equal(finalResume.personalInfo.phone, "");
  assert.equal(finalResume.personalInfo.location, "");
  assert.deepEqual(finalResume.coreSkills, []);
  assert.deepEqual(finalResume.workExperience, []);
  assert.deepEqual(finalResume.projectExperience, []);
  assert.equal(finalResume.education.school, "");
});

test("English fallback preserves identity and unknown source text without invented facts", () => {
  const source = emptyResume();
  source.personalInfo = { name: "赵六", email: "zhao@example.com", phone: "13900000000", location: "苏州" };
  source.summary = "负责量子业务";
  const english = getOrBuildEnglishResume(source);
  assert.equal(english.personalInfo.name, "赵六");
  assert.equal(english.personalInfo.email, "zhao@example.com");
  assert.equal(english.personalInfo.phone, "13900000000");
  assert.match(translateTextToEnglish("负责量子业务"), /量子业务/);
  assert.deepEqual(english.coreSkills, []);
  assert.equal(english.education.period, "");
});

test("reference bullets remain examples and ambiguous source bullets are not auto-replaced", () => {
  const questions = normalizeFollowUpQuestions([{ id: "q1", question: "补充数据", purpose: "成果", presetBullet: "参考内容", generatedBullet: "参考内容" }]);
  assert.equal(questions[0].presetBullet, "参考内容");
  assert.equal(questions[0].generatedBullet, "");

  const resume = emptyResume();
  resume.workExperience = [
    { company: "A", role: "R", period: "", bullets: ["相同描述"] },
    { company: "B", role: "R", period: "", bullets: ["相同描述", "唯一描述"] },
  ];
  const updated = updateFinalResumeWithOptimizedItems(resume, [
    { id: "1", section: "工作经历", before: "相同描述", after: "错误归属", reason: "", riskWarning: "" },
    { id: "2", section: "工作经历", before: "唯一描述", after: "精确改写", reason: "", riskWarning: "" },
  ]);
  assert.equal(updated.workExperience[0].bullets[0], "相同描述");
  assert.equal(updated.workExperience[1].bullets[0], "相同描述");
  assert.equal(updated.workExperience[1].bullets[1], "精确改写");
});

test("API request validation enforces types, limits and an outbound field allowlist", async () => {
  const input = {
    targetRole: "工程师", industry: "软件", companyType: "中型公司", jobStage: "社招",
    highlightSkills: "", jobDescription: "JD", originalResume: "简历", additionalInfo: "",
    avatarUrl: "data:image/png;base64,secret", rawFileDataUrl: "secret",
  };
  const parsed = await parseJSONBody(new Request("http://test", { method: "POST", body: JSON.stringify({ input }) }), analyzeRequestSchema);
  assert.equal("avatarUrl" in parsed.input, false);
  assert.equal("rawFileDataUrl" in parsed.input, false);
  await assert.rejects(
    parseJSONBody(new Request("http://test", { method: "POST", body: JSON.stringify({ input: { ...input, targetRole: 1 } }) }), analyzeRequestSchema),
    RequestValidationError
  );
});

test("server model credentials require explicit opt-in while browser credentials remain explicit", () => {
  const previousKey = process.env.LLM_API_KEY;
  const previousAllow = process.env.ALLOW_SERVER_LLM_KEY;
  const previousMock = process.env.USE_MOCK_AI;
  try {
    process.env.LLM_API_KEY = "server-test-key";
    delete process.env.ALLOW_SERVER_LLM_KEY;
    delete process.env.USE_MOCK_AI;
    assert.equal(getAIConfig(new Request("http://test")).mode, "mock");
    const header = encodeURIComponent(JSON.stringify({ apiKey: "browser-test-key", baseUrl: "https://api.openai.com/v1", model: "test" }));
    assert.equal(getAIConfig(new Request("http://test", { headers: { "x-llm-config": header } })).mode, "llm");
  } finally {
    if (previousKey === undefined) delete process.env.LLM_API_KEY; else process.env.LLM_API_KEY = previousKey;
    if (previousAllow === undefined) delete process.env.ALLOW_SERVER_LLM_KEY; else process.env.ALLOW_SERVER_LLM_KEY = previousAllow;
    if (previousMock === undefined) delete process.env.USE_MOCK_AI; else process.env.USE_MOCK_AI = previousMock;
  }
});
