import assert from "node:assert/strict";
import { test, mock } from "node:test";
import { jsPDF } from "jspdf";
import { buildLegoSchemaFromResume, fillAiDataIntoExistingSchema } from "@/lib/lego-adapter";
import { DEFAULT_LEGO_SCHEMA, useLegoDesignerStore } from "@/store/lego-designer-store";
import { getResumeSourceKey, useResumeStore } from "@/store/resume-store";
import { useHistoryStore } from "@/store/history-store";
import { safeBrowserStorage, isStorageVolatile } from "@/lib/safe-storage";
import { anonymizePayload, restoreAnalysisResult } from "@/lib/privacy/pii";
import { readLimitedBody } from "@/lib/limited-body";
import { BoundedQueue, QueueFullError } from "@/lib/bounded-queue";
import { validateImageDimensions } from "@/lib/image-limits";
import { parseDocumentJob } from "@/lib/document-parser.server";
import { authorizeServerLLM, reserveServerCall } from "@/lib/ai/server-access";
import { getAIConfig } from "@/lib/ai/config";
import { optimizeResumeResponseSchema } from "@/lib/ai/schemas";
import * as client from "@/lib/ai/client";
import { runLLMRegenerateOptimizedItems } from "@/services/ai/resumeAgent.llm";
import type { AnalysisResult, FinalResume, TemplateId, UserInput } from "@/types/resume";

const input: UserInput = { targetRole: "", industry: "", companyType: "", jobStage: "", highlightSkills: "", originalResume: "", jobDescription: "", additionalInfo: "" };
const empty: FinalResume = { personalInfo: { name: "", email: "", phone: "", location: "" }, jobIntent: "", summary: "", coreSkills: [], workExperience: [], projectExperience: [], skillsAndTools: [], education: { school: "", degree: "", period: "" } };
const result = { finalResume: empty, optimizedItems: [], followUpQuestions: [] } as unknown as AnalysisResult;

test("all Lego templates preserve empty facts and finite geometry", () => {
  const templates: TemplateId[] = ["modern-sidebar", "timeline-tech", "corporate-banner", "grid-cards", "classic-minimal", "github-tech", "minimal", "custom"];
  for (const template of templates) {
    const schema = buildLegoSchemaFromResume(input, result, template);
    for (const generated of [schema, fillAiDataIntoExistingSchema(schema, input, result)]) {
      const text = JSON.stringify(generated);
      assert.doesNotMatch(text, /清华|13800138000|example\.com|某科技|某某公司|2020\s*[-–]/, template);
      for (const page of generated.componentsTree) for (const widget of page.children) {
        for (const key of ["top", "left", "height", "width"] as const) {
          const value = widget.css[key];
          if (typeof value === "number") assert.ok(Number.isFinite(value), `${template}: ${key}`);
        }
      }
    }
  }
});

test("style regeneration returns a complete new resume without matching old bullets", async () => {
  const output = optimizeResumeResponseSchema.parse({ optimizedItems: [{ before: "original", after: "new style" }], finalResume: { ...empty, summary: "new style" } });
  const stub = mock.method(client, "chatCompletionJSON", async (options: { schema: unknown }) => {
    assert.equal(options.schema, optimizeResumeResponseSchema);
    return output;
  });
  try {
    const regenerated = await runLLMRegenerateOptimizedItems(input, "concise");
    assert.equal(regenerated.finalResume.summary, "new style");
    assert.equal(regenerated.optimizedItems[0].after, "new style");
  } finally { stub.mock.restore(); }
});

test("example loading invalidates results, tasks and cross-session canvas undo", () => {
  const before = useResumeStore.getState();
  const canvasBefore = useLegoDesignerStore.getState();
  const historyBefore = useHistoryStore.getState();
  try {
    useResumeStore.setState({ analysisResult: result, sessionId: "old", resultRevision: 10, currentStep: "export" });
    const schema = buildLegoSchemaFromResume(input, result);
    useLegoDesignerStore.getState().setSchema(schema);
    const oldKey = getResumeSourceKey();
    assert.equal(useResumeStore.getState().patchAnalysisResult({ optimizedItems: [] }, "old", 9), false);
    assert.equal(useResumeStore.getState().patchAnalysisResult({ optimizedItems: [] }, "old", 10), true);
    assert.equal(useResumeStore.getState().patchAnalysisResult({ finalResume: empty }, "old", 10), false);
    useResumeStore.getState().loadExampleData();
    assert.equal(useResumeStore.getState().analysisResult, null);
    assert.equal(useResumeStore.getState().currentStep, "input");
    assert.notEqual(getResumeSourceKey(), oldKey);
    assert.equal(useLegoDesignerStore.getState().sourceKey, oldKey);
    useLegoDesignerStore.getState().setSchema(DEFAULT_LEGO_SCHEMA);
    assert.equal(useLegoDesignerStore.getState().undoStack.length, 0);
    useLegoDesignerStore.getState().undo();
    assert.equal(useLegoDesignerStore.getState().schema.componentsTree[0].children.length, 0);
    assert.equal(useLegoDesignerStore.getState().sourceKey, getResumeSourceKey());
  } finally {
    useResumeStore.setState(before); useLegoDesignerStore.setState(canvasBefore); useHistoryStore.setState(historyBefore);
  }
});

