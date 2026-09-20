import assert from "node:assert/strict";
import { test, mock } from "node:test";
import * as client from "@/lib/ai/client";
import { runLLMRegenerateOptimizedItems, runLLMResumeAnalysis } from "@/services/ai/resumeAgent.llm";
import type { UserInput } from "@/types/resume";
import { runLLMResumeAnalysisStream, type StageUpdatePayload } from "@/services/ai/resumeAgent.llm";
import { jdAnalysisResponseSchema, diagnosisMatchResponseSchema, optimizeResumeResponseSchema, interviewResponseSchema } from "@/lib/ai/schemas";
import { POST } from "@/app/api/analyze/stream/route";
import * as mockAgent from "@/services/ai/resumeAgent.mock";
import { useResumeStore } from "@/store/resume-store";
import { runResumeAnalysisStream } from "@/services/ai/resumeAgent";

const input: UserInput = { targetRole: "工程师", industry: "软件", companyType: "中型公司", jobStage: "社招", highlightSkills: "", originalResume: "真实简历", jobDescription: "岗位要求", additionalInfo: "" };
const stages = [jdAnalysisResponseSchema, diagnosisMatchResponseSchema, optimizeResumeResponseSchema, interviewResponseSchema];
const outputs = [
  jdAnalysisResponseSchema.parse({ jdAnalysis: { idealCandidate: "真实岗位" } }),
  diagnosisMatchResponseSchema.parse({ diagnosis: { overallScore: 73, mainIssues: ["真实问题"] } }),
  optimizeResumeResponseSchema.parse({ optimizedItems: [{ before: "旧", after: "新" }], finalResume: { summary: "真实经历" } }),
  interviewResponseSchema.parse({ interviewPrep: { selfIntroduction: "真实介绍" } }),
];

test("every failed stage rejects while successful stages reach the client and store", async () => {
  for (let failedStage = 0; failedStage < stages.length; failedStage++) {
    const updates: StageUpdatePayload[] = [];
    const error = new client.LLMError("stage unavailable", 503);
    const calls = [0, 0, 0, 0];
    const stub = mock.method(client, "chatCompletionJSON", async (options: { schema: unknown }) => {
      const index = stages.findIndex((schema) => schema === options.schema);
      calls[index]++;
      if (index === failedStage) throw error;
      return outputs[index];
    });
    const previousState = useResumeStore.getState();
    let fetchStub: ReturnType<typeof mock.method> | undefined;
    try {
      await assert.rejects(runLLMResumeAnalysisStream(input, "concise", (update) => updates.push(update)), (err) => err === error);
      assert.equal(calls[failedStage], 2);
      const expected = outputs.filter((_, index) => index !== failedStage && (failedStage >= 2 || index < failedStage));
      const partials = updates.filter((update) => update.status === "complete").map((update) => update.data);
      assert.deepEqual(partials, expected);
      useResumeStore.setState({ analysisResult: null, partialAnalysisResult: null });
      fetchStub = mock.method(globalThis, "fetch", async () => new Response(
        partials.map((data) => `event: stage\ndata: ${JSON.stringify({ stage: "test", status: "complete", data })}\n\n`).join("") +
        'event: error\ndata: {"error":"stage unavailable"}\n\n',
        { headers: { "Content-Type": "text/event-stream" } }
      ));
      await assert.rejects(runResumeAnalysisStream(input, "concise", {
        enablePIIMasking: false,
        onPartialResult: useResumeStore.getState().updatePartialAnalysisResult,
      }), /stage unavailable/);
      assert.deepEqual(useResumeStore.getState().analysisResult, null);
      assert.deepEqual(useResumeStore.getState().partialAnalysisResult, expected.length ? Object.assign({}, ...expected) : null);
    } finally {
      stub.mock.restore();
      fetchStub?.mock.restore();
      useResumeStore.setState(previousState);
    }
  }
});

test("SSE route emits an error for LLM failure and retains explicit mock dispatch", async () => {
  const llm = mock.method(client, "chatCompletionJSON", async () => { throw new client.LLMError("provider unavailable", 503); });
  const demo = mock.method(mockAgent, "runMockResumeAnalysisStream", async () => Object.assign({}, ...outputs));
  try {
    const request = (mode: string) => new Request("http://localhost/api/analyze/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-ai-mode": mode,
        "x-llm-config": encodeURIComponent(JSON.stringify({ apiKey: "test-only", baseUrl: "https://api.openai.com/v1" })) },
      body: JSON.stringify({ input }),
    });
    const failed = await (await POST(request("llm"))).text();
    assert.match(failed, /event: error/);
    assert.doesNotMatch(failed, /event: complete/);
    assert.equal(demo.mock.callCount(), 0);
    const success = await (await POST(request("mock"))).text();
    assert.match(success, /event: complete/);
    assert.match(success, /"mode":"mock"/);
    assert.equal(demo.mock.callCount(), 1);
    assert.equal(llm.mock.callCount(), 2);
  } finally { llm.mock.restore(); demo.mock.restore(); }
});

test("real LLM failures never become mock results", async () => {
  const error = new client.LLMError("provider unavailable", 503);
  const stub = mock.method(client, "chatCompletionJSON", async () => { throw error; });
  const input: UserInput = { targetRole: "工程师", industry: "软件", companyType: "中型公司", jobStage: "社招", highlightSkills: "", originalResume: "真实简历", jobDescription: "岗位要求", additionalInfo: "" };
  try {
    await assert.rejects(runLLMResumeAnalysis(input), (err) => err === error);
    await assert.rejects(runLLMRegenerateOptimizedItems(input, "concise"), (err) => err === error);
  } finally { stub.mock.restore(); }
});

test("stage schemas reject structurally valid but empty model output", () => {
  assert.equal(jdAnalysisResponseSchema.safeParse({ jdAnalysis: {} }).success, false);
  assert.equal(diagnosisMatchResponseSchema.safeParse({ diagnosis: {} }).success, false);
  assert.equal(optimizeResumeResponseSchema.safeParse({ optimizedItems: [], finalResume: {} }).success, false);
  assert.equal(interviewResponseSchema.safeParse({ interviewPrep: {} }).success, false);
});

test("stale async patches are ignored and template option updates preserve other fields", () => {
  const previousState = useResumeStore.getState();
  try {
    useResumeStore.setState({
      sessionId: "current-session",
      analysisResult: Object.assign({}, ...outputs),
      templateOptions: { themeColor: "#111111", avatarShape: "circle", enableSmartPagination: true, density: "normal", pageMargin: "normal" },
    });
    useResumeStore.getState().patchAnalysisResult({ optimizedItems: [] }, "stale-session");
    assert.equal(useResumeStore.getState().analysisResult?.optimizedItems.length, 1);
    useResumeStore.getState().setTemplateOptions({ themeColor: "#222222" });
    assert.equal(useResumeStore.getState().templateOptions.avatarShape, "circle");
    assert.equal(useResumeStore.getState().templateOptions.themeColor, "#222222");
  } finally {
    useResumeStore.setState(previousState);
  }
});