test("failed browser writes and removals never resurrect stale persisted credentials", () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  const disk = new Map<string, string>();
  let fail = false;
  const storage = { getItem: (key: string) => disk.get(key) ?? null, setItem: (key: string, value: string) => { if (fail) throw new Error("full"); disk.set(key, value); }, removeItem: (key: string) => { if (fail) throw new Error("full"); disk.delete(key); } };
  Object.defineProperty(globalThis, "window", { configurable: true, value: { localStorage: storage } });
  try {
    safeBrowserStorage.setItem("p1-test", "old-key"); fail = true;
    safeBrowserStorage.setItem("p1-test", "new-key");
    assert.equal(safeBrowserStorage.getItem("p1-test"), "new-key");
    assert.equal(isStorageVolatile("p1-test"), true);
    safeBrowserStorage.removeItem("p1-test");
    assert.equal(safeBrowserStorage.getItem("p1-test"), null);
    fail = false; safeBrowserStorage.setItem("p1-test", "recovered");
    assert.equal(isStorageVolatile("p1-test"), false);
    assert.equal(disk.get("p1-test"), "recovered");
  } finally {
    safeBrowserStorage.removeItem("p1-test");
    if (previous) Object.defineProperty(globalThis, "window", previous); else Reflect.deleteProperty(globalThis, "window");
  }
});

test("privacy masking covers labelled international identity and consistent cross-field references", () => {
  const original = { originalResume: "Jane Smith\nCompany: Acme Labs\nAddress: 12 Main Street\nPhone: +1 (415) 555-0123\n微信：jane_123\n身份证：110105199001011234", additionalInfo: "Jane Smith 在 Acme Labs 工作" };
  const { value, piiMap } = anonymizePayload(original);
  assert.doesNotMatch(JSON.stringify(value), /Jane Smith|Acme Labs|12 Main Street|415|jane_123|110105199001011234/);
  assert.deepEqual(restoreAnalysisResult(value, piiMap), original);
  assert.ok(value.additionalInfo.includes(value.originalResume.split("\n")[0]));
});

test("template persistence reports failure without losing templates or mutating saved state", () => {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", { configurable: true, value: {} });
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const before = useLegoDesignerStore.getState();
  const warnings = mock.method(console, "warn", () => {});
  const errors = mock.method(console, "error", () => {});
  const attempts: number[] = [];
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {
    setItem: (_key: string, value: string) => { attempts.push(JSON.parse(value).length); throw new Error("full"); },
  } });
  try {
    const savedTemplates = Array.from({ length: 12 }, (_, index) => ({ id: String(index), name: "模板", category: "测试", description: "", cover: "", createTime: "", schema: DEFAULT_LEGO_SCHEMA }));
    useLegoDesignerStore.setState({ savedTemplates });
    assert.throws(() => useLegoDesignerStore.getState().saveAsTemplate("新模板", "测试", "", ""), /未能保存/);
    assert.deepEqual(attempts, [13, 13, 13]);
    assert.equal(useLegoDesignerStore.getState().savedTemplates.length, 12);
  } finally {
    useLegoDesignerStore.setState(before); warnings.mock.restore(); errors.mock.restore();
    if (previous) Object.defineProperty(globalThis, "localStorage", previous); else Reflect.deleteProperty(globalThis, "localStorage");
    if (previousWindow) Object.defineProperty(globalThis, "window", previousWindow); else Reflect.deleteProperty(globalThis, "window");
  }
});

test("streaming upload limit cancels bodies even without content-length", async () => {
  let cancelled = false;
  const body = new ReadableStream<Uint8Array>({ pull(controller) { controller.enqueue(new Uint8Array(8)); }, cancel() { cancelled = true; } });
  const request = new Request("http://test", { method: "POST", body, duplex: "half" } as RequestInit);
  await assert.rejects(readLimitedBody(request, 10), (error: unknown) => error instanceof Error && "status" in error && error.status === 413);
  assert.equal(cancelled, true);
});

test("bounded parser queue rejects overload, removes cancelled waiters and reuses slots", async () => {
  const queue = new BoundedQueue(1, 1);
  const signal = new AbortController().signal;
  const release = await queue.acquire(signal);
  const cancel = new AbortController();
  const waiting = queue.acquire(cancel.signal);
  await assert.rejects(queue.acquire(signal), QueueFullError);
  cancel.abort(); await assert.rejects(waiting, { name: "AbortError" });
  const next = queue.acquire(signal);
  release(); release();
  const releaseNext = await next;
  releaseNext();
  (await queue.acquire(signal))();
});

test("image dimension admission rejects unknown and oversized PNG/GIF/BMP/WebP/JPEG", () => {
  const png = Buffer.alloc(24); Buffer.from([137,80,78,71,13,10,26,10]).copy(png); png.writeUInt32BE(100,16); png.writeUInt32BE(100,20);
  const gif = Buffer.alloc(10); gif.write("GIF89a"); gif.writeUInt16LE(100,6); gif.writeUInt16LE(100,8);
  const bmp = Buffer.alloc(26); bmp.write("BM"); bmp.writeUInt32LE(40,14); bmp.writeInt32LE(100,18); bmp.writeInt32LE(100,22);
  const webp = Buffer.alloc(30); webp.write("RIFF"); webp.write("WEBP",8); webp.write("VP8X",12); webp.writeUIntLE(99,24,3); webp.writeUIntLE(99,27,3);
  const jpeg = Buffer.from([255,216,255,192,0,8,8,0,100,0,100,1]);
  for (const image of [png,gif,bmp,webp,jpeg]) validateImageDimensions(image);
  png.writeUInt32BE(13000,16); gif.writeUInt16LE(13000,6); bmp.writeInt32LE(13000,18); webp.writeUIntLE(12999,24,3); jpeg.writeUInt16BE(13000,9);
  for (const image of [png,gif,bmp,webp,jpeg,Buffer.from("unknown")]) assert.throws(() => validateImageDimensions(image), /图片格式无效或像素过大/);
});

test("isolated document parser handles PDF/text without changing process logging", async () => {
  const log = console.log, write = process.stdout.write;
  const signal = new AbortController().signal;
  assert.equal(await parseDocumentJob({ kind: "document", name: "test.txt", buffer: Buffer.from("真实文本") }, signal), "真实文本");
  const pdf = new jsPDF(); pdf.text("Isolated PDF regression", 10, 10);
  const text = await parseDocumentJob({ kind: "document", name: "test.pdf", buffer: Buffer.from(pdf.output("arraybuffer")) }, signal);
  assert.match(text, /Isolated PDF regression/);
  assert.equal(console.log, log); assert.equal(process.stdout.write, write);
  const cancel = new AbortController(); cancel.abort();
  await assert.rejects(parseDocumentJob({ kind: "document", name: "test.txt", buffer: Buffer.from("cancelled") }, cancel.signal), { name: "AbortError" });
});

test("shared model access fails closed and enforces per-user upstream budgets", () => {
  const names = ["SERVER_LLM_ACCESS_TOKENS", "SERVER_LLM_DEPLOYMENT", "SERVER_LLM_USER_DAILY_CALLS", "ALLOW_SERVER_LLM_KEY", "LLM_API_KEY", "USE_MOCK_AI"];
  const previous = Object.fromEntries(names.map(name => [name, process.env[name]]));
  const token = "p1-regression-test-token-32-chars-minimum";
  try {
    process.env.SERVER_LLM_ACCESS_TOKENS = JSON.stringify([token]);
    process.env.ALLOW_SERVER_LLM_KEY = "true"; process.env.LLM_API_KEY = "test-only"; delete process.env.USE_MOCK_AI;
    delete process.env.SERVER_LLM_DEPLOYMENT;
    const authorized = new Request("http://test", { headers: { "x-server-access-token": token } });
    assert.throws(() => getAIConfig(authorized), /未配置访问控制/);
    process.env.SERVER_LLM_DEPLOYMENT = "single-instance";
    assert.throws(() => getAIConfig(new Request("http://test")), /服务访问口令/);
    assert.equal(getAIConfig(authorized).mode, "llm");
    const principal = authorizeServerLLM(authorized);
    process.env.SERVER_LLM_USER_DAILY_CALLS = "3";
    const first = reserveServerCall(principal), second = reserveServerCall(principal);
    assert.throws(() => reserveServerCall(principal), /预算或并发/);
    first(); first(); second(); reserveServerCall(principal)();
    assert.throws(() => reserveServerCall(principal), /预算或并发/);
    assert.equal(getAIConfig(new Request("http://test", { headers: { "x-ai-mode": "mock" } })).mode, "mock");
    assert.throws(() => getAIConfig(new Request("http://test", { headers: { "x-llm-config": "%invalid" } })), /格式无效/);
  } finally {
    for (const name of names) { if (previous[name] === undefined) delete process.env[name]; else process.env[name] = previous[name]; }
  }
});
